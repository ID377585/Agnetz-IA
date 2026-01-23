import argparse
import os
from pathlib import Path

from dotenv import load_dotenv
from rich import print

from orchestrator import Orchestrator
from test_runner import run_docker_tests
from autofix import run_autofix
from sandbox import run_in_sandbox
from executor import ExecutionLoop
from logger import new_run_logger
from rag import RagIndex
from state import ProjectState
from git_ops import ensure_branch, commit_all, push, create_pr
from devops import build_images, push_images, deploy_gitops, rollback_git, image_tag
from safety import needs_confirm, confirm_or_abort
from secrets_manager import (
    SecretsManager,
    write_env_file,
    write_k8s_secret_yaml,
    encrypt_sops,
    gh_set_secrets,
)


def parse_args():
    p = argparse.ArgumentParser(description="Agnetz IA - Orquestrador Python (Ollama)")
    p.add_argument("--request", "-r", help="Pedido do usuário")
    p.add_argument("--out", help="Diretório de saída")
    p.add_argument("--model", help="Modelo Ollama (ex.: llama3.1, mistral)")
    p.add_argument("--base-url", help="Base URL do Ollama")
    p.add_argument("--plan-only", action="store_true", help="Apenas gerar o plano")
    p.add_argument("--no-templates", action="store_true", help="Nao copiar templates")
    p.add_argument("--overwrite", action="store_true", help="Sobrescrever arquivos existentes")
    p.add_argument("--run-tests", action="store_true", help="Rodar testes via Docker")
    p.add_argument("--templates-only", action="store_true", help="Gerar apenas os templates (sem LLM)")
    p.add_argument("--gitops", action="store_true", help="Copiar manifests GitOps (k8s)")
    p.add_argument("--docker", action="store_true", help="Gerar Dockerfiles/docker-compose via LLM")
    p.add_argument("--ci", action="store_true", help="Gerar pipeline CI via LLM")
    p.add_argument("--review", action="store_true", help="Revisar arquivos gerados via LLM")
    p.add_argument("--autofix", action="store_true", help="Auto-corrigir falhas de testes via LLM")
    p.add_argument("--sandbox-cmd", help="Executar comando em sandbox Docker")
    p.add_argument("--sandbox-image", default="node:18", help="Imagem Docker para sandbox")
    p.add_argument("--run-loop", action="store_true", help="Executar loop completo (plan→gen→test→fix)")
    p.add_argument("--max-rounds", type=int, default=2, help="Max rodadas de auto-correção")
    p.add_argument("--test-timeout", type=int, default=900, help="Timeout de testes (segundos)")
    p.add_argument("--patch-max-files", type=int, default=10, help="Max arquivos em patch")
    p.add_argument("--patch-max-lines", type=int, default=400, help="Max linhas alteradas no patch")
    p.add_argument("--log-dir", default="python/logs", help="Diretório de logs JSONL")
    p.add_argument("--rag-index", help="Indexar caminhos (separados por ;) em Chroma")
    p.add_argument("--rag-query", help="Consultar o RAG e imprimir contexto")
    p.add_argument("--rag-db", default="python/rag_db", help="Diretório do RAG")
    p.add_argument("--rag-use", action="store_true", help="Usar RAG nos prompts")
    p.add_argument("--rag-paths", help="Caminhos para indexar (alias do --rag-index)")
    p.add_argument("--rag-topk", type=int, default=4, help="TopK de recuperação")
    p.add_argument("--state", action="store_true", help="Persistir estado do projeto")
    p.add_argument("--git-auto", action="store_true", help="Git: branch + commit + push")
    p.add_argument("--git-root", help="Diretório raiz do git")
    p.add_argument("--git-branch", default="agnetz/auto", help="Branch para automação")
    p.add_argument("--git-message", default="Agnetz: auto update", help="Mensagem do commit")
    p.add_argument("--git-remote", default="origin", help="Remote git")
    p.add_argument("--git-pr", action="store_true", help="Abrir PR via gh")
    p.add_argument("--git-pr-base", default="main", help="Branch base da PR")
    p.add_argument("--devops-build", action="store_true", help="Build de imagens Docker")
    p.add_argument("--devops-push", action="store_true", help="Push de imagens Docker")
    p.add_argument("--devops-deploy", action="store_true", help="Atualizar manifests GitOps com tag")
    p.add_argument("--devops-rollback", action="store_true", help="Rollback via git revert")
    p.add_argument("--devops-tag", help="Tag fixa para imagens")
    p.add_argument("--devops-k8s-path", default="k8s/apps/generated-app", help="Path dos manifests k8s")
    p.add_argument("--yes", action="store_true", help="Auto-confirmar ações perigosas")
    p.add_argument("--interactive", action="store_true", help="Modo interativo")
    p.add_argument("--show-plan", action="store_true", help="Mostrar resumo do plano")
    p.add_argument("--history", action="store_true", help="Mostrar ultimo log JSONL")
    p.add_argument("--secrets-provider", help="Secrets provider: env|dotenv|aws|vault")
    p.add_argument("--secrets-path", help="Secret path/id (aws/vault)")
    p.add_argument("--secrets-keys", help="Lista de keys separadas por , (env/dotenv)")
    p.add_argument("--secrets-dotenv", help="Caminho .env para provider=dotenv")
    p.add_argument("--secrets-region", help="AWS region para provider=aws")
    p.add_argument("--secrets-env-out", help="Salvar secrets em arquivo .env")
    p.add_argument("--secrets-k8s-out", help="Salvar Secret YAML em caminho")
    p.add_argument("--secrets-k8s-name", default="app-secrets", help="Nome do Secret k8s")
    p.add_argument("--secrets-k8s-namespace", default="agnetz-prod", help="Namespace do Secret k8s")
    p.add_argument("--secrets-sops", action="store_true", help="Criptografar com SOPS o Secret YAML")
    p.add_argument("--secrets-gh-repo", help="Repo GitHub (ex: owner/repo) para gh secret set")
    p.add_argument("--secrets-gh-env", help="Environment GitHub para secrets")
    return p.parse_args()


