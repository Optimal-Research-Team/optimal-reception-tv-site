/* optimal-fig-knee: Optimal Health explainer figure. Built with Anatomy (MIT). Generated; do not edit. */
(() => {
if (customElements.get("optimal-fig-knee")) return;
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

// Fig 4 model: cadence at a fixed pace → step length, bounce, landing, knee load, and the pose that draws them.
//
// Pure functions, no DOM. [n] keys refer to reference/truth-pack.md §4.
// Load changes are group averages from healthy recreational runners on a lab
// treadmill, not a prediction for one runner.

const TRUTH = {
  speedKmh: 10, //            fixed pace, ≈ recreational average 9.9 km/h [17]
  cadence0: 165, //           spm preferred at that pace, 164 ± 9 [17]
  vo0: 7.7, //                cm vertical oscillation at preferred cadence, 77 ± 12 mm [17]
  voExp: 1.84, //             VO ∝ cadence^−k, fitted to 8.7 → 7.3 cm at +10 % [10 via 30, LOW]; spring-mass gives ≈ 2
  pf: [[-10, 1.15], [0, 1.0], [10, 0.86]], // peak patellofemoral force vs step-rate change [12] Lenhart 2014; linear between
  duty: 0.39, //              stance ÷ stride time, 39 ± 4 % [17]
  landing0: 24, //            cm, heel ahead of the centre of mass at contact at preferred cadence: DERIVED estimate (0.2–0.3 m), drawn only, never printed
  range: [-10, 10], //        % step-rate change shown: the range the studies tested
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const pctOf = (cadence) => (cadence / TRUTH.cadence0 - 1) * 100;
const cadenceOf = (pct) => TRUTH.cadence0 * (1 + pct / 100);
/** Belt speed in cm/s. */
const beltOf = () => (TRUTH.speedKmh * 100) / 3.6;

/** Step length (m): one footfall to the next, at the fixed pace. */
const stepOf = (cadence) => TRUTH.speedKmh / 3.6 / (cadence / 60);
/** Vertical oscillation of the centre of mass, cm peak to peak. */
const voOf = (cadence) => TRUTH.vo0 * (cadence / TRUTH.cadence0) ** -TRUTH.voExp;
/** Vertical ratio (%): oscillation ÷ step length, as Garmin and the Creator define it. */
const ratioOf = (cadence) => (voOf(cadence) / (stepOf(cadence) * 100)) * 100;
/** Peak patellofemoral force relative to preferred cadence (Lenhart 2014), linear between the tested rates. */
function kneeOf(cadence) {
  const p = clamp(pctOf(cadence), TRUTH.range[0], TRUTH.range[1]);
  const [[x0, y0], [x1, y1], [x2, y2]] = TRUTH.pf;
  return p <= 0 ? y0 + ((y1 - y0) * (p - x0)) / (x1 - x0) : y1 + ((y2 - y1) * (p - x1)) / (x2 - x1);
}
/** How far ahead of the centre of mass the heel lands (cm), scaled with step length. Drawn, not printed. */
const landingOf = (cadence) => (TRUTH.landing0 * stepOf(cadence)) / stepOf(TRUTH.cadence0);

// ---------------------------------------------------------------- the gait cycle (animation geometry)
// Stride phase φ ∈ [0, 1): right heel contact at 0, left at ½. One foot is on the
// belt for `duty` of the stride; while it is, it moves back with the belt at the
// true belt speed, so the feet never slide. The body's centre of mass (from
// standard segment masses) bounces by the true oscillation, lowest at mid-stance;
// the pelvis is placed under it, and both knees are solved from where the hip
// and the foot are (inverse kinematics), so knee bend follows from bounce,
// landing and belt speed rather than being drawn in. The swing foot follows a
// textbook running path [24][26]. None of the angles is printed: they are
// LOW as numbers and only pose the mannequin.
const GAIT = {
  kneeIC: 18, //   ° knee bend at contact at preferred cadence (textbook 15–20 [24]); sets the pelvis height
  kneeTO: 20, //   ° knee bend at toe-off (textbook ≈ 20 [24]); sets how far the heel rolls up
  footIC: 10, //   ° sole angle at contact (toe up), scaled with step: foot inclination falls with step rate [10]
  flat: 0.14, //   share of stance from heel strike to a flat foot
  heel: 0.55, //   share of stance when the heel starts to lift
  trunk: 7, //     ° forward lean of the trunk
  arm: 24, //      ° upper-arm swing either side of 4° forward, at preferred cadence
  elbow: 88, //    ° elbow bend
  // swing: the ankle's path relative to the hip, [share of swing, forward (× step ratio), height above the belt]
  swing: [[0.1, -43, 19.5], [0.2, -46, 26], [0.4, -38, 40], [0.6, -4, 27], [0.78, 19, 14]],
};
// Segment masses (share of body mass) and centre-of-mass positions along each
// segment from its proximal joint: Winter 2009, Table 4.1 (after Dempster 1955).
const MASS = {
  trunk: [0.578, 0.66], // trunk, head and neck: hip line → shoulder line
  thigh: [0.1, 0.433],
  shank: [0.0465, 0.433],
  foot: [0.0145, 0.5],
  upper: [0.028, 0.436],
  fore: [0.016, 0.43],
  hand: [0.006, 0.506],
};

const RAD = Math.PI / 180;
const ease = (u) => (1 - Math.cos(Math.PI * clamp(u, 0, 1))) / 2;
const rot2 = ([x, z], a) => [x * Math.cos(a) - z * Math.sin(a), x * Math.sin(a) + z * Math.cos(a)];
const wrap = (x) => ((x % 1) + 1) % 1;

/** Centre-of-mass height offset (cm) from its height at heel contact, through one step (two per stride). */
function bounceAt(phi, cadence) {
  const s = wrap(phi * 2); // share of the step since contact
  const shape = (u) => -Math.cos(2 * Math.PI * (u - TRUTH.duty));
  return (voOf(cadence) / 2) * (shape(s) - shape(0));
}

/** The foot on the belt, τ = share of stance: pivot, pivot's place on the foot, sole angle (rad). x is relative to the pelvis. */
function stanceFoot(tau, cadence, B, footTO) {
  const scale = stepOf(cadence) / stepOf(TRUTH.cadence0);
  const tc = (TRUTH.duty * 120) / cadence;
  const travel = beltOf() * tc * tau;
  const L = landingOf(cadence);
  if (tau < GAIT.heel) {
    const a = GAIT.footIC * scale * RAD * (1 - ease(tau / GAIT.flat));
    return { pivot: [L - travel, 0], local: [0, 0], angle: a };
  }
  const a = -footTO * RAD * ease((tau - GAIT.heel) / (1 - GAIT.heel));
  return { pivot: [L + B.ball - travel, 0], local: [B.ball, 0], angle: a };
}
/** A point of the foot (foot frame: heel at 0, x toward the toe, z up) placed by a foot pose. */
const footPoint = (pose, p) => {
  const r = rot2([p[0] - pose.local[0], p[1] - pose.local[1]], pose.angle);
  return [pose.pivot[0] + r[0], pose.pivot[1] + r[1]];
};

/** Two-link leg: knee position (forward of the hip–ankle line) and knee bend in degrees. */
function solveKnee(hip, ankle, B) {
  const reach = B.thigh + B.shank - 0.05;
  let dx = ankle[0] - hip[0];
  let dz = ankle[1] - hip[1];
  let d = Math.hypot(dx, dz);
  if (d > reach) {
    dx *= reach / d;
    dz *= reach / d;
    d = reach;
  }
  const a = (B.thigh * B.thigh - B.shank * B.shank + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, B.thigh * B.thigh - a * a));
  const ux = dx / d;
  const uz = dz / d;
  const knee = [hip[0] + ux * a - uz * h, hip[1] + uz * a + ux * h];
  const cosK = (B.thigh * B.thigh + B.shank * B.shank - d * d) / (2 * B.thigh * B.shank);
  return { knee, ankle: [hip[0] + dx, hip[1] + dz], bend: 180 - Math.acos(clamp(cosK, -1, 1)) / RAD };
}
const reachAt = (B, bend) => Math.sqrt(B.thigh ** 2 + B.shank ** 2 + 2 * B.thigh * B.shank * Math.cos(bend * RAD));

/** Hip height above the belt at heel contact: the leg bent `kneeIC` reaching the preferred landing. */
function pelvisOf(B) {
  const pose = stanceFoot(0, TRUTH.cadence0, B, 0);
  const ankle = footPoint(pose, [B.ankleX, B.ankleZ]);
  const d = reachAt(B, GAIT.kneeIC);
  return ankle[1] + Math.sqrt(d * d - ankle[0] * ankle[0]);
}

// monotone cubic through [x, y] keys (Fritsch–Carlson): no overshoot between keyframes
function monotone(keys, x) {
  const n = keys.length;
  if (x <= keys[0][0]) return keys[0][1];
  if (x >= keys[n - 1][0]) return keys[n - 1][1];
  const dx = [];
  const m = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(keys[i + 1][0] - keys[i][0]);
    m.push((keys[i + 1][1] - keys[i][1]) / dx[i]);
  }
  const t = [m[0]];
  for (let i = 1; i < n - 1; i++) t.push(m[i - 1] * m[i] <= 0 ? 0 : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i]));
  t.push(m[n - 2]);
  let i = 0;
  while (x > keys[i + 1][0]) i++;
  const h = dx[i];
  const u = (x - keys[i][0]) / h;
  const u2 = u * u;
  const u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * keys[i][1] + (u3 - 2 * u2 + u) * h * t[i] + (-2 * u3 + 3 * u2) * keys[i + 1][1] + (u3 - u2) * h * t[i + 1];
}

/** Per-cadence constants: how far the heel rolls up at toe-off, and the contact and toe-off foot poses. */
const CACHE = new Map();
function cycleOf(cadence, B) {
  const key = `${Math.round(cadence * 20)}|${B.pelvis}`;
  if (CACHE.has(key)) return CACHE.get(key);
  // roll the heel up until the knee at toe-off is bent `kneeTO` (or the leg can just reach)
  const hipTO = B.pelvis + bounceAt(TRUTH.duty, cadence);
  const bendAt = (deg) => {
    const ankle = footPoint(stanceFoot(1, cadence, B, deg), [B.ankleX, B.ankleZ]);
    return { ankle, d: Math.hypot(ankle[0], ankle[1] - hipTO) };
  };
  const want = reachAt(B, GAIT.kneeTO);
  let lo = 15;
  let hi = 80;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (bendAt(mid).d > want) lo = mid;
    else hi = mid;
  }
  const footTO = (lo + hi) / 2;
  const on = stanceFoot(0, cadence, B, footTO);
  const off = stanceFoot(1, cadence, B, footTO);
  const out = {
    footTO,
    on: { ankle: footPoint(on, [B.ankleX, B.ankleZ]), sole: on.angle },
    off: { ankle: footPoint(off, [B.ankleX, B.ankleZ]), sole: off.angle },
  };
  if (CACHE.size > 400) CACHE.clear();
  CACHE.set(key, out);
  return out;
}

/** Sagittal leg at its own phase p (0 = this foot's heel contact), hip at `hip`. */
function legAt(p, cadence, B, hip) {
  const D = TRUTH.duty;
  const cyc = cycleOf(cadence, B);
  if (p < D) {
    const tau = p / D;
    const pose = stanceFoot(tau, cadence, B, cyc.footTO);
    const s = solveKnee(hip, footPoint(pose, [B.ankleX, B.ankleZ]), B);
    // the toes stay flat on the belt while the heel rolls up over the ball
    return { stance: true, tau, hip, knee: s.knee, ankle: s.ankle, sole: pose.angle, toe: tau < GAIT.heel ? pose.angle : 0, bend: s.bend };
  }
  // swing: the ankle follows a running path from toe-off to the next contact; the knee is solved
  const sigma = (p - D) / (1 - D);
  const k = stepOf(cadence) / stepOf(TRUTH.cadence0);
  const keysX = [[0, cyc.off.ankle[0]], ...GAIT.swing.map(([u, x]) => [u, x * k]), [0.9, cyc.on.ankle[0] + 3 * k], [1, cyc.on.ankle[0]]];
  const keysZ = [[0, cyc.off.ankle[1]], ...GAIT.swing.map(([u, , z]) => [u, z]), [0.9, cyc.on.ankle[1] + 2.5], [1, cyc.on.ankle[1]]];
  const target = [hip[0] + monotone(keysX, sigma), monotone(keysZ, sigma)];
  const s = solveKnee(hip, target, B);
  // sole: from toe-off, through a foot hanging at right angles to the shank, to the contact angle
  const shank = Math.atan2(s.ankle[0] - s.knee[0], s.knee[1] - s.ankle[1]);
  const shankOf = (ankle) => {
    const e = solveKnee(hip, ankle, B);
    return Math.atan2(e.ankle[0] - e.knee[0], e.knee[1] - e.ankle[1]);
  };
  const plantar = monotone([[0, shankOf(cyc.off.ankle) - cyc.off.sole], [0.3, 22 * RAD], [0.7, 0], [1, shankOf(cyc.on.ankle) - cyc.on.sole]], sigma);
  const sole = shank - plantar;
  // the toes peel off the belt last: they stay down until the ball of the foot has lifted clear
  const ballZ = s.ankle[1] - (Math.sin(sole) * B.ankleX + Math.cos(sole) * B.ankleZ) + Math.sin(sole) * B.ball;
  const toe = Math.max(sole, -Math.asin(clamp(ballZ / (B.foot - B.ball), -1, 1)));
  return { stance: false, tau: sigma, hip, knee: s.knee, ankle: s.ankle, sole, toe, bend: s.bend };
}

