/* optimal-fig-red-cell-cycle: Optimal Health explainer figure. Built with Anatomy (MIT). Generated; do not edit. */
(() => {
if (customElements.get("optimal-fig-red-cell-cycle")) return;
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

// Page side of the shared 3-D layer (shared/gl3). Inlined into a figure's page and embed, after the kit.
//
// gl3Attach(fig, { scene, P, W, H, file, v, redraw }) returns a small controller right away. The figure calls
// `gl.figure(...)`, `gl.move(...)`, `gl.set(...)` and `gl.render()` every frame without caring whether the layer has
// arrived: until it has, they do nothing and the SVG is the whole figure. When the chunk has loaded and drawn its
// first frame the stage flips to `data-gl3="on"` (shared/gl3/gl3.css): the canvas shows under the SVG and the SVG
// becomes the ink pass. The SVG stays the figure with no WebGL 2, a software renderer, Save-Data, a low-memory or
// few-core device, a lost context, or gl="off" on the element.
const GL3_BASE = (() => {
  try {
    const s = document.currentScript;
    // a page may say where the chunk is (window.OPTIMAL_GL3_BASE, relative to the page); an embed script's own URL
    // is the base otherwise, and a standalone figure page keeps the chunk in embed/
    if (window.OPTIMAL_GL3_BASE) return new URL(window.OPTIMAL_GL3_BASE, document.baseURI).href;
    return s && s.src ? s.src : new URL("embed/", document.baseURI).href;
  } catch (_) {
    return "";
  }
})();
const GL3_VERSION = 3; // must equal `version` in shared/gl3/src/gl3.js
function gl3Skip(want) {
  if (want === "off") return "off";
  if (typeof WebGL2RenderingContext === "undefined" || typeof IntersectionObserver === "undefined") return "no-webgl2";
  const c = navigator.connection;
  if (c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ""))) return "save-data";
  if (navigator.deviceMemory && navigator.deviceMemory < 3) return "low-memory";
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) return "few-cores";
  return "";
}
function gl3Probe() {
  let g = null;
  try {
    g = document.createElement("canvas").getContext("webgl2", { failIfMajorPerformanceCaveat: true });
  } catch (_) {}
  if (!g) return "no-webgl2";
  const big = g.getParameter(g.MAX_TEXTURE_SIZE) >= 2048;
  const lose = g.getExtension("WEBGL_lose_context");
  if (lose) lose.loseContext();
  return big ? "" : "small-textures";
}
function gl3Load(src) {
  const w = window;
  if (w.OptimalGL3) return Promise.resolve(w.OptimalGL3);
  if (w.__optimalGL3Loading) return w.__optimalGL3Loading;
  w.__optimalGL3Loading = new Promise((resolve, reject) => {
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.onload = () => (w.OptimalGL3 ? resolve(w.OptimalGL3) : reject(new Error("no layer")));
    el.onerror = () => {
      w.__optimalGL3Loading = null;
      reject(new Error("load"));
    };
    document.head.appendChild(el);
  });
  return w.__optimalGL3Loading;
}
// Drag to turn (the machines). The object spins on its turntable under the same lights, and the camera can rise or
// drop. The drawing (labels, screens, flows: everything the SVG adds) was made for one view, so it steps aside
// while the object is turned (gl3.css, data-gl3-turn). Let go: the object coasts, rests a moment, then swings back
// to the drawing's view, and the ink returns. `turn: true` lets a drag anywhere on the stage turn it;
// `turn: { stage: false }` leaves the stage's own gestures to the figure and turns by the corner handle only.
// A touch drag on the stage turns only sideways, so the page still scrolls under a thumb.
function gl3TurnControl(fig, stage, P, layer, lively, opts) {
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const anywhere = opts.stage !== false;
  const lo = ((6 - P.elevation) * Math.PI) / 180;
  const hi = ((72 - P.elevation) * Math.PI) / 180;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const wrap = (a) => a - Math.PI * 2 * Math.round(a / (Math.PI * 2));
  const handle = document.createElement("button");
  handle.type = "button";
  handle.className = "gl3-turn";
  handle.dataset.at = opts.at || "tl";
  handle.setAttribute("aria-label", "Turn the model. Drag, or use the left and right arrow keys. It swings back by itself.");
  handle.title = "Drag to turn";
  handle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.1 8.94A9.5 4 0 1 1 8.75 8.24"/><path d="M6.06 6.91 8.75 8.24 6.58 10.31"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/></svg>';
  handle.style.color = getComputedStyle(fig).color; // the page's ink: the stage itself may be a Cream island
  stage.appendChild(handle);
  stage.dataset.gl3Turnable = anywhere ? "stage" : "handle";
  // the handle shows once a pointer is about (so never on a wall screen), or at once where there is no hover
  const show = () => {
    handle.dataset.shown = "1";
    fig.removeEventListener("pointermove", show);
  };
  if (matchMedia("(hover: none)").matches) show();
  else fig.addEventListener("pointermove", show, { passive: true });

  let yaw = 0;
  let tilt = 0;
  let vy = 0;
  let vt = 0;
  let mode = "idle"; // drag → coast → dwell → home → idle
  let rest = 900;
  let until = 0;
  let raf = 0;
  let last = 0;
  let grab = null;
  let swallow = false;
  const push = () => {
    const L = layer();
    if (!L) return;
    L.turn(yaw, tilt);
    if (!lively()) L.render(); // the figure's own loop draws it otherwise
  };
  const tick = (now) => {
    raf = 0;
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
    last = now;
    if (mode === "coast") {
      yaw += vy * dt;
      vy *= Math.exp(-dt * 3.4);
      if (Math.abs(vy) < 0.12) {
        mode = "dwell";
        until = now + rest;
      }
    } else if (mode === "dwell") {
      if (now >= until) {
        mode = "home";
        yaw = wrap(yaw);
        vy = vt = 0;
        if (still.matches) yaw = tilt = 0;
      }
    } else if (mode === "home") {
      const w = 6.5; // a critically damped swing back
      vy += (-2 * w * vy - w * w * yaw) * dt;
      yaw += vy * dt;
      vt += (-2 * w * vt - w * w * tilt) * dt;
      tilt += vt * dt;
      if (Math.abs(yaw) < 0.003 && Math.abs(tilt) < 0.003 && Math.abs(vy) < 0.03) {
        yaw = tilt = 0;
        mode = "idle";
      }
    }
    push();
    if (mode === "idle") {
      delete stage.dataset.gl3Turn; // the ink returns
      return;
    }
    raf = requestAnimationFrame(tick);
  };
  const run = () => {
    stage.dataset.gl3Turn = "1";
    if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }
  };
  const start = (e, via) => {
    if (!layer() || (e.pointerType === "mouse" && e.button !== 0)) return;
    grab = { id: e.pointerId, x: e.clientX, y: e.clientY, yaw, tilt, live: false, touch: e.pointerType === "touch", via, lx: e.clientX, lt: performance.now(), v: 0 };
  };
  const move = (e) => {
    if (!grab || e.pointerId !== grab.id) return;
    let dx = e.clientX - grab.x;
    let dy = e.clientY - grab.y;
    if (!grab.live) {
      if (Math.hypot(dx, dy) < 6) return;
      if (grab.touch && !grab.via && Math.abs(dx) < Math.abs(dy) * 1.2) { grab = null; return; } // a scroll
      grab.live = true;
      grab.x = e.clientX;
      grab.y = e.clientY;
      dx = dy = 0;
      grab.yaw = yaw = wrap(yaw); // pick it up where it stands
      grab.tilt = tilt;
      if (!grab.via) try { stage.setPointerCapture(e.pointerId); } catch (_) {}
      mode = "drag";
      stage.dataset.gl3Grab = "1";
      run();
    }
    const box = stage.getBoundingClientRect();
    const span = Math.max(240, box.width);
    yaw = grab.yaw + (dx / span) * 3.3; // a drag across the stage is a little over half a turn
    if (!grab.touch || grab.via) tilt = clamp(grab.tilt + (dy / Math.max(240, box.height)) * 1.1, lo, hi);
    const now = performance.now();
    if (now - grab.lt > 12) {
      grab.v = grab.v * 0.4 + ((((e.clientX - grab.lx) / span) * 3.3) / ((now - grab.lt) / 1000)) * 0.6;
      grab.lx = e.clientX;
      grab.lt = now;
    }
    if (e.cancelable) e.preventDefault();
  };
  const end = (e) => {
    if (!grab || e.pointerId !== grab.id) return;
    const g = grab;
    grab = null;
    delete stage.dataset.gl3Grab;
    if (!g.live) return;
    swallow = true; // the click that follows a drag is not a click on the figure
    setTimeout(() => (swallow = false), 60);
    vy = !still.matches && performance.now() - g.lt < 90 ? clamp(g.v, -9, 9) : 0;
    vt = 0;
    rest = 900;
    mode = "coast";
    run();
  };
  const nudge = (dir) => {
    if (!layer()) return;
    rest = 1600;
    if (still.matches) {
      yaw += dir * 0.6;
      mode = "dwell";
      until = performance.now() + rest;
    } else {
      vy = dir * 2.6;
      mode = "coast";
    }
    run();
  };
  const onDown = (e) => {
    if (e.target.closest && e.target.closest("button, a, input, select, textarea, [data-gl3-noturn]")) return;
    start(e, false);
  };
  const onHandleDown = (e) => {
    e.stopPropagation(); // not one of the stage's own gestures
    start(e, true);
    try { handle.setPointerCapture(e.pointerId); } catch (_) {}
  };
  const onClick = (e) => {
    if (!swallow) return;
    swallow = false;
    e.stopImmediatePropagation();
    e.preventDefault();
  };
  const onHandleClick = (e) => {
    e.stopPropagation();
    if (!swallow) nudge(1); // a tap or Enter: a short look round
  };
  const onKey = (e) => {
    const dir = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
    const back = e.key === "Escape" || e.key === "Home";
    if (!dir && !back) return;
    e.stopPropagation(); // the stage may have arrow keys of its own
    e.preventDefault();
    if (dir) nudge(dir);
    else if (mode !== "idle") { until = 0; mode = "dwell"; run(); }
  };
  if (anywhere) stage.addEventListener("pointerdown", onDown);
  handle.addEventListener("pointerdown", onHandleDown);
  handle.addEventListener("click", onHandleClick);
  handle.addEventListener("keydown", onKey);
  stage.addEventListener("pointermove", move);
  stage.addEventListener("pointerup", end);
  stage.addEventListener("pointercancel", end);
  stage.addEventListener("click", onClick, true);
  return {
    /** For QA and scripted views: hold a pose (no swing back) until home() or the next drag. */
    hold(y, t = 0) {
      yaw = y;
      tilt = t;
      mode = y || t ? "held" : "idle";
      if (y || t) stage.dataset.gl3Turn = "1";
      else delete stage.dataset.gl3Turn;
      push();
    },
    remove() {
      if (raf) cancelAnimationFrame(raf);
      if (anywhere) stage.removeEventListener("pointerdown", onDown);
      stage.removeEventListener("pointermove", move);
      stage.removeEventListener("pointerup", end);
      stage.removeEventListener("pointercancel", end);
      stage.removeEventListener("click", onClick, true);
      fig.removeEventListener("pointermove", show);
      handle.remove();
      delete stage.dataset.gl3Turn;
      delete stage.dataset.gl3Grab;
      delete stage.dataset.gl3Turnable;
    },
  };
}
function gl3Attach(fig, { scene, P, W, H, file = "optimal-gl3.js", v = "1", redraw, build = null, island = true, turn = null } = {}) {
  const stage = fig.querySelector(".iso-stage");
  const svg = stage && stage.querySelector("svg.iso-svg, svg");
  const host = fig.getRootNode() && fig.getRootNode().host;
  let L = null;
  let turner = null;
  let liveAt = 0; // when the figure's own loop last rendered
  // Frame pacing: while the figure animates it renders once a frame. If those frames run long for a second or so,
  // the layer steps its quality down a level (lighter occlusion, then none and a lower pixel ratio). It never steps up.
  let last = 0;
  let slow = 0;
  let run = 0;
  let strikes = 0;
  const paced = new URLSearchParams(location.search).get("gl3pace") !== "off"; // QA can hold full quality
  const pace = () => {
    if (!paced) return;
    const now = performance.now();
    const dt = now - last;
    last = now;
    if (dt > 120) { slow = 0; run = 0; return; } // not a running animation
    run++;
    if (dt > 30) slow++;
    if (run >= 45) {
      // two slow stretches in a row, so one hiccup (a tab waking, another page loading) costs nothing
      strikes = slow > 20 ? strikes + 1 : 0;
      if (strikes >= 2 && L.quality() > 0) { L.quality(L.quality() - 1); strikes = 0; }
      slow = 0;
      run = 0;
    }
  };
  const ctl = {
    on: false,
    figure(key, parts, materialOf) { if (L) L.figure(key, parts, materialOf); },
    move(piece, vec) { if (L) L.move(piece, vec); },
    pose(piece, R, t) { if (L) L.pose(piece, R, t); },
    set(name, what) { return L ? L.set(name, what) : false; },
    add(desc) { return L ? L.add(desc) : false; },
    update(state) { if (L) L.update(state); },
    view(x, y, w, h) { if (L) L.view(x, y, w, h); },
    render() { if (L) { liveAt = performance.now(); L.render(); pace(); } },
    /** Hold a turned pose (yaw, tilt in radians); hold(0, 0) is the drawing's own view. Figures with `turn` only. */
    hold(y, t) { if (turner) turner.hold(y, t); },
    stats: () => (L ? L.stats() : null),
  };
  if (!stage || !svg || !scene) return ctl;
  const off = (why) => {
    if (turner) turner.remove();
    turner = null;
    if (L) L.dispose();
    L = null;
    ctl.on = false;
    stage.dataset.gl3 = `svg:${why}`;
    stage.classList.remove("iso", "optimal");
    if (stage.dataset.gl3Theme) { stage.removeAttribute("data-theme"); delete stage.dataset.gl3Theme; }
    if (redraw) redraw();
  };
  const why = gl3Skip(host ? host.getAttribute("gl") : new URLSearchParams(location.search).get("gl"));
  if (why) { stage.dataset.gl3 = `svg:${why}`; return ctl; }
  stage.dataset.gl3 = "waiting";
  const begin = async () => {
    const probe = GL3_BASE ? gl3Probe() : "no-src";
    if (probe) return off(probe);
    stage.dataset.gl3 = "loading";
    let api;
    try {
      api = await gl3Load(new URL(`${file}?v=${v}`, GL3_BASE).href);
    } catch (_) {
      return off("load");
    }
    if (api.version !== GL3_VERSION) return off("version");
    const themed = fig.closest("[data-theme]");
    const theme = themed && themed.getAttribute("data-theme") === "light" ? "light" : "dark";
    const canvas = document.createElement("canvas");
    canvas.className = "gl3-canvas";
    canvas.setAttribute("aria-hidden", "true");
    stage.insertBefore(canvas, stage.firstChild);
    L = api.create({ canvas, P, W, H, scene, theme, clear: null, coarse: matchMedia("(pointer: coarse)").matches, debug: new URLSearchParams(location.search).get("gl3debug") || "", build, onLost: () => off("lost") });
    if (!L) { canvas.remove(); return off("init"); }
    const fit = () => {
      const s = svg.getBoundingClientRect();
      const t = stage.getBoundingClientRect();
      const k = stage.offsetWidth ? t.width / stage.offsetWidth : 1; // a scaled ancestor (the TV's stage)
      canvas.style.left = `${((s.left - t.left) / k).toFixed(2)}px`;
      canvas.style.top = `${((s.top - t.top) / k).toFixed(2)}px`;
      canvas.style.width = `${(s.width / k).toFixed(2)}px`;
      canvas.style.height = `${(s.height / k).toFixed(2)}px`;
      L.resize(Math.round(s.width / k), Math.round(s.height / k));
    };
    fit();
    if (typeof ResizeObserver !== "undefined") new ResizeObserver(() => { if (L) { fit(); L.render(); } }).observe(svg);
    ctl.on = true;
    // the stage becomes a Cream island: the SVG is now ink on rendered solids, whatever the page's theme
    // (island: false keeps the page's own theme on the stage: for figures whose SVG is labels over their own 3-D scene)
    if (island && theme !== "light") { stage.classList.add("iso", "optimal"); stage.setAttribute("data-theme", "light"); stage.dataset.gl3Theme = "1"; }
    stage.__gl3 = L; // QA reads stats and stills through this
    if (redraw) redraw(); // the figure pushes its current state and renders
    L.render();
    stage.dataset.gl3 = "on";
    const want = host ? host.getAttribute("turn") : new URLSearchParams(location.search).get("turn");
    if (turn && want !== "off" && L.turn) {
      turner = gl3TurnControl(fig, stage, P, () => L, () => performance.now() - liveAt < 100, turn === true ? {} : turn);
      stage.__gl3Turn = turner; // QA holds poses through this
    }
  };
  const whenIdle = () => (window.requestIdleCallback ? requestIdleCallback(() => begin(), { timeout: 1200 }) : setTimeout(begin, 120));
  const near = new IntersectionObserver(
    (entries) => {
      if (!entries.some((en) => en.isIntersecting)) return;
      near.disconnect();
      whenIdle();
    },
    { rootMargin: "600px 0px" },
  );
  near.observe(stage);
  return ctl;
}

// A6 model: the red cell's 120-day loop, driven by Fig 3's iron model (the build runs
// simulate("iv") and passes the series in). Pure functions; the page inlines this file.
//
// Red cells live about 120 days [Franco 2012]; macrophages recycle the iron of the cells
// that die (≈ 13 mg/day for the model woman at Hb 105 g/L, 20–25 mg/day in a typical adult)
// [Hentze 2010]. The iron built into new cells each day is the recycled iron plus the net rise
// in circulating red-cell iron that Fig 3's model computes after IV iron.
const LOOP = {
  life: 120, //  days in circulation [Franco 2012]
  pace: 2, //    days per second on screen
  before: 4, //  days shown before the dose
  after: 56, //  last day shown (Fig 3's 8 weeks)
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
/** Value of a series sampled every S.step days from day 0, at `day` (held outside the range). */
function seriesAt(S, key, day) {
  const a = S[key];
  const u = clamp(day / S.step, 0, a.length - 1);
  const i = Math.min(a.length - 2, Math.floor(u));
  return a[i] + (a[i + 1] - a[i]) * (u - i);
}
/** Iron going into new red cells (mg/day) on `day`. Before the dose (or untreated) it's c0. */
const cohortAt = (S, day, treated) => (!treated || day < 0 ? S.c0 : S.c0 + Math.max(0, seriesAt(S, "rise", day)));
/** Cumulative production in units of one drawn cell (one cell = a normal day's iron, cNorm). */
const madeBy = (S, day, treated) => (S.c0 * day + (treated && day > 0 ? seriesAt(S, "cum", day) : 0)) / S.cNorm;
/** Ferritin granules drawn in the spleen macrophage: 5 at ferritin 8 µg/L, 40 near the IV peak. */
const granulesOf = (ferritin) => Math.round(5 + 35 * clamp(Math.log(ferritin / 8) / Math.log(470 / 8), 0, 1.1));

// Round back: the far half of an organ cut open, drawn behind its cut face in the A-series camera.
//
// Browser-side helper, inlined into a figure's page (build.mjs reads this file). The cut face lies
// in the plane the figure places with planeMatrix(S3(0, DEP, 0), [1,0,0], [0,0,-1]): section x is
// world x, section y is −z, and the viewer is on the +y side. `w` is one unit of depth behind the cut
// expressed in the cut face's own coordinates (the figure solves it once in build.mjs).
//
//   const RB = roundBack({ w, A: 62, E: 24, dep: DEP });
//   const quads = [
//     ...RB.rim(RB.sampleClosed(outline), { tones: [lo, hi] }),      // a blob: each outline point rolls back
//     ...RB.chords(leftEdge, rightEdge, { tones: [lo, hi] }),       // a limb or a vessel: paired edges, half-circles
//   ];
//   group.innerHTML = RB.paint(quads);
//
// Facets facing away from the viewer are culled; the rest are shaded by facing (light from the upper
// left front) between two tones and painted back to front.
function roundBack({ w, A = 62, E = 24, dep = 0, light = [-0.35, 0.55, 0.76] }) {
  const RAD = Math.PI / 180;
  const sA = Math.sin(A * RAD), cA = Math.cos(A * RAD), sE = Math.sin(E * RAD), cE = Math.cos(E * RAD);
  const VIEW = [cA * cE, sA * cE, sE];
  const lm = Math.hypot(...light);
  const L = light.map((v) => v / lm);
  const f1 = (v) => v.toFixed(1);
  const key = (cx, cy, d) => (cx * cA + (dep - d) * sA) * cE - cy * sE;
  const shade = (n, tones) => {
    const lit = Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]);
    const t = Math.round(Math.min(1, 0.18 + 0.95 * lit) * 20) / 20; // 21 tones, so facets can be merged by colour
    const [lo, hi] = tones;
    return `rgb(${lo.map((v, i) => Math.round(v + (hi[i] - v) * t)).join(",")})`;
  };
  const facing = (n) => n[0] * VIEW[0] + n[1] * VIEW[1] + n[2] * VIEW[2];
  const quad = (pts) => `M${pts.map((v) => `${f1(v[0])} ${f1(v[1])}`).join("L")}Z`;

  /** Catmull-Rom (as the figures' smooth(), tension k) sampled into points; closed or open. */
  function sample(points, closed, k = 1, steps = 8) {
    const n = points.length;
    const at = (i) => points[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
    const out = [points[0]];
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
      const c1 = [p1[0] + ((p2[0] - p0[0]) / 6) * k, p1[1] + ((p2[1] - p0[1]) / 6) * k];
      const c2 = [p2[0] - ((p3[0] - p1[0]) / 6) * k, p2[1] - ((p3[1] - p1[1]) / 6) * k];
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const u = 1 - t;
        out.push([0, 1].map((c) => u * u * u * p1[c] + 3 * u * u * t * c1[c] + 3 * u * t * t * c2[c] + t * t * t * p2[c]));
      }
    }
    if (closed) out.pop();
    return out;
  }
  /** Resample a polyline to n points evenly by length. */
  function byLength(pts, n) {
    const acc = [0];
    for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const total = acc[acc.length - 1];
    const out = [];
    let j = 0;
    for (let q = 0; q < n; q++) {
      const want = (total * q) / (n - 1);
      while (j < acc.length - 2 && acc[j + 1] < want) j++;
      const t = (want - acc[j]) / (acc[j + 1] - acc[j] || 1);
      out.push([pts[j][0] + (pts[j + 1][0] - pts[j][0]) * t, pts[j][1] + (pts[j + 1][1] - pts[j][1]) * t]);
    }
    return out;
  }

  /** Paired edges (a limb, a vessel): each chord A_i–B_i swept round behind the cut as a half-circle.
   *  caps: [atStart, atEnd] draws a cut end as a half-ring (wall, then lumen of `lumen` × the radius) when it faces the viewer. */
  function chords(Ae, Be, { round = 0.95, nphi = 24, tones, caps = [false, false], capFill, lumenFill, lumen = 0.7 }) {
    const lv = Ae.map((a, i) => {
      const b = Be[i];
      const h = [(b[0] - a[0]) / 2, (b[1] - a[1]) / 2];
      const r = Math.hypot(h[0], h[1]) || 1e-6;
      return { m: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], h, r, u: [h[0] / r, h[1] / r] };
    });
    const pt = (l, ph) => {
      const d = Math.sin(ph) * l.r * round;
      return [l.m[0] + Math.cos(ph) * l.h[0] + d * w[0], l.m[1] + Math.cos(ph) * l.h[1] + d * w[1]];
    };
    const out = [];
    for (let i = 0; i < lv.length - 1; i++) {
      const l0 = lv[i];
      const l1 = lv[i + 1];
      const ux = l0.u[0] + l1.u[0];
      const uy = l0.u[1] + l1.u[1];
      const um = Math.hypot(ux, uy) || 1;
      for (let j = 0; j < nphi; j++) {
        const p0 = (j / nphi) * Math.PI;
        const p1 = ((j + 1) / nphi) * Math.PI;
        const pm = (p0 + p1) / 2;
        const n = [(Math.cos(pm) * ux) / um, -Math.sin(pm), (-Math.cos(pm) * uy) / um];
        if (facing(n) <= 0.01) continue;
        const cx = (l0.m[0] + l1.m[0]) / 2 + (Math.cos(pm) * (l0.h[0] + l1.h[0])) / 2;
        const cy = (l0.m[1] + l1.m[1]) / 2 + (Math.cos(pm) * (l0.h[1] + l1.h[1])) / 2;
        const d = Math.sin(pm) * ((l0.r + l1.r) / 2) * round;
        out.push({ key: key(cx, cy, d), d: quad([pt(l0, p0), pt(l1, p0), pt(l1, p1), pt(l0, p1)]), fill: shade(n, tones) });
      }
    }
    [0, lv.length - 1].forEach((i, e) => {
      if (!caps[e] || lv.length < 2) return;
      const l = lv[i];
      const nb = lv[e ? i - 1 : i + 1];
      const t = [l.m[0] - nb.m[0], l.m[1] - nb.m[1]];
      const tl = Math.hypot(t[0], t[1]) || 1;
      if (facing([t[0] / tl, 0, -t[1] / tl]) <= 0.01) return;
      const ring = (k) => {
        const ps = [];
        for (let j = 0; j <= 24; j++) {
          const ph = (j / 24) * Math.PI;
          const d = Math.sin(ph) * l.r * round * k;
          ps.push([l.m[0] + Math.cos(ph) * l.h[0] * k + d * w[0], l.m[1] + Math.cos(ph) * l.h[1] * k + d * w[1]]);
        }
        return quad(ps);
      };
      const kk = key(l.m[0], l.m[1], l.r * round * 0.4) + 0.5;
      out.push({ key: kk, d: ring(1), fill: capFill || shade([t[0] / tl, 0, -t[1] / tl], tones) });
      out.push({ key: kk + 0.01, d: ring(lumen), fill: lumenFill || "#000" });
    });
    return out;
  }

  /** A closed outline (a blob): each point rolls back over a quarter-round of radius rho(i) toward the inside,
   *  so a circle becomes a hemisphere. Points must be evenly spaced (use byLength). */
  function rim(pts, { rho, round = 0.95, nphi = 10, tones }) {
    const n = pts.length;
    let area = 0;
    for (let i = 0; i < n; i++) area += pts[i][0] * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * pts[i][1];
    const sgn = area > 0 ? 1 : -1; // outward normal side for this winding (section y points down)
    const nrm = pts.map((p, i) => {
      const a = pts[(i - 1 + n) % n];
      const b = pts[(i + 1) % n];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      return [(sgn * (b[1] - a[1])) / l, (-sgn * (b[0] - a[0])) / l];
    });
    const R = pts.map((p, i) => (typeof rho === "function" ? rho(p, i) : rho));
    const pt = (i, ph) => {
      const r = R[i];
      const back = Math.sin(ph) * r * round;
      const inn = (1 - Math.cos(ph)) * r;
      return [pts[i][0] - nrm[i][0] * inn + back * w[0], pts[i][1] - nrm[i][1] * inn + back * w[1]];
    };
    const out = [];
    for (let i = 0; i < n; i++) {
      const i1 = (i + 1) % n;
      const nx = nrm[i][0] + nrm[i1][0];
      const ny = nrm[i][1] + nrm[i1][1];
      const nm = Math.hypot(nx, ny) || 1;
      for (let j = 0; j < nphi; j++) {
        const p0 = (j / nphi) * (Math.PI / 2);
        const p1 = ((j + 1) / nphi) * (Math.PI / 2);
        const pm = (p0 + p1) / 2;
        const nn = [(Math.cos(pm) * nx) / nm, -Math.sin(pm), (-Math.cos(pm) * ny) / nm];
        if (facing(nn) <= 0.01) continue;
        const r = (R[i] + R[i1]) / 2;
        const inn = (1 - Math.cos(pm)) * r;
        const cx = (pts[i][0] + pts[i1][0]) / 2 - (nx / nm) * inn;
        const cy = (pts[i][1] + pts[i1][1]) / 2 - (ny / nm) * inn;
        out.push({ key: key(cx, cy, Math.sin(pm) * r * round), d: quad([pt(i, p0), pt(i1, p0), pt(i1, p1), pt(i, p1)]), fill: shade(nn, tones) });
      }
    }
    return out;
  }

  /** All facets back to front, each with a hairline of its own colour so neighbours meet without seams. */
  function paint(quads) {
    quads.sort((a, b) => a.key - b.key);
    return quads.map((v) => `<path d="${v.d}" fill="${v.fill}" stroke="${v.fill}" stroke-width="0.7" stroke-linejoin="round"/>`).join("");
  }
  /** Several objects (each a list of facets): objects back to front by their mean depth, each object's facets
   *  merged into one path per tone. Far fewer nodes per frame; fine because one object's visible facets don't overlap. */
  function paintObjects(objects) {
    const live = objects.filter((o) => o.length).map((o) => ({ o, k: o.reduce((s, q) => s + q.key, 0) / o.length }));
    live.sort((a, b) => a.k - b.k);
    let svg = "";
    for (const { o } of live) {
      const byFill = new Map();
      for (const q of o) byFill.set(q.fill, (byFill.get(q.fill) || "") + q.d);
      for (const [fill, d] of byFill) svg += `<path d="${d}" fill="${fill}" stroke="${fill}" stroke-width="0.7" stroke-linejoin="round"/>`;
    }
    return svg;
  }
  /** Theme colour (#rrggbb custom property) as [r, g, b]. */
  function rgbOf(el, name, fallback) {
    const v = (getComputedStyle(el).getPropertyValue(name) || "").trim();
    const m = /^#?([0-9a-f]{6})$/i.exec(v) || /^#?([0-9a-f]{6})$/i.exec(fallback);
    return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
  }
  return { sampleClosed: (p, k, s) => sample(p, true, k, s), sampleOpen: (p, k, s) => sample(p, false, k, s), byLength, chords, rim, paint, paintObjects, rgbOf };
}