def main():
    load_dotenv()

    args = parse_args()
    request = args.request

    if not request:
        if args.interactive:
            request = input("Descreva o que deseja gerar: ").strip()
        if not request:
            print("[red]Você precisa informar --request.[/]")
            raise SystemExit(1)

    base_url = args.base_url or os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    model = args.model or os.getenv("OLLAMA_MODEL", "llama3.1")
    out_dir = args.out or os.getenv("OUTPUT_DIR", "generated-app")

    root = Path(__file__).resolve().parent
    prompts_dir = root / "prompts"
    templates_dir = root / "templates"

    retriever = None
    if args.rag_use:
        rag = RagIndex(db_dir=args.rag_db)
        retriever = rag

    orch = Orchestrator(
        base_url=base_url,
        model=model,
        output_dir=out_dir,
        prompts_dir=prompts_dir,
        templates_dir=templates_dir,
        retriever=retriever,
    )

    print(f"[cyan]Ollama:[/] {base_url} | [cyan]Model:[/] {model}")

    if args.rag_index or args.rag_paths:
        paths = (args.rag_index or args.rag_paths).split(";")
        rag = RagIndex(db_dir=args.rag_db)
        count = rag.index_paths(paths)
        print(f"[green]RAG indexado: {count} chunks[/]")
        return

    if args.rag_query:
        rag = RagIndex(db_dir=args.rag_db)
        ctx = rag.retrieve(args.rag_query, k=args.rag_topk)
        print(ctx)
        return

    if args.history:
        _show_last_log(args.log_dir)
        return

    if args.secrets_provider:
        _secrets_flow(args)
        return

    if args.templates_only:
        print("\n[bold]Aplicando templates apenas (sem LLM)...[/]")
        copied = orch.apply_templates(overwrite=args.overwrite)
        print(f"\n✅ Gerado em: {out_dir}")
        if copied:
            print("Arquivos copiados:")
            for f in copied:
                print(f"- {f}")
        if args.gitops:
            _copy_gitops(orch, out_dir, overwrite=args.overwrite)
        return

    state = None
    if args.state:
        state = ProjectState(out_dir)

    if args.run_loop:
        logger = new_run_logger(args.log_dir, name="loop")
        loop = ExecutionLoop(orch, logger=logger, state=state)
        result = loop.run(
            request,
            out_dir,
            use_templates=not args.no_templates,
            overwrite=args.overwrite,
            run_tests=args.run_tests or True,
            autofix=args.autofix or True,
            max_rounds=args.max_rounds,
            test_timeout=args.test_timeout,
            patch_max_files=args.patch_max_files,
            patch_max_lines=args.patch_max_lines,
        )
        print(f"[bold]Loop finalizado:[/] {result}")
        if args.git_auto:
            _git_auto(args, out_dir)
        return

    plan = orch.plan(request)
    if args.show_plan:
        print("[bold]Resumo do plano:[/]")
        print(plan.get("summary", ""))
        print(f"[bold]Arquivos:[/] {len(plan.get('files', []))}")

    if args.plan_only:
        print("\n[bold]Plano gerado (JSON):[/]")
        print(plan)
        return

    print("\n[bold]Gerando arquivos...[/]")
    _, generated, skipped = orch.run(
        request,
        use_templates=not args.no_templates,
        overwrite=args.overwrite,
    )
    print(f"\n✅ Gerado em: {out_dir}")
    print("Arquivos criados:")
    for f in generated:
        print(f"- {f}")
    if skipped:
        print("\nArquivos ignorados (ja existiam):")
        for f in skipped:
            print(f"- {f}")

    if args.gitops:
        _copy_gitops(orch, out_dir, overwrite=args.overwrite)

    if args.docker:
        _gen_docker(orch, out_dir, overwrite=args.overwrite)

    if args.ci:
        _gen_ci(orch, out_dir, overwrite=args.overwrite)

    if args.review:
        _review_project(orch, out_dir)

    if args.run_tests:
        print("\n[bold]Rodando testes em sandbox Docker...[/]")
        results = run_docker_tests(out_dir, timeout=args.test_timeout)
        for r in results:
            print(f"- {r['service']}: exit_code={r['exit_code']}")

    if args.autofix:
        print("\n[bold]Auto-correção de testes (LLM)...[/]")
        result = run_autofix(
            out_dir,
            orch,
            max_rounds=args.max_rounds,
            test_timeout=args.test_timeout,
            patch_max_files=args.patch_max_files,
            patch_max_lines=args.patch_max_lines,
        )
        print(f"- ok={result['ok']} rounds={result['rounds']}")
        if args.git_auto:
            _git_auto(args, out_dir)

    if args.devops_build or args.devops_push or args.devops_deploy or args.devops_rollback:
        _devops_flow(args, out_dir)

    if args.sandbox_cmd:
        cmd = args.sandbox_cmd.split()
        if needs_confirm(args.sandbox_cmd):
            confirm_or_abort(f"Executar comando: {args.sandbox_cmd}", yes=args.yes)
        res = run_in_sandbox(out_dir, cmd, image=args.sandbox_image)
        print(f"\n[sandbox] exit_code={res['exit_code']}")
        if res.get("stdout"):
            print(res["stdout"])
        if res.get("stderr"):
            print(res["stderr"])

