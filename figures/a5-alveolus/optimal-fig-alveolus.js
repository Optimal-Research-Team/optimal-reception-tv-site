/* optimal-fig-alveolus: Optimal Health explainer figure. Built with Anatomy (MIT). Generated; do not edit. */
(() => {
if (customElements.get("optimal-fig-alveolus")) return;
const AZIMUTH = 45;
const ELEVATION = 30;
const SHADES = 4;
const RADIANS = Math.PI / 180;
const UNIT = Math.sqrt(1.6);
function cameraOf({ scale, azimuth = AZIMUTH, elevation = ELEVATION }) {
    const a = azimuth * RADIANS;
    const e = elevation * RADIANS;
    return { sinA: Math.sin(a), cosA: Math.cos(a), sinE: Math.sin(e), cosE: Math.cos(e), k: scale * UNIT };
}
function iso([x, y, z], projection) {
    const { origin } = projection;
    const { sinA, cosA, sinE, cosE, k } = cameraOf(projection);
    return [origin[0] + (x * sinA - y * cosA) * k, origin[1] + ((x * cosA + y * sinA) * sinE - z * cosE) * k];
}
function towardViewer(projection) {
    const { sinA, cosA } = cameraOf(projection);
    return [cosA, sinA];
}
function depthOf([x, y, z], projection) {
    const { sinA, cosA, sinE, cosE } = cameraOf(projection);
    return (x * cosA + y * sinA) * cosE + z * sinE;
}
const tenth = (value) => {
    const text = (Math.round(value * 10) / 10).toFixed(1).replace(/\.0$/, "");
    return text === "-0" ? "0" : text;
};
function pathOf(points, closed = false) {
    if (!points.length)
        return "";
    return points.map(([x, y], at) => `${at ? "L" : "M"}${tenth(x)} ${tenth(y)}`).join("") + (closed ? "Z" : "");
}
const joinPaths = (paths) => paths.filter(Boolean).join("");
function roundedPlan({ x, y, w, d, r }, steps = 8) {
    const radius = Math.max(0, Math.min(r, w / 2, d / 2));
    const corners = [
        [x + w - radius, y + radius, -90],
        [x + w - radius, y + d - radius, 0],
        [x + radius, y + d - radius, 90],
        [x + radius, y + radius, 180],
    ];
    const out = [];
    for (const [cx, cy, start] of corners) {
        const count = radius > 0 ? steps : 0;
        for (let step = 0; step <= count; step++) {
            const angle = (start + (count ? (90 * step) / count : 45)) * RADIANS;
            out.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
        }
    }
    return out;
}
function signedArea(points) {
    let area = 0;
    for (let index = 0; index < points.length; index++) {
        const [ax, ay] = points[index];
        const [bx, by] = points[(index + 1) % points.length];
        area += ax * by - bx * ay;
    }
    return area / 2;
}
const oriented = (points) => (signedArea(points) < 0 ? [...points].reverse() : points);
function convexHull(points) {
    const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (sorted.length < 3)
        return sorted;
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lower = [];
    for (const point of sorted) {
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0)
            lower.pop();
        lower.push(point);
    }
    const upper = [];
    for (let index = sorted.length - 1; index >= 0; index--) {
        const point = sorted[index];
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0)
            upper.pop();
        upper.push(point);
    }
    return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}
function runsOf(flags, want) {
    const count = flags.length;
    const runs = [];
    const start = flags.findIndex((flag, index) => flag !== flags[(index + count - 1) % count]);
    if (start < 0)
        return flags[0] === want ? [Array.from({ length: count + 1 }, (_, index) => index % count)] : [];
    let run = null;
    for (let step = 0; step < count; step++) {
        const index = (start + step) % count;
        if (flags[index] === want) {
            if (!run)
                run = [index];
            run.push((index + 1) % count);
        }
        else if (run) {
            runs.push(run);
            run = null;
        }
    }
    if (run)
        runs.push(run);
    return runs;
}
function extrude(ring, z, height, projection, options = {}) {
    const convex = options.convex ?? true;
    const count = ring.length;
    const counter = signedArea(ring) > 0;
    const [vx, vy] = towardViewer(projection);
    const { sinA, cosA } = cameraOf(projection);
    const normals = ring.map(([ax, ay], index) => {
        const [bx, by] = ring[(index + 1) % count];
        const dx = bx - ax;
        const dy = by - ay;
        const length = Math.hypot(dx, dy) || 1;
        return (counter ? [dy / length, -dx / length] : [-dy / length, dx / length]);
    });
    const facing = normals.map(([nx, ny]) => nx * vx + ny * vy > 1e-9);
    const top = ring.map(([x, y]) => iso([x, y, z + height], projection));
    const bottom = ring.map(([x, y]) => iso([x, y, z], projection));
    const outline = [];
    const crease = [];
    for (const run of runsOf(facing, false))
        outline.push(pathOf(run.map((index) => top[index])));
    for (const run of runsOf(facing, true)) {
        crease.push(pathOf(run.map((index) => top[index])));
        if (height > 0)
            outline.push(pathOf(run.map((index) => bottom[index])));
    }
    if (height > 0) {
        for (let index = 0; index < count; index++) {
            if (facing[(index + count - 1) % count] !== facing[index])
                outline.push(pathOf([top[index], bottom[index]]));
        }
    }
    let fill;
    if (convex) {
        fill = pathOf(convexHull([...top, ...bottom]), true);
    }
    else {
        const parts = [pathOf(oriented(top), true), pathOf(oriented(bottom), true)];
        for (let index = 0; index < count; index++) {
            if (!facing[index])
                continue;
            const next = (index + 1) % count;
            parts.push(pathOf(oriented([top[index], top[next], bottom[next], bottom[index]]), true));
        }
        fill = parts.join("");
    }
    const buckets = Array.from({ length: SHADES }, () => []);
    if (height > 0) {
        const [lx, ly] = [-sinA, cosA];
        for (let index = 0; index < count; index++) {
            if (!facing[index])
                continue;
            const [nx, ny] = normals[index];
            const lit = (nx * lx + ny * ly + 1) / 2;
            const shade = Math.min(SHADES - 1, Math.max(0, Math.floor(lit * SHADES)));
            const next = (index + 1) % count;
            buckets[shade].push(pathOf(oriented([top[index], top[next], bottom[next], bottom[index]]), true));
        }
    }
    let bevel;
    if (options.bevel && options.bevel > 0) {
        const by = options.bevel;
        const inset = ring.map(([x, y], index) => {
            const [ax, ay] = normals[(index + count - 1) % count];
            const [bx, by2] = normals[index];
            const mx = ax + bx;
            const my = ay + by2;
            const length = Math.hypot(mx, my) || 1;
            return [x - (mx / length) * by, y - (my / length) * by];
        });
        const insetTop = inset.map(([x, y]) => iso([x, y, z + height], projection));
        bevel = runsOf(facing, true)
            .map((run) => pathOf([top[run[0]], ...run.slice(1, -1).map((index) => insetTop[index]), top[run[run.length - 1]]]))
            .join("");
    }
    return {
        fill,
        outline: outline.join(""),
        crease: crease.join(""),
        top: pathOf(oriented(top), true),
        shades: buckets.map((paths) => paths.join("")),
        bevel,
    };
}
const ringOf = (plan, steps = 8) => roundedPlan(plan, steps);
function slabOf(plan, z, height, projection, steps = 8, bevel = 0) {
    return extrude(ringOf(plan, steps), z, height, projection, { convex: true, bevel });
}
function circleRing(cx, cy, radius, steps = 40) {
    return Array.from({ length: steps }, (_, step) => {
        const angle = (step / steps) * Math.PI * 2;
        return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
    });
}
function cylinder(cx, cy, radius, z, height, projection, steps = 32, bevel = 0) {
    return extrude(circleRing(cx, cy, radius, steps), z, height, projection, { convex: true, bevel });
}
const insetPlan = ({ x, y, w, d, r }, by) => ({ x: x + by, y: y + by, w: w - by * 2, d: d - by * 2, r: Math.max(0, r - by) });
function onTop(points, z, projection, closed = false) {
    return pathOf(points.map(([x, y]) => iso([x, y, z], projection)), closed);
}
const planOutline = (plan, z, projection, steps = 8) => onTop(ringOf(plan, steps), z, projection, true);
const lineOnTop = (from, to, z, projection) => onTop([from, to], z, projection);
const segment = (from, to, projection) => pathOf([iso(from, projection), iso(to, projection)]);
const rise = (at, from, to, projection) => segment([at[0], at[1], from], [at[0], at[1], to], projection);
const ring = (cx, cy, radius, z, projection, steps = 40) => onTop(circleRing(cx, cy, radius, steps), z, projection, true);
const pointsAt = (points, projection) => points.map((point) => iso(point, projection));
function dotGrid(x, y, columns, rows, gap, z, projection) {
    const dots = [];
    for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++)
            dots.push(iso([x + column * gap, y + row * gap, z], projection));
    }
    return dots;
}
function corners({ x, y, w, d }, inset = 0) {
    return [
        [x + inset, y + inset],
        [x + w - inset, y + inset],
        [x + inset, y + d - inset],
        [x + w - inset, y + d - inset],
    ];
}
function boxCorners({ x, y, w, d }, z0, z1) {
    const out = [];
    for (const px of [x, x + w])
        for (const py of [y, y + d])
            for (const z of [z0, z1])
                out.push([px, py, z]);
    return out;
}
function knurl(cx, cy, radius, z0, z1, count, projection, inset = 0.4) {
    const [vx, vy] = towardViewer(projection);
    const lines = [];
    for (let index = 0; index < count; index++) {
        const angle = (index / count) * Math.PI * 2;
        const nx = Math.cos(angle);
        const ny = Math.sin(angle);
        if (nx * vx + ny * vy < 0.15)
            continue;
        lines.push(segment([cx + radius * nx, cy + radius * ny, z0 + inset], [cx + radius * nx, cy + radius * ny, z1 - inset], projection));
    }
    return lines.join("");
}
function sideArc(cx, cy, radius, z, projection, steps = 24) {
    const [vx, vy] = towardViewer(projection);
    const facing = Math.atan2(vy, vx);
    const points = [];
    for (let step = 0; step <= steps; step++) {
        const angle = facing - Math.PI / 2 + (step / steps) * Math.PI;
        points.push(iso([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle), z], projection));
    }
    return pathOf(points);
}
function ringSeam(ring, z, projection) {
    const count = ring.length;
    const counter = signedArea(ring) > 0;
    const [vx, vy] = towardViewer(projection);
    const facing = ring.map(([ax, ay], index) => {
        const [bx, by] = ring[(index + 1) % count];
        const dx = bx - ax;
        const dy = by - ay;
        const [nx, ny] = counter ? [dy, -dx] : [-dy, dx];
        return nx * vx + ny * vy > 1e-9;
    });
    return runsOf(facing, true).map((run) => pathOf(run.map((index) => iso([ring[index][0], ring[index][1], z], projection)))).join("");
}
const sideSeam = (plan, z, projection, steps = 8) => ringSeam(ringOf(plan, steps), z, projection);
function sideRing(center, radius, axis, projection, steps = 20) {
    const [px, py, pz] = center;
    const points = [];
    for (let step = 0; step < steps; step++) {
        const angle = (step / steps) * Math.PI * 2;
        const u = radius * Math.cos(angle);
        const v = radius * Math.sin(angle);
        points.push(iso(axis === "x" ? [px, py + u, pz + v] : [px + u, py, pz + v], projection));
    }
    return pathOf(points, true);
}
function coil(from, to, center, radius, turns, axis, projection, perTurn = 16) {
    const count = Math.max(1, Math.round(turns * perTurn));
    const back = [];
    const front = [];
    let run = [];
    let near = null;
    for (let index = 0; index <= count; index++) {
        const share = index / count;
        const angle = share * turns * Math.PI * 2;
        const u = radius * Math.cos(angle);
        const v = radius * Math.sin(angle);
        const along = from + (to - from) * share;
        const point = axis === "x" ? [along, center[0] + u, center[1] + v] : [center[0] + u, along, center[1] + v];
        const normal = axis === "x" ? [0, Math.cos(angle), Math.sin(angle)] : [Math.cos(angle), 0, Math.sin(angle)];
        const facing = depthOf(normal, projection) > 0;
        const flat = iso(point, projection);
        if (near === null)
            near = facing;
        if (facing !== near) {
            run.push(flat);
            (near ? front : back).push(pathOf(run));
            run = [flat];
            near = facing;
            continue;
        }
        run.push(flat);
    }
    if (run.length > 1)
        (near ? front : back).push(pathOf(run));
    return { back: back.join(""), front: front.join("") };
}
function topTicks(from, to, step, every, edge, z, lengths, projection, axis = "x") {
    const minor = [];
    const major = [];
    const first = Math.ceil(from / step) * step;
    for (let at = first, index = Math.round(first / step); at <= to + 1e-9; at += step, index++) {
        const big = index % every === 0;
        const length = big ? lengths[1] : lengths[0];
        const a = axis === "x" ? [at, edge] : [edge, at];
        const b = axis === "x" ? [at, edge + length] : [edge + length, at];
        (big ? major : minor).push(lineOnTop(a, b, z, projection));
    }
    return { minor: minor.join(""), major: major.join("") };
}
function sideTicks(from, to, step, every, face, top, lengths, projection, axis = "x") {
    const minor = [];
    const major = [];
    const first = Math.ceil(from / step) * step;
    for (let at = first, index = Math.round(first / step); at <= to + 1e-9; at += step, index++) {
        const big = index % every === 0;
        const length = big ? lengths[1] : lengths[0];
        const a = axis === "x" ? [at, face, top] : [face, at, top];
        const b = axis === "x" ? [at, face, top - length] : [face, at, top - length];
        (big ? major : minor).push(segment(a, b, projection));
    }
    return { minor: minor.join(""), major: major.join("") };
}
function radialTicks(cx, cy, radius, count, every, z, lengths, projection, from = 0, span = Math.PI * 2) {
    const minor = [];
    const major = [];
    const closed = Math.abs(span - Math.PI * 2) < 1e-9;
    const steps = closed ? count : count + 1;
    for (let index = 0; index < steps; index++) {
        const angle = from + (index / count) * span;
        const big = index % every === 0;
        const inner = radius - (big ? lengths[1] : lengths[0]);
        const sx = Math.sin(angle);
        const sy = -Math.cos(angle);
        (big ? major : minor).push(lineOnTop([cx + sx * inner, cy + sy * inner], [cx + sx * radius, cy + sy * radius], z, projection));
    }
    return { minor: minor.join(""), major: major.join("") };
}
const haloOf = (plan, z, height, projection) => slabOf(plan, z, height, projection).fill;
function axisVector(projection, [dx, dy, dz]) {
    const origin = iso([0, 0, 0], projection);
    const moved = iso([dx, dy, dz], projection);
    return [moved[0] - origin[0], moved[1] - origin[1]];
}
const fine = (value) => Math.round(value * 100) / 100;
function translateAlong(projection, by) {
    const [x, y] = axisVector(projection, by);
    return `translate(${fine(x)} ${fine(y)})`;
}
const thousandth = (value) => Math.round(value * 1000) / 1000;
function axesAt(at, z, projection) {
    const origin = iso([at[0], at[1], z], projection);
    const along = (point) => {
        const [px, py] = iso(point, projection);
        return [px - origin[0], py - origin[1]];
    };
    return { origin, x: along([at[0] + 1, at[1], z]), y: along([at[0], at[1] + 1, z]), z: along([at[0], at[1], z + 1]) };
}
const matrixOf = (u, v, origin) => `matrix(${thousandth(u[0])} ${thousandth(u[1])} ${thousandth(v[0])} ${thousandth(v[1])} ${thousandth(origin[0])} ${thousandth(origin[1])})`;
function holdStill(element, [dx, dy]) {
    const text = dx || dy ? `translate(${-dx} ${-dy})` : "";
    element.querySelectorAll("[data-hold]").forEach((node) => (text ? node.setAttribute("transform", text) : node.removeAttribute("transform")));
}
function topMatrix(at, z, projection, along = "x") {
    const { origin, x, y } = axesAt(at, z, projection);
    return along === "x" ? matrixOf(x, y, origin) : matrixOf([-y[0], -y[1]], x, origin);
}
function sideMatrix(at, z, projection, face) {
    const { origin, x, y, z: up } = axesAt(at, z, projection);
    const down = [-up[0], -up[1]];
    return face === "left" ? matrixOf(x, down, origin) : matrixOf([-y[0], -y[1]], down, origin);
}
function screenRise(height, projection) {
    const { cosE, k } = cameraOf(projection);
    return height * cosE * k;
}
function fitProjection(points, width, height, { pad = 24, headroom = 0, azimuth = AZIMUTH, elevation = ELEVATION } = {}) {
    const unit = { origin: [0, 0], scale: 1, azimuth, elevation };
    const flat = points.map((point) => iso(point, unit));
    const xs = flat.map(([x]) => x);
    const ys = flat.map(([, y]) => y);
    const left = Math.min(...xs);
    const right = Math.max(...xs);
    const up = Math.min(...ys);
    const down = Math.max(...ys);
    const scale = Math.min((width - pad * 2) / (right - left), (height - pad * 2 - headroom) / (down - up));
    return {
        origin: [width / 2 - ((left + right) / 2) * scale, headroom + (height - headroom) / 2 - ((up + down) / 2) * scale],
        scale,
        azimuth,
        elevation,
    };
}
const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const attrs = (pairs) => Object.entries(pairs)
    .filter(([, value]) => value !== undefined && value !== false)
    .map(([key, value]) => ` ${key}="${escape(String(value))}"`)
    .join("");
