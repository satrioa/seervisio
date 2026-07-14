interface PdfxTheme {
  name: string;
  primitives: {
    typography: Record<string, number>;
    spacing: Record<string | number, number>;
    fontWeights: { regular: number; medium: number; semibold: number; bold: number };
    lineHeights: { tight: number; normal: number; relaxed: number };
    borderRadius: { none: number; sm: number; md: number; lg: number; full: number };
    letterSpacing: { tight: number; normal: number; wide: number; wider: number };
  };
  colors: {
    foreground: string;
    background: string;
    muted: string;
    mutedForeground: string;
    primary: string;
    primaryForeground: string;
    border: string;
    accent: string;
    destructive: string;
    success: string;
    warning: string;
    info: string;
  };
  typography: {
    body: { fontFamily: string; fontSize: number; lineHeight: number };
    heading: {
      fontFamily: string;
      fontWeight: number;
      lineHeight: number;
      fontSize: { h1: number; h2: number; h3: number; h4: number; h5: number; h6: number };
    };
  };
  spacing: {
    page: { marginTop: number; marginRight: number; marginBottom: number; marginLeft: number };
    sectionGap: number;
    paragraphGap: number;
    componentGap: number;
  };
  page: {
    size: 'A4' | 'LETTER' | 'LEGAL';
    orientation: 'portrait' | 'landscape';
  };
}

export const theme: PdfxTheme = {
  name: "seervis-premium",

  primitives: {
    typography: {
      xs: 7,
      sm: 9,
      base: 10,
      lg: 13,
      xl: 17,
      '2xl': 22,
      '3xl': 30,
    },
    spacing: {
      0: 0,
      0.5: 2,
      1: 4,
      2: 8,
      3: 12,
      4: 16,
      5: 20,
      6: 24,
      8: 32,
      10: 40,
      12: 48,
      16: 64,
    },
    fontWeights: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeights: {
      tight: 1.15,
      normal: 1.35,
      relaxed: 1.5,
    },
    borderRadius: {
      none: 0,
      sm: 2,
      md: 4,
      lg: 6,
      full: 9999,
    },
    letterSpacing: {
      tight: -0.02,
      normal: 0,
      wide: 0.03,
      wider: 0.06,
    },
  },

  colors: {
    foreground: "#1a1a2e",
    background: "#ffffff",
    muted: "#f8f9fb",
    mutedForeground: "#88909a",
    primary: "#1a1a2e",
    primaryForeground: "#ffffff",
    border: "#eaecf0",
    accent: "#2563eb",
    destructive: "#dc2626",
    success: "#16a34a",
    warning: "#d97706",
    info: "#0ea5e9",
  },

  typography: {
    body: {
      fontFamily: "Helvetica",
      fontSize: 9,
      lineHeight: 1.5,
    },
    heading: {
      fontFamily: "Helvetica-Bold",
      fontWeight: 700,
      lineHeight: 1.15,
      fontSize: {
        h1: 26,
        h2: 20,
        h3: 16,
        h4: 13,
        h5: 11,
        h6: 10,
      },
    },
  },

  spacing: {
    page: {
      marginTop: 40,
      marginRight: 40,
      marginBottom: 48,
      marginLeft: 40,
    },
    sectionGap: 22,
    paragraphGap: 8,
    componentGap: 10,
  },

  page: {
    size: "A4",
    orientation: "portrait",
  },
};
