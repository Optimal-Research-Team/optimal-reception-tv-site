/* optimal-fig-gut-cell: Optimal Health explainer figure. Built with Anatomy (MIT). Generated; do not edit. */
(() => {
if (customElements.get("optimal-fig-gut-cell")) return;
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

// A1 model: the gut cell's iron gate, using Fig 3's hepcidin model so the two figures agree.
// gate = 1 / (1 + hepcidin) is the share of ferroportin left working at the cell's base.
// [n] keys refer to reference/truth-pack.md §3.

const SLOTS = 5; //  ferroportin places drawn on the base (a drawing choice, not a count)
/** Working ferroportins for a gate share (rounded; at least one, since a closed gate is never total). */
const activeOf = (gate) => Math.max(1, Math.round(SLOTS * gate));
/** Hepcidin for a gate share (the inverse of gate = 1 / (1 + H)). */
const hepcidinOf = (gate) => 1 / gate - 1;

// A1 live code: iron in through DMT1, out through ferroportin; hepcidin docks and the cell pulls gates in.
const DATA = {"W":600,"H":640,"APICAL":150,"BASAL":528,"CELL":{"x0":150,"x1":450},"FERRITIN":[[214,248],[388,236],[300,318]],"FPN":[192,246,300,354,408],"CAP":{"y0":560,"y1":616},"DMT1":[[168.5,116.98860651373397],[228.5,114.22925946115942],[288.5,118.47591712266599],[348.5,112.9265111302452],[408.5,119.53748495511658]],"SLOTS":5,"scenes":[{"key":"hungry","gate":0.9689922332763672,"line":"Low iron, low hepcidin: every gate open."},{"key":"pills","gate":0.5038644671440125,"line":"A week of daily pills: each dose raises hepcidin for about a day."},{"key":"full","gate":0.44996628165245056,"line":"Two weeks after an IV infusion: stores full, hepcidin up."}]};

function mount(fig) {
  const svg = fig.querySelector("svg");
  const q = (s) => svg.querySelector(s);
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const out = Object.fromEntries([...fig.querySelectorAll("[data-r]")].map((n) => [n.dataset.r, n]));
  const status = fig.querySelector("[data-status]");
  const sceneLine = fig.querySelector("[data-scene]");
  const buttons = [...fig.querySelectorAll('[data-control="scene"] .opt-seg-btn')];
  const N = { fpn: q('[data-part="fpn"]'), ves: q('[data-part="vesicles"]'), blood: q('[data-part="blood"]'), iron: q('[data-part="iron"]'), hep: q('[data-part="hep"]'), cores: DATA.FERRITIN.map((_, i) => q(`[data-part="core${i}"]`)) };
  const { APICAL, BASAL, CAP, DMT1, FERRITIN } = DATA;
  const f1 = (v) => v.toFixed(1);
  const pill = (x, y, w, h) => `M${f1(x + w / 2)} ${f1(y)}a${w / 2} ${w / 2} 0 0 1 ${w / 2} ${w / 2}v${f1(h - w)}a${w / 2} ${w / 2} 0 0 1 ${-w} 0v${f1(-(h - w))}a${w / 2} ${w / 2} 0 0 1 ${w / 2} ${-w / 2}Z`;
  const hepPath = (x, y) => `M${f1(x - 5)} ${f1(y - 4)}c0 7 10 7 10 0c0 -4 -3 -5 -3 -2c0 3 -4 3 -4 0c0 -3 -3 -2 -3 2Z`;
  const rnd = (a, b) => a + Math.random() * (b - a);

  // ---------------------------------------------------------------- state
  let sceneAt = 0;
  let gate = DATA.scenes[0].gate;
  let target = activeOf(gate);
  const ORDER = [0, 4, 1, 3, 2]; // gates close from the ends inward
  const slots = DATA.FPN.map((x) => ({ x, state: "on", t: 0 }));
  ORDER.slice(target).forEach((i) => (slots[i].state = "gone"));
  const irons = [];
  const heps = [];
  const fill = [3, 2, 3];
  const tf = Array.from({ length: 3 }, (_, i) => ({ x: i * 210 + 40, load: 0 }));
  const rbc = Array.from({ length: 6 }, (_, i) => ({ x: i * 110 + 20, y: rnd(CAP.y0 + 16, CAP.y1 - 16) }));
  let spawn = 0;

  const working = () => slots.filter((s) => s.state === "on");
  function moveTo(p, tx, ty, speed, dt) {
    const dx = tx - p.x;
    const dy = ty - p.y;
    const d = Math.hypot(dx, dy);
    if (d <= speed * dt) {
      p.x = tx;
      p.y = ty;
      return true;
    }
    p.x += (dx / d) * speed * dt;
    p.y += (dy / d) * speed * dt;
    return false;
  }

  // ---------------------------------------------------------------- one step
  function step(dt) {
    // iron arrives in the lumen and heads for a DMT1 channel
    spawn += dt * 1.7;
    while (spawn > 1) {
      spawn -= 1;
      const d = DMT1[Math.floor(Math.random() * DMT1.length)];
      irons.push({ x: rnd(170, 430), y: rnd(14, 60), stage: "lumen", d, wob: rnd(0, 6) });
    }
    for (let i = irons.length - 1; i >= 0; i--) {
      const p = irons[i];
      if (p.stage === "lumen" && moveTo(p, p.d[0], p.d[1] - 8, 55, dt)) p.stage = "in";
      else if (p.stage === "in" && moveTo(p, p.d[0], APICAL + 26, 45, dt)) {
        p.stage = "cyto";
        p.tx = rnd(185, 415);
        p.ty = rnd(210, 380);
      } else if (p.stage === "cyto" && moveTo(p, p.tx, p.ty, 40, dt)) {
        // the way out is open in proportion to the working gates; otherwise it is held in ferritin
        const open = working();
        if (open.length && Math.random() < open.length / DATA.SLOTS + 0.1) {
          const s = open[Math.floor(Math.random() * open.length)];
          p.stage = "exit";
          p.s = s;
        } else {
          let best = 0;
          FERRITIN.forEach((c, j) => (Math.hypot(c[0] - p.x, c[1] - p.y) < Math.hypot(FERRITIN[best][0] - p.x, FERRITIN[best][1] - p.y) ? (best = j) : 0));
          p.stage = "store";
          p.k = best;
        }
      } else if (p.stage === "exit") {
        if (p.s.state !== "on") p.stage = "cyto";
        else if (moveTo(p, p.s.x, BASAL - 2, 38, dt)) p.stage = "out";
      } else if (p.stage === "out" && moveTo(p, p.s.x, CAP.y0 + 6, 30, dt)) {
        const free = tf.filter((c) => c.load < 2 && c.x < p.x + 30 && c.x > p.x - 90).sort((a, b) => b.x - a.x)[0];
        if (free) {
          free.load++;
          irons.splice(i, 1);
        } else p.stage = "drift";
      } else if (p.stage === "drift") {
        p.x += 46 * dt;
        p.y += (CAP.y0 + 20 - p.y) * dt;
        if (p.x > DATA.W + 10) irons.splice(i, 1);
      } else if (p.stage === "store" && moveTo(p, FERRITIN[p.k][0], FERRITIN[p.k][1], 40, dt)) {
        fill[p.k] = Math.min(14, fill[p.k] + 1);
        irons.splice(i, 1);
      }
    }
    // ferritin slowly gives up iron as cells turn over (drawing only)
    for (let j = 0; j < fill.length; j++) fill[j] = Math.max(1, fill[j] - dt * 0.12);
    // gates: hepcidin docks on extra working gates and the cell pulls them in; missing gates come back
    const on = working().length + slots.filter((s) => s.state === "back").length;
    if (on > target && !heps.length) {
      const s = ORDER.map((i) => slots[i]).reverse().find((x) => x.state === "on");
      if (s) heps.push({ x: s.x + rnd(-40, 40), y: CAP.y1 - 6, s });
    }
    if (on < target) {
      const s = ORDER.map((i) => slots[i]).find((x) => x.state === "gone");
      if (s) {
        s.state = "back";
        s.t = 0;
      }
    }
    for (let i = heps.length - 1; i >= 0; i--) {
      const h = heps[i];
      if (moveTo(h, h.s.x, BASAL + 15, 40, dt)) {
        h.s.state = "bound";
        h.s.t = 0;
        heps.splice(i, 1);
      }
    }
    for (const s of slots) {
      s.t += dt;
      if (s.state === "bound" && s.t > 0.9) {
        s.state = "in";
        s.t = 0;
      } else if (s.state === "in" && s.t > 1.8) s.state = "gone";
      else if (s.state === "back" && s.t > 1.3) s.state = "on";
    }
    // blood moves right
    for (const c of rbc) c.x = c.x > DATA.W + 20 ? -20 : c.x + 40 * dt;
    for (const c of tf) if ((c.x += 34 * dt) > DATA.W + 20) Object.assign(c, { x: -20, load: 0 });
  }

  // ---------------------------------------------------------------- draw
  function draw() {
    let fp = "";
    let ves = "";
    for (const s of slots) {
      const chan = (y, a = 1) => `<g class="a1-fpn" opacity="${a.toFixed(2)}"><path d="${pill(s.x - 8, y - 15, 6.6, 30)}"/><path d="${pill(s.x + 1.4, y - 15, 6.6, 30)}"/></g>`;
      if (s.state === "on") fp += chan(BASAL);
      else if (s.state === "bound") fp += chan(BASAL) + `<path class="a1-hep" d="${hepPath(s.x, BASAL + 14)}"/>`;
      else if (s.state === "in") {
        const u = Math.min(1, s.t / 1.8);
        const y = BASAL - 70 * u;
        const a = u < 0.6 ? 1 : 1 - (u - 0.6) / 0.4;
        ves += `<circle class="a1-vesicle" cx="${f1(s.x)}" cy="${f1(y)}" r="21" opacity="${a.toFixed(2)}"/>` + chan(y, a) + `<path class="a1-hep" opacity="${a.toFixed(2)}" d="${hepPath(s.x, y + 14)}"/>`;
      } else if (s.state === "back") {
        const u = Math.min(1, s.t / 1.3);
        const y = BASAL - 60 * (1 - u);
        ves += `<circle class="a1-vesicle" cx="${f1(s.x)}" cy="${f1(y)}" r="21" opacity="${(1 - u).toFixed(2)}"/>` + chan(y, Math.min(1, 0.3 + u));
      } else fp += `<path class="a1-gap" d="${pill(s.x - 8, BASAL - 3, 16, 6)}"/>`;
    }
    N.fpn.innerHTML = fp;
    N.ves.innerHTML = ves;
    N.iron.innerHTML = irons.map((p) => `<circle class="a1-iron" cx="${f1(p.x + (p.stage === "lumen" ? Math.sin(p.y * 0.08 + p.wob) * 3 : 0))}" cy="${f1(p.y)}" r="3.4"/>`).join("");
    N.hep.innerHTML = heps.map((h) => `<path class="a1-hep" d="${hepPath(h.x, h.y)}"/>`).join("");
    N.blood.innerHTML =
      rbc.map((c) => `<g class="a1-rbc"><ellipse cx="${f1(c.x)}" cy="${f1(c.y)}" rx="14" ry="6.5"/><ellipse class="a1-rbc-in" cx="${f1(c.x)}" cy="${f1(c.y)}" rx="7" ry="2.6"/></g>`).join("") +
      tf.map((c) => `<g class="a1-tf"><circle cx="${f1(c.x - 4)}" cy="${CAP.y0 + 20}" r="6.5"/><circle cx="${f1(c.x + 5)}" cy="${CAP.y0 + 21}" r="6.5"/>${c.load > 0 ? `<circle class="a1-iron" cx="${f1(c.x - 4)}" cy="${CAP.y0 + 20}" r="3"/>` : ""}${c.load > 1 ? `<circle class="a1-iron" cx="${f1(c.x + 5)}" cy="${CAP.y0 + 21}" r="3"/>` : ""}</g>`).join("");
    FERRITIN.forEach((c, j) => {
      const n = Math.round(fill[j]);
      let d = "";
      for (let i = 0; i < n; i++) {
        const a = i * 2.4;
        const r = 2.2 * Math.sqrt(i);
        d += `<circle class="a1-iron" cx="${f1(c[0] + r * Math.cos(a))}" cy="${f1(c[1] + r * Math.sin(a))}" r="2"/>`;
      }
      N.cores[j].innerHTML = d;
    });
    const n = working().length;
    out.fpn.textContent = `${n} of ${DATA.SLOTS}`;
  }

  // ---------------------------------------------------------------- scenes, input, tour, reduced motion
  function setScene(i, quiet) {
    sceneAt = i;
    const sc = DATA.scenes[i];
    gate = sc.gate;
    target = activeOf(gate);
    out.gate.textContent = `${Math.round(gate * 100)}% open`;
    sceneLine.textContent = sc.line;
    buttons.forEach((b, j) => {
      b.setAttribute("aria-checked", j === i ? "true" : "false");
      b.tabIndex = j === i ? 0 : -1;
    });
    if (!quiet) status.textContent = `${buttons[i].textContent}: gut gate ${Math.round(gate * 100)}% open, ${target} of ${DATA.SLOTS} ferroportin channels working.`;
  }
  function renderStill() {
    // one frame: the gates already settled for this scene, iron on its way in and out, a hepcidin docking
    ORDER.forEach((k, j) => Object.assign(slots[k], { state: j < target ? "on" : "gone", t: 0 }));
    irons.length = 0;
    const w = working();
    DMT1.forEach((d, j) => irons.push({ x: d[0], y: j % 2 ? d[1] - 30 : APICAL + 14, stage: "in", d, wob: 0 }));
    w.forEach((s) => irons.push({ x: s.x, y: BASAL - 30, stage: "exit", s, wob: 0 }));
    const fills = [[3, 2, 3], [9, 7, 9], [12, 11, 12]][sceneAt];
    fills.forEach((v, j) => (fill[j] = v));
    if (target < DATA.SLOTS) {
      const g = ORDER.map((k) => slots[k]).find((s) => s.state === "gone");
      if (g) g.state = "bound";
    }
    draw();
  }
  const takeOver = () => {
    touring = false;
    idle = performance.now();
  };
  buttons.forEach((b, i) =>
    b.addEventListener("click", () => {
      takeOver();
      setScene(i);
      if (still.matches) renderStill();
    }),
  );
  fig.querySelector('[data-control="scene"]').addEventListener("keydown", (e) => {
    const i = buttons.indexOf(document.activeElement);
    if (i < 0) return;
    const j = e.key === "ArrowRight" || e.key === "ArrowDown" ? i + 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? i - 1 : null;
    if (j === null) return;
    e.preventDefault();
    const b = buttons[(j + buttons.length) % buttons.length];
    b.focus();
    b.click();
  });
  let touring = true;
  let idle = -1e9;
  let tourClock = 0;
  let raf = 0;
  let last = 0;
  let visible = true;
  function tick(now) {
    raf = 0;
    if (!visible || still.matches) return;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    if (!touring && now - idle > 9000) touring = true;
    if (touring && (tourClock += dt) > 8) {
      tourClock = 0;
      setScene((sceneAt + 1) % DATA.scenes.length, true);
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
    visible = entries.some((e) => e.isIntersecting);
    if (visible) start();
  }).observe(svg);
  still.addEventListener("change", () => (still.matches ? renderStill() : start()));
  for (const b of buttons) b.addEventListener("pointerdown", takeOver);
  setScene(0, true);
  if (still.matches) renderStill();
  else {
    for (let i = 0; i < 120; i++) step(1 / 30);
    draw();
    start();
  }
}

class Fig extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    const root = this.attachShadow({ mode: "open" });
    const theme = this.getAttribute("theme") === "dark" ? "dark" : "light";
    root.innerHTML = "<style>" + "\n.iso{\n  --anatomy-page:#0b0b0b;--anatomy-card:#131313;--anatomy-text:#a3a3a3;--anatomy-strong:#e6e6e6;--anatomy-muted:#6e6e6e;\n  --anatomy-paper:#131313;--anatomy-face:#1b1b1b;--anatomy-top:#1c1c1c;\n  --anatomy-shade-0:#0f0f0f;--anatomy-shade-1:#121212;--anatomy-shade-2:#151515;--anatomy-shade-3:#181818;\n  --anatomy-lit-top:#262626;--anatomy-lit-shade:#1d1d1d;\n  --anatomy-hi:#d4d4d4;--anatomy-mid:#6a6a6a;--anatomy-lo:#3e3e3e;--anatomy-faint:#2a2a2a;--anatomy-lit:#ffffff;\n  --anatomy-halo:#050505;--anatomy-halo-opacity:.9;--anatomy-dot:#e6e6e6;\n  --anatomy-red:#ff6b6b;--anatomy-green:#6be0a0;--anatomy-blue:#6b9bff;\n  --anatomy-weight:.6px;--anatomy-ease:cubic-bezier(.32,.72,0,1);\n  --anatomy-mono:ui-monospace,\"SF Mono\",Menlo,Consolas,monospace;\n  --anatomy-lift:inset 0 1px 0 0 #ffffff0a,inset 0 0 0 1px #ffffff06,0 0 0 1px #00000026,0 1px 1px -.5px #00000014,0 3px 3px -1.5px #00000014,0 6px 6px -3px #00000014,0 12px 12px -6px #00000014;\n}\n.iso[data-theme=\"light\"]{\n  --anatomy-page:#f2f2ef;--anatomy-card:#fbfbfa;--anatomy-text:#57575a;--anatomy-strong:#18181a;--anatomy-muted:#8c8c90;\n  --anatomy-paper:#fbfbfa;--anatomy-face:#ffffff;--anatomy-top:#ffffff;\n  --anatomy-shade-0:#dcdcd9;--anatomy-shade-1:#e5e5e2;--anatomy-shade-2:#ededea;--anatomy-shade-3:#f4f4f1;\n  --anatomy-lit-top:#ffffff;--anatomy-lit-shade:#eeeeeb;\n  --anatomy-hi:#26262a;--anatomy-mid:#8a8a8f;--anatomy-lo:#b4b4b8;--anatomy-faint:#d4d4d6;--anatomy-lit:#000000;\n  --anatomy-halo:#8a8a80;--anatomy-halo-opacity:.32;--anatomy-dot:#3a3a3e;\n  --anatomy-red:#e5484d;--anatomy-green:#30a46c;--anatomy-blue:#3e63dd;\n  --anatomy-lift:inset 0 1px 0 0 #ffffff,0 0 0 1px #0000000f,0 1px 1px -.5px #0000000a,0 3px 3px -1.5px #0000000a,0 6px 6px -3px #0000000a,0 12px 12px -6px #0000000a;\n}\n.iso-svg{display:block;width:100%;height:auto;overflow:visible}\n.iso-svg path,.iso-svg circle{vector-effect:non-scaling-stroke}\n.iso-fill{fill:var(--anatomy-paper);stroke:none}\n.iso-solid[data-lit]>.iso-fill{fill:var(--anatomy-face)}\n.iso-shade,.iso-top{stroke:none}\n.iso-shade[data-shade=\"0\"]{fill:var(--anatomy-shade-0)}\n.iso-shade[data-shade=\"1\"]{fill:var(--anatomy-shade-1)}\n.iso-shade[data-shade=\"2\"]{fill:var(--anatomy-shade-2)}\n.iso-shade[data-shade=\"3\"]{fill:var(--anatomy-shade-3)}\n.iso-top{fill:var(--anatomy-top)}\n.iso-solid[data-lit]>.iso-top{fill:var(--anatomy-lit-top)}\n.iso-solid[data-lit]>.iso-shade{fill:var(--anatomy-lit-shade)}\n.iso-solid[data-seamless]>.iso-shade,.iso-solid[data-seamless]>.iso-top{stroke-width:.4;stroke-linejoin:round}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"0\"]{stroke:var(--anatomy-shade-0)}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"1\"]{stroke:var(--anatomy-shade-1)}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"2\"]{stroke:var(--anatomy-shade-2)}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"3\"]{stroke:var(--anatomy-shade-3)}\n.iso-solid[data-seamless]>.iso-top{stroke:var(--anatomy-top)}\n.iso-solid[data-seamless][data-lit]>.iso-top{stroke:var(--anatomy-lit-top)}\n.iso-solid[data-seamless][data-lit]>.iso-shade{stroke:var(--anatomy-lit-shade)}\n.iso-solid[data-lit]>.iso-edge{stroke:var(--anatomy-lit)}\n.iso-halo{fill:var(--anatomy-halo);stroke:none;filter:blur(9px);opacity:var(--anatomy-halo-opacity);transform:translateY(3px)}\n.iso-line{fill:none;stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight);stroke-linecap:round;stroke-linejoin:round}\n.iso-line[data-tone=\"hi\"]{stroke:var(--anatomy-hi)}\n.iso-line[data-tone=\"mid\"]{stroke:var(--anatomy-mid)}\n.iso-line[data-tone=\"lo\"]{stroke:var(--anatomy-lo)}\n.iso-line[data-tone=\"faint\"]{stroke:var(--anatomy-faint)}\n.iso-line[data-tone=\"lit\"]{stroke:var(--anatomy-lit)}\n.iso-line[data-tone=\"red\"]{stroke:var(--anatomy-red)}\n.iso-line[data-tone=\"green\"]{stroke:var(--anatomy-green)}\n.iso-line[data-tone=\"blue\"]{stroke:var(--anatomy-blue)}\n.iso-line[data-dotted]{stroke-dasharray:.01 3.5;stroke-width:1}\n.iso-line[data-dashed]{stroke-dasharray:3 3}\n.iso-line[data-flow]{stroke-dasharray:2 6}\n.iso-wire-end{fill:var(--anatomy-paper);stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight)}\n.iso-wire[data-tone=\"hi\"] .iso-wire-end{stroke:var(--anatomy-hi)}\n.iso-wire[data-tone=\"mid\"] .iso-wire-end{stroke:var(--anatomy-mid)}\n.iso-wire[data-tone=\"faint\"] .iso-wire-end{stroke:var(--anatomy-faint)}\n.iso-wire[data-tone=\"lit\"] .iso-wire-end{stroke:var(--anatomy-lit)}\n.iso-dots circle{fill:var(--anatomy-dot);stroke:none;opacity:.32}\n.iso-dots[data-tone=\"hi\"] circle{opacity:.85}\n.iso-dots[data-tone=\"mid\"] circle{opacity:.45}\n.iso-dots[data-tone=\"lo\"] circle{opacity:.22}\n.iso-dots[data-tone=\"faint\"] circle{opacity:.12}\n.iso-face-text{fill:var(--anatomy-mid);font-family:var(--anatomy-mono);letter-spacing:.04em}\n.iso-face-text[data-tone=\"hi\"]{fill:var(--anatomy-hi)}\n.iso-face-text[data-tone=\"lo\"]{fill:var(--anatomy-lo)}\n.iso-face-text[data-tone=\"faint\"]{fill:var(--anatomy-faint)}\n.tb-body{fill:var(--anatomy-shade-2);stroke:none}\n.tb-shine{fill:var(--anatomy-top);stroke:none}\n.tb-shade{fill:var(--anatomy-shade-0);stroke:none}\n.tb-ring{fill:none;stroke:var(--anatomy-lo);stroke-width:.45;stroke-linecap:butt;stroke-linejoin:round}\n.tb-ring[data-tone=\"mid\"]{stroke:var(--anatomy-mid)}\n.tb-ring[data-tone=\"faint\"]{stroke:var(--anatomy-faint)}\n.tb-ring[data-tone=\"hi\"]{stroke:var(--anatomy-hi)}\n@keyframes iso-flow{to{stroke-dashoffset:-32}}\n@keyframes iso-pulse{0%,100%{opacity:.18}12%{opacity:1}40%{opacity:.18}}\n.iso-line[data-flow]{animation:iso-flow 1600ms linear infinite}\n.iso-dots circle[data-pulse]{animation:iso-pulse 1600ms steps(1,end) infinite;animation-delay:var(--pulse-at,0ms)}\n.iso-figure{margin:32px 0 36px}\n.iso-plate{position:relative;padding:52px 24px;border-radius:0;background:var(--anatomy-card);box-shadow:0 0 0 1px var(--anatomy-mid);--anatomy-paper:var(--anatomy-card)}\n.iso-plate-corners{position:absolute;inset:18px 20px;pointer-events:none}\n.iso-plate-corner{position:absolute;color:var(--anatomy-muted);font-family:var(--anatomy-mono);font-size:10.5px;line-height:1;letter-spacing:.04em;white-space:nowrap}\n.iso-plate-corner[data-corner=\"fig\"]{top:0;left:0;color:var(--anatomy-text)}\n.iso-plate-corner[data-corner=\"title\"]{top:0;right:0;text-transform:uppercase;letter-spacing:.1em}\n.iso-plate-corner[data-corner=\"hint\"]{bottom:0;left:0;text-transform:uppercase;letter-spacing:.1em}\n.iso-plate-corner[data-corner=\"readout\"]{right:0;bottom:0;color:var(--anatomy-text);font-variant-numeric:tabular-nums}\n.iso-plate .iso-svg{margin:0 auto}\n.iso-legend{display:grid;gap:8px;margin-top:12px;color:var(--anatomy-muted);font-size:13px;line-height:1.55}\n.iso-keys{display:flex;flex-wrap:wrap;gap:6px 18px}\n.iso-key{display:inline-flex;align-items:center;gap:7px}\n.iso-swatch{width:16px;height:10px;flex:none;overflow:visible}\n.iso-swatch path{fill:none;stroke:var(--anatomy-hi);stroke-width:1;vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round}\n.iso-swatch[data-mark=\"raised\"] path,.iso-swatch[data-mark=\"flat\"] path{stroke:var(--anatomy-mid)}\n.iso-swatch[data-mark=\"lit\"] path{stroke:var(--anatomy-lit)}\n.iso-swatch[data-mark=\"dim\"] path{stroke:var(--anatomy-lo)}\n.iso-swatch[data-mark=\"dotted\"] path{stroke-dasharray:.01 3;stroke-width:1.4}\n.iso-swatch[data-mark=\"dashed\"] path{stroke-dasharray:3 2.5}\n.iso-swatch[data-mark=\"red\"] path{stroke:var(--anatomy-red)}\n.iso-swatch[data-mark=\"green\"] path{stroke:var(--anatomy-green)}\n.iso-swatch[data-mark=\"blue\"] path{stroke:var(--anatomy-blue)}\n.iso-swatch-crease{stroke:var(--anatomy-lo)!important}\n@media (max-width:560px){.iso-plate{padding:48px 12px 70px}.iso-plate-corner[data-corner=\"hint\"]{bottom:18px}}\n@media (prefers-reduced-motion:reduce){.iso-line[data-flow],.iso-dots circle[data-pulse]{animation:none}}\n/*\n * Optimal theme for Anatomy figures.\n *\n * Load AFTER the kit's ISO_CSS. Put `class=\"iso optimal\"` on the wrapper:\n *   - no data-theme  -> \"Forest night\"  (exam-room TV, dark)\n *   - data-theme=\"light\" -> \"Cream\"     (beoptimal.ca, the primary target)\n *\n * Values come from the live site (beoptimal-landing src/index.css), the\n * Performance package design and the ALE visualizer spec. The kit's grey\n * ramps are warmed so solids sit on the site's cream paper, and the single\n * \"lit\" accent is Optimal forest green instead of pure black/white.\n */\n\n.iso.optimal {\n  /* Forest night (dark) */\n  --anatomy-page: #152511;\n  --anatomy-card: #1c3118;\n  --anatomy-text: #c9cdbf;\n  --anatomy-strong: #fffcf7;\n  --anatomy-muted: #8e9884;\n  --anatomy-paper: #1c3118;\n  --anatomy-face: #253821;\n  --anatomy-top: #283c24;\n  --anatomy-shade-0: #172812;\n  --anatomy-shade-1: #1a2c16;\n  --anatomy-shade-2: #1e321a;\n  --anatomy-shade-3: #22371e;\n  --anatomy-lit-top: #34492f;\n  --anatomy-lit-shade: #2a3f26;\n  --anatomy-hi: #e9e6dc;\n  --anatomy-mid: #7e8a74;\n  --anatomy-lo: #4d5c46;\n  --anatomy-faint: #33452e;\n  --anatomy-lit: #fffcf7;\n  --anatomy-halo: #0b1508;\n  --anatomy-halo-opacity: 0.9;\n  --anatomy-dot: #e9e6dc;\n  --anatomy-red: #e0745f;\n  --anatomy-green: #8cc67f;\n  --anatomy-blue: #7fa8d9;\n  --anatomy-mono: \"JetBrains Mono\", ui-monospace, \"SF Mono\", Menlo, Consolas, monospace;\n\n  /* Optimal extras (use sparingly; colour only when colour is the subject) */\n  --opt-display: \"Castoro\", Georgia, serif;\n  --opt-ui: \"Public Sans\", system-ui, sans-serif;\n  --opt-forest: #2c4e25;\n  --opt-forest-light: #519044;\n  --opt-sage: #5e7a59;\n  --opt-borderline: #c97b2d;\n  --opt-out: #b3402f;\n  --opt-heat: #ff9776;\n}\n\n.iso.optimal[data-theme=\"light\"] {\n  /* Cream (light) */\n  --anatomy-page: #fef8f1;\n  --anatomy-card: #fffcf7;\n  --anatomy-text: #3e3d39;\n  --anatomy-strong: #252525;\n  --anatomy-muted: #716e68; /* 4.97:1 on the cream card (was 4.46:1 for the legend) */\n  --anatomy-paper: #fffcf7;\n  --anatomy-face: #fffefb;\n  --anatomy-top: #fffefb;\n  --anatomy-shade-0: #ddd7cc;\n  --anatomy-shade-1: #e7e2d9;\n  --anatomy-shade-2: #f0ede5;\n  --anatomy-shade-3: #f6f3ec;\n  --anatomy-lit-top: #fffefb;\n  --anatomy-lit-shade: #efebe2;\n  --anatomy-hi: #252525;\n  --anatomy-mid: #8a867e;\n  --anatomy-lo: #b9b4aa;\n  --anatomy-faint: #d9d3c8;\n  --anatomy-lit: #2c4e25;\n  --anatomy-halo: #8a8070;\n  --anatomy-halo-opacity: 0.3;\n  --anatomy-dot: #3a3833;\n  --anatomy-red: #b3402f;\n  --anatomy-green: #3f7a35;\n  --anatomy-blue: #3e6a8f;\n}\n\n/* Card typography: brand fonts for titles and readouts, kit mono for plate corners */\n.iso.optimal .iso-plate-title,\n.iso.optimal [data-role=\"title\"] {\n  font-family: var(--opt-display);\n  letter-spacing: -0.02em;\n}\n.iso.optimal [data-role=\"readout\"],\n.iso.optimal .iso-readout {\n  font-family: var(--opt-ui);\n  font-feature-settings: \"tnum\" 1, \"ss01\" 1;\n}\n\n/*\n * Card layout for Optimal figures (shared/page.mjs `plate`).\n * Phone first: the drawing, then a row of real buttons (>=44 px), then a footer\n * where the hint and the readout wrap instead of overlapping at 320 px.\n */\n.iso.optimal {\n  --opt-rule: rgba(233, 230, 220, 0.16);\n  --opt-btn: rgba(233, 230, 220, 0.06);\n  --opt-btn-on: #e9e6dc;\n  --opt-btn-on-text: #1c3118;\n  --opt-title: #fffcf7;\n  --opt-fig: #8cc67f;\n  --opt-heat-ink: #ff9776;\n  --opt-heat-glow: rgba(255, 151, 118, 0.55);\n  --opt-heat-wash: rgba(255, 151, 118, 0.16);\n  --opt-cold-ink: #9cc3e6;\n}\n.iso.optimal[data-theme=\"light\"] {\n  --opt-rule: rgba(44, 78, 37, 0.2);\n  --opt-btn: #fffcf7;\n  --opt-btn-on: #2c4e25;\n  --opt-btn-on-text: #fffcf7;\n  --opt-title: #2c4e25;\n  --opt-fig: #5e7a59;\n  --opt-heat-ink: #c8552e;\n  --opt-heat-glow: rgba(232, 108, 64, 0.42);\n  --opt-heat-wash: rgba(255, 151, 118, 0.22);\n  --opt-cold-ink: #3e6a8f;\n}\n.iso.optimal .opt-plate {\n  padding: 52px 24px 20px;\n  box-shadow: 0 0 0 1px var(--opt-rule);\n  border-radius: 2px;\n}\n.iso.optimal .iso-plate-corner[data-corner=\"fig\"] {\n  font-family: var(--opt-display);\n  font-style: italic;\n  font-size: 15px;\n  letter-spacing: 0;\n  color: var(--opt-fig);\n  top: -2px;\n}\n.iso.optimal .iso-plate-corner[data-corner=\"title\"] {\n  font-family: var(--opt-display);\n  font-size: 17px;\n  text-transform: none;\n  letter-spacing: -0.01em;\n  color: var(--opt-title);\n  top: -4px;\n}\n.iso.optimal .opt-controls {\n  display: flex;\n  flex-wrap: wrap;\n  justify-content: center;\n  gap: 8px 12px;\n  margin: 10px 0 0;\n}\n.iso.optimal .opt-seg {\n  display: inline-flex;\n  border-radius: 999px;\n  box-shadow: inset 0 0 0 1px var(--opt-rule);\n  padding: 3px;\n  gap: 2px;\n  max-width: 100%;\n}\n.iso.optimal .opt-seg-btn {\n  appearance: none;\n  border: 0;\n  margin: 0;\n  min-height: 44px;\n  min-width: min-content; /* never shrink a label below its longest word (with the padding, always ≥ 44 px) */\n  padding: 0 16px;\n  border-radius: 999px;\n  background: transparent;\n  color: var(--anatomy-text);\n  font: 500 14px/1.1 var(--opt-ui);\n  letter-spacing: 0;\n  cursor: pointer;\n  touch-action: manipulation;\n  -webkit-tap-highlight-color: transparent;\n  transition: background-color 240ms var(--anatomy-ease), color 240ms var(--anatomy-ease);\n}\n/* A zero-height 30 px strut keeps every option at least 44 px wide, even \"Arm\", \"Leg\" or \"+5%\" with the\n   7 px padding below 350 px (min-content alone let them shrink to 36 px). */\n.iso.optimal .opt-seg-btn::after {\n  content: \"\";\n  display: block;\n  width: 30px;\n  height: 0;\n  margin: 0 auto;\n}\n.iso.optimal .opt-seg-btn[aria-checked=\"true\"] {\n  background: var(--opt-btn-on);\n  color: var(--opt-btn-on-text);\n}\n.iso.optimal .opt-seg-btn:focus-visible {\n  outline: 2px solid var(--opt-fig);\n  outline-offset: 2px;\n}\n.iso.optimal .opt-foot {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: flex-end;\n  justify-content: space-between;\n  gap: 10px 20px;\n  margin-top: 16px;\n}\n.iso.optimal .opt-hint {\n  font-family: var(--anatomy-mono);\n  font-size: 10.5px;\n  line-height: 1.4;\n  letter-spacing: 0.1em;\n  text-transform: uppercase;\n  color: var(--anatomy-muted);\n  flex: 1 1 160px;\n  min-width: 0;\n}\n.iso.optimal .opt-readout {\n  display: grid;\n  grid-auto-flow: column;\n  gap: 4px 18px;\n  margin: 0;\n  font-family: var(--opt-ui);\n  font-feature-settings: \"tnum\" 1;\n}\n.iso.optimal .opt-stat { margin: 0; min-width: 0; }\n.iso.optimal .opt-stat dt {\n  font-size: 10px;\n  font-weight: 600;\n  letter-spacing: 0.12em;\n  text-transform: uppercase;\n  color: var(--anatomy-muted);\n  white-space: nowrap;\n}\n.iso.optimal .opt-stat dd {\n  margin: 1px 0 0;\n  font-size: 15px;\n  font-weight: 500;\n  color: var(--anatomy-strong);\n  white-space: nowrap;\n}\n.iso.optimal .iso-legend { font-family: var(--opt-ui); font-size: 13.5px; }\n.iso.optimal .iso-caption { color: var(--anatomy-text); }\n.iso.optimal .iso-caption em { font-style: italic; }\n.iso.optimal .iso-swatch[data-mark=\"heat\"] path { stroke: var(--opt-heat-ink); stroke-width: 2; }\n.iso.optimal .iso-stage { outline: none; border-radius: 4px; touch-action: pan-y; -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none; }\n.iso.optimal .iso-stage:focus-visible { outline: 1px solid var(--anatomy-muted); outline-offset: 6px; }\n@media (max-width: 560px) {\n  .iso.optimal .opt-plate { padding: 44px 10px 14px; }\n  .iso.optimal .iso-plate-corners { inset: 16px 12px; }\n  .iso.optimal .opt-readout { grid-auto-flow: row; grid-template-columns: repeat(4, minmax(0, auto)); width: 100%; justify-content: space-between; gap: 4px 10px; order: -1; }\n  .iso.optimal .opt-stat dd { font-size: 14px; }\n  /* a long label wraps onto two lines instead of running into its neighbour; values stay on one baseline */\n  .iso.optimal .opt-stat { display: flex; flex-direction: column; justify-content: space-between; }\n  .iso.optimal .opt-stat dt { white-space: normal; line-height: 1.25; }\n  .iso.optimal .opt-seg-btn { padding: 0 12px; font-size: 13.5px; }\n}\n@media (max-width: 350px) {\n  .iso.optimal .opt-seg-btn { padding: 0 7px; font-size: 12.5px; }\n  .iso.optimal .opt-stat dt { font-size: 9px; letter-spacing: 0.08em; }\n  .iso.optimal .opt-stat dd { font-size: 13px; }\n}\n\n:host{display:block}\n.opt-host{background:transparent;color:var(--anatomy-text);font:15px/1.6 var(--opt-ui);-webkit-font-smoothing:antialiased}\n.opt-host *{box-sizing:border-box}\n.opt-host .iso-figure{margin:0}\n/* A1 · the gut cell, hand-drawn: soft fills in the figure's own inks, one membrane line weight. */\n.iso.optimal {\n  --a1-lumen: #22361d; --a1-cell: #2c4127; --a1-cell-2: #33492d; --a1-membrane: #8e9884; --a1-nucleus: #3d5436; --a1-nucleolus: #4f6948;\n  --a1-mito: #3a4f33; --a1-tissue: #1e301a; --a1-blood: #3b2a22; --a1-endo: #4d5c46; --a1-iron: #e3a35b; --a1-hep: #ff9776; --a1-fpn: #c9cdbf;\n  --a1-dmt1: #7fa8d9; --a1-tf: #7fa8d9; --a1-rbc: #e0745f; --a1-rbc-in: #c45e4a; --a1-ferritin: #8e9884; --a1-vesicle: rgba(201, 205, 191, 0.12);\n}\n.iso.optimal[data-theme=\"light\"] {\n  --a1-lumen: #fbf3e6; --a1-cell: #f6e9d8; --a1-cell-2: #efdfc9; --a1-membrane: #8a7f70; --a1-nucleus: #e4d3bd; --a1-nucleolus: #cdb69a;\n  --a1-mito: #ead8c2; --a1-tissue: #f8efe2; --a1-blood: #f6dcd2; --a1-endo: #e2cdbd; --a1-iron: #b8641f; --a1-hep: #d96a47; --a1-fpn: #2c4e25;\n  --a1-dmt1: #4a77ab; --a1-tf: #6f93bd; --a1-rbc: #c9503a; --a1-rbc-in: #e07a63; --a1-ferritin: #8a7f70; --a1-vesicle: rgba(44, 78, 37, 0.08);\n}\n.a1-svg path, .a1-svg circle, .a1-svg ellipse, .a1-svg rect { vector-effect: non-scaling-stroke; }\n.a1-lumen { fill: var(--a1-lumen); }\n.a1-tissue { fill: var(--a1-tissue); }\n.a1-villus { fill: var(--a1-cell-2); stroke: var(--a1-membrane); stroke-width: 1; }\n.a1-cell { fill: var(--a1-cell); stroke: var(--a1-membrane); stroke-width: 1.4; }\n.a1-dim { opacity: 0.55; }\n.a1-web { fill: var(--a1-cell-2); stroke: none; }\n.a1-junction { fill: var(--a1-membrane); }\n.a1-dmt1 path { fill: var(--a1-dmt1); stroke: none; }\n.a1-mito { fill: var(--a1-mito); stroke: var(--a1-membrane); stroke-width: 0.8; }\n.a1-mito-in { fill: none; stroke: var(--a1-membrane); stroke-width: 0.6; opacity: 0.7; }\n.a1-nucleus { fill: var(--a1-nucleus); stroke: var(--a1-membrane); stroke-width: 1.1; }\n.a1-nucleolus { fill: var(--a1-nucleolus); }\n.a1-ferritin circle { fill: var(--a1-ferritin); }\n.a1-ferritin .a1-core { fill: var(--a1-cell-2); }\n.a1-lamina { fill: var(--a1-endo); }\n.a1-blood { fill: var(--a1-blood); }\n.a1-endo { fill: var(--a1-endo); }\n.a1-iron { fill: var(--a1-iron); }\n.a1-hep { fill: var(--a1-hep); }\n.a1-fpn path { fill: var(--a1-fpn); }\n.a1-gap { fill: var(--a1-membrane); opacity: 0.35; }\n.a1-vesicle { fill: var(--a1-vesicle); stroke: var(--a1-membrane); stroke-width: 0.9; }\n.a1-rbc ellipse { fill: var(--a1-rbc); }\n.a1-rbc .a1-rbc-in { fill: var(--a1-rbc-in); }\n.a1-tf circle { fill: var(--a1-tf); }\n.a1-tf .a1-iron { fill: var(--a1-iron); }\n.a1-scene { margin: 10px 4px 0; font: 500 14px/1.4 var(--opt-ui); color: var(--anatomy-text); min-height: 2.8em; }\n.a1-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }\n.a1-par { display: block; margin-top: 6px; }\n.a1-par:first-child { margin-top: 0; }\n.a1-par small { font-size: 12.5px; color: var(--anatomy-muted); }\n/* A1 · the gut-lining block: the cell section on the front face of an isometric cut-away. */\n.iso.optimal {\n  --b1-lateral: #3c5236; --b1-cell-dim: #233620; --b1-villus-dim: #283c24; --b1-top: #22361e; --b1-top-main: #2a3f25;\n  --b1-v0: #4d6446; --b1-v1: #33492d; --b1-v2: #233720; --b1-d0: #3b5135; --b1-d1: #2b4026; --b1-d2: #1e301a; --b1-tip: #57704f; --b1-tip-dim: #435a3c;\n  --b1-shade: rgba(0, 0, 0, 0.2); --b1-shadow: rgba(0, 0, 0, 0.35);\n}\n.iso.optimal[data-theme=\"light\"] {\n  --b1-lateral: #d9c6ad; --b1-cell-dim: #ede3d5; --b1-villus-dim: #e6dccd; --b1-top: #e3d0b6; --b1-top-main: #dcc5a7;\n  --b1-v0: #fbf2e6; --b1-v1: #efdfc9; --b1-v2: #d8c3a6; --b1-d0: #f5ede1; --b1-d1: #e8dccb; --b1-d2: #d3c4ae; --b1-tip: #fff8ee; --b1-tip-dim: #f6eee2;\n  --b1-shade: rgba(60, 40, 20, 0.12); --b1-shadow: rgba(60, 40, 20, 0.16);\n}\n/* no see-through in the block: neighbours are muted by tone, not opacity */\n.b1-front .a1-dim, .b1-forest .a1-dim, g[transform] .a1-dim { opacity: 1; }\n.a1-cell.a1-dim { fill: var(--b1-cell-dim); }\n.a1-villus.a1-dim { fill: var(--b1-villus-dim); }\n.a1-nucleus.a1-dim, .a1-mito.a1-dim { opacity: 0.75; }\n.b1-lateral { fill: var(--b1-lateral); }\n.b1-top { fill: var(--b1-top); }\n.b1-top-main { fill: var(--b1-top-main); }\n.b1-junction { fill: none; stroke: var(--a1-membrane); stroke-width: 5; stroke-linejoin: round; stroke-linecap: round; opacity: 0.8; }\n.b1-villus { fill: url(#b1-villus); stroke: var(--a1-membrane); stroke-width: 0.55; }\n.b1-villus.b1-villus-dim { fill: url(#b1-villus-dim); stroke-opacity: 0.7; }\n.b1-villus-tip { fill: var(--b1-tip); }\n.b1-villus-tip.b1-villus-dim { fill: var(--b1-tip-dim); }\n.b1-dmt1 { fill: var(--a1-dmt1); }\n.b1-v0 { stop-color: var(--b1-v0); } .b1-v1 { stop-color: var(--b1-v1); } .b1-v2 { stop-color: var(--b1-v2); }\n.b1-d0 { stop-color: var(--b1-d0); } .b1-d1 { stop-color: var(--b1-d1); } .b1-d2 { stop-color: var(--b1-d2); }\n.b1-rbc-x { fill: var(--a1-rbc); }\n.b1-side-shade { fill: var(--b1-shade); pointer-events: none; }\n.b1-edge { fill: none; stroke: var(--a1-membrane); stroke-width: 1.1; stroke-linejoin: round; }\n.b1-shadow { fill: var(--b1-shadow); filter: blur(7px); }\n.b1-end-villus { filter: brightness(0.9); }\n.b1-collagen { fill: none; stroke: var(--a1-membrane); stroke-width: 0.9; stroke-linecap: round; opacity: 0.45; }\n.b1-fibro { fill: var(--a1-nucleus); stroke: var(--a1-membrane); stroke-width: 0.6; }\n" + "</style><div class=\"iso optimal opt-host\" data-theme=\"" + theme + "\">" + "<figure class=\"iso-figure opt-figure \"><div class=\"iso-plate opt-plate\"><div class=\"iso-plate-corners\" aria-hidden=\"true\"><span class=\"iso-plate-corner\" data-corner=\"fig\">A1</span><span class=\"iso-plate-corner\" data-corner=\"title\">The gut cell's gate</span></div><div class=\"iso-stage a1-stage\" tabindex=\"0\"><svg class=\"iso-svg a1-svg\" viewBox=\"0 0 600 698\" role=\"img\" aria-label=\"A block of gut lining, cut open. On top is the brush border, a carpet of microvilli, with grooves where one cell meets the next. The front face shows one lining cell in section. Iron from food enters through DMT1 channels on the microvilli at the top, is held in ferritin cages or leaves through ferroportin channels at the base into the blood, where transferrin carries it away. Hepcidin from the blood docks on ferroportin, and the cell pulls the channel in and breaks it down, so less iron gets out.\">\n<defs>\n  <linearGradient id=\"b1-villus\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\"><stop offset=\"0\" class=\"b1-v0\"/><stop offset=\"0.45\" class=\"b1-v1\"/><stop offset=\"1\" class=\"b1-v2\"/></linearGradient>\n  <linearGradient id=\"b1-villus-dim\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\"><stop offset=\"0\" class=\"b1-d0\"/><stop offset=\"0.45\" class=\"b1-d1\"/><stop offset=\"1\" class=\"b1-d2\"/></linearGradient>\n  <clipPath id=\"b1-frontclip\"><rect x=\"20\" y=\"-40\" width=\"560\" height=\"680\"/></clipPath>\n  <clipPath id=\"b1-sideclip\"><path d=\"M494.9 185.7L592 111.5L592 615.3L494.9 689.5Z\"/></clipPath>\n</defs>\n<path class=\"b1-shadow\" d=\"M100.9 506.3L605.2 615.4L498 697.4L-6.4 588.4Z\"/><g transform=\"matrix(0.8695 0.1880 -0.4623 0.3537 105.09 69.15)\"><clipPath id=\"b1-topclip\"><rect width=\"560\" height=\"210\"/></clipPath><g clip-path=\"url(#b1-topclip)\"><rect class=\"b1-top\" width=\"560\" height=\"210\"/><path class=\"b1-top-main\" d=\"M127.0 210.0L127.0 117.0L280.0 64.0L433.0 117.0L433.0 210.0Z\"/><path class=\"b1-junction\" d=\"M127.0 210.0L127.0 117.0M433.0 210.0L433.0 117.0M-179.0 117.0L-26.0 64.0M-26.0 64.0L127.0 117.0M127.0 117.0L280.0 64.0M280.0 64.0L433.0 117.0M433.0 117.0L586.0 64.0M586.0 64.0L739.0 117.0M280.0 64.0L280.0 0.0\"/></g></g><path class=\"b1-edge\" d=\"M8 143.4L105.1 69.1L592 174.4\"/><g class=\"b1-forest\"><path class=\"b1-villus b1-villus-dim\" d=\"M107.2 80.7L107.2 44.6C107.2 38.9 117.4 38.9 117.4 44.6L117.4 80.7A5.1 2.1 0 0 1 107.2 80.7Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M109.2 42.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M124.6 84.4L124.6 46.7C124.6 41.0 134.8 41.0 134.8 46.7L134.8 84.4A5.1 2.1 0 0 1 124.6 84.4Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M126.6 44.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M91.2 84.5L91.2 47.7C91.2 42.0 101.3 42.0 101.3 47.7L101.3 84.5A5.1 2.1 0 0 1 91.2 84.5Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M93.1 45.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M142.0 88.2L142.0 52.8C142.0 47.1 152.1 47.1 152.1 52.8L152.1 88.2A5.1 2.1 0 0 1 142.0 88.2Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M143.9 50.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M108.5 88.2L108.5 48.8C108.5 43.1 118.7 43.1 118.7 48.8L118.7 88.2A5.1 2.1 0 0 1 108.5 88.2Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M110.5 46.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M159.4 92.0L159.4 60.3C159.4 54.6 169.5 54.6 169.5 60.3L169.5 92.0A5.1 2.1 0 0 1 159.4 92.0Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M161.3 58.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M125.9 92.0L125.9 53.8C125.9 48.1 136.1 48.1 136.1 53.8L136.1 92.0A5.1 2.1 0 0 1 125.9 92.0Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M127.9 51.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M92.5 92.0L92.5 55.3C92.5 49.6 102.6 49.6 102.6 55.3L102.6 92.0A5.1 2.1 0 0 1 92.5 92.0Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M94.4 53.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M176.8 95.7L176.8 64.9C176.8 59.3 186.9 59.3 186.9 64.9L186.9 95.7A5.1 2.1 0 0 1 176.8 95.7Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M178.7 62.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M143.3 95.7L143.3 61.3C143.3 55.6 153.4 55.6 153.4 61.3L153.4 95.7A5.1 2.1 0 0 1 143.3 95.7Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M145.2 59.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M109.8 95.8L109.8 59.0C109.8 53.4 120.0 53.4 120.0 59.0L120.0 95.8A5.1 2.1 0 0 1 109.8 95.8Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M111.8 56.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M194.2 99.5L194.2 65.8C194.2 60.1 204.3 60.1 204.3 65.8L204.3 99.5A5.1 2.1 0 0 1 194.2 99.5Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M196.1 63.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M160.7 99.5L160.7 67.1C160.7 61.4 170.8 61.4 170.8 67.1L170.8 99.5A5.1 2.1 0 0 1 160.7 99.5Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M162.6 64.9a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M127.2 99.5L127.2 66.2C127.2 60.5 137.4 60.5 137.4 66.2L137.4 99.5A5.1 2.1 0 0 1 127.2 99.5Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M129.2 63.9a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M93.7 99.5L93.7 63.5C93.7 57.8 103.9 57.8 103.9 63.5L103.9 99.5A5.1 2.1 0 0 1 93.7 99.5Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M95.7 61.2a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M211.6 103.3L211.6 66.1C211.6 60.4 221.7 60.4 221.7 66.1L221.7 103.3A5.1 2.1 0 0 1 211.6 103.3Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M213.5 63.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M178.1 103.3L178.1 68.9C178.1 63.2 188.2 63.2 188.2 68.9L188.2 103.3A5.1 2.1 0 0 1 178.1 103.3Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M180.0 66.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M144.6 103.3L144.6 73.0C144.6 67.3 154.7 67.3 154.7 73.0L154.7 103.3A5.1 2.1 0 0 1 144.6 103.3Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M146.5 70.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M111.1 103.3L111.1 69.9C111.1 64.2 121.3 64.2 121.3 69.9L121.3 103.3A5.1 2.1 0 0 1 111.1 103.3Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M113.1 67.6a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M229.0 107.0L229.0 69.7C229.0 64.0 239.1 64.0 239.1 69.7L239.1 107.0A5.1 2.1 0 0 1 229.0 107.0Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M230.9 67.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M195.5 107.0L195.5 68.9C195.5 63.2 205.6 63.2 205.6 68.9L205.6 107.0A5.1 2.1 0 0 1 195.5 107.0Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M197.4 66.6a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M162.0 107.0L162.0 76.0C162.0 70.3 172.1 70.3 172.1 76.0L172.1 107.0A5.1 2.1 0 0 1 162.0 107.0Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M163.9 73.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M128.5 107.1L128.5 77.3C128.5 71.6 138.6 71.6 138.6 77.3L138.6 107.1A5.1 2.1 0 0 1 128.5 107.1Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M130.5 75.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M61.6 107.1L61.6 68.4C61.6 62.7 71.7 62.7 71.7 68.4L71.7 107.1A5.1 2.1 0 0 1 61.6 107.1Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M63.5 66.1a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M246.4 110.8L246.4 76.9C246.4 71.2 256.5 71.2 256.5 76.9L256.5 110.8A5.1 2.1 0 0 1 246.4 110.8Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M248.3 74.6a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M212.9 110.8L212.9 71.3C212.9 65.6 223.0 65.6 223.0 71.3L223.0 110.8A5.1 2.1 0 0 1 212.9 110.8Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M214.8 69.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M179.4 110.8L179.4 76.1C179.4 70.4 189.5 70.4 189.5 76.1L189.5 110.8A5.1 2.1 0 0 1 179.4 110.8Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M181.3 73.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M145.9 110.8L145.9 81.5C145.9 75.9 156.0 75.9 156.0 81.5L156.0 110.8A5.1 2.1 0 0 1 145.9 110.8Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M147.8 79.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M79.0 110.9L79.0 72.5C79.0 66.8 89.1 66.8 89.1 72.5L89.1 110.9A5.1 2.1 0 0 1 79.0 110.9Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M80.9 70.2a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M263.8 114.5L263.8 83.7C263.8 78.0 273.9 78.0 273.9 83.7L273.9 114.5A5.1 2.1 0 0 1 263.8 114.5Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M265.7 81.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M230.3 114.6L230.3 77.7C230.3 72.0 240.4 72.0 240.4 77.7L240.4 114.6A5.1 2.1 0 0 1 230.3 114.6Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M232.2 75.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M196.8 114.6L196.8 77.3C196.8 71.7 206.9 71.7 206.9 77.3L206.9 114.6A5.1 2.1 0 0 1 196.8 114.6Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M198.7 75.1a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M163.3 114.6L163.3 82.1C163.3 76.4 173.4 76.4 173.4 82.1L173.4 114.6A5.1 2.1 0 0 1 163.3 114.6Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M165.2 79.9a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M129.8 114.6L129.8 83.0C129.8 77.3 139.9 77.3 139.9 83.0L139.9 114.6A5.1 2.1 0 0 1 129.8 114.6Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M131.7 80.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M62.9 114.6L62.9 78.4C62.9 72.7 73.0 72.7 73.0 78.4L73.0 114.6A5.1 2.1 0 0 1 62.9 114.6Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M64.8 76.1a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M281.1 118.3L281.1 86.8C281.1 81.1 291.3 81.1 291.3 86.8L291.3 118.3A5.1 2.1 0 0 1 281.1 118.3Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M283.1 84.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M247.7 118.3L247.7 85.1C247.7 79.4 257.8 79.4 257.8 85.1L257.8 118.3A5.1 2.1 0 0 1 247.7 118.3Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M249.6 82.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M214.2 118.3L214.2 82.6C214.2 76.9 224.3 76.9 224.3 82.6L224.3 118.3A5.1 2.1 0 0 1 214.2 118.3Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M216.1 80.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M180.7 118.3L180.7 82.6C180.7 76.9 190.8 76.9 190.8 82.6L190.8 118.3A5.1 2.1 0 0 1 180.7 118.3Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M182.6 80.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M147.2 118.4L147.2 84.5C147.2 78.8 157.3 78.8 157.3 84.5L157.3 118.4A5.1 2.1 0 0 1 147.2 118.4Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M149.1 82.2a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M80.3 118.4L80.3 85.1C80.3 79.4 90.4 79.4 90.4 85.1L90.4 118.4A5.1 2.1 0 0 1 80.3 118.4Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M82.2 82.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M46.8 118.4L46.8 81.6C46.8 75.9 56.9 75.9 56.9 81.6L56.9 118.4A5.1 2.1 0 0 1 46.8 118.4Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M48.7 79.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M298.5 122.1L298.5 86.8C298.5 81.1 308.7 81.1 308.7 86.8L308.7 122.1A5.1 2.1 0 0 1 298.5 122.1Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M300.5 84.6a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M265.1 122.1L265.1 89.4C265.1 83.7 275.2 83.7 275.2 89.4L275.2 122.1A5.1 2.1 0 0 1 265.1 122.1Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M267.0 87.1a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M231.6 122.1L231.6 90.2C231.6 84.5 241.7 84.5 241.7 90.2L241.7 122.1A5.1 2.1 0 0 1 231.6 122.1Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M233.5 87.9a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M198.1 122.1L198.1 86.6C198.1 80.9 208.2 80.9 208.2 86.6L208.2 122.1A5.1 2.1 0 0 1 198.1 122.1Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M200.0 84.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M164.6 122.1L164.6 84.5C164.6 78.8 174.7 78.8 174.7 84.5L174.7 122.1A5.1 2.1 0 0 1 164.6 122.1Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M166.5 82.2a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M97.6 122.2L97.6 92.3C97.6 86.6 107.8 86.6 107.8 92.3L107.8 122.2A5.1 2.1 0 0 1 97.6 122.2Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M99.6 90.1a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M64.2 122.2L64.2 87.2C64.2 81.6 74.3 81.6 74.3 87.2L74.3 122.2A5.1 2.1 0 0 1 64.2 122.2Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M66.1 85.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M315.9 125.8L315.9 88.1C315.9 82.4 326.0 82.4 326.0 88.1L326.0 125.8A5.1 2.1 0 0 1 315.9 125.8Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M317.8 85.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M282.4 125.8L282.4 90.1C282.4 84.4 292.6 84.4 292.6 90.1L292.6 125.8A5.1 2.1 0 0 1 282.4 125.8Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M284.4 87.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M249.0 125.9L249.0 95.8C249.0 90.1 259.1 90.1 259.1 95.8L259.1 125.9A5.1 2.1 0 0 1 249.0 125.9Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M250.9 93.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M215.5 125.9L215.5 93.9C215.5 88.2 225.6 88.2 225.6 93.9L225.6 125.9A5.1 2.1 0 0 1 215.5 125.9Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M217.4 91.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M182.0 125.9L182.0 87.3C182.0 81.6 192.1 81.6 192.1 87.3L192.1 125.9A5.1 2.1 0 0 1 182.0 125.9Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M183.9 85.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M115.0 125.9L115.0 96.2C115.0 90.6 125.2 90.6 125.2 96.2L125.2 125.9A5.1 2.1 0 0 1 115.0 125.9Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M117.0 94.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M81.6 125.9L81.6 94.8C81.6 89.1 91.7 89.1 91.7 94.8L91.7 125.9A5.1 2.1 0 0 1 81.6 125.9Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M83.5 92.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M48.1 126.0L48.1 87.5C48.1 81.8 58.2 81.8 58.2 87.5L58.2 126.0A5.1 2.1 0 0 1 48.1 126.0Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M50.0 85.2a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M299.8 129.6L299.8 90.5C299.8 84.8 310.0 84.8 310.0 90.5L310.0 129.6A5.1 2.1 0 0 1 299.8 129.6Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M301.8 88.2a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M266.3 129.6L266.3 97.3C266.3 91.6 276.5 91.6 276.5 97.3L276.5 129.6A5.1 2.1 0 0 1 266.3 129.6Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M268.3 95.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M232.9 129.6L232.9 100.5C232.9 94.8 243.0 94.8 243.0 100.5L243.0 129.6A5.1 2.1 0 0 1 232.9 129.6Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M234.8 98.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M199.4 129.6L199.4 93.9C199.4 88.2 209.5 88.2 209.5 93.9L209.5 129.6A5.1 2.1 0 0 1 199.4 129.6Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M201.3 91.6a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M165.9 129.7L165.9 90.5C165.9 84.9 176.0 84.9 176.0 90.5L176.0 129.7A5.1 2.1 0 0 1 165.9 129.7Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M167.8 88.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M98.9 129.7L98.9 100.0C98.9 94.3 109.1 94.3 109.1 100.0L109.1 129.7A5.1 2.1 0 0 1 98.9 129.7Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M100.9 97.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M65.5 129.7L65.5 94.9C65.5 89.2 75.6 89.2 75.6 94.9L75.6 129.7A5.1 2.1 0 0 1 65.5 129.7Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M67.4 92.6a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M32.0 129.7L32.0 91.8C32.0 86.1 42.1 86.1 42.1 91.8L42.1 129.7A5.1 2.1 0 0 1 32.0 129.7Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M33.9 89.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M350.7 133.3L350.7 100.9C350.7 95.2 360.8 95.2 360.8 100.9L360.8 133.3A5.1 2.1 0 0 1 350.7 133.3Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M352.6 98.6a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M283.7 133.4L283.7 97.3C283.7 91.6 293.9 91.6 293.9 97.3L293.9 133.4A5.1 2.1 0 0 1 283.7 133.4Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M285.7 95.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M250.3 133.4L250.3 103.2C250.3 97.5 260.4 97.5 260.4 103.2L260.4 133.4A5.1 2.1 0 0 1 250.3 133.4Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M252.2 101.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M116.3 133.5L116.3 101.2C116.3 95.5 126.5 95.5 126.5 101.2L126.5 133.5A5.1 2.1 0 0 1 116.3 133.5Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M118.3 98.9a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M82.8 133.5L82.8 101.2C82.8 95.5 93.0 95.5 93.0 101.2L93.0 133.5A5.1 2.1 0 0 1 82.8 133.5Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M84.8 98.9a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M49.4 133.5L49.4 98.7C49.4 93.0 59.5 93.0 59.5 98.7L59.5 133.5A5.1 2.1 0 0 1 49.4 133.5Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M51.3 96.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M368.1 137.1L368.1 106.5C368.1 100.8 378.2 100.8 378.2 106.5L378.2 137.1A5.1 2.1 0 0 1 368.1 137.1Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M370.0 104.2a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M301.1 137.1L301.1 100.0C301.1 94.3 311.2 94.3 311.2 100.0L311.2 137.1A5.1 2.1 0 0 1 301.1 137.1Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M303.1 97.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M133.7 137.2L133.7 101.3C133.7 95.6 143.8 95.6 143.8 101.3L143.8 137.2A5.1 2.1 0 0 1 133.7 137.2Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M135.6 99.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M100.2 137.2L100.2 103.5C100.2 97.8 110.4 97.8 110.4 103.5L110.4 137.2A5.1 2.1 0 0 1 100.2 137.2Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M102.2 101.2a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M66.8 137.3L66.8 105.8C66.8 100.1 76.9 100.1 76.9 105.8L76.9 137.3A5.1 2.1 0 0 1 66.8 137.3Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M68.7 103.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M33.3 137.3L33.3 103.5C33.3 97.8 43.4 97.8 43.4 103.5L43.4 137.3A5.1 2.1 0 0 1 33.3 137.3Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M35.2 101.2a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M385.5 140.9L385.5 108.1C385.5 102.4 395.6 102.4 395.6 108.1L395.6 140.9A5.1 2.1 0 0 1 385.5 140.9Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M387.4 105.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M352.0 140.9L352.0 108.4C352.0 102.7 362.1 102.7 362.1 108.4L362.1 140.9A5.1 2.1 0 0 1 352.0 140.9Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M353.9 106.1a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M117.6 141.0L117.6 103.4C117.6 97.7 127.7 97.7 127.7 103.4L127.7 141.0A5.1 2.1 0 0 1 117.6 141.0Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M119.6 101.1a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M84.1 141.0L84.1 109.3C84.1 103.6 94.3 103.6 94.3 109.3L94.3 141.0A5.1 2.1 0 0 1 84.1 141.0Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M86.1 107.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M50.7 141.0L50.7 111.0C50.7 105.3 60.8 105.3 60.8 111.0L60.8 141.0A5.1 2.1 0 0 1 50.7 141.0Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M52.6 108.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M17.2 141.0L17.2 104.4C17.2 98.7 27.3 98.7 27.3 104.4L27.3 141.0A5.1 2.1 0 0 1 17.2 141.0Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M19.1 102.1a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M402.9 144.6L402.9 108.1C402.9 102.4 413.0 102.4 413.0 108.1L413.0 144.6A5.1 2.1 0 0 1 402.9 144.6Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M404.8 105.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M369.4 144.6L369.4 111.1C369.4 105.4 379.5 105.4 379.5 111.1L379.5 144.6A5.1 2.1 0 0 1 369.4 144.6Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M371.3 108.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M335.9 144.7L335.9 113.9C335.9 108.2 346.0 108.2 346.0 113.9L346.0 144.7A5.1 2.1 0 0 1 335.9 144.7Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M337.8 111.6a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M235.5 144.7L235.5 110.2C235.5 104.5 245.6 104.5 245.6 110.2L245.6 144.7A5.1 2.1 0 0 1 235.5 144.7Z\"/><path class=\"b1-villus-tip\" d=\"M237.4 108.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M237.7 107.4a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus\" d=\"M202.0 144.7L202.0 115.5C202.0 109.8 212.1 109.8 212.1 115.5L212.1 144.7A5.1 2.1 0 0 1 202.0 144.7Z\"/><path class=\"b1-villus-tip\" d=\"M203.9 113.2a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M204.3 112.6a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus\" d=\"M168.5 144.7L168.5 111.2C168.5 105.6 178.6 105.6 178.6 111.2L178.6 144.7A5.1 2.1 0 0 1 168.5 144.7Z\"/><path class=\"b1-villus-tip\" d=\"M170.4 109.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M101.5 144.8L101.5 109.6C101.5 103.9 111.7 103.9 111.7 109.6L111.7 144.8A5.1 2.1 0 0 1 101.5 144.8Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M103.5 107.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M68.1 144.8L68.1 115.9C68.1 110.2 78.2 110.2 78.2 115.9L78.2 144.8A5.1 2.1 0 0 1 68.1 144.8Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M70.0 113.6a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M34.6 144.8L34.6 111.9C34.6 106.2 44.7 106.2 44.7 111.9L44.7 144.8A5.1 2.1 0 0 1 34.6 144.8Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M36.5 109.6a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M420.3 148.4L420.3 110.7C420.3 105.0 430.4 105.0 430.4 110.7L430.4 148.4A5.1 2.1 0 0 1 420.3 148.4Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M422.2 108.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M386.8 148.4L386.8 111.1C386.8 105.5 396.9 105.5 396.9 111.1L396.9 148.4A5.1 2.1 0 0 1 386.8 148.4Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M388.7 108.9a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M353.3 148.4L353.3 117.9C353.3 112.3 363.4 112.3 363.4 117.9L363.4 148.4A5.1 2.1 0 0 1 353.3 148.4Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M355.2 115.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M286.3 148.5L286.3 110.5C286.3 104.8 296.5 104.8 296.5 110.5L296.5 148.5A5.1 2.1 0 0 1 286.3 148.5Z\"/><path class=\"b1-villus-tip\" d=\"M288.3 108.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M288.6 107.7a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus\" d=\"M252.9 148.5L252.9 110.3C252.9 104.6 263.0 104.6 263.0 110.3L263.0 148.5A5.1 2.1 0 0 1 252.9 148.5Z\"/><path class=\"b1-villus-tip\" d=\"M254.8 108.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M219.4 148.5L219.4 117.8C219.4 112.1 229.5 112.1 229.5 117.8L229.5 148.5A5.1 2.1 0 0 1 219.4 148.5Z\"/><path class=\"b1-villus-tip\" d=\"M221.3 115.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M185.9 148.5L185.9 118.4C185.9 112.7 196.0 112.7 196.0 118.4L196.0 148.5A5.1 2.1 0 0 1 185.9 148.5Z\"/><path class=\"b1-villus-tip\" d=\"M187.8 116.1a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M152.4 148.5L152.4 111.3C152.4 105.6 162.5 105.6 162.5 111.3L162.5 148.5A5.1 2.1 0 0 1 152.4 148.5Z\"/><path class=\"b1-villus-tip\" d=\"M154.3 109.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M118.9 148.5L118.9 110.5C118.9 104.8 129.0 104.8 129.0 110.5L129.0 148.5A5.1 2.1 0 0 1 118.9 148.5Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M120.8 108.2a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M85.4 148.6L85.4 116.8C85.4 111.1 95.6 111.1 95.6 116.8L95.6 148.6A5.1 2.1 0 0 1 85.4 148.6Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M87.4 114.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M52.0 148.6L52.0 117.9C52.0 112.2 62.1 112.2 62.1 117.9L62.1 148.6A5.1 2.1 0 0 1 52.0 148.6Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M53.9 115.6a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M437.7 152.1L437.7 117.2C437.7 111.5 447.8 111.5 447.8 117.2L447.8 152.1A5.1 2.1 0 0 1 437.7 152.1Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M439.6 115.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M404.2 152.2L404.2 112.6C404.2 106.9 414.3 106.9 414.3 112.6L414.3 152.2A5.1 2.1 0 0 1 404.2 152.2Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M406.1 110.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M370.7 152.2L370.7 118.4C370.7 112.7 380.8 112.7 380.8 118.4L380.8 152.2A5.1 2.1 0 0 1 370.7 152.2Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M372.6 116.1a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M303.7 152.2L303.7 117.9C303.7 112.2 313.8 112.2 313.8 117.9L313.8 152.2A5.1 2.1 0 0 1 303.7 152.2Z\"/><path class=\"b1-villus-tip\" d=\"M305.6 115.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M270.2 152.2L270.2 113.4C270.2 107.7 280.4 107.7 280.4 113.4L280.4 152.2A5.1 2.1 0 0 1 270.2 152.2Z\"/><path class=\"b1-villus-tip\" d=\"M272.2 111.1a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M236.8 152.2L236.8 117.8C236.8 112.1 246.9 112.1 246.9 117.8L246.9 152.2A5.1 2.1 0 0 1 236.8 152.2Z\"/><path class=\"b1-villus-tip\" d=\"M238.7 115.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M203.3 152.3L203.3 122.0C203.3 116.3 213.4 116.3 213.4 122.0L213.4 152.3A5.1 2.1 0 0 1 203.3 152.3Z\"/><path class=\"b1-villus-tip\" d=\"M205.2 119.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M205.6 119.2a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus\" d=\"M169.8 152.3L169.8 118.8C169.8 113.1 179.9 113.1 179.9 118.8L179.9 152.3A5.1 2.1 0 0 1 169.8 152.3Z\"/><path class=\"b1-villus-tip\" d=\"M171.7 116.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M172.1 116.0a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M102.8 152.3L102.8 117.0C102.8 111.3 113.0 111.3 113.0 117.0L113.0 152.3A5.1 2.1 0 0 1 102.8 152.3Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M104.8 114.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M69.4 152.3L69.4 119.9C69.4 114.2 79.5 114.2 79.5 119.9L79.5 152.3A5.1 2.1 0 0 1 69.4 152.3Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M71.3 117.6a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M455.0 155.9L455.0 124.6C455.0 118.9 465.2 118.9 465.2 124.6L465.2 155.9A5.1 2.1 0 0 1 455.0 155.9Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M457.0 122.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M421.6 155.9L421.6 118.1C421.6 112.4 431.7 112.4 431.7 118.1L431.7 155.9A5.1 2.1 0 0 1 421.6 155.9Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M423.5 115.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M388.1 155.9L388.1 119.0C388.1 113.3 398.2 113.3 398.2 119.0L398.2 155.9A5.1 2.1 0 0 1 388.1 155.9Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M390.0 116.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M321.1 156.0L321.1 124.3C321.1 118.6 331.2 118.6 331.2 124.3L331.2 156.0A5.1 2.1 0 0 1 321.1 156.0Z\"/><path class=\"b1-villus-tip\" d=\"M323.0 122.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M287.6 156.0L287.6 120.2C287.6 114.5 297.8 114.5 297.8 120.2L297.8 156.0A5.1 2.1 0 0 1 287.6 156.0Z\"/><path class=\"b1-villus-tip\" d=\"M289.6 117.9a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M289.9 117.3a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus\" d=\"M254.1 156.0L254.1 119.6C254.1 113.9 264.3 113.9 264.3 119.6L264.3 156.0A5.1 2.1 0 0 1 254.1 156.0Z\"/><path class=\"b1-villus-tip\" d=\"M256.1 117.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M256.4 116.8a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus\" d=\"M220.7 156.0L220.7 122.3C220.7 116.6 230.8 116.6 230.8 122.3L230.8 156.0A5.1 2.1 0 0 1 220.7 156.0Z\"/><path class=\"b1-villus-tip\" d=\"M222.6 120.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M187.2 156.0L187.2 123.7C187.2 118.0 197.3 118.0 197.3 123.7L197.3 156.0A5.1 2.1 0 0 1 187.2 156.0Z\"/><path class=\"b1-villus-tip\" d=\"M189.1 121.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M153.7 156.1L153.7 122.7C153.7 117.0 163.8 117.0 163.8 122.7L163.8 156.1A5.1 2.1 0 0 1 153.7 156.1Z\"/><path class=\"b1-villus-tip\" d=\"M155.6 120.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M86.7 156.1L86.7 119.8C86.7 114.1 96.9 114.1 96.9 119.8L96.9 156.1A5.1 2.1 0 0 1 86.7 156.1Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M88.7 117.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M472.4 159.7L472.4 128.7C472.4 123.0 482.6 123.0 482.6 128.7L482.6 159.7A5.1 2.1 0 0 1 472.4 159.7Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M474.4 126.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M438.9 159.7L438.9 125.7C438.9 120.0 449.1 120.0 449.1 125.7L449.1 159.7A5.1 2.1 0 0 1 438.9 159.7Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M440.9 123.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M405.5 159.7L405.5 123.3C405.5 117.6 415.6 117.6 415.6 123.3L415.6 159.7A5.1 2.1 0 0 1 405.5 159.7Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M407.4 121.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M372.0 159.7L372.0 124.6C372.0 118.9 382.1 118.9 382.1 124.6L382.1 159.7A5.1 2.1 0 0 1 372.0 159.7Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M373.9 122.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M305.0 159.8L305.0 127.3C305.0 121.6 315.1 121.6 315.1 127.3L315.1 159.8A5.1 2.1 0 0 1 305.0 159.8Z\"/><path class=\"b1-villus-tip\" d=\"M306.9 125.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M271.5 159.8L271.5 125.5C271.5 119.8 281.7 119.8 281.7 125.5L281.7 159.8A5.1 2.1 0 0 1 271.5 159.8Z\"/><path class=\"b1-villus-tip\" d=\"M273.5 123.2a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M238.1 159.8L238.1 123.1C238.1 117.4 248.2 117.4 248.2 123.1L248.2 159.8A5.1 2.1 0 0 1 238.1 159.8Z\"/><path class=\"b1-villus-tip\" d=\"M240.0 120.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M204.6 159.8L204.6 124.7C204.6 119.0 214.7 119.0 214.7 124.7L214.7 159.8A5.1 2.1 0 0 1 204.6 159.8Z\"/><path class=\"b1-villus-tip\" d=\"M206.5 122.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M171.1 159.8L171.1 128.8C171.1 123.1 181.2 123.1 181.2 128.8L181.2 159.8A5.1 2.1 0 0 1 171.1 159.8Z\"/><path class=\"b1-villus-tip\" d=\"M173.0 126.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M173.4 125.9a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus\" d=\"M137.6 159.8L137.6 127.6C137.6 121.9 147.7 121.9 147.7 127.6L147.7 159.8A5.1 2.1 0 0 1 137.6 159.8Z\"/><path class=\"b1-villus-tip\" d=\"M139.5 125.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M139.9 124.7a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M104.1 159.9L104.1 122.0C104.1 116.3 114.3 116.3 114.3 122.0L114.3 159.9A5.1 2.1 0 0 1 104.1 159.9Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M106.1 119.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M489.8 163.4L489.8 129.2C489.8 123.5 499.9 123.5 499.9 129.2L499.9 163.4A5.1 2.1 0 0 1 489.8 163.4Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M491.7 126.9a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M456.3 163.4L456.3 131.0C456.3 125.4 466.5 125.4 466.5 131.0L466.5 163.4A5.1 2.1 0 0 1 456.3 163.4Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M458.3 128.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M422.9 163.5L422.9 130.6C422.9 124.9 433.0 124.9 433.0 130.6L433.0 163.5A5.1 2.1 0 0 1 422.9 163.5Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M424.8 128.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M389.4 163.5L389.4 127.5C389.4 121.8 399.5 121.8 399.5 127.5L399.5 163.5A5.1 2.1 0 0 1 389.4 163.5Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M391.3 125.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M322.4 163.5L322.4 131.0C322.4 125.3 332.5 125.3 332.5 131.0L332.5 163.5A5.1 2.1 0 0 1 322.4 163.5Z\"/><path class=\"b1-villus-tip\" d=\"M324.3 128.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M288.9 163.5L288.9 133.0C288.9 127.3 299.1 127.3 299.1 133.0L299.1 163.5A5.1 2.1 0 0 1 288.9 163.5Z\"/><path class=\"b1-villus-tip\" d=\"M290.9 130.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M255.4 163.5L255.4 127.8C255.4 122.1 265.6 122.1 265.6 127.8L265.6 163.5A5.1 2.1 0 0 1 255.4 163.5Z\"/><path class=\"b1-villus-tip\" d=\"M257.4 125.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M257.7 125.0a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus\" d=\"M222.0 163.6L222.0 124.9C222.0 119.2 232.1 119.2 232.1 124.9L232.1 163.6A5.1 2.1 0 0 1 222.0 163.6Z\"/><path class=\"b1-villus-tip\" d=\"M223.9 122.6a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M224.2 122.0a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus\" d=\"M188.5 163.6L188.5 130.8C188.5 125.1 198.6 125.1 198.6 130.8L198.6 163.6A5.1 2.1 0 0 1 188.5 163.6Z\"/><path class=\"b1-villus-tip\" d=\"M190.4 128.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M155.0 163.6L155.0 134.5C155.0 128.8 165.1 128.8 165.1 134.5L165.1 163.6A5.1 2.1 0 0 1 155.0 163.6Z\"/><path class=\"b1-villus-tip\" d=\"M156.9 132.2a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M507.2 167.2L507.2 129.7C507.2 124.1 517.3 124.1 517.3 129.7L517.3 167.2A5.1 2.1 0 0 1 507.2 167.2Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M509.1 127.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M473.7 167.2L473.7 132.4C473.7 126.7 483.8 126.7 483.8 132.4L483.8 167.2A5.1 2.1 0 0 1 473.7 167.2Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M475.7 130.1a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M440.2 167.2L440.2 137.1C440.2 131.4 450.4 131.4 450.4 137.1L450.4 167.2A5.1 2.1 0 0 1 440.2 167.2Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M442.2 134.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M406.8 167.2L406.8 134.3C406.8 128.6 416.9 128.6 416.9 134.3L416.9 167.2A5.1 2.1 0 0 1 406.8 167.2Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M408.7 132.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M339.8 167.3L339.8 131.3C339.8 125.6 349.9 125.6 349.9 131.3L349.9 167.3A5.1 2.1 0 0 1 339.8 167.3Z\"/><path class=\"b1-villus-tip\" d=\"M341.7 129.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M342.1 128.5a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus\" d=\"M306.3 167.3L306.3 138.0C306.3 132.3 316.4 132.3 316.4 138.0L316.4 167.3A5.1 2.1 0 0 1 306.3 167.3Z\"/><path class=\"b1-villus-tip\" d=\"M308.2 135.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M308.6 135.2a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus\" d=\"M272.8 167.3L272.8 135.3C272.8 129.6 283.0 129.6 283.0 135.3L283.0 167.3A5.1 2.1 0 0 1 272.8 167.3Z\"/><path class=\"b1-villus-tip\" d=\"M274.8 133.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M239.4 167.3L239.4 128.3C239.4 122.6 249.5 122.6 249.5 128.3L249.5 167.3A5.1 2.1 0 0 1 239.4 167.3Z\"/><path class=\"b1-villus-tip\" d=\"M241.3 126.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M205.9 167.3L205.9 130.7C205.9 125.0 216.0 125.0 216.0 130.7L216.0 167.3A5.1 2.1 0 0 1 205.9 167.3Z\"/><path class=\"b1-villus-tip\" d=\"M207.8 128.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M172.4 167.4L172.4 137.7C172.4 132.0 182.5 132.0 182.5 137.7L182.5 167.4A5.1 2.1 0 0 1 172.4 167.4Z\"/><path class=\"b1-villus-tip\" d=\"M174.3 135.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M138.9 167.4L138.9 135.7C138.9 130.0 149.0 130.0 149.0 135.7L149.0 167.4A5.1 2.1 0 0 1 138.9 167.4Z\"/><path class=\"b1-villus-tip\" d=\"M140.8 133.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M141.2 132.9a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M524.6 170.9L524.6 133.9C524.6 128.2 534.7 128.2 534.7 133.9L534.7 170.9A5.1 2.1 0 0 1 524.6 170.9Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M526.5 131.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M491.1 171.0L491.1 132.5C491.1 126.8 501.2 126.8 501.2 132.5L501.2 171.0A5.1 2.1 0 0 1 491.1 171.0Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M493.0 130.2a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M457.6 171.0L457.6 139.6C457.6 133.9 467.8 133.9 467.8 139.6L467.8 171.0A5.1 2.1 0 0 1 457.6 171.0Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M459.6 137.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M424.2 171.0L424.2 141.5C424.2 135.8 434.3 135.8 434.3 141.5L434.3 171.0A5.1 2.1 0 0 1 424.2 171.0Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M426.1 139.2a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M357.2 171.0L357.2 132.1C357.2 126.4 367.3 126.4 367.3 132.1L367.3 171.0A5.1 2.1 0 0 1 357.2 171.0Z\"/><path class=\"b1-villus-tip\" d=\"M359.1 129.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M323.7 171.1L323.7 139.0C323.7 133.3 333.8 133.3 333.8 139.0L333.8 171.1A5.1 2.1 0 0 1 323.7 171.1Z\"/><path class=\"b1-villus-tip\" d=\"M325.6 136.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M290.2 171.1L290.2 141.4C290.2 135.7 300.3 135.7 300.3 141.4L300.3 171.1A5.1 2.1 0 0 1 290.2 171.1Z\"/><path class=\"b1-villus-tip\" d=\"M292.2 139.1a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M256.7 171.1L256.7 135.3C256.7 129.6 266.9 129.6 266.9 135.3L266.9 171.1A5.1 2.1 0 0 1 256.7 171.1Z\"/><path class=\"b1-villus-tip\" d=\"M258.7 133.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M223.3 171.1L223.3 132.9C223.3 127.2 233.4 127.2 233.4 132.9L233.4 171.1A5.1 2.1 0 0 1 223.3 171.1Z\"/><path class=\"b1-villus-tip\" d=\"M225.2 130.6a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M225.5 130.1a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus\" d=\"M189.8 171.1L189.8 137.9C189.8 132.2 199.9 132.2 199.9 137.9L199.9 171.1A5.1 2.1 0 0 1 189.8 171.1Z\"/><path class=\"b1-villus-tip\" d=\"M191.7 135.6a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M192.1 135.0a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus\" d=\"M156.3 171.1L156.3 140.3C156.3 134.6 166.4 134.6 166.4 140.3L166.4 171.1A5.1 2.1 0 0 1 156.3 171.1Z\"/><path class=\"b1-villus-tip\" d=\"M158.2 138.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M542.0 174.7L542.0 141.3C542.0 135.6 552.1 135.6 552.1 141.3L552.1 174.7A5.1 2.1 0 0 1 542.0 174.7Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M543.9 139.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M508.5 174.7L508.5 135.4C508.5 129.7 518.6 129.7 518.6 135.4L518.6 174.7A5.1 2.1 0 0 1 508.5 174.7Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M510.4 133.1a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M475.0 174.7L475.0 139.5C475.0 133.8 485.1 133.8 485.1 139.5L485.1 174.7A5.1 2.1 0 0 1 475.0 174.7Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M476.9 137.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M441.5 174.8L441.5 145.3C441.5 139.6 451.7 139.6 451.7 145.3L451.7 174.8A5.1 2.1 0 0 1 441.5 174.8Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M443.5 143.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M408.1 174.8L408.1 141.8C408.1 136.1 418.2 136.1 418.2 141.8L418.2 174.8A5.1 2.1 0 0 1 408.1 174.8Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M410.0 139.6a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M341.1 174.8L341.1 139.2C341.1 133.5 351.2 133.5 351.2 139.2L351.2 174.8A5.1 2.1 0 0 1 341.1 174.8Z\"/><path class=\"b1-villus-tip\" d=\"M343.0 136.9a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M307.6 174.8L307.6 143.5C307.6 137.8 317.7 137.8 317.7 143.5L317.7 174.8A5.1 2.1 0 0 1 307.6 174.8Z\"/><path class=\"b1-villus-tip\" d=\"M309.5 141.2a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M309.9 140.7a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus\" d=\"M274.1 174.8L274.1 142.3C274.1 136.6 284.3 136.6 284.3 142.3L284.3 174.8A5.1 2.1 0 0 1 274.1 174.8Z\"/><path class=\"b1-villus-tip\" d=\"M276.1 140.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M276.4 139.4a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus\" d=\"M240.7 174.9L240.7 139.1C240.7 133.4 250.8 133.4 250.8 139.1L250.8 174.9A5.1 2.1 0 0 1 240.7 174.9Z\"/><path class=\"b1-villus-tip\" d=\"M242.6 136.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M207.2 174.9L207.2 139.0C207.2 133.3 217.3 133.3 217.3 139.0L217.3 174.9A5.1 2.1 0 0 1 207.2 174.9Z\"/><path class=\"b1-villus-tip\" d=\"M209.1 136.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M173.7 174.9L173.7 141.0C173.7 135.3 183.8 135.3 183.8 141.0L183.8 174.9A5.1 2.1 0 0 1 173.7 174.9Z\"/><path class=\"b1-villus-tip\" d=\"M175.6 138.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M559.4 178.5L559.4 147.8C559.4 142.1 569.5 142.1 569.5 147.8L569.5 178.5A5.1 2.1 0 0 1 559.4 178.5Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M561.3 145.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M525.9 178.5L525.9 142.1C525.9 136.4 536.0 136.4 536.0 142.1L536.0 178.5A5.1 2.1 0 0 1 525.9 178.5Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M527.8 139.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M492.4 178.5L492.4 141.2C492.4 135.6 502.5 135.6 502.5 141.2L502.5 178.5A5.1 2.1 0 0 1 492.4 178.5Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M494.3 139.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M458.9 178.5L458.9 145.6C458.9 139.9 469.1 139.9 469.1 145.6L469.1 178.5A5.1 2.1 0 0 1 458.9 178.5Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M460.9 143.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M425.5 178.5L425.5 146.9C425.5 141.2 435.6 141.2 435.6 146.9L435.6 178.5A5.1 2.1 0 0 1 425.5 178.5Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M427.4 144.6a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M358.5 178.6L358.5 142.5C358.5 136.8 368.6 136.8 368.6 142.5L368.6 178.6A5.1 2.1 0 0 1 358.5 178.6Z\"/><path class=\"b1-villus-tip\" d=\"M360.4 140.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M360.8 139.7a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus\" d=\"M325.0 178.6L325.0 143.4C325.0 137.7 335.1 137.7 335.1 143.4L335.1 178.6A5.1 2.1 0 0 1 325.0 178.6Z\"/><path class=\"b1-villus-tip\" d=\"M326.9 141.1a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M291.5 178.6L291.5 145.6C291.5 139.9 301.6 139.9 301.6 145.6L301.6 178.6A5.1 2.1 0 0 1 291.5 178.6Z\"/><path class=\"b1-villus-tip\" d=\"M293.4 143.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M258.0 178.6L258.0 146.5C258.0 140.8 268.2 140.8 268.2 146.5L268.2 178.6A5.1 2.1 0 0 1 258.0 178.6Z\"/><path class=\"b1-villus-tip\" d=\"M260.0 144.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M224.6 178.6L224.6 144.0C224.6 138.3 234.7 138.3 234.7 144.0L234.7 178.6A5.1 2.1 0 0 1 224.6 178.6Z\"/><path class=\"b1-villus-tip\" d=\"M226.5 141.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M191.1 178.7L191.1 141.3C191.1 135.6 201.2 135.6 201.2 141.3L201.2 178.7A5.1 2.1 0 0 1 191.1 178.7Z\"/><path class=\"b1-villus-tip\" d=\"M193.0 139.1a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M193.4 138.5a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M543.3 182.2L543.3 149.3C543.3 143.6 553.4 143.6 553.4 149.3L553.4 182.2A5.1 2.1 0 0 1 543.3 182.2Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M545.2 147.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M509.8 182.3L509.8 147.0C509.8 141.3 519.9 141.3 519.9 147.0L519.9 182.3A5.1 2.1 0 0 1 509.8 182.3Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M511.7 144.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M476.3 182.3L476.3 146.3C476.3 140.6 486.4 140.6 486.4 146.3L486.4 182.3A5.1 2.1 0 0 1 476.3 182.3Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M478.2 144.1a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M442.8 182.3L442.8 148.0C442.8 142.3 453.0 142.3 453.0 148.0L453.0 182.3A5.1 2.1 0 0 1 442.8 182.3Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M444.8 145.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M375.9 182.3L375.9 149.5C375.9 143.8 386.0 143.8 386.0 149.5L386.0 182.3A5.1 2.1 0 0 1 375.9 182.3Z\"/><path class=\"b1-villus-tip\" d=\"M377.8 147.2a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M342.4 182.3L342.4 145.5C342.4 139.8 352.5 139.8 352.5 145.5L352.5 182.3A5.1 2.1 0 0 1 342.4 182.3Z\"/><path class=\"b1-villus-tip\" d=\"M344.3 143.2a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M308.9 182.4L308.9 145.7C308.9 140.0 319.0 140.0 319.0 145.7L319.0 182.4A5.1 2.1 0 0 1 308.9 182.4Z\"/><path class=\"b1-villus-tip\" d=\"M310.8 143.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M275.4 182.4L275.4 151.1C275.4 145.5 285.6 145.5 285.6 151.1L285.6 182.4A5.1 2.1 0 0 1 275.4 182.4Z\"/><path class=\"b1-villus-tip\" d=\"M277.4 148.9a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M277.7 148.3a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus\" d=\"M242.0 182.4L242.0 151.6C242.0 145.9 252.1 145.9 252.1 151.6L252.1 182.4A5.1 2.1 0 0 1 242.0 182.4Z\"/><path class=\"b1-villus-tip\" d=\"M243.9 149.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M244.2 148.7a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus\" d=\"M208.5 182.4L208.5 145.1C208.5 139.4 218.6 139.4 218.6 145.1L218.6 182.4A5.1 2.1 0 0 1 208.5 182.4Z\"/><path class=\"b1-villus-tip\" d=\"M210.4 142.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M560.7 186.0L560.7 153.1C560.7 147.4 570.8 147.4 570.8 153.1L570.8 186.0A5.1 2.1 0 0 1 560.7 186.0Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M562.6 150.9a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M527.2 186.0L527.2 154.6C527.2 148.9 537.3 148.9 537.3 154.6L537.3 186.0A5.1 2.1 0 0 1 527.2 186.0Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M529.1 152.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M493.7 186.0L493.7 150.9C493.7 145.2 503.8 145.2 503.8 150.9L503.8 186.0A5.1 2.1 0 0 1 493.7 186.0Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M495.6 148.6a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M460.2 186.1L460.2 148.1C460.2 142.4 470.4 142.4 470.4 148.1L470.4 186.1A5.1 2.1 0 0 1 460.2 186.1Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M462.2 145.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M426.7 186.1L426.7 152.5C426.7 146.8 436.9 146.8 436.9 152.5L436.9 186.1A5.1 2.1 0 0 1 426.7 186.1Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M428.7 150.2a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M359.8 186.1L359.8 151.6C359.8 145.9 369.9 145.9 369.9 151.6L369.9 186.1A5.1 2.1 0 0 1 359.8 186.1Z\"/><path class=\"b1-villus-tip\" d=\"M361.7 149.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M362.1 148.8a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus\" d=\"M326.3 186.1L326.3 146.8C326.3 141.1 336.4 141.1 336.4 146.8L336.4 186.1A5.1 2.1 0 0 1 326.3 186.1Z\"/><path class=\"b1-villus-tip\" d=\"M328.2 144.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M328.6 144.0a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus\" d=\"M292.8 186.1L292.8 151.9C292.8 146.2 302.9 146.2 302.9 151.9L302.9 186.1A5.1 2.1 0 0 1 292.8 186.1Z\"/><path class=\"b1-villus-tip\" d=\"M294.7 149.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M259.3 186.2L259.3 157.4C259.3 151.7 269.5 151.7 269.5 157.4L269.5 186.2A5.1 2.1 0 0 1 259.3 186.2Z\"/><path class=\"b1-villus-tip\" d=\"M261.3 155.1a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M225.9 186.2L225.9 152.3C225.9 146.6 236.0 146.6 236.0 152.3L236.0 186.2A5.1 2.1 0 0 1 225.9 186.2Z\"/><path class=\"b1-villus-tip\" d=\"M227.8 150.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M544.6 189.8L544.6 159.7C544.6 154.0 554.7 154.0 554.7 159.7L554.7 189.8A5.1 2.1 0 0 1 544.6 189.8Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M546.5 157.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M511.1 189.8L511.1 158.4C511.1 152.7 521.2 152.7 521.2 158.4L521.2 189.8A5.1 2.1 0 0 1 511.1 189.8Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M513.0 156.1a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M477.6 189.8L477.6 151.4C477.6 145.7 487.7 145.7 487.7 151.4L487.7 189.8A5.1 2.1 0 0 1 477.6 189.8Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M479.5 149.1a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M377.2 189.9L377.2 159.1C377.2 153.4 387.3 153.4 387.3 159.1L387.3 189.9A5.1 2.1 0 0 1 377.2 189.9Z\"/><path class=\"b1-villus-tip\" d=\"M379.1 156.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M343.7 189.9L343.7 151.8C343.7 146.1 353.8 146.1 353.8 151.8L353.8 189.9A5.1 2.1 0 0 1 343.7 189.9Z\"/><path class=\"b1-villus-tip\" d=\"M345.6 149.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M310.2 189.9L310.2 152.2C310.2 146.6 320.3 146.6 320.3 152.2L320.3 189.9A5.1 2.1 0 0 1 310.2 189.9Z\"/><path class=\"b1-villus-tip\" d=\"M312.1 150.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M276.7 189.9L276.7 159.1C276.7 153.4 286.9 153.4 286.9 159.1L286.9 189.9A5.1 2.1 0 0 1 276.7 189.9Z\"/><path class=\"b1-villus-tip\" d=\"M278.7 156.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M243.2 189.9L243.2 159.1C243.2 153.4 253.4 153.4 253.4 159.1L253.4 189.9A5.1 2.1 0 0 1 243.2 189.9Z\"/><path class=\"b1-villus-tip\" d=\"M245.2 156.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M245.5 156.2a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M528.5 193.6L528.5 164.6C528.5 158.9 538.6 158.9 538.6 164.6L538.6 193.6A5.1 2.1 0 0 1 528.5 193.6Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M530.4 162.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M394.6 193.6L394.6 163.8C394.6 158.1 404.7 158.1 404.7 163.8L404.7 193.6A5.1 2.1 0 0 1 394.6 193.6Z\"/><path class=\"b1-villus-tip\" d=\"M396.5 161.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M361.1 193.6L361.1 159.3C361.1 153.6 371.2 153.6 371.2 159.3L371.2 193.6A5.1 2.1 0 0 1 361.1 193.6Z\"/><path class=\"b1-villus-tip\" d=\"M363.0 157.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M327.6 193.7L327.6 156.0C327.6 150.3 337.7 150.3 337.7 156.0L337.7 193.7A5.1 2.1 0 0 1 327.6 193.7Z\"/><path class=\"b1-villus-tip\" d=\"M329.5 153.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M329.9 153.1a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus\" d=\"M294.1 193.7L294.1 159.1C294.1 153.4 304.2 153.4 304.2 159.1L304.2 193.7A5.1 2.1 0 0 1 294.1 193.7Z\"/><path class=\"b1-villus-tip\" d=\"M296.0 156.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M296.4 156.3a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus\" d=\"M260.6 193.7L260.6 162.0C260.6 156.3 270.8 156.3 270.8 162.0L270.8 193.7A5.1 2.1 0 0 1 260.6 193.7Z\"/><path class=\"b1-villus-tip\" d=\"M262.6 159.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M378.5 197.4L378.5 165.2C378.5 159.5 388.6 159.5 388.6 165.2L388.6 197.4A5.1 2.1 0 0 1 378.5 197.4Z\"/><path class=\"b1-villus-tip\" d=\"M380.4 162.9a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M380.8 162.3a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus\" d=\"M345.0 197.4L345.0 163.1C345.0 157.4 355.1 157.4 355.1 163.1L355.1 197.4A5.1 2.1 0 0 1 345.0 197.4Z\"/><path class=\"b1-villus-tip\" d=\"M346.9 160.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M311.5 197.4L311.5 161.5C311.5 155.8 321.6 155.8 321.6 161.5L321.6 197.4A5.1 2.1 0 0 1 311.5 197.4Z\"/><path class=\"b1-villus-tip\" d=\"M313.4 159.2a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M278.0 197.5L278.0 162.1C278.0 156.4 288.1 156.4 288.1 162.1L288.1 197.5A5.1 2.1 0 0 1 278.0 197.5Z\"/><path class=\"b1-villus-tip\" d=\"M280.0 159.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M462.8 201.1L462.8 166.0C462.8 160.3 472.9 160.3 472.9 166.0L472.9 201.1A5.1 2.1 0 0 1 462.8 201.1Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M464.8 163.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M429.3 201.2L429.3 164.9C429.3 159.2 439.5 159.2 439.5 164.9L439.5 201.2A5.1 2.1 0 0 1 429.3 201.2Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M431.3 162.6a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M395.9 201.2L395.9 167.0C395.9 161.3 406.0 161.3 406.0 167.0L406.0 201.2A5.1 2.1 0 0 1 395.9 201.2Z\"/><path class=\"b1-villus-tip\" d=\"M397.8 164.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M362.4 201.2L362.4 169.9C362.4 164.2 372.5 164.2 372.5 169.9L372.5 201.2A5.1 2.1 0 0 1 362.4 201.2Z\"/><path class=\"b1-villus-tip\" d=\"M364.3 167.6a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M328.9 201.2L328.9 167.9C328.9 162.2 339.0 162.2 339.0 167.9L339.0 201.2A5.1 2.1 0 0 1 328.9 201.2Z\"/><path class=\"b1-villus-tip\" d=\"M330.8 165.6a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M295.4 201.2L295.4 163.4C295.4 157.7 305.5 157.7 305.5 163.4L305.5 201.2A5.1 2.1 0 0 1 295.4 201.2Z\"/><path class=\"b1-villus-tip\" d=\"M297.3 161.1a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M297.7 160.6a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M513.7 204.9L513.7 172.8C513.7 167.1 523.8 167.1 523.8 172.8L523.8 204.9A5.1 2.1 0 0 1 513.7 204.9Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M515.6 170.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M480.2 204.9L480.2 173.5C480.2 167.8 490.3 167.8 490.3 173.5L490.3 204.9A5.1 2.1 0 0 1 480.2 204.9Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M482.1 171.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M446.7 204.9L446.7 168.5C446.7 162.9 456.9 162.9 456.9 168.5L456.9 204.9A5.1 2.1 0 0 1 446.7 204.9Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M448.7 166.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M379.8 204.9L379.8 172.9C379.8 167.2 389.9 167.2 389.9 172.9L389.9 204.9A5.1 2.1 0 0 1 379.8 204.9Z\"/><path class=\"b1-villus-tip\" d=\"M381.7 170.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M382.0 170.1a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus\" d=\"M346.3 205.0L346.3 175.3C346.3 169.6 356.4 169.6 356.4 175.3L356.4 205.0A5.1 2.1 0 0 1 346.3 205.0Z\"/><path class=\"b1-villus-tip\" d=\"M348.2 173.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M348.6 172.5a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus\" d=\"M312.8 205.0L312.8 168.7C312.8 163.0 322.9 163.0 322.9 168.7L322.9 205.0A5.1 2.1 0 0 1 312.8 205.0Z\"/><path class=\"b1-villus-tip\" d=\"M314.7 166.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M531.1 208.6L531.1 173.7C531.1 168.0 541.2 168.0 541.2 173.7L541.2 208.6A5.1 2.1 0 0 1 531.1 208.6Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M533.0 171.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M497.6 208.7L497.6 179.5C497.6 173.8 507.7 173.8 507.7 179.5L507.7 208.7A5.1 2.1 0 0 1 497.6 208.7Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M499.5 177.2a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M464.1 208.7L464.1 175.7C464.1 170.0 474.2 170.0 474.2 175.7L474.2 208.7A5.1 2.1 0 0 1 464.1 208.7Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M466.0 173.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M430.6 208.7L430.6 169.3C430.6 163.6 440.8 163.6 440.8 169.3L440.8 208.7A5.1 2.1 0 0 1 430.6 208.7Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M432.6 167.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M363.7 208.7L363.7 179.6C363.7 173.9 373.8 173.9 373.8 179.6L373.8 208.7A5.1 2.1 0 0 1 363.7 208.7Z\"/><path class=\"b1-villus-tip\" d=\"M365.6 177.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M330.2 208.7L330.2 176.3C330.2 170.6 340.3 170.6 340.3 176.3L340.3 208.7A5.1 2.1 0 0 1 330.2 208.7Z\"/><path class=\"b1-villus-tip\" d=\"M332.1 174.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M515.0 212.4L515.0 181.3C515.0 175.6 525.1 175.6 525.1 181.3L525.1 212.4A5.1 2.1 0 0 1 515.0 212.4Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M516.9 179.1a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M481.5 212.4L481.5 182.5C481.5 176.8 491.6 176.8 491.6 182.5L491.6 212.4A5.1 2.1 0 0 1 481.5 212.4Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M483.4 180.2a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M448.0 212.5L448.0 175.7C448.0 170.0 458.2 170.0 458.2 175.7L458.2 212.5A5.1 2.1 0 0 1 448.0 212.5Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M450.0 173.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M414.6 212.5L414.6 174.3C414.6 168.6 424.7 168.6 424.7 174.3L424.7 212.5A5.1 2.1 0 0 1 414.6 212.5Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M416.5 172.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M381.1 212.5L381.1 180.2C381.1 174.5 391.2 174.5 391.2 180.2L391.2 212.5A5.1 2.1 0 0 1 381.1 212.5Z\"/><path class=\"b1-villus-tip\" d=\"M383.0 178.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M347.6 212.5L347.6 181.8C347.6 176.1 357.7 176.1 357.7 181.8L357.7 212.5A5.1 2.1 0 0 1 347.6 212.5Z\"/><path class=\"b1-villus-tip\" d=\"M349.5 179.6a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M349.9 179.0a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M498.9 216.2L498.9 185.6C498.9 179.9 509.0 179.9 509.0 185.6L509.0 216.2A5.1 2.1 0 0 1 498.9 216.2Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M500.8 183.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M465.4 216.2L465.4 183.1C465.4 177.4 475.5 177.4 475.5 183.1L475.5 216.2A5.1 2.1 0 0 1 465.4 216.2Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M467.3 180.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M431.9 216.2L431.9 179.5C431.9 173.8 442.1 173.8 442.1 179.5L442.1 216.2A5.1 2.1 0 0 1 431.9 216.2Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M433.9 177.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M365.0 216.3L365.0 183.3C365.0 177.7 375.1 177.7 375.1 183.3L375.1 216.3A5.1 2.1 0 0 1 365.0 216.3Z\"/><path class=\"b1-villus-tip\" d=\"M366.9 181.1a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M516.3 220.0L516.3 185.7C516.3 180.0 526.4 180.0 526.4 185.7L526.4 220.0A5.1 2.1 0 0 1 516.3 220.0Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M518.2 183.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M482.8 220.0L482.8 187.5C482.8 181.8 492.9 181.8 492.9 187.5L492.9 220.0A5.1 2.1 0 0 1 482.8 220.0Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M484.7 185.2a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M449.3 220.0L449.3 187.1C449.3 181.4 459.5 181.4 459.5 187.1L459.5 220.0A5.1 2.1 0 0 1 449.3 220.0Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M451.3 184.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M415.8 220.0L415.8 184.7C415.8 179.0 426.0 179.0 426.0 184.7L426.0 220.0A5.1 2.1 0 0 1 415.8 220.0Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M417.8 182.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M500.2 223.7L500.2 188.1C500.2 182.4 510.3 182.4 510.3 188.1L510.3 223.7A5.1 2.1 0 0 1 500.2 223.7Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M502.1 185.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M466.7 223.8L466.7 192.7C466.7 187.0 476.8 187.0 476.8 192.7L476.8 223.8A5.1 2.1 0 0 1 466.7 223.8Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M468.6 190.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M433.2 223.8L433.2 192.0C433.2 186.3 443.4 186.3 443.4 192.0L443.4 223.8A5.1 2.1 0 0 1 433.2 223.8Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M435.2 189.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M399.8 223.8L399.8 186.1C399.8 180.4 409.9 180.4 409.9 186.1L409.9 223.8A5.1 2.1 0 0 1 399.8 223.8Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M401.7 183.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M484.1 227.5L484.1 194.3C484.1 188.6 494.2 188.6 494.2 194.3L494.2 227.5A5.1 2.1 0 0 1 484.1 227.5Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M486.0 192.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M450.6 227.5L450.6 198.6C450.6 192.9 460.7 192.9 460.7 198.6L460.7 227.5A5.1 2.1 0 0 1 450.6 227.5Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M452.6 196.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M417.1 227.5L417.1 192.7C417.1 187.0 427.3 187.0 427.3 192.7L427.3 227.5A5.1 2.1 0 0 1 417.1 227.5Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M419.1 190.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M501.5 231.3L501.5 194.3C501.5 188.6 511.6 188.6 511.6 194.3L511.6 231.3A5.1 2.1 0 0 1 501.5 231.3Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M503.4 192.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M468.0 231.3L468.0 201.3C468.0 195.6 478.1 195.6 478.1 201.3L478.1 231.3A5.1 2.1 0 0 1 468.0 231.3Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M469.9 199.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M434.5 231.3L434.5 200.0C434.5 194.3 444.7 194.3 444.7 200.0L444.7 231.3A5.1 2.1 0 0 1 434.5 231.3Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M436.5 197.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M485.4 235.1L485.4 201.3C485.4 195.6 495.5 195.6 495.5 201.3L495.5 235.1A5.1 2.1 0 0 1 485.4 235.1Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M487.3 199.1a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M451.9 235.1L451.9 204.0C451.9 198.3 462.0 198.3 462.0 204.0L462.0 235.1A5.1 2.1 0 0 1 451.9 235.1Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M453.8 201.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M469.3 238.8L469.3 204.4C469.3 198.8 479.4 198.8 479.4 204.4L479.4 238.8A5.1 2.1 0 0 1 469.3 238.8Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M471.2 202.2a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M486.7 242.6L486.7 205.0C486.7 199.4 496.8 199.4 496.8 205.0L496.8 242.6A5.1 2.1 0 0 1 486.7 242.6Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M488.6 202.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/></g><g clip-path=\"url(#b1-sideclip)\"><g transform=\"matrix(0.4623 -0.3537 0.0000 0.8996 494.91 113.77)\">\n<path class=\"a1-villus a1-dim b1-end-villus\" d=\"M10.5 115.9h0.0a6.5 6.5 0 0 1 6.5 6.5v31.1a6.5 6.5 0 0 1 -13.0 0v-31.1a6.5 6.5 0 0 1 6.5 -6.5ZM30.5 116.7h0.0a6.5 6.5 0 0 1 6.5 6.5v30.3a6.5 6.5 0 0 1 -13.0 0v-30.3a6.5 6.5 0 0 1 6.5 -6.5ZM50.5 110.3h0.0a6.5 6.5 0 0 1 6.5 6.5v36.7a6.5 6.5 0 0 1 -13.0 0v-36.7a6.5 6.5 0 0 1 6.5 -6.5ZM70.5 113.9h0.0a6.5 6.5 0 0 1 6.5 6.5v33.1a6.5 6.5 0 0 1 -13.0 0v-33.1a6.5 6.5 0 0 1 6.5 -6.5ZM130.5 111.9h0.0a6.5 6.5 0 0 1 6.5 6.5v35.1a6.5 6.5 0 0 1 -13.0 0v-35.1a6.5 6.5 0 0 1 6.5 -6.5ZM150.5 117.9h0.0a6.5 6.5 0 0 1 6.5 6.5v29.1a6.5 6.5 0 0 1 -13.0 0v-29.1a6.5 6.5 0 0 1 6.5 -6.5ZM170.5 113.5h0.0a6.5 6.5 0 0 1 6.5 6.5v33.5a6.5 6.5 0 0 1 -13.0 0v-33.5a6.5 6.5 0 0 1 6.5 -6.5ZM190.5 110.4h0.0a6.5 6.5 0 0 1 6.5 6.5v36.6a6.5 6.5 0 0 1 -13.0 0v-36.6a6.5 6.5 0 0 1 6.5 -6.5Z\"/>\n<rect class=\"b1-lateral\" x=\"0\" y=\"148\" width=\"210\" height=\"384\"/>\n<rect class=\"a1-tissue\" x=\"0\" y=\"526\" width=\"210\" height=\"114\"/>\n<path class=\"a1-cell a1-dim\" d=\"M0.0 149.4C2.8 122.7 14.2 150.8 19.8 150.8C25.4 150.8 34.0 149.4 39.6 149.4C45.2 149.4 53.8 150.8 59.4 150.8C65.0 150.8 73.6 149.4 79.2 149.4C84.8 149.4 96.0 144.0 99.0 150.8C102.0 157.6 100.3 184.0 100.1 197.3C99.9 210.5 98.2 231.1 97.7 244.5C97.2 257.9 96.5 278.4 96.5 291.8C96.5 305.1 97.1 325.6 97.6 339.0C98.1 352.4 99.5 372.9 100.0 386.3C100.6 399.6 101.4 420.1 101.5 433.5C101.6 446.9 102.0 467.1 100.7 480.8C99.3 494.4 95.0 523.2 92.0 530.0C89.0 536.8 83.8 528.9 79.2 529.0C74.6 529.1 65.0 530.5 59.4 530.5C53.8 530.5 45.2 529.0 39.6 529.0C34.0 529.0 25.4 530.4 19.8 530.5C14.2 530.6 2.8 557.1 0.0 530.0C-2.8 502.9 0.0 392.9 0.0 339.0C0.0 285.1 -2.8 176.1 0.0 149.4Z\"/>\n<path class=\"a1-cell a1-dim\" d=\"M105.0 149.4C109.2 141.7 120.6 150.8 128.4 150.8C136.2 150.8 144.0 149.4 151.8 149.4C159.6 149.4 167.4 150.8 175.2 150.8C183.0 150.8 190.8 149.4 198.6 149.4C206.4 149.4 218.3 142.8 222.0 150.8C225.7 158.8 221.3 181.6 220.9 197.3C220.5 212.9 219.6 228.8 219.5 244.5C219.4 260.3 219.9 276.0 220.4 291.8C221.0 307.5 222.1 323.3 222.8 339.0C223.4 354.8 224.2 370.5 224.4 386.3C224.6 402.0 224.3 417.8 223.8 433.5C223.4 449.3 223.0 464.7 221.6 480.8C220.1 496.8 218.8 522.0 215.0 530.0C211.2 538.0 205.2 528.9 198.6 529.0C192.0 529.1 183.0 530.5 175.2 530.5C167.4 530.5 159.6 529.0 151.8 529.0C144.0 529.0 135.0 530.3 128.4 530.5C121.8 530.7 116.2 538.3 112.0 530.0C107.8 521.7 104.6 496.8 103.1 480.8C101.6 464.7 102.5 449.3 102.9 433.5C103.4 417.8 105.0 402.0 105.8 386.3C106.6 370.5 107.5 354.8 107.5 339.0C107.5 323.3 106.3 307.5 105.5 291.8C104.8 276.0 103.2 260.3 102.8 244.5C102.4 228.8 102.9 213.1 103.3 197.3C103.7 181.4 100.8 157.1 105.0 149.4Z\"/>\n<path class=\"a1-web\" d=\"M3 159H93.00653594771242V165H3Z\"/>\n<path class=\"a1-nucleus a1-dim\" d=\"M93.9 446.0C93.5 452.7 91.5 459.5 88.1 465.5C84.8 471.5 80.0 478.5 73.8 481.9C67.6 485.3 58.4 486.3 51.0 486.1C43.6 485.8 35.3 483.9 29.1 480.4C23.0 477.0 17.9 471.1 14.1 465.4C10.2 459.6 6.3 452.7 5.9 446.0C5.5 439.3 7.9 431.0 11.9 425.5C15.9 419.9 23.3 415.9 29.8 412.6C36.3 409.4 43.8 406.3 51.0 406.1C58.2 405.8 66.6 407.9 73.1 411.2C79.7 414.4 86.8 419.6 90.3 425.4C93.7 431.2 94.3 439.3 93.9 446.0Z\"/>\n<path class=\"a1-mito a1-dim\" d=\"M52.9 300.0C53.1 301.3 51.9 303.1 50.0 304.2C48.1 305.3 44.7 306.4 41.7 306.7C38.7 307.0 35.2 306.6 32.1 306.2C29.0 305.8 24.8 305.4 22.9 304.4C21.0 303.4 20.7 301.4 20.9 300.0C21.1 298.6 22.3 297.1 24.1 296.0C25.9 294.9 28.8 293.9 31.8 293.4C34.8 292.9 39.2 292.5 42.0 292.9C44.8 293.4 47.0 295.0 48.8 296.2C50.6 297.3 52.7 298.7 52.9 300.0ZM87.0 230.0C87.1 231.4 85.7 233.1 83.8 234.2C81.9 235.3 78.7 236.0 75.8 236.4C73.0 236.8 69.6 237.0 66.8 236.7C63.9 236.3 60.3 235.4 58.7 234.3C57.0 233.2 56.8 231.4 57.0 230.0C57.1 228.6 57.9 227.1 59.5 226.0C61.1 224.8 63.8 223.5 66.6 223.0C69.3 222.6 73.3 222.8 76.0 223.3C78.8 223.9 81.1 225.0 82.9 226.1C84.8 227.2 86.8 228.6 87.0 230.0Z\"/>\n<path class=\"a1-nucleus a1-dim\" d=\"M168.3 462.0C168.3 467.8 167.1 474.5 164.8 479.2C162.5 483.9 158.3 487.3 154.5 490.2C150.6 493.0 146.3 495.9 142.0 496.3C137.7 496.7 132.3 495.4 128.6 492.4C124.9 489.5 121.9 483.8 119.9 478.7C117.8 473.6 116.3 467.6 116.3 462.0C116.3 456.4 117.8 450.3 119.8 445.2C121.8 440.1 124.7 434.1 128.5 431.3C132.2 428.5 137.7 427.9 142.0 428.3C146.4 428.7 150.8 430.8 154.6 433.6C158.4 436.3 162.6 440.0 164.9 444.7C167.2 449.5 168.3 456.2 168.3 462.0Z\"/>\n<rect class=\"a1-lamina\" x=\"0\" y=\"538\" width=\"210\" height=\"5\"/>\n<path class=\"b1-collagen\" d=\"M44.0 586.6q6.3 2.2 12.6 -1.9M109.4 592.4q9.8 -1.3 19.5 -0.5M79.0 608.5q8.7 0.5 17.3 -5.1M176.3 581.4q7.3 1.4 14.6 -5.0M138.8 595.5q7.9 -1.2 15.8 -0.3M171.4 551.0q10.3 1.3 20.6 -5.2M46.2 581.5q9.7 -2.4 19.4 6.2M141.7 628.6q13.1 -2.9 26.2 -3.8M158.8 616.3q7.8 -2.0 15.5 5.8M171.9 627.7q13.8 1.8 27.5 5.2M113.0 570.9q6.2 2.7 12.3 1.1M177.1 578.8q5.7 1.0 11.5 3.5M196.2 595.1q10.0 2.1 19.9 2.9M113.4 626.1q8.7 1.9 17.3 7.3M125.2 568.5q6.0 2.0 12.0 -4.5M61.4 578.8q9.0 -0.2 18.0 0.7M61.0 581.1q10.2 0.3 20.5 -5.4M192.0 558.1q12.9 1.6 25.9 10.4M134.4 580.3q10.7 0.0 21.4 6.4M92.9 593.7q13.4 0.4 26.9 -5.3M189.7 562.1q13.2 1.1 26.4 -7.4M90.1 617.8q13.0 -0.1 25.9 -2.8M125.4 569.0q11.8 2.2 23.5 -7.8M86.0 612.1q12.8 -0.4 25.6 -3.3M44.1 551.7q9.7 -1.2 19.5 -7.6M173.3 576.0q13.8 -0.0 27.7 3.1\"/><path class=\"b1-fibro\" d=\"M107.4 590.0C107.3 590.8 105.3 591.7 103.4 592.3C101.5 592.9 98.5 593.5 96.0 593.5C93.5 593.5 90.0 593.0 88.2 592.4C86.4 591.8 85.4 590.8 85.4 590.0C85.3 589.2 86.1 588.0 87.9 587.5C89.6 586.9 93.3 586.7 96.0 586.7C98.7 586.7 101.9 587.1 103.8 587.6C105.7 588.1 107.4 589.2 107.4 590.0ZM171.7 616.0C171.5 616.8 168.8 617.5 166.9 618.1C165.0 618.8 162.4 619.7 160.0 619.7C157.6 619.8 154.2 619.0 152.4 618.3C150.7 617.7 149.9 616.8 149.7 616.0C149.5 615.2 149.6 613.8 151.3 613.3C153.1 612.8 157.2 612.9 160.0 612.9C162.8 613.0 166.0 613.0 168.0 613.5C169.9 614.0 171.9 615.2 171.7 616.0ZM81.6 628.0C81.8 628.8 80.0 630.0 78.0 630.5C76.1 631.0 72.8 631.0 70.0 631.1C67.2 631.1 63.1 631.2 61.4 630.7C59.7 630.1 59.4 628.8 59.6 628.0C59.8 627.2 60.7 626.3 62.5 625.7C64.2 625.1 67.6 624.2 70.0 624.3C72.4 624.3 75.0 625.2 77.0 625.9C78.9 626.5 81.4 627.2 81.6 628.0Z\"/>\n<path class=\"a1-endo\" d=\"M0 554.0A34 34 0 0 1 0 622.0Z\"/><path class=\"a1-blood\" d=\"M0 560.0A28 28 0 0 1 0 616.0Z\"/>\n<path class=\"b1-rbc-x\" d=\"M0 575.0c6 0 9 3 9 6c0 2 -2 3 -2 7c0 4 2 5 2 7c0 3 -3 6 -9 6Z\"/>\n<rect class=\"b1-side-shade\" x=\"-1\" y=\"148\" width=\"212\" height=\"493\"/>\n</g></g><path class=\"b1-edge\" d=\"M592 174.4L592 615.3L494.9 689.5M8 143.4L8 584.2L494.9 689.5L494.9 248.7\"/>\n<g class=\"b1-front\" transform=\"matrix(0.8695 0.1880 0.0000 0.8996 -9.39 4.71)\"><g clip-path=\"url(#b1-frontclip)\"><rect class=\"b1-lateral\" x=\"20\" y=\"148\" width=\"560\" height=\"384\"/><rect class=\"a1-tissue\" x=\"0\" y=\"526\" width=\"600\" height=\"114\"/><g><path class=\"a1-villus a1-dim\" d=\"M28.5 106.2h0.0a6.5 6.5 0 0 1 6.5 6.5v40.8a6.5 6.5 0 0 1 -13.0 0v-40.8a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus a1-dim\" d=\"M48.5 109.3h0.0a6.5 6.5 0 0 1 6.5 6.5v37.7a6.5 6.5 0 0 1 -13.0 0v-37.7a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus a1-dim\" d=\"M68.5 113.3h0.0a6.5 6.5 0 0 1 6.5 6.5v33.7a6.5 6.5 0 0 1 -13.0 0v-33.7a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus a1-dim\" d=\"M88.5 113.5h0.0a6.5 6.5 0 0 1 6.5 6.5v33.5a6.5 6.5 0 0 1 -13.0 0v-33.5a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus a1-dim\" d=\"M108.5 109.8h0.0a6.5 6.5 0 0 1 6.5 6.5v37.2a6.5 6.5 0 0 1 -13.0 0v-37.2a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus a1-dim\" d=\"M128.5 106.3h0.0a6.5 6.5 0 0 1 6.5 6.5v40.7a6.5 6.5 0 0 1 -13.0 0v-40.7a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus\" d=\"M168.5 111.0h0.0a6.5 6.5 0 0 1 6.5 6.5v36.0a6.5 6.5 0 0 1 -13.0 0v-36.0a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus\" d=\"M188.5 113.9h0.0a6.5 6.5 0 0 1 6.5 6.5v33.1a6.5 6.5 0 0 1 -13.0 0v-33.1a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus\" d=\"M208.5 112.4h0.0a6.5 6.5 0 0 1 6.5 6.5v34.6a6.5 6.5 0 0 1 -13.0 0v-34.6a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus\" d=\"M228.5 108.2h0.0a6.5 6.5 0 0 1 6.5 6.5v38.8a6.5 6.5 0 0 1 -13.0 0v-38.8a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus\" d=\"M248.5 106.0h0.0a6.5 6.5 0 0 1 6.5 6.5v41.0a6.5 6.5 0 0 1 -13.0 0v-41.0a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus\" d=\"M268.5 108.3h0.0a6.5 6.5 0 0 1 6.5 6.5v38.7a6.5 6.5 0 0 1 -13.0 0v-38.7a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus\" d=\"M288.5 112.5h0.0a6.5 6.5 0 0 1 6.5 6.5v34.5a6.5 6.5 0 0 1 -13.0 0v-34.5a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus\" d=\"M308.5 113.9h0.0a6.5 6.5 0 0 1 6.5 6.5v33.1a6.5 6.5 0 0 1 -13.0 0v-33.1a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus\" d=\"M328.5 111.0h0.0a6.5 6.5 0 0 1 6.5 6.5v36.0a6.5 6.5 0 0 1 -13.0 0v-36.0a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus\" d=\"M348.5 106.9h0.0a6.5 6.5 0 0 1 6.5 6.5v40.1a6.5 6.5 0 0 1 -13.0 0v-40.1a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus\" d=\"M368.5 106.4h0.0a6.5 6.5 0 0 1 6.5 6.5v40.6a6.5 6.5 0 0 1 -13.0 0v-40.6a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus\" d=\"M388.5 109.9h0.0a6.5 6.5 0 0 1 6.5 6.5v37.1a6.5 6.5 0 0 1 -13.0 0v-37.1a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus\" d=\"M408.5 113.5h0.0a6.5 6.5 0 0 1 6.5 6.5v33.5a6.5 6.5 0 0 1 -13.0 0v-33.5a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus\" d=\"M428.5 113.2h0.0a6.5 6.5 0 0 1 6.5 6.5v33.8a6.5 6.5 0 0 1 -13.0 0v-33.8a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus a1-dim\" d=\"M448.5 109.3h0.0a6.5 6.5 0 0 1 6.5 6.5v37.7a6.5 6.5 0 0 1 -13.0 0v-37.7a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus a1-dim\" d=\"M468.5 106.2h0.0a6.5 6.5 0 0 1 6.5 6.5v40.8a6.5 6.5 0 0 1 -13.0 0v-40.8a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus a1-dim\" d=\"M488.5 107.3h0.0a6.5 6.5 0 0 1 6.5 6.5v39.7a6.5 6.5 0 0 1 -13.0 0v-39.7a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus a1-dim\" d=\"M508.5 111.5h0.0a6.5 6.5 0 0 1 6.5 6.5v35.5a6.5 6.5 0 0 1 -13.0 0v-35.5a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus a1-dim\" d=\"M528.5 114.0h0.0a6.5 6.5 0 0 1 6.5 6.5v33.0a6.5 6.5 0 0 1 -13.0 0v-33.0a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus a1-dim\" d=\"M548.5 112.0h0.0a6.5 6.5 0 0 1 6.5 6.5v35.0a6.5 6.5 0 0 1 -13.0 0v-35.0a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus a1-dim\" d=\"M568.5 107.8h0.0a6.5 6.5 0 0 1 6.5 6.5v39.2a6.5 6.5 0 0 1 -13.0 0v-39.2a6.5 6.5 0 0 1 6.5 -6.5Z\"/></g><path class=\"a1-cell a1-dim\" d=\"M-10.0 149.4C-6.1 141.7 7.1 150.8 15.7 150.8C24.2 150.8 32.8 149.4 41.3 149.4C49.9 149.4 58.4 150.8 67.0 150.8C75.6 150.8 84.1 149.4 92.7 149.4C101.2 149.4 109.8 150.8 118.3 150.8C126.9 150.8 139.3 141.7 144.0 149.4C148.7 157.1 146.7 181.4 146.7 197.3C146.8 213.1 145.3 228.8 144.4 244.5C143.6 260.3 142.3 276.0 141.7 291.8C141.2 307.5 140.9 323.3 141.1 339.0C141.4 354.8 142.4 370.5 143.2 386.3C144.0 402.0 145.3 417.8 146.0 433.5C146.6 449.3 148.6 464.7 147.0 480.8C145.3 496.8 140.8 521.7 136.0 530.0C131.2 538.3 125.6 530.7 118.3 530.5C111.1 530.3 101.2 529.0 92.7 529.0C84.1 529.0 75.6 530.5 67.0 530.5C58.4 530.5 49.9 529.0 41.3 529.0C32.8 529.0 22.9 530.3 15.7 530.5C8.4 530.7 2.6 538.3 -2.0 530.0C-6.6 521.7 -10.8 496.8 -11.9 480.8C-12.9 464.7 -9.0 449.3 -8.2 433.5C-7.5 417.8 -6.9 402.0 -7.2 386.3C-7.5 370.5 -9.3 354.8 -10.2 339.0C-11.2 323.3 -12.8 307.5 -12.9 291.8C-13.1 276.0 -12.2 260.3 -11.3 244.5C-10.5 228.8 -8.0 213.1 -7.8 197.3C-7.5 181.4 -13.9 157.1 -10.0 149.4Z\"/><path class=\"a1-cell a1-dim\" d=\"M456.0 149.4C460.7 141.7 473.1 150.8 481.7 150.8C490.2 150.8 498.8 149.4 507.3 149.4C515.9 149.4 524.4 150.8 533.0 150.8C541.6 150.8 550.1 149.4 558.7 149.4C567.2 149.4 575.8 150.8 584.3 150.8C592.9 150.8 606.1 141.7 610.0 149.4C613.9 157.1 608.2 181.4 607.7 197.3C607.3 213.1 606.9 228.8 607.1 244.5C607.4 260.3 608.4 276.0 609.2 291.8C610.0 307.5 611.3 323.3 612.0 339.0C612.6 354.8 613.1 370.5 613.0 386.3C612.8 402.0 612.0 417.8 611.2 433.5C610.5 449.3 609.9 464.7 608.4 480.8C606.8 496.8 606.0 521.7 602.0 530.0C598.0 538.3 591.6 530.7 584.3 530.5C577.1 530.3 567.2 529.0 558.7 529.0C550.1 529.0 541.6 530.5 533.0 530.5C524.4 530.5 515.9 529.0 507.3 529.0C498.8 529.0 488.9 530.3 481.7 530.5C474.4 530.7 468.5 538.3 464.0 530.0C459.5 521.7 456.5 496.8 454.7 480.8C452.8 464.7 452.9 449.3 453.1 433.5C453.2 417.8 454.8 402.0 455.8 386.3C456.7 370.5 458.5 354.8 458.8 339.0C459.1 323.3 458.5 307.5 457.7 291.8C456.9 276.0 454.9 260.3 454.1 244.5C453.4 228.8 452.9 213.1 453.3 197.3C453.6 181.4 451.3 157.1 456.0 149.4Z\"/><path class=\"a1-cell\" d=\"M150.0 149.4C157.8 141.7 183.3 150.8 200.0 150.8C216.7 150.8 233.3 149.4 250.0 149.4C266.7 149.4 283.3 150.8 300.0 150.8C316.7 150.8 333.3 149.4 350.0 149.4C366.7 149.4 383.3 150.8 400.0 150.8C416.7 150.8 441.2 141.7 450.0 149.4C458.8 157.1 452.6 181.4 453.0 197.3C453.3 213.1 452.6 228.8 452.0 244.5C451.4 260.3 450.0 276.0 449.2 291.8C448.4 307.5 447.4 323.3 447.1 339.0C446.9 354.8 447.1 370.5 447.7 386.3C448.2 402.0 449.5 417.8 450.3 433.5C451.2 449.3 454.1 464.7 452.7 480.8C451.3 496.8 450.8 521.7 442.0 530.0C433.2 538.3 415.3 530.7 400.0 530.5C384.7 530.3 366.7 529.0 350.0 529.0C333.3 529.0 316.7 530.5 300.0 530.5C283.3 530.5 266.7 529.0 250.0 529.0C233.3 529.0 215.3 530.3 200.0 530.5C184.7 530.7 166.4 538.3 158.0 530.0C149.6 521.7 150.6 496.8 149.8 480.8C148.9 464.7 152.5 449.3 152.8 433.5C153.1 417.8 152.5 402.0 151.7 386.3C150.9 370.5 148.9 354.8 148.1 339.0C147.4 323.3 146.9 307.5 147.3 291.8C147.6 276.0 149.5 260.3 150.4 244.5C151.4 228.8 153.0 213.1 153.0 197.3C152.9 181.4 142.2 157.1 150.0 149.4Z\"/><path class=\"a1-web\" d=\"M160.0 159.0C174.0 158.7 272.0 162.0 300.0 162.0C328.0 162.0 426.0 158.7 440.0 159.0C454.0 159.3 454.0 164.1 440.0 165.0C426.0 165.9 328.0 168.0 300.0 168.0C272.0 168.0 174.0 165.9 160.0 165.0C146.0 164.1 146.0 159.3 160.0 159.0Z\"/><path class=\"a1-junction\" d=\"M147.0 152.0h0.0a2.5 2.5 0 0 1 2.5 2.5v13.0a2.5 2.5 0 0 1 -5.0 0v-13.0a2.5 2.5 0 0 1 2.5 -2.5Z\"/><path class=\"a1-junction\" d=\"M453.0 152.0h0.0a2.5 2.5 0 0 1 2.5 2.5v13.0a2.5 2.5 0 0 1 -5.0 0v-13.0a2.5 2.5 0 0 1 2.5 -2.5Z\"/><g class=\"a1-dmt1\"><path d=\"M165.4 111.0h0.0a2.3 2.3 0 0 1 2.3 2.3v7.4a2.3 2.3 0 0 1 -4.6 0v-7.4a2.3 2.3 0 0 1 2.3 -2.3Z\"/><path d=\"M171.6 111.0h0.0a2.3 2.3 0 0 1 2.3 2.3v7.4a2.3 2.3 0 0 1 -4.6 0v-7.4a2.3 2.3 0 0 1 2.3 -2.3Z\"/></g><g class=\"a1-dmt1\"><path d=\"M225.4 108.2h0.0a2.3 2.3 0 0 1 2.3 2.3v7.4a2.3 2.3 0 0 1 -4.6 0v-7.4a2.3 2.3 0 0 1 2.3 -2.3Z\"/><path d=\"M231.6 108.2h0.0a2.3 2.3 0 0 1 2.3 2.3v7.4a2.3 2.3 0 0 1 -4.6 0v-7.4a2.3 2.3 0 0 1 2.3 -2.3Z\"/></g><g class=\"a1-dmt1\"><path d=\"M285.4 112.5h0.0a2.3 2.3 0 0 1 2.3 2.3v7.4a2.3 2.3 0 0 1 -4.6 0v-7.4a2.3 2.3 0 0 1 2.3 -2.3Z\"/><path d=\"M291.6 112.5h0.0a2.3 2.3 0 0 1 2.3 2.3v7.4a2.3 2.3 0 0 1 -4.6 0v-7.4a2.3 2.3 0 0 1 2.3 -2.3Z\"/></g><g class=\"a1-dmt1\"><path d=\"M345.4 106.9h0.0a2.3 2.3 0 0 1 2.3 2.3v7.4a2.3 2.3 0 0 1 -4.6 0v-7.4a2.3 2.3 0 0 1 2.3 -2.3Z\"/><path d=\"M351.6 106.9h0.0a2.3 2.3 0 0 1 2.3 2.3v7.4a2.3 2.3 0 0 1 -4.6 0v-7.4a2.3 2.3 0 0 1 2.3 -2.3Z\"/></g><g class=\"a1-dmt1\"><path d=\"M405.4 113.5h0.0a2.3 2.3 0 0 1 2.3 2.3v7.4a2.3 2.3 0 0 1 -4.6 0v-7.4a2.3 2.3 0 0 1 2.3 -2.3Z\"/><path d=\"M411.6 113.5h0.0a2.3 2.3 0 0 1 2.3 2.3v7.4a2.3 2.3 0 0 1 -4.6 0v-7.4a2.3 2.3 0 0 1 2.3 -2.3Z\"/></g><path class=\"a1-mito\" d=\"M218.7 380.0C218.8 381.8 217.0 384.1 214.2 385.4C211.5 386.8 206.6 387.5 202.4 388.0C198.2 388.6 193.1 389.3 189.0 388.8C184.9 388.4 180.1 386.9 177.7 385.4C175.3 384.0 174.5 381.8 174.7 380.0C174.8 378.2 176.3 376.4 178.6 374.8C181.0 373.3 184.8 371.4 188.8 370.9C192.8 370.4 198.5 371.0 202.6 371.7C206.7 372.4 210.7 373.5 213.3 374.8C216.0 376.2 218.5 378.2 218.7 380.0Z\"/><path class=\"a1-mito-in\" d=\"M210.5 380.0C210.3 380.8 208.4 381.6 206.7 382.1C204.9 382.7 202.4 382.9 199.8 383.2C197.2 383.6 193.4 384.4 191.1 384.2C188.7 384.0 187.0 382.8 185.6 382.1C184.3 381.4 183.4 380.7 183.2 380.0C183.0 379.3 183.2 378.4 184.6 377.7C185.9 377.0 188.8 376.1 191.3 376.0C193.8 375.9 196.8 376.7 199.5 377.0C202.2 377.3 205.9 377.1 207.7 377.6C209.5 378.1 210.7 379.2 210.5 380.0Z\"/><path class=\"a1-mito\" d=\"M424.5 372.0C424.4 373.8 422.4 375.9 420.0 377.2C417.5 378.6 413.7 379.5 409.9 380.2C406.1 380.8 401.0 381.7 397.4 381.1C393.8 380.6 390.4 378.7 388.2 377.2C386.1 375.6 384.6 373.8 384.5 372.0C384.4 370.2 385.4 368.1 387.6 366.6C389.8 365.1 393.9 363.5 397.5 363.1C401.2 362.6 405.9 363.4 409.8 364.0C413.6 364.6 418.1 365.2 420.6 366.6C423.1 367.9 424.6 370.2 424.5 372.0Z\"/><path class=\"a1-mito-in\" d=\"M417.5 372.0C417.1 372.7 413.7 373.1 412.2 373.8C410.6 374.5 410.3 375.7 408.3 376.0C406.3 376.4 402.4 376.0 400.1 375.6C397.8 375.3 395.6 374.7 394.4 374.1C393.1 373.5 393.0 372.8 392.7 372.0C392.3 371.2 390.8 369.9 392.1 369.4C393.4 368.8 398.0 369.0 400.6 368.9C403.3 368.7 405.5 368.3 407.8 368.5C410.1 368.6 412.8 369.1 414.4 369.7C416.0 370.3 417.8 371.3 417.5 372.0Z\"/><path class=\"a1-mito\" d=\"M268.6 196.0C268.4 197.5 265.6 199.0 263.4 200.3C261.3 201.7 259.0 203.5 255.9 204.0C252.7 204.6 247.8 204.2 244.4 203.7C241.0 203.1 237.6 201.9 235.7 200.6C233.7 199.4 232.9 197.6 232.6 196.0C232.4 194.4 232.3 192.1 234.3 190.9C236.3 189.7 241.2 189.2 244.7 188.8C248.3 188.4 252.2 188.0 255.5 188.4C258.9 188.8 262.6 190.0 264.8 191.2C267.0 192.5 268.9 194.5 268.6 196.0Z\"/><path class=\"a1-mito-in\" d=\"M260.0 196.0C259.8 196.7 259.7 197.3 258.7 197.9C257.7 198.5 255.8 199.3 253.8 199.5C251.8 199.8 248.6 199.4 246.6 199.1C244.6 198.8 243.5 198.3 242.0 197.8C240.5 197.2 237.9 196.6 237.7 196.0C237.5 195.4 239.1 194.4 240.6 194.0C242.2 193.5 244.8 193.4 246.9 193.2C249.1 193.0 251.3 192.6 253.5 192.8C255.7 192.9 259.0 193.3 260.1 193.8C261.1 194.3 260.3 195.3 260.0 196.0Z\"/><path class=\"a1-mito\" d=\"M380.2 300.0C380.0 301.6 379.2 303.3 377.1 304.6C375.1 306.0 371.6 307.5 368.1 308.0C364.6 308.4 359.6 308.1 356.2 307.6C352.7 307.0 349.7 305.7 347.4 304.5C345.0 303.2 342.4 301.5 342.2 300.0C342.0 298.5 344.0 296.4 346.4 295.2C348.8 294.0 352.8 293.2 356.4 292.7C360.0 292.3 364.3 291.9 367.9 292.3C371.5 292.7 376.0 293.8 378.1 295.1C380.1 296.4 380.4 298.4 380.2 300.0Z\"/><path class=\"a1-mito-in\" d=\"M371.7 300.0C371.8 300.7 373.8 301.7 372.8 302.2C371.7 302.8 368.1 303.1 365.7 303.2C363.3 303.4 360.7 303.3 358.6 303.0C356.4 302.8 354.8 302.4 353.1 301.8C351.3 301.3 348.0 300.6 348.2 300.0C348.3 299.4 352.0 298.8 353.7 298.3C355.4 297.8 356.4 297.1 358.4 296.8C360.4 296.6 363.5 296.5 365.8 296.6C368.1 296.8 371.2 297.3 372.1 297.9C373.1 298.5 371.6 299.3 371.7 300.0Z\"/><path class=\"a1-nucleus\" d=\"M377.2 440.0C377.1 447.7 372.9 456.8 366.1 463.1C359.3 469.4 347.3 474.0 336.3 478.0C325.3 482.1 312.5 486.8 300.0 487.2C287.5 487.6 272.0 484.8 261.2 480.7C250.4 476.6 241.2 469.4 235.2 462.6C229.2 455.9 225.3 447.6 225.2 440.0C225.1 432.4 228.6 424.0 234.5 417.1C240.3 410.2 249.4 402.0 260.3 398.4C271.2 394.7 287.2 394.8 300.0 395.2C312.8 395.6 326.0 397.4 337.2 401.0C348.3 404.6 360.2 410.1 366.9 416.6C373.5 423.1 377.3 432.3 377.2 440.0Z\"/><path class=\"a1-nucleolus\" d=\"M332.6 432.0C332.6 434.5 333.0 437.7 331.1 439.5C329.1 441.3 324.2 442.6 320.8 442.9C317.4 443.1 313.6 442.1 310.5 441.0C307.4 439.8 303.3 438.1 302.1 436.0C300.9 433.9 301.8 430.5 303.1 428.3C304.5 426.1 307.3 423.9 310.2 422.7C313.1 421.5 317.4 420.8 320.8 421.1C324.2 421.4 328.9 422.8 330.9 424.6C332.8 426.4 332.6 429.5 332.6 432.0Z\"/><g class=\"a1-ferritin\"><circle class=\"a1-core\" cx=\"214\" cy=\"248\" r=\"11\"/><circle cx=\"229.0\" cy=\"248.0\" r=\"2.6\"/><circle cx=\"228.5\" cy=\"251.9\" r=\"2.6\"/><circle cx=\"227.0\" cy=\"255.5\" r=\"2.6\"/><circle cx=\"224.6\" cy=\"258.6\" r=\"2.6\"/><circle cx=\"221.5\" cy=\"261.0\" r=\"2.6\"/><circle cx=\"217.9\" cy=\"262.5\" r=\"2.6\"/><circle cx=\"214.0\" cy=\"263.0\" r=\"2.6\"/><circle cx=\"210.1\" cy=\"262.5\" r=\"2.6\"/><circle cx=\"206.5\" cy=\"261.0\" r=\"2.6\"/><circle cx=\"203.4\" cy=\"258.6\" r=\"2.6\"/><circle cx=\"201.0\" cy=\"255.5\" r=\"2.6\"/><circle cx=\"199.5\" cy=\"251.9\" r=\"2.6\"/><circle cx=\"199.0\" cy=\"248.0\" r=\"2.6\"/><circle cx=\"199.5\" cy=\"244.1\" r=\"2.6\"/><circle cx=\"201.0\" cy=\"240.5\" r=\"2.6\"/><circle cx=\"203.4\" cy=\"237.4\" r=\"2.6\"/><circle cx=\"206.5\" cy=\"235.0\" r=\"2.6\"/><circle cx=\"210.1\" cy=\"233.5\" r=\"2.6\"/><circle cx=\"214.0\" cy=\"233.0\" r=\"2.6\"/><circle cx=\"217.9\" cy=\"233.5\" r=\"2.6\"/><circle cx=\"221.5\" cy=\"235.0\" r=\"2.6\"/><circle cx=\"224.6\" cy=\"237.4\" r=\"2.6\"/><circle cx=\"227.0\" cy=\"240.5\" r=\"2.6\"/><circle cx=\"228.5\" cy=\"244.1\" r=\"2.6\"/><g data-part=\"core0\"></g></g><g class=\"a1-ferritin\"><circle class=\"a1-core\" cx=\"388\" cy=\"236\" r=\"11\"/><circle cx=\"403.0\" cy=\"236.0\" r=\"2.6\"/><circle cx=\"402.5\" cy=\"239.9\" r=\"2.6\"/><circle cx=\"401.0\" cy=\"243.5\" r=\"2.6\"/><circle cx=\"398.6\" cy=\"246.6\" r=\"2.6\"/><circle cx=\"395.5\" cy=\"249.0\" r=\"2.6\"/><circle cx=\"391.9\" cy=\"250.5\" r=\"2.6\"/><circle cx=\"388.0\" cy=\"251.0\" r=\"2.6\"/><circle cx=\"384.1\" cy=\"250.5\" r=\"2.6\"/><circle cx=\"380.5\" cy=\"249.0\" r=\"2.6\"/><circle cx=\"377.4\" cy=\"246.6\" r=\"2.6\"/><circle cx=\"375.0\" cy=\"243.5\" r=\"2.6\"/><circle cx=\"373.5\" cy=\"239.9\" r=\"2.6\"/><circle cx=\"373.0\" cy=\"236.0\" r=\"2.6\"/><circle cx=\"373.5\" cy=\"232.1\" r=\"2.6\"/><circle cx=\"375.0\" cy=\"228.5\" r=\"2.6\"/><circle cx=\"377.4\" cy=\"225.4\" r=\"2.6\"/><circle cx=\"380.5\" cy=\"223.0\" r=\"2.6\"/><circle cx=\"384.1\" cy=\"221.5\" r=\"2.6\"/><circle cx=\"388.0\" cy=\"221.0\" r=\"2.6\"/><circle cx=\"391.9\" cy=\"221.5\" r=\"2.6\"/><circle cx=\"395.5\" cy=\"223.0\" r=\"2.6\"/><circle cx=\"398.6\" cy=\"225.4\" r=\"2.6\"/><circle cx=\"401.0\" cy=\"228.5\" r=\"2.6\"/><circle cx=\"402.5\" cy=\"232.1\" r=\"2.6\"/><g data-part=\"core1\"></g></g><g class=\"a1-ferritin\"><circle class=\"a1-core\" cx=\"300\" cy=\"318\" r=\"11\"/><circle cx=\"315.0\" cy=\"318.0\" r=\"2.6\"/><circle cx=\"314.5\" cy=\"321.9\" r=\"2.6\"/><circle cx=\"313.0\" cy=\"325.5\" r=\"2.6\"/><circle cx=\"310.6\" cy=\"328.6\" r=\"2.6\"/><circle cx=\"307.5\" cy=\"331.0\" r=\"2.6\"/><circle cx=\"303.9\" cy=\"332.5\" r=\"2.6\"/><circle cx=\"300.0\" cy=\"333.0\" r=\"2.6\"/><circle cx=\"296.1\" cy=\"332.5\" r=\"2.6\"/><circle cx=\"292.5\" cy=\"331.0\" r=\"2.6\"/><circle cx=\"289.4\" cy=\"328.6\" r=\"2.6\"/><circle cx=\"287.0\" cy=\"325.5\" r=\"2.6\"/><circle cx=\"285.5\" cy=\"321.9\" r=\"2.6\"/><circle cx=\"285.0\" cy=\"318.0\" r=\"2.6\"/><circle cx=\"285.5\" cy=\"314.1\" r=\"2.6\"/><circle cx=\"287.0\" cy=\"310.5\" r=\"2.6\"/><circle cx=\"289.4\" cy=\"307.4\" r=\"2.6\"/><circle cx=\"292.5\" cy=\"305.0\" r=\"2.6\"/><circle cx=\"296.1\" cy=\"303.5\" r=\"2.6\"/><circle cx=\"300.0\" cy=\"303.0\" r=\"2.6\"/><circle cx=\"303.9\" cy=\"303.5\" r=\"2.6\"/><circle cx=\"307.5\" cy=\"305.0\" r=\"2.6\"/><circle cx=\"310.6\" cy=\"307.4\" r=\"2.6\"/><circle cx=\"313.0\" cy=\"310.5\" r=\"2.6\"/><circle cx=\"314.5\" cy=\"314.1\" r=\"2.6\"/><g data-part=\"core2\"></g></g><rect class=\"a1-lamina\" x=\"0\" y=\"538\" width=\"600\" height=\"5\" rx=\"2.5\"/><rect class=\"a1-blood\" x=\"0\" y=\"560\" width=\"600\" height=\"56\"/><rect class=\"a1-endo\" x=\"0\" y=\"554\" width=\"600\" height=\"6\" rx=\"3\"/><rect class=\"a1-endo\" x=\"0\" y=\"616\" width=\"600\" height=\"6\" rx=\"3\"/><g data-part=\"vesicles\"></g><g data-part=\"fpn\"></g><g data-part=\"blood\"></g><g data-part=\"iron\"></g><g data-part=\"hep\"></g></g></g>\n</svg></div><p class=\"a1-scene\" data-scene>Low iron, low hepcidin: every gate open.</p><span class=\"a1-sr\" role=\"status\" aria-live=\"polite\" data-status></span><div class=\"opt-controls\"><div class=\"opt-seg\" role=\"radiogroup\" aria-label=\"Moment\" data-control=\"scene\"><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"hungry\" aria-checked=\"true\" tabindex=\"0\">Iron-hungry</button><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"pills\" aria-checked=\"false\" tabindex=\"-1\">Daily pills</button><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"full\" aria-checked=\"false\" tabindex=\"-1\">Stores full</button></div></div><div class=\"opt-foot\"><span class=\"opt-hint\">Pick a moment · watch the gates</span><dl class=\"opt-readout\" data-readout aria-hidden=\"true\"><div class=\"opt-stat\" data-stat=\"gate\"><dt>Gut gate</dt><dd data-r=\"gate\">97% open</dd></div><div class=\"opt-stat\" data-stat=\"fpn\"><dt>Ferroportin working</dt><dd data-r=\"fpn\">5 of 5</dd></div></dl></div></div><figcaption class=\"iso-legend\"><span class=\"iso-keys\"><span class=\"iso-key\"><svg class=\"iso-swatch\" data-mark=\"lit\" viewBox=\"0 0 16 10\" aria-hidden=\"true\"><path d=\"M2 4.5 8 1.5 14 4.5 14 6 8 9 2 6Z\"/><path class=\"iso-swatch-crease\" d=\"M2 4.5 8 7.5 14 4.5\"/></svg>Iron</span><span class=\"iso-key\"><svg class=\"iso-swatch\" data-mark=\"heat\" viewBox=\"0 0 16 10\" aria-hidden=\"true\"><path d=\"M1.5 5h13\"/></svg>Hepcidin</span><span class=\"iso-key\"><svg class=\"iso-swatch\" data-mark=\"raised\" viewBox=\"0 0 16 10\" aria-hidden=\"true\"><path d=\"M2 4.5 8 1.5 14 4.5 14 6 8 9 2 6Z\"/><path class=\"iso-swatch-crease\" d=\"M2 4.5 8 7.5 14 4.5\"/></svg>Ferroportin, the way out</span></span><span class=\"iso-caption\"><span class=\"a1-par\">Iron from food crosses the gut through one layer of lining cells. It comes in at the top, through DMT1 channels on the brush border, and leaves at the base through ferroportin, the only known way out of the cell, into the blood, where transferrin carries it away. Iron that can't leave is held in ferritin and lost when the cell is shed a few days later.</span><span class=\"a1-par\">Hepcidin, a hormone from the liver, is the gatekeeper. It docks on ferroportin, plugs it, and makes the cell pull the channel in and break it down. Hepcidin rises after an iron pill and when stores are full, so fewer gates stay open: about 50 % after a week of daily pills and about 45 % two weeks after an IV infusion, against 97 % when iron-hungry.</span><span class=\"a1-par\"><small>The gate shares come from the model in the IV iron figure (Fig 3). Drawn far larger than life and simplified: a real lining cell carries many more, much finer microvilli, channel and particle counts are a drawing, and time is sped up.</small></span></span></figcaption></figure>" + "</div>";
    mount(root.querySelector(".opt-figure"));
  }
}
customElements.define("optimal-fig-gut-cell", Fig);
})();
