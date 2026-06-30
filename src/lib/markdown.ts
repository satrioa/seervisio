export function markdownToHtml(md: string): string {
  const lines = md.split("\n");
  const html: string[] = [];
  let inTable = false;
  let tableHtml = "";
  let inCodeBlock = false;
  let codeBlockHtml = "";
  let codeLang = "";
  let inList = false;
  let listType = "";
  let listHtml = "";
  let inCallout = false;
  let calloutType = "";
  let calloutTitle = "";
  let calloutHtml = "";

  const calloutIcons: Record<string, string> = {
    tip: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>',
    info: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
    warning: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
    success: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  };

  const calloutVariants: Record<string, { border: string; bg: string; titleColor: string; iconColor: string }> = {
    tip: {
      border: "border-emerald-500/30",
      bg: "bg-emerald-500/5",
      titleColor: "text-emerald-600 dark:text-emerald-400",
      iconColor: "text-emerald-500",
    },
    info: {
      border: "border-blue-500/30",
      bg: "bg-blue-500/5",
      titleColor: "text-blue-600 dark:text-blue-400",
      iconColor: "text-blue-500",
    },
    warning: {
      border: "border-amber-500/30",
      bg: "bg-amber-500/5",
      titleColor: "text-amber-600 dark:text-amber-400",
      iconColor: "text-amber-500",
    },
    success: {
      border: "border-emerald-500/30",
      bg: "bg-emerald-500/5",
      titleColor: "text-emerald-600 dark:text-emerald-400",
      iconColor: "text-emerald-500",
    },
  };

  function flushList() {
    if (inList) {
      html.push(`<${listType} class="my-3 space-y-1.5 pl-6 [&>li]:text-sm [&>li]:leading-relaxed [&>li]:list-disc">${listHtml}</${listType}>`);
      inList = false;
      listHtml = "";
      listType = "";
    }
  }

  function flushTable() {
    if (inTable) {
      html.push(`<div class="my-4 overflow-x-auto rounded-lg border border-border/50"><table class="min-w-full border-collapse text-sm">${tableHtml}</table></div>`);
      inTable = false;
      tableHtml = "";
    }
  }

  function flushCodeBlock() {
    if (inCodeBlock) {
      html.push(
        `<div class="group relative my-4 rounded-lg bg-muted/80">` +
        `<pre class="overflow-x-auto p-4 text-xs leading-relaxed"><code>${codeBlockHtml}</code></pre>` +
        `<button type="button" data-copy class="absolute right-2 top-2 hidden size-7 items-center justify-center rounded-md border bg-background text-muted-foreground shadow-sm transition-colors hover:text-foreground group-hover:flex" onclick="(function(btn){var code=btn.parentElement.querySelector('code');if(!code)return;navigator.clipboard.writeText(code.textContent||'').then(function(){btn.innerHTML='<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'14\\' height=\\'14\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'2\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\'><polyline points=\\'20 6 9 17 4 12\\'/></svg>';setTimeout(function(){btn.innerHTML='<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'14\\' height=\\'14\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'2\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\'><rect x=\\'9\\' y=\\'9\\' width=\\'13\\' height=\\'13\\' rx=\\'2\\' ry=\\'2\\'/><path d=\\'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1\\'/></svg>'},2000)}).catch(function(){})})(this)" aria-label="Copy code">` +
        `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>` +
        `</button></div>`
      );
      inCodeBlock = false;
      codeBlockHtml = "";
      codeLang = "";
    }
  }

  function flushCallout() {
    if (!inCallout) return;
    const v = calloutVariants[calloutType];
    const icon = calloutIcons[calloutType] ?? calloutIcons.info;
    html.push(
      `<div role="alert" class="relative my-4 w-full rounded-lg border ${v.border} ${v.bg} px-4 py-3 text-sm [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg~*]:pl-10">` +
      icon +
      `<span class="mb-1 block font-medium leading-none tracking-tight ${v.titleColor}">${escapeHtml(calloutTitle)}</span>` +
      `<div class="text-sm leading-relaxed text-foreground/85 [&_p]:mt-0">${calloutHtml}</div>` +
      `</div>`
    );
    inCallout = false;
    calloutType = "";
    calloutTitle = "";
    calloutHtml = "";
  }

  function inlineFormat(text: string): string {
    return text
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/`(.+?)`/g, "<code class=\"rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground/90\">$1</code>");
  }

  const calloutStartRegex = /^>\s*\*\*(Tip|Tips?|Info|Note|Catatan|Warning|Peringatan|Success|Sukses):\*\*\s*(.*)$/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Code block
    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        flushCodeBlock();
      } else {
        flushList();
        flushTable();
        flushCallout();
        codeLang = trimmed.slice(3).trim();
        inCodeBlock = true;
        codeBlockHtml = "";
      }
      continue;
    }
    if (inCodeBlock) {
      codeBlockHtml += (codeBlockHtml ? "\n" : "") + escapeHtml(trimmed);
      continue;
    }

    // Empty line
    if (trimmed === "") {
      flushList();
      flushTable();
      if (inCallout) {
        calloutHtml += "<br />";
      } else {
        html.push("");
      }
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(trimmed)) {
      flushList();
      flushTable();
      flushCallout();
      html.push("<hr class=\"my-8 border-border/30\" />");
      continue;
    }

    // Heading
    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      flushList();
      flushTable();
      flushCallout();
      const level = headingMatch[1].length;
      const text = inlineFormat(headingMatch[2]);
      const sizes: Record<number, string> = {
        1: "text-3xl font-bold tracking-tight mt-10 mb-4",
        2: "text-xl font-semibold tracking-tight mt-8 mb-3",
        3: "text-base font-semibold mt-6 mb-2",
      };
      html.push(`<h${level} class="${sizes[level]}">${text}</h${level}>`);
      continue;
    }

    // Callout start
    const calloutMatch = trimmed.match(calloutStartRegex);
    if (calloutMatch) {
      flushList();
      flushTable();
      flushCallout();
      const rawType = calloutMatch[1].toLowerCase();
      const rest = calloutMatch[2];
      if (rawType.startsWith("tip") || rawType === "tips") {
        calloutType = "tip";
        calloutTitle = "Tip";
      } else if (rawType.startsWith("warning") || rawType.startsWith("peringatan")) {
        calloutType = "warning";
        calloutTitle = "Warning";
      } else if (rawType.startsWith("success") || rawType.startsWith("sukses")) {
        calloutType = "success";
        calloutTitle = "Success";
      } else {
        calloutType = "info";
        calloutTitle = "Info";
      }
      inCallout = true;
      calloutHtml = rest ? `<p>${inlineFormat(rest)}</p>` : "";
      continue;
    }

    // Continue callout
    if (inCallout && trimmed.startsWith(">")) {
      const inner = trimmed.slice(1).trim();
      if (inner) {
        calloutHtml += `<p>${inlineFormat(inner)}</p>`;
      }
      continue;
    }
    if (inCallout && !trimmed.startsWith(">") && trimmed !== "") {
      flushCallout();
    }

    // Table row
    if (trimmed.startsWith("|")) {
      flushList();
      flushCallout();
      const cells = trimmed.split("|").slice(1, -1).map((c) => c.trim());
      const isHeader = /^[-:]+$/.test(cells[0] || "");

      if (isHeader) {
        continue;
      }

      if (!inTable) {
        inTable = true;
        tableHtml = "<thead><tr>" + cells.map((c) => `<th class="border-b bg-muted/30 px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">${inlineFormat(c)}</th>`).join("") + "</tr></thead><tbody>";
      } else {
        tableHtml += "<tr>" + cells.map((c) => `<td class="border-b border-border/40 px-4 py-2.5 text-xs text-foreground/85">${inlineFormat(c)}</td>`).join("") + "</tr>";
      }
      continue;
    }

    // Unordered list
    const ulMatch = trimmed.match(/^-\s+(.+)$/);
    if (ulMatch) {
      flushTable();
      flushCallout();
      if (!inList || listType !== "ul") {
        flushList();
        inList = true;
        listType = "ul";
      }
      listHtml += `<li>${inlineFormat(ulMatch[1])}</li>`;
      continue;
    }

    // Ordered list
    const olMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      flushTable();
      flushCallout();
      if (!inList || listType !== "ol") {
        flushList();
        inList = true;
        listType = "ol";
      }
      listHtml += `<li>${inlineFormat(olMatch[1])}</li>`;
      continue;
    }

    // Regular paragraph
    flushList();
    flushTable();
    if (trimmed) {
      html.push(`<p class="text-sm leading-[1.75] text-foreground/85">${inlineFormat(trimmed)}</p>`);
    }
  }

  flushList();
  flushTable();
  flushCodeBlock();
  flushCallout();

  return html.join("\n");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