// A6 · the red cell's loop as a real-time 3-D scene (the figure's own scene for shared/gl3; build.mjs inlines this file).
//
// Everything is modelled in the cut face's own coordinates, the ones the drawing uses: x to the right, y down the
// page, z = depth behind the cut (negative z stands proud of the cut, toward the viewer). One group maps that to the
// kit's world (x, DEP − z, −y), so each part sits exactly where the SVG draws it and the ticks stay registered.
//
//   bone      cortical shell (round back half + the cut ring), marrow face, trabecular lattice, fat cells,
//             two erythroblastic islands (a nurse cell ringed by erythroblasts, early violet to late red)
//   vessel    one open half-pipe: the marrow sinusoid flaring into the 120-day arc and ending inside the spleen
//   spleen    capsule (round back half + cut ring), red-pulp face with cords, white-pulp nodules with arterioles,
//             the macrophage (cytoplasm bed, nucleus, phagosome, ferritin granules under a see-through membrane)
//   return    the transferrin half-pipe from the macrophage back to the lower island
//   movers    red cells (four shapes: made short of iron, full, reticulocyte, old), transferrin, IV complex,
//             ferritin granules, the IV line: all placed each frame from the state live.js draws the SVG from
//
// Where a vessel runs through an organ, the organ's surfaces are cut away around it in the shader (a chain of
// capsules along the vessel), so the open half-pipe reads as one continuous channel from marrow to spleen.
function a6Scene(ctx, DATA) {
  const T = ctx.THREE;
  const night = ctx.night;
  const lo = ctx.coarse;
  const G3 = DATA.g3;
  const MAC = DATA.mac;
  const DEP = DATA.far.dep;
  const sec = new T.Group();
  sec.matrixAutoUpdate = false;
  sec.matrix.set(1, 0, 0, 0, 0, 0, -1, DEP, 0, -1, 0, 0, 0, 0, 0, 1);
  ctx.root.add(sec);

  // ---------------------------------------------------------------- palette (the drawing's, figure.css)
  const PAL = {
    cortex: "#f5ecd6", cortexOut: "#e2d2ac", marrow0: "#b63c42", marrow1: "#6e1c22", trab: "#f1e5c6", fat: "#f4dd96",
    nurse: "#f7e4d3", nurseNuc: "#6d588a", ebEarly: "#7f6cc0", ebLate: "#e0584a", ebNuc: "#33246a",
    sinIn: "#6e1c22", sinRim: "#b25349",
    arcIn: "#cf9690", arcRim: "#dc9488", arcOut: "#a8574c",
    retIn: "#ecdcae", retRim: "#cdb272", retOut: "#a8925a",
    pulp0: "#a03a45", pulp1: "#5c1921", spleenOut: "#863036", capsule: "#c48b80", cords: "#c9736e", white: "#d9a3a0", art: "#8a2230",
    mac0: "#fff3e8", mac1: "#e8cfba", macMem: "#f0d2c0", macNuc: "#6d588a", phago: "#bb786e", gran: "#c98a1c",
    full: "#d2382a", fullP: "#ee7f6a", pale: "#e39a8d", paleP: "#f8dcd3", young: "#b4467a", youngP: "#c9689a", retic: "#fbd2e6", old: "#84201a", oldP: "#a93c30",
    tf: "#e6ad24", ivp: "#a8650c", iv: "#8f9ca6",
  };
  if (night) Object.assign(PAL, { tf: "#f2c044", ivp: "#d08a1c", iv: "#b9c2c9" });

  // ---------------------------------------------------------------- small maths
  const hash = (n) => {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  const lerp = (a, b, t) => a + (b - a) * t;
  const sat = (v) => Math.min(1, Math.max(0, v));
  const sstep = (a, b, v) => {
    const t = sat((v - a) / (b - a));
    return t * t * (3 - 2 * t);
  };
  const col = (hex) => new T.Color(hex);
  const rgb = (hex) => {
    const c = col(hex);
    return [c.r, c.g, c.b];
  };
  const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const inPoly = (P, x, y) => {
    let c = false;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
      const [xi, yi] = P[i];
      const [xj, yj] = P[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };

  // ---------------------------------------------------------------- curves
  /** The figures' smooth(): a closed uniform Catmull-Rom through pts, sampled. */
  function closedCurve(pts, steps = 10) {
    const n = pts.length;
    const out = [];
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        const u = 1 - t;
        out.push([0, 1].map((c) => u * u * u * p1[c] + 3 * u * u * t * c1[c] + 3 * u * t * t * c2[c] + t * t * t * p2[c]));
      }
    }
    return out;
  }
  const lengthOf = (P) => P.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - P[i][0], p[1] - P[i][1]), 0);
  /** n points evenly spaced by length along a polyline (every component is interpolated); closed: round the loop. */
  function evenly(poly, n, closed = false) {
    const P = closed ? [...poly, poly[0]] : poly;
    const acc = [0];
    for (let i = 1; i < P.length; i++) acc.push(acc[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    const L = acc[acc.length - 1];
    const out = [];
    let j = 0;
    for (let q = 0; q < n; q++) {
      const want = (L * q) / (closed ? n : n - 1);
      while (j < acc.length - 2 && acc[j + 1] < want) j++;
      const t = sat((want - acc[j]) / (acc[j + 1] - acc[j] || 1));
      out.push(P[j].map((v, c) => v + (P[j + 1][c] - v) * t));
    }
    return out;
  }
  /** Outward unit normals of a closed outline (y points down the page). */
  function outward(poly) {
    const n = poly.length;
    let area = 0;
    for (let i = 0; i < n; i++) area += poly[i][0] * poly[(i + 1) % n][1] - poly[(i + 1) % n][0] * poly[i][1];
    const s = area > 0 ? 1 : -1;
    return poly.map((p, i) => {
      const a = poly[(i - 1 + n) % n];
      const b = poly[(i + 1) % n];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      return [(s * (b[1] - a[1])) / l, (-s * (b[0] - a[0])) / l];
    });
  }
  const grow = (poly, nrm, d) => poly.map((p, i) => [p[0] + nrm[i][0] * d, p[1] + nrm[i][1] * d]);
  const centreOf = (poly) => [poly.reduce((s, p) => s + p[0], 0) / poly.length, poly.reduce((s, p) => s + p[1], 0) / poly.length];
  const quad = (a, m, b, n) => Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    return [u * u * a[0] + 2 * u * t * m[0] + t * t * b[0], u * u * a[1] + 2 * u * t * m[1] + t * t * b[1]];
  });

  // ---------------------------------------------------------------- geometry
  const bag = (colored = false) => ({ pos: [], idx: [], col: colored ? [] : null });
  function finish(b) {
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(b.pos, 3));
    if (b.col) g.setAttribute("color", new T.Float32BufferAttribute(b.col, 3));
    g.setIndex(b.idx);
    g.computeVertexNormals();
    return g;
  }
  /** nu × nv points from fn(i, j), joined as a sheet (wrap closes it in i). out(x, y, z, i, j) is roughly the outward
   *  direction at a facet; the sheet's winding is turned to agree with it. */
  function grid(b, nu, nv, fn, { wrap = false, out = null, color = null } = {}) {
    const base = b.pos.length / 3;
    for (let i = 0; i < nu; i++)
      for (let j = 0; j < nv; j++) {
        const p = fn(i, j);
        b.pos.push(p[0], p[1], p[2]);
        if (b.col) {
          const c = typeof color === "function" ? color(i, j) : color;
          b.col.push(c[0], c[1], c[2]);
        }
      }
    const at = (i, j) => base + (i % nu) * nv + j;
    const start = b.idx.length;
    const ni = wrap ? nu : nu - 1;
    for (let i = 0; i < ni; i++) for (let j = 0; j < nv - 1; j++) b.idx.push(at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j), at(i + 1, j + 1), at(i, j + 1));
    if (!out) return;
    let score = 0;
    const P = b.pos;
    for (let t = start; t < b.idx.length; t += 3) {
      const v0 = b.idx[t] - base;
      const a = b.idx[t] * 3, c = b.idx[t + 1] * 3, d = b.idx[t + 2] * 3;
      const ux = P[c] - P[a], uy = P[c + 1] - P[a + 1], uz = P[c + 2] - P[a + 2];
      const vx = P[d] - P[a], vy = P[d + 1] - P[a + 1], vz = P[d + 2] - P[a + 2];
      const o = out((P[a] + P[c] + P[d]) / 3, (P[a + 1] + P[c + 1] + P[d + 1]) / 3, (P[a + 2] + P[c + 2] + P[d + 2]) / 3, Math.floor(v0 / nv), v0 % nv);
      score += (uy * vz - uz * vy) * o[0] + (uz * vx - ux * vz) * o[1] + (ux * vy - uy * vx) * o[2];
    }
    if (score < 0)
      for (let t = start; t < b.idx.length; t += 3) {
        const k = b.idx[t + 1];
        b.idx[t + 1] = b.idx[t + 2];
        b.idx[t + 2] = k;
      }
  }
  /** A flat face at depth z, seen from the cut. */
  function face(b, poly, z, color) {
    const base = b.pos.length / 3;
    for (const p of poly) {
      b.pos.push(p[0], p[1], z);
      if (b.col) b.col.push(color[0], color[1], color[2]);
    }
    for (const [i0, i1, i2] of T.ShapeUtils.triangulateShape(poly.map((p) => new T.Vector2(p[0], p[1])), [])) {
      const a = poly[i0], c = poly[i1], d = poly[i2];
      if ((c[0] - a[0]) * (d[1] - a[1]) - (c[1] - a[1]) * (d[0] - a[0]) < 0) b.idx.push(base + i0, base + i1, base + i2);
      else b.idx.push(base + i0, base + i2, base + i1);
    }
  }
  /** A closed outline swelled into a dome: every point runs to the centre as the surface rises h (h < 0: toward the viewer). */
  function dome(b, ring, c, z0, h, rows, color = null, full = 1) {
    grid(b, ring.length, rows + 1, (i, j) => {
      const ph = ((j / rows) * Math.PI) / 2;
      const k = Math.pow(Math.cos(ph), full);
      return [c[0] + (ring[i][0] - c[0]) * k, c[1] + (ring[i][1] - c[1]) * k, z0 + h * Math.sin(ph)];
    }, { wrap: true, out: (x, y, z) => [x - c[0], y - c[1], (z - z0) * 2], color });
  }
  /** A ball (sz flattens it front to back). */
  function ball(b, c, r, seg, color = null, sz = 1) {
    const nv = Math.max(4, seg >> 1) + 1;
    grid(b, seg, nv, (i, j) => {
      const a = (i / seg) * Math.PI * 2;
      const ph = (j / (nv - 1)) * Math.PI;
      const s = Math.sin(ph) * r;
      return [c[0] + Math.cos(a) * s, c[1] + Math.sin(a) * s, c[2] + Math.cos(ph) * r * sz];
    }, { wrap: true, out: (x, y, z) => [x - c[0], y - c[1], z - c[2]], color });
  }
  /** A round strut along [x, y, z, r] points, with rounded ends. */
  function tube(b, pts, seg, color = null) {
    const n = pts.length;
    const fr = pts.map((p, i) => {
      const a = pts[Math.max(0, i - 1)];
      const c = pts[Math.min(n - 1, i + 1)];
      let t = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      const l = Math.hypot(t[0], t[1], t[2]) || 1;
      t = [t[0] / l, t[1] / l, t[2] / l];
      const l1 = Math.hypot(t[0], t[1]) || 1;
      const n1 = [-t[1] / l1, t[0] / l1, 0];
      return { t, n1, n2: [t[1] * n1[2] - t[2] * n1[1], t[2] * n1[0] - t[0] * n1[2], t[0] * n1[1] - t[1] * n1[0]] };
    });
    const rings = [{ i: 0, s: -1, k: 0.03 }, { i: 0, s: -0.6, k: 0.78 }];
    for (let i = 0; i < n; i++) rings.push({ i, s: 0, k: 1 });
    rings.push({ i: n - 1, s: 0.6, k: 0.78 }, { i: n - 1, s: 1, k: 0.03 });
    grid(b, seg, rings.length, (i, j) => {
      const R = rings[j];
      const p = pts[R.i];
      const f = fr[R.i];
      const a = (i / seg) * Math.PI * 2;
      const ca = Math.cos(a) * p[3] * R.k;
      const sa = Math.sin(a) * p[3] * R.k;
      const ax = R.s * p[3];
      return [p[0] + f.t[0] * ax + f.n1[0] * ca + f.n2[0] * sa, p[1] + f.t[1] * ax + f.n1[1] * ca + f.n2[1] * sa, p[2] + f.t[2] * ax + f.n1[2] * ca + f.n2[2] * sa];
    }, { wrap: true, out: (x, y, z, i, j) => [x - pts[rings[j].i][0], y - pts[rings[j].i][1], z - pts[rings[j].i][2]], color });
  }
  /** A path of [x, y, R, w] points resampled every ds, with unit tangents: { x, y, tx, ty, R, w, wall }. */
  function channel(pts, ds) {
    const P = evenly(pts, Math.max(4, Math.round(lengthOf(pts) / ds) + 1));
    return P.map((p, i) => {
      const a = P[Math.max(0, i - 1)];
      const c = P[Math.min(P.length - 1, i + 1)];
      const l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1;
      return { x: p[0], y: p[1], tx: (c[0] - a[0]) / l, ty: (c[1] - a[1]) / l, R: p[2], w: p[3], wall: 0.5 + 0.045 * p[2] };
    });
  }
  /** An open half-pipe behind the cut along a channel: inner and outer walls, the cut rims, quarter-sphere ends. */
  function halfPipe(b, path, M, tint) {
    const capN = lo ? 4 : 6;
    const ext = (p, dir, m) => {
      const be = ((m / capN) * Math.PI) / 2;
      const Ro = p.R + p.wall;
      const Ri = p.R - p.wall;
      const s = Ro * Math.sin(be);
      return { x: p.x + dir * p.tx * s, y: p.y + dir * p.ty * s, tx: p.tx, ty: p.ty, ro: Math.max(0.03, Ro * Math.cos(be)), ri: Math.sqrt(Math.max(0.0009, Ri * Ri - s * s)), w: p.w };
    };
    const S = [];
    for (let m = capN; m >= 1; m--) S.push(ext(path[0], -1, m));
    for (const p of path) S.push({ x: p.x, y: p.y, tx: p.tx, ty: p.ty, ro: p.R + p.wall, ri: p.R - p.wall, w: p.w });
    for (let m = 1; m <= capN; m++) S.push(ext(path[path.length - 1], 1, m));
    const pt = (s, r, th) => {
      const c = Math.cos(th) * r;
      return [s.x - s.ty * c, s.y + s.tx * c, Math.sin(th) * r];
    };
    grid(b, S.length, M + 1, (i, j) => pt(S[i], S[i].ri, (j / M) * Math.PI), { out: (x, y, z, i) => [S[i].x - x, S[i].y - y, -z], color: (i) => tint.inner(S[i].w) });
    grid(b, S.length, M + 1, (i, j) => pt(S[i], S[i].ro, (j / M) * Math.PI), { out: (x, y, z, i) => [x - S[i].x, y - S[i].y, z], color: (i) => tint.outer(S[i].w) });
    for (const th of [0, Math.PI]) grid(b, S.length, 2, (i, j) => { const p = pt(S[i], j ? S[i].ro : S[i].ri, th); return [p[0], p[1], 0]; }, { out: () => [0, 0, -1], color: (i) => tint.rim(S[i].w) });
  }
  /** The capsules that cut an organ's surfaces away around a channel: [ax, ay, bx, by, ra, rb] for the stretch inside box. */
  function cutsOf(path, box, every) {
    const out = [];
    const step = Math.max(1, Math.round(every));
    for (let i = 0; i < path.length - 1; i += step) {
      const a = path[i];
      const c = path[Math.min(path.length - 1, i + step)];
      const inBox = (p) => p.x > box[0] - p.R - 4 && p.x < box[2] + p.R + 4 && p.y > box[1] - p.R - 4 && p.y < box[3] + p.R + 4;
      if (inBox(a) || inBox(c)) out.push([a.x, a.y, c.x, c.y, a.R, c.R]);
    }
    return out;
  }
  const boxOf = (poly, pad = 0) => [Math.min(...poly.map((p) => p[0])) - pad, Math.min(...poly.map((p) => p[1])) - pad, Math.max(...poly.map((p) => p[0])) + pad, Math.max(...poly.map((p) => p[1])) + pad];

  // ---------------------------------------------------------------- materials
  // One patched physical material: an optional chain of capsules that cuts the surface away (where a vessel runs
  // through an organ), an optional radial tone (the drawing's gradients), procedural mottle and micro-relief, and for
  // see-through cells an opacity that rises toward the silhouette (a membrane) and under highlights.
  const mats = [];
  const FRAG_PARS = `
varying vec3 vSec;
#if A6_NSEG > 0
uniform vec4 uSeg[ A6_NSEG ]; uniform vec2 uSegR[ A6_NSEG ];
#endif
#ifdef A6_GRAD
uniform vec4 uGrad; uniform vec3 uGradCol;
#endif
#ifdef A6_TEX
uniform vec3 uTex;
float a6h( vec3 p ) { p = fract( p * 0.3183099 + 0.1 ); p *= 17.0; return fract( p.x * p.y * p.z * ( p.x + p.y + p.z ) ); }
float a6n( vec3 x ) { vec3 i = floor( x ); vec3 f = fract( x ); f = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( mix( a6h( i ), a6h( i + vec3( 1, 0, 0 ) ), f.x ), mix( a6h( i + vec3( 0, 1, 0 ) ), a6h( i + vec3( 1, 1, 0 ) ), f.x ), f.y ),
              mix( mix( a6h( i + vec3( 0, 0, 1 ) ), a6h( i + vec3( 1, 0, 1 ) ), f.x ), mix( a6h( i + vec3( 0, 1, 1 ) ), a6h( i + vec3( 1, 1, 1 ) ), f.x ), f.y ), f.z ); }
float a6f( vec3 p ) { return 0.55 * a6n( p ) + 0.3 * a6n( p * 2.07 + 1.3 ) + 0.15 * a6n( p * 4.3 + 3.1 ); }
#endif
#ifdef A6_RIM
uniform vec3 uRim;
#endif
#ifdef A6_FADE
uniform vec3 uFade;
#endif
`;
  const FRAG_CUT = `
#if A6_NSEG > 0
for ( int i = 0; i < A6_NSEG; i ++ ) {
  vec2 a6a = uSeg[ i ].xy; vec2 a6pa = vSec.xy - a6a; vec2 a6ba = uSeg[ i ].zw - a6a;
  float a6t = clamp( dot( a6pa, a6ba ) / max( dot( a6ba, a6ba ), 1e-4 ), 0.0, 1.0 );
  float a6r = mix( uSegR[ i ].x, uSegR[ i ].y, a6t );
  vec2 a6q = a6pa - a6ba * a6t;
  if ( dot( a6q, a6q ) + vSec.z * vSec.z < a6r * a6r ) discard;
}
#endif
`;
  const FRAG_COLOR = `
#ifdef A6_GRAD
{ float a6g = clamp( length( ( vSec.xy - uGrad.xy ) * uGrad.zw ), 0.0, 1.0 ); diffuseColor.rgb = mix( diffuseColor.rgb, uGradCol, a6g * a6g * ( 3.0 - 2.0 * a6g ) ); }
#endif
#ifdef A6_TEX
{ float a6m = a6f( vSec * uTex.z * 0.31 + 11.0 ); diffuseColor.rgb *= 1.0 + uTex.x * ( a6m - 0.5 ) * vec3( 0.9, 1.2, 1.2 ); }
#endif
#ifdef A6_FADE
diffuseColor.rgb *= mix( 1.0, uFade.z, smoothstep( uFade.x, uFade.y, vSec.z ) );
#endif
`;
  const FRAG_BUMP = `
#ifdef A6_TEX
if ( uTex.y > 0.0 ) {
  float a6e = a6f( vSec * uTex.z ) * uTex.y;
  vec3 a6sx = dFdx( - vViewPosition ); vec3 a6sy = dFdy( - vViewPosition );
  vec3 a6r1 = cross( a6sy, normal ); vec3 a6r2 = cross( normal, a6sx );
  float a6d = dot( a6sx, a6r1 ) * faceDirection;
  normal = normalize( abs( a6d ) * normal - sign( a6d ) * ( dFdx( a6e ) * a6r1 + dFdy( a6e ) * a6r2 ) );
}
#endif
`;
  const FRAG_RIM = `
#ifdef A6_RIM
{ float a6v = 1.0 - saturate( dot( normal, geometryViewDir ) );
  diffuseColor.a = clamp( mix( diffuseColor.a, uRim.x, pow( a6v, uRim.y ) ) + dot( totalSpecular, vec3( 0.3333 ) ) * uRim.z, 0.0, 1.0 ); }
#endif
`;
  function mat({ cut = null, grad = null, mottle = 0, bump = 0, freq = 0.3, rim = null, fade = null, ...phys }) {
    const m = new T.MeshPhysicalMaterial({ metalness: 0, roughness: 0.5, ...phys });
    const defs = { A6_NSEG: cut ? cut.length : 0 };
    const U = {};
    if (cut && cut.length) {
      U.uSeg = { value: cut.map((s) => new T.Vector4(s[0], s[1], s[2], s[3])) };
      U.uSegR = { value: cut.map((s) => new T.Vector2(s[4], s[5])) };
    }
    if (grad) {
      defs.A6_GRAD = "";
      U.uGrad = { value: new T.Vector4(grad.c[0], grad.c[1], 1 / grad.r[0], 1 / grad.r[1]) };
      U.uGradCol = { value: col(grad.color) };
    }
    if (mottle || bump) {
      defs.A6_TEX = "";
      U.uTex = { value: new T.Vector3(mottle, bump, freq) };
    }
    if (rim) {
      defs.A6_RIM = "";
      U.uRim = { value: new T.Vector3(rim.a, rim.p, rim.s || 0) };
    }
    if (fade) {
      // darker with depth behind the cut: the falloff that makes a round back or an open pipe read as round
      defs.A6_FADE = "";
      U.uFade = { value: new T.Vector3(fade[0], fade[1], fade[2]) };
    }
    m.defines = { ...(m.defines || {}), ...defs };
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vSec;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvSec = position;");
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", `#include <common>\n${FRAG_PARS}`)
        .replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>\n${FRAG_CUT}`)
        .replace("#include <color_fragment>", `#include <color_fragment>\n${FRAG_COLOR}`)
        .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>\n${FRAG_BUMP}`)
        .replace("#include <opaque_fragment>", `${FRAG_RIM}\n#include <opaque_fragment>`);
    };
    m.customProgramCacheKey = () => `a6|${Object.keys(defs).join("|")}|${defs.A6_NSEG}`;
    mats.push(m);
    return m;
  }
  const WET = { sheen: 0.22, sheenRoughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.34 };
  const solid = (geo, material, { cast = false, receive = true } = {}) => {
    const mesh = new T.Mesh(geo, material);
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    mesh.matrixAutoUpdate = false;
    sec.add(mesh);
    return mesh;
  };
  const glassy = (mesh, order = 1) => {
    mesh.renderOrder = order;
    return ctx.ghost(mesh);
  };

  // ---------------------------------------------------------------- the two channels (vessels)
  const DS = lo ? 5 : 3.2;
  const HALF = lo ? 10 : 16;
  // marrow sinusoid → the 120-day arc → inside the spleen. [x, y, lumen radius, 0 sinusoid … 1 arc]
  const isl0 = DATA.islands[0].c;
  const sinPts = DATA.sinus.filter((p) => Math.hypot(p[0] - isl0[0], p[1] - isl0[1]) >= 13);
  const Ls = lengthOf(sinPts);
  const arcL = lengthOf(DATA.arc);
  let run = 0;
  const loopPts = sinPts.map((p, i) => {
    if (i) run += Math.hypot(p[0] - sinPts[i - 1][0], p[1] - sinPts[i - 1][1]);
    return [p[0], p[1], lerp(lerp(7.5, 9, run / Ls), 17, sstep(Ls - 20, Ls - 1, run)), sstep(Ls - 22, Ls + 6, run)];
  });
  run = 0;
  DATA.arc.forEach((p, i) => {
    if (!i) return;
    run += Math.hypot(p[0] - DATA.arc[i - 1][0], p[1] - DATA.arc[i - 1][1]);
    loopPts.push([p[0], p[1], lerp(17, 15, run / arcL), sstep(Ls - 22, Ls + 6, Ls + run)]);
  });
  const LOOP = channel(loopPts, DS);
  // the transferrin return: from under the macrophage to under the lower island's nurse cell
  const retL = lengthOf(DATA.ret);
  run = 0;
  const retPts = [];
  DATA.ret.forEach((p, i) => {
    if (i) run += Math.hypot(p[0] - DATA.ret[i - 1][0], p[1] - DATA.ret[i - 1][1]);
    if (Math.hypot(p[0] - MAC.c[0], p[1] - MAC.c[1]) >= 34 || i > 6) retPts.push([p[0], p[1], lerp(7, 6, run / retL), 0]);
  });
  const BACK = channel(retPts, DS);

  // ---------------------------------------------------------------- an organ cut in half: round back, cut rim, cut face
  const RINGN = lo ? 84 : 128;
  function organ({ outline, depth, rim, rimProud, faceZ, shell, rimMat, faceMat }) {
    const ring = evenly(closedCurve(outline, 10), RINGN, true);
    const nrm = outward(ring);
    const c = centreOf(ring);
    const outer = grow(ring, nrm, rim[0]);
    const b = bag();
    dome(b, outer, c, 0, depth, lo ? 12 : 18);
    solid(finish(b), shell);
    // the cut rim (cortex / capsule): crowned a little proud of the cut, then its inner wall down to the tissue
    const prof = [[rim[0], 0.8]];
    for (let k = 0; k <= 6; k++) prof.push([rim[0] - 0.15 - (k / 6) * (rim[0] + rim[1] - 0.3), -rimProud * (1 - Math.pow(Math.abs((2 * k) / 6 - 1), 2.6))]);
    prof.push([-rim[1], faceZ + 2.5]);
    const rb = bag();
    grid(rb, RINGN, prof.length, (i, j) => [ring[i][0] + nrm[i][0] * prof[j][0], ring[i][1] + nrm[i][1] * prof[j][0], prof[j][1]], { wrap: true, out: () => [0, 0, -1] });
    solid(finish(rb), rimMat);
    const fb = bag();
    const inner = grow(ring, nrm, -rim[1] + 1);
    face(fb, inner, faceZ, null);
    solid(finish(fb), faceMat);
    return { ring, nrm, c, inner: grow(ring, nrm, -rim[1] + 1.5), box: boxOf(outer) };
  }

  // ---------------------------------------------------------------- bone and marrow (left)
  const boneBox = boxOf(DATA.far.bone, 8);
  const boneCut = [...cutsOf(LOOP, boneBox, 9 / DS), ...cutsOf(BACK, boneBox, 9 / DS)];
  const MZ = 3; // the marrow face sits this far behind the cortex's cut
  const bw = boneBox[2] - boneBox[0];
  const bh = boneBox[3] - boneBox[1];
  const BONE = organ({
    outline: DATA.far.bone,
    depth: 72,
    rim: [7, 6],
    rimProud: 1.7,
    faceZ: MZ,
    shell: mat({ color: PAL.cortexOut, roughness: 0.6, sheen: 0.2, sheenRoughness: 0.6, clearcoat: 0.1, clearcoatRoughness: 0.5, mottle: 0.14, bump: 0.2, freq: 0.16, fade: [1, 62, 0.6], cut: boneCut }),
    rimMat: mat({ color: PAL.cortex, roughness: 0.6, sheen: 0.2, sheenRoughness: 0.6, mottle: 0.08, bump: 0.12, freq: 0.5, cut: boneCut }),
    faceMat: mat({ color: PAL.marrow0, roughness: 0.5, ...WET, sheenColor: "#ffc9bd", cut: boneCut, clearcoat: 0.5, grad: { c: [boneBox[0] + bw * 0.45, boneBox[1] + bh * 0.45], r: [bw * 0.66, bh * 0.66], color: PAL.marrow1 }, mottle: 0.44, bump: 0.7, freq: 0.17 }),
  });
  {
    // trabecular bone: the drawing's lattice as round struts, half sunk in the marrow and running into the cortex
    const b = bag();
    const zOf = (x, y) => 1.3 + 2.7 * hash(x * 0.37 + y * 0.73);
    const seg = lo ? 6 : 8;
    const inside = (p) => inPoly(BONE.inner, p[0], p[1]);
    for (const s of G3.struts) {
      const pts = quad([s[0], s[1]], [s[2], s[3]], [s[4], s[5]], lo ? 5 : 7);
      const z0 = zOf(s[0], s[1]);
      const z1 = zOf(s[4], s[5]);
      let runPts = [];
      const flush = () => {
        if (runPts.length > 1) tube(b, runPts, seg);
        runPts = [];
      };
      pts.forEach((p, i) => {
        const t = i / (pts.length - 1);
        if (inside(p)) runPts.push([p[0], p[1], lerp(z0, z1, t) + 0.5 * Math.sin(t * Math.PI), 2.55 - 0.45 * Math.sin(t * Math.PI)]);
        else flush();
      });
      flush();
    }
    for (const [x, y, r] of G3.nodes) if (inside([x, y])) ball(b, [x, y, zOf(x, y)], r * 0.92, lo ? 8 : 10);
    solid(finish(b), mat({ color: PAL.trab, roughness: 0.6, sheen: 0.3, sheenRoughness: 0.6, clearcoat: 0.1, clearcoatRoughness: 0.5 }), { cast: true });
  }
  // every repeated body is an InstancedMesh hung from a point deep inside the bone: the shared layer's floor-shadow
  // passes draw an instanced mesh once at its own origin, so that origin has to be somewhere already in shadow
  const HOME = [BONE.c[0], BONE.c[1], 30];
  const M4 = new T.Matrix4();
  const Q = new T.Quaternion();
  const QI = new T.Quaternion();
  const V1 = new T.Vector3();
  const V2 = new T.Vector3();
  const YUP = new T.Vector3(0, 1, 0);
  function many(geo, material, n, { cast = true, receive = true } = {}) {
    const m = new T.InstancedMesh(geo, material, n);
    m.instanceMatrix.setUsage(T.DynamicDrawUsage);
    m.position.set(HOME[0], HOME[1], HOME[2]);
    m.frustumCulled = false;
    m.castShadow = cast;
    m.receiveShadow = receive;
    m.count = 0;
    sec.add(m);
    return m;
  }
  const put = (m, i, x, y, z, sx, sy = sx, sz = sx, q = QI) => {
    V1.set(x - HOME[0], y - HOME[1], z - HOME[2]);
    V2.set(sx, sy, sz);
    M4.compose(V1, q, V2);
    m.setMatrixAt(i, M4);
  };
  const SPH = new T.SphereGeometry(1, lo ? 14 : 20, lo ? 10 : 12);
  const SPH_S = new T.SphereGeometry(1, lo ? 8 : 12, lo ? 6 : 8);
  const SPH_T = new T.SphereGeometry(1, lo ? 6 : 8, lo ? 4 : 6); // the smallest beads
  {
    // fat cells: see-through yellow globules sunk in the marrow
    const fat = many(SPH, mat({ color: PAL.fat, roughness: 0.2, clearcoat: 0.9, clearcoatRoughness: 0.12, transparent: true, opacity: 0.5, depthWrite: false, rim: { a: 0.92, p: 2.0, s: 0.8 } }), G3.fat.length, { receive: false });
    fat.renderOrder = 1;
    G3.fat.forEach(([x, y, r], i) => put(fat, i, x, y, MZ + r * 0.1, r, r, r * 0.5));
    fat.count = G3.fat.length;
    // erythroblastic islands: a nurse macrophage ringed by erythroblasts, early (violet, big nucleus) to late (red, small)
    const cells = G3.islands.flatMap((I) => I.cells);
    // (see-through, but left in the shadow and occlusion passes: they are solid bodies sitting on the marrow)
    const cyto = many(SPH, mat({ color: "#ffffff", roughness: 0.28, clearcoat: 0.8, clearcoatRoughness: 0.15, transparent: true, opacity: 0.36, depthWrite: false, rim: { a: 0.97, p: 2.0, s: 0.6 } }), cells.length, { receive: false });
    cyto.renderOrder = 2;
    const nuc = many(SPH, mat({ color: "#ffffff", roughness: 0.35, clearcoat: 0.5, clearcoatRoughness: 0.25, sheen: 0.4, sheenColor: "#8d7fd0" }), cells.length + G3.islands.length);
    const early = col(PAL.ebEarly);
    const late = col(PAL.ebLate);
    const tint = new T.Color();
    cells.forEach(([x, y, m, rc, rn], i) => {
      const z = MZ - rc * 0.72;
      put(cyto, i, x, y, z, rc, rc, rc * 0.92);
      cyto.setColorAt(i, tint.copy(early).lerp(late, m));
      put(nuc, i, x + 0.6, y - 0.4, z - rc * 0.12, rn, rn, rn * 0.9);
      nuc.setColorAt(i, tint.set(PAL.ebNuc));
    });
    cyto.count = cells.length;
    const nb = bag();
    G3.islands.forEach((I, k) => {
      const ring = evenly(closedCurve(I.nurse, 8), lo ? 28 : 40, true);
      dome(nb, ring, I.c, MZ, -I.r * 0.3, lo ? 6 : 9, null, 0.8);
      put(nuc, cells.length + k, I.nuc[0], I.nuc[1], MZ - I.r * 0.13, I.nuc[2], I.nuc[2], I.nuc[2] * 0.7);
      nuc.setColorAt(cells.length + k, tint.set(PAL.nurseNuc));
    });
    nuc.count = cells.length + G3.islands.length;
    cyto.instanceColor.needsUpdate = nuc.instanceColor.needsUpdate = true;
    solid(finish(nb), mat({ color: PAL.nurse, roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.2, transparent: true, opacity: 0.44, depthWrite: false, rim: { a: 0.96, p: 2.0, s: 0.5 } }), { cast: true, receive: false }).renderOrder = 1;
  }

  // ---------------------------------------------------------------- the vessels
  {
    const sIn = rgb(PAL.sinIn), aIn = rgb(PAL.arcIn), sRim = rgb(PAL.sinRim), aRim = rgb(PAL.arcRim), aOut = rgb(PAL.arcOut);
    const b = bag(true);
    halfPipe(b, LOOP, HALF, { inner: (w) => mix3(sIn, aIn, w), rim: (w) => mix3(sRim, aRim, w), outer: (w) => mix3(sRim, aOut, w) });
    solid(finish(b), mat({ color: "#ffffff", vertexColors: true, roughness: 0.4, ...WET, sheenColor: "#ffe3dc", fade: [0, 15, 0.7] }));
    const rb = bag(true);
    const rIn = rgb(PAL.retIn), rRim = rgb(PAL.retRim), rOut = rgb(PAL.retOut);
    halfPipe(rb, BACK, lo ? 8 : 12, { inner: () => rIn, rim: () => rRim, outer: () => rOut });
    solid(finish(rb), mat({ color: "#ffffff", vertexColors: true, roughness: 0.45, sheen: 0.2, sheenRoughness: 0.5, sheenColor: "#fff4d6", clearcoat: 0.3, clearcoatRoughness: 0.35, fade: [0, 6.5, 0.7] }));
  }

  // ---------------------------------------------------------------- spleen (right)
  const spBox = boxOf(DATA.far.spleen, 6);
  const spCut = [...cutsOf(LOOP, spBox, 9 / DS), ...cutsOf(BACK, spBox, 9 / DS)];
  const PZ = 1.8; // the red-pulp face, behind the capsule's cut
  const sw = spBox[2] - spBox[0];
  const sh = spBox[3] - spBox[1];
  const SPLEEN = organ({
    outline: DATA.far.spleen,
    depth: 64,
    rim: [2.6, 2.2],
    rimProud: 0.9,
    faceZ: PZ,
    shell: mat({ color: PAL.spleenOut, roughness: 0.4, ...WET, clearcoat: 0.6, clearcoatRoughness: 0.22, sheenColor: "#f2a8a0", mottle: 0.2, bump: 0.25, freq: 0.12, fade: [1, 56, 0.58], cut: spCut }),
    rimMat: mat({ color: PAL.capsule, roughness: 0.5, ...WET, sheenColor: "#ffd9cf", cut: spCut }),
    faceMat: mat({ color: PAL.pulp0, roughness: 0.5, ...WET, sheenColor: "#ffbdb2", cut: spCut, clearcoat: 0.5, grad: { c: [spBox[0] + sw * 0.55, spBox[1] + sh * 0.45], r: [sw * 0.7, sh * 0.7], color: PAL.pulp1 }, mottle: 0.4, bump: 0.7, freq: 0.19 }),
  });
  const macRing = evenly(closedCurve(G3.macBody, 10), lo ? 56 : 84, true);
  {
    // red-pulp cords: low ridges on the cut face
    const b = bag();
    const inside = (p) => inPoly(SPLEEN.inner, p[0], p[1]) && Math.hypot(p[0] - MAC.c[0], p[1] - MAC.c[1]) > MAC.r + 6;
    for (const s of G3.cords) {
      const pts = quad([s[0], s[1]], [s[2], s[3]], [s[4], s[5]], lo ? 4 : 6);
      let runPts = [];
      const flush = () => {
        if (runPts.length > 1) tube(b, runPts, 6);
        runPts = [];
      };
      pts.forEach((p, i) => {
        const t = i / (pts.length - 1);
        if (inside(p)) runPts.push([p[0], p[1], PZ + 0.35, 1.05 + 0.5 * Math.sin(t * Math.PI)]);
        else flush();
      });
      flush();
    }
    solid(finish(b), mat({ color: PAL.cords, roughness: 0.45, ...WET, sheenColor: "#ffd2c8" }));
    // white pulp: lymphoid nodules, each a low mound studded with its lymphocytes round the central arteriole
    const wp = many(SPH, mat({ color: PAL.white, roughness: 0.6, sheen: 0.25, sheenRoughness: 0.5, sheenColor: "#ffffff", clearcoat: 0.2, clearcoatRoughness: 0.45 }), G3.white.length, { cast: false });
    const art = many(SPH_T, mat({ color: PAL.art, roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.2 }), G3.white.length);
    const perNodule = lo ? 26 : 40;
    const lym = many(SPH_T, mat({ color: "#ffffff", roughness: 0.5, sheen: 0.3, sheenRoughness: 0.5, sheenColor: "#ffffff", clearcoat: 0.3, clearcoatRoughness: 0.35 }), G3.white.length * perNodule);
    const base = col(PAL.white);
    const tone = new T.Color();
    let nl = 0;
    G3.white.forEach(([x, y, r], i) => {
      const h = r * 0.24;
      put(wp, i, x, y, PZ + 0.6, r * 0.97, r * 0.97, h);
      put(art, i, x + 3, y - 2, PZ + 0.6 - h * 0.97, 2.7, 2.7, 1.5);
      for (let k = 0; k < perNodule; k++) {
        const rho = Math.sqrt((k + 0.6) / perNodule) * 0.93;
        const a = k * 2.39996 + i;
        const bx = x + Math.cos(a) * rho * r;
        const by = y + Math.sin(a) * rho * r;
        if (Math.hypot(bx - x - 3, by - y + 2) < 3.4) continue; // the arteriole's place
        const br = r * (lo ? 0.2 : 0.165) * (0.82 + 0.36 * hash(k * 1.7 + i * 9.1));
        put(lym, nl, bx, by, PZ + 0.6 - h * Math.sqrt(Math.max(0, 1 - rho * rho)) + br * 0.25, br, br, br * 0.8);
        lym.setColorAt(nl++, tone.copy(base).multiplyScalar(0.94 + 0.2 * hash(k * 3.3 + i * 5.7)));
      }
    });
    wp.count = art.count = G3.white.length;
    lym.count = nl;
    lym.instanceColor.needsUpdate = true;
  }
  // the macrophage: a bed of cytoplasm on the cut, its nucleus and phagosome on it, a see-through membrane over them
  const MACZ = -2.6;
  const MACH = 13.5;
  const memZ = (x, y) => {
    // the membrane's height over a point of the bed
    const a = Math.atan2(y - MAC.c[1], x - MAC.c[0]);
    const i = Math.round(((a < 0 ? a + Math.PI * 2 : a) / (Math.PI * 2)) * 12) % 12;
    const rr = Math.hypot(G3.macBody[i][0] - MAC.c[0], G3.macBody[i][1] - MAC.c[1]);
    const rho = Math.min(0.999, Math.hypot(x - MAC.c[0], y - MAC.c[1]) / rr);
    return MACH * Math.sqrt(1 - rho * rho);
  };
  {
    const b = bag();
    face(b, macRing, MACZ, null);
    grid(b, macRing.length, 3, (i, j) => { const p = macRing[i]; const k = j === 0 ? 0.985 : 1; return [MAC.c[0] + (p[0] - MAC.c[0]) * k, MAC.c[1] + (p[1] - MAC.c[1]) * k, j === 0 ? MACZ : j === 1 ? MACZ + 0.5 : PZ + 1.5]; }, { wrap: true, out: (x, y) => [x - MAC.c[0], y - MAC.c[1], 0] });
    const mw = MAC.r * 2.2;
    solid(finish(b), mat({ color: PAL.mac0, roughness: 0.55, sheen: 0.25, sheenRoughness: 0.5, sheenColor: "#ffffff", grad: { c: [MAC.c[0] - mw * 0.1, MAC.c[1] - mw * 0.12], r: [mw * 0.62, mw * 0.62], color: PAL.mac1 }, mottle: 0.12, bump: 0.25, freq: 0.4 }), { cast: true });
    const nb = bag();
    const nr = evenly(closedCurve(G3.macNuc, 10), lo ? 28 : 44, true);
    dome(nb, nr, centreOf(nr), MACZ, -7.5, lo ? 6 : 10, null, 0.85);
    solid(finish(nb), mat({ color: PAL.macNuc, roughness: 0.4, ...WET, sheenColor: "#c9b8e6", mottle: 0.2, bump: 0.3, freq: 0.5 }), { cast: true });
    const pb = bag();
    ball(pb, [G3.phago[0], G3.phago[1], MACZ - 5.6], G3.phago[2], lo ? 16 : 24, null, 0.42);
    glassy(solid(finish(pb), mat({ color: PAL.phago, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.2, transparent: true, opacity: 0.5, depthWrite: false, rim: { a: 0.9, p: 1.4, s: 0.4 } }), { receive: false }), 1);
    const mb = bag();
    dome(mb, macRing, MAC.c, MACZ, -MACH, lo ? 9 : 14);
    solid(finish(mb), mat({ color: PAL.macMem, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.1, transparent: true, opacity: 0.2, depthWrite: false, rim: { a: 0.9, p: 1.7, s: 1.6 } }), { receive: false }).renderOrder = 3;
  }
  // ferritin granules: every slot of the drawing, shown in the same order as the store fills
  const gran = many(SPH_S, mat({ color: PAL.gran, roughness: 0.32, metalness: 0.25, clearcoat: 0.6, clearcoatRoughness: 0.2, ...(night ? { emissive: "#5a3a06", emissiveIntensity: 0.35 } : {}) }), DATA.gran.length);
  DATA.gran.forEach(([x, y], i) => {
    const room = Math.max(0, memZ(x, y) - 7.4);
    put(gran, i, x, y, MACZ - 2.75 - room * hash(i * 3.1 + 0.4) * 0.7, 2.75);
  });

  // ---------------------------------------------------------------- red cells
  // A lathe of the real cross-section (after Evans and Fung): half-thickness ∝ √(1−ρ²)·(c0 + c1ρ² + c2ρ⁴). The dimple
  // is paler (thinner cell, less hemoglobin in the light path): the drawing's central pallor.
  function cellGeo(R, [c0, c1, c2], thick, body, pallor, [p0, p1]) {
    const K = lo ? 4 : 6;
    const seg = lo ? 12 : 16;
    const prof = [];
    for (let k = 0; k <= K; k++) prof.push([Math.sin(((k / K) * Math.PI) / 2), 1]);
    for (let k = K - 1; k >= 0; k--) prof.push([Math.sin(((k / K) * Math.PI) / 2), -1]);
    const b = bag(true);
    const cb = rgb(body);
    const cp = rgb(pallor);
    grid(b, seg, prof.length, (i, j) => {
      const [rho, side] = prof[j];
      const a = (i / seg) * Math.PI * 2;
      const h = side * thick * R * 0.5 * Math.sqrt(Math.max(0, 1 - rho * rho)) * (c0 + c1 * rho * rho + c2 * rho * rho * rho * rho);
      return [Math.cos(a) * rho * R, h, Math.sin(a) * rho * R];
    }, { wrap: true, out: (x, y, z) => [x, y * 3, z], color: (i, j) => mix3(cp, cb, sstep(p0, p1, prof[j][0])) });
    return finish(b);
  }
  const cellMat = (o = {}) => mat({ color: "#ffffff", vertexColors: true, roughness: 0.36, clearcoat: 0.55, clearcoatRoughness: 0.2, sheen: 0.4, sheenRoughness: 0.5, sheenColor: "#ffb3a6", ...o });
  const NC = 200;
  const CELLS = [
    many(cellGeo(5.0, [0.06, 1.9, -1.1], 0.95, PAL.pale, PAL.paleP, [0.25, 0.72]), cellMat({ sheen: 0.2, clearcoat: 0.4 }), NC), // made short of iron: small, thin, wide pallor
    many(cellGeo(5.8, [0.24, 2.0, -1.12], 1.3, PAL.full, PAL.fullP, [0.1, 0.5]), cellMat(), NC), // made with enough iron
    many(cellGeo(5.9, [0.62, 1.1, -0.7], 1.45, PAL.young, PAL.youngP, [0.0, 0.5]), cellMat({ sheenColor: "#ffc4e0" }), 24), // reticulocyte: larger, plumper
    many(cellGeo(4.6, [0.95, 0.8, -0.55], 1.5, PAL.old, PAL.oldP, [0.0, 0.45]), cellMat({ sheenColor: "#e08a7c" }), 60), // old: darker, rounder
  ];
  const reticDots = many(SPH_T, mat({ color: PAL.retic, roughness: 0.4 }), 48, { cast: false });
  const tfBeads = many(SPH_S, mat({ color: PAL.tf, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.2, ...(night ? { emissive: "#6a4a08", emissiveIntensity: 0.3 } : {}) }), 220);
  const ivBeads = many(SPH_T, mat({ color: PAL.ivp, roughness: 0.35, clearcoat: 0.5, clearcoatRoughness: 0.25 }), 80);

  // ---------------------------------------------------------------- the IV line (shown around the dose)
  const ivMat = mat({ color: PAL.iv, roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.2, transparent: true, opacity: 0 });
  const iv = new T.Group();
  {
    const [a, c] = G3.iv.line;
    const l = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const d = [(c[0] - a[0]) / l, (c[1] - a[1]) / l];
    const b = bag();
    tube(b, [[a[0], a[1], 1.2, 1.5], [c[0] + d[0] * 5, c[1] + d[1] * 5, 1.2, 1.5]], lo ? 8 : 12);
    // the hub: the drawn rectangle as a tapered barrel on the same axis
    const hc = centreOf(G3.iv.hub);
    const hub = [-11, -9.6, -3, 4, 9.4, 10.6].map((s, i) => [hc[0] + d[0] * s, hc[1] + d[1] * s, 1.2, [5.2, 7.4, 7.4, 5.6, 4.6, 2.2][i]]);
    tube(b, hub, lo ? 12 : 18);
    const mesh = new T.Mesh(finish(b), ivMat);
    mesh.receiveShadow = true;
    iv.add(ctx.ghost(mesh));
    iv.visible = false;
    sec.add(iv);
  }

  // ---------------------------------------------------------------- every frame: place the movers from the figure's state
  const VIEW = (() => {
    // toward the viewer, in section coordinates
    const A = (ctx.P.azimuth * Math.PI) / 180;
    const E = (ctx.P.elevation * Math.PI) / 180;
    return [Math.cos(A) * Math.cos(E), -Math.sin(E), -Math.sin(A) * Math.cos(E)];
  })();
  const AX = new T.Vector3();
  let ivShown = 0;
  let shownGran = -1;
  // The shared layer's key light stands almost overhead (right for machines on a floor). This scene is a relief on an
  // upright cut face, which that light only rakes: so, once, the key is re-aimed from the upper left in front of the
  // cut, and its shadow map is fitted to the scene so cells and struts drop a short soft shadow on the tissue.
  // (A workaround inside this figure: the layer has no per-figure key direction yet. Without the light it does nothing.)
  let aimed = false;
  function aimKey() {
    aimed = true;
    const stageGroup = ctx.root.parent;
    const key = stageGroup && stageGroup.children.find((o) => o.isDirectionalLight && o.castShadow);
    if (!key || !key.shadow || !key.target) return;
    const L = new T.Vector3(-0.32, -0.56, -0.76).normalize(); // toward the light, in the cut face's coordinates
    const C = [315, 250, 20];
    const far = 1300;
    key.target.position.set(C[0], DEP - C[2], -C[1]);
    key.position.set(C[0] + L.x * far, DEP - (C[2] + L.z * far), -(C[1] + L.y * far));
    stageGroup.updateMatrixWorld(true);
    const eye = new T.Vector3().setFromMatrixPosition(key.matrixWorld);
    const aim = new T.Vector3().setFromMatrixPosition(key.target.matrixWorld);
    const view = new T.Matrix4().lookAt(eye, aim, new T.Vector3(0, 1, 0)).setPosition(eye).invert();
    const lo3 = [Infinity, Infinity, Infinity];
    const hi3 = [-Infinity, -Infinity, -Infinity];
    const v = new T.Vector3();
    for (const x of [26, 606]) for (const y of [10, 480]) for (const z of [-24, 80]) {
      v.set(x, y, z).applyMatrix4(sec.matrixWorld).applyMatrix4(view);
      [v.x, v.y, v.z].forEach((q, i) => {
        lo3[i] = Math.min(lo3[i], q);
        hi3[i] = Math.max(hi3[i], q);
      });
    }
    const cam = key.shadow.camera;
    cam.left = lo3[0] - 4;
    cam.right = hi3[0] + 4;
    cam.bottom = lo3[1] - 4;
    cam.top = hi3[1] + 4;
    cam.near = Math.max(1, -hi3[2] - 30);
    cam.far = -lo3[2] + 30;
    cam.updateProjectionMatrix();
    const size = lo ? 768 : 1024; // fitted to the scene, so this is finer on the tissue than the layer's own map and no dearer
    key.shadow.mapSize.set(size, size);
    key.shadow.radius = lo ? 3 : 4;
    key.shadow.blurSamples = 8;
    key.shadow.normalBias = 0.3;
    if (key.shadow.map) {
      key.shadow.map.dispose();
      key.shadow.map = null;
    }
  }
  function update(s) {
    if (!aimed) aimKey();
    const n = [0, 0, 0, 0];
    let nd = 0;
    for (const c of s.cells) {
      const mesh = CELLS[c.kind];
      if (n[c.kind] >= mesh.instanceMatrix.count) continue;
      const h1 = hash(c.n + 0.25);
      const h2 = hash(c.n + 0.61);
      const h3 = hash(c.n + 0.83);
      let x = c.x;
      let y = c.y;
      let z;
      // depth: the centre lane runs deeper in the pipe than the two beside it
      const R = lerp(17, 15, sat(c.age / 120));
      const lane = Math.abs(c.off) > 4.25 ? 1 : 0;
      const zArc = lane ? 2.0 + 1.5 * h1 : 5.0 + 2.4 * h1;
      if (c.at === 0) {
        // leaving the island: over the nurse cell, then down into the sinusoid
        z = lerp(-7.2, 3.1 + h1, sstep(0.02, 0.4, c.e));
      } else if (c.at === 1) {
        // the two side lanes pulled in a little where the pipe narrows, so no cell cuts through the wall
        const pull = Math.min(1, (R - 0.5 - 0.045 * R - 6.5) / 9.6);
        x = c.px + (c.x - c.px) * pull;
        y = c.py + (c.y - c.py) * pull;
        z = c.age < 3 ? lerp(3.1 + h1, zArc, sstep(0, 3, c.age)) : zArc;
      } else {
        z = lerp(lerp(zArc, -3.2, sstep(0.04, 0.3, c.e)), MACZ - 5, sstep(0.5, 0.95, c.e));
      }
      // facing: a disc seen part edge-on with its long axis along the flow (the drawing's ellipse), each leaning its
      // own way and rolling slowly as it ages. m = across the flow, square to the line of sight.
      const roll = c.age * 0.19;
      const th = 0.3 + 0.72 * h2 + 0.12 * Math.sin(roll + h3 * 6.3);
      const sg = (h3 > 0.5 ? 1 : -1) * Math.sin(th);
      const w = 0.42 * Math.sin(roll * 0.7 + h2 * 6.3);
      let mx = c.ty * VIEW[2], my = -c.tx * VIEW[2], mz = c.tx * VIEW[1] - c.ty * VIEW[0];
      const ml = Math.hypot(mx, my, mz) || 1;
      const ct = Math.cos(th);
      AX.set(VIEW[0] * ct + (mx / ml) * sg + c.tx * w, VIEW[1] * ct + (my / ml) * sg + c.ty * w, VIEW[2] * ct + (mz / ml) * sg).normalize();
      Q.setFromUnitVectors(YUP, AX);
      const k = c.k * (0.96 + 0.08 * h2);
      put(mesh, n[c.kind]++, x, y, z, k, k, k, Q);
      if (c.kind === 2 && nd < 46) {
        // reticulum: two pale specks on the face toward the viewer
        for (const [du, dv] of [[-1.6, 0.5], [2.0, -0.7]]) {
          V1.set(du * k, 1.75 * k, dv * k).applyQuaternion(Q);
          put(reticDots, nd++, x + V1.x, y + V1.y, z + V1.z, 0.85 * k);
        }
      }
    }
    CELLS.forEach((m, i) => {
      m.count = n[i];
      m.instanceMatrix.needsUpdate = true;
    });
    reticDots.count = nd;
    reticDots.instanceMatrix.needsUpdate = true;
    // ferritin
    if (s.gran !== shownGran) {
      shownGran = s.gran;
      gran.count = Math.min(DATA.gran.length, s.gran);
      gran.instanceMatrix.needsUpdate = true;
    }
    // transferrin: out of the macrophage, along the return, into the lower island
    let nt = 0;
    for (const p of s.tf) {
      if (nt >= tfBeads.instanceMatrix.count) break;
      const dm = Math.hypot(p.x - MAC.c[0], p.y - MAC.c[1]);
      put(tfBeads, nt++, p.x, p.y, lerp(MACZ - 3.1, 2.7, sstep(40, 56, dm)), 3);
    }
    tfBeads.count = nt;
    tfBeads.instanceMatrix.needsUpdate = true;
    // the IV complex in the plasma
    let ni = 0;
    for (const p of s.ivp) {
      if (ni >= ivBeads.instanceMatrix.count) break;
      const Ri = lerp(17, 15, p.u) * 0.955 - 0.5 - 2.6;
      const o = Math.max(-Ri + 0.5, Math.min(Ri - 0.5, p.o));
      const zMax = Math.sqrt(Math.max(1, Ri * Ri - o * o));
      const k = p.o ? o / p.o : 1;
      put(ivBeads, ni++, p.px + (p.x - p.px) * k, p.py + (p.y - p.py) * k, 1 + hash(p.i + 0.9) * (zMax - 1), 2.3);
    }
    ivBeads.count = ni;
    ivBeads.instanceMatrix.needsUpdate = true;
    // the IV line fades in and out (0.5 s in the drawing)
    const want = s.iv ? 1 : 0;
    ivShown = s.snap ? want : ivShown + (want - ivShown) * 0.14;
    if (Math.abs(want - ivShown) < 0.01) ivShown = want;
    iv.visible = ivShown > 0.01;
    ivMat.opacity = ivShown;
  }
  return {
    update,
    dispose() {
      for (const m of mats) m.dispose();
    },
  };
}

