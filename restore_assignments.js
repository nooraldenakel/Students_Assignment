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

function parseArabicDate(str) {
    if (!str) return new Date().toISOString();
    const arabicDigits = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
    let standard = String(str).replace(/[٠-٩]/g, d => String(arabicDigits.indexOf(d)));
    standard = standard.replace(/[\u200E\u200F\u202A-\u202E\s]/g, '');
    const parts = standard.split(/[\/\-\.]/);
    if (parts.length === 3) {
        let [p1, p2, p3] = parts.map(Number);
        let year = 2026, month = 1, day = 1;
        if (p1 > 1000) {
            year = p1; month = p2; day = p3;
        } else if (p3 > 1000) {
            year = p3; month = p2; day = p1;
        } else {
            year = p3; month = p1; day = p2;
        }
        const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
        if (!isNaN(d.getTime())) return d.toISOString();
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

async function run() {
    const email = process.argv[2];
    const password = process.argv[3];
    const filePath = process.argv[4] || 'backup.xlsx.xlsx';
    const targetCourse = process.argv[5] || 'L1';

    if (!email || !password) {
        console.log('Usage: node restore_assignments.js <admin_email> <admin_password> [filePath] [courseId]');
        process.exit(1);
    }

    console.log(`1. Authenticating with Supabase as ${email}...`);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
    });

    if (authError || !authData.user) {
        console.error('Authentication failed:', authError ? authError.message : 'Unknown error');
        process.exit(1);
    }
    console.log('✓ Successfully authenticated!');

    console.log(`2. Reading Excel file "${filePath}"...`);
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
    }

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames.find(n => n.includes(targetCourse) || n.toLowerCase().includes('course') || n.includes('مباشر')) || workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet);
    console.log(`✓ Loaded sheet "${sheetName}" with ${rows.length} rows.`);

    console.log('3. Fetching registered students from database...');
    const allStudents = await fetchAllRecords('students');
    console.log(`✓ Found ${allStudents.length} students in database.`);

    console.log(`4. Fetching existing ${targetCourse} assignments to avoid duplicates...`);
    const existingAssignments = await fetchAllRecords('assignments');
    const existingL1StudentIds = new Set(
        existingAssignments.filter(a => a.list_id === targetCourse).map(a => a.student_id)
    );
    console.log(`✓ Found ${existingL1StudentIds.size} existing ${targetCourse} assignments.`);

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

    const toInsert = [];
    let skippedDuplicates = 0;
    let notFound = 0;

    for (const row of rows) {
        const rawName = row['الاسم'] || row['اسم الطالب'] || row['name'] || row['Name'];
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

        if (existingL1StudentIds.has(matched.id)) {
            skippedDuplicates++;
            continue;
        }

        existingL1StudentIds.add(matched.id);

        const assignedDate = parseArabicDate(row['تاريخ المباشرة'] || row['date'] || row['Date']);
        const assignedByName = row['مباشر بواسطة'] || row['assigned_by'] || 'Admin';

        toInsert.push({
            student_id: matched.id,
            list_id: targetCourse,
            assigned_date: assignedDate,
            assigned_by_user_id: authData.user.id,
            assigned_by_user_name: assignedByName
        });
    }

    console.log(`\n--- Plan ---`);
    console.log(`Total in Excel: ${rows.length}`);
    console.log(`To Insert: ${toInsert.length}`);
    console.log(`Skipped Duplicates: ${skippedDuplicates}`);
    console.log(`Not Found Students: ${notFound}`);

    if (toInsert.length === 0) {
        console.log('No new assignments to insert. Everything is already up to date!');
        process.exit(0);
    }

    console.log(`\n5. Inserting ${toInsert.length} assignments in batches of 500...`);
    const BATCH_SIZE = 500;
    let inserted = 0;
    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
        const batch = toInsert.slice(i, i + BATCH_SIZE);
        const { error: insError } = await supabase.from('assignments').insert(batch);
        if (insError) {
            console.error(`Error inserting batch ${i / BATCH_SIZE + 1}:`, insError.message);
            process.exit(1);
        }
        inserted += batch.length;
        process.stdout.write(`Progress: ${inserted}/${toInsert.length} assignments inserted...\r`);
    }

    console.log(`\n\n🎉 SUCCESS! Restored ${inserted} assignments for Course ${targetCourse} successfully!`);
}

run().catch(console.error);
