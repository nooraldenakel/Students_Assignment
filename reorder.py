import os

path = r'c:\Users\O_O\new\app\settings\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# find exact ranges
assgn_start = -1
db_op_start = -1
user_mgmt_start = -1
modal_start = -1
grid_end = -1

for i, line in enumerate(lines):
    if '{/* LEFT COLUMN: Assignment Controls */}' in line: assgn_start = i
    if '{/* LEFT COLUMN: Database Operations */}' in line: db_op_start = i
    if '{/* RIGHT COLUMN: User Management */}' in line: user_mgmt_start = i
    if '{/* Password Verification Modal */}' in line: modal_start = i

# The grid ends right before the modal. Let's find the closing div of the grid.
for i in range(modal_start - 1, -1, -1):
    if lines[i].strip() == '</div>':
        grid_end = i
        break

if -1 in (assgn_start, db_op_start, user_mgmt_start, modal_start, grid_end):
    print(f"Could not find all markers: {assgn_start}, {db_op_start}, {user_mgmt_start}, {modal_start}, {grid_end}")
else:
    assgn_block = lines[assgn_start:db_op_start]
    db_block = lines[db_op_start:user_mgmt_start]
    
    # Fix the classes for db_block (removing the col-span stuff and adding spacing adjustments if necessary)
    for i, line in enumerate(db_block):
        if 'className=' in line and 'bg-red-50/20' in line:
            db_block[i] = line.replace(' col-span-1 lg:col-span-2 mt-4 lg:mt-0 lg:max-w-[calc(50%-1rem)]', '')
            break

    user_block = lines[user_mgmt_start:grid_end] # user block ends before the grid closing div
    
    new_grid_content = []
    # 1. User block first (RIGHT COLUMN)
    new_grid_content.extend(user_block)
    
    # 2. Left column wrapper
    new_grid_content.append('                {/* LEFT COLUMN: Assignment Controls & Database Operations */}\n')
    new_grid_content.append('                <div className="space-y-8 flex-1 min-w-0">\n')
    
    # Indent assgn_block by 4 spaces
    indented_assgn = ['    ' + line for line in assgn_block]
    new_grid_content.extend(indented_assgn)
    
    # Indent db_block by 4 spaces
    indented_db = ['    ' + line for line in db_block]
    new_grid_content.extend(indented_db)
    
    new_grid_content.append('                </div>\n')
    
    # Reassemble
    new_lines = lines[:assgn_start] + new_grid_content + lines[grid_end:]
    
    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print("Success")
