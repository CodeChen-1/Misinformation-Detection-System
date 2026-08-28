import subprocess
import sys
import os
import signal

# Windows uses cmd.exe for npm; macOS/Linux use the real binary directly.
_USE_SHELL = sys.platform == "win32"


# If a project-level venv exists, use its Python explicitly so uvicorn is found
# regardless of terminal activation state or VS Code interpreter selection.
def _venv_python():
    root = os.path.dirname(os.path.abspath(__file__))
    venv = os.path.join(root, "venv")
    if not os.path.exists(venv):
        return None
    bin_dir = "Scripts" if sys.platform == "win32" else "bin"
    python = os.path.join(venv, bin_dir, "python")
    if sys.platform == "win32" and not os.path.exists(python):
        python += ".exe"
    return python if os.path.exists(python) else None


# Launch both the FastAPI backend and the React frontend, then cleanly shut both on Ctrl+C.
def main():
    frontend_dir = os.path.join(os.path.dirname(__file__), "frontend")

    print("Installing frontend dependencies...")
    try:
        subprocess.run(["npm", "install"], cwd=frontend_dir, shell=_USE_SHELL, check=True)
    except KeyboardInterrupt:
        print("\nInstallation cancelled.")
        sys.exit(1)
    except subprocess.CalledProcessError:
        print("npm install failed.")
        sys.exit(1)
    python = _venv_python() or sys.executable

    print("Starting Misinformation Detection API...")
    backend = subprocess.Popen(
        [python, "-m", "uvicorn", "backend.main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"],
        cwd=os.path.dirname(__file__),
    )

    print("Starting Frontend dev server...")
    frontend = subprocess.Popen(
        ["npm", "start"],
        cwd=frontend_dir,
        shell=_USE_SHELL,
    )

    # Kill both servers when the user hits Ctrl+C or the process gets SIGTERM.
    def shutdown(signum, frame):
        print("\nShutting down...")
        backend.terminate()
        frontend.terminate()
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    try:
        backend.wait()
        frontend.wait()
    except KeyboardInterrupt:
        shutdown(None, None)

if __name__ == "__main__":
    main()
