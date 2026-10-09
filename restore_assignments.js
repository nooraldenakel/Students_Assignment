const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zudtwcgyffhkgrgvmxdm.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1ZHR3Y2d5ZmZoa2dyZ3ZteGRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1ODE4MTIsImV4cCI6MjA4ODE1NzgxMn0.HEVcskUQw_C1-ae9GcHqpVvNKnHpobb_osdevOUFNLo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function normalizeArabic(text) {
    if (!text) return '';
    return String(text)
        .trim()
        .toLowerCase()
        .replace(/[\u064B-\u065F\u0670]/g, '') // Remove tashkeel
        .replace(/[أإآٱ]/g, 'ا') // Normalize Alefs
        .replace(/ة/g, 'ه') // Normalize Taa Marbuta
        .replace(/ى/g, 'ي') // Normalize Alef Maksura
        .replace(/\s+/g, ' ');
}

function parseArabicDate(val) {
    if (!val) return new Date().toISOString();

    // 1. If it's already a Date
    if (val instanceof Date) {
        return isNaN(val.getTime()) ? new Date().toISOString() : val.toISOString();
    }

    // 2. If it's an Excel numeric serial date (e.g. 45543)
    if (typeof val === 'number') {
        const date = new Date(Math.round((val - 25569) * 86400 * 1000));
        return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
    }

    // 3. String parsing
    const str = String(val).trim();
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    let standard = str.replace(/[٠-٩]/g, d => String(arabicDigits.indexOf(d)));
    standard = standard.replace(/[\u200E\u200F\u202A-\u202E\s]/g, '');

    const parts = standard.split(/[\/\-\.]/);
    if (parts.length === 3) {
        let [p1, p2, p3] = parts.map(Number);
        let year = 2026, month = 1, day = 1;
        if (p1 > 1000) {
            year = p1; month = p2; day = p3;
        } else if (p3 > 1000) {
            year = p3;
            if (p2 > 12) {
                day = p2;
                month = p1;
            } else if (p1 > 12) {
                day = p1;
                month = p2;
            } else {
                day = p1;
                month = p2;
            }
        } else {
            year = p3 + 2000;
            day = p1;
            month = p2;
        }
        const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
        if (!isNaN(d.getTime())) return d.toISOString();
    }

    // 4. Try standard generic Date constructor
    const parsedGeneric = new Date(str);
    if (!isNaN(parsedGeneric.getTime())) {
        return parsedGeneric.toISOString();
    }

    return new Date().toISOString();
}

async function fetchAllRecords(table) {
    let countQuery = supabase.from(table).select('*', { count: 'exact', head: true });
    const { count, error } = await countQuery;
    if (error || count === null || count === 0) return [];

    const limit = 1000;
    const totalPages = Math.ceil(count / limit);
    const promises = [];
    for (let i = 0; i < totalPages; i++) {
        const from = i * limit;
        const to = from + limit - 1;
        promises.push(supabase.from(table).select('*').range(from, to));
    }
    const results = await Promise.all(promises);
    return results.flatMap(r => r.data || []);
}

function resolveFilePath(customPath) {
    if (customPath && !customPath.startsWith('--') && fs.existsSync(customPath)) {
        return customPath;
    }
    const candidates = ['backup.xlsx.xlsx', 'backup.xlsx', 'backup1.xlsx'];
    for (const c of candidates) {
        if (fs.existsSync(c)) return c;
    }
    return customPath || 'backup.xlsx.xlsx';
}

function selectBestSheet(workbook, targetCourse) {
    const courseNum = targetCourse.replace(/\D/g, ''); // e.g. '1' from 'L1'
    const validSheets = workbook.SheetNames.filter(name => !name.includes('غير المباشرين') && !name.includes('غير مباشر'));

    // 1. Direct match with course name
    let sheetName = validSheets.find(n =>
        n.toLowerCase() === targetCourse.toLowerCase() ||
        n.toLowerCase() === `course_${targetCourse.toLowerCase()}` ||
        n.toLowerCase() === `course ${targetCourse.toLowerCase()}` ||
        n.toLowerCase() === `course${courseNum}` ||
        n.toLowerCase() === `course_${courseNum}` ||
        n.toLowerCase() === `course ${courseNum}`
    );

    // 2. Match sheet containing targetCourse
    if (!sheetName) {
        sheetName = validSheets.find(n => n.includes(targetCourse) || n.includes(`Course_${targetCourse}`));
    }

    // 3. Match any sheet with 'course' or 'المباشرين' (not unassigned)
    if (!sheetName) {
        sheetName = validSheets.find(n => n.toLowerCase().includes('course') || (n.includes('مباشر') && !n.includes('غير')));
    }

    // 4. Check sheet with column 'تاريخ المباشرة'
    if (!sheetName) {
        for (const name of validSheets) {
            const sampleRows = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, range: 0 });
            if (sampleRows.length > 0 && Array.isArray(sampleRows[0])) {
                const headerText = sampleRows[0].join(' ');
                if (headerText.includes('تاريخ المباشرة') || headerText.includes('مباشر بواسطة')) {
                    sheetName = name;
                    break;
                }
            }
        }
    }

    return sheetName || validSheets[0] || workbook.SheetNames[0];
}

