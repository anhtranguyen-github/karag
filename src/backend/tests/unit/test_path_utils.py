import os
from pathlib import Path

import pytest
from src.backend.app.core.exceptions import ValidationError
from src.backend.app.core.path_utils import BASE_DIR, validate_safe_path


def test_validate_safe_path_valid_relative():
    # Relative path within root
    path = "src/backend/app/main.py"
    resolved = validate_safe_path(path)
    assert resolved == (BASE_DIR / path).resolve()


def test_validate_safe_path_valid_absolute():
    # Absolute path within root
    path = str(BASE_DIR / "src/backend/app/main.py")
    resolved = validate_safe_path(path)
    assert resolved == Path(path).resolve()


def test_validate_safe_path_traversal_attack():
    # Classic traversal attack
    path = "../../etc/passwd"
    with pytest.raises(ValidationError) as excinfo:
        validate_safe_path(path)
    assert "escapes the authorized workspace root" in str(excinfo.value)


def test_validate_safe_path_absolute_outside_root():
    # Absolute path outside root
    path = "/etc/passwd"
    with pytest.raises(ValidationError) as excinfo:
        validate_safe_path(path)
    assert "escapes the authorized workspace root" in str(excinfo.value)


def test_validate_safe_path_complex_traversal():
    # Complex traversal that ends up inside but tries to sneak out
    path = "src/backend/../src/backend/app/main.py"
    resolved = validate_safe_path(path)
    assert resolved == (BASE_DIR / "src/backend/app/main.py").resolve()


def test_validate_safe_path_symlink_jailbreak(tmp_path):
    # This test simulates a symlink that points outside the root
    # We create a local root for testing
    test_root = tmp_path / "root"
    test_root.mkdir()

    outside_dir = tmp_path / "outside"
    outside_dir.mkdir()
    outside_file = outside_dir / "secret.txt"
    outside_file.write_text("secret")

    # Create a symlink inside root pointing to outside
    link_path = test_root / "bad_link"
    os.symlink(outside_dir, link_path)

    # Validating a path that goes through the bad link should fail
    with pytest.raises(ValidationError) as excinfo:
        validate_safe_path("bad_link/secret.txt", base_dir=test_root)
    assert "escapes the authorized workspace root" in str(excinfo.value)


def test_validate_safe_path_null_byte():
    # Null byte injection attempt
    path = "test.txt\0.pdf"
    with pytest.raises(ValidationError):  # Pathlib or OS will likely complain
        validate_safe_path(path)


