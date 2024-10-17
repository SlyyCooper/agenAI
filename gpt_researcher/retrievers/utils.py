import importlib.util

# This function checks if a given package is installed and importable
def check_pkg(pkg: str) -> None:
    # Use importlib.util.find_spec to check if the package can be imported
    if not importlib.util.find_spec(pkg):
        # If the package can't be found, convert underscores to hyphens
        # This is common in package names (e.g., 'package_name' vs 'package-name')
        pkg_kebab = pkg.replace("_", "-")
        
        # Raise an ImportError with a helpful message
        raise ImportError(
            f"Unable to import {pkg_kebab}. Please install with "
            f"`pip install -U {pkg_kebab}`"
        )
        # The error message includes the package name and the command to install it
        # The -U flag ensures that the latest version is installed