import datetime
import json
import os
import sys
import re

PROJECT_CODE = "MIXMLAAL"
MAJOR = 0
MINOR = 0
REVISION = 0

# 获取当前文件所在目录的绝对路径
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
VERSION_FILE = os.path.join(BASE_DIR, "version_record.txt")
PACKAGE_JSON = os.path.join(BASE_DIR, "package.json")
BUILD_VERSION_FILE = os.path.join(BASE_DIR, "build_version.json")

def get_real_time():
    return datetime.datetime.now().strftime("%Y%m%d%H%M%S")

def get_build_version():
    if os.path.exists(VERSION_FILE):
        with open(VERSION_FILE, "r", encoding="utf-8") as f:
            last_build = int(f.read().strip())
        current_build = last_build + 1
    else:
        current_build = 4
    with open(VERSION_FILE, "w", encoding="utf-8") as f:
        f.write(str(current_build))
    return current_build

def get_version_type():
    args = sys.argv[1:] if len(sys.argv) > 1 else []
    if "--major" in args:
        return "major"
    elif "--minor" in args:
        return "minor"
    elif "--patch" in args:
        return "patch"
    elif "--init" in args:
        return "init"
    else:
        return "build"

def parse_semver(version_str):
    match = re.match(r"(\d+)\.(\d+)\.(\d+)", version_str)
    if match:
        return int(match.group(1)), int(match.group(2)), int(match.group(3))
    return None, None, None

def parse_full_version(full_version_str):
    match = re.match(r"MIXMLAAL-(\d+)\.(\d+)\.(\d+)\.(\d+)-(\d+)", full_version_str)
    if match:
        return {
            "major": int(match.group(1)),
            "minor": int(match.group(2)),
            "revision": int(match.group(3)),
            "build": int(match.group(4)),
            "timestamp": match.group(5)
        }
    return None

def update_package_json_files(base_dir, version):
    updated_files = []
    exclude_dirs = {'.git', 'node_modules', 'dist', 'build', '.github', 'coverage'}

    for root, dirs, files in os.walk(base_dir):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]

        if 'package.json' in files:
            pkg_path = os.path.join(root, 'package.json')
            try:
                with open(pkg_path, "r", encoding="utf-8") as f:
                    pkg = json.load(f)

                old_version = pkg.get("version", "0.0.0")

                major, minor, patch = parse_semver(old_version)
                if major is not None:
                    pkg["version"] = version
                    with open(pkg_path, "w", encoding="utf-8") as f:
                        json.dump(pkg, f, indent=2, ensure_ascii=False)
                    rel_path = os.path.relpath(pkg_path, base_dir)
                    updated_files.append(rel_path)
            except (json.JSONDecodeError, KeyError, IOError) as e:
                print(f"  Skip {pkg_path}: {e}")

    return updated_files

def update_build_info(build_info):
    with open(BUILD_VERSION_FILE, "w", encoding="utf-8") as f:
        json.dump(build_info, f, indent=2, ensure_ascii=False)

def generate_version():
    global MAJOR, MINOR, REVISION
    version_type = get_version_type()

    args = sys.argv[1:] if len(sys.argv) > 1 else []

    if version_type == "init":
        MAJOR = 0
        MINOR = 0
        REVISION = 0
        build = 0
        time_stamp = "00000000000000"
        pkg_version = f"{MAJOR}.{MINOR}.{REVISION}"
        full_version = f"{PROJECT_CODE}-{pkg_version}.{build}-{time_stamp}"
        simple_version = f"{pkg_version}.{build}"

        with open(VERSION_FILE, "w", encoding="utf-8") as f:
            f.write(str(build))

        build_info = {
            "version": simple_version,
            "fullVersion": full_version,
            "major": MAJOR,
            "minor": MINOR,
            "revision": REVISION,
            "build": build,
            "timestamp": time_stamp,
            "project": PROJECT_CODE,
            "versionType": version_type
        }

        base_dir = os.path.dirname(os.path.abspath(__file__))
        updated_files = update_package_json_files(base_dir, simple_version)

        update_build_info(build_info)

        return full_version, simple_version, build_info, updated_files

    build = get_build_version()
    time_stamp = get_real_time()

    pkg_version = f"{MAJOR}.{MINOR}.{REVISION}"

    if os.path.exists(PACKAGE_JSON):
        with open(PACKAGE_JSON, "r", encoding="utf-8") as f:
            try:
                pkg = json.load(f)
                old_version = pkg.get("version", pkg_version)
                major, minor, patch = parse_semver(old_version)
                if major is not None:
                    # 保存当前版本号作为基准
                    base_major = major
                    base_minor = minor
                    base_patch = patch
                    
                    if version_type == "major":
                        MAJOR = base_major + 1
                        MINOR = 0
                        REVISION = 0
                    elif version_type == "minor":
                        MAJOR = base_major
                        MINOR = base_minor + 1
                        REVISION = 0
                    elif version_type == "patch":
                        MAJOR = base_major
                        MINOR = base_minor
                        REVISION = base_patch + 1
                    pkg_version = f"{MAJOR}.{MINOR}.{REVISION}"
            except (json.JSONDecodeError, KeyError):
                pass

    full_version = f"{PROJECT_CODE}-{pkg_version}.{build}-{time_stamp}"
    simple_version = f"{pkg_version}.{build}"

    build_info = {
        "version": simple_version,
        "fullVersion": full_version,
        "major": MAJOR,
        "minor": MINOR,
        "revision": REVISION,
        "build": build,
        "timestamp": time_stamp,
        "project": PROJECT_CODE,
        "versionType": version_type
    }

    base_dir = os.path.dirname(os.path.abspath(__file__))
    updated_files = update_package_json_files(base_dir, simple_version)

    update_build_info(build_info)

    return full_version, simple_version, build_info, updated_files

if __name__ == "__main__":
    print("=" * 60)
    version, simple_version, build_info, updated_files = generate_version()
    print(f"MIXMLAAL 实时版本管理系统")
    print("=" * 60)
    print(f"完整版本号：{version}")
    print(f"标准版本号：{simple_version}")
    print("-" * 60)
    print(f"版本说明：")
    print(f"  - MIXMLAAL：项目唯一标识")
    print(f"  - {build_info['major']}.{build_info['minor']}.{build_info['revision']}：SemVer标准格式")
    print(f"  - Build {build_info['build']}：构建号（自动递增）")
    print(f"  - {build_info['timestamp']}：构建时间戳")
    print(f"  - 版本类型：{build_info['versionType']}")
    print("-" * 60)
    print(f"已更新 {len(updated_files)} 个 package.json:")
    for f in updated_files:
        print(f"  - {f}")
    print("=" * 60)