/** Sagittal centre-of-mass height of a pose (cm above the belt), from the segment masses above. */
function comOf(pose, B) {
  let z = 0;
  const lean = pose.trunk * RAD;
  const shoulderZ = pose.pelvis + B.trunk * Math.cos(lean);
  z += MASS.trunk[0] * (pose.pelvis + MASS.trunk[1] * B.trunk * Math.cos(lean));
  for (const leg of [pose.right, pose.left]) {
    z += MASS.thigh[0] * (leg.hip[1] + MASS.thigh[1] * (leg.knee[1] - leg.hip[1]));
    z += MASS.shank[0] * (leg.knee[1] + MASS.shank[1] * (leg.ankle[1] - leg.knee[1]));
    z += MASS.foot[0] * (leg.ankle[1] - B.ankleZ * 0.5 + Math.sin(leg.sole) * (B.foot * 0.5 - B.ankleX));
  }
  for (const a of [pose.armR, pose.armL]) {
    const a1 = a * RAD;
    const a2 = (a + pose.elbow) * RAD;
    const elbow = shoulderZ - Math.cos(a1) * B.upperArm;
    const wrist = elbow - Math.cos(a2) * B.forearm;
    z += MASS.upper[0] * (shoulderZ - MASS.upper[1] * Math.cos(a1) * B.upperArm);
    z += MASS.fore[0] * (elbow - MASS.fore[1] * Math.cos(a2) * B.forearm);
    z += MASS.hand[0] * (wrist - MASS.hand[1] * Math.cos(a2) * B.hand * 0.55);
  }
  return z;
}

function rawPose(phi, cadence, B, z) {
  const hip = [0, z];
  const legs = [0, 0.5].map((o) => legAt(wrap(phi - o), cadence, B, hip));
  const swing = GAIT.arm * Math.sqrt(stepOf(cadence) / stepOf(TRUTH.cadence0));
  const c = Math.cos(2 * Math.PI * phi);
  return {
    pelvis: z,
    right: legs[0],
    left: legs[1],
    // upper-arm angle from vertical (+ forward): each arm swings with the opposite leg
    armR: 4 - swing * c,
    armL: 4 + swing * c,
    elbow: GAIT.elbow,
    trunk: GAIT.trunk,
  };
}

/**
 * The whole pose at stride phase φ: pelvis height, both legs (sagittal [forward, up] relative to
 * the point on the belt under the pelvis), arm swing, trunk lean and the centre of mass.
 * B is the mannequin's proportions (shared/mannequin.mjs) with `pelvis` set by pelvisOf(B).
 */
function poseAt(phi, cadence, B) {
  const com0 = comOf(rawPose(0, cadence, B, B.pelvis), B);
  const target = com0 + bounceAt(phi, cadence);
  let z = B.pelvis + bounceAt(phi, cadence);
  let pose = rawPose(phi, cadence, B, z);
  for (let i = 0; i < 4; i++) {
    z += target - comOf(pose, B);
    pose = rawPose(phi, cadence, B, z);
  }
  pose.com = target;
  return pose;
}

/** Patellofemoral force through one foot's stance, relative to the preferred-cadence peak: zero in swing. */
function kneeLoadAt(leg, cadence) {
  if (!leg.stance) return 0;
  // a smooth single hump over stance, peaking near peak knee bend (≈ 44 % of stance)
  const shape = Math.sin(Math.PI * leg.tau ** 0.85) ** 2;
  return kneeOf(cadence) * shape;
}

// A7 model: the knee's bend through one running stride, and the kneecap (patellofemoral) force.
// The force comes from Fig 4's kneeOf(cadence) (Lenhart 2014: −14 % at +10 % step rate), inlined
// alongside. Knee angles are LOW keyframes from truth pack §4 and only pose the drawing; they're
// never printed.
const KNEE = {
  ic: 17, //        ° knee bend at foot contact, preferred cadence (implied baseline ≈ 17°; LOW)
  icPer10: 1.8, //  ° more bend at contact per +10 % step rate (LOW)
  peak: 46.3, //    ° peak stance bend, preferred (46.3 → 42.8 at +10 %; LOW)
  peakPer10: -3.5,
  off: 20, //       ° at toe-off (drawn)
  swing: 105, //    ° peak swing bend (drawn, not sourced)
  duty: 0.39, //    stance share of the stride [Fig 4: 39 ± 4 %]
  slow: 4, //       shown this many times slower than life
};
const cr = (k, t) => {
  // Catmull-Rom through keyframes [[t, v], …]
  let i = 0;
  while (i < k.length - 2 && t > k[i + 1][0]) i++;
  const [t1, p1] = k[i];
  const [t2, p2] = k[i + 1];
  const p0 = (k[i - 1] ?? k[i])[1];
  const p3 = (k[i + 2] ?? k[i + 1])[1];
  const u = Math.max(0, Math.min(1, (t - t1) / (t2 - t1)));
  return 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u);
};
/** Knee bend (°) at stride phase φ ∈ [0, 1) for a step-rate change of pct %. Foot contact at φ = 0. */
function bendAt(phi, pct) {
  const ic = KNEE.ic + (KNEE.icPer10 * pct) / 10;
  const pk = KNEE.peak + (KNEE.peakPer10 * pct) / 10;
  const d = KNEE.duty;
  return cr([[0, ic], [d * 0.44, pk], [d, KNEE.off], [d + (1 - d) * 0.45, KNEE.swing], [0.97, ic - 2], [1, ic]], phi);
}
/** Kneecap force at phase φ, relative to the preferred-cadence peak: a hump over stance, zero in swing. */
function pfAt(phi, cadence) {
  if (phi >= KNEE.duty) return 0;
  const tau = phi / KNEE.duty;
  return kneeOf(cadence) * Math.sin(Math.PI * tau ** 0.85) ** 2;
}

// A7 live code: one running stride, slowed. The tibia swings about the condyle by bendAt(φ);
// the kneecap is placed on its groove where the patellar tendon (fixed length) reaches the
// tibial tuberosity; tendons, fat pad, ligaments, calf and skin follow, and the far half of the leg
// keeps its round skin behind the cut. While the foot is down,
// the kneecap's contact glows with pfAt(φ) from Fig 4's kneeOf.
const DATA = {"CF":[300,276],"RC":64,"PCTS":[-10,0,5,10],"lines":["10 % fewer steps at the same pace: longer strides, a deeper knee bend on landing, and more force under the kneecap.","Your usual step rate at this pace.","5 % more steps at the same pace: shorter strides, a little less bend, a little less force under the kneecap.","10 % more steps at the same pace: on average about 14 % less peak force under the kneecap."],"mon":{"x0":88,"x1":552,"y0":772,"y1":682,"max":1.2,"box":[24,636,552,170]},"far":{"w":[0.5317,-0.5043],"A":62,"E":24,"dep":140,"round":0.95}};

