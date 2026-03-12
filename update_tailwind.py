import re

with open('/home/tra01/project/karag/src/frontend/tailwind.config.ts', 'r') as f:
    content = f.read()

colors_to_inject = """
        "surface-variant": "#2f3544",
        "error": "#ffb4ab",
        "secondary-fixed": "#d3e4fe",
        "tertiary-container": "#df7412",
        "surface-container-high": "#242a39",
        "on-tertiary-fixed": "#311400",
        "on-error": "#690005",
        "primary-container": "#4d8eff",
        "inverse-surface": "#dde2f6",
        "background": "#0d1321",
        "on-secondary-container": "#a9bad3",
        "outline-variant": "#424754",
        "on-surface": "#dde2f6",
        "secondary-fixed-dim": "#b7c8e1",
        "tertiary": "#ffb786",
        "inverse-primary": "#005ac2",
        "on-tertiary": "#502400",
        "secondary": "#b7c8e1",
        "surface": "#0d1321",
        "on-tertiary-fixed-variant": "#723600",
        "primary-fixed-dim": "#adc6ff",
        "outline": "#8c909f",
        "tertiary-fixed-dim": "#ffb786",
        "on-tertiary-container": "#461f00",
        "tertiary-fixed": "#ffdcc6",
        "on-primary-container": "#00285d",
        "secondary-container": "#3a4a5f",
        "surface-container-lowest": "#080e1c",
        "on-primary-fixed": "#001a42",
        "on-surface-variant": "#c2c6d6",
        "surface-container": "#191f2e",
        "on-primary": "#002e6a",
        "surface-container-low": "#151b29",
        "surface-dim": "#0d1321",
        "on-secondary-fixed": "#0b1c30",
        "surface-container-highest": "#2f3544",
        "surface-bright": "#333948",
        "primary": "#adc6ff",
        "on-background": "#dde2f6",
        "error-container": "#93000a",
        "on-secondary": "#213145",
        "on-primary-fixed-variant": "#004395",
        "surface-tint": "#adc6ff",
        "on-error-container": "#ffdad6",
        "primary-fixed": "#d8e2ff",
        "on-secondary-fixed-variant": "#38485d",
        "inverse-on-surface": "#2a303f",
"""

new_content = re.sub(r'(colors: \{)', r'\1\n' + colors_to_inject, content)

fonts_to_inject = """
        headline: ["Manrope", "sans-serif"],
        body: ["Inter", "sans-serif"],
        label: ["Inter", "sans-serif"],
"""

new_content = re.sub(r'(fontFamily: \{)', r'\1\n' + fonts_to_inject, new_content)

with open('/home/tra01/project/karag/src/frontend/tailwind.config.ts', 'w') as f:
    f.write(new_content)
