from pathlib import Path
import re

ROOT = Path("/app/admin-app")

TARGETS = [
    ROOT / "app" / "admin",
    ROOT / "src" / "components" / "AdminProductForm.tsx",
]

def patch_component_tag(text: str, tag: str):
    changed = False

    pattern = re.compile(
        rf"<{tag}\b(?P<attrs>[^>]*)>",
        re.MULTILINE | re.DOTALL,
    )

    def repl(match):
        nonlocal changed
        attrs = match.group("attrs")

        # If already present, force it to true.
        new_attrs, n = re.subn(
            r"showsVerticalScrollIndicator\s*=\s*\{\s*false\s*\}",
            "showsVerticalScrollIndicator={true}",
            attrs,
        )
        if n:
            changed = True
            return f"<{tag}{new_attrs}>"

        if re.search(r"showsVerticalScrollIndicator\s*=", attrs):
            return match.group(0)

        # Add a visible vertical scrollbar to existing scrollable components.
        changed = True
        indent_match = re.search(r"\n([ \t]*)[^\n]*$", attrs)
        indent = indent_match.group(1) if indent_match else "  "

        if "\n" in attrs:
            return f"<{tag}{attrs}\n{indent}showsVerticalScrollIndicator={{true}}>"
        else:
            return f"<{tag}{attrs} showsVerticalScrollIndicator={{true}}>"

    return pattern.sub(repl, text), changed


def patch_file(path: Path):
    original = path.read_text(encoding="utf-8")
    updated = original
    changed_any = False

    for tag in ("ScrollView", "FlatList", "SectionList"):
        updated, changed = patch_component_tag(updated, tag)
        changed_any = changed_any or changed

    if changed_any and updated != original:
        backup = path.with_suffix(path.suffix + ".scrollbar-backup")
        if not backup.exists():
            backup.write_text(original, encoding="utf-8")
        path.write_text(updated, encoding="utf-8")
        print(f"UPDATED  {path}")
        return True

    print(f"NO CHANGE {path}")
    return False


files = []

admin_dir = TARGETS[0]
if admin_dir.exists():
    files.extend(sorted(admin_dir.rglob("*.tsx")))

product_form = TARGETS[1]
if product_form.exists():
    files.append(product_form)

# Remove duplicates while preserving order
seen = set()
unique_files = []
for file in files:
    resolved = str(file.resolve())
    if resolved not in seen:
        seen.add(resolved)
        unique_files.append(file)

print(f"Checking {len(unique_files)} admin TSX files...\n")

changed_count = 0
for file in unique_files:
    try:
        if patch_file(file):
            changed_count += 1
    except Exception as exc:
        print(f"ERROR    {file}: {exc}")

print(f"\nDone. Updated {changed_count} file(s).")
print("Backups were created beside changed files with .scrollbar-backup suffix.")
print("\nNext run:")
print("cd /app/admin-app")
print("npx expo export --platform web --clear")