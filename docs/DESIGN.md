# The Next Klopp design constitution

This document governs how every screen of The Next Klopp looks, moves and behaves: the anti-slop rules, the picked visual direction, the foundations (colour, type, spacing, icons, motion), the Pitch Standard, the interaction components, the lesson templates, the data-viz standards and the quality bar each screen must clear. It is the single source of the design tokens: `src/styles/tokens.css` is generated from the one `tokens` block in section 3.7 by `node scripts/design/build-tokens.ts`, and `npm test` fails when the two drift apart. Change a token here, never in the CSS.

## 1. Principles and anti-slop rules

This section covers brief section 9.1 (design principles, do and don't lists, banned patterns).

## 2. Visual direction

This section covers brief section 9.2 (the visual directions checkpoint and the picked direction).

## 3. Foundations

This section covers brief section 9.3 (colour, typography, spacing, grid, radius, elevation, iconography and the motion language).

### 3.7 Tokens

```tokens
{
  "meta": {
    "direction": "floodlit",
    "tokensVersion": 1,
    "primaryTheme": "dark"
  },
  "color": {
    "light": {
      "surface-page": {
        "$type": "color",
        "$value": "#F3F5F7"
      },
      "surface-panel": {
        "$type": "color",
        "$value": "#D8E0E7"
      },
      "surface-raised": {
        "$type": "color",
        "$value": "#FFFFFF"
      },
      "accent": {
        "$type": "color",
        "$value": "#0A7558"
      },
      "accent-ink": {
        "$type": "color",
        "$value": "#FFFFFF"
      },
      "ink": {
        "$type": "color",
        "$value": "#111922"
      },
      "ink-muted": {
        "$type": "color",
        "$value": "#4C5967"
      },
      "control-border": {
        "$type": "color",
        "$value": "#6B7987"
      },
      "danger": {
        "$type": "color",
        "$value": "#B3261E"
      },
      "focus-ring": {
        "$type": "color",
        "$value": "{color.accent}"
      },
      "surface-highlight": {
        "$type": "color",
        "$value": "{color.surface-raised}"
      },
      "surface-highlight-ink": {
        "$type": "color",
        "$value": "{color.ink}"
      }
    },
    "dark": {
      "surface-page": {
        "$type": "color",
        "$value": "#0E151D"
      },
      "surface-panel": {
        "$type": "color",
        "$value": "#1C2834"
      },
      "surface-raised": {
        "$type": "color",
        "$value": "#243241"
      },
      "accent": {
        "$type": "color",
        "$value": "#6FD0AE"
      },
      "accent-ink": {
        "$type": "color",
        "$value": "#0E151D"
      },
      "ink": {
        "$type": "color",
        "$value": "#E8EDF1"
      },
      "ink-muted": {
        "$type": "color",
        "$value": "#9CA8B4"
      },
      "control-border": {
        "$type": "color",
        "$value": "#6A7B8B"
      },
      "danger": {
        "$type": "color",
        "$value": "#F2857A"
      },
      "focus-ring": {
        "$type": "color",
        "$value": "{color.accent}"
      },
      "surface-highlight": {
        "$type": "color",
        "$value": "{color.surface-raised}"
      },
      "surface-highlight-ink": {
        "$type": "color",
        "$value": "{color.ink}"
      }
    }
  },
  "pitch": {
    "light": {
      "pitch-runoff": {
        "$type": "color",
        "$value": "#DCE3E9"
      },
      "pitch-surface": {
        "$type": "color",
        "$value": "#E9EEF2"
      },
      "pitch-line": {
        "$type": "color",
        "$value": "#66778A"
      },
      "team-a": {
        "$type": "color",
        "$value": "#0072B2"
      },
      "team-a-ink": {
        "$type": "color",
        "$value": "#FFFFFF"
      },
      "team-b": {
        "$type": "color",
        "$value": "#D55E00"
      },
      "team-b-fill": {
        "$type": "color",
        "$value": "#FFFFFF"
      },
      "team-b-ink": {
        "$type": "color",
        "$value": "#111922"
      },
      "ball-fill": {
        "$type": "color",
        "$value": "#FFFFFF"
      },
      "ball-ring": {
        "$type": "color",
        "$value": "#111922"
      },
      "zone-fill": {
        "$type": "color",
        "$value": "#F0E442"
      },
      "zone-fill-opacity": {
        "$type": "number",
        "$value": 0.45
      },
      "zone-line": {
        "$type": "color",
        "$value": "#4C5967"
      },
      "highlight": {
        "$type": "color",
        "$value": "#111922"
      },
      "density-mark": {
        "$type": "color",
        "$value": "#1119224D"
      },
      "label-bg": {
        "$type": "color",
        "$value": "#FFFFFF"
      },
      "label-border": {
        "$type": "color",
        "$value": "#B8C3CC"
      }
    },
    "dark": {
      "pitch-runoff": {
        "$type": "color",
        "$value": "#121B24"
      },
      "pitch-surface": {
        "$type": "color",
        "$value": "#182431"
      },
      "pitch-line": {
        "$type": "color",
        "$value": "#71859A"
      },
      "team-a": {
        "$type": "color",
        "$value": "#3A97DA"
      },
      "team-a-ink": {
        "$type": "color",
        "$value": "#0E151D"
      },
      "team-b": {
        "$type": "color",
        "$value": "#C77F00"
      },
      "team-b-fill": {
        "$type": "color",
        "$value": "#0E151D"
      },
      "team-b-ink": {
        "$type": "color",
        "$value": "#E8EDF1"
      },
      "ball-fill": {
        "$type": "color",
        "$value": "#FFFFFF"
      },
      "ball-ring": {
        "$type": "color",
        "$value": "#0E151D"
      },
      "zone-fill": {
        "$type": "color",
        "$value": "#F0E442"
      },
      "zone-fill-opacity": {
        "$type": "number",
        "$value": 0.2
      },
      "zone-line": {
        "$type": "color",
        "$value": "#C9C27A"
      },
      "highlight": {
        "$type": "color",
        "$value": "#E8EDF1"
      },
      "density-mark": {
        "$type": "color",
        "$value": "#E8EDF159"
      },
      "label-bg": {
        "$type": "color",
        "$value": "#0E151D"
      },
      "label-border": {
        "$type": "color",
        "$value": "#5E6E7D"
      }
    },
    "glyphText": {
      "$type": "typography",
      "$value": {
        "fontFamily": "{font.sans}",
        "fontSize": {
          "value": 12,
          "unit": "px"
        },
        "fontWeight": 600,
        "lineHeight": 1
      }
    }
  },
  "data": {
    "light": {
      "cat-1": {
        "$type": "color",
        "$value": "#0072B2"
      },
      "cat-2": {
        "$type": "color",
        "$value": "#D55E00"
      },
      "cat-3": {
        "$type": "color",
        "$value": "#009E73"
      },
      "cat-other": {
        "$type": "color",
        "$value": "#6B7987"
      },
      "seq-1": {
        "$type": "color",
        "$value": "#D3ECE6"
      },
      "seq-2": {
        "$type": "color",
        "$value": "#62B5A3"
      },
      "seq-3": {
        "$type": "color",
        "$value": "#3A9F8E"
      },
      "seq-4": {
        "$type": "color",
        "$value": "#1B7A6C"
      },
      "seq-5": {
        "$type": "color",
        "$value": "#0B4F47"
      },
      "div-neg": {
        "$type": "color",
        "$value": "#8C510A"
      },
      "div-mid": {
        "$type": "color",
        "$value": "#EEF0F1"
      },
      "div-pos": {
        "$type": "color",
        "$value": "#0A8F7F"
      }
    },
    "dark": {
      "cat-1": {
        "$type": "color",
        "$value": "#3A97DA"
      },
      "cat-2": {
        "$type": "color",
        "$value": "#C77F00"
      },
      "cat-3": {
        "$type": "color",
        "$value": "#3DAA6E"
      },
      "cat-other": {
        "$type": "color",
        "$value": "#9AA7B3"
      },
      "seq-1": {
        "$type": "color",
        "$value": "#173A3A"
      },
      "seq-2": {
        "$type": "color",
        "$value": "#1B5E57"
      },
      "seq-3": {
        "$type": "color",
        "$value": "#24857A"
      },
      "seq-4": {
        "$type": "color",
        "$value": "#4FB3A2"
      },
      "seq-5": {
        "$type": "color",
        "$value": "#9EDCCF"
      },
      "div-neg": {
        "$type": "color",
        "$value": "#B0702A"
      },
      "div-mid": {
        "$type": "color",
        "$value": "#3A3F45"
      },
      "div-pos": {
        "$type": "color",
        "$value": "#26A896"
      }
    }
  },
  "font": {
    "display": {
      "$type": "fontFamily",
      "$value": ["Mona Sans", "ui-sans-serif", "system-ui", "sans-serif"],
      "$extensions": {
        "tnk": {
          "stretch": "125%",
          "licence": "OFL-1.1",
          "files": [
            {
              "src": "/fonts/mona-sans/mona-sans-latin-wdth-normal.woff2",
              "weight": "200 900",
              "stretch": "75% 125%",
              "style": "normal"
            }
          ]
        }
      }
    },
    "sans": {
      "$type": "fontFamily",
      "$value": ["Mona Sans", "ui-sans-serif", "system-ui", "sans-serif"]
    },
    "mono": {
      "$type": "fontFamily",
      "$value": ["Geist Mono", "ui-monospace", "Consolas", "monospace"],
      "$extensions": {
        "tnk": {
          "licence": "OFL-1.1",
          "files": [
            {
              "src": "/fonts/geist-mono/geist-mono-latin-wght-normal.woff2",
              "weight": "100 900",
              "style": "normal"
            }
          ]
        }
      }
    }
  },
  "text": {
    "label": {
      "$type": "typography",
      "$value": {
        "fontFamily": "{font.sans}",
        "fontSize": {
          "value": 14,
          "unit": "px"
        },
        "fontWeight": 400,
        "lineHeight": 1.4
      }
    },
    "body": {
      "$type": "typography",
      "$value": {
        "fontFamily": "{font.sans}",
        "fontSize": {
          "value": 16,
          "unit": "px"
        },
        "fontWeight": 400,
        "lineHeight": 1.5
      }
    },
    "heading": {
      "$type": "typography",
      "$value": {
        "fontFamily": "{font.display}",
        "fontSize": {
          "value": 24,
          "unit": "px"
        },
        "fontWeight": 600,
        "lineHeight": 1.25
      }
    },
    "display": {
      "$type": "typography",
      "$value": {
        "fontFamily": "{font.display}",
        "fontSize": {
          "value": 36,
          "unit": "px"
        },
        "fontWeight": 600,
        "lineHeight": 1.1
      }
    }
  },
  "space": {
    "xs": {
      "$type": "dimension",
      "$value": {
        "value": 4,
        "unit": "px"
      }
    },
    "sm": {
      "$type": "dimension",
      "$value": {
        "value": 8,
        "unit": "px"
      }
    },
    "md": {
      "$type": "dimension",
      "$value": {
        "value": 16,
        "unit": "px"
      }
    },
    "lg": {
      "$type": "dimension",
      "$value": {
        "value": 24,
        "unit": "px"
      }
    },
    "xl": {
      "$type": "dimension",
      "$value": {
        "value": 32,
        "unit": "px"
      }
    },
    "2xl": {
      "$type": "dimension",
      "$value": {
        "value": 48,
        "unit": "px"
      }
    },
    "3xl": {
      "$type": "dimension",
      "$value": {
        "value": 64,
        "unit": "px"
      }
    }
  },
  "radius": {
    "sm": {
      "$type": "dimension",
      "$value": {
        "value": 2,
        "unit": "px"
      }
    },
    "md": {
      "$type": "dimension",
      "$value": {
        "value": 4,
        "unit": "px"
      }
    },
    "lg": {
      "$type": "dimension",
      "$value": {
        "value": 6,
        "unit": "px"
      }
    }
  },
  "shadow": {
    "sheet": {
      "$type": "shadow",
      "$value": []
    }
  },
  "border": {
    "rule": {
      "$type": "dimension",
      "$value": {
        "value": 1,
        "unit": "px"
      }
    }
  },
  "duration": {
    "ui": {
      "$type": "duration",
      "$value": {
        "value": 160,
        "unit": "ms"
      }
    },
    "draw": {
      "$type": "duration",
      "$value": {
        "value": 240,
        "unit": "ms"
      }
    },
    "morph": {
      "$type": "duration",
      "$value": {
        "value": 640,
        "unit": "ms"
      }
    },
    "stagger-line": {
      "$type": "duration",
      "$value": {
        "value": 60,
        "unit": "ms"
      }
    }
  },
  "easing": {
    "ui": {
      "$type": "cubicBezier",
      "$value": [0.2, 0, 0, 1]
    },
    "morph": {
      "$type": "cubicBezier",
      "$value": [0.65, 0, 0.35, 1]
    }
  },
  "icon": {
    "stroke": {
      "$type": "dimension",
      "$value": {
        "value": 1.5,
        "unit": "px"
      },
      "$extensions": {
        "tnk": {
          "linecap": "square"
        }
      }
    }
  }
}
```

## 4. Pitch Standard

This section covers brief section 9.4 (the canonical pitch renderer, coordinate systems, glyphs and the notation legend).

## 5. Interaction component catalogue

This section covers brief section 9.5 (every interaction component with its purpose, controls, learning goal, states, data and accessibility fallback).

## 6. Lesson templates

This section covers brief section 9.6 (page layouts for the concept, simulation, data lab, case study, regulation, review and capstone lessons).

## 7. Data-viz standards

This section covers brief section 9.7 (chart choice, axis and label rules, annotation style and uncertainty display).

## 8. Quality bar

This section covers brief section 9.8 (how every screen is reviewed: screenshots at 3 widths, the taste rubric, accessibility and the performance budget).