def _copy_gitops(orch, out_dir, overwrite=False):
    src = orch.templates_dir / "k8s"
    if not src.exists():
        print("[yellow]Nenhum template GitOps encontrado.[/]")
        return
    dest = Path(out_dir) / "k8s"
    for p in src.rglob("*"):
        if p.is_dir():
            continue
        rel = p.relative_to(src)
        target = dest / rel
        if target.exists() and not overwrite:
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(p.read_text(encoding="utf-8"), encoding="utf-8")
    print("[green]GitOps copiado para output.[/]")


def _gen_docker(orch, out_dir, overwrite=False):
    out_dir = Path(out_dir)
    files = [
        out_dir / "backend" / "Dockerfile",
        out_dir / "frontend" / "Dockerfile",
        out_dir / "docker-compose.yml",
    ]
    for f in files:
        if f.exists() and not overwrite:
            continue
        content = orch.generate_docker(str(f.relative_to(out_dir)))
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_text(content, encoding="utf-8")
    print("[green]Dockerfiles/compose gerados.[/]")


def _gen_ci(orch, out_dir, overwrite=False):
    out_dir = Path(out_dir)
    path = out_dir / ".github" / "workflows" / "ci.yml"
    if path.exists() and not overwrite:
        print("[yellow]CI ja existe. Use --overwrite para substituir.[/]")
        return
    content = orch.generate_ci(".github/workflows/ci.yml")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    print("[green]CI gerado.[/]")