function mount(fig) {
  const svg = fig.querySelector("svg");
  const q = (s) => svg.querySelector(s);
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const out = Object.fromEntries([...fig.querySelectorAll("[data-r]")].map((n) => [n.dataset.r, n]));
  const status = fig.querySelector("[data-status]");
  const line = fig.querySelector("[data-scene]");
  const buttons = [...fig.querySelectorAll('[data-control="rate"] .opt-seg-btn')];
  const f1 = (v) => v.toFixed(1);
  const set = (part, attr, v) => q(`[data-part="${part}"]`).setAttribute(attr, v);
  const { CF, RC, PCTS, mon: MON } = DATA;
  const RAD = Math.PI / 180;
  const RP = RC + 20; // kneecap centre's distance from the condyle centre

  function smoothP(points, closed = true, k = 1) {
    const n = points.length;
    const at = (i) => points[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
    let d = `M${f1(points[0][0])} ${f1(points[0][1])}`;
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
      d += `C${f1(p1[0] + ((p2[0] - p0[0]) / 6) * k)} ${f1(p1[1] + ((p2[1] - p0[1]) / 6) * k)} ${f1(p2[0] - ((p3[0] - p1[0]) / 6) * k)} ${f1(p2[1] - ((p3[1] - p1[1]) / 6) * k)} ${f1(p2[0])} ${f1(p2[1])}`;
    }
    return d + (closed ? "Z" : "");
  }
  function band(a, ctrl, b, w0, w1) {
    // a tapered band along a quadratic curve
    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      pts.push([(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * ctrl[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * ctrl[1] + t * t * b[1]]);
    }
    const L = [];
    const R = [];
    pts.forEach((p, i) => {
      const u = pts[Math.max(0, i - 1)];
      const v = pts[Math.min(pts.length - 1, i + 1)];
      const l = Math.hypot(v[0] - u[0], v[1] - u[1]) || 1;
      const n = [-(v[1] - u[1]) / l, (v[0] - u[0]) / l];
      const w = (w0 + (w1 - w0) * (i / 16)) / 2;
      L.push([p[0] + n[0] * w, p[1] + n[1] * w]);
      R.push([p[0] - n[0] * w, p[1] - n[1] * w]);
    });
    return { d: `M${[...L, ...R.reverse()].map((p) => `${f1(p[0])} ${f1(p[1])}`).join("L")}Z`, pts };
  }

  // ---------------------------------------------------------------- the far half of the leg (round skin behind the cut)
  // The skin's back and front edges are paired into chords along the leg; each chord is swept round
  // as a half-circle behind the cut (depth = half its length × FAR.round). Facets facing away are
  // culled, the rest shaded by facing and painted back to front.
  const FAR = DATA.far;
  const sA = Math.sin(FAR.A * RAD), cA = Math.cos(FAR.A * RAD), sE = Math.sin(FAR.E * RAD), cE = Math.cos(FAR.E * RAD);
  const VIEW = [cA * cE, sA * cE, sE];
  const LIGHT = (() => {
    const l = [-0.35, 0.55, 0.76];
    const m = Math.hypot(...l);
    return l.map((v) => v / m);
  })();
  const css = getComputedStyle(fig);
  const rgbOf = (name, fb) => {
    const m = /^#?([0-9a-f]{6})$/i.exec((css.getPropertyValue(name) || fb).trim()) || /^#?([0-9a-f]{6})$/i.exec(fb);
    return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
  };
  const SKIN_HI = rgbOf("--a7-w0", "#f0d3c2");
  const SKIN_LO = rgbOf("--a7-w1", "#d5a691");
  const tone = (t) => `rgb(${SKIN_LO.map((lo, i) => Math.round(lo + (SKIN_HI[i] - lo) * t)).join(",")})`;
  function sampleCR(points, k = 0.9, steps = 8) {
    const n = points.length;
    const at = (i) => points[Math.max(0, Math.min(n - 1, i))];
    const out = [points[0]];
    for (let i = 0; i < n - 1; i++) {
      const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
      const c1 = [p1[0] + ((p2[0] - p0[0]) / 6) * k, p1[1] + ((p2[1] - p0[1]) / 6) * k];
      const c2 = [p2[0] - ((p3[0] - p1[0]) / 6) * k, p2[1] - ((p3[1] - p1[1]) / 6) * k];
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const u = 1 - t;
        out.push([0, 1].map((c) => u * u * u * p1[c] + 3 * u * u * t * c1[c] + 3 * u * t * t * c2[c] + t * t * t * p2[c]));
      }
    }
    return out;
  }
  function byLength(pts, n) {
    const acc = [0];
    for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const L = acc[acc.length - 1];
    const out = [];
    let j = 0;
    for (let q = 0; q < n; q++) {
      const want = (L * q) / (n - 1);
      while (j < acc.length - 2 && acc[j + 1] < want) j++;
      const t = (want - acc[j]) / (acc[j + 1] - acc[j] || 1);
      out.push([pts[j][0] + (pts[j + 1][0] - pts[j][0]) * t, pts[j][1] + (pts[j + 1][1] - pts[j][1]) * t]);
    }
    return out;
  }
  const NL = 46;
  const NPHI = 36;
  function drawFar(back, front) {
    const A = byLength(sampleCR(back), NL);
    const B = byLength(sampleCR(front), NL);
    const lv = A.map((a, i) => {
      const b = B[i];
      const h = [(b[0] - a[0]) / 2, (b[1] - a[1]) / 2];
      const r = Math.hypot(h[0], h[1]);
      return { m: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], h, r, u: [h[0] / r, h[1] / r] };
    });
    const pt = (l, ph) => {
      const d = Math.sin(ph) * l.r * FAR.round;
      return [l.m[0] + Math.cos(ph) * l.h[0] + d * FAR.w[0], l.m[1] + Math.cos(ph) * l.h[1] + d * FAR.w[1]];
    };
    const quads = [];
    for (let i = 0; i < NL - 1; i++) {
      const l0 = lv[i];
      const l1 = lv[i + 1];
      const ux = l0.u[0] + l1.u[0];
      const uy = l0.u[1] + l1.u[1];
      const um = Math.hypot(ux, uy) || 1;
      for (let j = 0; j < NPHI; j++) {
        const p0 = (j / NPHI) * Math.PI;
        const p1 = ((j + 1) / NPHI) * Math.PI;
        const pm = (p0 + p1) / 2;
        // outward normal in world (x right, y toward the viewer, z up)
        const n = [(Math.cos(pm) * ux) / um, -Math.sin(pm), (-Math.cos(pm) * uy) / um];
        const facing = n[0] * VIEW[0] + n[1] * VIEW[1] + n[2] * VIEW[2];
        if (facing <= 0.01) continue;
        const lit = Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]);
        const c = [(l0.m[0] + l1.m[0]) / 2 + Math.cos(pm) * (l0.h[0] + l1.h[0]) / 2, (l0.m[1] + l1.m[1]) / 2 + Math.cos(pm) * (l0.h[1] + l1.h[1]) / 2];
        const d = Math.sin(pm) * ((l0.r + l1.r) / 2) * FAR.round;
        const key = (c[0] * cA + (FAR.dep - d) * sA) * cE - c[1] * sE;
        const q = [pt(l0, p0), pt(l1, p0), pt(l1, p1), pt(l0, p1)];
        quads.push({ key, d: `M${q.map((v) => `${f1(v[0])} ${f1(v[1])}`).join("L")}Z`, fill: tone(Math.min(1, 0.18 + 0.95 * lit)) });
      }
    }
    quads.sort((a, b) => a.key - b.key);
    q('[data-part="far"]').innerHTML = quads.map((v) => `<path d="${v.d}" fill="${v.fill}" stroke="${v.fill}" stroke-width="0.7" stroke-linejoin="round"/>`).join("");
  }

  // ---------------------------------------------------------------- kinematics
  let theta = 0;
  const W = (p) => {
    // tibia frame → page
    const c = Math.cos(theta * RAD);
    const s = Math.sin(theta * RAD);
    return [CF[0] + p[0] * c - p[1] * s, CF[1] + p[0] * s + p[1] * c];
  };
  const patLocal = (alpha, p) => {
    const c = Math.cos(alpha * RAD);
    const s = Math.sin(alpha * RAD);
    const P = [CF[0] + RP * c, CF[1] + RP * s];
    return [P[0] + p[0] * c - p[1] * s, P[1] + p[0] * s + p[1] * c];
  };
  const TUB = [60, 118];
  const INF = [2, 31];
  const SUP = [2, -31];
  theta = 0;
  const LPT = Math.hypot(...patLocal(-26, INF).map((v, i) => v - W(TUB)[i]));
  function solveAlpha() {
    const tub = W(TUB);
    let lo = -70;
    let hi = 90;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      const p = patLocal(mid, INF);
      if (Math.hypot(p[0] - tub[0], p[1] - tub[1]) > LPT) lo = mid;
      else hi = mid;
    }
    // in deep swing the real kneecap stays on the front of the femur's end (the simple hinge
    // would drag it underneath), so its glide is capped there; the tendon is unloaded then
    return Math.min(52, (lo + hi) / 2);
  }

  // ---------------------------------------------------------------- state
  let at = 1;
  let pct = 0;
  let phi = 0.1;
  function draw() {
    theta = bendAt(phi, pct);
    const cad = cadenceOf(pct);
    const load = pfAt(phi, cad);
    set("tibia", "transform", `translate(${CF[0]} ${CF[1]}) rotate(${theta.toFixed(2)})`);
    const alpha = solveAlpha();
    const P = patLocal(alpha, [0, 0]);
    set("patella", "transform", `translate(${f1(P[0])} ${f1(P[1])}) rotate(${alpha.toFixed(2)})`);
    const inf = patLocal(alpha, INF);
    const sup = patLocal(alpha, SUP);
    const tub = W(TUB);
    const qt = band(sup, [sup[0] + 26, sup[1] - 70], [356, 150], 20, 26);
    const pt = band(inf, [(inf[0] + tub[0]) / 2 + 6, (inf[1] + tub[1]) / 2], tub, 15, 13);
    set("qtendon", "d", qt.d);
    set("ptendon", "d", pt.d);
    const fib = (pts) => [-4, 0, 4].map((o) => pts.map((p, i) => `${i ? "L" : "M"}${f1(p[0] + o * 0.7)} ${f1(p[1])}`).join("")).join("");
    set("tfibres", "d", fib(qt.pts) + fib(pt.pts));
    q('[data-part="tfibres"]').style.opacity = (0.3 + 0.6 * Math.min(1, load)).toFixed(2);
    // the contact under the kneecap
    let g = "";
    for (let a = alpha - 17; a <= alpha + 17; a += 2) g += `${g ? "L" : "M"}${f1(CF[0] + (RC + 2) * Math.cos(a * RAD))} ${f1(CF[1] + (RC + 2) * Math.sin(a * RAD))}`;
    set("pfglow", "d", g);
    q('[data-part="pfglow"]').style.opacity = (Math.min(1, load / 1.15)).toFixed(2);
    const gc = [CF[0] + (RC + 6) * Math.cos(alpha * RAD), CF[1] + (RC + 6) * Math.sin(alpha * RAD)];
    set("glow", "cx", f1(gc[0]));
    set("glow", "cy", f1(gc[1]));
    set("glow", "opacity", (0.9 * Math.min(1, load / 1.15)).toFixed(2));
    // soft parts that span both bones
    set("fatpad", "d", smoothP([patLocal(alpha, [-10, 24]), pt.pts[8].map((v, i) => v + (CF[i] - v) * 0.12), W([46, 104]), W([40, 74]), [CF[0] + (RC + 3) * Math.cos((alpha + 40) * RAD), CF[1] + (RC + 3) * Math.sin((alpha + 40) * RAD)]]));
    const acl = [W([16, 66]), [270, CF[1] - 12]];
    const pcl = [W([-40, 68]), [318, CF[1] - 6]];
    set("acl", "d", `M${f1(acl[0][0])} ${f1(acl[0][1])}Q${f1((acl[0][0] + acl[1][0]) / 2 - 4)} ${f1((acl[0][1] + acl[1][1]) / 2)} ${f1(acl[1][0])} ${f1(acl[1][1])}`);
    set("pcl", "d", `M${f1(pcl[0][0])} ${f1(pcl[0][1])}Q${f1((pcl[0][0] + pcl[1][0]) / 2 + 6)} ${f1((pcl[0][1] + pcl[1][1]) / 2)} ${f1(pcl[1][0])} ${f1(pcl[1][1])}`);
    const ho = [CF[0] + RC * Math.cos(195 * RAD), CF[1] + RC * Math.sin(195 * RAD)];
    set("gastro", "d", smoothP([[ho[0] - 2, ho[1] - 12], [ho[0] + 14, ho[1] + 6], W([-44, 112]), W([-62, 170]), W([-86, 168]), W([-72, 112])]));
    set("hamt", "d", `M214 214Q${f1((214 + W([-58, 112])[0]) / 2 - 10)} ${f1((214 + W([-58, 112])[1]) / 2 + 10)} ${f1(W([-58, 112])[0])} ${f1(W([-58, 112])[1])}`);
    const frontEdge = [[414, -14], [418, 110], [404, 200], patLocal(alpha, [32, -14]), patLocal(alpha, [30, 22]), W([84, 128]), W([70, 200]), W([62, 256])];
    const backEdge = [[170, -14], [172, 70], [182, 180], [214, CF[1] + 26], W([-92, 118]), W([-112, 190]), W([-108, 256])];
    set("skin", "d", smoothP([[170, -14], ...frontEdge, ...[...backEdge].reverse().slice(0, -1)], true, 0.9));
    drawFar(backEdge, frontEdge);
    // monitor
    const xOf = (p) => MON.x0 + p * (MON.x1 - MON.x0);
    const yOf = (v) => MON.y0 - (v / MON.max) * (MON.y0 - MON.y1);
    const tr = (c) => {
      let d = "";
      for (let i = 0; i <= 120; i++) d += `${d ? "L" : "M"}${f1(xOf(i / 120))} ${f1(yOf(pfAt(i / 120, c)))}`;
      return d;
    };
    set("curve", "d", tr(cad));
    set("ghost", "d", tr(cadenceOf(0)));
    set("cursor", "transform", `translate(${f1(xOf(phi))} 0)`);
    set("mdot", "cx", f1(xOf(phi)));
    set("mdot", "cy", f1(yOf(load)));
  }

  // ---------------------------------------------------------------- input, tour, loop
  function readout(quiet) {
    const p = PCTS[at];
    const c = cadenceOf(p);
    out.cad.textContent = `${Math.round(c)}/min`;
    out.step.textContent = `${stepOf(c).toFixed(2)} m`;
    out.pf.textContent = `${Math.round(100 * kneeOf(c))}%`;
    line.textContent = DATA.lines[at];
    buttons.forEach((b, j) => {
      b.setAttribute("aria-checked", j === at ? "true" : "false");
      b.tabIndex = j === at ? 0 : -1;
    });
    if (!quiet) status.textContent = `${Math.round(c)} steps a minute: peak force under the kneecap ${Math.round(100 * kneeOf(c))}% of usual.`;
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
      at = i;
      readout();
      if (still.matches) renderStill();
    }),
  );
  for (const b of buttons) b.addEventListener("pointerdown", takeOver);
  fig.querySelector('[data-control="rate"]').addEventListener("keydown", (ev) => {
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
    pct = PCTS[at];
    phi = KNEE.duty * 0.44; // mid-stance: deepest bend, most force
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
    if (touring && (tourClock += dt) > 6) {
      tourClock = 0;
      const seq = [1, 3, 0]; // usual → +10 % → −10 %
      at = seq[(seq.indexOf(at) + 1) % seq.length];
      readout(true);
    }
    pct += (PCTS[at] - pct) * (1 - Math.exp(-dt * 3));
    const stride = (120 / cadenceOf(pct)) * KNEE.slow;
    phi = (phi + dt / stride) % 1;
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
  readout(true);
  if (still.matches) renderStill();
  else {
    draw();
    start();
  }
}

class Fig extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    const root = this.attachShadow({ mode: "open" });
    const theme = this.getAttribute("theme") === "dark" ? "dark" : "light";
    root.innerHTML = "<style>" + "\n.iso{\n  --anatomy-page:#0b0b0b;--anatomy-card:#131313;--anatomy-text:#a3a3a3;--anatomy-strong:#e6e6e6;--anatomy-muted:#6e6e6e;\n  --anatomy-paper:#131313;--anatomy-face:#1b1b1b;--anatomy-top:#1c1c1c;\n  --anatomy-shade-0:#0f0f0f;--anatomy-shade-1:#121212;--anatomy-shade-2:#151515;--anatomy-shade-3:#181818;\n  --anatomy-lit-top:#262626;--anatomy-lit-shade:#1d1d1d;\n  --anatomy-hi:#d4d4d4;--anatomy-mid:#6a6a6a;--anatomy-lo:#3e3e3e;--anatomy-faint:#2a2a2a;--anatomy-lit:#ffffff;\n  --anatomy-halo:#050505;--anatomy-halo-opacity:.9;--anatomy-dot:#e6e6e6;\n  --anatomy-red:#ff6b6b;--anatomy-green:#6be0a0;--anatomy-blue:#6b9bff;\n  --anatomy-weight:.6px;--anatomy-ease:cubic-bezier(.32,.72,0,1);\n  --anatomy-mono:ui-monospace,\"SF Mono\",Menlo,Consolas,monospace;\n  --anatomy-lift:inset 0 1px 0 0 #ffffff0a,inset 0 0 0 1px #ffffff06,0 0 0 1px #00000026,0 1px 1px -.5px #00000014,0 3px 3px -1.5px #00000014,0 6px 6px -3px #00000014,0 12px 12px -6px #00000014;\n}\n.iso[data-theme=\"light\"]{\n  --anatomy-page:#f2f2ef;--anatomy-card:#fbfbfa;--anatomy-text:#57575a;--anatomy-strong:#18181a;--anatomy-muted:#8c8c90;\n  --anatomy-paper:#fbfbfa;--anatomy-face:#ffffff;--anatomy-top:#ffffff;\n  --anatomy-shade-0:#dcdcd9;--anatomy-shade-1:#e5e5e2;--anatomy-shade-2:#ededea;--anatomy-shade-3:#f4f4f1;\n  --anatomy-lit-top:#ffffff;--anatomy-lit-shade:#eeeeeb;\n  --anatomy-hi:#26262a;--anatomy-mid:#8a8a8f;--anatomy-lo:#b4b4b8;--anatomy-faint:#d4d4d6;--anatomy-lit:#000000;\n  --anatomy-halo:#8a8a80;--anatomy-halo-opacity:.32;--anatomy-dot:#3a3a3e;\n  --anatomy-red:#e5484d;--anatomy-green:#30a46c;--anatomy-blue:#3e63dd;\n  --anatomy-lift:inset 0 1px 0 0 #ffffff,0 0 0 1px #0000000f,0 1px 1px -.5px #0000000a,0 3px 3px -1.5px #0000000a,0 6px 6px -3px #0000000a,0 12px 12px -6px #0000000a;\n}\n.iso-svg{display:block;width:100%;height:auto;overflow:visible}\n.iso-svg path,.iso-svg circle{vector-effect:non-scaling-stroke}\n.iso-fill{fill:var(--anatomy-paper);stroke:none}\n.iso-solid[data-lit]>.iso-fill{fill:var(--anatomy-face)}\n.iso-shade,.iso-top{stroke:none}\n.iso-shade[data-shade=\"0\"]{fill:var(--anatomy-shade-0)}\n.iso-shade[data-shade=\"1\"]{fill:var(--anatomy-shade-1)}\n.iso-shade[data-shade=\"2\"]{fill:var(--anatomy-shade-2)}\n.iso-shade[data-shade=\"3\"]{fill:var(--anatomy-shade-3)}\n.iso-top{fill:var(--anatomy-top)}\n.iso-solid[data-lit]>.iso-top{fill:var(--anatomy-lit-top)}\n.iso-solid[data-lit]>.iso-shade{fill:var(--anatomy-lit-shade)}\n.iso-solid[data-seamless]>.iso-shade,.iso-solid[data-seamless]>.iso-top{stroke-width:.4;stroke-linejoin:round}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"0\"]{stroke:var(--anatomy-shade-0)}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"1\"]{stroke:var(--anatomy-shade-1)}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"2\"]{stroke:var(--anatomy-shade-2)}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"3\"]{stroke:var(--anatomy-shade-3)}\n.iso-solid[data-seamless]>.iso-top{stroke:var(--anatomy-top)}\n.iso-solid[data-seamless][data-lit]>.iso-top{stroke:var(--anatomy-lit-top)}\n.iso-solid[data-seamless][data-lit]>.iso-shade{stroke:var(--anatomy-lit-shade)}\n.iso-solid[data-lit]>.iso-edge{stroke:var(--anatomy-lit)}\n.iso-halo{fill:var(--anatomy-halo);stroke:none;filter:blur(9px);opacity:var(--anatomy-halo-opacity);transform:translateY(3px)}\n.iso-line{fill:none;stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight);stroke-linecap:round;stroke-linejoin:round}\n.iso-line[data-tone=\"hi\"]{stroke:var(--anatomy-hi)}\n.iso-line[data-tone=\"mid\"]{stroke:var(--anatomy-mid)}\n.iso-line[data-tone=\"lo\"]{stroke:var(--anatomy-lo)}\n.iso-line[data-tone=\"faint\"]{stroke:var(--anatomy-faint)}\n.iso-line[data-tone=\"lit\"]{stroke:var(--anatomy-lit)}\n.iso-line[data-tone=\"red\"]{stroke:var(--anatomy-red)}\n.iso-line[data-tone=\"green\"]{stroke:var(--anatomy-green)}\n.iso-line[data-tone=\"blue\"]{stroke:var(--anatomy-blue)}\n.iso-line[data-dotted]{stroke-dasharray:.01 3.5;stroke-width:1}\n.iso-line[data-dashed]{stroke-dasharray:3 3}\n.iso-line[data-flow]{stroke-dasharray:2 6}\n.iso-wire-end{fill:var(--anatomy-paper);stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight)}\n.iso-wire[data-tone=\"hi\"] .iso-wire-end{stroke:var(--anatomy-hi)}\n.iso-wire[data-tone=\"mid\"] .iso-wire-end{stroke:var(--anatomy-mid)}\n.iso-wire[data-tone=\"faint\"] .iso-wire-end{stroke:var(--anatomy-faint)}\n.iso-wire[data-tone=\"lit\"] .iso-wire-end{stroke:var(--anatomy-lit)}\n.iso-dots circle{fill:var(--anatomy-dot);stroke:none;opacity:.32}\n.iso-dots[data-tone=\"hi\"] circle{opacity:.85}\n.iso-dots[data-tone=\"mid\"] circle{opacity:.45}\n.iso-dots[data-tone=\"lo\"] circle{opacity:.22}\n.iso-dots[data-tone=\"faint\"] circle{opacity:.12}\n.iso-face-text{fill:var(--anatomy-mid);font-family:var(--anatomy-mono);letter-spacing:.04em}\n.iso-face-text[data-tone=\"hi\"]{fill:var(--anatomy-hi)}\n.iso-face-text[data-tone=\"lo\"]{fill:var(--anatomy-lo)}\n.iso-face-text[data-tone=\"faint\"]{fill:var(--anatomy-faint)}\n.tb-body{fill:var(--anatomy-shade-2);stroke:none}\n.tb-shine{fill:var(--anatomy-top);stroke:none}\n.tb-shade{fill:var(--anatomy-shade-0);stroke:none}\n.tb-ring{fill:none;stroke:var(--anatomy-lo);stroke-width:.45;stroke-linecap:butt;stroke-linejoin:round}\n.tb-ring[data-tone=\"mid\"]{stroke:var(--anatomy-mid)}\n.tb-ring[data-tone=\"faint\"]{stroke:var(--anatomy-faint)}\n.tb-ring[data-tone=\"hi\"]{stroke:var(--anatomy-hi)}\n@keyframes iso-flow{to{stroke-dashoffset:-32}}\n@keyframes iso-pulse{0%,100%{opacity:.18}12%{opacity:1}40%{opacity:.18}}\n.iso-line[data-flow]{animation:iso-flow 1600ms linear infinite}\n.iso-dots circle[data-pulse]{animation:iso-pulse 1600ms steps(1,end) infinite;animation-delay:var(--pulse-at,0ms)}\n.iso-figure{margin:32px 0 36px}\n.iso-plate{position:relative;padding:52px 24px;border-radius:0;background:var(--anatomy-card);box-shadow:0 0 0 1px var(--anatomy-mid);--anatomy-paper:var(--anatomy-card)}\n.iso-plate-corners{position:absolute;inset:18px 20px;pointer-events:none}\n.iso-plate-corner{position:absolute;color:var(--anatomy-muted);font-family:var(--anatomy-mono);font-size:10.5px;line-height:1;letter-spacing:.04em;white-space:nowrap}\n.iso-plate-corner[data-corner=\"fig\"]{top:0;left:0;color:var(--anatomy-text)}\n.iso-plate-corner[data-corner=\"title\"]{top:0;right:0;text-transform:uppercase;letter-spacing:.1em}\n.iso-plate-corner[data-corner=\"hint\"]{bottom:0;left:0;text-transform:uppercase;letter-spacing:.1em}\n.iso-plate-corner[data-corner=\"readout\"]{right:0;bottom:0;color:var(--anatomy-text);font-variant-numeric:tabular-nums}\n.iso-plate .iso-svg{margin:0 auto}\n.iso-legend{display:grid;gap:8px;margin-top:12px;color:var(--anatomy-muted);font-size:13px;line-height:1.55}\n.iso-keys{display:flex;flex-wrap:wrap;gap:6px 18px}\n.iso-key{display:inline-flex;align-items:center;gap:7px}\n.iso-swatch{width:16px;height:10px;flex:none;overflow:visible}\n.iso-swatch path{fill:none;stroke:var(--anatomy-hi);stroke-width:1;vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round}\n.iso-swatch[data-mark=\"raised\"] path,.iso-swatch[data-mark=\"flat\"] path{stroke:var(--anatomy-mid)}\n.iso-swatch[data-mark=\"lit\"] path{stroke:var(--anatomy-lit)}\n.iso-swatch[data-mark=\"dim\"] path{stroke:var(--anatomy-lo)}\n.iso-swatch[data-mark=\"dotted\"] path{stroke-dasharray:.01 3;stroke-width:1.4}\n.iso-swatch[data-mark=\"dashed\"] path{stroke-dasharray:3 2.5}\n.iso-swatch[data-mark=\"red\"] path{stroke:var(--anatomy-red)}\n.iso-swatch[data-mark=\"green\"] path{stroke:var(--anatomy-green)}\n.iso-swatch[data-mark=\"blue\"] path{stroke:var(--anatomy-blue)}\n.iso-swatch-crease{stroke:var(--anatomy-lo)!important}\n@media (max-width:560px){.iso-plate{padding:48px 12px 70px}.iso-plate-corner[data-corner=\"hint\"]{bottom:18px}}\n@media (prefers-reduced-motion:reduce){.iso-line[data-flow],.iso-dots circle[data-pulse]{animation:none}}\n/*\n * Optimal theme for Anatomy figures.\n *\n * Load AFTER the kit's ISO_CSS. Put `class=\"iso optimal\"` on the wrapper:\n *   - no data-theme  -> \"Forest night\"  (exam-room TV, dark)\n *   - data-theme=\"light\" -> \"Cream\"     (beoptimal.ca, the primary target)\n *\n * Values come from the live site (beoptimal-landing src/index.css), the\n * Performance package design and the ALE visualizer spec. The kit's grey\n * ramps are warmed so solids sit on the site's cream paper, and the single\n * \"lit\" accent is Optimal forest green instead of pure black/white.\n */\n\n.iso.optimal {\n  /* Forest night (dark) */\n  --anatomy-page: #152511;\n  --anatomy-card: #1c3118;\n  --anatomy-text: #c9cdbf;\n  --anatomy-strong: #fffcf7;\n  --anatomy-muted: #8e9884;\n  --anatomy-paper: #1c3118;\n  --anatomy-face: #253821;\n  --anatomy-top: #283c24;\n  --anatomy-shade-0: #172812;\n  --anatomy-shade-1: #1a2c16;\n  --anatomy-shade-2: #1e321a;\n  --anatomy-shade-3: #22371e;\n  --anatomy-lit-top: #34492f;\n  --anatomy-lit-shade: #2a3f26;\n  --anatomy-hi: #e9e6dc;\n  --anatomy-mid: #7e8a74;\n  --anatomy-lo: #4d5c46;\n  --anatomy-faint: #33452e;\n  --anatomy-lit: #fffcf7;\n  --anatomy-halo: #0b1508;\n  --anatomy-halo-opacity: 0.9;\n  --anatomy-dot: #e9e6dc;\n  --anatomy-red: #e0745f;\n  --anatomy-green: #8cc67f;\n  --anatomy-blue: #7fa8d9;\n  --anatomy-mono: \"JetBrains Mono\", ui-monospace, \"SF Mono\", Menlo, Consolas, monospace;\n\n  /* Optimal extras (use sparingly; colour only when colour is the subject) */\n  --opt-display: \"Castoro\", Georgia, serif;\n  --opt-ui: \"Public Sans\", system-ui, sans-serif;\n  --opt-forest: #2c4e25;\n  --opt-forest-light: #519044;\n  --opt-sage: #5e7a59;\n  --opt-borderline: #c97b2d;\n  --opt-out: #b3402f;\n  --opt-heat: #ff9776;\n}\n\n.iso.optimal[data-theme=\"light\"] {\n  /* Cream (light) */\n  --anatomy-page: #fef8f1;\n  --anatomy-card: #fffcf7;\n  --anatomy-text: #3e3d39;\n  --anatomy-strong: #252525;\n  --anatomy-muted: #76736d;\n  --anatomy-paper: #fffcf7;\n  --anatomy-face: #fffefb;\n  --anatomy-top: #fffefb;\n  --anatomy-shade-0: #ddd7cc;\n  --anatomy-shade-1: #e7e2d9;\n  --anatomy-shade-2: #f0ede5;\n  --anatomy-shade-3: #f6f3ec;\n  --anatomy-lit-top: #fffefb;\n  --anatomy-lit-shade: #efebe2;\n  --anatomy-hi: #252525;\n  --anatomy-mid: #8a867e;\n  --anatomy-lo: #b9b4aa;\n  --anatomy-faint: #d9d3c8;\n  --anatomy-lit: #2c4e25;\n  --anatomy-halo: #8a8070;\n  --anatomy-halo-opacity: 0.3;\n  --anatomy-dot: #3a3833;\n  --anatomy-red: #b3402f;\n  --anatomy-green: #3f7a35;\n  --anatomy-blue: #3e6a8f;\n}\n\n/* Card typography: brand fonts for titles and readouts, kit mono for plate corners */\n.iso.optimal .iso-plate-title,\n.iso.optimal [data-role=\"title\"] {\n  font-family: var(--opt-display);\n  letter-spacing: -0.02em;\n}\n.iso.optimal [data-role=\"readout\"],\n.iso.optimal .iso-readout {\n  font-family: var(--opt-ui);\n  font-feature-settings: \"tnum\" 1, \"ss01\" 1;\n}\n\n/*\n * Card layout for Optimal figures (shared/page.mjs `plate`).\n * Phone first: the drawing, then a row of real buttons (>=44 px), then a footer\n * where the hint and the readout wrap instead of overlapping at 320 px.\n */\n.iso.optimal {\n  --opt-rule: rgba(233, 230, 220, 0.16);\n  --opt-btn: rgba(233, 230, 220, 0.06);\n  --opt-btn-on: #e9e6dc;\n  --opt-btn-on-text: #1c3118;\n  --opt-title: #fffcf7;\n  --opt-fig: #8cc67f;\n  --opt-heat-ink: #ff9776;\n  --opt-heat-glow: rgba(255, 151, 118, 0.55);\n  --opt-heat-wash: rgba(255, 151, 118, 0.16);\n  --opt-cold-ink: #9cc3e6;\n}\n.iso.optimal[data-theme=\"light\"] {\n  --opt-rule: rgba(44, 78, 37, 0.2);\n  --opt-btn: #fffcf7;\n  --opt-btn-on: #2c4e25;\n  --opt-btn-on-text: #fffcf7;\n  --opt-title: #2c4e25;\n  --opt-fig: #5e7a59;\n  --opt-heat-ink: #c8552e;\n  --opt-heat-glow: rgba(232, 108, 64, 0.42);\n  --opt-heat-wash: rgba(255, 151, 118, 0.22);\n  --opt-cold-ink: #3e6a8f;\n}\n.iso.optimal .opt-plate {\n  padding: 52px 24px 20px;\n  box-shadow: 0 0 0 1px var(--opt-rule);\n  border-radius: 2px;\n}\n.iso.optimal .iso-plate-corner[data-corner=\"fig\"] {\n  font-family: var(--opt-display);\n  font-style: italic;\n  font-size: 15px;\n  letter-spacing: 0;\n  color: var(--opt-fig);\n  top: -2px;\n}\n.iso.optimal .iso-plate-corner[data-corner=\"title\"] {\n  font-family: var(--opt-display);\n  font-size: 17px;\n  text-transform: none;\n  letter-spacing: -0.01em;\n  color: var(--opt-title);\n  top: -4px;\n}\n.iso.optimal .opt-controls {\n  display: flex;\n  flex-wrap: wrap;\n  justify-content: center;\n  gap: 8px 12px;\n  margin: 10px 0 0;\n}\n.iso.optimal .opt-seg {\n  display: inline-flex;\n  border-radius: 999px;\n  box-shadow: inset 0 0 0 1px var(--opt-rule);\n  padding: 3px;\n  gap: 2px;\n  max-width: 100%;\n}\n.iso.optimal .opt-seg-btn {\n  appearance: none;\n  border: 0;\n  margin: 0;\n  min-height: 44px;\n  min-width: min-content; /* never shrink a label below its longest word (with the padding, always ≥ 44 px) */\n  padding: 0 16px;\n  border-radius: 999px;\n  background: transparent;\n  color: var(--anatomy-text);\n  font: 500 14px/1.1 var(--opt-ui);\n  letter-spacing: 0;\n  cursor: pointer;\n  touch-action: manipulation;\n  -webkit-tap-highlight-color: transparent;\n  transition: background-color 240ms var(--anatomy-ease), color 240ms var(--anatomy-ease);\n}\n.iso.optimal .opt-seg-btn[aria-checked=\"true\"] {\n  background: var(--opt-btn-on);\n  color: var(--opt-btn-on-text);\n}\n.iso.optimal .opt-seg-btn:focus-visible {\n  outline: 2px solid var(--opt-fig);\n  outline-offset: 2px;\n}\n.iso.optimal .opt-foot {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: flex-end;\n  justify-content: space-between;\n  gap: 10px 20px;\n  margin-top: 16px;\n}\n.iso.optimal .opt-hint {\n  font-family: var(--anatomy-mono);\n  font-size: 10.5px;\n  line-height: 1.4;\n  letter-spacing: 0.1em;\n  text-transform: uppercase;\n  color: var(--anatomy-muted);\n  flex: 1 1 160px;\n  min-width: 0;\n}\n.iso.optimal .opt-readout {\n  display: grid;\n  grid-auto-flow: column;\n  gap: 4px 18px;\n  margin: 0;\n  font-family: var(--opt-ui);\n  font-feature-settings: \"tnum\" 1;\n}\n.iso.optimal .opt-stat { margin: 0; min-width: 0; }\n.iso.optimal .opt-stat dt {\n  font-size: 10px;\n  font-weight: 600;\n  letter-spacing: 0.12em;\n  text-transform: uppercase;\n  color: var(--anatomy-muted);\n  white-space: nowrap;\n}\n.iso.optimal .opt-stat dd {\n  margin: 1px 0 0;\n  font-size: 15px;\n  font-weight: 500;\n  color: var(--anatomy-strong);\n  white-space: nowrap;\n}\n.iso.optimal .iso-legend { font-family: var(--opt-ui); font-size: 13.5px; }\n.iso.optimal .iso-caption { color: var(--anatomy-text); }\n.iso.optimal .iso-caption em { font-style: italic; }\n.iso.optimal .iso-swatch[data-mark=\"heat\"] path { stroke: var(--opt-heat-ink); stroke-width: 2; }\n.iso.optimal .iso-stage { outline: none; border-radius: 4px; touch-action: pan-y; -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none; }\n.iso.optimal .iso-stage:focus-visible { outline: 1px solid var(--anatomy-muted); outline-offset: 6px; }\n@media (max-width: 560px) {\n  .iso.optimal .opt-plate { padding: 44px 10px 14px; }\n  .iso.optimal .iso-plate-corners { inset: 16px 12px; }\n  .iso.optimal .opt-readout { grid-auto-flow: row; grid-template-columns: repeat(4, minmax(0, auto)); width: 100%; justify-content: space-between; gap: 4px 10px; order: -1; }\n  .iso.optimal .opt-stat dd { font-size: 14px; }\n  /* a long label wraps onto two lines instead of running into its neighbour; values stay on one baseline */\n  .iso.optimal .opt-stat { display: flex; flex-direction: column; justify-content: space-between; }\n  .iso.optimal .opt-stat dt { white-space: normal; line-height: 1.25; }\n  .iso.optimal .opt-seg-btn { padding: 0 12px; font-size: 13.5px; }\n}\n@media (max-width: 350px) {\n  .iso.optimal .opt-seg-btn { padding: 0 7px; font-size: 12.5px; }\n  .iso.optimal .opt-stat dt { font-size: 9px; letter-spacing: 0.08em; }\n  .iso.optimal .opt-stat dd { font-size: 13px; }\n}\n\n:host{display:block}\n.opt-host{background:transparent;color:var(--anatomy-text);font:15px/1.6 var(--opt-ui);-webkit-font-smoothing:antialiased}\n.opt-host *{box-sizing:border-box}\n.opt-host .iso-figure{margin:0}\n/* A7 · the knee in side section: ivory bone with a warm cut face, blue-white cartilage, pale\n   tendons, rose muscle, a soft skin silhouette; force under the kneecap glows amber. */\n.iso.optimal {\n  --a7-skin: rgba(232, 190, 170, 0.12); --a7-skin-edge: rgba(232, 190, 170, 0.45);\n  --a7-muscle: #7c3a3a; --a7-muscle-edge: #b8706a;\n  --a7-bg0: #efe3c6; --a7-bg1: #d6c091; --a7-bone-edge: #fff1d0; --a7-hatch: rgba(150, 120, 70, 0.4); --a7-cutcap: #c06a5a;\n  --a7-cart: #cfe6ff; --a7-men: #b8d8f0; --a7-lig: #efe0a6; --a7-fat: #e8cf6e; --a7-tendon: #f1e7d2; --a7-tendon-edge: #b9a77f; --a7-fibre: rgba(160, 130, 80, 0.7);\n  --a7-glow: #ffb347; --a7-gl0: rgba(255, 179, 71, 0.65); --a7-gl1: rgba(255, 179, 71, 0);\n  --a7-mon-bg: #0f1b0c; --a7-mon-ink: #c9e3c1; --a7-mon-dim: #33452e; --a7-curve: #ffb347; --a7-stance: rgba(201, 227, 193, 0.08);\n}\n.iso.optimal[data-theme=\"light\"] {\n  --a7-skin: rgba(214, 150, 120, 0.12); --a7-skin-edge: rgba(150, 90, 70, 0.4);\n  --a7-muscle: #d58a84; --a7-muscle-edge: #9a4a44;\n  --a7-bg0: #fbf3e2; --a7-bg1: #ead6aa; --a7-bone-edge: #8f7a4c; --a7-hatch: rgba(140, 110, 60, 0.35); --a7-cutcap: #b04a3c;\n  --a7-cart: #9ecbf0; --a7-men: #7fb2dc; --a7-lig: #d8bc58; --a7-fat: #f0d36a; --a7-tendon: #fffaf0; --a7-tendon-edge: #9a8456; --a7-fibre: rgba(140, 110, 60, 0.6);\n  --a7-glow: #e8820c; --a7-gl0: rgba(232, 130, 12, 0.55); --a7-gl1: rgba(232, 130, 12, 0);\n  --a7-mon-bg: #1d2a1a; --a7-mon-ink: #d9efd2; --a7-mon-dim: #3d5436; --a7-curve: #ffb347; --a7-stance: rgba(217, 239, 210, 0.1);\n}\n.a7-bg0 { stop-color: var(--a7-bg0); } .a7-bg1 { stop-color: var(--a7-bg1); }\n.a7-gl0 { stop-color: var(--a7-gl0); } .a7-gl1 { stop-color: var(--a7-gl1); }\n.a7-svg .a7-mon path, .a7-svg .a7-mon rect, .a7-svg .a7-mon circle { vector-effect: non-scaling-stroke; }\n.a7-skin { fill: var(--a7-skin); stroke: var(--a7-skin-edge); stroke-width: 1.4; }\n.a7-quad, .a7-ham, .a7-gastro, .a7-calf { fill: var(--a7-muscle); stroke: var(--a7-muscle-edge); stroke-width: 1; opacity: 0.85; }\n.a7-hamt { fill: none; stroke: var(--a7-tendon); stroke-width: 7; stroke-linecap: round; opacity: 0.9; }\n.a7-bone, .a7-pat { stroke: var(--a7-bone-edge); stroke-width: 1.3; }\n.a7-hatch { fill: none; stroke: var(--a7-hatch); stroke-width: 1.8; stroke-linecap: round; }\n.a7-cart { fill: none; stroke: var(--a7-cart); stroke-width: 6; stroke-linecap: round; }\n.a7-pat-cart { fill: var(--a7-cart); }\n.a7-men { fill: var(--a7-men); stroke: var(--a7-bone-edge); stroke-width: 0.6; }\n.a7-lig { fill: none; stroke: var(--a7-lig); stroke-width: 7; stroke-linecap: round; opacity: 0.9; }\n.a7-fat { fill: var(--a7-fat); opacity: 0.85; }\n.a7-tendon { fill: var(--a7-tendon); stroke: var(--a7-tendon-edge); stroke-width: 1; }\n.a7-fibres { fill: none; stroke: var(--a7-fibre); stroke-width: 0.9; }\n.a7-pfglow { fill: none; stroke: var(--a7-glow); stroke-width: 9; stroke-linecap: round; }\n.a7-glow { pointer-events: none; }\n.a7-cutcap { fill: none; stroke: var(--a7-cutcap); stroke-width: 3; }\n.a7-mon-bg { fill: var(--a7-mon-bg); }\n.a7-mon-title { fill: var(--a7-mon-ink); font: 600 19px/1 var(--opt-ui); }\n.a7-stance { fill: var(--a7-stance); }\n.a7-grid { fill: none; stroke: var(--a7-mon-dim); stroke-width: 1; stroke-dasharray: 3 4; }\n.a7-axis { fill: none; stroke: var(--a7-mon-ink); stroke-width: 1; opacity: 0.45; }\n.a7-tick { fill: var(--a7-mon-ink); font: 500 16px/1 var(--opt-ui); opacity: 0.8; }\n.a7-curve { fill: none; stroke: var(--a7-curve); stroke-width: 2.6; stroke-linejoin: round; }\n.a7-ghost { fill: none; stroke: var(--a7-mon-ink); stroke-width: 1.3; stroke-dasharray: 3 4; opacity: 0.5; }\n.a7-cursor { fill: none; stroke: var(--a7-mon-ink); stroke-width: 1; stroke-dasharray: 2 3; opacity: 0.7; }\n.a7-mdot { fill: var(--a7-curve); stroke: var(--a7-mon-bg); stroke-width: 2; }\n.iso.optimal .iso-swatch[data-mark=\"cart\"] path { stroke: var(--a7-cart); stroke-width: 5; stroke-linecap: round; }\n.iso.optimal .iso-swatch[data-mark=\"tendon\"] path { stroke: var(--a7-tendon-edge); stroke-width: 5; stroke-linecap: round; }\n.a7-scene { margin: 10px 4px 0; font: 500 14px/1.45 var(--opt-ui); color: var(--anatomy-text); min-height: 4.4em; }\n.a7-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }\n.a7-par { display: block; margin-top: 6px; }\n.a7-par:first-child { margin-top: 0; }\n.a7-par small { font-size: 12.5px; color: var(--anatomy-muted); }\n\n/* round 2: the leg cut in half lengthwise; the cut face is the section, the far half stays round */\n.iso.optimal { --a7-soft: #4a3029; --a7-dermis: #a5786b; --a7-w0: #9a6e5f; --a7-w1: #3a241f; --a7-fat-x: #6a5133; --a7-cap-light: rgba(255, 236, 220, 0.06); --a7-cap-edge: #c4978a; --a7-art-x: #d8584a; --a7-vein-x: #6a6fb0; --a7-nerve-x: #e3c46a; }\n.iso.optimal[data-theme=\"light\"] { --a7-soft: #f6e4d4; --a7-dermis: #c99582; --a7-w0: #f7e2d5; --a7-w1: #c9917b; --a7-fat-x: #f6deaa; --a7-cap-light: rgba(255, 255, 255, 0.18); --a7-cap-edge: #a97362; --a7-art-x: #c9483a; --a7-vein-x: #5f66b4; --a7-nerve-x: #d9b24a; }\n.a7-slab .a7-skin { fill: var(--a7-soft); stroke: var(--a7-dermis); stroke-width: 3; }\n.a7-slab .a7-quad, .a7-slab .a7-ham, .a7-slab .a7-gastro, .a7-slab .a7-calf { opacity: 1; }\n.a7-fasc { fill: none; stroke: var(--a7-muscle-edge); stroke-width: 1; opacity: 0.35; stroke-linecap: round; }\n.a7-cap-skin { fill: var(--a7-dermis); }\n.a7-cap-fat { fill: var(--a7-fat-x); }\n.a7-cap-muscle { fill: var(--a7-muscle); }\n.a7-cap-fasc { fill: var(--a7-muscle-edge); opacity: 0.45; }\n.a7-cap-mus ellipse { fill: none; stroke: var(--a7-muscle-edge); stroke-width: 0.9; opacity: 0.7; }\n.a7-cap-septum { fill: none; stroke: var(--a7-fat-x); stroke-width: 2.2; stroke-linecap: round; }\n.a7-cap-bone { fill: var(--a7-bg0); stroke: var(--a7-bone-edge); stroke-width: 0.8; }\n.a7-cap-marrow { fill: var(--a7-fat-x); }\n.a7-cap-art ellipse { fill: var(--a7-art-x); }\n.a7-cap-vein ellipse { fill: var(--a7-vein-x); }\n.a7-cap-nerve ellipse { fill: var(--a7-nerve-x); }\n.a7-cap-light { fill: var(--a7-cap-light); }\n.a7-cap-edge { fill: none; stroke: var(--a7-cap-edge); stroke-width: 1; }\n.a7-canal { fill: var(--a7-fat-x); stroke: var(--a7-bone-edge); stroke-width: 0.6; stroke-opacity: 0.5; }\n" + "</style><div class=\"iso optimal opt-host\" data-theme=\"" + theme + "\">" + "<figure class=\"iso-figure opt-figure \"><div class=\"iso-plate opt-plate\"><div class=\"iso-plate-corners\" aria-hidden=\"true\"><span class=\"iso-plate-corner\" data-corner=\"fig\">A7</span><span class=\"iso-plate-corner\" data-corner=\"title\">The kneecap's load</span></div><div class=\"iso-stage a7-stage\"><svg class=\"iso-svg a7-svg\" viewBox=\"0 0 600 812\" role=\"img\" aria-label=\"A leg cut in half lengthwise at the knee and seen in 3-D. The cut face shows the knee in side section, front to the right, through one running stride. The thigh bone stays still while the shin bone swings beneath it and the kneecap glides up and down in its groove, held by the patellar tendon. Cartilage covers all three bones, with the menisci and the cruciate ligaments between them, the fat pad behind the tendon, and the thigh and calf muscles around. While the foot is on the ground, the contact under the kneecap glows with the force on it; a monitor plots that force over the stride.\">\n<defs>\n  <linearGradient id=\"a7-boneg\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\"><stop offset=\"0\" class=\"a7-bg0\"/><stop offset=\"1\" class=\"a7-bg1\"/></linearGradient>\n  <radialGradient id=\"a7-glowg\" cx=\"50%\" cy=\"50%\" r=\"50%\"><stop offset=\"0\" class=\"a7-gl0\"/><stop offset=\"1\" class=\"a7-gl1\"/></radialGradient>\n</defs>\n<g transform=\"matrix(0.9820 0.2124 0.0000 1.0160 75.94 15.26)\"><g class=\"a7-far\" data-part=\"far\"></g></g>\n<g class=\"a7-cap\" transform=\"matrix(0.9820 0.2124 0.5221 -0.3994 75.94 1.03)\">\n<path class=\"a7-cap-skin\" d=\"M414.0 0.0L413.7 7.6L413.0 15.1L411.7 22.6L409.8 30.0L407.5 37.3L404.7 44.4L401.4 51.3L397.7 57.9L393.4 64.4L388.8 70.6L383.7 76.4L378.3 82.0L372.4 87.1L366.3 91.9L359.8 96.4L353.0 100.4L346.0 103.9L338.7 107.1L331.2 109.7L323.6 112.0L315.8 113.7L307.9 114.9L300.0 115.7L292.0 115.9L284.0 115.7L276.1 114.9L268.2 113.7L260.4 112.0L252.8 109.7L245.3 107.1L238.0 103.9L231.0 100.4L224.2 96.4L217.7 91.9L211.6 87.1L205.7 82.0L200.3 76.4L195.2 70.6L190.6 64.4L186.3 57.9L182.6 51.3L179.3 44.4L176.5 37.3L174.2 30.0L172.3 22.6L171.0 15.1L170.3 7.6L170.0 0.0Z\"/>\n<path class=\"a7-cap-fat\" d=\"M410.0 0.0L409.7 7.3L409.0 14.6L407.7 21.8L406.0 29.0L403.7 36.0L401.0 42.8L397.8 49.5L394.2 55.9L390.1 62.2L385.6 68.1L380.7 73.8L375.4 79.1L369.8 84.1L363.8 88.8L357.6 93.0L351.0 96.9L344.2 100.4L337.2 103.4L329.9 106.0L322.5 108.1L315.0 109.7L307.4 110.9L299.7 111.7L292.0 111.9L284.3 111.7L276.6 110.9L269.0 109.7L261.5 108.1L254.1 106.0L246.8 103.4L239.8 100.4L233.0 96.9L226.4 93.0L220.2 88.8L214.2 84.1L208.6 79.1L203.3 73.8L198.4 68.1L193.9 62.2L189.8 55.9L186.2 49.5L183.0 42.8L180.3 36.0L178.0 29.0L176.3 21.8L175.0 14.6L174.3 7.3L174.0 0.0Z\"/>\n<path class=\"a7-cap-muscle\" d=\"M399.0 0.0L398.8 6.6L398.1 13.2L396.9 19.7L395.4 26.1L393.3 32.4L390.9 38.6L388.0 44.6L384.7 50.4L381.0 56.1L376.9 61.4L372.4 66.5L367.7 71.3L362.6 75.9L357.1 80.0L351.4 83.9L345.5 87.4L339.3 90.5L332.9 93.2L326.4 95.5L319.7 97.5L312.9 99.0L306.0 100.0L299.0 100.7L292.0 100.9L285.0 100.7L278.0 100.0L271.1 99.0L264.3 97.5L257.6 95.5L251.1 93.2L244.7 90.5L238.5 87.4L232.6 83.9L226.9 80.0L221.4 75.9L216.3 71.3L211.6 66.5L207.1 61.4L203.0 56.1L199.3 50.4L196.0 44.6L193.1 38.6L190.7 32.4L188.6 26.1L187.1 19.7L185.9 13.2L185.2 6.6L185.0 0.0Z\"/>\n<path class=\"a7-cap-fasc\" d=\"M258.9 23.0a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM322.1 83.6a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM241.3 28.7a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM277.2 66.2a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM221.8 18.5a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM194.8 19.0a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM249.4 30.7a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM229.8 7.5a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM363.7 13.2a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM341.3 55.8a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM330.5 4.2a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM313.3 73.2a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM330.3 52.2a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM245.7 65.8a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM350.7 75.3a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM327.2 39.6a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM317.8 33.5a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM278.2 63.8a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM270.1 42.3a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM248.4 84.2a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM304.6 46.6a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM255.9 48.8a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM343.9 10.3a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM327.6 39.4a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM303.1 35.7a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM364.9 19.9a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM272.6 37.0a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM316.2 49.3a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM262.8 28.1a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM320.0 29.5a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM258.0 40.8a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM321.6 52.4a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM200.9 21.6a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM352.1 18.6a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM219.1 12.4a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM254.9 19.6a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM295.7 81.7a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM243.1 10.3a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM360.0 18.2a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM328.4 40.7a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM316.9 39.8a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM299.3 48.9a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM260.0 24.7a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM230.9 13.6a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM220.2 18.8a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM330.5 51.9a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM324.3 62.9a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM252.0 85.8a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM222.3 45.9a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM258.6 65.0a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM233.4 8.1a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM199.0 36.6a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM367.0 53.7a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM251.1 22.9a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM227.0 31.5a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM244.9 52.8a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM293.8 77.1a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM275.7 34.3a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM268.7 38.9a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM345.8 9.5a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM222.4 18.6a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM282.5 35.4a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM367.5 12.3a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM247.5 58.5a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM269.3 56.0a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM234.7 37.6a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM369.1 55.8a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM360.8 49.7a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM367.1 14.9a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0ZM345.8 68.4a1.1 0.9 0 1 0 2.2 0a1.1 0.9 0 1 0 -2.2 0Z\"/>\n<g class=\"a7-cap-mus\"><ellipse cx=\"354.2\" cy=\"23.9\" rx=\"22\" ry=\"15\" transform=\"rotate(20 354.2 23.9)\"/><ellipse cx=\"288.5\" cy=\"95.0\" rx=\"10\" ry=\"7\" transform=\"rotate(0 288.5 95.0)\"/><ellipse cx=\"240.3\" cy=\"78.6\" rx=\"7\" ry=\"5\" transform=\"rotate(30 240.3 78.6)\"/><ellipse cx=\"226.5\" cy=\"35.9\" rx=\"17\" ry=\"12\" transform=\"rotate(-25 226.5 35.9)\"/><ellipse cx=\"221.0\" cy=\"16.8\" rx=\"13\" ry=\"9\" transform=\"rotate(-10 221.0 16.8)\"/></g>\n<path class=\"a7-cap-septum\" d=\"M302.4 23.4Q326.2 60.5 338.0 89.6M267.6 20.5Q246.8 47.6 214.0 66.7\"/>\n<path class=\"a7-cap-bone\" d=\"M316.0 0.0L315.9 1.8L315.8 3.6L315.4 5.4L315.0 7.1L314.5 8.9L313.8 10.5L313.0 12.2L312.1 13.8L311.1 15.3L310.0 16.8L308.8 18.2L307.5 19.5L306.1 20.7L304.7 21.9L303.1 22.9L301.5 23.9L299.8 24.7L298.1 25.5L296.3 26.1L294.5 26.6L292.7 27.0L290.8 27.3L288.9 27.5L287.0 27.5L285.1 27.5L283.2 27.3L281.3 27.0L279.5 26.6L277.7 26.1L275.9 25.5L274.2 24.7L272.5 23.9L270.9 22.9L269.3 21.9L267.9 20.7L266.5 19.5L265.2 18.2L264.0 16.8L262.9 15.3L261.9 13.8L261.0 12.2L260.2 10.5L259.5 8.9L259.0 7.1L258.6 5.4L258.2 3.6L258.1 1.8L258.0 0.0Z\"/>\n<path class=\"a7-cap-marrow\" d=\"M308.0 0.0L308.0 1.3L307.8 2.6L307.6 3.9L307.3 5.2L306.9 6.4L306.4 7.6L305.8 8.8L305.2 10.0L304.5 11.1L303.7 12.1L302.8 13.2L301.8 14.1L300.8 15.0L299.8 15.8L298.7 16.6L297.5 17.3L296.3 17.9L295.0 18.4L293.8 18.9L292.4 19.3L291.1 19.6L289.7 19.8L288.4 19.9L287.0 19.9L285.6 19.9L284.3 19.8L282.9 19.6L281.6 19.3L280.2 18.9L279.0 18.4L277.7 17.9L276.5 17.3L275.3 16.6L274.2 15.8L273.2 15.0L272.2 14.1L271.2 13.2L270.3 12.1L269.5 11.1L268.8 10.0L268.2 8.8L267.6 7.6L267.1 6.4L266.7 5.2L266.4 3.9L266.2 2.6L266.0 1.3L266.0 0.0Z\"/>\n<g class=\"a7-cap-art\"><ellipse cx=\"306.8\" cy=\"56.2\" rx=\"4.6\" ry=\"4.2\" transform=\"rotate(0 306.8 56.2)\"/></g><g class=\"a7-cap-vein\"><ellipse cx=\"297.8\" cy=\"58.2\" rx=\"5.6\" ry=\"4.6\" transform=\"rotate(0 297.8 58.2)\"/><ellipse cx=\"265.4\" cy=\"101.2\" rx=\"3.4\" ry=\"3\" transform=\"rotate(0 265.4 101.2)\"/></g>\n<g class=\"a7-cap-nerve\"><ellipse cx=\"253.5\" cy=\"14.8\" rx=\"6\" ry=\"4.4\" transform=\"rotate(0 253.5 14.8)\"/></g>\n<path class=\"a7-cap-light\" d=\"M414.0 0.0L413.7 7.6L413.0 15.1L411.7 22.6L409.8 30.0L407.5 37.3L404.7 44.4L401.4 51.3L397.7 57.9L393.4 64.4L388.8 70.6L383.7 76.4L378.3 82.0L372.4 87.1L366.3 91.9L359.8 96.4L353.0 100.4L346.0 103.9L338.7 107.1L331.2 109.7L323.6 112.0L315.8 113.7L307.9 114.9L300.0 115.7L292.0 115.9L284.0 115.7L276.1 114.9L268.2 113.7L260.4 112.0L252.8 109.7L245.3 107.1L238.0 103.9L231.0 100.4L224.2 96.4L217.7 91.9L211.6 87.1L205.7 82.0L200.3 76.4L195.2 70.6L190.6 64.4L186.3 57.9L182.6 51.3L179.3 44.4L176.5 37.3L174.2 30.0L172.3 22.6L171.0 15.1L170.3 7.6L170.0 0.0Z\"/>\n<path class=\"a7-cap-edge\" d=\"M414.0 0.0L413.7 7.6L413.0 15.1L411.7 22.6L409.8 30.0L407.5 37.3L404.7 44.4L401.4 51.3L397.7 57.9L393.4 64.4L388.8 70.6L383.7 76.4L378.3 82.0L372.4 87.1L366.3 91.9L359.8 96.4L353.0 100.4L346.0 103.9L338.7 107.1L331.2 109.7L323.6 112.0L315.8 113.7L307.9 114.9L300.0 115.7L292.0 115.9L284.0 115.7L276.1 114.9L268.2 113.7L260.4 112.0L252.8 109.7L245.3 107.1L238.0 103.9L231.0 100.4L224.2 96.4L217.7 91.9L211.6 87.1L205.7 82.0L200.3 76.4L195.2 70.6L190.6 64.4L186.3 57.9L182.6 51.3L179.3 44.4L176.5 37.3L174.2 30.0L172.3 22.6L171.0 15.1L170.3 7.6L170.0 0.0Z\"/>\n</g>\n<g class=\"a7-slab\" transform=\"matrix(0.9820 0.2124 0.0000 1.0160 75.94 15.26)\"><g clip-path=\"url(#a7-cutclip)\">\n<defs><clipPath id=\"a7-cutclip\"><rect x=\"-300\" y=\"-14\" width=\"1200\" height=\"1200\"/></clipPath><clipPath id=\"a7-hamclip\"><path d=\"M184.0 -34.0C195.0 -58.0 241.3 -64.7 252.0 -34.0C262.7 -3.3 251.3 105.7 248.0 150.0C244.7 194.3 239.3 221.3 232.0 232.0C224.7 242.7 211.7 234.3 204.0 214.0C196.3 193.7 189.3 151.3 186.0 110.0C182.7 68.7 173.0 -10.0 184.0 -34.0Z\"/></clipPath><clipPath id=\"a7-quadclip\"><path d=\"M322.0 -34.0C332.3 -49.7 379.3 -54.7 392.0 -34.0C404.7 -13.3 399.3 55.0 398.0 90.0C396.7 125.0 390.3 155.7 384.0 176.0C377.7 196.3 367.3 216.3 360.0 212.0C352.7 207.7 345.0 175.3 340.0 150.0C335.0 124.7 333.0 90.7 330.0 60.0C327.0 29.3 311.7 -18.3 322.0 -34.0Z\"/></clipPath>\n</defs>\n<path class=\"a7-skin\" data-part=\"skin\"/>\n<path class=\"a7-ham\" d=\"M184.0 -34.0C195.0 -58.0 241.3 -64.7 252.0 -34.0C262.7 -3.3 251.3 105.7 248.0 150.0C244.7 194.3 239.3 221.3 232.0 232.0C224.7 242.7 211.7 234.3 204.0 214.0C196.3 193.7 189.3 151.3 186.0 110.0C182.7 68.7 173.0 -10.0 184.0 -34.0Z\"/><path class=\"a7-fasc\" clip-path=\"url(#a7-hamclip)\" d=\"M186.0 -14.0Q196.0 104.0 206.0 222.0M193.3 -14.0Q199.4 104.2 209.6 222.4M200.7 -14.0Q203.0 104.4 213.1 222.9M208.0 -14.0Q207.1 104.7 216.7 223.3M215.3 -14.0Q211.9 104.9 220.2 223.8M222.7 -14.0Q217.3 105.1 223.8 224.2M230.0 -14.0Q223.5 105.3 227.3 224.7M237.3 -14.0Q230.3 105.6 230.9 225.1M244.7 -14.0Q237.5 105.8 234.4 225.6M252.0 -14.0Q245.0 106.0 238.0 226.0\"/>\n<path class=\"a7-quad\" d=\"M322.0 -34.0C332.3 -49.7 379.3 -54.7 392.0 -34.0C404.7 -13.3 399.3 55.0 398.0 90.0C396.7 125.0 390.3 155.7 384.0 176.0C377.7 196.3 367.3 216.3 360.0 212.0C352.7 207.7 345.0 175.3 340.0 150.0C335.0 124.7 333.0 90.7 330.0 60.0C327.0 29.3 311.7 -18.3 322.0 -34.0Z\"/><path class=\"a7-fasc\" clip-path=\"url(#a7-quadclip)\" d=\"M326.0 -14.0Q332.0 93.0 338.0 200.0M333.6 -14.0Q340.4 92.8 341.8 199.6M341.1 -14.0Q348.5 92.6 345.6 199.1M348.7 -14.0Q355.9 92.3 349.3 198.7M356.2 -14.0Q362.5 92.1 353.1 198.2M363.8 -14.0Q368.2 91.9 356.9 197.8M371.3 -14.0Q372.9 91.7 360.7 197.3M378.9 -14.0Q376.8 91.4 364.4 196.9M386.4 -14.0Q380.1 91.2 368.2 196.4M394.0 -14.0Q383.0 91.0 372.0 196.0\"/>\n<path class=\"a7-gastro\" data-part=\"gastro\"/>\n<path class=\"a7-hamt\" data-part=\"hamt\"/>\n<g data-part=\"tibia\">\n  <clipPath id=\"a7-calfclip\"><path d=\"M-44.0 96.0C-50.3 91.0 -75.7 140.3 -84.0 160.0C-92.3 179.7 -94.7 198.7 -94.0 214.0C-93.3 229.3 -89.3 245.7 -80.0 252.0C-70.7 258.3 -43.7 262.3 -38.0 252.0C-32.3 241.7 -45.0 216.0 -46.0 190.0C-47.0 164.0 -37.7 101.0 -44.0 96.0Z\"/></clipPath>\n  <path class=\"a7-calf\" d=\"M-44.0 96.0C-50.3 91.0 -75.7 140.3 -84.0 160.0C-92.3 179.7 -94.7 198.7 -94.0 214.0C-93.3 229.3 -89.3 245.7 -80.0 252.0C-70.7 258.3 -43.7 262.3 -38.0 252.0C-32.3 241.7 -45.0 216.0 -46.0 190.0C-47.0 164.0 -37.7 101.0 -44.0 96.0Z\"/><path class=\"a7-fasc\" clip-path=\"url(#a7-calfclip)\" d=\"M-50.0 92.0Q-68.0 173.0 -86.0 254.0M-48.6 93.1Q-68.3 173.6 -79.4 254.0M-47.1 94.3Q-67.8 174.1 -72.9 254.0M-45.7 95.4Q-65.7 174.7 -66.3 254.0M-44.3 96.6Q-61.7 175.3 -59.7 254.0M-42.9 97.7Q-55.8 175.9 -53.1 254.0M-41.4 98.9Q-48.3 176.4 -46.6 254.0M-40.0 100.0Q-40.0 177.0 -40.0 254.0\"/>\n  <path class=\"a7-bone\" d=\"M-58.0 70.0C-53.7 67.2 -37.7 67.5 -30.0 67.0C-22.3 66.5 -8.0 66.0 0.0 66.0C8.0 66.0 22.5 66.5 30.0 67.0C37.5 67.5 51.7 68.3 56.0 70.0C60.3 71.7 62.3 75.7 62.0 80.0C61.7 84.3 54.0 96.9 54.0 102.0C54.0 107.1 62.5 112.9 62.0 118.0C61.5 123.1 52.9 129.1 50.0 140.0C47.1 150.9 41.9 185.1 40.0 200.0C38.1 214.9 46.1 245.1 36.0 252.0C25.9 258.9 -25.6 258.9 -36.0 252.0C-46.4 245.1 -39.9 216.8 -42.0 200.0C-44.1 183.2 -49.3 140.9 -52.0 126.0C-54.7 111.1 -61.2 95.5 -62.0 88.0C-62.8 80.5 -62.3 72.8 -58.0 70.0Z\" fill=\"url(#a7-boneg)\"/>\n  <path class=\"a7-canal\" d=\"M-22.0 249.0C-14.7 255.6 14.9 255.6 22.0 249.0C29.1 242.4 25.8 216.6 25.0 205.0C24.3 193.4 20.8 178.4 17.0 172.0C13.3 165.6 5.1 162.0 0.0 162.0C-5.1 162.0 -12.9 165.6 -17.0 172.0C-21.1 178.4 -26.3 193.4 -27.0 205.0C-27.8 216.6 -29.4 242.4 -22.0 249.0Z\"/>\n  <path class=\"a7-hatch\" d=\"M11.5 118.1l-2.9 14.4M-38.9 166.9l-14.9 2.0M-6.5 96.2l15.3 1.1M13.8 132.4l-14.7 12.6M-12.6 126.7l8.0 5.2M-28.4 173.9l3.4 12.6M12.6 120.3l-3.0 11.3M-18.8 126.6l11.1 4.2M-40.2 87.7l-2.5 13.0M-32.4 157.8l18.9 4.5M7.8 98.3l2.3 10.6M39.1 118.1l9.6 0.3M-43.8 136.4l-0.3 17.1M-9.4 187.5l-9.5 6.9M-36.8 111.7l-8.4 10.0M-1.7 149.2l-10.0 3.1M37.0 125.8l5.1 10.8M-16.1 120.8l-11.0 0.1M14.1 144.0l-4.3 12.2M-6.2 188.8l-6.6 8.5M-41.6 129.7l-15.9 2.4M31.1 149.9l-7.0 7.8M-31.7 134.3l10.5 4.4M18.0 152.4l-7.1 12.7M2.5 154.9l-16.7 6.0M23.4 101.2l17.5 6.0M42.7 95.6l4.8 11.5M21.1 103.5l-9.8 12.9M14.4 102.2l-9.3 1.2M40.4 167.4l6.9 9.6M-28.8 101.7l14.3 5.3M11.1 96.1l-8.6 15.4M36.5 191.4l6.0 6.9M-36.1 137.1l4.8 14.9M-41.5 153.3l-15.7 0.5M-3.0 176.2l6.8 7.2M41.2 121.5l6.6 8.7M-30.0 165.1l-11.2 10.9M15.3 150.2l-6.3 7.2M30.3 175.6l-11.1 1.8M19.2 129.3l-8.9 12.2M-43.1 142.8l10.6 9.2M-28.7 171.1l-6.0 15.0M-43.0 155.4l5.6 11.0M-22.7 138.3l7.4 9.9M7.2 86.3l9.2 2.8M-32.1 93.4l-5.4 11.0M-11.0 90.5l11.0 14.8M-29.8 93.4l5.4 13.8M-9.9 184.9l-11.0 4.2M7.9 107.0l-11.4 5.4M-15.4 116.5l11.4 3.2M-6.4 115.5l0.1 17.0M-1.4 166.5l-9.5 1.6M17.2 129.1l10.5 16.1M35.1 167.0l-1.1 17.5M40.2 171.3l-3.9 15.5M-10.9 103.8l-5.6 13.7M-42.2 83.1l-0.3 14.7M-26.4 184.8l4.6 14.4\"/>\n  <path class=\"a7-cart\" d=\"M-54 69Q0 63 52 69\"/>\n  <path class=\"a7-men\" d=\"M56 72L30 68L56 58Z\"/><path class=\"a7-men\" d=\"M-60 72L-34 68L-60 56Z\"/>\n  <path class=\"a7-cutcap\" d=\"M36 252Q0 258 -36 252\"/>\n</g>\n<path class=\"a7-bone\" d=\"M258.0 -34.0C265.5 -49.6 308.5 -49.6 316.0 -34.0C323.5 -18.4 319.4 73.2 322.0 100.0C324.6 126.8 335.8 181.2 338.0 196.0C340.2 210.8 340.0 222.6 341.1 227.0C342.3 231.3 346.2 231.6 347.6 233.2C349.0 234.7 351.9 238.5 353.1 240.2C354.2 241.9 356.6 246.1 357.5 247.9C358.4 249.8 360.2 254.2 360.9 256.2C361.5 258.2 362.7 262.8 363.0 264.9C363.4 266.9 363.9 271.7 364.0 273.8C364.0 275.8 363.9 280.6 363.6 282.7C363.4 284.8 362.6 289.5 362.1 291.5C361.6 293.5 360.1 298.0 359.3 300.0C358.6 301.9 356.5 306.2 355.4 308.0C354.4 309.8 351.7 313.8 350.4 315.4C349.2 317.0 346.0 320.6 344.5 322.0C343.0 323.5 339.3 326.6 337.6 327.8C335.9 329.0 331.9 331.5 330.0 332.5C328.2 333.5 323.8 335.4 321.9 336.1C319.9 336.9 315.3 338.2 313.3 338.6C311.3 339.0 306.5 339.7 304.5 339.8C302.4 340.0 297.6 340.0 295.5 339.8C293.5 339.7 288.7 339.0 286.7 338.6C284.7 338.2 280.1 336.9 278.1 336.1C276.2 335.4 271.8 333.5 270.0 332.5C268.1 331.5 264.1 329.0 262.4 327.8C260.7 326.6 257.0 323.5 255.5 322.0C254.0 320.6 250.8 317.0 249.6 315.4C248.3 313.8 245.6 309.8 244.6 308.0C243.5 306.2 241.4 301.9 240.7 300.0C239.9 298.0 238.4 293.5 237.9 291.5C237.4 289.5 236.6 284.8 236.4 282.7C236.1 280.6 236.0 275.8 236.0 273.8C236.1 271.7 236.6 266.9 237.0 264.9C237.3 262.8 238.3 261.5 239.1 256.2C240.0 251.0 242.5 238.2 244.0 220.0C245.5 201.8 250.4 129.6 252.0 100.0C253.6 70.4 250.5 -18.4 258.0 -34.0Z\" fill=\"url(#a7-boneg)\"/>\n<path class=\"a7-canal\" d=\"M268.0 -40.0C274.3 -56.5 299.7 -56.5 306.0 -40.0C312.3 -23.5 310.8 44.8 310.0 70.0C309.3 95.2 304.4 117.2 301.0 128.0C297.6 138.8 291.2 142.0 287.0 142.0C282.8 142.0 276.4 138.8 273.0 128.0C269.6 117.2 264.8 95.2 264.0 70.0C263.3 44.8 261.7 -23.5 268.0 -40.0Z\"/>\n<path class=\"a7-hatch\" d=\"M256.0 284.8l-13.1 3.7M292.0 196.5l7.5 16.6M312.0 150.2l10.0 4.0M263.8 130.5l-2.3 14.2M293.1 172.4l19.8 7.8M264.6 304.1l21.1 5.4M299.1 183.4l-10.8 18.7M261.1 193.6l3.5 10.7M304.9 201.5l7.5 14.4M283.7 307.8l-11.7 12.5M269.1 223.9l-20.0 2.7M327.5 150.5l9.7 15.0M328.7 254.6l15.3 13.3M327.6 314.7l5.0 19.3M264.7 136.1l7.7 17.4M274.8 249.9l-13.0 1.1M305.0 191.8l-11.1 13.6M294.8 156.4l-0.8 11.7M258.8 225.1l6.5 14.2M279.1 216.0l13.5 3.7M256.5 250.8l2.7 21.4M270.3 178.8l4.7 9.3M334.7 276.0l-15.1 14.0M270.4 298.1l14.8 7.1M332.0 206.7l-8.7 5.9M302.5 238.2l6.2 10.4M292.6 239.8l14.2 16.1M295.9 216.6l-11.1 14.7M262.6 288.0l14.0 5.6M306.7 162.3l-12.7 14.7M307.1 313.0l9.8 2.7M318.4 241.1l17.4 12.6M275.7 169.6l-13.5 16.0M284.8 274.2l10.7 7.2M295.4 182.9l16.2 1.4M265.1 264.3l12.5 5.3M297.3 292.3l13.7 5.1M280.9 161.7l2.8 20.3M308.4 280.7l8.9 9.4M310.0 298.4l13.4 1.2M271.0 285.1l12.7 16.4M321.8 158.2l4.6 10.5M294.2 300.8l-14.9 10.5M309.8 263.7l16.8 3.3M283.1 304.5l-7.7 9.8M266.9 152.2l1.3 10.1M327.8 176.0l-8.7 11.4M276.3 313.3l-9.0 15.7M288.9 264.8l-14.4 3.7M303.2 196.4l-14.4 15.3M334.4 199.2l-7.1 16.7M310.9 204.1l-5.6 20.3M336.0 131.3l-9.8 11.4M316.9 160.9l15.1 11.6M273.7 223.0l-0.5 16.6M311.6 172.7l4.1 20.3M311.1 164.1l8.1 17.6M319.0 240.7l18.5 6.7M318.0 137.0l18.0 3.4M276.0 307.6l18.6 9.9M301.1 272.9l-2.7 14.5M303.2 155.5l-15.4 1.2M278.7 296.1l10.3 0.6M290.2 147.6l7.9 8.2M319.4 269.9l-12.9 1.9M300.7 136.2l-10.0 10.5M268.5 178.9l9.9 7.3M284.1 182.4l-5.5 14.8M280.5 283.4l12.5 2.9M298.3 269.1l8.6 8.7\"/>\n<path class=\"a7-cart\" d=\"M339.2 229.3C339.7 229.7 341.4 231.1 342.4 232.1C343.4 233.1 344.4 234.1 345.3 235.2C346.3 236.2 347.2 237.3 348.1 238.4C348.9 239.6 349.8 240.7 350.6 241.9C351.4 243.1 352.1 244.3 352.8 245.5C353.5 246.7 354.2 248.0 354.8 249.3C355.4 250.5 356.0 251.8 356.6 253.1C357.1 254.5 357.6 255.8 358.0 257.1C358.5 258.5 358.8 259.9 359.2 261.2C359.5 262.6 359.8 264.0 360.1 265.4C360.3 266.8 360.5 268.2 360.7 269.6C360.8 271.0 360.9 272.5 361.0 273.9C361.0 275.3 361.0 276.7 361.0 278.1C360.9 279.5 360.8 281.0 360.7 282.4C360.5 283.8 360.3 285.2 360.1 286.6C359.8 288.0 359.5 289.4 359.2 290.8C358.8 292.1 358.5 293.5 358.0 294.9C357.6 296.2 357.1 297.5 356.6 298.9C356.0 300.2 355.4 301.5 354.8 302.7C354.2 304.0 353.5 305.3 352.8 306.5C352.1 307.7 351.4 308.9 350.6 310.1C349.8 311.3 348.9 312.4 348.1 313.6C347.2 314.7 346.3 315.8 345.3 316.8C344.4 317.9 343.4 318.9 342.4 319.9C341.4 320.9 340.3 321.8 339.2 322.7C338.1 323.6 337.0 324.5 335.9 325.4C334.7 326.2 333.5 327.0 332.3 327.7C331.1 328.5 329.9 329.2 328.6 329.9C327.4 330.5 326.1 331.1 324.8 331.7C323.5 332.3 322.2 332.8 320.9 333.3C319.5 333.8 318.2 334.2 316.8 334.6C315.5 335.0 314.1 335.4 312.7 335.7C311.3 336.0 309.9 336.2 308.5 336.4C307.1 336.6 305.7 336.8 304.3 336.9C302.8 337.0 301.4 337.0 300.0 337.0C298.6 337.0 297.2 337.0 295.7 336.9C294.3 336.8 292.9 336.6 291.5 336.4C290.1 336.2 288.7 336.0 287.3 335.7C285.9 335.4 284.5 335.0 283.2 334.6C281.8 334.2 280.5 333.8 279.1 333.3C277.8 332.8 276.5 332.3 275.2 331.7C273.9 331.1 272.6 330.5 271.4 329.9C270.1 329.2 268.9 328.5 267.7 327.7C266.5 327.0 265.3 326.2 264.1 325.4C263.0 324.5 261.9 323.6 260.8 322.7C259.7 321.8 258.6 320.9 257.6 319.9C256.6 318.9 255.6 317.9 254.7 316.8C253.7 315.8 252.8 314.7 251.9 313.6C251.1 312.4 250.2 311.3 249.4 310.1C248.6 308.9 247.9 307.7 247.2 306.5C246.5 305.3 245.8 304.0 245.2 302.7C244.6 301.5 244.0 300.2 243.4 298.9C242.9 297.5 242.4 296.2 242.0 294.9C241.5 293.5 241.2 292.1 240.8 290.8C240.5 289.4 240.2 288.0 239.9 286.6C239.7 285.2 239.5 283.8 239.3 282.4C239.2 281.0 239.1 279.5 239.0 278.1C239.0 276.7 239.0 275.3 239.0 273.9C239.1 272.5 239.2 271.0 239.3 269.6C239.5 268.2 239.7 266.8 239.9 265.4C240.2 264.0 240.5 262.6 240.8 261.2C241.2 259.9 241.8 257.8 242.0 257.1\"/>\n<path class=\"a7-lig\" data-part=\"acl\"/><path class=\"a7-lig\" data-part=\"pcl\"/>\n<path class=\"a7-fat\" data-part=\"fatpad\"/>\n<path class=\"a7-pfglow\" data-part=\"pfglow\"/>\n<path class=\"a7-tendon\" data-part=\"qtendon\"/><path class=\"a7-tendon\" data-part=\"ptendon\"/>\n<path class=\"a7-fibres\" data-part=\"tfibres\"/>\n<g data-part=\"patella\"><ellipse class=\"a7-pat-cart\" cx=\"-5\" cy=\"0\" rx=\"12\" ry=\"27\"/><ellipse class=\"a7-pat\" cx=\"5\" cy=\"0\" rx=\"15\" ry=\"31\" fill=\"url(#a7-boneg)\"/><path class=\"a7-hatch\" d=\"M-2 -18l10 8M0 -2l12 -6M-2 12l11 6M4 -24l6 14M2 4l9 12\"/></g>\n<circle data-part=\"glow\" class=\"a7-glow\" r=\"44\" fill=\"url(#a7-glowg)\" opacity=\"0\"/>\n</g></g>\n<g class=\"a7-mon\">\n<rect class=\"a7-mon-bg\" x=\"24\" y=\"636\" width=\"552\" height=\"170\" rx=\"12\"/>\n<text class=\"a7-mon-title\" x=\"46\" y=\"666\">Kneecap force, one stride</text>\n<rect class=\"a7-stance\" x=\"88.0\" y=\"676\" width=\"181.0\" height=\"96\"/>\n<path class=\"a7-grid\" d=\"M88 697.0H552\"/>\n<text class=\"a7-tick\" x=\"80\" y=\"703.0\" text-anchor=\"end\">usual</text>\n<path class=\"a7-axis\" d=\"M88 772H552\"/>\n<text class=\"a7-tick\" x=\"88.0\" y=\"796\">foot down</text>\n<text class=\"a7-tick\" x=\"269.0\" y=\"796\" text-anchor=\"middle\">push off</text>\n<text class=\"a7-tick\" x=\"552.0\" y=\"796\" text-anchor=\"end\">next step</text>\n<path class=\"a7-ghost\" data-part=\"ghost\"/><path class=\"a7-curve\" data-part=\"curve\"/>\n<path class=\"a7-cursor\" data-part=\"cursor\" d=\"M0 676V772\"/><circle class=\"a7-mdot\" data-part=\"mdot\" r=\"5.5\"/>\n</g>\n</svg></div><p class=\"a7-scene\" data-scene>Your usual step rate at this pace.</p><span class=\"a7-sr\" role=\"status\" aria-live=\"polite\" data-status></span><div class=\"opt-controls\"><div class=\"opt-seg\" role=\"radiogroup\" aria-label=\"Step rate\" data-control=\"rate\"><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"-10\" aria-checked=\"false\" tabindex=\"-1\">−10%</button><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"0\" aria-checked=\"true\" tabindex=\"0\">Usual</button><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"5\" aria-checked=\"false\" tabindex=\"-1\">+5%</button><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"10\" aria-checked=\"false\" tabindex=\"-1\">+10%</button></div></div><div class=\"opt-foot\"><span class=\"opt-hint\">Pick a step rate · shown 4× slower</span><dl class=\"opt-readout\" data-readout aria-hidden=\"true\"><div class=\"opt-stat\" data-stat=\"cad\"><dt>Step rate</dt><dd data-r=\"cad\">165/min</dd></div><div class=\"opt-stat\" data-stat=\"step\"><dt>Step length</dt><dd data-r=\"step\">1.01 m</dd></div><div class=\"opt-stat\" data-stat=\"pf\"><dt>Kneecap force</dt><dd data-r=\"pf\">100%</dd></div></dl></div></div><figcaption class=\"iso-legend\"><span class=\"iso-keys\"><span class=\"iso-key\"><svg class=\"iso-swatch\" data-mark=\"cart\" viewBox=\"0 0 16 10\" aria-hidden=\"true\"><path d=\"M1.5 5h13\"/></svg>Cartilage</span><span class=\"iso-key\"><svg class=\"iso-swatch\" data-mark=\"heat\" viewBox=\"0 0 16 10\" aria-hidden=\"true\"><path d=\"M1.5 5h13\"/></svg>Force under the kneecap</span><span class=\"iso-key\"><svg class=\"iso-swatch\" data-mark=\"tendon\" viewBox=\"0 0 16 10\" aria-hidden=\"true\"><path d=\"M1.5 5h13\"/></svg>Quadriceps and patellar tendons</span></span><span class=\"iso-caption\"><span class=\"a7-par\">Each time a running foot lands, the knee bends and the thigh muscles brake it. They pull the kneecap hard into its groove at the front of the thigh bone, where thick cartilage takes the force. The deeper the bend, the harder the press.</span><span class=\"a7-par\">At the same pace, taking more, shorter steps lands the foot closer under the body and bends the knee less. In a lab study of healthy recreational runners, a 10 % higher step rate cut the peak force behind the kneecap by about 14 % on average. That's why the Creator 600 reports cadence and knee angle (Fig 4).</span><span class=\"a7-par\"><small>Group averages from healthy runners on a lab treadmill, not a prediction for any one runner and not a treatment for knee pain. Knee angles are drawn from typical values and never printed. Shown four times slower than life.</small></span></span></figcaption></figure>" + "</div>";
    mount(root.querySelector(".opt-figure"));
  }
}
customElements.define("optimal-fig-knee", Fig);
})();
