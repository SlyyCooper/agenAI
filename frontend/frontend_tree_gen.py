import os

def should_exclude(path):
    excludes = {
        'node_modules', '.next', '__pycache__', 
        '__init__.py', 'LICENSE', 'setup.py', '.svg', '.png',
        'README.md', 'cli.py', 'tests', 'venv', '.git', '.pytest_cache',
        '.DS_Store', '.cursorignore', '.cursorrules', 'tree_gen.py', 'frontend_tree_gen.py', 'backend_tree_gen.py'
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

if __name__ == '__main__':
    current_dir = os.path.dirname(os.path.abspath(__file__))
    print('\n'.join([os.path.basename(current_dir)] + generate_tree(current_dir)))
