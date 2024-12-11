import os

OUTPUT_FILE = 'codebase_summary.md'

def should_exclude(path):
    excludes = {
        'node_modules', '.next', '__pycache__', '.svg', '.png',
        '__init__.py', 'LICENSE', 'setup.py',
        'README.md', 'cli.py', 'tests', 'venv', '.git', '.pytest_cache',
        '.DS_Store', '.cursorignore', '.cursorrules'
    }
    return any(exclude in path for exclude in excludes)

def generate_tree(startpath, prefix=''):
    tree = []
    files_list = []
    entries = sorted(os.listdir(startpath))
    
    for f in entries:
        if should_exclude(f):
            continue
        path = os.path.join(startpath, f)
        if os.path.isdir(path):
            # Add directory with icon
            tree.append(f'{prefix}├── 📁 {f}')
            # Recursively add subdirectories
            subtree, subfiles = generate_tree(path, prefix + '│   ')
            tree.extend(subtree)
            files_list.extend(subfiles)
        else:
            # Determine file type icon
            file_extension = os.path.splitext(f)[1]
            if file_extension == '.py':
                icon = '🐍'
            elif file_extension == '.md':
                icon = '📝'
            elif file_extension == '.txt':
                icon = '📄'
            elif file_extension in ['.json', '.lock']:
                icon = '📦'
            elif f == '.env':
                icon = '🔒'
            else:
                icon = '📄'
            tree.append(f'{prefix}├── {icon} {f}')
            files_list.append(path)
                
    return tree, files_list

def read_file_contents(files_list):
    # Read the contents of each file and format them
    file_contents_lines = []
    file_contents_lines.append('<file_contents>')
    for fpath in files_list:
        # Try reading as text
        try:
            with open(fpath, 'r', encoding='utf-8', errors='replace') as f:
                content = f.read()
        except Exception:
            # If there's an error reading, skip or handle as needed
            content = "<Unable to read file contents>"

        filename = os.path.relpath(fpath, '.')
        file_contents_lines.append(f"### {filename}")
        file_contents_lines.append("```")
        file_contents_lines.append(content)
        file_contents_lines.append("```")
        file_contents_lines.append("")  # Blank line for spacing
    file_contents_lines.append('</file_contents>')
    
    return '\n'.join(file_contents_lines)

def update_codebase_summary():
    # Generate tree structure and list of files
    tree_lines = ['.']
    tree_structure, files_list = generate_tree('.')
    tree_lines.extend(tree_structure)
    
    # Format tree structure with delimiters
    tree_str = '<tree_structure>\n' + '\n'.join(tree_lines) + '\n</tree_structure>'

    # Get file contents section
    file_contents_str = read_file_contents(files_list)

    # Read existing content from output file (if exists)
    existing_content = ''
    try:
        with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
            existing_content = f.read()
    except FileNotFoundError:
        pass

    # Replace or append the <tree_structure> block
    if '<tree_structure>' in existing_content and '</tree_structure>' in existing_content:
        start = existing_content.find('<tree_structure>')
        end = existing_content.find('</tree_structure>') + len('</tree_structure>')
        new_content = existing_content[:start] + tree_str + existing_content[end:]
    else:
        # Append if not found
        new_content = existing_content + '\n' + tree_str if existing_content else tree_str

    # Replace or append the <file_contents> block
    if '<file_contents>' in new_content and '</file_contents>' in new_content:
        start = new_content.find('<file_contents>')
        end = new_content.find('</file_contents>') + len('</file_contents>')
        new_content = new_content[:start] + file_contents_str + new_content[end:]
    else:
        # Append after tree structure if no existing file_contents block
        # Put a newline between the two sections
        if '</tree_structure>' in new_content:
            insert_pos = new_content.find('</tree_structure>') + len('</tree_structure>')
            new_content = new_content[:insert_pos] + '\n' + file_contents_str + new_content[insert_pos:]
        else:
            # If there's no tree structure at all, just append
            new_content += '\n' + file_contents_str

    # Write back to file
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(new_content)

if __name__ == '__main__':
    update_codebase_summary()
