import base64
import json
import os
import subprocess
from pathlib import Path

import yaml
from dotenv import dotenv_values


class SecretsError(RuntimeError):
    pass


class SecretsManager:
    def __init__(self, provider):
        self.provider = provider

    def load(self, *, keys=None, path=None, region=None, dotenv_path=None):
        if self.provider == "env":
            return _from_env(keys)
        if self.provider == "dotenv":
            return _from_dotenv(dotenv_path, keys)
        if self.provider == "aws":
            return _from_aws(path, region)
        if self.provider == "vault":
            return _from_vault(path)
        raise SecretsError(f"Unknown provider: {self.provider}")


def _from_env(keys):
    if not keys:
        raise SecretsError("keys required for provider=env")
    missing = [k for k in keys if k not in os.environ]
    if missing:
        raise SecretsError(f"Missing env keys: {', '.join(missing)}")
    return {k: os.environ[k] for k in keys}


def _from_dotenv(dotenv_path, keys):
    if not dotenv_path:
        raise SecretsError("dotenv_path required for provider=dotenv")
    if not keys:
        raise SecretsError("keys required for provider=dotenv")
    values = dotenv_values(dotenv_path)
    missing = [k for k in keys if k not in values or values[k] is None]
    if missing:
        raise SecretsError(f"Missing dotenv keys: {', '.join(missing)}")
    return {k: values[k] for k in keys}


def _from_aws(secret_id, region):
    if not secret_id:
        raise SecretsError("path (secret id) required for provider=aws")
    try:
        import boto3
    except Exception as exc:
        raise SecretsError("boto3 is required for provider=aws") from exc
    client = boto3.client("secretsmanager", region_name=region)
    resp = client.get_secret_value(SecretId=secret_id)
    if "SecretString" in resp:
        return _parse_secret_value(resp["SecretString"])
    if "SecretBinary" in resp:
        raw = base64.b64decode(resp["SecretBinary"]).decode("utf-8")
        return _parse_secret_value(raw)
    raise SecretsError("Secret has no value")


def _from_vault(path):
    addr = os.getenv("VAULT_ADDR")
    token = os.getenv("VAULT_TOKEN")
    if not addr or not token:
        raise SecretsError("VAULT_ADDR and VAULT_TOKEN required for provider=vault")
    if not path:
        raise SecretsError("path required for provider=vault")
    path = path.lstrip("/")
    if "/data/" not in path:
        path = f"secret/data/{path}"
    url = f"{addr.rstrip('/')}/v1/{path}"
    import requests
    resp = requests.get(url, headers={"X-Vault-Token": token}, timeout=20)
    if resp.status_code != 200:
        raise SecretsError(f"Vault error: {resp.status_code} {resp.text}")
    payload = resp.json()
    data = payload.get("data", {}).get("data", {})
    if not data:
        raise SecretsError("Vault returned empty data")
    return data


def _parse_secret_value(val):
    val = val.strip()
    if val.startswith("{"):
        try:
            return json.loads(val)
        except Exception:
            pass
    # key=value per line fallback
    out = {}
    for line in val.splitlines():
        if not line.strip() or line.strip().startswith("#"):
            continue
        if "=" not in line:
            continue
        k, v = line.split("=", 1)
        out[k.strip()] = v.strip()
    if not out:
        raise SecretsError("Secret value not JSON or key=value")
    return out


def write_env_file(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    lines = [f"{k}={v}" for k, v in data.items()]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_k8s_secret_yaml(path, name, namespace, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    body = {
        "apiVersion": "v1",
        "kind": "Secret",
        "metadata": {"name": name, "namespace": namespace},
        "stringData": data,
    }
    path.write_text(yaml.safe_dump(body, sort_keys=False), encoding="utf-8")


def encrypt_sops(path):
    path = Path(path)
    if not path.exists():
        raise SecretsError(f"File not found: {path}")
    proc = subprocess.run(["sops", "-e", "-i", str(path)], capture_output=True, text=True)
    if proc.returncode != 0:
        raise SecretsError(proc.stderr.strip() or proc.stdout.strip())


def gh_set_secrets(secrets, repo=None, env_name=None):
    if not shutil_which("gh"):
        raise SecretsError("gh CLI not found")
    for name, value in secrets.items():
        cmd = ["gh", "secret", "set", name]
        if repo:
            cmd += ["-R", repo]
        if env_name:
            cmd += ["--env", env_name]
        proc = subprocess.run(cmd, input=value, text=True, capture_output=True)
        if proc.returncode != 0:
            raise SecretsError(proc.stderr.strip() or proc.stdout.strip())


def shutil_which(name):
    from shutil import which
    return which(name)
