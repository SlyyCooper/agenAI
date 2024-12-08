import os

def should_exclude(path):
    excludes = {
        'node_modules', '.next', '__pycache__', 
        '__init__.py', 'LICENSE', 'setup.py',
        'README.md', 'cli.py', 'tests', 'venv', '.git', '.pytest_cache',
        '.DS_Store', '.cursorignore', '.cursorrules', '.svg'
    }
    return any(exclude in path for exclude in excludes)

def generate_tree(startpath, prefix=''):
    tree = []
    files = sorted(os.listdir(startpath))
    
    for f in files:
        if should_exclude(f):
            continue
            
        path = os.path.join(startpath, f)
        if os.path.isdir(path):
            # Add directory
            tree.append(f'{prefix}├── {f}')
            # Recursively add subdirectories
            subtree = generate_tree(path, prefix + '│   ')
            tree.extend(subtree)
        else:
            tree.append(f'{prefix}├── {f}')
            
    return tree

def find_project_root():
    """Find the project root by looking for common project files"""
    current = os.getcwd()
    while current != '/':
        if any(os.path.exists(os.path.join(current, marker)) 
               for marker in ['.git', 'pyproject.toml', 'package.json']):
            return current
        current = os.path.dirname(current)
    return os.getcwd()  # Fallback to current directory

def update_cursorrules():
    # Find project root
    root_dir = find_project_root()
    os.chdir(root_dir)
    
    # Generate tree structure
    tree_lines = ['.']
    tree_lines.extend(generate_tree('.'))
    
    # Format tree structure with delimiters
    tree_str = '<tree_structure>\n' + '\n'.join(tree_lines) + '\n</tree_structure>'
    
    # Read existing content
    cursorrules_path = os.path.join(root_dir, '.cursorrules')
    existing_content = ''
    try:
        with open(cursorrules_path, 'r') as f:
            existing_content = f.read()
    except FileNotFoundError:
        pass
        
    # Replace content between delimiters or append if not found
    if '<tree_structure>' in existing_content and '</tree_structure>' in existing_content:
        start = existing_content.find('<tree_structure>')
        end = existing_content.find('</tree_structure>') + len('</tree_structure>')
        new_content = existing_content[:start] + tree_str + existing_content[end:]
    else:
        new_content = existing_content + '\n' + tree_str if existing_content else tree_str
    
    # Write back to file
    with open(cursorrules_path, 'w') as f:
        f.write(new_content)

if __name__ == '__main__':
    update_cursorrules()
