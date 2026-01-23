import os
from pathlib import Path
import argparse

BACKEND_NAME = "generated-app-backend"
FRONTEND_NAME = "generated-app-frontend"


def resolve_images():
    registry = os.getenv("AGNETZ_REGISTRY") or os.getenv("REGISTRY") or ""
    registry = registry.strip().rstrip("/")
    repo = os.getenv("AGNETZ_REPO") or os.getenv("GITHUB_REPOSITORY", "")
    if registry and repo:
        backend = f"{registry}/{repo}-backend"
        frontend = f"{registry}/{repo}-frontend"
    elif registry:
        backend = f"{registry}/{BACKEND_NAME}"
        frontend = f"{registry}/{FRONTEND_NAME}"
    else:
        backend = BACKEND_NAME
        frontend = FRONTEND_NAME
    return backend, frontend


def replace_images(text, backend, frontend, tag):
    out = []
    for line in text.splitlines():
        if line.strip().startswith("image:"):
            if "backend" in line:
                out.append(f"          image: {backend}:{tag}")
                continue
            if "frontend" in line:
                out.append(f"          image: {frontend}:{tag}")
                continue
        out.append(line)
    return "\n".join(out) + "\n"


def update_path(path, tag):
    base = Path(path)
    backend, frontend = resolve_images()
    files = list(base.rglob("*deployment.yaml"))
    for f in files:
        text = f.read_text(encoding="utf-8")
        updated = replace_images(text, backend, frontend, tag)
        f.write_text(updated, encoding="utf-8")
    return len(files)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--tag", required=True)
    p.add_argument("--k8s-path", default="k8s/apps/generated-app")
    p.add_argument("--extra", help="Outros paths separados por ;")
    args = p.parse_args()

    total = update_path(args.k8s_path, args.tag)
    if args.extra:
        for pth in args.extra.split(";"):
            total += update_path(pth, args.tag)

    print(f"updated {total} files")


if __name__ == "__main__":
    main()
