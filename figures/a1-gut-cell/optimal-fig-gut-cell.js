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
const GL3_VERSION = 2; // must equal `version` in shared/gl3/src/gl3.js
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
function gl3Attach(fig, { scene, P, W, H, file = "optimal-gl3.js", v = "1", redraw, build = null, island = true } = {}) {
  const stage = fig.querySelector(".iso-stage");
  const svg = stage && stage.querySelector("svg.iso-svg, svg");
  const host = fig.getRootNode() && fig.getRootNode().host;
  let L = null;
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
    render() { if (L) { L.render(); pace(); } },
    stats: () => (L ? L.stats() : null),
  };
  if (!stage || !svg || !scene) return ctl;
  const off = (why) => {
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

// A1 model: the gut cell's iron gate, using Fig 3's hepcidin model so the two figures agree.
// gate = 1 / (1 + hepcidin) is the share of ferroportin left working at the cell's base.
// [n] keys refer to reference/truth-pack.md §3.

const SLOTS = 5; //  ferroportin places drawn on the base (a drawing choice, not a count)
/** Working ferroportins for a gate share (rounded; at least one, since a closed gate is never total). */
const activeOf = (gate) => Math.max(1, Math.round(SLOTS * gate));
/** Hepcidin for a gate share (the inverse of gate = 1 / (1 + H)). */
const hepcidinOf = (gate) => 1 / gate - 1;

// A1 · The gut cell's gate as a real-time 3-D scene, on the shared layer (shared/gl3: "A figure with its own 3-D scene").
//
// The same block the drawing shows, modelled where the drawing puts it. World units are the drawing's: x along the
// section (section x − X0), y back into the lining (the cut front face is y = D), z up (H − section y).
//
//   the lining      five tall cells in the drawing's honeycomb, each a thin-walled cup that is open where the block
//                   is cut (front, right end). What you see through a cut is the cell's inside, veiled with distance
//                   by a "gel" term in the materials, so a cell reads as a body of clear jelly with things floating
//                   in it. Nothing is actually see-through (no sorting, no extra pass). The traced cell is clear,
//                   its neighbours milky.
//   inside it       nucleus, four mitochondria, three ferritin cages (24 subunits on the cage's true 4-3-2 form), the
//                   terminal web. Each sits behind the cut along the line of sight from its place in the drawing,
//                   so it projects exactly where the drawing has it (lift()).
//   on top          the brush border: one capsule per drawn microvillus, DMT1 at the tips the drawing marks.
//   underneath      basement lamina, lamina propria with its collagen and fibroblasts, and the capillary cut along
//                   its length, with red cells and transferrin.
//   what moves      iron, ferroportin, hepcidin, the vesicles, the blood: all placed every frame from the page's
//                   own model state (update()), the same numbers the SVG draws from. Nothing here keeps time or
//                   decides anything: the model in live.js does.
function a1Scene(ctx, DATA, pal) {
  const T = ctx.THREE;
  const { root, night, coarse } = ctx;
  const G = DATA.G;
  const { X0, L, D } = G;
  const HH = DATA.H;
  const ZT = HH - DATA.APICAL; // apical surface
  const ZB = HH - DATA.BASAL; // the cells' base
  const CAPZ = HH - (DATA.CAP.y0 + DATA.CAP.y1) / 2; // the capillary's axis: along x, in the cut plane
  const CAPR = (DATA.CAP.y1 - DATA.CAP.y0) / 2;
  const TAU = Math.PI * 2;
  const AZ = (ctx.P.azimuth * Math.PI) / 180;
  const EL = (ctx.P.elevation * Math.PI) / 180;
  const VD = [Math.cos(AZ) * Math.cos(EL), Math.sin(AZ) * Math.cos(EL), Math.sin(EL)]; // toward the viewer
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mix = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, v) => {
    const t = clamp((v - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  /** A section point pushed `dep` behind the cut face along the line of sight: it still projects where the drawing has it. */
  const lift = (sx, sy, dep, out = [0, 0, 0]) => {
    const s = dep / VD[1];
    out[0] = sx - X0 - s * VD[0];
    out[1] = D - dep;
    out[2] = HH - sy - s * VD[2];
    return out;
  };

  // ---------------------------------------------------------------- palette: the drawing's own inks (figure.css, block.css)
  const FALL = {
    "a1-cell": "#f6e9d8", "a1-cell-2": "#efdfc9", "a1-membrane": "#8a7f70", "a1-nucleus": "#e4d3bd", "a1-nucleolus": "#cdb69a", "a1-mito": "#ead8c2",
    "a1-tissue": "#f8efe2", "a1-blood": "#f6dcd2", "a1-endo": "#e2cdbd", "a1-iron": "#b8641f", "a1-hep": "#d96a47", "a1-fpn": "#2c4e25", "a1-dmt1": "#4a77ab",
    "a1-tf": "#6f93bd", "a1-rbc": "#c9503a", "a1-rbc-in": "#e07a63", "a1-ferritin": "#8a7f70", "b1-lateral": "#d9c6ad", "b1-cell-dim": "#ede3d5",
    "b1-villus-dim": "#e6dccd", "b1-top": "#e3d0b6", "b1-top-main": "#dcc5a7", "b1-v0": "#fbf2e6", "b1-v1": "#efdfc9", "b1-v2": "#d8c3a6", "b1-tip": "#fff8ee",
  };
  const ink = (k) => {
    const c = new T.Color();
    try {
      c.set(/^#[0-9a-f]{3,8}$/i.test(pal[k] || "") ? pal[k] : FALL[k]);
    } catch (_) {
      c.set(FALL[k]);
    }
    return c;
  };
  const blend = (a, b, t) => a.clone().lerp(b, t);
  const gain = (c, k) => c.clone().multiplyScalar(k);
  const rich = (c, k) => {
    const h = { h: 0, s: 0, l: 0 };
    c.getHSL(h);
    return c.clone().setHSL(h.h, Math.min(1, h.s * k), h.l);
  };
  const K = {};
  for (const k of Object.keys(FALL)) K[k.replace(/^[ab]1-/, "").replace(/-/g, "_")] = ink(k);
  // Rendered surfaces are lit, so the inks sit a little deeper than the flat fills (a lit cream reads as the drawing's cream).
  const TONE = night ? 1.5 : 0.86;
  const C = {
    gel: gain(rich(K.cell, night ? 1 : 1.45), night ? 1.25 : 0.87),
    gelDim: gain(rich(K.cell_dim, night ? 1 : 1.2), night ? 1.25 : 0.84),
    wall: gain(blend(K.cell_2, K.lateral, 0.5), night ? 1.4 : 0.74),
    wallDim: gain(blend(K.cell_dim, K.lateral, 0.6), night ? 1.3 : 0.72),
    rim: gain(blend(K.membrane, K.cell, night ? 0.25 : 0.22), night ? 1.3 : 0.9),
    rimDim: gain(blend(K.membrane, K.cell_dim, night ? 0.4 : 0.36), night ? 1.2 : 0.9),
    lateral: gain(K.lateral, night ? 1.1 : 0.84),
    junction: gain(blend(K.membrane, K.lateral, night ? 0.3 : 0.12), night ? 1.1 : 0.92),
    top: gain(K.top, TONE),
    topMain: gain(K.top_main, TONE),
    web: gain(blend(K.cell_2, K.lateral, night ? 0.45 : 0.75), night ? 1.5 : 0.72),
    webDim: gain(blend(K.cell_dim, K.lateral, night ? 0.5 : 0.7), night ? 1.35 : 0.72),
    villusTip: gain(K.tip, night ? 1.7 : 0.86),
    villus: gain(rich(K.v1, night ? 1 : 1.15), night ? 1.6 : 0.8),
    villusRoot: gain(K.v2, night ? 1.5 : 0.72),
    villusDim: gain(K.villus_dim, night ? 1.5 : 0.8),
    nucleus: gain(rich(K.nucleus, night ? 1 : 1.3), night ? 1.5 : 0.68),
    nucleolus: gain(K.nucleolus, night ? 1.5 : 0.5),
    mito: gain(rich(blend(K.mito, K.nucleolus, night ? 0 : 0.55), night ? 1 : 1.35), night ? 1.55 : 0.68),
    mitoBand: gain(blend(K.mito, K.membrane, 0.6), night ? 1.4 : 0.62),
    ferritin: gain(K.ferritin, night ? 1.15 : 0.8),
    tissue: gain(K.tissue, night ? 1.35 : 0.9),
    lamina: gain(K.endo, night ? 1.3 : 0.86),
    collagen: gain(blend(K.tissue, K.membrane, 0.5), night ? 1.3 : 0.9),
    endo: gain(K.endo, night ? 1.4 : 0.9),
    blood: gain(blend(K.blood, K.rbc, night ? 0.1 : 0.07), night ? 1.5 : 0.92),
    iron: K.iron.clone(),
    hep: K.hep.clone(),
    fpn: K.fpn.clone(),
    dmt1: K.dmt1.clone(),
    tf: K.tf.clone(),
    rbc: K.rbc.clone(),
    rbcIn: K.rbc_in.clone(),
    sheen: night ? new T.Color("#bfe0b4") : new T.Color("#fff1e2"),
  };

  // ---------------------------------------------------------------- materials
  const mats = [];
  const phys = (o) => {
    const m = new T.MeshPhysicalMaterial({ metalness: 0, ...o });
    mats.push(m);
    return m;
  };
  const flesh = (o) => phys({ roughness: 0.58, sheen: 0.55, sheenRoughness: 0.5, sheenColor: C.sheen, clearcoat: 0.2, clearcoatRoughness: 0.42, ...o });
  // The gel: what is seen through a cut is veiled by how far the line of sight ran inside the cell (it left through
  // the front cut or the end cut, whichever comes first). Kit coordinates come from the world position through uKit.
  const U = {
    kit: { value: new T.Matrix4() },
    view: { value: new T.Vector3(VD[0], VD[1], VD[2]) },
    cut: { value: new T.Vector4(D, L, ZB, ZT) },
  };
  let gelN = 0;
  function gel(m, { sigma = 0, color = C.gel, max = 0.94, attr = false, clip = false, fog = true, edge = 0 } = {}) {
    const u = { uA1Kit: U.kit, uA1View: U.view, uA1Cut: U.cut, uA1Gel: { value: new T.Vector4(color.r, color.g, color.b, max) }, uA1Sigma: { value: sigma } };
    m.userData.gel = u;
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, u);
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", `#include <common>\nuniform mat4 uA1Kit;\nvarying vec3 vA1Kit;\n${attr ? "attribute float aFog;\nvarying float vA1Fog;\n" : ""}`)
        .replace(
          "#include <project_vertex>",
          `#include <project_vertex>\n{ vec4 a1p = vec4( transformed, 1.0 );\n#ifdef USE_INSTANCING\na1p = instanceMatrix * a1p;\n#endif\nvA1Kit = ( uA1Kit * ( modelMatrix * a1p ) ).xyz; }\n${attr ? "vA1Fog = aFog;\n" : ""}`,
        );
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", `#include <common>\nuniform vec3 uA1View;\nuniform vec4 uA1Cut;\nuniform vec4 uA1Gel;\nuniform float uA1Sigma;\nvarying vec3 vA1Kit;\n${attr ? "varying float vA1Fog;\n" : ""}`)
        .replace("#include <clipping_planes_fragment>", `${clip ? "if ( vA1Kit.x < 0.0 || vA1Kit.x > uA1Cut.y ) discard;\n" : ""}#include <clipping_planes_fragment>`)
        .replace(
          "#include <opaque_fragment>",
          `#include <opaque_fragment>\n${edge ? `gl_FragColor.rgb *= 1.0 - ${edge.toFixed(3)} * pow( 1.0 - saturate( dot( normal, normalize( vViewPosition ) ) ), 2.0 );\n` : ""}${
            fog
              ? `{ float a1s = max( min( ( uA1Cut.x - vA1Kit.y ) / uA1View.y, ( uA1Cut.y - vA1Kit.x ) / uA1View.x ), 0.0 );
float a1in = step( uA1Cut.z, vA1Kit.z ) * step( vA1Kit.z, uA1Cut.w );
float a1f = ( 1.0 - exp( - ${attr ? "vA1Fog" : "uA1Sigma"} * a1s ) ) * a1in * uA1Gel.a;
vec3 a1e = vA1Kit + uA1View * a1s;
float a1m = sin( a1e.x * 0.023 + a1e.y * 0.031 + 1.7 * sin( a1e.z * 0.017 ) ) * sin( a1e.z * 0.021 + 0.9 * sin( a1e.x * 0.019 + a1e.y * 0.013 ) );
vec3 a1g = uA1Gel.rgb * ( 0.86 + 0.2 * smoothstep( uA1Cut.z, uA1Cut.w, a1e.z ) + 0.035 * a1m );
gl_FragColor.rgb = mix( gl_FragColor.rgb, a1g, a1f ); }`
              : ""
          }`,
        );
    };
    const key = `a1gel${attr ? "a" : ""}${clip ? "c" : ""}${fog ? "f" : ""}${edge ? "e" : ""}${gelN++}`;
    m.customProgramCacheKey = () => key;
    return m;
  }
  const SIG = night ? 0.0075 : 0.0068; // the traced cell: clear
  const SIG_DIM = night ? 0.03 : 0.022; // its neighbours: milky
  // The cells' own inner walls veil faster than what floats in them, so a cut shows a body of gel with a soft edge
  // under the membrane, not the inside of an empty box.
  const SIG_WALL = 0.024;
  const SIG_WALL_DIM = 0.055;

  // ---------------------------------------------------------------- geometry kit
  const SEG = coarse ? 0.6 : 1; // phones: about half the triangles
  const seg = (n, min = 4) => Math.max(min, Math.round(n * SEG));
  const geoOf = (pos, idx) => {
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
    if (idx) g.setIndex(idx);
    return g;
  };
  const smoothGeo = (pos, idx) => {
    const g = geoOf(pos, idx);
    g.computeVertexNormals();
    return g;
  };
  /** A unit ball with no seam (shared vertices all round, one at each pole). */
  function ballData(nu, nv) {
    const pos = [0, 0, 1];
    const idx = [];
    for (let j = 1; j < nv; j++) {
      const t = (j / nv) * Math.PI;
      for (let i = 0; i < nu; i++) {
        const p = (i / nu) * TAU;
        pos.push(Math.sin(t) * Math.cos(p), Math.sin(t) * Math.sin(p), Math.cos(t));
      }
    }
    pos.push(0, 0, -1);
    const last = pos.length / 3 - 1;
    const at = (j, i) => 1 + (j - 1) * nu + (i % nu);
    for (let i = 0; i < nu; i++) {
      idx.push(0, at(1, i), at(1, i + 1));
      idx.push(last, at(nv - 1, i + 1), at(nv - 1, i));
    }
    for (let j = 1; j < nv - 1; j++)
      for (let i = 0; i < nu; i++) {
        const a = at(j, i);
        const b = at(j, i + 1);
        const c = at(j + 1, i);
        const d = at(j + 1, i + 1);
        idx.push(a, c, d, a, d, b);
      }
    return { pos, idx };
  }
  const ballGeo = (nu, nv, r = 1) => {
    const b = ballData(nu, nv);
    for (let i = 0; i < b.pos.length; i++) b.pos[i] *= r;
    return smoothGeo(b.pos, b.idx);
  };
  /** A body of revolution about z with no seam. profile: [[r, z]…] bottom to top (r = 0 makes a pole). */
  function latheData(profile, nu) {
    const pos = [];
    const idx = [];
    const start = [];
    for (const [r, z] of profile) {
      start.push(pos.length / 3);
      if (r < 1e-6) pos.push(0, 0, z);
      else for (let i = 0; i < nu; i++) pos.push(r * Math.cos((i / nu) * TAU), r * Math.sin((i / nu) * TAU), z);
    }
    for (let j = 0; j < profile.length - 1; j++) {
      const pa = profile[j][0] < 1e-6;
      const pb = profile[j + 1][0] < 1e-6;
      if (pa && pb) continue;
      for (let i = 0; i < nu; i++) {
        const i2 = (i + 1) % nu;
        if (pa) idx.push(start[j], start[j + 1] + i2, start[j + 1] + i);
        else if (pb) idx.push(start[j + 1], start[j] + i, start[j] + i2);
        else {
          const a = start[j] + i;
          const b = start[j] + i2;
          const c = start[j + 1] + i;
          const d = start[j + 1] + i2;
          idx.push(a, b, d, a, d, c);
        }
      }
    }
    return { pos, idx };
  }
  const capsuleProfile = (r, len, n) => {
    const p = [[0, -len / 2]];
    for (let i = 1; i <= n; i++) p.push([r * Math.sin((i / n) * (Math.PI / 2)), -len / 2 + r - r * Math.cos((i / n) * (Math.PI / 2))]);
    for (let i = n; i >= 1; i--) p.push([r * Math.sin((i / n) * (Math.PI / 2)), len / 2 - r + r * Math.cos((i / n) * (Math.PI / 2))]);
    p.push([0, len / 2]);
    return p;
  };
  /** A tube along a spine with its own radius at every step (0 at an end closes it to a point). No seam. */
  function sweepData(points, radius, nu, steps, ease = false) {
    const curve = new T.CatmullRomCurve3(points.map((p) => new T.Vector3(p[0], p[1], p[2])), false, "centripetal");
    const FR = 96;
    const fr = curve.computeFrenetFrames(FR, false);
    const pos = [];
    const idx = [];
    const ts = [];
    const p0 = curve.getPointAt(0);
    pos.push(p0.x, p0.y, p0.z);
    for (let j = 1; j < steps; j++) {
      const t = ease ? 0.5 - 0.5 * Math.cos((Math.PI * j) / steps) : j / steps;
      ts.push(t);
      const c = curve.getPointAt(t);
      const f = Math.round(t * FR);
      const N = fr.normals[f];
      const B = fr.binormals[f];
      const r = radius(t);
      for (let i = 0; i < nu; i++) {
        const a = (i / nu) * TAU;
        const ca = Math.cos(a) * r;
        const sa = Math.sin(a) * r;
        pos.push(c.x + N.x * ca + B.x * sa, c.y + N.y * ca + B.y * sa, c.z + N.z * ca + B.z * sa);
      }
    }
    const p1 = curve.getPointAt(1);
    pos.push(p1.x, p1.y, p1.z);
    const last = pos.length / 3 - 1;
    const at = (j, i) => 1 + (j - 1) * nu + (i % nu);
    for (let i = 0; i < nu; i++) {
      idx.push(0, at(1, i + 1), at(1, i));
      idx.push(last, at(steps - 1, i), at(steps - 1, i + 1));
    }
    for (let j = 1; j < steps - 1; j++)
      for (let i = 0; i < nu; i++) {
        const a = at(j, i);
        const b = at(j, i + 1);
        const c = at(j + 1, i);
        const d = at(j + 1, i + 1);
        idx.push(a, b, d, a, d, c);
      }
    return { pos, idx, ts, nu };
  }
  /** Loose triangles with their own normal, colour and gel strength: everything static merges into a few of these. */
  class Soup {
    constructor() {
      this.p = [];
      this.n = [];
      this.c = [];
      this.f = [];
    }
    tri(a, b, c, n, col, fog = 0) {
      let m = n;
      if (!m) {
        const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
        const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
        m = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
        const l = Math.hypot(m[0], m[1], m[2]) || 1;
        m = [m[0] / l, m[1] / l, m[2] / l];
      }
      this.p.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
      for (let i = 0; i < 3; i++) {
        this.n.push(m[0], m[1], m[2]);
        this.c.push(col.r, col.g, col.b);
        this.f.push(fog);
      }
    }
    /** A flat face that must look along `n`: wound to suit. */
    face(pts, n, col, fog = 0) {
      const a = pts[0], b = pts[1], c = pts[2];
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
      const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      const flip = (uy * vz - uz * vy) * n[0] + (uz * vx - ux * vz) * n[1] + (ux * vy - uy * vx) * n[2] < 0;
      for (let i = 1; i < pts.length - 1; i++) (flip ? this.tri(pts[0], pts[i + 1], pts[i], n, col, fog) : this.tri(pts[0], pts[i], pts[i + 1], n, col, fog));
    }
    /** An indexed geometry with normals, taken in as it is, in one colour or (col = null) in its own vertex colours. */
    add(g, col, fog = 0) {
      const P = g.attributes.position.array;
      const N = g.attributes.normal.array;
      const I = g.index.array;
      const own = col ? null : g.attributes.color.array;
      for (let k = 0; k < I.length; k++) {
        const i = I[k] * 3;
        this.p.push(P[i], P[i + 1], P[i + 2]);
        this.n.push(N[i], N[i + 1], N[i + 2]);
        if (own) this.c.push(own[i], own[i + 1], own[i + 2]);
        else this.c.push(col.r, col.g, col.b);
        this.f.push(fog);
      }
      g.dispose();
    }
    /** A polygon [[u, v]…] pushed from w0 to w1; `map` turns (u, v, w) into world x, y, z (default: z up). */
    prism(poly, w0, w1, col, fog = 0, map = (u, v, w) => [u, v, w], caps = true) {
      let P = poly;
      let area = 0;
      for (let i = 0; i < P.length; i++) area += P[i][0] * P[(i + 1) % P.length][1] - P[(i + 1) % P.length][0] * P[i][1];
      if (area < 0) P = P.slice().reverse();
      const n = P.length;
      for (let i = 0; i < n; i++) {
        const a = P[i];
        const b = P[(i + 1) % n];
        if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6) continue;
        const A = map(a[0], a[1], w0), B = map(b[0], b[1], w0), Cc = map(b[0], b[1], w1), Dd = map(a[0], a[1], w1);
        this.tri(A, B, Cc, null, col, fog);
        this.tri(A, Cc, Dd, null, col, fog);
      }
      if (!caps) return;
      const tris = T.ShapeUtils.triangulateShape(P.map((q) => new T.Vector2(q[0], q[1])), []);
      for (const [i, j, k] of tris) {
        const a = P[i], b = P[j], c = P[k];
        const ccw = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) > 0;
        const [q, r] = ccw ? [b, c] : [c, b];
        this.tri(map(a[0], a[1], w1), map(q[0], q[1], w1), map(r[0], r[1], w1), null, col, fog);
        this.tri(map(a[0], a[1], w0), map(r[0], r[1], w0), map(q[0], q[1], w0), null, col, fog);
      }
    }
    geometry() {
      const g = new T.BufferGeometry();
      g.setAttribute("position", new T.Float32BufferAttribute(this.p, 3));
      g.setAttribute("normal", new T.Float32BufferAttribute(this.n, 3));
      g.setAttribute("color", new T.Float32BufferAttribute(this.c, 3));
      g.setAttribute("aFog", new T.Float32BufferAttribute(this.f, 1));
      return g;
    }
  }
  const scene = new T.Group();
  root.add(scene);
  const solid = (g, m, { cast = true, receive = true } = {}) => {
    const mesh = new T.Mesh(g, m);
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    scene.add(mesh);
    return mesh;
  };
  // Instanced meshes hang from a point inside the block: the layer's floor-shadow passes draw an instanced mesh once,
  // at its own origin, and there the block itself covers it.
  const PIVOT = [L / 2, D / 2, 48];
  const dummy = new T.Object3D();
  const QI = new T.Quaternion();
  const instanced = (g, m, n, { dynamic = false, cast = true, receive = true, ghost = false } = {}) => {
    const mesh = new T.InstancedMesh(g, m, n);
    if (ghost) ctx.ghost(mesh); // out of the floor-shadow and occlusion passes (coarse on phones: they would shimmer round small movers)
    mesh.position.set(PIVOT[0], PIVOT[1], PIVOT[2]);
    mesh.frustumCulled = false;
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    if (dynamic) mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    scene.add(mesh);
    return mesh;
  };
  const put = (mesh, i, p, sx = 1, sy = sx, sz = sx, q = QI) => {
    dummy.position.set(p[0] - PIVOT[0], p[1] - PIVOT[1], p[2] - PIVOT[2]);
    dummy.quaternion.copy(q);
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  };

  // ---------------------------------------------------------------- the lining: five cells as cups, open where the block is cut
  const GAP = 3; // half the lateral space between two cells
  const WALL = 2.2; // the membrane's thickness at a cut
  const FILLET = 11; // the rounded base corners of the drawing's cells
  const near = (a, b) => Math.abs(a - b) < 1e-6;
  const kindsOf = (P) =>
    P.map((a, i) => {
      const b = P[(i + 1) % P.length];
      if ((near(a[1], D) && near(b[1], D)) || (near(a[0], L) && near(b[0], L))) return "o"; // open: a cut the viewer sees
      if ((near(a[0], 0) && near(b[0], 0)) || (near(a[1], 0) && near(b[1], 0))) return "h"; // a cut that faces away
      return "i"; // the border with another cell
    });
  function roundPoly(P, kinds, cut = 28, steps = seg(6, 3)) {
    const n = P.length;
    const out = [];
    const ks = [];
    for (let i = 0; i < n; i++) {
      const e0 = (i + n - 1) % n;
      const p = P[i];
      const a = P[e0];
      const b = P[(i + 1) % n];
      if (kinds[e0] === "i" && kinds[i] === "i") {
        const la = Math.hypot(a[0] - p[0], a[1] - p[1]);
        const lb = Math.hypot(b[0] - p[0], b[1] - p[1]);
        const ca = Math.min(cut, la * 0.4);
        const cb = Math.min(cut, lb * 0.4);
        const A = [p[0] + ((a[0] - p[0]) / la) * ca, p[1] + ((a[1] - p[1]) / la) * ca];
        const B = [p[0] + ((b[0] - p[0]) / lb) * cb, p[1] + ((b[1] - p[1]) / lb) * cb];
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          const u = 1 - t;
          out.push([u * u * A[0] + 2 * u * t * p[0] + t * t * B[0], u * u * A[1] + 2 * u * t * p[1] + t * t * B[1]]);
          ks.push(s < steps ? "i" : kinds[i]);
        }
      } else {
        out.push(p);
        ks.push(kinds[i]);
      }
    }
    return { P: out, kinds: ks };
  }
  /** A counter-clockwise polygon moved inward by its own amount on every edge. */
  function insetPoly(P, deltas) {
    const n = P.length;
    const nrm = P.map((a, i) => {
      const b = P[(i + 1) % n];
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const l = Math.hypot(dx, dy) || 1;
      return [-dy / l, dx / l];
    });
    return P.map((p, i) => {
      const e0 = (i + n - 1) % n;
      const n0 = nrm[e0];
      const n1 = nrm[i];
      const d0 = deltas[e0];
      const d1 = deltas[i];
      const det = n0[0] * n1[1] - n0[1] * n1[0];
      if (Math.abs(d0 - d1) < 1e-9 || Math.abs(det) < 1e-3) {
        const k = (d0 + d1) / 2 / Math.max(0.3, 1 + n0[0] * n1[0] + n0[1] * n1[1]);
        return [p[0] + (n0[0] + n1[0]) * k, p[1] + (n0[1] + n1[1]) * k];
      }
      return [p[0] + (d0 * n1[1] - d1 * n0[1]) / det, p[1] + (n0[0] * d1 - n1[0] * d0) / det];
    });
  }
  // the drawing's honeycomb (build.mjs EDGES), in world x: the front row's borders run straight back to a node, the
  // back row sits half a cell over
  const apexL = [DATA.CELL.x0 - 3 - X0, G.HV[0]];
  const apexR = [DATA.CELL.x1 + 3 - X0, G.HV[0]];
  const apexM = [(apexL[0] + apexR[0]) / 2, G.HV[1]];
  const yEdge = G.HV[0] - ((G.HV[0] - G.HV[1]) * (L - apexR[0])) / G.HX; // where the back border meets either end of the block
  const POLY = {
    FL: [[0, D], [0, yEdge], apexL, [apexL[0], D]],
    M: [[apexL[0], D], apexL, apexM, apexR, [apexR[0], D]],
    FR: [[apexR[0], D], apexR, [L, yEdge], [L, D]],
    BL: [[0, 0], [apexM[0], 0], apexM, apexL, [0, yEdge]],
    BR: [[apexM[0], 0], [L, 0], [L, yEdge], apexR, apexM],
  };
  const CEIL = 3; // the apical membrane, seen at a cut
  const NF = seg(6, 3);
  const NW = seg(8, 4);
  const NT = 3;
  const mainInner = { poly: null, kinds: null };
  function cup(P0, { shell, top, cTop, cRim, cWall, cOut, fog, hollow = true, keep = null, phase = 0 }) {
    const { P, kinds } = roundPoly(P0, kindsOf(P0));
    const n = P.length;
    const base = kinds.map((k) => (k === "i" ? GAP : 0));
    const closed = kinds.map((k) => (k === "o" ? 0 : 1));
    const R = FILLET;
    const rt = 3;
    const zc = ZT - CEIL;
    const wob = (z, u) => 1.5 * Math.sin(z * 0.021 + phase) * Math.sin(Math.PI * u);
    const rings = []; // { zo, fo, zi, fi }
    for (let j = 0; j <= NF; j++) {
      const t = (j / NF) * (Math.PI / 2);
      rings.push({ zo: ZB + R * (1 - Math.cos(t)), fo: R * (1 - Math.sin(t)), zi: ZB + WALL + (R - WALL) * (1 - Math.cos(t)), fi: WALL + (R - WALL) * (1 - Math.sin(t)) });
    }
    for (let j = 1; j <= NW; j++) {
      const u = j / NW;
      const zo = mix(ZB + R, ZT - rt, u);
      const zi = mix(ZB + R, zc - 2, u);
      rings.push({ zo, fo: wob(zo, u), zi, fi: WALL + wob(zi, u) });
    }
    for (let j = 1; j <= NT; j++) {
      const t = (j / NT) * (Math.PI / 2);
      rings.push({ zo: ZT - rt + rt * Math.sin(t), fo: rt * (1 - Math.cos(t)), zi: zc - 2 + 2 * Math.sin(t), fi: WALL + 2 * (1 - Math.cos(t)) });
    }
    const Kn = rings.length;
    const O = rings.map((r) => insetPoly(P, base.map((b, e) => b + closed[e] * r.fo)).map((q) => [q[0], q[1], r.zo]));
    const I = rings.map((r) => insetPoly(P, base.map((b, e) => b + closed[e] * r.fi)).map((q) => [q[0], q[1], r.zi]));
    if (keep) {
      keep.poly = I[NF + 2].map((q) => [q[0], q[1]]);
      keep.kinds = kinds;
    }
    // the outside wall (smooth round the corners), and the top
    const wallOf = (rows, inward) => {
      const pos = [];
      const idx = [];
      for (const row of rows) for (const q of row) pos.push(q[0], q[1], q[2]);
      for (let k = 0; k < Kn - 1; k++)
        for (let i = 0; i < n; i++) {
          if (!closed[i]) continue;
          const j = (i + 1) % n;
          const a = k * n + i, b = k * n + j, c = (k + 1) * n + j, d = (k + 1) * n + i;
          if (inward) idx.push(a, c, b, a, d, c);
          else idx.push(a, b, c, a, c, d);
        }
      return { pos, idx };
    };
    const capOf = (row) => T.ShapeUtils.triangulateShape(row.map((q) => new T.Vector2(q[0], q[1])), []).map(([a, b, c]) => {
      const ccw = (row[b][0] - row[a][0]) * (row[c][1] - row[a][1]) - (row[b][1] - row[a][1]) * (row[c][0] - row[a][0]) > 0;
      return ccw ? [a, b, c] : [a, c, b];
    });
    const ow = wallOf(O, false);
    shell.add(smoothGeo(ow.pos, ow.idx), cOut, 0);
    for (const [a, b, c] of capOf(O[Kn - 1])) top.tri(O[Kn - 1][a], O[Kn - 1][b], O[Kn - 1][c], [0, 0, 1], cTop, 0);
    if (!hollow) return;
    // the inside: floor, fillet and walls as one smooth surface; the ceiling apart
    const iw = wallOf(I, true);
    for (const [a, b, c] of capOf(I[0])) iw.idx.push(a, b, c);
    const inner = smoothGeo(iw.pos, iw.idx);
    const nn = inner.attributes.normal.array;
    for (let q = 0; q < nn.length; q += 3) {
      const x = nn[q] * 0.3 + VD[0] * 0.55, y = nn[q + 1] * 0.3 + VD[1] * 0.55, z = nn[q + 2] * 0.3 + VD[2] * 0.55 + 0.28;
      const l = Math.hypot(x, y, z) || 1;
      nn[q] = x / l;
      nn[q + 1] = y / l;
      nn[q + 2] = z / l;
    }
    shell.add(inner, cWall, fog);
    for (const [a, b, c] of capOf(I[Kn - 1])) shell.tri(I[Kn - 1][a], I[Kn - 1][c], I[Kn - 1][b], [0, 0, -1], cWall, fog);
    // the membrane where the cut crosses it: a frame round every open face
    for (let i = 0; i < n; i++) {
      const e0 = (i + n - 1) % n;
      const j = (i + 1) % n;
      if (kinds[i] === "o") {
        const dx = P[j][0] - P[i][0];
        const dy = P[j][1] - P[i][1];
        const l = Math.hypot(dx, dy);
        const nr = [dy / l, -dx / l, 0];
        shell.face([O[0][i], O[0][j], I[0][j], I[0][i]], nr, cRim, 0);
        shell.face([O[Kn - 1][i], O[Kn - 1][j], I[Kn - 1][j], I[Kn - 1][i]], nr, cRim, 0);
      }
      if ((kinds[e0] === "o") !== (kinds[i] === "o")) {
        const e = kinds[i] === "o" ? i : e0;
        const a = P[e];
        const b = P[(e + 1) % n];
        const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const nr = [(b[1] - a[1]) / l, -(b[0] - a[0]) / l, 0];
        for (let k = 0; k < Kn - 1; k++) shell.face([O[k][i], I[k][i], I[k + 1][i], O[k + 1][i]], nr, cRim, 0);
      }
    }
  }
  const soupMain = new Soup();
  const soupDim = new Soup();
  const soupTop = new Soup();
  cup(POLY.M, { shell: soupMain, top: soupTop, cTop: C.topMain, cRim: C.rim, cWall: C.wall, cOut: C.lateral, fog: SIG_WALL, keep: mainInner, phase: 0.4 });
  const dimInner = [{}, {}, {}];
  cup(POLY.FL, { shell: soupDim, top: soupTop, cTop: C.top, cRim: C.rimDim, cWall: C.wallDim, cOut: C.lateral, fog: SIG_WALL_DIM, keep: dimInner[0], phase: 1 });
  cup(POLY.FR, { shell: soupDim, top: soupTop, cTop: C.top, cRim: C.rimDim, cWall: C.wallDim, cOut: C.lateral, fog: SIG_WALL_DIM, keep: dimInner[1], phase: 3 });
  cup(POLY.BR, { shell: soupDim, top: soupTop, cTop: C.top, cRim: C.rimDim, cWall: C.wallDim, cOut: C.lateral, fog: SIG_WALL_DIM, keep: dimInner[2], phase: 2.2 });
  cup(POLY.BL, { shell: soupDim, top: soupTop, cTop: C.top, cRim: C.rimDim, cWall: C.wallDim, cOut: C.lateral, fog: 0, hollow: false, phase: 5 });
  // the terminal web: the dense band under the brush border, across the traced cell
  {
    const web = (inner) => insetPoly(inner.poly, inner.kinds.map((k) => (k === "o" ? 0.6 : 0.4))); // wall to wall: a layer of the cell, not a shelf in it
    soupMain.prism(web(mainInner), HH - G.web[3], HH - G.web[2], C.web, SIG_WALL);
    for (const inner of dimInner) soupDim.prism(web(inner), HH - G.web[3], HH - G.web[2], C.webDim, SIG_WALL_DIM); // every lining cell has one; the drawing shows the neighbour's on the end face
  }
  // between the cells: the lateral space, and the tight-junction belt that closes it under the brush border
  {
    const JZ = ZT - 20;
    const seen = new Set();
    const strip = (a, b, w, z0, z1, col, trim) => {
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const l = Math.hypot(dx, dy);
      const ux = dx / l, uy = dy / l;
      const open = (p) => near(p[1], D) || near(p[0], L);
      const A = open(a) ? [a[0] + ux * trim, a[1] + uy * trim] : a;
      const B = open(b) ? [b[0] - ux * trim, b[1] - uy * trim] : b;
      const px = -uy * (w / 2), py = ux * (w / 2);
      soupDim.prism([[A[0] - px, A[1] - py], [B[0] - px, B[1] - py], [B[0] + px, B[1] + py], [A[0] + px, A[1] + py]], z0, z1, col, 0);
    };
    for (const P0 of Object.values(POLY)) {
      const ks = kindsOf(P0);
      P0.forEach((a, i) => {
        if (ks[i] !== "i") return;
        const b = P0[(i + 1) % P0.length];
        const key = [a, b].map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).sort().join("|");
        if (seen.has(key)) return;
        seen.add(key);
        strip(a, b, 5.6, ZB - 5, JZ, C.lateral, 0.7);
        strip(a, b, 7.4, JZ, ZT - 0.9, C.junction, 0.35);
      });
    }
    for (const node of [apexL, apexM, apexR]) {
      const ring = (r) => Array.from({ length: 10 }, (_, i) => [node[0] + r * Math.cos((i / 10) * TAU), node[1] + r * Math.sin((i / 10) * TAU)]);
      soupDim.prism(ring(8), ZB - 5, JZ, C.lateral, 0);
      soupDim.prism(ring(9.5), JZ, ZT - 0.9, C.junction, 0);
    }
  }
  // The cups are drawn as they are, but the shadow and occlusion passes see one plain block in their place (ghost +
  // proxy): a cell is a body of gel, so its inside takes no contact shading, and what stands on a cut face (the
  // gates, the front row of microvilli) is still seated on it.
  const cellMat = (color) => gel(flesh({ vertexColors: true }), { attr: true, color, max: 0.97 });
  for (const [soup, color] of [[soupMain, C.gel], [soupDim, C.gelDim]]) {
    const mesh = ctx.ghost(new T.Mesh(soup.geometry(), cellMat(color)));
    mesh.receiveShadow = false;
    scene.add(mesh);
  }
  solid(soupTop.geometry(), flesh({ vertexColors: true, roughness: 0.62 }));
  {
    const pos = [];
    const nor = [];
    const idx = [];
    const NG = seg(10, 6);
    const pane = (o, eu, ev, w, h, nf) => {
      const base = pos.length / 3;
      for (let j = 0; j <= NG; j++)
        for (let i = 0; i <= NG; i++) {
          const u = i / NG, v = j / NG;
          pos.push(o[0] + eu[0] * u * w + ev[0] * v * h + nf[0] * 0.08, o[1] + eu[1] * u * w + ev[1] * v * h + nf[1] * 0.08, o[2] + eu[2] * u * w + ev[2] * v * h + nf[2] * 0.08);
          const tu = 0.3 * (2 * u - 1);
          const tv = 0.62 * sstep(0.5, 1, v) - 0.25 * (1 - sstep(0, 0.25, v));
          const n = [nf[0] + eu[0] * tu + ev[0] * tv, nf[1] + eu[1] * tu + ev[1] * tv, nf[2] + eu[2] * tu + ev[2] * tv];
          const l = Math.hypot(n[0], n[1], n[2]);
          nor.push(n[0] / l, n[1] / l, n[2] / l);
        }
      for (let j = 0; j < NG; j++)
        for (let i = 0; i < NG; i++) {
          const a = base + j * (NG + 1) + i, b = a + 1, c = a + NG + 1, d = c + 1;
          idx.push(a, b, d, a, d, c);
        }
    };
    const z0 = ZB + 3;
    const hgt = ZT - 4 - z0;
    const m = GAP + WALL;
    pane([L - m, D, z0], [-1, 0, 0], [0, 0, 1], L - apexR[0] - 2 * m + m, hgt, [0, 1, 0]); // right neighbour, front
    pane([apexR[0] - m, D, z0], [-1, 0, 0], [0, 0, 1], apexR[0] - apexL[0] - 2 * m, hgt, [0, 1, 0]); // the traced cell
    pane([apexL[0] - m, D, z0], [-1, 0, 0], [0, 0, 1], apexL[0] - m - WALL, hgt, [0, 1, 0]); // left neighbour
    pane([L, yEdge + m, z0], [0, 1, 0], [0, 0, 1], D - yEdge - m, hgt, [1, 0, 0]); // right neighbour, end
    pane([L, WALL, z0], [0, 1, 0], [0, 0, 1], yEdge - m - WALL, hgt, [1, 0, 0]); // back-row cell, end
    const g = geoOf(pos, idx);
    g.setAttribute("normal", new T.Float32BufferAttribute(nor, 3));
    const gloss = phys({ color: 0x000000, roughness: 0.28, clearcoat: 0.6, clearcoatRoughness: 0.2, transparent: true, blending: T.AdditiveBlending, depthWrite: false, envMapIntensity: night ? 0.55 : 1.25, side: T.DoubleSide });
    const mesh = ctx.ghost(new T.Mesh(g, gloss));
    mesh.receiveShadow = false;
    mesh.renderOrder = 4;
    scene.add(mesh);
  }
  {
    const proxy = new Soup();
    proxy.prism([[0, 0], [L - 0.15, 0], [L - 0.15, D - 0.15], [0, D - 0.15]], ZB - 0.3, ZT - 2, C.gel, 0);
    const unseen = new T.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
    mats.push(unseen);
    solid(proxy.geometry(), unseen, { receive: false });
  }

  // ---------------------------------------------------------------- inside the cells
  const organelle = (sig = SIG, color = C.gel, o = {}) => gel(flesh({ vertexColors: true, roughness: 0.5, clearcoat: 0.3, ...o }), { sigma: sig, color, edge: 0.42 });
  const matIn = organelle();
  const matInDim = organelle(SIG_DIM, C.gelDim);
  const withColor = (g, fn) => {
    const P = g.attributes.position.array;
    const N = g.attributes.normal.array;
    const col = new Float32Array(P.length);
    for (let i = 0; i < P.length; i += 3) {
      const c = fn(P[i], P[i + 1], P[i + 2], N[i], N[i + 1], N[i + 2], i / 3);
      col[i] = c.r;
      col[i + 1] = c.g;
      col[i + 2] = c.b;
    }
    g.setAttribute("color", new T.BufferAttribute(col, 3));
    return g;
  };
  /** A nucleus: an egg with a slow wobble in its surface; cut flat where it crosses a cut plane (xMax, yMax). */
  function nucleusGeo(c, r, wobble, ph, xMax = Infinity, yMax = Infinity, fine = 1) {
    const b = ballData(seg(64 * fine, 24), seg(40 * fine, 16));
    for (let i = 0; i < b.pos.length; i += 3) {
      const x = b.pos[i], y = b.pos[i + 1], z = b.pos[i + 2];
      const w = 1 + wobble * (Math.sin(x * 2.6 + ph) * Math.cos(z * 2.1 + ph * 1.7) + 0.6 * Math.sin(y * 3.1 + z * 1.4 + ph * 2.3));
      b.pos[i] = Math.min(xMax, c[0] + x * r[0] * w);
      b.pos[i + 1] = Math.min(yMax, c[1] + y * r[1] * w);
      b.pos[i + 2] = c[2] + z * r[2] * w;
    }
    return smoothGeo(b.pos, b.idx);
  }
  // the traced cell's nucleus, with its nucleolus showing through the envelope where the drawing has it
  {
    const [sx, sy, rx, rz] = G.nucleus;
    const dep = 54;
    const c = lift(sx, sy, dep);
    const g = nucleusGeo(c, [rx, 42, rz], 0.022, 2);
    const [nx, ny, nrx, nrz] = G.nucleolus;
    const o = [nx - sx, 0, -(ny - sy)]; // the nucleolus's offset in the picture, as a world vector in the cut plane
    const od = o[0] * VD[0] + o[2] * VD[2];
    const oq = [o[0] - od * VD[0], -od * VD[1], o[2] - od * VD[2]];
    withColor(g, (x, y, z, nx2, ny2, nz2) => {
      const v = [x - c[0], y - c[1], z - c[2]];
      const vd = v[0] * VD[0] + v[1] * VD[1] + v[2] * VD[2];
      const q = [v[0] - vd * VD[0] - oq[0], v[1] - vd * VD[1] - oq[1], v[2] - vd * VD[2] - oq[2]];
      const facing = nx2 * VD[0] + ny2 * VD[1] + nz2 * VD[2];
      const d = Math.hypot(q[0] / nrx, q[1] / nrx, q[2] / nrz);
      const w = (1 - sstep(0.35, 1.25, d)) * sstep(0.0, 0.3, facing);
      return blend(C.nucleus, C.nucleolus, w * 0.8);
    });
    solid(g, matIn, { receive: false });
  }
  // mitochondria: beans, banded where the folds of the inner membrane show through
  const beanGeo = (c, axis, bow, rx, ry) => {
    const pts = [-1, -0.5, 0, 0.5, 1].map((s) => [0, 1, 2].map((k) => c[k] + axis[k] * s * (rx - 0.01) + bow[k] * (1 - s * s) * rx * 0.2));
    const rad = (t) => {
      const e = rx - Math.abs(2 * t - 1) * rx;
      return e >= ry ? ry : Math.sqrt(Math.max(0, ry * ry - (ry - e) * (ry - e)));
    };
    const d = sweepData(pts, rad, seg(14, 8), seg(30, 16), true);
    const g = smoothGeo(d.pos, d.idx);
    return withColor(g, (x, y, z, a, b, cc, i) => {
      if (i === 0 || i > d.ts.length * d.nu) return C.mito;
      const t = d.ts[Math.floor((i - 1) / d.nu)];
      const band = 0.5 + 0.5 * Math.sin((2 * t - 1) * rx * 0.62);
      return blend(C.mito, C.mitoBand, sstep(0.55, 0.9, band) * 0.7 * sstep(0.02, 0.2, Math.min(t, 1 - t)));
    });
  };
  {
    const deps = [30, 60, 44, 24];
    const axes = [[0.96, -0.2, -0.18], [0.93, 0.22, 0.28], [0.95, 0.12, -0.28], [0.97, -0.16, 0.2]];
    const all = new Soup();
    G.mito.forEach(([sx, sy, rx, ry], i) => {
      const a = axes[i];
      const l = Math.hypot(a[0], a[1], a[2]);
      const ax = a.map((v) => v / l);
      const bow = [0, i % 2 ? 0.5 : -0.5, i % 2 ? -0.86 : 0.86];
      all.add(beanGeo(lift(sx, sy, deps[i]), ax, bow, rx, ry - 0.5), null);
    });
    solid(all.geometry(), matIn, { receive: false });
  }
  // ferritin: 24 subunits on the cage's real 4-3-2 arrangement (a snub cube), a window turned to the viewer
  const FDEP = [26, 40, 18];
  const FCEN = DATA.FERRITIN.map(([sx, sy], j) => lift(sx, sy, FDEP[j]));
  {
    const t = 1.8392867552;
    const pts = [];
    const even = [[0, 1, 2], [1, 2, 0], [2, 0, 1]];
    const odd = [[0, 2, 1], [2, 1, 0], [1, 0, 2]];
    const base = [1, 1 / t, t];
    for (let s = 0; s < 8; s++) {
      const sg = [s & 1 ? -1 : 1, s & 2 ? -1 : 1, s & 4 ? -1 : 1];
      const plus = sg.filter((v) => v > 0).length;
      for (const perm of plus % 2 === 0 ? even : odd) {
        const v = [0, 0, 0];
        perm.forEach((src, k) => (v[k] = base[src] * sg[k]));
        pts.push(v);
      }
    }
    const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3(VD[0], VD[1], VD[2]));
    const turn = new T.Quaternion().setFromAxisAngle(new T.Vector3(VD[0], VD[1], VD[2]), 0.4);
    const RC = 14.6;
    const cage = instanced(ballGeo(seg(12, 8), seg(8, 6)), gel(flesh({ color: C.ferritin, roughness: 0.5 }), { sigma: SIG, edge: 0.25 }), 24 * FCEN.length, { receive: false });
    const v3 = new T.Vector3();
    let k = 0;
    FCEN.forEach((c, j) => {
      for (const p of pts) {
        v3.set(p[0], p[1], p[2]).normalize().multiplyScalar(RC).applyQuaternion(q);
        if (j) v3.applyQuaternion(turn);
        put(cage, k++, [c[0] + v3.x, c[1] + v3.y, c[2] + v3.z], 2.75);
      }
    });
  }
  // the neighbours' own nuclei and mitochondria, veiled; cut flat where the right end of the block crosses them
  {
    const all = new Soup();
    const dimNucleus = (c, r, ph, xMax) => all.add(withColor(nucleusGeo(c, r, 0.02, ph, xMax, D - 3, 0.62), () => C.nucleus), null);
    const [n0, n1] = G.end.nuclei; // on the end face: [u from the front edge, section y, ru, rz]
    dimNucleus([L - 8, D - n0[0], HH - n0[1]], [36, n0[2], n0[3]], 4, L);
    // the back-row cell is narrower at the end than the drawing's end face has it (its border follows the honeycomb on top)
    dimNucleus([L - 6, Math.min(D - n1[0], yEdge - GAP - WALL - n1[2] - 5), HH - n1[1]], [30, n1[2], n1[3]], 8, L);
    dimNucleus([62, D - 56, HH - G.nucleus[1] + 6], [46, 36, 42], 6, Infinity);
    for (const [i, [u, sy, rx, ry]] of G.end.mito.entries()) all.add(beanGeo([L - ry - 3, D - u, HH - sy], [0.25, i ? -0.9 : 0.86, i ? 0.34 : -0.44].map((v, _, a) => v / Math.hypot(...a)), [1, 0, 0], rx, ry), null);
    solid(all.geometry(), matInDim, { receive: false });
  }

  // ---------------------------------------------------------------- the brush border
  const VR = G.VILLI_R;
  {
    const HN = 44;
    const prof = [[VR + 2.6, -2], [VR + 1.5, 0.3], [VR + 0.6, 2.2], [VR + 0.1, 5], [VR, 9], [VR, HN * 0.55], [VR, HN - VR]];
    const nd = seg(5, 3);
    for (let i = 1; i < nd; i++) prof.push([VR * Math.cos((i / nd) * (Math.PI / 2)), HN - VR + VR * Math.sin((i / nd) * (Math.PI / 2))]);
    prof.push([0, HN]);
    const d = latheData(prof, seg(14, 8));
    const g = withColor(smoothGeo(d.pos, d.idx), (x, y, z) => {
      const t = clamp(z / HN, 0, 1);
      return t < 0.5 ? blend(C.villusRoot, C.villus, sstep(0, 0.5, t)) : blend(C.villus, C.villusTip, sstep(0.5, 1, t));
    });
    const list = [];
    for (const [x, h, main] of G.villiFront) list.push({ p: [x - X0, D - VR, ZT], h: h - 4, main, dmt: DATA.DMT1.some((q) => Math.abs(q[0] - x) < 0.5), q: QI });
    for (const [x, v, h, main, dmt] of G.forest) if (v < D - 14) list.push({ p: [x - X0, v, ZT], h: h + 6, main, dmt, q: new T.Quaternion().setFromEuler(new T.Euler((rnd() - 0.5) * 0.11, (rnd() - 0.5) * 0.11, 0)) });
    const villi = instanced(g, flesh({ vertexColors: true, roughness: 0.52, clearcoat: 0.26, clearcoatRoughness: 0.36, sheen: 0.7 }), list.length);
    const dimK = new T.Color(C.villusDim.r / C.villus.r, C.villusDim.g / C.villus.g, C.villusDim.b / C.villus.b).multiplyScalar(night ? 0.8 : 0.97);
    const white = new T.Color(1, 1, 1);
    list.forEach((v, i) => {
      put(villi, i, v.p, 1, 1, v.h / HN, v.q);
      villi.setColorAt(i, v.main ? white : dimK);
    });
    // DMT1, the way in: a pair of small channels in the tip of each microvillus the drawing marks
    const tips = list.filter((v) => v.dmt);
    const cp = latheData(capsuleProfile(2.3, 9.5, seg(4, 3)), seg(10, 6));
    const dmt = instanced(smoothGeo(cp.pos, cp.idx), phys({ color: C.dmt1, roughness: 0.36, clearcoat: 0.6, clearcoatRoughness: 0.25 }), tips.length * 2);
    const v3b = new T.Vector3();
    const lean = [new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), -0.22), new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), 0.22)];
    tips.forEach((v, i) => {
      for (const s of [0, 1]) {
        v3b.set(s ? 3.1 : -3.1, 1.6, v.h - 1.4).applyQuaternion(v.q);
        put(dmt, i * 2 + s, [v.p[0] + v3b.x, v.p[1] + v3b.y, ZT + v3b.z], 1, 1, 1, lean[s]);
      }
    });
  }

  // ---------------------------------------------------------------- under the cells: lamina, lamina propria, the capillary
  {
    const lp = new Soup();
    const RO = CAPR + 6; // the endothelium's outer face
    const yz = (u, v, w) => [w, u, v]; // a profile in (y, z), pushed along x
    // lamina propria, with the groove the capillary lies in
    const prof = [[0, 0], [D, 0], [D, CAPZ - RO]];
    const na = seg(20, 10);
    for (let i = 1; i < na; i++) {
      const a = -Math.PI / 2 + (i / na) * Math.PI;
      prof.push([D - RO * Math.cos(a), CAPZ + RO * Math.sin(a)]);
    }
    prof.push([D, CAPZ + RO], [D, HH - (DATA.BASAL + 15)], [0, HH - (DATA.BASAL + 15)]);
    lp.prism(prof, 0, L, C.tissue, 0, yz);
    // the basement lamina, and the thin bed the cells sit on
    lp.prism([[0, 0], [L, 0], [L, D], [0, D]], HH - (DATA.BASAL + 15), HH - (DATA.BASAL + 10), C.lamina, 0);
    lp.prism([[0, 0], [L, 0], [L, D], [0, D]], HH - (DATA.BASAL + 10), ZB - 0.3, C.tissue, 0);
    // the capillary: endothelium as a half-tube, cut along its length by the front face
    const nb = seg(28, 12);
    for (let i = 0; i < nb; i++) {
      const a0 = -Math.PI / 2 + (i / nb) * Math.PI;
      const a1 = -Math.PI / 2 + ((i + 1) / nb) * Math.PI;
      const pt = (a, r, x) => [x, D - r * Math.cos(a), CAPZ + r * Math.sin(a)];
      const n0 = [0, Math.cos(a0), -Math.sin(a0)];
      const n1 = [0, Math.cos(a1), -Math.sin(a1)];
      // inner face, smooth
      const A = pt(a0, CAPR, 0), B = pt(a0, CAPR, L), Cc = pt(a1, CAPR, L), Dd = pt(a1, CAPR, 0);
      const push = (p, q, r, np, nq, nr) => {
        lp.p.push(...p, ...q, ...r);
        lp.n.push(...np, ...nq, ...nr);
        for (let k = 0; k < 3; k++) {
          lp.c.push(C.blood.r, C.blood.g, C.blood.b);
          lp.f.push(0);
        }
      };
      // wound to face the axis
      const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2];
      const vx = Cc[0] - A[0], vy = Cc[1] - A[1], vz = Cc[2] - A[2];
      const flip = (uy * vz - uz * vy) * n0[0] + (uz * vx - ux * vz) * n0[1] + (ux * vy - uy * vx) * n0[2] < 0;
      if (flip) {
        push(A, Cc, B, n0, n1, n0);
        push(A, Dd, Cc, n0, n1, n1);
      } else {
        push(A, B, Cc, n0, n0, n1);
        push(A, Cc, Dd, n0, n1, n1);
      }
      lp.face([pt(a0, CAPR, L), pt(a0, RO, L), pt(a1, RO, L), pt(a1, CAPR, L)], [1, 0, 0], C.endo, 0);
    }
    lp.face([[0, D, CAPZ + CAPR], [L, D, CAPZ + CAPR], [L, D, CAPZ + RO], [0, D, CAPZ + RO]], [0, 1, 0], C.endo, 0);
    lp.face([[0, D, CAPZ - RO], [L, D, CAPZ - RO], [L, D, CAPZ - CAPR], [0, D, CAPZ - CAPR]], [0, 1, 0], C.endo, 0);
    solid(lp.geometry(), flesh({ vertexColors: true, roughness: 0.66, clearcoat: 0.12 }));
    // on the end face: collagen strands and fibroblasts of the lamina propria, in low relief
    const deco = new Soup();
    for (const [u, sy, cx, cy, ex, ey] of G.end.collagen) {
      const onEnd = (du, dy) => [L + 0.2, D - (u + du), HH - (sy + dy)];
      const pts = [0, 0.25, 0.5, 0.75, 1].map((t) => onEnd(2 * (1 - t) * t * cx + t * t * ex, 2 * (1 - t) * t * cy + t * t * ey));
      const d = sweepData(pts, (t) => 0.8 * Math.sqrt(Math.max(0.05, 1 - Math.pow(2 * t - 1, 6))), 5, 7);
      deco.add(smoothGeo(d.pos, d.idx), C.collagen, 0);
    }
    for (const [u, sy] of G.end.fibro) {
      const c = [L, D - u, HH - sy];
      const a = 0.25 * Math.sin(u);
      const ax = [0, -Math.cos(a), Math.sin(a)];
      const d = sweepData([-1, -0.5, 0, 0.5, 1].map((s) => [c[0], c[1] + ax[1] * s * 11, c[2] + ax[2] * s * 11]), (t) => 3.6 * Math.pow(Math.max(0, 1 - Math.pow(2 * t - 1, 2)), 0.8), seg(10, 6), seg(12, 8));
      for (let i = 0; i < d.pos.length; i += 3) d.pos[i] = L + (d.pos[i] - L) * 0.45;
      deco.add(smoothGeo(d.pos, d.idx), C.nucleus, 0);
    }
    solid(deco.geometry(), flesh({ vertexColors: true, roughness: 0.8, clearcoat: 0, sheen: 0.2 }), { cast: false });
  }

  // ---------------------------------------------------------------- what the model moves
  // iron: one bead, drawn wherever the model has one (lumen, cell, blood), on transferrin and in the ferritin cores
  const IRON_MAX = 220;
  const irons = instanced(ballGeo(seg(14, 8), seg(9, 6)), gel(phys({ color: C.iron, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.2, emissive: C.iron, emissiveIntensity: night ? 0.22 : 0.1 }), { sigma: SIG * 0.45, clip: true }), IRON_MAX, { dynamic: true, cast: false, receive: false, ghost: true });
  // the blood: red cells (true biconcave discs) and transferrin, two lobes with an iron site each
  const RBC_R = 12.5;
  const rbcGeo = (() => {
    const n = seg(9, 5);
    const h = (q) => 0.5 * Math.sqrt(Math.max(0, 1 - q * q)) * (0.81 + 7.83 * q * q - 4.39 * q * q * q * q) * 2.5;
    const prof = [];
    for (let i = 0; i < n; i++) {
      const q = Math.sin((i / n) * (Math.PI / 2));
      prof.push([RBC_R * q, -h(q)]);
    }
    prof.push([RBC_R, 0]);
    for (let i = n - 1; i >= 0; i--) {
      const q = Math.sin((i / n) * (Math.PI / 2));
      prof.push([RBC_R * q, h(q)]);
    }
    const d = latheData(prof, seg(22, 12));
    return withColor(smoothGeo(d.pos, d.idx), (x, y) => blend(C.rbc, C.rbcIn, 1 - sstep(0.2, 0.62, Math.hypot(x, y) / RBC_R)));
  })();
  const RBC_N = 6;
  const rbcs = instanced(rbcGeo, gel(phys({ vertexColors: true, roughness: 0.36, clearcoat: 0.6, clearcoatRoughness: 0.22, sheen: 0.4, sheenColor: C.rbcIn, side: T.DoubleSide }), { clip: true, fog: false }), RBC_N, { dynamic: true, ghost: true });
  const rbcTilt = Array.from({ length: RBC_N }, (_, i) => ({ dep: 7 + ((i * 5) % 4) * 1.6, rx: -0.16 + 0.22 * Math.sin(i * 2.1), ry: 0.26 * Math.cos(i * 1.7), ph: i * 1.3 }));
  const TF_N = 3;
  const tfs = instanced(ballGeo(seg(16, 10), seg(10, 6)), gel(phys({ color: C.tf, roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.3, side: T.DoubleSide }), { clip: true, fog: false }), TF_N * 2, { dynamic: true, ghost: true });
  // hepcidin: a small hairpin, as the peptide is
  const hepGeo = (() => {
    const d = sweepData([[-3.5, 0.9, 7.4], [-3.7, 0.5, 3], [-2.6, 0, 0.1], [0, -0.3, -1], [2.6, 0, 0.1], [3.7, 0.5, 3], [3.5, 0.9, 7.4]], (t) => 1.75 * Math.sqrt(Math.max(0, 1 - Math.pow(Math.max(0, (Math.abs(2 * t - 1) - 0.84) / 0.16), 2))), seg(10, 6), seg(26, 14));
    return smoothGeo(d.pos, d.idx);
  })();
  const HEP_MAX = 8;
  const heps = instanced(hepGeo, phys({ color: C.hep, roughness: 0.38, clearcoat: 0.55, clearcoatRoughness: 0.25, emissive: C.hep, emissiveIntensity: night ? 0.25 : 0.08 }), HEP_MAX, { dynamic: true, cast: false, receive: false, ghost: true });
  // ferroportin: two subunits through the base membrane; each gate has its own material so it can fade as it is broken down
  const fpnGeo = (() => {
    const a = latheData(capsuleProfile(3.3, 30, seg(5, 3)), seg(14, 8));
    const pos = [];
    const idx = [];
    for (const dx of [-4.7, 4.7]) {
      const o = pos.length / 3;
      for (let i = 0; i < a.pos.length; i += 3) pos.push(a.pos[i] + dx, a.pos[i + 1], a.pos[i + 2]);
      for (const i of a.idx) idx.push(i + o);
    }
    return smoothGeo(pos, idx);
  })();
  const vesGeo = ballGeo(seg(28, 16), seg(18, 10), 21);
  const gates = DATA.FPN.map(() => {
    // (transparent from the start: the shader's alpha is fixed at compile time, so it cannot be switched on later)
    const pair = solid(fpnGeo, phys({ color: C.fpn, roughness: 0.4, clearcoat: 0.55, clearcoatRoughness: 0.28, sheen: 0.3, sheenColor: C.sheen, transparent: true }), { receive: false });
    const vm = phys({ color: night ? gain(C.gel, 1.5) : new T.Color("#fffaf2"), roughness: 0.2, clearcoat: 0.8, clearcoatRoughness: 0.15, transparent: true, opacity: 0.5, depthWrite: false });
    vm.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace("#include <opaque_fragment>", "#include <opaque_fragment>\ngl_FragColor.a *= mix( 0.3, 1.0, pow( 1.0 - saturate( dot( normal, normalize( vViewPosition ) ) ), 1.5 ) );");
    };
    vm.customProgramCacheKey = () => "a1vesicle";
    const ves = ctx.ghost(new T.Mesh(vesGeo, vm));
    ves.renderOrder = 3;
    ves.visible = false;
    scene.add(ves);
    return { pair, ves, vm };
  });
  // where a gate has been taken in: an empty seat in the membrane
  const seats = instanced(ballGeo(seg(12, 8), seg(8, 6)), flesh({ color: gain(blend(K.membrane, K.cell, night ? 0.45 : 0.3), night ? 1.2 : 0.9), roughness: 0.6 }), DATA.FPN.length, { dynamic: true, cast: false, receive: false });

  // ---------------------------------------------------------------- one frame, from the model's state
  const depth = new WeakMap();
  const P3 = [0, 0, 0];
  const A3 = [0, 0, 0];
  const B3 = [0, 0, 0];
  const Q = new T.Quaternion();
  const EU = new T.Euler();
  const GOLD = Math.PI * (3 - Math.sqrt(5));
  const coreAt = Array.from({ length: 14 }, (_, i) => {
    const r = i ? 3.3 * Math.cbrt(i) : 0;
    const z = 1 - (2 * (i + 0.5)) / 14;
    const s = Math.sqrt(1 - z * z);
    return [r * s * Math.cos(i * GOLD), r * z * 0.9, r * s * Math.sin(i * GOLD)];
  });
  const TFDEP = 5;
  const hepQ = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 0, 1), -0.5);
  const { BASAL, CAP: CAPS } = DATA;
  function ironDepth(p, ease) {
    let r = depth.get(p);
    const fresh = !r;
    if (fresh) {
      r = { g: 9 + rnd() * 30, lum: -12 + rnd() * 64, d: 0 };
      depth.set(p, r);
    }
    let tgt = -2;
    let direct = fresh;
    if (p.stage === "lumen") {
      tgt = -2 + (r.lum + 2) * clamp(Math.hypot(p.x - p.d[0], p.y - (p.d[1] - 8)) / 110, 0, 1);
      direct = true;
    } else if (p.stage === "cyto") tgt = r.g;
    else if (p.stage === "exit") tgt = -5 + (r.g + 5) * clamp((Math.hypot(p.x - p.s.x, p.y - (BASAL - 2)) - 14) / 80, 0, 1);
    else if (p.stage === "out") tgt = -5;
    else if (p.stage === "drift") tgt = 1;
    else if (p.stage === "store") tgt = FDEP[p.k];
    r.d = direct ? tgt : r.d + (tgt - r.d) * ease;
    return r.d;
  }
  let lastT = 0;
  function update(S) {
    U.kit.value.copy(root.matrixWorld).invert();
    const now = performance.now();
    const dt = clamp((now - lastT) / 1000, 0, 0.1);
    lastT = now;
    const ease = 1 - Math.exp(-dt * 5);
    // iron
    let n = 0;
    for (const p of S.irons) {
      if (n >= IRON_MAX) break;
      const dep = ironDepth(p, ease);
      lift(p.x + (p.stage === "lumen" ? Math.sin(p.y * 0.08 + p.wob) * 3 : 0), p.y, dep, P3);
      put(irons, n++, P3, 3.4);
    }
    S.fill.forEach((f, j) => {
      const c = FCEN[j];
      const m = Math.min(14, Math.round(f));
      for (let i = 0; i < m && n < IRON_MAX; i++) {
        P3[0] = c[0] + coreAt[i][0];
        P3[1] = c[1] + coreAt[i][1];
        P3[2] = c[2] + coreAt[i][2];
        put(irons, n++, P3, 2.3);
      }
    });
    // transferrin and what it carries
    S.tf.forEach((c, i) => {
      const a = lift(c.x - 4, CAPS.y0 + 20, TFDEP, A3);
      const b = lift(c.x + 5, CAPS.y0 + 21, TFDEP + 1.5, B3);
      put(tfs, i * 2, a, 6.5);
      put(tfs, i * 2 + 1, b, 6.5);
      for (const [q, on] of [[a, c.load > 0], [b, c.load > 1]]) {
        if (!on || n >= IRON_MAX) continue;
        P3[0] = q[0] + VD[0] * 5.6;
        P3[1] = q[1] + VD[1] * 5.6;
        P3[2] = q[2] + VD[2] * 5.6;
        put(irons, n++, P3, 3);
      }
    });
    irons.count = n;
    irons.instanceMatrix.needsUpdate = true;
    tfs.instanceMatrix.needsUpdate = true;
    // red cells, rocking a little as they pass
    S.rbc.forEach((c, i) => {
      const k = rbcTilt[i % RBC_N];
      lift(c.x, c.y, k.dep, P3);
      EU.set(k.rx + 0.16 * Math.sin(c.x * 0.021 + k.ph), k.ry + 0.2 * Math.sin(c.x * 0.016 + k.ph * 2), 0);
      put(rbcs, i, P3, 1, 1, 1, Q.setFromEuler(EU));
    });
    rbcs.instanceMatrix.needsUpdate = true;
    // hepcidin on its way, and the gates
    let h = 0;
    for (const hp of S.heps) {
      const u = clamp((CAPS.y1 - 6 - hp.y) / (CAPS.y1 - 6 - (BASAL + 15)), 0, 1);
      put(heps, h++, lift(hp.x, hp.y, 6 - 12 * u, P3), 1, 1, 1, hepQ);
    }
    S.slots.forEach((s, i) => {
      const g = gates[i];
      let y = BASAL;
      let dep = -1;
      let a = 1;
      let ves = 0;
      let vs = 1;
      let hep = 0;
      if (s.state === "bound") hep = 1;
      else if (s.state === "in") {
        const u = Math.min(1, s.t / 1.8);
        y = BASAL - 70 * u;
        dep = -1 + 6 * u;
        a = u < 0.6 ? 1 : 1 - (u - 0.6) / 0.4;
        ves = a;
        vs = 0.5 + 0.5 * sstep(0, 0.3, u);
        hep = a;
      } else if (s.state === "back") {
        const u = Math.min(1, s.t / 1.3);
        y = BASAL - 60 * (1 - u);
        dep = -1 + 6 * (1 - u);
        ves = 1 - u;
        a = Math.min(1, 0.3 + u);
      }
      const gone = s.state === "gone";
      g.pair.visible = !gone && a > 0.01;
      g.ves.visible = ves > 0.01;
      lift(s.x, y, dep, P3);
      g.pair.position.set(P3[0], P3[1], P3[2]);
      g.pair.material.opacity = a;
      if (g.ves.visible) {
        g.ves.position.set(P3[0], P3[1], P3[2]);
        g.ves.scale.setScalar(vs);
        g.vm.opacity = 0.5 * ves;
      }
      if (hep > 0.01 && h < HEP_MAX) put(heps, h++, lift(s.x, y + 14, dep - 5.5, P3), hep, hep, hep, hepQ);
      put(seats, i, lift(s.x, BASAL + 0.5, -0.4, P3), gone ? 8.5 : 0, gone ? 2.4 : 0, gone ? 3.2 : 0);
    });
    heps.count = h;
    heps.instanceMatrix.needsUpdate = true;
    seats.instanceMatrix.needsUpdate = true;
  }
  return {
    update,
    dispose() {
      for (const m of mats) m.dispose();
    },
  };
}