function solidSvg(paths, { tone = "hi", crease = "faint", halo = false, lit = false, flat = false, className, inner = "" } = {}) {
    const parts = [];
    if (halo)
        parts.push(`<path class="iso-halo" d="${paths.fill}"/>`);
    parts.push(`<path class="iso-fill" d="${paths.fill}"/>`);
    if (!flat) {
        paths.shades.forEach((d, shade) => {
            if (d)
                parts.push(`<path class="iso-shade" data-shade="${shade}" d="${d}"/>`);
        });
        parts.push(`<path class="iso-top" d="${paths.top}"/>`);
    }
    if (crease !== "none" && paths.crease)
        parts.push(`<path class="iso-line iso-crease" data-tone="${crease}" d="${paths.crease}"/>`);
    if (crease !== "none" && paths.bevel)
        parts.push(`<path class="iso-line iso-bevel" data-tone="${crease}" d="${paths.bevel}"/>`);
    if (inner)
        parts.push(inner);
    parts.push(`<path class="iso-line iso-edge" data-tone="${tone}" d="${paths.outline}"/>`);
    return `<g${attrs({ class: className ? `iso-solid ${className}` : "iso-solid", "data-lit": lit ? "" : undefined, "data-seamless": paths.seamless ? "" : undefined })}>${parts.join("")}</g>`;
}
function lineSvg(d, { tone = "lo", dotted = false, dashed = false, flow = false, className, free } = {}) {
    if (!d)
        return "";
    return `<path${attrs({
        class: className ? `iso-line ${className}` : "iso-line",
        "data-tone": tone,
        "data-free": free === true ? "" : free || undefined,
        "data-dotted": dotted ? "" : undefined,
        "data-dashed": dashed ? "" : undefined,
        "data-flow": flow ? "" : undefined,
        d,
    })}/>`;
}
function dotsSvg(points, { size = 0.5, tone = "mid", pulse = false } = {}) {
    const dots = points
        .map(([x, y, alpha], index) => `<circle cx="${tenth(x)}" cy="${tenth(y)}" r="${size}"${alpha !== undefined && alpha < 1 ? ` fill-opacity="${Math.max(0, alpha).toFixed(2)}"` : ""}${pulse ? ` data-pulse="" style="--pulse-at:${(index * 137) % 1600}ms"` : ""}/>`)
        .join("");
    return `<g class="iso-dots" data-tone="${tone}">${dots}</g>`;
}
function fadedSvg(list, style = {}) {
    const groups = new Map();
    for (const entry of list) {
        const [d, alpha] = Array.isArray(entry) ? entry : [entry.d, entry.alpha];
        if (!d || !(alpha > 0.02))
            continue;
        const level = Math.min(1, Math.round(alpha * 20) / 20);
        groups.set(level, (groups.get(level) ?? "") + d);
    }
    return [...groups].map(([alpha, d]) => (alpha >= 1 ? lineSvg(d, style) : `<g opacity="${alpha.toFixed(2)}">${lineSvg(d, style)}</g>`)).join("");
}
function fadeLineSvg(points, { fade = [0, 0], tone = "lo", className, stops = 6 } = {}) {
    if (points.length < 2)
        return "";
    const ease = (t) => t * t * (3 - 2 * t);
    const hashOf = (text) => {
        let hash = 2166136261;
        for (let index = 0; index < text.length; index++)
            hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
        return (hash >>> 0).toString(36);
    };
    const lengths = [0];
    for (let index = 1; index < points.length; index++)
        lengths.push(lengths[index - 1] + Math.hypot(points[index][0] - points[index - 1][0], points[index][1] - points[index - 1][1]));
    const at = (length) => {
        let index = 1;
        while (index < points.length - 1 && lengths[index] < length)
            index++;
        const span = lengths[index] - lengths[index - 1] || 1;
        const t = Math.max(0, Math.min(1, (length - lengths[index - 1]) / span));
        return [points[index - 1][0] + (points[index][0] - points[index - 1][0]) * t, points[index - 1][1] + (points[index][1] - points[index - 1][1]) * t];
    };
    const pieceOf = (from, to) => [at(from), ...points.filter((_, index) => lengths[index] > from + 1e-6 && lengths[index] < to - 1e-6), at(to)];
    const total = lengths[lengths.length - 1];
    if (total < 1e-6)
        return "";
    let [start, end] = Array.isArray(fade) ? fade : [fade, fade];
    if (start + end > total) {
        const share = total / (start + end);
        start *= share;
        end *= share;
    }
    const paint = `var(--anatomy-${tone})`;
    const ramp = (piece, rising) => {
        const d = pathOf(piece);
        const [x1, y1] = piece[0];
        const [x2, y2] = piece[piece.length - 1];
        const id = `iso-fade-${hashOf(`${d}|${tone}|${rising}`)}`;
        const marks = Array.from({ length: stops + 1 }, (_, index) => {
            const t = index / stops;
            const alpha = ease(rising ? t : 1 - t);
            return `<stop offset="${t.toFixed(3)}" stop-opacity="${alpha.toFixed(3)}" style="stop-color:${paint}"/>`;
        }).join("");
        const gradient = `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${tenth(x1)}" y1="${tenth(y1)}" x2="${tenth(x2)}" y2="${tenth(y2)}">${marks}</linearGradient>`;
        return `<defs>${gradient}</defs><path${attrs({ class: className ? `iso-line ${className}` : "iso-line", "data-tone": tone, "data-free": rising ? "start" : "end", d, style: `stroke:url(#${id})` })}/>`;
    };
    const parts = [];
    if (start > 0.05)
        parts.push(ramp(pieceOf(0, start), true));
    if (total - end - start > 0.05)
        parts.push(lineSvg(pathOf(pieceOf(start, total - end)), { tone, className }));
    if (end > 0.05)
        parts.push(ramp(pieceOf(total - end, total), false));
    return `<g class="iso-fade">${parts.join("")}</g>`;
}
function wireSvg(from, to, { via = [], tone = "lo", dotted = false, dashed = false, flow = false, ends = "both", size = 1.2 } = {}) {
    const d = pathOf([from, ...via, to]);
    const end = ([x, y]) => `<circle class="iso-wire-end" cx="${tenth(x)}" cy="${tenth(y)}" r="${size}"/>`;
    return `<g class="iso-wire" data-tone="${tone}">${lineSvg(d, { tone, dotted, dashed, flow })}${ends === "both" || ends === "from" ? end(from) : ""}${ends === "both" || ends === "to" ? end(to) : ""}</g>`;
}
function faceTextSvg(transform, text, { size = 3, tone = "mid", anchor = "start" } = {}) {
    return `<text class="iso-face-text" data-tone="${tone}" transform="${transform}" font-size="${size}" text-anchor="${anchor}">${escape(text)}</text>`;
}
function groupSvg(children, extra = {}) {
    return `<g${attrs(extra)}>${Array.isArray(children) ? children.join("") : children}</g>`;
}
function figureSvg({ width, height, label, body, standalone = false, className }) {
    const style = standalone ? `<style>${ISO_CSS}</style>` : "";
    return `<svg${attrs({
        xmlns: "http://www.w3.org/2000/svg",
        class: `iso-svg${standalone ? " iso" : ""}${className ? ` ${className}` : ""}`,
        "data-theme": standalone || undefined,
        viewBox: `0 0 ${width} ${height}`,
        role: "img",
        "aria-label": label,
    })}>${style}${Array.isArray(body) ? body.join("") : body}</svg>`;
}
function swatchSvg(mark) {
    if (mark === "raised" || mark === "flat" || mark === "lit") {
        const body = mark === "flat" ? "M2 6.5 8 3.5 14 6.5 8 9.5Z" : "M2 4.5 8 1.5 14 4.5 14 6 8 9 2 6Z";
        const crease = mark === "flat" ? "" : `<path class="iso-swatch-crease" d="M2 4.5 8 7.5 14 4.5"/>`;
        return `<svg class="iso-swatch" data-mark="${mark}" viewBox="0 0 16 10" aria-hidden="true"><path d="${body}"/>${crease}</svg>`;
    }
    return `<svg class="iso-swatch" data-mark="${mark}" viewBox="0 0 16 10" aria-hidden="true"><path d="M1.5 5h13"/></svg>`;
}
function plateHtml({ fig, title, hint, readout = "", keys = [], caption, body }) {
    const corner = (name, text, extra = "") => `<span class="iso-plate-corner" data-corner="${name}"${extra}>${escape(text)}</span>`;
    const legend = keys.length || caption
        ? `<figcaption class="iso-legend">${keys.length ? `<span class="iso-keys">${keys.map((key) => `<span class="iso-key">${swatchSvg(key.mark)}${escape(key.label)}</span>`).join("")}</span>` : ""}${caption ? `<span class="iso-caption">${escape(caption)}</span>` : ""}</figcaption>`
        : "";
    return `<figure class="iso-figure"><div class="iso-plate"><div class="iso-plate-corners" aria-hidden="true">${corner("fig", fig)}${title ? corner("title", title) : ""}${hint ? corner("hint", hint) : ""}${corner("readout", readout, " data-readout")}</div>${body}</div>${legend}</figure>`;
}
function pageHtml({ title, theme = "dark", body, script = "", width = 650 }) {
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(title)}</title><style>${ISO_CSS}${PAGE_CSS.replace("__WIDTH__", String(width))}</style></head><body class="iso" data-theme="${theme}"><main class="iso-page">${body}</main>${script ? `<script type="module">${script.replace(/<\/(script)/gi, "<\\/$1")}</script>` : ""}</body></html>`;
}
const PAGE_CSS = `
*{box-sizing:border-box}
html{color-scheme:dark}
body[data-theme="light"]{color-scheme:light}
body{margin:0;background:var(--anatomy-page);color:var(--anatomy-text);font:14px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
.iso-page{width:min(__WIDTH__px,100% - 32px);margin:64px auto 96px}
`;
const ISO_CSS = `
.iso{
  --anatomy-page:#0b0b0b;--anatomy-card:#131313;--anatomy-text:#a3a3a3;--anatomy-strong:#e6e6e6;--anatomy-muted:#6e6e6e;
  --anatomy-paper:#131313;--anatomy-face:#1b1b1b;--anatomy-top:#1c1c1c;
  --anatomy-shade-0:#0f0f0f;--anatomy-shade-1:#121212;--anatomy-shade-2:#151515;--anatomy-shade-3:#181818;
  --anatomy-lit-top:#262626;--anatomy-lit-shade:#1d1d1d;
  --anatomy-hi:#d4d4d4;--anatomy-mid:#6a6a6a;--anatomy-lo:#3e3e3e;--anatomy-faint:#2a2a2a;--anatomy-lit:#ffffff;
  --anatomy-halo:#050505;--anatomy-halo-opacity:.9;--anatomy-dot:#e6e6e6;
  --anatomy-red:#ff6b6b;--anatomy-green:#6be0a0;--anatomy-blue:#6b9bff;
  --anatomy-weight:.6px;--anatomy-ease:cubic-bezier(.32,.72,0,1);
  --anatomy-mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;
  --anatomy-lift:inset 0 1px 0 0 #ffffff0a,inset 0 0 0 1px #ffffff06,0 0 0 1px #00000026,0 1px 1px -.5px #00000014,0 3px 3px -1.5px #00000014,0 6px 6px -3px #00000014,0 12px 12px -6px #00000014;
}
.iso[data-theme="light"]{
  --anatomy-page:#f2f2ef;--anatomy-card:#fbfbfa;--anatomy-text:#57575a;--anatomy-strong:#18181a;--anatomy-muted:#8c8c90;
  --anatomy-paper:#fbfbfa;--anatomy-face:#ffffff;--anatomy-top:#ffffff;
  --anatomy-shade-0:#dcdcd9;--anatomy-shade-1:#e5e5e2;--anatomy-shade-2:#ededea;--anatomy-shade-3:#f4f4f1;
  --anatomy-lit-top:#ffffff;--anatomy-lit-shade:#eeeeeb;
  --anatomy-hi:#26262a;--anatomy-mid:#8a8a8f;--anatomy-lo:#b4b4b8;--anatomy-faint:#d4d4d6;--anatomy-lit:#000000;
  --anatomy-halo:#8a8a80;--anatomy-halo-opacity:.32;--anatomy-dot:#3a3a3e;
  --anatomy-red:#e5484d;--anatomy-green:#30a46c;--anatomy-blue:#3e63dd;
  --anatomy-lift:inset 0 1px 0 0 #ffffff,0 0 0 1px #0000000f,0 1px 1px -.5px #0000000a,0 3px 3px -1.5px #0000000a,0 6px 6px -3px #0000000a,0 12px 12px -6px #0000000a;
}
.iso-svg{display:block;width:100%;height:auto;overflow:visible}
.iso-svg path,.iso-svg circle{vector-effect:non-scaling-stroke}
.iso-fill{fill:var(--anatomy-paper);stroke:none}
.iso-solid[data-lit]>.iso-fill{fill:var(--anatomy-face)}
.iso-shade,.iso-top{stroke:none}
.iso-shade[data-shade="0"]{fill:var(--anatomy-shade-0)}
.iso-shade[data-shade="1"]{fill:var(--anatomy-shade-1)}
.iso-shade[data-shade="2"]{fill:var(--anatomy-shade-2)}
.iso-shade[data-shade="3"]{fill:var(--anatomy-shade-3)}
.iso-top{fill:var(--anatomy-top)}
.iso-solid[data-lit]>.iso-top{fill:var(--anatomy-lit-top)}
.iso-solid[data-lit]>.iso-shade{fill:var(--anatomy-lit-shade)}
.iso-solid[data-seamless]>.iso-shade,.iso-solid[data-seamless]>.iso-top{stroke-width:.4;stroke-linejoin:round}
.iso-solid[data-seamless]>.iso-shade[data-shade="0"]{stroke:var(--anatomy-shade-0)}
.iso-solid[data-seamless]>.iso-shade[data-shade="1"]{stroke:var(--anatomy-shade-1)}
.iso-solid[data-seamless]>.iso-shade[data-shade="2"]{stroke:var(--anatomy-shade-2)}
.iso-solid[data-seamless]>.iso-shade[data-shade="3"]{stroke:var(--anatomy-shade-3)}
.iso-solid[data-seamless]>.iso-top{stroke:var(--anatomy-top)}
.iso-solid[data-seamless][data-lit]>.iso-top{stroke:var(--anatomy-lit-top)}
.iso-solid[data-seamless][data-lit]>.iso-shade{stroke:var(--anatomy-lit-shade)}
.iso-solid[data-lit]>.iso-edge{stroke:var(--anatomy-lit)}
.iso-halo{fill:var(--anatomy-halo);stroke:none;filter:blur(9px);opacity:var(--anatomy-halo-opacity);transform:translateY(3px)}
.iso-line{fill:none;stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight);stroke-linecap:round;stroke-linejoin:round}
.iso-line[data-tone="hi"]{stroke:var(--anatomy-hi)}
.iso-line[data-tone="mid"]{stroke:var(--anatomy-mid)}
.iso-line[data-tone="lo"]{stroke:var(--anatomy-lo)}
.iso-line[data-tone="faint"]{stroke:var(--anatomy-faint)}
.iso-line[data-tone="lit"]{stroke:var(--anatomy-lit)}
.iso-line[data-tone="red"]{stroke:var(--anatomy-red)}
.iso-line[data-tone="green"]{stroke:var(--anatomy-green)}
.iso-line[data-tone="blue"]{stroke:var(--anatomy-blue)}
.iso-line[data-dotted]{stroke-dasharray:.01 3.5;stroke-width:1}
.iso-line[data-dashed]{stroke-dasharray:3 3}
.iso-line[data-flow]{stroke-dasharray:2 6}
.iso-wire-end{fill:var(--anatomy-paper);stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight)}
.iso-wire[data-tone="hi"] .iso-wire-end{stroke:var(--anatomy-hi)}
.iso-wire[data-tone="mid"] .iso-wire-end{stroke:var(--anatomy-mid)}
.iso-wire[data-tone="faint"] .iso-wire-end{stroke:var(--anatomy-faint)}
.iso-wire[data-tone="lit"] .iso-wire-end{stroke:var(--anatomy-lit)}
.iso-dots circle{fill:var(--anatomy-dot);stroke:none;opacity:.32}
.iso-dots[data-tone="hi"] circle{opacity:.85}
.iso-dots[data-tone="mid"] circle{opacity:.45}
.iso-dots[data-tone="lo"] circle{opacity:.22}
.iso-dots[data-tone="faint"] circle{opacity:.12}
.iso-face-text{fill:var(--anatomy-mid);font-family:var(--anatomy-mono);letter-spacing:.04em}
.iso-face-text[data-tone="hi"]{fill:var(--anatomy-hi)}
.iso-face-text[data-tone="lo"]{fill:var(--anatomy-lo)}
.iso-face-text[data-tone="faint"]{fill:var(--anatomy-faint)}
.tb-body{fill:var(--anatomy-shade-2);stroke:none}
.tb-shine{fill:var(--anatomy-top);stroke:none}
.tb-shade{fill:var(--anatomy-shade-0);stroke:none}
.tb-ring{fill:none;stroke:var(--anatomy-lo);stroke-width:.45;stroke-linecap:butt;stroke-linejoin:round}
.tb-ring[data-tone="mid"]{stroke:var(--anatomy-mid)}
.tb-ring[data-tone="faint"]{stroke:var(--anatomy-faint)}
.tb-ring[data-tone="hi"]{stroke:var(--anatomy-hi)}
@keyframes iso-flow{to{stroke-dashoffset:-32}}
@keyframes iso-pulse{0%,100%{opacity:.18}12%{opacity:1}40%{opacity:.18}}
.iso-line[data-flow]{animation:iso-flow 1600ms linear infinite}
.iso-dots circle[data-pulse]{animation:iso-pulse 1600ms steps(1,end) infinite;animation-delay:var(--pulse-at,0ms)}
.iso-figure{margin:32px 0 36px}
.iso-plate{position:relative;padding:52px 24px;border-radius:0;background:var(--anatomy-card);box-shadow:0 0 0 1px var(--anatomy-mid);--anatomy-paper:var(--anatomy-card)}
.iso-plate-corners{position:absolute;inset:18px 20px;pointer-events:none}
.iso-plate-corner{position:absolute;color:var(--anatomy-muted);font-family:var(--anatomy-mono);font-size:10.5px;line-height:1;letter-spacing:.04em;white-space:nowrap}
.iso-plate-corner[data-corner="fig"]{top:0;left:0;color:var(--anatomy-text)}
.iso-plate-corner[data-corner="title"]{top:0;right:0;text-transform:uppercase;letter-spacing:.1em}
.iso-plate-corner[data-corner="hint"]{bottom:0;left:0;text-transform:uppercase;letter-spacing:.1em}
.iso-plate-corner[data-corner="readout"]{right:0;bottom:0;color:var(--anatomy-text);font-variant-numeric:tabular-nums}
.iso-plate .iso-svg{margin:0 auto}
.iso-legend{display:grid;gap:8px;margin-top:12px;color:var(--anatomy-muted);font-size:13px;line-height:1.55}
.iso-keys{display:flex;flex-wrap:wrap;gap:6px 18px}
.iso-key{display:inline-flex;align-items:center;gap:7px}
.iso-swatch{width:16px;height:10px;flex:none;overflow:visible}
.iso-swatch path{fill:none;stroke:var(--anatomy-hi);stroke-width:1;vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round}
.iso-swatch[data-mark="raised"] path,.iso-swatch[data-mark="flat"] path{stroke:var(--anatomy-mid)}
.iso-swatch[data-mark="lit"] path{stroke:var(--anatomy-lit)}
.iso-swatch[data-mark="dim"] path{stroke:var(--anatomy-lo)}
.iso-swatch[data-mark="dotted"] path{stroke-dasharray:.01 3;stroke-width:1.4}
.iso-swatch[data-mark="dashed"] path{stroke-dasharray:3 2.5}
.iso-swatch[data-mark="red"] path{stroke:var(--anatomy-red)}
.iso-swatch[data-mark="green"] path{stroke:var(--anatomy-green)}
.iso-swatch[data-mark="blue"] path{stroke:var(--anatomy-blue)}
.iso-swatch-crease{stroke:var(--anatomy-lo)!important}
@media (max-width:560px){.iso-plate{padding:48px 12px 70px}.iso-plate-corner[data-corner="hint"]{bottom:18px}}
@media (prefers-reduced-motion:reduce){.iso-line[data-flow],.iso-dots circle[data-pulse]{animation:none}}
`;

// A5 model: a red cell's trip past an air sac. Time in the capillary, how fast its oxygen
// pressure rises to the alveolar value, and how saturated it leaves. Typical healthy adult.
//
// At rest a red cell spends ≈ 0.75 s in the pulmonary capillary and reaches the alveolar PO₂
// within the first ≈ 0.25–0.3 s; in hard exercise the transit shortens toward ≈ 0.25–0.3 s
// [A5-1][A5-2]. Alveolar PO₂ ≈ 100 mmHg, blood arriving ≈ 40 mmHg at rest [A5-1].
const LUNG = {
  PA: 100, //          mmHg, alveolar oxygen
  transitRest: 0.75, // s at rest [A5-1]
  equil: 0.25, //      s to reach the alveolar value (within ≈ 1 mmHg) [A5-1][A5-2]
  p50: 26.8, hill: 2.7, // oxygen–hemoglobin curve (standard adult values; LOW in this pack)
  states: [
    // cardiac output from A4; venous PO₂ falls as muscles extract more (LOW, typical)
    { key: "rest", label: "Rest", co: 4.2, pv: 40, f: 14, tv: 0.5 },
    { key: "walk", label: "Walk", co: 9.2, pv: 32, f: 22, tv: 1.2 },
    { key: "run", label: "Run", co: 15.8, pv: 25, f: 36, tv: 2.0 },
    { key: "max", label: "All out", co: 19.9, pv: 20, f: 50, tv: 2.5 },
  ],
};
/** Transit falls less steeply than flow rises, because more capillaries open (LOW shape). */
const transitOf = (co) => LUNG.transitRest * (LUNG.states[0].co / co) ** 0.6;
const tau = LUNG.equil / Math.log(60); // 60 mmHg gap closed to 1 mmHg by `equil`
/** Oxygen pressure in a red cell t seconds after it reaches the air sac. */
const po2At = (t, pv) => LUNG.PA - (LUNG.PA - pv) * Math.exp(-Math.max(0, t) / tau);
/** Hemoglobin saturation for an oxygen pressure (Hill curve). */
const satOf = (p) => p ** LUNG.hill / (p ** LUNG.hill + LUNG.p50 ** LUNG.hill);

// A5 live code: red cells in single file past an air sac. Each cell's oxygen comes from the
// model (po2At, satOf) by its own time in the capillary; the cells move at the speed that gives
// the chosen effort's transit time. Oxygen dots in the air are drawn into cells as they load,
// carbon dioxide drifts out, the sac swells a little with each breath, and the monitor plots the
// traced cell.
const DATA = {"C":[300,222],"R":108,"path":[[-30,150],[-27.75,150.01],[-25.49,150.03],[-23.24,150.06],[-21.74,150.1],[-19.49,150.15],[-17.25,150.23],[-15.75,150.29],[-13.51,150.38],[-11.27,150.49],[-9.03,150.62],[-7.54,150.71],[-5.31,150.86],[-3.09,151.02],[-0.86,151.19],[0.62,151.32],[2.84,151.52],[5.05,151.73],[6.52,151.88],[8.73,152.11],[10.93,152.36],[13.13,152.63],[14.6,152.81],[16.79,153.09],[18.97,153.39],[21.15,153.7],[23.33,154.03],[24.77,154.25],[26.94,154.6],[29.1,154.96],[31.25,155.34],[32.68,155.59],[34.83,155.99],[36.96,156.4],[39.09,156.82],[41.22,157.26],[42.63,157.56],[44.74,158.01],[46.85,158.49],[48.94,158.97],[51.03,159.47],[53.12,159.98],[54.5,160.32],[56.57,160.85],[58.63,161.4],[60.68,161.95],[62.73,162.52],[64.76,163.1],[66.79,163.7],[68.81,164.31],[70.15,164.72],[72.15,165.35],[74.14,165.99],[76.13,166.64],[78.1,167.31],[80.06,167.98],[82.02,168.67],[83.96,169.38],[85.89,170.09],[87.81,170.82],[89.73,171.56],[91.63,172.31],[93.52,173.07],[95.39,173.85],[97.26,174.64],[99.11,175.44],[100.96,176.25],[102.79,177.07],[104.61,177.91],[106.41,178.76],[108.21,179.62],[109.99,180.49],[111.76,181.37],[113.52,182.27],[115.26,183.17],[116.99,184.09],[119.27,185.33],[120.97,186.28],[122.65,187.23],[124.32,188.2],[125.98,189.18],[127.62,190.17],[129.78,191.51],[131.39,192.53],[132.98,193.56],[134.56,194.6],[136.12,195.65],[138.18,197.07],[139.71,198.15],[141.21,199.23],[142.71,200.33],[144.67,201.82],[146.13,202.94],[147.57,204.08],[149.46,205.61],[150.86,206.77],[152.24,207.94],[154.06,209.52],[155.4,210.72],[157.16,212.33],[158.46,213.55],[159.74,214.79],[161.43,216.45],[162.66,217.7],[164.29,219.4],[165.48,220.68],[167.05,222.4],[168.2,223.71],[169.7,225.46],[170.81,226.79],[172.25,228.58],[173.31,229.94],[174.69,231.76],[175.7,233.13],[177.02,234.98],[178.3,236.85],[179.23,238.27],[180.44,240.17],[181.33,241.6],[182.47,243.53],[183.58,245.48],[184.39,246.95],[185.43,248.93],[186.42,250.92],[187.15,252.43],[188.07,254.46],[188.96,256.5],[189.6,258.04],[190.41,260.11],[191,261.67],[191.7,263.57],[192.45,265.45],[193.22,267.32],[194.03,269.18],[194.87,271.02],[195.74,272.85],[196.64,274.66],[197.58,276.46],[198.54,278.24],[199.54,280],[200.57,281.74],[201.63,283.47],[202.71,285.18],[203.83,286.87],[204.98,288.53],[206.15,290.18],[207.36,291.81],[208.59,293.42],[209.85,295],[211.14,296.56],[212.45,298.1],[213.8,299.62],[215.16,301.11],[216.56,302.58],[217.98,304.02],[219.42,305.44],[220.89,306.84],[222.38,308.2],[223.9,309.55],[225.44,310.86],[227,312.15],[228.58,313.41],[230.19,314.64],[231.82,315.85],[233.47,317.02],[235.13,318.17],[236.82,319.29],[238.53,320.37],[240.26,321.43],[242,322.46],[243.76,323.46],[245.54,324.42],[247.34,325.36],[249.15,326.26],[250.98,327.13],[252.82,327.97],[254.68,328.78],[256.55,329.55],[258.43,330.3],[260.33,331],[262.23,331.68],[264.15,332.32],[266.08,332.93],[268.03,333.51],[269.98,334.05],[271.94,334.55],[273.91,335.03],[275.88,335.47],[277.87,335.87],[279.86,336.24],[281.85,336.57],[283.86,336.87],[285.86,337.14],[287.87,337.36],[289.89,337.56],[291.91,337.72],[293.93,337.84],[295.95,337.93],[297.98,337.98],[300,338],[302.02,337.98],[304.05,337.93],[306.07,337.84],[308.09,337.72],[310.11,337.56],[312.13,337.36],[314.14,337.14],[316.14,336.87],[318.15,336.57],[320.14,336.24],[322.13,335.87],[324.12,335.47],[326.09,335.03],[328.06,334.55],[330.02,334.05],[331.97,333.51],[333.92,332.93],[335.85,332.32],[337.77,331.68],[339.67,331],[341.57,330.3],[343.45,329.55],[345.32,328.78],[347.18,327.97],[349.02,327.13],[350.85,326.26],[352.66,325.36],[354.46,324.42],[356.24,323.46],[358,322.46],[359.74,321.43],[361.47,320.37],[363.18,319.29],[364.87,318.17],[366.53,317.02],[368.18,315.85],[369.81,314.64],[371.42,313.41],[373,312.15],[374.56,310.86],[376.1,309.55],[377.62,308.2],[379.11,306.84],[380.58,305.44],[382.02,304.02],[383.44,302.58],[384.84,301.11],[386.2,299.62],[387.55,298.1],[388.86,296.56],[390.15,295],[391.41,293.42],[392.64,291.81],[393.85,290.18],[395.02,288.53],[396.17,286.87],[397.29,285.18],[398.37,283.47],[399.43,281.74],[400.46,280],[401.46,278.24],[402.42,276.46],[403.36,274.66],[404.26,272.85],[405.13,271.02],[405.97,269.18],[406.78,267.32],[407.55,265.45],[408.3,263.57],[409,261.67],[409.79,259.59],[410.61,257.52],[411.26,255.99],[412.15,253.95],[413.09,251.93],[413.82,250.42],[414.83,248.43],[415.88,246.46],[416.69,244.99],[417.81,243.05],[418.96,241.12],[419.86,239.69],[421.08,237.79],[422.02,236.38],[423.31,234.52],[424.63,232.67],[425.65,231.3],[427.04,229.48],[428.11,228.13],[429.56,226.35],[430.67,225.02],[432.18,223.27],[433.34,221.97],[434.91,220.25],[436.11,218.97],[437.75,217.28],[438.99,216.03],[440.68,214.37],[441.97,213.14],[443.28,211.93],[445.04,210.32],[446.39,209.12],[448.22,207.55],[449.6,206.38],[451.01,205.22],[452.91,203.7],[454.35,202.57],[455.81,201.44],[457.79,199.97],[459.29,198.87],[460.8,197.79],[462.33,196.71],[464.4,195.3],[465.96,194.25],[467.55,193.21],[469.14,192.19],[470.75,191.18],[472.93,189.84],[474.57,188.85],[476.23,187.88],[477.91,186.91],[479.59,185.96],[481.3,185.02],[483.59,183.78],[485.32,182.87],[487.07,181.97],[488.83,181.07],[490.6,180.2],[492.39,179.33],[494.19,178.47],[496,177.63],[497.82,176.8],[499.66,175.98],[501.5,175.17],[503.36,174.37],[505.23,173.59],[507.11,172.82],[509.01,172.06],[510.91,171.31],[512.82,170.58],[514.75,169.85],[516.69,169.14],[518.63,168.44],[520.59,167.76],[522.56,167.08],[524.53,166.42],[526.52,165.77],[528.52,165.14],[530.52,164.51],[531.86,164.1],[533.88,163.5],[535.91,162.91],[537.95,162.33],[540,161.77],[542.06,161.21],[544.12,160.67],[546.19,160.15],[547.58,159.8],[549.66,159.3],[551.75,158.81],[553.85,158.33],[555.96,157.86],[558.08,157.41],[559.49,157.11],[561.61,156.68],[563.75,156.26],[565.89,155.86],[568.03,155.47],[569.47,155.21],[571.62,154.84],[573.78,154.48],[575.95,154.14],[577.4,153.92],[579.58,153.6],[581.76,153.29],[583.94,153],[586.14,152.72],[587.6,152.54],[589.8,152.28],[592,152.03],[594.21,151.8],[595.69,151.66],[597.9,151.45],[600.12,151.26],[601.6,151.13],[603.83,150.96],[606.06,150.81],[608.29,150.66],[609.78,150.57],[612.02,150.45],[614.26,150.35],[616.5,150.26],[617.99,150.2],[620.24,150.13],[622.49,150.08],[623.99,150.05],[626.24,150.02],[628.5,150],[630,150]],"i0":129,"i1":269,"step":2.0245562356227524,"plot":{"x0":92,"x1":556,"tMax":0.8,"y0":672,"y1":574,"box":[20,520,560,196]},"lines":["Resting: each red cell spends about three-quarters of a second beside the air sacs, and is full within the first third of it.","Walking: blood flows twice as fast, but more capillaries open, so each cell still has time to spare.","Running: about a third of a second in the capillary, still longer than loading takes.","All out: cells arrive emptier and leave sooner. In healthy lungs they still fill before they go."],"a0x":190.99565598883464,"a1x":409.00434401116536,"top":[300,128],"duct":[[300,34],[300,38.3],[300,42.5],[300,46.8],[300,51],[300,55.3],[300,59.5],[300,63.8],[300,68],[300,72.3],[300,76.5],[300,80.8],[300,85],[300,89.3],[300,93.5],[300,97.8],[300,102],[300,106.3],[300,110.5],[300,114.8],[300,119],[300,123.3],[300,127.5],[300,131.8],[300,136]],"pivot":[300,255.5]};

function mount(fig) {
  const svg = fig.querySelector("svg");
  const q = (s) => svg.querySelector(s);
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const out = Object.fromEntries([...fig.querySelectorAll("[data-r]")].map((n) => [n.dataset.r, n]));
  const status = fig.querySelector("[data-status]");
  const line = fig.querySelector("[data-scene]");
  const buttons = [...fig.querySelectorAll('[data-control="effort"] .opt-seg-btn')];
  const slowBtn = fig.querySelector("[data-slow]");
  const f1 = (v) => v.toFixed(1);
  const { C, R, path: P, i0, i1, plot: PL } = DATA;
  const N = P.length - 1;
  const rnd = (a, b) => a + Math.random() * (b - a);

  // ---------------------------------------------------------------- colours from the theme
  const css = getComputedStyle(fig);
  const hex = (name, fb) => {
    const v = (css.getPropertyValue(name) || fb).trim();
    const m = /^#?([0-9a-f]{6})$/i.exec(v) || /^#?([0-9a-f]{6})$/i.exec(fb);
    return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
  };
  const VEN = hex("--a5-cell-ven", "#4b52a8");
  const ART = hex("--a5-cell-art", "#d8382b");
  const mix = (t, k = 1) => `rgb(${[0, 1, 2].map((i) => Math.round((VEN[i] + (ART[i] - VEN[i]) * t) * k)).join(",")})`;

  // ---------------------------------------------------------------- the path the cells follow
  const seg = P.map((p, i) => (i < N ? Math.hypot(P[i + 1][0] - p[0], P[i + 1][1] - p[1]) : 0));
  function at(u) {
    const i = Math.max(0, Math.min(N - 1, Math.floor(u)));
    const t = Math.max(0, Math.min(1, u - i));
    const a = P[i];
    const b = P[i + 1];
    const ang = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
    return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, ang, sf: Math.max(0.42, Math.min(1.15, seg[i] / DATA.step)) };
  }

  // ---------------------------------------------------------------- state
  const S = LUNG.states;
  const FULL = satOf(LUNG.PA);
  let effort = 0;
  const shown = { tr: transitOf(S[0].co), pv: S[0].pv, f: S[0].f, tv: S[0].tv };
  let speed = 0.125;
  const cells = [];
  let nextId = 1;
  let tracked = null;
  const air = [];
  const fly = [];
  const co2 = [];
  const duct = Array.from({ length: 18 }, () => ({ s: Math.random(), o: rnd(-0.75, 0.75) }));
  let breath = 0;
  const inAir = (x, y, m = 16) => Math.hypot(x - C[0], y - C[1]) < R - m;
  function newAir(fromMouth) {
    if (fromMouth) return { x: DATA.top[0] + rnd(-22, 22), y: DATA.top[1] + rnd(4, 14), vx: rnd(-26, 26), vy: rnd(40, 70) };
    for (;;) {
      const x = rnd(C[0] - R, C[0] + R);
      const y = rnd(C[1] - R, C[1] + R);
      if (inAir(x, y, 20)) return { x, y, vx: rnd(-12, 12), vy: rnd(-12, 12) };
    }
  }
  for (let i = 0; i < 46; i++) air.push(newAir(false));

  const GAP = 21 / DATA.step; // cells about 21 px apart
  function stepSim(dt, wall) {
    // dt: model seconds; wall: seconds on the viewer's clock (for the air's wander)
    const rate = (i1 - i0) / shown.tr; // path points per model second
    if (!cells.length || cells[cells.length - 1].u >= GAP) cells.push({ id: nextId++, u: 0, tc: 0, sat: satOf(shown.pv), debt: 0 });
    for (let k = cells.length - 1; k >= 0; k--) {
      const c = cells[k];
      c.u += rate * dt;
      if (c.u >= N) {
        cells.splice(k, 1);
        continue;
      }
      if (c.u < i0) c.sat = satOf(shown.pv);
      else if (c.u <= i1) {
        c.tc += dt;
        const s = satOf(po2At(c.tc, shown.pv));
        c.debt += Math.max(0, s - c.sat);
        c.sat = s;
        while (c.debt >= 0.07) {
          c.debt -= 0.07;
          launch(c);
        }
      }
    }
    // the traced cell: the next one about to reach the sac
    if (!tracked || tracked.u > i1 + 24 || !cells.includes(tracked)) {
      let best = null;
      for (const c of cells) if (c.u < i0 - 2 && (!best || c.u > best.u)) best = c;
      tracked = best;
    }
    // oxygen: wander in the air, then fly into a loading cell
    for (const a of air) {
      a.vx += rnd(-60, 60) * wall;
      a.vy += rnd(-60, 60) * wall;
      a.vx *= 1 - 1.2 * wall;
      a.vy *= 1 - 1.2 * wall;
      a.x += a.vx * wall;
      a.y += a.vy * wall;
      if (!inAir(a.x, a.y)) {
        const dx = a.x - C[0];
        const dy = a.y - C[1];
        const d = Math.hypot(dx, dy);
        a.x = C[0] + (dx / d) * (R - 17);
        a.y = C[1] + (dy / d) * (R - 17);
        a.vx = -a.vx * 0.5;
        a.vy = -a.vy * 0.5;
      }
    }
    for (let k = fly.length - 1; k >= 0; k--) {
      const d = fly[k];
      d.t += dt;
      if (d.t >= d.dur || !cells.includes(d.c)) {
        fly.splice(k, 1);
        if (air.length < 46) air.push(newAir(true));
      }
    }
    for (let k = co2.length - 1; k >= 0; k--) {
      const g = co2[k];
      g.age += wall;
      g.x += g.vx * wall;
      g.y += g.vy * wall;
      g.vx *= 1 - 0.8 * wall;
      g.vy *= 1 - 0.8 * wall;
      if (g.age > g.life) co2.splice(k, 1);
    }
    // breathing: in for 40% of the cycle, out for 60%
    breath = (breath + (dt * shown.f) / 60) % 1;
    const flow = breath < 0.4 ? Math.sin((Math.PI * breath) / 0.4) : -Math.sin((Math.PI * (breath - 0.4)) / 0.6) * 0.67;
    for (const p of duct) p.s = (((p.s + flow * dt * (0.9 + shown.tv * 0.5) * 2.2) % 1) + 1) % 1;
  }
  function launch(c) {
    const p = at(c.u);
    let best = -1;
    let bd = 150;
    air.forEach((a, i) => {
      const d = Math.hypot(a.x - p.x, a.y - p.y);
      if (d < bd) (bd = d), (best = i);
    });
    let from;
    if (best >= 0) from = air.splice(best, 1)[0];
    else {
      const ux = (C[0] - p.x) / Math.hypot(C[0] - p.x, C[1] - p.y);
      const uy = (C[1] - p.y) / Math.hypot(C[0] - p.x, C[1] - p.y);
      const m = rnd(30, 80);
      from = { x: p.x + ux * m + rnd(-20, 20), y: p.y + uy * m + rnd(-12, 12) };
    }
    fly.push({ x0: from.x, y0: from.y, c, t: 0, dur: rnd(0.08, 0.14) });
    if (Math.random() < 0.8 && co2.length < 90) co2.push({ x: p.x, y: p.y - 3, vx: (C[0] - p.x) * rnd(0.2, 0.5) + rnd(-15, 15), vy: (C[1] - p.y) * rnd(0.3, 0.6) - 18, age: 0, life: rnd(1.1, 1.8) });
  }

  // ---------------------------------------------------------------- drawing
  const dots = (list, r) => list.map((p) => `M${f1(p[0] - r)} ${f1(p[1])}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`).join("");
  const xOf = (t) => PL.x0 + (Math.min(t, PL.tMax) / PL.tMax) * (PL.x1 - PL.x0);
  const yOf = (s) => PL.y0 - s * (PL.y0 - PL.y1);
  // how far across the traced capillary a cell is after t seconds in it (0 at the arteriole end, 1 at the venule end)
  const fracOf = (t) => (P[Math.round(i0 + (i1 - i0) * Math.min(1, t / shown.tr))][0] - DATA.a0x) / (DATA.a1x - DATA.a0x);
  const ductAt = (s, o) => {
    const d = DATA.duct;
    const u = s * (d.length - 1);
    const i = Math.min(d.length - 2, Math.floor(u));
    const t = u - i;
    return [d[i][0] + (d[i + 1][0] - d[i][0]) * t + o * 24, d[i][1] + (d[i + 1][1] - d[i][1]) * t];
  };
  const set = (sel, a, v) => q(sel).setAttribute(a, v);
  function cellSvg(c) {
    const p = at(c.u);
    const satIn = satOf(shown.pv);
    const k = Math.max(0, Math.min(1, (c.sat - satIn) / (FULL - satIn)));
    const t = c.u < i0 ? 0 : k;
    const rx = 6.8 * p.sf;
    return `<g transform="translate(${f1(p.x)} ${f1(p.y)}) rotate(${f1(p.ang)})"><ellipse class="a5-cell" rx="${f1(rx)}" ry="4.7" fill="${mix(t)}"/><ellipse rx="${f1(rx * 0.42)}" ry="1.9" fill="${mix(t, 0.62)}"/></g>`;
  }
  function draw() {
    // the tissue breathes (the whole block swells about its centre)
    const vol = breath < 0.4 ? (1 - Math.cos((Math.PI * breath) / 0.4)) / 2 : (1 + Math.cos((Math.PI * (breath - 0.4)) / 0.6)) / 2;
    const s = 1 + (0.012 + 0.011 * shown.tv) * vol;
    const [px, py] = DATA.pivot || C;
    set('[data-part="sac"]', "transform", `translate(${px} ${py}) scale(${s.toFixed(4)}) translate(${-px} ${-py})`);
    // cells
    let back = "";
    let front = "";
    for (const c of cells) {
      const sv = cellSvg(c);
      if (c.u >= i0 && c.u <= i1) front += sv;
      else back += sv;
    }
    q('[data-part="cellsBack"]').innerHTML = back;
    q('[data-part="cellsFront"]').innerHTML = front;
    // oxygen and carbon dioxide
    set('[data-part="air"]', "d", dots(air.map((a) => [a.x, a.y]), 3));
    set(
      '[data-part="fly"]',
      "d",
      dots(
        fly.map((d) => {
          const p = at(d.c.u);
          const e = Math.min(1, d.t / d.dur) ** 1.6;
          return [d.x0 + (p.x - d.x0) * e, d.y0 + (p.y - d.y0) * e];
        }),
        3,
      ),
    );
    const buckets = [[], [], []];
    for (const g of co2) buckets[Math.min(2, Math.floor((g.age / g.life) * 3))].push([g.x, g.y]);
    buckets.forEach((b, i) => set(`[data-part="co2${i}"]`, "d", dots(b, 2.6)));
    set('[data-part="ductair"]', "d", dots(duct.map((p) => ductAt(p.s, p.o)), 2.6));
    // the traced cell's ring
    const tr = tracked && cells.includes(tracked) ? at(tracked.u) : null;
    set('[data-part="track"]', "cx", tr ? f1(tr.x) : -60);
    set('[data-part="track"]', "cy", tr ? f1(tr.y) : -60);
    // the net turns red where the traced capillary does
    set('[data-part="netA"]', "offset", Math.max(0, fracOf(0.02)).toFixed(3));
    set('[data-part="netB"]', "offset", Math.min(1, fracOf(0.14) + 0.02).toFixed(3));
    // the monitor
    const satIn = satOf(shown.pv);
    let d = "";
    let g = "";
    for (let i = 0; i <= 80; i++) {
      const t = (i / 80) * PL.tMax;
      const pt = `${f1(xOf(t))} ${f1(yOf(satOf(po2At(t, shown.pv))))}`;
      if (t <= shown.tr) d += `${d ? "L" : "M"}${pt}`;
      else g += `${g ? "L" : `M${f1(xOf(shown.tr))} ${f1(yOf(satOf(po2At(shown.tr, shown.pv))))}L`}${pt}`;
    }
    if (shown.tr < PL.tMax) d += `L${f1(xOf(shown.tr))} ${f1(yOf(satOf(po2At(shown.tr, shown.pv))))}`;
    set('[data-part="curve"]', "d", d);
    set('[data-part="ghost"]', "d", g);
    const xs = xOf(LUNG.equil);
    const xe = xOf(shown.tr);
    set('[data-part="spare"]', "x", f1(xs));
    set('[data-part="spare"]', "width", f1(Math.max(0, xe - xs)));
    set('[data-part="sparetxt"]', "x", f1((xs + xe) / 2));
    set('[data-part="sparetxt"]', "opacity", xe - xs > 90 ? 1 : 0);
    set('[data-part="exit"]', "transform", `translate(${f1(xe)} 0)`);
    set('[data-part="start"]', "cx", f1(PL.x0));
    set('[data-part="start"]', "cy", f1(yOf(satIn)));
    const dot = q('[data-part="dot"]');
    if (tracked && cells.includes(tracked)) {
      const tt = Math.min(tracked.tc, shown.tr);
      dot.setAttribute("cx", f1(xOf(tt)));
      dot.setAttribute("cy", f1(yOf(tracked.u < i0 ? satIn : tracked.sat)));
      dot.setAttribute("opacity", 1);
    } else dot.setAttribute("opacity", 0);
  }

  // ---------------------------------------------------------------- input, tour, loop
  function setEffort(i, quiet) {
    effort = i;
    const st = S[i];
    const tr = transitOf(st.co);
    out.time.textContent = `${tr.toFixed(2)} s`;
    out.in.textContent = `${Math.round(100 * satOf(st.pv))}% full`;
    out.out.textContent = `${Math.round(100 * satOf(po2At(tr, st.pv)))}% full`;
    line.textContent = DATA.lines[i];
    buttons.forEach((b, j) => {
      b.setAttribute("aria-checked", j === i ? "true" : "false");
      b.tabIndex = j === i ? 0 : -1;
    });
    if (!quiet) status.textContent = `${st.label}: each red cell spends about ${tr.toFixed(2)} seconds in the capillary, arrives ${Math.round(100 * satOf(st.pv))}% full and leaves ${Math.round(100 * satOf(po2At(tr, st.pv)))}% full.`;
  }
  let touring = true;
  let idle = -1e9;
  const takeOver = () => {
    touring = false;
    idle = performance.now();
  };
  buttons.forEach((b, i) =>
    b.addEventListener("click", () => {
      takeOver();
      setEffort(i);
      if (still.matches) renderStill();
    }),
  );
  fig.querySelector('[data-control="effort"]').addEventListener("keydown", (e) => {
    const i = buttons.indexOf(document.activeElement);
    if (i < 0) return;
    const j = e.key === "ArrowRight" || e.key === "ArrowDown" ? i + 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? i - 1 : null;
    if (j === null) return;
    e.preventDefault();
    const b = buttons[(j + buttons.length) % buttons.length];
    b.focus();
    b.click();
  });
  for (const b of buttons) b.addEventListener("pointerdown", takeOver);
  slowBtn.addEventListener("click", () => {
    speed = speed < 1 ? 1 : 0.125;
    slowBtn.setAttribute("aria-pressed", speed < 1 ? "true" : "false");
  });
  const snap = () => {
    const st = S[effort];
    Object.assign(shown, { tr: transitOf(st.co), pv: st.pv, f: st.f, tv: st.tv });
  };
  function renderStill() {
    // the traced cell a little way in, half loaded: the moment the picture is about
    snap();
    cells.length = 0;
    fly.length = 0;
    co2.length = 0;
    tracked = null;
    for (let i = 0; i < 4000; i++) {
      stepSim(1 / 240, 1 / 60);
      if (i > 600 && tracked && tracked.tc > 0.05) break;
    }
    breath = 0.35;
    draw();
  }
  let tourClock = 0;
  let raf = 0;
  let last = 0;
  let visible = true;
  function tick(now) {
    raf = 0;
    if (!visible || still.matches) return;
    const wall = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    if (!touring && now - idle > 9000) touring = true;
    if (touring && (tourClock += wall) > 8) {
      tourClock = 0;
      setEffort((effort + 1) % S.length, true);
    }
    const st = S[effort];
    const e = 1 - Math.exp(-wall * 2.5);
    shown.tr += (transitOf(st.co) - shown.tr) * e;
    shown.pv += (st.pv - shown.pv) * e;
    shown.f += (st.f - shown.f) * e;
    shown.tv += (st.tv - shown.tv) * e;
    stepSim(wall * speed, wall);
    draw();
    raf = requestAnimationFrame(tick);
  }
  const start = () => {
    if (!raf && visible && !still.matches) {
      last = 0;
      raf = requestAnimationFrame(tick);
    }
  };
  new IntersectionObserver((entries) => {
    visible = entries.some((en) => en.isIntersecting);
    if (visible) start();
  }).observe(svg);
  still.addEventListener("change", () => (still.matches ? renderStill() : start()));
  setEffort(0, true);
  if (still.matches) renderStill();
  else {
    for (let i = 0; i < 240; i++) stepSim(1 / 240, 1 / 60);
    draw();
    start();
  }
}

class Fig extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    const root = this.attachShadow({ mode: "open" });
    const theme = this.getAttribute("theme") === "dark" ? "dark" : "light";
    root.innerHTML = "<style>" + "\n.iso{\n  --anatomy-page:#0b0b0b;--anatomy-card:#131313;--anatomy-text:#a3a3a3;--anatomy-strong:#e6e6e6;--anatomy-muted:#6e6e6e;\n  --anatomy-paper:#131313;--anatomy-face:#1b1b1b;--anatomy-top:#1c1c1c;\n  --anatomy-shade-0:#0f0f0f;--anatomy-shade-1:#121212;--anatomy-shade-2:#151515;--anatomy-shade-3:#181818;\n  --anatomy-lit-top:#262626;--anatomy-lit-shade:#1d1d1d;\n  --anatomy-hi:#d4d4d4;--anatomy-mid:#6a6a6a;--anatomy-lo:#3e3e3e;--anatomy-faint:#2a2a2a;--anatomy-lit:#ffffff;\n  --anatomy-halo:#050505;--anatomy-halo-opacity:.9;--anatomy-dot:#e6e6e6;\n  --anatomy-red:#ff6b6b;--anatomy-green:#6be0a0;--anatomy-blue:#6b9bff;\n  --anatomy-weight:.6px;--anatomy-ease:cubic-bezier(.32,.72,0,1);\n  --anatomy-mono:ui-monospace,\"SF Mono\",Menlo,Consolas,monospace;\n  --anatomy-lift:inset 0 1px 0 0 #ffffff0a,inset 0 0 0 1px #ffffff06,0 0 0 1px #00000026,0 1px 1px -.5px #00000014,0 3px 3px -1.5px #00000014,0 6px 6px -3px #00000014,0 12px 12px -6px #00000014;\n}\n.iso[data-theme=\"light\"]{\n  --anatomy-page:#f2f2ef;--anatomy-card:#fbfbfa;--anatomy-text:#57575a;--anatomy-strong:#18181a;--anatomy-muted:#8c8c90;\n  --anatomy-paper:#fbfbfa;--anatomy-face:#ffffff;--anatomy-top:#ffffff;\n  --anatomy-shade-0:#dcdcd9;--anatomy-shade-1:#e5e5e2;--anatomy-shade-2:#ededea;--anatomy-shade-3:#f4f4f1;\n  --anatomy-lit-top:#ffffff;--anatomy-lit-shade:#eeeeeb;\n  --anatomy-hi:#26262a;--anatomy-mid:#8a8a8f;--anatomy-lo:#b4b4b8;--anatomy-faint:#d4d4d6;--anatomy-lit:#000000;\n  --anatomy-halo:#8a8a80;--anatomy-halo-opacity:.32;--anatomy-dot:#3a3a3e;\n  --anatomy-red:#e5484d;--anatomy-green:#30a46c;--anatomy-blue:#3e63dd;\n  --anatomy-lift:inset 0 1px 0 0 #ffffff,0 0 0 1px #0000000f,0 1px 1px -.5px #0000000a,0 3px 3px -1.5px #0000000a,0 6px 6px -3px #0000000a,0 12px 12px -6px #0000000a;\n}\n.iso-svg{display:block;width:100%;height:auto;overflow:visible}\n.iso-svg path,.iso-svg circle{vector-effect:non-scaling-stroke}\n.iso-fill{fill:var(--anatomy-paper);stroke:none}\n.iso-solid[data-lit]>.iso-fill{fill:var(--anatomy-face)}\n.iso-shade,.iso-top{stroke:none}\n.iso-shade[data-shade=\"0\"]{fill:var(--anatomy-shade-0)}\n.iso-shade[data-shade=\"1\"]{fill:var(--anatomy-shade-1)}\n.iso-shade[data-shade=\"2\"]{fill:var(--anatomy-shade-2)}\n.iso-shade[data-shade=\"3\"]{fill:var(--anatomy-shade-3)}\n.iso-top{fill:var(--anatomy-top)}\n.iso-solid[data-lit]>.iso-top{fill:var(--anatomy-lit-top)}\n.iso-solid[data-lit]>.iso-shade{fill:var(--anatomy-lit-shade)}\n.iso-solid[data-seamless]>.iso-shade,.iso-solid[data-seamless]>.iso-top{stroke-width:.4;stroke-linejoin:round}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"0\"]{stroke:var(--anatomy-shade-0)}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"1\"]{stroke:var(--anatomy-shade-1)}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"2\"]{stroke:var(--anatomy-shade-2)}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"3\"]{stroke:var(--anatomy-shade-3)}\n.iso-solid[data-seamless]>.iso-top{stroke:var(--anatomy-top)}\n.iso-solid[data-seamless][data-lit]>.iso-top{stroke:var(--anatomy-lit-top)}\n.iso-solid[data-seamless][data-lit]>.iso-shade{stroke:var(--anatomy-lit-shade)}\n.iso-solid[data-lit]>.iso-edge{stroke:var(--anatomy-lit)}\n.iso-halo{fill:var(--anatomy-halo);stroke:none;filter:blur(9px);opacity:var(--anatomy-halo-opacity);transform:translateY(3px)}\n.iso-line{fill:none;stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight);stroke-linecap:round;stroke-linejoin:round}\n.iso-line[data-tone=\"hi\"]{stroke:var(--anatomy-hi)}\n.iso-line[data-tone=\"mid\"]{stroke:var(--anatomy-mid)}\n.iso-line[data-tone=\"lo\"]{stroke:var(--anatomy-lo)}\n.iso-line[data-tone=\"faint\"]{stroke:var(--anatomy-faint)}\n.iso-line[data-tone=\"lit\"]{stroke:var(--anatomy-lit)}\n.iso-line[data-tone=\"red\"]{stroke:var(--anatomy-red)}\n.iso-line[data-tone=\"green\"]{stroke:var(--anatomy-green)}\n.iso-line[data-tone=\"blue\"]{stroke:var(--anatomy-blue)}\n.iso-line[data-dotted]{stroke-dasharray:.01 3.5;stroke-width:1}\n.iso-line[data-dashed]{stroke-dasharray:3 3}\n.iso-line[data-flow]{stroke-dasharray:2 6}\n.iso-wire-end{fill:var(--anatomy-paper);stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight)}\n.iso-wire[data-tone=\"hi\"] .iso-wire-end{stroke:var(--anatomy-hi)}\n.iso-wire[data-tone=\"mid\"] .iso-wire-end{stroke:var(--anatomy-mid)}\n.iso-wire[data-tone=\"faint\"] .iso-wire-end{stroke:var(--anatomy-faint)}\n.iso-wire[data-tone=\"lit\"] .iso-wire-end{stroke:var(--anatomy-lit)}\n.iso-dots circle{fill:var(--anatomy-dot);stroke:none;opacity:.32}\n.iso-dots[data-tone=\"hi\"] circle{opacity:.85}\n.iso-dots[data-tone=\"mid\"] circle{opacity:.45}\n.iso-dots[data-tone=\"lo\"] circle{opacity:.22}\n.iso-dots[data-tone=\"faint\"] circle{opacity:.12}\n.iso-face-text{fill:var(--anatomy-mid);font-family:var(--anatomy-mono);letter-spacing:.04em}\n.iso-face-text[data-tone=\"hi\"]{fill:var(--anatomy-hi)}\n.iso-face-text[data-tone=\"lo\"]{fill:var(--anatomy-lo)}\n.iso-face-text[data-tone=\"faint\"]{fill:var(--anatomy-faint)}\n.tb-body{fill:var(--anatomy-shade-2);stroke:none}\n.tb-shine{fill:var(--anatomy-top);stroke:none}\n.tb-shade{fill:var(--anatomy-shade-0);stroke:none}\n.tb-ring{fill:none;stroke:var(--anatomy-lo);stroke-width:.45;stroke-linecap:butt;stroke-linejoin:round}\n.tb-ring[data-tone=\"mid\"]{stroke:var(--anatomy-mid)}\n.tb-ring[data-tone=\"faint\"]{stroke:var(--anatomy-faint)}\n.tb-ring[data-tone=\"hi\"]{stroke:var(--anatomy-hi)}\n@keyframes iso-flow{to{stroke-dashoffset:-32}}\n@keyframes iso-pulse{0%,100%{opacity:.18}12%{opacity:1}40%{opacity:.18}}\n.iso-line[data-flow]{animation:iso-flow 1600ms linear infinite}\n.iso-dots circle[data-pulse]{animation:iso-pulse 1600ms steps(1,end) infinite;animation-delay:var(--pulse-at,0ms)}\n.iso-figure{margin:32px 0 36px}\n.iso-plate{position:relative;padding:52px 24px;border-radius:0;background:var(--anatomy-card);box-shadow:0 0 0 1px var(--anatomy-mid);--anatomy-paper:var(--anatomy-card)}\n.iso-plate-corners{position:absolute;inset:18px 20px;pointer-events:none}\n.iso-plate-corner{position:absolute;color:var(--anatomy-muted);font-family:var(--anatomy-mono);font-size:10.5px;line-height:1;letter-spacing:.04em;white-space:nowrap}\n.iso-plate-corner[data-corner=\"fig\"]{top:0;left:0;color:var(--anatomy-text)}\n.iso-plate-corner[data-corner=\"title\"]{top:0;right:0;text-transform:uppercase;letter-spacing:.1em}\n.iso-plate-corner[data-corner=\"hint\"]{bottom:0;left:0;text-transform:uppercase;letter-spacing:.1em}\n.iso-plate-corner[data-corner=\"readout\"]{right:0;bottom:0;color:var(--anatomy-text);font-variant-numeric:tabular-nums}\n.iso-plate .iso-svg{margin:0 auto}\n.iso-legend{display:grid;gap:8px;margin-top:12px;color:var(--anatomy-muted);font-size:13px;line-height:1.55}\n.iso-keys{display:flex;flex-wrap:wrap;gap:6px 18px}\n.iso-key{display:inline-flex;align-items:center;gap:7px}\n.iso-swatch{width:16px;height:10px;flex:none;overflow:visible}\n.iso-swatch path{fill:none;stroke:var(--anatomy-hi);stroke-width:1;vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round}\n.iso-swatch[data-mark=\"raised\"] path,.iso-swatch[data-mark=\"flat\"] path{stroke:var(--anatomy-mid)}\n.iso-swatch[data-mark=\"lit\"] path{stroke:var(--anatomy-lit)}\n.iso-swatch[data-mark=\"dim\"] path{stroke:var(--anatomy-lo)}\n.iso-swatch[data-mark=\"dotted\"] path{stroke-dasharray:.01 3;stroke-width:1.4}\n.iso-swatch[data-mark=\"dashed\"] path{stroke-dasharray:3 2.5}\n.iso-swatch[data-mark=\"red\"] path{stroke:var(--anatomy-red)}\n.iso-swatch[data-mark=\"green\"] path{stroke:var(--anatomy-green)}\n.iso-swatch[data-mark=\"blue\"] path{stroke:var(--anatomy-blue)}\n.iso-swatch-crease{stroke:var(--anatomy-lo)!important}\n@media (max-width:560px){.iso-plate{padding:48px 12px 70px}.iso-plate-corner[data-corner=\"hint\"]{bottom:18px}}\n@media (prefers-reduced-motion:reduce){.iso-line[data-flow],.iso-dots circle[data-pulse]{animation:none}}\n/*\n * Optimal theme for Anatomy figures.\n *\n * Load AFTER the kit's ISO_CSS. Put `class=\"iso optimal\"` on the wrapper:\n *   - no data-theme  -> \"Forest night\"  (exam-room TV, dark)\n *   - data-theme=\"light\" -> \"Cream\"     (beoptimal.ca, the primary target)\n *\n * Values come from the live site (beoptimal-landing src/index.css), the\n * Performance package design and the ALE visualizer spec. The kit's grey\n * ramps are warmed so solids sit on the site's cream paper, and the single\n * \"lit\" accent is Optimal forest green instead of pure black/white.\n */\n\n.iso.optimal {\n  /* Forest night (dark) */\n  --anatomy-page: #152511;\n  --anatomy-card: #1c3118;\n  --anatomy-text: #c9cdbf;\n  --anatomy-strong: #fffcf7;\n  --anatomy-muted: #8e9884;\n  --anatomy-paper: #1c3118;\n  --anatomy-face: #253821;\n  --anatomy-top: #283c24;\n  --anatomy-shade-0: #172812;\n  --anatomy-shade-1: #1a2c16;\n  --anatomy-shade-2: #1e321a;\n  --anatomy-shade-3: #22371e;\n  --anatomy-lit-top: #34492f;\n  --anatomy-lit-shade: #2a3f26;\n  --anatomy-hi: #e9e6dc;\n  --anatomy-mid: #7e8a74;\n  --anatomy-lo: #4d5c46;\n  --anatomy-faint: #33452e;\n  --anatomy-lit: #fffcf7;\n  --anatomy-halo: #0b1508;\n  --anatomy-halo-opacity: 0.9;\n  --anatomy-dot: #e9e6dc;\n  --anatomy-red: #e0745f;\n  --anatomy-green: #8cc67f;\n  --anatomy-blue: #7fa8d9;\n  --anatomy-mono: \"JetBrains Mono\", ui-monospace, \"SF Mono\", Menlo, Consolas, monospace;\n\n  /* Optimal extras (use sparingly; colour only when colour is the subject) */\n  --opt-display: \"Castoro\", Georgia, serif;\n  --opt-ui: \"Public Sans\", system-ui, sans-serif;\n  --opt-forest: #2c4e25;\n  --opt-forest-light: #519044;\n  --opt-sage: #5e7a59;\n  --opt-borderline: #c97b2d;\n  --opt-out: #b3402f;\n  --opt-heat: #ff9776;\n}\n\n.iso.optimal[data-theme=\"light\"] {\n  /* Cream (light) */\n  --anatomy-page: #fef8f1;\n  --anatomy-card: #fffcf7;\n  --anatomy-text: #3e3d39;\n  --anatomy-strong: #252525;\n  --anatomy-muted: #76736d;\n  --anatomy-paper: #fffcf7;\n  --anatomy-face: #fffefb;\n  --anatomy-top: #fffefb;\n  --anatomy-shade-0: #ddd7cc;\n  --anatomy-shade-1: #e7e2d9;\n  --anatomy-shade-2: #f0ede5;\n  --anatomy-shade-3: #f6f3ec;\n  --anatomy-lit-top: #fffefb;\n  --anatomy-lit-shade: #efebe2;\n  --anatomy-hi: #252525;\n  --anatomy-mid: #8a867e;\n  --anatomy-lo: #b9b4aa;\n  --anatomy-faint: #d9d3c8;\n  --anatomy-lit: #2c4e25;\n  --anatomy-halo: #8a8070;\n  --anatomy-halo-opacity: 0.3;\n  --anatomy-dot: #3a3833;\n  --anatomy-red: #b3402f;\n  --anatomy-green: #3f7a35;\n  --anatomy-blue: #3e6a8f;\n}\n\n/* Card typography: brand fonts for titles and readouts, kit mono for plate corners */\n.iso.optimal .iso-plate-title,\n.iso.optimal [data-role=\"title\"] {\n  font-family: var(--opt-display);\n  letter-spacing: -0.02em;\n}\n.iso.optimal [data-role=\"readout\"],\n.iso.optimal .iso-readout {\n  font-family: var(--opt-ui);\n  font-feature-settings: \"tnum\" 1, \"ss01\" 1;\n}\n\n/*\n * Card layout for Optimal figures (shared/page.mjs `plate`).\n * Phone first: the drawing, then a row of real buttons (>=44 px), then a footer\n * where the hint and the readout wrap instead of overlapping at 320 px.\n */\n.iso.optimal {\n  --opt-rule: rgba(233, 230, 220, 0.16);\n  --opt-btn: rgba(233, 230, 220, 0.06);\n  --opt-btn-on: #e9e6dc;\n  --opt-btn-on-text: #1c3118;\n  --opt-title: #fffcf7;\n  --opt-fig: #8cc67f;\n  --opt-heat-ink: #ff9776;\n  --opt-heat-glow: rgba(255, 151, 118, 0.55);\n  --opt-heat-wash: rgba(255, 151, 118, 0.16);\n  --opt-cold-ink: #9cc3e6;\n}\n.iso.optimal[data-theme=\"light\"] {\n  --opt-rule: rgba(44, 78, 37, 0.2);\n  --opt-btn: #fffcf7;\n  --opt-btn-on: #2c4e25;\n  --opt-btn-on-text: #fffcf7;\n  --opt-title: #2c4e25;\n  --opt-fig: #5e7a59;\n  --opt-heat-ink: #c8552e;\n  --opt-heat-glow: rgba(232, 108, 64, 0.42);\n  --opt-heat-wash: rgba(255, 151, 118, 0.22);\n  --opt-cold-ink: #3e6a8f;\n}\n.iso.optimal .opt-plate {\n  padding: 52px 24px 20px;\n  box-shadow: 0 0 0 1px var(--opt-rule);\n  border-radius: 2px;\n}\n.iso.optimal .iso-plate-corner[data-corner=\"fig\"] {\n  font-family: var(--opt-display);\n  font-style: italic;\n  font-size: 15px;\n  letter-spacing: 0;\n  color: var(--opt-fig);\n  top: -2px;\n}\n.iso.optimal .iso-plate-corner[data-corner=\"title\"] {\n  font-family: var(--opt-display);\n  font-size: 17px;\n  text-transform: none;\n  letter-spacing: -0.01em;\n  color: var(--opt-title);\n  top: -4px;\n}\n.iso.optimal .opt-controls {\n  display: flex;\n  flex-wrap: wrap;\n  justify-content: center;\n  gap: 8px 12px;\n  margin: 10px 0 0;\n}\n.iso.optimal .opt-seg {\n  display: inline-flex;\n  border-radius: 999px;\n  box-shadow: inset 0 0 0 1px var(--opt-rule);\n  padding: 3px;\n  gap: 2px;\n  max-width: 100%;\n}\n.iso.optimal .opt-seg-btn {\n  appearance: none;\n  border: 0;\n  margin: 0;\n  min-height: 44px;\n  min-width: min-content; /* never shrink a label below its longest word (with the padding, always ≥ 44 px) */\n  padding: 0 16px;\n  border-radius: 999px;\n  background: transparent;\n  color: var(--anatomy-text);\n  font: 500 14px/1.1 var(--opt-ui);\n  letter-spacing: 0;\n  cursor: pointer;\n  touch-action: manipulation;\n  -webkit-tap-highlight-color: transparent;\n  transition: background-color 240ms var(--anatomy-ease), color 240ms var(--anatomy-ease);\n}\n.iso.optimal .opt-seg-btn[aria-checked=\"true\"] {\n  background: var(--opt-btn-on);\n  color: var(--opt-btn-on-text);\n}\n.iso.optimal .opt-seg-btn:focus-visible {\n  outline: 2px solid var(--opt-fig);\n  outline-offset: 2px;\n}\n.iso.optimal .opt-foot {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: flex-end;\n  justify-content: space-between;\n  gap: 10px 20px;\n  margin-top: 16px;\n}\n.iso.optimal .opt-hint {\n  font-family: var(--anatomy-mono);\n  font-size: 10.5px;\n  line-height: 1.4;\n  letter-spacing: 0.1em;\n  text-transform: uppercase;\n  color: var(--anatomy-muted);\n  flex: 1 1 160px;\n  min-width: 0;\n}\n.iso.optimal .opt-readout {\n  display: grid;\n  grid-auto-flow: column;\n  gap: 4px 18px;\n  margin: 0;\n  font-family: var(--opt-ui);\n  font-feature-settings: \"tnum\" 1;\n}\n.iso.optimal .opt-stat { margin: 0; min-width: 0; }\n.iso.optimal .opt-stat dt {\n  font-size: 10px;\n  font-weight: 600;\n  letter-spacing: 0.12em;\n  text-transform: uppercase;\n  color: var(--anatomy-muted);\n  white-space: nowrap;\n}\n.iso.optimal .opt-stat dd {\n  margin: 1px 0 0;\n  font-size: 15px;\n  font-weight: 500;\n  color: var(--anatomy-strong);\n  white-space: nowrap;\n}\n.iso.optimal .iso-legend { font-family: var(--opt-ui); font-size: 13.5px; }\n.iso.optimal .iso-caption { color: var(--anatomy-text); }\n.iso.optimal .iso-caption em { font-style: italic; }\n.iso.optimal .iso-swatch[data-mark=\"heat\"] path { stroke: var(--opt-heat-ink); stroke-width: 2; }\n.iso.optimal .iso-stage { outline: none; border-radius: 4px; touch-action: pan-y; -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none; }\n.iso.optimal .iso-stage:focus-visible { outline: 1px solid var(--anatomy-muted); outline-offset: 6px; }\n@media (max-width: 560px) {\n  .iso.optimal .opt-plate { padding: 44px 10px 14px; }\n  .iso.optimal .iso-plate-corners { inset: 16px 12px; }\n  .iso.optimal .opt-readout { grid-auto-flow: row; grid-template-columns: repeat(4, minmax(0, auto)); width: 100%; justify-content: space-between; gap: 4px 10px; order: -1; }\n  .iso.optimal .opt-stat dd { font-size: 14px; }\n  /* a long label wraps onto two lines instead of running into its neighbour; values stay on one baseline */\n  .iso.optimal .opt-stat { display: flex; flex-direction: column; justify-content: space-between; }\n  .iso.optimal .opt-stat dt { white-space: normal; line-height: 1.25; }\n  .iso.optimal .opt-seg-btn { padding: 0 12px; font-size: 13.5px; }\n}\n@media (max-width: 350px) {\n  .iso.optimal .opt-seg-btn { padding: 0 7px; font-size: 12.5px; }\n  .iso.optimal .opt-stat dt { font-size: 9px; letter-spacing: 0.08em; }\n  .iso.optimal .opt-stat dd { font-size: 13px; }\n}\n\n:host{display:block}\n.opt-host{background:transparent;color:var(--anatomy-text);font:15px/1.6 var(--opt-ui);-webkit-font-smoothing:antialiased}\n.opt-host *{box-sizing:border-box}\n.opt-host .iso-figure{margin:0}\n/* A5 · the air sac: a glassy rose bubble in a bunch of dimmer neighbours, a capillary net in\n   textbook blue-to-red, cells drawn solid, oxygen as bright aqua dots, CO₂ as grey ones. */\n.iso.optimal {\n  --a5-s0: #4a2427; --a5-s1: #5c2e30; --a5-s2: #96564f; --a5-s3: #e0a091; --a5-rim: #f0b9aa;\n  --a5-n0: #2e1a1c; --a5-n1: #3b2022; --a5-n2: #7b4740; --a5-nb-rim: #a3665b;\n  --a5-pave: rgba(255, 214, 200, 0.16); --a5-nuc: rgba(255, 214, 200, 0.2);\n  --a5-t2: #a8645a; --a5-t2-edge: #e7ab9c; --a5-gran: #ffe3c4; --a5-mac: #8c5a63; --a5-mac-nuc: #d7a3ad;\n  --a5-mouth: #1c0f10; --a5-duct: #7f4740; --a5-duct-edge: #c88a7d; --a5-duct-ring: rgba(255, 210, 196, 0.28);\n  --a5-ven: #5d63b8; --a5-art: #d84c3f; --a5-net-edge: #2a1416;\n  --a5-ven-tube: #3d3f6e; --a5-art-tube: #6e2c2a; --a5-plasma: #e7c4b8; --a5-cap-edge: #2a1416;\n  --a5-cell-ven: #4f56b3; --a5-cell-art: #e2402f;\n  --a5-o2: #8ff0e6; --a5-co2: #b3b0aa; --a5-track: #fff1b8; --a5-dot: #fff1b8;\n  --a5-spec0: rgba(255, 236, 228, 0.22); --a5-spec1: rgba(255, 236, 228, 0);\n  --a5-plot-bg: #0f1b0c; --a5-plot-ink: #c9e3c1; --a5-plot-dim: #33452e; --a5-curve: #ff8b7b; --a5-spare: rgba(143, 240, 230, 0.12); --a5-spare-ink: #8ff0e6;\n}\n.iso.optimal[data-theme=\"light\"] {\n  --a5-s0: #fff6f1; --a5-s1: #fbe4db; --a5-s2: #efc0b2; --a5-s3: #d89282; --a5-rim: #9a5245;\n  --a5-n0: #f8ebe5; --a5-n1: #f2d9cf; --a5-n2: #ddaa9b; --a5-nb-rim: #b97b6c;\n  --a5-pave: rgba(138, 74, 62, 0.17); --a5-nuc: rgba(138, 74, 62, 0.2);\n  --a5-t2: #eab3a3; --a5-t2-edge: #9a5245; --a5-gran: #8a4a3e; --a5-mac: #cf9aa6; --a5-mac-nuc: #7a3d4a;\n  --a5-mouth: #6b3a33; --a5-duct: #e6b0a2; --a5-duct-edge: #9a5245; --a5-duct-ring: rgba(122, 58, 48, 0.3);\n  --a5-ven: #7880cc; --a5-art: #da5a4c; --a5-net-edge: #8a4a3e;\n  --a5-ven-tube: #c3c6ea; --a5-art-tube: #f0b8ae; --a5-plasma: #fff4ef; --a5-cap-edge: #8a4a3e;\n  --a5-cell-ven: #4a52b0; --a5-cell-art: #d4382a;\n  --a5-o2: #0f8a8f; --a5-co2: #8c877e; --a5-track: #1d2a1a; --a5-dot: #fff1b8;\n  --a5-spec0: rgba(255, 255, 255, 0.7); --a5-spec1: rgba(255, 255, 255, 0);\n  --a5-plot-bg: #1d2a1a; --a5-plot-ink: #d9efd2; --a5-plot-dim: #3d5436; --a5-curve: #ff9a8b; --a5-spare: rgba(143, 240, 230, 0.14); --a5-spare-ink: #9ff3ea;\n}\n.a5-s0 { stop-color: var(--a5-s0); } .a5-s1 { stop-color: var(--a5-s1); } .a5-s2 { stop-color: var(--a5-s2); } .a5-s3 { stop-color: var(--a5-s3); }\n.a5-n0 { stop-color: var(--a5-n0); } .a5-n1 { stop-color: var(--a5-n1); } .a5-n2 { stop-color: var(--a5-n2); }\n.a5-spec0 { stop-color: var(--a5-spec0); } .a5-spec1 { stop-color: var(--a5-spec1); }\n.a5-ven-stop { stop-color: var(--a5-ven); } .a5-art-stop { stop-color: var(--a5-art); }\n.a5-svg .a5-plot path, .a5-svg .a5-plot rect, .a5-svg .a5-plot circle { vector-effect: non-scaling-stroke; }\n.a5-rim { fill: none; stroke: var(--a5-rim); stroke-width: 1.4; opacity: 0.8; }\n.a5-nb-rim { fill: none; stroke: var(--a5-nb-rim); stroke-width: 1.1; }\n.a5-nb-net-edge { fill: none; stroke: var(--a5-net-edge); stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; opacity: 0.55; }\n.a5-nb-net { fill: none; stroke: url(#a5-nbnet); stroke-width: 3.2; stroke-linecap: round; stroke-linejoin: round; opacity: 0.55; }\n.a5-pave { fill: none; stroke: var(--a5-pave); stroke-width: 1; }\n.a5-nuc { fill: var(--a5-nuc); }\n.a5-t2 { fill: var(--a5-t2); stroke: var(--a5-t2-edge); stroke-width: 1; opacity: 0.85; }\n.a5-gran { fill: var(--a5-gran); opacity: 0.8; }\n.a5-mac { fill: var(--a5-mac); stroke: var(--a5-t2-edge); stroke-width: 0.9; opacity: 0.85; }\n.a5-mac-nuc { fill: var(--a5-mac-nuc); opacity: 0.9; }\n.a5-mouth { fill: var(--a5-mouth); stroke: var(--a5-rim); stroke-width: 1; opacity: 0.85; }\n.a5-duct { fill: var(--a5-duct); stroke: var(--a5-duct-edge); stroke-width: 1.3; }\n.a5-duct-ring { fill: none; stroke: var(--a5-duct-ring); stroke-width: 2.2; stroke-linecap: round; }\n.a5-duct-air { fill: var(--a5-o2); opacity: 0.55; }\n.a5-net-edge { fill: none; stroke: var(--a5-net-edge); stroke-width: 7.6; stroke-linecap: round; stroke-linejoin: round; opacity: 0.45; }\n.a5-net { fill: none; stroke: url(#a5-net); stroke-width: 5.2; stroke-linecap: round; stroke-linejoin: round; opacity: 0.74; }\n.a5-ven-tube { fill: var(--a5-ven-tube); stroke: var(--a5-cap-edge); stroke-width: 1.4; }\n.a5-art-tube { fill: var(--a5-art-tube); stroke: var(--a5-cap-edge); stroke-width: 1.4; }\n.a5-cap-edge { fill: none; stroke: var(--a5-cap-edge); stroke-width: 17; stroke-linecap: round; }\n.a5-cap { fill: none; stroke: var(--a5-plasma); stroke-width: 14; stroke-linecap: round; }\n.a5-cell { stroke: rgba(0, 0, 0, 0.28); stroke-width: 0.6; }\n.a5-o2 { fill: var(--a5-o2); }\n.a5-co2 { fill: var(--a5-co2); opacity: 0.85; }\n.a5-co2-b { opacity: 0.5; }\n.a5-co2-c { opacity: 0.22; }\n.a5-specular { pointer-events: none; }\n.a5-track { fill: none; stroke: var(--a5-track); stroke-width: 1.8; stroke-dasharray: 3 2.4; }\n.a5-plot-bg { fill: var(--a5-plot-bg); }\n.a5-plot-title { fill: var(--a5-plot-ink); font: 600 21px/1 var(--opt-ui); letter-spacing: 0.01em; }\n.a5-tick { fill: var(--a5-plot-ink); font: 500 18px/1 var(--opt-ui); font-variant-numeric: tabular-nums; opacity: 0.8; }\n.a5-grid { fill: none; stroke: var(--a5-plot-dim); stroke-width: 1; stroke-dasharray: 3 4; }\n.a5-axis { fill: none; stroke: var(--a5-plot-ink); stroke-width: 1; opacity: 0.5; }\n.a5-spare { fill: var(--a5-spare); }\n.a5-spare-txt { fill: var(--a5-spare-ink); font: 600 17px/1 var(--opt-ui); transition: opacity 0.3s; }\n.a5-curve { fill: none; stroke: var(--a5-curve); stroke-width: 2.6; stroke-linejoin: round; stroke-linecap: round; }\n.a5-curve-ghost { fill: none; stroke: var(--a5-curve); stroke-width: 1.4; stroke-dasharray: 3 4; opacity: 0.45; }\n.a5-exit { fill: none; stroke: var(--a5-plot-ink); stroke-width: 1.2; stroke-dasharray: 2 3; }\n.a5-exit-cell { fill: var(--a5-cell-art); stroke: var(--a5-plot-ink); stroke-width: 1; }\n.a5-start { fill: var(--a5-cell-ven); stroke: var(--a5-plot-ink); stroke-width: 1; }\n.a5-dot { fill: var(--a5-dot); stroke: var(--a5-plot-bg); stroke-width: 2; }\n.a5-row { display: flex; align-items: center; gap: 12px; margin: 10px 4px 0; }\n.a5-scene { flex: 1; margin: 0; font: 500 14px/1.4 var(--opt-ui); color: var(--anatomy-text); min-height: 4.2em; }\n.a5-slow { appearance: none; border: 0; min-height: 44px; min-width: 64px; padding: 0 14px; border-radius: 999px; background: transparent; box-shadow: inset 0 0 0 1px var(--opt-rule); color: var(--anatomy-text); font: 500 14px/1 var(--opt-ui); cursor: pointer; touch-action: manipulation; white-space: nowrap; }\n.a5-slow[aria-pressed=\"true\"] { background: var(--opt-btn-on); color: var(--opt-btn-on-text); box-shadow: none; }\n.a5-slow:focus-visible { outline: 2px solid var(--opt-fig); outline-offset: 2px; }\n.a5-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }\n.a5-par { display: block; margin-top: 6px; }\n.a5-par:first-child { margin-top: 0; }\n.a5-par small { font-size: 12.5px; color: var(--anatomy-muted); }\n/* A5 · the lung block: a foam of air sacs cut on three faces, one sac opened on the front. */\n.iso.optimal {\n  --b5-tissue: #8a4f49; --b5-c0: #4a2a2b; --b5-c1: #351d1f; --b5-c2: #231214; --b5-sh0: #3b2022;\n  --b5-b0: #1f1012; --b5-b1: #3a1f21; --b5-b2: #5a3433; --b5-rim: #e0a091; --b5-edge: #c88a7d;\n  --b5-cap-a: #e2402f; --b5-cap-v: #7a62a8; --b5-sheath: #9c5d55; --b5-knob: #b46e63;\n  --b5-top-light: rgba(255, 230, 220, 0.05); --b5-end-shade: rgba(0, 0, 0, 0.22); --b5-shadow: rgba(0, 0, 0, 0.38);\n}\n.iso.optimal[data-theme=\"light\"] {\n  --b5-tissue: #e7b2a4; --b5-c0: #fffaf7; --b5-c1: #fbebe4; --b5-c2: #f1d2c7; --b5-sh0: #e9c3b7;\n  --b5-b0: #e0ae9f; --b5-b1: #f6dcd2; --b5-b2: #fff7f3; --b5-rim: #9a5245; --b5-edge: #9a5245;\n  --b5-cap-a: #d4382a; --b5-cap-v: #6f62b0; --b5-sheath: #dfa293; --b5-knob: #c27a6b;\n  --b5-top-light: rgba(255, 255, 255, 0.16); --b5-end-shade: rgba(90, 40, 30, 0.12); --b5-shadow: rgba(80, 40, 30, 0.18);\n}\n.b5-tissue { fill: var(--b5-tissue); }\n.b5-air { stroke: var(--b5-rim); stroke-width: 0.8; stroke-opacity: 0.55; }\n.b5-c0 { stop-color: var(--b5-c0); } .b5-c1 { stop-color: var(--b5-c1); } .b5-c2 { stop-color: var(--b5-c2); }\n.b5-b0 { stop-color: var(--b5-b0); } .b5-b1 { stop-color: var(--b5-b1); } .b5-b2 { stop-color: var(--b5-b2); }\n.b5-sh0 { stop-color: var(--b5-sh0); }\n.b5-cap-a { fill: var(--b5-cap-a); opacity: 0.85; }\n.b5-cap-v { fill: var(--b5-cap-v); opacity: 0.7; }\n.b5-bowl-shade { fill: none; stroke: #000; stroke-opacity: 0.22; stroke-width: 16; filter: blur(4px); }\n.b5-pore { fill: var(--b5-c2); stroke: var(--b5-rim); stroke-width: 0.6; stroke-opacity: 0.6; }\n.b5-rim { fill: none; stroke: var(--b5-rim); stroke-width: 1.2; opacity: 0.8; }\n.b5-rim-nuc ellipse { fill: var(--b5-knob); }\n.b5-duct { stroke: none; }\n.b5-duct-wall { fill: none; stroke: var(--b5-rim); stroke-width: 1; opacity: 0.7; }\n.b5-knob, .b5-knob ellipse { fill: var(--b5-knob); }\n.b5-shaft { stroke: var(--b5-rim); stroke-width: 0.8; stroke-opacity: 0.7; }\n.b5-sheath { fill: var(--b5-sheath); stroke: var(--b5-rim); stroke-width: 0.6; stroke-opacity: 0.5; }\n.b5-top-light { fill: var(--b5-top-light); pointer-events: none; }\n.b5-end-shade { fill: var(--b5-end-shade); pointer-events: none; }\n.b5-edge { fill: none; stroke: var(--b5-edge); stroke-width: 1.1; stroke-linejoin: round; }\n.b5-shadow { fill: var(--b5-shadow); filter: blur(7px); }\n.b5-front .a5-cap-edge { stroke-width: 16; }\n.b5-front .a5-cap { stroke-width: 13; }\n.b5-bowl-net.a5-net-edge { stroke-width: 5.4; opacity: 0.35; }\n.b5-bowl-net.a5-net { stroke-width: 3.5; opacity: 0.8; }\n" + "</style><div class=\"iso optimal opt-host\" data-theme=\"" + theme + "\">" + "<figure class=\"iso-figure opt-figure \"><div class=\"iso-plate opt-plate\"><div class=\"iso-plate-corners\" aria-hidden=\"true\"><span class=\"iso-plate-corner\" data-corner=\"fig\">A5</span><span class=\"iso-plate-corner\" data-corner=\"title\">The air sac and the red cell</span></div><div class=\"iso-stage a5-stage\"><svg class=\"iso-svg a5-svg\" viewBox=\"0 0 600 720\" role=\"img\" aria-label=\"A block of lung tissue, cut open. The lung is a foam of tiny air sacs with thin walls full of capillaries. The front of the block cuts one air sac in half, so we look into its bowl, lined with a net of capillaries, with a small airway rising from its mouth to the top of the block. One capillary runs in the sac's wall across the front, carrying red cells in single file from a small artery on the left to a small vein on the right. Oxygen from the air inside the sac crosses into each cell, which turns from blue to red within the first part of its trip; carbon dioxide leaves the other way. A monitor underneath plots the oxygen in one traced cell against its time in the capillary, and marks when it leaves.\">\n<defs>\n  <radialGradient id=\"b5-cav\" cx=\"58%\" cy=\"66%\" r=\"72%\"><stop offset=\"0\" class=\"b5-c0\"/><stop offset=\"0.62\" class=\"b5-c1\"/><stop offset=\"1\" class=\"b5-c2\"/></radialGradient>\n  <linearGradient id=\"b5-bowl\" x1=\"0\" y1=\"0\" x2=\"0.25\" y2=\"1\"><stop offset=\"0\" class=\"b5-b0\"/><stop offset=\"0.55\" class=\"b5-b1\"/><stop offset=\"1\" class=\"b5-b2\"/></linearGradient>\n  <linearGradient id=\"b5-trough\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\"><stop offset=\"0\" class=\"b5-c2\"/><stop offset=\"0.5\" class=\"b5-c0\"/><stop offset=\"1\" class=\"b5-c2\"/></linearGradient>\n  <radialGradient id=\"b5-shaft\" cx=\"50%\" cy=\"100%\" r=\"100%\"><stop offset=\"0\" class=\"b5-sh0\"/><stop offset=\"1\" class=\"b5-c2\"/></radialGradient>\n  <linearGradient id=\"a5-net\" gradientUnits=\"userSpaceOnUse\" x1=\"161.3\" y1=\"0\" x2=\"354.1\" y2=\"0\"><stop offset=\"0\" class=\"a5-ven-stop\"/><stop data-part=\"netA\" offset=\"0.3\" class=\"a5-ven-stop\"/><stop data-part=\"netB\" offset=\"0.42\" class=\"a5-art-stop\"/><stop offset=\"1\" class=\"a5-art-stop\"/></linearGradient>\n  <clipPath id=\"b5-opening\"><path d=\"M353.2 319.5L353.0 326.0L352.4 332.3L351.4 338.4L349.9 344.4L348.1 350.2L345.9 355.8L343.3 361.1L340.4 366.2L337.1 371.0L333.5 375.4L329.5 379.6L325.2 383.4L320.7 386.8L315.8 389.9L310.7 392.5L305.4 394.8L299.9 396.7L294.2 398.1L288.4 399.1L282.4 399.7L276.3 399.9L270.1 399.6L263.9 398.9L257.7 397.7L251.4 396.2L245.2 394.2L239.0 391.8L232.9 389.0L227.0 385.8L221.1 382.3L215.4 378.4L209.9 374.2L204.6 369.6L199.5 364.7L194.7 359.6L190.1 354.2L185.8 348.5L181.9 342.7L178.2 336.6L174.9 330.4L172.0 324.1L169.4 317.6L167.2 311.1L165.4 304.5L164.0 297.9L163.0 291.3L162.3 284.7L162.1 278.2L162.3 271.8L163.0 265.5L164.0 259.3L165.4 253.3L167.2 247.6L169.4 242.0L172.0 236.6L174.9 231.6L178.2 226.8L181.9 222.3L185.8 218.2L190.1 214.4L194.7 211.0L199.5 207.9L204.6 205.2L209.9 203.0L215.4 201.1L221.1 199.7L227.0 198.7L232.9 198.1L239.0 197.9L245.2 198.2L251.4 198.9L257.7 200.0L263.9 201.6L270.1 203.6L276.3 206.0L282.4 208.8L288.4 211.9L294.2 215.5L299.9 219.4L305.4 223.6L310.7 228.2L315.8 233.0L320.7 238.2L325.2 243.6L329.5 249.3L333.5 255.1L337.1 261.2L340.4 267.4L343.3 273.7L345.9 280.2L348.1 286.7L349.9 293.3L351.4 299.9L352.4 306.5L353.0 313.0Z\"/></clipPath>\n</defs>\n<path class=\"b5-shadow\" d=\"M90.4 321.5L603.4 432.4L508.4 505.1L-4.6 394.2Z\"/>\n<g data-part=\"sac\">\n<g transform=\"matrix(0.8845 0.1913 -0.4703 0.3598 76.97 10.17)\">\n<mask id=\"b5-topmask\" maskUnits=\"userSpaceOnUse\" x=\"18\" y=\"-2\" width=\"564\" height=\"184\"><rect x=\"18\" y=\"-2\" width=\"564\" height=\"184\" fill=\"#fff\"/><circle cx=\"300\" cy=\"180\" r=\"42\" fill=\"#000\"/></mask>\n<rect class=\"b5-tissue\" x=\"20\" y=\"0\" width=\"560\" height=\"180\"/>\n<g mask=\"url(#b5-topmask)\"><path class=\"b5-air\" d=\"M467.1 46.4Q469.9 48.1 470.7 51.3L475.0 68.5Q477.4 78.2 472.4 86.9L458.9 110.6Q454.0 119.3 444.8 115.4L402.0 96.9Q392.8 92.9 393.5 82.9L395.5 53.0Q395.7 50.7 396.1 48.6L396.3 47.7Q396.8 45.5 399.0 45.5L459.9 44.1Q463.2 44.1 466.0 45.8ZM190.1 4.5Q199.0 0.0 209.0 0.0L246.2 0.0Q256.2 0.0 258.7 9.7L265.3 35.6Q267.8 45.3 260.6 52.1L234.0 77.4Q227.9 83.1 220.4 86.8L212.2 90.6Q209.9 91.7 207.4 91.3L206.5 91.1Q204.0 90.6 202.3 88.8L154.8 35.9Q151.9 32.6 153.0 28.3L153.5 26.6Q154.6 22.3 158.6 20.3ZM232.0 173.7Q222.3 176.1 212.9 172.6L165.3 155.0Q155.9 151.5 162.8 144.3L204.3 100.8Q204.4 100.7 204.4 100.8L204.4 100.8Q204.5 100.8 204.5 100.8L241.9 161.6Q247.2 170.1 237.5 172.4ZM540.4 3.2Q530.9 0.0 540.9 0.0L574.5 0.0Q580.0 0.0 580.0 5.5L580.0 11.4Q580.0 13.2 578.6 14.2L578.0 14.6Q576.6 15.7 574.9 15.1ZM354.3 5.6Q350.3 0.0 357.2 0.0L385.7 0.0Q395.5 0.0 390.0 8.1L388.0 11.2Q382.5 19.3 373.0 16.8L366.3 15.1Q359.7 13.3 355.8 7.7ZM579.7 158.6Q580.0 158.9 580.0 159.3L580.0 171.1Q580.0 180.0 571.1 180.0L553.1 180.0Q543.1 180.0 551.7 174.8L579.0 158.3Q579.4 158.1 579.6 158.4ZM262.0 80.5Q253.0 76.1 260.3 69.2L271.0 59.0Q273.9 56.3 277.1 58.7L278.3 59.6Q281.5 62.0 282.6 65.8L288.2 85.5Q291.0 95.1 282.0 90.6ZM49.6 10.0Q48.8 0.0 58.8 0.0L132.6 0.0Q141.0 0.0 143.0 8.2L144.6 14.8Q145.8 19.5 144.5 24.1L144.0 25.9Q142.8 30.6 138.5 32.8L97.0 55.0Q88.2 59.7 79.1 55.4L65.3 49.0Q58.4 45.8 55.4 38.9L54.2 36.2Q51.2 29.3 50.6 21.8ZM20.0 4.8Q20.0 0.0 24.8 0.0L28.8 0.0Q31.4 0.0 33.9 0.8L34.9 1.1Q37.4 1.8 37.6 4.4L38.0 9.4Q38.5 14.8 33.0 14.6L25.9 14.3Q20.0 14.1 20.0 8.2ZM94.3 170.8Q90.5 180.0 80.5 180.0L35.5 180.0Q35.0 180.0 35.1 179.5L35.1 179.3Q35.2 178.8 35.6 178.6L99.7 150.4Q100.6 150.0 101.3 150.7L101.6 151.0Q102.3 151.7 101.9 152.6ZM570.2 102.0Q580.0 104.0 580.0 114.0L580.0 133.1Q580.0 138.0 578.5 142.6L578.0 144.3Q576.5 149.0 572.3 151.5L533.6 174.8Q525.1 180.0 515.1 180.0L488.2 180.0Q486.8 180.0 485.5 179.4L485.0 179.1Q483.8 178.5 482.8 177.5L471.6 165.5Q464.7 158.2 463.4 148.3L461.8 137.3Q460.5 127.4 465.4 118.7L479.9 93.3Q484.8 84.6 494.6 86.6ZM136.9 44.3Q145.8 39.6 152.4 47.0L188.4 87.1Q195.1 94.5 188.2 101.8L136.8 155.7Q136.1 156.4 135.3 156.8L135.0 156.9Q134.2 157.3 133.4 157.0L120.7 152.5Q115.1 150.5 110.9 146.4L109.4 144.9Q105.2 140.8 104.2 135.0L94.9 77.4Q93.3 67.5 102.2 62.8ZM447.1 178.7Q445.4 180.0 443.2 180.0L434.2 180.0Q426.1 180.0 418.0 179.1L331.1 169.3Q321.2 168.2 324.9 158.9L332.3 140.6Q336.0 131.3 344.3 125.7L358.4 116.2Q365.8 111.2 373.7 107.2L376.7 105.7Q384.6 101.7 392.7 105.2L442.3 126.6Q451.5 130.6 452.9 140.5L454.3 150.9Q455.4 158.8 452.9 166.4L450.1 174.9Q449.5 176.9 447.7 178.2ZM513.2 12.8Q521.6 7.5 531.1 10.7L563.7 21.9Q573.2 25.2 574.0 35.1L578.1 84.0Q579.0 93.9 569.2 91.9L495.9 77.0Q486.1 75.0 483.7 65.3L481.4 56.0Q479.0 46.3 484.9 38.2L489.1 32.5Q494.9 24.4 503.4 19.0ZM450.7 2.7Q448.0 0.0 451.8 0.0L505.2 0.0Q514.9 0.0 506.7 5.2L503.6 7.2Q495.4 12.4 485.7 11.0L458.3 7.0Q454.5 6.5 451.8 3.8ZM385.5 35.5Q388.2 40.5 385.1 45.1L342.3 110.8Q337.7 118.0 330.6 122.7L323.2 127.7Q320.9 129.3 318.3 130.0L317.2 130.3Q314.6 131.1 313.4 128.6L309.8 121.4Q306.4 114.4 304.2 106.9L293.8 70.7Q291.1 61.1 299.7 56.0L348.9 27.3Q357.5 22.3 367.2 24.8L376.5 27.3Q381.9 28.7 384.5 33.6ZM268.5 9.7Q266.0 0.0 276.0 0.0L326.6 0.0Q334.0 0.0 338.2 6.0L339.8 8.3Q344.0 14.3 337.7 18.0L288.3 46.9Q284.8 48.9 281.6 46.5L280.3 45.6Q277.1 43.2 276.1 39.3ZM42.0 39.3Q45.5 39.4 46.9 42.7L47.5 43.9Q48.9 47.2 45.9 49.1L28.4 60.2Q20.0 65.6 20.0 55.6L20.0 48.4Q20.0 38.4 30.0 38.8ZM298.9 168.4Q297.9 173.4 292.9 173.8L290.9 173.9Q285.9 174.3 280.9 173.2L273.4 171.4Q264.3 169.3 259.5 161.4L226.8 108.5Q221.6 100.0 230.5 104.4L295.2 136.8Q304.2 141.3 302.3 151.1ZM406.8 7.6Q411.9 0.0 421.0 0.0L427.6 0.0Q433.6 0.0 437.9 4.3L439.5 5.9Q443.8 10.2 444.8 16.1L445.7 21.3Q447.1 29.4 438.9 29.6L398.2 30.5Q396.3 30.6 395.4 28.9L395.0 28.2Q394.1 26.5 395.2 24.9ZM94.0 129.5Q95.6 139.4 86.4 143.4L27.5 169.4Q25.3 170.4 23.0 169.4L22.2 169.0Q20.0 167.9 20.0 165.5L20.0 87.8Q20.0 77.8 28.4 72.4L47.3 60.4Q55.7 55.0 64.8 59.3L75.0 64.0Q84.1 68.2 85.7 78.1Z\" fill=\"url(#b5-cav)\"/></g>\n<path class=\"b5-cap-a\" d=\"M473.8 55.7a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M463.8 105.7a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M441.1 120.0a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M422.5 112.1a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M385.9 83.6a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M387.0 63.7a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M402.8 40.7a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M442.9 39.8a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M259.9 7.6a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M264.7 26.9a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M246.9 68.6a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M232.8 82.3a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M218.8 91.2a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M178.4 72.1a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M164.8 57.2a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M151.8 42.4a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M175.3 5.2a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M190.6 170.3a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M171.6 163.4a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M169.7 127.4a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M183.2 112.9a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M210.3 106.0a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M231.4 140.1a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M241.6 157.1a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M563.4 17.1a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M391.2 10.0a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M369.9 21.5a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M347.8 8.6a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M562.7 161.1a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M285.4 69.4a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M278.2 95.2a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M144.4 7.6a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M134.2 38.9a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M116.3 48.3a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M75.1 60.0a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M47.4 39.4a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M43.1 20.7a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M38.9 171.0a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M56.9 162.9a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M75.0 154.9a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M455.9 149.9a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M458.2 117.3a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M491.6 81.9a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M530.9 89.9a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M550.3 93.9a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M570.2 97.9a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M96.0 132.6a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M93.2 112.9a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M89.7 93.1a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M337.9 122.5a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M354.3 111.3a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M368.9 103.1a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M528.9 6.0a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M477.6 36.3a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M496.9 15.7a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M463.0 12.8a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M384.4 50.5a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M373.3 67.3a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M303.7 125.1a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M296.4 107.0a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M291.3 87.8a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M310.6 42.5a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M328.2 32.4a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M345.3 22.3a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M26.2 34.1a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M252.5 164.0a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M228.9 99.9a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M264.8 117.8a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M282.4 126.7a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M446.7 18.3a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M22.1 69.1a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M63.1 54.7a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M87.1 76.4a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0\"/><path class=\"b5-cap-v\" d=\"M474.0 88.3a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M404.5 104.1a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M422.6 40.3a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M261.6 54.8a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M191.4 87.0a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M157.7 14.2a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M156.1 141.8a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M220.5 123.0a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M544.9 10.6a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M545.2 171.4a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M260.1 86.2a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M99.0 57.7a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M26.3 19.1a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M100.3 161.8a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M511.0 85.9a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M121.2 158.6a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M325.0 139.6a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M453.9 168.8a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M483.0 15.7a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M362.1 84.0a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M293.6 52.6a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M41.1 55.9a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M246.5 108.8a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M86.4 147.3a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0\"/>\n<path class=\"b5-shaft\" d=\"M270 180A30 30 0 0 1 330 180Z\" fill=\"url(#b5-shaft)\"/>\n<g class=\"b5-knob\"><ellipse cx=\"267.6\" cy=\"168.2\" rx=\"3.4\" ry=\"2.4\" transform=\"rotate(290.0 267.6 168.2)\"/><ellipse cx=\"274.8\" cy=\"156.5\" rx=\"3.4\" ry=\"2.4\" transform=\"rotate(313.0 274.8 156.5)\"/><ellipse cx=\"286.0\" cy=\"148.5\" rx=\"3.4\" ry=\"2.4\" transform=\"rotate(336.0 286.0 148.5)\"/><ellipse cx=\"299.4\" cy=\"145.5\" rx=\"3.4\" ry=\"2.4\" transform=\"rotate(359.0 299.4 145.5)\"/><ellipse cx=\"312.9\" cy=\"148.0\" rx=\"3.4\" ry=\"2.4\" transform=\"rotate(382.0 312.9 148.0)\"/><ellipse cx=\"324.4\" cy=\"155.6\" rx=\"3.4\" ry=\"2.4\" transform=\"rotate(405.0 324.4 155.6)\"/><ellipse cx=\"332.0\" cy=\"167.1\" rx=\"3.4\" ry=\"2.4\" transform=\"rotate(428.0 332.0 167.1)\"/></g>\n<rect class=\"b5-top-light\" x=\"20\" y=\"0\" width=\"560\" height=\"180\"/>\n</g>\n<g transform=\"matrix(0.4703 -0.3598 0.0000 0.9152 505.34 149.28)\">\n<mask id=\"b5-endmask\" maskUnits=\"userSpaceOnUse\" x=\"-2\" y=\"38\" width=\"184\" height=\"344\"><rect x=\"-2\" y=\"38\" width=\"184\" height=\"344\" fill=\"#fff\"/><circle cx=\"0\" cy=\"153.6\" r=\"26.0\" fill=\"#000\"/></mask>\n<rect class=\"b5-tissue\" x=\"0\" y=\"40\" width=\"180\" height=\"340\"/>\n<g mask=\"url(#b5-endmask)\"><path class=\"b5-air\" d=\"M160.4 259.6Q168.5 260.8 167.9 269.1L166.9 284.2Q166.5 289.4 161.5 290.5L159.6 291.0Q154.6 292.1 153.8 287.0L150.4 266.1Q149.1 257.9 157.2 259.2ZM52.2 84.8Q61.7 87.9 64.8 97.4L82.4 150.2Q85.5 159.7 80.5 168.4L64.8 195.8Q59.8 204.5 50.0 206.5L32.9 209.9Q23.1 211.9 14.4 206.9L8.7 203.6Q0.0 198.6 0.0 188.6L0.0 97.6Q0.0 87.6 8.7 82.7L20.6 76.1Q21.7 75.5 22.8 75.7L23.3 75.8Q24.5 76.0 25.6 76.4ZM138.0 61.7Q147.7 62.0 152.6 70.4L154.4 73.6Q159.3 81.9 155.7 90.9L127.8 160.5Q127.4 161.6 126.4 162.3L126.0 162.5Q125.1 163.2 123.9 162.9L104.0 158.6Q94.2 156.5 91.1 147.0L71.9 89.2Q70.2 84.1 72.8 79.3L73.8 77.5Q76.3 72.8 80.0 68.8L83.3 65.4Q88.4 60.0 95.8 60.2ZM164.1 44.8Q166.8 40.0 172.4 40.0L174.5 40.0Q180.0 40.0 180.0 45.5L180.0 84.9Q180.0 89.5 176.4 86.7L175.0 85.6Q171.3 82.8 169.0 78.9L161.0 65.1Q156.7 57.7 160.9 50.3ZM0.0 48.9Q0.0 40.0 8.9 40.0L20.3 40.0Q21.1 40.0 21.5 40.7L21.6 41.0Q22.0 41.7 21.8 42.5L17.4 66.7Q17.4 66.9 17.3 67.0L17.3 67.1Q17.2 67.2 17.1 67.3L7.2 72.8Q0.0 76.8 0.0 68.5ZM54.2 320.3Q57.0 327.2 53.8 333.8L52.6 336.4Q49.5 343.0 42.5 345.4L9.5 356.3Q0.0 359.4 0.0 349.4L0.0 276.6Q0.0 266.6 8.7 261.7L23.2 253.6Q24.4 253.0 25.5 253.6L26.0 253.9Q27.1 254.5 27.6 255.8ZM119.3 372.4Q112.8 380.0 102.8 380.0L85.5 380.0Q75.5 380.0 71.1 371.0L61.4 351.4Q58.7 345.9 61.3 340.3L62.3 338.2Q64.9 332.7 71.0 332.2L135.3 326.4Q141.6 325.9 143.9 331.8L144.7 334.0Q147.0 339.9 142.9 344.7ZM37.6 44.0Q42.0 40.0 48.1 40.0L73.2 40.0Q76.0 40.0 76.9 42.7L77.2 43.7Q78.1 46.4 75.3 46.6L31.5 50.0Q31.3 50.0 31.4 49.8L31.4 49.8Q31.4 49.6 31.6 49.4ZM58.2 371.0Q62.6 380.0 52.6 380.0L4.3 380.0Q0.0 380.0 0.0 375.7L0.0 374.0Q0.0 369.7 4.1 368.4L40.0 356.5Q49.5 353.4 53.9 362.3ZM113.8 206.5Q112.3 216.4 102.4 214.6L79.1 210.4Q69.2 208.6 74.2 199.9L88.4 175.2Q93.4 166.5 103.2 168.6L109.5 170.0Q119.2 172.1 117.7 182.0ZM177.0 99.2Q180.0 101.5 180.0 105.4L180.0 132.6Q180.0 142.6 170.4 145.5L160.1 148.6Q150.5 151.5 154.2 142.2L171.3 99.5Q172.7 96.0 175.8 98.3ZM179.9 372.2Q180.0 373.3 180.0 374.4L180.0 377.2Q180.0 380.0 177.2 380.0L143.2 380.0Q133.2 380.0 139.7 372.4L149.0 361.5Q155.5 353.9 163.7 359.6L178.9 370.1Q179.8 370.7 179.9 371.8ZM178.0 311.4Q180.0 313.3 180.0 316.0L180.0 343.6Q180.0 353.6 171.8 347.9L161.9 341.1Q156.1 337.1 153.6 330.5L151.3 324.6Q150.1 321.4 151.5 318.2L152.0 317.0Q153.4 313.9 156.7 313.1L172.5 309.5Q175.2 308.8 177.2 310.7ZM6.9 250.1Q0.0 254.0 0.0 246.0L0.0 217.4Q0.0 210.5 6.0 213.9L8.3 215.3Q14.4 218.8 14.9 225.7L15.8 236.9Q16.5 244.8 9.6 248.6ZM36.4 232.3Q31.7 236.6 31.2 230.2L31.0 227.8Q30.5 221.4 36.8 220.3L43.2 219.2Q52.3 217.5 45.5 223.9ZM131.6 245.8Q138.3 253.2 139.9 263.0L145.1 295.3Q146.1 301.2 143.7 306.8L142.7 308.9Q140.3 314.4 134.3 315.0L75.0 320.3Q65.1 321.2 61.2 311.9L41.7 264.4Q37.9 255.1 45.2 248.3L66.6 228.5Q73.9 221.7 83.8 223.5L106.7 227.6Q116.5 229.4 123.3 236.8ZM170.4 156.0Q180.0 153.1 180.0 163.1L180.0 245.8Q180.0 248.0 178.2 249.1L177.5 249.5Q175.7 250.7 173.7 250.3L154.2 247.5Q144.4 246.0 137.6 238.6L130.3 230.7Q123.5 223.3 125.1 213.4L131.3 173.9Q131.9 170.3 134.8 168.3L136.0 167.5Q139.0 165.4 142.4 164.4Z\" fill=\"url(#b5-cav)\"/></g>\n<path class=\"b5-cap-a\" d=\"M169.8 270.1a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M155.5 254.7a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M66.1 95.0a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M72.1 113.9a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M84.8 151.9a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M81.8 169.8a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M72.2 187.1a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M29.6 214.7a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M10.0 211.4a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M2.4 79.2a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M50.4 80.4a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M153.5 67.5a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M157.3 92.0a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M142.5 129.1a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M134.8 147.7a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M112.6 165.8a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M94.4 55.7a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M114.7 56.4a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M134.5 57.1a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M22.0 51.4a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M54.1 337.3a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M39.5 350.2a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M2.9 258.2a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M31.8 261.1a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M39.2 279.6a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M54.6 316.6a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M64.7 374.0a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M55.6 356.0a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M90.6 325.6a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M110.3 323.8a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M130.5 322.0a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M141.5 349.7a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M128.9 364.9a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M66.4 51.7a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M4.2 362.5a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M99.4 219.3a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M80.1 215.7a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M116.6 201.5a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M169.8 149.6a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M162.3 355.2a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M16.6 227.3a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M46.2 227.0a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M141.3 261.3a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M123.2 232.9a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M131.8 242.5a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M143.6 158.4a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0\"/><path class=\"b5-cap-v\" d=\"M145.7 284.0a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M78.8 132.9a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M48.8 210.8a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M31.6 74.4a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M149.6 110.6a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M76.2 63.1a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M154.5 47.6a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M20.3 356.5a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M47.2 298.1a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M70.3 327.3a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M146.2 332.6a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M46.8 53.2a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M119.3 181.7a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M158.3 307.4a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M38.2 245.6a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0\"/>\n<path class=\"a5-art-tube\" d=\"M0 141.6A12.0 12.0 0 0 1 0 165.6Z\"/>\n<path class=\"b5-cap-a\" d=\"M1.2 150.6a3.3 3.3 0 1 0 6.6 0a3.3 3.3 0 1 0 -6.6 0M4.0 158.6a3 3 0 1 0 6 0a3 3 0 1 0 -6 0\"/>\n<rect class=\"b5-end-shade\" x=\"0\" y=\"40\" width=\"180\" height=\"340\"/>\n</g>\n<g clip-path=\"url(#b5-opening)\">\n<path class=\"b5-bowl\" d=\"M353.2 319.5L353.0 326.0L352.4 332.3L351.4 338.4L349.9 344.4L348.1 350.2L345.9 355.8L343.3 361.1L340.4 366.2L337.1 371.0L333.5 375.4L329.5 379.6L325.2 383.4L320.7 386.8L315.8 389.9L310.7 392.5L305.4 394.8L299.9 396.7L294.2 398.1L288.4 399.1L282.4 399.7L276.3 399.9L270.1 399.6L263.9 398.9L257.7 397.7L251.4 396.2L245.2 394.2L239.0 391.8L232.9 389.0L227.0 385.8L221.1 382.3L215.4 378.4L209.9 374.2L204.6 369.6L199.5 364.7L194.7 359.6L190.1 354.2L185.8 348.5L181.9 342.7L178.2 336.6L174.9 330.4L172.0 324.1L169.4 317.6L167.2 311.1L165.4 304.5L164.0 297.9L163.0 291.3L162.3 284.7L162.1 278.2L162.3 271.8L163.0 265.5L164.0 259.3L165.4 253.3L167.2 247.6L169.4 242.0L172.0 236.6L174.9 231.6L178.2 226.8L181.9 222.3L185.8 218.2L190.1 214.4L194.7 211.0L199.5 207.9L204.6 205.2L209.9 203.0L215.4 201.1L221.1 199.7L227.0 198.7L232.9 198.1L239.0 197.9L245.2 198.2L251.4 198.9L257.7 200.0L263.9 201.6L270.1 203.6L276.3 206.0L282.4 208.8L288.4 211.9L294.2 215.5L299.9 219.4L305.4 223.6L310.7 228.2L315.8 233.0L320.7 238.2L325.2 243.6L329.5 249.3L333.5 255.1L337.1 261.2L340.4 267.4L343.3 273.7L345.9 280.2L348.1 286.7L349.9 293.3L351.4 299.9L352.4 306.5L353.0 313.0Z\" fill=\"url(#b5-bowl)\"/>\n<path class=\"a5-pave\" d=\"M305.7 216.8C303.1 215.1 300.0 211.6 299.7 210.3C299.4 208.9 301.6 207.5 303.7 207.8C305.9 208.0 311.7 210.3 314.1 211.9C316.4 213.6 318.9 217.4 319.4 218.9C319.8 220.4 318.9 222.4 316.8 222.1C314.8 221.8 308.3 218.6 305.7 216.8ZM308.5 204.3C306.0 203.2 297.8 199.6 294.9 198.1C292.0 196.7 288.8 194.7 289.1 194.6C289.5 194.5 294.1 196.1 297.3 197.4C300.5 198.8 308.3 202.4 310.5 203.5C312.7 204.6 312.1 204.9 311.8 205.0C311.5 205.1 311.0 205.3 308.5 204.3ZM280.3 192.9C279.2 192.4 271.1 191.0 267.8 190.6C264.4 190.2 259.6 189.9 258.0 190.1C256.4 190.3 256.0 191.3 257.4 191.8C258.8 192.3 264.6 193.2 267.2 193.5C269.9 193.9 273.3 194.1 275.3 194.0C277.3 193.9 281.4 193.4 280.3 192.9ZM236.2 193.2C236.8 192.7 234.1 192.6 232.2 193.0C230.2 193.4 225.9 194.7 223.1 195.7C220.3 196.6 214.3 198.7 213.5 199.2C212.8 199.7 215.7 199.6 217.9 199.2C220.2 198.7 225.8 197.2 228.6 196.3C231.3 195.4 235.7 193.7 236.2 193.2ZM313.0 229.6C311.0 227.8 307.3 222.3 307.5 220.5C307.7 218.6 312.3 217.3 314.4 217.3C316.5 217.3 319.7 218.3 321.8 220.3C323.9 222.4 328.6 229.0 328.6 230.8C328.5 232.7 323.7 232.8 321.4 232.6C319.1 232.5 315.1 231.5 313.0 229.6ZM317.2 210.2C314.5 208.6 308.4 204.5 306.7 203.3C305.0 202.0 304.9 201.6 305.7 201.8C306.6 202.0 309.7 203.2 312.2 204.6C314.6 206.0 320.1 209.5 321.9 210.9C323.8 212.3 325.2 213.9 324.5 213.8C323.8 213.7 319.8 211.7 317.2 210.2ZM291.4 196.1C289.8 195.2 284.9 193.6 281.5 193.0C278.1 192.4 270.2 191.7 268.8 192.0C267.4 192.2 270.8 193.9 272.2 194.7C273.6 195.5 275.3 196.6 278.4 197.2C281.4 197.8 290.5 199.0 292.5 198.8C294.4 198.7 293.1 196.9 291.4 196.1ZM242.6 194.5C242.1 193.9 238.7 192.8 236.5 192.9C234.4 192.9 230.3 194.1 228.1 195.0C225.8 195.8 222.2 197.5 221.5 198.3C220.9 199.1 221.0 200.5 223.7 200.3C226.4 200.1 236.6 197.7 239.4 196.9C242.3 196.0 243.0 195.1 242.6 194.5ZM325.7 217.8C323.2 215.8 318.0 211.2 316.9 209.9C315.8 208.6 317.5 208.9 318.3 209.1C319.1 209.3 320.2 209.7 322.2 211.1C324.1 212.6 329.5 217.1 331.2 218.9C332.9 220.7 334.5 223.5 333.7 223.3C332.8 223.1 328.2 219.8 325.7 217.8ZM305.0 202.7C302.9 201.3 296.4 198.0 293.0 196.9C289.6 195.8 283.2 195.0 282.0 195.2C280.8 195.4 282.4 197.0 284.9 198.4C287.4 199.8 295.6 203.4 298.8 204.5C302.0 205.6 305.5 206.1 306.5 205.8C307.4 205.5 307.0 204.0 305.0 202.7ZM255.8 195.1C255.7 194.0 251.2 192.5 248.0 192.6C244.8 192.7 237.3 194.8 234.5 195.8C231.6 196.9 228.4 198.7 228.7 199.5C229.0 200.3 233.4 201.0 236.5 201.1C239.5 201.2 246.0 201.0 248.9 200.1C251.8 199.2 255.9 196.2 255.8 195.1ZM332.6 228.1C330.2 225.7 326.4 221.1 325.8 219.6C325.1 218.1 326.7 217.6 328.1 218.1C329.6 218.7 333.2 221.0 335.2 223.0C337.3 225.0 341.0 229.6 342.0 231.4C342.9 233.3 343.0 235.7 341.6 235.2C340.2 234.7 335.0 230.4 332.6 228.1ZM315.7 207.7C313.6 206.2 307.0 202.8 304.6 201.8C302.2 200.7 300.1 200.1 299.7 200.6C299.2 201.1 299.6 203.4 301.7 205.1C303.8 206.9 311.1 211.2 313.6 212.3C316.1 213.3 318.1 212.9 318.4 212.2C318.7 211.5 317.7 209.3 315.7 207.7ZM266.0 198.3C265.0 197.1 261.1 195.2 258.1 194.9C255.1 194.7 248.1 195.7 246.0 196.6C243.9 197.4 243.1 199.4 243.9 200.6C244.7 201.9 248.4 204.5 251.5 204.9C254.6 205.2 262.4 204.1 264.5 203.1C266.7 202.1 266.9 199.5 266.0 198.3ZM210.4 205.5C210.9 204.6 209.9 203.7 208.2 204.0C206.6 204.3 201.7 206.2 199.3 207.6C196.9 209.1 192.9 212.4 192.2 213.7C191.5 214.9 192.6 216.4 194.5 215.9C196.5 215.4 202.8 211.9 205.2 210.3C207.6 208.8 210.0 206.4 210.4 205.5ZM339.0 241.7C337.2 239.1 332.6 230.6 331.8 228.2C331.0 225.8 332.4 224.9 333.8 225.6C335.2 226.3 339.1 229.8 341.2 232.7C343.4 235.6 347.8 243.1 348.2 245.0C348.6 247.0 345.2 246.1 343.9 245.6C342.5 245.1 340.8 244.3 339.0 241.7ZM330.4 218.6C328.8 217.0 323.2 212.3 320.5 210.7C317.9 209.2 313.3 207.5 313.0 208.1C312.8 208.6 316.9 212.6 318.9 214.5C320.8 216.3 324.2 219.2 326.1 220.3C327.9 221.4 330.7 222.1 331.3 221.8C332.0 221.6 332.0 220.3 330.4 218.6ZM280.0 203.9C278.6 202.4 273.2 197.8 270.2 197.2C267.3 196.7 262.3 199.4 260.4 200.3C258.6 201.2 257.0 201.9 257.9 203.1C258.7 204.3 263.1 207.9 266.3 208.5C269.6 209.1 277.4 207.7 279.5 207.1C281.5 206.4 281.4 205.4 280.0 203.9ZM219.0 205.7C219.0 204.5 217.1 202.9 215.1 203.1C213.1 203.2 208.4 204.7 205.9 206.6C203.4 208.4 198.8 213.8 198.4 215.4C198.0 217.1 201.0 218.0 203.4 217.3C205.9 216.7 212.4 212.8 214.8 211.0C217.1 209.3 218.9 206.8 219.0 205.7ZM338.1 250.7C336.3 247.9 335.1 243.4 335.3 241.8C335.6 240.1 337.7 238.3 339.6 239.4C341.5 240.4 346.4 246.4 348.0 248.7C349.5 251.0 350.0 253.2 349.9 255.0C349.9 256.7 349.4 260.9 347.6 260.2C345.8 259.6 339.9 253.4 338.1 250.7ZM338.8 226.4C336.4 223.7 329.9 217.2 328.0 215.7C326.0 214.1 325.7 215.2 325.9 216.0C326.2 216.8 327.4 218.9 329.5 221.1C331.5 223.3 337.4 228.7 339.6 230.6C341.8 232.5 344.3 234.2 344.2 233.6C344.1 233.0 341.3 229.1 338.8 226.4ZM295.6 207.6C293.8 205.5 286.7 202.3 284.0 201.6C281.3 200.8 278.9 201.3 277.5 202.5C276.2 203.6 274.1 207.4 275.1 209.3C276.1 211.1 281.0 214.0 284.1 214.9C287.3 215.8 294.4 216.4 296.1 215.3C297.9 214.2 297.4 209.6 295.6 207.6ZM233.2 207.9C232.9 206.4 227.8 203.7 225.1 203.6C222.4 203.4 217.6 205.2 215.1 206.7C212.6 208.2 208.4 211.8 208.2 213.5C208.0 215.3 210.8 218.2 213.7 218.1C216.5 218.1 224.2 215.0 227.1 213.4C230.0 211.9 233.5 209.3 233.2 207.9ZM348.0 238.4C346.4 236.1 341.1 229.0 339.5 227.0C337.8 225.0 336.8 224.3 337.2 225.0C337.6 225.7 340.1 229.3 341.9 231.7C343.6 234.1 347.6 239.4 348.8 241.0C350.1 242.6 350.6 242.6 350.5 242.3C350.3 241.9 349.7 240.7 348.0 238.4ZM311.7 215.5C310.7 213.7 306.3 210.5 303.4 209.2C300.5 208.0 294.0 206.2 292.2 207.1C290.4 208.0 290.2 213.3 291.3 215.2C292.5 217.2 296.9 219.3 299.6 220.2C302.4 221.1 307.8 221.9 309.6 221.2C311.4 220.5 312.6 217.2 311.7 215.5ZM245.8 210.2C245.7 208.6 243.9 206.6 241.0 206.2C238.1 205.8 229.2 206.5 226.4 207.7C223.6 208.8 222.0 212.1 222.4 213.9C222.8 215.8 226.2 219.7 229.1 220.1C231.9 220.6 238.9 218.5 241.4 217.0C243.9 215.5 245.8 211.8 245.8 210.2ZM351.3 246.8C350.0 244.4 349.0 242.4 348.3 240.9C347.7 239.4 346.3 236.0 346.9 236.8C347.6 237.5 351.1 243.1 352.6 245.8C354.1 248.4 356.3 252.8 357.0 254.4C357.7 256.0 358.1 257.6 357.2 256.4C356.4 255.3 352.7 249.1 351.3 246.8ZM324.3 222.3C322.6 219.7 317.7 216.3 315.4 215.1C313.2 214.0 310.2 213.7 309.3 214.7C308.3 215.7 307.6 219.5 309.1 221.8C310.5 224.2 316.2 228.9 318.8 230.4C321.5 232.0 326.1 233.4 326.9 232.1C327.7 230.9 326.0 224.8 324.3 222.3ZM261.0 215.0C260.3 213.1 258.5 208.0 255.5 207.3C252.6 206.6 243.6 209.1 241.1 210.5C238.6 211.8 237.7 214.4 238.6 216.1C239.4 217.8 243.4 221.3 246.6 221.9C249.8 222.5 257.7 221.0 259.9 220.0C262.0 218.9 261.6 216.9 261.0 215.0ZM196.1 221.8C196.7 220.0 195.8 219.7 193.6 220.3C191.5 221.0 184.2 224.2 181.8 226.1C179.5 228.1 178.5 231.8 178.1 233.5C177.7 235.3 177.7 238.2 179.4 238.0C181.1 237.8 186.7 234.6 189.2 232.2C191.7 229.8 195.4 223.6 196.1 221.8ZM353.9 258.3C352.5 255.3 351.1 251.5 350.8 249.6C350.4 247.8 350.7 245.2 351.6 245.9C352.5 246.5 355.4 251.0 356.7 253.8C358.0 256.6 359.8 262.3 360.2 264.6C360.7 267.0 360.5 270.3 359.6 269.4C358.6 268.4 355.2 261.2 353.9 258.3ZM339.1 234.2C337.5 231.4 330.5 224.2 328.2 222.7C325.8 221.1 324.0 222.5 323.4 223.8C322.9 225.2 323.3 229.5 324.6 231.7C325.9 233.9 330.0 237.0 332.2 238.5C334.4 239.9 338.3 242.1 339.3 241.4C340.3 240.8 340.8 237.0 339.1 234.2ZM279.7 220.0C278.2 217.9 270.8 211.8 268.0 210.9C265.3 209.9 263.1 212.1 261.4 213.7C259.7 215.4 255.9 219.8 256.7 221.8C257.4 223.8 263.3 226.5 266.5 227.1C269.7 227.6 276.1 226.6 278.1 225.5C280.0 224.5 281.2 222.2 279.7 220.0ZM206.4 225.8C206.3 224.1 206.3 220.1 204.0 220.1C201.6 220.2 192.9 223.8 190.5 226.1C188.1 228.4 187.5 233.6 188.0 235.4C188.4 237.2 191.2 239.0 193.6 238.4C196.1 237.8 202.4 233.5 204.3 231.6C206.2 229.7 206.4 227.5 206.4 225.8ZM353.6 273.9C352.7 270.5 352.2 262.8 352.2 260.3C352.3 257.8 352.9 256.2 353.9 257.3C354.9 258.4 357.8 264.4 359.0 267.5C360.1 270.5 361.7 275.3 361.6 277.6C361.5 279.9 359.4 283.4 358.2 282.8C357.0 282.2 354.5 277.3 353.6 273.9ZM348.4 242.3C347.0 239.6 342.8 234.4 341.0 232.9C339.2 231.5 336.6 231.1 336.2 232.5C335.9 233.9 337.3 239.3 338.7 242.0C340.2 244.7 343.9 249.0 345.7 250.3C347.4 251.6 349.9 252.1 350.3 250.9C350.7 249.7 349.8 245.0 348.4 242.3ZM298.1 224.5C296.8 222.0 289.0 216.8 285.9 215.8C282.8 214.7 279.0 215.8 277.4 217.6C275.8 219.4 274.5 225.5 275.3 227.9C276.2 230.3 280.0 233.1 282.9 233.8C285.8 234.5 292.4 234.0 294.6 232.6C296.9 231.2 299.4 227.0 298.1 224.5ZM223.0 222.7C222.5 220.4 219.3 218.5 216.6 218.9C213.9 219.3 207.3 223.5 205.0 225.4C202.7 227.4 201.2 229.7 201.4 231.8C201.6 233.9 203.5 239.1 206.3 239.4C209.1 239.8 217.5 236.6 220.0 234.1C222.6 231.6 223.6 225.0 223.0 222.7ZM356.9 255.5C355.8 252.7 353.7 248.5 352.3 246.5C350.8 244.5 347.6 241.1 347.3 242.0C347.0 242.8 349.2 249.6 350.2 252.2C351.3 254.8 353.0 257.7 354.4 259.5C355.9 261.4 359.3 265.2 359.7 264.6C360.0 263.9 358.0 258.2 356.9 255.5ZM314.5 233.5C313.9 230.9 309.9 225.6 306.5 224.2C303.1 222.9 293.6 223.2 291.6 224.7C289.7 226.3 291.6 232.0 293.4 234.6C295.1 237.1 300.7 240.8 303.3 241.9C305.8 243.0 308.4 243.3 310.1 242.0C311.8 240.8 315.0 236.2 314.5 233.5ZM238.6 229.1C238.5 226.8 235.9 222.2 233.3 221.5C230.7 220.7 223.5 222.2 221.2 224.4C219.0 226.6 217.4 233.8 218.1 236.3C218.8 238.8 223.7 240.9 226.0 241.0C228.4 241.2 232.2 239.0 234.1 237.2C236.0 235.4 238.7 231.5 238.6 229.1ZM361.4 266.4C360.6 263.9 359.6 260.9 358.9 259.1C358.2 257.4 356.7 254.0 356.7 254.9C356.8 255.9 358.5 262.6 359.3 265.5C360.1 268.4 361.4 272.6 362.2 274.1C362.9 275.7 364.1 276.9 364.0 275.7C363.9 274.6 362.2 268.9 361.4 266.4ZM328.7 240.7C328.1 238.1 324.6 234.1 322.1 232.6C319.5 231.2 313.5 230.1 311.7 231.3C309.9 232.5 308.7 237.9 309.9 240.8C311.1 243.7 317.1 249.2 319.6 250.6C322.0 252.0 324.8 251.6 326.2 250.2C327.6 248.7 329.3 243.3 328.7 240.7ZM256.8 231.6C256.5 229.0 254.1 224.9 251.3 224.5C248.5 224.0 240.4 227.1 238.0 228.7C235.6 230.3 234.9 233.0 235.4 235.0C235.8 237.1 238.2 241.3 240.9 242.3C243.5 243.3 250.8 243.2 253.2 241.6C255.6 240.0 257.1 234.1 256.8 231.6ZM184.8 243.5C185.0 240.7 183.6 238.1 182.0 238.5C180.4 238.9 175.9 243.8 174.0 246.3C172.0 248.8 169.2 253.1 169.1 255.4C169.0 257.7 171.7 261.4 173.4 261.6C175.1 261.8 178.7 259.7 180.4 257.0C182.1 254.2 184.6 246.3 184.8 243.5ZM364.0 282.7C363.3 279.4 361.6 269.9 361.3 267.5C360.9 265.0 361.3 265.5 361.7 266.6C362.0 267.8 363.1 272.1 363.7 275.0C364.3 277.9 365.3 283.7 365.6 285.9C365.8 288.1 365.8 290.2 365.5 289.7C365.3 289.2 364.6 286.1 364.0 282.7ZM341.2 250.9C340.3 248.3 338.9 245.1 336.7 243.9C334.6 242.6 328.5 242.0 326.9 242.6C325.4 243.2 325.6 245.5 326.4 248.0C327.2 250.4 330.0 256.7 332.4 258.7C334.9 260.8 341.4 262.8 342.7 261.6C344.0 260.4 342.1 253.6 341.2 250.9ZM274.9 236.2C273.5 233.4 267.7 228.3 264.7 228.0C261.7 227.7 256.7 232.4 255.1 234.3C253.4 236.1 252.3 238.0 253.6 240.3C254.9 242.7 260.5 249.1 263.6 250.1C266.7 251.0 272.4 248.6 274.1 246.5C275.8 244.4 276.4 239.0 274.9 236.2ZM198.7 242.8C198.5 240.5 197.6 237.4 195.4 238.0C193.2 238.7 186.3 244.4 184.1 247.1C182.0 249.8 180.7 253.8 180.9 256.0C181.1 258.2 183.2 262.3 185.5 261.9C187.9 261.5 194.6 256.2 196.6 253.4C198.6 250.5 198.9 245.1 198.7 242.8ZM361.9 294.8C361.5 292.0 361.4 286.0 361.7 283.9C361.9 281.8 362.8 280.0 363.5 280.8C364.1 281.5 365.6 286.1 366.1 289.0C366.5 291.8 366.6 297.8 366.2 299.8C365.9 301.8 364.5 303.1 363.9 302.4C363.2 301.6 362.2 297.6 361.9 294.8ZM352.5 263.3C351.5 260.3 348.0 254.5 346.3 252.9C344.5 251.2 341.7 251.6 340.8 252.4C339.8 253.2 339.2 255.2 340.0 258.1C340.7 261.0 344.1 269.2 346.0 271.4C348.0 273.7 352.0 274.2 353.0 273.0C354.0 271.7 353.6 266.4 352.5 263.3ZM294.4 243.8C293.5 241.0 287.0 237.2 283.7 236.2C280.3 235.2 273.8 235.6 272.1 236.8C270.4 238.1 271.3 241.6 272.2 244.3C273.0 246.9 275.1 253.0 277.7 254.5C280.3 256.1 287.0 256.1 289.5 254.5C292.0 252.9 295.3 246.5 294.4 243.8ZM216.3 246.9C216.1 244.2 212.3 240.4 209.9 239.7C207.5 239.0 202.6 239.6 200.5 242.3C198.3 245.0 195.3 254.8 195.6 257.5C195.9 260.2 200.2 260.5 202.5 260.5C204.8 260.5 209.1 259.7 211.1 257.6C213.2 255.6 216.5 249.6 216.3 246.9ZM360.8 275.8C360.3 273.0 357.6 266.3 356.4 264.2C355.2 262.0 353.5 260.5 352.9 261.7C352.2 262.9 351.9 268.8 352.1 272.0C352.4 275.2 353.7 281.5 354.8 283.2C355.9 284.9 358.7 284.4 359.6 283.3C360.5 282.2 361.3 278.7 360.8 275.8ZM311.7 251.5C311.2 249.1 309.0 244.5 306.0 243.4C303.1 242.4 294.4 243.1 292.2 244.5C289.9 245.8 290.0 249.6 291.0 252.4C292.1 255.2 296.4 262.2 299.2 263.3C302.0 264.4 307.5 261.5 309.4 259.8C311.3 258.0 312.2 254.0 311.7 251.5ZM235.1 250.0C234.4 247.7 229.2 243.8 225.9 243.3C222.6 242.8 215.2 244.6 213.2 246.6C211.2 248.5 211.3 253.6 212.5 256.2C213.6 258.8 218.2 263.4 220.9 263.8C223.6 264.1 228.5 260.3 230.6 258.3C232.7 256.2 235.8 252.2 235.1 250.0ZM365.0 285.6C364.6 282.3 363.2 277.0 362.6 275.6C362.0 274.1 361.5 275.0 361.1 276.0C360.7 277.0 359.7 279.1 359.8 282.1C359.9 285.1 361.0 293.6 361.9 295.9C362.7 298.3 365.0 299.3 365.5 297.8C366.0 296.2 365.5 289.0 365.0 285.6ZM327.2 261.9C326.6 258.8 321.7 251.0 319.1 249.5C316.4 248.0 311.5 250.2 309.6 251.7C307.7 253.3 305.8 257.0 306.5 260.0C307.2 262.9 311.7 269.8 314.2 271.4C316.7 272.9 321.4 271.7 323.3 270.3C325.2 268.8 327.8 265.0 327.2 261.9ZM251.4 251.6C250.2 248.8 246.5 244.0 243.8 243.7C241.2 243.5 235.6 247.4 233.5 249.9C231.5 252.5 229.2 258.3 230.1 260.8C231.0 263.3 236.1 266.6 239.4 266.8C242.7 267.0 250.2 264.3 252.0 262.0C253.7 259.7 252.6 254.3 251.4 251.6ZM180.8 264.0C180.4 261.5 179.1 260.0 177.1 260.6C175.1 261.3 168.9 265.7 167.3 268.4C165.7 271.1 165.9 276.1 166.6 278.8C167.3 281.4 170.1 286.3 172.0 286.1C174.0 285.9 178.3 280.9 179.6 277.6C180.9 274.2 181.1 266.5 180.8 264.0ZM366.6 301.4C366.6 298.1 366.4 290.9 366.2 289.1C366.0 287.3 365.6 288.3 365.4 289.3C365.2 290.2 364.9 292.3 364.8 295.2C364.8 298.2 365.0 306.6 365.2 309.0C365.3 311.4 365.8 312.3 366.0 311.1C366.2 310.0 366.6 304.7 366.6 301.4ZM340.4 269.2C340.3 266.2 338.0 262.8 335.6 261.6C333.3 260.4 326.6 260.0 324.7 261.3C322.8 262.7 322.5 267.8 323.1 270.7C323.7 273.5 326.8 278.5 328.8 280.2C330.8 281.9 334.7 283.5 336.5 281.9C338.2 280.2 340.5 272.3 340.4 269.2ZM269.4 256.7C268.4 254.3 265.6 251.9 262.9 251.6C260.2 251.3 253.4 252.8 251.2 254.7C249.1 256.5 247.5 261.4 248.6 264.1C249.7 266.9 255.5 272.3 258.7 272.8C261.8 273.4 267.7 270.2 269.3 267.8C270.9 265.4 270.3 259.2 269.4 256.7ZM193.9 267.7C193.4 265.0 191.4 262.1 189.3 261.6C187.3 261.2 181.9 262.2 180.2 264.7C178.6 267.3 177.7 275.7 178.6 278.8C179.5 281.9 184.1 285.1 186.2 285.2C188.4 285.3 191.5 282.3 192.7 279.6C193.8 277.0 194.4 270.4 193.9 267.7ZM364.0 313.8C364.4 310.5 365.3 304.6 365.7 302.7C366.0 300.8 366.5 299.5 366.5 301.0C366.5 302.5 365.8 310.1 365.4 312.9C365.1 315.7 364.7 317.9 364.4 319.7C364.0 321.5 363.0 325.7 363.0 324.8C362.9 323.9 363.6 317.1 364.0 313.8ZM351.3 283.8C351.0 280.9 349.3 276.8 347.5 275.2C345.6 273.6 340.4 272.7 338.7 273.4C337.0 274.1 335.5 276.8 336.1 279.8C336.7 282.8 340.8 291.4 342.8 293.6C344.8 295.8 348.2 296.1 349.5 294.6C350.8 293.2 351.6 286.7 351.3 283.8ZM287.6 263.3C287.3 260.2 284.5 257.4 282.2 256.4C279.8 255.5 274.3 254.8 272.0 257.1C269.7 259.3 266.6 268.4 266.7 271.4C266.8 274.4 269.9 276.4 272.5 277.3C275.2 278.1 282.0 279.1 284.2 277.0C286.5 274.9 288.0 266.4 287.6 263.3ZM213.3 270.9C212.2 267.9 205.0 262.0 201.7 261.8C198.5 261.7 192.7 267.1 191.5 269.8C190.3 272.6 192.6 277.7 193.6 280.2C194.7 282.7 196.1 286.1 198.4 286.3C200.8 286.5 206.9 283.8 209.2 281.5C211.4 279.2 214.4 273.8 213.3 270.9ZM357.2 329.4C357.7 326.6 359.3 319.9 360.3 317.6C361.2 315.3 362.9 313.5 363.5 314.0C364.1 314.5 364.7 317.7 364.1 320.9C363.5 324.2 360.7 333.1 359.6 335.4C358.5 337.7 357.1 336.9 356.8 336.0C356.4 335.1 356.6 332.1 357.2 329.4ZM359.3 294.3C359.3 291.1 356.5 286.8 355.3 285.1C354.0 283.4 352.0 281.4 351.0 282.8C349.9 284.2 348.5 291.2 348.4 294.4C348.4 297.6 349.5 302.1 350.6 304.0C351.7 305.9 354.3 308.4 355.6 307.0C356.9 305.5 359.4 297.6 359.3 294.3ZM309.1 276.5C308.7 273.0 302.6 264.6 299.4 263.1C296.2 261.6 290.4 264.8 288.0 266.3C285.7 267.8 283.2 270.2 283.8 273.3C284.3 276.4 289.2 285.0 291.9 287.0C294.7 288.9 299.5 287.6 302.1 286.0C304.7 284.5 309.5 279.9 309.1 276.5ZM228.3 272.5C227.7 269.6 224.4 266.5 222.1 265.8C219.7 265.0 214.5 265.7 212.5 267.6C210.6 269.5 208.5 275.4 208.8 278.4C209.1 281.4 211.9 286.3 214.5 287.3C217.1 288.4 224.0 287.6 226.0 285.4C228.1 283.2 228.9 275.5 228.3 272.5ZM362.6 310.5C362.9 307.7 363.0 299.8 362.4 298.0C361.7 296.2 359.1 296.9 358.0 298.4C356.8 299.9 354.9 304.7 354.6 307.8C354.3 311.0 355.2 317.9 356.1 319.2C357.0 320.4 359.6 317.7 360.6 316.4C361.6 315.1 362.4 313.2 362.6 310.5ZM322.0 280.7C321.9 277.3 319.5 273.8 317.5 272.6C315.5 271.5 311.0 271.2 308.5 273.1C306.0 275.0 300.8 281.6 300.7 285.1C300.7 288.5 305.5 294.8 308.1 296.4C310.8 297.9 316.3 297.7 318.3 295.4C320.4 293.0 322.1 284.1 322.0 280.7ZM248.6 273.4C247.7 270.7 241.8 269.5 238.8 269.6C235.8 269.7 230.1 271.8 228.3 274.0C226.5 276.2 225.6 281.7 226.9 284.3C228.1 286.8 234.1 290.3 236.8 290.8C239.4 291.3 242.9 290.2 244.7 287.6C246.4 285.0 249.5 276.1 248.6 273.4ZM363.0 323.6C363.7 320.8 365.4 313.1 365.2 311.2C365.1 309.2 363.0 309.3 362.1 310.5C361.2 311.8 360.0 316.7 359.4 319.5C358.8 322.4 357.8 328.1 358.0 329.6C358.2 331.1 360.1 330.5 360.9 329.6C361.6 328.7 362.4 326.4 363.0 323.6ZM334.4 292.2C334.7 289.2 332.4 285.0 330.3 284.0C328.1 283.0 321.9 283.7 320.1 285.3C318.3 287.0 318.3 292.1 318.3 295.0C318.3 297.9 318.5 303.4 320.1 304.8C321.6 306.1 326.5 305.9 328.6 304.1C330.8 302.2 334.2 295.2 334.4 292.2ZM266.4 283.3C265.9 280.4 264.3 276.0 261.2 274.8C258.1 273.6 248.3 272.8 245.8 275.2C243.3 277.6 243.7 287.7 244.3 290.6C245.0 293.5 247.3 294.1 250.3 294.6C253.4 295.2 262.4 296.0 264.8 294.4C267.2 292.7 267.0 286.3 266.4 283.3ZM193.6 290.4C192.8 287.4 190.2 284.8 188.1 285.0C186.0 285.3 181.0 289.5 179.6 292.0C178.2 294.5 177.7 299.0 178.8 301.5C180.0 303.9 185.0 307.9 187.1 308.5C189.3 309.0 192.4 307.8 193.4 305.1C194.3 302.4 194.4 293.4 193.6 290.4ZM359.7 336.9C360.6 334.3 362.7 327.5 363.2 325.4C363.7 323.2 363.4 322.1 363.0 322.5C362.7 322.9 361.9 325.0 361.0 327.9C360.0 330.7 357.2 339.2 356.6 341.5C356.1 343.8 356.8 343.8 357.3 343.2C357.7 342.5 358.8 339.6 359.7 336.9ZM345.1 305.0C345.2 302.0 343.8 297.5 342.2 295.9C340.7 294.2 336.4 292.9 334.6 294.2C332.8 295.6 330.1 301.6 330.0 304.9C329.9 308.3 332.1 314.9 333.8 316.6C335.4 318.2 339.6 317.7 341.3 316.0C343.0 314.3 344.9 308.0 345.1 305.0ZM285.7 286.4C284.8 283.2 279.9 279.4 276.8 278.8C273.6 278.3 267.3 281.0 264.7 282.8C262.1 284.6 258.9 288.0 259.4 290.8C260.0 293.5 264.8 299.6 268.3 301.1C271.7 302.6 279.9 302.8 282.5 300.6C285.1 298.4 286.6 289.7 285.7 286.4ZM209.5 294.4C208.2 291.0 204.3 286.6 201.6 286.4C198.9 286.2 193.0 290.4 191.6 293.3C190.3 296.2 191.6 302.9 192.8 305.7C194.0 308.6 197.0 311.6 199.6 312.2C202.2 312.7 208.6 312.0 210.1 309.3C211.5 306.7 210.8 297.8 209.5 294.4ZM352.5 349.5C353.9 346.6 357.5 339.3 358.7 337.0C360.0 334.7 361.0 333.2 360.7 334.3C360.3 335.4 357.6 341.9 356.4 344.5C355.1 347.2 353.5 350.3 352.5 352.1C351.6 353.8 350.0 356.7 350.0 356.3C350.0 355.9 351.2 352.4 352.5 349.5ZM353.2 316.2C353.8 313.0 351.6 310.0 350.2 308.6C348.7 307.1 345.0 305.6 343.5 306.4C341.9 307.3 340.4 311.6 339.9 314.4C339.5 317.2 339.4 322.6 340.3 325.0C341.1 327.3 343.7 331.3 345.6 330.0C347.5 328.7 352.5 319.4 353.2 316.2ZM302.3 298.6C301.5 295.5 294.8 287.4 292.0 285.9C289.3 284.5 286.1 286.4 284.0 288.9C282.0 291.4 278.2 299.2 278.4 302.6C278.6 305.9 282.6 310.6 285.4 311.3C288.3 312.0 294.9 308.9 297.5 307.0C300.0 305.1 303.2 301.8 302.3 298.6ZM226.9 297.4C225.5 294.1 220.5 290.1 217.9 290.0C215.3 289.9 211.2 294.4 209.7 297.0C208.2 299.6 206.9 304.6 208.1 307.3C209.2 310.0 214.6 314.5 217.4 315.2C220.2 316.0 225.3 314.8 226.8 312.1C228.2 309.4 228.2 300.8 226.9 297.4ZM356.2 328.7C357.3 325.8 357.2 323.0 356.2 321.4C355.3 319.7 351.7 316.7 349.9 317.7C348.1 318.8 345.0 325.4 344.3 328.5C343.6 331.5 344.8 336.3 345.5 338.1C346.2 339.9 347.3 341.8 348.9 340.4C350.5 339.0 355.1 331.5 356.2 328.7ZM314.3 309.0C314.2 306.0 312.6 301.0 310.7 299.4C308.8 297.9 304.4 297.3 301.6 298.6C298.9 299.8 292.4 304.7 292.4 307.9C292.4 311.0 298.9 317.6 301.7 319.4C304.6 321.1 309.5 320.8 311.4 319.2C313.3 317.7 314.4 312.0 314.3 309.0ZM245.1 302.9C244.3 300.2 240.2 296.4 237.5 295.8C234.7 295.2 228.5 296.7 226.8 299.0C225.0 301.4 224.6 309.0 225.9 311.6C227.2 314.3 232.7 316.6 235.2 316.8C237.8 317.1 241.5 315.7 243.0 313.6C244.5 311.5 245.9 305.6 245.1 302.9ZM353.2 345.9C354.4 343.4 357.1 336.6 357.1 334.6C357.0 332.6 354.5 331.5 353.0 332.3C351.5 333.0 348.5 337.2 347.3 339.5C346.2 341.9 345.2 346.3 345.5 348.0C345.7 349.8 348.0 351.2 349.2 350.9C350.4 350.6 352.0 348.3 353.2 345.9ZM327.1 320.4C327.2 317.0 322.9 309.8 321.0 308.0C319.2 306.2 316.7 306.7 314.7 308.5C312.7 310.3 308.2 316.9 307.4 320.1C306.6 323.4 307.2 328.3 309.2 329.9C311.2 331.5 318.0 332.2 320.7 330.8C323.4 329.4 327.1 323.8 327.1 320.4ZM263.8 305.7C262.2 302.5 256.0 298.5 252.8 298.1C249.6 297.7 244.6 300.3 242.6 303.2C240.6 306.0 238.2 313.6 239.2 316.9C240.2 320.3 245.7 325.1 249.3 325.4C253.0 325.7 261.1 322.0 263.3 319.0C265.5 316.0 265.3 308.8 263.8 305.7ZM198.3 320.1C196.9 317.5 192.5 311.6 190.2 311.6C187.9 311.6 183.7 317.1 183.1 320.1C182.5 323.2 184.2 329.2 186.2 331.9C188.1 334.5 194.1 338.2 196.1 337.8C198.1 337.4 199.2 332.0 199.5 329.3C199.9 326.7 199.7 322.8 198.3 320.1ZM350.7 354.9C352.5 352.1 354.5 347.3 355.1 345.3C355.8 343.2 356.0 340.6 354.9 341.3C353.7 342.1 349.3 347.4 347.5 350.1C345.7 352.8 343.5 357.2 342.9 359.3C342.3 361.5 342.1 364.9 343.3 364.3C344.5 363.6 349.0 357.8 350.7 354.9ZM333.1 332.5C333.9 329.8 334.4 324.1 333.2 322.1C331.9 320.1 327.1 318.3 324.7 319.3C322.3 320.3 318.0 325.9 317.0 329.0C316.1 332.1 316.5 338.1 318.2 339.7C319.8 341.4 325.7 340.9 327.9 339.8C330.2 338.7 332.3 335.1 333.1 332.5ZM278.0 316.7C277.3 313.9 272.9 309.8 269.9 308.7C266.9 307.7 260.0 307.6 258.2 309.8C256.5 312.0 257.1 320.3 258.1 323.3C259.1 326.2 262.5 328.8 264.9 329.5C267.4 330.1 272.7 329.3 274.7 327.4C276.6 325.5 278.7 319.5 278.0 316.7ZM215.9 322.8C214.2 320.4 207.7 317.3 204.9 317.1C202.0 316.8 198.1 318.6 196.8 321.0C195.4 323.5 194.6 330.7 195.9 333.4C197.2 336.2 202.2 339.6 205.2 339.5C208.3 339.4 214.4 335.3 216.0 332.8C217.6 330.3 217.6 325.1 215.9 322.8ZM344.1 365.1C345.9 362.9 347.4 360.8 348.2 359.3C349.0 357.9 349.9 355.3 349.4 355.5C348.9 355.7 346.4 358.4 344.8 360.5C343.1 362.7 339.6 367.6 338.2 369.6C336.9 371.7 334.9 374.9 335.8 374.2C336.6 373.6 342.2 367.4 344.1 365.1ZM339.2 340.8C340.7 338.2 341.3 333.7 340.0 332.3C338.7 330.9 333.0 330.2 330.5 331.5C328.1 332.9 325.1 338.5 323.8 341.3C322.5 344.1 320.9 348.7 321.9 350.0C322.8 351.3 327.6 351.5 330.2 350.1C332.8 348.7 337.7 343.5 339.2 340.8ZM292.4 325.9C292.3 322.7 291.1 315.7 288.4 314.8C285.6 314.0 276.8 318.7 274.0 320.4C271.3 322.2 270.2 324.1 270.0 326.7C269.9 329.3 270.3 336.3 273.1 337.7C275.9 339.1 286.0 337.9 288.9 336.2C291.8 334.4 292.5 329.1 292.4 325.9ZM229.7 326.2C227.6 323.4 221.4 319.5 218.7 319.0C216.0 318.5 212.9 319.9 211.7 322.7C210.6 325.6 209.6 335.0 211.0 338.1C212.4 341.2 217.8 343.3 221.0 343.2C224.2 343.2 231.0 340.4 232.3 337.9C233.6 335.3 231.7 329.0 229.7 326.2ZM339.2 355.8C340.6 353.0 343.2 344.8 342.6 342.7C342.0 340.6 337.6 340.5 335.3 341.8C333.0 343.1 328.9 348.8 327.4 351.3C325.9 353.8 324.5 357.1 325.3 358.6C326.1 360.1 330.9 361.4 333.0 361.0C335.0 360.6 337.7 358.5 339.2 355.8ZM304.3 334.6C305.1 331.5 303.6 325.9 301.2 324.9C298.8 323.9 291.5 326.1 288.4 328.0C285.3 329.9 280.9 335.2 280.3 337.8C279.8 340.4 282.5 344.1 284.8 345.3C287.1 346.5 292.8 347.3 295.7 345.7C298.6 344.1 303.4 337.7 304.3 334.6ZM248.7 333.5C247.0 331.0 237.8 325.7 234.5 325.2C231.1 324.7 227.7 327.5 226.4 330.2C225.2 332.8 224.4 340.3 226.0 343.2C227.6 346.0 234.1 349.3 237.0 349.2C239.9 349.0 243.8 344.4 245.6 342.0C247.4 339.7 250.4 336.0 248.7 333.5ZM334.5 368.3C336.6 365.9 340.0 360.0 340.6 357.7C341.3 355.3 340.5 352.3 338.7 352.7C336.9 353.1 330.6 357.9 328.4 360.6C326.2 363.2 324.2 368.3 324.0 370.3C323.7 372.2 325.2 374.0 326.8 373.7C328.4 373.4 332.4 370.7 334.5 368.3ZM312.3 344.6C312.7 341.8 312.0 338.5 309.9 337.2C307.7 336.0 300.6 334.7 297.8 336.3C295.0 337.8 291.5 344.6 291.1 347.6C290.8 350.5 292.8 354.6 295.3 355.9C297.7 357.1 304.9 357.6 307.5 355.9C310.1 354.2 312.0 347.4 312.3 344.6ZM260.1 338.6C259.0 336.0 256.1 332.8 253.4 331.9C250.8 331.0 244.9 330.6 242.4 332.4C239.9 334.2 236.0 340.5 237.1 343.8C238.2 347.2 246.2 354.0 249.7 354.9C253.3 355.8 259.2 352.2 260.7 349.8C262.3 347.3 261.2 341.3 260.1 338.6ZM209.2 347.7C206.8 345.6 202.5 343.8 200.4 343.9C198.3 344.1 195.6 346.7 195.1 348.9C194.6 351.0 194.6 356.0 197.0 358.2C199.4 360.4 207.9 363.7 210.8 363.7C213.7 363.7 216.7 360.5 216.4 358.1C216.2 355.7 211.6 349.8 209.2 347.7ZM328.2 378.8C330.0 377.1 334.0 372.6 334.7 370.6C335.5 368.5 335.0 364.7 333.2 365.1C331.3 365.4 324.5 370.7 322.2 373.0C320.0 375.3 317.9 379.1 318.0 380.4C318.1 381.7 321.1 381.7 322.6 381.5C324.2 381.2 326.4 380.4 328.2 378.8ZM317.6 358.3C318.7 355.7 317.1 351.1 315.5 349.4C313.9 347.6 309.7 345.9 306.9 346.8C304.2 347.7 298.9 352.6 297.3 355.2C295.6 357.9 294.2 362.6 295.8 364.3C297.4 366.1 304.8 367.7 308.0 366.7C311.3 365.8 316.5 360.9 317.6 358.3ZM274.1 349.7C273.8 347.0 272.4 341.5 269.3 340.5C266.1 339.6 255.6 341.4 253.0 343.3C250.4 345.2 250.9 350.5 251.8 353.0C252.7 355.6 256.0 359.2 258.9 360.1C261.8 361.0 268.9 360.5 271.1 358.9C273.4 357.4 274.4 352.5 274.1 349.7ZM223.8 351.0C221.3 348.7 214.3 347.4 211.6 347.6C208.9 347.9 206.3 350.3 205.8 352.6C205.3 355.0 206.2 361.0 208.2 363.4C210.2 365.7 215.7 368.2 218.8 368.1C221.9 368.0 228.1 365.0 228.9 362.5C229.6 359.9 226.4 353.2 223.8 351.0ZM320.6 386.1C322.6 384.8 325.4 382.9 326.7 381.3C328.0 379.7 330.7 375.3 329.1 375.3C327.6 375.4 319.2 379.7 316.1 381.8C313.0 383.8 308.8 387.7 308.3 389.0C307.8 390.2 310.9 390.6 312.7 390.2C314.6 389.8 318.5 387.5 320.6 386.1ZM316.4 369.3C318.2 366.9 318.5 362.6 317.3 361.2C316.1 359.7 310.9 359.1 308.4 359.6C305.8 360.2 302.2 362.8 300.3 364.9C298.4 367.1 295.1 372.1 295.9 373.9C296.6 375.8 302.2 378.0 305.3 377.3C308.4 376.6 314.6 371.7 316.4 369.3ZM285.1 359.8C285.7 357.1 283.3 351.9 280.5 350.7C277.8 349.4 270.0 350.2 266.6 351.4C263.2 352.7 258.6 356.4 258.1 359.0C257.6 361.6 260.4 367.6 263.1 369.0C265.9 370.4 273.3 369.8 276.6 368.4C279.8 367.0 284.5 362.4 285.1 359.8ZM241.9 360.9C240.3 358.6 234.9 356.4 231.7 356.1C228.5 355.8 222.5 357.1 220.7 358.8C219.0 360.5 218.4 365.6 220.1 367.6C221.8 369.7 228.7 371.7 232.0 372.3C235.3 372.9 240.7 373.3 242.2 371.6C243.7 369.9 243.5 363.3 241.9 360.9ZM313.1 379.4C315.4 377.4 313.5 374.9 312.9 373.6C312.3 372.3 311.4 370.7 309.1 370.8C306.8 370.8 299.8 371.9 297.6 373.8C295.3 375.8 294.1 381.8 294.1 383.7C294.2 385.6 295.0 387.2 297.8 386.5C300.7 385.9 310.8 381.3 313.1 379.4ZM290.1 370.7C290.7 368.2 287.3 364.0 284.6 362.9C281.9 361.8 274.8 362.3 272.0 363.4C269.2 364.4 265.7 367.8 265.8 370.0C265.9 372.3 270.2 377.0 272.4 378.5C274.6 380.0 278.0 381.1 280.7 379.9C283.3 378.7 289.5 373.3 290.1 370.7ZM253.5 366.2C251.8 364.1 244.5 364.3 241.2 364.3C238.0 364.4 233.2 364.7 231.9 366.6C230.6 368.5 230.6 374.7 232.5 377.0C234.5 379.4 242.0 382.1 244.9 382.3C247.8 382.4 250.8 380.5 252.1 378.1C253.4 375.6 255.1 368.2 253.5 366.2ZM298.8 392.2C301.9 390.5 305.8 385.7 305.7 384.1C305.5 382.6 300.1 382.0 297.6 382.0C295.0 382.0 291.2 382.8 288.7 384.1C286.2 385.5 281.4 389.4 280.9 391.1C280.4 392.8 282.5 395.5 285.2 395.6C287.9 395.8 295.8 394.0 298.8 392.2ZM288.1 383.3C289.4 381.1 287.2 375.5 285.0 374.3C282.9 373.0 276.9 374.0 273.6 375.0C270.3 376.1 264.2 379.2 262.9 381.2C261.6 383.2 262.9 387.4 264.9 388.6C266.9 389.8 272.8 389.8 276.3 389.0C279.8 388.2 286.8 385.5 288.1 383.3ZM263.4 379.2C262.2 377.3 256.7 375.8 254.0 375.6C251.4 375.4 247.5 376.4 245.7 377.8C243.8 379.2 241.3 382.9 241.9 384.9C242.6 386.9 247.0 390.6 250.1 391.2C253.1 391.7 260.1 390.2 262.1 388.4C264.1 386.6 264.6 381.1 263.4 379.2ZM248.2 385.9C244.9 384.7 234.1 383.5 231.2 384.0C228.2 384.6 228.1 388.0 228.5 389.5C228.9 391.1 231.5 393.5 234.0 394.4C236.5 395.3 242.3 396.1 245.2 395.7C248.1 395.4 252.9 393.6 253.4 392.1C253.8 390.7 251.5 387.1 248.2 385.9ZM271.9 401.6C274.9 400.9 279.8 398.1 280.8 396.8C281.8 395.6 280.7 394.1 278.7 393.4C276.7 392.7 270.2 391.8 267.5 392.3C264.7 392.7 261.2 395.0 260.2 396.4C259.1 397.8 258.7 400.6 260.4 401.4C262.2 402.1 268.8 402.2 271.9 401.6Z\"/>\n<path class=\"a5-net-edge b5-bowl-net\" d=\"M222.8 383.4L224.5 383.1L226.4 383.0L228.4 382.9L230.3 382.9L232.3 382.8L234.1 382.8L235.7 382.6L237.3 382.4L238.7 382.0L240.0 381.4L241.3 380.8L242.6 380.0L243.9 379.1L245.2 378.1L246.8 377.1L248.4 376.2L250.2 375.3L252.1 374.6L254.1 374.1L256.2 373.8L258.4 373.8L260.5 374.0L262.6 374.4L264.5 375.1L266.4 375.9L268.1 376.8L269.6 377.8L271.0 378.8L272.4 379.7L273.6 380.5L274.9 381.2L276.2 381.8L277.6 382.2L279.1 382.5L280.7 382.7L282.5 382.8L284.4 382.9L286.3 382.9L288.3 382.9L290.2 383.1L292.0 383.3L293.6 383.6L295.0 384.1L296.0 384.7L296.8 385.5L297.1 386.5L297.1 387.5L296.8 388.7L296.2 389.8L295.3 391.0L294.3 392.1L293.3 393.2L292.2 394.2L291.2 395.1L290.3 395.9L289.5 396.7L289.0 397.4L288.6 398.0L288.3 398.6L288.1 399.2M204.4 369.4L206.1 368.4L207.7 367.3L209.3 366.0L210.9 364.5L212.5 362.9L214.2 361.2L216.1 359.5L218.1 357.8L220.3 356.1L222.8 354.6L225.5 353.3L228.4 352.3L231.5 351.5L234.8 351.1L238.2 350.9L241.7 351.1L245.2 351.5L248.7 352.1L252.1 352.9L255.5 353.7L258.8 354.6L261.9 355.4L265.1 356.2L268.2 356.7L271.2 357.2L274.3 357.4L277.4 357.5L280.5 357.4L283.8 357.3L287.0 357.1L290.3 356.9L293.6 356.7L296.9 356.7L300.0 356.8L302.9 357.2L305.7 357.8L308.2 358.7L310.3 359.9L312.2 361.3L313.7 362.9L314.9 364.7L315.8 366.6L316.4 368.6L316.8 370.6L317.0 372.5L317.2 374.3L317.3 376.0L317.4 377.5L317.6 378.9L317.9 380.1L318.2 381.2L318.6 382.2L319.0 383.1L319.3 384.0L319.5 384.8L319.5 385.6L319.2 386.4L318.7 387.4L317.8 388.3L316.6 389.4M182.2 343.2L183.9 340.7L185.8 338.3L188.1 336.1L190.6 334.1L193.5 332.4L196.7 331.0L200.2 330.0L203.9 329.2L207.8 328.8L211.9 328.6L216.1 328.7L220.4 328.8L224.7 329.1L229.0 329.4L233.3 329.6L237.6 329.7L241.9 329.6L246.2 329.4L250.5 329.0L254.8 328.4L259.1 327.7L263.5 326.9L268.0 326.1L272.5 325.3L277.0 324.6L281.6 324.2L286.0 323.9L290.5 324.0L294.7 324.4L298.9 325.2L302.8 326.3L306.5 327.8L310.0 329.5L313.2 331.5L316.1 333.7L318.9 335.9L321.4 338.2L323.7 340.4L325.9 342.5L328.0 344.5L330.0 346.3L332.0 347.9L333.9 349.4L335.8 350.6L337.6 351.7L339.3 352.8L340.9 353.7L342.3 354.7L343.4 355.7L344.3 356.8L344.8 358.1L345.0 359.5L344.7 361.1L344.1 362.9L343.0 364.9L341.6 367.0L339.8 369.3L337.8 371.6L335.4 373.9L332.8 376.2M167.9 313.3L170.7 312.0L173.8 310.9L177.2 310.1L180.7 309.4L184.5 308.8L188.5 308.3L192.5 307.7L196.7 307.1L201.0 306.3L205.4 305.4L209.8 304.2L214.3 302.9L218.9 301.5L223.7 299.9L228.5 298.2L233.4 296.6L238.5 295.1L243.6 293.7L248.8 292.5L254.1 291.7L259.4 291.2L264.8 291.1L270.1 291.3L275.3 292.0L280.5 293.0L285.6 294.4L290.5 296.0L295.3 297.8L299.9 299.7L304.4 301.7L308.8 303.6L313.0 305.4L317.1 307.1L321.1 308.6L325.0 310.0L328.8 311.1L332.5 312.1L336.0 313.0L339.4 313.8L342.7 314.6L345.7 315.4L348.4 316.4L350.9 317.5L353.1 318.9L354.9 320.5L356.4 322.4L357.6 324.5L358.3 327.0L358.7 329.6L358.8 332.5L358.5 335.5L357.9 338.5L356.9 341.5L355.8 344.5L354.4 347.3L352.8 349.9L351.1 352.3L349.2 354.4L347.1 356.3L345.0 357.9M163.0 291.5L165.8 290.1L168.9 288.5L172.1 286.8L175.6 284.8L179.3 282.6L183.2 280.4L187.2 278.0L191.5 275.5L195.9 273.2L200.6 270.9L205.4 268.8L210.4 267.0L215.5 265.4L220.7 264.3L226.1 263.5L231.6 263.0L237.1 263.0L242.7 263.2L248.3 263.8L253.9 264.7L259.5 265.7L265.2 266.8L270.8 267.9L276.3 269.1L281.8 270.1L287.2 271.0L292.5 271.8L297.8 272.4L303.0 272.9L308.0 273.2L313.0 273.5L317.8 273.8L322.4 274.1L326.9 274.5L331.2 275.1L335.3 275.9L339.1 277.1L342.7 278.5L346.1 280.3L349.2 282.4L352.1 284.8L354.6 287.5L356.9 290.4L358.9 293.5L360.5 296.6L361.9 299.8L363.0 302.9L363.9 305.9L364.4 308.8L364.7 311.4L364.7 313.7L364.5 315.8L364.1 317.7L363.3 319.3L362.3 320.8L361.0 322.1L359.4 323.3L357.6 324.5L355.4 325.7L352.9 327.0M163.4 262.6L166.3 259.7L169.4 256.9L172.8 254.1L176.4 251.6L180.2 249.3L184.2 247.3L188.3 245.6L192.6 244.2L197.0 243.1L201.5 242.3L206.2 241.8L211.1 241.6L216.1 241.5L221.2 241.6L226.4 241.7L231.8 241.9L237.2 242.0L242.8 242.1L248.3 242.0L253.9 241.8L259.5 241.5L265.1 241.2L270.7 240.7L276.2 240.2L281.7 239.8L287.0 239.5L292.3 239.3L297.4 239.3L302.4 239.6L307.3 240.2L312.1 241.1L316.8 242.4L321.4 244.0L325.8 245.9L330.0 248.0L334.1 250.4L338.0 253.0L341.7 255.7L345.2 258.4L348.4 261.1L351.3 263.7L354.0 266.1L356.3 268.4L358.4 270.5L360.1 272.4L361.5 274.1L362.6 275.6L363.4 277.0L363.9 278.3L364.0 279.6L363.9 280.9L363.5 282.3L362.8 283.9L361.9 285.7L360.7 287.7L359.3 289.9L357.7 292.4L355.9 295.0L353.8 297.8L351.5 300.7M173.5 234.0L175.9 232.3L178.4 230.9L181.0 229.8L183.8 228.8L186.9 227.9L190.1 227.2L193.5 226.5L197.2 225.9L201.2 225.2L205.3 224.5L209.7 223.7L214.3 222.8L219.0 221.8L223.9 220.7L228.9 219.6L233.9 218.5L239.0 217.3L244.1 216.3L249.2 215.4L254.3 214.6L259.3 214.1L264.3 213.8L269.3 213.8L274.2 214.0L279.1 214.5L284.0 215.3L288.9 216.3L293.8 217.6L298.6 219.1L303.4 220.7L308.0 222.5L312.6 224.3L317.0 226.1L321.2 227.8L325.2 229.5L328.9 231.0L332.3 232.5L335.5 233.7L338.3 234.9L340.9 236.0L343.1 237.1L345.0 238.1L346.7 239.2L348.1 240.4L349.4 241.7L350.4 243.2L351.3 244.9L352.1 246.8L352.7 248.9L353.3 251.3L353.6 253.9L353.8 256.7L353.8 259.6L353.5 262.6L352.9 265.5L352.1 268.4L350.8 271.1L349.3 273.6L347.4 275.9L345.1 277.9M185.7 218.3L187.3 217.3L189.2 216.3L191.4 215.1L194.0 213.9L196.9 212.5L200.1 211.1L203.5 209.6L207.2 208.1L211.0 206.6L214.9 205.2L218.9 203.9L222.9 202.6L226.9 201.6L231.0 200.6L234.9 199.9L238.9 199.4L242.9 199.0L246.8 198.9L250.9 198.9L254.9 199.1L259.1 199.5L263.3 200.0L267.5 200.6L271.8 201.2L276.1 202.0L280.4 202.8L284.7 203.5L288.8 204.3L292.8 205.0L296.6 205.6L300.2 206.2L303.5 206.8L306.7 207.3L309.5 207.9L312.2 208.5L314.7 209.2L317.0 210.0L319.2 210.9L321.4 212.0L323.5 213.3L325.5 214.7L327.6 216.3L329.7 218.2L331.7 220.2L333.6 222.3L335.4 224.6L337.0 226.9L338.4 229.3L339.5 231.6L340.2 233.9L340.6 236.0L340.6 238.0L340.1 239.7L339.3 241.2L338.1 242.5L336.5 243.6L334.6 244.5L332.5 245.3L330.1 246.1L327.7 246.7M204.9 205.1L207.1 203.7L209.4 202.3L211.9 201.0L214.5 199.8L217.1 198.6L219.6 197.6L222.1 196.7L224.5 195.9L226.8 195.2L229.1 194.6L231.4 194.1L233.6 193.6L235.9 193.3L238.4 193.0L240.9 192.8L243.6 192.6L246.4 192.5L249.3 192.4L252.4 192.4L255.6 192.4L258.7 192.4L261.9 192.4L265.0 192.5L268.0 192.6L271.0 192.7L273.7 192.8L276.3 193.0L278.8 193.3L281.1 193.6L283.4 194.0L285.6 194.5L287.8 195.0L290.0 195.7L292.3 196.4L294.7 197.2L297.1 198.2L299.6 199.3L302.2 200.4L304.7 201.7L307.1 203.1L309.4 204.5L311.5 205.9L313.3 207.3L314.7 208.6L315.8 209.9L316.6 211.1L316.9 212.2L316.9 213.1L316.5 214.0L315.8 214.7L314.9 215.4L313.9 216.1L312.8 216.8L311.6 217.5L310.5 218.3L309.5 219.2L308.5 220.2L307.7 221.4L306.9 222.7L306.1 224.2M228.5 382.5L227.1 380.4L225.4 378.4L223.3 376.5L220.7 374.9L217.6 373.4L214.6 372.0L211.8 370.3L209.7 368.2L208.4 365.7L207.6 362.9M249.2 377.1L247.7 375.1L245.7 373.1L243.6 371.1L242.1 368.9L241.4 366.6L241.6 364.1L242.5 361.5L243.5 358.8L243.9 356.2L243.1 353.7M268.9 377.4L269.3 375.3L270.4 373.2L272.3 371.1L274.7 369.1L276.9 367.0L278.5 364.8L279.2 362.4L278.8 359.7L277.9 357.0L277.0 354.2M288.0 383.2L291.1 382.0L294.0 380.7L296.6 379.1L298.6 377.2L300.2 374.9L301.4 372.4L302.7 369.9L304.5 367.6L306.9 365.7L309.9 364.1M294.5 393.1L297.4 392.0L300.3 390.5L303.1 388.8L305.8 387.2L308.5 385.8L311.1 384.8L313.7 384.0L316.2 383.4L318.6 382.5L321.0 381.1M224.7 356.7L222.2 354.6L219.1 352.5L216.1 350.5L213.8 348.2L212.7 345.5L212.8 342.4L213.7 339.2L214.6 335.9L214.7 332.8L213.4 330.1M257.4 353.0L256.5 350.4L257.0 347.7L258.7 345.0L261.1 342.2L263.3 339.5L264.4 336.7L264.0 333.9L262.2 330.9L259.6 328.0L257.3 325.1M296.1 358.2L299.2 356.3L302.1 354.3L304.1 352.0L304.9 349.3L304.8 346.2L304.2 342.9L303.8 339.8L304.4 336.9L306.2 334.3L309.2 332.1M319.6 373.0L321.8 370.8L323.6 368.1L325.2 365.1L326.8 362.4L328.7 360.1L331.1 358.3L333.8 356.9L336.4 355.6L338.8 354.1L340.7 351.9M318.0 387.0L320.7 385.1L323.0 383.7L324.9 382.6L326.3 381.9L327.5 381.3L328.9 380.2L330.8 378.6L333.2 376.3L335.9 373.6L338.6 370.7M193.1 337.1L190.4 335.0L187.3 333.2L184.4 331.4L182.2 329.1L181.2 326.3L181.2 322.9L181.9 319.1L182.7 315.4L182.8 312.0L181.6 309.3M230.9 326.8L229.3 324.0L229.4 321.0L231.0 317.8L233.3 314.5L235.4 311.3L236.2 308.2L235.2 305.2L232.6 302.5L229.2 299.8L226.2 297.2M285.7 327.0L288.9 324.5L291.6 321.9L293.0 319.1L292.7 316.0L291.0 312.7L288.6 309.3L286.7 306.0L286.3 302.9L287.7 300.0L290.6 297.4M330.7 341.9L331.6 338.8L331.8 335.4L331.5 331.7L331.6 328.3L332.5 325.4L334.5 323.1L337.3 321.2L340.1 319.5L342.3 317.5L343.6 314.9M342.9 360.0L344.7 357.0L346.5 354.7L348.2 353.1L349.8 351.9L351.2 350.7L352.5 349.1L353.9 346.8L355.3 343.7L356.7 340.0L358.0 336.2M198.3 303.0L196.7 300.4L196.7 297.3L198.1 293.7L200.4 290.0L202.5 286.5L203.2 283.3L202.2 280.5L199.8 278.2L196.6 276.1L194.0 273.9M259.7 295.1L263.0 292.2L265.7 289.2L266.7 286.2L265.6 283.2L262.9 280.2L259.5 277.1L256.8 274.2L255.8 271.3L257.0 268.3L259.9 265.5M323.4 305.1L323.1 301.8L321.4 298.1L319.4 294.4L318.0 290.9L317.9 287.8L319.6 285.3L322.4 283.1L325.4 281.1L327.5 278.9L328.2 276.2M353.3 323.6L353.7 320.0L354.6 317.2L356.0 315.2L357.8 313.7L359.4 312.2L360.6 310.3L361.2 307.6L361.3 304.1L360.8 300.1L360.2 296.0M352.9 348.8L352.9 347.6L352.7 346.3L352.9 344.5L353.7 341.9L355.3 338.5L357.1 334.7L358.7 330.8L359.8 327.5L360.1 324.9L359.8 323.0M170.3 283.7L169.3 281.3L169.6 278.2L171.1 274.6L173.2 270.7L175.2 267.0L176.2 263.9L175.8 261.4L174.4 259.6L172.5 258.1L171.2 256.4M226.5 267.3L229.8 264.1L232.4 261.0L233.3 258.1L232.2 255.4L229.4 253.0L226.1 250.7L223.5 248.4L222.7 245.9L223.9 243.1L226.8 240.2M299.7 268.9L298.3 265.8L295.5 262.5L292.3 259.3L289.9 256.2L289.3 253.4L290.8 250.9L293.6 248.6L296.8 246.5L298.9 244.3L299.2 241.8M345.1 283.7L344.1 280.2L344.1 277.3L345.3 275.2L347.2 273.5L349.0 271.9L350.0 269.9L349.9 267.3L348.7 264.0L346.6 260.2L344.3 256.5M365.3 309.5L365.5 308.1L365.5 306.7L365.4 304.7L365.5 301.9L365.6 298.2L365.6 294.1L365.4 290.0L365.1 286.5L364.7 283.8L364.2 282.0M196.8 246.2L200.0 242.9L202.6 239.8L203.8 237.2L203.2 235.0L201.4 233.3L199.2 231.8L197.7 230.2L197.6 228.2L199.2 225.8L202.1 223.1M266.9 238.5L265.3 236.0L262.3 233.5L258.9 231.1L256.5 228.8L255.9 226.5L257.4 224.3L260.3 222.1L263.5 220.1L265.7 218.1L266.1 216.2M320.9 246.8L318.8 243.8L318.2 241.3L319.3 239.3L321.3 237.6L323.3 236.1L324.3 234.3L323.7 232.1L321.6 229.5L318.5 226.5L315.3 223.7M359.2 268.6L359.6 267.3L359.8 265.9L359.6 264.0L358.7 261.3L357.3 257.9L355.6 254.2L353.7 250.5L352.0 247.4L351.0 245.1L350.4 243.6M355.8 298.6L355.5 295.6L355.8 291.9L356.3 287.8L356.5 283.9L356.1 280.6L355.0 278.1L353.2 276.3L351.1 274.8L348.9 273.2L347.2 271.0M180.2 231.7L183.2 228.5L185.8 225.7L187.5 223.5L188.1 221.9L187.8 220.7L187.4 219.8L187.5 218.8L188.6 217.3L190.7 215.3L193.6 213.0M235.7 217.0L234.7 215.2L232.4 213.6L230.0 212.2L228.4 210.7L228.5 209.1L230.3 207.3L233.2 205.5L236.3 203.8L238.7 202.2L239.5 200.9M288.3 218.0L286.0 215.8L285.4 214.0L286.6 212.3L288.7 211.0L290.7 209.7L291.8 208.4L291.2 206.8L289.1 205.1L286.1 203.4L283.0 201.7M336.7 232.5L337.3 231.4L337.7 230.3L337.3 228.8L335.8 226.7L333.4 224.1L330.4 221.2L327.5 218.6L325.1 216.4L323.7 214.8L323.0 213.7M354.6 259.0L353.2 256.3L352.0 252.9L350.6 249.2L349.0 245.8L347.4 243.0L345.6 240.9L343.8 239.6L341.9 238.5L339.8 237.3L337.8 235.6M216.2 204.7L216.3 203.7L215.6 202.9L214.8 202.3L214.8 201.5L215.8 200.6L218.0 199.4L221.0 198.0L224.0 196.8L226.5 195.8L228.1 195.1M258.2 200.0L256.6 198.9L256.5 197.7L257.8 196.7L260.0 195.8L262.1 194.9L263.3 194.2L263.2 193.5L261.9 192.8L259.9 192.2L258.0 191.7M305.4 206.4L306.1 205.7L306.6 205.0L306.2 204.1L304.6 202.9L302.0 201.4L298.9 199.8L295.8 198.4L293.5 197.4L292.2 196.7L291.7 196.3M336.0 225.4L333.9 223.4L331.4 220.9L328.7 218.3L325.9 215.9L323.4 214.0L321.3 212.7L319.5 211.9L317.8 211.4L315.8 210.7L313.5 209.8M333.6 243.5L332.4 240.4L330.6 237.8L328.3 235.9L325.6 234.5L322.7 233.2L319.8 231.8L317.3 230.0L315.3 227.8L313.6 225.3L311.8 222.7\"/><path class=\"a5-net b5-bowl-net\" d=\"M222.8 383.4L224.5 383.1L226.4 383.0L228.4 382.9L230.3 382.9L232.3 382.8L234.1 382.8L235.7 382.6L237.3 382.4L238.7 382.0L240.0 381.4L241.3 380.8L242.6 380.0L243.9 379.1L245.2 378.1L246.8 377.1L248.4 376.2L250.2 375.3L252.1 374.6L254.1 374.1L256.2 373.8L258.4 373.8L260.5 374.0L262.6 374.4L264.5 375.1L266.4 375.9L268.1 376.8L269.6 377.8L271.0 378.8L272.4 379.7L273.6 380.5L274.9 381.2L276.2 381.8L277.6 382.2L279.1 382.5L280.7 382.7L282.5 382.8L284.4 382.9L286.3 382.9L288.3 382.9L290.2 383.1L292.0 383.3L293.6 383.6L295.0 384.1L296.0 384.7L296.8 385.5L297.1 386.5L297.1 387.5L296.8 388.7L296.2 389.8L295.3 391.0L294.3 392.1L293.3 393.2L292.2 394.2L291.2 395.1L290.3 395.9L289.5 396.7L289.0 397.4L288.6 398.0L288.3 398.6L288.1 399.2M204.4 369.4L206.1 368.4L207.7 367.3L209.3 366.0L210.9 364.5L212.5 362.9L214.2 361.2L216.1 359.5L218.1 357.8L220.3 356.1L222.8 354.6L225.5 353.3L228.4 352.3L231.5 351.5L234.8 351.1L238.2 350.9L241.7 351.1L245.2 351.5L248.7 352.1L252.1 352.9L255.5 353.7L258.8 354.6L261.9 355.4L265.1 356.2L268.2 356.7L271.2 357.2L274.3 357.4L277.4 357.5L280.5 357.4L283.8 357.3L287.0 357.1L290.3 356.9L293.6 356.7L296.9 356.7L300.0 356.8L302.9 357.2L305.7 357.8L308.2 358.7L310.3 359.9L312.2 361.3L313.7 362.9L314.9 364.7L315.8 366.6L316.4 368.6L316.8 370.6L317.0 372.5L317.2 374.3L317.3 376.0L317.4 377.5L317.6 378.9L317.9 380.1L318.2 381.2L318.6 382.2L319.0 383.1L319.3 384.0L319.5 384.8L319.5 385.6L319.2 386.4L318.7 387.4L317.8 388.3L316.6 389.4M182.2 343.2L183.9 340.7L185.8 338.3L188.1 336.1L190.6 334.1L193.5 332.4L196.7 331.0L200.2 330.0L203.9 329.2L207.8 328.8L211.9 328.6L216.1 328.7L220.4 328.8L224.7 329.1L229.0 329.4L233.3 329.6L237.6 329.7L241.9 329.6L246.2 329.4L250.5 329.0L254.8 328.4L259.1 327.7L263.5 326.9L268.0 326.1L272.5 325.3L277.0 324.6L281.6 324.2L286.0 323.9L290.5 324.0L294.7 324.4L298.9 325.2L302.8 326.3L306.5 327.8L310.0 329.5L313.2 331.5L316.1 333.7L318.9 335.9L321.4 338.2L323.7 340.4L325.9 342.5L328.0 344.5L330.0 346.3L332.0 347.9L333.9 349.4L335.8 350.6L337.6 351.7L339.3 352.8L340.9 353.7L342.3 354.7L343.4 355.7L344.3 356.8L344.8 358.1L345.0 359.5L344.7 361.1L344.1 362.9L343.0 364.9L341.6 367.0L339.8 369.3L337.8 371.6L335.4 373.9L332.8 376.2M167.9 313.3L170.7 312.0L173.8 310.9L177.2 310.1L180.7 309.4L184.5 308.8L188.5 308.3L192.5 307.7L196.7 307.1L201.0 306.3L205.4 305.4L209.8 304.2L214.3 302.9L218.9 301.5L223.7 299.9L228.5 298.2L233.4 296.6L238.5 295.1L243.6 293.7L248.8 292.5L254.1 291.7L259.4 291.2L264.8 291.1L270.1 291.3L275.3 292.0L280.5 293.0L285.6 294.4L290.5 296.0L295.3 297.8L299.9 299.7L304.4 301.7L308.8 303.6L313.0 305.4L317.1 307.1L321.1 308.6L325.0 310.0L328.8 311.1L332.5 312.1L336.0 313.0L339.4 313.8L342.7 314.6L345.7 315.4L348.4 316.4L350.9 317.5L353.1 318.9L354.9 320.5L356.4 322.4L357.6 324.5L358.3 327.0L358.7 329.6L358.8 332.5L358.5 335.5L357.9 338.5L356.9 341.5L355.8 344.5L354.4 347.3L352.8 349.9L351.1 352.3L349.2 354.4L347.1 356.3L345.0 357.9M163.0 291.5L165.8 290.1L168.9 288.5L172.1 286.8L175.6 284.8L179.3 282.6L183.2 280.4L187.2 278.0L191.5 275.5L195.9 273.2L200.6 270.9L205.4 268.8L210.4 267.0L215.5 265.4L220.7 264.3L226.1 263.5L231.6 263.0L237.1 263.0L242.7 263.2L248.3 263.8L253.9 264.7L259.5 265.7L265.2 266.8L270.8 267.9L276.3 269.1L281.8 270.1L287.2 271.0L292.5 271.8L297.8 272.4L303.0 272.9L308.0 273.2L313.0 273.5L317.8 273.8L322.4 274.1L326.9 274.5L331.2 275.1L335.3 275.9L339.1 277.1L342.7 278.5L346.1 280.3L349.2 282.4L352.1 284.8L354.6 287.5L356.9 290.4L358.9 293.5L360.5 296.6L361.9 299.8L363.0 302.9L363.9 305.9L364.4 308.8L364.7 311.4L364.7 313.7L364.5 315.8L364.1 317.7L363.3 319.3L362.3 320.8L361.0 322.1L359.4 323.3L357.6 324.5L355.4 325.7L352.9 327.0M163.4 262.6L166.3 259.7L169.4 256.9L172.8 254.1L176.4 251.6L180.2 249.3L184.2 247.3L188.3 245.6L192.6 244.2L197.0 243.1L201.5 242.3L206.2 241.8L211.1 241.6L216.1 241.5L221.2 241.6L226.4 241.7L231.8 241.9L237.2 242.0L242.8 242.1L248.3 242.0L253.9 241.8L259.5 241.5L265.1 241.2L270.7 240.7L276.2 240.2L281.7 239.8L287.0 239.5L292.3 239.3L297.4 239.3L302.4 239.6L307.3 240.2L312.1 241.1L316.8 242.4L321.4 244.0L325.8 245.9L330.0 248.0L334.1 250.4L338.0 253.0L341.7 255.7L345.2 258.4L348.4 261.1L351.3 263.7L354.0 266.1L356.3 268.4L358.4 270.5L360.1 272.4L361.5 274.1L362.6 275.6L363.4 277.0L363.9 278.3L364.0 279.6L363.9 280.9L363.5 282.3L362.8 283.9L361.9 285.7L360.7 287.7L359.3 289.9L357.7 292.4L355.9 295.0L353.8 297.8L351.5 300.7M173.5 234.0L175.9 232.3L178.4 230.9L181.0 229.8L183.8 228.8L186.9 227.9L190.1 227.2L193.5 226.5L197.2 225.9L201.2 225.2L205.3 224.5L209.7 223.7L214.3 222.8L219.0 221.8L223.9 220.7L228.9 219.6L233.9 218.5L239.0 217.3L244.1 216.3L249.2 215.4L254.3 214.6L259.3 214.1L264.3 213.8L269.3 213.8L274.2 214.0L279.1 214.5L284.0 215.3L288.9 216.3L293.8 217.6L298.6 219.1L303.4 220.7L308.0 222.5L312.6 224.3L317.0 226.1L321.2 227.8L325.2 229.5L328.9 231.0L332.3 232.5L335.5 233.7L338.3 234.9L340.9 236.0L343.1 237.1L345.0 238.1L346.7 239.2L348.1 240.4L349.4 241.7L350.4 243.2L351.3 244.9L352.1 246.8L352.7 248.9L353.3 251.3L353.6 253.9L353.8 256.7L353.8 259.6L353.5 262.6L352.9 265.5L352.1 268.4L350.8 271.1L349.3 273.6L347.4 275.9L345.1 277.9M185.7 218.3L187.3 217.3L189.2 216.3L191.4 215.1L194.0 213.9L196.9 212.5L200.1 211.1L203.5 209.6L207.2 208.1L211.0 206.6L214.9 205.2L218.9 203.9L222.9 202.6L226.9 201.6L231.0 200.6L234.9 199.9L238.9 199.4L242.9 199.0L246.8 198.9L250.9 198.9L254.9 199.1L259.1 199.5L263.3 200.0L267.5 200.6L271.8 201.2L276.1 202.0L280.4 202.8L284.7 203.5L288.8 204.3L292.8 205.0L296.6 205.6L300.2 206.2L303.5 206.8L306.7 207.3L309.5 207.9L312.2 208.5L314.7 209.2L317.0 210.0L319.2 210.9L321.4 212.0L323.5 213.3L325.5 214.7L327.6 216.3L329.7 218.2L331.7 220.2L333.6 222.3L335.4 224.6L337.0 226.9L338.4 229.3L339.5 231.6L340.2 233.9L340.6 236.0L340.6 238.0L340.1 239.7L339.3 241.2L338.1 242.5L336.5 243.6L334.6 244.5L332.5 245.3L330.1 246.1L327.7 246.7M204.9 205.1L207.1 203.7L209.4 202.3L211.9 201.0L214.5 199.8L217.1 198.6L219.6 197.6L222.1 196.7L224.5 195.9L226.8 195.2L229.1 194.6L231.4 194.1L233.6 193.6L235.9 193.3L238.4 193.0L240.9 192.8L243.6 192.6L246.4 192.5L249.3 192.4L252.4 192.4L255.6 192.4L258.7 192.4L261.9 192.4L265.0 192.5L268.0 192.6L271.0 192.7L273.7 192.8L276.3 193.0L278.8 193.3L281.1 193.6L283.4 194.0L285.6 194.5L287.8 195.0L290.0 195.7L292.3 196.4L294.7 197.2L297.1 198.2L299.6 199.3L302.2 200.4L304.7 201.7L307.1 203.1L309.4 204.5L311.5 205.9L313.3 207.3L314.7 208.6L315.8 209.9L316.6 211.1L316.9 212.2L316.9 213.1L316.5 214.0L315.8 214.7L314.9 215.4L313.9 216.1L312.8 216.8L311.6 217.5L310.5 218.3L309.5 219.2L308.5 220.2L307.7 221.4L306.9 222.7L306.1 224.2M228.5 382.5L227.1 380.4L225.4 378.4L223.3 376.5L220.7 374.9L217.6 373.4L214.6 372.0L211.8 370.3L209.7 368.2L208.4 365.7L207.6 362.9M249.2 377.1L247.7 375.1L245.7 373.1L243.6 371.1L242.1 368.9L241.4 366.6L241.6 364.1L242.5 361.5L243.5 358.8L243.9 356.2L243.1 353.7M268.9 377.4L269.3 375.3L270.4 373.2L272.3 371.1L274.7 369.1L276.9 367.0L278.5 364.8L279.2 362.4L278.8 359.7L277.9 357.0L277.0 354.2M288.0 383.2L291.1 382.0L294.0 380.7L296.6 379.1L298.6 377.2L300.2 374.9L301.4 372.4L302.7 369.9L304.5 367.6L306.9 365.7L309.9 364.1M294.5 393.1L297.4 392.0L300.3 390.5L303.1 388.8L305.8 387.2L308.5 385.8L311.1 384.8L313.7 384.0L316.2 383.4L318.6 382.5L321.0 381.1M224.7 356.7L222.2 354.6L219.1 352.5L216.1 350.5L213.8 348.2L212.7 345.5L212.8 342.4L213.7 339.2L214.6 335.9L214.7 332.8L213.4 330.1M257.4 353.0L256.5 350.4L257.0 347.7L258.7 345.0L261.1 342.2L263.3 339.5L264.4 336.7L264.0 333.9L262.2 330.9L259.6 328.0L257.3 325.1M296.1 358.2L299.2 356.3L302.1 354.3L304.1 352.0L304.9 349.3L304.8 346.2L304.2 342.9L303.8 339.8L304.4 336.9L306.2 334.3L309.2 332.1M319.6 373.0L321.8 370.8L323.6 368.1L325.2 365.1L326.8 362.4L328.7 360.1L331.1 358.3L333.8 356.9L336.4 355.6L338.8 354.1L340.7 351.9M318.0 387.0L320.7 385.1L323.0 383.7L324.9 382.6L326.3 381.9L327.5 381.3L328.9 380.2L330.8 378.6L333.2 376.3L335.9 373.6L338.6 370.7M193.1 337.1L190.4 335.0L187.3 333.2L184.4 331.4L182.2 329.1L181.2 326.3L181.2 322.9L181.9 319.1L182.7 315.4L182.8 312.0L181.6 309.3M230.9 326.8L229.3 324.0L229.4 321.0L231.0 317.8L233.3 314.5L235.4 311.3L236.2 308.2L235.2 305.2L232.6 302.5L229.2 299.8L226.2 297.2M285.7 327.0L288.9 324.5L291.6 321.9L293.0 319.1L292.7 316.0L291.0 312.7L288.6 309.3L286.7 306.0L286.3 302.9L287.7 300.0L290.6 297.4M330.7 341.9L331.6 338.8L331.8 335.4L331.5 331.7L331.6 328.3L332.5 325.4L334.5 323.1L337.3 321.2L340.1 319.5L342.3 317.5L343.6 314.9M342.9 360.0L344.7 357.0L346.5 354.7L348.2 353.1L349.8 351.9L351.2 350.7L352.5 349.1L353.9 346.8L355.3 343.7L356.7 340.0L358.0 336.2M198.3 303.0L196.7 300.4L196.7 297.3L198.1 293.7L200.4 290.0L202.5 286.5L203.2 283.3L202.2 280.5L199.8 278.2L196.6 276.1L194.0 273.9M259.7 295.1L263.0 292.2L265.7 289.2L266.7 286.2L265.6 283.2L262.9 280.2L259.5 277.1L256.8 274.2L255.8 271.3L257.0 268.3L259.9 265.5M323.4 305.1L323.1 301.8L321.4 298.1L319.4 294.4L318.0 290.9L317.9 287.8L319.6 285.3L322.4 283.1L325.4 281.1L327.5 278.9L328.2 276.2M353.3 323.6L353.7 320.0L354.6 317.2L356.0 315.2L357.8 313.7L359.4 312.2L360.6 310.3L361.2 307.6L361.3 304.1L360.8 300.1L360.2 296.0M352.9 348.8L352.9 347.6L352.7 346.3L352.9 344.5L353.7 341.9L355.3 338.5L357.1 334.7L358.7 330.8L359.8 327.5L360.1 324.9L359.8 323.0M170.3 283.7L169.3 281.3L169.6 278.2L171.1 274.6L173.2 270.7L175.2 267.0L176.2 263.9L175.8 261.4L174.4 259.6L172.5 258.1L171.2 256.4M226.5 267.3L229.8 264.1L232.4 261.0L233.3 258.1L232.2 255.4L229.4 253.0L226.1 250.7L223.5 248.4L222.7 245.9L223.9 243.1L226.8 240.2M299.7 268.9L298.3 265.8L295.5 262.5L292.3 259.3L289.9 256.2L289.3 253.4L290.8 250.9L293.6 248.6L296.8 246.5L298.9 244.3L299.2 241.8M345.1 283.7L344.1 280.2L344.1 277.3L345.3 275.2L347.2 273.5L349.0 271.9L350.0 269.9L349.9 267.3L348.7 264.0L346.6 260.2L344.3 256.5M365.3 309.5L365.5 308.1L365.5 306.7L365.4 304.7L365.5 301.9L365.6 298.2L365.6 294.1L365.4 290.0L365.1 286.5L364.7 283.8L364.2 282.0M196.8 246.2L200.0 242.9L202.6 239.8L203.8 237.2L203.2 235.0L201.4 233.3L199.2 231.8L197.7 230.2L197.6 228.2L199.2 225.8L202.1 223.1M266.9 238.5L265.3 236.0L262.3 233.5L258.9 231.1L256.5 228.8L255.9 226.5L257.4 224.3L260.3 222.1L263.5 220.1L265.7 218.1L266.1 216.2M320.9 246.8L318.8 243.8L318.2 241.3L319.3 239.3L321.3 237.6L323.3 236.1L324.3 234.3L323.7 232.1L321.6 229.5L318.5 226.5L315.3 223.7M359.2 268.6L359.6 267.3L359.8 265.9L359.6 264.0L358.7 261.3L357.3 257.9L355.6 254.2L353.7 250.5L352.0 247.4L351.0 245.1L350.4 243.6M355.8 298.6L355.5 295.6L355.8 291.9L356.3 287.8L356.5 283.9L356.1 280.6L355.0 278.1L353.2 276.3L351.1 274.8L348.9 273.2L347.2 271.0M180.2 231.7L183.2 228.5L185.8 225.7L187.5 223.5L188.1 221.9L187.8 220.7L187.4 219.8L187.5 218.8L188.6 217.3L190.7 215.3L193.6 213.0M235.7 217.0L234.7 215.2L232.4 213.6L230.0 212.2L228.4 210.7L228.5 209.1L230.3 207.3L233.2 205.5L236.3 203.8L238.7 202.2L239.5 200.9M288.3 218.0L286.0 215.8L285.4 214.0L286.6 212.3L288.7 211.0L290.7 209.7L291.8 208.4L291.2 206.8L289.1 205.1L286.1 203.4L283.0 201.7M336.7 232.5L337.3 231.4L337.7 230.3L337.3 228.8L335.8 226.7L333.4 224.1L330.4 221.2L327.5 218.6L325.1 216.4L323.7 214.8L323.0 213.7M354.6 259.0L353.2 256.3L352.0 252.9L350.6 249.2L349.0 245.8L347.4 243.0L345.6 240.9L343.8 239.6L341.9 238.5L339.8 237.3L337.8 235.6M216.2 204.7L216.3 203.7L215.6 202.9L214.8 202.3L214.8 201.5L215.8 200.6L218.0 199.4L221.0 198.0L224.0 196.8L226.5 195.8L228.1 195.1M258.2 200.0L256.6 198.9L256.5 197.7L257.8 196.7L260.0 195.8L262.1 194.9L263.3 194.2L263.2 193.5L261.9 192.8L259.9 192.2L258.0 191.7M305.4 206.4L306.1 205.7L306.6 205.0L306.2 204.1L304.6 202.9L302.0 201.4L298.9 199.8L295.8 198.4L293.5 197.4L292.2 196.7L291.7 196.3M336.0 225.4L333.9 223.4L331.4 220.9L328.7 218.3L325.9 215.9L323.4 214.0L321.3 212.7L319.5 211.9L317.8 211.4L315.8 210.7L313.5 209.8M333.6 243.5L332.4 240.4L330.6 237.8L328.3 235.9L325.6 234.5L322.7 233.2L319.8 231.8L317.3 230.0L315.3 227.8L313.6 225.3L311.8 222.7\"/>\n<path class=\"b5-pore\" d=\"M359.0 273.7C358.9 273.1 358.6 271.8 358.3 271.1C358.0 270.4 357.4 269.5 357.1 269.1C356.8 268.8 356.3 268.7 356.1 268.9C355.9 269.1 355.8 269.9 355.9 270.6C355.9 271.2 356.3 272.5 356.6 273.2C356.8 273.9 357.4 274.9 357.8 275.2C358.1 275.5 358.6 275.7 358.8 275.4C359.0 275.2 359.1 274.4 359.0 273.7ZM220.2 294.2C220.1 293.5 219.3 292.4 218.7 292.0C218.1 291.7 216.7 291.4 215.8 291.6C215.0 291.7 213.8 292.4 213.3 293.0C212.8 293.6 212.4 294.9 212.5 295.6C212.6 296.3 213.3 297.4 213.9 297.8C214.6 298.2 216.0 298.4 216.8 298.3C217.6 298.1 218.9 297.4 219.4 296.8C219.9 296.2 220.3 294.9 220.2 294.2Z\"/>\n<path class=\"a5-t2\" d=\"M264.2 218.4C264.3 217.2 262.9 215.2 261.4 214.4C259.9 213.5 256.5 212.8 254.3 212.8C252.2 212.8 248.7 213.7 247.2 214.6C245.7 215.5 244.2 217.4 244.2 218.6C244.2 219.9 245.6 221.8 247.1 222.6C248.5 223.5 252.0 224.2 254.1 224.2C256.2 224.2 259.7 223.3 261.2 222.4C262.7 221.6 264.2 219.6 264.2 218.4Z\"/><path class=\"a5-gran\" d=\"M256.7 219.7a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0 -2.6 0M252.4 220.9a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0 -2.6 0M254.4 219.5a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0 -2.6 0M256.3 219.0a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0 -2.6 0M256.9 218.4a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0 -2.6 0M253.7 217.0a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0 -2.6 0\"/>\n<path class=\"a5-mac\" d=\"M331.2 340.8C332.0 339.1 329.2 334.8 328.7 332.8C328.2 330.9 328.2 328.9 327.7 327.0C327.2 325.0 326.4 319.7 325.0 319.4C323.5 319.1 319.2 323.5 317.5 324.9C315.8 326.4 314.8 328.3 313.0 329.8C311.3 331.2 305.6 333.5 305.1 335.1C304.5 336.8 308.2 340.1 309.2 341.7C310.2 343.2 311.2 344.6 312.3 346.1C313.4 347.6 315.4 352.3 317.0 352.1C318.5 351.9 321.3 346.3 323.3 344.7C325.3 343.1 330.4 342.5 331.2 340.8Z\"/><path class=\"a5-mac-nuc\" d=\"M315.0 336.1C314.9 337.2 315.7 338.5 316.5 338.9C317.3 339.4 319.3 339.5 320.3 339.1C321.3 338.7 322.7 337.1 322.9 336.2C323.1 335.3 322.4 333.7 321.7 333.3C321.0 333.0 319.1 334.1 318.4 333.9C317.7 333.7 317.6 331.6 317.1 331.9C316.6 332.3 315.1 335.1 315.0 336.1Z\"/>\n<path class=\"b5-bowl-shade\" d=\"M353.2 319.5L353.0 326.0L352.4 332.3L351.4 338.4L349.9 344.4L348.1 350.2L345.9 355.8L343.3 361.1L340.4 366.2L337.1 371.0L333.5 375.4L329.5 379.6L325.2 383.4L320.7 386.8L315.8 389.9L310.7 392.5L305.4 394.8L299.9 396.7L294.2 398.1L288.4 399.1L282.4 399.7L276.3 399.9L270.1 399.6L263.9 398.9L257.7 397.7L251.4 396.2L245.2 394.2L239.0 391.8L232.9 389.0L227.0 385.8L221.1 382.3L215.4 378.4L209.9 374.2L204.6 369.6L199.5 364.7L194.7 359.6L190.1 354.2L185.8 348.5L181.9 342.7L178.2 336.6L174.9 330.4L172.0 324.1L169.4 317.6L167.2 311.1L165.4 304.5L164.0 297.9L163.0 291.3L162.3 284.7L162.1 278.2L162.3 271.8L163.0 265.5L164.0 259.3L165.4 253.3L167.2 247.6L169.4 242.0L172.0 236.6L174.9 231.6L178.2 226.8L181.9 222.3L185.8 218.2L190.1 214.4L194.7 211.0L199.5 207.9L204.6 205.2L209.9 203.0L215.4 201.1L221.1 199.7L227.0 198.7L232.9 198.1L239.0 197.9L245.2 198.2L251.4 198.9L257.7 200.0L263.9 201.6L270.1 203.6L276.3 206.0L282.4 208.8L288.4 211.9L294.2 215.5L299.9 219.4L305.4 223.6L310.7 228.2L315.8 233.0L320.7 238.2L325.2 243.6L329.5 249.3L333.5 255.1L337.1 261.2L340.4 267.4L343.3 273.7L345.9 280.2L348.1 286.7L349.9 293.3L351.4 299.9L352.4 306.5L353.0 313.0Z\"/>\n</g>\n<g class=\"b5-front\" transform=\"matrix(0.8845 0.1913 0.0000 0.9152 -7.69 38.33)\">\n  <defs><mask id=\"b5-frontmask\" maskUnits=\"userSpaceOnUse\" x=\"18\" y=\"38\" width=\"564\" height=\"344\">\n<rect x=\"18\" y=\"38\" width=\"564\" height=\"344\" fill=\"#fff\"/>\n<circle cx=\"300\" cy=\"222\" r=\"124\" fill=\"#000\"/>\n<rect x=\"258\" y=\"36\" width=\"84\" height=\"182\" fill=\"#000\"/>\n<path d=\"M-30.0 150.0L-27.7 150.0L-25.5 150.0L-23.2 150.1L-21.7 150.1L-19.5 150.2L-17.2 150.2L-15.8 150.3L-13.5 150.4L-11.3 150.5L-9.0 150.6L-7.5 150.7L-5.3 150.9L-3.1 151.0L-0.9 151.2L0.6 151.3L2.8 151.5L5.1 151.7L6.5 151.9L8.7 152.1L10.9 152.4L13.1 152.6L14.6 152.8L16.8 153.1L19.0 153.4L21.2 153.7L23.3 154.0L24.8 154.3L26.9 154.6L29.1 155.0L31.3 155.3L32.7 155.6L34.8 156.0L37.0 156.4L39.1 156.8L41.2 157.3L42.6 157.6L44.7 158.0L46.8 158.5L48.9 159.0L51.0 159.5L53.1 160.0L54.5 160.3L56.6 160.9L58.6 161.4L60.7 162.0L62.7 162.5L64.8 163.1L66.8 163.7L68.8 164.3L70.1 164.7L72.1 165.3L74.1 166.0L76.1 166.6L78.1 167.3L80.1 168.0L82.0 168.7L84.0 169.4L85.9 170.1L87.8 170.8L89.7 171.6L91.6 172.3L93.5 173.1L95.4 173.8L97.3 174.6L99.1 175.4L101.0 176.2L102.8 177.1L104.6 177.9L106.4 178.8L108.2 179.6L110.0 180.5L111.8 181.4L113.5 182.3L115.3 183.2L117.0 184.1L119.3 185.3L121.0 186.3L122.7 187.2L124.3 188.2L126.0 189.2L127.6 190.2L129.8 191.5L131.4 192.5L133.0 193.6L134.6 194.6L136.1 195.6L138.2 197.1L139.7 198.1L141.2 199.2L142.7 200.3L144.7 201.8L146.1 202.9L147.6 204.1L149.5 205.6L150.9 206.8L152.2 207.9L154.1 209.5L155.4 210.7L157.2 212.3L158.5 213.6L159.7 214.8L161.4 216.4L162.7 217.7L164.3 219.4L165.5 220.7L167.0 222.4L168.2 223.7L169.7 225.5L170.8 226.8L172.3 228.6L173.3 229.9L174.7 231.8L175.7 233.1L177.0 235.0L178.3 236.9L179.2 238.3L180.4 240.2L181.3 241.6L182.5 243.5L183.6 245.5L184.4 247.0L185.4 248.9L186.4 250.9L187.1 252.4L188.1 254.5L189.0 256.5L189.6 258.0L190.4 260.1L191.0 261.7M409.0 261.7L409.8 259.6L410.6 257.5L411.3 256.0L412.2 253.9L413.1 251.9L413.8 250.4L414.8 248.4L415.9 246.5L416.7 245.0L417.8 243.0L419.0 241.1L419.9 239.7L421.1 237.8L422.0 236.4L423.3 234.5L424.6 232.7L425.7 231.3L427.0 229.5L428.1 228.1L429.6 226.3L430.7 225.0L432.2 223.3L433.3 222.0L434.9 220.2L436.1 219.0L437.7 217.3L439.0 216.0L440.7 214.4L442.0 213.1L443.3 211.9L445.0 210.3L446.4 209.1L448.2 207.6L449.6 206.4L451.0 205.2L452.9 203.7L454.4 202.6L455.8 201.4L457.8 200.0L459.3 198.9L460.8 197.8L462.3 196.7L464.4 195.3L466.0 194.3L467.5 193.2L469.1 192.2L470.8 191.2L472.9 189.8L474.6 188.9L476.2 187.9L477.9 186.9L479.6 186.0L481.3 185.0L483.6 183.8L485.3 182.9L487.1 182.0L488.8 181.1L490.6 180.2L492.4 179.3L494.2 178.5L496.0 177.6L497.8 176.8L499.7 176.0L501.5 175.2L503.4 174.4L505.2 173.6L507.1 172.8L509.0 172.1L510.9 171.3L512.8 170.6L514.8 169.9L516.7 169.1L518.6 168.4L520.6 167.8L522.6 167.1L524.5 166.4L526.5 165.8L528.5 165.1L530.5 164.5L531.9 164.1L533.9 163.5L535.9 162.9L538.0 162.3L540.0 161.8L542.1 161.2L544.1 160.7L546.2 160.1L547.6 159.8L549.7 159.3L551.8 158.8L553.9 158.3L556.0 157.9L558.1 157.4L559.5 157.1L561.6 156.7L563.7 156.3L565.9 155.9L568.0 155.5L569.5 155.2L571.6 154.8L573.8 154.5L576.0 154.1L577.4 153.9L579.6 153.6L581.8 153.3L583.9 153.0L586.1 152.7L587.6 152.5L589.8 152.3L592.0 152.0L594.2 151.8L595.7 151.7L597.9 151.4L600.1 151.3L601.6 151.1L603.8 151.0L606.1 150.8L608.3 150.7L609.8 150.6L612.0 150.5L614.3 150.3L616.5 150.3L618.0 150.2L620.2 150.1L622.5 150.1L624.0 150.1L626.2 150.0L628.5 150.0L630.0 150.0\" fill=\"none\" stroke=\"#000\" stroke-width=\"40\" stroke-linecap=\"round\"/>\n</mask><clipPath id=\"a5-air\"><circle cx=\"300\" cy=\"222\" r=\"102\"/></clipPath><clipPath id=\"b5-frontclip\"><rect x=\"20\" y=\"-20\" width=\"560\" height=\"400\"/></clipPath></defs>\n  <g clip-path=\"url(#b5-frontclip)\"><path class=\"b5-tissue\" fill-rule=\"evenodd\" d=\"M20 40H580V380H20ZM192.0 222.0a108 108 0 1 0 216 0a108 108 0 1 0 -216 0M270 40H330V124.0H270Z\"/>\n<g mask=\"url(#b5-frontmask)\"><path class=\"b5-air\" d=\"M65.0 159.2Q70.0 150.5 79.7 148.1L88.0 146.0Q97.7 143.6 107.6 144.5L128.4 146.3Q138.4 147.2 146.3 153.4L154.3 159.6Q160.7 164.6 165.5 171.1L168.7 175.4Q172.2 180.1 174.6 185.4L175.5 187.5Q178.0 192.8 173.6 196.7L112.6 251.5Q110.3 253.6 107.3 254.6L106.2 254.9Q103.3 255.9 100.4 254.6L35.3 225.4Q33.1 224.4 32.3 222.1L32.0 221.2Q31.2 218.9 32.4 216.8ZM144.5 41.5Q146.7 40.0 149.3 40.0L152.1 40.0Q156.1 40.0 160.0 40.5L204.2 46.1Q214.1 47.4 221.9 53.7L236.9 66.0Q244.6 72.4 244.5 82.4L244.3 109.8Q244.2 119.8 235.0 123.7L171.9 150.5Q162.6 154.4 154.8 148.3L150.8 145.2Q143.0 139.1 138.6 130.1L134.9 122.3Q130.5 113.3 130.5 103.3L130.3 62.6Q130.2 55.6 134.9 50.5L139.6 45.4Q141.4 43.5 143.6 42.0ZM482.3 379.2Q485.5 380.0 482.2 380.0L418.5 380.0Q413.4 380.0 416.8 376.3L419.3 373.6Q421.6 371.1 424.4 369.3L425.5 368.6Q428.3 366.8 431.6 367.5L474.9 377.4Q478.0 378.1 481.1 378.9ZM570.3 89.8Q580.0 87.6 580.0 97.6L580.0 193.0Q580.0 198.6 575.2 195.7L573.4 194.7Q568.6 191.8 566.5 186.7L537.4 114.3Q534.3 106.6 540.8 101.6L543.3 99.6Q549.8 94.6 557.9 92.7ZM546.0 49.6Q543.1 40.0 553.1 40.0L570.0 40.0Q580.0 40.0 580.0 50.0L580.0 66.8Q580.0 76.8 570.3 79.1L565.6 80.2Q555.8 82.5 552.9 72.9ZM572.0 272.6Q580.0 266.6 580.0 276.6L580.0 349.4Q580.0 359.4 570.7 355.8L545.0 345.9Q538.9 343.6 533.5 340.0L531.4 338.6Q526.0 335.0 525.7 328.5L525.2 318.3Q524.8 308.3 532.7 302.3ZM141.3 378.1Q141.5 380.0 139.6 380.0L138.8 380.0Q136.9 380.0 135.3 379.1L89.9 353.5Q81.2 348.6 85.7 339.7L105.9 300.1Q110.4 291.2 120.2 292.8L123.9 293.5Q133.7 295.1 134.6 304.9ZM253.2 370.4Q256.2 380.0 246.2 380.0L198.6 380.0Q188.6 380.0 197.5 375.4L238.1 354.6Q247.0 350.0 249.9 359.6ZM25.5 137.5Q20.0 143.1 20.0 135.3L20.0 96.8Q20.0 86.8 22.9 96.3L30.7 122.1Q33.0 129.6 27.5 135.3ZM49.7 373.5Q49.9 380.0 43.4 380.0L29.6 380.0Q20.0 380.0 20.0 370.4L20.0 366.7Q20.0 357.0 29.3 359.4L43.1 362.9Q49.4 364.5 49.6 371.0ZM96.3 375.1Q105.0 380.0 95.0 380.0L73.1 380.0Q65.8 380.0 65.5 372.7L65.2 364.8Q65.1 362.6 67.1 361.6L67.9 361.2Q69.9 360.2 71.8 361.3ZM393.5 374.8Q396.6 380.0 390.5 380.0L388.2 380.0Q382.2 380.0 377.9 375.7L341.3 339.1Q334.2 332.1 333.0 322.1L325.7 266.5Q324.4 256.6 329.5 265.2ZM521.5 123.5Q528.1 115.9 531.8 125.2L554.7 182.1Q558.4 191.4 548.8 194.3L501.0 209.0Q491.8 211.8 484.1 205.9L479.6 202.4Q473.6 197.8 473.0 190.1L472.8 187.2Q472.3 179.6 477.4 173.8ZM464.7 44.6Q468.2 44.8 470.0 47.8L477.1 59.3Q482.3 67.8 472.8 64.9L463.5 62.1Q457.0 60.1 458.2 53.4L459.3 47.6Q459.9 44.2 463.4 44.5ZM312.8 83.0Q312.2 73.0 319.3 80.0L361.3 122.0Q368.4 129.1 363.3 137.7L354.8 151.8Q349.6 160.4 341.1 165.6L327.0 174.4Q318.5 179.7 317.9 169.7ZM459.6 207.9Q468.5 205.5 475.8 211.1L478.6 213.3Q485.9 218.9 485.2 228.0L482.9 258.7Q482.2 268.7 473.5 263.7L411.7 228.4Q403.0 223.4 412.7 220.8ZM29.6 42.3Q35.0 40.0 40.9 40.0L80.5 40.0Q90.5 40.0 99.9 43.6L114.9 49.3Q117.3 50.2 118.9 52.2L119.5 53.0Q121.0 55.1 121.0 57.6L121.3 101.1Q121.3 111.1 113.9 117.8L102.3 128.1Q94.9 134.8 85.1 137.2L76.8 139.3Q67.1 141.7 58.3 136.8L50.8 132.7Q42.0 127.8 39.2 118.2L20.6 57.0Q20.0 55.0 20.0 52.9L20.0 52.1Q20.0 50.0 20.9 48.2L21.2 47.4Q22.1 45.6 23.9 44.8ZM492.0 48.5Q486.8 40.0 496.8 40.0L515.1 40.0Q525.1 40.0 527.9 49.6L538.6 85.2Q540.2 90.3 535.9 93.6L534.3 94.8Q530.1 98.1 525.9 94.8L521.5 91.1Q515.2 86.1 511.0 79.2ZM576.0 368.2Q580.0 369.7 580.0 374.0L580.0 375.7Q580.0 380.0 575.7 380.0L499.8 380.0Q499.0 380.0 498.8 379.3L498.7 379.0Q498.5 378.2 499.0 377.6L503.8 371.7Q507.6 366.9 513.5 365.7L539.6 360.0Q549.4 357.9 558.8 361.5ZM29.7 348.5Q20.0 346.1 20.0 336.1L20.0 259.6Q20.0 251.0 24.7 243.7L26.4 240.9Q31.1 233.6 39.0 237.1L91.5 260.7Q98.6 263.9 100.7 271.5L101.5 274.4Q103.5 281.9 100.0 288.9L71.7 344.5Q69.2 349.5 64.1 352.1L62.2 353.0Q57.1 355.5 51.6 354.1ZM516.2 99.5Q524.0 105.8 517.4 113.3L471.0 166.3Q464.4 173.8 454.5 172.1L375.5 158.5Q365.7 156.8 370.8 148.3L382.1 129.4Q387.3 120.9 395.0 114.6L439.3 78.6Q447.0 72.3 456.6 75.2L494.4 86.7Q504.0 89.6 511.8 95.9ZM418.1 41.1Q426.1 40.0 434.2 40.0L437.3 40.0Q445.4 40.0 443.9 48.0L442.5 55.4Q440.7 65.2 432.9 71.5L397.3 100.4Q389.5 106.7 382.5 99.6L342.4 59.6Q335.3 52.6 345.2 51.2ZM477.3 290.0Q486.1 285.2 493.8 291.6L507.5 303.0Q515.2 309.4 515.6 319.4L516.0 325.8Q516.4 335.2 511.8 343.4L509.4 347.8Q505.5 354.7 500.6 360.9L498.7 363.3Q493.7 369.5 486.1 367.2L440.2 353.9Q430.6 351.1 427.8 341.5L424.6 330.2Q421.8 320.6 430.5 315.7ZM574.1 207.0Q580.0 210.5 580.0 217.4L580.0 244.0Q580.0 254.0 572.0 260.0L528.6 292.8Q520.6 298.8 512.9 292.4L502.4 283.6Q494.7 277.2 495.4 267.3L497.9 232.7Q498.7 222.8 508.2 219.8L559.2 204.2Q565.8 202.2 571.8 205.7ZM355.2 372.9Q362.3 380.0 352.3 380.0L307.4 380.0Q297.4 380.0 304.8 373.2L323.8 355.7Q331.2 349.0 338.3 356.0ZM243.5 42.8Q248.3 40.0 253.7 40.0L259.6 40.0Q267.8 40.0 261.2 44.9L251.8 51.7Q247.3 55.0 243.0 51.5L241.3 50.0Q237.0 46.6 241.7 43.8ZM289.9 54.9Q298.0 49.0 298.5 58.9L306.3 189.7Q306.3 189.7 306.3 189.7L306.3 189.7Q306.3 189.7 306.3 189.7L262.6 125.9Q256.9 117.6 257.0 107.6L257.2 88.7Q257.3 78.7 265.3 72.8ZM273.5 378.9Q272.3 380.0 270.8 380.0L270.2 380.0Q268.6 380.0 267.2 379.2L266.7 378.9Q265.4 378.1 264.9 376.6L257.7 352.9Q254.8 343.3 257.9 333.8L287.4 243.3Q289.0 238.4 292.3 234.3L296.3 229.2Q296.7 228.7 297.3 228.4L297.5 228.3Q298.1 228.0 298.6 228.4L303.6 232.2Q304.1 232.6 304.6 233.2L304.8 233.4Q305.3 234.0 305.7 234.6L310.3 241.6Q313.9 247.2 314.8 253.8L323.6 321.8Q324.9 331.7 317.6 338.5ZM135.8 260.0Q129.7 252.1 137.1 245.5L177.7 209.0Q185.2 202.3 194.8 204.9L283.5 228.5Q284.9 228.8 284.0 229.9L283.7 230.3Q282.8 231.4 281.5 231.8L158.6 273.8Q149.1 277.1 142.9 269.2ZM354.0 266.7Q345.6 261.3 337.7 255.1L324.8 244.8Q321.8 242.4 319.7 239.2L316.9 234.8Q316.8 234.8 316.8 234.7L316.8 234.7Q316.8 234.6 316.8 234.6L325.7 230.6Q332.2 227.7 339.3 227.6L345.4 227.6Q355.0 227.5 363.3 232.2L444.8 278.9Q453.5 283.8 444.7 288.7L423.1 300.5Q414.4 305.4 405.9 300.0ZM166.1 378.2Q162.7 380.0 158.8 380.0L157.3 380.0Q153.4 380.0 153.1 376.1L146.2 301.8Q145.3 291.9 154.8 288.6L265.2 250.9Q274.7 247.7 271.6 257.2L248.4 328.1Q245.3 337.6 236.4 342.2ZM200.5 166.6Q191.1 163.1 200.3 159.2L236.5 143.9Q245.8 140.0 251.4 148.2L280.3 190.4Q285.9 198.6 276.6 195.1ZM49.7 145.0Q56.8 149.0 52.8 156.0L24.6 205.8Q23.6 207.6 22.1 206.2L21.5 205.7Q20.0 204.3 20.0 202.2L20.0 170.4Q20.0 160.4 26.9 153.2L34.4 145.4Q40.0 139.6 47.0 143.5ZM316.0 194.2Q317.4 191.2 320.1 189.5L345.0 174.1Q353.5 168.8 363.3 170.5L455.4 186.4Q457.3 186.7 457.5 188.6L457.5 189.3Q457.6 191.2 455.8 191.7L367.6 215.8Q358.8 218.2 349.7 218.3L346.3 218.3Q337.2 218.4 330.3 212.4L316.5 200.4Q314.1 198.2 315.5 195.3Z\" fill=\"url(#b5-cav)\"/></g>\n<path class=\"b5-cap-a\" d=\"M104.3 139.8a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M145.1 149.1a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M166.9 169.1a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M126.6 242.3a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M72.0 248.2a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M53.5 240.0a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M35.6 231.8a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M38.8 191.4a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M221.1 49.5a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M236.3 62.2a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M245.9 101.4a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M179.8 151.0a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M122.9 104.4a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M122.8 64.4a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M129.9 45.9a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M435.4 364.3a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M557.8 185.2a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M535.8 129.5a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M535.6 97.5a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M569.3 83.3a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M545.6 75.2a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M540.3 56.0a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M548.6 353.3a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M525.9 342.4a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M517.8 326.3a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M542.1 287.2a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M558.4 275.1a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M106.5 369.8a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M78.4 338.5a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M87.2 320.7a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M96.6 302.9a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M135.9 303.6a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M138.1 323.5a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M139.7 343.4a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M191.5 371.8a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M209.1 362.7a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M227.2 353.5a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M24.3 94.1a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M29.9 113.2a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M26.7 354.8a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M355.4 362.7a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M341.6 348.6a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M370.4 331.1a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M390.7 365.6a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M548.1 198.4a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M529.3 204.3a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M498.0 139.7a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M511.5 124.7a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M473.8 50.1a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M451.2 50.4a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M486.6 228.2a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M485.5 248.1a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M452.0 258.3a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M114.7 120.5a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M84.1 141.4a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M517.1 96.0a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M503.9 80.8a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M493.1 63.8a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M532.2 356.3a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M102.4 271.4a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M44.6 357.8a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M388.2 111.6a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M404.1 99.0a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M419.3 86.4a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M454.0 70.5a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M376.7 103.6a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M362.9 89.5a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M340.9 46.8a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M493.0 287.4a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M508.1 300.2a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M480.7 371.4a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M421.0 343.7a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M424.5 312.2a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M459.7 292.9a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M487.7 267.9a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M298.2 370.5a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M255.2 370.8a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M159.4 277.4a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M136.9 272.8a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M401.4 304.4a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M419.1 176.0a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0\"/><path class=\"b5-cap-v\" d=\"M124.0 141.6a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M90.5 256.4a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M28.6 208.8a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M246.3 81.4a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M122.6 84.4a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M454.7 368.8a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M554.9 88.1a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M566.9 360.5a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M526.4 299.2a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M88.8 360.0a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M117.1 288.2a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M141.9 363.4a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M251.0 357.3a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M51.5 373.4a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M380.2 348.3a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M510.0 210.1a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M469.7 69.6a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M469.0 268.2a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M529.2 47.3a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M512.2 360.5a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M432.1 173.4a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M435.2 73.8a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0M348.5 75.3a3.06 3.06 0 1 0 6.12 0a3.06 3.06 0 1 0 -6.12 0M513.2 345.3a2.8200000000000003 2.8200000000000003 0 1 0 5.640000000000001 0a2.8200000000000003 2.8200000000000003 0 1 0 -5.640000000000001 0M441.8 302.5a3.18 3.18 0 1 0 6.36 0a3.18 3.18 0 1 0 -6.36 0M312.7 357.0a2.9400000000000004 2.9400000000000004 0 1 0 5.880000000000001 0a2.9400000000000004 2.9400000000000004 0 1 0 -5.880000000000001 0M431.8 267.7a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0\"/>\n<path class=\"b5-duct\" d=\"M270 39H330V124.0H270Z\" fill=\"url(#b5-trough)\"/>\n<path class=\"a5-duct-ring\" d=\"M272 52.0Q300 59.0 328 52.0M272 67.0Q300 74.0 328 67.0M272 82.0Q300 89.0 328 82.0M272 97.0Q300 104.0 328 97.0M272 112.0Q300 119.0 328 112.0\"/>\n<path class=\"b5-knob\" d=\"M262.1 49.0a3.4 2.4 0 1 0 6.8 0a3.4 2.4 0 1 0 -6.8 0ZM331.1 49.0a3.4 2.4 0 1 0 6.8 0a3.4 2.4 0 1 0 -6.8 0ZM262.1 66.0a3.4 2.4 0 1 0 6.8 0a3.4 2.4 0 1 0 -6.8 0ZM331.1 66.0a3.4 2.4 0 1 0 6.8 0a3.4 2.4 0 1 0 -6.8 0ZM262.1 83.0a3.4 2.4 0 1 0 6.8 0a3.4 2.4 0 1 0 -6.8 0ZM331.1 83.0a3.4 2.4 0 1 0 6.8 0a3.4 2.4 0 1 0 -6.8 0ZM262.1 100.0a3.4 2.4 0 1 0 6.8 0a3.4 2.4 0 1 0 -6.8 0ZM331.1 100.0a3.4 2.4 0 1 0 6.8 0a3.4 2.4 0 1 0 -6.8 0ZM262.1 117.0a3.4 2.4 0 1 0 6.8 0a3.4 2.4 0 1 0 -6.8 0ZM331.1 117.0a3.4 2.4 0 1 0 6.8 0a3.4 2.4 0 1 0 -6.8 0Z\"/>\n<path class=\"b5-duct-wall\" d=\"M270 40V118.0M330 40V118.0\"/>\n<path data-part=\"ductair\" class=\"a5-duct-air\"/>\n<path class=\"b5-sheath\" d=\"M-30.1 170.0L-27.9 170.0L-25.7 170.0L-23.6 170.0L-22.2 170.0L-20.1 170.0L-17.9 170.0L-16.6 170.1L-14.4 170.1L-12.3 170.2L-10.2 170.3L-8.8 170.3L-6.7 170.4L-4.6 170.6L-2.4 170.7L-1.1 170.8L1.0 170.9L3.2 171.1L4.5 171.2L6.6 171.4L8.7 171.6L10.8 171.8L12.1 172.0L14.2 172.2L16.3 172.5L18.4 172.7L20.4 173.0L21.8 173.2L23.8 173.5L25.9 173.8L27.9 174.1L29.3 174.3L31.3 174.7L33.3 175.0L35.3 175.4L37.4 175.8L38.7 176.0L40.7 176.4L42.7 176.8L44.7 177.3L46.6 177.7L48.6 178.2L49.9 178.4L51.9 178.9L53.8 179.4L55.8 179.9L57.7 180.4L59.6 180.9L61.5 181.4L63.4 182.0L64.7 182.3L66.6 182.9L68.5 183.5L70.3 184.1L72.2 184.6L74.0 185.3L75.9 185.9L77.7 186.5L79.5 187.1L81.3 187.8L83.1 188.5L84.9 189.1L86.7 189.8L88.4 190.5L90.2 191.2L91.9 191.9L93.7 192.7L95.4 193.4L97.1 194.1L98.8 194.9L100.4 195.7L102.1 196.4L103.8 197.2L105.4 198.0L107.0 198.8L108.6 199.7L110.8 200.8L112.3 201.6L113.9 202.5L115.5 203.3L117.0 204.2L118.5 205.1L120.5 206.3L122.0 207.2L123.5 208.1L124.9 209.0L126.4 210.0L128.3 211.3L129.7 212.2L131.1 213.2L132.4 214.1L134.3 215.5L135.6 216.5L136.9 217.4L138.6 218.8L139.9 219.8L141.1 220.8L142.8 222.3L144.0 223.3L145.7 224.8L146.8 225.8L148.0 226.9L149.5 228.4L150.6 229.4L152.1 230.9L153.1 232.0L154.6 233.6L155.6 234.6L157.0 236.2L157.9 237.3L159.3 238.9L160.2 240.0L161.5 241.7L162.3 242.8L163.5 244.4L164.7 246.0L165.5 247.2L166.6 248.9L167.3 250.0L168.4 251.7L169.4 253.4L170.1 254.6L171.0 256.3L171.9 258.1L172.5 259.3L173.3 261.0L174.2 262.8L174.7 264.0L175.4 265.9L176.0 267.3L206.0 256.1L205.4 254.4L204.5 252.1L203.8 250.2L202.8 247.9L201.8 245.6L201.0 243.8L199.9 241.5L198.7 239.3L197.8 237.5L196.6 235.3L195.3 233.2L194.3 231.4L193.0 229.3L191.9 227.7L190.5 225.6L189.1 223.5L187.9 221.9L186.4 219.8L185.2 218.2L183.7 216.3L182.4 214.7L180.8 212.8L179.5 211.2L177.8 209.4L176.5 207.9L174.7 206.0L173.3 204.5L171.5 202.7L170.1 201.3L168.7 199.9L166.8 198.1L165.3 196.8L163.3 195.0L161.8 193.7L160.3 192.4L158.3 190.7L156.7 189.4L155.1 188.2L153.0 186.5L151.4 185.3L149.7 184.1L148.1 182.9L145.9 181.3L144.2 180.1L142.5 179.0L140.8 177.8L139.0 176.7L136.7 175.3L135.0 174.1L133.2 173.1L131.4 172.0L129.6 170.9L127.8 169.9L125.4 168.5L123.5 167.5L121.6 166.5L119.8 165.5L117.9 164.5L116.0 163.6L114.1 162.6L112.1 161.7L110.2 160.8L108.3 159.8L106.3 159.0L104.3 158.1L102.3 157.2L100.4 156.3L98.3 155.5L96.3 154.7L94.3 153.8L92.3 153.0L90.2 152.3L88.2 151.5L86.1 150.7L84.0 150.0L81.9 149.2L79.8 148.5L77.7 147.8L75.6 147.1L74.2 146.6L72.1 146.0L69.9 145.3L67.8 144.6L65.6 144.0L63.4 143.4L61.3 142.8L59.1 142.2L57.6 141.8L55.4 141.2L53.2 140.7L51.0 140.1L48.8 139.6L46.6 139.1L45.1 138.7L42.8 138.3L40.6 137.8L38.3 137.3L36.1 136.9L34.6 136.6L32.3 136.1L30.0 135.7L27.8 135.3L26.2 135.1L23.9 134.7L21.6 134.3L19.3 134.0L17.0 133.6L15.5 133.4L13.2 133.1L10.9 132.8L8.5 132.5L7.0 132.4L4.6 132.1L2.3 131.9L0.7 131.7L-1.6 131.5L-4.0 131.3L-6.3 131.1L-7.9 131.0L-10.2 130.8L-12.6 130.7L-14.9 130.5L-16.6 130.4L-18.9 130.3L-21.3 130.2L-22.9 130.2L-25.2 130.1L-27.6 130.0L-29.9 130.0Z\"/><path class=\"b5-sheath\" d=\"M424.0 267.3L424.7 265.4L425.5 263.6L426.1 262.4L426.9 260.6L427.7 258.9L428.4 257.7L429.3 255.9L430.2 254.2L430.9 253.0L431.9 251.3L433.0 249.7L433.8 248.5L434.9 246.8L435.7 245.7L436.9 244.1L438.1 242.5L438.9 241.3L440.2 239.7L441.2 238.6L442.5 237.0L443.5 235.9L444.9 234.4L445.9 233.3L447.3 231.7L448.4 230.7L449.9 229.2L451.0 228.1L452.6 226.6L453.7 225.6L454.9 224.6L456.5 223.1L457.7 222.1L459.4 220.7L460.7 219.7L462.0 218.7L463.7 217.3L465.0 216.3L466.4 215.4L468.2 214.0L469.6 213.1L471.0 212.1L472.4 211.2L474.3 209.9L475.7 209.0L477.2 208.1L478.7 207.2L480.2 206.3L482.2 205.1L483.7 204.2L485.3 203.4L486.8 202.5L488.4 201.7L489.9 200.9L492.1 199.7L493.7 198.9L495.3 198.1L497.0 197.4L498.6 196.6L500.3 195.8L502.0 195.1L503.7 194.3L505.4 193.6L507.1 192.8L508.8 192.1L510.6 191.4L512.3 190.7L514.1 190.1L515.9 189.4L517.7 188.7L519.5 188.1L521.3 187.4L523.1 186.8L524.9 186.2L526.8 185.6L528.6 185.0L530.5 184.4L532.4 183.8L534.2 183.3L536.1 182.7L537.4 182.4L539.3 181.9L541.2 181.3L543.1 180.8L545.1 180.3L547.0 179.9L548.9 179.4L550.9 178.9L552.2 178.7L554.2 178.2L556.2 177.8L558.1 177.4L560.1 177.0L562.1 176.6L563.4 176.4L565.5 176.0L567.5 175.6L569.5 175.3L571.5 174.9L572.9 174.8L574.9 174.4L577.0 174.1L579.0 173.9L580.4 173.7L582.4 173.4L584.5 173.2L586.6 172.9L588.7 172.7L590.0 172.6L592.1 172.4L594.2 172.2L596.3 172.0L597.6 171.9L599.7 171.7L601.9 171.6L603.2 171.5L605.3 171.4L607.4 171.3L609.6 171.2L610.9 171.2L613.1 171.1L615.2 171.0L617.3 171.0L618.7 171.0L620.8 170.9L623.0 170.9L624.3 170.9L626.5 170.9L628.6 171.0L630.0 171.0L630.0 129.0L628.4 129.0L626.0 129.1L623.7 129.2L622.0 129.2L619.7 129.3L617.3 129.4L615.7 129.5L613.3 129.7L611.0 129.8L608.6 130.0L607.0 130.1L604.7 130.3L602.3 130.5L600.0 130.7L598.4 130.9L596.1 131.2L593.7 131.4L592.1 131.6L589.8 131.9L587.5 132.2L585.2 132.5L583.6 132.7L581.3 133.1L579.0 133.4L576.7 133.8L574.4 134.1L572.9 134.4L570.6 134.8L568.3 135.2L566.1 135.7L564.5 136.0L562.3 136.4L560.0 136.9L557.8 137.4L555.5 137.9L554.0 138.2L551.8 138.7L549.6 139.3L547.4 139.8L545.1 140.4L543.0 140.9L541.5 141.4L539.3 142.0L537.1 142.6L534.9 143.2L532.8 143.8L530.6 144.5L528.5 145.1L526.4 145.8L524.9 146.3L522.8 147.0L520.7 147.7L518.6 148.4L516.5 149.2L514.4 149.9L512.3 150.7L510.3 151.5L508.2 152.3L506.2 153.1L504.2 153.9L502.1 154.7L500.1 155.6L498.1 156.4L496.1 157.3L494.2 158.2L492.2 159.1L490.2 160.0L488.3 161.0L486.4 161.9L484.5 162.8L482.6 163.8L480.7 164.8L478.8 165.8L476.9 166.8L475.1 167.8L472.7 169.2L470.8 170.2L469.0 171.3L467.2 172.4L465.4 173.5L463.6 174.6L461.4 176.0L459.6 177.2L457.9 178.3L456.2 179.5L454.5 180.7L452.3 182.2L450.6 183.4L449.0 184.7L447.4 185.9L445.3 187.5L443.7 188.8L442.1 190.1L440.1 191.8L438.5 193.1L437.0 194.4L435.1 196.1L433.5 197.5L431.7 199.3L430.2 200.7L428.8 202.1L427.0 203.9L425.6 205.4L423.8 207.2L422.5 208.7L420.8 210.6L419.5 212.2L417.9 214.1L416.6 215.7L415.1 217.7L413.8 219.3L412.4 221.3L411.2 222.9L409.8 225.0L408.3 227.1L407.3 228.8L406.0 230.9L404.9 232.6L403.7 234.7L402.5 236.9L401.5 238.7L400.4 240.9L399.3 243.2L398.5 245.0L397.4 247.3L396.5 249.6L395.7 251.5L394.8 253.8L394.0 256.0Z\"/>\n<path class=\"a5-ven-tube\" d=\"M-30.0 163.0L-27.8 163.0L-25.7 162.9L-23.5 162.9L-22.1 162.9L-19.9 163.0L-17.7 163.0L-16.3 163.0L-14.1 163.1L-11.9 163.1L-9.8 163.2L-8.4 163.3L-6.2 163.4L-4.0 163.5L-1.9 163.6L-0.5 163.7L1.7 163.8L3.8 164.0L5.2 164.1L7.4 164.3L9.5 164.5L11.7 164.7L13.1 164.9L15.2 165.1L17.3 165.3L19.4 165.6L21.5 165.9L22.9 166.1L25.0 166.4L27.1 166.7L29.2 167.0L30.6 167.2L32.7 167.5L34.7 167.9L36.8 168.3L38.9 168.7L40.2 168.9L42.3 169.3L44.3 169.7L46.3 170.2L48.4 170.6L50.4 171.1L51.7 171.3L53.7 171.8L55.7 172.3L57.7 172.8L59.7 173.3L61.7 173.8L63.6 174.4L65.6 174.9L66.9 175.3L68.8 175.9L70.7 176.4L72.7 177.0L74.6 177.6L76.5 178.2L78.4 178.9L80.3 179.5L82.1 180.2L84.0 180.8L85.8 181.5L87.7 182.2L89.5 182.9L91.3 183.6L93.1 184.3L94.9 185.0L96.7 185.8L98.5 186.5L100.2 187.3L102.0 188.1L103.7 188.9L105.5 189.7L107.2 190.5L108.9 191.3L110.5 192.1L112.2 193.0L114.4 194.1L116.1 195.0L117.7 195.9L119.3 196.8L120.9 197.7L122.5 198.6L124.6 199.8L126.1 200.8L127.7 201.7L129.2 202.7L130.7 203.6L132.7 205.0L134.1 206.0L135.6 207.0L137.0 208.0L138.9 209.4L140.3 210.4L141.7 211.4L143.5 212.9L144.9 213.9L146.2 215.0L148.0 216.5L149.2 217.5L150.9 219.1L152.2 220.2L153.4 221.3L155.0 222.8L156.2 224.0L157.8 225.6L158.9 226.7L160.4 228.3L161.5 229.5L163.0 231.2L164.0 232.3L165.4 234.0L166.4 235.2L167.8 236.9L168.7 238.2L170.0 239.9L171.2 241.6L172.1 242.9L173.3 244.7L174.1 246.0L175.2 247.7L176.3 249.6L177.1 250.9L178.1 252.7L179.0 254.6L179.7 255.9L180.6 257.8L181.5 259.7L182.1 261.1L182.9 263.0L183.5 264.5L198.5 258.9L197.9 257.2L197.1 255.0L196.4 253.3L195.5 251.1L194.6 249.0L193.8 247.3L192.8 245.2L191.7 243.0L190.9 241.4L189.7 239.3L188.5 237.2L187.6 235.7L186.4 233.6L185.4 232.1L184.1 230.1L182.7 228.1L181.6 226.6L180.2 224.6L179.1 223.1L177.6 221.2L176.4 219.8L174.9 217.9L173.7 216.5L172.1 214.6L170.8 213.2L169.1 211.4L167.8 210.0L166.1 208.3L164.7 206.9L163.4 205.6L161.6 203.9L160.2 202.6L158.3 200.9L156.8 199.6L155.4 198.4L153.4 196.7L151.9 195.5L150.4 194.3L148.4 192.7L146.8 191.5L145.3 190.3L143.7 189.2L141.6 187.7L139.9 186.5L138.3 185.4L136.7 184.3L135.0 183.2L132.8 181.8L131.1 180.7L129.3 179.6L127.6 178.6L125.9 177.5L124.1 176.5L121.8 175.2L120.0 174.2L118.2 173.2L116.4 172.3L114.5 171.3L112.7 170.4L110.8 169.4L109.0 168.5L107.1 167.6L105.2 166.7L103.3 165.8L101.4 165.0L99.5 164.1L97.5 163.3L95.6 162.4L93.6 161.6L91.6 160.8L89.7 160.0L87.7 159.2L85.7 158.5L83.6 157.7L81.6 157.0L79.6 156.3L77.5 155.5L75.5 154.8L73.4 154.2L72.0 153.7L70.0 153.0L67.9 152.4L65.8 151.7L63.7 151.1L61.5 150.5L59.4 149.9L57.3 149.3L55.9 148.9L53.7 148.3L51.6 147.8L49.4 147.2L47.2 146.7L45.1 146.2L43.6 145.9L41.4 145.4L39.2 144.9L37.0 144.4L34.8 144.0L33.3 143.7L31.1 143.3L28.9 142.8L26.6 142.4L25.1 142.2L22.9 141.8L20.6 141.4L18.4 141.1L16.1 140.8L14.6 140.5L12.3 140.2L10.1 139.9L7.8 139.6L6.3 139.4L4.0 139.2L1.7 138.9L0.1 138.8L-2.1 138.6L-4.4 138.4L-6.7 138.2L-8.3 138.0L-10.6 137.9L-12.9 137.7L-15.2 137.6L-16.8 137.5L-19.1 137.4L-21.4 137.3L-23.0 137.2L-25.3 137.1L-27.7 137.0L-30.0 137.0Z\"/>\n<path class=\"a5-art-tube\" d=\"M416.5 264.5L417.3 262.5L418.1 260.6L418.7 259.2L419.6 257.3L420.5 255.4L421.2 254.1L422.2 252.2L423.2 250.4L424.0 249.1L425.0 247.3L426.2 245.5L427.0 244.2L428.2 242.5L429.1 241.2L430.3 239.5L431.6 237.7L432.6 236.5L433.9 234.8L434.9 233.6L436.3 231.9L437.4 230.7L438.8 229.1L439.9 227.9L441.5 226.3L442.6 225.2L444.2 223.6L445.4 222.5L447.0 220.9L448.2 219.8L449.5 218.7L451.2 217.2L452.5 216.1L454.2 214.6L455.6 213.5L456.9 212.5L458.8 211.1L460.1 210.0L461.5 209.0L463.5 207.6L464.9 206.6L466.3 205.6L467.8 204.6L469.8 203.3L471.3 202.3L472.8 201.4L474.4 200.4L475.9 199.5L478.0 198.3L479.6 197.4L481.2 196.5L482.8 195.6L484.5 194.7L486.1 193.8L488.3 192.7L490.0 191.9L491.7 191.0L493.4 190.2L495.1 189.4L496.8 188.6L498.6 187.8L500.3 187.0L502.1 186.3L503.9 185.5L505.7 184.8L507.5 184.1L509.3 183.3L511.1 182.6L512.9 181.9L514.8 181.3L516.6 180.6L518.5 179.9L520.4 179.3L522.3 178.6L524.1 178.0L526.1 177.4L528.0 176.8L529.9 176.2L531.8 175.6L533.8 175.1L535.1 174.7L537.0 174.2L539.0 173.7L541.0 173.1L543.0 172.6L544.9 172.1L546.9 171.6L549.0 171.2L550.3 170.9L552.3 170.4L554.3 170.0L556.4 169.6L558.4 169.2L560.5 168.8L561.8 168.5L563.9 168.1L566.0 167.8L568.0 167.4L570.1 167.1L571.5 166.9L573.6 166.6L575.7 166.2L577.8 166.0L579.2 165.8L581.3 165.5L583.4 165.2L585.5 165.0L587.7 164.8L589.0 164.6L591.2 164.4L593.3 164.2L595.5 164.0L596.9 163.9L599.0 163.8L601.2 163.6L602.6 163.6L604.7 163.4L606.9 163.3L609.1 163.2L610.5 163.2L612.7 163.1L614.8 163.0L617.0 163.0L618.4 163.0L620.6 162.9L622.8 162.9L624.2 162.9L626.4 162.9L628.6 163.0L630.0 163.0L630.0 137.0L628.4 137.0L626.1 137.1L623.8 137.2L622.2 137.2L619.9 137.3L617.6 137.4L616.0 137.5L613.7 137.7L611.4 137.8L609.1 138.0L607.5 138.1L605.2 138.3L602.9 138.5L600.6 138.7L599.1 138.9L596.8 139.1L594.5 139.4L593.0 139.6L590.7 139.8L588.4 140.1L586.2 140.4L584.6 140.7L582.4 141.0L580.1 141.3L577.9 141.7L575.6 142.1L574.1 142.3L571.9 142.7L569.7 143.1L567.4 143.5L565.9 143.9L563.7 144.3L561.5 144.8L559.3 145.2L557.1 145.7L555.7 146.1L553.5 146.6L551.3 147.1L549.2 147.6L547.0 148.2L544.9 148.7L543.4 149.1L541.3 149.7L539.2 150.3L537.0 150.9L534.9 151.5L532.8 152.2L530.7 152.8L528.7 153.5L527.3 153.9L525.2 154.6L523.1 155.3L521.1 156.0L519.1 156.8L517.0 157.5L515.0 158.2L513.0 159.0L511.0 159.8L509.0 160.6L507.0 161.4L505.1 162.2L503.1 163.0L501.2 163.8L499.3 164.7L497.3 165.6L495.4 166.4L493.5 167.3L491.7 168.2L489.8 169.1L487.9 170.1L486.1 171.0L484.3 171.9L482.4 172.9L480.6 173.9L478.8 174.9L476.5 176.2L474.7 177.2L473.0 178.2L471.2 179.3L469.5 180.3L467.8 181.4L465.6 182.8L463.9 183.9L462.2 185.0L460.6 186.2L459.0 187.3L456.9 188.8L455.3 190.0L453.7 191.1L452.1 192.3L450.1 193.9L448.6 195.1L447.1 196.3L445.1 198.0L443.6 199.2L442.2 200.5L440.3 202.2L438.9 203.5L437.1 205.2L435.7 206.5L434.4 207.8L432.6 209.6L431.3 211.0L429.6 212.8L428.4 214.2L426.7 216.0L425.5 217.4L424.0 219.3L422.8 220.8L421.3 222.7L420.2 224.2L418.7 226.1L417.7 227.6L416.3 229.6L415.0 231.6L414.0 233.1L412.7 235.1L411.8 236.7L410.6 238.8L409.4 240.9L408.6 242.5L407.5 244.6L406.5 246.8L405.7 248.4L404.7 250.6L403.8 252.8L403.1 254.5L402.3 256.7L401.5 258.9Z\"/>\n<g data-part=\"cellsBack\"></g>\n<circle class=\"b5-rim\" cx=\"300\" cy=\"222\" r=\"108\"/>\n<g class=\"b5-rim-nuc\"><ellipse cx=\"199.9\" cy=\"175.3\" rx=\"6.2\" ry=\"1.8\" transform=\"rotate(295.0 199.9 175.3)\"/><ellipse cx=\"258.6\" cy=\"119.5\" rx=\"6.2\" ry=\"1.8\" transform=\"rotate(338.0 258.6 119.5)\"/><ellipse cx=\"341.4\" cy=\"119.5\" rx=\"6.2\" ry=\"1.8\" transform=\"rotate(382.0 341.4 119.5)\"/><ellipse cx=\"382.1\" cy=\"148.1\" rx=\"6.2\" ry=\"1.8\" transform=\"rotate(408.0 382.1 148.1)\"/><ellipse cx=\"406.2\" cy=\"191.5\" rx=\"6.2\" ry=\"1.8\" transform=\"rotate(434.0 406.2 191.5)\"/></g>\n<path class=\"a5-cap-edge\" d=\"M191.0 261.7L191.7 263.6L192.4 265.5L193.2 267.3L194.0 269.2L194.9 271.0L195.7 272.9L196.6 274.7L197.6 276.5L198.5 278.2L199.5 280.0L200.6 281.7L201.6 283.5L202.7 285.2L203.8 286.9L205.0 288.5L206.2 290.2L207.4 291.8L208.6 293.4L209.9 295.0L211.1 296.6L212.5 298.1L213.8 299.6L215.2 301.1L216.6 302.6L218.0 304.0L219.4 305.4L220.9 306.8L222.4 308.2L223.9 309.5L225.4 310.9L227.0 312.1L228.6 313.4L230.2 314.6L231.8 315.8L233.5 317.0L235.1 318.2L236.8 319.3L238.5 320.4L240.3 321.4L242.0 322.5L243.8 323.5L245.5 324.4L247.3 325.4L249.1 326.3L251.0 327.1L252.8 328.0L254.7 328.8L256.5 329.6L258.4 330.3L260.3 331.0L262.2 331.7L264.2 332.3L266.1 332.9L268.0 333.5L270.0 334.0L271.9 334.6L273.9 335.0L275.9 335.5L277.9 335.9L279.9 336.2L281.9 336.6L283.9 336.9L285.9 337.1L287.9 337.4L289.9 337.6L291.9 337.7L293.9 337.8L296.0 337.9L298.0 338.0L300.0 338.0L302.0 338.0L304.0 337.9L306.1 337.8L308.1 337.7L310.1 337.6L312.1 337.4L314.1 337.1L316.1 336.9L318.1 336.6L320.1 336.2L322.1 335.9L324.1 335.5L326.1 335.0L328.1 334.6L330.0 334.0L332.0 333.5L333.9 332.9L335.8 332.3L337.8 331.7L339.7 331.0L341.6 330.3L343.5 329.6L345.3 328.8L347.2 328.0L349.0 327.1L350.9 326.3L352.7 325.4L354.5 324.4L356.2 323.5L358.0 322.5L359.7 321.4L361.5 320.4L363.2 319.3L364.9 318.2L366.5 317.0L368.2 315.8L369.8 314.6L371.4 313.4L373.0 312.1L374.6 310.9L376.1 309.5L377.6 308.2L379.1 306.8L380.6 305.4L382.0 304.0L383.4 302.6L384.8 301.1L386.2 299.6L387.5 298.1L388.9 296.6L390.1 295.0L391.4 293.4L392.6 291.8L393.8 290.2L395.0 288.5L396.2 286.9L397.3 285.2L398.4 283.5L399.4 281.7L400.5 280.0L401.5 278.2L402.4 276.5L403.4 274.7L404.3 272.9L405.1 271.0L406.0 269.2L406.8 267.3L407.6 265.5L408.3 263.6L409.0 261.7\"/><path class=\"a5-cap\" d=\"M191.0 261.7L191.7 263.6L192.4 265.5L193.2 267.3L194.0 269.2L194.9 271.0L195.7 272.9L196.6 274.7L197.6 276.5L198.5 278.2L199.5 280.0L200.6 281.7L201.6 283.5L202.7 285.2L203.8 286.9L205.0 288.5L206.2 290.2L207.4 291.8L208.6 293.4L209.9 295.0L211.1 296.6L212.5 298.1L213.8 299.6L215.2 301.1L216.6 302.6L218.0 304.0L219.4 305.4L220.9 306.8L222.4 308.2L223.9 309.5L225.4 310.9L227.0 312.1L228.6 313.4L230.2 314.6L231.8 315.8L233.5 317.0L235.1 318.2L236.8 319.3L238.5 320.4L240.3 321.4L242.0 322.5L243.8 323.5L245.5 324.4L247.3 325.4L249.1 326.3L251.0 327.1L252.8 328.0L254.7 328.8L256.5 329.6L258.4 330.3L260.3 331.0L262.2 331.7L264.2 332.3L266.1 332.9L268.0 333.5L270.0 334.0L271.9 334.6L273.9 335.0L275.9 335.5L277.9 335.9L279.9 336.2L281.9 336.6L283.9 336.9L285.9 337.1L287.9 337.4L289.9 337.6L291.9 337.7L293.9 337.8L296.0 337.9L298.0 338.0L300.0 338.0L302.0 338.0L304.0 337.9L306.1 337.8L308.1 337.7L310.1 337.6L312.1 337.4L314.1 337.1L316.1 336.9L318.1 336.6L320.1 336.2L322.1 335.9L324.1 335.5L326.1 335.0L328.1 334.6L330.0 334.0L332.0 333.5L333.9 332.9L335.8 332.3L337.8 331.7L339.7 331.0L341.6 330.3L343.5 329.6L345.3 328.8L347.2 328.0L349.0 327.1L350.9 326.3L352.7 325.4L354.5 324.4L356.2 323.5L358.0 322.5L359.7 321.4L361.5 320.4L363.2 319.3L364.9 318.2L366.5 317.0L368.2 315.8L369.8 314.6L371.4 313.4L373.0 312.1L374.6 310.9L376.1 309.5L377.6 308.2L379.1 306.8L380.6 305.4L382.0 304.0L383.4 302.6L384.8 301.1L386.2 299.6L387.5 298.1L388.9 296.6L390.1 295.0L391.4 293.4L392.6 291.8L393.8 290.2L395.0 288.5L396.2 286.9L397.3 285.2L398.4 283.5L399.4 281.7L400.5 280.0L401.5 278.2L402.4 276.5L403.4 274.7L404.3 272.9L405.1 271.0L406.0 269.2L406.8 267.3L407.6 265.5L408.3 263.6L409.0 261.7\"/>\n<path class=\"a5-t2\" d=\"M245.9 139.3C245.7 141.0 243.9 143.4 242.6 144.9C241.3 146.3 239.0 148.5 237.2 148.8C235.4 149.1 232.4 147.8 230.6 146.8C228.9 145.9 226.1 144.1 225.5 142.6C224.9 141.0 225.7 138.0 226.4 136.3C227.1 134.5 228.5 131.7 230.1 130.9C231.7 130.1 235.0 130.3 237.0 130.7C239.0 131.0 242.1 131.8 243.4 133.0C244.7 134.3 246.0 137.5 245.9 139.3Z\"/><path class=\"a5-gran\" d=\"M232.8 143.6a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0 -2.8 0M235.1 145.4a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0 -2.8 0M236.8 141.1a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0 -2.8 0M227.5 139.6a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0 -2.8 0M232.8 133.3a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0 -2.8 0\"/>\n<path data-part=\"air\" class=\"a5-o2\" clip-path=\"url(#a5-air)\"/>\n<path data-part=\"fly\" class=\"a5-o2 a5-o2-fly\"/>\n<g data-part=\"cellsFront\"></g>\n<path data-part=\"co20\" class=\"a5-co2\"/><path data-part=\"co21\" class=\"a5-co2 a5-co2-b\"/><path data-part=\"co22\" class=\"a5-co2 a5-co2-c\"/>\n<circle class=\"a5-track\" data-part=\"track\" r=\"12\" cx=\"-40\" cy=\"-40\"/></g>\n</g>\n<path class=\"b5-edge\" d=\"M94.7 14L590 121.1L505.3 185.9L10 78.8ZM590 121.1L590 432.3L505.3 497.1M10 78.8L10 389.9L505.3 497.1L505.3 185.9\"/>\n</g>\n<g class=\"a5-plot\">\n<rect class=\"a5-plot-bg\" x=\"20\" y=\"520\" width=\"560\" height=\"196\" rx=\"12\"/>\n<text class=\"a5-plot-title\" x=\"42\" y=\"552\">Oxygen in the traced cell</text>\n<rect class=\"a5-spare\" data-part=\"spare\" x=\"0\" y=\"574\" width=\"0\" height=\"98\"/>\n<text class=\"a5-spare-txt\" data-part=\"sparetxt\" x=\"0\" y=\"660\" text-anchor=\"middle\">to spare</text>\n<path class=\"a5-grid\" d=\"M92 623.0H556M92 574.0H556\"/>\n<path class=\"a5-axis\" d=\"M92 672H556\"/>\n<text class=\"a5-tick\" x=\"82\" y=\"580.0\" text-anchor=\"end\">100%</text>\n<text class=\"a5-tick\" x=\"82\" y=\"629.0\" text-anchor=\"end\">50%</text>\n<path class=\"a5-axis\" d=\"M92.0 672v6\"/><text class=\"a5-tick\" x=\"92.0\" y=\"700\" text-anchor=\"start\">0</text><path class=\"a5-axis\" d=\"M237.0 672v6\"/><text class=\"a5-tick\" x=\"237.0\" y=\"700\" text-anchor=\"middle\">0.25</text><path class=\"a5-axis\" d=\"M382.0 672v6\"/><text class=\"a5-tick\" x=\"382.0\" y=\"700\" text-anchor=\"middle\">0.5</text><path class=\"a5-axis\" d=\"M527.0 672v6\"/><text class=\"a5-tick\" x=\"527.0\" y=\"700\" text-anchor=\"middle\">0.75 s</text>\n<path class=\"a5-curve-ghost\" data-part=\"ghost\"/>\n<path class=\"a5-curve\" data-part=\"curve\"/>\n<g data-part=\"exit\"><path class=\"a5-exit\" d=\"M0 672V568\"/><ellipse class=\"a5-exit-cell\" cx=\"0\" cy=\"562\" rx=\"9\" ry=\"5.6\"/></g>\n<circle class=\"a5-start\" data-part=\"start\" r=\"4.5\"/>\n<circle class=\"a5-dot\" data-part=\"dot\" r=\"6.5\"/>\n</g>\n</svg></div><div class=\"a5-row\"><p class=\"a5-scene\" data-scene>Resting: each red cell spends about three-quarters of a second beside the air sacs, and is full within the first third of it.</p><button type=\"button\" class=\"a5-slow\" data-slow aria-pressed=\"true\">8× slower</button></div><span class=\"a5-sr\" role=\"status\" aria-live=\"polite\" data-status></span><div class=\"opt-controls\"><div class=\"opt-seg\" role=\"radiogroup\" aria-label=\"Effort\" data-control=\"effort\"><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"rest\" aria-checked=\"true\" tabindex=\"0\">Rest</button><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"walk\" aria-checked=\"false\" tabindex=\"-1\">Walk</button><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"run\" aria-checked=\"false\" tabindex=\"-1\">Run</button><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"max\" aria-checked=\"false\" tabindex=\"-1\">All out</button></div></div><div class=\"opt-foot\"><span class=\"opt-hint\">Pick an effort · watch the time to spare shrink</span><dl class=\"opt-readout\" data-readout aria-hidden=\"true\"><div class=\"opt-stat\" data-stat=\"time\"><dt>Time in capillary</dt><dd data-r=\"time\">0.75 s</dd></div><div class=\"opt-stat\" data-stat=\"in\"><dt>Arrives</dt><dd data-r=\"in\">75% full</dd></div><div class=\"opt-stat\" data-stat=\"out\"><dt>Leaves</dt><dd data-r=\"out\">97% full</dd></div></dl></div></div><figcaption class=\"iso-legend\"><span class=\"iso-keys\"><span class=\"iso-key\"><svg class=\"iso-swatch\" data-mark=\"heat\" viewBox=\"0 0 16 10\" aria-hidden=\"true\"><path d=\"M1.5 5h13\"/></svg>Oxygen-rich blood</span><span class=\"iso-key\"><svg class=\"iso-swatch\" data-mark=\"lit\" viewBox=\"0 0 16 10\" aria-hidden=\"true\"><path d=\"M2 4.5 8 1.5 14 4.5 14 6 8 9 2 6Z\"/><path class=\"iso-swatch-crease\" d=\"M2 4.5 8 7.5 14 4.5\"/></svg>Oxygen in the air</span><span class=\"iso-key\"><svg class=\"iso-swatch\" data-mark=\"raised\" viewBox=\"0 0 16 10\" aria-hidden=\"true\"><path d=\"M2 4.5 8 1.5 14 4.5 14 6 8 9 2 6Z\"/><path class=\"iso-swatch-crease\" d=\"M2 4.5 8 7.5 14 4.5\"/></svg>Air sac wall</span></span><span class=\"iso-caption\"><span class=\"a5-par\">Every breath refills hundreds of millions of tiny air sacs, packed like foam, each wrapped in a net of capillaries so narrow that red cells pass in single file. Oxygen crosses a wall far thinner than a sheet of paper into each passing cell, and carbon dioxide crosses the other way.</span><span class=\"a5-par\">At rest a cell spends about 0.75 s beside the air and is fully loaded within the first quarter-second, so most of its trip is time to spare. All out, the heart pumps nearly five times as much blood; more capillaries open, but each cell still passes in about 0.29 s, and it arrives emptier (31% instead of 75%). In healthy lungs it still leaves about 97% full. The lungs are rarely what limits VO₂max; the heart's output usually is.</span><span class=\"a5-par\"><small>Typical healthy adult at sea level, drawn far larger than life: an air sac is about a quarter of a millimetre across. One capillary stands for the several a cell passes. Lung disease, altitude and some very fit athletes at their peak can leave blood short of full; not shown. Blue and red follow the textbook convention.</small></span></span></figcaption></figure>" + "</div>";
    mount(root.querySelector(".opt-figure"));
  }
}
customElements.define("optimal-fig-alveolus", Fig);
})();
