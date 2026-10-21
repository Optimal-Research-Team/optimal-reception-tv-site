/* optimal-fig-muscle-water: Optimal Health explainer figure. Built with Anatomy (MIT). Generated; do not edit. */
(() => {
if (customElements.get("optimal-fig-muscle-water")) return;
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

// A8 model: water inside and between muscle fibres, and the ECW/TBW ratio InBody reports.
// A teaching model: the body's water is split into skeletal muscle and everything else, and a
// scene changes only the muscle (fibre size, or fluid between the fibres). Keys refer to
// reference/truth-pack.md §2 and "A8".
const WATER = {
  body: 0.38, //        typical whole-body ECW/TBW on InBody [17]
  muscleShare: 0.5, //  share of body water held in skeletal muscle (≈ 40 % of mass × ≈ 75 % water ÷ 60 % body water; LOW)
  muscleEcw: 0.16, //   ECW share of muscle water (extracellular space ≈ 10–15 % of muscle volume; LOW)
  bands: [[0.39, "Normal"], [0.4, "Slightly over"], [Infinity, "Over"]], // InBody tiers [18]
  scenes: [
    // fibre: fibre diameter (×); spread: how far apart fibres sit (×); gap: fluid between fibres (×)
    { key: "typical", label: "Typical", fibre: 1, spread: 1, gap: 1 },
    { key: "bigger", label: "Bigger", fibre: 1.04, spread: 1.04, gap: 1 },
    { key: "smaller", label: "Smaller", fibre: 0.93, spread: 0.93, gap: 1 },
    { key: "fluid", label: "Extra fluid", fibre: 1, spread: 1.07, gap: 1.7 },
  ],
};
/** Body ECW/TBW for a scene. Fibre water scales with fibre area; gap water with gap × perimeter. */
function ratioOf(sc) {
  const rest = (1 - WATER.muscleShare) / WATER.muscleShare; // rest-of-body water, in muscle-water units
  const restE = WATER.body * (1 + rest) - WATER.muscleEcw; // its ECW, chosen so "typical" is 0.380
  const E = WATER.muscleEcw * sc.gap * sc.fibre;
  const I = (1 - WATER.muscleEcw) * sc.fibre ** 2;
  return (E + restE) / (E + I + rest);
}
const bandOf = (r) => WATER.bands.find(([lim]) => r < lim)[1];

// A8 live code: the fibres ease between scenes (size, spacing, fluid between them), and the
// current twinkles as ⊙ marks: in the gaps always, inside the fibres in the share Fig 2's model
// gives for the chosen frequency.
const DATA = {"body":{"o":[139.99,331.63],"ex":[0.67745,0.14651],"ey":[-0.36021,0.27554],"ez":[0,-0.70092],"H":520,"D":240,"ta":3.8135,"tb":6.9435,"spans":[{"a0":5.654,"a1":5.8039,"type":1},{"a0":3.0219,"a1":3.4854,"type":2},{"a0":2.2983,"a1":2.6161,"type":1},{"a0":0.7856,"a1":1.0762,"type":1},{"a0":3.4907,"a1":3.871,"type":2},{"a0":1.0762,"a1":1.3352,"type":2},{"a0":2.618,"a1":3.0219,"type":2},{"a0":0.3323,"a1":0.7811,"type":1},{"a0":4.8007,"a1":5.0606,"type":1},{"a0":4.2178,"a1":4.5285,"type":1},{"a0":-0.0489,"a1":0.3323,"type":2},{"a0":1.6579,"a1":1.6888,"type":2},{"a0":4.5379,"a1":4.8007,"type":2},{"a0":3.871,"a1":4.2178,"type":2},{"a0":5.3245,"a1":5.654,"type":2},{"a0":1.3352,"a1":1.6558,"type":2},{"a0":5.0614,"a1":5.3245,"type":2},{"a0":1.6888,"a1":1.9999,"type":1},{"a0":2.0072,"a1":2.2983,"type":2},{"a0":5.8039,"a1":6.2343,"type":2}]},"C":[300,248],"RX":238,"RY":176,"cells":[{"c":[473.1,181.4],"poly":[[444.2,206.5],[442.3,169.9],[492.3,144.5],[495,147.1],[506.1,160],[511,166.9],[469.9,222]]},{"c":[415,187.1],"poly":[[384.8,178.5],[413,148.4],[442.3,169.9],[444.2,206.5],[404.6,221.6],[390.1,209.7]]},{"c":[87.1,231.7],"poly":[[63.9,269],[62.9,263.3],[62,248],[62.9,232.7],[65.6,217.4],[70.1,202.4],[76,188.7],[113.7,208.6],[111.1,259.5]]},{"c":[135.3,340],"poly":[[141.9,379.3],[131.7,372.5],[117.7,361.1],[105,348.9],[94.1,336.3],[132.6,305.4],[162.8,317.7],[168.4,346]]},{"c":[311.3,186.9],"poly":[[339.2,168.8],[330.2,220.4],[283.2,202.9],[288.7,163.9],[298.9,156.4]]},{"c":[425.7,360.2],"poly":[[468.3,372.5],[453,382.8],[436.5,392.2],[419,400.4],[412.9,402.8],[385.3,340.9],[412.6,323],[448.8,333.8]]},{"c":[384.1,301.4],"poly":[[412.8,272.8],[412.6,323],[385.3,340.9],[368.6,338.7],[348.7,304.5],[363.3,271.5],[402.5,263.4]]},{"c":[215,155],"poly":[[182.3,158.4],[199.8,122.5],[240.6,133.7],[246.2,151.2],[225.5,188.1],[214.6,192]]},{"c":[137.1,234.1],"poly":[[111.1,259.5],[113.7,208.6],[142.4,199.4],[166.9,221.3],[164.1,252.2],[126.3,269.1]]},{"c":[117.7,173.8],"poly":[[76.4,187.8],[84.3,173.6],[93.9,160],[105,147.1],[117.7,134.9],[122.7,130.8],[152.7,163.7],[142.4,199.4],[113.7,208.6]]},{"c":[373.9,380.7],"poly":[[412.9,402.8],[400.6,407.5],[381.4,413.4],[361.6,418],[355.5,419],[339.5,366.5],[368.6,338.7],[385.3,340.9]]},{"c":[275.5,286.3],"poly":[[298.9,265.3],[306.5,302],[287.4,323.3],[246.2,301.1],[250.8,256.8],[261.2,251]]},{"c":[192.1,239.5],"poly":[[223.3,249],[190.1,272],[164.1,252.2],[166.9,221.3],[206.8,207.7]]},{"c":[99.4,292.7],"poly":[[93.9,336],[84.3,322.4],[76.4,308.2],[70.1,293.6],[65.6,278.6],[63.9,269],[111.1,259.5],[126.3,269.1],[132.6,305.4]]},{"c":[483.6,327.1],"poly":[[524.9,305.4],[523.6,308.2],[515.7,322.4],[506.1,336],[495,348.9],[482.3,361.1],[469,371.9],[448.8,333.8],[477.3,291]]},{"c":[326.3,333],"poly":[[287.4,323.3],[306.5,302],[348.7,304.5],[368.6,338.7],[339.5,366.5],[312.5,364],[287.6,337.8]]},{"c":[348.2,97.4],"poly":[[321,72.7],[341.3,74.7],[361.6,78],[381.2,82.6],[370.1,118.6],[354.7,126.5],[318.8,108.2]]},{"c":[159,284.8],"poly":[[126.3,269.1],[164.1,252.2],[190.1,272],[191.3,294.7],[162.8,317.7],[132.6,305.4]]},{"c":[375.4,149.7],"poly":[[411.9,148.6],[384.8,178.5],[345.8,165],[354.7,126.5],[370.1,118.6]]},{"c":[330.1,274.9],"poly":[[332.8,235.9],[363.3,271.5],[348.7,304.5],[306.5,302],[298.9,265.3]]},{"c":[227.6,103.4],"poly":[[187.1,93.2],[199.4,88.5],[218.6,82.6],[238.4,78],[256.5,75],[261.1,105.1],[240.6,133.7],[199.8,122.5]]},{"c":[503.4,266.7],"poly":[[538,248],[537.1,263.3],[534.4,278.6],[529.9,293.6],[524.9,305.4],[477.3,291],[464.4,267.7],[475.7,234.8],[537.5,239.4]]},{"c":[280.6,377.2],"poly":[[279.3,423.3],[272,422.6],[250.5,364.7],[287.6,337.8],[312.5,364]]},{"c":[250.2,333.6],"poly":[[223.8,312.7],[246.2,301.1],[287.4,323.3],[287.6,337.8],[250.5,364.7],[219.6,357.6]]},{"c":[291.2,93.4],"poly":[[258.7,74.7],[279.3,72.7],[300,72],[321,72.7],[318.8,108.2],[300.9,122],[261.1,105.1]]},{"c":[165.4,130.5],"poly":[[122.7,130.8],[131.7,123.5],[147,113.2],[163.5,103.8],[181,95.6],[187.1,93.2],[199.8,122.5],[182.3,158.4],[152.7,163.7]]},{"c":[448.8,139.2],"poly":[[436.7,104],[453,113.2],[468.3,123.5],[482.3,134.9],[492.3,144.5],[442.3,169.9],[413,148.4]]},{"c":[441.2,297.9],"poly":[[448.8,333.8],[412.6,323],[412.8,272.8],[464.4,267.7],[477.3,291]]},{"c":[358.2,195.7],"poly":[[330.2,220.4],[339.2,168.8],[345.8,165],[384.8,178.5],[390.1,209.7],[333.4,225.8]]},{"c":[260.2,180.6],"poly":[[288.7,163.9],[283.2,202.9],[269.9,211.2],[225.5,188.1],[246.2,151.2]]},{"c":[325.7,139.2],"poly":[[339.2,168.8],[298.9,156.4],[300.9,122],[318.8,108.2],[354.7,126.5],[345.8,165]]},{"c":[320.6,398.5],"poly":[[355.5,419],[341.3,421.3],[320.7,423.3],[300,424],[279.8,423.3],[312.5,364],[339.5,366.5]]},{"c":[401.8,113.1],"poly":[[381.4,82.6],[400.6,88.5],[419,95.6],[436.7,104],[411.9,148.6],[370.1,118.6]]},{"c":[272.8,135.8],"poly":[[298.9,156.4],[288.7,163.9],[246.2,151.2],[240.6,133.7],[261.1,105.1],[300.9,122]]},{"c":[176.2,189.9],"poly":[[182.3,158.4],[214.6,192],[206.8,207.7],[166.9,221.3],[142.4,199.4],[152.7,163.7]]},{"c":[222.1,280.4],"poly":[[191.3,294.7],[190.1,272],[223.3,249],[250.8,256.8],[246.2,301.1],[223.8,312.7]]},{"c":[238.4,222.4],"poly":[[214.6,192],[225.5,188.1],[269.9,211.2],[261.2,251],[250.8,256.8],[223.3,249],[206.8,207.7]]},{"c":[235.3,392.3],"poly":[[272,422.6],[258.7,421.3],[238.4,418],[218.6,413.4],[201,408],[216.2,359.7],[219.6,357.6],[250.5,364.7]]},{"c":[437.2,241.6],"poly":[[412.8,272.8],[402.5,263.4],[404.6,221.6],[444.2,206.5],[469.9,222],[475.7,234.8],[464.4,267.7]]},{"c":[195.3,328],"poly":[[168.4,346],[162.8,317.7],[191.3,294.7],[223.8,312.7],[219.6,357.6],[216.2,359.7]]},{"c":[373.1,240.1],"poly":[[333.4,225.8],[390.1,209.7],[404.6,221.6],[402.5,263.4],[363.3,271.5],[332.8,235.9]]},{"c":[295.1,233.7],"poly":[[283.2,202.9],[330.2,220.4],[333.4,225.8],[332.8,235.9],[298.9,265.3],[261.2,251],[269.9,211.2]]},{"c":[181.5,375],"poly":[[199.4,407.5],[181,400.4],[163.5,392.2],[147,382.8],[141.9,379.3],[168.4,346],[216.2,359.7]]},{"c":[506.5,211.8],"poly":[[469.9,222],[511,166.9],[515.7,173.6],[523.6,187.8],[529.9,202.4],[534.4,217.4],[537.1,232.7],[537.5,239.4],[475.7,234.8]]}],"gaps":[[443.9,201],[443.4,192],[443,183],[442.5,174],[449.8,166.1],[457.8,162],[465.8,157.9],[473.9,153.9],[481.9,149.8],[489.9,145.7],[492.7,144.9],[496.7,149],[502.5,155.9],[506.8,161],[504.8,175.2],[499.5,182.4],[494.1,189.6],[488.7,196.8],[483.3,204],[477.9,211.2],[472.5,218.4],[466,219.7],[458.3,215],[450.6,210.4],[389,174],[395.2,167.4],[401.3,160.8],[407.5,154.3],[417.4,151.6],[424.7,156.9],[431.9,162.3],[439.2,167.6],[442.6,175.4],[443.1,184.4],[443.5,193.4],[444,202.4],[438.3,208.8],[429.9,212],[421.4,215.2],[413,218.4],[404.6,221.6],[402.4,219.8],[395.5,214.1],[389.3,205],[387.8,196.1],[386.3,187.3],[63.8,268.1],[62.8,261],[62.2,252],[62.1,245.7],[62.7,236.7],[63.3,230.4],[64.9,221.5],[66.3,215.2],[68.9,206.5],[71,200.3],[74.5,192.1],[81.7,191.7],[89.6,195.9],[97.6,200.1],[105.5,204.3],[113.5,208.5],[113.3,216.2],[112.9,225.2],[112.4,234.2],[111.9,243.2],[111.5,252.2],[104,260.9],[95.2,262.7],[86.4,264.5],[77.6,266.3],[68.7,268],[140.4,378.3],[132.9,373.3],[129.6,370.8],[122.6,365.1],[115.8,359.3],[109.3,353],[103.4,347],[97.5,340.2],[99.9,331.7],[106.9,326],[113.9,320.4],[120.9,314.8],[128,309.1],[137.1,307.2],[145.5,310.6],[153.8,314],[162.1,317.4],[163.6,321.9],[165.4,330.8],[167.1,339.6],[164.4,351],[158.8,358],[153.2,365.1],[147.6,372.1],[142,379.2],[337.8,176.5],[336.3,185.4],[334.8,194.3],[333.2,203.1],[331.7,212],[323.1,217.8],[314.7,214.6],[306.3,211.5],[297.8,208.4],[289.4,205.2],[284,197.1],[285.3,188.1],[286.5,179.2],[287.8,170.3],[290.2,162.8],[297.5,157.4],[304.9,158.3],[313.5,160.9],[322.1,163.6],[330.8,166.2],[466,374],[458.5,379.1],[450.5,384.2],[442.7,388.7],[433.9,393.4],[425.7,397.2],[418.1,400.8],[408.8,393.5],[405.1,385.3],[401.4,377.1],[397.8,368.9],[394.1,360.6],[390.4,352.4],[386.8,344.2],[389.4,338.2],[396.9,333.3],[404.4,328.3],[412,323.4],[418,324.6],[426.7,327.2],[435.3,329.8],[443.9,332.3],[451.7,339.6],[455.8,347.6],[459.8,355.7],[463.9,363.7],[467.9,371.8],[412.8,280.3],[412.7,289.3],[412.7,298.3],[412.7,307.3],[412.6,316.3],[408.5,325.7],[401,330.6],[393.5,335.6],[385.9,340.5],[382.8,340.6],[373.9,339.4],[365.6,333.6],[361.1,325.8],[356.6,318],[352,310.2],[350.9,299.6],[354.5,291.3],[358.2,283.1],[361.8,274.9],[369.2,270.3],[378,268.5],[386.8,266.6],[395.6,264.8],[404,264.8],[410.7,270.9],[184.9,153],[188.9,144.9],[192.8,136.8],[196.8,128.7],[205.9,124.2],[214.6,126.6],[223.3,128.9],[232,131.3],[241.4,136.3],[244.2,144.9],[243.1,156.7],[238.7,164.6],[234.3,172.4],[229.9,180.3],[223.9,188.7],[215.4,191.7],[209.8,187],[203.5,180.5],[197.3,174],[191,167.5],[184.8,161],[111.5,251.9],[111.9,242.9],[112.4,233.9],[112.9,224.9],[113.3,215.9],[118,207.2],[126.6,204.5],[135.1,201.7],[146.1,202.7],[152.8,208.7],[159.5,214.7],[166.2,220.7],[166.5,225.9],[165.7,234.9],[164.9,243.9],[158.4,254.7],[150.2,258.4],[142,262.1],[133.8,265.8],[124,267.7],[116.4,262.9],[77.6,185.7],[82,177.8],[85.7,171.6],[90.9,164.2],[95.6,158.1],[101.4,151.2],[106.9,145.3],[113.4,139],[118.5,134.3],[127.2,135.7],[133.3,142.4],[139.3,149],[145.4,155.7],[151.5,162.3],[151.2,169.1],[148.7,177.7],[146.2,186.3],[143.7,195],[138.1,200.8],[129.5,203.5],[121,206.3],[108.1,205.5],[100.2,201.1],[92.4,196.7],[84.5,192.3],[76.7,187.9],[411.1,403.5],[402.6,406.7],[397.7,408.4],[389.1,411],[378.4,414.1],[369.7,416.1],[360.7,418.1],[353.1,411.1],[350.5,402.5],[347.9,393.9],[345.2,385.3],[342.6,376.7],[340,368.1],[343.9,362.3],[350.4,356.1],[356.9,349.9],[363.4,343.7],[371.1,339],[380,340.2],[389.4,350.2],[393.1,358.4],[396.8,366.6],[400.4,374.8],[404.1,383.1],[407.8,391.3],[411.4,399.5],[300,270.8],[301.9,279.6],[303.7,288.4],[305.5,297.2],[303.6,305.2],[297.6,311.9],[291.6,318.6],[281.2,320],[273.3,315.7],[265.4,311.4],[257.5,307.2],[249.5,302.9],[246.9,294.5],[247.8,285.5],[248.7,276.6],[249.7,267.6],[250.6,258.6],[252.4,255.9],[260.2,251.5],[266.9,253.1],[275.3,256.3],[283.7,259.5],[292.1,262.7],[218.3,252.4],[210.9,257.6],[203.5,262.7],[196.1,267.8],[186.2,269],[179,263.6],[171.9,258.1],[164.7,252.7],[164.5,247.6],[165.3,238.6],[166.1,229.6],[172.9,219.3],[181.4,216.4],[189.9,213.5],[198.4,210.5],[209.3,213.9],[212.6,222.3],[216,230.6],[219.3,239],[222.6,247.3],[92.5,334],[87.3,326.6],[83.1,320.3],[78.7,312.4],[75.5,306],[71.9,297.7],[69.4,291.4],[66.8,282.7],[65.3,277.2],[71,267.6],[79.8,265.8],[88.6,264],[97.4,262.2],[106.3,260.5],[113.4,260.9],[121,265.7],[127.2,274.5],[128.8,283.4],[130.3,292.3],[131.9,301.1],[126.8,310],[119.7,315.6],[112.7,321.2],[105.6,326.7],[98.6,332.3],[524.7,305.8],[522.4,310.3],[518,318.2],[514.3,324.4],[509.1,331.8],[504.4,337.9],[498.6,344.8],[493.1,350.7],[486.6,357],[480.3,362.7],[473.3,368.4],[466,366.2],[461.8,358.2],[457.5,350.3],[453.3,342.3],[449.1,334.4],[453.1,327.4],[458.1,319.9],[463.1,312.4],[468,304.9],[473,297.4],[484.4,293.2],[493.1,295.8],[501.7,298.4],[510.3,301],[518.9,303.6],[290.3,320.1],[296.3,313.4],[302.3,306.7],[312.8,302.4],[321.8,302.9],[330.8,303.4],[339.8,304],[351.7,309.6],[356.2,317.4],[360.7,325.2],[365.3,333],[364.2,342.9],[357.7,349.1],[351.2,355.3],[344.7,361.5],[335.4,366.1],[326.5,365.3],[317.5,364.5],[308.8,360.1],[302.6,353.5],[296.4,347],[290.2,340.5],[287.6,335.6],[287.4,326.6],[324,73],[333,73.9],[344.3,75.2],[353.2,76.6],[364.5,78.7],[373.3,80.7],[379.5,88],[376.9,96.6],[374.2,105.2],[371.6,113.8],[367.8,119.8],[359.8,123.9],[349.3,123.8],[341.3,119.7],[333.3,115.6],[325.3,111.5],[319.1,102.9],[319.7,93.9],[320.2,84.9],[320.8,75.9],[132,266.6],[140.2,262.9],[148.4,259.2],[156.6,255.5],[168,255.2],[175.2,260.6],[182.3,266.1],[189.5,271.5],[190.3,275.4],[190.8,284.4],[191.2,293.4],[187,298.1],[180,303.8],[173,309.5],[166,315.1],[158.3,315.9],[149.9,312.5],[141.6,309.1],[133.3,305.7],[131.7,300],[130.1,291.1],[128.6,282.2],[127,273.4],[407.8,153.1],[401.8,159.8],[395.7,166.4],[389.7,173.1],[378.9,176.5],[370.4,173.5],[361.9,170.6],[353.4,167.6],[347.1,159.2],[349.2,150.5],[351.2,141.7],[353.2,132.9],[357,125.3],[365,121.2],[376.4,123.1],[383.7,128.3],[391,133.6],[398.3,138.8],[405.6,144.1],[337.4,241.2],[343.2,248.1],[349.1,254.9],[354.9,261.7],[360.8,268.6],[361.1,276.4],[357.5,284.7],[353.8,292.9],[350.2,301.1],[342.4,304.1],[333.4,303.6],[324.4,303.1],[315.4,302.5],[305.4,296.5],[303.5,287.7],[301.7,278.9],[299.9,270.1],[304,260.9],[310.8,255],[317.6,249.1],[324.4,243.2],[331.2,237.3],[188.9,92.5],[197.4,89.3],[202.3,87.6],[210.9,85],[221.6,81.9],[230.3,79.9],[241.1,77.5],[250,76.1],[257.2,79.5],[258.5,88.4],[259.9,97.3],[258,109.4],[252.8,116.7],[247.5,124],[242.3,131.3],[234.5,132],[225.8,129.6],[217.1,127.3],[208.4,124.9],[197.9,118.1],[194.3,109.8],[190.7,101.6],[187.2,93.3],[537.9,250.3],[537.3,259.3],[536.7,265.6],[535.1,274.5],[533.7,280.9],[531.1,289.5],[529.1,295.4],[525.6,303.7],[517.8,303.2],[509.1,300.6],[500.5,298],[491.9,295.4],[483.3,292.8],[475.4,287.5],[471,279.6],[466.6,271.8],[466.1,262.8],[469,254.3],[471.9,245.7],[474.9,237.2],[485,235.5],[493.9,236.2],[502.9,236.8],[511.9,237.5],[520.9,238.2],[529.8,238.8],[537.6,240.7],[278.2,423.2],[268.8,413.9],[265.6,405.5],[262.5,397],[259.4,388.6],[256.2,380.2],[253.1,371.7],[256.1,360.7],[263.4,355.4],[270.6,350.1],[277.9,344.8],[285.2,339.5],[291.3,341.7],[297.5,348.3],[303.7,354.8],[309.9,361.3],[307.5,372.9],[303.1,380.7],[298.7,388.6],[294.3,396.5],[289.9,404.3],[285.5,412.2],[281.1,420],[227.2,311],[235.2,306.8],[243.1,302.7],[252.4,304.4],[260.3,308.7],[268.2,313],[276.1,317.2],[284.1,321.5],[287.4,325.5],[287.6,334.5],[282,341.8],[274.7,347.1],[267.5,352.4],[260.2,357.7],[252.9,363],[245.9,363.6],[237.1,361.6],[228.3,359.6],[220.2,350.9],[221.1,341.9],[221.9,332.9],[222.7,324],[223.6,315],[261.8,74.4],[270.7,73.5],[282.4,72.6],[291.4,72.3],[303.1,72.1],[312.1,72.4],[320.7,78],[320.1,87],[319.6,96],[319,105],[316.1,110.3],[309,115.8],[301.9,121.3],[294.9,119.5],[286.6,115.9],[278.4,112.4],[270.1,108.9],[261.8,105.4],[260.7,100.5],[260,91.6],[259.3,82.6],[124,129.7],[131,124],[134,122],[141.5,116.9],[149.5,111.8],[157.3,107.3],[166.1,102.6],[174.3,98.8],[181.9,95.2],[189,97.6],[192.6,105.9],[196.2,114.1],[199.7,122.4],[197.2,127.9],[193.2,136],[189.3,144.1],[185.3,152.2],[177.9,159.2],[169,160.8],[160.1,162.4],[148.2,158.8],[142.1,152.1],[136.1,145.5],[130,138.8],[123.9,132.2],[439.1,105.4],[447,109.8],[455.3,114.7],[462.8,119.8],[470.4,125.2],[477.4,130.9],[483.8,136.3],[490.3,142.6],[484.8,148.3],[476.8,152.4],[468.8,156.5],[460.7,160.5],[452.7,164.6],[444.7,168.7],[437.9,166.7],[430.6,161.4],[423.4,156],[416.1,150.7],[416.6,141.7],[420.8,133.8],[425,125.9],[429.3,117.9],[433.5,110],[443.4,332.2],[434.7,329.6],[426.1,327],[417.5,324.5],[412.6,315.5],[412.7,306.5],[412.7,297.5],[412.7,288.5],[412.8,279.5],[420.5,272],[429.5,271.1],[438.5,270.3],[447.4,269.4],[456.4,268.5],[466.3,271.2],[470.7,279.1],[475.1,286.9],[473,297.4],[468,304.9],[463,312.4],[458.1,319.9],[453.1,327.4],[331.6,212.7],[333.1,203.8],[334.6,194.9],[336.2,186.1],[337.7,177.2],[340.2,168.2],[351.7,167],[360.2,170],[368.7,172.9],[377.2,175.9],[385.6,183.2],[387.1,192.1],[388.6,200.9],[381.6,212.1],[372.9,214.6],[364.3,217],[355.6,219.5],[347,221.9],[338.3,224.4],[332.9,225],[287.9,169.8],[286.6,178.7],[285.4,187.6],[284.1,196.5],[281.2,204.1],[273.6,208.9],[263.2,207.7],[255.3,203.6],[247.3,199.4],[239.3,195.3],[231.3,191.1],[228.6,182.6],[233,174.7],[237.4,166.9],[241.8,159],[252.6,153.1],[261.2,155.7],[269.8,158.3],[278.4,160.8],[287.1,163.4],[333.2,166.9],[324.6,164.3],[316,161.6],[307.3,159],[299.2,151.2],[299.7,142.3],[300.2,133.3],[300.8,124.3],[303.6,119.9],[310.7,114.4],[317.8,108.9],[324.2,110.9],[332.2,115],[340.2,119.1],[348.2,123.2],[353.4,132.3],[351.3,141],[349.3,149.8],[347.3,158.6],[344.8,165.6],[353.4,419.3],[344.5,420.8],[338.2,421.6],[329.3,422.5],[317.6,423.4],[308.6,423.7],[297,423.9],[288,423.6],[284.7,414.4],[289.1,406.5],[293.4,398.6],[297.7,390.8],[302.1,382.9],[306.4,375],[310.8,367.1],[316.6,364.4],[325.5,365.2],[334.5,366],[341.9,374.4],[344.5,383],[347.1,391.6],[349.8,400.2],[352.4,408.8],[355,417.4],[384.3,83.5],[392.9,86.1],[403.4,89.6],[411.8,92.8],[421.7,96.9],[429.8,100.7],[433,110.7],[428.6,118.6],[424.2,126.4],[419.9,134.3],[415.5,142.2],[405.6,144.1],[398.3,138.9],[391,133.6],[383.7,128.4],[376.4,123.1],[371.8,113.2],[374.5,104.6],[377.2,96],[379.9,87.4],[297.4,157.5],[290.1,162.9],[282.3,162],[273.7,159.4],[265.1,156.8],[256.5,154.3],[247.8,151.7],[245.4,148.6],[242.6,140],[243.7,129.4],[248.9,122.1],[254.2,114.8],[259.4,107.5],[267.1,107.6],[275.4,111.2],[283.6,114.7],[291.9,118.2],[300.2,121.7],[300.6,127.2],[300.1,136.1],[299.6,145.1],[299,154.1],[187.1,163.4],[193.4,169.9],[199.6,176.4],[205.9,182.9],[212.1,189.4],[213.4,194.4],[209.4,202.4],[200.8,209.7],[192.3,212.6],[183.8,215.5],[175.3,218.5],[163.2,218],[156.5,212],[149.8,206],[143.1,200],[143.9,194],[146.4,185.4],[148.9,176.8],[151.4,168.1],[157.1,162.9],[166,161.3],[174.9,159.7],[191.1,291.3],[190.6,282.3],[190.2,273.3],[195.1,268.6],[202.5,263.4],[209.9,258.3],[217.3,253.2],[227.4,250.2],[236.1,252.6],[244.7,255.1],[250.1,263.4],[249.2,272.4],[248.3,281.3],[247.3,290.3],[246.4,299.3],[242.8,302.8],[234.8,307],[226.9,311.1],[218.9,310],[211.1,305.6],[203.2,301.3],[195.3,296.9],[216.2,191.4],[224.7,188.4],[232.2,191.6],[240.1,195.7],[248.1,199.9],[256.1,204],[264.1,208.2],[268.6,217.2],[266.7,226],[264.8,234.8],[262.8,243.5],[259.6,251.9],[251.8,256.3],[246.7,255.6],[238,253.2],[229.4,250.7],[220.8,242.8],[217.5,234.4],[214.1,226.1],[210.8,217.7],[207.5,209.4],[208,205.3],[212,197.3],[270,422.4],[261,421.5],[255.7,420.8],[246.8,419.4],[235.4,417.3],[226.7,415.3],[216,412.6],[207.4,410],[203.3,400.8],[206,392.2],[208.7,383.6],[211.4,375],[214.1,366.4],[216.7,359.4],[224.2,358.7],[233,360.7],[241.8,362.7],[253.7,373.4],[256.9,381.8],[260,390.3],[263.1,398.7],[266.3,407.1],[269.4,415.6],[411.3,271.4],[404.6,265.3],[402.8,257.1],[403.3,248.1],[403.7,239.2],[404.2,230.2],[410.5,219.3],[418.9,216.1],[427.4,212.9],[435.8,209.7],[444.2,206.5],[448.1,208.8],[455.8,213.5],[463.5,218.1],[470.8,223.9],[474.5,232.1],[474,239.7],[471.1,248.2],[468.2,256.8],[465.2,265.3],[456.7,268.5],[447.7,269.4],[438.7,270.2],[429.8,271.1],[420.8,272],[167.6,341.8],[165.8,332.9],[164.1,324.1],[167.1,314.3],[174.1,308.6],[181.1,302.9],[188.1,297.3],[196.2,297.4],[204,301.8],[211.9,306.1],[219.8,310.5],[223.2,319.4],[222.3,328.4],[221.5,337.4],[220.7,346.3],[219.8,355.3],[219.1,357.9],[209,357.6],[200.4,355.2],[191.7,352.7],[183.1,350.2],[174.4,347.7],[341.9,223.4],[350.6,220.9],[359.2,218.5],[367.9,216],[376.5,213.6],[385.2,211.1],[392.3,211.5],[399.2,217.2],[404.3,227.9],[403.8,236.9],[403.4,245.8],[402.9,254.8],[396.6,264.6],[387.8,266.4],[379,268.3],[370.2,270.1],[358.7,266.2],[352.9,259.3],[347,252.5],[341.2,245.7],[335.3,238.8],[332.9,234.4],[290.3,205.5],[298.7,208.7],[307.1,211.8],[315.6,214.9],[324,218.1],[330.7,221.2],[333.3,227.3],[327.7,240.3],[320.9,246.2],[314.1,252.1],[307.3,258],[300.5,263.9],[293.2,263.2],[284.8,260],[276.4,256.8],[268,253.6],[262.5,245],[264.4,236.2],[266.3,227.4],[268.3,218.7],[271.9,210],[279.5,205.2],[196.6,406.4],[188.2,403.2],[178.4,399.2],[170.2,395.4],[161,390.8],[153.2,386.3],[146.2,382.3],[145.9,374.3],[151.5,367.3],[157.1,360.2],[162.7,353.2],[168.3,346.1],[175.6,348.1],[184.2,350.5],[192.9,353],[201.5,355.5],[210.2,358],[213.7,366.9],[210.7,375.4],[207.7,383.9],[204.7,392.3],[201.7,400.8],[476.1,213.7],[481.4,206.5],[486.8,199.3],[492.2,192.1],[497.6,184.9],[503,177.7],[508.4,170.5],[511.7,167.9],[516.9,175.7],[521.3,183.6],[524.5,190],[528.1,198.3],[530.6,204.7],[533.2,213.3],[534.8,219.7],[536.4,228.6],[537.2,233.7],[528.2,238.7],[519.3,238],[510.3,237.4],[501.3,236.7],[492.3,236],[483.4,235.4],[474.8,232.9],[471.1,224.7]],"caps":[[444.2,206.5],[469.9,222],[384.8,178.5],[404.6,221.6],[113.7,208.6],[111.1,259.5],[162.8,317.7],[168.4,346],[339.2,168.8],[283.2,202.9],[385.3,340.9],[412.6,323],[448.8,333.8],[348.7,304.5],[363.3,271.5],[182.3,158.4],[199.8,122.5],[240.6,133.7],[246.2,151.2],[142.4,199.4],[164.1,252.2],[152.7,163.7],[339.5,366.5],[298.9,265.3],[287.4,323.3],[250.8,256.8],[477.3,291],[312.5,364],[370.1,118.6],[318.8,108.2],[191.3,294.7],[261.1,105.1],[250.5,364.7],[223.8,312.7],[219.6,357.6],[300.9,122]],"fibres":[{"dots":[[11.5,-9.4],[8.6,-16.5],[16.6,-22.3],[11.2,-5.9],[-16.8,14.6],[3.6,-22.1],[-13.6,11.8],[13,-10],[7.8,9.7],[6.3,0.3],[-5.6,5],[-13.2,17.1],[3.9,10.9],[13.5,1.7],[10.2,-18.9],[-11.1,5.4],[3.6,-1.6],[-10.1,-7.2],[27.6,-13],[-19.4,17.2],[16.9,-19.3],[7.8,-5.6],[10.9,5.4],[21.4,-11],[0.2,-5.2],[-2.7,-3.9],[19.8,-17.3],[23.6,-15.3],[21.8,-9.7],[-7.7,-3.7]],"nuclei":[6,2],"type":1},{"dots":[[6.5,10.5],[11.5,-3.4],[20.4,2.2],[12.2,0.2],[20.3,5.2],[-22.3,-6.4],[-5,-16.4],[-1.4,-26.5],[-4.1,18.1],[-1.9,-1.3],[-3.3,-20.1],[-14.9,-6.9],[13.7,-11.8],[11.2,-7.8],[10.8,-20.4],[11.5,-2.4],[-1.7,-16.7],[-2.9,11.9],[0.5,-5.1],[11.2,11.9],[5.6,0],[21.8,2.1],[-15,13.7],[-2.3,-6.2],[-11.1,2.7],[6.4,-2.4],[0.9,8.7],[9.4,-5.9],[-0.7,-3.9],[7.5,-21.6]],"nuclei":[4],"type":1},{"dots":[[-4.5,-2.6],[-4.2,-1.3],[-5.5,-8.8],[-11.1,-19.3],[-6.2,-13.6],[-6.2,3.2],[-5.8,-4.1],[-13.1,-18.4],[11.9,13.8],[-11.7,-8.5],[-15.2,9.9],[7.8,7.5],[-8.2,-2.4],[-15.8,4.8],[-0.2,-20.2],[0.2,1.8],[6.8,5.6],[-3.4,16.8],[-16.7,-10],[-10.4,1.3],[1,11.5],[4.5,16.7],[-16.2,22],[0.3,3.3],[-8.4,-23.1],[-9,-1.8],[-17.4,25.2],[-14.2,12.7],[16.3,18.9],[-10.4,-26.5]],"nuclei":[5],"type":2},{"dots":[[0.7,17.1],[-9.6,-3.1],[-11.4,11.1],[8.2,19.6],[8.5,-6.9],[-0.9,16.3],[-1.7,9.2],[10,-9],[-2.1,-10.3],[14,5.9],[0,-0.5],[5.8,10.6],[-9.6,10.5],[-12,4.3],[-19.4,8.7],[4,23.7],[-1.5,3.8],[-16.5,-1.5],[-3.8,2.8],[-27.9,-2.5],[11.6,2.1],[-4.7,14],[-24.1,-0.2],[5,-16],[2.1,9.3],[-1.5,-19.6],[-12.6,3.1],[-10.4,-4.7],[-1.5,14.9],[-3,4.7]],"nuclei":[0,1],"type":1},{"dots":[[-18.2,3.4],[3,3.7],[-14.5,-8.6],[-0.5,-0.5],[21.2,-14.1],[-9,4.7],[11.1,19.7],[-12.2,6.9],[-5.4,11],[-3.1,-21.1],[-0.9,-2.7],[-7.5,-13.3],[9.2,16.4],[6.1,9.6],[-20.3,11.5],[10.3,-6.7],[-7.4,-12.1],[-9.3,-9.5],[-8.7,4.6],[-4.5,-11.6],[7.4,-10.6],[-13.9,-14.6],[-16.1,6.7],[2.5,2],[-1.7,2.3],[17.4,-11.3],[-5.8,-5.9],[9.8,10.3],[-6.1,-22.6],[6.8,10.3]],"nuclei":[2],"type":2},{"dots":[[-5.9,19.3],[-9.3,-24.6],[6.4,-17.9],[-1.6,22.9],[-8.2,28.2],[-9.6,-19.6],[1.8,-25.3],[-2.5,-9.3],[15.3,11],[4,8.2],[14.1,19.4],[-21,-7.9],[-7.9,-5.4],[20.9,-8.7],[-3.5,-9.9],[-17.6,-1.5],[-19.8,-6.2],[-1.3,11.6],[-5.9,-5.5],[5.1,-5.4],[-14.7,-11.9],[-20,9],[2.9,0.8],[8,22.9],[-1.8,10.7],[2.2,12.4],[15.9,11.2],[2.5,14.8],[5.4,4.4],[-19.4,6.1]],"nuclei":[5,6],"type":1},{"dots":[[-9.4,10.9],[17.7,-2.1],[0.7,23.6],[1.6,7.8],[0.9,-0.9],[-1.7,-21],[-7.2,2.4],[16.7,-4.2],[0.4,-5.1],[-0.3,-2.6],[-2.9,11.9],[0.2,-10],[-11.8,15],[1.8,20.2],[5.3,0.5],[-7,-8.6],[-1,2.8],[10,-11.3],[-2.2,6.1],[-7.7,-19.8],[-4.2,9.6],[-17.1,10.6],[7.2,-20.2],[10.4,-27.9],[-9.9,17],[3.8,15.6],[7.5,-18.9],[-10.9,25.1],[-4.5,2.8],[6.5,20.9]],"nuclei":[5],"type":2},{"dots":[[17.2,7.8],[-0.2,21.4],[-14.5,1.5],[-11.2,-3.6],[-16.6,-0.4],[12.5,-18.3],[-12,2.2],[10.7,11.1],[7.9,24.8],[-11,-23.6],[9.2,15.2],[-1,-9.4],[4.8,9],[-0.5,1.7],[18.3,-15.2],[1.3,19],[15.6,-8.9],[9,18.9],[12.5,-2.9],[21.3,0.9],[20.6,-1.6],[3.3,10.5],[-1.8,7.2],[-18.1,-3.4],[-5.7,-8.6],[8.2,-1],[5.6,-9.1],[14.2,-6.6],[19,-2.3],[-8.3,-4.2]],"nuclei":[0,4],"type":1},{"dots":[[15.7,-7.9],[-6.3,3.2],[11.7,-18.2],[-8.1,7.5],[-12.9,20.1],[-12,11.7],[18.2,12.5],[10.1,-11],[-17.6,0.7],[-3.6,18.2],[-0.9,-7.7],[5.3,-11.1],[10.5,-5.1],[-5,5],[-5.1,-8.7],[-6.7,19.7],[-6.3,20.4],[13.3,13.3],[11.1,-3.6],[6.7,4.5],[3.2,-20.9],[20.3,9],[14.9,3.8],[3.9,-7.5],[0.8,7],[-4.6,14.9],[-3.8,6.2],[17.7,11.9],[-4.3,-7.4],[-8.5,11.7]],"nuclei":[0,1],"type":2},{"dots":[[-5.7,9.2],[11.1,-4.2],[-13.4,-2.8],[-2.3,20.4],[-4.6,-10],[-0.7,-15.1],[9.5,-8.9],[-6.2,-4.8],[5.5,16.1],[-26,-0.2],[-9.6,-0.6],[-2.7,-11.3],[17.9,-5.2],[10.9,-1.7],[13.7,14.6],[-16.5,-6.3],[9.8,10.1],[-15.1,3],[-2.3,-22],[9.5,-11.9],[-8.7,-18.3],[-17.4,1.6],[-3,-25.2],[-3.9,-7.4],[-15.3,-6.9],[3.1,-15.1],[-16.5,-13.1],[-12.3,-2],[-11.5,-1.1],[14.6,-10.9]],"nuclei":[1,0],"type":2},{"dots":[[1.1,4.6],[-7.8,-3.8],[-6.9,18.6],[0.8,18.5],[-15.5,-5.7],[-6.1,27.6],[5.6,7.7],[8.6,7.8],[-6.6,19.9],[-9.7,20.6],[11.8,10.4],[-4,4.5],[8.7,-30.6],[0.3,-15.9],[0.1,-7.1],[-6.5,-23.4],[-9.4,25.8],[4.1,18],[-23.5,-8.6],[-2.9,5],[23.3,6],[-2,3.5],[6,-17.6],[-1.8,20.6],[6.2,-4.6],[6.8,-20.5],[2.3,-5.7],[2.8,-10.7],[-14.8,-5.3],[4.5,13.2]],"nuclei":[6,0],"type":2},{"dots":[[-17.1,-23.8],[6.5,20.9],[-19.7,1.5],[17.7,-15.9],[1,8.3],[20.8,5],[-14.4,8.4],[16.3,-9.9],[6.8,6.3],[0.8,-15.8],[-4.9,8.4],[-8,-8.3],[3.4,-4.3],[5.3,0.2],[-7.2,9.5],[-22.2,11.2],[13,10.7],[8,3.2],[-0.1,9.7],[4.2,17.4],[-7.5,-17.5],[9.1,1.3],[-2.4,-3.3],[-14.9,-16.9],[-11,3.7],[4.9,-15.9],[-2.8,16.3],[-14,-18.4],[15.5,7.9],[-5.7,-1.9]],"nuclei":[3],"type":2},{"dots":[[1.3,10.8],[-17.5,7.7],[15.5,4.9],[-1.2,3.1],[-9.5,4.3],[19.3,5.9],[-5.5,-0.2],[0.4,7.9],[-7.6,0.2],[4.8,-4.6],[3.7,0.8],[6.1,-12.4],[-21.3,9.7],[-9.6,-6.4],[0.9,14.6],[-8.1,-4.9],[0,19],[-2.1,3.8],[-15.1,6.8],[-3.1,-4.4],[-17.3,-5.3],[1.4,7.6],[-10.9,-13.6],[0,4.7],[-7.9,-14.3],[1.6,-3.1],[7.9,2.4],[2.8,2.1],[5.6,-13.2],[0.1,18.1]],"nuclei":[1,2],"type":2},{"dots":[[-11.1,19.1],[-4.8,-0.4],[-1.3,-12.1],[-4.3,17.8],[2.9,7.2],[-15.5,-8.2],[-14.2,12.9],[-10.2,5.9],[-2.7,1.1],[-2.1,6.1],[4.1,-16],[-11.4,-3],[22.8,8.7],[0,4.8],[-13.1,1.1],[-2.5,8.2],[-10.1,-4.3],[-9.5,-6.1],[14.1,-7.5],[0.5,12.5],[-5.4,12.3],[-15.7,11.7],[1.6,-4.5],[15.2,-15.1],[-13.7,7.2],[-4.6,25.1],[-10.5,22.2],[-11.9,-7.5],[-11.2,-3.2],[3.1,7.2]],"nuclei":[3,4],"type":2},{"dots":[[11.8,5.9],[2.6,1],[20.8,-3.4],[-1.2,21.3],[0.3,1.5],[4.9,1.2],[4.4,20.2],[9.1,-1],[-16,3.1],[-2.6,18.5],[22.6,-11.8],[-1.6,17],[0.1,-17.7],[4.1,5.9],[3.2,19.1],[1.3,10.2],[11.1,5.5],[-7.9,0.4],[-0.8,15],[16.1,-8.9],[-10.9,4.1],[1.8,-21],[1.3,0.3],[28,-11.7],[13.1,-1.4],[-1.8,0.7],[25.3,-11.8],[15.3,-8.3],[1.8,-4.7],[8.5,0.6]],"nuclei":[7],"type":1},{"dots":[[9,-11.4],[-14.3,1.8],[6.1,21.6],[-12.3,6.4],[-7.5,-5.8],[-9.7,5.4],[-13.1,1.4],[-18.9,9.2],[-8.1,1],[8.1,-10.3],[-13.4,13.8],[13.5,3],[-1.8,4.9],[22.4,3],[-0.1,-0.5],[-24,-7],[-0.6,0.9],[6.3,-8.7],[-21.3,2.6],[-1.9,8.2],[-4.4,11],[-12.8,-20.1],[0,0.2],[9,23],[-5.5,5.3],[-6,-8.9],[-24.6,5.1],[18,-5.6],[6.4,3.4],[6.8,9.2]],"nuclei":[5,6],"type":2},{"dots":[[-0.6,0.1],[2,-7.8],[8,-1],[-2.6,-16.4],[-7.3,-2.6],[24.8,-11.4],[6.7,-2.3],[-15.4,-2.7],[-13.8,-1.5],[13.4,-6],[1.1,-13.7],[-14.5,5.3],[4.9,-8.4],[4.3,-8.9],[2.9,-2.6],[-6.4,-13.9],[13.5,14.3],[-4.3,-5.6],[8.7,-12.6],[18.5,-8.3],[10,15.8],[0.7,11.3],[-16.7,-17.1],[-0.9,-2],[5.5,13.4],[4.9,7.2],[-9.3,-9.9],[-10.8,10.7],[8.9,-4.1],[3,10.4]],"nuclei":[0],"type":1},{"dots":[[11,-3.5],[-18,14.1],[-12.7,3.3],[13,12.2],[-20.6,-4],[-1.8,-12.1],[-15.4,-7.8],[0.5,-0.2],[-17.8,-11.6],[-0.1,4.9],[1.7,24.8],[-4.7,-3.5],[-5.1,2.1],[-5.6,-0.4],[8.4,-7.6],[-20.2,-11.9],[6.1,-20.5],[-19.2,-13.5],[16.9,-9.6],[-0.2,-9],[2.3,-3.1],[3.1,-3.4],[1.9,0.3],[3.4,0.5],[17,3.2],[-0.8,22.8],[-22.6,-10.8],[20.2,-0.6],[2.7,22.4],[-17.1,13.4]],"nuclei":[2],"type":2},{"dots":[[12.3,-0.4],[15.9,1.7],[-10.9,-4.6],[-5.8,2.3],[-10,2.5],[22.5,2.1],[-4.6,-4.5],[-20.3,10.5],[-2.9,-3.9],[-9.7,-13.4],[-6.9,-9.5],[9.9,-8.2],[-3,10.5],[-2.9,-3.6],[-3.2,-16],[-8.6,8.2],[3.2,4.1],[-5.7,-21.2],[-15.8,-17.7],[-9.2,-10.3],[7.2,-0.2],[1,2.9],[0,-4.5],[-12.3,-19.1],[1.1,3.5],[28.1,-0.8],[-2.3,-6.8],[-5.5,-5.6],[-1.9,-10.9],[-2.1,-7.8]],"nuclei":[3],"type":1},{"dots":[[-9.8,2.9],[6.7,-1],[6.7,4],[7.3,-19.2],[6.8,7.6],[6.3,11.7],[5,-6.6],[-1.5,-10.6],[0.6,4.7],[1.9,0.9],[3.3,21.5],[-9.9,11.3],[11,17.5],[12.4,-4.3],[20.9,-8.1],[-5.5,1.3],[-10.5,-3.2],[-3.5,-11.2],[-14,20.2],[-15,18.8],[-14.8,17.7],[10.7,-1.1],[12.6,-13.1],[-12.2,6],[-10.5,1.4],[-12.8,16.2],[-7.1,-6.9],[10,0.3],[-8.9,8.8],[2.7,-21.2]],"nuclei":[1,3],"type":2},{"dots":[[12.3,6.9],[15.2,-14.6],[8.8,16.8],[-10.9,10.4],[9.8,-10.6],[4.9,5],[4.5,-14.3],[22,-20.6],[-19.3,-9.5],[-6.5,-15],[-11.4,-4.3],[15.3,-6],[21,-21],[-10.5,-5.6],[8.2,15.3],[11.4,-5.8],[1,-4.1],[-4,0.4],[7,-16.4],[11.8,0.5],[-21.6,9],[6.2,-10.5],[21.7,-21.4],[-10.3,3.8],[-10.7,4.2],[-4.7,6.6],[5.1,-7.3],[6.6,-15.6],[-12.9,-6.3],[15.3,-11.7]],"nuclei":[6],"type":1},{"dots":[[17.3,6.2],[13.2,15.4],[-13.3,18.5],[2.9,-0.9],[14.7,14.6],[-12,16.6],[7.2,1.8],[15.1,-0.5],[11.5,-7],[13.1,16.2],[-6.4,10.5],[14.6,-5.6],[6.5,10.2],[-0.7,-4.5],[-4.9,5.2],[-3.6,2.3],[21.3,9.4],[18.6,13.2],[-19.5,-7.6],[-7.8,-11.2],[8.1,4.9],[12.2,14.8],[13.8,-5.4],[-3.7,-6.5],[17.8,-0.9],[-0.4,-1.7],[10.3,11],[2.2,-19.3],[-3.6,23.3],[17.1,17.4]],"nuclei":[4,6],"type":2},{"dots":[[15.5,-6.4],[4.1,25.5],[-4.1,4.6],[1.9,4.4],[2.7,-15.2],[2.6,-14.9],[-2.3,28.1],[10.7,-6.2],[-0.8,26.6],[7.5,12.1],[3.5,-2.3],[1.8,16.1],[12.8,5.8],[3.6,-20],[-15.4,-8.7],[7.1,-24],[-9.2,24.6],[6.9,4],[-6.5,-2.7],[-6.8,24],[18.2,-7.5],[-0.8,26.8],[17.4,-7.2],[-15.7,-1.9],[-0.6,21.9],[-4.9,25.9],[0,9.2],[-3.4,18.1],[-11.3,19.9],[-8.7,-3.6]],"nuclei":[4,2],"type":2},{"dots":[[-17.9,9.9],[1.2,-0.4],[-10,2.9],[-1.4,-11.2],[-10.4,-2],[11.6,-3.9],[-15.9,-12.6],[-1.7,-13.8],[28.2,-7.8],[9.8,1.1],[-16.7,-9.9],[2.3,20],[10.7,-1.8],[16.5,-2.5],[-2.6,-20.9],[-18.5,3.6],[0.1,8.3],[13.3,-13.9],[-8.1,6.2],[-3.3,-22.7],[-4.2,-12],[-8.6,-3.8],[-3.4,5.3],[-20.2,-16],[3.6,3.9],[4.8,4.7],[0.2,20.3],[2,-4.5],[28.6,-0.6],[11.3,0]],"nuclei":[2],"type":2},{"dots":[[-15.3,-10.6],[-11.6,2.9],[-4.9,-10.4],[2.6,-11.9],[1.9,8.3],[2.8,5.1],[-16.8,8],[12.3,7.9],[11.7,7],[10,-13.8],[-16.8,-15.3],[14,7.5],[-14.4,8.2],[-16.1,-10.1],[-7.2,0.7],[2.4,-15.6],[-0.5,-5.4],[-0.5,-4.8],[-14.4,-4.2],[-4,5.9],[12.5,-3],[-12,1.8],[2.2,9.3],[-6.1,0],[7.5,-13.7],[-8.8,-2.3],[22.8,-10.9],[3.8,-4.7],[14,7.5],[9.4,7.7]],"nuclei":[3,6],"type":2},{"dots":[[-16.4,-2],[-1.2,-16.3],[-12.7,-6.4],[-21.9,-0.7],[10.7,-6],[-3.6,-11.8],[-19.8,0.1],[7,-22.1],[9.5,-21.3],[-10.9,19],[9.2,-20.7],[7.7,-16.9],[-7.1,-11.2],[8.5,-14.6],[-10,-1.4],[14.9,-6.9],[5.7,14.2],[9.1,2.3],[23.9,-0.8],[-8,-1.3],[12.4,16.9],[0.1,11.5],[-5.9,-1.9],[-0.1,3.1],[-9.5,3.2],[9.5,13.4],[0.4,-14.2],[12.2,-11.8],[-6.7,-4.4],[11.9,9.6]],"nuclei":[0,4],"type":2},{"dots":[[17.8,1.2],[2,-12.4],[-0.1,-11.3],[-4.5,1.9],[5.2,10.4],[-2.5,11.7],[-3.1,1.2],[-10.6,6.7],[-26.6,4.7],[-5.9,4.2],[29.2,3.6],[-6.6,2.5],[-1.6,12.3],[-6.2,-10.5],[-1.9,-9.1],[4,0.6],[6.6,-8.5],[9.7,-14.6],[-3.4,19.2],[1.5,-10.1],[1.9,-12],[0.9,-5.8],[9.3,-7.3],[14.4,-7.6],[-14.5,5.3],[-12.6,4.4],[-2.7,12.9],[-1.6,-11.4],[8.5,-8.8],[-0.6,0.7]],"nuclei":[1],"type":2},{"dots":[[26.7,-7.1],[-7.4,-1.3],[4.7,5.8],[5.3,-2.9],[-8.4,6.2],[-11.4,-13.4],[3.6,2.5],[3.2,8.5],[9.7,-1],[6.4,-6.2],[-3.5,-18.6],[4.7,21.7],[2,9.7],[-1.3,15.2],[16.4,-20.9],[15.2,-12.3],[-10.4,9.1],[-3.7,5.2],[6,25.9],[-18.9,6.3],[-10.7,9.4],[6.5,-10.8],[19.4,2.8],[-3.8,-3.4],[0.9,-11.7],[-10.7,-4.4],[5.8,27.3],[2.1,9.9],[-6.8,-4.8],[-13,8.9]],"nuclei":[3,3],"type":1},{"dots":[[6.8,-1.3],[-13.5,5],[10.7,1.8],[-6.2,-4.3],[-5.4,-12.6],[-2.2,-13.1],[-10.6,-20.2],[-17.3,15.5],[-8,-19.8],[-17,9.9],[-4.1,-7.6],[-1.7,-9.1],[-12.7,-18.9],[-9.4,-23.4],[-1.7,-2.6],[1.7,0.9],[-6.3,-2.2],[-17.9,21.6],[-12.3,5.2],[-13.2,-18.7],[-11.1,3.8],[-2.5,-6.3],[-8.1,-11.5],[-13.8,-2.3],[18.3,-11.9],[-4.8,-13],[-6.4,9.6],[16.1,-5.4],[-16.2,14.2],[-12.4,2.7]],"nuclei":[0],"type":2},{"dots":[[1.1,-17.2],[10.5,9.5],[-8.1,6.4],[-21.9,4.7],[7.2,13.6],[17.5,1.2],[5,20.4],[0,-10.9],[-9,-18.9],[-12.9,-8.6],[14.5,1.3],[3.8,-3.3],[-1.2,-5.3],[2,19.3],[12.4,6.4],[0.6,-1.6],[-13.7,5.7],[2,11.2],[-10,0.6],[14.1,4.4],[-2.5,-5],[16.8,16.3],[7.1,0.5],[-4.9,-13.5],[-18.6,3.8],[9.7,-3.5],[7,10.2],[5.4,17.1],[9.4,21.7],[3.8,-1.6]],"nuclei":[3],"type":2},{"dots":[[-14.7,2.6],[11.7,8.2],[-17.5,10.6],[6.3,4.2],[5.7,13.6],[-11.3,-7.8],[-5.2,1.9],[8,10.4],[15.5,-1.4],[-8.9,-4.8],[2.9,-10.4],[-14.4,-3.6],[3.3,18.8],[3.8,7.2],[13.7,9.4],[0,-10.3],[1.4,10],[20.3,-8.9],[21.6,-9.5],[-0.3,17],[2,1.6],[5.5,12],[-3.7,-18.7],[8.6,-3.6],[5.7,10.9],[-5.2,0.7],[-15.9,0],[10.4,-3.6],[-1.8,-19.3],[5.8,12.2]],"nuclei":[0,5],"type":2},{"dots":[[0,-2],[-11.2,15],[23.9,16],[-5.2,6.4],[8.2,-13.9],[6.8,-24.7],[-5.5,-23.5],[-12.9,6.3],[-1.7,2.8],[-4.7,11.4],[0.3,15.5],[7.8,7.1],[16.6,16.6],[-0.3,12.9],[0,5.1],[2.6,9],[-6.7,8.5],[-1,-12.1],[-18.9,7.1],[-4.5,-3.5],[7.6,-3],[-26.9,16.3],[-1.6,-1.2],[0.1,18],[0.1,17.8],[3.1,-14.8],[12.3,-20.8],[-13.5,16.7],[4.7,-7.9],[-5.3,10.1]],"nuclei":[3],"type":2},{"dots":[[-3.3,-14.4],[3.5,-1.2],[-10.1,-7.8],[2.5,-5.5],[1.4,-13.3],[11.6,-0.8],[-5.7,-2.2],[6.1,-6.2],[9,-9.1],[21.5,-5.6],[-15.8,9.5],[-0.8,-15.8],[3.2,-5.1],[6.1,-11.3],[-14,2.4],[-4.1,-19.9],[21.8,-7.9],[10.1,-1.6],[10.6,-2.6],[-14.3,8.3],[-0.6,-12.3],[-8.9,-16.9],[7.3,24.8],[7.4,-9.8],[-23.7,3.7],[10.5,-2.8],[-1.4,-16],[-3.8,-14.3],[1.2,0],[-0.4,-8.7]],"nuclei":[5],"type":2},{"dots":[[-8.5,-22.2],[16.7,5.4],[5.4,8.9],[-4.4,3.1],[1,-12.3],[2.6,13.8],[10.1,17.5],[-15.9,-12.1],[19.6,-3.8],[8.4,14.9],[-5.4,-13.9],[4.1,3.5],[-12.8,-0.3],[-17.2,-1.1],[-7.6,1.3],[13,4.4],[3.8,-3.1],[-4,-12.4],[-20.6,11.9],[-5.5,-3.9],[-9.9,12.8],[9.2,2.6],[-7.8,4.5],[-9.7,2.1],[-0.5,-14.4],[11.5,2.1],[-11.6,-0.5],[-11.4,4.9],[-1.4,-3.7],[-4.3,10.6]],"nuclei":[4],"type":1},{"dots":[[-6,-3.2],[-5.2,-8.2],[-8,9.1],[1.1,0.6],[-1.2,6.9],[-0.7,2.3],[-3.7,2],[-1.5,-5.4],[10.9,0.1],[5.4,0],[-22,-4.4],[15.5,-12.8],[4.1,-1.8],[14.3,15.4],[-2.7,3.3],[19.4,-4.8],[-6.4,16.7],[5,-11.6],[-2.6,8.9],[-3.5,11.9],[-11.7,-13.1],[4.3,-16],[-18.7,3.7],[-10,-13.8],[23.3,13.5],[-8.6,-20.9],[23.3,1.3],[-10.6,-13.9],[-4.7,16],[5.5,-0.4]],"nuclei":[3,0],"type":1},{"dots":[[1.6,-17.4],[1,19.5],[-4,5.6],[6,-12.1],[-12,-1.5],[19.8,-14.7],[9.1,7.8],[14.9,-15],[17.3,14.8],[-21.1,-2.3],[16.2,-17.4],[0.2,2.4],[18.6,-2.1],[-6.1,-1.6],[-4.1,5],[14.4,-15],[3.4,10.1],[-8,2.6],[9.8,-12.2],[15.4,-4.6],[-14,9.4],[-4.7,-5.8],[8.9,7.6],[-19.3,-8.1],[-9.1,3.6],[16.5,13.6],[5.8,15.9],[-19.8,-3.8],[16.6,3.6],[1.3,22.9]],"nuclei":[0,5],"type":2},{"dots":[[-10.9,-20.5],[-9.6,3.2],[5.9,-13.8],[-17.9,-22.9],[-3.8,0.4],[-17.9,-17.6],[6.9,-6.3],[-1,4.3],[-16.9,-18.2],[-1.2,3.2],[-2.7,9.6],[-16.6,-18.3],[8.2,10.2],[-20,-13],[-7.8,-20.8],[-0.3,7.3],[-20.1,-9.3],[3.7,4.5],[4.6,5.8],[-4,-8.3],[-4.7,-4.7],[-11.2,-4.6],[17.1,19.6],[-7.8,2.8],[-8.7,-11.1],[-7.5,18.3],[10.8,8.3],[-17.4,-12.5],[8.1,15.1],[17.5,-6.2]],"nuclei":[5],"type":1},{"dots":[[20.8,17],[13,10.2],[2,1.7],[-4.1,-9.3],[7.2,-0.2],[-25,12.2],[0.7,17.9],[4.3,-16.5],[14,17.3],[3.1,-16.5],[-4.8,11.8],[-13.2,-4.7],[-12.9,-24.2],[12.8,-1.7],[-4,4.1],[-7,15.5],[-14.1,6.1],[-12.4,-20.8],[5.1,4.8],[20,19],[-7.8,-18.4],[8.2,6.7],[-10.3,-19.5],[-6,-9.4],[-0.3,-4.8],[-25.1,11.5],[9.2,-22.1],[1.3,-3.4],[-3.7,-16.2],[2.8,14]],"nuclei":[3],"type":1},{"dots":[[-9.3,9.9],[-10.3,8.5],[18.3,-12.5],[-1.6,1.3],[-0.4,-9.1],[-16,20.4],[2,5.4],[-11.3,-19.6],[7.2,3.7],[-6.9,-3.8],[-1.8,-1.5],[25,-2.1],[3.5,-17.6],[18.9,-4.6],[-17,21.7],[13.4,-16.3],[-11.1,7.1],[11.8,-10.3],[-23.7,-15.3],[16,-4.3],[-24.2,16.5],[4.4,-2.6],[19.2,14.2],[-0.5,14.6],[-8.6,11.3],[2,21.8],[5.7,9.2],[4,-19.9],[-2,5.1],[-3.3,2.1]],"nuclei":[6,5],"type":2},{"dots":[[-0.8,6.3],[-0.4,15.1],[4.7,-11.7],[-0.2,-2.9],[4.5,13.3],[-19,-0.6],[-11.1,11.9],[11.2,-16.7],[-14,5.6],[8.9,10.8],[-12.5,-2.2],[-23.8,-5],[-20,1.1],[-16.7,-5.7],[7.3,7.9],[-11.2,-3.8],[11.3,-10.3],[9.5,-5.1],[-1.8,-14.6],[-3,-24.7],[13.6,-11],[11.3,-6.1],[-16.3,-2.8],[14.5,21.9],[9.6,18.4],[0.9,1.4],[20.2,-3.4],[-16,-14.3],[-19,-6],[-21.4,-6.2]],"nuclei":[1],"type":2},{"dots":[[17.3,-11.8],[1.2,-6.3],[-30.5,-11],[-11.1,16.2],[10,-0.9],[8.7,7.4],[-27.4,-8],[11,-5.3],[-8.5,19.8],[10.3,-6.2],[-2.5,-7.9],[-16.9,-11.1],[-12.3,2.6],[6,-10.7],[19.4,-0.6],[3.6,1.3],[-15.8,5.5],[-3.5,11.3],[-0.9,5.5],[22.6,-13.3],[5.4,-9.5],[23.9,-11.4],[5.5,8.5],[-8.7,-8],[-9.3,4],[16.3,-5.3],[12.4,-4],[12,-17.6],[6.8,-10.3],[5.4,-7]],"nuclei":[0,4],"type":1},{"dots":[[-11.4,-13.3],[25.6,-4.9],[-4.5,-7.5],[0.1,1.4],[2.9,24.4],[-18.1,14.7],[-21.8,11.3],[16.3,-2.2],[16.6,-5],[-20.2,4.9],[4.2,-4.4],[-26,13.3],[-17.9,9.4],[-19.2,-17.1],[-13.1,6.7],[7.8,-10.2],[1.2,-4.4],[20.4,0.6],[2.8,23.4],[0.8,-3],[15.6,-1.5],[14.9,-9],[29.1,-5.9],[-1.8,7.4],[15.4,6.5],[8.8,4.6],[28.6,-5],[-8.6,-10.3],[2.7,22.2],[18.9,0.9]],"nuclei":[2],"type":2},{"dots":[[5.4,2.8],[-19.4,7.3],[16.2,15],[-8.9,11.6],[-0.8,-1.2],[-18.5,2.1],[17.9,-7.9],[3.7,14],[-8.1,-3.3],[-7.3,5.7],[-10.3,10.6],[-2.4,3.2],[0.9,8.3],[-1.6,0.6],[8.2,21.6],[-7.7,1.7],[-9.2,-20.3],[-27.6,5.1],[-8.8,1.7],[2.9,5.1],[0.6,2.1],[-23.6,3.2],[10.2,2.7],[-13,2.2],[-17.3,-3],[4,-1.8],[-7.7,-13.3],[-12.6,2.8],[-0.1,17.9],[24.8,-10.9]],"nuclei":[3],"type":2},{"dots":[[7,-29.1],[17.9,8.9],[4.2,-25.6],[-2,12.4],[9.9,-21],[-24.2,7],[11.1,16.7],[-4.7,13.7],[8.8,-16.4],[16.4,6.5],[17,7.7],[-5.2,12.7],[15.5,-11.3],[-19.7,9.2],[8.3,-4.5],[-16.7,4.4],[9.8,-22.4],[9.9,5.1],[12.6,-17.7],[6.2,-25.7],[20.9,18.2],[-18,5.5],[18.6,0.9],[-6.8,4.6],[3,-29.8],[17.6,2.3],[9.6,2.1],[21,12.6],[3.7,-15.6],[9.3,17.4]],"nuclei":[1],"type":2}],"share":[0.024,0.168,0.232,0.236],"freqs":[5,50,250,500],"lines":["Typical: fibres packed tight, a thin film of fluid between them. Most of the arm's water is inside the fibres.","Bigger fibres, as with strength training: more water inside the cells, so the share outside falls a little.","Smaller fibres, as with muscle loss: less water inside, so the share outside rises.","Extra fluid between the fibres: the share outside rises too. The ratio alone can't tell this from muscle loss."]};

function mount(fig) {
  const svg = fig.querySelector("svg");
  const q = (s) => svg.querySelector(s);
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const out = Object.fromEntries([...fig.querySelectorAll("[data-r]")].map((n) => [n.dataset.r, n]));
  const status = fig.querySelector("[data-status]");
  const line = fig.querySelector("[data-scene]");
  const sceneBtns = [...fig.querySelectorAll('[data-control="scene"] .opt-seg-btn')];
  const freqBtns = [...fig.querySelectorAll('[data-control="freq"] .opt-seg-btn')];
  const f1 = (v) => v.toFixed(1);
  const { C } = DATA;
  const set = (part, attr, v) => q(`[data-part="${part}"]`).setAttribute(attr, v);
  const S = WATER.scenes;
  const BASE = 0.88; // drawn fibre = 88 % of its cell, leaving the gap

  function smooth(points, k = 0.9) {
    const n = points.length;
    const at = (i) => points[(i + n) % n];
    let d = `M${f1(points[0][0])} ${f1(points[0][1])}`;
    for (let i = 0; i < n; i++) {
      const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
      d += `C${f1(p1[0] + ((p2[0] - p0[0]) / 6) * k)} ${f1(p1[1] + ((p2[1] - p0[1]) / 6) * k)} ${f1(p2[0] - ((p3[0] - p1[0]) / 6) * k)} ${f1(p2[1] - ((p3[1] - p1[1]) / 6) * k)} ${f1(p2[0])} ${f1(p2[1])}`;
    }
    return d + "Z";
  }
  const dot = (x, y, r) => `M${f1(x - r)} ${f1(y)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;

  // ---------------------------------------------------------------- state
  let scene = 0;
  let freq = 1;
  const g = { fibre: 1, spread: 1 };
  let dirty = true;
  const cur = [];
  const spreadPt = (p) => [C[0] + (p[0] - C[0]) * g.spread, C[1] + (p[1] - C[1]) * g.spread];
  const fibrePt = (cell, v, r = 1) => {
    const c = spreadPt(cell.c);
    return [c[0] + (v[0] - cell.c[0]) * BASE * g.fibre * r, c[1] + (v[1] - cell.c[1]) * BASE * g.fibre * r];
  };
  function drawTissue() {
    let f1d = "";
    let f2d = "";
    let myo = "";
    let nuc = "";
    DATA.cells.forEach((cell, i) => {
      const F = DATA.fibres[i];
      const d = smooth(cell.poly.map((v) => fibrePt(cell, v)));
      if (F.type === 1) f1d += d;
      else f2d += d;
      const c = spreadPt(cell.c);
      for (const [dx, dy] of F.dots) myo += dot(c[0] + dx * BASE * g.fibre, c[1] + dy * BASE * g.fibre, 1.2);
      for (const k of F.nuclei) {
        const v = cell.poly[k];
        const w = cell.poly[(k + 1) % cell.poly.length];
        const m = [(v[0] + w[0]) / 2, (v[1] + w[1]) / 2];
        const p = fibrePt(cell, m, 0.86);
        const ang = (Math.atan2(w[1] - v[1], w[0] - v[0]) * 180) / Math.PI;
        const ux = Math.cos((ang * Math.PI) / 180);
        const uy = Math.sin((ang * Math.PI) / 180);
        nuc += `M${f1(p[0] - ux * 5)} ${f1(p[1] - uy * 5)}A5 2.4 ${ang.toFixed(0)} 1 0 ${f1(p[0] + ux * 5)} ${f1(p[1] + uy * 5)}A5 2.4 ${ang.toFixed(0)} 1 0 ${f1(p[0] - ux * 5)} ${f1(p[1] - uy * 5)}Z`;
      }
    });
    set("fib1", "d", f1d);
    set("fib2", "d", f2d);
    set("myo", "d", myo);
    set("nuc", "d", nuc);
    set("caps", "d", DATA.caps.map((p) => dot(...spreadPt(p), 5.2)).join(""));
    set("capl", "d", DATA.caps.map((p) => dot(...spreadPt(p), 2.6)).join(""));
    for (const part of ["ecw", "peri"]) {
      const pad = part === "peri" ? 9 : 0;
      set(part, "rx", f1(DATA.RX * g.spread + pad));
      set(part, "ry", f1(DATA.RY * g.spread + pad));
    }
    drawBody();
  }
  // the 3-D bundle behind the slice: sheath, fluid, the outer fibres running back with their
  // cross-striations, capillaries in the grooves, a cylinder shade
  const B = DATA.body;
  function drawBody() {
    if (!B) return;
    const P = (sx, y, sy) => [B.o[0] + sx * B.ex[0] + y * B.ey[0] + (B.H - sy) * B.ez[0], B.o[1] + sx * B.ex[1] + y * B.ey[1] + (B.H - sy) * B.ez[1]];
    const R = (t, pad, y) => P(C[0] + Math.cos(t) * (DATA.RX * g.spread + pad), y, C[1] + Math.sin(t) * (DATA.RY * g.spread + pad));
    const L = (p, c = "L") => `${c}${f1(p[0])} ${f1(p[1])}`;
    const steps = (t0, t1) => {
      const n = Math.max(1, Math.ceil((t1 - t0) / 0.05));
      return Array.from({ length: n + 1 }, (_, i) => t0 + ((t1 - t0) * i) / n);
    };
    const band = (t0, t1, pad) => {
      const ts = steps(t0, t1);
      return ts.map((t, i) => L(R(t, pad, B.D), i ? "L" : "M")).join("") + [...ts].reverse().map((t) => L(R(t, pad, 0))).join("") + "Z";
    };
    const clampT = (t) => Math.max(B.ta, Math.min(B.tb, t < B.ta - 1 ? t + 2 * Math.PI : t));
    const all = band(B.ta, B.tb, 9);
    set("bodySheath", "d", all);
    set("bodyVeil", "d", all);
    set("bodyShade", "d", all);
    set("bodyGap", "d", band(B.ta, B.tb, 0));
    let f1d = "", f2d = "", stri = "", cap = "";
    for (const s of B.spans) {
      const m = (s.a0 + s.a1) / 2;
      const h = ((s.a1 - s.a0) / 2) * BASE * g.fibre / g.spread; // fibre share of its cell, as on the face
      const t0 = clampT(m - h);
      const t1 = clampT(m + h);
      if (t1 - t0 < 0.01) continue;
      const d = band(t0, t1, -0.5);
      if (s.type === 1) f1d += d;
      else f2d += d;
      for (let y = 5; y < B.D; y += 8) stri += steps(t0, t1).map((t, i) => L(R(t, -0.5, y), i ? "L" : "M")).join("");
      const tc = clampT(s.a1);
      if (tc > B.ta + 0.04 && tc < B.tb - 0.04) cap += L(R(tc, 0.6, B.D - 2), "M") + L(R(tc, 0.6, 2));
    }
    set("bodyF1", "d", f1d);
    set("bodyF2", "d", f2d);
    set("bodyStri", "d", stri);
    set("bodyCap", "d", cap);
    set("bodyEdge", "d", L(R(B.ta, 9, B.D), "M") + steps(B.ta, B.tb).map((t) => L(R(t, 9, 0))).join("") + L(R(B.tb, 9, B.D)));
    // the shade runs across the body, square to its axis
    const n = [-B.ey[1], B.ey[0]];
    const len = Math.hypot(...n);
    const u = [n[0] / len, n[1] / len];
    const pts = steps(B.ta, B.tb).flatMap((t) => [R(t, 9, 0), R(t, 9, B.D)]);
    const dots = pts.map((p) => p[0] * u[0] + p[1] * u[1]);
    const lo = pts[dots.indexOf(Math.min(...dots))];
    const span = Math.max(...dots) - Math.min(...dots);
    const grad = svg.querySelector("#a8-cyl");
    grad.setAttribute("x1", f1(lo[0]));
    grad.setAttribute("y1", f1(lo[1]));
    grad.setAttribute("x2", f1(lo[0] + u[0] * span));
    grad.setAttribute("y2", f1(lo[1] + u[1] * span));
  }
  function spawn(inside) {
    if (inside) {
      const i = Math.floor(Math.random() * DATA.cells.length);
      const cell = DATA.cells[i];
      const v = cell.poly[Math.floor(Math.random() * cell.poly.length)];
      return { inside, i, v, r: Math.sqrt(Math.random()) * 0.7, age: Math.random() * 0.6, life: 0.7 + Math.random() * 0.6 };
    }
    return { inside, p: DATA.gaps[Math.floor(Math.random() * DATA.gaps.length)], age: Math.random() * 0.6, life: 0.7 + Math.random() * 0.6 };
  }
  const N = 96;
  function stepCurrent(dt) {
    const want = Math.round(N * DATA.share[freq]);
    let inside = cur.filter((c) => c.inside).length;
    for (let k = cur.length - 1; k >= 0; k--) {
      const c = cur[k];
      c.age += dt;
      if (c.age > c.life) {
        cur.splice(k, 1);
        if (c.inside) inside--;
      }
    }
    while (cur.length < N) {
      const inn = inside < want;
      cur.push(spawn(inn));
      if (inn) inside++;
    }
  }
  function drawCurrent() {
    let ring = "";
    let dots = "";
    for (const c of cur) {
      const a = Math.sin(Math.PI * Math.min(1, c.age / c.life));
      if (a < 0.15) continue;
      const p = c.inside ? fibrePt(DATA.cells[c.i], c.v, c.r) : spreadPt(c.p);
      const rr = 2.2 + 2.4 * a;
      ring += dot(p[0], p[1], rr);
      dots += dot(p[0], p[1], 1.1);
    }
    set("curRing", "d", ring);
    set("curDot", "d", dots);
  }

  // ---------------------------------------------------------------- input, tour, loop
  function readout(quiet) {
    const sc = S[scene];
    const r = ratioOf(sc);
    out.ratio.textContent = r.toFixed(3);
    out.band.textContent = bandOf(r);
    out.through.textContent = `${Math.round(DATA.share[freq] * 100)}%`;
    line.textContent = DATA.lines[scene];
    sceneBtns.forEach((b, j) => {
      b.setAttribute("aria-checked", j === scene ? "true" : "false");
      b.tabIndex = j === scene ? 0 : -1;
    });
    freqBtns.forEach((b, j) => {
      b.setAttribute("aria-checked", j === freq ? "true" : "false");
      b.tabIndex = j === freq ? 0 : -1;
    });
    if (!quiet) status.textContent = `${sc.label}: ECW/TBW ${r.toFixed(3)}, ${bandOf(r)}. At ${DATA.freqs[freq]} kHz about ${Math.round(DATA.share[freq] * 100)}% of the current passes through the fibres.`;
  }
  let touring = true;
  let idle = -1e9;
  let tourClock = 0;
  const takeOver = () => {
    touring = false;
    idle = performance.now();
  };
  const wire = (btns, name, apply) => {
    btns.forEach((b, i) =>
      b.addEventListener("click", () => {
        takeOver();
        apply(i);
        readout();
        if (still.matches) renderStill();
      }),
    );
    for (const b of btns) b.addEventListener("pointerdown", takeOver);
    fig.querySelector(`[data-control="${name}"]`).addEventListener("keydown", (ev) => {
      const i = btns.indexOf(document.activeElement);
      if (i < 0) return;
      const j = ev.key === "ArrowRight" || ev.key === "ArrowDown" ? i + 1 : ev.key === "ArrowLeft" || ev.key === "ArrowUp" ? i - 1 : null;
      if (j === null) return;
      ev.preventDefault();
      const b = btns[(j + btns.length) % btns.length];
      b.focus();
      b.click();
    });
  };
  wire(sceneBtns, "scene", (i) => (scene = i));
  wire(freqBtns, "freq", (i) => (freq = i));
  function renderStill() {
    g.fibre = S[scene].fibre;
    g.spread = S[scene].spread;
    cur.length = 0;
    stepCurrent(0);
    drawTissue();
    drawCurrent();
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
    if (touring && (tourClock += dt) > 4.5) {
      // tour: walk the frequencies on the typical tissue, then the scenes at 50 kHz
      tourClock = 0;
      const steps = [[0, 0], [0, 1], [0, 3], [1, 1], [2, 1], [3, 1]];
      const at = steps.findIndex(([s, f]) => s === scene && f === freq);
      [scene, freq] = steps[(at + 1) % steps.length];
      readout(true);
    }
    const sc = S[scene];
    const e = 1 - Math.exp(-dt * 3);
    const before = g.fibre + g.spread;
    g.fibre += (sc.fibre - g.fibre) * e;
    g.spread += (sc.spread - g.spread) * e;
    if (Math.abs(g.fibre + g.spread - before) > 1e-5 || dirty) {
      drawTissue();
      dirty = false;
    }
    stepCurrent(dt);
    drawCurrent();
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
  renderStill();
  if (!still.matches) start();
}

class Fig extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    const root = this.attachShadow({ mode: "open" });
    const theme = this.getAttribute("theme") === "dark" ? "dark" : "light";
    root.innerHTML = "<style>" + "\n.iso{\n  --anatomy-page:#0b0b0b;--anatomy-card:#131313;--anatomy-text:#a3a3a3;--anatomy-strong:#e6e6e6;--anatomy-muted:#6e6e6e;\n  --anatomy-paper:#131313;--anatomy-face:#1b1b1b;--anatomy-top:#1c1c1c;\n  --anatomy-shade-0:#0f0f0f;--anatomy-shade-1:#121212;--anatomy-shade-2:#151515;--anatomy-shade-3:#181818;\n  --anatomy-lit-top:#262626;--anatomy-lit-shade:#1d1d1d;\n  --anatomy-hi:#d4d4d4;--anatomy-mid:#6a6a6a;--anatomy-lo:#3e3e3e;--anatomy-faint:#2a2a2a;--anatomy-lit:#ffffff;\n  --anatomy-halo:#050505;--anatomy-halo-opacity:.9;--anatomy-dot:#e6e6e6;\n  --anatomy-red:#ff6b6b;--anatomy-green:#6be0a0;--anatomy-blue:#6b9bff;\n  --anatomy-weight:.6px;--anatomy-ease:cubic-bezier(.32,.72,0,1);\n  --anatomy-mono:ui-monospace,\"SF Mono\",Menlo,Consolas,monospace;\n  --anatomy-lift:inset 0 1px 0 0 #ffffff0a,inset 0 0 0 1px #ffffff06,0 0 0 1px #00000026,0 1px 1px -.5px #00000014,0 3px 3px -1.5px #00000014,0 6px 6px -3px #00000014,0 12px 12px -6px #00000014;\n}\n.iso[data-theme=\"light\"]{\n  --anatomy-page:#f2f2ef;--anatomy-card:#fbfbfa;--anatomy-text:#57575a;--anatomy-strong:#18181a;--anatomy-muted:#8c8c90;\n  --anatomy-paper:#fbfbfa;--anatomy-face:#ffffff;--anatomy-top:#ffffff;\n  --anatomy-shade-0:#dcdcd9;--anatomy-shade-1:#e5e5e2;--anatomy-shade-2:#ededea;--anatomy-shade-3:#f4f4f1;\n  --anatomy-lit-top:#ffffff;--anatomy-lit-shade:#eeeeeb;\n  --anatomy-hi:#26262a;--anatomy-mid:#8a8a8f;--anatomy-lo:#b4b4b8;--anatomy-faint:#d4d4d6;--anatomy-lit:#000000;\n  --anatomy-halo:#8a8a80;--anatomy-halo-opacity:.32;--anatomy-dot:#3a3a3e;\n  --anatomy-red:#e5484d;--anatomy-green:#30a46c;--anatomy-blue:#3e63dd;\n  --anatomy-lift:inset 0 1px 0 0 #ffffff,0 0 0 1px #0000000f,0 1px 1px -.5px #0000000a,0 3px 3px -1.5px #0000000a,0 6px 6px -3px #0000000a,0 12px 12px -6px #0000000a;\n}\n.iso-svg{display:block;width:100%;height:auto;overflow:visible}\n.iso-svg path,.iso-svg circle{vector-effect:non-scaling-stroke}\n.iso-fill{fill:var(--anatomy-paper);stroke:none}\n.iso-solid[data-lit]>.iso-fill{fill:var(--anatomy-face)}\n.iso-shade,.iso-top{stroke:none}\n.iso-shade[data-shade=\"0\"]{fill:var(--anatomy-shade-0)}\n.iso-shade[data-shade=\"1\"]{fill:var(--anatomy-shade-1)}\n.iso-shade[data-shade=\"2\"]{fill:var(--anatomy-shade-2)}\n.iso-shade[data-shade=\"3\"]{fill:var(--anatomy-shade-3)}\n.iso-top{fill:var(--anatomy-top)}\n.iso-solid[data-lit]>.iso-top{fill:var(--anatomy-lit-top)}\n.iso-solid[data-lit]>.iso-shade{fill:var(--anatomy-lit-shade)}\n.iso-solid[data-seamless]>.iso-shade,.iso-solid[data-seamless]>.iso-top{stroke-width:.4;stroke-linejoin:round}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"0\"]{stroke:var(--anatomy-shade-0)}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"1\"]{stroke:var(--anatomy-shade-1)}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"2\"]{stroke:var(--anatomy-shade-2)}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"3\"]{stroke:var(--anatomy-shade-3)}\n.iso-solid[data-seamless]>.iso-top{stroke:var(--anatomy-top)}\n.iso-solid[data-seamless][data-lit]>.iso-top{stroke:var(--anatomy-lit-top)}\n.iso-solid[data-seamless][data-lit]>.iso-shade{stroke:var(--anatomy-lit-shade)}\n.iso-solid[data-lit]>.iso-edge{stroke:var(--anatomy-lit)}\n.iso-halo{fill:var(--anatomy-halo);stroke:none;filter:blur(9px);opacity:var(--anatomy-halo-opacity);transform:translateY(3px)}\n.iso-line{fill:none;stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight);stroke-linecap:round;stroke-linejoin:round}\n.iso-line[data-tone=\"hi\"]{stroke:var(--anatomy-hi)}\n.iso-line[data-tone=\"mid\"]{stroke:var(--anatomy-mid)}\n.iso-line[data-tone=\"lo\"]{stroke:var(--anatomy-lo)}\n.iso-line[data-tone=\"faint\"]{stroke:var(--anatomy-faint)}\n.iso-line[data-tone=\"lit\"]{stroke:var(--anatomy-lit)}\n.iso-line[data-tone=\"red\"]{stroke:var(--anatomy-red)}\n.iso-line[data-tone=\"green\"]{stroke:var(--anatomy-green)}\n.iso-line[data-tone=\"blue\"]{stroke:var(--anatomy-blue)}\n.iso-line[data-dotted]{stroke-dasharray:.01 3.5;stroke-width:1}\n.iso-line[data-dashed]{stroke-dasharray:3 3}\n.iso-line[data-flow]{stroke-dasharray:2 6}\n.iso-wire-end{fill:var(--anatomy-paper);stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight)}\n.iso-wire[data-tone=\"hi\"] .iso-wire-end{stroke:var(--anatomy-hi)}\n.iso-wire[data-tone=\"mid\"] .iso-wire-end{stroke:var(--anatomy-mid)}\n.iso-wire[data-tone=\"faint\"] .iso-wire-end{stroke:var(--anatomy-faint)}\n.iso-wire[data-tone=\"lit\"] .iso-wire-end{stroke:var(--anatomy-lit)}\n.iso-dots circle{fill:var(--anatomy-dot);stroke:none;opacity:.32}\n.iso-dots[data-tone=\"hi\"] circle{opacity:.85}\n.iso-dots[data-tone=\"mid\"] circle{opacity:.45}\n.iso-dots[data-tone=\"lo\"] circle{opacity:.22}\n.iso-dots[data-tone=\"faint\"] circle{opacity:.12}\n.iso-face-text{fill:var(--anatomy-mid);font-family:var(--anatomy-mono);letter-spacing:.04em}\n.iso-face-text[data-tone=\"hi\"]{fill:var(--anatomy-hi)}\n.iso-face-text[data-tone=\"lo\"]{fill:var(--anatomy-lo)}\n.iso-face-text[data-tone=\"faint\"]{fill:var(--anatomy-faint)}\n.tb-body{fill:var(--anatomy-shade-2);stroke:none}\n.tb-shine{fill:var(--anatomy-top);stroke:none}\n.tb-shade{fill:var(--anatomy-shade-0);stroke:none}\n.tb-ring{fill:none;stroke:var(--anatomy-lo);stroke-width:.45;stroke-linecap:butt;stroke-linejoin:round}\n.tb-ring[data-tone=\"mid\"]{stroke:var(--anatomy-mid)}\n.tb-ring[data-tone=\"faint\"]{stroke:var(--anatomy-faint)}\n.tb-ring[data-tone=\"hi\"]{stroke:var(--anatomy-hi)}\n@keyframes iso-flow{to{stroke-dashoffset:-32}}\n@keyframes iso-pulse{0%,100%{opacity:.18}12%{opacity:1}40%{opacity:.18}}\n.iso-line[data-flow]{animation:iso-flow 1600ms linear infinite}\n.iso-dots circle[data-pulse]{animation:iso-pulse 1600ms steps(1,end) infinite;animation-delay:var(--pulse-at,0ms)}\n.iso-figure{margin:32px 0 36px}\n.iso-plate{position:relative;padding:52px 24px;border-radius:0;background:var(--anatomy-card);box-shadow:0 0 0 1px var(--anatomy-mid);--anatomy-paper:var(--anatomy-card)}\n.iso-plate-corners{position:absolute;inset:18px 20px;pointer-events:none}\n.iso-plate-corner{position:absolute;color:var(--anatomy-muted);font-family:var(--anatomy-mono);font-size:10.5px;line-height:1;letter-spacing:.04em;white-space:nowrap}\n.iso-plate-corner[data-corner=\"fig\"]{top:0;left:0;color:var(--anatomy-text)}\n.iso-plate-corner[data-corner=\"title\"]{top:0;right:0;text-transform:uppercase;letter-spacing:.1em}\n.iso-plate-corner[data-corner=\"hint\"]{bottom:0;left:0;text-transform:uppercase;letter-spacing:.1em}\n.iso-plate-corner[data-corner=\"readout\"]{right:0;bottom:0;color:var(--anatomy-text);font-variant-numeric:tabular-nums}\n.iso-plate .iso-svg{margin:0 auto}\n.iso-legend{display:grid;gap:8px;margin-top:12px;color:var(--anatomy-muted);font-size:13px;line-height:1.55}\n.iso-keys{display:flex;flex-wrap:wrap;gap:6px 18px}\n.iso-key{display:inline-flex;align-items:center;gap:7px}\n.iso-swatch{width:16px;height:10px;flex:none;overflow:visible}\n.iso-swatch path{fill:none;stroke:var(--anatomy-hi);stroke-width:1;vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round}\n.iso-swatch[data-mark=\"raised\"] path,.iso-swatch[data-mark=\"flat\"] path{stroke:var(--anatomy-mid)}\n.iso-swatch[data-mark=\"lit\"] path{stroke:var(--anatomy-lit)}\n.iso-swatch[data-mark=\"dim\"] path{stroke:var(--anatomy-lo)}\n.iso-swatch[data-mark=\"dotted\"] path{stroke-dasharray:.01 3;stroke-width:1.4}\n.iso-swatch[data-mark=\"dashed\"] path{stroke-dasharray:3 2.5}\n.iso-swatch[data-mark=\"red\"] path{stroke:var(--anatomy-red)}\n.iso-swatch[data-mark=\"green\"] path{stroke:var(--anatomy-green)}\n.iso-swatch[data-mark=\"blue\"] path{stroke:var(--anatomy-blue)}\n.iso-swatch-crease{stroke:var(--anatomy-lo)!important}\n@media (max-width:560px){.iso-plate{padding:48px 12px 70px}.iso-plate-corner[data-corner=\"hint\"]{bottom:18px}}\n@media (prefers-reduced-motion:reduce){.iso-line[data-flow],.iso-dots circle[data-pulse]{animation:none}}\n/*\n * Optimal theme for Anatomy figures.\n *\n * Load AFTER the kit's ISO_CSS. Put `class=\"iso optimal\"` on the wrapper:\n *   - no data-theme  -> \"Forest night\"  (exam-room TV, dark)\n *   - data-theme=\"light\" -> \"Cream\"     (beoptimal.ca, the primary target)\n *\n * Values come from the live site (beoptimal-landing src/index.css), the\n * Performance package design and the ALE visualizer spec. The kit's grey\n * ramps are warmed so solids sit on the site's cream paper, and the single\n * \"lit\" accent is Optimal forest green instead of pure black/white.\n */\n\n.iso.optimal {\n  /* Forest night (dark) */\n  --anatomy-page: #152511;\n  --anatomy-card: #1c3118;\n  --anatomy-text: #c9cdbf;\n  --anatomy-strong: #fffcf7;\n  --anatomy-muted: #8e9884;\n  --anatomy-paper: #1c3118;\n  --anatomy-face: #253821;\n  --anatomy-top: #283c24;\n  --anatomy-shade-0: #172812;\n  --anatomy-shade-1: #1a2c16;\n  --anatomy-shade-2: #1e321a;\n  --anatomy-shade-3: #22371e;\n  --anatomy-lit-top: #34492f;\n  --anatomy-lit-shade: #2a3f26;\n  --anatomy-hi: #e9e6dc;\n  --anatomy-mid: #7e8a74;\n  --anatomy-lo: #4d5c46;\n  --anatomy-faint: #33452e;\n  --anatomy-lit: #fffcf7;\n  --anatomy-halo: #0b1508;\n  --anatomy-halo-opacity: 0.9;\n  --anatomy-dot: #e9e6dc;\n  --anatomy-red: #e0745f;\n  --anatomy-green: #8cc67f;\n  --anatomy-blue: #7fa8d9;\n  --anatomy-mono: \"JetBrains Mono\", ui-monospace, \"SF Mono\", Menlo, Consolas, monospace;\n\n  /* Optimal extras (use sparingly; colour only when colour is the subject) */\n  --opt-display: \"Castoro\", Georgia, serif;\n  --opt-ui: \"Public Sans\", system-ui, sans-serif;\n  --opt-forest: #2c4e25;\n  --opt-forest-light: #519044;\n  --opt-sage: #5e7a59;\n  --opt-borderline: #c97b2d;\n  --opt-out: #b3402f;\n  --opt-heat: #ff9776;\n}\n\n.iso.optimal[data-theme=\"light\"] {\n  /* Cream (light) */\n  --anatomy-page: #fef8f1;\n  --anatomy-card: #fffcf7;\n  --anatomy-text: #3e3d39;\n  --anatomy-strong: #252525;\n  --anatomy-muted: #716e68; /* 4.97:1 on the cream card (was 4.46:1 for the legend) */\n  --anatomy-paper: #fffcf7;\n  --anatomy-face: #fffefb;\n  --anatomy-top: #fffefb;\n  --anatomy-shade-0: #ddd7cc;\n  --anatomy-shade-1: #e7e2d9;\n  --anatomy-shade-2: #f0ede5;\n  --anatomy-shade-3: #f6f3ec;\n  --anatomy-lit-top: #fffefb;\n  --anatomy-lit-shade: #efebe2;\n  --anatomy-hi: #252525;\n  --anatomy-mid: #8a867e;\n  --anatomy-lo: #b9b4aa;\n  --anatomy-faint: #d9d3c8;\n  --anatomy-lit: #2c4e25;\n  --anatomy-halo: #8a8070;\n  --anatomy-halo-opacity: 0.3;\n  --anatomy-dot: #3a3833;\n  --anatomy-red: #b3402f;\n  --anatomy-green: #3f7a35;\n  --anatomy-blue: #3e6a8f;\n}\n\n/* Card typography: brand fonts for titles and readouts, kit mono for plate corners */\n.iso.optimal .iso-plate-title,\n.iso.optimal [data-role=\"title\"] {\n  font-family: var(--opt-display);\n  letter-spacing: -0.02em;\n}\n.iso.optimal [data-role=\"readout\"],\n.iso.optimal .iso-readout {\n  font-family: var(--opt-ui);\n  font-feature-settings: \"tnum\" 1, \"ss01\" 1;\n}\n\n/*\n * Card layout for Optimal figures (shared/page.mjs `plate`).\n * Phone first: the drawing, then a row of real buttons (>=44 px), then a footer\n * where the hint and the readout wrap instead of overlapping at 320 px.\n */\n.iso.optimal {\n  --opt-rule: rgba(233, 230, 220, 0.16);\n  --opt-btn: rgba(233, 230, 220, 0.06);\n  --opt-btn-on: #e9e6dc;\n  --opt-btn-on-text: #1c3118;\n  --opt-title: #fffcf7;\n  --opt-fig: #8cc67f;\n  --opt-heat-ink: #ff9776;\n  --opt-heat-glow: rgba(255, 151, 118, 0.55);\n  --opt-heat-wash: rgba(255, 151, 118, 0.16);\n  --opt-cold-ink: #9cc3e6;\n}\n.iso.optimal[data-theme=\"light\"] {\n  --opt-rule: rgba(44, 78, 37, 0.2);\n  --opt-btn: #fffcf7;\n  --opt-btn-on: #2c4e25;\n  --opt-btn-on-text: #fffcf7;\n  --opt-title: #2c4e25;\n  --opt-fig: #5e7a59;\n  --opt-heat-ink: #c8552e;\n  --opt-heat-glow: rgba(232, 108, 64, 0.42);\n  --opt-heat-wash: rgba(255, 151, 118, 0.22);\n  --opt-cold-ink: #3e6a8f;\n}\n.iso.optimal .opt-plate {\n  padding: 52px 24px 20px;\n  box-shadow: 0 0 0 1px var(--opt-rule);\n  border-radius: 2px;\n}\n.iso.optimal .iso-plate-corner[data-corner=\"fig\"] {\n  font-family: var(--opt-display);\n  font-style: italic;\n  font-size: 15px;\n  letter-spacing: 0;\n  color: var(--opt-fig);\n  top: -2px;\n}\n.iso.optimal .iso-plate-corner[data-corner=\"title\"] {\n  font-family: var(--opt-display);\n  font-size: 17px;\n  text-transform: none;\n  letter-spacing: -0.01em;\n  color: var(--opt-title);\n  top: -4px;\n}\n.iso.optimal .opt-controls {\n  display: flex;\n  flex-wrap: wrap;\n  justify-content: center;\n  gap: 8px 12px;\n  margin: 10px 0 0;\n}\n.iso.optimal .opt-seg {\n  display: inline-flex;\n  border-radius: 999px;\n  box-shadow: inset 0 0 0 1px var(--opt-rule);\n  padding: 3px;\n  gap: 2px;\n  max-width: 100%;\n}\n.iso.optimal .opt-seg-btn {\n  appearance: none;\n  border: 0;\n  margin: 0;\n  min-height: 44px;\n  min-width: min-content; /* never shrink a label below its longest word (with the padding, always ≥ 44 px) */\n  padding: 0 16px;\n  border-radius: 999px;\n  background: transparent;\n  color: var(--anatomy-text);\n  font: 500 14px/1.1 var(--opt-ui);\n  letter-spacing: 0;\n  cursor: pointer;\n  touch-action: manipulation;\n  -webkit-tap-highlight-color: transparent;\n  transition: background-color 240ms var(--anatomy-ease), color 240ms var(--anatomy-ease);\n}\n/* A zero-height 30 px strut keeps every option at least 44 px wide, even \"Arm\", \"Leg\" or \"+5%\" with the\n   7 px padding below 350 px (min-content alone let them shrink to 36 px). */\n.iso.optimal .opt-seg-btn::after {\n  content: \"\";\n  display: block;\n  width: 30px;\n  height: 0;\n  margin: 0 auto;\n}\n.iso.optimal .opt-seg-btn[aria-checked=\"true\"] {\n  background: var(--opt-btn-on);\n  color: var(--opt-btn-on-text);\n}\n.iso.optimal .opt-seg-btn:focus-visible {\n  outline: 2px solid var(--opt-fig);\n  outline-offset: 2px;\n}\n.iso.optimal .opt-foot {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: flex-end;\n  justify-content: space-between;\n  gap: 10px 20px;\n  margin-top: 16px;\n}\n.iso.optimal .opt-hint {\n  font-family: var(--anatomy-mono);\n  font-size: 10.5px;\n  line-height: 1.4;\n  letter-spacing: 0.1em;\n  text-transform: uppercase;\n  color: var(--anatomy-muted);\n  flex: 1 1 160px;\n  min-width: 0;\n}\n.iso.optimal .opt-readout {\n  display: grid;\n  grid-auto-flow: column;\n  gap: 4px 18px;\n  margin: 0;\n  font-family: var(--opt-ui);\n  font-feature-settings: \"tnum\" 1;\n}\n.iso.optimal .opt-stat { margin: 0; min-width: 0; }\n.iso.optimal .opt-stat dt {\n  font-size: 10px;\n  font-weight: 600;\n  letter-spacing: 0.12em;\n  text-transform: uppercase;\n  color: var(--anatomy-muted);\n  white-space: nowrap;\n}\n.iso.optimal .opt-stat dd {\n  margin: 1px 0 0;\n  font-size: 15px;\n  font-weight: 500;\n  color: var(--anatomy-strong);\n  white-space: nowrap;\n}\n.iso.optimal .iso-legend { font-family: var(--opt-ui); font-size: 13.5px; }\n.iso.optimal .iso-caption { color: var(--anatomy-text); }\n.iso.optimal .iso-caption em { font-style: italic; }\n.iso.optimal .iso-swatch[data-mark=\"heat\"] path { stroke: var(--opt-heat-ink); stroke-width: 2; }\n.iso.optimal .iso-stage { outline: none; border-radius: 4px; touch-action: pan-y; -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none; }\n.iso.optimal .iso-stage:focus-visible { outline: 1px solid var(--anatomy-muted); outline-offset: 6px; }\n@media (max-width: 560px) {\n  .iso.optimal .opt-plate { padding: 44px 10px 14px; }\n  .iso.optimal .iso-plate-corners { inset: 16px 12px; }\n  .iso.optimal .opt-readout { grid-auto-flow: row; grid-template-columns: repeat(4, minmax(0, auto)); width: 100%; justify-content: space-between; gap: 4px 10px; order: -1; }\n  .iso.optimal .opt-stat dd { font-size: 14px; }\n  /* a long label wraps onto two lines instead of running into its neighbour; values stay on one baseline */\n  .iso.optimal .opt-stat { display: flex; flex-direction: column; justify-content: space-between; }\n  .iso.optimal .opt-stat dt { white-space: normal; line-height: 1.25; }\n  .iso.optimal .opt-seg-btn { padding: 0 12px; font-size: 13.5px; }\n}\n@media (max-width: 350px) {\n  .iso.optimal .opt-seg-btn { padding: 0 7px; font-size: 12.5px; }\n  .iso.optimal .opt-stat dt { font-size: 9px; letter-spacing: 0.08em; }\n  .iso.optimal .opt-stat dd { font-size: 13px; }\n}\n\n:host{display:block}\n.opt-host{background:transparent;color:var(--anatomy-text);font:15px/1.6 var(--opt-ui);-webkit-font-smoothing:antialiased}\n.opt-host *{box-sizing:border-box}\n.opt-host .iso-figure{margin:0}\n/* A8 · muscle in cross-section: two fibre types in a stained-section red, fluid between them in\n   a cool blue, capillaries with a red lumen, current as bright ⊙ marks. */\n.iso.optimal {\n  --a8-f1a: #a8434a; --a8-f1b: #7c2a33; --a8-f2a: #c0636a; --a8-f2b: #93404a; --a8-fib-edge: #f0a4a0;\n  --a8-myo: rgba(255, 210, 205, 0.22); --a8-nuc: #5a4aa8;\n  --a8-e0: #1d4a62; --a8-e1: #143447; --a8-peri: #e8dcc6; --a8-peri-edge: #b9a77f;\n  --a8-cap: #e8b4a8; --a8-capl: #c43a32;\n  --a8-cur: #9ff3ff; --a8-cur-glow: rgba(159, 243, 255, 0.25);\n  --a8-loc-arm: #b98a7a; --a8-loc-cut: #9ff3ff;\n}\n.iso.optimal[data-theme=\"light\"] {\n  --a8-f1a: #c95a62; --a8-f1b: #9e3a44; --a8-f2a: #e48d90; --a8-f2b: #c46a70; --a8-fib-edge: #7a2a30;\n  --a8-myo: rgba(110, 20, 30, 0.2); --a8-nuc: #3d2f8a;\n  --a8-e0: #cfe9f4; --a8-e1: #a9d3e6; --a8-peri: #f4ead4; --a8-peri-edge: #9f8c62;\n  --a8-cap: #f6d4cb; --a8-capl: #b8302a;\n  --a8-cur: #0b6f86; --a8-cur-glow: rgba(11, 111, 134, 0.18);\n  --a8-loc-arm: #e3b8a8; --a8-loc-cut: #0b6f86;\n}\n.a8-f1a { stop-color: var(--a8-f1a); } .a8-f1b { stop-color: var(--a8-f1b); }\n.a8-f2a { stop-color: var(--a8-f2a); } .a8-f2b { stop-color: var(--a8-f2b); }\n.a8-e0 { stop-color: var(--a8-e0); } .a8-e1 { stop-color: var(--a8-e1); }\n.a8-peri { fill: var(--a8-peri); stroke: var(--a8-peri-edge); stroke-width: 1.2; }\n.a8-ecw { stroke: var(--a8-peri-edge); stroke-width: 0.8; }\n.a8-fibre { stroke: var(--a8-fib-edge); stroke-width: 1.1; stroke-opacity: 0.7; }\n.a8-myo { fill: var(--a8-myo); }\n.a8-nuc { fill: var(--a8-nuc); opacity: 0.9; }\n.a8-cap { fill: var(--a8-cap); stroke: var(--a8-capl); stroke-width: 0.6; }\n.a8-cap-lumen { fill: var(--a8-capl); }\n.a8-cur-ring { fill: var(--a8-cur-glow); stroke: var(--a8-cur); stroke-width: 1.4; }\n.a8-cur-dot { fill: var(--a8-cur); }\n.a8-loc-arm { fill: var(--a8-loc-arm); opacity: 0.85; }\n.a8-loc-cut { fill: none; stroke: var(--a8-loc-cut); stroke-width: 2; stroke-dasharray: 3 2; }\n.a8-loc-arrow { fill: none; stroke: var(--a8-loc-cut); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }\n.iso.optimal .iso-swatch[data-mark=\"fibre\"] path { stroke: var(--a8-f2a); stroke-width: 6; stroke-linecap: round; }\n.iso.optimal .iso-swatch[data-mark=\"ecw\"] path { stroke: var(--a8-e1); stroke-width: 6; stroke-linecap: round; }\n.iso.optimal .iso-swatch[data-mark=\"cur\"] path { stroke: var(--a8-cur); stroke-width: 5; stroke-linecap: round; stroke-dasharray: 0.1 6; }\n.a8-scene { margin: 10px 4px 0; font: 500 14px/1.45 var(--opt-ui); color: var(--anatomy-text); min-height: 4.4em; }\n.a8-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }\n.a8-par { display: block; margin-top: 6px; }\n.a8-par:first-child { margin-top: 0; }\n.a8-par small { font-size: 12.5px; color: var(--anatomy-muted); }\n/* the 3-D bundle behind the slice */\n.a8-body-sheath { fill: var(--a8-peri); }\n.a8-body-gap { fill: var(--a8-e1); }\n.a8-body-f1 { fill: var(--a8-f1b); }\n.a8-body-f2 { fill: var(--a8-f2b); }\n.a8-body-stri { fill: none; stroke: var(--a8-fib-edge); stroke-width: 0.6; opacity: 0.3; }\n.a8-body-cap { fill: none; stroke: var(--a8-capl); stroke-width: 2.2; stroke-linecap: round; opacity: 0.8; }\n.a8-body-veil { fill: var(--a8-peri); opacity: 0.14; }\n.a8-body-edge { fill: none; stroke: var(--a8-peri-edge); stroke-width: 1.2; stroke-linejoin: round; }\n.a8-g0 { stop-color: #fff; stop-opacity: 0.2; } .a8-g1 { stop-color: #fff; stop-opacity: 0; } .a8-g2 { stop-color: #000; stop-opacity: 0.34; }\n" + "</style><div class=\"iso optimal opt-host\" data-theme=\"" + theme + "\">" + "<figure class=\"iso-figure opt-figure \"><div class=\"iso-plate opt-plate\"><div class=\"iso-plate-corners\" aria-hidden=\"true\"><span class=\"iso-plate-corner\" data-corner=\"fig\">A8</span><span class=\"iso-plate-corner\" data-corner=\"title\">Water in and around the fibres</span></div><div class=\"iso-stage a8-stage\"><svg class=\"iso-svg a8-svg\" viewBox=\"0 0 600 520\" role=\"img\" aria-label=\"A slice across a bundle of muscle fibres from the upper arm. Packed fibres, each with nuclei at its edge and myofibrils inside, are separated by narrow gaps of fluid, with small capillaries in the corners. Symbols show InBody's current flowing along the arm, toward the viewer: at low frequency it flows only in the fluid between the fibres, at higher frequencies some of it passes through the fibres too. Changing the scene makes the fibres bigger or smaller, or adds fluid between them.\">\n<defs>\n  <radialGradient id=\"a8-fib1\" cx=\"40%\" cy=\"36%\" r=\"75%\"><stop offset=\"0\" class=\"a8-f1a\"/><stop offset=\"1\" class=\"a8-f1b\"/></radialGradient>\n  <radialGradient id=\"a8-fib2\" cx=\"40%\" cy=\"36%\" r=\"75%\"><stop offset=\"0\" class=\"a8-f2a\"/><stop offset=\"1\" class=\"a8-f2b\"/></radialGradient>\n  <radialGradient id=\"a8-ecw\" cx=\"50%\" cy=\"50%\" r=\"60%\"><stop offset=\"0\" class=\"a8-e0\"/><stop offset=\"1\" class=\"a8-e1\"/></radialGradient>\n<linearGradient id=\"a8-cyl\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" class=\"a8-g0\"/><stop offset=\"0.38\" class=\"a8-g1\"/><stop offset=\"1\" class=\"a8-g2\"/></linearGradient>\n</defs>\n<g class=\"a8-body\" aria-hidden=\"true\">\n<path class=\"a8-body-sheath\" data-part=\"bodySheath\"/><path class=\"a8-body-gap\" data-part=\"bodyGap\"/>\n<path class=\"a8-body-f1\" data-part=\"bodyF1\"/><path class=\"a8-body-f2\" data-part=\"bodyF2\"/>\n<path class=\"a8-body-stri\" data-part=\"bodyStri\"/><path class=\"a8-body-cap\" data-part=\"bodyCap\"/>\n<path class=\"a8-body-veil\" data-part=\"bodyVeil\"/><path data-part=\"bodyShade\" fill=\"url(#a8-cyl)\"/>\n<path class=\"a8-body-edge\" data-part=\"bodyEdge\"/>\n</g>\n<g class=\"a8-front\" transform=\"matrix(0.6774 0.1465 0.0000 0.7009 53.54 33.28)\">\n<ellipse class=\"a8-peri\" data-part=\"peri\" cx=\"300\" cy=\"248\" rx=\"247\" ry=\"185\"/>\n<ellipse class=\"a8-ecw\" data-part=\"ecw\" cx=\"300\" cy=\"248\" rx=\"238\" ry=\"176\" fill=\"url(#a8-ecw)\"/>\n<path class=\"a8-cap\" data-part=\"caps\"/><path class=\"a8-cap-lumen\" data-part=\"capl\"/>\n<path class=\"a8-fibre a8-fibre1\" data-part=\"fib1\" fill=\"url(#a8-fib1)\"/>\n<path class=\"a8-fibre a8-fibre2\" data-part=\"fib2\" fill=\"url(#a8-fib2)\"/>\n<path class=\"a8-myo\" data-part=\"myo\"/>\n<path class=\"a8-nuc\" data-part=\"nuc\"/>\n<path class=\"a8-cur-ring\" data-part=\"curRing\"/><path class=\"a8-cur-dot\" data-part=\"curDot\"/>\n</g>\n<g class=\"a8-loc\" aria-hidden=\"true\" transform=\"translate(18 444)\">\n  <path class=\"a8-loc-arm\" d=\"M4 22C20 8 52 4 84 8C112 12 132 16 148 24L146 50C130 56 108 58 84 58C54 58 24 54 6 44Z\"/>\n  <ellipse class=\"a8-loc-cut\" cx=\"78\" cy=\"33\" rx=\"9\" ry=\"25\"/>\n  <path class=\"a8-loc-arrow\" d=\"M100 33h30m-6 -5l6 5l-6 5\"/>\n</g>\n</svg></div><p class=\"a8-scene\" data-scene>Typical: fibres packed tight, a thin film of fluid between them. Most of the arm's water is inside the fibres.</p><span class=\"a8-sr\" role=\"status\" aria-live=\"polite\" data-status></span><div class=\"opt-controls\"><div class=\"opt-seg\" role=\"radiogroup\" aria-label=\"Fibres and fluid\" data-control=\"scene\"><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"typical\" aria-checked=\"true\" tabindex=\"0\">Typical</button><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"bigger\" aria-checked=\"false\" tabindex=\"-1\">Bigger</button><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"smaller\" aria-checked=\"false\" tabindex=\"-1\">Smaller</button><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"fluid\" aria-checked=\"false\" tabindex=\"-1\">Extra fluid</button></div><div class=\"opt-seg\" role=\"radiogroup\" aria-label=\"Frequency\" data-control=\"freq\"><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"5\" aria-checked=\"false\" tabindex=\"-1\">5 kHz</button><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"50\" aria-checked=\"true\" tabindex=\"0\">50 kHz</button><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"250\" aria-checked=\"false\" tabindex=\"-1\">250 kHz</button><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"500\" aria-checked=\"false\" tabindex=\"-1\">500 kHz</button></div></div><div class=\"opt-foot\"><span class=\"opt-hint\">Change the fibres or the fluid · then the frequency</span><dl class=\"opt-readout\" data-readout aria-hidden=\"true\"><div class=\"opt-stat\" data-stat=\"ratio\"><dt>ECW / TBW</dt><dd data-r=\"ratio\">0.380</dd></div><div class=\"opt-stat\" data-stat=\"band\"><dt>InBody band</dt><dd data-r=\"band\">Normal</dd></div><div class=\"opt-stat\" data-stat=\"through\"><dt>Through cells</dt><dd data-r=\"through\">17%</dd></div></dl></div></div><figcaption class=\"iso-legend\"><span class=\"iso-keys\"><span class=\"iso-key\"><svg class=\"iso-swatch\" data-mark=\"fibre\" viewBox=\"0 0 16 10\" aria-hidden=\"true\"><path d=\"M1.5 5h13\"/></svg>Muscle fibre (water inside: ICW)</span><span class=\"iso-key\"><svg class=\"iso-swatch\" data-mark=\"ecw\" viewBox=\"0 0 16 10\" aria-hidden=\"true\"><path d=\"M1.5 5h13\"/></svg>Fluid between fibres (ECW)</span><span class=\"iso-key\"><svg class=\"iso-swatch\" data-mark=\"cur\" viewBox=\"0 0 16 10\" aria-hidden=\"true\"><path d=\"M1.5 5h13\"/></svg>Current, flowing toward you</span></span><span class=\"iso-caption\"><span class=\"a8-par\">Most of the body's water sits inside cells, and much of that inside muscle fibres. The rest bathes the cells and fills the blood. InBody's current runs along the arm (toward you in this slice, ⊙). At low frequency, cell membranes block it, so it flows only through the fluid between the fibres; that reading gives extracellular water (ECW). At higher frequencies some current crosses the membranes, adding the water inside (ICW) to give total body water (TBW).</span><span class=\"a8-par\">ECW/TBW is the share outside. It rises if fibres shrink (0.399 here) or if fluid collects between them (0.413), so a high number says the balance has shifted, not why. Bigger fibres nudge it down (0.369).</span><span class=\"a8-par\"><small>A teaching model: skeletal muscle is taken to hold about half the body's water, and only the muscle changes in each scene; values are typical, not a measurement of anyone. Bands follow InBody's result sheet: under 0.390 normal, 0.390–⁠0.400 slightly over, above 0.400 over. Fibres drawn far larger than life (a fibre is about the width of a hair).</small></span></span></figcaption></figure>" + "</div>";
    mount(root.querySelector(".opt-figure"));
  }
}
customElements.define("optimal-fig-muscle-water", Fig);
})();