def _review_project(orch, out_dir):
    out_dir = Path(out_dir)
    targets = []
    for p in out_dir.rglob("*"):
        if p.is_dir():
            continue
        rel = p.relative_to(out_dir)
        if any(part in {"node_modules", "dist", "build", ".git"} for part in rel.parts):
            continue
        if p.suffix in {".png", ".jpg", ".jpeg", ".gif", ".ico"}:
            continue
        if p.stat().st_size > 200_000:
            continue
        targets.append(p)

    print(f"[review] arquivos: {len(targets)}")
    for p in targets[:50]:
        content = p.read_text(encoding="utf-8", errors="ignore")
        result = orch.review_file(str(p.relative_to(out_dir)), content)
        print(f"\n[review] {p}")
        print(result)


if __name__ == "__main__":
    main()


def _git_auto(args, out_dir):
    repo_root = args.git_root or Path(__file__).resolve().parent.parent
    if needs_confirm("git push") or args.git_pr:
        confirm_or_abort("Git push/PR", yes=args.yes)
    ensure_branch(repo_root, args.git_branch)
    commit_all(repo_root, args.git_message)
    push(repo_root, remote=args.git_remote, branch=args.git_branch)
    if args.git_pr:
        create_pr(repo_root, args.git_message, base=args.git_pr_base)


def _devops_flow(args, out_dir):
    repo_root = args.git_root or Path(__file__).resolve().parent.parent
    tag = args.devops_tag or image_tag()

    if args.devops_build:
        images = build_images(Path(out_dir), tag)
        print(f"[devops] built: {images}")
    if args.devops_push:
        confirm_or_abort("Docker push", yes=args.yes)
        push_images(tag)
        print("[devops] pushed")
    if args.devops_deploy:
        confirm_or_abort("Atualizar manifests GitOps", yes=args.yes)
        applied_tag = deploy_gitops(repo_root, k8s_path=args.devops_k8s_path, tag=tag)
        print(f"[devops] updated manifests to tag: {applied_tag}")
        if args.git_auto:
            _git_auto(args, out_dir)
    if args.devops_rollback:
        confirm_or_abort("Rollback via git revert", yes=args.yes)
        rollback_git(repo_root, commits=1)
        print("[devops] rollback committed")


def _show_last_log(log_dir):
    log_dir = Path(log_dir)
    if not log_dir.exists():
        print("[yellow]Nenhum log encontrado.[/]")
        return
    logs = sorted(log_dir.glob("*.jsonl"))
    if not logs:
        print("[yellow]Nenhum log encontrado.[/]")
        return
    last = logs[-1]
    print(f"[bold]Log:[/] {last}")
    print(last.read_text(encoding="utf-8"))


def _secrets_flow(args):
    keys = args.secrets_keys.split(",") if args.secrets_keys else None
    mgr = SecretsManager(args.secrets_provider)
    data = mgr.load(
        keys=keys,
        path=args.secrets_path,
        region=args.secrets_region,
        dotenv_path=args.secrets_dotenv,
    )

    print(f"[green]Secrets carregados:[/] {', '.join(sorted(data.keys()))}")

    if args.secrets_env_out:
        if needs_confirm("gravar .env"):
            confirm_or_abort(f"Gravar .env em {args.secrets_env_out}", yes=args.yes)
        write_env_file(args.secrets_env_out, data)
        print(f"[green]Arquivo .env salvo:[/] {args.secrets_env_out}")

    if args.secrets_k8s_out:
        if needs_confirm("gravar secret k8s"):
            confirm_or_abort(f"Gravar Secret YAML em {args.secrets_k8s_out}", yes=args.yes)
        write_k8s_secret_yaml(
            args.secrets_k8s_out,
            name=args.secrets_k8s_name,
            namespace=args.secrets_k8s_namespace,
            data=data,
        )
        if args.secrets_sops:
            if needs_confirm("sops encrypt"):
                confirm_or_abort("Criptografar Secret YAML com SOPS", yes=args.yes)
            encrypt_sops(args.secrets_k8s_out)
            print(f"[green]Secret criptografado com SOPS:[/] {args.secrets_k8s_out}")
        else:
            print(f"[green]Secret k8s gerado:[/] {args.secrets_k8s_out}")

    if args.secrets_gh_repo or args.secrets_gh_env:
        if needs_confirm("gh secret set"):
            confirm_or_abort("Enviar secrets para GitHub", yes=args.yes)
        gh_set_secrets(
            data,
            repo=args.secrets_gh_repo,
            env_name=args.secrets_gh_env,
        )
        print("[green]Secrets enviados ao GitHub.[/]")
