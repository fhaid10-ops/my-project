(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.HotmailVCard = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function decodeQuotedPrintable(input) {
    const soft = String(input).replace(/=\r?\n/g, "");
    const bytes = [];
    for (let i = 0; i < soft.length; i++) {
      if (soft[i] === "=" && /[0-9A-Fa-f]{2}/.test(soft.slice(i + 1, i + 3))) {
        bytes.push(parseInt(soft.slice(i + 1, i + 3), 16));
        i += 2;
      } else {
        bytes.push(soft.charCodeAt(i) & 0xff);
      }
    }
    if (typeof TextDecoder === "function") {
      return new TextDecoder("utf-8").decode(new Uint8Array(bytes));
    }
    return Buffer.from(bytes).toString("utf8");
  }

  function decodeValue(raw, params) {
    const encoding = String(params.ENCODING || params.encoding || "").toUpperCase();
    if (encoding === "QUOTED-PRINTABLE") return decodeQuotedPrintable(raw).trim();
    return String(raw).replace(/\\n/g, "\n").replace(/\\,/g, ",").trim();
  }

  function unfoldLines(text) {
    return String(text)
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\n[ \t]/g, "");
  }

  function parseProperty(line) {
    const colon = line.indexOf(":");
    if (colon < 0) return null;
    const left = line.slice(0, colon);
    const rawValue = line.slice(colon + 1);
    const parts = left.split(";");
    const name = String(parts[0] || "")
      .replace(/^item\d+\./i, "")
      .toUpperCase();
    const params = {};
    parts.slice(1).forEach(function (part) {
      const eq = part.indexOf("=");
      if (eq < 0) {
        params[part.toUpperCase()] = "TRUE";
        return;
      }
      params[part.slice(0, eq).toUpperCase()] = part.slice(eq + 1);
    });
    return { name: name, params: params, value: decodeValue(rawValue, params) };
  }

  function digitsOnly(value) {
    return String(value || "").replace(/\D+/g, "");
  }

  function normalizePhone(raw) {
    const original = String(raw || "").trim();
    let digits = digitsOnly(original);
    if (!digits) return null;

    if (digits.indexOf("00") === 0) digits = digits.slice(2);

    if (digits.indexOf("966") === 0 && digits.length >= 12) {
      digits = digits.slice(3);
    }

    if (digits.length === 10 && digits.charAt(0) === "0") {
      digits = digits.slice(1);
    }

    if (digits.length === 9 && digits.charAt(0) === "5") {
      return {
        e164: "+966" + digits,
        display: "0" + digits,
        whatsapp: "966" + digits,
        kind: "mobile",
      };
    }

    if (digits.length === 9 && /^[1234]/.test(digits)) {
      return {
        e164: "+966" + digits,
        display: "0" + digits,
        whatsapp: "",
        kind: "landline",
      };
    }

    if (digits.length === 9 && digits.indexOf("9200") === 0) {
      return {
        e164: "+966" + digits,
        display: digits,
        whatsapp: "",
        kind: "service",
      };
    }

    if (digits.length === 10 && digits.indexOf("800") === 0) {
      return {
        e164: digits,
        display: digits,
        whatsapp: "",
        kind: "service",
      };
    }

    if (digits.length >= 8 && digits.length <= 15) {
      const intl = original.charAt(0) === "+" || original.indexOf("00") === 0;
      return {
        e164: (intl ? "+" : "") + digits,
        display: (intl ? "+" : "") + digits,
        whatsapp: intl && digits.length >= 10 ? digits : "",
        kind: intl ? "intl" : "other",
      };
    }

    return {
      e164: digits,
      display: original,
      whatsapp: "",
      kind: "other",
    };
  }

  function parseName(nValue, fnValue) {
    const fn = String(fnValue || "").replace(/\s+/g, " ").trim();
    const parts = String(nValue || "").split(";");
    const family = (parts[0] || "").trim();
    const given = (parts[1] || "").trim();
    const additional = (parts[2] || "").trim();
    const fromN = [given, additional, family].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
    return fn || fromN;
  }

  function phoneType(params) {
    const keys = Object.keys(params || {});
    const joined = keys.join(" ").toUpperCase();
    if (/CELL|MOBILE/.test(joined)) return "جوال";
    if (/HOME/.test(joined)) return "منزل";
    if (/WORK/.test(joined)) return "عمل";
    if (/FAX/.test(joined)) return "فاكس";
    return "هاتف";
  }

  function parseCards(text) {
    const lines = unfoldLines(text).split("\n");
    const cards = [];
    let current = [];

    lines.forEach(function (line) {
      const trimmed = line.trim();
      if (!trimmed) return;
      if (trimmed.toUpperCase() === "BEGIN:VCARD") {
        current = [];
        return;
      }
      if (trimmed.toUpperCase() === "END:VCARD") {
        if (current.length) cards.push(current);
        current = [];
        return;
      }
      current.push(trimmed);
    });

    return cards.map(function (props, index) {
      let fn = "";
      let n = "";
      const phones = [];
      const emails = [];
      const seenPhones = {};

      props.forEach(function (line) {
        const prop = parseProperty(line);
        if (!prop) return;
        if (prop.name === "FN") fn = prop.value;
        if (prop.name === "N") n = prop.value;
        if (prop.name === "TEL" && prop.value) {
          const phone = normalizePhone(prop.value);
          if (!phone) return;
          const key = phone.e164 || phone.display;
          if (seenPhones[key]) return;
          seenPhones[key] = true;
          phones.push({
            raw: prop.value,
            type: phoneType(prop.params),
            e164: phone.e164,
            display: phone.display,
            whatsapp: phone.whatsapp,
            kind: phone.kind,
          });
        }
        if (prop.name === "EMAIL" && prop.value) emails.push(prop.value);
      });

      const name = parseName(n, fn);
      return {
        id: "c" + (index + 1),
        name: name || "بدون اسم",
        phones: phones,
        emails: emails,
        source: "hotmail",
      };
    }).filter(function (card) {
      return card.name !== "بدون اسم" || card.phones.length || card.emails.length;
    });
  }

  function nameKey(name) {
    return String(name || "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  function mergeContacts(existing, incoming) {
    const out = existing.slice();
    const byPhone = {};
    const byName = {};
    out.forEach(function (card, i) {
      card.phones.forEach(function (p) {
        if (p.e164) byPhone[p.e164] = i;
      });
      const key = nameKey(card.name);
      if (key && byName[key] == null) byName[key] = i;
    });

    incoming.forEach(function (card) {
      let match = -1;
      card.phones.forEach(function (p) {
        if (match === -1 && p.e164 && byPhone[p.e164] != null) match = byPhone[p.e164];
      });
      if (match === -1 && !card.phones.length) {
        const key = nameKey(card.name);
        if (key && byName[key] != null) match = byName[key];
      }
      if (match === -1) {
        const next = Object.assign({}, card, { id: "c" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) });
        out.push(next);
        next.phones.forEach(function (p) {
          if (p.e164) byPhone[p.e164] = out.length - 1;
        });
        const key = nameKey(next.name);
        if (key && byName[key] == null) byName[key] = out.length - 1;
        return;
      }
      const target = out[match];
      const seen = {};
      target.phones.forEach(function (p) { seen[p.e164 || p.display] = true; });
      card.phones.forEach(function (p) {
        const key = p.e164 || p.display;
        if (!seen[key]) {
          target.phones.push(p);
          seen[key] = true;
        }
      });
      card.emails.forEach(function (email) {
        if (target.emails.indexOf(email) === -1) target.emails.push(email);
      });
      if (target.name === "بدون اسم" && card.name) target.name = card.name;
    });
    return out;
  }

  function escapeVcf(value) {
    return String(value || "")
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  }

  function toVcard30(contacts) {
    return contacts.map(function (card) {
      const lines = ["BEGIN:VCARD", "VERSION:3.0", "FN:" + escapeVcf(card.name)];
      card.phones.forEach(function (p) {
        lines.push("TEL;TYPE=CELL:" + (p.e164 || p.display));
      });
      card.emails.forEach(function (email) {
        lines.push("EMAIL:" + escapeVcf(email));
      });
      lines.push("END:VCARD");
      return lines.join("\r\n");
    }).join("\r\n") + "\r\n";
  }

  function csvCell(value) {
    const text = String(value == null ? "" : value);
    if (/[",\n]/.test(text)) return '"' + text.replace(/"/g, '""') + '"';
    return text;
  }

  function toCsv(contacts) {
    const rows = [["name", "phone", "e164", "whatsapp", "email", "kind"]];
    contacts.forEach(function (card) {
      const phones = card.phones.length ? card.phones : [{ display: "", e164: "", whatsapp: "", kind: "" }];
      phones.forEach(function (p) {
        rows.push([
          card.name,
          p.display || "",
          p.e164 || "",
          p.whatsapp || "",
          card.emails[0] || "",
          p.kind || "",
        ]);
      });
    });
    return rows.map(function (row) {
      return row.map(csvCell).join(",");
    }).join("\n") + "\n";
  }

  function arabicSort(a, b) {
    return String(a.name || "").localeCompare(String(b.name || ""), "ar");
  }

  return {
    decodeQuotedPrintable: decodeQuotedPrintable,
    normalizePhone: normalizePhone,
    parseCards: parseCards,
    mergeContacts: mergeContacts,
    toVcard30: toVcard30,
    toCsv: toCsv,
    arabicSort: arabicSort,
  };
});