// A6 live code: every drawn red cell is one normal day's output, placed on the arc by its age.
// Birth days come from inverting madeBy() (cumulative production from Fig 3's model), so after
// IV iron the cells crowd closer and fuller from the marrow end at exactly the pace the model's
// hemoglobin rises. The spleen macrophage's ferritin granules follow the model's ferritin.
const DATA = {"gl3":{"parts":[],"ground":-468,"bounds":[[42,80,-468],[586,174,-8]],"look":{"contactHeight":60,"aoRadius":6.5,"ao":0.95,"env":0.85,"cast":0.8},"file":"optimal-gl3.js","v":"2c549e37"},"P":{"origin":[93.02723027730454,-96.23174000010346],"scale":0.7921917734844972,"azimuth":62,"elevation":24},"W":600,"H":650,"g3":{"nodes":[[104.4,293.4,2.68],[59.1,375.6,3.6],[79,171.2,3.76],[114.2,169.1,4.06],[179.2,289.5,3.2],[118.5,149.9,3.14],[136.6,152.5,2.67],[175,244.5,3.56],[155.9,310,2.61],[72.3,325.8,3.05],[195,241.3,2.62],[177.2,311.7,3.11],[188.7,222.8,3.24],[175.8,342.5,3.51],[149.2,160.7,3.08],[101.8,125.2,3.81],[73,295.1,2.95],[143,143.9,3.13],[131,159.5,2.75],[168.4,272.6,3.72],[154.7,408.4,3.46],[55.8,215.4,2.76],[67.3,211.3,3.78],[137.3,435.5,3.44],[174.5,246.1,3.53],[175.8,188.8,2.87],[154.4,145.1,3.06],[159.1,429.9,3.75],[177.6,199,2.86],[174.7,256,3.86],[179.5,145.9,3.73],[147.2,412.3,3.89],[168,377.1,4.2],[177.5,378.5,3.03],[183.9,160.4,2.78],[159.7,427.8,2.85],[85,163.8,2.84],[60.6,371.9,3.44],[50.1,256.7,4.07],[104.4,135,4.06],[140.3,137.6,4.13],[126.8,177.3,3.42],[84.5,389.6,2.66],[86.7,148,3.04],[168,294.7,4.11],[107.8,398.9,4.07],[125.2,168.8,3.28],[173.8,353.4,3.88],[158.6,328.1,3.41],[162.6,189.4,3.94],[91.9,130.1,3.32],[69.7,403.9,3.49],[161.8,273.5,3.91],[144.3,395.1,3.81],[63.5,162.5,3.52],[179.9,132.8,3.77]],"struts":[[104.4,293.4,89.9,295.7,73,295.1],[104.4,293.4,87.1,310.7,72.3,325.8],[59.1,375.6,64.5,370.3,60.6,371.9],[59.1,375.6,68.7,387.8,84.5,389.6],[59.1,375.6,66.7,389.3,69.7,403.9],[79,171.2,80.9,172.4,85,163.8],[79,171.2,70.8,161.1,63.5,162.5],[79,171.2,77.7,157.7,86.7,148],[114.2,169.1,117.4,172.4,125.2,168.8],[114.2,169.1,121.2,168.5,126.8,177.3],[114.2,169.1,118.2,162,131,159.5],[179.2,289.5,175.7,291,168,294.7],[179.2,289.5,179.3,280.9,168.4,272.6],[179.2,289.5,181.7,300.7,177.2,311.7],[118.5,149.9,127.1,151.8,131,159.5],[118.5,149.9,124.9,145.7,136.6,152.5],[118.5,149.9,115.1,157,114.2,169.1],[136.6,152.5,137.5,150,131,159.5],[136.6,152.5,138.9,146.3,143,143.9],[136.6,152.5,148.1,151.8,149.2,160.7],[175,244.5,173.6,249.4,174.5,246.1],[175,244.5,177.8,253.6,174.7,256],[175,244.5,179.1,239,195,241.3],[155.9,310,151.7,314.8,158.6,328.1],[155.9,310,161.4,307.4,168,294.7],[155.9,310,167,311,177.2,311.7],[72.3,325.8,78.2,316,73,295.1],[72.3,325.8,70.9,347.9,60.6,371.9],[195,241.3,187.8,229.8,188.7,222.8],[195,241.3,183.4,243,174.5,246.1],[177.2,311.7,175.8,303.9,168,294.7],[188.7,222.8,185.2,229.3,175,244.5],[188.7,222.8,179.7,209.6,177.6,199],[175.8,342.5,180.6,352.1,173.8,353.4],[175.8,342.5,162.1,332.6,158.6,328.1],[175.8,342.5,178,329.4,177.2,311.7],[149.2,160.7,153.6,156.9,154.4,145.1],[149.2,160.7,142.1,158.2,143,143.9],[101.8,125.2,103.3,135.6,104.4,135],[101.8,125.2,94.1,127.1,91.9,130.1],[101.8,125.2,95.2,132.7,86.7,148],[73,295.1,67.6,273.3,50.1,256.7],[143,143.9,143.6,142.2,140.3,137.6],[143,143.9,146.5,146.9,154.4,145.1],[131,159.5,127.8,158.6,125.2,168.8],[168.4,272.6,167.4,275.2,161.8,273.5],[168.4,272.6,173.8,261.5,174.7,256],[154.7,408.4,148,416.3,147.2,412.3],[154.7,408.4,151,399.8,144.3,395.1],[154.7,408.4,161,421.9,159.7,427.8],[55.8,215.4,60.2,211.3,67.3,211.3],[55.8,215.4,47.9,231.5,50.1,256.7],[55.8,215.4,73.1,198,79,171.2],[67.3,211.3,75.8,196.6,79,171.2],[67.3,211.3,55.2,231.3,50.1,256.7],[137.3,435.5,147.1,438.2,159.1,429.9],[137.3,435.5,152,434.7,159.7,427.8],[137.3,435.5,144.7,425.7,147.2,412.3],[174.5,246.1,176.1,251,174.7,256],[175.8,188.8,182.5,192.6,177.6,199],[175.8,188.8,164,186.8,162.6,189.4],[175.8,188.8,182,178.4,183.9,160.4],[154.4,145.1,148.7,142.3,140.3,137.6],[159.1,429.9,155.1,423.5,159.7,427.8],[159.1,429.9,156.6,426.4,147.2,412.3],[159.1,429.9,161.6,422.9,154.7,408.4],[177.6,199,171.7,191,162.6,189.4],[179.5,145.9,183.8,138,179.9,132.8],[179.5,145.9,183.9,157.3,183.9,160.4],[179.5,145.9,165.3,147.9,154.4,145.1],[147.2,412.3,145.5,406.8,144.3,395.1],[147.2,412.3,150.7,422.4,159.7,427.8],[168,377.1,172.8,374.6,177.5,378.5],[168,377.1,170.3,367.4,173.8,353.4],[168,377.1,155,390.2,144.3,395.1],[177.5,378.5,173.3,361.1,173.8,353.4],[177.5,378.5,181.9,354.6,175.8,342.5],[183.9,160.4,178.1,147.1,179.9,132.8],[85,163.8,81.9,154.4,86.7,148],[85,163.8,68.5,167,63.5,162.5],[60.6,371.9,67.9,382.9,84.5,389.6],[60.6,371.9,60.3,384.6,69.7,403.9],[104.4,135,102.6,136.5,91.9,130.1],[104.4,135,107.1,139.8,118.5,149.9],[140.3,137.6,132.7,144,136.6,152.5],[126.8,177.3,127.8,174.3,125.2,168.8],[126.8,177.3,128,165.2,131,159.5],[84.5,389.6,73,402.1,69.7,403.9],[84.5,389.6,99.2,394.3,107.8,398.9],[86.7,148,85.5,138.8,91.9,130.1],[86.7,148,98.6,142.3,104.4,135],[107.8,398.9,123.1,392.2,144.3,395.1],[107.8,398.9,91.4,406.7,69.7,403.9],[158.6,328.1,168.7,321.3,177.2,311.7],[162.6,189.4,152.2,179.4,149.2,160.7],[161.8,273.5,169.7,269,174.7,256],[161.8,273.5,160.2,286.3,168,294.7],[63.5,162.5,80,154.3,86.7,148],[179.9,132.8,165.4,138.7,154.4,145.1]],"fat":[[162.4,283.1,8.1],[89.9,136.5,8.2],[86.3,149.5,10.7],[126.6,407.9,7.6],[129.5,402.4,9.5],[104.9,139.9,10],[179.5,298.1,7.8],[68.1,209.2,9.9],[94.5,169.6,6.4]],"islands":[{"c":[120,236],"r":30,"nurse":[[134.7,236],[131.8,247.8],[120,250.6],[109.5,246.5],[106.2,236],[110.3,226.3],[120,222.2],[130.3,225.7]],"nuc":[118,237,6],"cells":[[144.6,243.6,0,7.2,4.6],[134,257.7,0.13,7,4.25],[116.8,261.6,0.25,6.8,3.9],[101.1,253.5,0.38,6.6,3.55],[94.2,237.3,0.5,6.4,3.2],[99.4,220.4,0.63,6.2,2.85],[114.3,210.8,0.75,6,2.5],[131.8,213.1,0.88,5.8,2.15],[143.8,226,1,5.6,1.8]]},{"c":[112,352],"r":24,"nurse":[[126.3,352],[119.7,359.7],[112,362.9],[103.8,360.2],[99.9,352],[103.8,343.8],[112,338.2],[120.9,343.1]],"nuc":[110,353,4.8],"cells":[[131.7,358.1,0,7.2,4.6],[119.5,371.2,0.17,6.93,4.13],[101.7,369.9,0.33,6.67,3.67],[91.6,355.1,0.5,6.4,3.2],[96.9,337.9,0.67,6.13,2.73],[113.6,331.4,0.83,5.87,2.27],[129.1,340.4,1,5.6,1.8]]}],"cords":[[486.9,364.7,475.8,364.7,456.7,370.8],[551.4,356.5,547.5,353.6,535.7,356.8],[488.7,417,495.4,420.2,494,429.4],[433.4,208.8,439.8,211.6,438.1,220.3],[485.6,341.8,486.2,347.7,478.9,359.6],[546.7,274,561.2,279.9,567.8,291.9],[421.6,348.1,431.9,355.3,434.3,368.6],[572.9,305.9,581.5,311.1,582.1,322.3],[578.8,218.1,577.7,221.7,568.6,231.4],[562.9,265.5,554.2,267.2,537.5,274.9],[503.9,180.7,501.4,189.4,490.9,204.1],[586.2,309.8,575.4,309.4,556.6,315],[521.1,203.7,514.2,203.1,499.3,208.5],[585.9,348.6,579.4,349.4,564.9,356.3],[494.2,418.2,497.6,423.5,492.9,434.9],[459,161.6,455.6,166.4,444.1,177.2],[574.9,318.1,568.2,318.7,553.5,325.4],[492.4,364.9,494.5,370.5,488.7,382.2],[488.1,403.5,489.1,407.1,482.1,416.6],[451.1,377.5,448.2,388.3,437.3,405.1],[467.8,345.8,473.1,350.8,470.3,361.8],[459.2,204.9,472.4,203.8,477.6,208.8],[425.4,242,432,246,430.6,256],[511.8,173.6,516.6,182.1,513.3,196.6],[554.6,355.1,563.6,355.4,564.7,361.8],[488.2,372.2,487.7,378.9,479.2,391.6],[561.8,342.8,561.4,344.6,553,352.5],[513.3,362.4,510.8,364,500.4,371.6],[474.1,198.2,487.5,196.3,492.8,200.3],[570.9,268.5,581.7,269.7,584.5,277]],"white":[[540,210,18],[548,372,16],[460,382,13]],"macBody":[[538.7,286],[538.6,311.8],[516.9,325.6],[494,328.4],[472.5,323.3],[449.4,311.8],[448.6,286],[453.8,262.8],[472.5,248.8],[494,234.5],[515.8,248.2],[531.9,264.1]],"macNuc":[[500,300],[514,294],[520,306],[512,318],[498,316]],"phago":[480,274,13],"iv":{"line":[[224,18],[246,58]],"hub":[[216,16],[232,10],[242,30],[226,36]]}},"far":{"w":[0.5317,-0.5043],"A":62,"E":24,"dep":160,"bone":[[58,148],[96,118],[146,112],[186,132],[204,176],[198,236],[182,290],[176,350],[184,404],[162,434],[110,440],[70,426],[58,380],[64,320],[50,262],[42,200]],"spleen":[[446,168],[494,146],[550,156],[580,204],[586,286],[574,364],[536,418],[480,430],[436,404],[424,356],[442,304],[424,254],[428,206]]},"S":{"step":0.25,"c0":12.828156250000003,"cNorm":16.126825000000004,"rise":[0.25,0.125,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.208,1.479,3.744,6.85,10.456,13.597,16.247,18.336,19.656,20.309,20.392,20.128,19.857,19.59,19.326,19.066,18.81,18.557,18.308,18.062,17.819,17.58,17.344,17.112,16.882,16.656,16.433,16.213,15.996,15.782,15.571,15.363,15.158,14.955,14.756,14.559,14.365,14.173,13.984,13.798,13.614,13.433,13.255,13.079,12.905,12.734,12.565,12.398,12.234,12.072,11.912,11.754,11.599,11.446,11.295,11.146,10.999,10.854,10.711,10.57,10.431,10.293,10.158,10.025,9.893,9.764,9.636,9.51,9.385,9.262,9.141,9.022,8.904,8.788,8.674,8.561,8.45,8.34,8.232,8.125,8.02,7.916,7.813,7.712,7.613,7.515,7.418,7.322,7.228,7.135,7.043,6.953,6.864,6.776,6.689,6.604,6.52,6.437,6.355,6.274,6.194,6.115,6.038,5.961,5.886,5.812,5.738,5.666,5.595,5.524,5.455,5.386,5.319,5.252,5.187,5.122,5.058,4.995,4.933,4.872,4.812,4.752,4.693,4.636,4.578,4.522,4.467,4.412,4.358,4.304,4.252,4.2,4.149,4.099,4.049,4,3.952,3.904,3.857,3.811,3.765,3.72,3.675,3.632,3.588,3.546,3.504,3.462,3.421,3.381,3.341,3.302,3.263,3.225,3.187,3.15,3.114,3.078,3.042,3.007,2.972,2.938,2.904,2.871,2.838,2.806,2.774,2.743,2.712,2.681,2.651,2.622,2.592,2.563,2.535,2.507,2.479,2.452,2.425,2.398,2.372,2.346,2.321,2.295,2.271,2.246,2.222,2.199,2.175,2.152,2.129,2.106,2.085,2.063,2.041,2.02,1.999,1.978,1.957,1.937,1.917,1.898,1.879,1.86,1.841,1.822,1.804,1.471,1.143],"cum":[0,0.047,0.062,0.062,0.063,0.063,0.063,0.063,0.063,0.063,0.063,0.063,0.063,0.063,0.063,0.063,0.089,0.299,0.952,2.277,4.44,7.447,11.177,15.5,20.249,25.244,30.332,35.397,40.395,45.326,50.19,54.989,59.724,64.395,69.003,73.549,78.034,82.459,86.825,91.132,95.381,99.573,103.709,107.79,111.816,115.788,119.707,123.574,127.389,131.153,134.867,138.531,142.147,145.714,149.233,152.706,156.133,159.514,162.85,166.142,169.39,172.594,175.757,178.877,181.956,184.994,187.992,190.95,193.87,196.75,199.593,202.398,205.166,207.897,210.593,213.253,215.878,218.468,221.025,223.548,226.037,228.495,230.919,233.313,235.674,238.005,240.306,242.576,244.817,247.029,249.211,251.366,253.492,255.591,257.662,259.707,261.725,263.717,265.683,267.624,269.539,271.43,273.297,275.139,276.958,278.753,280.526,282.275,284.003,285.708,287.391,289.052,290.693,292.312,293.911,295.49,297.048,298.587,300.106,301.606,303.087,304.549,305.993,307.418,308.826,310.216,311.588,312.943,314.282,315.603,316.908,318.196,319.469,320.726,321.967,323.192,324.403,325.598,326.779,327.945,329.097,330.234,331.358,332.468,333.564,334.647,335.716,336.773,337.816,338.847,339.866,340.872,341.866,342.848,343.818,344.776,345.723,346.659,347.583,348.497,349.399,350.291,351.172,352.043,352.903,353.753,354.593,355.424,356.244,357.055,357.857,358.649,359.432,360.206,360.971,361.727,362.474,363.213,363.944,364.666,365.379,366.085,366.782,367.472,368.154,368.828,369.495,370.154,370.805,371.45,372.087,372.718,373.341,373.957,374.567,375.169,375.766,376.356,376.939,377.516,378.087,378.651,379.21,379.762,380.309,380.85,381.385,381.915,382.438,382.957,383.47,383.977,384.48,384.977,385.468,385.955,386.437,386.914,387.386,387.853,388.316,388.774,389.227,389.637,389.963],"hb":[105,104.99,104.98,104.97,104.96,104.96,104.95,104.94,104.93,104.92,104.91,104.9,104.9,104.89,104.88,104.87,104.86,104.85,104.86,104.94,105.08,105.29,105.54,105.83,106.16,106.5,106.85,107.18,107.51,107.84,108.17,108.48,108.8,109.11,109.41,109.72,110.01,110.31,110.6,110.88,111.16,111.44,111.71,111.98,112.25,112.51,112.77,113.03,113.28,113.52,113.77,114.01,114.25,114.48,114.72,114.94,115.17,115.39,115.61,115.83,116.04,116.25,116.46,116.66,116.86,117.06,117.26,117.45,117.64,117.83,118.01,118.2,118.38,118.55,118.73,118.9,119.07,119.24,119.41,119.57,119.73,119.89,120.05,120.2,120.35,120.51,120.65,120.8,120.94,121.09,121.23,121.37,121.5,121.64,121.77,121.9,122.03,122.16,122.28,122.41,122.53,122.65,122.77,122.88,123,123.11,123.23,123.34,123.45,123.55,123.66,123.77,123.87,123.97,124.07,124.17,124.27,124.36,124.46,124.55,124.65,124.74,124.83,124.92,125,125.09,125.17,125.26,125.34,125.42,125.5,125.58,125.66,125.74,125.81,125.89,125.96,126.04,126.11,126.18,126.25,126.32,126.39,126.45,126.52,126.58,126.65,126.71,126.78,126.84,126.9,126.96,127.02,127.08,127.13,127.19,127.25,127.3,127.36,127.41,127.46,127.52,127.57,127.62,127.67,127.72,127.77,127.81,127.86,127.91,127.95,128,128.04,128.09,128.13,128.18,128.22,128.26,128.3,128.34,128.38,128.42,128.46,128.5,128.54,128.57,128.61,128.65,128.68,128.72,128.75,128.79,128.82,128.86,128.89,128.92,128.95,128.99,129.02,129.05,129.08,129.11,129.14,129.17,129.2,129.22,129.25,129.28,129.31,129.33,129.36,129.39,129.41,129.44,129.46,129.49,129.51,129.54,129.56,129.58,129.61,129.63,129.65,129.67,129.69],"fer":[8,8,49.2,122,183.6,235.7,279.6,316.6,347.5,373.4,395,412.8,427.4,439.4,449,456.7,462.6,467.2,470.6,472.9,474.3,475,475.1,474.6,473.7,472.4,470.8,468.9,466.8,464.5,462.1,459.5,456.9,454.1,451.3,448.4,445.5,442.6,439.6,436.7,433.7,430.7,427.7,424.8,421.8,418.9,415.9,413,410.1,407.2,404.4,401.6,398.7,396,393.2,390.4,387.7,385,382.4,379.7,377.1,374.5,371.9,369.4,366.8,364.3,361.8,359.4,356.9,354.5,352.1,349.7,347.4,345.1,342.8,340.5,338.2,336,333.7,331.5,329.3,327.2,325,322.9,320.8,318.7,316.7,314.6,312.6,310.6,308.6,306.6,304.6,302.7,300.8,298.9,297,295.1,293.2,291.4,289.6,287.8,286,284.2,282.4,280.7,279,277.3,275.6,273.9,272.2,270.6,268.9,267.3,265.7,264.1,262.5,261,259.4,257.9,256.3,254.8,253.3,251.8,250.4,248.9,247.5,246,244.6,243.2,241.8,240.4,239.1,237.7,236.3,235,233.7,232.4,231.1,229.8,228.5,227.2,226,224.7,223.5,222.3,221.1,219.9,218.7,217.5,216.3,215.1,214,212.9,211.7,210.6,209.5,208.4,207.3,206.2,205.1,204.1,203,202,200.9,199.9,198.9,197.9,196.9,195.9,194.9,193.9,192.9,192,191,190.1,189.1,188.2,187.3,186.4,185.5,184.6,183.7,182.8,181.9,181.1,180.2,179.4,178.5,177.7,176.9,176,175.2,174.4,173.6,172.8,172,171.2,170.5,169.7,168.9,168.2,167.4,166.7,166,165.2,164.5,163.8,163.1,162.4,161.7,161,160.3,159.6,158.9,158.2,157.6,156.9,156.3,155.6,155,154.3,153.7,153.1,152.5],"iv":[0,0,924.9,791.3,677,579.2,495.5,423.9,362.7,310.3,265.4,227.1,194.3,166.2,142.2,121.7,104.1,89,76.2,65.2,55.8,47.7,40.8,34.9,29.9,25.6,21.9,18.7,16,13.7,11.7,10,8.6,7.3,6.3,5.4,4.6,3.9,3.4,2.9,2.5,2.1,1.8,1.5,1.3,1.1,1,0.8,0.7,0.6,0.5,0.4,0.4,0.3,0.3,0.2,0.2,0.2,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"hb0":105,"fer0":8},"arc":[[190,156],[190.7,154.2],[191.5,151.9],[192.4,149.3],[193.4,146.3],[194.4,143.1],[195.6,139.7],[196.8,136.1],[198.1,132.4],[199.5,128.6],[201,124.8],[202.6,121],[204.3,117.2],[206.1,113.6],[208,110.2],[209.9,107],[212,104],[214.2,101.2],[216.5,98.4],[218.9,95.7],[221.5,93],[224.1,90.4],[226.9,87.8],[229.7,85.2],[232.6,82.8],[235.6,80.3],[238.7,78],[241.8,75.8],[245,73.6],[248.2,71.6],[251.4,69.6],[254.7,67.7],[258,66],[261.4,64.3],[264.8,62.8],[268.4,61.3],[272,59.8],[275.6,58.5],[279.4,57.2],[283.2,56.1],[287,55],[290.9,54],[294.7,53.1],[298.6,52.3],[302.5,51.7],[306.4,51.1],[310.3,50.6],[314.2,50.2],[318,50],[321.8,49.9],[325.8,49.9],[329.7,50],[333.7,50.2],[337.7,50.5],[341.7,50.9],[345.7,51.4],[349.8,52],[353.7,52.7],[357.7,53.5],[361.6,54.4],[365.4,55.3],[369.2,56.4],[372.9,57.5],[376.5,58.7],[380,60],[383.4,61.4],[386.8,62.8],[390.2,64.4],[393.5,66.1],[396.7,67.8],[399.9,69.7],[403,71.6],[406.1,73.6],[409.1,75.7],[412.1,77.9],[414.9,80.1],[417.7,82.4],[420.4,84.7],[423.1,87.1],[425.6,89.5],[428,92],[430.3,94.6],[432.6,97.2],[434.7,100],[436.7,102.8],[438.7,105.7],[440.6,108.7],[442.4,111.7],[444.1,114.8],[445.8,117.9],[447.4,121],[449,124.2],[450.5,127.3],[451.9,130.5],[453.3,133.7],[454.7,136.9],[456,140],[457.3,143.2],[458.5,146.7],[459.7,150.2],[460.8,153.9],[461.9,157.7],[462.9,161.5],[463.8,165.3],[464.8,169],[465.6,172.6],[466.4,176.1],[467.1,179.5],[467.8,182.6],[468.4,185.4],[469,188],[469.5,190.2],[470,192]],"ret":[[480,318],[478.3,321.3],[476.1,325.7],[473.5,330.9],[470.5,336.8],[467.4,343],[464.1,349.4],[460.8,355.7],[457.7,361.7],[454.7,367.2],[452,372],[449.7,376.1],[447.6,379.7],[445.7,383.1],[443.9,386.2],[442.1,389.1],[440.2,392],[438.2,394.8],[435.8,397.7],[433.1,400.7],[430,404],[426.5,407.5],[422.9,411.3],[419.2,415.1],[415.2,419.1],[410.9,423],[406.3,426.8],[401.3,430.5],[396,434],[390.2,437.2],[384,440],[377.1,442.5],[369.6,444.9],[361.5,447.2],[352.9,449.2],[344.1,451],[335.1,452.6],[326.1,453.9],[317.2,454.9],[308.4,455.6],[300,456],[291.7,456],[283.1,455.7],[274.4,455.2],[265.8,454.3],[257.3,453.1],[248.9,451.7],[240.9,450.1],[233.4,448.3],[226.4,446.2],[220,444],[214.4,441.5],[209.4,438.6],[205.1,435.4],[201.1,431.9],[197.5,428.3],[194.1,424.5],[190.7,420.7],[187.4,417],[183.8,413.4],[180,410],[175.9,406.7],[171.6,403.3],[167.3,399.9],[162.9,396.5],[158.6,393.1],[154.4,389.8],[150.4,386.7],[146.6,383.6],[143.1,380.7],[140,378],[137.2,375.4],[134.7,372.9],[132.4,370.5],[130.4,368.2],[128.5,366],[126.8,364],[125.4,362.2],[124.1,360.5],[123,359.1],[122,358]],"mac":{"c":[494,286],"r":46},"gran":[[493.4,285],[486.7,286.4],[498.1,292.2],[501,280.5],[496,276.2],[506.5,284.8],[484.4,295.1],[489.8,299.9],[500.8,270.7],[507.3,275.2],[475,288.7],[514.5,284.2],[476.8,297.6],[481.4,303.1],[507.1,267.3],[517.8,290.6],[494.2,261.7],[494.4,310.6],[484.3,309.4],[517.2,275.5],[469.9,294.6],[507.5,260.7],[465.8,276.5],[464.5,290.1],[519.4,269],[523.4,295],[489.6,254.5],[461.9,283.4],[470,307.6],[477.2,314.3],[492.3,319.2],[481.5,255.1],[464.2,301.1],[528,288.3],[471.6,260.1],[517.5,260.8],[495.8,250.7],[505.6,252.6],[529.6,279.2],[526.5,269.8],[482.3,320.5],[528.6,298.8],[499.4,322.5],[462.7,266.1],[459,273.2],[456.9,292]],"sinus":[[120,236],[121.8,234.2],[124.1,232],[126.9,229.3],[130,226.4],[133.4,223.1],[136.8,219.7],[140.3,216.2],[143.8,212.7],[147,209.3],[150,206],[152.8,202.7],[155.6,199.2],[158.5,195.5],[161.3,191.8],[164,188.1],[166.7,184.5],[169.2,181],[171.6,177.7],[173.9,174.7],[176,172],[177.9,169.6],[179.8,167.4],[181.5,165.4],[183.1,163.5],[184.6,161.9],[186,160.4],[187.2,159.1],[188.3,157.9],[189.2,156.9],[190,156]],"mon":{"x0":64,"x1":532,"d0":-4,"d1":56,"fer":{"y0":542,"y1":498,"max":500},"hb":{"y0":606,"y1":562,"lo":100,"hi":135},"box":[24,472,552,172]},"lines":["Untreated iron deficiency: the marrow is short of iron, so it makes too little hemoglobin and the cells come out small and pale. The spleen's stores are nearly empty.","After IV iron: macrophages soak up the dose within days and their stores (ferritin) jump. New, fuller cells appear in about a week, but the arc of 120-day-old cells is replaced only as fast as the marrow works, so hemoglobin climbs over weeks."],"islands":[{"c":[120,236],"r":30},{"c":[112,352],"r":24}]};

function mount(fig) {
  const svg = fig.querySelector("svg");
  const q = (s) => svg.querySelector(s);
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const out = Object.fromEntries([...fig.querySelectorAll("[data-r]")].map((n) => [n.dataset.r, n]));
  const status = fig.querySelector("[data-status]");
  const line = fig.querySelector("[data-scene]");
  const buttons = [...fig.querySelectorAll('[data-control="mode"] .opt-seg-btn')];
  const f1 = (v) => v.toFixed(1);
  const { S, mac: MAC, mon: MON } = DATA;
  const set = (part, d) => q(`[data-part="${part}"]`).setAttribute("d", d);

  // ---------------------------------------------------------------- back halves (static: drawn once)
  // Everything is cut in half by the plane of the drawing: the bone (lengthwise, showing its marrow),
  // the spleen, the vessel arc and the transferrin return. Behind the cut each keeps its round back half.
  {
    const RB = roundBack(DATA.far);
    const mixc = (c, to, t) => c.map((v, i) => Math.round(v + (to[i] - v) * t));
    const tonesOf = (name, fb, dark = 0.34, light = 0.22) => {
      const c = RB.rgbOf(fig, name, fb);
      return [mixc(c, [0, 0, 0], dark), mixc(c, [255, 255, 255], light)];
    };
    const blob = (pts, tones) => {
      const closed = RB.sampleClosed(pts, 1, 6);
      const ring = RB.byLength([...closed, closed[0]], 65).slice(0, -1);
      const cx = ring.reduce((a, p) => a + p[0], 0) / ring.length;
      const cy = ring.reduce((a, p) => a + p[1], 0) / ring.length;
      return RB.rim(ring, { rho: (p) => 0.9 * Math.hypot(p[0] - cx, p[1] - cy), nphi: 8, tones });
    };
    const halfTube = (centre, w0, w1, n, tones) => {
      const c = RB.byLength(centre, n);
      const Ae = [];
      const Be = [];
      c.forEach((p, i) => {
        const a = c[Math.max(0, i - 1)];
        const b = c[Math.min(c.length - 1, i + 1)];
        const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        const nn = [-(b[1] - a[1]) / l, (b[0] - a[0]) / l];
        const w = (w0 + (w1 - w0) * (i / (c.length - 1))) / 2;
        Ae.push([p[0] + nn[0] * w, p[1] + nn[1] * w]);
        Be.push([p[0] - nn[0] * w, p[1] - nn[1] * w]);
      });
      return RB.chords(Ae, Be, { round: 1, nphi: 12, tones });
    };
    q('[data-part="far"]').innerHTML = RB.paintObjects([
      blob(DATA.far.bone, tonesOf("--a6-cortex", "#f4ead4", 0.3, 0.1)),
      blob(DATA.far.spleen, tonesOf("--a6-sp0", "#b2464a")),
      halfTube(DATA.ret, 14, 12, 26, tonesOf("--a6-ret-edge", "#a8925a")),
      halfTube(DATA.arc, 34, 30, 36, tonesOf("--a6-arc-edge", "#a8574c")),
    ]);
  }

  // ---------------------------------------------------------------- paths
  const measure = (pts) => {
    const acc = [0];
    for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return { pts, acc, L: acc[acc.length - 1] };
  };
  const along = (m, u) => {
    const s = Math.max(0, Math.min(1, u)) * m.L;
    let lo = 1;
    let hi = m.acc.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (m.acc[mid] < s) lo = mid + 1;
      else hi = mid;
    }
    const a = m.pts[lo - 1];
    const b = m.pts[lo];
    const t = (s - m.acc[lo - 1]) / (m.acc[lo] - m.acc[lo - 1] || 1);
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, tx: (b[0] - a[0]) / l, ty: (b[1] - a[1]) / l };
  };
  const ARC = measure(DATA.arc);
  const RET = measure(DATA.ret);
  const SIN = measure(DATA.sinus);
  const hash = (n) => {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  const ell = (x, y, rx, ry, tx, ty) => {
    const ang = ((Math.atan2(ty, tx) * 180) / Math.PI).toFixed(0);
    const ax = tx * rx;
    const ay = ty * rx;
    return `M${f1(x - ax)} ${f1(y - ay)}A${f1(rx)} ${f1(ry)} ${ang} 1 0 ${f1(x + ax)} ${f1(y + ay)}A${f1(rx)} ${f1(ry)} ${ang} 1 0 ${f1(x - ax)} ${f1(y - ay)}Z`;
  };
  const dot = (x, y, r) => `M${f1(x - r)} ${f1(y)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;

  // ---------------------------------------------------------------- the 3-D layer (shared/gl3)
  // The same loop as a real-time 3-D scene (gl-scene.js) under this SVG; the labels, ticks and the monitor stay
  // drawn on top. Until the layer has loaded every call is a no-op and the drawing is the figure.
  const gl = gl3Attach(fig, { scene: DATA.gl3, P: DATA.P, W: DATA.W, H: DATA.H, file: DATA.gl3.file, v: DATA.gl3.v, island: false, redraw: () => draw(), build: (ctx) => a6Scene(ctx, DATA) });

  // ---------------------------------------------------------------- state
  let treated = false;
  let t = 0;
  let hold = 0;
  const tf = [];
  let tfDebt = 0;
  const ferOf = (d) => (treated && d >= 0 ? seriesAt(S, "fer", d) : S.fer0);
  const hbOf = (d) => (treated && d >= 0 ? seriesAt(S, "hb", d) : S.hb0);

  function cells(tNow) {
    // birth days of every drawn cell aged −0.8 … 121.5 days, by inverting madeBy on a grid
    const d0 = tNow - 121.5;
    const d1 = tNow + 0.8;
    const grid = [];
    for (let d = d0; d <= d1 + 0.25; d += 0.25) grid.push([d, madeBy(S, d, treated)]);
    const list = [];
    let g = 1;
    for (let n = Math.ceil(grid[0][1]); n <= grid[grid.length - 1][1]; n++) {
      while (g < grid.length - 1 && grid[g][1] < n) g++;
      const [da, ma] = grid[g - 1];
      const [db, mb] = grid[g];
      const born = da + ((n - ma) / (mb - ma || 1)) * (db - da);
      list.push({ n, born, age: tNow - born });
    }
    return list;
  }
  // One state for both pictures: where every cell, granule, transferrin and IV particle is right now. The drawing
  // (drawArt) and the 3-D scene (gl.update) are both made from it, so they can't disagree.
  const NOW = { cells: [], gran: 0, tf: [], ivp: [], iv: false, snap: false };
  function place() {
    const list = NOW.cells;
    list.length = 0;
    const phago = [MAC.c[0] - 14, MAC.c[1] - 12];
    for (const c of cells(t)) {
      const h = hash(c.n);
      const lane = (Math.floor(h * 3) - 1) * 8.5 + (hash(c.n + 0.5) - 0.5) * 3;
      let x, y, tx, ty, k = 1, at = 1, e = 0, px, py, off = lane;
      if (c.age < 0) {
        const p = along(SIN, (c.age + 0.8) / 0.8);
        off = (h - 0.5) * 6;
        x = p.x + off;
        y = p.y;
        px = p.x;
        py = p.y;
        tx = p.tx;
        ty = p.ty;
        at = 0;
        e = (c.age + 0.8) / 0.8;
      } else if (c.age <= 120) {
        const p = along(ARC, c.age / 120);
        x = p.x - p.ty * lane;
        y = p.y + p.tx * lane;
        px = p.x;
        py = p.y;
        tx = p.tx;
        ty = p.ty;
      } else {
        // into the spleen and the macrophage's phagosome
        e = Math.min(1, (c.age - 120) / 1.5);
        const end = along(ARC, 1);
        x = end.x + (phago[0] - end.x) * e;
        y = end.y + (phago[1] - end.y) * e;
        px = end.x;
        py = end.y;
        tx = end.tx;
        ty = end.ty;
        k = 1 - 0.55 * e;
        at = 2;
        if (e >= 1) continue;
      }
      const made = cohortAt(S, c.born, treated);
      const young = c.age < 2;
      const old = c.age > 108;
      const pale = made < 0.9 * S.cNorm;
      // kind: 0 made short of iron, 1 full, 2 reticulocyte, 3 old · at: 0 in the sinusoid, 1 on the arc, 2 on its way to the phagosome
      list.push({ n: c.n, x, y, tx, ty, k, kind: young ? 2 : old ? 3 : pale ? 0 : 1, age: c.age, at, e, px, py, off });
    }
    NOW.gran = granulesOf(ferOf(t));
    // transferrin back to the marrow
    NOW.tf.length = 0;
    for (const p of tf) {
      const a = along(RET, p.u);
      NOW.tf.push({ x: a.x - a.ty * p.o, y: a.y + a.tx * p.o, u: p.u, o: p.o });
    }
    // the IV complex circulating until the macrophages take it up
    const ivMg = treated && t >= 0 ? seriesAt(S, "iv", t) : 0;
    const nIv = Math.round((60 * ivMg) / 1000);
    NOW.ivp.length = 0;
    for (let i = 0; i < nIv; i++) {
      const u = (hash(i + 0.3) + t * 0.45) % 1;
      const a = along(ARC, u);
      const o = (hash(i + 0.7) - 0.5) * 22;
      NOW.ivp.push({ x: a.x - a.ty * o, y: a.y + a.tx * o, px: a.x, py: a.y, u, o, i });
    }
    NOW.iv = treated && t > -3 && t < 2;
  }
  function drawArt() {
    const paths = { cPale: "", cFull: "", cYoung: "", cOld: "", pPale: "", pFull: "", pOld: "", retic: "" };
    for (const { x, y, tx, ty, k, kind } of NOW.cells) {
      if (kind === 2) {
        paths.cYoung += ell(x, y, 5.9 * k, 3.9 * k, tx, ty);
        paths.retic += dot(x - tx * 1.5, y - ty * 1.5, 0.8) + dot(x + tx * 2, y + ty * 2 + 0.6, 0.7);
      } else if (kind === 3) {
        paths.cOld += ell(x, y, 4.6 * k, 3.5 * k, tx, ty);
        paths.pOld += ell(x, y, 1.6 * k, 1.2 * k, tx, ty);
      } else if (kind === 0) {
        paths.cPale += ell(x, y, 5.0, 3.3, tx, ty);
        paths.pPale += ell(x, y, 2.9, 1.9, tx, ty);
      } else {
        paths.cFull += ell(x, y, 5.8, 3.7, tx, ty);
        paths.pFull += ell(x, y, 2.0, 1.25, tx, ty);
      }
    }
    for (const [k2, d] of Object.entries(paths)) set(k2, d);
    set("gran", DATA.gran.slice(0, NOW.gran).map(([gx, gy]) => dot(gx, gy, 2.7)).join(""));
    set("tf", NOW.tf.map((p) => dot(p.x, p.y, 3)).join(""));
    set("ivp", NOW.ivp.map((p) => dot(p.x, p.y, 2.3)).join(""));
    q('[data-part="iv"]').style.opacity = NOW.iv ? "1" : "0";
  }
  function draw() {
    place();
    // with the 3-D layer on, the drawn art is hidden (data-gl3-hide) and the scene shows the same state instead
    if (!gl.on) drawArt();
    const fer = ferOf(t);
    // the monitor
    const xOf = (d) => MON.x0 + ((d - MON.d0) / (MON.d1 - MON.d0)) * (MON.x1 - MON.x0);
    const yF = (v) => MON.fer.y0 - (Math.min(v, MON.fer.max) / MON.fer.max) * (MON.fer.y0 - MON.fer.y1);
    const yH = (v) => MON.hb.y0 - ((v - MON.hb.lo) / (MON.hb.hi - MON.hb.lo)) * (MON.hb.y0 - MON.hb.y1);
    const trace = (fn, y, upTo) => {
      let d = "";
      for (let day = MON.d0; day <= Math.min(upTo, MON.d1) + 1e-9; day += 0.5) d += `${d ? "L" : "M"}${f1(xOf(day))} ${f1(y(fn(day)))}`;
      return d;
    };
    const tEnd = treated ? t : MON.d1;
    set("ferLine", trace(ferOf, yF, tEnd));
    set("hbLine", trace(hbOf, yH, tEnd));
    set("ferGhost", treated ? trace(ferOf, yF, MON.d1) : "");
    set("hbGhost", treated ? trace(hbOf, yH, MON.d1) : "");
    const cx = xOf(Math.max(MON.d0, Math.min(MON.d1, t)));
    q('[data-part="cursor"]').setAttribute("transform", `translate(${f1(cx)} 0)`);
    q('[data-part="cursor"]').style.opacity = treated ? "1" : "0";
    for (const [part, y] of [["ferDot", yF(fer)], ["hbDot", yH(hbOf(t))]]) {
      const el = q(`[data-part="${part}"]`);
      el.setAttribute("cx", f1(treated ? cx : xOf(MON.d1)));
      el.setAttribute("cy", f1(y));
    }
    out.day.textContent = treated ? (t < 0 ? `−${-Math.floor(t)} (before)` : `${Math.floor(t)}`) : "—";
    out.fer.textContent = `${Math.round(fer)} µg/L`;
    out.hb.textContent = `${Math.round(hbOf(t))} g/L`;
    NOW.snap = still.matches;
    gl.update(NOW);
    gl.render();
  }
  function step(dt) {
    // dt in seconds on the viewer's clock
    const dd = dt * LOOP.pace;
    if (treated) {
      if (t < LOOP.after) t = Math.min(LOOP.after, t + dd);
      else if ((hold += dt) > 3) {
        hold = 0;
        t = -LOOP.before;
        tf.length = 0;
      }
    } else t += dd;
    // transferrin: about one carrier drawn per 1.5 mg of iron heading to the marrow
    tfDebt += (cohortAt(S, t, treated) / 1.5) * dd;
    while (tfDebt >= 1) {
      tfDebt -= 1;
      tf.push({ u: Math.random() * 0.04, o: (Math.random() - 0.5) * 6 });
    }
    for (let i = tf.length - 1; i >= 0; i--) {
      tf[i].u += (dt * 150) / RET.L;
      if (tf[i].u >= 1) tf.splice(i, 1);
    }
  }

  // ---------------------------------------------------------------- input, tour, loop
  let modeAt = 0;
  function setMode(i, quiet) {
    modeAt = i;
    treated = i === 1;
    t = treated ? -LOOP.before : 0;
    hold = 0;
    tf.length = 0;
    line.textContent = DATA.lines[i];
    buttons.forEach((b, j) => {
      b.setAttribute("aria-checked", j === i ? "true" : "false");
      b.tabIndex = j === i ? 0 : -1;
    });
    if (!quiet) status.textContent = DATA.lines[i];
  }
  let touring = true;
  let idle = -1e9;
  let tourClock = 0;
  const takeOver = () => {
    touring = false;
    idle = performance.now();
  };
  buttons.forEach((b, i) =>
    b.addEventListener("click", () => {
      takeOver();
      setMode(i);
      if (still.matches) renderStill();
    }),
  );
  for (const b of buttons) b.addEventListener("pointerdown", takeOver);
  fig.querySelector('[data-control="mode"]').addEventListener("keydown", (ev) => {
    const i = buttons.indexOf(document.activeElement);
    if (i < 0) return;
    const j = ev.key === "ArrowRight" || ev.key === "ArrowDown" ? i + 1 : ev.key === "ArrowLeft" || ev.key === "ArrowUp" ? i - 1 : null;
    if (j === null) return;
    ev.preventDefault();
    const b = buttons[(j + buttons.length) % buttons.length];
    b.focus();
    b.click();
  });
  function renderStill() {
    // IV: three weeks in (stores full, the first fuller cells a third of the way round); untreated: steady
    if (treated) t = 21;
    tf.length = 0;
    for (let i = 0; i < 200; i++) {
      tfDebt += cohortAt(S, t, treated) / 1.5 / 60;
      while (tfDebt >= 1) (tfDebt -= 1), tf.push({ u: Math.random(), o: (Math.random() - 0.5) * 6 });
    }
    tf.splice(40);
    draw();
  }
  let raf = 0;
  let last = 0;
  let visible = true;
  function tick(now) {
    raf = 0;
    if (!visible || still.matches) return;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    if (!touring && now - idle > 9000) touring = true;
    if (touring) {
      tourClock += dt;
      if ((modeAt === 0 && tourClock > 8) || (modeAt === 1 && t >= LOOP.after && hold > 2.5)) {
        tourClock = 0;
        setMode(1 - modeAt, true);
      }
    }
    step(dt);
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
  setMode(0, true);
  if (still.matches) renderStill();
  else {
    for (let i = 0; i < 120; i++) step(1 / 60);
    draw();
    start();
  }
}

class Fig extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    const root = this.attachShadow({ mode: "open" });
    const theme = this.getAttribute("theme") === "dark" ? "dark" : "light";
    root.innerHTML = "<style>" + "\n.iso{\n  --anatomy-page:#0b0b0b;--anatomy-card:#131313;--anatomy-text:#a3a3a3;--anatomy-strong:#e6e6e6;--anatomy-muted:#6e6e6e;\n  --anatomy-paper:#131313;--anatomy-face:#1b1b1b;--anatomy-top:#1c1c1c;\n  --anatomy-shade-0:#0f0f0f;--anatomy-shade-1:#121212;--anatomy-shade-2:#151515;--anatomy-shade-3:#181818;\n  --anatomy-lit-top:#262626;--anatomy-lit-shade:#1d1d1d;\n  --anatomy-hi:#d4d4d4;--anatomy-mid:#6a6a6a;--anatomy-lo:#3e3e3e;--anatomy-faint:#2a2a2a;--anatomy-lit:#ffffff;\n  --anatomy-halo:#050505;--anatomy-halo-opacity:.9;--anatomy-dot:#e6e6e6;\n  --anatomy-red:#ff6b6b;--anatomy-green:#6be0a0;--anatomy-blue:#6b9bff;\n  --anatomy-weight:.6px;--anatomy-ease:cubic-bezier(.32,.72,0,1);\n  --anatomy-mono:ui-monospace,\"SF Mono\",Menlo,Consolas,monospace;\n  --anatomy-lift:inset 0 1px 0 0 #ffffff0a,inset 0 0 0 1px #ffffff06,0 0 0 1px #00000026,0 1px 1px -.5px #00000014,0 3px 3px -1.5px #00000014,0 6px 6px -3px #00000014,0 12px 12px -6px #00000014;\n}\n.iso[data-theme=\"light\"]{\n  --anatomy-page:#f2f2ef;--anatomy-card:#fbfbfa;--anatomy-text:#57575a;--anatomy-strong:#18181a;--anatomy-muted:#8c8c90;\n  --anatomy-paper:#fbfbfa;--anatomy-face:#ffffff;--anatomy-top:#ffffff;\n  --anatomy-shade-0:#dcdcd9;--anatomy-shade-1:#e5e5e2;--anatomy-shade-2:#ededea;--anatomy-shade-3:#f4f4f1;\n  --anatomy-lit-top:#ffffff;--anatomy-lit-shade:#eeeeeb;\n  --anatomy-hi:#26262a;--anatomy-mid:#8a8a8f;--anatomy-lo:#b4b4b8;--anatomy-faint:#d4d4d6;--anatomy-lit:#000000;\n  --anatomy-halo:#8a8a80;--anatomy-halo-opacity:.32;--anatomy-dot:#3a3a3e;\n  --anatomy-red:#e5484d;--anatomy-green:#30a46c;--anatomy-blue:#3e63dd;\n  --anatomy-lift:inset 0 1px 0 0 #ffffff,0 0 0 1px #0000000f,0 1px 1px -.5px #0000000a,0 3px 3px -1.5px #0000000a,0 6px 6px -3px #0000000a,0 12px 12px -6px #0000000a;\n}\n.iso-svg{display:block;width:100%;height:auto;overflow:visible}\n.iso-svg path,.iso-svg circle{vector-effect:non-scaling-stroke}\n.iso-fill{fill:var(--anatomy-paper);stroke:none}\n.iso-solid[data-lit]>.iso-fill{fill:var(--anatomy-face)}\n.iso-shade,.iso-top{stroke:none}\n.iso-shade[data-shade=\"0\"]{fill:var(--anatomy-shade-0)}\n.iso-shade[data-shade=\"1\"]{fill:var(--anatomy-shade-1)}\n.iso-shade[data-shade=\"2\"]{fill:var(--anatomy-shade-2)}\n.iso-shade[data-shade=\"3\"]{fill:var(--anatomy-shade-3)}\n.iso-top{fill:var(--anatomy-top)}\n.iso-solid[data-lit]>.iso-top{fill:var(--anatomy-lit-top)}\n.iso-solid[data-lit]>.iso-shade{fill:var(--anatomy-lit-shade)}\n.iso-solid[data-seamless]>.iso-shade,.iso-solid[data-seamless]>.iso-top{stroke-width:.4;stroke-linejoin:round}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"0\"]{stroke:var(--anatomy-shade-0)}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"1\"]{stroke:var(--anatomy-shade-1)}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"2\"]{stroke:var(--anatomy-shade-2)}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"3\"]{stroke:var(--anatomy-shade-3)}\n.iso-solid[data-seamless]>.iso-top{stroke:var(--anatomy-top)}\n.iso-solid[data-seamless][data-lit]>.iso-top{stroke:var(--anatomy-lit-top)}\n.iso-solid[data-seamless][data-lit]>.iso-shade{stroke:var(--anatomy-lit-shade)}\n.iso-solid[data-lit]>.iso-edge{stroke:var(--anatomy-lit)}\n.iso-halo{fill:var(--anatomy-halo);stroke:none;filter:blur(9px);opacity:var(--anatomy-halo-opacity);transform:translateY(3px)}\n.iso-line{fill:none;stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight);stroke-linecap:round;stroke-linejoin:round}\n.iso-line[data-tone=\"hi\"]{stroke:var(--anatomy-hi)}\n.iso-line[data-tone=\"mid\"]{stroke:var(--anatomy-mid)}\n.iso-line[data-tone=\"lo\"]{stroke:var(--anatomy-lo)}\n.iso-line[data-tone=\"faint\"]{stroke:var(--anatomy-faint)}\n.iso-line[data-tone=\"lit\"]{stroke:var(--anatomy-lit)}\n.iso-line[data-tone=\"red\"]{stroke:var(--anatomy-red)}\n.iso-line[data-tone=\"green\"]{stroke:var(--anatomy-green)}\n.iso-line[data-tone=\"blue\"]{stroke:var(--anatomy-blue)}\n.iso-line[data-dotted]{stroke-dasharray:.01 3.5;stroke-width:1}\n.iso-line[data-dashed]{stroke-dasharray:3 3}\n.iso-line[data-flow]{stroke-dasharray:2 6}\n.iso-wire-end{fill:var(--anatomy-paper);stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight)}\n.iso-wire[data-tone=\"hi\"] .iso-wire-end{stroke:var(--anatomy-hi)}\n.iso-wire[data-tone=\"mid\"] .iso-wire-end{stroke:var(--anatomy-mid)}\n.iso-wire[data-tone=\"faint\"] .iso-wire-end{stroke:var(--anatomy-faint)}\n.iso-wire[data-tone=\"lit\"] .iso-wire-end{stroke:var(--anatomy-lit)}\n.iso-dots circle{fill:var(--anatomy-dot);stroke:none;opacity:.32}\n.iso-dots[data-tone=\"hi\"] circle{opacity:.85}\n.iso-dots[data-tone=\"mid\"] circle{opacity:.45}\n.iso-dots[data-tone=\"lo\"] circle{opacity:.22}\n.iso-dots[data-tone=\"faint\"] circle{opacity:.12}\n.iso-face-text{fill:var(--anatomy-mid);font-family:var(--anatomy-mono);letter-spacing:.04em}\n.iso-face-text[data-tone=\"hi\"]{fill:var(--anatomy-hi)}\n.iso-face-text[data-tone=\"lo\"]{fill:var(--anatomy-lo)}\n.iso-face-text[data-tone=\"faint\"]{fill:var(--anatomy-faint)}\n.tb-body{fill:var(--anatomy-shade-2);stroke:none}\n.tb-shine{fill:var(--anatomy-top);stroke:none}\n.tb-shade{fill:var(--anatomy-shade-0);stroke:none}\n.tb-ring{fill:none;stroke:var(--anatomy-lo);stroke-width:.45;stroke-linecap:butt;stroke-linejoin:round}\n.tb-ring[data-tone=\"mid\"]{stroke:var(--anatomy-mid)}\n.tb-ring[data-tone=\"faint\"]{stroke:var(--anatomy-faint)}\n.tb-ring[data-tone=\"hi\"]{stroke:var(--anatomy-hi)}\n@keyframes iso-flow{to{stroke-dashoffset:-32}}\n@keyframes iso-pulse{0%,100%{opacity:.18}12%{opacity:1}40%{opacity:.18}}\n.iso-line[data-flow]{animation:iso-flow 1600ms linear infinite}\n.iso-dots circle[data-pulse]{animation:iso-pulse 1600ms steps(1,end) infinite;animation-delay:var(--pulse-at,0ms)}\n.iso-figure{margin:32px 0 36px}\n.iso-plate{position:relative;padding:52px 24px;border-radius:0;background:var(--anatomy-card);box-shadow:0 0 0 1px var(--anatomy-mid);--anatomy-paper:var(--anatomy-card)}\n.iso-plate-corners{position:absolute;inset:18px 20px;pointer-events:none}\n.iso-plate-corner{position:absolute;color:var(--anatomy-muted);font-family:var(--anatomy-mono);font-size:10.5px;line-height:1;letter-spacing:.04em;white-space:nowrap}\n.iso-plate-corner[data-corner=\"fig\"]{top:0;left:0;color:var(--anatomy-text)}\n.iso-plate-corner[data-corner=\"title\"]{top:0;right:0;text-transform:uppercase;letter-spacing:.1em}\n.iso-plate-corner[data-corner=\"hint\"]{bottom:0;left:0;text-transform:uppercase;letter-spacing:.1em}\n.iso-plate-corner[data-corner=\"readout\"]{right:0;bottom:0;color:var(--anatomy-text);font-variant-numeric:tabular-nums}\n.iso-plate .iso-svg{margin:0 auto}\n.iso-legend{display:grid;gap:8px;margin-top:12px;color:var(--anatomy-muted);font-size:13px;line-height:1.55}\n.iso-keys{display:flex;flex-wrap:wrap;gap:6px 18px}\n.iso-key{display:inline-flex;align-items:center;gap:7px}\n.iso-swatch{width:16px;height:10px;flex:none;overflow:visible}\n.iso-swatch path{fill:none;stroke:var(--anatomy-hi);stroke-width:1;vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round}\n.iso-swatch[data-mark=\"raised\"] path,.iso-swatch[data-mark=\"flat\"] path{stroke:var(--anatomy-mid)}\n.iso-swatch[data-mark=\"lit\"] path{stroke:var(--anatomy-lit)}\n.iso-swatch[data-mark=\"dim\"] path{stroke:var(--anatomy-lo)}\n.iso-swatch[data-mark=\"dotted\"] path{stroke-dasharray:.01 3;stroke-width:1.4}\n.iso-swatch[data-mark=\"dashed\"] path{stroke-dasharray:3 2.5}\n.iso-swatch[data-mark=\"red\"] path{stroke:var(--anatomy-red)}\n.iso-swatch[data-mark=\"green\"] path{stroke:var(--anatomy-green)}\n.iso-swatch[data-mark=\"blue\"] path{stroke:var(--anatomy-blue)}\n.iso-swatch-crease{stroke:var(--anatomy-lo)!important}\n@media (max-width:560px){.iso-plate{padding:48px 12px 70px}.iso-plate-corner[data-corner=\"hint\"]{bottom:18px}}\n@media (prefers-reduced-motion:reduce){.iso-line[data-flow],.iso-dots circle[data-pulse]{animation:none}}\n/*\n * Optimal theme for Anatomy figures.\n *\n * Load AFTER the kit's ISO_CSS. Put `class=\"iso optimal\"` on the wrapper:\n *   - no data-theme  -> \"Forest night\"  (exam-room TV, dark)\n *   - data-theme=\"light\" -> \"Cream\"     (beoptimal.ca, the primary target)\n *\n * Values come from the live site (beoptimal-landing src/index.css), the\n * Performance package design and the ALE visualizer spec. The kit's grey\n * ramps are warmed so solids sit on the site's cream paper, and the single\n * \"lit\" accent is Optimal forest green instead of pure black/white.\n */\n\n.iso.optimal {\n  /* Forest night (dark) */\n  --anatomy-page: #152511;\n  --anatomy-card: #1c3118;\n  --anatomy-text: #c9cdbf;\n  --anatomy-strong: #fffcf7;\n  --anatomy-muted: #8e9884;\n  --anatomy-paper: #1c3118;\n  --anatomy-face: #253821;\n  --anatomy-top: #283c24;\n  --anatomy-shade-0: #172812;\n  --anatomy-shade-1: #1a2c16;\n  --anatomy-shade-2: #1e321a;\n  --anatomy-shade-3: #22371e;\n  --anatomy-lit-top: #34492f;\n  --anatomy-lit-shade: #2a3f26;\n  --anatomy-hi: #e9e6dc;\n  --anatomy-mid: #7e8a74;\n  --anatomy-lo: #4d5c46;\n  --anatomy-faint: #33452e;\n  --anatomy-lit: #fffcf7;\n  --anatomy-halo: #0b1508;\n  --anatomy-halo-opacity: 0.9;\n  --anatomy-dot: #e9e6dc;\n  --anatomy-red: #e0745f;\n  --anatomy-green: #8cc67f;\n  --anatomy-blue: #7fa8d9;\n  --anatomy-mono: \"JetBrains Mono\", ui-monospace, \"SF Mono\", Menlo, Consolas, monospace;\n\n  /* Optimal extras (use sparingly; colour only when colour is the subject) */\n  --opt-display: \"Castoro\", Georgia, serif;\n  --opt-ui: \"Public Sans\", system-ui, sans-serif;\n  --opt-forest: #2c4e25;\n  --opt-forest-light: #519044;\n  --opt-sage: #5e7a59;\n  --opt-borderline: #c97b2d;\n  --opt-out: #b3402f;\n  --opt-heat: #ff9776;\n}\n\n.iso.optimal[data-theme=\"light\"] {\n  /* Cream (light) */\n  --anatomy-page: #fef8f1;\n  --anatomy-card: #fffcf7;\n  --anatomy-text: #3e3d39;\n  --anatomy-strong: #252525;\n  --anatomy-muted: #716e68; /* 4.97:1 on the cream card (was 4.46:1 for the legend) */\n  --anatomy-paper: #fffcf7;\n  --anatomy-face: #fffefb;\n  --anatomy-top: #fffefb;\n  --anatomy-shade-0: #ddd7cc;\n  --anatomy-shade-1: #e7e2d9;\n  --anatomy-shade-2: #f0ede5;\n  --anatomy-shade-3: #f6f3ec;\n  --anatomy-lit-top: #fffefb;\n  --anatomy-lit-shade: #efebe2;\n  --anatomy-hi: #252525;\n  --anatomy-mid: #8a867e;\n  --anatomy-lo: #b9b4aa;\n  --anatomy-faint: #d9d3c8;\n  --anatomy-lit: #2c4e25;\n  --anatomy-halo: #8a8070;\n  --anatomy-halo-opacity: 0.3;\n  --anatomy-dot: #3a3833;\n  --anatomy-red: #b3402f;\n  --anatomy-green: #3f7a35;\n  --anatomy-blue: #3e6a8f;\n}\n\n/* Card typography: brand fonts for titles and readouts, kit mono for plate corners */\n.iso.optimal .iso-plate-title,\n.iso.optimal [data-role=\"title\"] {\n  font-family: var(--opt-display);\n  letter-spacing: -0.02em;\n}\n.iso.optimal [data-role=\"readout\"],\n.iso.optimal .iso-readout {\n  font-family: var(--opt-ui);\n  font-feature-settings: \"tnum\" 1, \"ss01\" 1;\n}\n\n/*\n * Card layout for Optimal figures (shared/page.mjs `plate`).\n * Phone first: the drawing, then a row of real buttons (>=44 px), then a footer\n * where the hint and the readout wrap instead of overlapping at 320 px.\n */\n.iso.optimal {\n  --opt-rule: rgba(233, 230, 220, 0.16);\n  --opt-btn: rgba(233, 230, 220, 0.06);\n  --opt-btn-on: #e9e6dc;\n  --opt-btn-on-text: #1c3118;\n  --opt-title: #fffcf7;\n  --opt-fig: #8cc67f;\n  --opt-heat-ink: #ff9776;\n  --opt-heat-glow: rgba(255, 151, 118, 0.55);\n  --opt-heat-wash: rgba(255, 151, 118, 0.16);\n  --opt-cold-ink: #9cc3e6;\n}\n.iso.optimal[data-theme=\"light\"] {\n  --opt-rule: rgba(44, 78, 37, 0.2);\n  --opt-btn: #fffcf7;\n  --opt-btn-on: #2c4e25;\n  --opt-btn-on-text: #fffcf7;\n  --opt-title: #2c4e25;\n  --opt-fig: #5e7a59;\n  --opt-heat-ink: #c8552e;\n  --opt-heat-glow: rgba(232, 108, 64, 0.42);\n  --opt-heat-wash: rgba(255, 151, 118, 0.22);\n  --opt-cold-ink: #3e6a8f;\n}\n.iso.optimal .opt-plate {\n  padding: 52px 24px 20px;\n  box-shadow: 0 0 0 1px var(--opt-rule);\n  border-radius: 2px;\n}\n.iso.optimal .iso-plate-corner[data-corner=\"fig\"] {\n  font-family: var(--opt-display);\n  font-style: italic;\n  font-size: 15px;\n  letter-spacing: 0;\n  color: var(--opt-fig);\n  top: -2px;\n}\n.iso.optimal .iso-plate-corner[data-corner=\"title\"] {\n  font-family: var(--opt-display);\n  font-size: 17px;\n  text-transform: none;\n  letter-spacing: -0.01em;\n  color: var(--opt-title);\n  top: -4px;\n}\n.iso.optimal .opt-controls {\n  display: flex;\n  flex-wrap: wrap;\n  justify-content: center;\n  gap: 8px 12px;\n  margin: 10px 0 0;\n}\n.iso.optimal .opt-seg {\n  display: inline-flex;\n  border-radius: 999px;\n  box-shadow: inset 0 0 0 1px var(--opt-rule);\n  padding: 3px;\n  gap: 2px;\n  max-width: 100%;\n}\n.iso.optimal .opt-seg-btn {\n  appearance: none;\n  border: 0;\n  margin: 0;\n  min-height: 44px;\n  min-width: min-content; /* never shrink a label below its longest word (with the padding, always ≥ 44 px) */\n  padding: 0 16px;\n  border-radius: 999px;\n  background: transparent;\n  color: var(--anatomy-text);\n  font: 500 14px/1.1 var(--opt-ui);\n  letter-spacing: 0;\n  cursor: pointer;\n  touch-action: manipulation;\n  -webkit-tap-highlight-color: transparent;\n  transition: background-color 240ms var(--anatomy-ease), color 240ms var(--anatomy-ease);\n}\n/* A zero-height 30 px strut keeps every option at least 44 px wide, even \"Arm\", \"Leg\" or \"+5%\" with the\n   7 px padding below 350 px (min-content alone let them shrink to 36 px). */\n.iso.optimal .opt-seg-btn::after {\n  content: \"\";\n  display: block;\n  width: 30px;\n  height: 0;\n  margin: 0 auto;\n}\n.iso.optimal .opt-seg-btn[aria-checked=\"true\"] {\n  background: var(--opt-btn-on);\n  color: var(--opt-btn-on-text);\n}\n.iso.optimal .opt-seg-btn:focus-visible {\n  outline: 2px solid var(--opt-fig);\n  outline-offset: 2px;\n}\n.iso.optimal .opt-foot {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: flex-end;\n  justify-content: space-between;\n  gap: 10px 20px;\n  margin-top: 16px;\n}\n.iso.optimal .opt-hint {\n  font-family: var(--anatomy-mono);\n  font-size: 10.5px;\n  line-height: 1.4;\n  letter-spacing: 0.1em;\n  text-transform: uppercase;\n  color: var(--anatomy-muted);\n  flex: 1 1 160px;\n  min-width: 0;\n}\n.iso.optimal .opt-readout {\n  display: grid;\n  grid-auto-flow: column;\n  gap: 4px 18px;\n  margin: 0;\n  font-family: var(--opt-ui);\n  font-feature-settings: \"tnum\" 1;\n}\n.iso.optimal .opt-stat { margin: 0; min-width: 0; }\n.iso.optimal .opt-stat dt {\n  font-size: 10px;\n  font-weight: 600;\n  letter-spacing: 0.12em;\n  text-transform: uppercase;\n  color: var(--anatomy-muted);\n  white-space: nowrap;\n}\n.iso.optimal .opt-stat dd {\n  margin: 1px 0 0;\n  font-size: 15px;\n  font-weight: 500;\n  color: var(--anatomy-strong);\n  white-space: nowrap;\n}\n.iso.optimal .iso-legend { font-family: var(--opt-ui); font-size: 13.5px; }\n.iso.optimal .iso-caption { color: var(--anatomy-text); }\n.iso.optimal .iso-caption em { font-style: italic; }\n.iso.optimal .iso-swatch[data-mark=\"heat\"] path { stroke: var(--opt-heat-ink); stroke-width: 2; }\n.iso.optimal .iso-stage { outline: none; border-radius: 4px; touch-action: pan-y; -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none; }\n.iso.optimal .iso-stage:focus-visible { outline: 1px solid var(--anatomy-muted); outline-offset: 6px; }\n@media (max-width: 560px) {\n  .iso.optimal .opt-plate { padding: 44px 10px 14px; }\n  .iso.optimal .iso-plate-corners { inset: 16px 12px; }\n  .iso.optimal .opt-readout { grid-auto-flow: row; grid-template-columns: repeat(4, minmax(0, auto)); width: 100%; justify-content: space-between; gap: 4px 10px; order: -1; }\n  .iso.optimal .opt-stat dd { font-size: 14px; }\n  /* a long label wraps onto two lines instead of running into its neighbour; values stay on one baseline */\n  .iso.optimal .opt-stat { display: flex; flex-direction: column; justify-content: space-between; }\n  .iso.optimal .opt-stat dt { white-space: normal; line-height: 1.25; }\n  .iso.optimal .opt-seg-btn { padding: 0 12px; font-size: 13.5px; }\n}\n@media (max-width: 350px) {\n  .iso.optimal .opt-seg-btn { padding: 0 7px; font-size: 12.5px; }\n  .iso.optimal .opt-stat dt { font-size: 9px; letter-spacing: 0.08em; }\n  .iso.optimal .opt-stat dd { font-size: 13px; }\n}\n\n:host{display:block;letter-spacing:normal;word-spacing:normal;text-transform:none;text-indent:0;text-align:start;text-align-last:auto;white-space:normal;text-wrap:wrap;word-break:normal;overflow-wrap:normal;hyphens:manual;line-break:auto;text-anchor:start;text-shadow:none}\n.opt-host{background:transparent;color:var(--anatomy-text);font:15px/1.6 var(--opt-ui);-webkit-font-smoothing:antialiased;letter-spacing:normal;word-spacing:normal;text-transform:none;text-indent:0;text-align:start;text-align-last:auto;white-space:normal;text-wrap:wrap;word-break:normal;overflow-wrap:normal;hyphens:manual;line-break:auto;text-anchor:start;text-shadow:none}\n.opt-host *{box-sizing:border-box}\n.opt-host .iso-figure{margin:0}\n/* A6 · the red cell's loop: cream bone with deep-red marrow, a dark-red spleen, cells in\n   textbook red with pale centres, gold ferritin, straw transferrin. */\n.iso.optimal {\n  --a6-mr0: #8a2c30; --a6-mr1: #5a171c; --a6-cortex: #e8dcc2; --a6-cortex-edge: #b7a57e; --a6-trab: #d9c9a3; --a6-fat: rgba(240, 222, 170, 0.32);\n  --a6-nurse: #e6cdb8; --a6-nurse-nuc: #7d6896; --a6-eb-early: #8f7cc9; --a6-eb-late: #e0584a; --a6-eb-nuc: #3f2f78;\n  --a6-sinus: #3a1014; --a6-sinus-edge: #c06a5a;\n  --a6-sp0: #6e2328; --a6-sp1: #3e1115; --a6-capsule: #c88a7a; --a6-cords: rgba(255, 170, 150, 0.16); --a6-white: rgba(236, 214, 204, 0.4); --a6-art: #c0485a;\n  --a6-mc0: #f1dccb; --a6-mc1: #cfae98; --a6-mac-edge: #8a5a4a; --a6-mac-nuc: #8a6d9e; --a6-phago: #b77e6e; --a6-gran: #c98a1c; --a6-gran-edge: #6e4a0c;\n  --a6-arc: rgba(255, 200, 186, 0.07); --a6-arc-edge: #b5645a; --a6-ret: rgba(246, 214, 140, 0.12); --a6-ret-edge: #9a8a5a;\n  --a6-cell: #e04a38; --a6-pallor-full: #f39a84; --a6-pale: #e8a497; --a6-pallor-pale: #fbe0d6; --a6-young: #c4598a; --a6-retic: #fbd2e6; --a6-old: #93291f; --a6-pallor-old: #b84a3c;\n  --a6-tf: #ffd27a; --a6-ivp: #e0a040; --a6-iv: #b9c2c9;\n  --a6-tick: rgba(233, 230, 220, 0.6);\n  --a6-mon-bg: #0f1b0c; --a6-mon-ink: #c9e3c1; --a6-mon-dim: #33452e; --a6-fer: #f2b33d; --a6-hb: #ff7b6b;\n}\n.iso.optimal[data-theme=\"light\"] {\n  --a6-mr0: #c2474a; --a6-mr1: #8e2a2e; --a6-cortex: #f4ead4; --a6-cortex-edge: #9f8c62; --a6-trab: #efe2c2; --a6-fat: rgba(255, 244, 205, 0.6);\n  --a6-nurse: #f6e5d6; --a6-nurse-nuc: #6d588a; --a6-eb-early: #7f6cc0; --a6-eb-late: #e0584a; --a6-eb-nuc: #33246a;\n  --a6-sinus: #6e1c22; --a6-sinus-edge: #9a4a3e;\n  --a6-sp0: #b2464a; --a6-sp1: #7a2226; --a6-capsule: #7a3a30; --a6-cords: rgba(255, 210, 196, 0.28); --a6-white: rgba(255, 240, 232, 0.55); --a6-art: #8a2230;\n  --a6-mc0: #fff3e8; --a6-mc1: #ead2bf; --a6-mac-edge: #7a4a3a; --a6-mac-nuc: #6d588a; --a6-phago: #c98e7e; --a6-gran: #b67a10; --a6-gran-edge: #5e3e06;\n  --a6-arc: rgba(214, 120, 104, 0.07); --a6-arc-edge: #a8574c; --a6-ret: rgba(214, 170, 60, 0.12); --a6-ret-edge: #a8925a;\n  --a6-cell: #d63b2b; --a6-pallor-full: #f08a74; --a6-pale: #eba79a; --a6-pallor-pale: #fff0ea; --a6-young: #b4467a; --a6-retic: #fbd2e6; --a6-old: #8a2219; --a6-pallor-old: #b24234;\n  --a6-tf: #d49a16; --a6-ivp: #a8650c; --a6-iv: #7d8a94;\n  --a6-tick: rgba(62, 61, 57, 0.65);\n  --a6-mon-bg: #1d2a1a; --a6-mon-ink: #d9efd2; --a6-mon-dim: #3d5436; --a6-fer: #f2b33d; --a6-hb: #ff8a7a;\n}\n.a6-mr0 { stop-color: var(--a6-mr0); } .a6-mr1 { stop-color: var(--a6-mr1); }\n.a6-sp0 { stop-color: var(--a6-sp0); } .a6-sp1 { stop-color: var(--a6-sp1); }\n.a6-mc0 { stop-color: var(--a6-mc0); } .a6-mc1 { stop-color: var(--a6-mc1); }\n.a6-svg .a6-mon path, .a6-svg .a6-mon rect, .a6-svg .a6-mon circle { vector-effect: non-scaling-stroke; }\n.a6-cortex { fill: none; stroke: var(--a6-cortex); stroke-width: 11; stroke-linejoin: round; }\n.a6-bone { stroke: var(--a6-cortex-edge); stroke-width: 14; stroke-linejoin: round; }\n.a6-trab { fill: none; stroke: var(--a6-trab); stroke-width: 5.2; stroke-linecap: round; opacity: 0.88; }\n.a6-trab-node { fill: var(--a6-trab); opacity: 0.88; }\n.a6-fat { fill: var(--a6-fat); }\n.a6-nurse { fill: var(--a6-nurse); opacity: 0.92; }\n.a6-nurse-nuc { fill: var(--a6-nurse-nuc); }\n.a6-eb-cyto { fill: color-mix(in srgb, var(--a6-eb-late) calc(var(--m) * 100%), var(--a6-eb-early)); stroke: rgba(0, 0, 0, 0.25); stroke-width: 0.6; }\n.a6-eb-nuc { fill: var(--a6-eb-nuc); }\n.a6-sinus { fill: var(--a6-sinus); stroke: var(--a6-sinus-edge); stroke-width: 1; }\n.a6-spleen { stroke: none; }\n.a6-capsule { fill: none; stroke: var(--a6-capsule); stroke-width: 3.2; stroke-linejoin: round; }\n.a6-cords { fill: none; stroke: var(--a6-cords); stroke-width: 2.4; stroke-linecap: round; }\n.a6-white { fill: var(--a6-white); }\n.a6-art { fill: var(--a6-art); }\n.a6-mac { stroke: var(--a6-mac-edge); stroke-width: 1.2; }\n.a6-mac-nuc { fill: var(--a6-mac-nuc); opacity: 0.9; }\n.a6-phago { fill: var(--a6-phago); opacity: 0.55; }\n.a6-gran { fill: var(--a6-gran); stroke: var(--a6-gran-edge); stroke-width: 0.6; }\n.a6-arc-edge { fill: var(--a6-arc); stroke: var(--a6-arc-edge); stroke-width: 1.4; stroke-linejoin: round; }\n.a6-ret { fill: var(--a6-ret); stroke: var(--a6-ret-edge); stroke-width: 1.1; stroke-dasharray: 5 3; }\n.a6-c { stroke: rgba(0, 0, 0, 0.22); stroke-width: 0.5; }\n.a6-c-full { fill: var(--a6-cell); } .a6-pallor-full { fill: var(--a6-pallor-full); }\n.a6-c-pale { fill: var(--a6-pale); } .a6-pallor-pale { fill: var(--a6-pallor-pale); }\n.a6-c-young { fill: var(--a6-young); } .a6-retic { fill: var(--a6-retic); }\n.a6-c-old { fill: var(--a6-old); } .a6-pallor-old { fill: var(--a6-pallor-old); }\n.a6-tf { fill: var(--a6-tf); }\n.a6-ivp { fill: var(--a6-ivp); }\n.a6-iv { transition: opacity 0.5s; }\n.a6-iv-line { fill: none; stroke: var(--a6-iv); stroke-width: 3; stroke-linecap: round; }\n.a6-iv-hub { fill: var(--a6-iv); }\n.a6-tick { fill: none; stroke: var(--a6-tick); stroke-width: 1.4; }\n.a6-tick-txt { fill: var(--a6-tick); font: 500 17px/1 var(--opt-ui); font-variant-numeric: tabular-nums; }\n.a6-mon-bg { fill: var(--a6-mon-bg); }\n/* \"Hemoglobin\" sits clear of the ferritin baseline and of the ferritin dot riding along it before the dose, and both\n   labels are painted over the cursor with a knock-out halo, so the moving day line breaks around them */\n.a6-mlabel { font: 600 18px/1 var(--opt-ui); paint-order: stroke; stroke: var(--a6-mon-bg); stroke-width: 6px; stroke-linejoin: round; }\n.a6-mlabel-fer { fill: var(--a6-fer); } .a6-mlabel-hb { fill: var(--a6-hb); }\n.a6-axis { fill: none; stroke: var(--a6-mon-ink); stroke-width: 1; opacity: 0.45; }\n.a6-mtick { fill: var(--a6-mon-ink); font: 500 17px/1 var(--opt-ui); opacity: 0.8; }\n.a6-trace { fill: none; stroke-width: 2.6; stroke-linejoin: round; stroke-linecap: round; }\n.a6-trace-ghost { fill: none; stroke-width: 1.3; stroke-dasharray: 3 4; opacity: 0.4; }\n.a6-fer { stroke: var(--a6-fer); } .a6-hbl { stroke: var(--a6-hb); }\n.a6-cursor { fill: none; stroke: var(--a6-mon-ink); stroke-width: 1; stroke-dasharray: 2 3; opacity: 0.7; }\n.a6-cdot { stroke: var(--a6-mon-bg); stroke-width: 2; }\n.a6-cdot-fer { fill: var(--a6-fer); } .a6-cdot-hb { fill: var(--a6-hb); }\n.iso.optimal .iso-swatch[data-mark=\"cell\"] path { stroke: var(--a6-cell); stroke-width: 5; stroke-linecap: round; }\n.iso.optimal .iso-swatch[data-mark=\"pale\"] path { stroke: var(--a6-pale); stroke-width: 5; stroke-linecap: round; }\n.iso.optimal .iso-swatch[data-mark=\"ferritin\"] path { stroke: var(--a6-gran); stroke-width: 5; stroke-linecap: round; stroke-dasharray: 0.1 4.5; }\n.iso.optimal .iso-swatch[data-mark=\"tf\"] path { stroke: var(--a6-tf); stroke-width: 5; stroke-linecap: round; stroke-dasharray: 0.1 4.5; }\n.a6-scene { margin: 10px 4px 0; font: 500 14px/1.45 var(--opt-ui); color: var(--anatomy-text); min-height: 5.8em; }\n.a6-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }\n.a6-par { display: block; margin-top: 6px; }\n.a6-par:first-child { margin-top: 0; }\n.a6-par small { font-size: 12.5px; color: var(--anatomy-muted); }\n\n/* round 3: cut in half and seen in 3-D; the vessels are open half-pipes, so their insides are solid */\n.iso.optimal { --a6-arc-in: #4a2226; --a6-ret-in: #3a3220; }\n.iso.optimal[data-theme=\"light\"] { --a6-arc-in: #f7e1da; --a6-ret-in: #f6ecd2; }\n.a6-front .a6-arc-edge { fill: var(--a6-arc-in); }\n.a6-front .a6-ret { fill: var(--a6-ret-in); }\n\n/* with the 3-D layer on (shared/gl3) the scene is its own picture: the ticks and the monitor are drawn over it as they are, not multiplied */\n.a6-stage[data-gl3=\"on\"] > svg.a6-svg { mix-blend-mode: normal; }\n/* The shared 3-D layer (shared/gl3): the canvas under the drawing, and the drawing as its ink pass.\n   Nothing here applies until host.js sets data-gl3=\"on\" on the stage (after the layer's first frame). */\n.iso-stage[data-gl3]{position:relative}\n.gl3-canvas{position:absolute;left:0;top:0;width:100%;height:100%;display:block;pointer-events:none;opacity:0;transition:opacity .5s ease}\n.iso-stage[data-gl3=\"on\"]>.gl3-canvas{opacity:1}\n/* the SVG multiplies over the render: white leaves the render as it is, ink darkens it */\n.iso-stage[data-gl3=\"on\"]>svg{mix-blend-mode:multiply}\n.iso-stage[data-gl3=\"on\"]>svg:not(.iso-layer){position:relative}\n/* solids: the render is the body now. Fills go white (they still hide what is behind them, in the drawing's own\n   order), and the drawn shading, edges and ground shadow step aside. Anything inside [data-gl3-keep] stays as drawn\n   (a small moving marker the layer has no solid for). */\n.iso-stage[data-gl3=\"on\"] .iso-solid:not([data-gl3-keep]):not([data-gl3-keep] *)>.iso-fill{fill:#fff!important;stroke:none!important}\n.iso-stage[data-gl3=\"on\"] .iso-solid:not([data-gl3-keep]):not([data-gl3-keep] *)>.iso-shade,.iso-stage[data-gl3=\"on\"] .iso-solid:not([data-gl3-keep]):not([data-gl3-keep] *)>.iso-top{display:none}\n.iso-stage[data-gl3=\"on\"] .iso-solid:not([data-gl3-keep]):not([data-gl3-keep] *)>.iso-edge,.iso-stage[data-gl3=\"on\"] .iso-solid:not([data-gl3-keep]):not([data-gl3-keep] *)>.iso-crease,.iso-stage[data-gl3=\"on\"] .iso-solid:not([data-gl3-keep]):not([data-gl3-keep] *)>.iso-bevel{stroke-opacity:0}\n/* the turn runtime's tone facets (the take-apart pages) are shading too */\n.iso-stage[data-gl3=\"on\"] .iso-solid:not([data-gl3-keep]):not([data-gl3-keep] *)>.iso-tn{display:none}\n.iso-stage[data-gl3=\"on\"] .iso-halo{display:none}\n.iso-stage[data-gl3=\"on\"] .tb-body{fill:#fff!important}\n.iso-stage[data-gl3=\"on\"] .tb-shine,.iso-stage[data-gl3=\"on\"] .tb-shade{display:none}\n.iso-stage[data-gl3=\"on\"] .tb-ring{stroke-opacity:0}\n.iso-stage[data-gl3=\"on\"] .iso-wire-end{fill:#fff!important;stroke-opacity:0}\n/* hide a drawn element only while the layer is on (a drawn shadow, a drawn highlight the render now makes) */\n.iso-stage[data-gl3=\"on\"] [data-gl3-hide]{display:none}\n/* in Forest night the stage is a Cream island for the ink (host.js adds the classes): no ground of its own */\n.iso-stage[data-gl3-theme]{background:transparent;color:inherit}\n/* Drag to turn (host.js, gl3TurnControl). The drawing was made for one view: while the object is turned it steps\n   aside, quickly, and it eases back once the object is home. */\n.iso-stage[data-gl3=\"on\"]>svg{transition:opacity .34s ease}\n.iso-stage[data-gl3=\"on\"][data-gl3-turn]>svg{opacity:0;transition:opacity .09s linear}\n.iso-stage[data-gl3-turnable=\"stage\"]{cursor:grab}\n.iso-stage[data-gl3-grab],.iso-stage[data-gl3-grab] *{cursor:grabbing!important}\n.gl3-turn{position:absolute;z-index:2;width:44px;height:44px;padding:0;margin:0;border:0;border-radius:50%;background:none;display:grid;place-items:center;cursor:grab;touch-action:none;opacity:0;transition:opacity .4s ease;-webkit-tap-highlight-color:transparent;-webkit-appearance:none;appearance:none}\n.gl3-turn[data-at=\"tl\"]{left:0;top:0}\n.gl3-turn[data-at=\"tr\"]{right:0;top:0}\n.gl3-turn[data-at=\"bl\"]{left:0;bottom:0}\n.gl3-turn[data-at=\"br\"]{right:0;bottom:0}\n.gl3-turn[data-shown]{opacity:.5}\n.gl3-turn[data-shown]:hover,.gl3-turn:focus-visible,.iso-stage[data-gl3-turn]>.gl3-turn{opacity:1}\n.gl3-turn:focus-visible{outline:2px solid currentColor;outline-offset:-5px}\n.gl3-turn svg{width:26px;height:26px;overflow:visible;fill:none;stroke:currentColor;stroke-width:1.3;stroke-linecap:round;stroke-linejoin:round;pointer-events:none}\n" + "</style><div class=\"iso optimal opt-host\" data-theme=\"" + theme + "\">" + "<figure class=\"iso-figure opt-figure \"><div class=\"iso-plate opt-plate\"><div class=\"iso-plate-corners\" aria-hidden=\"true\"><span class=\"iso-plate-corner\" data-corner=\"fig\">A6</span><span class=\"iso-plate-corner\" data-corner=\"title\">The red cell's 120 days</span></div><div class=\"iso-stage a6-stage\"><svg class=\"iso-svg a6-svg\" viewBox=\"0 0 600 650\" role=\"img\" aria-label=\"The red cell's life as a loop, drawn in 3-D with the bone and the spleen cut open. On the left, bone marrow makes red cells on small islands around a nurse cell. New cells leave and ride an arc across the top that stands for their 120-day life, older cells further along. On the right, in the spleen, a large macrophage eats the oldest cells and stores their iron as ferritin or hands it to transferrin, which carries it back under the arc to the marrow. A monitor underneath plots ferritin and hemoglobin over eight weeks.\">\n<defs>\n  <radialGradient id=\"a6-marrow\" cx=\"45%\" cy=\"45%\" r=\"70%\"><stop offset=\"0\" class=\"a6-mr0\"/><stop offset=\"1\" class=\"a6-mr1\"/></radialGradient>\n  <radialGradient id=\"a6-pulp\" cx=\"55%\" cy=\"45%\" r=\"70%\"><stop offset=\"0\" class=\"a6-sp0\"/><stop offset=\"1\" class=\"a6-sp1\"/></radialGradient>\n  <radialGradient id=\"a6-macg\" cx=\"40%\" cy=\"38%\" r=\"70%\"><stop offset=\"0\" class=\"a6-mc0\"/><stop offset=\"1\" class=\"a6-mc1\"/></radialGradient>\n  <clipPath id=\"a6-boneclip\"><path d=\"M58.0 148.0C67.0 134.3 81.3 124.0 96.0 118.0C110.7 112.0 131.0 109.7 146.0 112.0C161.0 114.3 176.3 121.3 186.0 132.0C195.7 142.7 202.0 158.7 204.0 176.0C206.0 193.3 201.7 217.0 198.0 236.0C194.3 255.0 185.7 271.0 182.0 290.0C178.3 309.0 175.7 331.0 176.0 350.0C176.3 369.0 186.3 390.0 184.0 404.0C181.7 418.0 174.3 428.0 162.0 434.0C149.7 440.0 125.3 441.3 110.0 440.0C94.7 438.7 78.7 436.0 70.0 426.0C61.3 416.0 59.0 397.7 58.0 380.0C57.0 362.3 65.3 339.7 64.0 320.0C62.7 300.3 53.7 282.0 50.0 262.0C46.3 242.0 40.7 219.0 42.0 200.0C43.3 181.0 49.0 161.7 58.0 148.0Z\"/></clipPath>\n  <clipPath id=\"a6-spleenclip\"><path d=\"M446.0 168.0C457.0 158.0 476.7 148.0 494.0 146.0C511.3 144.0 535.7 146.3 550.0 156.0C564.3 165.7 574.0 182.3 580.0 204.0C586.0 225.7 587.0 259.3 586.0 286.0C585.0 312.7 582.3 342.0 574.0 364.0C565.7 386.0 551.7 407.0 536.0 418.0C520.3 429.0 496.7 432.3 480.0 430.0C463.3 427.7 445.3 416.3 436.0 404.0C426.7 391.7 423.0 372.7 424.0 356.0C425.0 339.3 442.0 321.0 442.0 304.0C442.0 287.0 426.3 270.3 424.0 254.0C421.7 237.7 424.3 220.3 428.0 206.0C431.7 191.7 435.0 178.0 446.0 168.0Z\"/></clipPath>\n</defs>\n<g transform=\"matrix(0.8848 0.1913 0.0000 0.9154 17.76 -38.65)\" data-gl3-hide><g class=\"a6-far\" data-part=\"far\"></g></g>\n<g class=\"a6-front\" transform=\"matrix(0.8848 0.1913 0.0000 0.9154 17.76 -38.65)\">\n<path class=\"a6-ret\" d=\"M473.8 314.8L472.1 318.1L469.9 322.6L467.3 327.8L464.3 333.7L461.2 339.9L458.0 346.2L454.7 352.5L451.6 358.5L448.7 363.9L446.0 368.6L443.7 372.7L441.7 376.3L439.8 379.7L438.0 382.7L436.4 385.4L434.6 388.2L432.8 390.7L430.7 393.3L428.1 396.1L425.2 399.3L421.7 402.8L418.0 406.6L414.4 410.4L410.6 414.2L406.5 417.9L402.2 421.5L397.5 425.0L392.6 428.3L387.2 431.3L381.5 433.9L375.0 436.2L367.7 438.6L359.9 440.8L351.5 442.8L342.9 444.6L334.1 446.1L325.3 447.4L316.6 448.4L308.0 449.1L299.8 449.5L291.8 449.5L283.4 449.2L274.9 448.8L266.6 447.9L258.3 446.7L250.1 445.4L242.3 443.8L235.1 442.1L228.4 440.1L222.3 438.1L217.3 435.8L212.9 433.3L209.1 430.5L205.4 427.3L202.1 424.0L198.8 420.3L195.4 416.5L192.0 412.7L188.1 408.9L184.0 405.2L179.8 401.8L175.5 398.4L171.1 395.0L166.7 391.6L162.4 388.2L158.2 384.9L154.2 381.9L150.5 378.8L147.1 376.0L144.1 373.4L141.4 371.0L139.1 368.6L136.9 366.4L135.0 364.2L133.1 362.1L131.5 360.2L130.2 358.5L128.9 356.8L127.6 355.2L126.4 354.0L117.6 362.0L118.4 363.0L119.3 364.2L120.6 365.9L122.1 367.8L123.9 369.9L125.8 372.2L127.9 374.6L130.3 377.2L133.0 379.8L135.9 382.6L139.1 385.4L142.7 388.4L146.6 391.5L150.6 394.7L154.8 398.0L159.1 401.4L163.5 404.8L167.7 408.2L172.0 411.6L176.0 414.8L179.5 417.9L182.8 421.3L186.0 424.9L189.4 428.7L192.9 432.6L196.8 436.5L201.1 440.3L205.9 443.9L211.5 447.2L217.7 449.9L224.4 452.3L231.7 454.5L239.5 456.4L247.7 458.0L256.3 459.5L265.0 460.7L273.9 461.6L282.8 462.2L291.6 462.5L300.2 462.5L308.8 462.1L317.8 461.4L326.9 460.4L336.1 459.1L345.3 457.4L354.3 455.6L363.1 453.6L371.5 451.2L379.2 448.8L386.5 446.1L393.2 443.1L399.4 439.7L405.1 436.0L410.4 432.1L415.3 428.1L419.8 424.0L424.0 419.8L427.8 416.0L431.3 412.2L434.8 408.7L438.1 405.3L440.9 402.1L443.6 398.9L445.8 395.8L447.8 392.8L449.8 389.7L451.6 386.5L453.5 383.1L455.7 379.5L458.0 375.4L460.7 370.5L463.8 364.9L466.9 358.9L470.2 352.6L473.6 346.1L476.7 339.9L479.7 334.0L482.3 328.8L484.5 324.5L486.2 321.2Z\" data-gl3-hide/>\n<path class=\"a6-bone\" d=\"M58.0 148.0C67.0 134.3 81.3 124.0 96.0 118.0C110.7 112.0 131.0 109.7 146.0 112.0C161.0 114.3 176.3 121.3 186.0 132.0C195.7 142.7 202.0 158.7 204.0 176.0C206.0 193.3 201.7 217.0 198.0 236.0C194.3 255.0 185.7 271.0 182.0 290.0C178.3 309.0 175.7 331.0 176.0 350.0C176.3 369.0 186.3 390.0 184.0 404.0C181.7 418.0 174.3 428.0 162.0 434.0C149.7 440.0 125.3 441.3 110.0 440.0C94.7 438.7 78.7 436.0 70.0 426.0C61.3 416.0 59.0 397.7 58.0 380.0C57.0 362.3 65.3 339.7 64.0 320.0C62.7 300.3 53.7 282.0 50.0 262.0C46.3 242.0 40.7 219.0 42.0 200.0C43.3 181.0 49.0 161.7 58.0 148.0Z\" fill=\"url(#a6-marrow)\" data-gl3-hide/>\n<g clip-path=\"url(#a6-boneclip)\" data-gl3-hide>\n  <path class=\"a6-fat\" d=\"M154.4 283.1a8.057852632885663 8.057852632885663 0 1 0 16.115705265771325 0a8.057852632885663 8.057852632885663 0 1 0 -16.115705265771325 0M81.7 136.5a8.198263148030511 8.198263148030511 0 1 0 16.396526296061023 0a8.198263148030511 8.198263148030511 0 1 0 -16.396526296061023 0M75.5 149.5a10.741926148759132 10.741926148759132 0 1 0 21.483852297518265 0a10.741926148759132 10.741926148759132 0 1 0 -21.483852297518265 0M118.9 407.9a7.639617005493135 7.639617005493135 0 1 0 15.27923401098627 0a7.639617005493135 7.639617005493135 0 1 0 -15.27923401098627 0M120.0 402.4a9.4815448135897 9.4815448135897 0 1 0 18.9630896271794 0a9.4815448135897 9.4815448135897 0 1 0 -18.9630896271794 0M94.9 139.9a10.02447287600904 10.02447287600904 0 1 0 20.04894575201808 0a10.02447287600904 10.02447287600904 0 1 0 -20.04894575201808 0M171.7 298.1a7.779702833648495 7.779702833648495 0 1 0 15.55940566729699 0a7.779702833648495 7.779702833648495 0 1 0 -15.55940566729699 0M58.2 209.2a9.89697654768543 9.89697654768543 0 1 0 19.79395309537086 0a9.89697654768543 9.89697654768543 0 1 0 -19.79395309537086 0M88.1 169.6a6.414501300933306 6.414501300933306 0 1 0 12.829002601866613 0a6.414501300933306 6.414501300933306 0 1 0 -12.829002601866613 0\"/>\n  <path class=\"a6-trab\" d=\"M104.4 293.4Q89.9 295.7 73.0 295.1M104.4 293.4Q87.1 310.7 72.3 325.8M59.1 375.6Q64.5 370.3 60.6 371.9M59.1 375.6Q68.7 387.8 84.5 389.6M59.1 375.6Q66.7 389.3 69.7 403.9M79.0 171.2Q80.9 172.4 85.0 163.8M79.0 171.2Q70.8 161.1 63.5 162.5M79.0 171.2Q77.7 157.7 86.7 148.0M114.2 169.1Q117.4 172.4 125.2 168.8M114.2 169.1Q121.2 168.5 126.8 177.3M114.2 169.1Q118.2 162.0 131.0 159.5M179.2 289.5Q175.7 291.0 168.0 294.7M179.2 289.5Q179.3 280.9 168.4 272.6M179.2 289.5Q181.7 300.7 177.2 311.7M118.5 149.9Q127.1 151.8 131.0 159.5M118.5 149.9Q124.9 145.7 136.6 152.5M118.5 149.9Q115.1 157.0 114.2 169.1M136.6 152.5Q137.5 150.0 131.0 159.5M136.6 152.5Q138.9 146.3 143.0 143.9M136.6 152.5Q148.1 151.8 149.2 160.7M175.0 244.5Q173.6 249.4 174.5 246.1M175.0 244.5Q177.8 253.6 174.7 256.0M175.0 244.5Q179.1 239.0 195.0 241.3M155.9 310.0Q151.7 314.8 158.6 328.1M155.9 310.0Q161.4 307.4 168.0 294.7M155.9 310.0Q167.0 311.0 177.2 311.7M72.3 325.8Q78.2 316.0 73.0 295.1M72.3 325.8Q70.9 347.9 60.6 371.9M195.0 241.3Q187.8 229.8 188.7 222.8M195.0 241.3Q183.4 243.0 174.5 246.1M177.2 311.7Q175.8 303.9 168.0 294.7M188.7 222.8Q185.2 229.3 175.0 244.5M188.7 222.8Q179.7 209.6 177.6 199.0M175.8 342.5Q180.6 352.1 173.8 353.4M175.8 342.5Q162.1 332.6 158.6 328.1M175.8 342.5Q178.0 329.4 177.2 311.7M149.2 160.7Q153.6 156.9 154.4 145.1M149.2 160.7Q142.1 158.2 143.0 143.9M101.8 125.2Q103.3 135.6 104.4 135.0M101.8 125.2Q94.1 127.1 91.9 130.1M101.8 125.2Q95.2 132.7 86.7 148.0M73.0 295.1Q67.6 273.3 50.1 256.7M143.0 143.9Q143.6 142.2 140.3 137.6M143.0 143.9Q146.5 146.9 154.4 145.1M131.0 159.5Q127.8 158.6 125.2 168.8M168.4 272.6Q167.4 275.2 161.8 273.5M168.4 272.6Q173.8 261.5 174.7 256.0M154.7 408.4Q148.0 416.3 147.2 412.3M154.7 408.4Q151.0 399.8 144.3 395.1M154.7 408.4Q161.0 421.9 159.7 427.8M55.8 215.4Q60.2 211.3 67.3 211.3M55.8 215.4Q47.9 231.5 50.1 256.7M55.8 215.4Q73.1 198.0 79.0 171.2M67.3 211.3Q75.8 196.6 79.0 171.2M67.3 211.3Q55.2 231.3 50.1 256.7M137.3 435.5Q147.1 438.2 159.1 429.9M137.3 435.5Q152.0 434.7 159.7 427.8M137.3 435.5Q144.7 425.7 147.2 412.3M174.5 246.1Q176.1 251.0 174.7 256.0M175.8 188.8Q182.5 192.6 177.6 199.0M175.8 188.8Q164.0 186.8 162.6 189.4M175.8 188.8Q182.0 178.4 183.9 160.4M154.4 145.1Q148.7 142.3 140.3 137.6M159.1 429.9Q155.1 423.5 159.7 427.8M159.1 429.9Q156.6 426.4 147.2 412.3M159.1 429.9Q161.6 422.9 154.7 408.4M177.6 199.0Q171.7 191.0 162.6 189.4M179.5 145.9Q183.8 138.0 179.9 132.8M179.5 145.9Q183.9 157.3 183.9 160.4M179.5 145.9Q165.3 147.9 154.4 145.1M147.2 412.3Q145.5 406.8 144.3 395.1M147.2 412.3Q150.7 422.4 159.7 427.8M168.0 377.1Q172.8 374.6 177.5 378.5M168.0 377.1Q170.3 367.4 173.8 353.4M168.0 377.1Q155.0 390.2 144.3 395.1M177.5 378.5Q173.3 361.1 173.8 353.4M177.5 378.5Q181.9 354.6 175.8 342.5M183.9 160.4Q178.1 147.1 179.9 132.8M85.0 163.8Q81.9 154.4 86.7 148.0M85.0 163.8Q68.5 167.0 63.5 162.5M60.6 371.9Q67.9 382.9 84.5 389.6M60.6 371.9Q60.3 384.6 69.7 403.9M104.4 135.0Q102.6 136.5 91.9 130.1M104.4 135.0Q107.1 139.8 118.5 149.9M140.3 137.6Q132.7 144.0 136.6 152.5M126.8 177.3Q127.8 174.3 125.2 168.8M126.8 177.3Q128.0 165.2 131.0 159.5M84.5 389.6Q73.0 402.1 69.7 403.9M84.5 389.6Q99.2 394.3 107.8 398.9M86.7 148.0Q85.5 138.8 91.9 130.1M86.7 148.0Q98.6 142.3 104.4 135.0M107.8 398.9Q123.1 392.2 144.3 395.1M107.8 398.9Q91.4 406.7 69.7 403.9M158.6 328.1Q168.7 321.3 177.2 311.7M162.6 189.4Q152.2 179.4 149.2 160.7M161.8 273.5Q169.7 269.0 174.7 256.0M161.8 273.5Q160.2 286.3 168.0 294.7M63.5 162.5Q80.0 154.3 86.7 148.0M179.9 132.8Q165.4 138.7 154.4 145.1\"/><path class=\"a6-trab-node\" d=\"M101.7 293.4a2.683453590500591 2.683453590500591 0 1 0 5.366907181001182 0a2.683453590500591 2.683453590500591 0 1 0 -5.366907181001182 0M55.5 375.6a3.6045074122068543 3.6045074122068543 0 1 0 7.209014824413709 0a3.6045074122068543 3.6045074122068543 0 1 0 -7.209014824413709 0M75.3 171.2a3.7560816209354266 3.7560816209354266 0 1 0 7.512163241870853 0a3.7560816209354266 3.7560816209354266 0 1 0 -7.512163241870853 0M110.1 169.1a4.063806535921811 4.063806535921811 0 1 0 8.127613071843623 0a4.063806535921811 4.063806535921811 0 1 0 -8.127613071843623 0M176.0 289.5a3.19645030330536 3.19645030330536 0 1 0 6.39290060661072 0a3.19645030330536 3.19645030330536 0 1 0 -6.39290060661072 0M115.4 149.9a3.1402555068398414 3.1402555068398414 0 1 0 6.280511013679683 0a3.1402555068398414 3.1402555068398414 0 1 0 -6.280511013679683 0M133.9 152.5a2.6743117504513934 2.6743117504513934 0 1 0 5.348623500902787 0a2.6743117504513934 2.6743117504513934 0 1 0 -5.348623500902787 0M171.4 244.5a3.5576017768658716 3.5576017768658716 0 1 0 7.115203553731743 0a3.5576017768658716 3.5576017768658716 0 1 0 -7.115203553731743 0M153.3 310.0a2.613068811607611 2.613068811607611 0 1 0 5.226137623215222 0a2.613068811607611 2.613068811607611 0 1 0 -5.226137623215222 0M69.2 325.8a3.0475291084940817 3.0475291084940817 0 1 0 6.095058216988163 0a3.0475291084940817 3.0475291084940817 0 1 0 -6.095058216988163 0M192.4 241.3a2.6217354789578686 2.6217354789578686 0 1 0 5.243470957915737 0a2.6217354789578686 2.6217354789578686 0 1 0 -5.243470957915737 0M174.1 311.7a3.108207196470543 3.108207196470543 0 1 0 6.216414392941086 0a3.108207196470543 3.108207196470543 0 1 0 -6.216414392941086 0M185.5 222.8a3.238359624741934 3.238359624741934 0 1 0 6.476719249483868 0a3.238359624741934 3.238359624741934 0 1 0 -6.476719249483868 0M172.2 342.5a3.5102205635143635 3.5102205635143635 0 1 0 7.020441127028727 0a3.5102205635143635 3.5102205635143635 0 1 0 -7.020441127028727 0M146.2 160.7a3.0770163838537563 3.0770163838537563 0 1 0 6.154032767707513 0a3.0770163838537563 3.0770163838537563 0 1 0 -6.154032767707513 0M98.0 125.2a3.814372218786154 3.814372218786154 0 1 0 7.628744437572308 0a3.814372218786154 3.814372218786154 0 1 0 -7.628744437572308 0M70.1 295.1a2.953884156377878 2.953884156377878 0 1 0 5.907768312755756 0a2.953884156377878 2.953884156377878 0 1 0 -5.907768312755756 0M139.9 143.9a3.1310259950636197 3.1310259950636197 0 1 0 6.262051990127239 0a3.1310259950636197 3.1310259950636197 0 1 0 -6.262051990127239 0M128.3 159.5a2.7539073997679235 2.7539073997679235 0 1 0 5.507814799535847 0a2.7539073997679235 2.7539073997679235 0 1 0 -5.507814799535847 0M164.7 272.6a3.721679216922894 3.721679216922894 0 1 0 7.443358433845788 0a3.721679216922894 3.721679216922894 0 1 0 -7.443358433845788 0M151.2 408.4a3.462602566240917 3.462602566240917 0 1 0 6.925205132481834 0a3.462602566240917 3.462602566240917 0 1 0 -6.925205132481834 0M53.0 215.4a2.761336581559234 2.761336581559234 0 1 0 5.522673163118468 0a2.761336581559234 2.761336581559234 0 1 0 -5.522673163118468 0M63.5 211.3a3.7839375253617185 3.7839375253617185 0 1 0 7.567875050723437 0a3.7839375253617185 3.7839375253617185 0 1 0 -7.567875050723437 0M133.9 435.5a3.437992010300972 3.437992010300972 0 1 0 6.875984020601944 0a3.437992010300972 3.437992010300972 0 1 0 -6.875984020601944 0M171.0 246.1a3.5317230918740137 3.5317230918740137 0 1 0 7.063446183748027 0a3.5317230918740137 3.5317230918740137 0 1 0 -7.063446183748027 0M172.9 188.8a2.870010356111462 2.870010356111462 0 1 0 5.740020712222924 0a2.870010356111462 2.870010356111462 0 1 0 -5.740020712222924 0M151.3 145.1a3.0640655737966913 3.0640655737966913 0 1 0 6.128131147593383 0a3.0640655737966913 3.0640655737966913 0 1 0 -6.128131147593383 0M155.3 429.9a3.7501076910180116 3.7501076910180116 0 1 0 7.500215382036023 0a3.7501076910180116 3.7501076910180116 0 1 0 -7.500215382036023 0M174.7 199.0a2.8599664601124513 2.8599664601124513 0 1 0 5.7199329202249025 0a2.8599664601124513 2.8599664601124513 0 1 0 -5.7199329202249025 0M170.8 256.0a3.8563055974024403 3.8563055974024403 0 1 0 7.7126111948048806 0a3.8563055974024403 3.8563055974024403 0 1 0 -7.7126111948048806 0M175.7 145.9a3.7281782324688306 3.7281782324688306 0 1 0 7.456356464937661 0a3.7281782324688306 3.7281782324688306 0 1 0 -7.456356464937661 0M143.3 412.3a3.8915567961442816 3.8915567961442816 0 1 0 7.783113592288563 0a3.8915567961442816 3.8915567961442816 0 1 0 -7.783113592288563 0M163.8 377.1a4.1950752109243306 4.1950752109243306 0 1 0 8.390150421848661 0a4.1950752109243306 4.1950752109243306 0 1 0 -8.390150421848661 0M174.5 378.5a3.0290700432183875 3.0290700432183875 0 1 0 6.058140086436775 0a3.0290700432183875 3.0290700432183875 0 1 0 -6.058140086436775 0M181.1 160.4a2.7802255349049583 2.7802255349049583 0 1 0 5.5604510698099165 0a2.7802255349049583 2.7802255349049583 0 1 0 -5.5604510698099165 0M156.9 427.8a2.850576258684114 2.850576258684114 0 1 0 5.701152517368228 0a2.850576258684114 2.850576258684114 0 1 0 -5.701152517368228 0M82.1 163.8a2.835190264354637 2.835190264354637 0 1 0 5.670380528709274 0a2.835190264354637 2.835190264354637 0 1 0 -5.670380528709274 0M57.1 371.9a3.442783689538747 3.442783689538747 0 1 0 6.885567379077494 0a3.442783689538747 3.442783689538747 0 1 0 -6.885567379077494 0M46.0 256.7a4.065476003908996 4.065476003908996 0 1 0 8.130952007817992 0a4.065476003908996 4.065476003908996 0 1 0 -8.130952007817992 0M100.3 135.0a4.055198751255124 4.055198751255124 0 1 0 8.110397502510247 0a4.055198751255124 4.055198751255124 0 1 0 -8.110397502510247 0M136.1 137.6a4.125413478096402 4.125413478096402 0 1 0 8.250826956192803 0a4.125413478096402 4.125413478096402 0 1 0 -8.250826956192803 0M123.4 177.3a3.424326949589259 3.424326949589259 0 1 0 6.848653899178518 0a3.424326949589259 3.424326949589259 0 1 0 -6.848653899178518 0M81.9 389.6a2.6630478166630938 2.6630478166630938 0 1 0 5.3260956333261875 0a2.6630478166630938 2.6630478166630938 0 1 0 -5.3260956333261875 0M83.6 148.0a3.044666684833045 3.044666684833045 0 1 0 6.08933336966609 0a3.044666684833045 3.044666684833045 0 1 0 -6.08933336966609 0M163.9 294.7a4.112981031008978 4.112981031008978 0 1 0 8.225962062017956 0a4.112981031008978 4.112981031008978 0 1 0 -8.225962062017956 0M103.7 398.9a4.07218884888309 4.07218884888309 0 1 0 8.14437769776618 0a4.07218884888309 4.07218884888309 0 1 0 -8.14437769776618 0M121.9 168.8a3.2779841779526175 3.2779841779526175 0 1 0 6.555968355905235 0a3.2779841779526175 3.2779841779526175 0 1 0 -6.555968355905235 0M169.9 353.4a3.8800860655308576 3.8800860655308576 0 1 0 7.760172131061715 0a3.8800860655308576 3.8800860655308576 0 1 0 -7.760172131061715 0M155.1 328.1a3.406505880510906 3.406505880510906 0 1 0 6.813011761021812 0a3.406505880510906 3.406505880510906 0 1 0 -6.813011761021812 0M158.6 189.4a3.94433995685013 3.94433995685013 0 1 0 7.88867991370026 0a3.94433995685013 3.94433995685013 0 1 0 -7.88867991370026 0M88.6 130.1a3.3216567806169923 3.3216567806169923 0 1 0 6.643313561233985 0a3.3216567806169923 3.3216567806169923 0 1 0 -6.643313561233985 0M66.2 403.9a3.4855187036893507 3.4855187036893507 0 1 0 6.971037407378701 0a3.4855187036893507 3.4855187036893507 0 1 0 -6.971037407378701 0M157.9 273.5a3.912858498574103 3.912858498574103 0 1 0 7.825716997148206 0a3.912858498574103 3.912858498574103 0 1 0 -7.825716997148206 0M140.4 395.1a3.8127877820402274 3.8127877820402274 0 1 0 7.625575564080455 0a3.8127877820402274 3.8127877820402274 0 1 0 -7.625575564080455 0M60.0 162.5a3.5242557802463472 3.5242557802463472 0 1 0 7.0485115604926944 0a3.5242557802463472 3.5242557802463472 0 1 0 -7.0485115604926944 0M176.2 132.8a3.766903888775878 3.766903888775878 0 1 0 7.533807777551756 0a3.766903888775878 3.766903888775878 0 1 0 -7.533807777551756 0\"/>\n  <path class=\"a6-sinus\" d=\"M125.2 241.4L127.1 239.7L129.4 237.5L132.2 234.9L135.4 231.9L138.8 228.7L142.3 225.3L145.9 221.8L149.5 218.2L152.9 214.7L156.0 211.3L159.0 207.8L162.0 204.2L164.9 200.5L167.8 196.7L170.6 193.0L173.4 189.4L175.9 185.9L178.4 182.7L180.6 179.8L182.7 177.3L184.6 175.0L186.4 172.9L188.1 171.0L189.6 169.3L191.1 167.7L192.5 166.3L193.7 165.1L194.8 163.9L195.9 162.9L196.7 162.0L183.3 150.0L182.6 150.9L181.7 151.9L180.7 153.1L179.5 154.4L178.1 156.0L176.6 157.8L175.0 159.7L173.2 161.8L171.3 164.2L169.3 166.7L167.2 169.6L164.9 172.7L162.5 176.1L160.0 179.6L157.4 183.2L154.7 186.9L152.0 190.6L149.3 194.1L146.6 197.6L144.0 200.7L141.2 203.9L138.1 207.3L134.8 210.7L131.4 214.2L128.0 217.6L124.7 220.8L121.6 223.8L118.9 226.5L116.5 228.8L114.8 230.6Z\"/>\n  <path class=\"a6-nurse\" d=\"M134.7 236.0C135.0 239.7 134.2 245.3 131.8 247.8C129.3 250.2 123.7 250.9 120.0 250.6C116.3 250.4 111.8 248.9 109.5 246.5C107.2 244.0 106.1 239.4 106.2 236.0C106.4 232.6 108.0 228.6 110.3 226.3C112.6 224.0 116.7 222.4 120.0 222.2C123.3 222.1 127.9 223.4 130.3 225.7C132.8 228.0 134.5 232.3 134.7 236.0Z\"/><path class=\"a6-nurse-nuc\" d=\"M112.0 237.0a6 6 0 1 0 12 0a6 6 0 1 0 -12 0\"/><g class=\"a6-eb\" data-mat=\"0.00\"><circle class=\"a6-eb-cyto\" cx=\"144.6\" cy=\"243.6\" r=\"7.2\" style=\"--m:0.00\"/><circle class=\"a6-eb-nuc\" cx=\"145.2\" cy=\"243.2\" r=\"4.6\"/></g><g class=\"a6-eb\" data-mat=\"0.13\"><circle class=\"a6-eb-cyto\" cx=\"134.0\" cy=\"257.7\" r=\"7.0\" style=\"--m:0.13\"/><circle class=\"a6-eb-nuc\" cx=\"134.6\" cy=\"257.3\" r=\"4.3\"/></g><g class=\"a6-eb\" data-mat=\"0.25\"><circle class=\"a6-eb-cyto\" cx=\"116.8\" cy=\"261.6\" r=\"6.8\" style=\"--m:0.25\"/><circle class=\"a6-eb-nuc\" cx=\"117.4\" cy=\"261.2\" r=\"3.9\"/></g><g class=\"a6-eb\" data-mat=\"0.38\"><circle class=\"a6-eb-cyto\" cx=\"101.1\" cy=\"253.5\" r=\"6.6\" style=\"--m:0.38\"/><circle class=\"a6-eb-nuc\" cx=\"101.7\" cy=\"253.1\" r=\"3.5\"/></g><g class=\"a6-eb\" data-mat=\"0.50\"><circle class=\"a6-eb-cyto\" cx=\"94.2\" cy=\"237.3\" r=\"6.4\" style=\"--m:0.50\"/><circle class=\"a6-eb-nuc\" cx=\"94.8\" cy=\"236.9\" r=\"3.2\"/></g><g class=\"a6-eb\" data-mat=\"0.63\"><circle class=\"a6-eb-cyto\" cx=\"99.4\" cy=\"220.4\" r=\"6.2\" style=\"--m:0.63\"/><circle class=\"a6-eb-nuc\" cx=\"100.0\" cy=\"220.0\" r=\"2.8\"/></g><g class=\"a6-eb\" data-mat=\"0.75\"><circle class=\"a6-eb-cyto\" cx=\"114.3\" cy=\"210.8\" r=\"6.0\" style=\"--m:0.75\"/><circle class=\"a6-eb-nuc\" cx=\"114.9\" cy=\"210.4\" r=\"2.5\"/></g><g class=\"a6-eb\" data-mat=\"0.88\"><circle class=\"a6-eb-cyto\" cx=\"131.8\" cy=\"213.1\" r=\"5.8\" style=\"--m:0.88\"/><circle class=\"a6-eb-nuc\" cx=\"132.4\" cy=\"212.7\" r=\"2.1\"/></g><g class=\"a6-eb\" data-mat=\"1.00\"><circle class=\"a6-eb-cyto\" cx=\"143.8\" cy=\"226.0\" r=\"5.6\" style=\"--m:1.00\"/><circle class=\"a6-eb-nuc\" cx=\"144.4\" cy=\"225.6\" r=\"1.8\"/></g><path class=\"a6-nurse\" d=\"M126.3 352.0C126.1 354.8 122.1 357.9 119.7 359.7C117.4 361.6 114.7 362.8 112.0 362.9C109.3 363.0 105.8 362.0 103.8 360.2C101.8 358.4 99.9 354.7 99.9 352.0C99.9 349.3 101.8 346.1 103.8 343.8C105.8 341.5 109.1 338.3 112.0 338.2C114.9 338.1 118.5 340.8 120.9 343.1C123.3 345.4 126.5 349.2 126.3 352.0Z\"/><path class=\"a6-nurse-nuc\" d=\"M105.2 353.0a4.800000000000001 4.800000000000001 0 1 0 9.600000000000001 0a4.800000000000001 4.800000000000001 0 1 0 -9.600000000000001 0\"/><g class=\"a6-eb\" data-mat=\"0.00\"><circle class=\"a6-eb-cyto\" cx=\"131.7\" cy=\"358.1\" r=\"7.2\" style=\"--m:0.00\"/><circle class=\"a6-eb-nuc\" cx=\"132.3\" cy=\"357.7\" r=\"4.6\"/></g><g class=\"a6-eb\" data-mat=\"0.17\"><circle class=\"a6-eb-cyto\" cx=\"119.5\" cy=\"371.2\" r=\"6.9\" style=\"--m:0.17\"/><circle class=\"a6-eb-nuc\" cx=\"120.1\" cy=\"370.8\" r=\"4.1\"/></g><g class=\"a6-eb\" data-mat=\"0.33\"><circle class=\"a6-eb-cyto\" cx=\"101.7\" cy=\"369.9\" r=\"6.7\" style=\"--m:0.33\"/><circle class=\"a6-eb-nuc\" cx=\"102.3\" cy=\"369.5\" r=\"3.7\"/></g><g class=\"a6-eb\" data-mat=\"0.50\"><circle class=\"a6-eb-cyto\" cx=\"91.6\" cy=\"355.1\" r=\"6.4\" style=\"--m:0.50\"/><circle class=\"a6-eb-nuc\" cx=\"92.2\" cy=\"354.7\" r=\"3.2\"/></g><g class=\"a6-eb\" data-mat=\"0.67\"><circle class=\"a6-eb-cyto\" cx=\"96.9\" cy=\"337.9\" r=\"6.1\" style=\"--m:0.67\"/><circle class=\"a6-eb-nuc\" cx=\"97.5\" cy=\"337.5\" r=\"2.7\"/></g><g class=\"a6-eb\" data-mat=\"0.83\"><circle class=\"a6-eb-cyto\" cx=\"113.6\" cy=\"331.4\" r=\"5.9\" style=\"--m:0.83\"/><circle class=\"a6-eb-nuc\" cx=\"114.2\" cy=\"331.0\" r=\"2.3\"/></g><g class=\"a6-eb\" data-mat=\"1.00\"><circle class=\"a6-eb-cyto\" cx=\"129.1\" cy=\"340.4\" r=\"5.6\" style=\"--m:1.00\"/><circle class=\"a6-eb-nuc\" cx=\"129.7\" cy=\"340.0\" r=\"1.8\"/></g>\n</g>\n<path class=\"a6-cortex\" d=\"M58.0 148.0C67.0 134.3 81.3 124.0 96.0 118.0C110.7 112.0 131.0 109.7 146.0 112.0C161.0 114.3 176.3 121.3 186.0 132.0C195.7 142.7 202.0 158.7 204.0 176.0C206.0 193.3 201.7 217.0 198.0 236.0C194.3 255.0 185.7 271.0 182.0 290.0C178.3 309.0 175.7 331.0 176.0 350.0C176.3 369.0 186.3 390.0 184.0 404.0C181.7 418.0 174.3 428.0 162.0 434.0C149.7 440.0 125.3 441.3 110.0 440.0C94.7 438.7 78.7 436.0 70.0 426.0C61.3 416.0 59.0 397.7 58.0 380.0C57.0 362.3 65.3 339.7 64.0 320.0C62.7 300.3 53.7 282.0 50.0 262.0C46.3 242.0 40.7 219.0 42.0 200.0C43.3 181.0 49.0 161.7 58.0 148.0Z\" data-gl3-hide/>\n<path class=\"a6-spleen\" d=\"M446.0 168.0C457.0 158.0 476.7 148.0 494.0 146.0C511.3 144.0 535.7 146.3 550.0 156.0C564.3 165.7 574.0 182.3 580.0 204.0C586.0 225.7 587.0 259.3 586.0 286.0C585.0 312.7 582.3 342.0 574.0 364.0C565.7 386.0 551.7 407.0 536.0 418.0C520.3 429.0 496.7 432.3 480.0 430.0C463.3 427.7 445.3 416.3 436.0 404.0C426.7 391.7 423.0 372.7 424.0 356.0C425.0 339.3 442.0 321.0 442.0 304.0C442.0 287.0 426.3 270.3 424.0 254.0C421.7 237.7 424.3 220.3 428.0 206.0C431.7 191.7 435.0 178.0 446.0 168.0Z\" fill=\"url(#a6-pulp)\" data-gl3-hide/>\n<g clip-path=\"url(#a6-spleenclip)\" data-gl3-hide><path class=\"a6-cords\" d=\"M486.9 364.7Q475.8 364.7 456.7 370.8M551.4 356.5Q547.5 353.6 535.7 356.8M488.7 417.0Q495.4 420.2 494.0 429.4M433.4 208.8Q439.8 211.6 438.1 220.3M485.6 341.8Q486.2 347.7 478.9 359.6M546.7 274.0Q561.2 279.9 567.8 291.9M421.6 348.1Q431.9 355.3 434.3 368.6M572.9 305.9Q581.5 311.1 582.1 322.3M578.8 218.1Q577.7 221.7 568.6 231.4M562.9 265.5Q554.2 267.2 537.5 274.9M503.9 180.7Q501.4 189.4 490.9 204.1M586.2 309.8Q575.4 309.4 556.6 315.0M521.1 203.7Q514.2 203.1 499.3 208.5M585.9 348.6Q579.4 349.4 564.9 356.3M494.2 418.2Q497.6 423.5 492.9 434.9M459.0 161.6Q455.6 166.4 444.1 177.2M574.9 318.1Q568.2 318.7 553.5 325.4M492.4 364.9Q494.5 370.5 488.7 382.2M488.1 403.5Q489.1 407.1 482.1 416.6M451.1 377.5Q448.2 388.3 437.3 405.1M467.8 345.8Q473.1 350.8 470.3 361.8M459.2 204.9Q472.4 203.8 477.6 208.8M425.4 242.0Q432.0 246.0 430.6 256.0M511.8 173.6Q516.6 182.1 513.3 196.6M554.6 355.1Q563.6 355.4 564.7 361.8M488.2 372.2Q487.7 378.9 479.2 391.6M561.8 342.8Q561.4 344.6 553.0 352.5M513.3 362.4Q510.8 364.0 500.4 371.6M474.1 198.2Q487.5 196.3 492.8 200.3M570.9 268.5Q581.7 269.7 584.5 277.0\"/><circle class=\"a6-white\" cx=\"540\" cy=\"210\" r=\"18\"/><circle class=\"a6-art\" cx=\"543\" cy=\"208\" r=\"3\"/><circle class=\"a6-white\" cx=\"548\" cy=\"372\" r=\"16\"/><circle class=\"a6-art\" cx=\"551\" cy=\"370\" r=\"3\"/><circle class=\"a6-white\" cx=\"460\" cy=\"382\" r=\"13\"/><circle class=\"a6-art\" cx=\"463\" cy=\"380\" r=\"3\"/></g>\n<path class=\"a6-capsule\" d=\"M446.0 168.0C457.0 158.0 476.7 148.0 494.0 146.0C511.3 144.0 535.7 146.3 550.0 156.0C564.3 165.7 574.0 182.3 580.0 204.0C586.0 225.7 587.0 259.3 586.0 286.0C585.0 312.7 582.3 342.0 574.0 364.0C565.7 386.0 551.7 407.0 536.0 418.0C520.3 429.0 496.7 432.3 480.0 430.0C463.3 427.7 445.3 416.3 436.0 404.0C426.7 391.7 423.0 372.7 424.0 356.0C425.0 339.3 442.0 321.0 442.0 304.0C442.0 287.0 426.3 270.3 424.0 254.0C421.7 237.7 424.3 220.3 428.0 206.0C431.7 191.7 435.0 178.0 446.0 168.0Z\" data-gl3-hide/>\n<path class=\"a6-arc-edge\" d=\"M205.8 162.2L206.6 160.0L207.5 157.5L208.4 154.7L209.5 151.5L210.4 148.4L211.6 145.2L212.8 141.6L214.0 138.1L215.2 134.6L216.6 131.2L218.0 127.7L219.5 124.4L220.9 121.4L222.5 118.6L224.0 116.1L225.4 114.0L227.2 111.7L229.2 109.2L231.1 107.0L233.4 104.7L235.6 102.4L238.2 100.0L240.6 97.7L243.2 95.5L245.8 93.3L248.4 91.4L251.3 89.3L254.1 87.4L256.9 85.6L259.9 83.7L262.6 82.1L265.4 80.7L268.4 79.1L271.3 77.9L274.7 76.4L277.9 75.0L281.0 73.9L284.3 72.8L287.7 71.8L291.3 70.7L294.8 69.8L298.2 69.0L301.5 68.3L305.0 67.7L308.7 67.1L312.2 66.7L315.5 66.3L318.6 66.1L322.0 66.0L325.6 66.0L329.1 66.1L332.7 66.2L336.3 66.5L339.9 66.8L343.5 67.3L347.2 67.8L350.7 68.4L354.3 69.1L358.0 69.9L361.3 70.7L364.7 71.7L368.1 72.7L371.2 73.7L374.2 74.8L377.4 76.0L380.4 77.3L383.2 78.6L386.2 80.1L389.0 81.5L391.8 83.2L394.6 84.9L397.3 86.6L400.0 88.5L402.6 90.4L405.1 92.3L407.7 94.4L410.1 96.5L412.5 98.6L414.6 100.5L416.5 102.6L418.7 104.9L420.6 107.0L422.2 109.2L424.0 111.7L425.8 114.2L427.4 116.8L429.0 119.4L430.6 122.2L432.2 125.1L433.7 128.0L435.2 131.0L436.5 133.7L437.8 136.6L439.3 139.8L440.6 142.9L441.9 145.8L443.0 148.5L444.1 151.6L445.2 154.8L446.2 158.2L447.3 161.7L448.2 165.2L449.1 169.0L450.1 172.6L450.8 175.9L451.6 179.3L452.3 182.7L453.1 185.8L453.7 188.7L454.3 191.4L454.9 193.8L455.5 196.0L484.5 188.0L484.1 186.6L483.7 184.6L483.1 182.1L482.5 179.4L481.9 176.3L481.2 172.9L480.4 169.3L479.5 165.4L478.5 161.6L477.6 157.8L476.5 153.7L475.4 149.6L474.2 145.6L472.9 141.8L471.6 137.9L470.1 134.2L468.8 130.9L467.3 127.6L466.0 124.4L464.5 120.9L462.8 117.4L461.1 114.0L459.4 110.7L457.6 107.4L455.8 104.0L453.8 100.6L451.6 97.2L449.4 93.9L447.2 90.8L444.6 87.4L441.9 84.3L439.5 81.4L436.6 78.5L433.7 75.6L430.7 72.9L427.7 70.4L424.7 67.9L421.6 65.4L418.2 62.9L414.9 60.6L411.4 58.3L408.0 56.2L404.4 54.1L400.8 52.1L397.2 50.2L393.2 48.3L389.4 46.8L385.8 45.2L381.8 43.7L377.7 42.3L373.7 41.1L369.5 39.9L365.2 38.9L361.1 37.9L356.7 37.0L352.4 36.2L347.9 35.5L343.5 35.0L339.1 34.5L334.7 34.2L330.3 33.9L326.0 33.8L321.6 33.8L317.4 33.9L312.9 34.1L308.4 34.5L304.1 35.1L300.0 35.7L295.7 36.3L291.2 37.2L287.0 38.2L282.7 39.3L278.7 40.4L274.5 41.6L270.2 43.1L266.1 44.6L262.1 46.2L258.3 47.7L254.4 49.5L250.6 51.3L246.8 53.3L242.9 55.5L239.5 57.6L235.9 59.8L232.3 62.3L229.0 64.6L225.4 67.3L222.0 70.1L218.8 72.7L215.6 75.6L212.6 78.4L209.6 81.3L206.7 84.4L203.8 87.6L201.2 90.7L198.6 94.0L195.8 97.9L193.5 101.8L191.3 105.8L189.1 110.0L187.2 114.3L185.4 118.4L183.8 122.6L182.2 126.7L180.8 130.6L179.6 134.2L178.4 137.8L177.3 141.1L176.4 143.9L175.5 146.3L174.8 148.4L174.2 149.8Z\" data-gl3-hide/>\n<g class=\"a6-iv\" data-part=\"iv\" data-gl3-hide><path class=\"a6-iv-line\" d=\"M224 18L246 58\"/><path class=\"a6-iv-hub\" d=\"M216 16l16 -6l10 20l-16 6Z\"/></g>\n<path class=\"a6-tick\" d=\"M255.8 89.3L260.0 96.0\"/><text class=\"a6-tick-txt\" x=\"266.4\" y=\"112.2\" text-anchor=\"middle\">30</text><path class=\"a6-tick\" d=\"M341.5 70.0L340.5 78.0\"/><text class=\"a6-tick-txt\" x=\"339.0\" y=\"95.9\" text-anchor=\"middle\">60</text><path class=\"a6-tick\" d=\"M417.5 108.8L411.1 113.6\"/><text class=\"a6-tick-txt\" x=\"401.5\" y=\"126.8\" text-anchor=\"middle\">90</text><path class=\"a6-tick\" d=\"M451.7 197.1L444.0 199.2\"/><text class=\"a6-tick-txt\" x=\"416.4\" y=\"208.4\" text-anchor=\"end\">120 days</text>\n<path class=\"a6-mac\" d=\"M538.7 286.0C539.8 293.9 542.3 305.2 538.6 311.8C535.0 318.4 524.3 322.8 516.9 325.6C509.4 328.4 501.4 328.7 494.0 328.4C486.6 328.0 479.9 326.1 472.5 323.3C465.0 320.5 453.4 318.0 449.4 311.8C445.4 305.5 447.8 294.2 448.6 286.0C449.3 277.8 449.8 269.0 453.8 262.8C457.8 256.6 465.8 253.5 472.5 248.8C479.2 244.1 486.8 234.6 494.0 234.5C501.2 234.4 509.5 243.2 515.8 248.2C522.2 253.1 528.1 257.8 531.9 264.1C535.7 270.4 537.5 278.1 538.7 286.0Z\" fill=\"url(#a6-macg)\" data-gl3-hide/>\n<circle class=\"a6-phago\" cx=\"480\" cy=\"274\" r=\"13\" data-gl3-hide/>\n<path class=\"a6-mac-nuc\" d=\"M500.0 300.0C502.7 296.3 510.7 293.0 514.0 294.0C517.3 295.0 520.3 302.0 520.0 306.0C519.7 310.0 515.7 316.3 512.0 318.0C508.3 319.7 500.0 319.0 498.0 316.0C496.0 313.0 497.3 303.7 500.0 300.0Z\" data-gl3-hide/>\n<path class=\"a6-gran\" data-part=\"gran\" data-gl3-hide/>\n<path class=\"a6-tf\" data-part=\"tf\" data-gl3-hide/>\n<path class=\"a6-ivp\" data-part=\"ivp\" data-gl3-hide/>\n<g data-part=\"cells\" data-gl3-hide><path class=\"a6-c a6-c-pale\" data-part=\"cPale\"/><path class=\"a6-c a6-c-full\" data-part=\"cFull\"/><path class=\"a6-c a6-c-young\" data-part=\"cYoung\"/><path class=\"a6-c a6-c-old\" data-part=\"cOld\"/><path class=\"a6-pallor a6-pallor-pale\" data-part=\"pPale\"/><path class=\"a6-pallor a6-pallor-full\" data-part=\"pFull\"/><path class=\"a6-pallor a6-pallor-old\" data-part=\"pOld\"/><path class=\"a6-retic\" data-part=\"retic\"/></g>\n</g>\n<g class=\"a6-mon\">\n<rect class=\"a6-mon-bg\" x=\"24\" y=\"472\" width=\"552\" height=\"172\" rx=\"12\"/>\n<path class=\"a6-axis\" d=\"M64 542H532M64 606H532\"/>\n<path class=\"a6-axis\" d=\"M95.2 606v5\"/><text class=\"a6-mtick\" x=\"95.2\" y=\"632\" text-anchor=\"middle\">dose</text><path class=\"a6-axis\" d=\"M204.4 606v5\"/><text class=\"a6-mtick\" x=\"204.4\" y=\"632\" text-anchor=\"middle\">2 wk</text><path class=\"a6-axis\" d=\"M313.6 606v5\"/><text class=\"a6-mtick\" x=\"313.6\" y=\"632\" text-anchor=\"middle\">4 wk</text><path class=\"a6-axis\" d=\"M422.8 606v5\"/><text class=\"a6-mtick\" x=\"422.8\" y=\"632\" text-anchor=\"middle\">6 wk</text><path class=\"a6-axis\" d=\"M532.0 606v5\"/><text class=\"a6-mtick\" x=\"532.0\" y=\"632\" text-anchor=\"middle\">8 wk</text>\n<path class=\"a6-trace-ghost a6-fer\" data-part=\"ferGhost\"/><path class=\"a6-trace a6-fer\" data-part=\"ferLine\"/>\n<path class=\"a6-trace-ghost a6-hbl\" data-part=\"hbGhost\"/><path class=\"a6-trace a6-hbl\" data-part=\"hbLine\"/>\n<path class=\"a6-cursor\" data-part=\"cursor\" d=\"M0 496V606\"/>\n<text class=\"a6-mlabel a6-mlabel-fer\" x=\"64\" y=\"492\">Ferritin (stores)</text>\n<text class=\"a6-mlabel a6-mlabel-hb\" x=\"64\" y=\"565\">Hemoglobin</text>\n<circle class=\"a6-cdot a6-cdot-fer\" data-part=\"ferDot\" r=\"5\"/><circle class=\"a6-cdot a6-cdot-hb\" data-part=\"hbDot\" r=\"5\"/>\n</g>\n</svg></div><p class=\"a6-scene\" data-scene>Untreated iron deficiency: the marrow is short of iron, so it makes too little hemoglobin and the cells come out small and pale. The spleen's stores are nearly empty.</p><span class=\"a6-sr\" role=\"status\" aria-live=\"polite\" data-status></span><div class=\"opt-controls\"><div class=\"opt-seg\" role=\"radiogroup\" aria-label=\"Treatment\" data-control=\"mode\"><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"none\" aria-checked=\"true\" tabindex=\"0\">Untreated</button><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"iv\" aria-checked=\"false\" tabindex=\"-1\">IV iron</button></div></div><div class=\"opt-foot\"><span class=\"opt-hint\">Pick untreated or IV iron · two days a second</span><dl class=\"opt-readout\" data-readout aria-hidden=\"true\"><div class=\"opt-stat\" data-stat=\"day\"><dt>Day</dt><dd data-r=\"day\">—</dd></div><div class=\"opt-stat\" data-stat=\"fer\"><dt>Ferritin</dt><dd data-r=\"fer\">8 µg/L</dd></div><div class=\"opt-stat\" data-stat=\"hb\"><dt>Hemoglobin</dt><dd data-r=\"hb\">105 g/L</dd></div></dl></div></div><figcaption class=\"iso-legend\"><span class=\"iso-keys\"><span class=\"iso-key\"><svg class=\"iso-swatch\" data-mark=\"cell\" viewBox=\"0 0 16 10\" aria-hidden=\"true\"><path d=\"M1.5 5h13\"/></svg>Red cells, youngest at left</span><span class=\"iso-key\"><svg class=\"iso-swatch\" data-mark=\"pale\" viewBox=\"0 0 16 10\" aria-hidden=\"true\"><path d=\"M1.5 5h13\"/></svg>Made short of iron</span><span class=\"iso-key\"><svg class=\"iso-swatch\" data-mark=\"ferritin\" viewBox=\"0 0 16 10\" aria-hidden=\"true\"><path d=\"M1.5 5h13\"/></svg>Ferritin stores</span><span class=\"iso-key\"><svg class=\"iso-swatch\" data-mark=\"tf\" viewBox=\"0 0 16 10\" aria-hidden=\"true\"><path d=\"M1.5 5h13\"/></svg>Iron on transferrin</span></span><span class=\"iso-caption\"><span class=\"a6-par\">A red cell lives about 120 days. Bone marrow makes about two million a second; when they wear out, macrophages, mostly in the spleen and liver, eat them and recycle the iron, about 20–⁠25 mg a day in a typical adult, far more than the 1–⁠2 mg the gut absorbs. Iron leaves the macrophage on transferrin and goes back to the marrow.</span><span class=\"a6-par\">That's why ferritin and hemoglobin run on different clocks after IV iron. The macrophages take up the dose within days, so ferritin (a measure of stores) jumps, peaking around day 6 in this model. Hemoglobin rises only as the marrow turns iron into new cells, over the next four to eight weeks, which is why bloodwork is rechecked at 6–⁠8 weeks.</span><span class=\"a6-par\"><small>A typical pattern for one modelled woman (Hb 105 g/L, ferritin 8 µg/L, 1000 mg IV), from Fig 3's model; not a prediction for any person. Ferritin reads high for weeks after IV iron, so it isn't a reliable store measure in that window. The cells are drawn far fewer and larger than life; one drawn cell stands for a normal day's output. Time runs at about two days a second.</small></span></span></figcaption></figure>" + "</div>";
    mount(root.querySelector(".opt-figure"));
  }
}
customElements.define("optimal-fig-red-cell-cycle", Fig);
})();
