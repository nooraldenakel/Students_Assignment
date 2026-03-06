fetch(`https://zudtwcgyffhkgrgvmxdm.supabase.co/rest/v1/app_users?select=*`, {
    headers: {
        apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1ZHR3Y2d5ZmZoa2dyZ3ZteGRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1ODE4MTIsImV4cCI6MjA4ODE1NzgxMn0.HEVcskUQw_C1-ae9GcHqpVvNKnHpobb_osdevOUFNLo',
        Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1ZHR3Y2d5ZmZoa2dyZ3ZteGRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1ODE4MTIsImV4cCI6MjA4ODE1NzgxMn0.HEVcskUQw_C1-ae9GcHqpVvNKnHpobb_osdevOUFNLo`
    }
}).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2)));
