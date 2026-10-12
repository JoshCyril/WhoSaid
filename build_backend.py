import os
import shutil
import PyInstaller.__main__
from PyInstaller.utils.hooks import collect_data_files, collect_dynamic_libs

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def build():
    print("=" * 60)
    print("Building standalone WhoSaid Backend with PyInstaller...")
    print("=" * 60)

    # Clean previous build artifacts
    for d in ["dist_backend", "build_backend"]:
        full_d = os.path.join(BASE_DIR, d)
        if os.path.exists(full_d):
            try:
                shutil.rmtree(full_d)
            except Exception as e:
                print(f"Notice cleaning {d}: {e}")

    # Collect package data and dynamic libraries
    datas = [
        (os.path.join(BASE_DIR, "models"), "models"),
        (os.path.join(BASE_DIR, "static"), "static"),
        (os.path.join(BASE_DIR, "storage"), "storage"),
    ]

    # Collect imageio_ffmpeg
    try:
        ffmpeg_datas = collect_data_files("imageio_ffmpeg")
        datas.extend(ffmpeg_datas)
    except Exception as e:
        print(f"Warning collecting imageio_ffmpeg datas: {e}")

    # Collect soundfile
    try:
        import _soundfile_data
        soundfile_dir = os.path.dirname(_soundfile_data.__file__)
        datas.append((soundfile_dir, "_soundfile_data"))
    except Exception as e:
        print(f"Warning collecting _soundfile_data: {e}")

    # Collect sherpa_onnx
    try:
        sherpa_libs = collect_dynamic_libs("sherpa_onnx")
        sherpa_datas = collect_data_files("sherpa_onnx")
        datas.extend(sherpa_datas)
    except Exception as e:
        print(f"Warning collecting sherpa_onnx datas: {e}")
        sherpa_libs = []

    # Collect ctranslate2
    try:
        ct2_libs = collect_dynamic_libs("ctranslate2")
        ct2_datas = collect_data_files("ctranslate2")
        datas.extend(ct2_datas)
    except Exception as e:
        print(f"Warning collecting ctranslate2 datas: {e}")
        ct2_libs = []

    # Collect faster_whisper
    try:
        fw_datas = collect_data_files("faster_whisper")
        datas.extend(fw_datas)
    except Exception as e:
        print(f"Warning collecting faster_whisper datas: {e}")

    binaries = []
    binaries.extend(sherpa_libs)
    binaries.extend(ct2_libs)

    # Hidden imports required by FastAPI, Uvicorn, and engines
    hidden_imports = [
        "uvicorn",
        "uvicorn.logging",
        "uvicorn.loops",
        "uvicorn.loops.auto",
        "uvicorn.protocols",
        "uvicorn.protocols.http",
        "uvicorn.protocols.http.auto",
        "uvicorn.protocols.http.h11_impl",
        "uvicorn.protocols.http.httptools_impl",
        "uvicorn.protocols.websockets",
        "uvicorn.protocols.websockets.auto",
        "uvicorn.protocols.websockets.websockets_impl",
        "uvicorn.lifespan",
        "uvicorn.lifespan.on",
        "uvicorn.lifespan.off",
        "backend",
        "backend.main",
        "backend.audio",
        "backend.db",
        "backend.diarizer",
        "backend.transcriber",
        "backend.exporter",
        "backend.cleanup",
        "sherpa_onnx",
        "faster_whisper",
        "ctranslate2",
        "sqlite3",
        "soundfile",
        "imageio_ffmpeg",
        "multiprocessing",
    ]

    # Exclude unused large third-party packages to keep build fast, lean, and clean
    excludes = [
        "torch",
        "torchvision",
        "torchaudio",
        "scipy",
        "pandas",
        "matplotlib",
        "transformers",
        "sentence_transformers",
        "IPython",
        "ipykernel",
        "jupyter",
        "PySide6",
        "shiboken6",
        "tkinter",
        "playwright",
        "fitz",
        "PyMuPDF",
    ]

    args = [
        os.path.join(BASE_DIR, "run.py"),
        "--noconfirm",
        "--onedir",
        "--name=whosaid-backend",
        f"--distpath={os.path.join(BASE_DIR, 'dist_backend')}",
        f"--workpath={os.path.join(BASE_DIR, 'build_backend')}",
    ]

    for src, dst in datas:
        if os.path.exists(src):
            args.append(f"--add-data={src};{dst}")

    for src, dst in binaries:
        if os.path.exists(src):
            args.append(f"--add-binary={src};{dst}")

    for imp in hidden_imports:
        args.append(f"--hidden-import={imp}")

    for exc in excludes:
        args.append(f"--exclude-module={exc}")

    icon_path = os.path.join(BASE_DIR, "build", "icon.ico")
    if os.path.exists(icon_path):
        args.append(f"--icon={icon_path}")

    print(f"Running PyInstaller with {len(args)} arguments...")
    PyInstaller.__main__.run(args)
    print("PyInstaller build complete!")

if __name__ == "__main__":
    build()
