
# Strict characters that are fundamentally unsafe for URLs or Shells
# We allow parentheses, @, !, &, $, etc. in logical names but sanitize for filesystem
ILLEGAL_NAME_CHARS = ['/', '\\', ':', '*', '?', '"', '<', '>', '|']

# Additional characters that are strictly discouraged for WORKSPACE names 
# but we are relaxing this to allow for more natural names.
# Keeping it minimal to ensure broad compatibility.
WORKSPACE_NAME_FORBIDDEN = ['/', '\\', ':', '*', '?', '"', '<', '>', '|']