async function run() {
    const rawArgs = process.argv.slice(2);
    const cleanFlag = rawArgs.includes('--clean') || rawArgs.includes('-c') || rawArgs.includes('--replace');
    const filteredArgs = rawArgs.filter(a => !a.startsWith('-'));

    const email = filteredArgs[0];
    const password = filteredArgs[1];
    const customFilePath = filteredArgs[2];
    const targetCourse = (filteredArgs[3] || 'L1').toUpperCase();

    if (!email || !password) {
        console.log('\nUsage: node restore_assignments.js <admin_email> <admin_password> [filePath] [courseId] [--clean]');
        console.log('Examples:');
        console.log('  node restore_assignments.js "nooralden@ad.com" "nooralden"');
        console.log('  node restore_assignments.js "nooralden@ad.com" "nooralden" "course_L1_students.xlsx" "L1" --clean');
        process.exit(1);
    }

    const filePath = resolveFilePath(customFilePath);

    console.log(`\n1. Authenticating with Supabase as ${email}...`);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
    });

    if (authError || !authData.user) {
        console.error('Authentication failed:', authError ? authError.message : 'Unknown error');
        process.exit(1);
    }
    console.log('✓ Successfully authenticated!');

    // Fetch default user name from DB or metadata
    let defaultAdminName = authData.user.user_metadata?.name || 'Admin';
    const { data: userProfile } = await supabase.from('app_users').select('name').eq('id', authData.user.id).single();
    if (userProfile && userProfile.name) {
        defaultAdminName = userProfile.name;
    }

    console.log(`2. Reading Excel file "${filePath}"...`);
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
    }

    const workbook = XLSX.readFile(filePath);
    const sheetName = selectBestSheet(workbook, targetCourse);
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet);
    console.log(`✓ Loaded sheet "${sheetName}" with ${rows.length} rows.`);

    if (rows.length === 0) {
        console.error(`Sheet "${sheetName}" is empty!`);
        process.exit(1);
    }

    console.log('3. Fetching registered students from database...');
    const allStudents = await fetchAllRecords('students');
    console.log(`✓ Found ${allStudents.length} students in database.`);

    if (cleanFlag) {
        console.log(`\n🧹 Option --clean detected: Removing existing ${targetCourse} assignments before restoration...`);
        const { error: delError } = await supabase.from('assignments').delete().eq('list_id', targetCourse);
        if (delError) {
            console.error('Error deleting previous assignments:', delError.message);
            process.exit(1);
        }
        console.log(`✓ Cleaned previous ${targetCourse} assignments.`);
    }

    // Build lookup maps
    const studentMapByDept = new Map();
    const studentMapByName = new Map();
    for (const s of allStudents) {
        const normName = normalizeArabic(s.name);
        const normDept = normalizeArabic(s.department || '');
        studentMapByDept.set(`${normName}___${normDept}`, s);
        if (!studentMapByName.has(normName)) {
            studentMapByName.set(normName, s);
        }
    }

    const toUpsert = [];
    const seenStudentIds = new Set();
    let notFound = 0;

    for (const row of rows) {
        const rawName = row['الاسم'] || row['اسم الطالب'] || row['name'] || row['Name'] || row['student_name'];
        if (!rawName) continue;
        const normName = normalizeArabic(String(rawName));
        const rawDept = row['القسم'] || row['department'] || '';
        const normDept = normalizeArabic(String(rawDept));

        let matched = studentMapByDept.get(`${normName}___${normDept}`);
        if (!matched) {
            matched = studentMapByName.get(normName);
        }

        if (!matched) {
            notFound++;
            continue;
        }

        if (seenStudentIds.has(matched.id)) {
            continue; // avoid duplicate student entries in the same sheet
        }
        seenStudentIds.add(matched.id);

        const rawDate = row['تاريخ المباشرة'] || row['تاريخ'] || row['date'] || row['Date'] || row['assigned_date'];
        const assignedDate = parseArabicDate(rawDate);

        const rawAssignedBy = row['مباشر بواسطة'] || row['اسم الموظف'] || row['الموظف'] || row['assigned_by'] || row['Assigned By'] || row['assigned_by_user_name'];
        const assignedByName = (rawAssignedBy && String(rawAssignedBy).trim() !== '') ? String(rawAssignedBy).trim() : defaultAdminName;

        toUpsert.push({
            student_id: matched.id,
            list_id: targetCourse,
            assigned_date: assignedDate,
            assigned_by_user_id: authData.user.id,
            assigned_by_user_name: assignedByName
        });
    }

    console.log(`\n--- Plan ---`);
    console.log(`Target Course: ${targetCourse}`);
    console.log(`Total rows in Excel sheet "${sheetName}": ${rows.length}`);
    console.log(`Valid matched students to restore: ${toUpsert.length}`);
    console.log(`Not Found Students in DB: ${notFound}`);

    if (toUpsert.length > 0) {
        console.log(`\nSample preview of first 2 items:`);
        toUpsert.slice(0, 2).forEach((item, i) => {
            console.log(`[${i + 1}] Student ID: ${item.student_id} | Date: ${item.assigned_date} | Employee: ${item.assigned_by_user_name}`);
        });
    }

    if (toUpsert.length === 0) {
        console.log('No valid student records found to restore.');
        process.exit(0);
    }

    console.log(`\n4. Restoring ${toUpsert.length} assignments in batches of 500 (with exact dates & employee names)...`);
    const BATCH_SIZE = 500;
    let processed = 0;
    for (let i = 0; i < toUpsert.length; i += BATCH_SIZE) {
        const batch = toUpsert.slice(i, i + BATCH_SIZE);
        const { error: insError } = await supabase.from('assignments').upsert(batch, { onConflict: 'student_id,list_id' });
        if (insError) {
            console.error(`\nError saving batch ${i / BATCH_SIZE + 1}:`, insError.message);
            process.exit(1);
        }
        processed += batch.length;
        process.stdout.write(`Progress: ${processed}/${toUpsert.length} assignments restored...\r`);
    }

    console.log(`\n\n🎉 SUCCESS! Restored ${processed} assignments for Course ${targetCourse} with exact dates and employee names!`);
}

run().catch(console.error);