// A1 live code: iron in through DMT1, out through ferroportin; hepcidin docks and the cell pulls gates in.
const DATA = {"W":600,"H":640,"APICAL":150,"BASAL":528,"CELL":{"x0":150,"x1":450},"FERRITIN":[[214,248],[388,236],[300,318]],"FPN":[192,246,300,354,408],"CAP":{"y0":560,"y1":616},"DMT1":[[168.5,116.98860651373397],[228.5,114.22925946115942],[288.5,118.47591712266599],[348.5,112.9265111302452],[408.5,119.53748495511658]],"SLOTS":5,"scenes":[{"key":"hungry","gate":0.9689922332763672,"line":"Low iron, low hepcidin: every gate open."},{"key":"pills","gate":0.5038644671440125,"line":"A week of daily pills: each dose raises hepcidin for about a day."},{"key":"full","gate":0.44996628165245056,"line":"Two weeks after an IV infusion: stores full, hepcidin up."}],"gl3":{"parts":[],"ground":0,"bounds":[[0,0,0],[560,210,640]],"look":{"exposure":0.94,"aoRadius":15,"contactHeight":64,"cast":1.15,"contact":1.05},"file":"optimal-gl3.js","v":"bf10947a"},"P":{"origin":[105.08623956157555,509.9600020803212],"scale":0.7785187969880039,"azimuth":62,"elevation":24},"VW":600,"VH":698,"G":{"X0":20,"L":560,"D":210,"HX":153,"HV":[117,64],"VILLI_R":6.5,"mito":[[196,380,22,9,1],[404,372,20,9,2],[250,196,18,8,3],[362,300,19,8,4]],"nucleus":[300,440,76,46],"nucleolus":[318,432,16,11],"web":[160,440,159,168],"villiFront":[[28.5,47.84,0],[48.5,44.67,0],[68.5,40.75,0],[88.5,40.48,0],[108.5,44.16,0],[128.5,47.66,0],[168.5,43.01,1],[188.5,40.08,1],[208.5,41.55,1],[228.5,45.77,1],[248.5,48,1],[268.5,45.74,1],[288.5,41.52,1],[308.5,40.09,1],[328.5,43.05,1],[348.5,47.07,1],[368.5,47.65,1],[388.5,44.13,1],[408.5,40.46,1],[428.5,40.77,1],[448.5,44.71,0],[468.5,47.85,0],[488.5,46.67,0],[508.5,42.49,0],[528.5,40.01,0],[548.5,42.01,0],[568.5,46.24,0]],"forest":[[40,22,40.17,0,0],[60,22,41.98,0,0],[30,38,40.89,0,0],[80,22,39.33,0,0],[50,38,43.88,0,0],[100,22,35.2,0,0],[70,38,42.48,0,0],[40,54,40.8,0,0],[120,22,34.22,0,0],[90,38,38.28,0,0],[60,54,40.82,0,0],[140,22,37.5,0,0],[110,38,35.98,0,0],[80,54,37.02,0,0],[50,70,40.1,0,0],[160,22,41.35,0,0],[130,38,38.17,0,0],[100,54,33.66,0,0],[70,70,37.15,0,0],[180,22,41.45,0,0],[150,38,42.39,0,0],[120,54,34.52,0,0],[90,70,33.12,0,0],[30,102,43.06,0,0],[200,22,37.69,0,0],[170,38,43.9,0,0],[140,54,38.63,0,0],[110,70,32.54,0,0],[50,102,42.67,0,0],[220,22,34.29,0,0],[190,38,41.01,0,0],[160,54,41.37,0,0],[130,70,36.07,0,0],[100,86,35.12,0,0],[40,118,40.27,0,0],[240,22,35.06,0,0],[210,38,36.95,0,0],[180,54,39.67,0,0],[150,70,39.73,0,0],[120,86,37.66,0,0],[60,118,37.03,0,0],[30,134,40.96,0,0],[260,22,39.15,0,0],[230,38,36.3,0,0],[200,54,35.44,0,0],[170,70,39.42,0,0],[140,86,41.82,0,0],[80,118,33.15,0,0],[50,134,38.83,0,0],[280,22,41.95,0,0],[250,38,39.77,0,0],[220,54,33.42,0,0],[190,70,35.49,0,0],[160,86,42.94,0,0],[100,118,32.98,0,0],[70,134,34.6,0,0],[40,150,42.78,0,0],[270,38,43.48,0,0],[240,54,35.89,0,0],[210,70,32.35,0,0],[180,86,39.76,0,0],[150,102,43.48,0,0],[90,134,33.03,0,0],[60,150,38.69,0,0],[30,166,42.17,0,0],[320,22,36.1,0,0],[260,54,40.07,0,0],[230,70,33.52,0,0],[110,134,35.88,0,0],[80,150,35.9,0,0],[50,166,38.69,0,0],[340,22,34.01,0,0],[280,54,41.27,0,0],[130,134,39.95,0,0],[100,150,37.54,0,0],[70,166,34.99,0,0],[40,182,37.52,0,0],[360,22,36.41,0,0],[330,38,36.15,0,0],[120,150,41.77,0,0],[90,166,35.23,0,0],[60,182,33.34,0,0],[30,198,40.74,0,0],[380,22,40.61,0,0],[350,38,37.25,0,0],[320,54,34.2,0,0],[230,102,38.32,1,1],[200,118,32.52,1,1],[170,134,37.23,1,0],[110,166,39.14,0,0],[80,182,32.16,0,0],[50,198,36.56,0,0],[400,22,41.88,0,0],[370,38,41.41,0,0],[340,54,33.87,0,0],[280,86,42.15,1,1],[250,102,42.42,1,0],[220,118,34.09,1,0],[190,134,33.49,1,0],[160,150,41.42,1,0],[130,166,42.33,0,0],[100,182,35.3,0,0],[70,198,34.09,0,0],[420,22,38.81,0,0],[390,38,43.96,0,0],[360,54,37.52,0,0],[300,86,38.1,1,0],[270,102,43.22,1,0],[240,118,38.31,1,0],[210,134,33.66,1,1],[180,150,37.23,1,1],[120,182,39.24,0,0],[90,198,36.1,0,0],[440,22,34.84,0,0],[410,38,42.04,0,0],[380,54,41.06,0,0],[320,86,35.19,1,0],[290,102,39.83,1,1],[260,118,40.46,1,1],[230,134,37.53,1,0],[200,150,35.97,1,0],[170,166,37.05,1,0],[110,198,40.33,0,0],[460,22,34.43,0,0],[430,38,37.8,0,0],[400,54,40.5,0,0],[370,70,39.07,0,0],[310,102,36.05,1,0],[280,118,38.11,1,0],[250,134,40.77,1,0],[220,150,39.06,1,0],[190,166,34.51,1,1],[160,182,35.89,1,1],[130,198,42.04,0,0],[480,22,38.04,0,0],[450,38,36.01,0,0],[420,54,36.48,0,0],[390,70,39.95,0,0],[330,102,36.13,1,0],[300,118,33.91,1,0],[270,134,39.74,1,1],[240,150,43.02,1,1],[210,166,36.45,1,0],[180,182,32.36,1,0],[500,22,41.62,0,0],[470,38,38.67,0,0],[440,54,33.51,0,0],[410,70,36.61,0,0],[350,102,39.98,1,1],[320,118,32.57,1,1],[290,134,35.59,1,0],[260,150,43.42,1,0],[230,166,40.69,1,0],[200,182,32.94,1,0],[170,198,35.19,1,1],[520,22,41.14,0,0],[490,38,42.8,0,0],[460,54,34.92,0,0],[430,70,32.8,0,0],[370,102,43.27,1,0],[340,118,35.6,1,0],[310,134,32.99,1,0],[280,150,39.8,1,0],[250,166,42.47,1,1],[220,182,36.96,1,1],[190,198,34.33,1,0],[540,22,37.15,0,0],[510,38,43.76,0,0],[480,54,39.14,0,0],[450,70,32.8,0,0],[420,86,36.62,0,0],[360,118,39.59,1,0],[330,134,34.85,1,1],[300,150,36.23,1,1],[270,166,39.79,1,0],[240,182,39.92,1,0],[210,198,37.68,1,0],[560,22,34.12,0,0],[530,38,40.47,0,0],[500,54,41.42,0,0],[470,70,36.61,0,0],[440,86,35.21,0,0],[380,118,40.07,1,1],[350,134,39.09,1,0],[320,150,36.72,1,0],[290,166,35.66,1,0],[260,182,38.49,1,0],[230,198,41.48,1,1],[550,38,36.63,0,0],[520,54,39.2,0,0],[490,70,39.95,0,0],[460,86,38.18,0,0],[400,118,36.49,1,0],[370,134,40.94,1,0],[340,150,40.72,1,0],[310,166,34.72,1,1],[280,182,34.28,1,1],[250,198,41.46,1,0],[570,38,36.55,0,0],[540,54,34.98,0,0],[510,70,39.07,0,0],[480,86,42.2,0,0],[450,102,37.31,0,0],[390,134,38.33,1,1],[360,150,43.73,1,1],[330,166,38.02,1,0],[300,182,32.01,1,0],[270,198,37.65,1,0],[560,54,33.49,0,0],[530,70,34.96,0,0],[500,86,42.75,0,0],[410,134,34.18,1,0],[380,150,42.38,1,0],[350,166,41.86,1,0],[320,182,34.24,1,0],[290,198,34.32,1,1],[550,70,32.23,0,0],[430,134,33.16,1,0],[400,150,38.18,1,0],[370,166,41.92,1,1],[340,182,38.45,1,1],[310,198,35.21,1,0],[420,150,35.84,1,1],[390,166,38.14,1,0],[360,182,39.93,1,0],[330,198,39.33,1,0],[500,118,39.06,0,0],[470,134,40.28,0,0],[440,150,38,1,0],[410,166,34.76,1,0],[380,182,37,1,0],[350,198,42.04,1,1],[550,102,35.66,0,0],[520,118,34.86,0,0],[490,134,40.43,0,0],[430,166,35.58,1,1],[400,182,32.96,1,1],[370,198,40.31,1,0],[570,102,38.86,0,0],[540,118,32.46,0,0],[510,134,36.68,0,0],[480,150,43.78,0,0],[420,182,32.35,1,0],[390,198,36.07,1,0],[560,118,34.55,0,0],[530,134,33.26,0,0],[500,150,40.91,0,0],[470,166,42.45,0,0],[440,182,35.84,1,0],[410,198,34.09,1,1],[550,134,33.99,0,0],[520,150,36.85,0,0],[490,166,40.79,0,0],[430,198,36.59,1,0],[570,134,38.07,0,0],[540,150,36.15,0,0],[510,166,36.56,0,0],[480,182,39.26,0,0],[560,150,39.6,0,0],[530,166,34.5,0,0],[500,182,35.35,0,0],[470,198,41.92,0,0],[550,166,36.94,0,0],[520,182,32.17,0,0],[490,198,38.77,0,0],[570,166,41.12,0,0],[540,182,33.31,0,0],[510,198,34.84,0,0],[560,182,37.48,0,0],[530,198,34.55,0,0],[550,198,38.22,0,0],[570,198,41.73,0,0]],"end":{"nuclei":[[51.00326797385621,446,44,40],[142.00653594771242,462,26,34]],"mito":[[36.7,300,16,7],[71.4,230,15,7]],"collagen":[[44,586.6,6.3,2.2,12.6,-1.9],[109.4,592.4,9.8,-1.3,19.5,-0.5],[79,608.5,8.7,0.5,17.3,-5.1],[176.3,581.4,7.3,1.4,14.6,-5],[138.8,595.5,7.9,-1.2,15.8,-0.3],[171.4,551,10.3,1.3,20.6,-5.2],[46.2,581.5,9.7,-2.4,19.4,6.2],[141.7,628.6,13.1,-2.9,26.2,-3.8],[158.8,616.3,7.8,-2,15.5,5.8],[171.9,627.7,13.8,1.8,27.5,5.2],[113,570.9,6.2,2.7,12.3,1.1],[177.1,578.8,5.7,1,11.5,3.5],[196.2,595.1,10,2.1,19.9,2.9],[113.4,626.1,8.7,1.9,17.3,7.3],[125.2,568.5,6,2,12,-4.5],[61.4,578.8,9,-0.2,18,0.7],[61,581.1,10.2,0.3,20.5,-5.4],[192,558.1,12.9,1.6,25.9,10.4],[134.4,580.3,10.7,0,21.4,6.4],[92.9,593.7,13.4,0.4,26.9,-5.3],[189.7,562.1,13.2,1.1,26.4,-7.4],[90.1,617.8,13,-0.1,25.9,-2.8],[125.4,569,11.8,2.2,23.5,-7.8],[86,612.1,12.8,-0.4,25.6,-3.3],[44.1,551.7,9.7,-1.2,19.5,-7.6],[173.3,576,13.8,0,27.7,3.1]],"fibro":[[96,590],[160,616],[70,628]]}}};
const A1_INKS = ["a1-cell", "a1-cell-2", "a1-membrane", "a1-nucleus", "a1-nucleolus", "a1-mito", "a1-tissue", "a1-blood", "a1-endo", "a1-iron", "a1-hep", "a1-fpn", "a1-dmt1", "a1-tf", "a1-rbc", "a1-rbc-in", "a1-ferritin", "b1-lateral", "b1-cell-dim", "b1-villus-dim", "b1-top", "b1-top-main", "b1-v0", "b1-v1", "b1-v2", "b1-tip"];

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
  // the 3-D layer (shared/gl3): the same block as a real-time scene (gl-scene.js), fed the same state the SVG is
  // drawn from. Until it arrives every call is a no-op and the drawing is the figure; once it is on, the drawing
  // steps aside (data-gl3-hide) and is not redrawn.
  const inks = getComputedStyle(svg);
  const pal = Object.fromEntries(A1_INKS.map((k) => [k, inks.getPropertyValue(`--${k}`).trim()]));
  const gl = gl3Attach(fig, { scene: DATA.gl3, P: DATA.P, W: DATA.VW, H: DATA.VH, file: DATA.gl3.file, v: DATA.gl3.v, island: false, redraw: () => draw(), build: (ctx) => a1Scene(ctx, DATA, pal) });

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
  const live = { irons, heps, slots, fill, tf, rbc }; // what the 3-D scene reads every frame

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
    const n = working().length;
    out.fpn.textContent = `${n} of ${DATA.SLOTS}`;
    gl.update(live);
    gl.render();
    if (gl.on) return;
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
    root.innerHTML = "<style>" + "\n.iso{\n  --anatomy-page:#0b0b0b;--anatomy-card:#131313;--anatomy-text:#a3a3a3;--anatomy-strong:#e6e6e6;--anatomy-muted:#6e6e6e;\n  --anatomy-paper:#131313;--anatomy-face:#1b1b1b;--anatomy-top:#1c1c1c;\n  --anatomy-shade-0:#0f0f0f;--anatomy-shade-1:#121212;--anatomy-shade-2:#151515;--anatomy-shade-3:#181818;\n  --anatomy-lit-top:#262626;--anatomy-lit-shade:#1d1d1d;\n  --anatomy-hi:#d4d4d4;--anatomy-mid:#6a6a6a;--anatomy-lo:#3e3e3e;--anatomy-faint:#2a2a2a;--anatomy-lit:#ffffff;\n  --anatomy-halo:#050505;--anatomy-halo-opacity:.9;--anatomy-dot:#e6e6e6;\n  --anatomy-red:#ff6b6b;--anatomy-green:#6be0a0;--anatomy-blue:#6b9bff;\n  --anatomy-weight:.6px;--anatomy-ease:cubic-bezier(.32,.72,0,1);\n  --anatomy-mono:ui-monospace,\"SF Mono\",Menlo,Consolas,monospace;\n  --anatomy-lift:inset 0 1px 0 0 #ffffff0a,inset 0 0 0 1px #ffffff06,0 0 0 1px #00000026,0 1px 1px -.5px #00000014,0 3px 3px -1.5px #00000014,0 6px 6px -3px #00000014,0 12px 12px -6px #00000014;\n}\n.iso[data-theme=\"light\"]{\n  --anatomy-page:#f2f2ef;--anatomy-card:#fbfbfa;--anatomy-text:#57575a;--anatomy-strong:#18181a;--anatomy-muted:#8c8c90;\n  --anatomy-paper:#fbfbfa;--anatomy-face:#ffffff;--anatomy-top:#ffffff;\n  --anatomy-shade-0:#dcdcd9;--anatomy-shade-1:#e5e5e2;--anatomy-shade-2:#ededea;--anatomy-shade-3:#f4f4f1;\n  --anatomy-lit-top:#ffffff;--anatomy-lit-shade:#eeeeeb;\n  --anatomy-hi:#26262a;--anatomy-mid:#8a8a8f;--anatomy-lo:#b4b4b8;--anatomy-faint:#d4d4d6;--anatomy-lit:#000000;\n  --anatomy-halo:#8a8a80;--anatomy-halo-opacity:.32;--anatomy-dot:#3a3a3e;\n  --anatomy-red:#e5484d;--anatomy-green:#30a46c;--anatomy-blue:#3e63dd;\n  --anatomy-lift:inset 0 1px 0 0 #ffffff,0 0 0 1px #0000000f,0 1px 1px -.5px #0000000a,0 3px 3px -1.5px #0000000a,0 6px 6px -3px #0000000a,0 12px 12px -6px #0000000a;\n}\n.iso-svg{display:block;width:100%;height:auto;overflow:visible}\n.iso-svg path,.iso-svg circle{vector-effect:non-scaling-stroke}\n.iso-fill{fill:var(--anatomy-paper);stroke:none}\n.iso-solid[data-lit]>.iso-fill{fill:var(--anatomy-face)}\n.iso-shade,.iso-top{stroke:none}\n.iso-shade[data-shade=\"0\"]{fill:var(--anatomy-shade-0)}\n.iso-shade[data-shade=\"1\"]{fill:var(--anatomy-shade-1)}\n.iso-shade[data-shade=\"2\"]{fill:var(--anatomy-shade-2)}\n.iso-shade[data-shade=\"3\"]{fill:var(--anatomy-shade-3)}\n.iso-top{fill:var(--anatomy-top)}\n.iso-solid[data-lit]>.iso-top{fill:var(--anatomy-lit-top)}\n.iso-solid[data-lit]>.iso-shade{fill:var(--anatomy-lit-shade)}\n.iso-solid[data-seamless]>.iso-shade,.iso-solid[data-seamless]>.iso-top{stroke-width:.4;stroke-linejoin:round}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"0\"]{stroke:var(--anatomy-shade-0)}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"1\"]{stroke:var(--anatomy-shade-1)}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"2\"]{stroke:var(--anatomy-shade-2)}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"3\"]{stroke:var(--anatomy-shade-3)}\n.iso-solid[data-seamless]>.iso-top{stroke:var(--anatomy-top)}\n.iso-solid[data-seamless][data-lit]>.iso-top{stroke:var(--anatomy-lit-top)}\n.iso-solid[data-seamless][data-lit]>.iso-shade{stroke:var(--anatomy-lit-shade)}\n.iso-solid[data-lit]>.iso-edge{stroke:var(--anatomy-lit)}\n.iso-halo{fill:var(--anatomy-halo);stroke:none;filter:blur(9px);opacity:var(--anatomy-halo-opacity);transform:translateY(3px)}\n.iso-line{fill:none;stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight);stroke-linecap:round;stroke-linejoin:round}\n.iso-line[data-tone=\"hi\"]{stroke:var(--anatomy-hi)}\n.iso-line[data-tone=\"mid\"]{stroke:var(--anatomy-mid)}\n.iso-line[data-tone=\"lo\"]{stroke:var(--anatomy-lo)}\n.iso-line[data-tone=\"faint\"]{stroke:var(--anatomy-faint)}\n.iso-line[data-tone=\"lit\"]{stroke:var(--anatomy-lit)}\n.iso-line[data-tone=\"red\"]{stroke:var(--anatomy-red)}\n.iso-line[data-tone=\"green\"]{stroke:var(--anatomy-green)}\n.iso-line[data-tone=\"blue\"]{stroke:var(--anatomy-blue)}\n.iso-line[data-dotted]{stroke-dasharray:.01 3.5;stroke-width:1}\n.iso-line[data-dashed]{stroke-dasharray:3 3}\n.iso-line[data-flow]{stroke-dasharray:2 6}\n.iso-wire-end{fill:var(--anatomy-paper);stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight)}\n.iso-wire[data-tone=\"hi\"] .iso-wire-end{stroke:var(--anatomy-hi)}\n.iso-wire[data-tone=\"mid\"] .iso-wire-end{stroke:var(--anatomy-mid)}\n.iso-wire[data-tone=\"faint\"] .iso-wire-end{stroke:var(--anatomy-faint)}\n.iso-wire[data-tone=\"lit\"] .iso-wire-end{stroke:var(--anatomy-lit)}\n.iso-dots circle{fill:var(--anatomy-dot);stroke:none;opacity:.32}\n.iso-dots[data-tone=\"hi\"] circle{opacity:.85}\n.iso-dots[data-tone=\"mid\"] circle{opacity:.45}\n.iso-dots[data-tone=\"lo\"] circle{opacity:.22}\n.iso-dots[data-tone=\"faint\"] circle{opacity:.12}\n.iso-face-text{fill:var(--anatomy-mid);font-family:var(--anatomy-mono);letter-spacing:.04em}\n.iso-face-text[data-tone=\"hi\"]{fill:var(--anatomy-hi)}\n.iso-face-text[data-tone=\"lo\"]{fill:var(--anatomy-lo)}\n.iso-face-text[data-tone=\"faint\"]{fill:var(--anatomy-faint)}\n.tb-body{fill:var(--anatomy-shade-2);stroke:none}\n.tb-shine{fill:var(--anatomy-top);stroke:none}\n.tb-shade{fill:var(--anatomy-shade-0);stroke:none}\n.tb-ring{fill:none;stroke:var(--anatomy-lo);stroke-width:.45;stroke-linecap:butt;stroke-linejoin:round}\n.tb-ring[data-tone=\"mid\"]{stroke:var(--anatomy-mid)}\n.tb-ring[data-tone=\"faint\"]{stroke:var(--anatomy-faint)}\n.tb-ring[data-tone=\"hi\"]{stroke:var(--anatomy-hi)}\n@keyframes iso-flow{to{stroke-dashoffset:-32}}\n@keyframes iso-pulse{0%,100%{opacity:.18}12%{opacity:1}40%{opacity:.18}}\n.iso-line[data-flow]{animation:iso-flow 1600ms linear infinite}\n.iso-dots circle[data-pulse]{animation:iso-pulse 1600ms steps(1,end) infinite;animation-delay:var(--pulse-at,0ms)}\n.iso-figure{margin:32px 0 36px}\n.iso-plate{position:relative;padding:52px 24px;border-radius:0;background:var(--anatomy-card);box-shadow:0 0 0 1px var(--anatomy-mid);--anatomy-paper:var(--anatomy-card)}\n.iso-plate-corners{position:absolute;inset:18px 20px;pointer-events:none}\n.iso-plate-corner{position:absolute;color:var(--anatomy-muted);font-family:var(--anatomy-mono);font-size:10.5px;line-height:1;letter-spacing:.04em;white-space:nowrap}\n.iso-plate-corner[data-corner=\"fig\"]{top:0;left:0;color:var(--anatomy-text)}\n.iso-plate-corner[data-corner=\"title\"]{top:0;right:0;text-transform:uppercase;letter-spacing:.1em}\n.iso-plate-corner[data-corner=\"hint\"]{bottom:0;left:0;text-transform:uppercase;letter-spacing:.1em}\n.iso-plate-corner[data-corner=\"readout\"]{right:0;bottom:0;color:var(--anatomy-text);font-variant-numeric:tabular-nums}\n.iso-plate .iso-svg{margin:0 auto}\n.iso-legend{display:grid;gap:8px;margin-top:12px;color:var(--anatomy-muted);font-size:13px;line-height:1.55}\n.iso-keys{display:flex;flex-wrap:wrap;gap:6px 18px}\n.iso-key{display:inline-flex;align-items:center;gap:7px}\n.iso-swatch{width:16px;height:10px;flex:none;overflow:visible}\n.iso-swatch path{fill:none;stroke:var(--anatomy-hi);stroke-width:1;vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round}\n.iso-swatch[data-mark=\"raised\"] path,.iso-swatch[data-mark=\"flat\"] path{stroke:var(--anatomy-mid)}\n.iso-swatch[data-mark=\"lit\"] path{stroke:var(--anatomy-lit)}\n.iso-swatch[data-mark=\"dim\"] path{stroke:var(--anatomy-lo)}\n.iso-swatch[data-mark=\"dotted\"] path{stroke-dasharray:.01 3;stroke-width:1.4}\n.iso-swatch[data-mark=\"dashed\"] path{stroke-dasharray:3 2.5}\n.iso-swatch[data-mark=\"red\"] path{stroke:var(--anatomy-red)}\n.iso-swatch[data-mark=\"green\"] path{stroke:var(--anatomy-green)}\n.iso-swatch[data-mark=\"blue\"] path{stroke:var(--anatomy-blue)}\n.iso-swatch-crease{stroke:var(--anatomy-lo)!important}\n@media (max-width:560px){.iso-plate{padding:48px 12px 70px}.iso-plate-corner[data-corner=\"hint\"]{bottom:18px}}\n@media (prefers-reduced-motion:reduce){.iso-line[data-flow],.iso-dots circle[data-pulse]{animation:none}}\n/*\n * Optimal theme for Anatomy figures.\n *\n * Load AFTER the kit's ISO_CSS. Put `class=\"iso optimal\"` on the wrapper:\n *   - no data-theme  -> \"Forest night\"  (exam-room TV, dark)\n *   - data-theme=\"light\" -> \"Cream\"     (beoptimal.ca, the primary target)\n *\n * Values come from the live site (beoptimal-landing src/index.css), the\n * Performance package design and the ALE visualizer spec. The kit's grey\n * ramps are warmed so solids sit on the site's cream paper, and the single\n * \"lit\" accent is Optimal forest green instead of pure black/white.\n */\n\n.iso.optimal {\n  /* Forest night (dark) */\n  --anatomy-page: #152511;\n  --anatomy-card: #1c3118;\n  --anatomy-text: #c9cdbf;\n  --anatomy-strong: #fffcf7;\n  --anatomy-muted: #8e9884;\n  --anatomy-paper: #1c3118;\n  --anatomy-face: #253821;\n  --anatomy-top: #283c24;\n  --anatomy-shade-0: #172812;\n  --anatomy-shade-1: #1a2c16;\n  --anatomy-shade-2: #1e321a;\n  --anatomy-shade-3: #22371e;\n  --anatomy-lit-top: #34492f;\n  --anatomy-lit-shade: #2a3f26;\n  --anatomy-hi: #e9e6dc;\n  --anatomy-mid: #7e8a74;\n  --anatomy-lo: #4d5c46;\n  --anatomy-faint: #33452e;\n  --anatomy-lit: #fffcf7;\n  --anatomy-halo: #0b1508;\n  --anatomy-halo-opacity: 0.9;\n  --anatomy-dot: #e9e6dc;\n  --anatomy-red: #e0745f;\n  --anatomy-green: #8cc67f;\n  --anatomy-blue: #7fa8d9;\n  --anatomy-mono: \"JetBrains Mono\", ui-monospace, \"SF Mono\", Menlo, Consolas, monospace;\n\n  /* Optimal extras (use sparingly; colour only when colour is the subject) */\n  --opt-display: \"Castoro\", Georgia, serif;\n  --opt-ui: \"Public Sans\", system-ui, sans-serif;\n  --opt-forest: #2c4e25;\n  --opt-forest-light: #519044;\n  --opt-sage: #5e7a59;\n  --opt-borderline: #c97b2d;\n  --opt-out: #b3402f;\n  --opt-heat: #ff9776;\n}\n\n.iso.optimal[data-theme=\"light\"] {\n  /* Cream (light) */\n  --anatomy-page: #fef8f1;\n  --anatomy-card: #fffcf7;\n  --anatomy-text: #3e3d39;\n  --anatomy-strong: #252525;\n  --anatomy-muted: #716e68; /* 4.97:1 on the cream card (was 4.46:1 for the legend) */\n  --anatomy-paper: #fffcf7;\n  --anatomy-face: #fffefb;\n  --anatomy-top: #fffefb;\n  --anatomy-shade-0: #ddd7cc;\n  --anatomy-shade-1: #e7e2d9;\n  --anatomy-shade-2: #f0ede5;\n  --anatomy-shade-3: #f6f3ec;\n  --anatomy-lit-top: #fffefb;\n  --anatomy-lit-shade: #efebe2;\n  --anatomy-hi: #252525;\n  --anatomy-mid: #8a867e;\n  --anatomy-lo: #b9b4aa;\n  --anatomy-faint: #d9d3c8;\n  --anatomy-lit: #2c4e25;\n  --anatomy-halo: #8a8070;\n  --anatomy-halo-opacity: 0.3;\n  --anatomy-dot: #3a3833;\n  --anatomy-red: #b3402f;\n  --anatomy-green: #3f7a35;\n  --anatomy-blue: #3e6a8f;\n}\n\n/* Card typography: brand fonts for titles and readouts, kit mono for plate corners */\n.iso.optimal .iso-plate-title,\n.iso.optimal [data-role=\"title\"] {\n  font-family: var(--opt-display);\n  letter-spacing: -0.02em;\n}\n.iso.optimal [data-role=\"readout\"],\n.iso.optimal .iso-readout {\n  font-family: var(--opt-ui);\n  font-feature-settings: \"tnum\" 1, \"ss01\" 1;\n}\n\n/*\n * Card layout for Optimal figures (shared/page.mjs `plate`).\n * Phone first: the drawing, then a row of real buttons (>=44 px), then a footer\n * where the hint and the readout wrap instead of overlapping at 320 px.\n */\n.iso.optimal {\n  --opt-rule: rgba(233, 230, 220, 0.16);\n  --opt-btn: rgba(233, 230, 220, 0.06);\n  --opt-btn-on: #e9e6dc;\n  --opt-btn-on-text: #1c3118;\n  --opt-title: #fffcf7;\n  --opt-fig: #8cc67f;\n  --opt-heat-ink: #ff9776;\n  --opt-heat-glow: rgba(255, 151, 118, 0.55);\n  --opt-heat-wash: rgba(255, 151, 118, 0.16);\n  --opt-cold-ink: #9cc3e6;\n}\n.iso.optimal[data-theme=\"light\"] {\n  --opt-rule: rgba(44, 78, 37, 0.2);\n  --opt-btn: #fffcf7;\n  --opt-btn-on: #2c4e25;\n  --opt-btn-on-text: #fffcf7;\n  --opt-title: #2c4e25;\n  --opt-fig: #5e7a59;\n  --opt-heat-ink: #c8552e;\n  --opt-heat-glow: rgba(232, 108, 64, 0.42);\n  --opt-heat-wash: rgba(255, 151, 118, 0.22);\n  --opt-cold-ink: #3e6a8f;\n}\n.iso.optimal .opt-plate {\n  padding: 52px 24px 20px;\n  box-shadow: 0 0 0 1px var(--opt-rule);\n  border-radius: 2px;\n}\n.iso.optimal .iso-plate-corner[data-corner=\"fig\"] {\n  font-family: var(--opt-display);\n  font-style: italic;\n  font-size: 15px;\n  letter-spacing: 0;\n  color: var(--opt-fig);\n  top: -2px;\n}\n.iso.optimal .iso-plate-corner[data-corner=\"title\"] {\n  font-family: var(--opt-display);\n  font-size: 17px;\n  text-transform: none;\n  letter-spacing: -0.01em;\n  color: var(--opt-title);\n  top: -4px;\n}\n.iso.optimal .opt-controls {\n  display: flex;\n  flex-wrap: wrap;\n  justify-content: center;\n  gap: 8px 12px;\n  margin: 10px 0 0;\n}\n.iso.optimal .opt-seg {\n  display: inline-flex;\n  border-radius: 999px;\n  box-shadow: inset 0 0 0 1px var(--opt-rule);\n  padding: 3px;\n  gap: 2px;\n  max-width: 100%;\n}\n.iso.optimal .opt-seg-btn {\n  appearance: none;\n  border: 0;\n  margin: 0;\n  min-height: 44px;\n  min-width: min-content; /* never shrink a label below its longest word (with the padding, always ≥ 44 px) */\n  padding: 0 16px;\n  border-radius: 999px;\n  background: transparent;\n  color: var(--anatomy-text);\n  font: 500 14px/1.1 var(--opt-ui);\n  letter-spacing: 0;\n  cursor: pointer;\n  touch-action: manipulation;\n  -webkit-tap-highlight-color: transparent;\n  transition: background-color 240ms var(--anatomy-ease), color 240ms var(--anatomy-ease);\n}\n/* A zero-height 30 px strut keeps every option at least 44 px wide, even \"Arm\", \"Leg\" or \"+5%\" with the\n   7 px padding below 350 px (min-content alone let them shrink to 36 px). */\n.iso.optimal .opt-seg-btn::after {\n  content: \"\";\n  display: block;\n  width: 30px;\n  height: 0;\n  margin: 0 auto;\n}\n.iso.optimal .opt-seg-btn[aria-checked=\"true\"] {\n  background: var(--opt-btn-on);\n  color: var(--opt-btn-on-text);\n}\n.iso.optimal .opt-seg-btn:focus-visible {\n  outline: 2px solid var(--opt-fig);\n  outline-offset: 2px;\n}\n.iso.optimal .opt-foot {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: flex-end;\n  justify-content: space-between;\n  gap: 10px 20px;\n  margin-top: 16px;\n}\n.iso.optimal .opt-hint {\n  font-family: var(--anatomy-mono);\n  font-size: 10.5px;\n  line-height: 1.4;\n  letter-spacing: 0.1em;\n  text-transform: uppercase;\n  color: var(--anatomy-muted);\n  flex: 1 1 160px;\n  min-width: 0;\n}\n.iso.optimal .opt-readout {\n  display: grid;\n  grid-auto-flow: column;\n  gap: 4px 18px;\n  margin: 0;\n  font-family: var(--opt-ui);\n  font-feature-settings: \"tnum\" 1;\n}\n.iso.optimal .opt-stat { margin: 0; min-width: 0; }\n.iso.optimal .opt-stat dt {\n  font-size: 10px;\n  font-weight: 600;\n  letter-spacing: 0.12em;\n  text-transform: uppercase;\n  color: var(--anatomy-muted);\n  white-space: nowrap;\n}\n.iso.optimal .opt-stat dd {\n  margin: 1px 0 0;\n  font-size: 15px;\n  font-weight: 500;\n  color: var(--anatomy-strong);\n  white-space: nowrap;\n}\n.iso.optimal .iso-legend { font-family: var(--opt-ui); font-size: 13.5px; }\n.iso.optimal .iso-caption { color: var(--anatomy-text); }\n.iso.optimal .iso-caption em { font-style: italic; }\n.iso.optimal .iso-swatch[data-mark=\"heat\"] path { stroke: var(--opt-heat-ink); stroke-width: 2; }\n.iso.optimal .iso-stage { outline: none; border-radius: 4px; touch-action: pan-y; -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none; }\n.iso.optimal .iso-stage:focus-visible { outline: 1px solid var(--anatomy-muted); outline-offset: 6px; }\n@media (max-width: 560px) {\n  .iso.optimal .opt-plate { padding: 44px 10px 14px; }\n  .iso.optimal .iso-plate-corners { inset: 16px 12px; }\n  .iso.optimal .opt-readout { grid-auto-flow: row; grid-template-columns: repeat(4, minmax(0, auto)); width: 100%; justify-content: space-between; gap: 4px 10px; order: -1; }\n  .iso.optimal .opt-stat dd { font-size: 14px; }\n  /* a long label wraps onto two lines instead of running into its neighbour; values stay on one baseline */\n  .iso.optimal .opt-stat { display: flex; flex-direction: column; justify-content: space-between; }\n  .iso.optimal .opt-stat dt { white-space: normal; line-height: 1.25; }\n  .iso.optimal .opt-seg-btn { padding: 0 12px; font-size: 13.5px; }\n}\n@media (max-width: 350px) {\n  .iso.optimal .opt-seg-btn { padding: 0 7px; font-size: 12.5px; }\n  .iso.optimal .opt-stat dt { font-size: 9px; letter-spacing: 0.08em; }\n  .iso.optimal .opt-stat dd { font-size: 13px; }\n}\n\n:host{display:block}\n.opt-host{background:transparent;color:var(--anatomy-text);font:15px/1.6 var(--opt-ui);-webkit-font-smoothing:antialiased}\n.opt-host *{box-sizing:border-box}\n.opt-host .iso-figure{margin:0}\n/* A1 · the gut cell, hand-drawn: soft fills in the figure's own inks, one membrane line weight. */\n.iso.optimal {\n  --a1-lumen: #22361d; --a1-cell: #2c4127; --a1-cell-2: #33492d; --a1-membrane: #8e9884; --a1-nucleus: #3d5436; --a1-nucleolus: #4f6948;\n  --a1-mito: #3a4f33; --a1-tissue: #1e301a; --a1-blood: #3b2a22; --a1-endo: #4d5c46; --a1-iron: #e3a35b; --a1-hep: #ff9776; --a1-fpn: #c9cdbf;\n  --a1-dmt1: #7fa8d9; --a1-tf: #7fa8d9; --a1-rbc: #e0745f; --a1-rbc-in: #c45e4a; --a1-ferritin: #8e9884; --a1-vesicle: rgba(201, 205, 191, 0.12);\n}\n.iso.optimal[data-theme=\"light\"] {\n  --a1-lumen: #fbf3e6; --a1-cell: #f6e9d8; --a1-cell-2: #efdfc9; --a1-membrane: #8a7f70; --a1-nucleus: #e4d3bd; --a1-nucleolus: #cdb69a;\n  --a1-mito: #ead8c2; --a1-tissue: #f8efe2; --a1-blood: #f6dcd2; --a1-endo: #e2cdbd; --a1-iron: #b8641f; --a1-hep: #d96a47; --a1-fpn: #2c4e25;\n  --a1-dmt1: #4a77ab; --a1-tf: #6f93bd; --a1-rbc: #c9503a; --a1-rbc-in: #e07a63; --a1-ferritin: #8a7f70; --a1-vesicle: rgba(44, 78, 37, 0.08);\n}\n.a1-svg path, .a1-svg circle, .a1-svg ellipse, .a1-svg rect { vector-effect: non-scaling-stroke; }\n.a1-lumen { fill: var(--a1-lumen); }\n.a1-tissue { fill: var(--a1-tissue); }\n.a1-villus { fill: var(--a1-cell-2); stroke: var(--a1-membrane); stroke-width: 1; }\n.a1-cell { fill: var(--a1-cell); stroke: var(--a1-membrane); stroke-width: 1.4; }\n.a1-dim { opacity: 0.55; }\n.a1-web { fill: var(--a1-cell-2); stroke: none; }\n.a1-junction { fill: var(--a1-membrane); }\n.a1-dmt1 path { fill: var(--a1-dmt1); stroke: none; }\n.a1-mito { fill: var(--a1-mito); stroke: var(--a1-membrane); stroke-width: 0.8; }\n.a1-mito-in { fill: none; stroke: var(--a1-membrane); stroke-width: 0.6; opacity: 0.7; }\n.a1-nucleus { fill: var(--a1-nucleus); stroke: var(--a1-membrane); stroke-width: 1.1; }\n.a1-nucleolus { fill: var(--a1-nucleolus); }\n.a1-ferritin circle { fill: var(--a1-ferritin); }\n.a1-ferritin .a1-core { fill: var(--a1-cell-2); }\n.a1-lamina { fill: var(--a1-endo); }\n.a1-blood { fill: var(--a1-blood); }\n.a1-endo { fill: var(--a1-endo); }\n.a1-iron { fill: var(--a1-iron); }\n.a1-hep { fill: var(--a1-hep); }\n.a1-fpn path { fill: var(--a1-fpn); }\n.a1-gap { fill: var(--a1-membrane); opacity: 0.35; }\n.a1-vesicle { fill: var(--a1-vesicle); stroke: var(--a1-membrane); stroke-width: 0.9; }\n.a1-rbc ellipse { fill: var(--a1-rbc); }\n.a1-rbc .a1-rbc-in { fill: var(--a1-rbc-in); }\n.a1-tf circle { fill: var(--a1-tf); }\n.a1-tf .a1-iron { fill: var(--a1-iron); }\n.a1-scene { margin: 10px 4px 0; font: 500 14px/1.4 var(--opt-ui); color: var(--anatomy-text); min-height: 2.8em; }\n.a1-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }\n.a1-par { display: block; margin-top: 6px; }\n.a1-par:first-child { margin-top: 0; }\n.a1-par small { font-size: 12.5px; color: var(--anatomy-muted); }\n/* With the 3-D layer on (shared/gl3) the render is the figure: the SVG keeps its box and its name for screen readers,\n   and the drawn art fades out as the render fades in (it is back whenever the layer is off). */\n.a1-stage[data-gl3=\"on\"] > svg { mix-blend-mode: normal; }\n.a1-stage .a1-art { transition: opacity 0.5s ease, visibility 0s linear 0s; }\n.a1-stage[data-gl3=\"on\"] .a1-art[data-gl3-hide] { display: inline; opacity: 0; visibility: hidden; pointer-events: none; transition: opacity 0.5s ease, visibility 0s linear 0.5s; }\n/* A1 · the gut-lining block: the cell section on the front face of an isometric cut-away. */\n.iso.optimal {\n  --b1-lateral: #3c5236; --b1-cell-dim: #233620; --b1-villus-dim: #283c24; --b1-top: #22361e; --b1-top-main: #2a3f25;\n  --b1-v0: #4d6446; --b1-v1: #33492d; --b1-v2: #233720; --b1-d0: #3b5135; --b1-d1: #2b4026; --b1-d2: #1e301a; --b1-tip: #57704f; --b1-tip-dim: #435a3c;\n  --b1-shade: rgba(0, 0, 0, 0.2); --b1-shadow: rgba(0, 0, 0, 0.35);\n}\n.iso.optimal[data-theme=\"light\"] {\n  --b1-lateral: #d9c6ad; --b1-cell-dim: #ede3d5; --b1-villus-dim: #e6dccd; --b1-top: #e3d0b6; --b1-top-main: #dcc5a7;\n  --b1-v0: #fbf2e6; --b1-v1: #efdfc9; --b1-v2: #d8c3a6; --b1-d0: #f5ede1; --b1-d1: #e8dccb; --b1-d2: #d3c4ae; --b1-tip: #fff8ee; --b1-tip-dim: #f6eee2;\n  --b1-shade: rgba(60, 40, 20, 0.12); --b1-shadow: rgba(60, 40, 20, 0.16);\n}\n/* no see-through in the block: neighbours are muted by tone, not opacity */\n.b1-front .a1-dim, .b1-forest .a1-dim, g[transform] .a1-dim { opacity: 1; }\n.a1-cell.a1-dim { fill: var(--b1-cell-dim); }\n.a1-villus.a1-dim { fill: var(--b1-villus-dim); }\n.a1-nucleus.a1-dim, .a1-mito.a1-dim { opacity: 0.75; }\n.b1-lateral { fill: var(--b1-lateral); }\n.b1-top { fill: var(--b1-top); }\n.b1-top-main { fill: var(--b1-top-main); }\n.b1-junction { fill: none; stroke: var(--a1-membrane); stroke-width: 5; stroke-linejoin: round; stroke-linecap: round; opacity: 0.8; }\n.b1-villus { fill: url(#b1-villus); stroke: var(--a1-membrane); stroke-width: 0.55; }\n.b1-villus.b1-villus-dim { fill: url(#b1-villus-dim); stroke-opacity: 0.7; }\n.b1-villus-tip { fill: var(--b1-tip); }\n.b1-villus-tip.b1-villus-dim { fill: var(--b1-tip-dim); }\n.b1-dmt1 { fill: var(--a1-dmt1); }\n.b1-v0 { stop-color: var(--b1-v0); } .b1-v1 { stop-color: var(--b1-v1); } .b1-v2 { stop-color: var(--b1-v2); }\n.b1-d0 { stop-color: var(--b1-d0); } .b1-d1 { stop-color: var(--b1-d1); } .b1-d2 { stop-color: var(--b1-d2); }\n.b1-rbc-x { fill: var(--a1-rbc); }\n.b1-side-shade { fill: var(--b1-shade); pointer-events: none; }\n.b1-edge { fill: none; stroke: var(--a1-membrane); stroke-width: 1.1; stroke-linejoin: round; }\n.b1-shadow { fill: var(--b1-shadow); filter: blur(7px); }\n.b1-end-villus { filter: brightness(0.9); }\n.b1-collagen { fill: none; stroke: var(--a1-membrane); stroke-width: 0.9; stroke-linecap: round; opacity: 0.45; }\n.b1-fibro { fill: var(--a1-nucleus); stroke: var(--a1-membrane); stroke-width: 0.6; }\n/* The shared 3-D layer (shared/gl3): the canvas under the drawing, and the drawing as its ink pass.\n   Nothing here applies until host.js sets data-gl3=\"on\" on the stage (after the layer's first frame). */\n.iso-stage[data-gl3]{position:relative}\n.gl3-canvas{position:absolute;left:0;top:0;width:100%;height:100%;display:block;pointer-events:none;opacity:0;transition:opacity .5s ease}\n.iso-stage[data-gl3=\"on\"]>.gl3-canvas{opacity:1}\n/* the SVG multiplies over the render: white leaves the render as it is, ink darkens it */\n.iso-stage[data-gl3=\"on\"]>svg{mix-blend-mode:multiply}\n.iso-stage[data-gl3=\"on\"]>svg:not(.iso-layer){position:relative}\n/* solids: the render is the body now. Fills go white (they still hide what is behind them, in the drawing's own\n   order), and the drawn shading, edges and ground shadow step aside. Anything inside [data-gl3-keep] stays as drawn\n   (a small moving marker the layer has no solid for). */\n.iso-stage[data-gl3=\"on\"] .iso-solid:not([data-gl3-keep]):not([data-gl3-keep] *)>.iso-fill{fill:#fff!important;stroke:none!important}\n.iso-stage[data-gl3=\"on\"] .iso-solid:not([data-gl3-keep]):not([data-gl3-keep] *)>.iso-shade,.iso-stage[data-gl3=\"on\"] .iso-solid:not([data-gl3-keep]):not([data-gl3-keep] *)>.iso-top{display:none}\n.iso-stage[data-gl3=\"on\"] .iso-solid:not([data-gl3-keep]):not([data-gl3-keep] *)>.iso-edge,.iso-stage[data-gl3=\"on\"] .iso-solid:not([data-gl3-keep]):not([data-gl3-keep] *)>.iso-crease,.iso-stage[data-gl3=\"on\"] .iso-solid:not([data-gl3-keep]):not([data-gl3-keep] *)>.iso-bevel{stroke-opacity:0}\n/* the turn runtime's tone facets (the take-apart pages) are shading too */\n.iso-stage[data-gl3=\"on\"] .iso-solid:not([data-gl3-keep]):not([data-gl3-keep] *)>.iso-tn{display:none}\n.iso-stage[data-gl3=\"on\"] .iso-halo{display:none}\n.iso-stage[data-gl3=\"on\"] .tb-body{fill:#fff!important}\n.iso-stage[data-gl3=\"on\"] .tb-shine,.iso-stage[data-gl3=\"on\"] .tb-shade{display:none}\n.iso-stage[data-gl3=\"on\"] .tb-ring{stroke-opacity:0}\n.iso-stage[data-gl3=\"on\"] .iso-wire-end{fill:#fff!important;stroke-opacity:0}\n/* hide a drawn element only while the layer is on (a drawn shadow, a drawn highlight the render now makes) */\n.iso-stage[data-gl3=\"on\"] [data-gl3-hide]{display:none}\n/* in Forest night the stage is a Cream island for the ink (host.js adds the classes): no ground of its own */\n.iso-stage[data-gl3-theme]{background:transparent;color:inherit}\n" + "</style><div class=\"iso optimal opt-host\" data-theme=\"" + theme + "\">" + "<figure class=\"iso-figure opt-figure \"><div class=\"iso-plate opt-plate\"><div class=\"iso-plate-corners\" aria-hidden=\"true\"><span class=\"iso-plate-corner\" data-corner=\"fig\">A1</span><span class=\"iso-plate-corner\" data-corner=\"title\">The gut cell's gate</span></div><div class=\"iso-stage a1-stage\" tabindex=\"0\"><svg class=\"iso-svg a1-svg\" viewBox=\"0 0 600 698\" role=\"img\" aria-label=\"A block of gut lining, cut open. On top is the brush border, a carpet of microvilli, with grooves where one cell meets the next. The front face shows one lining cell in section. Iron from food enters through DMT1 channels on the microvilli at the top, is held in ferritin cages or leaves through ferroportin channels at the base into the blood, where transferrin carries it away. Hepcidin from the blood docks on ferroportin, and the cell pulls the channel in and breaks it down, so less iron gets out.\">\n<defs>\n  <linearGradient id=\"b1-villus\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\"><stop offset=\"0\" class=\"b1-v0\"/><stop offset=\"0.45\" class=\"b1-v1\"/><stop offset=\"1\" class=\"b1-v2\"/></linearGradient>\n  <linearGradient id=\"b1-villus-dim\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\"><stop offset=\"0\" class=\"b1-d0\"/><stop offset=\"0.45\" class=\"b1-d1\"/><stop offset=\"1\" class=\"b1-d2\"/></linearGradient>\n  <clipPath id=\"b1-frontclip\"><rect x=\"20\" y=\"-40\" width=\"560\" height=\"680\"/></clipPath>\n  <clipPath id=\"b1-sideclip\"><path d=\"M494.9 185.7L592 111.5L592 615.3L494.9 689.5Z\"/></clipPath>\n</defs>\n<g class=\"a1-art\" data-gl3-hide><path class=\"b1-shadow\" d=\"M100.9 506.3L605.2 615.4L498 697.4L-6.4 588.4Z\"/><g transform=\"matrix(0.8695 0.1880 -0.4623 0.3537 105.09 69.15)\"><clipPath id=\"b1-topclip\"><rect width=\"560\" height=\"210\"/></clipPath><g clip-path=\"url(#b1-topclip)\"><rect class=\"b1-top\" width=\"560\" height=\"210\"/><path class=\"b1-top-main\" d=\"M127.0 210.0L127.0 117.0L280.0 64.0L433.0 117.0L433.0 210.0Z\"/><path class=\"b1-junction\" d=\"M127.0 210.0L127.0 117.0M433.0 210.0L433.0 117.0M-179.0 117.0L-26.0 64.0M-26.0 64.0L127.0 117.0M127.0 117.0L280.0 64.0M280.0 64.0L433.0 117.0M433.0 117.0L586.0 64.0M586.0 64.0L739.0 117.0M280.0 64.0L280.0 0.0\"/></g></g><path class=\"b1-edge\" d=\"M8 143.4L105.1 69.1L592 174.4\"/><g class=\"b1-forest\"><path class=\"b1-villus b1-villus-dim\" d=\"M107.2 80.7L107.2 44.6C107.2 38.9 117.4 38.9 117.4 44.6L117.4 80.7A5.1 2.1 0 0 1 107.2 80.7Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M109.2 42.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M124.6 84.4L124.6 46.7C124.6 41.0 134.8 41.0 134.8 46.7L134.8 84.4A5.1 2.1 0 0 1 124.6 84.4Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M126.6 44.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M91.2 84.5L91.2 47.7C91.2 42.0 101.3 42.0 101.3 47.7L101.3 84.5A5.1 2.1 0 0 1 91.2 84.5Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M93.1 45.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M142.0 88.2L142.0 52.8C142.0 47.1 152.1 47.1 152.1 52.8L152.1 88.2A5.1 2.1 0 0 1 142.0 88.2Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M143.9 50.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M108.5 88.2L108.5 48.8C108.5 43.1 118.7 43.1 118.7 48.8L118.7 88.2A5.1 2.1 0 0 1 108.5 88.2Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M110.5 46.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M159.4 92.0L159.4 60.3C159.4 54.6 169.5 54.6 169.5 60.3L169.5 92.0A5.1 2.1 0 0 1 159.4 92.0Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M161.3 58.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M125.9 92.0L125.9 53.8C125.9 48.1 136.1 48.1 136.1 53.8L136.1 92.0A5.1 2.1 0 0 1 125.9 92.0Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M127.9 51.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M92.5 92.0L92.5 55.3C92.5 49.6 102.6 49.6 102.6 55.3L102.6 92.0A5.1 2.1 0 0 1 92.5 92.0Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M94.4 53.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M176.8 95.7L176.8 64.9C176.8 59.3 186.9 59.3 186.9 64.9L186.9 95.7A5.1 2.1 0 0 1 176.8 95.7Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M178.7 62.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M143.3 95.7L143.3 61.3C143.3 55.6 153.4 55.6 153.4 61.3L153.4 95.7A5.1 2.1 0 0 1 143.3 95.7Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M145.2 59.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M109.8 95.8L109.8 59.0C109.8 53.4 120.0 53.4 120.0 59.0L120.0 95.8A5.1 2.1 0 0 1 109.8 95.8Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M111.8 56.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M194.2 99.5L194.2 65.8C194.2 60.1 204.3 60.1 204.3 65.8L204.3 99.5A5.1 2.1 0 0 1 194.2 99.5Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M196.1 63.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M160.7 99.5L160.7 67.1C160.7 61.4 170.8 61.4 170.8 67.1L170.8 99.5A5.1 2.1 0 0 1 160.7 99.5Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M162.6 64.9a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M127.2 99.5L127.2 66.2C127.2 60.5 137.4 60.5 137.4 66.2L137.4 99.5A5.1 2.1 0 0 1 127.2 99.5Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M129.2 63.9a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M93.7 99.5L93.7 63.5C93.7 57.8 103.9 57.8 103.9 63.5L103.9 99.5A5.1 2.1 0 0 1 93.7 99.5Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M95.7 61.2a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M211.6 103.3L211.6 66.1C211.6 60.4 221.7 60.4 221.7 66.1L221.7 103.3A5.1 2.1 0 0 1 211.6 103.3Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M213.5 63.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M178.1 103.3L178.1 68.9C178.1 63.2 188.2 63.2 188.2 68.9L188.2 103.3A5.1 2.1 0 0 1 178.1 103.3Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M180.0 66.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M144.6 103.3L144.6 73.0C144.6 67.3 154.7 67.3 154.7 73.0L154.7 103.3A5.1 2.1 0 0 1 144.6 103.3Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M146.5 70.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M111.1 103.3L111.1 69.9C111.1 64.2 121.3 64.2 121.3 69.9L121.3 103.3A5.1 2.1 0 0 1 111.1 103.3Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M113.1 67.6a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M229.0 107.0L229.0 69.7C229.0 64.0 239.1 64.0 239.1 69.7L239.1 107.0A5.1 2.1 0 0 1 229.0 107.0Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M230.9 67.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M195.5 107.0L195.5 68.9C195.5 63.2 205.6 63.2 205.6 68.9L205.6 107.0A5.1 2.1 0 0 1 195.5 107.0Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M197.4 66.6a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M162.0 107.0L162.0 76.0C162.0 70.3 172.1 70.3 172.1 76.0L172.1 107.0A5.1 2.1 0 0 1 162.0 107.0Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M163.9 73.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M128.5 107.1L128.5 77.3C128.5 71.6 138.6 71.6 138.6 77.3L138.6 107.1A5.1 2.1 0 0 1 128.5 107.1Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M130.5 75.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M61.6 107.1L61.6 68.4C61.6 62.7 71.7 62.7 71.7 68.4L71.7 107.1A5.1 2.1 0 0 1 61.6 107.1Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M63.5 66.1a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M246.4 110.8L246.4 76.9C246.4 71.2 256.5 71.2 256.5 76.9L256.5 110.8A5.1 2.1 0 0 1 246.4 110.8Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M248.3 74.6a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M212.9 110.8L212.9 71.3C212.9 65.6 223.0 65.6 223.0 71.3L223.0 110.8A5.1 2.1 0 0 1 212.9 110.8Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M214.8 69.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M179.4 110.8L179.4 76.1C179.4 70.4 189.5 70.4 189.5 76.1L189.5 110.8A5.1 2.1 0 0 1 179.4 110.8Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M181.3 73.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M145.9 110.8L145.9 81.5C145.9 75.9 156.0 75.9 156.0 81.5L156.0 110.8A5.1 2.1 0 0 1 145.9 110.8Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M147.8 79.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M79.0 110.9L79.0 72.5C79.0 66.8 89.1 66.8 89.1 72.5L89.1 110.9A5.1 2.1 0 0 1 79.0 110.9Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M80.9 70.2a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M263.8 114.5L263.8 83.7C263.8 78.0 273.9 78.0 273.9 83.7L273.9 114.5A5.1 2.1 0 0 1 263.8 114.5Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M265.7 81.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M230.3 114.6L230.3 77.7C230.3 72.0 240.4 72.0 240.4 77.7L240.4 114.6A5.1 2.1 0 0 1 230.3 114.6Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M232.2 75.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M196.8 114.6L196.8 77.3C196.8 71.7 206.9 71.7 206.9 77.3L206.9 114.6A5.1 2.1 0 0 1 196.8 114.6Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M198.7 75.1a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M163.3 114.6L163.3 82.1C163.3 76.4 173.4 76.4 173.4 82.1L173.4 114.6A5.1 2.1 0 0 1 163.3 114.6Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M165.2 79.9a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M129.8 114.6L129.8 83.0C129.8 77.3 139.9 77.3 139.9 83.0L139.9 114.6A5.1 2.1 0 0 1 129.8 114.6Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M131.7 80.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M62.9 114.6L62.9 78.4C62.9 72.7 73.0 72.7 73.0 78.4L73.0 114.6A5.1 2.1 0 0 1 62.9 114.6Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M64.8 76.1a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M281.1 118.3L281.1 86.8C281.1 81.1 291.3 81.1 291.3 86.8L291.3 118.3A5.1 2.1 0 0 1 281.1 118.3Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M283.1 84.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M247.7 118.3L247.7 85.1C247.7 79.4 257.8 79.4 257.8 85.1L257.8 118.3A5.1 2.1 0 0 1 247.7 118.3Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M249.6 82.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M214.2 118.3L214.2 82.6C214.2 76.9 224.3 76.9 224.3 82.6L224.3 118.3A5.1 2.1 0 0 1 214.2 118.3Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M216.1 80.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M180.7 118.3L180.7 82.6C180.7 76.9 190.8 76.9 190.8 82.6L190.8 118.3A5.1 2.1 0 0 1 180.7 118.3Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M182.6 80.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M147.2 118.4L147.2 84.5C147.2 78.8 157.3 78.8 157.3 84.5L157.3 118.4A5.1 2.1 0 0 1 147.2 118.4Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M149.1 82.2a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M80.3 118.4L80.3 85.1C80.3 79.4 90.4 79.4 90.4 85.1L90.4 118.4A5.1 2.1 0 0 1 80.3 118.4Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M82.2 82.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M46.8 118.4L46.8 81.6C46.8 75.9 56.9 75.9 56.9 81.6L56.9 118.4A5.1 2.1 0 0 1 46.8 118.4Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M48.7 79.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M298.5 122.1L298.5 86.8C298.5 81.1 308.7 81.1 308.7 86.8L308.7 122.1A5.1 2.1 0 0 1 298.5 122.1Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M300.5 84.6a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M265.1 122.1L265.1 89.4C265.1 83.7 275.2 83.7 275.2 89.4L275.2 122.1A5.1 2.1 0 0 1 265.1 122.1Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M267.0 87.1a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M231.6 122.1L231.6 90.2C231.6 84.5 241.7 84.5 241.7 90.2L241.7 122.1A5.1 2.1 0 0 1 231.6 122.1Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M233.5 87.9a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M198.1 122.1L198.1 86.6C198.1 80.9 208.2 80.9 208.2 86.6L208.2 122.1A5.1 2.1 0 0 1 198.1 122.1Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M200.0 84.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M164.6 122.1L164.6 84.5C164.6 78.8 174.7 78.8 174.7 84.5L174.7 122.1A5.1 2.1 0 0 1 164.6 122.1Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M166.5 82.2a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M97.6 122.2L97.6 92.3C97.6 86.6 107.8 86.6 107.8 92.3L107.8 122.2A5.1 2.1 0 0 1 97.6 122.2Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M99.6 90.1a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M64.2 122.2L64.2 87.2C64.2 81.6 74.3 81.6 74.3 87.2L74.3 122.2A5.1 2.1 0 0 1 64.2 122.2Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M66.1 85.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M315.9 125.8L315.9 88.1C315.9 82.4 326.0 82.4 326.0 88.1L326.0 125.8A5.1 2.1 0 0 1 315.9 125.8Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M317.8 85.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M282.4 125.8L282.4 90.1C282.4 84.4 292.6 84.4 292.6 90.1L292.6 125.8A5.1 2.1 0 0 1 282.4 125.8Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M284.4 87.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M249.0 125.9L249.0 95.8C249.0 90.1 259.1 90.1 259.1 95.8L259.1 125.9A5.1 2.1 0 0 1 249.0 125.9Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M250.9 93.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M215.5 125.9L215.5 93.9C215.5 88.2 225.6 88.2 225.6 93.9L225.6 125.9A5.1 2.1 0 0 1 215.5 125.9Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M217.4 91.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M182.0 125.9L182.0 87.3C182.0 81.6 192.1 81.6 192.1 87.3L192.1 125.9A5.1 2.1 0 0 1 182.0 125.9Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M183.9 85.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M115.0 125.9L115.0 96.2C115.0 90.6 125.2 90.6 125.2 96.2L125.2 125.9A5.1 2.1 0 0 1 115.0 125.9Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M117.0 94.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M81.6 125.9L81.6 94.8C81.6 89.1 91.7 89.1 91.7 94.8L91.7 125.9A5.1 2.1 0 0 1 81.6 125.9Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M83.5 92.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M48.1 126.0L48.1 87.5C48.1 81.8 58.2 81.8 58.2 87.5L58.2 126.0A5.1 2.1 0 0 1 48.1 126.0Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M50.0 85.2a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M299.8 129.6L299.8 90.5C299.8 84.8 310.0 84.8 310.0 90.5L310.0 129.6A5.1 2.1 0 0 1 299.8 129.6Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M301.8 88.2a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M266.3 129.6L266.3 97.3C266.3 91.6 276.5 91.6 276.5 97.3L276.5 129.6A5.1 2.1 0 0 1 266.3 129.6Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M268.3 95.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M232.9 129.6L232.9 100.5C232.9 94.8 243.0 94.8 243.0 100.5L243.0 129.6A5.1 2.1 0 0 1 232.9 129.6Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M234.8 98.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M199.4 129.6L199.4 93.9C199.4 88.2 209.5 88.2 209.5 93.9L209.5 129.6A5.1 2.1 0 0 1 199.4 129.6Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M201.3 91.6a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M165.9 129.7L165.9 90.5C165.9 84.9 176.0 84.9 176.0 90.5L176.0 129.7A5.1 2.1 0 0 1 165.9 129.7Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M167.8 88.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M98.9 129.7L98.9 100.0C98.9 94.3 109.1 94.3 109.1 100.0L109.1 129.7A5.1 2.1 0 0 1 98.9 129.7Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M100.9 97.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M65.5 129.7L65.5 94.9C65.5 89.2 75.6 89.2 75.6 94.9L75.6 129.7A5.1 2.1 0 0 1 65.5 129.7Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M67.4 92.6a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M32.0 129.7L32.0 91.8C32.0 86.1 42.1 86.1 42.1 91.8L42.1 129.7A5.1 2.1 0 0 1 32.0 129.7Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M33.9 89.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M350.7 133.3L350.7 100.9C350.7 95.2 360.8 95.2 360.8 100.9L360.8 133.3A5.1 2.1 0 0 1 350.7 133.3Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M352.6 98.6a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M283.7 133.4L283.7 97.3C283.7 91.6 293.9 91.6 293.9 97.3L293.9 133.4A5.1 2.1 0 0 1 283.7 133.4Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M285.7 95.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M250.3 133.4L250.3 103.2C250.3 97.5 260.4 97.5 260.4 103.2L260.4 133.4A5.1 2.1 0 0 1 250.3 133.4Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M252.2 101.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M116.3 133.5L116.3 101.2C116.3 95.5 126.5 95.5 126.5 101.2L126.5 133.5A5.1 2.1 0 0 1 116.3 133.5Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M118.3 98.9a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M82.8 133.5L82.8 101.2C82.8 95.5 93.0 95.5 93.0 101.2L93.0 133.5A5.1 2.1 0 0 1 82.8 133.5Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M84.8 98.9a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M49.4 133.5L49.4 98.7C49.4 93.0 59.5 93.0 59.5 98.7L59.5 133.5A5.1 2.1 0 0 1 49.4 133.5Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M51.3 96.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M368.1 137.1L368.1 106.5C368.1 100.8 378.2 100.8 378.2 106.5L378.2 137.1A5.1 2.1 0 0 1 368.1 137.1Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M370.0 104.2a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M301.1 137.1L301.1 100.0C301.1 94.3 311.2 94.3 311.2 100.0L311.2 137.1A5.1 2.1 0 0 1 301.1 137.1Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M303.1 97.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M133.7 137.2L133.7 101.3C133.7 95.6 143.8 95.6 143.8 101.3L143.8 137.2A5.1 2.1 0 0 1 133.7 137.2Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M135.6 99.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M100.2 137.2L100.2 103.5C100.2 97.8 110.4 97.8 110.4 103.5L110.4 137.2A5.1 2.1 0 0 1 100.2 137.2Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M102.2 101.2a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M66.8 137.3L66.8 105.8C66.8 100.1 76.9 100.1 76.9 105.8L76.9 137.3A5.1 2.1 0 0 1 66.8 137.3Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M68.7 103.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M33.3 137.3L33.3 103.5C33.3 97.8 43.4 97.8 43.4 103.5L43.4 137.3A5.1 2.1 0 0 1 33.3 137.3Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M35.2 101.2a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M385.5 140.9L385.5 108.1C385.5 102.4 395.6 102.4 395.6 108.1L395.6 140.9A5.1 2.1 0 0 1 385.5 140.9Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M387.4 105.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M352.0 140.9L352.0 108.4C352.0 102.7 362.1 102.7 362.1 108.4L362.1 140.9A5.1 2.1 0 0 1 352.0 140.9Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M353.9 106.1a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M117.6 141.0L117.6 103.4C117.6 97.7 127.7 97.7 127.7 103.4L127.7 141.0A5.1 2.1 0 0 1 117.6 141.0Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M119.6 101.1a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M84.1 141.0L84.1 109.3C84.1 103.6 94.3 103.6 94.3 109.3L94.3 141.0A5.1 2.1 0 0 1 84.1 141.0Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M86.1 107.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M50.7 141.0L50.7 111.0C50.7 105.3 60.8 105.3 60.8 111.0L60.8 141.0A5.1 2.1 0 0 1 50.7 141.0Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M52.6 108.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M17.2 141.0L17.2 104.4C17.2 98.7 27.3 98.7 27.3 104.4L27.3 141.0A5.1 2.1 0 0 1 17.2 141.0Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M19.1 102.1a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M402.9 144.6L402.9 108.1C402.9 102.4 413.0 102.4 413.0 108.1L413.0 144.6A5.1 2.1 0 0 1 402.9 144.6Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M404.8 105.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M369.4 144.6L369.4 111.1C369.4 105.4 379.5 105.4 379.5 111.1L379.5 144.6A5.1 2.1 0 0 1 369.4 144.6Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M371.3 108.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M335.9 144.7L335.9 113.9C335.9 108.2 346.0 108.2 346.0 113.9L346.0 144.7A5.1 2.1 0 0 1 335.9 144.7Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M337.8 111.6a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M235.5 144.7L235.5 110.2C235.5 104.5 245.6 104.5 245.6 110.2L245.6 144.7A5.1 2.1 0 0 1 235.5 144.7Z\"/><path class=\"b1-villus-tip\" d=\"M237.4 108.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M237.7 107.4a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus\" d=\"M202.0 144.7L202.0 115.5C202.0 109.8 212.1 109.8 212.1 115.5L212.1 144.7A5.1 2.1 0 0 1 202.0 144.7Z\"/><path class=\"b1-villus-tip\" d=\"M203.9 113.2a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M204.3 112.6a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus\" d=\"M168.5 144.7L168.5 111.2C168.5 105.6 178.6 105.6 178.6 111.2L178.6 144.7A5.1 2.1 0 0 1 168.5 144.7Z\"/><path class=\"b1-villus-tip\" d=\"M170.4 109.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M101.5 144.8L101.5 109.6C101.5 103.9 111.7 103.9 111.7 109.6L111.7 144.8A5.1 2.1 0 0 1 101.5 144.8Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M103.5 107.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M68.1 144.8L68.1 115.9C68.1 110.2 78.2 110.2 78.2 115.9L78.2 144.8A5.1 2.1 0 0 1 68.1 144.8Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M70.0 113.6a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M34.6 144.8L34.6 111.9C34.6 106.2 44.7 106.2 44.7 111.9L44.7 144.8A5.1 2.1 0 0 1 34.6 144.8Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M36.5 109.6a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M420.3 148.4L420.3 110.7C420.3 105.0 430.4 105.0 430.4 110.7L430.4 148.4A5.1 2.1 0 0 1 420.3 148.4Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M422.2 108.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M386.8 148.4L386.8 111.1C386.8 105.5 396.9 105.5 396.9 111.1L396.9 148.4A5.1 2.1 0 0 1 386.8 148.4Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M388.7 108.9a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M353.3 148.4L353.3 117.9C353.3 112.3 363.4 112.3 363.4 117.9L363.4 148.4A5.1 2.1 0 0 1 353.3 148.4Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M355.2 115.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M286.3 148.5L286.3 110.5C286.3 104.8 296.5 104.8 296.5 110.5L296.5 148.5A5.1 2.1 0 0 1 286.3 148.5Z\"/><path class=\"b1-villus-tip\" d=\"M288.3 108.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M288.6 107.7a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus\" d=\"M252.9 148.5L252.9 110.3C252.9 104.6 263.0 104.6 263.0 110.3L263.0 148.5A5.1 2.1 0 0 1 252.9 148.5Z\"/><path class=\"b1-villus-tip\" d=\"M254.8 108.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M219.4 148.5L219.4 117.8C219.4 112.1 229.5 112.1 229.5 117.8L229.5 148.5A5.1 2.1 0 0 1 219.4 148.5Z\"/><path class=\"b1-villus-tip\" d=\"M221.3 115.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M185.9 148.5L185.9 118.4C185.9 112.7 196.0 112.7 196.0 118.4L196.0 148.5A5.1 2.1 0 0 1 185.9 148.5Z\"/><path class=\"b1-villus-tip\" d=\"M187.8 116.1a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M152.4 148.5L152.4 111.3C152.4 105.6 162.5 105.6 162.5 111.3L162.5 148.5A5.1 2.1 0 0 1 152.4 148.5Z\"/><path class=\"b1-villus-tip\" d=\"M154.3 109.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M118.9 148.5L118.9 110.5C118.9 104.8 129.0 104.8 129.0 110.5L129.0 148.5A5.1 2.1 0 0 1 118.9 148.5Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M120.8 108.2a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M85.4 148.6L85.4 116.8C85.4 111.1 95.6 111.1 95.6 116.8L95.6 148.6A5.1 2.1 0 0 1 85.4 148.6Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M87.4 114.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M52.0 148.6L52.0 117.9C52.0 112.2 62.1 112.2 62.1 117.9L62.1 148.6A5.1 2.1 0 0 1 52.0 148.6Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M53.9 115.6a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M437.7 152.1L437.7 117.2C437.7 111.5 447.8 111.5 447.8 117.2L447.8 152.1A5.1 2.1 0 0 1 437.7 152.1Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M439.6 115.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M404.2 152.2L404.2 112.6C404.2 106.9 414.3 106.9 414.3 112.6L414.3 152.2A5.1 2.1 0 0 1 404.2 152.2Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M406.1 110.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M370.7 152.2L370.7 118.4C370.7 112.7 380.8 112.7 380.8 118.4L380.8 152.2A5.1 2.1 0 0 1 370.7 152.2Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M372.6 116.1a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M303.7 152.2L303.7 117.9C303.7 112.2 313.8 112.2 313.8 117.9L313.8 152.2A5.1 2.1 0 0 1 303.7 152.2Z\"/><path class=\"b1-villus-tip\" d=\"M305.6 115.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M270.2 152.2L270.2 113.4C270.2 107.7 280.4 107.7 280.4 113.4L280.4 152.2A5.1 2.1 0 0 1 270.2 152.2Z\"/><path class=\"b1-villus-tip\" d=\"M272.2 111.1a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M236.8 152.2L236.8 117.8C236.8 112.1 246.9 112.1 246.9 117.8L246.9 152.2A5.1 2.1 0 0 1 236.8 152.2Z\"/><path class=\"b1-villus-tip\" d=\"M238.7 115.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M203.3 152.3L203.3 122.0C203.3 116.3 213.4 116.3 213.4 122.0L213.4 152.3A5.1 2.1 0 0 1 203.3 152.3Z\"/><path class=\"b1-villus-tip\" d=\"M205.2 119.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M205.6 119.2a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus\" d=\"M169.8 152.3L169.8 118.8C169.8 113.1 179.9 113.1 179.9 118.8L179.9 152.3A5.1 2.1 0 0 1 169.8 152.3Z\"/><path class=\"b1-villus-tip\" d=\"M171.7 116.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M172.1 116.0a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M102.8 152.3L102.8 117.0C102.8 111.3 113.0 111.3 113.0 117.0L113.0 152.3A5.1 2.1 0 0 1 102.8 152.3Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M104.8 114.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M69.4 152.3L69.4 119.9C69.4 114.2 79.5 114.2 79.5 119.9L79.5 152.3A5.1 2.1 0 0 1 69.4 152.3Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M71.3 117.6a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M455.0 155.9L455.0 124.6C455.0 118.9 465.2 118.9 465.2 124.6L465.2 155.9A5.1 2.1 0 0 1 455.0 155.9Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M457.0 122.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M421.6 155.9L421.6 118.1C421.6 112.4 431.7 112.4 431.7 118.1L431.7 155.9A5.1 2.1 0 0 1 421.6 155.9Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M423.5 115.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M388.1 155.9L388.1 119.0C388.1 113.3 398.2 113.3 398.2 119.0L398.2 155.9A5.1 2.1 0 0 1 388.1 155.9Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M390.0 116.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M321.1 156.0L321.1 124.3C321.1 118.6 331.2 118.6 331.2 124.3L331.2 156.0A5.1 2.1 0 0 1 321.1 156.0Z\"/><path class=\"b1-villus-tip\" d=\"M323.0 122.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M287.6 156.0L287.6 120.2C287.6 114.5 297.8 114.5 297.8 120.2L297.8 156.0A5.1 2.1 0 0 1 287.6 156.0Z\"/><path class=\"b1-villus-tip\" d=\"M289.6 117.9a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M289.9 117.3a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus\" d=\"M254.1 156.0L254.1 119.6C254.1 113.9 264.3 113.9 264.3 119.6L264.3 156.0A5.1 2.1 0 0 1 254.1 156.0Z\"/><path class=\"b1-villus-tip\" d=\"M256.1 117.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M256.4 116.8a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus\" d=\"M220.7 156.0L220.7 122.3C220.7 116.6 230.8 116.6 230.8 122.3L230.8 156.0A5.1 2.1 0 0 1 220.7 156.0Z\"/><path class=\"b1-villus-tip\" d=\"M222.6 120.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M187.2 156.0L187.2 123.7C187.2 118.0 197.3 118.0 197.3 123.7L197.3 156.0A5.1 2.1 0 0 1 187.2 156.0Z\"/><path class=\"b1-villus-tip\" d=\"M189.1 121.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M153.7 156.1L153.7 122.7C153.7 117.0 163.8 117.0 163.8 122.7L163.8 156.1A5.1 2.1 0 0 1 153.7 156.1Z\"/><path class=\"b1-villus-tip\" d=\"M155.6 120.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M86.7 156.1L86.7 119.8C86.7 114.1 96.9 114.1 96.9 119.8L96.9 156.1A5.1 2.1 0 0 1 86.7 156.1Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M88.7 117.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M472.4 159.7L472.4 128.7C472.4 123.0 482.6 123.0 482.6 128.7L482.6 159.7A5.1 2.1 0 0 1 472.4 159.7Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M474.4 126.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M438.9 159.7L438.9 125.7C438.9 120.0 449.1 120.0 449.1 125.7L449.1 159.7A5.1 2.1 0 0 1 438.9 159.7Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M440.9 123.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M405.5 159.7L405.5 123.3C405.5 117.6 415.6 117.6 415.6 123.3L415.6 159.7A5.1 2.1 0 0 1 405.5 159.7Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M407.4 121.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M372.0 159.7L372.0 124.6C372.0 118.9 382.1 118.9 382.1 124.6L382.1 159.7A5.1 2.1 0 0 1 372.0 159.7Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M373.9 122.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M305.0 159.8L305.0 127.3C305.0 121.6 315.1 121.6 315.1 127.3L315.1 159.8A5.1 2.1 0 0 1 305.0 159.8Z\"/><path class=\"b1-villus-tip\" d=\"M306.9 125.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M271.5 159.8L271.5 125.5C271.5 119.8 281.7 119.8 281.7 125.5L281.7 159.8A5.1 2.1 0 0 1 271.5 159.8Z\"/><path class=\"b1-villus-tip\" d=\"M273.5 123.2a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M238.1 159.8L238.1 123.1C238.1 117.4 248.2 117.4 248.2 123.1L248.2 159.8A5.1 2.1 0 0 1 238.1 159.8Z\"/><path class=\"b1-villus-tip\" d=\"M240.0 120.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M204.6 159.8L204.6 124.7C204.6 119.0 214.7 119.0 214.7 124.7L214.7 159.8A5.1 2.1 0 0 1 204.6 159.8Z\"/><path class=\"b1-villus-tip\" d=\"M206.5 122.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M171.1 159.8L171.1 128.8C171.1 123.1 181.2 123.1 181.2 128.8L181.2 159.8A5.1 2.1 0 0 1 171.1 159.8Z\"/><path class=\"b1-villus-tip\" d=\"M173.0 126.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M173.4 125.9a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus\" d=\"M137.6 159.8L137.6 127.6C137.6 121.9 147.7 121.9 147.7 127.6L147.7 159.8A5.1 2.1 0 0 1 137.6 159.8Z\"/><path class=\"b1-villus-tip\" d=\"M139.5 125.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M139.9 124.7a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M104.1 159.9L104.1 122.0C104.1 116.3 114.3 116.3 114.3 122.0L114.3 159.9A5.1 2.1 0 0 1 104.1 159.9Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M106.1 119.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M489.8 163.4L489.8 129.2C489.8 123.5 499.9 123.5 499.9 129.2L499.9 163.4A5.1 2.1 0 0 1 489.8 163.4Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M491.7 126.9a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M456.3 163.4L456.3 131.0C456.3 125.4 466.5 125.4 466.5 131.0L466.5 163.4A5.1 2.1 0 0 1 456.3 163.4Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M458.3 128.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M422.9 163.5L422.9 130.6C422.9 124.9 433.0 124.9 433.0 130.6L433.0 163.5A5.1 2.1 0 0 1 422.9 163.5Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M424.8 128.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M389.4 163.5L389.4 127.5C389.4 121.8 399.5 121.8 399.5 127.5L399.5 163.5A5.1 2.1 0 0 1 389.4 163.5Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M391.3 125.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M322.4 163.5L322.4 131.0C322.4 125.3 332.5 125.3 332.5 131.0L332.5 163.5A5.1 2.1 0 0 1 322.4 163.5Z\"/><path class=\"b1-villus-tip\" d=\"M324.3 128.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M288.9 163.5L288.9 133.0C288.9 127.3 299.1 127.3 299.1 133.0L299.1 163.5A5.1 2.1 0 0 1 288.9 163.5Z\"/><path class=\"b1-villus-tip\" d=\"M290.9 130.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M255.4 163.5L255.4 127.8C255.4 122.1 265.6 122.1 265.6 127.8L265.6 163.5A5.1 2.1 0 0 1 255.4 163.5Z\"/><path class=\"b1-villus-tip\" d=\"M257.4 125.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M257.7 125.0a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus\" d=\"M222.0 163.6L222.0 124.9C222.0 119.2 232.1 119.2 232.1 124.9L232.1 163.6A5.1 2.1 0 0 1 222.0 163.6Z\"/><path class=\"b1-villus-tip\" d=\"M223.9 122.6a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M224.2 122.0a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus\" d=\"M188.5 163.6L188.5 130.8C188.5 125.1 198.6 125.1 198.6 130.8L198.6 163.6A5.1 2.1 0 0 1 188.5 163.6Z\"/><path class=\"b1-villus-tip\" d=\"M190.4 128.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M155.0 163.6L155.0 134.5C155.0 128.8 165.1 128.8 165.1 134.5L165.1 163.6A5.1 2.1 0 0 1 155.0 163.6Z\"/><path class=\"b1-villus-tip\" d=\"M156.9 132.2a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M507.2 167.2L507.2 129.7C507.2 124.1 517.3 124.1 517.3 129.7L517.3 167.2A5.1 2.1 0 0 1 507.2 167.2Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M509.1 127.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M473.7 167.2L473.7 132.4C473.7 126.7 483.8 126.7 483.8 132.4L483.8 167.2A5.1 2.1 0 0 1 473.7 167.2Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M475.7 130.1a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M440.2 167.2L440.2 137.1C440.2 131.4 450.4 131.4 450.4 137.1L450.4 167.2A5.1 2.1 0 0 1 440.2 167.2Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M442.2 134.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M406.8 167.2L406.8 134.3C406.8 128.6 416.9 128.6 416.9 134.3L416.9 167.2A5.1 2.1 0 0 1 406.8 167.2Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M408.7 132.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M339.8 167.3L339.8 131.3C339.8 125.6 349.9 125.6 349.9 131.3L349.9 167.3A5.1 2.1 0 0 1 339.8 167.3Z\"/><path class=\"b1-villus-tip\" d=\"M341.7 129.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M342.1 128.5a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus\" d=\"M306.3 167.3L306.3 138.0C306.3 132.3 316.4 132.3 316.4 138.0L316.4 167.3A5.1 2.1 0 0 1 306.3 167.3Z\"/><path class=\"b1-villus-tip\" d=\"M308.2 135.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M308.6 135.2a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus\" d=\"M272.8 167.3L272.8 135.3C272.8 129.6 283.0 129.6 283.0 135.3L283.0 167.3A5.1 2.1 0 0 1 272.8 167.3Z\"/><path class=\"b1-villus-tip\" d=\"M274.8 133.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M239.4 167.3L239.4 128.3C239.4 122.6 249.5 122.6 249.5 128.3L249.5 167.3A5.1 2.1 0 0 1 239.4 167.3Z\"/><path class=\"b1-villus-tip\" d=\"M241.3 126.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M205.9 167.3L205.9 130.7C205.9 125.0 216.0 125.0 216.0 130.7L216.0 167.3A5.1 2.1 0 0 1 205.9 167.3Z\"/><path class=\"b1-villus-tip\" d=\"M207.8 128.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M172.4 167.4L172.4 137.7C172.4 132.0 182.5 132.0 182.5 137.7L182.5 167.4A5.1 2.1 0 0 1 172.4 167.4Z\"/><path class=\"b1-villus-tip\" d=\"M174.3 135.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M138.9 167.4L138.9 135.7C138.9 130.0 149.0 130.0 149.0 135.7L149.0 167.4A5.1 2.1 0 0 1 138.9 167.4Z\"/><path class=\"b1-villus-tip\" d=\"M140.8 133.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M141.2 132.9a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M524.6 170.9L524.6 133.9C524.6 128.2 534.7 128.2 534.7 133.9L534.7 170.9A5.1 2.1 0 0 1 524.6 170.9Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M526.5 131.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M491.1 171.0L491.1 132.5C491.1 126.8 501.2 126.8 501.2 132.5L501.2 171.0A5.1 2.1 0 0 1 491.1 171.0Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M493.0 130.2a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M457.6 171.0L457.6 139.6C457.6 133.9 467.8 133.9 467.8 139.6L467.8 171.0A5.1 2.1 0 0 1 457.6 171.0Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M459.6 137.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M424.2 171.0L424.2 141.5C424.2 135.8 434.3 135.8 434.3 141.5L434.3 171.0A5.1 2.1 0 0 1 424.2 171.0Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M426.1 139.2a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M357.2 171.0L357.2 132.1C357.2 126.4 367.3 126.4 367.3 132.1L367.3 171.0A5.1 2.1 0 0 1 357.2 171.0Z\"/><path class=\"b1-villus-tip\" d=\"M359.1 129.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M323.7 171.1L323.7 139.0C323.7 133.3 333.8 133.3 333.8 139.0L333.8 171.1A5.1 2.1 0 0 1 323.7 171.1Z\"/><path class=\"b1-villus-tip\" d=\"M325.6 136.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M290.2 171.1L290.2 141.4C290.2 135.7 300.3 135.7 300.3 141.4L300.3 171.1A5.1 2.1 0 0 1 290.2 171.1Z\"/><path class=\"b1-villus-tip\" d=\"M292.2 139.1a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M256.7 171.1L256.7 135.3C256.7 129.6 266.9 129.6 266.9 135.3L266.9 171.1A5.1 2.1 0 0 1 256.7 171.1Z\"/><path class=\"b1-villus-tip\" d=\"M258.7 133.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M223.3 171.1L223.3 132.9C223.3 127.2 233.4 127.2 233.4 132.9L233.4 171.1A5.1 2.1 0 0 1 223.3 171.1Z\"/><path class=\"b1-villus-tip\" d=\"M225.2 130.6a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M225.5 130.1a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus\" d=\"M189.8 171.1L189.8 137.9C189.8 132.2 199.9 132.2 199.9 137.9L199.9 171.1A5.1 2.1 0 0 1 189.8 171.1Z\"/><path class=\"b1-villus-tip\" d=\"M191.7 135.6a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M192.1 135.0a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus\" d=\"M156.3 171.1L156.3 140.3C156.3 134.6 166.4 134.6 166.4 140.3L166.4 171.1A5.1 2.1 0 0 1 156.3 171.1Z\"/><path class=\"b1-villus-tip\" d=\"M158.2 138.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M542.0 174.7L542.0 141.3C542.0 135.6 552.1 135.6 552.1 141.3L552.1 174.7A5.1 2.1 0 0 1 542.0 174.7Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M543.9 139.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M508.5 174.7L508.5 135.4C508.5 129.7 518.6 129.7 518.6 135.4L518.6 174.7A5.1 2.1 0 0 1 508.5 174.7Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M510.4 133.1a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M475.0 174.7L475.0 139.5C475.0 133.8 485.1 133.8 485.1 139.5L485.1 174.7A5.1 2.1 0 0 1 475.0 174.7Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M476.9 137.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M441.5 174.8L441.5 145.3C441.5 139.6 451.7 139.6 451.7 145.3L451.7 174.8A5.1 2.1 0 0 1 441.5 174.8Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M443.5 143.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M408.1 174.8L408.1 141.8C408.1 136.1 418.2 136.1 418.2 141.8L418.2 174.8A5.1 2.1 0 0 1 408.1 174.8Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M410.0 139.6a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M341.1 174.8L341.1 139.2C341.1 133.5 351.2 133.5 351.2 139.2L351.2 174.8A5.1 2.1 0 0 1 341.1 174.8Z\"/><path class=\"b1-villus-tip\" d=\"M343.0 136.9a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M307.6 174.8L307.6 143.5C307.6 137.8 317.7 137.8 317.7 143.5L317.7 174.8A5.1 2.1 0 0 1 307.6 174.8Z\"/><path class=\"b1-villus-tip\" d=\"M309.5 141.2a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M309.9 140.7a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus\" d=\"M274.1 174.8L274.1 142.3C274.1 136.6 284.3 136.6 284.3 142.3L284.3 174.8A5.1 2.1 0 0 1 274.1 174.8Z\"/><path class=\"b1-villus-tip\" d=\"M276.1 140.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M276.4 139.4a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus\" d=\"M240.7 174.9L240.7 139.1C240.7 133.4 250.8 133.4 250.8 139.1L250.8 174.9A5.1 2.1 0 0 1 240.7 174.9Z\"/><path class=\"b1-villus-tip\" d=\"M242.6 136.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M207.2 174.9L207.2 139.0C207.2 133.3 217.3 133.3 217.3 139.0L217.3 174.9A5.1 2.1 0 0 1 207.2 174.9Z\"/><path class=\"b1-villus-tip\" d=\"M209.1 136.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M173.7 174.9L173.7 141.0C173.7 135.3 183.8 135.3 183.8 141.0L183.8 174.9A5.1 2.1 0 0 1 173.7 174.9Z\"/><path class=\"b1-villus-tip\" d=\"M175.6 138.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M559.4 178.5L559.4 147.8C559.4 142.1 569.5 142.1 569.5 147.8L569.5 178.5A5.1 2.1 0 0 1 559.4 178.5Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M561.3 145.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M525.9 178.5L525.9 142.1C525.9 136.4 536.0 136.4 536.0 142.1L536.0 178.5A5.1 2.1 0 0 1 525.9 178.5Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M527.8 139.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M492.4 178.5L492.4 141.2C492.4 135.6 502.5 135.6 502.5 141.2L502.5 178.5A5.1 2.1 0 0 1 492.4 178.5Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M494.3 139.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M458.9 178.5L458.9 145.6C458.9 139.9 469.1 139.9 469.1 145.6L469.1 178.5A5.1 2.1 0 0 1 458.9 178.5Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M460.9 143.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M425.5 178.5L425.5 146.9C425.5 141.2 435.6 141.2 435.6 146.9L435.6 178.5A5.1 2.1 0 0 1 425.5 178.5Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M427.4 144.6a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M358.5 178.6L358.5 142.5C358.5 136.8 368.6 136.8 368.6 142.5L368.6 178.6A5.1 2.1 0 0 1 358.5 178.6Z\"/><path class=\"b1-villus-tip\" d=\"M360.4 140.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M360.8 139.7a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus\" d=\"M325.0 178.6L325.0 143.4C325.0 137.7 335.1 137.7 335.1 143.4L335.1 178.6A5.1 2.1 0 0 1 325.0 178.6Z\"/><path class=\"b1-villus-tip\" d=\"M326.9 141.1a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M291.5 178.6L291.5 145.6C291.5 139.9 301.6 139.9 301.6 145.6L301.6 178.6A5.1 2.1 0 0 1 291.5 178.6Z\"/><path class=\"b1-villus-tip\" d=\"M293.4 143.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M258.0 178.6L258.0 146.5C258.0 140.8 268.2 140.8 268.2 146.5L268.2 178.6A5.1 2.1 0 0 1 258.0 178.6Z\"/><path class=\"b1-villus-tip\" d=\"M260.0 144.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M224.6 178.6L224.6 144.0C224.6 138.3 234.7 138.3 234.7 144.0L234.7 178.6A5.1 2.1 0 0 1 224.6 178.6Z\"/><path class=\"b1-villus-tip\" d=\"M226.5 141.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M191.1 178.7L191.1 141.3C191.1 135.6 201.2 135.6 201.2 141.3L201.2 178.7A5.1 2.1 0 0 1 191.1 178.7Z\"/><path class=\"b1-villus-tip\" d=\"M193.0 139.1a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M193.4 138.5a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M543.3 182.2L543.3 149.3C543.3 143.6 553.4 143.6 553.4 149.3L553.4 182.2A5.1 2.1 0 0 1 543.3 182.2Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M545.2 147.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M509.8 182.3L509.8 147.0C509.8 141.3 519.9 141.3 519.9 147.0L519.9 182.3A5.1 2.1 0 0 1 509.8 182.3Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M511.7 144.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M476.3 182.3L476.3 146.3C476.3 140.6 486.4 140.6 486.4 146.3L486.4 182.3A5.1 2.1 0 0 1 476.3 182.3Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M478.2 144.1a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M442.8 182.3L442.8 148.0C442.8 142.3 453.0 142.3 453.0 148.0L453.0 182.3A5.1 2.1 0 0 1 442.8 182.3Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M444.8 145.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M375.9 182.3L375.9 149.5C375.9 143.8 386.0 143.8 386.0 149.5L386.0 182.3A5.1 2.1 0 0 1 375.9 182.3Z\"/><path class=\"b1-villus-tip\" d=\"M377.8 147.2a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M342.4 182.3L342.4 145.5C342.4 139.8 352.5 139.8 352.5 145.5L352.5 182.3A5.1 2.1 0 0 1 342.4 182.3Z\"/><path class=\"b1-villus-tip\" d=\"M344.3 143.2a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M308.9 182.4L308.9 145.7C308.9 140.0 319.0 140.0 319.0 145.7L319.0 182.4A5.1 2.1 0 0 1 308.9 182.4Z\"/><path class=\"b1-villus-tip\" d=\"M310.8 143.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M275.4 182.4L275.4 151.1C275.4 145.5 285.6 145.5 285.6 151.1L285.6 182.4A5.1 2.1 0 0 1 275.4 182.4Z\"/><path class=\"b1-villus-tip\" d=\"M277.4 148.9a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M277.7 148.3a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus\" d=\"M242.0 182.4L242.0 151.6C242.0 145.9 252.1 145.9 252.1 151.6L252.1 182.4A5.1 2.1 0 0 1 242.0 182.4Z\"/><path class=\"b1-villus-tip\" d=\"M243.9 149.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M244.2 148.7a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus\" d=\"M208.5 182.4L208.5 145.1C208.5 139.4 218.6 139.4 218.6 145.1L218.6 182.4A5.1 2.1 0 0 1 208.5 182.4Z\"/><path class=\"b1-villus-tip\" d=\"M210.4 142.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M560.7 186.0L560.7 153.1C560.7 147.4 570.8 147.4 570.8 153.1L570.8 186.0A5.1 2.1 0 0 1 560.7 186.0Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M562.6 150.9a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M527.2 186.0L527.2 154.6C527.2 148.9 537.3 148.9 537.3 154.6L537.3 186.0A5.1 2.1 0 0 1 527.2 186.0Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M529.1 152.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M493.7 186.0L493.7 150.9C493.7 145.2 503.8 145.2 503.8 150.9L503.8 186.0A5.1 2.1 0 0 1 493.7 186.0Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M495.6 148.6a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M460.2 186.1L460.2 148.1C460.2 142.4 470.4 142.4 470.4 148.1L470.4 186.1A5.1 2.1 0 0 1 460.2 186.1Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M462.2 145.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M426.7 186.1L426.7 152.5C426.7 146.8 436.9 146.8 436.9 152.5L436.9 186.1A5.1 2.1 0 0 1 426.7 186.1Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M428.7 150.2a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M359.8 186.1L359.8 151.6C359.8 145.9 369.9 145.9 369.9 151.6L369.9 186.1A5.1 2.1 0 0 1 359.8 186.1Z\"/><path class=\"b1-villus-tip\" d=\"M361.7 149.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M362.1 148.8a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus\" d=\"M326.3 186.1L326.3 146.8C326.3 141.1 336.4 141.1 336.4 146.8L336.4 186.1A5.1 2.1 0 0 1 326.3 186.1Z\"/><path class=\"b1-villus-tip\" d=\"M328.2 144.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M328.6 144.0a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus\" d=\"M292.8 186.1L292.8 151.9C292.8 146.2 302.9 146.2 302.9 151.9L302.9 186.1A5.1 2.1 0 0 1 292.8 186.1Z\"/><path class=\"b1-villus-tip\" d=\"M294.7 149.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M259.3 186.2L259.3 157.4C259.3 151.7 269.5 151.7 269.5 157.4L269.5 186.2A5.1 2.1 0 0 1 259.3 186.2Z\"/><path class=\"b1-villus-tip\" d=\"M261.3 155.1a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M225.9 186.2L225.9 152.3C225.9 146.6 236.0 146.6 236.0 152.3L236.0 186.2A5.1 2.1 0 0 1 225.9 186.2Z\"/><path class=\"b1-villus-tip\" d=\"M227.8 150.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M544.6 189.8L544.6 159.7C544.6 154.0 554.7 154.0 554.7 159.7L554.7 189.8A5.1 2.1 0 0 1 544.6 189.8Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M546.5 157.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M511.1 189.8L511.1 158.4C511.1 152.7 521.2 152.7 521.2 158.4L521.2 189.8A5.1 2.1 0 0 1 511.1 189.8Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M513.0 156.1a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M477.6 189.8L477.6 151.4C477.6 145.7 487.7 145.7 487.7 151.4L487.7 189.8A5.1 2.1 0 0 1 477.6 189.8Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M479.5 149.1a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M377.2 189.9L377.2 159.1C377.2 153.4 387.3 153.4 387.3 159.1L387.3 189.9A5.1 2.1 0 0 1 377.2 189.9Z\"/><path class=\"b1-villus-tip\" d=\"M379.1 156.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M343.7 189.9L343.7 151.8C343.7 146.1 353.8 146.1 353.8 151.8L353.8 189.9A5.1 2.1 0 0 1 343.7 189.9Z\"/><path class=\"b1-villus-tip\" d=\"M345.6 149.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M310.2 189.9L310.2 152.2C310.2 146.6 320.3 146.6 320.3 152.2L320.3 189.9A5.1 2.1 0 0 1 310.2 189.9Z\"/><path class=\"b1-villus-tip\" d=\"M312.1 150.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M276.7 189.9L276.7 159.1C276.7 153.4 286.9 153.4 286.9 159.1L286.9 189.9A5.1 2.1 0 0 1 276.7 189.9Z\"/><path class=\"b1-villus-tip\" d=\"M278.7 156.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M243.2 189.9L243.2 159.1C243.2 153.4 253.4 153.4 253.4 159.1L253.4 189.9A5.1 2.1 0 0 1 243.2 189.9Z\"/><path class=\"b1-villus-tip\" d=\"M245.2 156.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M245.5 156.2a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M528.5 193.6L528.5 164.6C528.5 158.9 538.6 158.9 538.6 164.6L538.6 193.6A5.1 2.1 0 0 1 528.5 193.6Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M530.4 162.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M394.6 193.6L394.6 163.8C394.6 158.1 404.7 158.1 404.7 163.8L404.7 193.6A5.1 2.1 0 0 1 394.6 193.6Z\"/><path class=\"b1-villus-tip\" d=\"M396.5 161.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M361.1 193.6L361.1 159.3C361.1 153.6 371.2 153.6 371.2 159.3L371.2 193.6A5.1 2.1 0 0 1 361.1 193.6Z\"/><path class=\"b1-villus-tip\" d=\"M363.0 157.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M327.6 193.7L327.6 156.0C327.6 150.3 337.7 150.3 337.7 156.0L337.7 193.7A5.1 2.1 0 0 1 327.6 193.7Z\"/><path class=\"b1-villus-tip\" d=\"M329.5 153.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M329.9 153.1a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus\" d=\"M294.1 193.7L294.1 159.1C294.1 153.4 304.2 153.4 304.2 159.1L304.2 193.7A5.1 2.1 0 0 1 294.1 193.7Z\"/><path class=\"b1-villus-tip\" d=\"M296.0 156.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M296.4 156.3a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus\" d=\"M260.6 193.7L260.6 162.0C260.6 156.3 270.8 156.3 270.8 162.0L270.8 193.7A5.1 2.1 0 0 1 260.6 193.7Z\"/><path class=\"b1-villus-tip\" d=\"M262.6 159.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M378.5 197.4L378.5 165.2C378.5 159.5 388.6 159.5 388.6 165.2L388.6 197.4A5.1 2.1 0 0 1 378.5 197.4Z\"/><path class=\"b1-villus-tip\" d=\"M380.4 162.9a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M380.8 162.3a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus\" d=\"M345.0 197.4L345.0 163.1C345.0 157.4 355.1 157.4 355.1 163.1L355.1 197.4A5.1 2.1 0 0 1 345.0 197.4Z\"/><path class=\"b1-villus-tip\" d=\"M346.9 160.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M311.5 197.4L311.5 161.5C311.5 155.8 321.6 155.8 321.6 161.5L321.6 197.4A5.1 2.1 0 0 1 311.5 197.4Z\"/><path class=\"b1-villus-tip\" d=\"M313.4 159.2a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M278.0 197.5L278.0 162.1C278.0 156.4 288.1 156.4 288.1 162.1L288.1 197.5A5.1 2.1 0 0 1 278.0 197.5Z\"/><path class=\"b1-villus-tip\" d=\"M280.0 159.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M462.8 201.1L462.8 166.0C462.8 160.3 472.9 160.3 472.9 166.0L472.9 201.1A5.1 2.1 0 0 1 462.8 201.1Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M464.8 163.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M429.3 201.2L429.3 164.9C429.3 159.2 439.5 159.2 439.5 164.9L439.5 201.2A5.1 2.1 0 0 1 429.3 201.2Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M431.3 162.6a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M395.9 201.2L395.9 167.0C395.9 161.3 406.0 161.3 406.0 167.0L406.0 201.2A5.1 2.1 0 0 1 395.9 201.2Z\"/><path class=\"b1-villus-tip\" d=\"M397.8 164.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M362.4 201.2L362.4 169.9C362.4 164.2 372.5 164.2 372.5 169.9L372.5 201.2A5.1 2.1 0 0 1 362.4 201.2Z\"/><path class=\"b1-villus-tip\" d=\"M364.3 167.6a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M328.9 201.2L328.9 167.9C328.9 162.2 339.0 162.2 339.0 167.9L339.0 201.2A5.1 2.1 0 0 1 328.9 201.2Z\"/><path class=\"b1-villus-tip\" d=\"M330.8 165.6a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M295.4 201.2L295.4 163.4C295.4 157.7 305.5 157.7 305.5 163.4L305.5 201.2A5.1 2.1 0 0 1 295.4 201.2Z\"/><path class=\"b1-villus-tip\" d=\"M297.3 161.1a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M297.7 160.6a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M513.7 204.9L513.7 172.8C513.7 167.1 523.8 167.1 523.8 172.8L523.8 204.9A5.1 2.1 0 0 1 513.7 204.9Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M515.6 170.5a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M480.2 204.9L480.2 173.5C480.2 167.8 490.3 167.8 490.3 173.5L490.3 204.9A5.1 2.1 0 0 1 480.2 204.9Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M482.1 171.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M446.7 204.9L446.7 168.5C446.7 162.9 456.9 162.9 456.9 168.5L456.9 204.9A5.1 2.1 0 0 1 446.7 204.9Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M448.7 166.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M379.8 204.9L379.8 172.9C379.8 167.2 389.9 167.2 389.9 172.9L389.9 204.9A5.1 2.1 0 0 1 379.8 204.9Z\"/><path class=\"b1-villus-tip\" d=\"M381.7 170.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M382.0 170.1a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus\" d=\"M346.3 205.0L346.3 175.3C346.3 169.6 356.4 169.6 356.4 175.3L356.4 205.0A5.1 2.1 0 0 1 346.3 205.0Z\"/><path class=\"b1-villus-tip\" d=\"M348.2 173.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M348.6 172.5a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus\" d=\"M312.8 205.0L312.8 168.7C312.8 163.0 322.9 163.0 322.9 168.7L322.9 205.0A5.1 2.1 0 0 1 312.8 205.0Z\"/><path class=\"b1-villus-tip\" d=\"M314.7 166.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M531.1 208.6L531.1 173.7C531.1 168.0 541.2 168.0 541.2 173.7L541.2 208.6A5.1 2.1 0 0 1 531.1 208.6Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M533.0 171.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M497.6 208.7L497.6 179.5C497.6 173.8 507.7 173.8 507.7 179.5L507.7 208.7A5.1 2.1 0 0 1 497.6 208.7Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M499.5 177.2a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M464.1 208.7L464.1 175.7C464.1 170.0 474.2 170.0 474.2 175.7L474.2 208.7A5.1 2.1 0 0 1 464.1 208.7Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M466.0 173.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M430.6 208.7L430.6 169.3C430.6 163.6 440.8 163.6 440.8 169.3L440.8 208.7A5.1 2.1 0 0 1 430.6 208.7Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M432.6 167.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M363.7 208.7L363.7 179.6C363.7 173.9 373.8 173.9 373.8 179.6L373.8 208.7A5.1 2.1 0 0 1 363.7 208.7Z\"/><path class=\"b1-villus-tip\" d=\"M365.6 177.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M330.2 208.7L330.2 176.3C330.2 170.6 340.3 170.6 340.3 176.3L340.3 208.7A5.1 2.1 0 0 1 330.2 208.7Z\"/><path class=\"b1-villus-tip\" d=\"M332.1 174.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M515.0 212.4L515.0 181.3C515.0 175.6 525.1 175.6 525.1 181.3L525.1 212.4A5.1 2.1 0 0 1 515.0 212.4Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M516.9 179.1a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M481.5 212.4L481.5 182.5C481.5 176.8 491.6 176.8 491.6 182.5L491.6 212.4A5.1 2.1 0 0 1 481.5 212.4Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M483.4 180.2a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M448.0 212.5L448.0 175.7C448.0 170.0 458.2 170.0 458.2 175.7L458.2 212.5A5.1 2.1 0 0 1 448.0 212.5Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M450.0 173.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M414.6 212.5L414.6 174.3C414.6 168.6 424.7 168.6 424.7 174.3L424.7 212.5A5.1 2.1 0 0 1 414.6 212.5Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M416.5 172.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M381.1 212.5L381.1 180.2C381.1 174.5 391.2 174.5 391.2 180.2L391.2 212.5A5.1 2.1 0 0 1 381.1 212.5Z\"/><path class=\"b1-villus-tip\" d=\"M383.0 178.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M347.6 212.5L347.6 181.8C347.6 176.1 357.7 176.1 357.7 181.8L357.7 212.5A5.1 2.1 0 0 1 347.6 212.5Z\"/><path class=\"b1-villus-tip\" d=\"M349.5 179.6a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-dmt1\" d=\"M349.9 179.0a2.8 2.7 0 1 0 5.6 0a2.8 2.7 0 1 0 -5.6 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M498.9 216.2L498.9 185.6C498.9 179.9 509.0 179.9 509.0 185.6L509.0 216.2A5.1 2.1 0 0 1 498.9 216.2Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M500.8 183.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M465.4 216.2L465.4 183.1C465.4 177.4 475.5 177.4 475.5 183.1L475.5 216.2A5.1 2.1 0 0 1 465.4 216.2Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M467.3 180.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M431.9 216.2L431.9 179.5C431.9 173.8 442.1 173.8 442.1 179.5L442.1 216.2A5.1 2.1 0 0 1 431.9 216.2Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M433.9 177.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus\" d=\"M365.0 216.3L365.0 183.3C365.0 177.7 375.1 177.7 375.1 183.3L375.1 216.3A5.1 2.1 0 0 1 365.0 216.3Z\"/><path class=\"b1-villus-tip\" d=\"M366.9 181.1a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M516.3 220.0L516.3 185.7C516.3 180.0 526.4 180.0 526.4 185.7L526.4 220.0A5.1 2.1 0 0 1 516.3 220.0Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M518.2 183.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M482.8 220.0L482.8 187.5C482.8 181.8 492.9 181.8 492.9 187.5L492.9 220.0A5.1 2.1 0 0 1 482.8 220.0Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M484.7 185.2a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M449.3 220.0L449.3 187.1C449.3 181.4 459.5 181.4 459.5 187.1L459.5 220.0A5.1 2.1 0 0 1 449.3 220.0Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M451.3 184.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M415.8 220.0L415.8 184.7C415.8 179.0 426.0 179.0 426.0 184.7L426.0 220.0A5.1 2.1 0 0 1 415.8 220.0Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M417.8 182.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M500.2 223.7L500.2 188.1C500.2 182.4 510.3 182.4 510.3 188.1L510.3 223.7A5.1 2.1 0 0 1 500.2 223.7Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M502.1 185.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M466.7 223.8L466.7 192.7C466.7 187.0 476.8 187.0 476.8 192.7L476.8 223.8A5.1 2.1 0 0 1 466.7 223.8Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M468.6 190.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M433.2 223.8L433.2 192.0C433.2 186.3 443.4 186.3 443.4 192.0L443.4 223.8A5.1 2.1 0 0 1 433.2 223.8Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M435.2 189.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M399.8 223.8L399.8 186.1C399.8 180.4 409.9 180.4 409.9 186.1L409.9 223.8A5.1 2.1 0 0 1 399.8 223.8Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M401.7 183.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M484.1 227.5L484.1 194.3C484.1 188.6 494.2 188.6 494.2 194.3L494.2 227.5A5.1 2.1 0 0 1 484.1 227.5Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M486.0 192.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M450.6 227.5L450.6 198.6C450.6 192.9 460.7 192.9 460.7 198.6L460.7 227.5A5.1 2.1 0 0 1 450.6 227.5Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M452.6 196.3a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M417.1 227.5L417.1 192.7C417.1 187.0 427.3 187.0 427.3 192.7L427.3 227.5A5.1 2.1 0 0 1 417.1 227.5Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M419.1 190.4a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M501.5 231.3L501.5 194.3C501.5 188.6 511.6 188.6 511.6 194.3L511.6 231.3A5.1 2.1 0 0 1 501.5 231.3Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M503.4 192.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M468.0 231.3L468.0 201.3C468.0 195.6 478.1 195.6 478.1 201.3L478.1 231.3A5.1 2.1 0 0 1 468.0 231.3Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M469.9 199.0a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M434.5 231.3L434.5 200.0C434.5 194.3 444.7 194.3 444.7 200.0L444.7 231.3A5.1 2.1 0 0 1 434.5 231.3Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M436.5 197.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M485.4 235.1L485.4 201.3C485.4 195.6 495.5 195.6 495.5 201.3L495.5 235.1A5.1 2.1 0 0 1 485.4 235.1Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M487.3 199.1a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M451.9 235.1L451.9 204.0C451.9 198.3 462.0 198.3 462.0 204.0L462.0 235.1A5.1 2.1 0 0 1 451.9 235.1Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M453.8 201.7a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M469.3 238.8L469.3 204.4C469.3 198.8 479.4 198.8 479.4 204.4L479.4 238.8A5.1 2.1 0 0 1 469.3 238.8Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M471.2 202.2a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/><path class=\"b1-villus b1-villus-dim\" d=\"M486.7 242.6L486.7 205.0C486.7 199.4 496.8 199.4 496.8 205.0L496.8 242.6A5.1 2.1 0 0 1 486.7 242.6Z\"/><path class=\"b1-villus-tip b1-villus-dim\" d=\"M488.6 202.8a3.1 2.5 0 1 0 6.3 0a3.1 2.5 0 1 0 -6.3 0Z\"/></g><g clip-path=\"url(#b1-sideclip)\"><g transform=\"matrix(0.4623 -0.3537 0.0000 0.8996 494.91 113.77)\">\n<path class=\"a1-villus a1-dim b1-end-villus\" d=\"M10.5 115.9h0.0a6.5 6.5 0 0 1 6.5 6.5v31.1a6.5 6.5 0 0 1 -13.0 0v-31.1a6.5 6.5 0 0 1 6.5 -6.5ZM30.5 116.7h0.0a6.5 6.5 0 0 1 6.5 6.5v30.3a6.5 6.5 0 0 1 -13.0 0v-30.3a6.5 6.5 0 0 1 6.5 -6.5ZM50.5 110.3h0.0a6.5 6.5 0 0 1 6.5 6.5v36.7a6.5 6.5 0 0 1 -13.0 0v-36.7a6.5 6.5 0 0 1 6.5 -6.5ZM70.5 113.9h0.0a6.5 6.5 0 0 1 6.5 6.5v33.1a6.5 6.5 0 0 1 -13.0 0v-33.1a6.5 6.5 0 0 1 6.5 -6.5ZM130.5 111.9h0.0a6.5 6.5 0 0 1 6.5 6.5v35.1a6.5 6.5 0 0 1 -13.0 0v-35.1a6.5 6.5 0 0 1 6.5 -6.5ZM150.5 117.9h0.0a6.5 6.5 0 0 1 6.5 6.5v29.1a6.5 6.5 0 0 1 -13.0 0v-29.1a6.5 6.5 0 0 1 6.5 -6.5ZM170.5 113.5h0.0a6.5 6.5 0 0 1 6.5 6.5v33.5a6.5 6.5 0 0 1 -13.0 0v-33.5a6.5 6.5 0 0 1 6.5 -6.5ZM190.5 110.4h0.0a6.5 6.5 0 0 1 6.5 6.5v36.6a6.5 6.5 0 0 1 -13.0 0v-36.6a6.5 6.5 0 0 1 6.5 -6.5Z\"/>\n<rect class=\"b1-lateral\" x=\"0\" y=\"148\" width=\"210\" height=\"384\"/>\n<rect class=\"a1-tissue\" x=\"0\" y=\"526\" width=\"210\" height=\"114\"/>\n<path class=\"a1-cell a1-dim\" d=\"M0.0 149.4C2.8 122.7 14.2 150.8 19.8 150.8C25.4 150.8 34.0 149.4 39.6 149.4C45.2 149.4 53.8 150.8 59.4 150.8C65.0 150.8 73.6 149.4 79.2 149.4C84.8 149.4 96.0 144.0 99.0 150.8C102.0 157.6 100.3 184.0 100.1 197.3C99.9 210.5 98.2 231.1 97.7 244.5C97.2 257.9 96.5 278.4 96.5 291.8C96.5 305.1 97.1 325.6 97.6 339.0C98.1 352.4 99.5 372.9 100.0 386.3C100.6 399.6 101.4 420.1 101.5 433.5C101.6 446.9 102.0 467.1 100.7 480.8C99.3 494.4 95.0 523.2 92.0 530.0C89.0 536.8 83.8 528.9 79.2 529.0C74.6 529.1 65.0 530.5 59.4 530.5C53.8 530.5 45.2 529.0 39.6 529.0C34.0 529.0 25.4 530.4 19.8 530.5C14.2 530.6 2.8 557.1 0.0 530.0C-2.8 502.9 0.0 392.9 0.0 339.0C0.0 285.1 -2.8 176.1 0.0 149.4Z\"/>\n<path class=\"a1-cell a1-dim\" d=\"M105.0 149.4C109.2 141.7 120.6 150.8 128.4 150.8C136.2 150.8 144.0 149.4 151.8 149.4C159.6 149.4 167.4 150.8 175.2 150.8C183.0 150.8 190.8 149.4 198.6 149.4C206.4 149.4 218.3 142.8 222.0 150.8C225.7 158.8 221.3 181.6 220.9 197.3C220.5 212.9 219.6 228.8 219.5 244.5C219.4 260.3 219.9 276.0 220.4 291.8C221.0 307.5 222.1 323.3 222.8 339.0C223.4 354.8 224.2 370.5 224.4 386.3C224.6 402.0 224.3 417.8 223.8 433.5C223.4 449.3 223.0 464.7 221.6 480.8C220.1 496.8 218.8 522.0 215.0 530.0C211.2 538.0 205.2 528.9 198.6 529.0C192.0 529.1 183.0 530.5 175.2 530.5C167.4 530.5 159.6 529.0 151.8 529.0C144.0 529.0 135.0 530.3 128.4 530.5C121.8 530.7 116.2 538.3 112.0 530.0C107.8 521.7 104.6 496.8 103.1 480.8C101.6 464.7 102.5 449.3 102.9 433.5C103.4 417.8 105.0 402.0 105.8 386.3C106.6 370.5 107.5 354.8 107.5 339.0C107.5 323.3 106.3 307.5 105.5 291.8C104.8 276.0 103.2 260.3 102.8 244.5C102.4 228.8 102.9 213.1 103.3 197.3C103.7 181.4 100.8 157.1 105.0 149.4Z\"/>\n<path class=\"a1-web\" d=\"M3 159H93.00653594771242V165H3Z\"/>\n<path class=\"a1-nucleus a1-dim\" d=\"M93.9 446.0C93.5 452.7 91.5 459.5 88.1 465.5C84.8 471.5 80.0 478.5 73.8 481.9C67.6 485.3 58.4 486.3 51.0 486.1C43.6 485.8 35.3 483.9 29.1 480.4C23.0 477.0 17.9 471.1 14.1 465.4C10.2 459.6 6.3 452.7 5.9 446.0C5.5 439.3 7.9 431.0 11.9 425.5C15.9 419.9 23.3 415.9 29.8 412.6C36.3 409.4 43.8 406.3 51.0 406.1C58.2 405.8 66.6 407.9 73.1 411.2C79.7 414.4 86.8 419.6 90.3 425.4C93.7 431.2 94.3 439.3 93.9 446.0Z\"/>\n<path class=\"a1-mito a1-dim\" d=\"M52.9 300.0C53.1 301.3 51.9 303.1 50.0 304.2C48.1 305.3 44.7 306.4 41.7 306.7C38.7 307.0 35.2 306.6 32.1 306.2C29.0 305.8 24.8 305.4 22.9 304.4C21.0 303.4 20.7 301.4 20.9 300.0C21.1 298.6 22.3 297.1 24.1 296.0C25.9 294.9 28.8 293.9 31.8 293.4C34.8 292.9 39.2 292.5 42.0 292.9C44.8 293.4 47.0 295.0 48.8 296.2C50.6 297.3 52.7 298.7 52.9 300.0ZM87.0 230.0C87.1 231.4 85.7 233.1 83.8 234.2C81.9 235.3 78.7 236.0 75.8 236.4C73.0 236.8 69.6 237.0 66.8 236.7C63.9 236.3 60.3 235.4 58.7 234.3C57.0 233.2 56.8 231.4 57.0 230.0C57.1 228.6 57.9 227.1 59.5 226.0C61.1 224.8 63.8 223.5 66.6 223.0C69.3 222.6 73.3 222.8 76.0 223.3C78.8 223.9 81.1 225.0 82.9 226.1C84.8 227.2 86.8 228.6 87.0 230.0Z\"/>\n<path class=\"a1-nucleus a1-dim\" d=\"M168.3 462.0C168.3 467.8 167.1 474.5 164.8 479.2C162.5 483.9 158.3 487.3 154.5 490.2C150.6 493.0 146.3 495.9 142.0 496.3C137.7 496.7 132.3 495.4 128.6 492.4C124.9 489.5 121.9 483.8 119.9 478.7C117.8 473.6 116.3 467.6 116.3 462.0C116.3 456.4 117.8 450.3 119.8 445.2C121.8 440.1 124.7 434.1 128.5 431.3C132.2 428.5 137.7 427.9 142.0 428.3C146.4 428.7 150.8 430.8 154.6 433.6C158.4 436.3 162.6 440.0 164.9 444.7C167.2 449.5 168.3 456.2 168.3 462.0Z\"/>\n<rect class=\"a1-lamina\" x=\"0\" y=\"538\" width=\"210\" height=\"5\"/>\n<path class=\"b1-collagen\" d=\"M44.0 586.6q6.3 2.2 12.6 -1.9M109.4 592.4q9.8 -1.3 19.5 -0.5M79.0 608.5q8.7 0.5 17.3 -5.1M176.3 581.4q7.3 1.4 14.6 -5.0M138.8 595.5q7.9 -1.2 15.8 -0.3M171.4 551.0q10.3 1.3 20.6 -5.2M46.2 581.5q9.7 -2.4 19.4 6.2M141.7 628.6q13.1 -2.9 26.2 -3.8M158.8 616.3q7.8 -2.0 15.5 5.8M171.9 627.7q13.8 1.8 27.5 5.2M113.0 570.9q6.2 2.7 12.3 1.1M177.1 578.8q5.7 1.0 11.5 3.5M196.2 595.1q10.0 2.1 19.9 2.9M113.4 626.1q8.7 1.9 17.3 7.3M125.2 568.5q6.0 2.0 12.0 -4.5M61.4 578.8q9.0 -0.2 18.0 0.7M61.0 581.1q10.2 0.3 20.5 -5.4M192.0 558.1q12.9 1.6 25.9 10.4M134.4 580.3q10.7 0.0 21.4 6.4M92.9 593.7q13.4 0.4 26.9 -5.3M189.7 562.1q13.2 1.1 26.4 -7.4M90.1 617.8q13.0 -0.1 25.9 -2.8M125.4 569.0q11.8 2.2 23.5 -7.8M86.0 612.1q12.8 -0.4 25.6 -3.3M44.1 551.7q9.7 -1.2 19.5 -7.6M173.3 576.0q13.8 -0.0 27.7 3.1\"/><path class=\"b1-fibro\" d=\"M107.4 590.0C107.3 590.8 105.3 591.7 103.4 592.3C101.5 592.9 98.5 593.5 96.0 593.5C93.5 593.5 90.0 593.0 88.2 592.4C86.4 591.8 85.4 590.8 85.4 590.0C85.3 589.2 86.1 588.0 87.9 587.5C89.6 586.9 93.3 586.7 96.0 586.7C98.7 586.7 101.9 587.1 103.8 587.6C105.7 588.1 107.4 589.2 107.4 590.0ZM171.7 616.0C171.5 616.8 168.8 617.5 166.9 618.1C165.0 618.8 162.4 619.7 160.0 619.7C157.6 619.8 154.2 619.0 152.4 618.3C150.7 617.7 149.9 616.8 149.7 616.0C149.5 615.2 149.6 613.8 151.3 613.3C153.1 612.8 157.2 612.9 160.0 612.9C162.8 613.0 166.0 613.0 168.0 613.5C169.9 614.0 171.9 615.2 171.7 616.0ZM81.6 628.0C81.8 628.8 80.0 630.0 78.0 630.5C76.1 631.0 72.8 631.0 70.0 631.1C67.2 631.1 63.1 631.2 61.4 630.7C59.7 630.1 59.4 628.8 59.6 628.0C59.8 627.2 60.7 626.3 62.5 625.7C64.2 625.1 67.6 624.2 70.0 624.3C72.4 624.3 75.0 625.2 77.0 625.9C78.9 626.5 81.4 627.2 81.6 628.0Z\"/>\n<path class=\"a1-endo\" d=\"M0 554.0A34 34 0 0 1 0 622.0Z\"/><path class=\"a1-blood\" d=\"M0 560.0A28 28 0 0 1 0 616.0Z\"/>\n<path class=\"b1-rbc-x\" d=\"M0 575.0c6 0 9 3 9 6c0 2 -2 3 -2 7c0 4 2 5 2 7c0 3 -3 6 -9 6Z\"/>\n<rect class=\"b1-side-shade\" x=\"-1\" y=\"148\" width=\"212\" height=\"493\"/>\n</g></g><path class=\"b1-edge\" d=\"M592 174.4L592 615.3L494.9 689.5M8 143.4L8 584.2L494.9 689.5L494.9 248.7\"/>\n<g class=\"b1-front\" transform=\"matrix(0.8695 0.1880 0.0000 0.8996 -9.39 4.71)\"><g clip-path=\"url(#b1-frontclip)\"><rect class=\"b1-lateral\" x=\"20\" y=\"148\" width=\"560\" height=\"384\"/><rect class=\"a1-tissue\" x=\"0\" y=\"526\" width=\"600\" height=\"114\"/><g><path class=\"a1-villus a1-dim\" d=\"M28.5 106.2h0.0a6.5 6.5 0 0 1 6.5 6.5v40.8a6.5 6.5 0 0 1 -13.0 0v-40.8a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus a1-dim\" d=\"M48.5 109.3h0.0a6.5 6.5 0 0 1 6.5 6.5v37.7a6.5 6.5 0 0 1 -13.0 0v-37.7a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus a1-dim\" d=\"M68.5 113.3h0.0a6.5 6.5 0 0 1 6.5 6.5v33.7a6.5 6.5 0 0 1 -13.0 0v-33.7a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus a1-dim\" d=\"M88.5 113.5h0.0a6.5 6.5 0 0 1 6.5 6.5v33.5a6.5 6.5 0 0 1 -13.0 0v-33.5a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus a1-dim\" d=\"M108.5 109.8h0.0a6.5 6.5 0 0 1 6.5 6.5v37.2a6.5 6.5 0 0 1 -13.0 0v-37.2a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus a1-dim\" d=\"M128.5 106.3h0.0a6.5 6.5 0 0 1 6.5 6.5v40.7a6.5 6.5 0 0 1 -13.0 0v-40.7a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus\" d=\"M168.5 111.0h0.0a6.5 6.5 0 0 1 6.5 6.5v36.0a6.5 6.5 0 0 1 -13.0 0v-36.0a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus\" d=\"M188.5 113.9h0.0a6.5 6.5 0 0 1 6.5 6.5v33.1a6.5 6.5 0 0 1 -13.0 0v-33.1a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus\" d=\"M208.5 112.4h0.0a6.5 6.5 0 0 1 6.5 6.5v34.6a6.5 6.5 0 0 1 -13.0 0v-34.6a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus\" d=\"M228.5 108.2h0.0a6.5 6.5 0 0 1 6.5 6.5v38.8a6.5 6.5 0 0 1 -13.0 0v-38.8a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus\" d=\"M248.5 106.0h0.0a6.5 6.5 0 0 1 6.5 6.5v41.0a6.5 6.5 0 0 1 -13.0 0v-41.0a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus\" d=\"M268.5 108.3h0.0a6.5 6.5 0 0 1 6.5 6.5v38.7a6.5 6.5 0 0 1 -13.0 0v-38.7a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus\" d=\"M288.5 112.5h0.0a6.5 6.5 0 0 1 6.5 6.5v34.5a6.5 6.5 0 0 1 -13.0 0v-34.5a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus\" d=\"M308.5 113.9h0.0a6.5 6.5 0 0 1 6.5 6.5v33.1a6.5 6.5 0 0 1 -13.0 0v-33.1a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus\" d=\"M328.5 111.0h0.0a6.5 6.5 0 0 1 6.5 6.5v36.0a6.5 6.5 0 0 1 -13.0 0v-36.0a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus\" d=\"M348.5 106.9h0.0a6.5 6.5 0 0 1 6.5 6.5v40.1a6.5 6.5 0 0 1 -13.0 0v-40.1a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus\" d=\"M368.5 106.4h0.0a6.5 6.5 0 0 1 6.5 6.5v40.6a6.5 6.5 0 0 1 -13.0 0v-40.6a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus\" d=\"M388.5 109.9h0.0a6.5 6.5 0 0 1 6.5 6.5v37.1a6.5 6.5 0 0 1 -13.0 0v-37.1a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus\" d=\"M408.5 113.5h0.0a6.5 6.5 0 0 1 6.5 6.5v33.5a6.5 6.5 0 0 1 -13.0 0v-33.5a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus\" d=\"M428.5 113.2h0.0a6.5 6.5 0 0 1 6.5 6.5v33.8a6.5 6.5 0 0 1 -13.0 0v-33.8a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus a1-dim\" d=\"M448.5 109.3h0.0a6.5 6.5 0 0 1 6.5 6.5v37.7a6.5 6.5 0 0 1 -13.0 0v-37.7a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus a1-dim\" d=\"M468.5 106.2h0.0a6.5 6.5 0 0 1 6.5 6.5v40.8a6.5 6.5 0 0 1 -13.0 0v-40.8a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus a1-dim\" d=\"M488.5 107.3h0.0a6.5 6.5 0 0 1 6.5 6.5v39.7a6.5 6.5 0 0 1 -13.0 0v-39.7a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus a1-dim\" d=\"M508.5 111.5h0.0a6.5 6.5 0 0 1 6.5 6.5v35.5a6.5 6.5 0 0 1 -13.0 0v-35.5a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus a1-dim\" d=\"M528.5 114.0h0.0a6.5 6.5 0 0 1 6.5 6.5v33.0a6.5 6.5 0 0 1 -13.0 0v-33.0a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus a1-dim\" d=\"M548.5 112.0h0.0a6.5 6.5 0 0 1 6.5 6.5v35.0a6.5 6.5 0 0 1 -13.0 0v-35.0a6.5 6.5 0 0 1 6.5 -6.5Z\"/><path class=\"a1-villus a1-dim\" d=\"M568.5 107.8h0.0a6.5 6.5 0 0 1 6.5 6.5v39.2a6.5 6.5 0 0 1 -13.0 0v-39.2a6.5 6.5 0 0 1 6.5 -6.5Z\"/></g><path class=\"a1-cell a1-dim\" d=\"M-10.0 149.4C-6.1 141.7 7.1 150.8 15.7 150.8C24.2 150.8 32.8 149.4 41.3 149.4C49.9 149.4 58.4 150.8 67.0 150.8C75.6 150.8 84.1 149.4 92.7 149.4C101.2 149.4 109.8 150.8 118.3 150.8C126.9 150.8 139.3 141.7 144.0 149.4C148.7 157.1 146.7 181.4 146.7 197.3C146.8 213.1 145.3 228.8 144.4 244.5C143.6 260.3 142.3 276.0 141.7 291.8C141.2 307.5 140.9 323.3 141.1 339.0C141.4 354.8 142.4 370.5 143.2 386.3C144.0 402.0 145.3 417.8 146.0 433.5C146.6 449.3 148.6 464.7 147.0 480.8C145.3 496.8 140.8 521.7 136.0 530.0C131.2 538.3 125.6 530.7 118.3 530.5C111.1 530.3 101.2 529.0 92.7 529.0C84.1 529.0 75.6 530.5 67.0 530.5C58.4 530.5 49.9 529.0 41.3 529.0C32.8 529.0 22.9 530.3 15.7 530.5C8.4 530.7 2.6 538.3 -2.0 530.0C-6.6 521.7 -10.8 496.8 -11.9 480.8C-12.9 464.7 -9.0 449.3 -8.2 433.5C-7.5 417.8 -6.9 402.0 -7.2 386.3C-7.5 370.5 -9.3 354.8 -10.2 339.0C-11.2 323.3 -12.8 307.5 -12.9 291.8C-13.1 276.0 -12.2 260.3 -11.3 244.5C-10.5 228.8 -8.0 213.1 -7.8 197.3C-7.5 181.4 -13.9 157.1 -10.0 149.4Z\"/><path class=\"a1-cell a1-dim\" d=\"M456.0 149.4C460.7 141.7 473.1 150.8 481.7 150.8C490.2 150.8 498.8 149.4 507.3 149.4C515.9 149.4 524.4 150.8 533.0 150.8C541.6 150.8 550.1 149.4 558.7 149.4C567.2 149.4 575.8 150.8 584.3 150.8C592.9 150.8 606.1 141.7 610.0 149.4C613.9 157.1 608.2 181.4 607.7 197.3C607.3 213.1 606.9 228.8 607.1 244.5C607.4 260.3 608.4 276.0 609.2 291.8C610.0 307.5 611.3 323.3 612.0 339.0C612.6 354.8 613.1 370.5 613.0 386.3C612.8 402.0 612.0 417.8 611.2 433.5C610.5 449.3 609.9 464.7 608.4 480.8C606.8 496.8 606.0 521.7 602.0 530.0C598.0 538.3 591.6 530.7 584.3 530.5C577.1 530.3 567.2 529.0 558.7 529.0C550.1 529.0 541.6 530.5 533.0 530.5C524.4 530.5 515.9 529.0 507.3 529.0C498.8 529.0 488.9 530.3 481.7 530.5C474.4 530.7 468.5 538.3 464.0 530.0C459.5 521.7 456.5 496.8 454.7 480.8C452.8 464.7 452.9 449.3 453.1 433.5C453.2 417.8 454.8 402.0 455.8 386.3C456.7 370.5 458.5 354.8 458.8 339.0C459.1 323.3 458.5 307.5 457.7 291.8C456.9 276.0 454.9 260.3 454.1 244.5C453.4 228.8 452.9 213.1 453.3 197.3C453.6 181.4 451.3 157.1 456.0 149.4Z\"/><path class=\"a1-cell\" d=\"M150.0 149.4C157.8 141.7 183.3 150.8 200.0 150.8C216.7 150.8 233.3 149.4 250.0 149.4C266.7 149.4 283.3 150.8 300.0 150.8C316.7 150.8 333.3 149.4 350.0 149.4C366.7 149.4 383.3 150.8 400.0 150.8C416.7 150.8 441.2 141.7 450.0 149.4C458.8 157.1 452.6 181.4 453.0 197.3C453.3 213.1 452.6 228.8 452.0 244.5C451.4 260.3 450.0 276.0 449.2 291.8C448.4 307.5 447.4 323.3 447.1 339.0C446.9 354.8 447.1 370.5 447.7 386.3C448.2 402.0 449.5 417.8 450.3 433.5C451.2 449.3 454.1 464.7 452.7 480.8C451.3 496.8 450.8 521.7 442.0 530.0C433.2 538.3 415.3 530.7 400.0 530.5C384.7 530.3 366.7 529.0 350.0 529.0C333.3 529.0 316.7 530.5 300.0 530.5C283.3 530.5 266.7 529.0 250.0 529.0C233.3 529.0 215.3 530.3 200.0 530.5C184.7 530.7 166.4 538.3 158.0 530.0C149.6 521.7 150.6 496.8 149.8 480.8C148.9 464.7 152.5 449.3 152.8 433.5C153.1 417.8 152.5 402.0 151.7 386.3C150.9 370.5 148.9 354.8 148.1 339.0C147.4 323.3 146.9 307.5 147.3 291.8C147.6 276.0 149.5 260.3 150.4 244.5C151.4 228.8 153.0 213.1 153.0 197.3C152.9 181.4 142.2 157.1 150.0 149.4Z\"/><path class=\"a1-web\" d=\"M160.0 159.0C174.0 158.7 272.0 162.0 300.0 162.0C328.0 162.0 426.0 158.7 440.0 159.0C454.0 159.3 454.0 164.1 440.0 165.0C426.0 165.9 328.0 168.0 300.0 168.0C272.0 168.0 174.0 165.9 160.0 165.0C146.0 164.1 146.0 159.3 160.0 159.0Z\"/><path class=\"a1-junction\" d=\"M147.0 152.0h0.0a2.5 2.5 0 0 1 2.5 2.5v13.0a2.5 2.5 0 0 1 -5.0 0v-13.0a2.5 2.5 0 0 1 2.5 -2.5Z\"/><path class=\"a1-junction\" d=\"M453.0 152.0h0.0a2.5 2.5 0 0 1 2.5 2.5v13.0a2.5 2.5 0 0 1 -5.0 0v-13.0a2.5 2.5 0 0 1 2.5 -2.5Z\"/><g class=\"a1-dmt1\"><path d=\"M165.4 111.0h0.0a2.3 2.3 0 0 1 2.3 2.3v7.4a2.3 2.3 0 0 1 -4.6 0v-7.4a2.3 2.3 0 0 1 2.3 -2.3Z\"/><path d=\"M171.6 111.0h0.0a2.3 2.3 0 0 1 2.3 2.3v7.4a2.3 2.3 0 0 1 -4.6 0v-7.4a2.3 2.3 0 0 1 2.3 -2.3Z\"/></g><g class=\"a1-dmt1\"><path d=\"M225.4 108.2h0.0a2.3 2.3 0 0 1 2.3 2.3v7.4a2.3 2.3 0 0 1 -4.6 0v-7.4a2.3 2.3 0 0 1 2.3 -2.3Z\"/><path d=\"M231.6 108.2h0.0a2.3 2.3 0 0 1 2.3 2.3v7.4a2.3 2.3 0 0 1 -4.6 0v-7.4a2.3 2.3 0 0 1 2.3 -2.3Z\"/></g><g class=\"a1-dmt1\"><path d=\"M285.4 112.5h0.0a2.3 2.3 0 0 1 2.3 2.3v7.4a2.3 2.3 0 0 1 -4.6 0v-7.4a2.3 2.3 0 0 1 2.3 -2.3Z\"/><path d=\"M291.6 112.5h0.0a2.3 2.3 0 0 1 2.3 2.3v7.4a2.3 2.3 0 0 1 -4.6 0v-7.4a2.3 2.3 0 0 1 2.3 -2.3Z\"/></g><g class=\"a1-dmt1\"><path d=\"M345.4 106.9h0.0a2.3 2.3 0 0 1 2.3 2.3v7.4a2.3 2.3 0 0 1 -4.6 0v-7.4a2.3 2.3 0 0 1 2.3 -2.3Z\"/><path d=\"M351.6 106.9h0.0a2.3 2.3 0 0 1 2.3 2.3v7.4a2.3 2.3 0 0 1 -4.6 0v-7.4a2.3 2.3 0 0 1 2.3 -2.3Z\"/></g><g class=\"a1-dmt1\"><path d=\"M405.4 113.5h0.0a2.3 2.3 0 0 1 2.3 2.3v7.4a2.3 2.3 0 0 1 -4.6 0v-7.4a2.3 2.3 0 0 1 2.3 -2.3Z\"/><path d=\"M411.6 113.5h0.0a2.3 2.3 0 0 1 2.3 2.3v7.4a2.3 2.3 0 0 1 -4.6 0v-7.4a2.3 2.3 0 0 1 2.3 -2.3Z\"/></g><path class=\"a1-mito\" d=\"M218.7 380.0C218.8 381.8 217.0 384.1 214.2 385.4C211.5 386.8 206.6 387.5 202.4 388.0C198.2 388.6 193.1 389.3 189.0 388.8C184.9 388.4 180.1 386.9 177.7 385.4C175.3 384.0 174.5 381.8 174.7 380.0C174.8 378.2 176.3 376.4 178.6 374.8C181.0 373.3 184.8 371.4 188.8 370.9C192.8 370.4 198.5 371.0 202.6 371.7C206.7 372.4 210.7 373.5 213.3 374.8C216.0 376.2 218.5 378.2 218.7 380.0Z\"/><path class=\"a1-mito-in\" d=\"M210.5 380.0C210.3 380.8 208.4 381.6 206.7 382.1C204.9 382.7 202.4 382.9 199.8 383.2C197.2 383.6 193.4 384.4 191.1 384.2C188.7 384.0 187.0 382.8 185.6 382.1C184.3 381.4 183.4 380.7 183.2 380.0C183.0 379.3 183.2 378.4 184.6 377.7C185.9 377.0 188.8 376.1 191.3 376.0C193.8 375.9 196.8 376.7 199.5 377.0C202.2 377.3 205.9 377.1 207.7 377.6C209.5 378.1 210.7 379.2 210.5 380.0Z\"/><path class=\"a1-mito\" d=\"M424.5 372.0C424.4 373.8 422.4 375.9 420.0 377.2C417.5 378.6 413.7 379.5 409.9 380.2C406.1 380.8 401.0 381.7 397.4 381.1C393.8 380.6 390.4 378.7 388.2 377.2C386.1 375.6 384.6 373.8 384.5 372.0C384.4 370.2 385.4 368.1 387.6 366.6C389.8 365.1 393.9 363.5 397.5 363.1C401.2 362.6 405.9 363.4 409.8 364.0C413.6 364.6 418.1 365.2 420.6 366.6C423.1 367.9 424.6 370.2 424.5 372.0Z\"/><path class=\"a1-mito-in\" d=\"M417.5 372.0C417.1 372.7 413.7 373.1 412.2 373.8C410.6 374.5 410.3 375.7 408.3 376.0C406.3 376.4 402.4 376.0 400.1 375.6C397.8 375.3 395.6 374.7 394.4 374.1C393.1 373.5 393.0 372.8 392.7 372.0C392.3 371.2 390.8 369.9 392.1 369.4C393.4 368.8 398.0 369.0 400.6 368.9C403.3 368.7 405.5 368.3 407.8 368.5C410.1 368.6 412.8 369.1 414.4 369.7C416.0 370.3 417.8 371.3 417.5 372.0Z\"/><path class=\"a1-mito\" d=\"M268.6 196.0C268.4 197.5 265.6 199.0 263.4 200.3C261.3 201.7 259.0 203.5 255.9 204.0C252.7 204.6 247.8 204.2 244.4 203.7C241.0 203.1 237.6 201.9 235.7 200.6C233.7 199.4 232.9 197.6 232.6 196.0C232.4 194.4 232.3 192.1 234.3 190.9C236.3 189.7 241.2 189.2 244.7 188.8C248.3 188.4 252.2 188.0 255.5 188.4C258.9 188.8 262.6 190.0 264.8 191.2C267.0 192.5 268.9 194.5 268.6 196.0Z\"/><path class=\"a1-mito-in\" d=\"M260.0 196.0C259.8 196.7 259.7 197.3 258.7 197.9C257.7 198.5 255.8 199.3 253.8 199.5C251.8 199.8 248.6 199.4 246.6 199.1C244.6 198.8 243.5 198.3 242.0 197.8C240.5 197.2 237.9 196.6 237.7 196.0C237.5 195.4 239.1 194.4 240.6 194.0C242.2 193.5 244.8 193.4 246.9 193.2C249.1 193.0 251.3 192.6 253.5 192.8C255.7 192.9 259.0 193.3 260.1 193.8C261.1 194.3 260.3 195.3 260.0 196.0Z\"/><path class=\"a1-mito\" d=\"M380.2 300.0C380.0 301.6 379.2 303.3 377.1 304.6C375.1 306.0 371.6 307.5 368.1 308.0C364.6 308.4 359.6 308.1 356.2 307.6C352.7 307.0 349.7 305.7 347.4 304.5C345.0 303.2 342.4 301.5 342.2 300.0C342.0 298.5 344.0 296.4 346.4 295.2C348.8 294.0 352.8 293.2 356.4 292.7C360.0 292.3 364.3 291.9 367.9 292.3C371.5 292.7 376.0 293.8 378.1 295.1C380.1 296.4 380.4 298.4 380.2 300.0Z\"/><path class=\"a1-mito-in\" d=\"M371.7 300.0C371.8 300.7 373.8 301.7 372.8 302.2C371.7 302.8 368.1 303.1 365.7 303.2C363.3 303.4 360.7 303.3 358.6 303.0C356.4 302.8 354.8 302.4 353.1 301.8C351.3 301.3 348.0 300.6 348.2 300.0C348.3 299.4 352.0 298.8 353.7 298.3C355.4 297.8 356.4 297.1 358.4 296.8C360.4 296.6 363.5 296.5 365.8 296.6C368.1 296.8 371.2 297.3 372.1 297.9C373.1 298.5 371.6 299.3 371.7 300.0Z\"/><path class=\"a1-nucleus\" d=\"M377.2 440.0C377.1 447.7 372.9 456.8 366.1 463.1C359.3 469.4 347.3 474.0 336.3 478.0C325.3 482.1 312.5 486.8 300.0 487.2C287.5 487.6 272.0 484.8 261.2 480.7C250.4 476.6 241.2 469.4 235.2 462.6C229.2 455.9 225.3 447.6 225.2 440.0C225.1 432.4 228.6 424.0 234.5 417.1C240.3 410.2 249.4 402.0 260.3 398.4C271.2 394.7 287.2 394.8 300.0 395.2C312.8 395.6 326.0 397.4 337.2 401.0C348.3 404.6 360.2 410.1 366.9 416.6C373.5 423.1 377.3 432.3 377.2 440.0Z\"/><path class=\"a1-nucleolus\" d=\"M332.6 432.0C332.6 434.5 333.0 437.7 331.1 439.5C329.1 441.3 324.2 442.6 320.8 442.9C317.4 443.1 313.6 442.1 310.5 441.0C307.4 439.8 303.3 438.1 302.1 436.0C300.9 433.9 301.8 430.5 303.1 428.3C304.5 426.1 307.3 423.9 310.2 422.7C313.1 421.5 317.4 420.8 320.8 421.1C324.2 421.4 328.9 422.8 330.9 424.6C332.8 426.4 332.6 429.5 332.6 432.0Z\"/><g class=\"a1-ferritin\"><circle class=\"a1-core\" cx=\"214\" cy=\"248\" r=\"11\"/><circle cx=\"229.0\" cy=\"248.0\" r=\"2.6\"/><circle cx=\"228.5\" cy=\"251.9\" r=\"2.6\"/><circle cx=\"227.0\" cy=\"255.5\" r=\"2.6\"/><circle cx=\"224.6\" cy=\"258.6\" r=\"2.6\"/><circle cx=\"221.5\" cy=\"261.0\" r=\"2.6\"/><circle cx=\"217.9\" cy=\"262.5\" r=\"2.6\"/><circle cx=\"214.0\" cy=\"263.0\" r=\"2.6\"/><circle cx=\"210.1\" cy=\"262.5\" r=\"2.6\"/><circle cx=\"206.5\" cy=\"261.0\" r=\"2.6\"/><circle cx=\"203.4\" cy=\"258.6\" r=\"2.6\"/><circle cx=\"201.0\" cy=\"255.5\" r=\"2.6\"/><circle cx=\"199.5\" cy=\"251.9\" r=\"2.6\"/><circle cx=\"199.0\" cy=\"248.0\" r=\"2.6\"/><circle cx=\"199.5\" cy=\"244.1\" r=\"2.6\"/><circle cx=\"201.0\" cy=\"240.5\" r=\"2.6\"/><circle cx=\"203.4\" cy=\"237.4\" r=\"2.6\"/><circle cx=\"206.5\" cy=\"235.0\" r=\"2.6\"/><circle cx=\"210.1\" cy=\"233.5\" r=\"2.6\"/><circle cx=\"214.0\" cy=\"233.0\" r=\"2.6\"/><circle cx=\"217.9\" cy=\"233.5\" r=\"2.6\"/><circle cx=\"221.5\" cy=\"235.0\" r=\"2.6\"/><circle cx=\"224.6\" cy=\"237.4\" r=\"2.6\"/><circle cx=\"227.0\" cy=\"240.5\" r=\"2.6\"/><circle cx=\"228.5\" cy=\"244.1\" r=\"2.6\"/><g data-part=\"core0\"></g></g><g class=\"a1-ferritin\"><circle class=\"a1-core\" cx=\"388\" cy=\"236\" r=\"11\"/><circle cx=\"403.0\" cy=\"236.0\" r=\"2.6\"/><circle cx=\"402.5\" cy=\"239.9\" r=\"2.6\"/><circle cx=\"401.0\" cy=\"243.5\" r=\"2.6\"/><circle cx=\"398.6\" cy=\"246.6\" r=\"2.6\"/><circle cx=\"395.5\" cy=\"249.0\" r=\"2.6\"/><circle cx=\"391.9\" cy=\"250.5\" r=\"2.6\"/><circle cx=\"388.0\" cy=\"251.0\" r=\"2.6\"/><circle cx=\"384.1\" cy=\"250.5\" r=\"2.6\"/><circle cx=\"380.5\" cy=\"249.0\" r=\"2.6\"/><circle cx=\"377.4\" cy=\"246.6\" r=\"2.6\"/><circle cx=\"375.0\" cy=\"243.5\" r=\"2.6\"/><circle cx=\"373.5\" cy=\"239.9\" r=\"2.6\"/><circle cx=\"373.0\" cy=\"236.0\" r=\"2.6\"/><circle cx=\"373.5\" cy=\"232.1\" r=\"2.6\"/><circle cx=\"375.0\" cy=\"228.5\" r=\"2.6\"/><circle cx=\"377.4\" cy=\"225.4\" r=\"2.6\"/><circle cx=\"380.5\" cy=\"223.0\" r=\"2.6\"/><circle cx=\"384.1\" cy=\"221.5\" r=\"2.6\"/><circle cx=\"388.0\" cy=\"221.0\" r=\"2.6\"/><circle cx=\"391.9\" cy=\"221.5\" r=\"2.6\"/><circle cx=\"395.5\" cy=\"223.0\" r=\"2.6\"/><circle cx=\"398.6\" cy=\"225.4\" r=\"2.6\"/><circle cx=\"401.0\" cy=\"228.5\" r=\"2.6\"/><circle cx=\"402.5\" cy=\"232.1\" r=\"2.6\"/><g data-part=\"core1\"></g></g><g class=\"a1-ferritin\"><circle class=\"a1-core\" cx=\"300\" cy=\"318\" r=\"11\"/><circle cx=\"315.0\" cy=\"318.0\" r=\"2.6\"/><circle cx=\"314.5\" cy=\"321.9\" r=\"2.6\"/><circle cx=\"313.0\" cy=\"325.5\" r=\"2.6\"/><circle cx=\"310.6\" cy=\"328.6\" r=\"2.6\"/><circle cx=\"307.5\" cy=\"331.0\" r=\"2.6\"/><circle cx=\"303.9\" cy=\"332.5\" r=\"2.6\"/><circle cx=\"300.0\" cy=\"333.0\" r=\"2.6\"/><circle cx=\"296.1\" cy=\"332.5\" r=\"2.6\"/><circle cx=\"292.5\" cy=\"331.0\" r=\"2.6\"/><circle cx=\"289.4\" cy=\"328.6\" r=\"2.6\"/><circle cx=\"287.0\" cy=\"325.5\" r=\"2.6\"/><circle cx=\"285.5\" cy=\"321.9\" r=\"2.6\"/><circle cx=\"285.0\" cy=\"318.0\" r=\"2.6\"/><circle cx=\"285.5\" cy=\"314.1\" r=\"2.6\"/><circle cx=\"287.0\" cy=\"310.5\" r=\"2.6\"/><circle cx=\"289.4\" cy=\"307.4\" r=\"2.6\"/><circle cx=\"292.5\" cy=\"305.0\" r=\"2.6\"/><circle cx=\"296.1\" cy=\"303.5\" r=\"2.6\"/><circle cx=\"300.0\" cy=\"303.0\" r=\"2.6\"/><circle cx=\"303.9\" cy=\"303.5\" r=\"2.6\"/><circle cx=\"307.5\" cy=\"305.0\" r=\"2.6\"/><circle cx=\"310.6\" cy=\"307.4\" r=\"2.6\"/><circle cx=\"313.0\" cy=\"310.5\" r=\"2.6\"/><circle cx=\"314.5\" cy=\"314.1\" r=\"2.6\"/><g data-part=\"core2\"></g></g><rect class=\"a1-lamina\" x=\"0\" y=\"538\" width=\"600\" height=\"5\" rx=\"2.5\"/><rect class=\"a1-blood\" x=\"0\" y=\"560\" width=\"600\" height=\"56\"/><rect class=\"a1-endo\" x=\"0\" y=\"554\" width=\"600\" height=\"6\" rx=\"3\"/><rect class=\"a1-endo\" x=\"0\" y=\"616\" width=\"600\" height=\"6\" rx=\"3\"/><g data-part=\"vesicles\"></g><g data-part=\"fpn\"></g><g data-part=\"blood\"></g><g data-part=\"iron\"></g><g data-part=\"hep\"></g></g></g></g>\n</svg></div><p class=\"a1-scene\" data-scene>Low iron, low hepcidin: every gate open.</p><span class=\"a1-sr\" role=\"status\" aria-live=\"polite\" data-status></span><div class=\"opt-controls\"><div class=\"opt-seg\" role=\"radiogroup\" aria-label=\"Moment\" data-control=\"scene\"><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"hungry\" aria-checked=\"true\" tabindex=\"0\">Iron-hungry</button><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"pills\" aria-checked=\"false\" tabindex=\"-1\">Daily pills</button><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"full\" aria-checked=\"false\" tabindex=\"-1\">Stores full</button></div></div><div class=\"opt-foot\"><span class=\"opt-hint\">Pick a moment · watch the gates</span><dl class=\"opt-readout\" data-readout aria-hidden=\"true\"><div class=\"opt-stat\" data-stat=\"gate\"><dt>Gut gate</dt><dd data-r=\"gate\">97% open</dd></div><div class=\"opt-stat\" data-stat=\"fpn\"><dt>Ferroportin working</dt><dd data-r=\"fpn\">5 of 5</dd></div></dl></div></div><figcaption class=\"iso-legend\"><span class=\"iso-keys\"><span class=\"iso-key\"><svg class=\"iso-swatch\" data-mark=\"lit\" viewBox=\"0 0 16 10\" aria-hidden=\"true\"><path d=\"M2 4.5 8 1.5 14 4.5 14 6 8 9 2 6Z\"/><path class=\"iso-swatch-crease\" d=\"M2 4.5 8 7.5 14 4.5\"/></svg>Iron</span><span class=\"iso-key\"><svg class=\"iso-swatch\" data-mark=\"heat\" viewBox=\"0 0 16 10\" aria-hidden=\"true\"><path d=\"M1.5 5h13\"/></svg>Hepcidin</span><span class=\"iso-key\"><svg class=\"iso-swatch\" data-mark=\"raised\" viewBox=\"0 0 16 10\" aria-hidden=\"true\"><path d=\"M2 4.5 8 1.5 14 4.5 14 6 8 9 2 6Z\"/><path class=\"iso-swatch-crease\" d=\"M2 4.5 8 7.5 14 4.5\"/></svg>Ferroportin, the way out</span></span><span class=\"iso-caption\"><span class=\"a1-par\">Iron from food crosses the gut through one layer of lining cells. It comes in at the top, through DMT1 channels on the brush border, and leaves at the base through ferroportin, the only known way out of the cell, into the blood, where transferrin carries it away. Iron that can't leave is held in ferritin and lost when the cell is shed a few days later.</span><span class=\"a1-par\">Hepcidin, a hormone from the liver, is the gatekeeper. It docks on ferroportin, plugs it, and makes the cell pull the channel in and break it down. Hepcidin rises after an iron pill and when stores are full, so fewer gates stay open: about 50 % after a week of daily pills and about 45 % two weeks after an IV infusion, against 97 % when iron-hungry.</span><span class=\"a1-par\"><small>The gate shares come from the model in the IV iron figure (Fig 3). Drawn far larger than life and simplified: a real lining cell carries many more, much finer microvilli, channel and particle counts are a drawing, and time is sped up.</small></span></span></figcaption></figure>" + "</div>";
    mount(root.querySelector(".opt-figure"));
  }
}
customElements.define("optimal-fig-gut-cell", Fig);
})();
