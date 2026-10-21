/* optimal-fig-iv-iron: Optimal Health explainer figure. Built with Anatomy (MIT). Generated; do not edit. */
(() => {
if (customElements.get("optimal-fig-iv-iron")) return;
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

const G = (() => {

const TAU = Math.PI * 2;
const LIGHT_UP = 1.2;
const BANDS = [0, 0.2, 0.42, 0.62];

const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul3 = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const len3 = (a) => Math.hypot(a[0], a[1], a[2]);
const unit3 = (a) => {
  const length = len3(a) || 1;
  return [a[0] / length, a[1] / length, a[2] / length];
};
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

function viewOf(P) {
  const { sinA, cosA, sinE, cosE } = cameraOf(P);
  return [cosA * cosE, sinA * cosE, sinE];
}

function lightOf(P) {
  const { sinA, cosA } = cameraOf(P);
  return unit3([-sinA, cosA, LIGHT_UP]);
}

const scaleOf = (P) => cameraOf(P).k;

function bandOf(score) {
  let tone = 0;
  while (tone < BANDS.length && score >= BANDS[tone]) tone++;
  return tone;
}

const toneOf = (normal, P) => bandOf(dot3(unit3(normal), lightOf(P)));

function frameAlong(o, a) {
  const axis = unit3(a);
  const helper = Math.abs(axis[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1];
  const u = unit3(cross3(helper, axis));
  const v = cross3(axis, u);
  return { o, a: axis, u, v };
}

const frameOf = (o, a, u, v) => ({ o, a, u, v });

function pointOf(F, s, r, angle) {
  const c = Math.cos(angle);
  const n = Math.sin(angle);
  return [
    F.o[0] + F.a[0] * s + r * (c * F.u[0] + n * F.v[0]),
    F.o[1] + F.a[1] * s + r * (c * F.u[1] + n * F.v[1]),
    F.o[2] + F.a[2] * s + r * (c * F.u[2] + n * F.v[2]),
  ];
}

const radialOf = (F, angle) => {
  const c = Math.cos(angle);
  const n = Math.sin(angle);
  return [c * F.u[0] + n * F.v[0], c * F.u[1] + n * F.v[1], c * F.u[2] + n * F.v[2]];
};

const tangentOf = (F, angle) => {
  const c = Math.cos(angle);
  const n = Math.sin(angle);
  return [-n * F.u[0] + c * F.v[0], -n * F.u[1] + c * F.v[1], -n * F.u[2] + c * F.v[2]];
};

const angleToward = (F, direction) => Math.atan2(dot3(direction, F.v), dot3(direction, F.u));

function hullTagged(points) {
  const sorted = [...points].sort((a, b) => a.p[0] - b.p[0] || a.p[1] - b.p[1]);
  if (sorted.length < 3) return sorted;
  const cross = (o, a, b) => (a.p[0] - o.p[0]) * (b.p[1] - o.p[1]) - (a.p[1] - o.p[1]) * (b.p[0] - o.p[0]);
  const lower = [];
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 1e-9) lower.pop();
    lower.push(point);
  }
  const upper = [];
  for (let index = sorted.length - 1; index >= 0; index--) {
    const point = sorted[index];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 1e-9) upper.pop();
    upper.push(point);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

const hullOf = (points) => hullTagged(points.map((p) => ({ p }))).map(({ p }) => p);

function runsOf(flags) {
  const count = flags.length;
  const start = flags.findIndex((flag, index) => flag !== flags[(index + count - 1) % count]);
  if (start < 0) return flags[0] ? [Array.from({ length: count + 1 }, (_, index) => index % count)] : [];
  const runs = [];
  let run = null;
  for (let step = 0; step < count; step++) {
    const index = (start + step) % count;
    if (flags[index]) {
      if (!run) run = [index];
      run.push((index + 1) % count);
    } else if (run) {
      runs.push(run);
      run = null;
    }
  }
  if (run) runs.push(run);
  return runs;
}

function groupsOf(keys) {
  const count = keys.length;
  const out = [];
  const start = keys.findIndex((key, index) => key !== keys[(index + count - 1) % count]);
  if (start < 0) {
    if (keys[0] !== null) out.push({ key: keys[0], run: Array.from({ length: count + 1 }, (_, index) => index % count) });
    return out;
  }
  let current = null;
  for (let step = 0; step < count; step++) {
    const index = (start + step) % count;
    const key = keys[index];
    if (current && current.key === key) {
      current.run.push((index + 1) % count);
      continue;
    }
    if (current && current.key !== null) out.push(current);
    current = { key, run: [index, (index + 1) % count] };
  }
  if (current && current.key !== null) out.push(current);
  return out;
}

const stepsFor = (radius, least = 16, most = 112, scale = 0) => Math.max(least, Math.min(most, scale ? Math.ceil((TAU * radius * scale) / 3) : Math.round((radius * 1.3) / 4) * 4));

function chains(edges) {
  const out = [];
  let current = null;
  for (const [a, b, keep] of edges) {
    if (!keep) {
      if (current) out.push(current);
      current = null;
      continue;
    }
    if (!current) current = [a];
    current.push(b);
  }
  if (current) out.push(current);
  if (out.length > 1 && edges[0][2] && edges[edges.length - 1][2]) {
    const last = out.pop();
    out[0] = [...last, ...out[0].slice(1)];
  }
  return out;
}

function labelledArcs(nr, na, view, light, gr = nr, ga = na) {
  const cuts = [];
  if (Math.abs(gr) > 1e-9) {
    const visibleCut = -(ga * view.a) / (gr * view.flat);
    if (visibleCut > -1 && visibleCut < 1) {
      const d = Math.acos(visibleCut);
      cuts.push(view.phi - d, view.phi + d);
    }
  }
  if (Math.abs(nr) > 1e-9) {
    for (const threshold of BANDS) {
      const c = (threshold - na * light.a) / (nr * light.flat);
      if (c > -1 && c < 1) {
        const d = Math.acos(c);
        cuts.push(light.phi - d, light.phi + d);
      }
    }
  }
  const wrap = (angle) => ((angle % TAU) + TAU) % TAU;
  const sorted = [...new Set(cuts.map((angle) => Math.round(wrap(angle) * 1e9) / 1e9))].sort((a, b) => a - b);
  const label = (angle) => {
    const facing = gr * view.flat * Math.cos(angle - view.phi) + ga * view.a;
    if (facing <= 1e-9) return -1;
    return bandOf(nr * light.flat * Math.cos(angle - light.phi) + na * light.a);
  };
  if (!sorted.length) {
    const tone = label(0);
    return tone < 0 ? [] : [{ tone, from: 0, to: TAU, full: true }];
  }
  const arcs = sorted.map((from, index) => {
    const to = index + 1 < sorted.length ? sorted[index + 1] : sorted[0] + TAU;
    return { tone: label((from + to) / 2), from, to };
  });
  const merged = [];
  for (const arc of arcs) {
    const last = merged[merged.length - 1];
    if (last && last.tone === arc.tone && Math.abs(last.to - arc.from) < 1e-9) last.to = arc.to;
    else merged.push({ ...arc });
  }
  if (merged.length > 1 && merged[0].tone === merged[merged.length - 1].tone && Math.abs(merged[merged.length - 1].to - TAU - merged[0].from) < 1e-9) {
    const last = merged.pop();
    merged[0].from = last.from - TAU;
  }
  return merged.filter((arc) => arc.tone >= 0);
}

function hermiteSlopes(run) {
  const n = run.length - 1;
  const h = Array.from({ length: n }, (_, j) => run[j + 1][0] - run[j][0]);
  const delta = h.map((value, j) => (run[j + 1][1] - run[j][1]) / value);
  const d = new Array(n + 1).fill(0);
  const end = (h0, h1, d0, d1) => {
    let value = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1);
    if (Math.sign(value) !== Math.sign(d0)) value = 0;
    else if (Math.sign(d0) !== Math.sign(d1) && Math.abs(value) > Math.abs(3 * d0)) value = 3 * d0;
    return value;
  };
  if (n === 1) d[0] = d[1] = delta[0];
  else {
    d[0] = end(h[0], h[1], delta[0], delta[1]);
    d[n] = end(h[n - 1], h[n - 2], delta[n - 1], delta[n - 2]);
  }
  for (let k = 1; k < n; k++) {
    if (delta[k - 1] * delta[k] <= 0) continue;
    const w1 = 2 * h[k] + h[k - 1];
    const w2 = h[k] + 2 * h[k - 1];
    d[k] = (w1 + w2) / (w1 / delta[k - 1] + w2 / delta[k]);
  }
  return d;
}

function curveRuns(meridian) {
  const m = meridian.length;
  const segments = new Array(m - 1).fill(null);
  let start = 0;
  while (start < m - 1) {
    let end = start + 1;
    while (end < m - 1 && meridian[end][2] && Math.abs(meridian[end + 1][0] - meridian[end][0]) > 1e-9 && Math.abs(meridian[end][0] - meridian[end - 1][0]) > 1e-9) end++;
    const run = meridian.slice(start, end + 1);
    const n = run.length - 1;
    if (n >= 2 && run.every((point, j) => j === 0 || Math.abs(point[0] - run[j - 1][0]) > 1e-9)) {
      const d = hermiteSlopes(run);
      for (let j = 0; j < n; j++) {
        const [s0, r0] = run[j];
        const [s1, r1] = run[j + 1];
        const hj = s1 - s0;
        const d0 = d[j];
        const d1 = d[j + 1];
        const radius = (s) => {
          const t = (s - s0) / hj;
          return (2 * t ** 3 - 3 * t ** 2 + 1) * r0 + (t ** 3 - 2 * t ** 2 + t) * hj * d0 + (-2 * t ** 3 + 3 * t ** 2) * r1 + (t ** 3 - t ** 2) * hj * d1;
        };
        const slope = (s) => {
          const t = (s - s0) / hj;
          return ((6 * t ** 2 - 6 * t) * r0 + (6 * t - 6 * t ** 2) * r1) / hj + (3 * t ** 2 - 4 * t + 1) * d0 + (3 * t ** 2 - 2 * t) * d1;
        };
        segments[start + j] = { radius, slope };
      }
    }
    start = end;
  }
  return segments;
}

function curved(meridian, P, segments, { error = 0.2, depth = 6 } = {}) {
  const k = scaleOf(P);
  const out = [meridian[0]];
  for (let i = 0; i < meridian.length - 1; i++) {
    const curve = segments[i];
    const [s0] = meridian[i];
    const [s1] = meridian[i + 1];
    if (curve) {
      const split = (a, b, level) => {
        const mid = (a + b) / 2;
        const chord = (curve.radius(a) + curve.radius(b)) / 2;
        if (level < depth && Math.abs(curve.radius(mid) - chord) * k > error) {
          split(a, mid, level + 1);
          out.push([mid, curve.radius(mid), 1]);
          split(mid, b, level + 1);
        }
      };
      split(s0, s1, 0);
    }
    out.push(meridian[i + 1]);
  }
  return out;
}

function smoothRows(meridian, F, P, { rows = 6, slope = null, radius = null, steps = 48, error = 0.35, depth: deepest = 8, fineness = 0.1 } = {}) {
  const V = viewOf(P);
  const L = lightOf(P);
  const view = { a: dot3(F.a, V), flat: Math.hypot(dot3(F.u, V), dot3(F.v, V)), phi: Math.atan2(dot3(F.v, V), dot3(F.u, V)) };
  const light = { a: dot3(F.a, L), flat: Math.hypot(dot3(F.u, L), dot3(F.v, L)), phi: Math.atan2(dot3(F.v, L), dot3(F.u, L)) };
  const m = meridian.length;
  const faces = [];
  for (let i = 0; i < m - 1; i++) {
    const ds = meridian[i + 1][0] - meridian[i][0];
    const dr = meridian[i + 1][1] - meridian[i][1];
    const length = Math.hypot(ds, dr) || 1;
    faces.push([ds / length, -dr / length]);
  }
  const splines = slope ? null : curveRuns(meridian);
  const vertexNormal = (k, own) => {
    if (k <= 0 || k >= m - 1 || !meridian[k][2]) return own;
    const a = faces[k - 1];
    const b = faces[k];
    const x = a[0] + b[0];
    const y = a[1] + b[1];
    const length = Math.hypot(x, y) || 1;
    return [x / length, y / length];
  };
  const normalAt = (i, u) => {
    const [s0] = meridian[i];
    const [s1] = meridian[i + 1];
    const s = s0 + (s1 - s0) * u;
    const sign = Math.sign(s1 - s0) || 1;
    const g = slope ? slope(s) : splines[i] ? splines[i].slope(s) : null;
    if (g !== null) {
      const length = Math.hypot(1, g);
      return [sign / length, (-sign * g) / length];
    }
    const a = vertexNormal(i, faces[i]);
    const b = vertexNormal(i + 1, faces[i]);
    const x = a[0] + (b[0] - a[0]) * u;
    const y = a[1] + (b[1] - a[1]) * u;
    const length = Math.hypot(x, y) || 1;
    return [x / length, y / length];
  };
  const pointAt = (i, u, angle) => {
    const [s0, r0] = meridian[i];
    const [s1, r1] = meridian[i + 1];
    const s = s0 + (s1 - s0) * u;
    return iso(pointOf(F, s, radius ? radius(s) : splines && splines[i] ? splines[i].radius(s) : r0 + (r1 - r0) * u, angle), P);
  };
  const buckets = [[], [], [], [], []];
  const fine = TAU / Math.max(24, Math.min(192, steps * 1.5));
  const arcPoints = (i, u, from, to) => {
    const count = Math.max(1, Math.ceil((to - from) / fine));
    return Array.from({ length: count + 1 }, (_, index) => pointAt(i, u, from + ((to - from) * index) / count));
  };
  const centreOf = (arc, reference) => {
    let mid = (arc.from + arc.to) / 2 - reference;
    mid = ((mid % TAU) + TAU) % TAU;
    return mid;
  };
  const levelOf = (i, u) => {
    const [nr, na] = normalAt(i, u);
    const groups = new Map();
    for (const arc of labelledArcs(nr, na, view, light, faces[i][0], faces[i][1])) {
      if (!groups.has(arc.tone)) groups.set(arc.tone, []);
      groups.get(arc.tone).push(arc);
    }
    for (const list of groups.values()) list.sort((x, y) => centreOf(x, light.phi) - centreOf(y, light.phi));
    return { i, u, groups };
  };
  const same = (x, y) => {
    if (x.groups.size !== y.groups.size) return false;
    for (const [tone, list] of x.groups) if ((y.groups.get(tone) ?? []).length !== list.length) return false;
    return true;
  };
  const align = (reference, arc) => {
    const out = { ...arc };
    const centre = (reference.from + reference.to) / 2;
    while ((out.from + out.to) / 2 - centre > Math.PI) {
      out.from -= TAU;
      out.to -= TAU;
    }
    while (centre - (out.from + out.to) / 2 > Math.PI) {
      out.from += TAU;
      out.to += TAU;
    }
    return out;
  };
  const strayOf = (i, a, mid, b) => {
    let worst = 0;
    for (const [tone, list] of mid.groups) {
      list.forEach((arc, index) => {
        const lo = align(arc, a.groups.get(tone)[index]);
        const hi = align(arc, b.groups.get(tone)[index]);
        for (const key of ["from", "to"]) {
          const p = pointAt(i, mid.u, arc[key]);
          const p0 = pointAt(i, a.u, lo[key]);
          const p1 = pointAt(i, b.u, hi[key]);
          worst = Math.max(worst, Math.hypot(p[0] - (p0[0] + p1[0]) / 2, p[1] - (p0[1] + p1[1]) / 2));
        }
      });
    }
    return worst;
  };
  const sheet = (tone, levels) => {
    levels[0].groups.get(tone).forEach((arc, index) => {
      const chain = [arc];
      for (let k = 1; k < levels.length; k++) chain.push(align(chain[k - 1], levels[k].groups.get(tone)[index]));
      const last = levels.length - 1;
      const points = [...arcPoints(levels[0].i, levels[0].u, chain[0].from, chain[0].to)];
      for (let k = 1; k < last; k++) points.push(pointAt(levels[k].i, levels[k].u, chain[k].to));
      points.push(...arcPoints(levels[last].i, levels[last].u, chain[last].from, chain[last].to).reverse());
      for (let k = last - 1; k >= 1; k--) points.push(pointAt(levels[k].i, levels[k].u, chain[k].from));
      buckets[tone].push(pathOf(oriented(points), true));
    });
  };
  const overlap = (x, y) => Math.min(x.to, y.to) - Math.max(x.from, y.from);
  const strip = (tone, a, b) => {
    const below = a.groups.get(tone) ?? [];
    const above = (b.groups.get(tone) ?? []).map((arc) => ({ arc, used: false }));
    const quad = (lo, hi) => {
      const points = [...arcPoints(a.i, a.u, lo.from, lo.to), ...arcPoints(b.i, b.u, hi.from, hi.to).reverse()];
      buckets[tone].push(pathOf(oriented(points), true));
    };
    for (const arc of below) {
      let best = null;
      let score = -Infinity;
      for (const entry of above) {
        if (entry.used) continue;
        const aligned = align(arc, entry.arc);
        const value = overlap(arc, aligned);
        if (value > score) (score = value), (best = entry);
      }
      if (best && score > -0.05) {
        best.used = true;
        quad(arc, align(arc, best.arc));
      } else {
        const centre = (arc.from + arc.to) / 2;
        quad(arc, { from: centre, to: centre });
      }
    }
    for (const entry of above) {
      if (entry.used) continue;
      const centre = (entry.arc.from + entry.arc.to) / 2;
      quad({ from: centre, to: centre }, entry.arc);
    }
  };
  const k = scaleOf(P);
  let run = [];
  const flush = () => {
    const tones = [...new Set(run.flatMap((level) => [...level.groups.keys()]))].sort((x, y) => x - y);
    for (const tone of tones) {
      const countOf = (level) => (level.groups.get(tone) ?? []).length;
      let start = 0;
      for (let at = 1; at <= run.length; at++) {
        if (at < run.length && countOf(run[at - 1]) === countOf(run[at])) continue;
        if (at - 1 > start && countOf(run[start])) sheet(tone, run.slice(start, at));
        if (at < run.length) strip(tone, run[at - 1], run[at]);
        start = at;
      }
    }
    run = [];
  };
  for (let i = 0; i < m - 1; i++) {
    const ds = meridian[i + 1][0] - meridian[i][0];
    if (Math.abs(ds) < 1e-9) {
      flush();
      continue;
    }
    const count = Math.max(1, rows);
    const reach = (Math.hypot(ds, meridian[i + 1][1] - meridian[i][1]) * k) / count;
    const limit = Math.max(1, Math.min(deepest, Math.ceil(Math.log2(Math.max(2, reach / fineness)))));
    const coarse = Array.from({ length: count + 1 }, (_, index) => levelOf(i, index / count));
    run.push(coarse[0]);
    const refine = (a, b, depth) => {
      const mid = levelOf(i, (a.u + b.u) / 2);
      const split = depth < limit && (!same(a, b) || !same(a, mid) || (depth < 6 && strayOf(i, a, mid, b) > error));
      if (!split) {
        run.push(b);
        return;
      }
      refine(a, mid, depth + 1);
      refine(mid, b, depth + 1);
    };
    for (let index = 1; index <= count; index++) refine(coarse[index - 1], coarse[index], 0);
  }
  flush();
  return buckets;
}

function sideOf(meridian) {
  const m = meridian.length;
  let first = 0;
  let last = m - 1;
  if (meridian[0][1] <= 1e-9) first = 1;
  if (meridian[m - 1][1] <= 1e-9) last = m - 2;
  const side = meridian.slice(first, last + 1);
  for (let index = 1; index < side.length; index++) if (side[index][0] - side[index - 1][0] <= 1e-9) return null;
  return side.length >= 3 ? side : null;
}

function surfaceOf(side, F, P, rims, { samples = 96, slope = null } = {}) {
  const V = viewOf(P);
  const aV = dot3(F.a, V);
  const facing = Math.atan2(dot3(F.v, V), dot3(F.u, V));
  const [left, right] = silhouettePoints(side, F, P, { samples, slope });
  if (left.length <= samples || right.length <= samples) return null;
  const s0 = side[0][0];
  const s1 = side[side.length - 1][0];
  const angleOf = (point) => angleToward(F, sub3(point, add3(F.o, mul3(F.a, dot3(sub3(point, F.o), F.a)))));
  const wrap = (angle) => ((angle % TAU) + TAU) % TAU;
  const arc = (s, r, from, to, through) => {
    let sweep = wrap(to - from);
    if (wrap(through - from) > sweep) sweep -= TAU;
    const count = Math.max(4, Math.ceil(Math.abs(sweep) / (TAU / 96)), Math.ceil((Math.abs(sweep) * r * scaleOf(P)) / 1.5));
    return Array.from({ length: count + 1 }, (_, index) => iso(pointOf(F, s, r, from + (sweep * index) / count), P));
  };
  const r0 = side[0][1];
  const r1 = side[side.length - 1][1];
  const bottom = -aV > 0 ? facing + Math.PI : facing;
  const top = aV > 0 ? facing + Math.PI : facing;
  const L = left.map((point) => iso(point, P));
  const R = right.map((point) => iso(point, P));
  const topArc = arc(s1, r1, angleOf(left[left.length - 1]), angleOf(right[right.length - 1]), top);
  const bottomArc = arc(s0, r0, angleOf(right[0]), angleOf(left[0]), bottom);
  const keepFirst = rims === "all" || rims === "first" || rims === "ends";
  const keepLast = rims === "all" || rims === "last" || rims === "ends";
  const fill = pathOf([...L, ...topArc, ...[...R].reverse(), ...bottomArc], true);
  const outline = [pathOf(L), pathOf(R), keepLast ? pathOf(topArc) : "", keepFirst ? pathOf(bottomArc) : ""].join("");
  const hull = hullOf([...arc(s0, r0, 0, TAU - 1e-6, Math.PI), ...arc(s1, r1, 0, TAU - 1e-6, Math.PI), ...L, ...R]);
  let gap = 0;
  for (const p of [...L, ...R]) {
    let best = Infinity;
    for (let index = 0; index < hull.length; index++) {
      const a = hull[index];
      const b = hull[(index + 1) % hull.length];
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
      best = Math.min(best, Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t));
    }
    gap = Math.max(gap, best);
  }
  return { fill, outline, gap };
}

const softOf = (meridian) => meridian.some((point) => Boolean(point[2]));

function lathe(meridian, F, P, { steps = stepsFor(Math.max(...meridian.map(([, r]) => r)), 32, 160, scaleOf(P)), fill = "auto", hole = null, bevel = 0, rims = "all", smooth: asked = "auto", waist = 0.5 } = {}) {
  const smooth = asked === "auto" ? softOf(meridian) : asked;
  const V = viewOf(P);
  const L = lightOf(P);
  const aV = dot3(F.a, V);
  const uV = dot3(F.u, V);
  const vV = dot3(F.v, V);
  const aL = dot3(F.a, L);
  const uL = dot3(F.u, L);
  const vL = dot3(F.v, L);
  const n = steps;
  const m = meridian.length;
  const rings = meridian.map(([s, r]) => Array.from({ length: n }, (_, j) => iso(pointOf(F, s, r, (j / n) * TAU), P)));
  const midC = [];
  const midS = [];
  for (let j = 0; j < n; j++) {
    const t = ((j + 0.5) / n) * TAU;
    midC.push(Math.cos(t));
    midS.push(Math.sin(t));
  }
  const seen = [];
  const tones = [];
  for (let i = 0; i < m - 1; i++) {
    const ds = meridian[i + 1][0] - meridian[i][0];
    const dr = meridian[i + 1][1] - meridian[i][1];
    const length = Math.hypot(ds, dr);
    const row = [];
    const toneRow = [];
    for (let j = 0; j < n; j++) {
      if (length < 1e-9) {
        row.push(false);
        toneRow.push(0);
        continue;
      }
      const facing = ds * (midC[j] * uV + midS[j] * vV) - dr * aV;
      const lit = (ds * (midC[j] * uL + midS[j] * vL) - dr * aL) / length;
      row.push(facing > 1e-6 * length);
      toneRow.push(bandOf(lit));
    }
    seen.push(row);
    tones.push(toneRow);
  }
  const buckets = [[], [], [], [], []];
  const all = [];
  const smoothed = smooth ? smoothRows(meridian, F, P, { steps, ...(smooth === true ? {} : smooth) }) : null;
  if (smoothed) smoothed.forEach((list, tone) => list.forEach((d) => (buckets[tone].push(d), all.push(d))));
  for (let i = 0; i < m - 1; i++) {
    if (smoothed && Math.abs(meridian[i + 1][0] - meridian[i][0]) > 1e-9) continue;
    const keys = seen[i].map((visible, j) => (visible ? tones[i][j] : null));
    for (const { key, run } of groupsOf(keys)) {
      const a = run.map((j) => rings[i][j]);
      const b = run.map((j) => rings[i + 1][j]).reverse();
      const d = pathOf(oriented([...a, ...b]), true);
      buckets[key].push(d);
      all.push(d);
    }
  }
  const phi = Math.atan2(vV, uV);
  const flatV = Math.hypot(uV, vV);
  const rangeOf = (i) => {
    const ds = meridian[i + 1][0] - meridian[i][0];
    const dr = meridian[i + 1][1] - meridian[i][1];
    if (Math.hypot(ds, dr) < 1e-9) return null;
    if (Math.abs(ds) < 1e-9 || flatV < 1e-9) return -dr * aV > 1e-9 ? [-1, 1] : null;
    const c = (dr * aV) / (ds * flatV);
    return ds > 0 ? [Math.max(-1, c), 1] : [-1, Math.min(1, c)];
  };
  const arcsOf = (ranges) => {
    if (ranges.some((range) => !range)) return [];
    const lo = Math.max(...ranges.map(([x]) => x));
    const hi = Math.min(...ranges.map(([, x]) => x));
    if (lo >= hi - 1e-9) return [];
    const near = Math.acos(Math.min(1, hi));
    const far = Math.acos(Math.max(-1, lo));
    if (hi >= 1 && lo <= -1) return [[phi, phi + TAU]];
    if (hi >= 1) return [[phi - far, phi + far]];
    if (lo <= -1) return [[phi + near, phi + TAU - near]];
    return [[phi + near, phi + far], [phi - far, phi - near]];
  };
  const along = (s, r, [from, to]) => {
    const count = Math.max(2, Math.ceil(((to - from) * Math.max(r, 1e-6) * scaleOf(P)) / 1.5));
    return Array.from({ length: count + 1 }, (_, j) => iso(pointOf(F, s, r, from + ((to - from) * j) / count), P));
  };
  const creases = [];
  for (let i = 1; i < m - 1; i++) {
    if (meridian[i][2] || meridian[i][1] <= 1e-9) continue;
    for (const arc of arcsOf([rangeOf(i - 1), rangeOf(i)])) creases.push(pathOf(along(meridian[i][0], meridian[i][1], arc)));
  }
  let bevelPath = "";
  if (bevel > 0 && m > 2) {
    const ends = [];
    if (meridian[0][1] <= 1e-9) ends.push([0, 1, 1]);
    if (meridian[m - 1][1] <= 1e-9) ends.push([m - 2, m - 2, m - 3]);
    for (const [cap, rim, side] of ends) {
      const [s, r] = meridian[rim];
      for (const arc of arcsOf([rangeOf(cap), rangeOf(side)])) {
        const inset = along(s, Math.max(0, r - bevel), arc);
        const edge = along(s, r, arc);
        bevelPath += pathOf([edge[0], ...inset.slice(1, -1), edge[edge.length - 1]]);
      }
    }
  }
  const { fill: fillPath, outline } = outlineOf(meridian, F, P, { steps: n, fill, hole, rims, smooth, waist, all });
  return {
    fill: fillPath,
    outline,
    crease: creases.join(""),
    top: buckets[4].join(""),
    shades: buckets.slice(0, 4).map((list) => list.join("")),
    bevel: bevelPath || undefined,
    seamless: Boolean(smoothed),
  };
}

function shapeOf(meridian, P, smooth) {
  if (smooth && smooth.radius) {
    const segments = meridian.slice(0, -1).map(([s0], index) => (Math.abs(meridian[index + 1][0] - s0) > 1e-9 ? { radius: smooth.radius, slope: smooth.slope } : null));
    return curved(meridian, P, segments);
  }
  const curves = smooth && !smooth.slope ? curveRuns(meridian) : null;
  return curves && curves.some(Boolean) ? curved(meridian, P, curves) : meridian;
}

function outlineOf(meridian, F, P, { steps = stepsFor(Math.max(...meridian.map(([, r]) => r)), 32, 160, scaleOf(P)), fill = "auto", hole = null, rims = "all", smooth: asked = "auto", waist = 0.5, all = null } = {}) {
  const smooth = asked === "auto" ? softOf(meridian) : asked;
  const n = steps;
  let fillPath;
  let outline;
  const shape = shapeOf(meridian, P, smooth);
  const side = fill === "auto" || fill === "surface" ? sideOf(shape) : null;
  const surface = side && !hole ? surfaceOf(side, F, P, rims, { slope: smooth && smooth.slope ? smooth.slope : null }) : null;
  if (surface && (fill === "surface" || surface.gap > waist)) {
    fillPath = surface.fill;
    outline = surface.outline;
  } else if (fill === "hull" || fill === "auto" || fill === "surface") {
    const most = Math.max(...shape.map(([, r]) => r));
    const around = Math.min(320, Math.max(n, Math.ceil((TAU * most * scaleOf(P)) / 1.5)));
    const tagged = [];
    shape.forEach(([s, r], index) => {
      for (let j = 0; j < around; j++) tagged.push({ p: iso(pointOf(F, s, r, (j / around) * TAU), P), ring: index });
    });
    const hull = hullTagged(tagged);
    const holePath = hole ? pathOf(Array.from({ length: around }, (_, j) => iso(pointOf(F, hole[0], hole[1], (j / around) * TAU), P)), true) : "";
    fillPath = pathOf(hull.map(({ p }) => p), true) + holePath;
    if (rims === "all") {
      outline = pathOf(hull.map(({ p }) => p), true) + holePath;
    } else {
      const keepFirst = rims === "first" || rims === "ends";
      const keepLast = rims === "last" || rims === "ends";
      const edges = hull.map((a, index) => {
        const b = hull[(index + 1) % hull.length];
        const same = a.ring === b.ring;
        const keep = !same || (a.ring !== 0 && a.ring !== shape.length - 1) || (keepFirst && a.ring === 0) || (keepLast && a.ring === shape.length - 1);
        return [a.p, b.p, keep];
      });
      outline = chains(edges).map((points) => pathOf(points)).join("") + holePath;
    }
  } else {
    fillPath = all ? all.join("") : (({ shades, top }) => [...shades, top].join(""))(lathe(meridian, F, P, { steps: n, fill: "auto", hole, rims, smooth, waist }));
    outline = "";
  }
  return { fill: fillPath, outline };
}

const signedArea = (points) => points.reduce((sum, [x, y], index) => {
  const [nx, ny] = points[(index + 1) % points.length];
  return sum + x * ny - nx * y;
}, 0);

const oriented = (points) => (signedArea(points) < 0 ? [...points].reverse() : points);

const saddleStart = (R, a, angle) => Math.sqrt(Math.max(0, R * R - a * a * Math.cos(angle) ** 2));

function saddleOf(F, a, start, s1, P, { steps = stepsFor(a, 24) } = {}) {
  const V = viewOf(P);
  const L = lightOf(P);
  const n = steps;
  const angle = (j) => (j / n) * TAU;
  const from = typeof start === "function" ? start : (t) => saddleStart(start, a, t);
  const low = Array.from({ length: n }, (_, j) => iso(pointOf(F, from(angle(j)), a, angle(j)), P));
  const high = Array.from({ length: n }, (_, j) => iso(pointOf(F, s1, a, angle(j)), P));
  const seen = [];
  const tones = [];
  for (let j = 0; j < n; j++) {
    const normal = radialOf(F, angle(j + 0.5));
    seen.push(dot3(normal, V) > 1e-6);
    tones.push(bandOf(dot3(normal, L)));
  }
  const buckets = [[], [], [], [], []];
  const fills = [];
  const keys = seen.map((visible, j) => (visible ? tones[j] : null));
  for (const { key, run } of groupsOf(keys)) {
    const d = pathOf(oriented([...run.map((j) => low[j]), ...run.map((j) => high[j]).reverse()]), true);
    buckets[key].push(d);
    fills.push(d);
  }
  const capSeen = dot3(F.a, V) > 1e-6;
  if (capSeen) {
    const d = pathOf(oriented(high), true);
    buckets[bandOf(dot3(F.a, L))].push(d);
    fills.push(d);
  }
  const front = runsOf(seen);
  const back = runsOf(seen.map((visible) => !visible));
  const edges = [];
  for (const run of front) {
    edges.push(pathOf(run.map((j) => low[j])));
    edges.push(pathOf([low[run[0]], high[run[0]]]), pathOf([low[run[run.length - 1]], high[run[run.length - 1]]]));
  }
  for (const run of capSeen ? back : front) edges.push(pathOf(run.map((j) => high[j])));
  return {
    fill: fills.join(""),
    outline: edges.join(""),
    crease: capSeen ? front.map((run) => pathOf(run.map((j) => high[j]))).join("") : "",
    top: buckets[4].join(""),
    shades: buckets.slice(0, 4).map((list) => list.join("")),
    seamless: true,
  };
}

function prismOf(F, polygon, s0, s1, P) {
  const V = viewOf(P);
  const L = lightOf(P);
  const ring = oriented(polygon.map(([x, y]) => [x, y]));
  const n = ring.length;
  const at = (s, [x, y]) => [F.o[0] + F.a[0] * s + F.u[0] * x + F.v[0] * y, F.o[1] + F.a[1] * s + F.u[1] * x + F.v[1] * y, F.o[2] + F.a[2] * s + F.u[2] * x + F.v[2] * y];
  const low = ring.map((point) => iso(at(s0, point), P));
  const high = ring.map((point) => iso(at(s1, point), P));
  const buckets = [[], [], [], [], []];
  const seen = [];
  for (let j = 0; j < n; j++) {
    const [x0, y0] = ring[j];
    const [x1, y1] = ring[(j + 1) % n];
    const normal = unit3(add3(mul3(F.u, y1 - y0), mul3(F.v, -(x1 - x0))));
    const visible = dot3(normal, V) > 1e-6;
    seen.push(visible);
    if (visible) buckets[bandOf(dot3(normal, L))].push(pathOf([low[j], low[(j + 1) % n], high[(j + 1) % n], high[j]], true));
  }
  const ends = [[s0, low, mul3(F.a, -1)], [s1, high, F.a]];
  const capSeen = ends.map(([, , normal]) => dot3(normal, V) > 1e-6);
  ends.forEach(([, points, normal], index) => capSeen[index] && buckets[bandOf(dot3(normal, L))].push(pathOf(points, true)));
  const hull = hullOf([...low, ...high]);
  const creases = [];
  for (let j = 0; j < n; j++) {
    const prev = (j - 1 + n) % n;
    const a = [ring[j][0] - ring[prev][0], ring[j][1] - ring[prev][1]];
    const b = [ring[(j + 1) % n][0] - ring[j][0], ring[(j + 1) % n][1] - ring[j][1]];
    const sharp = (a[0] * b[0] + a[1] * b[1]) / (Math.hypot(a[0], a[1]) * Math.hypot(b[0], b[1]) || 1) < Math.cos(0.35);
    if (sharp && seen[j] && seen[prev]) creases.push(pathOf([low[j], high[j]]));
    ends.forEach(([, points], index) => capSeen[index] && seen[j] && creases.push(pathOf([points[j], points[(j + 1) % n]])));
  }
  return { fill: pathOf(hull, true), outline: pathOf(hull, true), crease: creases.join(""), top: buckets[4].join(""), shades: buckets.slice(0, 4).map((list) => list.join("")) };
}

function stadium(r0, r1, offset, steps = 32) {
  const circle = (cx, r) => Array.from({ length: steps }, (_, index) => [cx + r * Math.cos((index / steps) * TAU), r * Math.sin((index / steps) * TAU)]);
  return hullOf([...circle(0, r0), ...circle(offset, r1)]);
}

function sphereOf(centre, r, P, { steps = 48 } = {}) {
  const V = viewOf(P);
  const L = lightOf(P);
  const F = frameAlong(centre, V);
  const flat = (p) => iso(p, P);
  const rim = Array.from({ length: steps }, (_, index) => pointOf(F, 0, r, (index / steps) * TAU));
  const outline = pathOf(rim.map(flat), true);
  const capOf = (threshold) => {
    const points = rim.filter((p) => dot3(sub3(p, centre), L) / r >= threshold).map(flat);
    const c = dot3(L, V);
    const LF = frameAlong(add3(centre, mul3(L, r * threshold)), L);
    const radius = r * Math.sqrt(Math.max(0, 1 - threshold * threshold));
    for (let index = 0; index < steps; index++) {
      const p = pointOf(LF, 0, radius, (index / steps) * TAU);
      if (dot3(sub3(p, centre), V) >= -1e-9) points.push(flat(p));
    }
    if (c > threshold) points.push(flat(add3(centre, mul3(V, r))));
    return points.length > 2 ? pathOf(hullOf(points), true) : "";
  };
  const shades = [outline, capOf(BANDS[1]), capOf(BANDS[2]), capOf(BANDS[3])];
  return { fill: outline, outline, crease: "", top: "", shades, seamless: true };
}

const disc = (s0, s1, r, F, P, options = {}) =>
  lathe(
    [
      [s0, 0],
      [s0, r],
      [s1, r],
      [s1, 0],
    ],
    F,
    P,
    { steps: stepsFor(r, 32, 160, scaleOf(P)), ...options },
  );

const ringBand = (s0, s1, rIn, rOut, F, P, options = {}) =>
  lathe(
    [
      [s0, rIn],
      [s0, rOut],
      [s1, rOut],
      [s1, rIn],
    ],
    F,
    P,
    { steps: stepsFor(rOut, 32, 160, scaleOf(P)), hole: null, ...options },
  );

function solidOf(profile, F, P, options = {}) {
  const first = profile[0];
  const last = profile[profile.length - 1];
  const meridian = [[first[0], 0], ...profile, [last[0], 0]];
  const most = Math.max(...profile.map(([, r]) => r));
  return lathe(meridian, F, P, { steps: stepsFor(most, 32, 160, scaleOf(P)), ...options });
}

function bandOfProfile(profile, F, P, options = {}) {
  const most = Math.max(...profile.map(([, r]) => r));
  return lathe(profile, F, P, { steps: stepsFor(most, 32, 160, scaleOf(P)), ...options });
}

function silhouettePoints(profile, F, P, { samples = 72, slope: given = null, radius = null } = {}) {
  const V = viewOf(P);
  const aV = dot3(F.a, V);
  const uV = dot3(F.u, V);
  const vV = dot3(F.v, V);
  const facing = Math.atan2(vV, uV);
  const flat = Math.hypot(uV, vV) || 1e-9;
  const s0 = profile[0][0];
  const s1 = profile[profile.length - 1][0];
  const radiusAt = radius ?? ((s) => {
    let index = 1;
    while (index < profile.length - 1 && profile[index][0] < s) index++;
    const [sa, ra] = profile[index - 1];
    const [sb, rb] = profile[index];
    return ra + ((rb - ra) * (s - sa)) / (sb - sa || 1);
  });
  const side = (sign) => {
    const points = [];
    for (let step = 0; step <= samples; step++) {
      const s = s0 + ((s1 - s0) * step) / samples;
      const h = (s1 - s0) / samples / 2 || 0.01;
      const slope = given ? given(s) : (radiusAt(Math.min(s1, s + h)) - radiusAt(Math.max(s0, s - h))) / (Math.min(s1, s + h) - Math.max(s0, s - h) || 1);
      const c = (slope * aV) / flat;
      if (Math.abs(c) > 1) continue;
      points.push(pointOf(F, s, radiusAt(s), facing + sign * Math.acos(c)));
    }
    return points;
  };
  return [side(1), side(-1)];
}

const silhouetteOf = (profile, F, P, options = {}) =>
  silhouettePoints(profile, F, P, options)
    .map((points) => pathOf(points.map((point) => iso(point, P))))
    .join("");

function profileCurve(profile, { slope = null, radius = null } = {}) {
  for (let index = 1; index < profile.length; index++) if (profile[index][0] - profile[index - 1][0] <= 1e-9) throw new Error(`profileCurve: s must rise along the profile (point ${index} at s = ${profile[index][0]})`);
  const segments = curveRuns(profile);
  const s0 = profile[0][0];
  const s1 = profile[profile.length - 1][0];
  const find = (s) => {
    let lo = 0;
    let hi = profile.length - 2;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (profile[mid][0] <= s) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };
  const linear = (index, s) => {
    const [sa, ra] = profile[index];
    const [sb, rb] = profile[index + 1];
    return [ra + ((rb - ra) * (s - sa)) / (sb - sa), (rb - ra) / (sb - sa)];
  };
  const radiusAt = radius ?? ((s) => {
    const at = Math.max(s0, Math.min(s1, s));
    const index = find(at);
    return segments[index] ? segments[index].radius(at) : linear(index, at)[0];
  });
  const slopeAt = slope ?? ((s) => {
    const at = Math.max(s0, Math.min(s1, s));
    const index = find(at);
    return segments[index] ? segments[index].slope(at) : linear(index, at)[1];
  });
  return { s0, s1, radius: radiusAt, slope: slopeAt, analytic: Boolean(slope && radius) };
}

function bandsOf(profile, cuts, F, P, { slope = null, radius = null, steps, rows = 6, rims = "none", fill = "auto", samples = 72 } = {}) {
  const curve = profileCurve(profile, { slope, radius });
  const { s0, s1 } = curve;
  const stops = [s0, ...[...new Set(cuts)].filter((s) => s > s0 + 1e-6 && s < s1 - 1e-6).sort((a, b) => a - b), s1];
  const most = Math.max(...profile.map(([, r]) => r), ...stops.map((s) => curve.radius(s)));
  const n = steps ?? stepsFor(most, 32, 160, scaleOf(P));
  const knot = (s, soft) => (soft ? [s, curve.radius(s), 1] : [s, curve.radius(s)]);
  const meridianOf = (a, b) => [knot(a), ...profile.filter(([s]) => s > a + 1e-9 && s < b - 1e-9).map(([s, , soft]) => knot(s, soft)), knot(b)];
  const shading = { slope: curve.slope, radius: curve.radius, rows };
  const bands = stops.slice(0, -1).map((a, index) => {
    const b = stops[index + 1];
    const meridian = meridianOf(a, b);
    const paths = lathe(meridian, F, P, { steps: n, rims, fill, smooth: shading });
    const seam = index < stops.length - 2 ? arcOf(F, b, curve.radius(b), P, { slope: curve.slope(b) }) : "";
    return { s0: a, s1: b, profile: meridian, paths: { ...paths, outline: "" }, outline: paths.outline, seam };
  });
  const sidesOf = (from = s0, to = s1, { ends = false, count = samples } = {}) => {
    const span = [Math.max(s0, from), Math.min(s1, to)];
    const dense = Array.from({ length: count + 1 }, (_, index) => knot(span[0] + ((span[1] - span[0]) * index) / count, true));
    const points = silhouettePoints(dense, F, P, { samples: count, slope: curve.slope, radius: curve.radius });
    const rim = (s) => arcOf(F, s, curve.radius(s), P, { slope: curve.slope(s) });
    const rimsAt = ends === true ? span : ends === "first" ? [span[0]] : ends === "last" ? [span[1]] : [];
    return { d: points.map((list) => pathOf(list.map((point) => iso(point, P)))).join("") + rimsAt.map(rim).join(""), points };
  };
  return { bands, sidesOf, radius: curve.radius, slope: curve.slope, steps: n, s0, s1 };
}

function arcOf(F, s, r, P, { slope = 0, steps = 0, least = 0.02, inward = false, from = 0, to = TAU, trim = 0.3 } = {}) {
  const V = viewOf(P);
  const aV = dot3(F.a, V);
  const uV = dot3(F.u, V);
  const vV = dot3(F.v, V);
  const flat = Math.hypot(uV, vV);
  const phi = Math.atan2(vV, uV);
  const norm = Math.hypot(1, slope);
  const full = Math.abs(to - from - TAU) < 1e-9;
  let visible;
  if (flat < 1e-9) visible = (inward ? slope * aV / norm > least : -slope * aV / norm > least) ? [[phi, phi + TAU]] : [];
  else if (inward) {
    const c = (slope * aV - least * norm) / flat;
    visible = c <= -1 ? [] : c >= 1 ? [[phi, phi + TAU]] : [[phi + Math.acos(c), phi + TAU - Math.acos(c)]];
  } else {
    const c = (least * norm + slope * aV) / flat;
    visible = c >= 1 ? [] : c <= -1 ? [[phi, phi + TAU]] : [[phi - Math.acos(c), phi + Math.acos(c)]];
  }
  const at = (t) => iso(pointOf(F, s, r, t), P);
  const speed = (t) => {
    const a = at(t - 1e-3);
    const b = at(t + 1e-3);
    return Math.hypot(b[0] - a[0], b[1] - a[1]) / 2e-3;
  };
  const count = (span) => Math.max(2, Math.ceil(((steps || stepsFor(r, 24, 112)) * span) / TAU), Math.ceil((span * r * scaleOf(P)) / 1.5));
  const out = [];
  for (const [a, b] of visible) {
    if (b - a >= TAU - 1e-9 && full) {
      const n = count(TAU);
      out.push(pathOf(Array.from({ length: n }, (_, j) => at(from + (j / n) * TAU)), true));
      continue;
    }
    const pieces = full ? [[a, b, true, true]] : [];
    if (!full)
      for (let turn = -2; turn <= 2; turn++) {
        const lo = Math.max(a + turn * TAU, from);
        const hi = Math.min(b + turn * TAU, to);
        if (hi - lo > 1e-6) pieces.push([lo, hi, lo > from + 1e-9, hi < to - 1e-9]);
      }
    for (const [lo, hi, limb0, limb1] of pieces) {
      const span = hi - lo;
      const cut0 = limb0 && trim > 0 ? Math.min(span * 0.25, trim / (speed(lo) || 1)) : 0;
      const cut1 = limb1 && trim > 0 ? Math.min(span * 0.25, trim / (speed(hi) || 1)) : 0;
      const t0 = lo + cut0;
      const t1 = hi - cut1;
      const n = count(t1 - t0);
      out.push(pathOf(Array.from({ length: n + 1 }, (_, j) => at(t0 + ((t1 - t0) * j) / n))));
    }
  }
  return out.join("");
}

function circleOf(F, s, r, P, steps = 0) {
  const count = steps || stepsFor(r, 24, 112);
  return pathOf(
    Array.from({ length: count }, (_, j) => iso(pointOf(F, s, r, (j / count) * TAU), P)),
    true,
  );
}

function spokesOf(F, s, r0, r1, count, P, { phase = 0, sweep = 0, from = 0, to = TAU } = {}) {
  const lines = [];
  for (let index = 0; index < count; index++) {
    const t = phase + from + (index / count) * (to - from);
    lines.push(pathOf([iso(pointOf(F, s, r0, t), P), iso(pointOf(F, s, r1, t + sweep), P)]));
  }
  return lines.join("");
}

const fadeOf = (value, [lo, hi]) => {
  const t = Math.max(0, Math.min(1, (value - lo) / (hi - lo || 1e-9)));
  return t * t * (3 - 2 * t);
};

function ribsOf(F, s0, s1, r, count, P, { phase = 0, twist = 0, least = 0.12, r1 = r, fade = null, seams = false } = {}) {
  const V = viewOf(P);
  const lines = [];
  const slope = (r1 - r) / (s1 - s0 || 1);
  for (let index = 0; index < count; index++) {
    const t = phase + (index / count) * TAU;
    const radial = radialOf(F, t + twist / 2);
    const normal = unit3([radial[0] - slope * F.a[0], radial[1] - slope * F.a[1], radial[2] - slope * F.a[2]]);
    const facing = dot3(normal, V);
    const d = pathOf([iso(pointOf(F, s0, r, t), P), iso(pointOf(F, s1, r1, t + twist), P)]);
    if (fade) {
      const alpha = fadeOf(facing, fade);
      if (alpha > 0.02) lines.push({ d, alpha });
      continue;
    }
    if (facing < least) continue;
    lines.push(d);
  }
  const ends = seams ? [seams === "last" ? "" : arcOf(F, s0, r, P, { slope }), seams === "first" ? "" : arcOf(F, s1, r1, P, { slope })].filter(Boolean) : [];
  if (fade) return [...lines, ...ends.map((d) => ({ d, alpha: 1 }))];
  return [...lines, ...ends].join("");
}

function rodOut(F, from, to, r, P, { stroke = 0, ...options } = {}) {
  const pad = 0.35 / scaleOf(P);
  const ring = (s) => Array.from({ length: 48 }, (_, index) => iso(pointOf(F, s, r + pad, (index / 48) * TAU), P));
  return {
    paths: disc(from - stroke, to, r, F, P, options),
    clip: pathOf(hullOf([...ring(from), ...ring(to + stroke)]), true),
    from,
    to,
    stroke,
    reach: to + stroke,
  };
}

function dotsOf(F, s, r, count, P, { phase = 0, slope = 0, least = 0.08, all = false, fade = null } = {}) {
  const V = viewOf(P);
  const out = [];
  for (let index = 0; index < count; index++) {
    const t = phase + (index / count) * TAU;
    let alpha = 1;
    if (!all) {
      const radial = radialOf(F, t);
      const normal = unit3([radial[0] - slope * F.a[0], radial[1] - slope * F.a[1], radial[2] - slope * F.a[2]]);
      const facing = dot3(normal, V);
      if (fade) alpha = fadeOf(facing, fade);
      else if (facing < least) continue;
      if (alpha <= 0.02) continue;
    }
    const [x, y] = iso(pointOf(F, s, r, t), P);
    out.push(alpha < 1 ? [x, y, alpha] : [x, y]);
  }
  return out;
}

function facingOf(F, angle, P, slope = 0) {
  const radial = radialOf(F, angle);
  return dot3(unit3([radial[0] - slope * F.a[0], radial[1] - slope * F.a[1], radial[2] - slope * F.a[2]]), viewOf(P));
}

function fillet(points, radius, perArc = 7, { P = null, tube = 0, margin = 1.3 } = {}) {
  if (points.length < 3) return points.map((p) => [...p]);
  const V = P && tube ? viewOf(P) : null;
  const out = [[...points[0]]];
  for (let index = 1; index < points.length - 1; index++) {
    const prev = points[index - 1];
    const here = points[index];
    const next = points[index + 1];
    const into = unit3(sub3(here, prev));
    const outOf = unit3(sub3(next, here));
    const cosTurn = Math.max(-1, Math.min(1, dot3(into, outOf)));
    const turn = Math.acos(cosTurn);
    if (turn < 1e-3) {
      out.push([...here]);
      continue;
    }
    const room = Math.min(len3(sub3(here, prev)), len3(sub3(next, here))) * 0.48;
    const facing = V ? Math.abs(dot3(unit3(cross3(into, outOf)), V)) : 1;
    const bend = V ? Math.max(radius, (margin * tube) / (0.7 * Math.max(0.05, facing) ** 2)) : radius;
    const cut = Math.min(bend * Math.tan(turn / 2), room);
    const a = sub3(here, mul3(into, cut));
    const b = add3(here, mul3(outOf, cut));
    const count = Math.max(2, Math.ceil((perArc * turn) / (Math.PI / 2)));
    for (let step = 0; step <= count; step++) {
      const t = step / count;
      const p0 = lerp3(a, here, t);
      const p1 = lerp3(here, b, t);
      out.push(lerp3(p0, p1, t));
    }
  }
  out.push([...points[points.length - 1]]);
  return out;
}

function resample(points, spacing) {
  const lengths = [0];
  for (let index = 1; index < points.length; index++) lengths.push(lengths[index - 1] + len3(sub3(points[index], points[index - 1])));
  const total = lengths[lengths.length - 1];
  const count = Math.max(1, Math.round(total / spacing));
  const out = [];
  let segment = 1;
  for (let step = 0; step <= count; step++) {
    const at = (total * step) / count;
    while (segment < points.length - 1 && lengths[segment] < at) segment++;
    const a = points[segment - 1];
    const b = points[segment];
    const span = lengths[segment] - lengths[segment - 1] || 1;
    out.push(lerp3(a, b, Math.min(1, Math.max(0, (at - lengths[segment - 1]) / span))));
  }
  return out;
}

function pathLength(points) {
  let total = 0;
  for (let index = 1; index < points.length; index++) total += len3(sub3(points[index], points[index - 1]));
  return total;
}

function cut(points, from, to) {
  const out = [];
  let walked = 0;
  for (let index = 1; index < points.length; index++) {
    const a = points[index - 1];
    const b = points[index];
    const length = len3(sub3(b, a));
    const start = walked;
    const end = walked + length;
    if (end >= from && start <= to) {
      const t0 = Math.max(0, (from - start) / (length || 1));
      const t1 = Math.min(1, (to - start) / (length || 1));
      if (!out.length) out.push(lerp3(a, b, t0));
      out.push(lerp3(a, b, t1));
    }
    walked = end;
  }
  return out;
}

const pointAlong = (points, at) => {
  const piece = cut(points, at, at + 0.01);
  return piece[0] ?? points[points.length - 1];
};

function tangentAlong(points, at) {
  const total = pathLength(points);
  const a = pointAlong(points, Math.max(0, at - 0.6));
  const b = pointAlong(points, Math.min(total, at + 0.6));
  return unit3(sub3(b, a));
}

function spiral(F, s, r0, r1, a0, a1, steps = 28) {
  const out = [];
  for (let index = 0; index <= steps; index++) {
    const t = index / steps;
    out.push(pointOf(F, s, r0 + (r1 - r0) * t, a0 + (a1 - a0) * t));
  }
  return out;
}

function arcPoints(F, s, r, a0, a1, steps = 24) {
  return Array.from({ length: steps + 1 }, (_, index) => pointOf(F, s, r, a0 + ((a1 - a0) * index) / steps));
}

return { frameOf, prismOf, pointOf };})();

// Fig 3 model: oral vs IV iron through the hepcidin gate, over 8 weeks.
//
// A compartment model in mg of iron, stepped hourly. Pure functions, no DOM;
// the build imports it and the page inlines it. [n] keys refer to
// reference/truth-pack.md §3. Parameters are marked SOURCED, TUNED (fitted so
// the model reproduces a published number) or ASSUMPTION.
//
// The curves are a typical pattern for one modelled woman (65 kg, Hb 105 g/L,
// ferritin 8 µg/L), not a prediction for any person.

const PARAMS = {
  bw: 65, //                 kg, model woman (ASSUMPTION)
  bvLPerKg: 0.065, //        L/kg blood volume (textbook, MEDIUM)
  feMgPerGHb: 3.47, //       mg Fe per g Hb (stoichiometry, SOURCED)
  hb0: 105, //               g/L start (brief)
  hbSet: 132, //             g/L the marrow heads for when iron isn't limiting (ASSUMPTION, mid-normal for women)
  ferritin0: 8, //           µg/L start (brief)
  mgPerFerritin: 8, //       mg storage iron per µg/L ferritin [30]; not valid just after IV iron
  marrowK: 1 / 18, //        /day of the Hb gap closed when iron isn't limiting (TUNED: FERWON-IDA ≈ +25 g/L by week 8 [6])
  lagD: 4, //                days from marrow uptake to circulating Hb (TUNED, red-cell maturation)
  pillMg: 60, //             mg elemental iron per tablet (Stoffel 2017 [2]; ferrous sulfate 300 mg ≈ 60 mg)
  doseHour: 8, //            08:00, fasting (Moretti 2015 [1], Stoffel 2017 [2])
  fiaMax: 0.23, //           hepcidin-free fractional absorption of 60 mg (TUNED: 14 alternate-day doses → 173 mg vs 175 mg [2])
  doseExp: 0.554, //         absorbed ∝ dose^0.554 (Moretti 2015: 6× dose → 2.7× absorbed [1])
  hepTauH: 8, //             h, hepcidin pulse time constant: raised at 24 h, near baseline by 48 h (TUNED [1][4])
  hepPerMgAbs: 0.115, //     pulse per mg absorbed (TUNED: next-day absorption −38 %, Moretti −35 to −45 % [1])
  storeRefMg: 400, //        stores at which baseline hepcidin halves absorption (ASSUMPTION)
  erfeMax: 0.8, //           max suppression of baseline hepcidin by the hungry marrow (ASSUMPTION, erythroferrone [27])
  ivMg: 1000, //             Monoferric single dose for 50–<70 kg with Hb ≥ 100 g/L (product information table [12][14])
  ivClearT12H: 27, //        h, plasma half-life of ferric derisomaltose (US PI via [17])
  resT12D: 21, //            d, macrophages process the IV complex (TUNED: ferritin < 250 µg/L after week 5 [18])
  ferritinPerMgRes: 0.55, // µg/L ferritin per mg unprocessed macrophage iron (TUNED: peak ≈ 470 near day 7 [17][18])
  sFloorMg: 64, //           stores below this aren't mobilised (ferritin 8 × 8 mg)
  sMobilPerD: 0.02, //       /day mobilisation of stores when the marrow is short (ASSUMPTION)
  netLossMgPerD: 0.5, //     mg/day blood iron lost beyond diet, heavier periods (ASSUMPTION)
  labileToStorePerH: 0.01, // /h new iron the marrow doesn't take drifts to stores (TUNED)
};

const MODES = ["daily", "alternate", "iv"];
const DAYS = 56;
const RECHECK = [42, 56]; // days: the clinic's 6–8 week bloodwork

/**
 * Hourly simulation over 56 days. Returns per-hour arrays:
 * hb (g/L), ferritin (µg/L), gate (0–1, share of the gut gate open = 1/(1 + hepcidin)),
 * take (mg/h to marrow), supply (mg/h of new iron arriving), plasmaIv (mg of IV complex
 * in plasma), dose (mg absorbed at this hour, if a pill), and day-level checkpoints.
 */
function simulate(mode, p = PARAMS, days = DAYS) {
  const bv = p.bw * p.bvLPerKg;
  const eOf = (hb) => hb * bv * p.feMgPerGHb;
  const e0 = eOf(p.hb0);
  const eSet = eOf(p.hbSet);
  let S = p.ferritin0 * p.mgPerFerritin;
  let C = 0;
  let R = 0;
  let eCommitted = e0;
  const pipe = new Array(p.lagD * 24).fill(0);
  let eCirc = e0;
  let L = 0;
  const doses = [];
  const kC = Math.LN2 / p.ivClearT12H;
  const kR = Math.LN2 / (p.resT12D * 24);
  const n = days * 24 + 1;
  const out = { hb: new Float32Array(n), ferritin: new Float32Array(n), gate: new Float32Array(n), take: new Float32Array(n), supply: new Float32Array(n), plasmaIv: new Float32Array(n), dose: new Float32Array(n), pill: new Uint8Array(n) };
  for (let h = 0; h < n; h++) {
    const day = Math.floor(h / 24);
    const hod = h % 24;
    const gapFrac = Math.max(0, (eSet - eCommitted) / (eSet - e0));
    const hBase = ((S + R) / p.storeRefMg) * (1 - p.erfeMax * Math.min(1, gapFrac));
    let pulse = 0;
    for (const [t0, a] of doses) {
      const x = (h - t0) / p.hepTauH;
      if (x > 0 && x < 12) pulse += p.hepPerMgAbs * a * x * Math.exp(1 - x);
    }
    const H = hBase + pulse;
    const gate = 1 / (1 + H);
    let labile = 0;
    const doseDay = mode === "daily" ? true : mode === "alternate" ? day % 2 === 0 : false;
    if (doseDay && hod === p.doseHour && day < days) {
      const absorbed = p.fiaMax * p.pillMg * Math.pow(p.pillMg / 60, p.doseExp - 1) * gate;
      doses.push([h, absorbed]);
      labile += absorbed;
      out.dose[h] = absorbed;
      out.pill[h] = 1;
    }
    if (mode === "iv" && h === 10) C += p.ivMg;
    const cToR = C * kC;
    C -= cToR;
    R += cToR;
    const rOut = R * kR;
    R -= rOut;
    labile += rOut;
    const want = Math.max(0, (p.marrowK / 24) * (eSet - eCommitted));
    L += labile;
    let take = Math.min(want, L);
    L -= take;
    if (take < want && S > p.sFloorMg) {
      const s = Math.min(want - take, ((S - p.sFloorMg) * p.sMobilPerD) / 24);
      S -= s;
      take += s;
    }
    eCommitted += take;
    const toStore = L * p.labileToStorePerH;
    L -= toStore;
    S += toStore;
    pipe.push(take);
    eCirc += pipe.shift();
    const loss = p.netLossMgPerD / 24;
    eCirc -= loss;
    eCommitted -= loss;
    out.hb[h] = eCirc / (bv * p.feMgPerGHb);
    out.ferritin[h] = S / p.mgPerFerritin + p.ferritinPerMgRes * R;
    out.gate[h] = gate;
    out.take[h] = take;
    out.supply[h] = labile;
    out.plasmaIv[h] = C;
  }
  return out;
}

/** Daily checkpoints (midnight) for tables and the caption. */
function daily(mode) {
  const s = simulate(mode);
  return Array.from({ length: DAYS + 1 }, (_, d) => ({ day: d, hb: s.hb[d * 24], ferritin: s.ferritin[d * 24], gate: s.gate[d * 24] }));
}

// Fig 3 live code: drives the yard from the hourly model.
const DATA = {"P":{"origin":[276.53179190751445,248.59725845830422],"scale":1.87416102160387,"azimuth":45,"elevation":34},"loop":{"x":-60,"y":-28,"w":120,"d":50,"r":23},"ruler":{"x":-96,"y":41,"w":192,"d":7,"r":1,"perDay":3.4285714285714284},"booms":{"dock":{"x":-60,"y":-37.8,"z":8},"silo":{"x":16,"y":-34,"z":12},"len":16},"dial":{"x":-88,"y":-39.6,"r":7.5},"silo":{"F0":[2,-56],"ang":0.7853981633974482,"SG":{"z0":8,"z1":38,"half":0.16},"r":15},"ram":{"travel":12},"tanker":{"travel":70},"hopper":[-86,-62,30],"tray":{"x":75,"y":-40,"w":16,"d":9,"z":4}};

function mount(fig) {
  const P = DATA.P;
  const stage = fig.querySelector(".iso-stage");
  const svg = stage.querySelector("svg");
  const q = (s) => svg.querySelector(s);
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const out = Object.fromEntries([...fig.querySelectorAll("[data-r]")].map((n) => [n.dataset.r, n]));
  const status = fig.querySelector("[data-status]");
  const buttons = [...fig.querySelectorAll('[data-control="mode"] .opt-seg-btn')];
  const range = fig.querySelector(".fe-range");
  const play = fig.querySelector("[data-play]");
  const weekLabel = fig.querySelector("[data-week]");
  const nodes = { booms: q('[data-part="booms"]'), carts: q('[data-part="carts"]'), pill: q('[data-part="pill"]'), needle: q('[data-part="needle"]'), rider: q('[data-part="rider"]'), level: q('[data-part="level"]'), hb: q('[data-part="hb"]'), discs: q('[data-part="discs"]'), dosemarks: q('[data-part="dosemarks"]') };
  const ram = [...svg.querySelectorAll('[data-move="ram"]')];
  const tanker = [...svg.querySelectorAll('[data-move="tanker"]')];
  const HOURS = DAYS * 24;
  const BV = PARAMS.bw * PARAMS.bvLPerKg;

  // ---------------------------------------------------------------- the model, all three routes, hour by hour
  const SIM = {};
  for (const mode of MODES) {
    const s = simulate(mode);
    // iron arriving per day (rolling 24 h), and a transferrin-saturation proxy for how loaded the carts are:
    // normal recycling (~25 mg/day) ↔ TSAT ≈ 30 %, scaled by today's supply (recycling + new iron).
    const supplyDay = new Float32Array(s.hb.length);
    let acc = 0;
    for (let h = 0; h < s.hb.length; h++) {
      acc += s.supply[h] - (h >= 24 ? s.supply[h - 24] : 0);
      supplyDay[h] = acc;
    }
    const tsat = new Float32Array(s.hb.length);
    for (let h = 0; h < s.hb.length; h++) {
      const recycle = (s.hb[h] * BV * PARAMS.feMgPerGHb) / 120;
      tsat[h] = Math.min(0.6, Math.max(0.04, (0.3 * (recycle + supplyDay[h])) / 24.7));
    }
    let takeMax = 0;
    for (const v of s.take) takeMax = Math.max(takeMax, v);
    SIM[mode] = { ...s, tsat, takeMax };
  }
  const sample = (arr, t) => {
    const i = Math.min(arr.length - 2, Math.max(0, Math.floor(t)));
    const f = Math.min(1, Math.max(0, t - i));
    return arr[i] + (arr[i + 1] - arr[i]) * f;
  };

  // ---------------------------------------------------------------- geometry helpers (same kit as the build)
  const loopPoint = (() => {
    // centreline of the rounded-rectangle loop, by fraction u of its length (counter-clockwise from above)
    const ring = ringOf(DATA.loop, 16);
    const lens = [0];
    for (let i = 1; i <= ring.length; i++) lens.push(lens[i - 1] + Math.hypot(ring[i % ring.length][0] - ring[i - 1][0], ring[i % ring.length][1] - ring[i - 1][1]));
    const total = lens[lens.length - 1];
    return (u) => {
      const d = (((u % 1) + 1) % 1) * total;
      let i = 1;
      while (lens[i] < d) i++;
      const a = ring[i - 1];
      const b = ring[i % ring.length];
      const f = (d - lens[i - 1]) / (lens[i] - lens[i - 1]);
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, tx: (b[0] - a[0]) / len, ty: (b[1] - a[1]) / len };
    };
  })();
  const rect = (c, t, along, across) => {
    const [tx, ty] = t;
    const [nx, ny] = [-ty, tx];
    return [
      [c[0] - tx * along - nx * across, c[1] - ty * along - ny * across],
      [c[0] + tx * along - nx * across, c[1] + ty * along - ny * across],
      [c[0] + tx * along + nx * across, c[1] + ty * along + ny * across],
      [c[0] - tx * along + nx * across, c[1] - ty * along + ny * across],
    ];
  };
  const CARTS = 6;
  const hash = (a, b) => {
    const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  function cartsSvg(phase, p, laps) {
    const list = [];
    for (let i = 0; i < CARTS; i++) {
      const u = phase + i / CARTS;
      const lap = Math.floor(u);
      const at = loopPoint(u);
      const t = [at.tx, at.ty];
      const c = [at.x, at.y];
      // ingots: each of the two cradles is filled with probability p (redrawn each lap at the dock)
      const n = (hash(i, lap + laps) < p ? 1 : 0) + (hash(i + 17, lap + laps) < p ? 1 : 0);
      list.push({ depth: depthOf([c[0], c[1], 0], P), c, t, n });
    }
    list.sort((a, b) => a.depth - b.depth);
    return list
      .map(({ c, t, n }) => {
        let svgc = solidSvg(extrude(rect(c, t, 5.2, 3.2), 1.6, 2.4, P, { bevel: 0.3 }), { tone: "mid" });
        for (const k of [-1, 1]) {
          const cc = [c[0] + t[0] * 2.4 * k, c[1] + t[1] * 2.4 * k];
          svgc += solidSvg(extrude(rect(cc, t, 1.9, 2.3), 4, 0.7, P), { tone: "lo", crease: "none" });
          if ((k < 0 && n >= 1) || (k > 0 && n >= 2)) svgc += solidSvg(extrude(rect(cc, t, 1.6, 1.5), 4.7, 1.6, P, { bevel: 0.2 }), { tone: "hi", lit: true });
        }
        return svgc;
      })
      .join("");
  }
  const boomSvg = (b, open) => {
    const a = (open * 78 * Math.PI) / 180;
    const F = G.frameOf([b.x, b.y, b.z], [-Math.cos(a), 0, Math.sin(a)], [0, 1, 0], [Math.sin(a), 0, Math.cos(a)]);
    return solidSvg(G.prismOf(F, [[-0.8, -0.7], [0.8, -0.7], [0.8, 0.7], [-0.8, 0.7]], 1.2, DATA.booms.len, P), { tone: "hi", crease: "lo" });
  };
  const dialNeedle = (H) => {
    const { x, y, r } = DATA.dial;
    const ang = -0.75 * Math.PI + Math.min(1, H / 2) * 1.5 * Math.PI;
    return lineOnTop([x - Math.sin(ang) * 1.6, y + Math.cos(ang) * 1.6], [x + Math.sin(ang) * (r - 1.8), y - Math.cos(ang) * (r - 1.8)], 10.1, P);
  };
  const levelPath = (f) => {
    const { F0, ang, SG, r } = DATA.silo;
    const Fr = G.frameOf([F0[0], F0[1], 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
    const z = SG.z0 + 1 + f * (SG.z1 - SG.z0 - 2);
    const pts = [G.pointOf(Fr, SG.z0 + 1, r + 0.08, ang - SG.half * 0.7), G.pointOf(Fr, SG.z0 + 1, r + 0.08, ang + SG.half * 0.7), G.pointOf(Fr, z, r + 0.08, ang + SG.half * 0.7), G.pointOf(Fr, z, r + 0.08, ang - SG.half * 0.7)];
    return pathOf(pts.map((p) => iso(p, P)), true);
  };
  const riderSvg = (day) => {
    const x = DATA.ruler.x + day * DATA.ruler.perDay;
    const plan = { x: x - 1.6, y: DATA.ruler.y - 2.4, w: 3.2, d: DATA.ruler.d + 4.8, r: 0.8 };
    return solidSvg(slabOf(plan, 0.8, 1.6, P, 2, 0.2), { tone: "hi", lit: true }) + lineSvg(lineOnTop([x, plan.y + 0.6], [x, plan.y + plan.d - 0.6], 2.4, P), { tone: "lit" });
  };
  const discsSvg = (n) => {
    const t = DATA.tray;
    let s = "";
    for (let i = 0; i < n; i++) {
      const cx = t.x + 3.6 + (i % 3) * 4.4;
      const cy = t.y + 4.5;
      const z = t.z + Math.floor(i / 3) * 1.1;
      s += solidSvg(cylinder(cx, cy, 1.9, z, 1, P, 20), { tone: "hi", className: "fe-red" });
    }
    return s;
  };
  const doseMarks = (mode) => {
    const r = DATA.ruler;
    if (mode === "iv") return `<g class="fe-mark">${solidSvg(cylinder(r.x, r.y + r.d - 1.2, 1.4, 0.8, 0.6, P, 16), { tone: "hi", lit: true })}</g>`;
    const pts = [];
    for (let d = 0; d < DAYS; d += mode === "daily" ? 1 : 2) pts.push(iso([r.x + (d + 8 / 24) * r.perDay, r.y + r.d - 1.4, 0.8], P));
    return dotsSvg(pts, { size: 0.55, tone: "hi" });
  };

  // ---------------------------------------------------------------- state
  let mode = "daily";
  let t = 0; // model hours
  let playing = !still.matches;
  let touring = !still.matches;
  let phase = 0;
  let laps = 0;
  let pillAt = -1e9;
  let lastDoseHour = -1;
  let visible = false;
  let frame = 0;
  let last = 0;
  let idle = 0;
  let pauseUntil = 0;
  let clock = 0;
  let ramPhase = 0;
  const speed = (h) => (h < 72 ? 10 : 90); // model hours per second: slow for the first three days, then fast

  function draw() {
    const s = SIM[mode];
    const g = sample(s.gate, t);
    const H = 1 / g - 1;
    const day = t / 24;
    const hb = sample(s.hb, t);
    const fer = sample(s.ferritin, t);
    nodes.booms.innerHTML = boomSvg(DATA.booms.dock, g) + boomSvg(DATA.booms.silo, g);
    nodes.needle.setAttribute("d", dialNeedle(H));
    nodes.level.setAttribute("d", levelPath(Math.min(1, fer / 500)));
    nodes.hb.textContent = String(Math.round(hb));
    nodes.discs.innerHTML = discsSvg(Math.max(0, Math.min(12, Math.round((hb - PARAMS.hb0) / 2.2))));
    nodes.rider.innerHTML = riderSvg(day);
    nodes.carts.innerHTML = cartsSvg(phase, sample(s.tsat, t), laps);
    // the tanker: drives in over the first 10 h, unloads, leaves by hour 60
    let away = 1;
    if (mode === "iv") away = t < 10 ? 1 - t / 10 : t < 40 ? 0 : Math.min(1, (t - 40) / 20);
    const ease = away * away * (3 - 2 * away);
    const tr = translateAlong(P, [0, -DATA.tanker.travel * ease, 0]);
    tanker.forEach((n) => {
      n.setAttribute("transform", tr);
      n.style.opacity = String(Math.max(0, 1 - Math.max(0, ease - 0.7) / 0.3));
    });
    // the press runs as fast as the marrow is taking iron
    const ramZ = -DATA.ram.travel * (0.5 - 0.5 * Math.cos(ramPhase));
    const rt = translateAlong(P, [0, 0, ramZ]);
    const rd = axisVector(P, [0, 0, ramZ]);
    ram.forEach((n) => {
      n.setAttribute("transform", rt);
      if (n.querySelector("[data-hold]")) holdStill(n, rd);
    });
    // a pill drops into the hopper at each dose
    const age = clock - pillAt;
    if (age >= 0 && age < 0.9) {
      const [hx, hy, hz] = DATA.hopper;
      const z = hz + 14 - 14 * Math.min(1, age / 0.6) ** 2;
      nodes.pill.innerHTML = solidSvg(G.prismOf(G.frameOf([hx - 2, hy, z], [1, 0, 0], [0, 1, 0], [0, 0, 1]), [[-1.1, -1.1], [1.1, -1.1], [1.1, 1.1], [-1.1, 1.1]], 0, 4, P), { tone: "hi" });
      nodes.pill.style.opacity = String(1 - Math.max(0, age - 0.6) / 0.3);
    } else nodes.pill.innerHTML = "";
    const gatePct = Math.round(g * 100);
    out.day.textContent = day < 3 ? day.toFixed(1) : String(Math.floor(day));
    out.gate.textContent = `${gatePct}% open`;
    out.fer.textContent = `${Math.round(fer)} µg/L`;
    out.hb.textContent = `${Math.round(hb)} g/L`;
    weekLabel.textContent = `Week ${Math.floor(day / 7)}`;
    if (Math.abs(Number(range.value) - day) > 0.24) range.value = String(Math.round(day * 4) / 4);
    stage.setAttribute("aria-valuenow", String(Math.round(day)));
  }
  const describe = () => {
    const s = SIM[mode];
    const name = mode === "daily" ? "Daily pills" : mode === "alternate" ? "Pills every other day" : "One IV infusion";
    const day = Math.floor(t / 24);
    stage.setAttribute("aria-valuetext", `${name}, day ${day}: gut gate ${Math.round(sample(s.gate, t) * 100)}% open, ferritin ${Math.round(sample(s.ferritin, t))}, hemoglobin ${Math.round(sample(s.hb, t))} grams per litre`);
  };

  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    clock += dt;
    phase += dt * 0.045;
    if (phase > 1) {
      phase -= 1;
      laps++;
    }
    const s = SIM[mode];
    ramPhase += dt * Math.PI * 2 * (0.15 + 1.4 * (sample(s.take, t) / s.takeMax));
    if (playing && clock >= pauseUntil) {
      t += dt * speed(t);
      const hNow = Math.floor(t);
      for (let h = lastDoseHour + 1; h <= Math.min(hNow, HOURS); h++) if (s.pill[h]) pillAt = clock;
      lastDoseHour = Math.min(hNow, HOURS);
      if (t >= HOURS) {
        t = HOURS;
        if (touring) {
          const next = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
          pauseUntil = clock + 1.6;
          setTimeout(() => touring && setMode(next, false, true), 1600);
        } else {
          playing = false;
          syncPlay();
        }
      }
    }
    draw();
    frame = visible && !still.matches ? requestAnimationFrame(tick) : 0;
  }
  const run = () => {
    if (!frame && visible && !still.matches) {
      last = 0;
      frame = requestAnimationFrame(tick);
    }
  };
  const syncPlay = () => {
    play.textContent = playing ? "Pause" : "Play";
    play.setAttribute("aria-label", playing ? "Pause" : "Play");
  };
  function stillFrame() {
    t = mode === "iv" ? 7 * 24 : 24 + 12;
    phase = 0.13;
    ramPhase = 1.2;
    draw();
    describe();
  }
  function setMode(next, byHand = true, restart = false) {
    mode = next;
    buttons.forEach((b) => {
      const on = b.dataset.value === mode;
      b.setAttribute("aria-checked", on ? "true" : "false");
      b.tabIndex = on ? 0 : -1;
    });
    nodes.dosemarks.innerHTML = doseMarks(mode);
    if (restart || byHand) {
      t = 0;
      lastDoseHour = -1;
    }
    if (byHand) takeOver(true);
    if (still.matches) stillFrame();
    else {
      describe();
      run();
    }
  }
  function takeOver(keepPlaying = false) {
    touring = false;
    playing = keepPlaying && !still.matches;
    syncPlay();
    clearTimeout(idle);
    idle = setTimeout(() => {
      if (still.matches) return;
      touring = true;
      playing = true;
      syncPlay();
      run();
    }, 9000);
  }
  function seek(day) {
    t = Math.max(0, Math.min(HOURS, day * 24));
    lastDoseHour = Math.floor(t);
    takeOver(false);
    if (still.matches) {
      draw();
    }
    describe();
    run();
  }

  buttons.forEach((b) => b.addEventListener("click", () => setMode(b.dataset.value)));
  fig.querySelector('[data-control="mode"]').addEventListener("keydown", (e) => {
    const i = buttons.indexOf(e.target);
    const n = e.key === "ArrowRight" || e.key === "ArrowDown" ? i + 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? i - 1 : null;
    if (n === null || i < 0) return;
    e.preventDefault();
    const b = buttons[(n + buttons.length) % buttons.length];
    b.focus();
    b.click();
  });
  range.addEventListener("input", () => seek(Number(range.value)));
  play.addEventListener("click", () => {
    if (t >= HOURS) seek(0);
    touring = false;
    playing = !playing && !still.matches;
    syncPlay();
    clearTimeout(idle);
    run();
  });
  stage.addEventListener("keydown", (e) => {
    const day = t / 24;
    if (e.key === "ArrowRight") seek(Math.floor(day) + 1);
    else if (e.key === "ArrowLeft") seek(Math.ceil(day) - 1);
    else if (e.key === "PageUp") seek(day + 7);
    else if (e.key === "PageDown") seek(day - 7);
    else if (e.key === "Home") seek(0);
    else if (e.key === "End") seek(DAYS);
    else if (e.key === " ") play.click();
    else return;
    e.preventDefault();
  });
  stage.addEventListener("focus", () => (status.textContent = stage.getAttribute("aria-valuetext")));
  still.addEventListener?.("change", () => {
    if (still.matches) stillFrame();
    else run();
  });
  new IntersectionObserver(
    (entries) => {
      visible = entries[entries.length - 1].isIntersecting;
      if (visible) run();
    },
    { rootMargin: "120px 0px" },
  ).observe(stage);

  syncPlay();
  setMode("daily", false, true);
  if (still.matches) {
    setMode("iv", false, true);
  } else draw();
}

class Fig extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    const root = this.attachShadow({ mode: "open" });
    const theme = this.getAttribute("theme") === "dark" ? "dark" : "light";
    root.innerHTML = "<style>" + "\n.iso{\n  --anatomy-page:#0b0b0b;--anatomy-card:#131313;--anatomy-text:#a3a3a3;--anatomy-strong:#e6e6e6;--anatomy-muted:#6e6e6e;\n  --anatomy-paper:#131313;--anatomy-face:#1b1b1b;--anatomy-top:#1c1c1c;\n  --anatomy-shade-0:#0f0f0f;--anatomy-shade-1:#121212;--anatomy-shade-2:#151515;--anatomy-shade-3:#181818;\n  --anatomy-lit-top:#262626;--anatomy-lit-shade:#1d1d1d;\n  --anatomy-hi:#d4d4d4;--anatomy-mid:#6a6a6a;--anatomy-lo:#3e3e3e;--anatomy-faint:#2a2a2a;--anatomy-lit:#ffffff;\n  --anatomy-halo:#050505;--anatomy-halo-opacity:.9;--anatomy-dot:#e6e6e6;\n  --anatomy-red:#ff6b6b;--anatomy-green:#6be0a0;--anatomy-blue:#6b9bff;\n  --anatomy-weight:.6px;--anatomy-ease:cubic-bezier(.32,.72,0,1);\n  --anatomy-mono:ui-monospace,\"SF Mono\",Menlo,Consolas,monospace;\n  --anatomy-lift:inset 0 1px 0 0 #ffffff0a,inset 0 0 0 1px #ffffff06,0 0 0 1px #00000026,0 1px 1px -.5px #00000014,0 3px 3px -1.5px #00000014,0 6px 6px -3px #00000014,0 12px 12px -6px #00000014;\n}\n.iso[data-theme=\"light\"]{\n  --anatomy-page:#f2f2ef;--anatomy-card:#fbfbfa;--anatomy-text:#57575a;--anatomy-strong:#18181a;--anatomy-muted:#8c8c90;\n  --anatomy-paper:#fbfbfa;--anatomy-face:#ffffff;--anatomy-top:#ffffff;\n  --anatomy-shade-0:#dcdcd9;--anatomy-shade-1:#e5e5e2;--anatomy-shade-2:#ededea;--anatomy-shade-3:#f4f4f1;\n  --anatomy-lit-top:#ffffff;--anatomy-lit-shade:#eeeeeb;\n  --anatomy-hi:#26262a;--anatomy-mid:#8a8a8f;--anatomy-lo:#b4b4b8;--anatomy-faint:#d4d4d6;--anatomy-lit:#000000;\n  --anatomy-halo:#8a8a80;--anatomy-halo-opacity:.32;--anatomy-dot:#3a3a3e;\n  --anatomy-red:#e5484d;--anatomy-green:#30a46c;--anatomy-blue:#3e63dd;\n  --anatomy-lift:inset 0 1px 0 0 #ffffff,0 0 0 1px #0000000f,0 1px 1px -.5px #0000000a,0 3px 3px -1.5px #0000000a,0 6px 6px -3px #0000000a,0 12px 12px -6px #0000000a;\n}\n.iso-svg{display:block;width:100%;height:auto;overflow:visible}\n.iso-svg path,.iso-svg circle{vector-effect:non-scaling-stroke}\n.iso-fill{fill:var(--anatomy-paper);stroke:none}\n.iso-solid[data-lit]>.iso-fill{fill:var(--anatomy-face)}\n.iso-shade,.iso-top{stroke:none}\n.iso-shade[data-shade=\"0\"]{fill:var(--anatomy-shade-0)}\n.iso-shade[data-shade=\"1\"]{fill:var(--anatomy-shade-1)}\n.iso-shade[data-shade=\"2\"]{fill:var(--anatomy-shade-2)}\n.iso-shade[data-shade=\"3\"]{fill:var(--anatomy-shade-3)}\n.iso-top{fill:var(--anatomy-top)}\n.iso-solid[data-lit]>.iso-top{fill:var(--anatomy-lit-top)}\n.iso-solid[data-lit]>.iso-shade{fill:var(--anatomy-lit-shade)}\n.iso-solid[data-seamless]>.iso-shade,.iso-solid[data-seamless]>.iso-top{stroke-width:.4;stroke-linejoin:round}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"0\"]{stroke:var(--anatomy-shade-0)}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"1\"]{stroke:var(--anatomy-shade-1)}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"2\"]{stroke:var(--anatomy-shade-2)}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"3\"]{stroke:var(--anatomy-shade-3)}\n.iso-solid[data-seamless]>.iso-top{stroke:var(--anatomy-top)}\n.iso-solid[data-seamless][data-lit]>.iso-top{stroke:var(--anatomy-lit-top)}\n.iso-solid[data-seamless][data-lit]>.iso-shade{stroke:var(--anatomy-lit-shade)}\n.iso-solid[data-lit]>.iso-edge{stroke:var(--anatomy-lit)}\n.iso-halo{fill:var(--anatomy-halo);stroke:none;filter:blur(9px);opacity:var(--anatomy-halo-opacity);transform:translateY(3px)}\n.iso-line{fill:none;stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight);stroke-linecap:round;stroke-linejoin:round}\n.iso-line[data-tone=\"hi\"]{stroke:var(--anatomy-hi)}\n.iso-line[data-tone=\"mid\"]{stroke:var(--anatomy-mid)}\n.iso-line[data-tone=\"lo\"]{stroke:var(--anatomy-lo)}\n.iso-line[data-tone=\"faint\"]{stroke:var(--anatomy-faint)}\n.iso-line[data-tone=\"lit\"]{stroke:var(--anatomy-lit)}\n.iso-line[data-tone=\"red\"]{stroke:var(--anatomy-red)}\n.iso-line[data-tone=\"green\"]{stroke:var(--anatomy-green)}\n.iso-line[data-tone=\"blue\"]{stroke:var(--anatomy-blue)}\n.iso-line[data-dotted]{stroke-dasharray:.01 3.5;stroke-width:1}\n.iso-line[data-dashed]{stroke-dasharray:3 3}\n.iso-line[data-flow]{stroke-dasharray:2 6}\n.iso-wire-end{fill:var(--anatomy-paper);stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight)}\n.iso-wire[data-tone=\"hi\"] .iso-wire-end{stroke:var(--anatomy-hi)}\n.iso-wire[data-tone=\"mid\"] .iso-wire-end{stroke:var(--anatomy-mid)}\n.iso-wire[data-tone=\"faint\"] .iso-wire-end{stroke:var(--anatomy-faint)}\n.iso-wire[data-tone=\"lit\"] .iso-wire-end{stroke:var(--anatomy-lit)}\n.iso-dots circle{fill:var(--anatomy-dot);stroke:none;opacity:.32}\n.iso-dots[data-tone=\"hi\"] circle{opacity:.85}\n.iso-dots[data-tone=\"mid\"] circle{opacity:.45}\n.iso-dots[data-tone=\"lo\"] circle{opacity:.22}\n.iso-dots[data-tone=\"faint\"] circle{opacity:.12}\n.iso-face-text{fill:var(--anatomy-mid);font-family:var(--anatomy-mono);letter-spacing:.04em}\n.iso-face-text[data-tone=\"hi\"]{fill:var(--anatomy-hi)}\n.iso-face-text[data-tone=\"lo\"]{fill:var(--anatomy-lo)}\n.iso-face-text[data-tone=\"faint\"]{fill:var(--anatomy-faint)}\n.tb-body{fill:var(--anatomy-shade-2);stroke:none}\n.tb-shine{fill:var(--anatomy-top);stroke:none}\n.tb-shade{fill:var(--anatomy-shade-0);stroke:none}\n.tb-ring{fill:none;stroke:var(--anatomy-lo);stroke-width:.45;stroke-linecap:butt;stroke-linejoin:round}\n.tb-ring[data-tone=\"mid\"]{stroke:var(--anatomy-mid)}\n.tb-ring[data-tone=\"faint\"]{stroke:var(--anatomy-faint)}\n.tb-ring[data-tone=\"hi\"]{stroke:var(--anatomy-hi)}\n@keyframes iso-flow{to{stroke-dashoffset:-32}}\n@keyframes iso-pulse{0%,100%{opacity:.18}12%{opacity:1}40%{opacity:.18}}\n.iso-line[data-flow]{animation:iso-flow 1600ms linear infinite}\n.iso-dots circle[data-pulse]{animation:iso-pulse 1600ms steps(1,end) infinite;animation-delay:var(--pulse-at,0ms)}\n.iso-figure{margin:32px 0 36px}\n.iso-plate{position:relative;padding:52px 24px;border-radius:0;background:var(--anatomy-card);box-shadow:0 0 0 1px var(--anatomy-mid);--anatomy-paper:var(--anatomy-card)}\n.iso-plate-corners{position:absolute;inset:18px 20px;pointer-events:none}\n.iso-plate-corner{position:absolute;color:var(--anatomy-muted);font-family:var(--anatomy-mono);font-size:10.5px;line-height:1;letter-spacing:.04em;white-space:nowrap}\n.iso-plate-corner[data-corner=\"fig\"]{top:0;left:0;color:var(--anatomy-text)}\n.iso-plate-corner[data-corner=\"title\"]{top:0;right:0;text-transform:uppercase;letter-spacing:.1em}\n.iso-plate-corner[data-corner=\"hint\"]{bottom:0;left:0;text-transform:uppercase;letter-spacing:.1em}\n.iso-plate-corner[data-corner=\"readout\"]{right:0;bottom:0;color:var(--anatomy-text);font-variant-numeric:tabular-nums}\n.iso-plate .iso-svg{margin:0 auto}\n.iso-legend{display:grid;gap:8px;margin-top:12px;color:var(--anatomy-muted);font-size:13px;line-height:1.55}\n.iso-keys{display:flex;flex-wrap:wrap;gap:6px 18px}\n.iso-key{display:inline-flex;align-items:center;gap:7px}\n.iso-swatch{width:16px;height:10px;flex:none;overflow:visible}\n.iso-swatch path{fill:none;stroke:var(--anatomy-hi);stroke-width:1;vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round}\n.iso-swatch[data-mark=\"raised\"] path,.iso-swatch[data-mark=\"flat\"] path{stroke:var(--anatomy-mid)}\n.iso-swatch[data-mark=\"lit\"] path{stroke:var(--anatomy-lit)}\n.iso-swatch[data-mark=\"dim\"] path{stroke:var(--anatomy-lo)}\n.iso-swatch[data-mark=\"dotted\"] path{stroke-dasharray:.01 3;stroke-width:1.4}\n.iso-swatch[data-mark=\"dashed\"] path{stroke-dasharray:3 2.5}\n.iso-swatch[data-mark=\"red\"] path{stroke:var(--anatomy-red)}\n.iso-swatch[data-mark=\"green\"] path{stroke:var(--anatomy-green)}\n.iso-swatch[data-mark=\"blue\"] path{stroke:var(--anatomy-blue)}\n.iso-swatch-crease{stroke:var(--anatomy-lo)!important}\n@media (max-width:560px){.iso-plate{padding:48px 12px 70px}.iso-plate-corner[data-corner=\"hint\"]{bottom:18px}}\n@media (prefers-reduced-motion:reduce){.iso-line[data-flow],.iso-dots circle[data-pulse]{animation:none}}\n/*\n * Optimal theme for Anatomy figures.\n *\n * Load AFTER the kit's ISO_CSS. Put `class=\"iso optimal\"` on the wrapper:\n *   - no data-theme  -> \"Forest night\"  (exam-room TV, dark)\n *   - data-theme=\"light\" -> \"Cream\"     (beoptimal.ca, the primary target)\n *\n * Values come from the live site (beoptimal-landing src/index.css), the\n * Performance package design and the ALE visualizer spec. The kit's grey\n * ramps are warmed so solids sit on the site's cream paper, and the single\n * \"lit\" accent is Optimal forest green instead of pure black/white.\n */\n\n.iso.optimal {\n  /* Forest night (dark) */\n  --anatomy-page: #152511;\n  --anatomy-card: #1c3118;\n  --anatomy-text: #c9cdbf;\n  --anatomy-strong: #fffcf7;\n  --anatomy-muted: #8e9884;\n  --anatomy-paper: #1c3118;\n  --anatomy-face: #253821;\n  --anatomy-top: #283c24;\n  --anatomy-shade-0: #172812;\n  --anatomy-shade-1: #1a2c16;\n  --anatomy-shade-2: #1e321a;\n  --anatomy-shade-3: #22371e;\n  --anatomy-lit-top: #34492f;\n  --anatomy-lit-shade: #2a3f26;\n  --anatomy-hi: #e9e6dc;\n  --anatomy-mid: #7e8a74;\n  --anatomy-lo: #4d5c46;\n  --anatomy-faint: #33452e;\n  --anatomy-lit: #fffcf7;\n  --anatomy-halo: #0b1508;\n  --anatomy-halo-opacity: 0.9;\n  --anatomy-dot: #e9e6dc;\n  --anatomy-red: #e0745f;\n  --anatomy-green: #8cc67f;\n  --anatomy-blue: #7fa8d9;\n  --anatomy-mono: \"JetBrains Mono\", ui-monospace, \"SF Mono\", Menlo, Consolas, monospace;\n\n  /* Optimal extras (use sparingly; colour only when colour is the subject) */\n  --opt-display: \"Castoro\", Georgia, serif;\n  --opt-ui: \"Public Sans\", system-ui, sans-serif;\n  --opt-forest: #2c4e25;\n  --opt-forest-light: #519044;\n  --opt-sage: #5e7a59;\n  --opt-borderline: #c97b2d;\n  --opt-out: #b3402f;\n  --opt-heat: #ff9776;\n}\n\n.iso.optimal[data-theme=\"light\"] {\n  /* Cream (light) */\n  --anatomy-page: #fef8f1;\n  --anatomy-card: #fffcf7;\n  --anatomy-text: #3e3d39;\n  --anatomy-strong: #252525;\n  --anatomy-muted: #76736d;\n  --anatomy-paper: #fffcf7;\n  --anatomy-face: #fffefb;\n  --anatomy-top: #fffefb;\n  --anatomy-shade-0: #ddd7cc;\n  --anatomy-shade-1: #e7e2d9;\n  --anatomy-shade-2: #f0ede5;\n  --anatomy-shade-3: #f6f3ec;\n  --anatomy-lit-top: #fffefb;\n  --anatomy-lit-shade: #efebe2;\n  --anatomy-hi: #252525;\n  --anatomy-mid: #8a867e;\n  --anatomy-lo: #b9b4aa;\n  --anatomy-faint: #d9d3c8;\n  --anatomy-lit: #2c4e25;\n  --anatomy-halo: #8a8070;\n  --anatomy-halo-opacity: 0.3;\n  --anatomy-dot: #3a3833;\n  --anatomy-red: #b3402f;\n  --anatomy-green: #3f7a35;\n  --anatomy-blue: #3e6a8f;\n}\n\n/* Card typography: brand fonts for titles and readouts, kit mono for plate corners */\n.iso.optimal .iso-plate-title,\n.iso.optimal [data-role=\"title\"] {\n  font-family: var(--opt-display);\n  letter-spacing: -0.02em;\n}\n.iso.optimal [data-role=\"readout\"],\n.iso.optimal .iso-readout {\n  font-family: var(--opt-ui);\n  font-feature-settings: \"tnum\" 1, \"ss01\" 1;\n}\n\n/*\n * Card layout for Optimal figures (shared/page.mjs `plate`).\n * Phone first: the drawing, then a row of real buttons (>=44 px), then a footer\n * where the hint and the readout wrap instead of overlapping at 320 px.\n */\n.iso.optimal {\n  --opt-rule: rgba(233, 230, 220, 0.16);\n  --opt-btn: rgba(233, 230, 220, 0.06);\n  --opt-btn-on: #e9e6dc;\n  --opt-btn-on-text: #1c3118;\n  --opt-title: #fffcf7;\n  --opt-fig: #8cc67f;\n  --opt-heat-ink: #ff9776;\n  --opt-heat-glow: rgba(255, 151, 118, 0.55);\n  --opt-heat-wash: rgba(255, 151, 118, 0.16);\n  --opt-cold-ink: #9cc3e6;\n}\n.iso.optimal[data-theme=\"light\"] {\n  --opt-rule: rgba(44, 78, 37, 0.2);\n  --opt-btn: #fffcf7;\n  --opt-btn-on: #2c4e25;\n  --opt-btn-on-text: #fffcf7;\n  --opt-title: #2c4e25;\n  --opt-fig: #5e7a59;\n  --opt-heat-ink: #c8552e;\n  --opt-heat-glow: rgba(232, 108, 64, 0.42);\n  --opt-heat-wash: rgba(255, 151, 118, 0.22);\n  --opt-cold-ink: #3e6a8f;\n}\n.iso.optimal .opt-plate {\n  padding: 52px 24px 20px;\n  box-shadow: 0 0 0 1px var(--opt-rule);\n  border-radius: 2px;\n}\n.iso.optimal .iso-plate-corner[data-corner=\"fig\"] {\n  font-family: var(--opt-display);\n  font-style: italic;\n  font-size: 15px;\n  letter-spacing: 0;\n  color: var(--opt-fig);\n  top: -2px;\n}\n.iso.optimal .iso-plate-corner[data-corner=\"title\"] {\n  font-family: var(--opt-display);\n  font-size: 17px;\n  text-transform: none;\n  letter-spacing: -0.01em;\n  color: var(--opt-title);\n  top: -4px;\n}\n.iso.optimal .opt-controls {\n  display: flex;\n  flex-wrap: wrap;\n  justify-content: center;\n  gap: 8px 12px;\n  margin: 10px 0 0;\n}\n.iso.optimal .opt-seg {\n  display: inline-flex;\n  border-radius: 999px;\n  box-shadow: inset 0 0 0 1px var(--opt-rule);\n  padding: 3px;\n  gap: 2px;\n  max-width: 100%;\n}\n.iso.optimal .opt-seg-btn {\n  appearance: none;\n  border: 0;\n  margin: 0;\n  min-height: 44px;\n  min-width: min-content; /* never shrink a label below its longest word (with the padding, always ≥ 44 px) */\n  padding: 0 16px;\n  border-radius: 999px;\n  background: transparent;\n  color: var(--anatomy-text);\n  font: 500 14px/1.1 var(--opt-ui);\n  letter-spacing: 0;\n  cursor: pointer;\n  touch-action: manipulation;\n  -webkit-tap-highlight-color: transparent;\n  transition: background-color 240ms var(--anatomy-ease), color 240ms var(--anatomy-ease);\n}\n/* A zero-height 30 px strut keeps every option at least 44 px wide, even \"Arm\", \"Leg\" or \"+5%\" with the\n   7 px padding below 350 px (min-content alone let them shrink to 36 px). */\n.iso.optimal .opt-seg-btn::after {\n  content: \"\";\n  display: block;\n  width: 30px;\n  height: 0;\n  margin: 0 auto;\n}\n.iso.optimal .opt-seg-btn[aria-checked=\"true\"] {\n  background: var(--opt-btn-on);\n  color: var(--opt-btn-on-text);\n}\n.iso.optimal .opt-seg-btn:focus-visible {\n  outline: 2px solid var(--opt-fig);\n  outline-offset: 2px;\n}\n.iso.optimal .opt-foot {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: flex-end;\n  justify-content: space-between;\n  gap: 10px 20px;\n  margin-top: 16px;\n}\n.iso.optimal .opt-hint {\n  font-family: var(--anatomy-mono);\n  font-size: 10.5px;\n  line-height: 1.4;\n  letter-spacing: 0.1em;\n  text-transform: uppercase;\n  color: var(--anatomy-muted);\n  flex: 1 1 160px;\n  min-width: 0;\n}\n.iso.optimal .opt-readout {\n  display: grid;\n  grid-auto-flow: column;\n  gap: 4px 18px;\n  margin: 0;\n  font-family: var(--opt-ui);\n  font-feature-settings: \"tnum\" 1;\n}\n.iso.optimal .opt-stat { margin: 0; min-width: 0; }\n.iso.optimal .opt-stat dt {\n  font-size: 10px;\n  font-weight: 600;\n  letter-spacing: 0.12em;\n  text-transform: uppercase;\n  color: var(--anatomy-muted);\n  white-space: nowrap;\n}\n.iso.optimal .opt-stat dd {\n  margin: 1px 0 0;\n  font-size: 15px;\n  font-weight: 500;\n  color: var(--anatomy-strong);\n  white-space: nowrap;\n}\n.iso.optimal .iso-legend { font-family: var(--opt-ui); font-size: 13.5px; }\n.iso.optimal .iso-caption { color: var(--anatomy-text); }\n.iso.optimal .iso-caption em { font-style: italic; }\n.iso.optimal .iso-swatch[data-mark=\"heat\"] path { stroke: var(--opt-heat-ink); stroke-width: 2; }\n.iso.optimal .iso-stage { outline: none; border-radius: 4px; touch-action: pan-y; -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none; }\n.iso.optimal .iso-stage:focus-visible { outline: 1px solid var(--anatomy-muted); outline-offset: 6px; }\n@media (max-width: 560px) {\n  .iso.optimal .opt-plate { padding: 44px 10px 14px; }\n  .iso.optimal .iso-plate-corners { inset: 16px 12px; }\n  .iso.optimal .opt-readout { grid-auto-flow: row; grid-template-columns: repeat(4, minmax(0, auto)); width: 100%; justify-content: space-between; gap: 4px 10px; order: -1; }\n  .iso.optimal .opt-stat dd { font-size: 14px; }\n  /* a long label wraps onto two lines instead of running into its neighbour; values stay on one baseline */\n  .iso.optimal .opt-stat { display: flex; flex-direction: column; justify-content: space-between; }\n  .iso.optimal .opt-stat dt { white-space: normal; line-height: 1.25; }\n  .iso.optimal .opt-seg-btn { padding: 0 12px; font-size: 13.5px; }\n}\n@media (max-width: 350px) {\n  .iso.optimal .opt-seg-btn { padding: 0 7px; font-size: 12.5px; }\n  .iso.optimal .opt-stat dt { font-size: 9px; letter-spacing: 0.08em; }\n  .iso.optimal .opt-stat dd { font-size: 13px; }\n}\n\n:host{display:block}\n.opt-host{background:transparent;color:var(--anatomy-text);font:15px/1.6 var(--opt-ui);-webkit-font-smoothing:antialiased}\n.opt-host *{box-sizing:border-box}\n.opt-host .iso-figure{margin:0}\n/* Fig 3 · red only for red cells; the recheck window, the bed, the glass in the figure's own inks. */\n.iso.optimal { --fe-red: #e0745f; --fe-red-side: #b8563f; --fe-bed: #1a2c16; --fe-level: #8cc67f; }\n.iso.optimal[data-theme=\"light\"] { --fe-red: #c9503a; --fe-red-side: #a63f2c; --fe-bed: #f3efe6; --fe-level: #2c4e25; }\n.fe-bed { fill: var(--fe-bed); stroke: none; }\n.fe-recheck { fill: var(--opt-heat-wash); stroke: none; }\n.fe-glass { fill: var(--anatomy-shade-0); stroke: none; }\n.fe-level { fill: var(--fe-level); stroke: none; opacity: 0.85; }\n.fe-window { fill: var(--anatomy-shade-0); }\n.fe-digits { fill: var(--anatomy-strong); font-family: var(--opt-ui); font-weight: 600; font-feature-settings: \"tnum\" 1; }\n.fe-red .iso-fill, .fe-red .iso-top { fill: var(--fe-red); }\n.fe-red .iso-shade { fill: var(--fe-red-side); }\n.fe-red .iso-edge { stroke: var(--fe-red-side); }\n.fe-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }\n.fe-par { display: block; margin-top: 6px; }\n.fe-par:first-child { margin-top: 0; }\n.fe-par small { font-size: 12.5px; color: var(--anatomy-muted); }\n.fe-scrub { display: flex; align-items: center; gap: 12px; margin: 10px 4px 0; }\n.fe-play { appearance: none; border: 0; min-height: 44px; min-width: 72px; padding: 0 16px; border-radius: 999px; background: transparent; box-shadow: inset 0 0 0 1px var(--opt-rule); color: var(--anatomy-text); font: 500 14px/1 var(--opt-ui); cursor: pointer; touch-action: manipulation; }\n.fe-play:focus-visible { outline: 2px solid var(--opt-fig); outline-offset: 2px; }\n.fe-week { font: 500 13px/1 var(--opt-ui); color: var(--anatomy-muted); min-width: 56px; text-align: right; font-feature-settings: \"tnum\" 1; }\n.fe-range { flex: 1; min-width: 0; height: 44px; margin: 0; background: transparent; accent-color: var(--opt-btn-on); -webkit-appearance: none; appearance: none; touch-action: pan-y; }\n.fe-range::-webkit-slider-runnable-track { height: 4px; border-radius: 2px; background: var(--opt-rule); }\n.fe-range::-moz-range-track { height: 4px; border-radius: 2px; background: var(--opt-rule); }\n.fe-range::-webkit-slider-thumb { -webkit-appearance: none; width: 28px; height: 28px; margin-top: -12px; border-radius: 50%; background: var(--opt-btn-on); border: 3px solid var(--anatomy-card); box-shadow: 0 0 0 1px var(--opt-rule); }\n.fe-range::-moz-range-thumb { width: 24px; height: 24px; border-radius: 50%; background: var(--opt-btn-on); border: 3px solid var(--anatomy-card); }\n.fe-range:focus-visible { outline: 2px solid var(--opt-fig); outline-offset: 2px; }\n" + "</style><div class=\"iso optimal opt-host\" data-theme=\"" + theme + "\">" + "<figure class=\"iso-figure opt-figure \"><div class=\"iso-plate opt-plate\"><div class=\"iso-plate-corners\" aria-hidden=\"true\"><span class=\"iso-plate-corner\" data-corner=\"fig\">Fig 3</span><span class=\"iso-plate-corner\" data-corner=\"title\">The depot with a gate</span></div><div class=\"iso-stage fe-stage\" tabindex=\"0\" role=\"slider\" aria-label=\"Iron over eight weeks. Left and right arrows move a day, Page Up and Down a week, Space plays or pauses.\" aria-valuemin=\"0\" aria-valuemax=\"56\" aria-valuenow=\"0\" aria-valuetext=\"Day 0\"><svg xmlns=\"http://www.w3.org/2000/svg\" class=\"iso-svg\" viewBox=\"0 0 600 434\" role=\"img\" aria-label=\"A rail yard for iron. At the back: the gut dock, where pills drop into a hopper and a boom gate (ferroportin) lets absorbed iron out; the ferritin silo, the body's store, with its own export gate and a sight glass showing how full it is; and the marrow press, which stamps red discs and counts hemoglobin. Transferrin carts, each able to carry two iron ingots, run a loop in front. A hepcidin dial beside the dock sets both gates. An IV tanker drives up the back road straight to the silo.\"><path class=\"iso-halo\" d=\"M18.8 208.7L19.2 206.4L20.5 204.2L22.4 202.1L25.1 200.3L219.5 91.6L222.8 90.1L226.5 89L230.5 88.3L234.6 88.1L238.8 88.3L242.8 89L246.5 90.1L249.7 91.6L574.9 273.4L577.6 275.2L579.5 277.3L580.8 279.5L581.2 281.9L581.2 297.6L580.8 299.9L579.5 302.1L577.6 304.2L574.9 306L380.5 414.8L377.2 416.2L373.5 417.3L369.5 418L365.4 418.2L361.2 418L357.2 417.3L353.5 416.2L350.3 414.8L25.1 232.9L22.4 231.1L20.5 229L19.2 226.8L18.8 224.5Z\"/><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M218.1 135.9L219 133.9L220.6 132L222.9 130.4L225.8 129.1L229.1 128.2L232.8 127.7L236.5 127.7L240.1 128.2L243.5 129.1L246.4 130.4L248.7 132L250.3 133.9L251.1 135.9L251.1 141.1L250.3 143.2L248.7 145L246.4 146.7L243.5 148L240.1 148.9L236.5 149.3L232.8 149.3L229.1 148.9L225.8 148L222.9 146.7L220.6 145L219 143.2L218.1 141.1L218.1 139.1Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M246.4 146.7L243.5 148L243.5 144.8L246.4 143.5ZM251.1 141.1L250.3 143.2L250.3 140L251.1 138ZM250.3 143.2L248.7 145L248.7 141.9L250.3 140ZM248.7 145L246.4 146.7L246.4 143.5L248.7 141.9Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M243.5 148L240.1 148.9L240.1 145.7L243.5 144.8ZM240.1 148.9L236.5 149.3L236.5 146.2L240.1 145.7ZM236.5 149.3L232.8 149.3L232.8 146.2L236.5 146.2Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M232.8 149.3L229.1 148.9L229.1 145.7L232.8 146.2ZM229.1 148.9L225.8 148L225.8 144.8L229.1 145.7Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M225.8 148L222.9 146.7L222.9 143.5L225.8 144.8ZM222.9 146.7L220.6 145L220.6 141.9L222.9 143.5ZM220.6 145L219 143.2L219 140L220.6 141.9ZM219 143.2L218.1 141.1L218.1 138L219 140Z\"/><path class=\"iso-top\" d=\"M246.4 143.5L243.5 144.8L240.1 145.7L236.5 146.2L232.8 146.2L229.1 145.7L225.8 144.8L222.9 143.5L220.6 141.9L219 140L218.1 138L218.1 135.9L219 133.9L220.6 132L222.9 130.4L225.8 129.1L229.1 128.2L232.8 127.7L236.5 127.7L240.1 128.2L243.5 129.1L246.4 130.4L248.7 132L250.3 133.9L251.1 135.9L251.1 138L250.3 140L248.7 141.9Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M251.1 138L250.3 140L248.7 141.9L246.4 143.5L243.5 144.8L240.1 145.7L236.5 146.2L232.8 146.2L229.1 145.7L225.8 144.8L222.9 143.5L220.6 141.9L219 140L218.1 138\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M218.1 138L218.1 135.9L219 133.9L220.6 132L222.9 130.4L225.8 129.1L229.1 128.2L232.8 127.7L236.5 127.7L240.1 128.2L243.5 129.1L246.4 130.4L248.7 132L250.3 133.9L251.1 135.9L251.1 138M251.1 141.1L250.3 143.2L248.7 145L246.4 146.7L243.5 148L240.1 148.9L236.5 149.3L232.8 149.3L229.1 148.9L225.8 148L222.9 146.7L220.6 145L219 143.2L218.1 141.1M218.1 138L218.1 141.1M251.1 138L251.1 141.1\"/></g><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M221.9 129.5L222.5 127.9L223.8 126.5L225.6 125.2L227.8 124.2L230.4 123.5L233.2 123.2L236.1 123.2L238.9 123.5L241.4 124.2L243.7 125.2L245.5 126.5L246.7 127.9L247.3 129.5L247.3 131.1L247.3 137.8L246.7 139.3L245.5 140.8L243.7 142L241.4 143L238.9 143.7L236.1 144.1L233.2 144.1L230.4 143.7L227.8 143L225.6 142L223.8 140.8L222.5 139.3L221.9 137.8L221.9 136.2Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M243.7 142L241.4 143L241.4 136.3L243.7 135.3ZM247.3 137.8L246.7 139.3L246.7 132.6L247.3 131.1ZM246.7 139.3L245.5 140.8L245.5 134.1L246.7 132.6ZM245.5 140.8L243.7 142L243.7 135.3L245.5 134.1Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M241.4 143L238.9 143.7L238.9 137L241.4 136.3ZM238.9 143.7L236.1 144.1L236.1 137.4L238.9 137Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M236.1 144.1L233.2 144.1L233.2 137.4L236.1 137.4ZM233.2 144.1L230.4 143.7L230.4 137L233.2 137.4ZM230.4 143.7L227.8 143L227.8 136.3L230.4 137Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M227.8 143L225.6 142L225.6 135.3L227.8 136.3ZM225.6 142L223.8 140.8L223.8 134.1L225.6 135.3ZM223.8 140.8L222.5 139.3L222.5 132.6L223.8 134.1ZM222.5 139.3L221.9 137.8L221.9 131.1L222.5 132.6Z\"/><path class=\"iso-top\" d=\"M243.7 135.3L241.4 136.3L238.9 137L236.1 137.4L233.2 137.4L230.4 137L227.8 136.3L225.6 135.3L223.8 134.1L222.5 132.6L221.9 131.1L221.9 129.5L222.5 127.9L223.8 126.5L225.6 125.2L227.8 124.2L230.4 123.5L233.2 123.2L236.1 123.2L238.9 123.5L241.4 124.2L243.7 125.2L245.5 126.5L246.7 127.9L247.3 129.5L247.3 131.1L246.7 132.6L245.5 134.1Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M247.3 131.1L246.7 132.6L245.5 134.1L243.7 135.3L241.4 136.3L238.9 137L236.1 137.4L233.2 137.4L230.4 137L227.8 136.3L225.6 135.3L223.8 134.1L222.5 132.6L221.9 131.1\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M221.9 131.1L221.9 129.5L222.5 127.9L223.8 126.5L225.6 125.2L227.8 124.2L230.4 123.5L233.2 123.2L236.1 123.2L238.9 123.5L241.4 124.2L243.7 125.2L245.5 126.5L246.7 127.9L247.3 129.5L247.3 131.1M247.3 137.8L246.7 139.3L245.5 140.8L243.7 142L241.4 143L238.9 143.7L236.1 144.1L233.2 144.1L230.4 143.7L227.8 143L225.6 142L223.8 140.8L222.5 139.3L221.9 137.8M221.9 131.1L221.9 137.8M247.3 131.1L247.3 137.8\"/></g><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M67.3 220.3L68.1 218.3L69.7 216.4L72 214.8L74.9 213.5L78.3 212.6L81.9 212.1L85.6 212.1L89.2 212.6L92.6 213.5L95.5 214.8L97.8 216.4L99.4 218.3L100.2 220.3L100.2 222.4L100.2 225.5L99.4 227.5L97.8 229.4L95.5 231L92.6 232.3L89.2 233.2L85.6 233.7L81.9 233.7L78.3 233.2L74.9 232.3L72 231L69.7 229.4L68.1 227.5L67.3 225.5L67.3 223.4Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M95.5 231L92.6 232.3L92.6 229.2L95.5 227.9ZM100.2 225.5L99.4 227.5L99.4 224.4L100.2 222.4ZM99.4 227.5L97.8 229.4L97.8 226.3L99.4 224.4ZM97.8 229.4L95.5 231L95.5 227.9L97.8 226.3Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M92.6 232.3L89.2 233.2L89.2 230.1L92.6 229.2ZM89.2 233.2L85.6 233.7L85.6 230.5L89.2 230.1ZM85.6 233.7L81.9 233.7L81.9 230.5L85.6 230.5Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M81.9 233.7L78.3 233.2L78.3 230.1L81.9 230.5ZM78.3 233.2L74.9 232.3L74.9 229.2L78.3 230.1Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M74.9 232.3L72 231L72 227.9L74.9 229.2ZM72 231L69.7 229.4L69.7 226.3L72 227.9ZM69.7 229.4L68.1 227.5L68.1 224.4L69.7 226.3ZM68.1 227.5L67.3 225.5L67.3 222.4L68.1 224.4Z\"/><path class=\"iso-top\" d=\"M95.5 227.9L92.6 229.2L89.2 230.1L85.6 230.5L81.9 230.5L78.3 230.1L74.9 229.2L72 227.9L69.7 226.3L68.1 224.4L67.3 222.4L67.3 220.3L68.1 218.3L69.7 216.4L72 214.8L74.9 213.5L78.3 212.6L81.9 212.1L85.6 212.1L89.2 212.6L92.6 213.5L95.5 214.8L97.8 216.4L99.4 218.3L100.2 220.3L100.2 222.4L99.4 224.4L97.8 226.3Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M100.2 222.4L99.4 224.4L97.8 226.3L95.5 227.9L92.6 229.2L89.2 230.1L85.6 230.5L81.9 230.5L78.3 230.1L74.9 229.2L72 227.9L69.7 226.3L68.1 224.4L67.3 222.4\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M67.3 222.4L67.3 220.3L68.1 218.3L69.7 216.4L72 214.8L74.9 213.5L78.3 212.6L81.9 212.1L85.6 212.1L89.2 212.6L92.6 213.5L95.5 214.8L97.8 216.4L99.4 218.3L100.2 220.3L100.2 222.4M100.2 225.5L99.4 227.5L97.8 229.4L95.5 231L92.6 232.3L89.2 233.2L85.6 233.7L81.9 233.7L78.3 233.2L74.9 232.3L72 231L69.7 229.4L68.1 227.5L67.3 225.5M67.3 222.4L67.3 225.5M100.2 222.4L100.2 225.5\"/></g><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M71 213.8L71.7 212.3L72.9 210.8L74.7 209.6L76.9 208.6L79.5 207.9L82.3 207.5L85.2 207.5L88 207.9L90.6 208.6L92.8 209.6L94.6 210.8L95.8 212.3L96.5 213.8L96.5 222.1L95.8 223.7L94.6 225.1L92.8 226.4L90.6 227.4L88 228.1L85.2 228.4L82.3 228.4L79.5 228.1L76.9 227.4L74.7 226.4L72.9 225.1L71.7 223.7L71 222.1Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M92.8 226.4L90.6 227.4L90.6 220.7L92.8 219.7ZM96.5 222.1L95.8 223.7L95.8 217L96.5 215.4ZM95.8 223.7L94.6 225.1L94.6 218.4L95.8 217ZM94.6 225.1L92.8 226.4L92.8 219.7L94.6 218.4Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M90.6 227.4L88 228.1L88 221.4L90.6 220.7ZM88 228.1L85.2 228.4L85.2 221.8L88 221.4Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M85.2 228.4L82.3 228.4L82.3 221.8L85.2 221.8ZM82.3 228.4L79.5 228.1L79.5 221.4L82.3 221.8ZM79.5 228.1L76.9 227.4L76.9 220.7L79.5 221.4Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M76.9 227.4L74.7 226.4L74.7 219.7L76.9 220.7ZM74.7 226.4L72.9 225.1L72.9 218.4L74.7 219.7ZM72.9 225.1L71.7 223.7L71.7 217L72.9 218.4ZM71.7 223.7L71 222.1L71 215.4L71.7 217Z\"/><path class=\"iso-top\" d=\"M92.8 219.7L90.6 220.7L88 221.4L85.2 221.8L82.3 221.8L79.5 221.4L76.9 220.7L74.7 219.7L72.9 218.4L71.7 217L71 215.4L71 213.8L71.7 212.3L72.9 210.8L74.7 209.6L76.9 208.6L79.5 207.9L82.3 207.5L85.2 207.5L88 207.9L90.6 208.6L92.8 209.6L94.6 210.8L95.8 212.3L96.5 213.8L96.5 215.4L95.8 217L94.6 218.4Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M96.5 215.4L95.8 217L94.6 218.4L92.8 219.7L90.6 220.7L88 221.4L85.2 221.8L82.3 221.8L79.5 221.4L76.9 220.7L74.7 219.7L72.9 218.4L71.7 217L71 215.4\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M71 215.4L71 213.8L71.7 212.3L72.9 210.8L74.7 209.6L76.9 208.6L79.5 207.9L82.3 207.5L85.2 207.5L88 207.9L90.6 208.6L92.8 209.6L94.6 210.8L95.8 212.3L96.5 213.8L96.5 215.4M96.5 222.1L95.8 223.7L94.6 225.1L92.8 226.4L90.6 227.4L88 228.1L85.2 228.4L82.3 228.4L79.5 228.1L76.9 227.4L74.7 226.4L72.9 225.1L71.7 223.7L71 222.1M71 215.4L71 222.1M96.5 215.4L96.5 222.1\"/></g><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M499.8 293.4L500.6 291.4L502.2 289.5L504.5 287.9L507.4 286.6L510.8 285.7L514.4 285.2L518.1 285.2L521.7 285.7L525.1 286.6L528 287.9L530.3 289.5L531.9 291.4L532.7 293.4L532.7 298.6L531.9 300.6L530.3 302.5L528 304.1L525.1 305.4L521.7 306.3L518.1 306.8L514.4 306.8L510.8 306.3L507.4 305.4L504.5 304.1L502.2 302.5L500.6 300.6L499.8 298.6Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M528 304.1L525.1 305.4L525.1 302.3L528 301ZM532.7 298.6L531.9 300.6L531.9 297.5L532.7 295.5ZM531.9 300.6L530.3 302.5L530.3 299.4L531.9 297.5ZM530.3 302.5L528 304.1L528 301L530.3 299.4Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M525.1 305.4L521.7 306.3L521.7 303.2L525.1 302.3ZM521.7 306.3L518.1 306.8L518.1 303.7L521.7 303.2ZM518.1 306.8L514.4 306.8L514.4 303.7L518.1 303.7Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M514.4 306.8L510.8 306.3L510.8 303.2L514.4 303.7ZM510.8 306.3L507.4 305.4L507.4 302.3L510.8 303.2Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M507.4 305.4L504.5 304.1L504.5 301L507.4 302.3ZM504.5 304.1L502.2 302.5L502.2 299.4L504.5 301ZM502.2 302.5L500.6 300.6L500.6 297.5L502.2 299.4ZM500.6 300.6L499.8 298.6L499.8 295.5L500.6 297.5Z\"/><path class=\"iso-top\" d=\"M528 301L525.1 302.3L521.7 303.2L518.1 303.7L514.4 303.7L510.8 303.2L507.4 302.3L504.5 301L502.2 299.4L500.6 297.5L499.8 295.5L499.8 293.4L500.6 291.4L502.2 289.5L504.5 287.9L507.4 286.6L510.8 285.7L514.4 285.2L518.1 285.2L521.7 285.7L525.1 286.6L528 287.9L530.3 289.5L531.9 291.4L532.7 293.4L532.7 295.5L531.9 297.5L530.3 299.4Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M532.7 295.5L531.9 297.5L530.3 299.4L528 301L525.1 302.3L521.7 303.2L518.1 303.7L514.4 303.7L510.8 303.2L507.4 302.3L504.5 301L502.2 299.4L500.6 297.5L499.8 295.5\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M499.8 295.5L499.8 293.4L500.6 291.4L502.2 289.5L504.5 287.9L507.4 286.6L510.8 285.7L514.4 285.2L518.1 285.2L521.7 285.7L525.1 286.6L528 287.9L530.3 289.5L531.9 291.4L532.7 293.4L532.7 295.5M532.7 298.6L531.9 300.6L530.3 302.5L528 304.1L525.1 305.4L521.7 306.3L518.1 306.8L514.4 306.8L510.8 306.3L507.4 305.4L504.5 304.1L502.2 302.5L500.6 300.6L499.8 298.6M499.8 295.5L499.8 298.6M532.7 295.5L532.7 298.6\"/></g><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M503.5 287L504.2 285.4L505.4 283.9L507.2 282.7L509.4 281.7L512 281L514.8 280.6L517.7 280.6L520.5 281L523.1 281.7L525.3 282.7L527.1 283.9L528.3 285.4L529 287L529 295.2L528.3 296.8L527.1 298.2L525.3 299.5L523.1 300.5L520.5 301.2L517.7 301.6L514.8 301.6L512 301.2L509.4 300.5L507.2 299.5L505.4 298.2L504.2 296.8L503.5 295.2L503.5 293.6Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M525.3 299.5L523.1 300.5L523.1 293.8L525.3 292.8ZM529 295.2L528.3 296.8L528.3 290.1L529 288.6ZM528.3 296.8L527.1 298.2L527.1 291.6L528.3 290.1ZM527.1 298.2L525.3 299.5L525.3 292.8L527.1 291.6Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M523.1 300.5L520.5 301.2L520.5 294.5L523.1 293.8ZM520.5 301.2L517.7 301.6L517.7 294.9L520.5 294.5Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M517.7 301.6L514.8 301.6L514.8 294.9L517.7 294.9ZM514.8 301.6L512 301.2L512 294.5L514.8 294.9ZM512 301.2L509.4 300.5L509.4 293.8L512 294.5Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M509.4 300.5L507.2 299.5L507.2 292.8L509.4 293.8ZM507.2 299.5L505.4 298.2L505.4 291.6L507.2 292.8ZM505.4 298.2L504.2 296.8L504.2 290.1L505.4 291.6ZM504.2 296.8L503.5 295.2L503.5 288.6L504.2 290.1Z\"/><path class=\"iso-top\" d=\"M525.3 292.8L523.1 293.8L520.5 294.5L517.7 294.9L514.8 294.9L512 294.5L509.4 293.8L507.2 292.8L505.4 291.6L504.2 290.1L503.5 288.6L503.5 287L504.2 285.4L505.4 283.9L507.2 282.7L509.4 281.7L512 281L514.8 280.6L517.7 280.6L520.5 281L523.1 281.7L525.3 282.7L527.1 283.9L528.3 285.4L529 287L529 288.6L528.3 290.1L527.1 291.6Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M529 288.6L528.3 290.1L527.1 291.6L525.3 292.8L523.1 293.8L520.5 294.5L517.7 294.9L514.8 294.9L512 294.5L509.4 293.8L507.2 292.8L505.4 291.6L504.2 290.1L503.5 288.6\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M503.5 288.6L503.5 287L504.2 285.4L505.4 283.9L507.2 282.7L509.4 281.7L512 281L514.8 280.6L517.7 280.6L520.5 281L523.1 281.7L525.3 282.7L527.1 283.9L528.3 285.4L529 287L529 288.6M529 295.2L528.3 296.8L527.1 298.2L525.3 299.5L523.1 300.5L520.5 301.2L517.7 301.6L514.8 301.6L512 301.2L509.4 300.5L507.2 299.5L505.4 298.2L504.2 296.8L503.5 295.2M503.5 288.6L503.5 295.2M529 288.6L529 295.2\"/></g><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M348.9 377.8L349.7 375.7L351.3 373.9L353.6 372.2L356.5 370.9L359.9 370L363.5 369.6L367.2 369.6L370.9 370L374.2 370.9L377.1 372.2L379.4 373.9L381 375.7L381.9 377.8L381.9 383L381 385L379.4 386.9L377.1 388.5L374.2 389.8L370.9 390.7L367.2 391.2L363.5 391.2L359.9 390.7L356.5 389.8L353.6 388.5L351.3 386.9L349.7 385L348.9 383Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M377.1 388.5L374.2 389.8L374.2 386.7L377.1 385.4ZM381.9 383L381 385L381 381.9L381.9 379.8ZM381 385L379.4 386.9L379.4 383.7L381 381.9ZM379.4 386.9L377.1 388.5L377.1 385.4L379.4 383.7Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M374.2 389.8L370.9 390.7L370.9 387.6L374.2 386.7ZM370.9 390.7L367.2 391.2L367.2 388L370.9 387.6ZM367.2 391.2L363.5 391.2L363.5 388L367.2 388Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M363.5 391.2L359.9 390.7L359.9 387.6L363.5 388ZM359.9 390.7L356.5 389.8L356.5 386.7L359.9 387.6Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M356.5 389.8L353.6 388.5L353.6 385.4L356.5 386.7ZM353.6 388.5L351.3 386.9L351.3 383.7L353.6 385.4ZM351.3 386.9L349.7 385L349.7 381.9L351.3 383.7ZM349.7 385L348.9 383L348.9 379.8L349.7 381.9Z\"/><path class=\"iso-top\" d=\"M377.1 385.4L374.2 386.7L370.9 387.6L367.2 388L363.5 388L359.9 387.6L356.5 386.7L353.6 385.4L351.3 383.7L349.7 381.9L348.9 379.8L348.9 377.8L349.7 375.7L351.3 373.9L353.6 372.2L356.5 370.9L359.9 370L363.5 369.6L367.2 369.6L370.9 370L374.2 370.9L377.1 372.2L379.4 373.9L381 375.7L381.9 377.8L381.9 379.8L381 381.9L379.4 383.7Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M381.9 379.8L381 381.9L379.4 383.7L377.1 385.4L374.2 386.7L370.9 387.6L367.2 388L363.5 388L359.9 387.6L356.5 386.7L353.6 385.4L351.3 383.7L349.7 381.9L348.9 379.8\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M348.9 379.8L348.9 377.8L349.7 375.7L351.3 373.9L353.6 372.2L356.5 370.9L359.9 370L363.5 369.6L367.2 369.6L370.9 370L374.2 370.9L377.1 372.2L379.4 373.9L381 375.7L381.9 377.8L381.9 379.8M381.9 383L381 385L379.4 386.9L377.1 388.5L374.2 389.8L370.9 390.7L367.2 391.2L363.5 391.2L359.9 390.7L356.5 389.8L353.6 388.5L351.3 386.9L349.7 385L348.9 383M348.9 379.8L348.9 383M381.9 379.8L381.9 383\"/></g><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M352.7 371.3L353.3 369.8L354.5 368.3L356.3 367.1L358.6 366.1L361.1 365.4L363.9 365L366.8 365L369.6 365.4L372.2 366.1L374.4 367.1L376.2 368.3L377.5 369.8L378.1 371.3L378.1 379.6L377.5 381.2L376.2 382.6L374.4 383.9L372.2 384.9L369.6 385.6L366.8 385.9L363.9 385.9L361.1 385.6L358.6 384.9L356.3 383.9L354.5 382.6L353.3 381.2L352.7 379.6Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M374.4 383.9L372.2 384.9L372.2 378.2L374.4 377.2ZM378.1 379.6L377.5 381.2L377.5 374.5L378.1 372.9ZM377.5 381.2L376.2 382.6L376.2 375.9L377.5 374.5ZM376.2 382.6L374.4 383.9L374.4 377.2L376.2 375.9Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M372.2 384.9L369.6 385.6L369.6 378.9L372.2 378.2ZM369.6 385.6L366.8 385.9L366.8 379.2L369.6 378.9Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M366.8 385.9L363.9 385.9L363.9 379.2L366.8 379.2ZM363.9 385.9L361.1 385.6L361.1 378.9L363.9 379.2ZM361.1 385.6L358.6 384.9L358.6 378.2L361.1 378.9Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M358.6 384.9L356.3 383.9L356.3 377.2L358.6 378.2ZM356.3 383.9L354.5 382.6L354.5 375.9L356.3 377.2ZM354.5 382.6L353.3 381.2L353.3 374.5L354.5 375.9ZM353.3 381.2L352.7 379.6L352.7 372.9L353.3 374.5Z\"/><path class=\"iso-top\" d=\"M374.4 377.2L372.2 378.2L369.6 378.9L366.8 379.2L363.9 379.2L361.1 378.9L358.6 378.2L356.3 377.2L354.5 375.9L353.3 374.5L352.7 372.9L352.7 371.3L353.3 369.8L354.5 368.3L356.3 367.1L358.6 366.1L361.1 365.4L363.9 365L366.8 365L369.6 365.4L372.2 366.1L374.4 367.1L376.2 368.3L377.5 369.8L378.1 371.3L378.1 372.9L377.5 374.5L376.2 375.9Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M378.1 372.9L377.5 374.5L376.2 375.9L374.4 377.2L372.2 378.2L369.6 378.9L366.8 379.2L363.9 379.2L361.1 378.9L358.6 378.2L356.3 377.2L354.5 375.9L353.3 374.5L352.7 372.9\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M352.7 372.9L352.7 371.3L353.3 369.8L354.5 368.3L356.3 367.1L358.6 366.1L361.1 365.4L363.9 365L366.8 365L369.6 365.4L372.2 366.1L374.4 367.1L376.2 368.3L377.5 369.8L378.1 371.3L378.1 372.9M378.1 379.6L377.5 381.2L376.2 382.6L374.4 383.9L372.2 384.9L369.6 385.6L366.8 385.9L363.9 385.9L361.1 385.6L358.6 384.9L356.3 383.9L354.5 382.6L353.3 381.2L352.7 379.6M352.7 372.9L352.7 379.6M378.1 372.9L378.1 379.6\"/></g><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M18.8 198.9L19.2 196.6L20.5 194.4L22.4 192.3L25.1 190.5L219.5 81.7L222.8 80.3L226.5 79.2L230.5 78.5L234.6 78.2L238.8 78.5L242.8 79.2L246.5 80.3L249.7 81.7L574.9 263.6L577.6 265.4L579.5 267.5L580.8 269.7L581.2 272L581.2 287.8L580.8 290.1L579.5 292.3L577.6 294.4L574.9 296.2L380.5 404.9L377.2 406.4L373.5 407.5L369.5 408.2L365.4 408.4L361.2 408.2L357.2 407.5L353.5 406.4L350.3 404.9L25.1 223.1L22.4 221.3L20.5 219.2L19.2 217L18.8 214.6Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M581.2 287.8L580.8 290.1L580.8 274.4L581.2 272ZM580.8 290.1L579.5 292.3L579.5 276.6L580.8 274.4ZM579.5 292.3L577.6 294.4L577.6 278.7L579.5 276.6ZM577.6 294.4L574.9 296.2L574.9 280.5L577.6 278.7ZM574.9 296.2L380.5 404.9L380.5 389.2L574.9 280.5ZM380.5 404.9L377.2 406.4L377.2 390.7L380.5 389.2Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M377.2 406.4L373.5 407.5L373.5 391.8L377.2 390.7ZM373.5 407.5L369.5 408.2L369.5 392.5L373.5 391.8ZM369.5 408.2L365.4 408.4L365.4 392.7L369.5 392.5Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M365.4 408.4L361.2 408.2L361.2 392.5L365.4 392.7ZM361.2 408.2L357.2 407.5L357.2 391.8L361.2 392.5ZM357.2 407.5L353.5 406.4L353.5 390.7L357.2 391.8Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M353.5 406.4L350.3 404.9L350.3 389.2L353.5 390.7ZM350.3 404.9L25.1 223.1L25.1 207.4L350.3 389.2ZM25.1 223.1L22.4 221.3L22.4 205.5L25.1 207.4ZM22.4 221.3L20.5 219.2L20.5 203.5L22.4 205.5ZM20.5 219.2L19.2 217L19.2 201.2L20.5 203.5ZM19.2 217L18.8 214.6L18.8 198.9L19.2 201.2Z\"/><path class=\"iso-top\" d=\"M574.9 263.6L577.6 265.4L579.5 267.5L580.8 269.7L581.2 272L580.8 274.4L579.5 276.6L577.6 278.7L574.9 280.5L380.5 389.2L377.2 390.7L373.5 391.8L369.5 392.5L365.4 392.7L361.2 392.5L357.2 391.8L353.5 390.7L350.3 389.2L25.1 207.4L22.4 205.5L20.5 203.5L19.2 201.2L18.8 198.9L19.2 196.6L20.5 194.4L22.4 192.3L25.1 190.5L219.5 81.7L222.8 80.3L226.5 79.2L230.5 78.5L234.6 78.2L238.8 78.5L242.8 79.2L246.5 80.3L249.7 81.7Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M581.2 272L580.8 274.4L579.5 276.6L577.6 278.7L574.9 280.5L380.5 389.2L377.2 390.7L373.5 391.8L369.5 392.5L365.4 392.7L361.2 392.5L357.2 391.8L353.5 390.7L350.3 389.2L25.1 207.4L22.4 205.5L20.5 203.5L19.2 201.2L18.8 198.9\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M581.2 272L577 273.9L576 275.8L574.4 277.5L572.1 279L377.9 387.6L375.1 388.9L372.1 389.8L368.8 390.4L365.4 390.6L362 390.4L358.7 389.8L355.6 388.9L352.8 387.6L27.9 205.9L25.6 204.4L24 202.7L23 200.8L18.8 198.9\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M581.2 278.3L580.8 280.6L579.5 282.9L577.6 284.9L574.9 286.8L380.5 395.5L377.2 397L373.5 398.1L369.5 398.8L365.4 399L361.2 398.8L357.2 398.1L353.5 397L350.3 395.5L25.1 213.6L22.4 211.8L20.5 209.8L19.2 207.5L18.8 205.2\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M18.8 198.9L19.2 196.6L20.5 194.4L22.4 192.3L25.1 190.5L219.5 81.7L222.8 80.3L226.5 79.2L230.5 78.5L234.6 78.2L238.8 78.5L242.8 79.2L246.5 80.3L249.7 81.7L574.9 263.6L577.6 265.4L579.5 267.5L580.8 269.7L581.2 272M581.2 287.8L580.8 290.1L579.5 292.3L577.6 294.4L574.9 296.2L380.5 404.9L377.2 406.4L373.5 407.5L369.5 408.2L365.4 408.4L361.2 408.2L357.2 407.5L353.5 406.4L350.3 404.9L25.1 223.1L22.4 221.3L20.5 219.2L19.2 217L18.8 214.6M581.2 272L581.2 287.8M18.8 198.9L18.8 214.6\"/></g><path class=\"iso-line\" data-tone=\"lo\" d=\"M566.5 268.3L567.7 269.1L568.6 270L569.1 271L569.3 272L569.1 273.1L568.6 274.1L567.7 275L566.5 275.8L372.1 384.5L370.6 385.2L369 385.7L367.2 386L365.4 386.1L363.5 386L361.7 385.7L360.1 385.2L358.7 384.5L33.5 202.7L32.3 201.9L31.4 200.9L30.9 200L30.7 198.9L30.9 197.9L31.4 196.9L32.3 196L33.5 195.2L227.9 86.4L229.4 85.8L231 85.3L232.8 85L234.6 84.9L236.5 85L238.3 85.3L239.9 85.8L241.3 86.4Z\"/><path class=\"iso-line\" data-tone=\"lo\" d=\"M238.3 94.1L236.6 94.7L234.6 95L232.6 94.7L230.9 94.1L229.8 93.2L229.4 92.1L229.8 90.9L230.9 90L232.6 89.4L234.6 89.1L236.6 89.4L238.3 90L239.4 90.9L239.8 92.1L239.4 93.2ZM560.2 274.1L558.5 274.7L556.5 274.9L554.5 274.7L552.8 274.1L551.7 273.1L551.3 272L551.7 270.9L552.8 270L554.5 269.3L556.5 269.1L558.5 269.3L560.2 270L561.3 270.9L561.7 272L561.3 273.1ZM47.2 201L45.5 201.6L43.5 201.8L41.5 201.6L39.8 201L38.7 200L38.3 198.9L38.7 197.8L39.8 196.9L41.5 196.2L43.5 196L45.5 196.2L47.2 196.9L48.3 197.8L48.7 198.9L48.3 200ZM369.1 381L367.4 381.6L365.4 381.8L363.4 381.6L361.7 381L360.6 380L360.2 378.9L360.6 377.8L361.7 376.8L363.4 376.2L365.4 376L367.4 376.2L369.1 376.8L370.2 377.8L370.6 378.9L370.2 380Z\"/><g class=\"iso-dots\" data-tone=\"mid\"><circle cx=\"234.6\" cy=\"92.1\" r=\"0.5\"/><circle cx=\"556.5\" cy=\"272\" r=\"0.5\"/><circle cx=\"43.5\" cy=\"198.9\" r=\"0.5\"/><circle cx=\"365.4\" cy=\"378.9\" r=\"0.5\"/></g><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M36.2 201.7L36.8 201.1L45.2 196.4L46.3 196.1L47.5 196.1L48.6 196.4L367.1 374.5L367.7 375.1L367.7 377.4L367.1 378L358.7 382.6L357.6 383L356.4 383L355.3 382.6L36.8 204.5L36.2 203.9Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M367.7 377.4L367.1 378L367.1 376.4L367.7 375.8ZM367.1 378L358.7 382.6L358.7 381.1L367.1 376.4Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M358.7 382.6L357.6 383L357.6 381.4L358.7 381.1ZM357.6 383L356.4 383L356.4 381.4L357.6 381.4Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M356.4 383L355.3 382.6L355.3 381.1L356.4 381.4ZM355.3 382.6L36.8 204.5L36.8 203L355.3 381.1ZM36.8 204.5L36.2 203.9L36.2 202.4L36.8 203Z\"/><path class=\"iso-top\" d=\"M367.1 374.5L367.7 375.1L367.7 375.8L367.1 376.4L358.7 381.1L357.6 381.4L356.4 381.4L355.3 381.1L36.8 203L36.2 202.4L36.2 201.7L36.8 201.1L45.2 196.4L46.3 196.1L47.5 196.1L48.6 196.4Z\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M36.2 202.4L36.2 201.7L36.8 201.1L45.2 196.4L46.3 196.1L47.5 196.1L48.6 196.4L367.1 374.5L367.7 375.1L367.7 375.8M367.7 377.4L367.1 378L358.7 382.6L357.6 383L356.4 383L355.3 382.6L36.8 204.5L36.2 203.9M367.7 375.8L367.7 377.4M36.2 202.4L36.2 203.9\"/></g><path class=\"iso-line\" data-tone=\"lo\" d=\"M52.6 198.7L49.3 200.6M58.4 201.9L55 203.8M64.1 205.1L60.8 207M69.9 208.3L66.5 210.2M75.6 211.5L72.3 213.4M81.4 214.8L78 216.6M92.9 221.2L89.5 223.1M98.6 224.4L95.3 226.3M104.4 227.6L101 229.5M110.1 230.8L106.7 232.7M115.8 234L112.5 235.9M121.6 237.2L118.2 239.1M133.1 243.7L129.7 245.6M138.8 246.9L135.5 248.8M144.6 250.1L141.2 252M150.3 253.3L147 255.2M156.1 256.5L152.7 258.4M161.8 259.7L158.5 261.6M173.3 266.2L170 268M179.1 269.4L175.7 271.3M184.8 272.6L181.5 274.5M190.6 275.8L187.2 277.7M196.3 279L193 280.9M202.1 282.2L198.7 284.1M213.6 288.7L210.2 290.5M219.3 291.9L215.9 293.8M225 295.1L221.7 297M230.8 298.3L227.4 300.2M236.5 301.5L233.2 303.4M242.3 304.7L238.9 306.6M253.8 311.2L250.4 313M259.5 314.4L256.2 316.3M265.3 317.6L261.9 319.5M271 320.8L267.7 322.7M276.8 324L273.4 325.9M282.5 327.2L279.2 329.1M294 333.7L290.7 335.5M299.8 336.9L296.4 338.8M305.5 340.1L302.2 342M311.3 343.3L307.9 345.2M317 346.5L313.6 348.4M322.7 349.7L319.4 351.6M334.2 356.2L330.9 358M340 359.4L336.6 361.3M345.7 362.6L342.4 364.5M351.5 365.8L348.1 367.7M357.2 369L353.9 370.9M363 372.2L359.6 374.1\"/><path class=\"iso-line\" data-tone=\"mid\" d=\"M46.9 195.5L41.2 198.7M87.1 218L81.4 221.2M127.3 240.5L121.6 243.7M167.6 263L161.9 266.1M207.8 285.5L202.1 288.6M248 308L242.3 311.1M288.3 330.5L282.6 333.6M328.5 352.9L322.8 356.1M368.7 375.4L363 378.6\"/><path class=\"fe-recheck\" d=\"M359.7 379.4L360.1 379.9L359.7 380.5L359 380.9L358 381.1L357 380.9L278.5 337L278.1 336.5L278.5 335.9L279.2 335.5L280.2 335.3L281.2 335.5Z\"/><path class=\"iso-line\" data-tone=\"mid\" d=\"M359.7 379.4L360.1 379.9L359.7 380.5L359 380.9L358 381.1L357 380.9L278.5 337L278.1 336.5L278.5 335.9L279.2 335.5L280.2 335.3L281.2 335.5Z\"/><g data-part=\"dosemarks\"></g><path class=\"fe-bed\" fill-rule=\"evenodd\" d=\"M398.1 250L405.4 254.8L411.4 260.2L415.7 266.1L418.4 272.2L419.2 278.6L418.4 284.9L415.7 291.1L411.4 296.9L405.4 302.3L398.1 307.2L391.4 310.9L382.7 315L373.1 318.3L362.6 320.8L351.5 322.3L340.2 322.8L328.9 322.3L317.9 320.8L307.4 318.3L297.7 315L289.1 310.9L165.1 241.5L157.7 236.7L151.8 231.3L147.4 225.5L144.8 219.3L143.9 213L144.8 206.6L147.4 200.5L151.8 194.6L157.7 189.2L165.1 184.4L171.8 180.6L180.4 176.5L190.1 173.2L200.5 170.8L211.6 169.3L222.9 168.8L234.2 169.3L245.2 170.8L255.7 173.2L265.4 176.5L274 180.6ZM372.9 264L376.7 266.5L379.7 269.2L381.9 272.2L383.2 275.4L383.7 278.6L383.2 281.8L381.9 284.9L379.7 287.9L376.7 290.7L372.9 293.1L366.2 296.9L361.8 298.9L356.9 300.6L351.6 301.9L346 302.6L340.2 302.9L334.5 302.6L328.9 301.9L323.5 300.6L318.6 298.9L314.2 296.9L190.2 227.5L186.5 225L183.4 222.3L181.2 219.3L179.9 216.2L179.4 213L179.9 209.7L181.2 206.6L183.4 203.6L186.5 200.9L190.2 198.4L196.9 194.7L201.3 192.6L206.2 190.9L211.5 189.7L217.1 188.9L222.9 188.7L228.6 188.9L234.2 189.7L239.6 190.9L244.5 192.6L248.9 194.7Z\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M398.1 250L405.4 254.8L411.4 260.2L415.7 266.1L418.4 272.2L419.2 278.6L418.4 284.9L415.7 291.1L411.4 296.9L405.4 302.3L398.1 307.2L391.4 310.9L382.7 315L373.1 318.3L362.6 320.8L351.5 322.3L340.2 322.8L328.9 322.3L317.9 320.8L307.4 318.3L297.7 315L289.1 310.9L165.1 241.5L157.7 236.7L151.8 231.3L147.4 225.5L144.8 219.3L143.9 213L144.8 206.6L147.4 200.5L151.8 194.6L157.7 189.2L165.1 184.4L171.8 180.6L180.4 176.5L190.1 173.2L200.5 170.8L211.6 169.3L222.9 168.8L234.2 169.3L245.2 170.8L255.7 173.2L265.4 176.5L274 180.6ZM372.9 264L376.7 266.5L379.7 269.2L381.9 272.2L383.2 275.4L383.7 278.6L383.2 281.8L381.9 284.9L379.7 287.9L376.7 290.7L372.9 293.1L366.2 296.9L361.8 298.9L356.9 300.6L351.6 301.9L346 302.6L340.2 302.9L334.5 302.6L328.9 301.9L323.5 300.6L318.6 298.9L314.2 296.9L190.2 227.5L186.5 225L183.4 222.3L181.2 219.3L179.9 216.2L179.4 213L179.9 209.7L181.2 206.6L183.4 203.6L186.5 200.9L190.2 198.4L196.9 194.7L201.3 192.6L206.2 190.9L211.5 189.7L217.1 188.9L222.9 188.7L228.6 188.9L234.2 189.7L239.6 190.9L244.5 192.6L248.9 194.7Z\"/><path class=\"iso-line\" data-tone=\"lo\" d=\"M380.1 258.9L390.9 252.9M388.8 265.5L402.3 261.6M393.3 273.3L408.3 272M393.3 281.5L408.3 282.8M388.8 289.3L402.3 293.2M380.1 296L390.9 302M367.8 302.4L376.7 309.3M354.7 306.1L359.4 314.2M340.2 307.4L340.2 315.9M325.7 306.1L321 314.2M312.6 302.4L303.7 309.3M183 230.4L172.3 236.4M174.4 223.7L160.8 227.6M169.8 215.9L154.8 217.2M169.8 207.7L154.8 206.4M174.4 199.9L160.8 196M183 193.2L172.3 187.2M195.3 186.8L186.4 179.9M208.4 183.1L203.7 175M222.9 181.8L222.9 173.3M237.4 183.1L242.1 175M250.5 186.8L259.4 179.9\"/><path class=\"iso-line\" data-tone=\"mid\" d=\"M390.9 252.9L397.2 257L402.3 261.6L406 266.7L408.3 272L409 277.4L408.3 282.8L406 288.1L402.3 293.2L397.2 297.8L390.9 302L384.2 305.7L376.7 309.3L368.4 312.1L359.4 314.2L349.9 315.5L340.2 315.9L330.5 315.5L321 314.2L312 312.1L303.7 309.3L296.3 305.7L172.3 236.4L165.9 232.2L160.8 227.6L157.1 222.5L154.8 217.2L154.1 211.8L154.8 206.4L157.1 201.1L160.8 196L165.9 191.4L172.3 187.2L179 183.5L186.4 179.9L194.7 177.1L203.7 175L213.2 173.7L222.9 173.3L232.6 173.7L242.1 175L251.1 177.1L259.4 179.9L266.8 183.5ZM380.1 258.9L384.9 262L388.8 265.5L391.6 269.3L393.3 273.3L393.9 277.4L393.3 281.5L391.6 285.5L388.8 289.3L384.9 292.8L380.1 296L373.4 299.7L367.8 302.4L361.5 304.6L354.7 306.1L347.6 307.1L340.2 307.4L332.9 307.1L325.7 306.1L318.9 304.6L312.6 302.4L307 299.7L183 230.4L178.2 227.2L174.4 223.7L171.5 219.9L169.8 215.9L169.2 211.8L169.8 207.7L171.5 203.7L174.4 199.9L178.2 196.4L183 193.2L189.7 189.5L195.3 186.8L201.6 184.7L208.4 183.1L215.5 182.1L222.9 181.8L230.2 182.1L237.4 183.1L244.2 184.7L250.5 186.8L256.1 189.5Z\"/><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M387 237.9L388 236.5L450 201.8L452.5 201.2L455.1 201.8L480.2 215.9L481.2 217.3L481.2 217.7L480.2 219.1L418.2 253.8L415.7 254.3L413.2 253.8L388 239.7L387 238.3Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M481.2 217.7L480.2 219.1L480.2 218.7L481.2 217.3ZM480.2 219.1L418.2 253.8L418.2 253.4L480.2 218.7Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M418.2 253.8L415.7 254.3L415.7 253.9L418.2 253.4Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M415.7 254.3L413.2 253.8L413.2 253.4L415.7 253.9Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M413.2 253.8L388 239.7L388 239.3L413.2 253.4ZM388 239.7L387 238.3L387 237.9L388 239.3Z\"/><path class=\"iso-top\" d=\"M480.2 215.9L481.2 217.3L480.2 218.7L418.2 253.4L415.7 253.9L413.2 253.4L388 239.3L387 237.9L388 236.5L450 201.8L452.5 201.2L455.1 201.8Z\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M387 237.9L388 236.5L450 201.8L452.5 201.2L455.1 201.8L480.2 215.9L481.2 217.3M481.2 217.7L480.2 219.1L418.2 253.8L415.7 254.3L413.2 253.8L388 239.7L387 238.3M481.2 217.3L481.2 217.7M387 237.9L387 238.3\"/></g><path class=\"iso-line\" data-tone=\"faint\" d=\"M478.2 217L478.4 217.3L478.2 217.6L416.2 252.2L415.7 252.4L415.2 252.2L390 238.2L389.8 237.9L390 237.6L452 202.9L452.5 202.8L453 202.9Z\"/><g class=\"it\" data-name=\"dock\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M194.8 68L196.1 66.8L229.6 48.1L231.7 47.4L234.2 47.4L236.3 48.1L306.7 87.4L307.9 88.6L307.9 127.9L307.9 129.3L306.7 130.5L273.2 149.2L271.1 149.9L268.6 149.9L266.5 149.2L196.1 109.9L194.8 108.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M307.9 129.3L306.7 130.5L306.7 91.2L307.9 90ZM306.7 130.5L273.2 149.2L273.2 109.9L306.7 91.2Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M273.2 149.2L271.1 149.9L271.1 110.6L273.2 109.9Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M271.1 149.9L268.6 149.9L268.6 110.6L271.1 110.6ZM268.6 149.9L266.5 149.2L266.5 109.9L268.6 110.6Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M266.5 149.2L196.1 109.9L196.1 70.6L266.5 109.9ZM196.1 109.9L194.8 108.7L194.8 69.4L196.1 70.6Z\"/><path class=\"iso-top\" d=\"M306.7 87.4L307.9 88.6L307.9 90L306.7 91.2L273.2 109.9L271.1 110.6L268.6 110.6L266.5 109.9L196.1 70.6L194.8 69.4L194.8 68L196.1 66.8L229.6 48.1L231.7 47.4L234.2 47.4L236.3 48.1Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M307.9 90L306.7 91.2L273.2 109.9L271.1 110.6L268.6 110.6L266.5 109.9L196.1 70.6L194.8 69.4\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M307.9 90L305.6 90.7L272.3 109.3L270.7 109.8L269 109.8L267.3 109.3L197.2 70.1L194.8 69.4\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M307.9 117.5L306.7 118.7L273.2 137.4L271.1 138.1L268.6 138.1L266.5 137.4L196.1 98.1L194.8 96.9\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M194.8 69.4L194.8 68L196.1 66.8L229.6 48.1L231.7 47.4L234.2 47.4L236.3 48.1L306.7 87.4L307.9 88.6L307.9 90M307.9 129.3L306.7 130.5L273.2 149.2L271.1 149.9L268.6 149.9L266.5 149.2L196.1 109.9L194.8 108.7M307.9 90L307.9 129.3M194.8 69.4L194.8 108.7\"/></g><g class=\"iso-dots\" data-tone=\"mid\"><circle cx=\"232.9\" cy=\"50.7\" r=\"0.5\"/><circle cx=\"302\" cy=\"89.3\" r=\"0.5\"/><circle cx=\"200.8\" cy=\"68.7\" r=\"0.5\"/><circle cx=\"269.8\" cy=\"107.3\" r=\"0.5\"/></g><path class=\"iso-line\" data-tone=\"faint\" d=\"M212 118.8L212 79.5M231.3 129.6L231.3 90.2M250.5 140.3L250.5 101\"/></g><g class=\"it\" data-name=\"dial.pedestal\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M180.1 117.2L181.2 115.8L192.9 109.2L195.4 108.6L197.9 109.2L209.6 115.8L210.7 117.2L210.7 129L209.6 130.4L197.9 137L195.4 137.5L192.9 137L181.2 130.4L180.1 129Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M210.7 129L209.6 130.4L209.6 118.6L210.7 117.2ZM209.6 130.4L197.9 137L197.9 125.2L209.6 118.6Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M197.9 137L195.4 137.5L195.4 125.7L197.9 125.2Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M195.4 137.5L192.9 137L192.9 125.2L195.4 125.7Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M192.9 137L181.2 130.4L181.2 118.6L192.9 125.2ZM181.2 130.4L180.1 129L180.1 117.2L181.2 118.6Z\"/><path class=\"iso-top\" d=\"M209.6 115.8L210.7 117.2L209.6 118.6L197.9 125.2L195.4 125.7L192.9 125.2L181.2 118.6L180.1 117.2L181.2 115.8L192.9 109.2L195.4 108.6L197.9 109.2Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M210.7 117.2L209.6 118.6L197.9 125.2L195.4 125.7L192.9 125.2L181.2 118.6L180.1 117.2\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M180.1 117.2L181.2 115.8L192.9 109.2L195.4 108.6L197.9 109.2L209.6 115.8L210.7 117.2M210.7 129L209.6 130.4L197.9 137L195.4 137.5L192.9 137L181.2 130.4L180.1 129M210.7 117.2L210.7 129M180.1 117.2L180.1 129\"/></g></g><g class=\"it\" data-name=\"dock.hopper\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M212.6 50.5L212.7 49.7L212.9 48.8L213.2 48L213.5 47.2L214 46.4L214.5 45.6L215.2 44.9L215.9 44.2L216.7 43.5L217.6 42.8L218.5 42.1L219.5 41.5L220.6 41L221.8 40.4L223 39.9L224.2 39.5L225.5 39.1L226.9 38.7L228.3 38.4L229.7 38.2L231.1 38L232.6 37.8L234.1 37.7L235.6 37.7L237 37.7L238.5 37.7L240 37.8L241.5 38L242.9 38.2L244.3 38.4L245.7 38.7L247.1 39.1L248.4 39.5L249.6 39.9L250.8 40.4L252 41L253.1 41.5L254.1 42.1L255 42.8L255.9 43.5L256.7 44.2L257.4 44.9L258.1 45.6L258.6 46.4L259.1 47.2L259.4 48L259.7 48.8L259.9 49.7L260 50.5L260 53.3L259.9 54.1L259.7 54.9L259.4 55.8L259.1 56.6L258.6 57.4L258.1 58.1L257.4 58.9L256.7 59.6L242.8 72.7L242.6 72.9L242.3 73.2L242 73.4L241.7 73.6L241.3 73.7L241 73.9L240.6 74.1L240.2 74.2L239.7 74.3L239.3 74.5L238.9 74.5L238.4 74.6L238 74.7L237.5 74.7L237 74.8L236.5 74.8L236.1 74.8L235.6 74.8L235.1 74.7L234.6 74.7L234.2 74.6L233.7 74.5L233.3 74.5L232.9 74.3L232.4 74.2L232 74.1L231.7 73.9L231.3 73.7L230.9 73.6L230.6 73.4L230.3 73.2L230 72.9L229.8 72.7L215.9 59.6L215.2 58.9L214.5 58.1L214 57.4L213.5 56.6L213.2 55.8L212.9 54.9L212.7 54.1L212.6 53.3Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M243.9 70.7L243.8 71.2L243.6 71.7L243.3 72.2L242.8 72.7L242.3 73.2L241.7 73.6L241 73.9L240.2 74.2L239.3 74.5L238.4 74.6L237.5 74.7L236.5 74.8L236.5 68.9L237.5 68.9L238.4 68.7L239.3 68.6L240.2 68.3L241 68L241.7 67.7L242.3 67.3L242.8 66.8L243.3 66.3L243.6 65.8L243.8 65.3L243.9 64.8ZM243 68L242.1 68.5L241.1 68.8L240.1 69.1L238.9 69.4L237.8 69.5L236.6 69.6L235.4 69.5L234.2 69.4L233.1 69.3L232 69L231 68.7L230 68.2L229.2 67.8L218.5 61.6L220.6 62.8L223 63.8L225.5 64.7L228.3 65.3L231.1 65.8L234.1 66.1L237 66.1L240 66L242.9 65.6L245.7 65L248.4 64.3L250.8 63.3L253.1 62.2ZM260 53.3L259.7 54.9L259.1 56.6L258.1 58.1L256.7 59.6L255 61L253.1 62.2L250.8 63.3L248.4 64.3L245.7 65L242.9 65.6L240 66L237 66.1L237 64.2L240 64L242.9 63.6L245.7 63.1L248.4 62.3L250.8 61.4L253.1 60.3L255 59L256.7 57.7L258.1 56.2L259.1 54.6L259.7 53L260 51.3Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M236.5 74.8L235.6 74.8L234.6 74.7L233.7 74.5L233.7 68.7L234.6 68.8L235.6 68.9L236.5 68.9ZM237 66.1L234.1 66.1L231.1 65.8L228.3 65.3L228.3 63.4L231.1 63.8L234.1 64.1L237 64.2Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M233.7 74.5L232.9 74.3L232 74.1L231.3 73.7L231.3 67.8L232 68.2L232.9 68.4L233.7 68.7ZM228.3 65.3L225.5 64.7L223 63.8L220.6 62.8L220.6 60.8L223 61.9L225.5 62.7L228.3 63.4Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M231.3 73.7L230.6 73.4L230 72.9L229.5 72.5L229.2 72L228.9 71.5L228.9 65.6L229.2 66.1L229.5 66.6L230 67L230.6 67.5L231.3 67.8ZM220.6 62.8L218.5 61.6L216.7 60.3L215.2 58.9L214 57.4L213.2 55.8L213.2 53.8L214 55.4L215.2 56.9L216.7 58.4L218.5 59.7L220.6 60.8Z\"/><path class=\"iso-top\" d=\"M228.9 71.5L228.7 71L228.7 70.4L228.7 64.5L228.7 65.1L228.9 65.6ZM213.2 55.8L212.7 54.1L212.6 52.5L212.6 50.5L212.7 52.2L213.2 53.8ZM253.1 60.3L250.8 61.4L248.4 62.3L245.7 63.1L242.9 63.6L240 64L237 64.2L234.1 64.1L231.1 63.8L228.3 63.4L225.5 62.7L223 61.9L220.6 60.8L218.5 59.7L216.7 58.4L215.2 56.9L214 55.4L213.2 53.8L212.7 52.2L212.6 50.5L212.9 48.8L213.5 47.2L214.5 45.6L215.9 44.2L217.6 42.8L219.5 41.5L221.8 40.4L224.2 39.5L226.9 38.7L229.7 38.2L232.6 37.8L235.6 37.7L238.5 37.7L241.5 38L244.3 38.4L247.1 39.1L249.6 39.9L252 41L254.1 42.1L255.9 43.5L257.4 44.9L258.6 46.4L259.4 48L259.9 49.7L260 51.3L259.7 53L259.1 54.6L258.1 56.2L256.7 57.7L255 59L253.1 60.3L236.3 50.9L236.3 50.9L236.3 50.9L236.3 50.9L236.3 50.9L236.3 50.9L236.3 50.9L236.3 50.9L236.3 50.9L236.3 50.9L236.3 50.9L236.3 50.9L236.3 50.9L236.3 50.9L236.3 50.9L236.3 50.9L236.3 50.9L236.3 50.9L236.3 50.9L236.3 50.9L236.3 50.9L236.3 50.9L236.3 50.9L236.3 50.9L236.3 50.9L236.3 50.9L236.3 50.9L236.3 50.9L236.3 50.9L236.3 50.9L236.3 50.9L236.3 50.9L236.3 50.9L236.3 50.9L236.3 50.9L236.3 50.9L236.3 50.9L236.3 50.9L236.3 50.9L236.3 50.9L236.3 50.9L236.3 50.9L236.3 50.9L236.3 50.9L236.3 50.9L236.3 50.9L236.3 50.9L236.3 50.9L236.3 50.9L236.3 50.9L236.3 50.9Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M253.3 62.1L252.2 62.7L251.1 63.2L250 63.7L248.7 64.2L247.5 64.6L246.2 64.9L244.8 65.2L243.5 65.5L242.1 65.7L240.6 65.9L239.2 66L237.8 66.1L236.3 66.1L234.8 66.1L233.4 66L232 65.9L230.5 65.7L229.1 65.5L227.8 65.2L226.4 64.9L225.1 64.6L223.9 64.2L222.6 63.7L221.5 63.2L220.4 62.7L219.3 62.1M260 50.9L260 51.7L259.8 52.6L259.6 53.4L259.3 54.2L258.8 55L258.3 55.8L257.8 56.5L257.1 57.3L256.3 58L255.5 58.7L254.6 59.4L253.6 60L252.5 60.6L251.4 61.1L250.2 61.6L249 62.1L247.7 62.5L246.4 62.9L245 63.2L243.6 63.5L242.2 63.7L240.7 63.9L239.3 64.1L237.8 64.1L236.3 64.2L234.8 64.1L233.3 64.1L231.9 63.9L230.4 63.7L229 63.5L227.6 63.2L226.2 62.9L224.9 62.5L223.6 62.1L222.4 61.6L221.2 61.1L220.1 60.6L219 60L218 59.4L217.1 58.7L216.3 58L215.5 57.3L214.9 56.5L214.3 55.8L213.8 55L213.3 54.2L213 53.4L212.8 52.6L212.6 51.7L212.6 50.9\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M247.2 65.6L246 66.1L244.8 66.6L243.5 67L242.1 67.3L240.7 67.6L239.3 67.8L237.8 67.9L236.3 67.9L234.8 67.9L233.3 67.8L231.9 67.6L230.5 67.3L229.1 67L227.8 66.6L226.6 66.1L225.4 65.6\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M212.6 50.5L212.7 49.7L212.9 48.8L213.2 48L213.5 47.2L214 46.4L214.5 45.6L215.2 44.9L215.9 44.2L216.7 43.5L217.6 42.8L218.5 42.1L219.5 41.5L220.6 41L221.8 40.4L223 39.9L224.2 39.5L225.5 39.1L226.9 38.7L228.3 38.4L229.7 38.2L231.1 38L232.6 37.8L234.1 37.7L235.6 37.7L237 37.7L238.5 37.7L240 37.8L241.5 38L242.9 38.2L244.3 38.4L245.7 38.7L247.1 39.1L248.4 39.5L249.6 39.9L250.8 40.4L252 41L253.1 41.5L254.1 42.1L255 42.8L255.9 43.5L256.7 44.2L257.4 44.9L258.1 45.6L258.6 46.4L259.1 47.2L259.4 48L259.7 48.8L259.9 49.7L260 50.5L260 53.3L259.9 54.1L259.7 54.9L259.4 55.8L259.1 56.6L258.6 57.4L258.1 58.1L257.4 58.9L256.7 59.6L242.8 72.7L242.6 72.9L242.3 73.2L242 73.4L241.7 73.6L241.3 73.7L241 73.9L240.6 74.1L240.2 74.2L239.7 74.3L239.3 74.5L238.9 74.5L238.4 74.6L238 74.7L237.5 74.7L237 74.8L236.5 74.8L236.1 74.8L235.6 74.8L235.1 74.7L234.6 74.7L234.2 74.6L233.7 74.5L233.3 74.5L232.9 74.3L232.4 74.2L232 74.1L231.7 73.9L231.3 73.7L230.9 73.6L230.6 73.4L230.3 73.2L230 72.9L229.8 72.7L215.9 59.6L215.2 58.9L214.5 58.1L214 57.4L213.5 56.6L213.2 55.8L212.9 54.9L212.7 54.1L212.6 53.3Z\"/></g></g><g class=\"it\" data-name=\"dial.base\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M174.9 113.4L175.5 111.5L176.7 109.6L178.5 107.8L180.8 106.3L183.6 105L186.7 104L190.1 103.3L193.6 103L197.2 103L200.7 103.3L204.1 104L207.2 105L210 106.3L212.3 107.8L214.1 109.6L215.3 111.5L215.9 113.4L215.9 118.2L215.3 120.2L214.1 122.1L212.3 123.8L210 125.4L207.2 126.6L204.1 127.6L200.7 128.3L197.2 128.7L193.6 128.7L190.1 128.3L186.7 127.6L183.6 126.6L180.8 125.4L178.5 123.8L176.7 122.1L175.5 120.2L174.9 118.2Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M210 125.4L207.2 126.6L207.2 123.9L210 122.6ZM215.9 118.2L215.3 120.2L215.3 117.4L215.9 115.4ZM215.3 120.2L214.1 122.1L214.1 119.3L215.3 117.4ZM214.1 122.1L212.3 123.8L212.3 121.1L214.1 119.3ZM212.3 123.8L210 125.4L210 122.6L212.3 121.1Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M207.2 126.6L204.1 127.6L204.1 124.9L207.2 123.9ZM204.1 127.6L200.7 128.3L200.7 125.6L204.1 124.9ZM200.7 128.3L197.2 128.7L197.2 125.9L200.7 125.6ZM197.2 128.7L193.6 128.7L193.6 125.9L197.2 125.9Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M193.6 128.7L190.1 128.3L190.1 125.6L193.6 125.9ZM190.1 128.3L186.7 127.6L186.7 124.9L190.1 125.6Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M186.7 127.6L183.6 126.6L183.6 123.9L186.7 124.9ZM183.6 126.6L180.8 125.4L180.8 122.6L183.6 123.9ZM180.8 125.4L178.5 123.8L178.5 121.1L180.8 122.6ZM178.5 123.8L176.7 122.1L176.7 119.3L178.5 121.1ZM176.7 122.1L175.5 120.2L175.5 117.4L176.7 119.3ZM175.5 120.2L174.9 118.2L174.9 115.4L175.5 117.4Z\"/><path class=\"iso-top\" d=\"M210 122.6L207.2 123.9L204.1 124.9L200.7 125.6L197.2 125.9L193.6 125.9L190.1 125.6L186.7 124.9L183.6 123.9L180.8 122.6L178.5 121.1L176.7 119.3L175.5 117.4L174.9 115.4L174.9 113.4L175.5 111.5L176.7 109.6L178.5 107.8L180.8 106.3L183.6 105L186.7 104L190.1 103.3L193.6 103L197.2 103L200.7 103.3L204.1 104L207.2 105L210 106.3L212.3 107.8L214.1 109.6L215.3 111.5L215.9 113.4L215.9 115.4L215.3 117.4L214.1 119.3L212.3 121.1Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M215.9 115.4L215.3 117.4L214.1 119.3L212.3 121.1L210 122.6L207.2 123.9L204.1 124.9L200.7 125.6L197.2 125.9L193.6 125.9L190.1 125.6L186.7 124.9L183.6 123.9L180.8 122.6L178.5 121.1L176.7 119.3L175.5 117.4L174.9 115.4\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M174.9 115.4L174.9 113.4L175.5 111.5L176.7 109.6L178.5 107.8L180.8 106.3L183.6 105L186.7 104L190.1 103.3L193.6 103L197.2 103L200.7 103.3L204.1 104L207.2 105L210 106.3L212.3 107.8L214.1 109.6L215.3 111.5L215.9 113.4L215.9 115.4M215.9 118.2L215.3 120.2L214.1 122.1L212.3 123.8L210 125.4L207.2 126.6L204.1 127.6L200.7 128.3L197.2 128.7L193.6 128.7L190.1 128.3L186.7 127.6L183.6 126.6L180.8 125.4L178.5 123.8L176.7 122.1L175.5 120.2L174.9 118.2M174.9 115.4L174.9 118.2M215.9 115.4L215.9 118.2\"/></g></g><g class=\"it\" data-name=\"dial\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M177.6 109.3L177.8 107.8L178.5 106.3L179.6 104.8L181 103.5L182.8 102.3L184.9 101.3L187.3 100.5L189.9 99.9L192.6 99.5L195.4 99.4L198.2 99.5L200.9 99.9L203.5 100.5L205.8 101.3L208 102.3L209.8 103.5L211.2 104.8L212.3 106.3L213 107.8L213.2 109.3L213.2 114.4L213 116L212.3 117.5L211.2 119L209.8 120.3L208 121.5L205.8 122.5L203.5 123.3L200.9 123.9L198.2 124.3L195.4 124.4L192.6 124.3L189.9 123.9L187.3 123.3L184.9 122.5L182.8 121.5L181 120.3L179.6 119L178.5 117.5L177.8 116L177.6 114.4Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M208 121.5L205.8 122.5L205.8 117.4L208 116.4ZM205.8 122.5L203.5 123.3L203.5 118.2L205.8 117.4ZM213.2 114.4L213 116L213 110.9L213.2 109.3ZM213 116L212.3 117.5L212.3 112.4L213 110.9ZM212.3 117.5L211.2 119L211.2 113.8L212.3 112.4ZM211.2 119L209.8 120.3L209.8 115.2L211.2 113.8ZM209.8 120.3L208 121.5L208 116.4L209.8 115.2Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M203.5 123.3L200.9 123.9L200.9 118.8L203.5 118.2ZM200.9 123.9L198.2 124.3L198.2 119.2L200.9 118.8ZM198.2 124.3L195.4 124.4L195.4 119.3L198.2 119.2Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M195.4 124.4L192.6 124.3L192.6 119.2L195.4 119.3ZM192.6 124.3L189.9 123.9L189.9 118.8L192.6 119.2ZM189.9 123.9L187.3 123.3L187.3 118.2L189.9 118.8Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M187.3 123.3L184.9 122.5L184.9 117.4L187.3 118.2ZM184.9 122.5L182.8 121.5L182.8 116.4L184.9 117.4ZM182.8 121.5L181 120.3L181 115.2L182.8 116.4ZM181 120.3L179.6 119L179.6 113.8L181 115.2ZM179.6 119L178.5 117.5L178.5 112.4L179.6 113.8ZM178.5 117.5L177.8 116L177.8 110.9L178.5 112.4ZM177.8 116L177.6 114.4L177.6 109.3L177.8 110.9Z\"/><path class=\"iso-top\" d=\"M208 116.4L205.8 117.4L203.5 118.2L200.9 118.8L198.2 119.2L195.4 119.3L192.6 119.2L189.9 118.8L187.3 118.2L184.9 117.4L182.8 116.4L181 115.2L179.6 113.8L178.5 112.4L177.8 110.9L177.6 109.3L177.8 107.8L178.5 106.3L179.6 104.8L181 103.5L182.8 102.3L184.9 101.3L187.3 100.5L189.9 99.9L192.6 99.5L195.4 99.4L198.2 99.5L200.9 99.9L203.5 100.5L205.8 101.3L208 102.3L209.8 103.5L211.2 104.8L212.3 106.3L213 107.8L213.2 109.3L213 110.9L212.3 112.4L211.2 113.8L209.8 115.2Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M213.2 109.3L213 110.9L212.3 112.4L211.2 113.8L209.8 115.2L208 116.4L205.8 117.4L203.5 118.2L200.9 118.8L198.2 119.2L195.4 119.3L192.6 119.2L189.9 118.8L187.3 118.2L184.9 117.4L182.8 116.4L181 115.2L179.6 113.8L178.5 112.4L177.8 110.9L177.6 109.3\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M177.6 109.3L177.8 107.8L178.5 106.3L179.6 104.8L181 103.5L182.8 102.3L184.9 101.3L187.3 100.5L189.9 99.9L192.6 99.5L195.4 99.4L198.2 99.5L200.9 99.9L203.5 100.5L205.8 101.3L208 102.3L209.8 103.5L211.2 104.8L212.3 106.3L213 107.8L213.2 109.3M213.2 114.4L213 116L212.3 117.5L211.2 119L209.8 120.3L208 121.5L205.8 122.5L203.5 123.3L200.9 123.9L198.2 124.3L195.4 124.4L192.6 124.3L189.9 123.9L187.3 123.3L184.9 122.5L182.8 121.5L181 120.3L179.6 119L178.5 117.5L177.8 116L177.6 114.4M177.6 109.3L177.6 114.4M213.2 109.3L213.2 114.4\"/></g><path class=\"iso-line\" data-tone=\"lo\" d=\"M206.1 115.3L204.3 116.2L202.3 116.9L200.1 117.4L197.8 117.7L195.4 117.8L193 117.7L190.7 117.4L188.5 116.9L186.5 116.2L184.7 115.3L183.1 114.3L181.9 113.2L181 112L180.4 110.7L180.2 109.3L180.4 108L181 106.7L181.9 105.5L183.1 104.3L184.7 103.3L186.5 102.5L188.5 101.8L190.7 101.3L193 101L195.4 100.9L197.8 101L200.1 101.3L202.3 101.8L204.3 102.5L206.1 103.3L207.7 104.3L208.9 105.5L209.8 106.7L210.4 108L210.6 109.3L210.4 110.7L209.8 112L208.9 113.2L207.7 114.3Z\"/><path class=\"iso-line\" data-tone=\"lo\" d=\"M185 106.4L182.9 105.8M188.6 104.1L187.2 103M193.6 102.9L193.2 101.6M199 103.2L199.7 101.9M206.4 107.3L208.7 106.9M206.9 110.4L209.2 110.6M204.8 113.2L206.7 113.9M200.7 115.1L201.7 116.3\"/><path class=\"iso-line\" data-tone=\"mid\" d=\"M186.2 109.3L181.4 109.3M201.9 105.7L205.3 103.8M195.4 114.5L195.4 117.2\"/><path class=\"iso-line\" data-tone=\"mid\" d=\"M197.1 110.3L196 110.6L194.8 110.6L193.7 110.3L193.1 109.7L193.1 109L193.7 108.4L194.8 108.1L196 108.1L197.1 108.4L197.7 109L197.7 109.7Z\"/></g><g class=\"it\" data-name=\"dock.platform\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M213.8 126.2L214.5 125.3L227.9 117.8L229.6 117.4L231.3 117.8L268.2 138.4L268.8 139.3L268.8 151.1L268.2 152L254.7 159.5L253.1 159.9L251.4 159.5L214.5 138.9L213.8 138Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M268.8 151.1L268.2 152L268.2 140.3L268.8 139.3ZM268.2 152L254.7 159.5L254.7 147.8L268.2 140.3Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M254.7 159.5L253.1 159.9L253.1 148.1L254.7 147.8Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M253.1 159.9L251.4 159.5L251.4 147.8L253.1 148.1Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M251.4 159.5L214.5 138.9L214.5 127.1L251.4 147.8ZM214.5 138.9L213.8 138L213.8 126.2L214.5 127.1Z\"/><path class=\"iso-top\" d=\"M268.2 138.4L268.8 139.3L268.2 140.3L254.7 147.8L253.1 148.1L251.4 147.8L214.5 127.1L213.8 126.2L214.5 125.3L227.9 117.8L229.6 117.4L231.3 117.8Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M268.8 139.3L268.2 140.3L254.7 147.8L253.1 148.1L251.4 147.8L214.5 127.1L213.8 126.2\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M268.8 139.3L267.4 140L254.2 147.3L253.1 147.6L251.9 147.3L215.3 126.8L213.8 126.2\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M213.8 126.2L214.5 125.3L227.9 117.8L229.6 117.4L231.3 117.8L268.2 138.4L268.8 139.3M268.8 151.1L268.2 152L254.7 159.5L253.1 159.9L251.4 159.5L214.5 138.9L213.8 138M268.8 139.3L268.8 151.1M213.8 126.2L213.8 138\"/></g><g class=\"iso-dots\" data-tone=\"mid\"><circle cx=\"219.5\" cy=\"126.2\" r=\"0.45\"/><circle cx=\"253.1\" cy=\"144.9\" r=\"0.45\"/></g></g><g class=\"it\" data-name=\"boom.dock.post\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M235.1 145.1L235.5 144.4L236.3 143.8L237.4 143.4L238.7 143.2L240 143.2L241.3 143.4L242.3 143.8L243.1 144.4L243.5 145.1L243.5 156.5L243.5 157.3L243.1 158L242.3 158.6L241.3 159L240 159.3L238.7 159.3L237.4 159L236.3 158.6L235.5 158L235.1 157.3Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M242.3 158.6L241.3 159L241.3 147.6L242.3 147.2ZM243.5 157.3L243.1 158L243.1 146.6L243.5 145.9ZM243.1 158L242.3 158.6L242.3 147.2L243.1 146.6Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M241.3 159L240 159.3L240 147.9L241.3 147.6Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M240 159.3L238.7 159.3L238.7 147.9L240 147.9ZM238.7 159.3L237.4 159L237.4 147.6L238.7 147.9Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M237.4 159L236.3 158.6L236.3 147.2L237.4 147.6ZM236.3 158.6L235.5 158L235.5 146.6L236.3 147.2ZM235.5 158L235.1 157.3L235.1 145.9L235.5 146.6Z\"/><path class=\"iso-top\" d=\"M242.3 147.2L241.3 147.6L240 147.9L238.7 147.9L237.4 147.6L236.3 147.2L235.5 146.6L235.1 145.9L235.1 145.1L235.5 144.4L236.3 143.8L237.4 143.4L238.7 143.2L240 143.2L241.3 143.4L242.3 143.8L243.1 144.4L243.5 145.1L243.5 145.9L243.1 146.6Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M243.5 145.9L243.1 146.6L242.3 147.2L241.3 147.6L240 147.9L238.7 147.9L237.4 147.6L236.3 147.2L235.5 146.6L235.1 145.9\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M235.1 145.9L235.1 145.1L235.5 144.4L236.3 143.8L237.4 143.4L238.7 143.2L240 143.2L241.3 143.4L242.3 143.8L243.1 144.4L243.5 145.1L243.5 145.9M243.5 157.3L243.1 158L242.3 158.6L241.3 159L240 159.3L238.7 159.3L237.4 159L236.3 158.6L235.5 158L235.1 157.3M235.1 145.9L235.1 157.3M243.5 145.9L243.5 157.3\"/></g><path class=\"iso-line\" data-tone=\"faint\" d=\"M243.6 151L243.5 151.5L243.3 151.9L242.9 152.4L242.3 152.7L241.7 153L241 153.2L240.2 153.4L239.3 153.4L238.5 153.4L237.7 153.2L236.9 153L236.3 152.7L235.8 152.4L235.4 151.9L235.1 151.5L235.1 151\"/></g><g class=\"it\" data-name=\"boom.dock.hub\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M231.9 141.2L232 140.4L232.2 139.7L232.6 139.1L233 138.7L240.4 134.6L241 134.4L241.6 134.4L242.3 134.5L243 134.8L243.7 135.3L244.4 135.9L245.1 136.7L245.6 137.5L246.1 138.4L246.4 139.4L246.6 140.3L246.7 141.2L246.6 142L246.4 142.7L246.1 143.3L245.6 143.7L238.2 147.8L237.7 148L237 148L236.3 147.9L235.6 147.6L234.9 147.1L234.2 146.5L233.6 145.7L233 144.9L232.6 143.9L232.2 143L232 142.1Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M238.2 147.8L238.7 147.4L239 146.8L239.2 146.1L239.3 145.3L239.2 144.4L239 143.5L238.7 142.6L246.1 138.4L246.4 139.4L246.6 140.3L246.7 141.2L246.6 142L246.4 142.7L246.1 143.3L245.6 143.7Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M238.7 142.6L238.2 141.7L245.6 137.5L246.1 138.4Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M238.2 141.7L237.7 140.8L245.1 136.7L245.6 137.5Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M237.7 140.8L237 140.1L236.3 139.4L243.7 135.3L244.4 135.9L245.1 136.7ZM235.6 143.3L235.6 143.3L235.6 143.3L235.6 143.3L235.6 143.3L235.6 143.3L235.6 143.3L235.6 143.3L235.6 143.3L235.6 143.3L235.6 143.3L235.6 143.3L235.6 143.3L235.6 143.3L235.6 143.3L235.6 143.3L235.6 143.3L235.6 143.3L235.6 143.3L235.6 143.3L235.6 143.3L235.6 143.3L235.6 143.3L235.6 143.3L235.6 143.3L235.6 143.3L235.6 143.3L235.6 143.3L235.6 143.3L235.6 143.3L235.6 143.3L235.6 143.3L235.6 143.3L239.3 145.3L239.2 146.1L239 146.8L238.7 147.4L238.2 147.8L237.7 148L237 148L236.3 147.9L235.6 147.6L234.9 147.1L234.2 146.5L233.6 145.7L233 144.9L232.6 143.9L232.2 143L232 142.1L231.9 141.2L232 140.4L232.2 139.7L232.6 139.1L233 138.7L233.6 138.5L234.2 138.5L234.9 138.6L235.6 138.9L236.3 139.4L237 140.1L237.7 140.8L238.2 141.7L238.7 142.6L239 143.5L239.2 144.4L239.3 145.3Z\"/><path class=\"iso-top\" d=\"M236.3 139.4L235.6 138.9L234.9 138.6L234.2 138.5L233.6 138.5L233 138.7L240.4 134.6L241 134.4L241.6 134.4L242.3 134.5L243 134.8L243.7 135.3Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M238.2 147.8L238.8 147.2L239.2 146.3L239.3 145.1L239.1 143.8L238.6 142.4L237.9 141.1L237 140L236 139.2L234.9 138.6L233.9 138.5L233.1 138.7\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M231.9 141.2L232 140.4L232.2 139.7L232.6 139.1L233 138.7L240.4 134.6L241 134.4L241.6 134.4L242.3 134.5L243 134.8L243.7 135.3L244.4 135.9L245.1 136.7L245.6 137.5L246.1 138.4L246.4 139.4L246.6 140.3L246.7 141.2L246.6 142L246.4 142.7L246.1 143.3L245.6 143.7L238.2 147.8L237.7 148L237 148L236.3 147.9L235.6 147.6L234.9 147.1L234.2 146.5L233.6 145.7L233 144.9L232.6 143.9L232.2 143L232 142.1Z\"/></g></g><g class=\"it\" data-name=\"silo.foot\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M333.5 192.4L333.5 191.6L333.5 190.7L333.6 189.9L333.8 189.1L334.1 188.2L334.3 187.4L334.7 186.6L335.1 185.8L335.5 185L336 184.2L336.6 183.4L337.2 182.6L337.8 181.9L338.5 181.1L339.3 180.4L340.1 179.7L340.9 179L341.8 178.4L342.7 177.7L343.7 177.1L344.7 176.4L345.8 175.9L346.9 175.3L348 174.7L349.2 174.2L350.4 173.7L351.6 173.2L352.9 172.8L354.2 172.4L355.5 172L356.9 171.6L358.2 171.3L359.6 171L361.1 170.7L362.5 170.4L363.9 170.2L365.4 170L366.9 169.9L368.3 169.8L369.8 169.7L371.3 169.6L372.8 169.6L374.3 169.5L375.8 169.6L377.3 169.6L378.8 169.7L380.3 169.8L381.8 170L383.2 170.2L384.7 170.4L386.1 170.6L387.5 170.9L388.9 171.2L390.3 171.5L391.7 171.9L393 172.3L394.3 172.7L395.6 173.1L396.8 173.6L398 174.1L399.2 174.6L400.3 175.1L401.4 175.7L402.5 176.3L403.5 176.9L404.5 177.5L405.5 178.2L406.4 178.9L407.2 179.5L408.1 180.2L408.8 181L409.5 181.7L410.2 182.5L410.8 183.2L411.4 184L411.9 184.8L412.3 185.6L412.7 186.4L413.1 187.2L413.4 188L413.6 188.8L413.8 189.7L414 190.5L414 191.3L414.1 192.2L414.1 198.1L414 198.9L413.9 199.8L413.8 200.6L413.6 201.4L413.3 202.2L413 203.1L412.7 203.9L412.2 204.7L411.8 205.5L411.2 206.3L410.7 207L410 207.8L409.4 208.5L408.6 209.3L407.9 210L407 210.7L406.2 211.4L405.2 212L404.3 212.7L403.3 213.3L402.3 213.9L401.2 214.5L400.1 215.1L398.9 215.6L397.7 216.1L396.5 216.6L395.2 217L394 217.5L392.7 217.9L391.3 218.3L390 218.6L388.6 218.9L387.2 219.2L385.7 219.5L384.3 219.7L382.9 219.9L381.4 220.1L379.9 220.3L378.4 220.4L376.9 220.4L375.4 220.5L373.9 220.5L372.4 220.5L371 220.5L369.5 220.4L368 220.3L366.5 220.1L365 220L363.6 219.8L362.1 219.6L360.7 219.3L359.3 219L357.9 218.7L356.5 218.4L355.2 218L353.9 217.6L352.6 217.2L351.3 216.7L350.1 216.2L348.9 215.7L347.7 215.2L346.6 214.6L345.5 214.1L344.5 213.5L343.5 212.8L342.5 212.2L341.6 211.5L340.7 210.9L339.9 210.2L339.1 209.5L338.3 208.7L337.6 208L337 207.2L336.4 206.5L335.9 205.7L335.4 204.9L335 204.1L334.6 203.3L334.3 202.5L334 201.6L333.8 200.8L333.6 200L333.5 199.1L333.5 198.3Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M414 197.4L414 199L413.8 200.7L413.3 202.3L412.6 203.9L411.7 205.5L410.6 207.1L409.3 208.6L407.8 210L406.1 211.4L404.3 212.7L402.3 213.9L400.1 215L397.7 216.1L395.3 217L392.7 217.9L390 218.6L387.3 219.2L384.4 219.7L381.5 220.1L378.6 220.4L375.6 220.5L372.6 220.5L372.6 214.6L375.6 214.6L378.6 214.5L381.5 214.2L384.4 213.8L387.3 213.3L390 212.7L392.7 212L395.3 211.1L397.7 210.2L400.1 209.2L402.3 208L404.3 206.8L406.1 205.5L407.8 204.1L409.3 202.7L410.6 201.2L411.7 199.6L412.6 198L413.3 196.4L413.8 194.8L414 193.1L414 191.5Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M372.6 220.5L369.7 220.4L366.7 220.2L363.8 219.8L360.9 219.3L360.9 213.5L363.8 213.9L366.7 214.3L369.7 214.5L372.6 214.6Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M360.9 219.3L358.2 218.8L355.5 218.1L352.9 217.2L350.4 216.3L348 215.3L348 209.4L350.4 210.4L352.9 211.4L355.5 212.2L358.2 212.9L360.9 213.5Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M348 215.3L345.8 214.2L343.7 213L341.8 211.7L340.1 210.4L338.5 208.9L337.2 207.5L336 205.9L335.1 204.3L335.1 198.5L336 200L337.2 201.6L338.5 203L340.1 204.5L341.8 205.8L343.7 207.1L345.8 208.3L348 209.4Z\"/><path class=\"iso-top\" d=\"M335.1 204.3L334.4 202.7L333.8 201.1L333.5 199.4L333.5 197.8L333.5 191.9L333.5 193.5L333.8 195.2L334.4 196.8L335.1 198.5ZM402.3 208L400.1 209.2L397.7 210.2L395.3 211.1L392.7 212L390 212.7L387.3 213.3L384.4 213.8L381.5 214.2L378.6 214.5L375.6 214.6L372.6 214.6L369.7 214.5L366.7 214.3L363.8 213.9L360.9 213.5L358.2 212.9L355.5 212.2L352.9 211.4L350.4 210.4L348 209.4L345.8 208.3L343.7 207.1L341.8 205.8L340.1 204.5L338.5 203L337.2 201.6L336 200L335.1 198.5L334.4 196.8L333.8 195.2L333.5 193.5L333.5 191.9L333.6 190.2L334 188.6L334.5 186.9L335.3 185.3L336.3 183.7L337.5 182.2L338.9 180.8L340.5 179.3L342.3 178L344.2 176.7L346.3 175.6L348.6 174.5L351 173.5L353.5 172.6L356.1 171.8L358.9 171.1L361.7 170.6L364.5 170.1L367.5 169.8L370.4 169.6L373.4 169.5L376.4 169.6L379.3 169.8L382.3 170.1L385.1 170.5L388 171L390.7 171.6L393.4 172.4L395.9 173.3L398.3 174.2L400.6 175.3L402.8 176.4L404.8 177.7L406.6 179L408.2 180.4L409.7 181.9L410.9 183.4L412 184.9L412.8 186.5L413.4 188.1L413.9 189.8L414 191.5L414 193.1L413.8 194.8L413.3 196.4L412.6 198L411.7 199.6L410.6 201.2L409.3 202.7L407.8 204.1L406.1 205.5L404.3 206.8L402.3 208L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1L373.8 192.1Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M414.1 192.1L414 192.9L413.9 193.7L413.8 194.6L413.6 195.4L413.4 196.2L413.1 197L412.7 197.8L412.3 198.6L411.8 199.4L411.3 200.2L410.8 201L410.2 201.8L409.5 202.5L408.8 203.2L408 203.9L407.2 204.6L406.4 205.3L405.5 206L404.5 206.6L403.5 207.3L402.5 207.9L401.5 208.5L400.4 209L399.2 209.6L398 210.1L396.8 210.6L395.6 211L394.3 211.5L393 211.9L391.7 212.3L390.4 212.6L389 212.9L387.6 213.2L386.2 213.5L384.8 213.8L383.3 214L381.9 214.2L380.4 214.3L379 214.4L377.5 214.5L376 214.6L374.5 214.6L373 214.6L371.5 214.6L370 214.5L368.6 214.4L367.1 214.3L365.6 214.2L364.2 214L362.7 213.8L361.3 213.5L359.9 213.2L358.5 212.9L357.1 212.6L355.8 212.3L354.5 211.9L353.2 211.5L351.9 211L350.7 210.6L349.5 210.1L348.3 209.6L347.2 209L346.1 208.5L345 207.9L344 207.3L343 206.6L342.1 206L341.2 205.3L340.3 204.6L339.5 203.9L338.7 203.2L338 202.5L337.4 201.8L336.7 201L336.2 200.2L335.7 199.4L335.2 198.6L334.8 197.8L334.4 197L334.1 196.2L333.9 195.4L333.7 194.6L333.6 193.7L333.5 192.9L333.5 192.1\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M333.5 192.4L333.5 191.6L333.5 190.7L333.6 189.9L333.8 189.1L334.1 188.2L334.3 187.4L334.7 186.6L335.1 185.8L335.5 185L336 184.2L336.6 183.4L337.2 182.6L337.8 181.9L338.5 181.1L339.3 180.4L340.1 179.7L340.9 179L341.8 178.4L342.7 177.7L343.7 177.1L344.7 176.4L345.8 175.9L346.9 175.3L348 174.7L349.2 174.2L350.4 173.7L351.6 173.2L352.9 172.8L354.2 172.4L355.5 172L356.9 171.6L358.2 171.3L359.6 171L361.1 170.7L362.5 170.4L363.9 170.2L365.4 170L366.9 169.9L368.3 169.8L369.8 169.7L371.3 169.6L372.8 169.6L374.3 169.5L375.8 169.6L377.3 169.6L378.8 169.7L380.3 169.8L381.8 170L383.2 170.2L384.7 170.4L386.1 170.6L387.5 170.9L388.9 171.2L390.3 171.5L391.7 171.9L393 172.3L394.3 172.7L395.6 173.1L396.8 173.6L398 174.1L399.2 174.6L400.3 175.1L401.4 175.7L402.5 176.3L403.5 176.9L404.5 177.5L405.5 178.2L406.4 178.9L407.2 179.5L408.1 180.2L408.8 181L409.5 181.7L410.2 182.5L410.8 183.2L411.4 184L411.9 184.8L412.3 185.6L412.7 186.4L413.1 187.2L413.4 188L413.6 188.8L413.8 189.7L414 190.5L414 191.3L414.1 192.2L414.1 198.1L414 198.9L413.9 199.8L413.8 200.6L413.6 201.4L413.3 202.2L413 203.1L412.7 203.9L412.2 204.7L411.8 205.5L411.2 206.3L410.7 207L410 207.8L409.4 208.5L408.6 209.3L407.9 210L407 210.7L406.2 211.4L405.2 212L404.3 212.7L403.3 213.3L402.3 213.9L401.2 214.5L400.1 215.1L398.9 215.6L397.7 216.1L396.5 216.6L395.2 217L394 217.5L392.7 217.9L391.3 218.3L390 218.6L388.6 218.9L387.2 219.2L385.7 219.5L384.3 219.7L382.9 219.9L381.4 220.1L379.9 220.3L378.4 220.4L376.9 220.4L375.4 220.5L373.9 220.5L372.4 220.5L371 220.5L369.5 220.4L368 220.3L366.5 220.1L365 220L363.6 219.8L362.1 219.6L360.7 219.3L359.3 219L357.9 218.7L356.5 218.4L355.2 218L353.9 217.6L352.6 217.2L351.3 216.7L350.1 216.2L348.9 215.7L347.7 215.2L346.6 214.6L345.5 214.1L344.5 213.5L343.5 212.8L342.5 212.2L341.6 211.5L340.7 210.9L339.9 210.2L339.1 209.5L338.3 208.7L337.6 208L337 207.2L336.4 206.5L335.9 205.7L335.4 204.9L335 204.1L334.6 203.3L334.3 202.5L334 201.6L333.8 200.8L333.6 200L333.5 199.1L333.5 198.3Z\"/></g></g><g class=\"it\" data-name=\"tanker.wheel\" data-move=\"tanker\" data-part=\"tanker\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M445.3 202.2L445.4 201.2L445.7 200.1L446 199L446.6 198L447.2 197L447.9 196.2L448.7 195.5L449.5 194.9L450.3 194.5L451.1 194.4L451.9 194.4L452.5 194.7L455.5 196.4L456 196.8L456.4 197.5L456.7 198.2L456.7 199.2L456.7 200.2L456.4 201.2L456 202.3L455.5 203.3L454.9 204.3L454.1 205.1L453.4 205.9L452.5 206.4L451.7 206.8L450.9 206.9L450.2 206.9L449.6 206.6L446.6 204.9L446 204.5L445.7 203.9L445.4 203.1Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M448.4 203.8L448.4 202.8L448.7 201.8L449.1 200.7L449.6 199.7L450.2 198.7L450.9 197.9L451.7 197.1L452.5 196.6L453.4 196.2L454.1 196.1L454.9 196.1L455.5 196.4L456 196.8L456.4 197.5L456.7 198.2L456.7 199.2L456.7 200.2L456.4 201.2L456 202.3L455.5 203.3L454.9 204.3L454.1 205.1L453.4 205.9L452.5 206.4L451.7 206.8L450.9 206.9L450.2 206.9L449.6 206.6L449.1 206.2L448.7 205.5L448.4 204.8L448.4 203.8L452.5 201.5L452.5 201.5L452.5 201.5L452.5 201.5L452.5 201.5L452.5 201.5L452.5 201.5L452.5 201.5L452.5 201.5L452.5 201.5L452.5 201.5L452.5 201.5L452.5 201.5L452.5 201.5L452.5 201.5L452.5 201.5L452.5 201.5L452.5 201.5L452.5 201.5L452.5 201.5L452.5 201.5L452.5 201.5L452.5 201.5L452.5 201.5L452.5 201.5L452.5 201.5L452.5 201.5L452.5 201.5L452.5 201.5L452.5 201.5L452.5 201.5L452.5 201.5L452.5 201.5ZM446.6 204.9L446 204.5L449.1 206.2L449.6 206.6Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M446 204.5L445.7 203.9L448.7 205.5L449.1 206.2Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M451.9 194.4L452.5 194.7L455.5 196.4L454.9 196.1ZM445.7 203.9L445.4 203.1L445.3 202.2L448.4 203.8L448.4 204.8L448.7 205.5Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M445.3 202.2L445.4 201.2L448.4 202.8L448.4 203.8ZM450.3 194.5L451.1 194.4L451.9 194.4L454.9 196.1L454.1 196.1L453.4 196.2Z\"/><path class=\"iso-top\" d=\"M445.4 201.2L445.7 200.1L446 199L446.6 198L447.2 197L447.9 196.2L448.7 195.5L449.5 194.9L450.3 194.5L453.4 196.2L452.5 196.6L451.7 197.1L450.9 197.9L450.2 198.7L449.6 199.7L449.1 200.7L448.7 201.8L448.4 202.8Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M449.7 206.7L449 206.1L448.6 205.3L448.4 204.2L448.4 203L448.7 201.8L449.2 200.4L449.9 199.2L450.7 198.1L451.7 197.2L452.7 196.5L453.7 196.1L454.6 196.1L455.4 196.3\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M445.3 202.2L445.4 201.2L445.7 200.1L446 199L446.6 198L447.2 197L447.9 196.2L448.7 195.5L449.5 194.9L450.3 194.5L451.1 194.4L451.9 194.4L452.5 194.7L455.5 196.4L456 196.8L456.4 197.5L456.7 198.2L456.7 199.2L456.7 200.2L456.4 201.2L456 202.3L455.5 203.3L454.9 204.3L454.1 205.1L453.4 205.9L452.5 206.4L451.7 206.8L450.9 206.9L450.2 206.9L449.6 206.6L446.6 204.9L446 204.5L445.7 203.9L445.4 203.1Z\"/></g></g><g class=\"it\" data-name=\"silo\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M338.2 115.3L338.2 114.5L338.3 113.7L338.5 112.8L338.7 112L339 111.2L339.4 110.4L339.8 109.5L340.3 108.8L340.8 108L341.4 107.2L342 106.4L342.7 105.7L343.5 105L344.3 104.3L345.2 103.6L346.1 102.9L347.1 102.3L348.1 101.7L349.1 101.1L350.3 100.5L351.4 100L352.6 99.5L353.8 99L355.1 98.5L356.4 98.1L357.7 97.7L359 97.3L360.4 97L361.8 96.7L363.2 96.4L364.7 96.2L366.1 96L367.6 95.8L369.1 95.7L370.6 95.6L372.1 95.6L373.6 95.5L375.1 95.6L376.6 95.6L378.1 95.7L379.5 95.8L381 96L382.5 96.2L383.9 96.4L385.4 96.6L386.8 96.9L388.1 97.2L389.5 97.6L390.8 98L392.1 98.4L393.4 98.9L394.6 99.3L395.8 99.8L397 100.4L398.1 100.9L399.2 101.5L400.2 102.1L401.2 102.8L402.1 103.4L403 104.1L403.8 104.8L404.6 105.5L405.3 106.3L406 107L406.6 107.8L407.1 108.6L407.6 109.3L408 110.2L408.4 111L408.7 111.8L409 112.6L409.1 113.4L409.3 114.3L409.3 115.1L409.3 191.8L409.3 192.6L409.2 193.4L409.1 194.3L408.9 195.1L408.6 195.9L408.3 196.8L407.9 197.6L407.5 198.4L407 199.2L406.4 199.9L405.8 200.7L405.1 201.4L404.4 202.2L403.6 202.9L402.8 203.6L401.9 204.3L400.9 204.9L399.9 205.5L398.9 206.1L397.8 206.7L396.7 207.3L395.5 207.8L394.3 208.3L393.1 208.8L391.8 209.2L390.5 209.6L389.2 210L387.8 210.4L386.4 210.7L385 210.9L383.6 211.2L382.1 211.4L380.6 211.6L379.2 211.7L377.7 211.8L376.2 211.9L374.7 212L373.2 212L371.7 211.9L370.2 211.9L368.7 211.8L367.2 211.6L365.8 211.5L364.3 211.3L362.9 211L361.5 210.7L360.1 210.4L358.7 210.1L357.3 209.7L356 209.3L354.7 208.9L353.5 208.4L352.3 207.9L351.1 207.4L350 206.9L348.9 206.3L347.8 205.7L346.8 205.1L345.9 204.4L345 203.8L344.1 203.1L343.3 202.4L342.6 201.6L341.9 200.9L341.2 200.1L340.7 199.4L340.1 198.6L339.7 197.8L339.3 197L338.9 196.1L338.7 195.3L338.5 194.5L338.3 193.7L338.2 192.8L338.2 192Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M409.3 192.7L409.1 194.4L408.6 196L407.9 197.6L407 199.2L405.8 200.7L404.4 202.2L402.7 203.6L400.9 204.9L398.9 206.1L396.7 207.3L394.4 208.3L391.9 209.2L389.2 210L386.5 210.6L383.7 211.2L380.8 211.6L377.8 211.8L374.9 212L374.9 135.3L377.8 135.2L380.8 134.9L383.7 134.5L386.5 134L389.2 133.3L391.9 132.5L394.4 131.6L396.7 130.6L398.9 129.5L400.9 128.3L402.7 127L404.4 125.6L405.8 124.1L407 122.6L407.9 121L408.6 119.4L409.1 117.7L409.3 116.1Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M374.9 212L371.9 211.9L368.9 211.8L366 211.5L363.1 211.1L363.1 134.4L366 134.8L368.9 135.1L371.9 135.3L374.9 135.3Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M363.1 211.1L360.3 210.5L357.6 209.8L355 209L352.6 208L350.2 207L350.2 130.3L352.6 131.4L355 132.3L357.6 133.2L360.3 133.8L363.1 134.4Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M350.2 207L348.1 205.8L346.1 204.6L344.3 203.3L342.8 201.8L341.4 200.4L340.3 198.8L339.4 197.2L339.4 120.6L340.3 122.2L341.4 123.7L342.8 125.2L344.3 126.6L346.1 127.9L348.1 129.2L350.2 130.3Z\"/><path class=\"iso-top\" d=\"M339.4 197.2L338.8 195.6L338.4 194L338.2 192.3L338.2 115.6L338.4 117.3L338.8 119L339.4 120.6ZM398.9 129.5L396.7 130.6L394.4 131.6L391.9 132.5L389.2 133.3L386.5 134L383.7 134.5L380.8 134.9L377.8 135.2L374.9 135.3L371.9 135.3L368.9 135.1L366 134.8L363.1 134.4L360.3 133.8L357.6 133.2L355 132.3L352.6 131.4L350.2 130.3L348.1 129.2L346.1 127.9L344.3 126.6L342.8 125.2L341.4 123.7L340.3 122.2L339.4 120.6L338.8 119L338.4 117.3L338.2 115.6L338.3 114L338.6 112.3L339.2 110.7L340.1 109.1L341.1 107.5L342.4 106L343.9 104.6L345.7 103.2L347.6 102L349.7 100.8L352 99.7L354.4 98.8L357 97.9L359.6 97.2L362.4 96.6L365.3 96.1L368.2 95.8L371.2 95.6L374.1 95.6L377.1 95.6L380.1 95.9L383 96.2L385.8 96.7L388.6 97.4L391.2 98.1L393.7 99L396.1 100L398.4 101.1L400.4 102.3L402.3 103.6L404 105L405.4 106.4L406.7 107.9L407.7 109.5L408.5 111.1L409 112.7L409.3 114.4L409.3 116.1L409.1 117.7L408.6 119.4L407.9 121L407 122.6L405.8 124.1L404.4 125.6L402.7 127L400.9 128.3L398.9 129.5L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4L373.8 115.4Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M409.3 115.4L409.3 116.3L409.2 117.1L409 117.9L408.8 118.8L408.5 119.6L408.2 120.4L407.8 121.2L407.3 122L406.8 122.8L406.2 123.5L405.6 124.3L404.9 125L404.2 125.7L403.4 126.4L402.5 127.1L401.6 127.8L400.7 128.4L399.7 129L398.6 129.6L397.6 130.2L396.4 130.8L395.3 131.3L394.1 131.8L392.8 132.2L391.5 132.7L390.2 133.1L388.9 133.4L387.5 133.8L386.2 134.1L384.7 134.3L383.3 134.6L381.9 134.8L380.4 135L379 135.1L377.5 135.2L376 135.3L374.5 135.3L373 135.3L371.5 135.3L370 135.2L368.6 135.1L367.1 135L365.6 134.8L364.2 134.6L362.8 134.3L361.4 134.1L360 133.8L358.6 133.4L357.3 133.1L356 132.7L354.7 132.2L353.5 131.8L352.3 131.3L351.1 130.8L350 130.2L348.9 129.6L347.8 129L346.8 128.4L345.9 127.8L345 127.1L344.1 126.4L343.3 125.7L342.6 125L341.9 124.3L341.3 123.5L340.7 122.8L340.2 122L339.7 121.2L339.3 120.4L339 119.6L338.7 118.8L338.5 117.9L338.3 117.1L338.2 116.3L338.2 115.4\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M409.3 179.1L409.2 179.9L409 180.8L408.8 181.6L408.6 182.4L408.2 183.2L407.8 184L407.4 184.8L406.8 185.6L406.3 186.4L405.6 187.1L405 187.9L404.2 188.6L403.4 189.3L402.6 190L401.7 190.7L400.7 191.3L399.7 191.9L398.7 192.5L397.6 193.1L396.5 193.6L395.3 194.2L394.1 194.6L392.8 195.1L391.6 195.5L390.3 195.9L388.9 196.3L387.6 196.7L386.2 197L384.8 197.2L383.3 197.5L381.9 197.7L380.4 197.9L379 198L377.5 198.1L376 198.2L374.5 198.2L373 198.2L371.5 198.2L370 198.1L368.6 198L367.1 197.9L365.6 197.7L364.2 197.5L362.8 197.2L361.3 197L360 196.7L358.6 196.3L357.3 195.9L355.9 195.5L354.7 195.1L353.4 194.6L352.2 194.2L351.1 193.6L349.9 193.1L348.8 192.5L347.8 191.9L346.8 191.3L345.9 190.7L345 190L344.1 189.3L343.3 188.6L342.6 187.9L341.9 187.1L341.2 186.4L340.7 185.6L340.2 184.8L339.7 184L339.3 183.2L339 182.4L338.7 181.6L338.5 180.8L338.3 179.9L338.2 179.1M409.3 155.5L409.2 156.4L409 157.2L408.8 158L408.6 158.8L408.2 159.6L407.8 160.4L407.4 161.2L406.8 162L406.3 162.8L405.6 163.5L405 164.3L404.2 165L403.4 165.7L402.6 166.4L401.7 167.1L400.7 167.7L399.7 168.3L398.7 168.9L397.6 169.5L396.5 170L395.3 170.6L394.1 171.1L392.8 171.5L391.6 172L390.3 172.4L388.9 172.7L387.6 173.1L386.2 173.4L384.8 173.6L383.3 173.9L381.9 174.1L380.4 174.3L379 174.4L377.5 174.5L376 174.6L374.5 174.6L373 174.6L371.5 174.6L370 174.5L368.6 174.4L367.1 174.3L365.6 174.1L364.2 173.9L362.8 173.6L361.3 173.4L360 173.1L358.6 172.7L357.3 172.4L355.9 172L354.7 171.5L353.4 171.1L352.2 170.6L351.1 170L349.9 169.5L348.8 168.9L347.8 168.3L346.8 167.7L345.9 167.1L345 166.4L344.1 165.7L343.3 165L342.6 164.3L341.9 163.5L341.2 162.8L340.7 162L340.2 161.2L339.7 160.4L339.3 159.6L339 158.8L338.7 158L338.5 157.2L338.3 156.4L338.2 155.5M409.3 131.9L409.2 132.8L409 133.6L408.8 134.4L408.6 135.2L408.2 136.1L407.8 136.9L407.4 137.7L406.8 138.4L406.3 139.2L405.6 140L405 140.7L404.2 141.4L403.4 142.1L402.6 142.8L401.7 143.5L400.7 144.1L399.7 144.7L398.7 145.3L397.6 145.9L396.5 146.5L395.3 147L394.1 147.5L392.8 147.9L391.6 148.4L390.3 148.8L388.9 149.1L387.6 149.5L386.2 149.8L384.8 150.1L383.3 150.3L381.9 150.5L380.4 150.7L379 150.8L377.5 150.9L376 151L374.5 151L373 151L371.5 151L370 150.9L368.6 150.8L367.1 150.7L365.6 150.5L364.2 150.3L362.8 150.1L361.3 149.8L360 149.5L358.6 149.1L357.3 148.8L355.9 148.4L354.7 147.9L353.4 147.5L352.2 147L351.1 146.5L349.9 145.9L348.8 145.3L347.8 144.7L346.8 144.1L345.9 143.5L345 142.8L344.1 142.1L343.3 141.4L342.6 140.7L341.9 140L341.2 139.2L340.7 138.4L340.2 137.7L339.7 136.9L339.3 136.1L339 135.2L338.7 134.4L338.5 133.6L338.3 132.8L338.2 131.9\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M338.2 115.3L338.2 114.5L338.3 113.7L338.5 112.8L338.7 112L339 111.2L339.4 110.4L339.8 109.5L340.3 108.8L340.8 108L341.4 107.2L342 106.4L342.7 105.7L343.5 105L344.3 104.3L345.2 103.6L346.1 102.9L347.1 102.3L348.1 101.7L349.1 101.1L350.3 100.5L351.4 100L352.6 99.5L353.8 99L355.1 98.5L356.4 98.1L357.7 97.7L359 97.3L360.4 97L361.8 96.7L363.2 96.4L364.7 96.2L366.1 96L367.6 95.8L369.1 95.7L370.6 95.6L372.1 95.6L373.6 95.5L375.1 95.6L376.6 95.6L378.1 95.7L379.5 95.8L381 96L382.5 96.2L383.9 96.4L385.4 96.6L386.8 96.9L388.1 97.2L389.5 97.6L390.8 98L392.1 98.4L393.4 98.9L394.6 99.3L395.8 99.8L397 100.4L398.1 100.9L399.2 101.5L400.2 102.1L401.2 102.8L402.1 103.4L403 104.1L403.8 104.8L404.6 105.5L405.3 106.3L406 107L406.6 107.8L407.1 108.6L407.6 109.3L408 110.2L408.4 111L408.7 111.8L409 112.6L409.1 113.4L409.3 114.3L409.3 115.1L409.3 191.8L409.3 192.6L409.2 193.4L409.1 194.3L408.9 195.1L408.6 195.9L408.3 196.8L407.9 197.6L407.5 198.4L407 199.2L406.4 199.9L405.8 200.7L405.1 201.4L404.4 202.2L403.6 202.9L402.8 203.6L401.9 204.3L400.9 204.9L399.9 205.5L398.9 206.1L397.8 206.7L396.7 207.3L395.5 207.8L394.3 208.3L393.1 208.8L391.8 209.2L390.5 209.6L389.2 210L387.8 210.4L386.4 210.7L385 210.9L383.6 211.2L382.1 211.4L380.6 211.6L379.2 211.7L377.7 211.8L376.2 211.9L374.7 212L373.2 212L371.7 211.9L370.2 211.9L368.7 211.8L367.2 211.6L365.8 211.5L364.3 211.3L362.9 211L361.5 210.7L360.1 210.4L358.7 210.1L357.3 209.7L356 209.3L354.7 208.9L353.5 208.4L352.3 207.9L351.1 207.4L350 206.9L348.9 206.3L347.8 205.7L346.8 205.1L345.9 204.4L345 203.8L344.1 203.1L343.3 202.4L342.6 201.6L341.9 200.9L341.2 200.1L340.7 199.4L340.1 198.6L339.7 197.8L339.3 197L338.9 196.1L338.7 195.3L338.5 194.5L338.3 193.7L338.2 192.8L338.2 192Z\"/></g><path class=\"fe-glass\" d=\"M379.4 202L368.1 202L368.1 143L379.4 143Z\"/><path class=\"fe-level\" data-part=\"level\" d=\"M377.8 200.2L369.8 200.2L369.8 199.1L377.8 199.1Z\"/><path class=\"iso-line\" data-tone=\"mid\" d=\"M379.4 202L368.1 202L368.1 143L379.4 143Z\"/><path class=\"iso-line\" data-tone=\"lo\" d=\"M368.1 200L364.6 199.6M368.1 194.5L366 194.3M368.1 189L366 188.8M368.1 183.5L366 183.3M368.1 178L366 177.8M368.1 172.5L364.6 172.1M368.1 167L366 166.8M368.1 161.5L366 161.3M368.1 156L366 155.7M368.1 150.5L366 150.2M368.1 145L364.6 144.6\"/></g><g class=\"it\" data-name=\"silo.apron\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M314.4 205.1L315.1 204.2L325.1 198.6L326.8 198.2L328.5 198.6L375.4 224.8L376.1 225.7L376.1 233.6L375.4 234.5L365.4 240.2L363.7 240.5L362 240.2L315.1 213.9L314.4 213Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M376.1 233.6L375.4 234.5L375.4 226.7L376.1 225.7ZM375.4 234.5L365.4 240.2L365.4 232.3L375.4 226.7Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M365.4 240.2L363.7 240.5L363.7 232.7L365.4 232.3Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M363.7 240.5L362 240.2L362 232.3L363.7 232.7Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M362 240.2L315.1 213.9L315.1 206.1L362 232.3ZM315.1 213.9L314.4 213L314.4 205.1L315.1 206.1Z\"/><path class=\"iso-top\" d=\"M375.4 224.8L376.1 225.7L375.4 226.7L365.4 232.3L363.7 232.7L362 232.3L315.1 206.1L314.4 205.1L315.1 204.2L325.1 198.6L326.8 198.2L328.5 198.6Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M376.1 225.7L375.4 226.7L365.4 232.3L363.7 232.7L362 232.3L315.1 206.1L314.4 205.1\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M376.1 225.7L374.8 226.5L365 232L363.7 232.3L362.4 232L315.7 205.8L314.4 205.1\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M314.4 205.1L315.1 204.2L325.1 198.6L326.8 198.2L328.5 198.6L375.4 224.8L376.1 225.7M376.1 233.6L375.4 234.5L365.4 240.2L363.7 240.5L362 240.2L315.1 213.9L314.4 213M376.1 225.7L376.1 233.6M314.4 205.1L314.4 213\"/></g></g><g class=\"it\" data-name=\"tanker.wheel\" data-move=\"tanker\" data-part=\"tanker\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M413.5 220L413.6 219L413.8 217.9L414.2 216.8L414.7 215.8L415.3 214.8L416.1 214L416.9 213.3L417.7 212.7L418.5 212.3L419.3 212.2L420 212.2L420.6 212.5L423.7 214.2L424.2 214.6L424.6 215.3L424.8 216.1L424.9 217L424.8 218L424.6 219L424.2 220.1L423.7 221.1L423 222.1L422.3 223L421.5 223.7L420.7 224.2L419.9 224.6L419.1 224.7L418.4 224.7L417.7 224.4L414.7 222.8L414.2 222.3L413.8 221.7L413.6 220.9Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M416.5 221.7L416.6 220.7L416.8 219.6L417.2 218.5L417.7 217.5L418.4 216.5L419.1 215.7L419.9 215L420.7 214.4L421.5 214L422.3 213.9L423 213.9L423.7 214.2L424.2 214.6L424.6 215.3L424.8 216.1L424.9 217L424.8 218L424.6 219L424.2 220.1L423.7 221.1L423 222.1L422.3 223L421.5 223.7L420.7 224.2L419.9 224.6L419.1 224.7L418.4 224.7L417.7 224.4L417.2 224L416.8 223.4L416.6 222.6L416.5 221.7L420.7 219.3L420.7 219.3L420.7 219.3L420.7 219.3L420.7 219.3L420.7 219.3L420.7 219.3L420.7 219.3L420.7 219.3L420.7 219.3L420.7 219.3L420.7 219.3L420.7 219.3L420.7 219.3L420.7 219.3L420.7 219.3L420.7 219.3L420.7 219.3L420.7 219.3L420.7 219.3L420.7 219.3L420.7 219.3L420.7 219.3L420.7 219.3L420.7 219.3L420.7 219.3L420.7 219.3L420.7 219.3L420.7 219.3L420.7 219.3L420.7 219.3L420.7 219.3L420.7 219.3ZM414.7 222.8L414.2 222.3L417.2 224L417.7 224.4Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M414.2 222.3L413.8 221.7L416.8 223.4L417.2 224Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M420 212.2L420.6 212.5L423.7 214.2L423 213.9ZM413.8 221.7L413.6 220.9L413.5 220L416.5 221.7L416.6 222.6L416.8 223.4Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M413.5 220L413.6 219L416.6 220.7L416.5 221.7ZM418.5 212.3L419.3 212.2L420 212.2L423 213.9L422.3 213.9L421.5 214Z\"/><path class=\"iso-top\" d=\"M413.6 219L413.8 217.9L414.2 216.8L414.7 215.8L415.3 214.8L416.1 214L416.9 213.3L417.7 212.7L418.5 212.3L421.5 214L420.7 214.4L419.9 215L419.1 215.7L418.4 216.5L417.7 217.5L417.2 218.5L416.8 219.6L416.6 220.7Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M417.8 224.5L417.2 223.9L416.7 223.1L416.5 222.1L416.6 220.9L416.8 219.6L417.3 218.3L418 217L418.9 215.9L419.8 215L420.8 214.3L421.8 213.9L422.8 213.9L423.6 214.1\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M413.5 220L413.6 219L413.8 217.9L414.2 216.8L414.7 215.8L415.3 214.8L416.1 214L416.9 213.3L417.7 212.7L418.5 212.3L419.3 212.2L420 212.2L420.6 212.5L423.7 214.2L424.2 214.6L424.6 215.3L424.8 216.1L424.9 217L424.8 218L424.6 219L424.2 220.1L423.7 221.1L423 222.1L422.3 223L421.5 223.7L420.7 224.2L419.9 224.6L419.1 224.7L418.4 224.7L417.7 224.4L414.7 222.8L414.2 222.3L413.8 221.7L413.6 220.9Z\"/></g></g><g class=\"it\" data-name=\"tanker.chassis\" data-move=\"tanker\" data-part=\"tanker\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M411.8 220L412.6 218.9L458.9 193L460.9 192.6L462.9 193L479 202L479.9 203.2L479.9 208.1L479 209.2L432.8 235.1L430.8 235.5L428.7 235.1L412.6 226.1L411.8 224.9Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M479.9 208.1L479 209.2L479 204.3L479.9 203.2ZM479 209.2L432.8 235.1L432.8 230.1L479 204.3Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M432.8 235.1L430.8 235.5L430.8 230.6L432.8 230.1Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M430.8 235.5L428.7 235.1L428.7 230.1L430.8 230.6Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M428.7 235.1L412.6 226.1L412.6 221.1L428.7 230.1ZM412.6 226.1L411.8 224.9L411.8 220L412.6 221.1Z\"/><path class=\"iso-top\" d=\"M479 202L479.9 203.2L479 204.3L432.8 230.1L430.8 230.6L428.7 230.1L412.6 221.1L411.8 220L412.6 218.9L458.9 193L460.9 192.6L462.9 193Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M479.9 203.2L479 204.3L432.8 230.1L430.8 230.6L428.7 230.1L412.6 221.1L411.8 220\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M411.8 220L412.6 218.9L458.9 193L460.9 192.6L462.9 193L479 202L479.9 203.2M479.9 208.1L479 209.2L432.8 235.1L430.8 235.5L428.7 235.1L412.6 226.1L411.8 224.9M479.9 203.2L479.9 208.1M411.8 220L411.8 224.9\"/></g></g><g class=\"it\" data-name=\"tanker.wheel\" data-move=\"tanker\" data-part=\"tanker\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M468.5 215.1L468.5 214.1L468.8 213L469.2 212L469.7 210.9L470.3 210L471.1 209.1L471.8 208.4L472.7 207.8L473.5 207.5L474.3 207.3L475 207.4L475.6 207.6L478.6 209.3L479.2 209.8L479.5 210.4L479.8 211.2L479.9 212.1L479.8 213.1L479.5 214.2L479.2 215.2L478.6 216.3L478 217.2L477.3 218.1L476.5 218.8L475.7 219.4L474.9 219.7L474.1 219.9L473.3 219.8L472.7 219.6L469.7 217.9L469.2 217.4L468.8 216.8L468.5 216Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M469.7 217.9L469.2 217.4L472.2 219.1L472.7 219.6ZM471.5 216.8L471.6 215.8L471.8 214.7L472.2 213.7L472.7 212.6L473.3 211.7L474.1 210.8L474.9 210.1L475.7 209.5L476.5 209.2L477.3 209L478 209.1L478.6 209.3L479.2 209.8L479.5 210.4L479.8 211.2L479.9 212.1L479.8 213.1L479.5 214.2L479.2 215.2L478.6 216.3L478 217.2L477.3 218.1L476.5 218.8L475.7 219.4L474.9 219.7L474.1 219.9L473.3 219.8L472.7 219.6L472.2 219.1L471.8 218.5L471.6 217.7L471.5 216.8L475.7 214.4L475.7 214.4L475.7 214.4L475.7 214.4L475.7 214.4L475.7 214.4L475.7 214.4L475.7 214.4L475.7 214.4L475.7 214.4L475.7 214.4L475.7 214.4L475.7 214.4L475.7 214.4L475.7 214.4L475.7 214.4L475.7 214.4L475.7 214.4L475.7 214.4L475.7 214.4L475.7 214.4L475.7 214.4L475.7 214.4L475.7 214.4L475.7 214.4L475.7 214.4L475.7 214.4L475.7 214.4L475.7 214.4L475.7 214.4L475.7 214.4L475.7 214.4L475.7 214.4Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M469.2 217.4L468.8 216.8L471.8 218.5L472.2 219.1Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M475 207.4L475.6 207.6L478.6 209.3L478 209.1ZM468.8 216.8L468.5 216L468.5 215.1L471.5 216.8L471.6 217.7L471.8 218.5Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M468.5 215.1L468.5 214.1L471.6 215.8L471.5 216.8ZM473.5 207.5L474.3 207.3L475 207.4L478 209.1L477.3 209L476.5 209.2Z\"/><path class=\"iso-top\" d=\"M468.5 214.1L468.8 213L469.2 212L469.7 210.9L470.3 210L471.1 209.1L471.8 208.4L472.7 207.8L473.5 207.5L476.5 209.2L475.7 209.5L474.9 210.1L474.1 210.8L473.3 211.7L472.7 212.6L472.2 213.7L471.8 214.7L471.6 215.8Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M472.8 219.6L472.1 219.1L471.7 218.2L471.5 217.2L471.5 216L471.8 214.7L472.3 213.4L473 212.1L473.9 211L474.8 210.1L475.8 209.4L476.8 209.1L477.8 209L478.6 209.3\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M468.5 215.1L468.5 214.1L468.8 213L469.2 212L469.7 210.9L470.3 210L471.1 209.1L471.8 208.4L472.7 207.8L473.5 207.5L474.3 207.3L475 207.4L475.6 207.6L478.6 209.3L479.2 209.8L479.5 210.4L479.8 211.2L479.9 212.1L479.8 213.1L479.5 214.2L479.2 215.2L478.6 216.3L478 217.2L477.3 218.1L476.5 218.8L475.7 219.4L474.9 219.7L474.1 219.9L473.3 219.8L472.7 219.6L469.7 217.9L469.2 217.4L468.8 216.8L468.5 216Z\"/></g></g><g class=\"it\" data-name=\"tanker.tank\" data-move=\"tanker\" data-part=\"tanker\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M430.3 200L430.4 199.3L430.5 198.2L430.7 197.2L431.1 196.3L431.3 195.6L431.8 194.8L432.2 194.2L432.8 193.5L433.4 192.9L434 192.5L434.8 192L458.2 178.9L458.9 178.7L459.7 178.4L460.6 178.2L461.4 178.2L462.3 178.2L463.3 178.4L464 178.5L464.9 178.8L465.9 179.3L466.6 179.6L467.5 180.1L468.4 180.8L469.3 181.5L469.6 181.9L470.4 182.7L471.1 183.6L471.8 184.5L472.4 185.5L473 186.5L473.5 187.5L473.9 188.6L474.2 189.7L474.3 190.1L474.6 191.3L474.7 192.4L474.8 193.5L474.7 194.6L474.7 195.3L474.5 196.3L474.2 197.3L473.9 198L473.5 198.9L473 199.6L472.6 200.2L472 200.9L471.4 201.3L470.7 201.8L447.2 214.9L446.4 215.3L445.8 215.6L444.9 215.8L444.2 215.8L443.3 215.9L442.3 215.8L441.6 215.7L440.6 215.4L439.7 215L439 214.7L438.1 214.2L437.2 213.6L436.3 212.9L435.4 212.1L435.1 211.7L434.3 210.9L433.6 210L433 209.1L432.4 208.1L431.8 207.1L431.4 206L431 204.9L430.8 203.9L430.6 203.3L430.4 202.2L430.3 201.1Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M472.6 185.8L472.6 185.8L470 182.3L470.9 183.2L471.6 184.2L472.3 185.2L472.9 186.4L473.5 187.5L473.9 188.7L474.2 189.8ZM474.3 189.9L474.3 190L474.3 190.1L474.3 190.1L474.3 190.1L474.3 190.1L474.4 190.2L474.4 190.3L474.7 194.5L474.7 194.6L474.7 194.7L474.7 194.9L474.7 195L474.7 195.1L474.7 195.2L474.2 197.4L474.1 197.5L474.1 197.6L474.1 197.8L474 197.9L474 198L473.9 198.1L473.1 199.5L473.1 199.6L473 199.7L472.9 199.8L472.9 199.9L472.8 200L472.7 200.1L471.7 201.1L471.7 201.1L471.6 201.2L471.5 201.3L471.4 201.4L471.3 201.4L471.2 201.5L470.6 201.8L466.7 204L462.8 206.2L458.9 208.4L455 210.6L451.1 212.8L447.2 215L447.9 214.4L448.6 213.7L449.1 212.9L449.6 211.9L449.8 210.8L450 209.6L450 208.3L449.9 206.9L449.6 205.5L449.3 204L448.8 202.5L452.7 200.4L456.6 198.2L460.5 196L464.4 193.8L468.3 191.6L472.2 189.4L472.2 189.4L472.2 189L472.2 188.7L472.2 188.5L472.2 188.3L472.3 188.1L472.3 188L472.3 188L472.2 187.5L472.1 187.1L472 186.7L472 186.5L472 186.3L472 186.2L472 186.2L471.9 185.8L471.7 185.4L471.6 185.1L471.5 184.8L471.5 184.6L471.4 184.5L471.4 184.5L471.2 184.1L471.1 183.8L470.9 183.5L470.8 183.2L470.6 183L470.5 182.8L470.5 182.8L470.2 182.5L470 182.2L469.9 182.1L469.9 182.1L469.9 182.1L469.9 182.2L470 182.2L470 182.3L470.9 183.2L471.6 184.2L472.3 185.2L472.9 186.4L473.5 187.5L473.9 188.7L474.2 189.8ZM446.5 215.3L446.4 215.3L446.3 215.4L446.2 215.4L446 215.5L445.9 215.5L444.6 215.8L444.5 215.8L444.4 215.9L444.3 215.9L444.1 215.9L444 215.9L443.9 215.9L442.3 215.8L442.1 215.8L442 215.8L441.9 215.7L441.8 215.7L441.7 215.7L441.5 215.6L439.4 214.9L439.3 214.9L439.2 214.8L439.1 214.8L439 214.7L438.9 214.7L438.8 214.6L435.4 212.1L435.3 212L435.3 212L435.2 212L435.2 212L435.4 212.1L435.6 212.4L435.9 212.6L436.2 212.8L436.2 212.8L436.6 213L437 213.3L437.6 213.5L438.4 213.7L439.9 213.8L440.3 213.8L440.8 213.7L442.3 213.2L443.1 212.8L443.7 212.4L444.1 212L444.5 211.7L444.5 211.7L444.9 211.4L445.2 211.1L445.5 210.8L445.7 210.6L445.7 210.5L445.8 210.4L446 210.1L446.3 209.7L446.3 209.7L446.5 209.5L446.7 209.2L446.9 208.9L447.1 208.6L447.2 208.2L447.4 207.8L447.4 207.8L447.5 207.6L447.7 207.4L447.8 207.1L447.9 206.7L448 206.3L448.1 205.9L448.1 205.9L448.2 205.8L448.3 205.6L448.4 205.3L448.5 204.9L448.5 204.5L448.4 203.9L448.4 203.9L448.5 203.9L448.6 203.7L448.7 203.5L448.8 203.2L448.8 202.9L448.8 202.5L449.3 204.1L449.7 205.6L449.9 207.1L450 208.6L450 210L449.8 211.2L449.4 212.3L448.9 213.3L448.2 214.1L447.5 214.8L446.6 215.2ZM440.3 213.8L440.3 213.8L440.8 213.7L440.3 213.8L439.9 213.8Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M469.9 182.1L469.8 182.1L469.9 182.1L469.9 182.1ZM470 182.2L470.2 182.5L470.5 182.8L470.5 182.8L470.6 183L470.8 183.2L470.9 183.5L471.1 183.8L471.2 184.1L471.4 184.5L471.4 184.5L471.5 184.6L471.5 184.8L471.6 185.1L471.7 185.4L471.9 185.8L472 186.2L472 186.2L472 186.3L472 186.5L472 186.7L472.1 187.1L472.2 187.5L472.3 188L472.3 188L472.3 188.1L472.2 188.3L472.2 188.5L472.2 188.7L472.2 189L472.2 189.4L472.2 189.4L468.3 191.6L464.4 193.8L460.5 196L456.6 198.2L452.7 200.4L448.8 202.5L448.2 201.2L447.5 199.9L451.4 197.7L455.3 195.5L459.2 193.3L463.1 191.1L467.1 189L471 186.8L471 186.8L470.9 186.4L470.8 186.1L470.8 185.8L470.8 185.6L470.8 185.5L470.9 185.4L470.9 185.4L470.7 184.8L470.5 184.4L470.3 184L470.2 183.7L470.2 183.5L470.2 183.4L470.2 183.4L469.9 183L469.7 182.6L469.5 182.2L469.3 182L469.1 181.7L469 181.6L469 181.6L468.7 181.2L468.3 180.8L467.9 180.5L467.6 180.2L467.2 180L466.9 179.8L469.7 182L469.8 182L469.8 182.1L469.8 182.1L469.9 182.1ZM448.8 202.9L448.8 203.2L448.7 203.5L448.6 203.7L448.5 203.9L448.4 203.9L448.4 203.9L448.5 204.5L448.5 204.9L448.4 205.3L448.3 205.6L448.2 205.8L448.1 205.9L448.1 205.9L448 206.3L447.9 206.7L447.8 207.1L447.7 207.4L447.5 207.6L447.4 207.8L447.4 207.8L447.2 208.2L447.1 208.6L446.9 208.9L446.7 209.2L446.5 209.5L446.3 209.7L446.3 209.7L446 210.1L445.8 210.4L445.7 210.5L445.8 209.7L445.8 208.8L445.7 207.8L445.5 206.9L445.5 206.8L445.7 206.5L445.9 206.2L445.9 206.2L446 206L446.2 205.8L446.3 205.6L446.4 205.3L446.6 205L446.6 204.7L446.6 204.7L446.8 204.5L446.9 204.3L447 204L447.1 203.7L447.1 203.4L447.2 203L447.2 203L447.3 202.9L447.4 202.8L447.4 202.5L447.4 202.2L447.4 201.8L447.3 201.3L447.3 201.3L447.4 201.2L447.5 201L447.6 200.8L447.6 200.6L447.6 200.3L447.5 199.9L448.2 201.2L448.8 202.5ZM445.7 210.6L445.7 209.8L445.7 208.8L445.6 207.9L445.5 206.9L445.5 206.9L445.7 207.8L445.8 208.8L445.8 209.7L445.7 210.5ZM435.3 212L435.3 212L435.2 212L435.2 212ZM435.2 211.9L435.1 211.9L435.1 211.8L435 211.7L433.1 209.3L433.3 209.5L433.4 209.7L433.6 209.9L433.8 210.2L434.1 210.4L434.7 211.1L435.5 211.8L436.2 212.4L436.9 212.9L437.7 213.3L438.5 213.6L439.2 213.8L439.9 213.8L438.4 213.7L437.6 213.5L437 213.3L436.6 213L436.2 212.8L436.2 212.8L435.9 212.6L435.6 212.4L435.4 212.1L435.2 212L435.2 212ZM445.5 210.8L445.2 211.1L444.9 211.4L444.5 211.7L444.5 211.7L444.1 212L443.7 212.4L443.1 212.8L442.3 213.2L440.8 213.7L441.4 213.5L441.9 213.2L442.4 212.7L442.8 212.2L443.1 211.5L443.3 210.8L443.4 210L443.5 209.1L443.7 208.9L444 208.6L444.3 208.3L444.5 208L444.7 207.8L444.7 207.8L445 207.6L445.2 207.3L445.4 207.1L445.5 206.9L445.6 207.9L445.7 208.8L445.7 209.8L445.7 210.6ZM434.1 210.4L434.7 211.1L435.5 211.8L436.2 212.4L436.9 212.9L437.7 213.3L438.5 213.6L439.2 213.8L439.9 213.8L443.4 209.2L443.3 210.1L443.2 210.9L442.9 211.7L442.5 212.3L442.1 212.9L441.6 213.3L441 213.6L440.3 213.8L439.6 213.8L438.8 213.7L438 213.4L437.2 213L436.4 212.5L435.6 211.9L434.8 211.2L434.1 210.4ZM442.7 212.1L442.7 212.1L443.5 209.1L443.4 210L443.3 210.8L443.1 211.5L442.8 212.2L442.4 212.7L441.9 213.2L441.4 213.5L440.8 213.7ZM434.2 210.5L434.3 210.6L434.3 210.6L434.4 210.6L434.7 210.7L435.1 211L435.6 211.3L436.4 211.6L437.7 211.8L437.7 211.8L438.5 211.8L438.7 211.8L439.5 211.5L439.5 211.5L440.8 211L441.5 210.5L442 210.1L442.4 209.7L442.8 209.5L443.1 209.4L443.1 209.4L443.3 209.3L443.4 209.2L443.3 210.1L443.2 210.9L442.9 211.7L442.5 212.3L442.1 212.9L441.6 213.3L441 213.6L440.3 213.8L439.6 213.8L438.8 213.7L438 213.4L437.2 213L436.4 212.5L435.6 211.9L434.8 211.2L434.1 210.4ZM438.6 211.7L438.6 211.7L438.7 211.8L438.5 211.8Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M466.9 179.8L466.3 179.5L466.6 179.6L466.6 179.6ZM467.2 180L467.6 180.2L467.9 180.5L468.3 180.8L468.7 181.2L469 181.6L469 181.6L469.1 181.7L469.3 182L469.5 182.2L469.7 182.6L469.9 183L470.2 183.4L470.2 183.4L470.2 183.5L470.2 183.7L470.3 184L470.5 184.4L470.7 184.8L470.9 185.4L470.9 185.4L470.8 185.5L470.8 185.6L470.8 185.8L470.8 186.1L470.9 186.4L471 186.8L471 186.8L467.1 189L463.1 191.1L459.2 193.3L455.3 195.5L451.4 197.7L447.5 199.9L446.9 198.9L446.3 198L445.6 197L449.5 194.9L453.4 192.7L457.3 190.5L461.3 188.3L465.2 186.1L469.1 183.9L469.1 183.9L468.9 183.6L468.8 183.2L468.7 183L468.7 182.8L468.7 182.6L468.8 182.6L468.8 182.6L468.4 182L468 181.5L467.7 181.1L467.5 180.8L467.3 180.6L467.3 180.5L467.3 180.5L466.8 180L466.3 179.6L465.8 179.3L465.3 179L464.8 178.8L464.4 178.6L465.7 179.1L465.8 179.2L465.9 179.2L466 179.3L466.1 179.3L466.2 179.4L466.3 179.5L466.9 179.8ZM447.6 200.3L447.6 200.6L447.6 200.8L447.5 201L447.4 201.2L447.3 201.3L447.3 201.3L447.4 201.8L447.4 202.2L447.4 202.5L447.4 202.8L447.3 202.9L447.2 203L447.2 203L447.1 203.4L447.1 203.7L447 204L446.9 204.3L446.8 204.5L446.6 204.7L446.6 204.7L446.6 205L446.4 205.3L446.3 205.6L446.2 205.8L446 206L445.9 206.2L445.9 206.2L445.7 206.5L445.5 206.8L445.5 206.9L445.5 206.9L445.4 207.1L445.2 207.3L445 207.6L444.7 207.8L444.6 206.8L444.3 205.7L443.9 204.7L443.5 203.7L443.7 203.5L443.9 203.3L444 203.1L444.1 203L444.2 203L444.2 202.9L444.3 202.7L444.5 202.5L444.5 202.5L444.6 202.4L444.8 202.2L444.9 202L445 201.8L445.1 201.6L445.2 201.3L445.2 201.3L445.3 201.2L445.4 201L445.5 200.8L445.6 200.5L445.6 200.3L445.6 200L445.6 200L445.7 199.9L445.8 199.7L445.8 199.5L445.8 199.2L445.8 198.8L445.6 198.4L445.6 198.4L445.7 198.3L445.8 198.1L445.8 197.9L445.8 197.7L445.7 197.4L445.6 197L446.3 198L446.9 198.9L447.5 199.9ZM444.7 207.8L444.6 206.8L444.3 205.7L443.9 204.7L443.5 203.7L443.5 203.7L443.9 204.7L444.3 205.7L444.6 206.8L444.7 207.8ZM432 207.4L432 207.4L433.1 209.3L432.5 208.4L432 207.4L431.5 206.3L431.2 205.3ZM431.2 205.4L431.3 205.6L431.4 205.7L431.5 205.9L431.6 206L431.6 206.1L431.6 206.1L431.7 206.2L431.7 206.2L431.8 206.2L431.9 206.4L432.1 206.5L432.3 206.6L432.5 206.8L432.7 206.9L432.7 206.9L432.8 207L433.1 207.6L433.5 208.3L433.9 208.9L434.4 209.5L434.9 210.1L435.4 210.5L435.9 210.9L436.5 211.3L437 211.5L437.5 211.7L438 211.8L438.5 211.8L437.7 211.8L437.7 211.8L436.4 211.6L435.6 211.3L435.1 211L434.7 210.7L434.4 210.6L434.3 210.6L434.3 210.6L434.2 210.5L434.1 210.4L434.1 210.4L433.8 210.2L433.6 209.9L433.4 209.7L433.3 209.5L433.1 209.3L432.5 208.4L432 207.4L431.5 206.3L431.2 205.3ZM444.5 208L444.3 208.3L444 208.6L443.7 208.9L443.5 209.1L443.4 209.2L443.3 209.3L443.1 209.4L443.1 209.4L442.8 209.5L442.4 209.7L442 210.1L441.5 210.5L440.8 211L439.5 211.5L439.5 211.5L438.7 211.8L439.2 211.6L439.6 211.4L439.9 211.1L440.2 210.8L440.5 210.3L440.6 209.8L440.8 209.3L440.8 208.7L440.8 208L440.7 207.4L440.6 206.7L440.3 206L440.4 205.9L440.4 205.9L440.8 205.7L441.1 205.5L441.4 205.3L441.6 205.1L441.9 204.9L442.2 204.8L442.2 204.8L442.3 204.7L442.4 204.6L442.4 204.6L442.7 204.4L442.9 204.2L443.1 204L443.3 203.9L443.5 203.7L443.9 204.7L444.3 205.7L444.6 206.8L444.7 207.8ZM432.8 207L433.1 207.6L433.5 208.3L433.9 208.9L434.4 209.5L434.9 210.1L435.4 210.5L435.9 210.9L436.5 211.3L437 211.5L437.5 211.7L438 211.8L438.5 211.8L440.3 206L440.5 206.7L440.7 207.4L440.8 208.2L440.8 208.8L440.7 209.5L440.6 210L440.3 210.5L440.1 210.9L439.7 211.3L439.3 211.5L438.9 211.7L438.4 211.8L437.8 211.7L437.3 211.6L436.7 211.4L436.2 211.1L435.6 210.7L435 210.2L434.5 209.7L434 209L433.5 208.4L433.1 207.7L432.8 207ZM440.6 209.8L440.6 209.8L440.3 206L440.6 206.7L440.7 207.4L440.8 208L440.8 208.7L440.8 209.3L440.6 209.8L440.5 210.3L440.2 210.8L439.9 211.1L439.6 211.4L439.2 211.6L438.7 211.8ZM432.8 207L432.9 207L433 207.1L433.2 207.2L433.3 207.2L433.4 207.2L433.4 207.2L433.4 207.2L433.8 207.2L434.2 207.1L434.6 207L435 206.8L435.1 207L435.2 207.1L435.4 207.2L435.5 207.4L435.6 207.5L435.7 207.6L435.9 207.6L436 207.7L436.1 207.7L436.2 207.7L436.3 207.7L436.4 207.7L436.5 207.6L436.6 207.5L436.7 207.4L436.7 207.3L436.8 207.2L436.8 207.1L436.8 206.9L436.8 206.7L436.7 206.6L437.5 206.6L438.2 206.6L438.9 206.5L439.5 206.4L439.5 206.4L439.6 206.4L439.6 206.4L439.8 206.3L440 206.2L440.2 206.1L440.3 206L440.3 206L440.5 206.7L440.7 207.4L440.8 208.2L440.8 208.8L440.7 209.5L440.6 210L440.3 210.5L440.1 210.9L439.7 211.3L439.3 211.5L438.9 211.7L438.4 211.8L437.8 211.7L437.3 211.6L436.7 211.4L436.2 211.1L435.6 210.7L435 210.2L434.5 209.7L434 209L433.5 208.4L433.1 207.7L432.8 207Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M464.4 178.6L463.6 178.4L464 178.5L464 178.5ZM464.8 178.8L465.3 179L465.8 179.3L466.3 179.6L466.8 180L467.3 180.5L467.3 180.5L467.3 180.6L467.5 180.8L467.7 181.1L468 181.5L468.4 182L468.8 182.6L468.8 182.6L468.7 182.6L468.7 182.8L468.7 183L468.8 183.2L468.9 183.6L469.1 183.9L469.1 183.9L465.2 186.1L461.3 188.3L457.3 190.5L453.4 192.7L449.5 194.9L445.6 197L444.9 196.1L444.1 195.3L443.3 194.5L447.2 192.4L451.1 190.2L455 188L458.9 185.8L462.8 183.6L466.7 181.4L466.7 181.4L466.5 181.1L466.3 180.8L466.1 180.5L466 180.3L466 180.2L466 180.1L466 180.1L465.3 179.5L464.5 179L463.8 178.7L463.1 178.4L462.6 178.3L462.3 178.2L462.8 178.3L462.9 178.3L463.1 178.3L463.2 178.3L463.3 178.3L463.4 178.4L463.6 178.4L464.4 178.6ZM445.7 197.4L445.8 197.7L445.8 197.9L445.8 198.1L445.7 198.3L445.6 198.4L445.6 198.4L445.8 198.8L445.8 199.2L445.8 199.5L445.8 199.7L445.7 199.9L445.6 200L445.6 200L445.6 200.3L445.6 200.5L445.5 200.8L445.4 201L445.3 201.2L445.2 201.3L445.2 201.3L445.1 201.6L445 201.8L444.9 202L444.8 202.2L444.6 202.4L444.5 202.5L443.9 201.4L443.2 200.3L442.4 199.3L442.6 199.1L442.7 199L442.9 198.9L443 198.7L443.1 198.5L443.2 198.4L443.2 198.4L443.3 198.2L443.4 198.1L443.5 197.9L443.6 197.7L443.6 197.5L443.6 197.3L443.6 197.3L443.7 197.1L443.8 197L443.8 196.8L443.8 196.5L443.7 196.2L443.5 195.8L443.5 195.8L443.6 195.7L443.6 195.6L443.6 195.4L443.6 195.2L443.5 194.9L443.3 194.5L444.1 195.3L444.9 196.1L445.6 197ZM444.5 202.5L443.9 201.4L443.2 200.3L442.4 199.3L442.4 199.3L443.2 200.3L443.9 201.4L444.5 202.5ZM430.4 202.3L430.4 202.3L430.7 203.8L430.5 202.8L430.4 201.8L430.3 200.9ZM430.3 201L430.3 201.1L430.3 201.1L430.3 201.2L430.4 201.2L430.4 201.3L430.4 201.4L430.5 201.5L430.5 201.5L430.5 201.6L430.6 201.7L430.7 201.7L430.7 201.8L430.8 201.9L430.9 201.9L430.9 201.9L430.9 201.9L430.9 201.9L431.1 202.1L431.2 202.1L431.4 202.2L431.6 202.1L431.8 202.1L432.2 202L432.2 202L432.3 201.9L432.3 201.9L432.3 201.9L432.5 201.8L432.9 201.7L433.4 201.6L433.8 201.5L434.1 201.5L433.7 201.7L433.4 201.9L433.2 202.1L432.9 202.5L432.8 202.9L432.7 203.3L432.6 203.8L432.6 204.3L432.6 204.9L432.7 205.5L432.9 206L433.1 206.6L433.4 207.2L433.3 207.2L433.2 207.2L433 207.1L432.9 207L432.8 207L432.8 207L432.8 207L432.7 206.9L432.7 206.9L432.5 206.8L432.3 206.6L432.1 206.5L431.9 206.4L431.8 206.2L431.7 206.2L431.7 206.2L431.6 206.1L431.6 206.1L431.6 206L431.5 205.9L431.4 205.7L431.3 205.6L431.2 205.4L431.2 205.3L430.8 204.2L430.8 204.2L430.8 204.1L430.8 204L430.7 204L430.7 203.9L430.7 203.9L430.7 203.8L430.7 203.8L430.5 202.8L430.4 201.8L430.3 200.9ZM444.3 202.7L444.2 202.9L444.2 203L444.1 203L444 203.1L443.9 203.3L443.7 203.5L443.5 203.7L443.5 203.7L443.3 203.9L443.1 204L442.9 204.2L442.7 204.4L442.4 204.6L442.4 204.6L442.3 204.7L442.2 204.8L442.2 204.8L441.9 204.9L441.6 205.1L441.4 205.3L441.1 205.5L440.8 205.7L440.4 205.9L440.4 205.9L440.3 206L440.3 206L440.3 206L440.2 206.1L440 206.2L439.8 206.3L439.6 206.4L439.6 206.4L439.4 205.8L439.1 205.2L438.8 204.7L438.5 204.1L438.1 203.6L437.7 203.1L437.3 202.7L436.9 202.3L436.4 202L436 201.8L435.5 201.6L435.1 201.5L434.7 201.4L435 201.4L435.4 201.3L436.1 201.2L436.6 201.2L436.9 201.3L437 201.3L437.1 201.3L437.2 201.3L437.2 201.3L437.8 201.3L438.3 201.2L438.8 201.2L439.2 201.1L439.5 201L439.7 200.8L439.7 200.8L439.9 200.7L439.9 200.7L440 200.7L440.3 200.6L440.6 200.4L440.8 200.3L441.1 200.2L441.3 200.1L441.3 200.1L441.5 199.9L441.7 199.8L441.9 199.7L442 199.6L442 199.6L442.1 199.6L442.3 199.4L442.4 199.3L443.2 200.3L443.9 201.4L444.5 202.5ZM434.1 201.5L433.7 201.7L433.4 201.9L433.2 202.1L432.9 202.5L432.8 202.9L432.7 203.3L432.6 203.8L432.6 204.3L432.6 204.9L432.7 205.5L432.9 206L433.1 206.6L433.4 207.2L433.4 207.2L433.1 206.6L432.9 206L432.8 205.4L432.7 204.9L432.6 204.3L432.6 203.8L432.7 203.3L432.8 202.9L433 202.5L433.2 202.1L433.5 201.9L433.8 201.7L434.2 201.5L434.6 201.5L435 201.5L435.4 201.6L435.9 201.8L436.3 202L436.8 202.3L437.2 202.7L437.7 203.1L438.1 203.6L438.4 204.1L438.8 204.6L439.1 205.2L439.3 205.8L439.5 206.4ZM437.5 202.9L437.5 202.9L434.7 201.4L435.1 201.5L435.5 201.6L436 201.8L436.4 202L436.9 202.3L437.3 202.7L437.7 203.1L438.1 203.6L438.5 204.1L438.8 204.7L439.1 205.2L439.4 205.8L439.6 206.4ZM439.5 206.4L438.9 206.5L438.2 206.6L437.5 206.6L436.7 206.6L436.7 206.4L436.6 206.2L436.6 206.1L436.5 205.9L436.4 205.8L436.3 205.6L436.1 205.5L436 205.4L435.9 205.3L435.8 205.2L435.6 205.2L435.5 205.1L435.4 205.1L435.3 205.1L435.2 205.1L435.1 205.2L435 205.2L434.9 205.3L434.9 205.4L434.8 205.5L434.8 205.7L434.8 205.8L434.8 206L434.8 206.1L434.8 206.3L434.9 206.5L435 206.6L435 206.8L434.6 207L434.2 207.1L433.8 207.2L433.4 207.2L433.4 207.2L433.1 206.6L432.9 206L432.8 205.4L432.7 204.9L432.6 204.3L432.6 203.8L432.7 203.3L432.8 202.9L433 202.5L433.2 202.1L433.5 201.9L433.8 201.7L434.2 201.5L434.6 201.5L435 201.5L435.4 201.6L435.9 201.8L436.3 202L436.8 202.3L437.2 202.7L437.7 203.1L438.1 203.6L438.4 204.1L438.8 204.6L439.1 205.2L439.3 205.8L439.5 206.4ZM435.8 206.4L435.8 206.4L435.8 206.4L435.8 206.4L435.8 206.4L435.8 206.4L435.8 206.4L435.8 206.4L435.8 206.4L435.8 206.4L435.8 206.4L435.8 206.4L435.8 206.4L435.8 206.4L435.8 206.4L435.8 206.4L435.8 206.4L435.8 206.4L435.8 206.4L435.8 206.4L435.8 206.4L435.8 206.4L435.8 206.4L435.8 206.4L435.8 206.4L435.8 206.4L435.8 206.4L435.8 206.4L435.8 206.4L435.8 206.4L435.8 206.4L435.8 206.4L435.8 206.4L436.8 207L436.8 207.2L436.7 207.4L436.6 207.5L436.5 207.6L436.3 207.7L436.2 207.7L436 207.7L435.8 207.6L435.6 207.4L435.4 207.3L435.2 207.1L435.1 206.8L434.9 206.6L434.9 206.3L434.8 206.1L434.8 205.8L434.8 205.6L434.9 205.4L434.9 205.3L435.1 205.2L435.2 205.1L435.4 205.1L435.6 205.1L435.8 205.2L436 205.4L436.2 205.5L436.3 205.7L436.5 206L436.6 206.2L436.7 206.5L436.8 206.7L436.8 207Z\"/><path class=\"iso-top\" d=\"M461.8 178.2L461.8 178.2L461.2 178.2L461.8 178.2L462.3 178.2ZM462.6 178.3L463.1 178.4L463.8 178.7L464.5 179L465.3 179.5L466 180.1L466 180.1L466 180.2L466 180.3L466.1 180.5L466.3 180.8L466.5 181.1L466.7 181.4L466.7 181.4L462.8 183.6L458.9 185.8L455 188L451.1 190.2L447.2 192.4L443.3 194.5L442.1 193.6L440.9 192.8L439.7 192.3L438.6 191.8L437.4 191.6L436.4 191.6L435.4 191.8L434.4 192.2L438.4 190L442.3 187.8L446.2 185.6L450.1 183.5L454 181.3L457.9 179.1L458.5 178.8L458.6 178.8L458.7 178.7L458.8 178.7L458.9 178.6L459 178.6L459.2 178.6L460.5 178.3L460.6 178.2L460.7 178.2L460.8 178.2L461 178.2L461.1 178.2L461.2 178.2L461.8 178.2L462.3 178.2ZM443.5 194.9L443.6 195.2L443.6 195.4L443.6 195.6L443.6 195.7L443.5 195.8L443.5 195.8L443.7 196.2L443.8 196.5L443.8 196.8L443.8 197L443.7 197.1L443.6 197.3L443.6 197.3L443.6 197.5L443.6 197.7L443.5 197.9L443.4 198.1L443.3 198.2L443.2 198.4L443.2 198.4L443.1 198.5L443 198.7L442.9 198.9L442.7 199L442.6 199.1L442.4 199.3L442.4 199.3L442.3 199.4L442.1 199.6L442 199.6L442 199.6L441.9 199.7L441.7 199.8L441.5 199.9L441.3 200.1L441.3 200.1L441.1 200.2L440.8 200.3L440.6 200.4L440.3 200.6L440 200.7L439.9 200.7L439.9 200.7L439.7 200.8L439.7 200.8L439.5 201L439.2 201.1L438.8 201.2L438.3 201.2L437.8 201.3L437.2 201.3L437.2 201.3L437.1 201.3L437 201.3L436.9 201.3L436.6 201.2L436.1 201.2L435.4 201.3L435 201.4L434.7 201.4L434.4 201.5L434.1 201.5L433.8 201.5L433.4 201.6L432.9 201.7L432.5 201.8L432.3 201.9L432.3 201.9L432.3 201.9L432.2 202L432.2 202L431.8 202.1L431.6 202.1L431.4 202.2L431.2 202.1L431.1 202.1L430.9 201.9L430.9 201.9L430.9 201.9L430.9 201.9L430.8 201.9L430.7 201.8L430.7 201.7L430.6 201.7L430.5 201.6L430.5 201.5L430.5 201.5L430.4 201.4L430.4 201.3L430.4 201.2L430.3 201.2L430.3 201.1L430.3 201.1L430.3 201L430.3 200.9L430.4 199.6L430.4 199.4L430.4 199.3L430.4 199.2L430.4 199.1L430.4 199L430.4 198.8L430.9 196.7L430.9 196.5L431 196.4L431 196.3L431.1 196.2L431.1 196.1L431.2 196L432 194.6L432 194.4L432.1 194.3L432.2 194.2L432.2 194.1L432.3 194L432.4 194L433.3 193L433.4 192.9L433.5 192.8L433.6 192.8L433.7 192.7L433.8 192.6L433.9 192.6L434.7 192.1L435.6 191.8L436.6 191.6L437.6 191.7L438.7 191.9L439.9 192.3L441 192.9L442.1 193.6L443.3 194.5ZM434.4 201.5L434.4 201.5L434.1 201.5L434.4 201.5L434.7 201.4Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M436.5 206L435.5 205.1L434.8 205.5L435.1 206.8L436 207.7L436.7 207.3L436.5 206\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M466 204.4L466.7 203.8L467.2 203.1L467.7 202.3L468.1 201.4L468.3 200.4L468.4 199.2L468.5 198L468.4 196.8L468.2 195.5L467.8 194.2L467.4 192.8L466.9 191.5L466.3 190.2L465.6 188.9L464.8 187.7L463.9 186.6L463 185.5L462 184.5L461 183.7L460 182.9L459 182.3L458 181.9L457 181.5L456 181.3L455 181.3L454.1 181.4L453.3 181.7M457.6 209.1L458.3 208.5L458.9 207.8L459.3 207L459.7 206.1L459.9 205L460.1 203.9L460.1 202.7L460 201.5L459.8 200.2L459.5 198.8L459 197.5L458.5 196.2L457.9 194.9L457.2 193.6L456.4 192.4L455.5 191.2L454.6 190.2L453.7 189.2L452.7 188.4L451.6 187.6L450.6 187L449.6 186.5L448.6 186.2L447.6 186L446.7 186L445.8 186.1L444.9 186.4\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M430.3 200L430.4 199.3L430.5 198.2L430.7 197.2L431.1 196.3L431.3 195.6L431.8 194.8L432.2 194.2L432.8 193.5L433.4 192.9L434 192.5L434.8 192L458.2 178.9L458.9 178.7L459.7 178.4L460.6 178.2L461.4 178.2L462.3 178.2L463.3 178.4L464 178.5L464.9 178.8L465.9 179.3L466.6 179.6L467.5 180.1L468.4 180.8L469.3 181.5L469.6 181.9L470.4 182.7L471.1 183.6L471.8 184.5L472.4 185.5L473 186.5L473.5 187.5L473.9 188.6L474.2 189.7L474.3 190.1L474.6 191.3L474.7 192.4L474.8 193.5L474.7 194.6L474.7 195.3L474.5 196.3L474.2 197.3L473.9 198L473.5 198.9L473 199.6L472.6 200.2L472 200.9L471.4 201.3L470.7 201.8L447.2 214.9L446.4 215.3L445.8 215.6L444.9 215.8L444.2 215.8L443.3 215.9L442.3 215.8L441.6 215.7L440.6 215.4L439.7 215L439 214.7L438.1 214.2L437.2 213.6L436.3 212.9L435.4 212.1L435.1 211.7L434.3 210.9L433.6 210L433 209.1L432.4 208.1L431.8 207.1L431.4 206L431 204.9L430.8 203.9L430.6 203.3L430.4 202.2L430.3 201.1Z\"/></g></g><g class=\"it\" data-name=\"boom.silo.post\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M356.1 212.1L356.5 211.4L357.3 210.8L358.4 210.3L359.7 210.1L361 210.1L362.3 210.3L363.4 210.8L364.1 211.4L364.6 212.1L364.6 224.2L364.1 224.9L363.4 225.6L362.3 226L361 226.2L359.7 226.2L358.4 226L357.3 225.6L356.5 224.9L356.1 224.2Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M363.4 225.6L362.3 226L362.3 214.6L363.4 214.2ZM364.6 224.2L364.1 224.9L364.1 213.5L364.6 212.8ZM364.1 224.9L363.4 225.6L363.4 214.2L364.1 213.5Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M362.3 226L361 226.2L361 214.8L362.3 214.6Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M361 226.2L359.7 226.2L359.7 214.8L361 214.8ZM359.7 226.2L358.4 226L358.4 214.6L359.7 214.8Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M358.4 226L357.3 225.6L357.3 214.2L358.4 214.6ZM357.3 225.6L356.5 224.9L356.5 213.5L357.3 214.2ZM356.5 224.9L356.1 224.2L356.1 212.8L356.5 213.5Z\"/><path class=\"iso-top\" d=\"M363.4 214.2L362.3 214.6L361 214.8L359.7 214.8L358.4 214.6L357.3 214.2L356.5 213.5L356.1 212.8L356.1 212.1L356.5 211.4L357.3 210.8L358.4 210.3L359.7 210.1L361 210.1L362.3 210.3L363.4 210.8L364.1 211.4L364.6 212.1L364.6 212.8L364.1 213.5Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M364.6 212.8L364.1 213.5L363.4 214.2L362.3 214.6L361 214.8L359.7 214.8L358.4 214.6L357.3 214.2L356.5 213.5L356.1 212.8\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M356.1 212.8L356.1 212.1L356.5 211.4L357.3 210.8L358.4 210.3L359.7 210.1L361 210.1L362.3 210.3L363.4 210.8L364.1 211.4L364.6 212.1L364.6 212.8M364.6 224.2L364.1 224.9L363.4 225.6L362.3 226L361 226.2L359.7 226.2L358.4 226L357.3 225.6L356.5 224.9L356.1 224.2M356.1 212.8L356.1 224.2M364.6 212.8L364.6 224.2\"/></g><path class=\"iso-line\" data-tone=\"faint\" d=\"M364.6 218L364.5 218.4L364.3 218.9L363.9 219.3L363.4 219.7L362.7 220L362 220.2L361.2 220.3L360.3 220.4L359.5 220.3L358.7 220.2L358 220L357.3 219.7L356.8 219.3L356.4 218.9L356.2 218.4L356.1 218\"/></g><g class=\"it\" data-name=\"tanker.wheel\" data-move=\"tanker\" data-part=\"tanker\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M436.6 232.9L436.7 231.9L436.9 230.8L437.3 229.8L437.8 228.7L438.5 227.8L439.2 226.9L440 226.2L440.8 225.6L441.6 225.3L442.4 225.1L443.1 225.2L443.8 225.4L446.8 227.1L447.3 227.6L447.7 228.2L447.9 229L448 229.9L447.9 230.9L447.7 232L447.3 233L446.8 234.1L446.2 235L445.4 235.9L444.6 236.6L443.8 237.2L443 237.5L442.2 237.7L441.5 237.6L440.9 237.4L437.8 235.7L437.3 235.2L436.9 234.6L436.7 233.8Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M437.8 235.7L437.3 235.2L440.3 236.9L440.9 237.4ZM439.6 234.6L439.7 233.6L440 232.5L440.3 231.5L440.9 230.4L441.5 229.5L442.2 228.6L443 227.9L443.8 227.3L444.6 227L445.4 226.8L446.2 226.9L446.8 227.1L447.3 227.6L447.7 228.2L447.9 229L448 229.9L447.9 230.9L447.7 232L447.3 233L446.8 234.1L446.2 235L445.4 235.9L444.6 236.6L443.8 237.2L443 237.5L442.2 237.7L441.5 237.6L440.9 237.4L440.3 236.9L440 236.3L439.7 235.5L439.6 234.6L443.8 232.2L443.8 232.2L443.8 232.2L443.8 232.2L443.8 232.2L443.8 232.2L443.8 232.2L443.8 232.2L443.8 232.2L443.8 232.2L443.8 232.2L443.8 232.2L443.8 232.2L443.8 232.2L443.8 232.2L443.8 232.2L443.8 232.2L443.8 232.2L443.8 232.2L443.8 232.2L443.8 232.2L443.8 232.2L443.8 232.2L443.8 232.2L443.8 232.2L443.8 232.2L443.8 232.2L443.8 232.2L443.8 232.2L443.8 232.2L443.8 232.2L443.8 232.2L443.8 232.2Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M437.3 235.2L436.9 234.6L440 236.3L440.3 236.9Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M443.1 225.2L443.8 225.4L446.8 227.1L446.2 226.9ZM436.9 234.6L436.7 233.8L436.6 232.9L439.6 234.6L439.7 235.5L440 236.3Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M436.6 232.9L436.7 231.9L439.7 233.6L439.6 234.6ZM441.6 225.3L442.4 225.1L443.1 225.2L446.2 226.9L445.4 226.8L444.6 227Z\"/><path class=\"iso-top\" d=\"M436.7 231.9L436.9 230.8L437.3 229.8L437.8 228.7L438.5 227.8L439.2 226.9L440 226.2L440.8 225.6L441.6 225.3L444.6 227L443.8 227.3L443 227.9L442.2 228.6L441.5 229.5L440.9 230.4L440.3 231.5L440 232.5L439.7 233.6Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M440.9 237.4L440.3 236.9L439.9 236L439.7 235L439.7 233.8L440 232.5L440.5 231.2L441.2 229.9L442 228.8L443 227.9L444 227.3L445 226.9L445.9 226.8L446.7 227.1\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M436.6 232.9L436.7 231.9L436.9 230.8L437.3 229.8L437.8 228.7L438.5 227.8L439.2 226.9L440 226.2L440.8 225.6L441.6 225.3L442.4 225.1L443.1 225.2L443.8 225.4L446.8 227.1L447.3 227.6L447.7 228.2L447.9 229L448 229.9L447.9 230.9L447.7 232L447.3 233L446.8 234.1L446.2 235L445.4 235.9L444.6 236.6L443.8 237.2L443 237.5L442.2 237.7L441.5 237.6L440.9 237.4L437.8 235.7L437.3 235.2L436.9 234.6L436.7 233.8Z\"/></g></g><g class=\"it\" data-name=\"tanker.cab\" data-move=\"tanker\" data-part=\"tanker\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M414 203.8L415 202.8L422.2 198.8L423.9 198.2L425.9 198.2L427.6 198.8L440.6 206.1L441.6 207L441.6 223.9L440.6 224.8L433.4 228.8L431.7 229.4L429.8 229.4L428.1 228.8L415 221.5L414 220.6Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M441.6 223.9L440.6 224.8L440.6 209.1L441.6 208.1ZM440.6 224.8L433.4 228.8L433.4 213.1L440.6 209.1Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M433.4 228.8L431.7 229.4L431.7 213.7L433.4 213.1Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M431.7 229.4L429.8 229.4L429.8 213.7L431.7 213.7ZM429.8 229.4L428.1 228.8L428.1 213.1L429.8 213.7Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M428.1 228.8L415 221.5L415 205.8L428.1 213.1ZM415 221.5L414 220.6L414 204.8L415 205.8Z\"/><path class=\"iso-top\" d=\"M440.6 206.1L441.6 207L441.6 208.1L440.6 209.1L433.4 213.1L431.7 213.7L429.8 213.7L428.1 213.1L415 205.8L414 204.8L414 203.8L415 202.8L422.2 198.8L423.9 198.2L425.9 198.2L427.6 198.8Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M441.6 208.1L440.6 209.1L433.4 213.1L431.7 213.7L429.8 213.7L428.1 213.1L415 205.8L414 204.8\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M441.6 208.1L439.9 208.8L432.9 212.7L431.5 213.1L430 213.1L428.6 212.7L415.7 205.5L414 204.8\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M414 204.8L414 203.8L415 202.8L422.2 198.8L423.9 198.2L425.9 198.2L427.6 198.8L440.6 206.1L441.6 207L441.6 208.1M441.6 223.9L440.6 224.8L433.4 228.8L431.7 229.4L429.8 229.4L428.1 228.8L415 221.5L414 220.6M441.6 208.1L441.6 223.9M414 204.8L414 220.6\"/></g></g><g class=\"it\" data-name=\"silo.roof\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M336.3 115.3L336.3 114.5L336.4 113.7L336.6 112.8L336.8 112L337.1 111.2L337.4 110.4L337.8 109.5L338.3 108.7L338.8 108L339.3 107.2L340 106.4L340.6 105.7L341.4 104.9L342.1 104.2L343 103.5L343.8 102.8L344.8 102.2L345.7 101.5L346.7 100.9L347.8 100.3L348.9 99.8L350 99.2L351.2 98.7L352.9 98L354.6 97.3L355.7 96.9L357.3 96.2L358.9 95.6L359.8 95.3L361.4 94.7L363 94.2L363.7 93.9L365.2 93.4L365.8 93.2L367.2 92.8L367.7 92.7L369.1 92.3L369.5 92.2L369.9 92.1L371.1 91.9L371.4 91.8L371.6 91.8L371.9 91.7L373.8 91.5L375.5 91.7L375.8 91.7L376.1 91.8L376.4 91.9L377.5 92.1L377.9 92.2L378.3 92.3L379.6 92.6L380.1 92.8L381.6 93.2L382.2 93.4L383.7 93.9L384.4 94.1L385.9 94.6L386.7 94.9L388.4 95.5L390 96.1L391.6 96.8L392.6 97.2L394.3 97.9L396 98.6L397.2 99.1L398.3 99.6L399.4 100.2L400.5 100.8L401.5 101.4L402.5 102L403.5 102.7L404.3 103.3L405.2 104L406 104.8L406.7 105.5L407.4 106.2L408 107L408.6 107.8L409.1 108.5L409.6 109.3L410 110.1L410.4 111L410.6 111.8L410.9 112.6L411 113.4L411.2 114.3L411.2 115.1L411.2 116L411.1 116.8L411 117.6L410.8 118.5L410.6 119.3L410.3 120.1L409.9 120.9L409.5 121.7L409 122.5L408.5 123.3L407.9 124.1L407.2 124.8L406.5 125.6L405.8 126.3L405 127L404.1 127.7L403.2 128.4L402.3 129L401.3 129.6L400.2 130.2L399.2 130.8L398 131.4L396.9 131.9L395.7 132.4L394.4 132.9L393.2 133.3L391.9 133.8L390.6 134.2L389.2 134.5L387.8 134.8L386.4 135.1L385 135.4L383.6 135.6L382.1 135.9L380.7 136L379.2 136.2L377.7 136.3L376.2 136.3L374.7 136.4L373.2 136.4L371.7 136.3L370.2 136.3L368.7 136.2L367.2 136.1L365.8 135.9L364.3 135.7L362.9 135.5L361.4 135.2L360 134.9L358.6 134.6L357.3 134.2L356 133.9L354.7 133.4L353.4 133L352.1 132.5L350.9 132L349.8 131.5L348.6 131L347.5 130.4L346.5 129.8L345.5 129.2L344.5 128.5L343.6 127.9L342.7 127.2L341.9 126.5L341.2 125.8L340.5 125L339.8 124.3L339.2 123.5L338.6 122.7L338.1 121.9L337.7 121.1L337.3 120.3L337 119.5L336.8 118.7L336.5 117.8L336.4 117L336.3 116.2Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M373.8 91.8L373.8 91.9L373.8 91.9L373.8 91.9L373.8 91.9L373.8 91.9L373.8 91.9L373.8 91.9L373.8 91.9L373.8 91.9L373.8 91.9L373.8 91.9L373.8 91.9L373.8 91.9L373.8 91.9L373.8 91.9L373.8 91.9L373.8 91.9L373.8 91.9L373.8 91.9L373.8 91.5L373.8 91.5L373.8 91.5L373.8 91.5L373.8 91.5L373.8 91.5L373.8 91.5L373.8 91.5L373.8 91.5L373.8 91.5L373.8 91.5L373.8 91.5L373.8 91.5L373.8 91.5L373.8 91.5L373.8 91.5L373.8 91.5L373.8 91.5L373.8 91.5L373.8 91.5Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M408.1 107.1L409.2 108.7L410.1 110.3L410.7 111.9L411.1 113.6L411.2 115.2L411.1 116.9L410.8 118.5L410.2 120.2L409.4 121.8L408.4 123.4L405.8 120.8L406.8 119.3L407.5 117.9L408 116.3L408.3 114.8L408.4 113.3L408.3 111.7L407.9 110.2L407.4 108.7L406.6 107.2L405.6 105.8ZM406.6 107.2L407.4 108.7L407.9 110.2L408.3 111.7L408.4 113.3L408.3 114.8L408 116.3L407.5 117.9L406.8 119.3L404.1 116.9L404.7 115.5L405.2 114.1L405.5 112.7L405.6 111.3L405.4 109.9L405.1 108.5L404.6 107.1L403.9 105.8ZM404.6 107.1L405.1 108.5L405.4 109.9L405.6 111.3L405.5 112.7L405.2 114.1L404.7 115.5L401.9 113.2L402.4 111.9L402.6 110.7L402.7 109.4L402.6 108.1L402.3 106.8L401.8 105.6ZM401.8 105.6L402.3 106.8L402.6 108.1L402.7 109.4L402.6 110.7L402.4 111.9L401.9 113.2L399.1 110.9L399.5 109.7L399.7 108.6L399.8 107.4L399.7 106.3L399.4 105.1L399 104ZM399.7 106.3L399.8 107.4L399.7 108.6L399.5 109.7L396.6 107.5L396.8 106.5L396.8 105.5L396.7 104.5ZM373.8 91.9L373.8 91.9L373.8 91.9L373.8 91.9L373.8 91.9L373.8 91.5L373.8 91.5L373.8 91.5L373.8 91.5L373.8 91.5Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M397.5 99.2L399.7 100.3L401.8 101.5L403.7 102.8L405.4 104.2L406.9 105.6L408.1 107.1L405.6 105.8L404.4 104.4L403 103.1L401.4 101.8L399.7 100.6L397.8 99.5L395.7 98.5ZM408.4 123.4L407.2 124.9L405.8 126.3L404.1 127.7L402.3 129L400.2 130.2L398.1 131.4L395.7 132.4L393.2 133.3L390.6 134.1L387.9 134.8L386.9 131.4L389.4 130.8L391.8 130L394.1 129.2L396.2 128.2L398.3 127.2L400.1 126L401.8 124.8L403.4 123.5L404.7 122.2L405.8 120.8ZM393.5 97.5L395.7 98.5L397.8 99.5L399.7 100.6L401.4 101.8L403 103.1L404.4 104.4L405.6 105.8L406.6 107.2L403.9 105.8L403 104.5L401.9 103.2L400.6 102L399.2 100.8L397.6 99.7L395.8 98.7L393.9 97.7L391.9 96.9ZM406.8 119.3L405.8 120.8L404.7 122.2L403.4 123.5L401.8 124.8L400.1 126L398.3 127.2L396.2 128.2L394.1 129.2L391.8 130L389.4 130.8L388.1 127.4L390.3 126.7L392.4 125.9L394.4 125L396.3 124.1L398 123L399.5 121.9L400.9 120.8L402.2 119.5L403.2 118.2L404.1 116.9ZM391.9 96.9L393.9 97.7L395.8 98.7L397.6 99.7L399.2 100.8L400.6 102L401.9 103.2L403 104.5L403.9 105.8L404.6 107.1L401.8 105.6L401.1 104.3L400.3 103.1L399.3 102L398.2 100.9L396.9 99.8L395.4 98.8L393.8 97.9L392.1 97L390.2 96.2ZM404.7 115.5L404.1 116.9L403.2 118.2L402.2 119.5L400.9 120.8L399.5 121.9L398 123L396.3 124.1L394.4 125L392.4 125.9L390.3 126.7L388.1 127.4L386.8 124L388.8 123.4L390.7 122.6L392.5 121.9L394.2 121L395.8 120L397.2 119L398.5 118L399.6 116.8L400.5 115.7L401.3 114.4L401.9 113.2ZM390.2 96.2L392.1 97L393.8 97.9L395.4 98.8L396.9 99.8L398.2 100.9L399.3 102L400.3 103.1L401.1 104.3L401.8 105.6L399 104L398.4 102.9L397.7 101.8L396.8 100.8L395.7 99.8L394.5 98.8L393.2 97.9L391.8 97.1L390.2 96.3L388.6 95.6ZM401.9 113.2L401.3 114.4L400.5 115.7L399.6 116.8L398.5 118L397.2 119L395.8 120L394.2 121L392.5 121.9L390.7 122.6L388.8 123.4L386.8 124L385.5 120.6L387.3 120L389 119.4L390.6 118.6L392.2 117.9L393.6 117L394.8 116.1L396 115.1L397 114.1L397.9 113.1L398.6 112L399.1 110.9ZM388.6 95.6L390.2 96.3L391.8 97.1L393.2 97.9L394.5 98.8L395.7 99.8L396.8 100.8L397.7 101.8L398.4 102.9L399 104L399.4 105.1L399.7 106.3L396.7 104.5L396.5 103.4L396.1 102.4L395.6 101.4L394.9 100.5L394.2 99.6L393.2 98.7L392.2 97.8L391 97L389.8 96.3L388.4 95.6L386.9 95ZM399.5 109.7L399.1 110.9L398.6 112L397.9 113.1L397 114.1L396 115.1L394.8 116.1L393.6 117L392.2 117.9L390.6 118.6L389 119.4L387.3 120L385.5 120.6L384.2 117.1L385.8 116.6L387.3 116.1L388.7 115.4L390.1 114.7L391.3 114L392.5 113.2L393.5 112.3L394.4 111.4L395.1 110.5L395.8 109.5L396.2 108.5L396.6 107.5ZM385.4 94.5L386.9 95L388.4 95.6L389.8 96.3L391 97L392.2 97.8L393.2 98.7L394.2 99.6L394.9 100.5L395.6 101.4L396.1 102.4L396.5 103.4L396.7 104.5L396.8 105.5L396.8 106.5L396.6 107.5L396.2 108.5L395.8 109.5L395.1 110.5L394.4 111.4L393.5 112.3L392.5 113.2L391.3 114L390.1 114.7L388.7 115.4L387.3 116.1L385.8 116.6L384.2 117.1L382.8 113.7L384.2 113.2L385.5 112.7L386.8 112.2L388 111.6L389.1 110.9L390 110.2L390.9 109.5L391.7 108.7L392.4 107.9L392.9 107.1L393.3 106.2L393.6 105.3L393.8 104.4L393.9 103.5L393.8 102.6L393.6 101.8L393.2 100.9L392.8 100L392.2 99.2L391.5 98.4L390.7 97.6L389.8 96.9L388.8 96.2L387.7 95.5L386.5 94.9L385.2 94.4L383.9 93.9ZM383.9 93.9L385.2 94.4L386.5 94.9L387.7 95.5L388.8 96.2L389.8 96.9L390.7 97.6L391.5 98.4L392.2 99.2L392.8 100L393.2 100.9L393.6 101.8L393.8 102.6L393.9 103.5L393.8 104.4L393.6 105.3L393.3 106.2L392.9 107.1L392.4 107.9L391.7 108.7L390.9 109.5L390 110.2L389.1 110.9L388 111.6L386.8 112.2L385.5 112.7L384.2 113.2L382.8 113.7L381.4 110.2L382.6 109.8L383.8 109.4L384.8 108.9L385.8 108.4L386.7 107.9L387.6 107.3L388.3 106.6L389 106L389.5 105.3L390 104.6L390.4 103.8L390.6 103.1L390.8 102.3L390.8 101.6L390.7 100.8L390.6 100.1L390.3 99.3L389.9 98.6L389.4 97.9L388.8 97.2L388.1 96.6L387.4 95.9L386.5 95.3L385.6 94.8L384.6 94.3L383.5 93.8L382.3 93.4ZM382.3 93.4L383.5 93.8L384.6 94.3L385.6 94.8L386.5 95.3L387.4 95.9L388.1 96.6L388.8 97.2L389.4 97.9L389.9 98.6L390.3 99.3L390.6 100.1L390.7 100.8L390.8 101.6L390.8 102.3L390.6 103.1L390.4 103.8L390 104.6L389.5 105.3L389 106L388.3 106.6L387.6 107.3L386.7 107.9L385.8 108.4L384.8 108.9L383.8 109.4L382.6 109.8L381 106.4L381.9 106L382.8 105.7L383.6 105.2L384.4 104.8L385.1 104.3L385.7 103.8L386.2 103.2L386.7 102.7L387.1 102.1L387.4 101.5L387.6 100.9L387.7 100.3L387.7 99.6L387.7 99L387.5 98.4L387.3 97.8L387 97.2L386.6 96.6L386.1 96.1L385.5 95.5L384.9 95L384.2 94.5L383.4 94.1L382.6 93.7L381.7 93.3L380.8 93ZM380.8 93L381.7 93.3L382.6 93.7L383.4 94.1L384.2 94.5L384.9 95L385.5 95.5L386.1 96.1L386.6 96.6L387 97.2L387.3 97.8L387.5 98.4L387.7 99L387.7 99.6L387.7 100.3L387.6 100.9L387.4 101.5L387.1 102.1L386.7 102.7L386.2 103.2L385.7 103.8L385.1 104.3L384.4 104.8L383.6 105.2L382.8 105.7L381.9 106L381 106.4L379.4 102.9L380.1 102.6L380.8 102.3L381.4 102L382 101.7L382.5 101.3L383 100.9L383.4 100.5L383.7 100L384 99.6L384.3 99.1L384.4 98.6L384.5 98.2L384.5 97.7L384.5 97.2L384.4 96.7L384.2 96.3L384 95.8L383.7 95.4L383.3 94.9L382.9 94.5L382.4 94.1L381.8 93.7L381.2 93.4L380.6 93.1L379.9 92.8L379.2 92.5ZM379.9 92.8L380.6 93.1L381.2 93.4L381.8 93.7L382.4 94.1L382.9 94.5L383.3 94.9L383.7 95.4L384 95.8L384.2 96.3L384.4 96.7L384.5 97.2L384.5 97.7L384.5 98.2L384.4 98.6L384.3 99.1L384 99.6L383.7 100L383.4 100.5L383 100.9L382.5 101.3L382 101.7L381.4 102L380.8 102.3L380.1 102.6L379.4 102.9L377.7 99.4L378.1 99.2L378.6 99L379.1 98.7L379.5 98.5L379.8 98.2L380.2 98L380.4 97.7L380.7 97.4L380.9 97.1L381.1 96.7L381.2 96.4L381.2 96.1L381.2 95.7L381.2 95.4L381.1 95.1L381 94.8L380.8 94.4L380.6 94.1L380.4 93.8L380.1 93.5L379.7 93.3L379.4 93L378.9 92.8L378.5 92.5L378 92.3ZM378 92.3L378.5 92.5L378.9 92.8L379.4 93L379.7 93.3L380.1 93.5L380.4 93.8L380.6 94.1L380.8 94.4L381 94.8L381.1 95.1L381.2 95.4L381.2 95.7L381.2 96.1L381.2 96.4L381.1 96.7L380.9 97.1L380.7 97.4L380.4 97.7L380.2 98L379.8 98.2L379.5 98.5L379.1 98.7L378.6 99L378.1 99.2L376.1 95.6L376.4 95.5L376.6 95.4L376.8 95.3L377 95.1L377.2 95L377.4 94.8L377.5 94.7L377.6 94.5L377.7 94.3L377.7 94.1L377.8 94L377.8 93.8L377.8 93.6L377.7 93.4L377.7 93.3L377.6 93.1L377.5 92.9L377.3 92.8L377.2 92.6L377 92.5L376.8 92.3L376.5 92.2L376.3 92.1L376.1 92ZM376.8 92.3L377 92.5L377.2 92.6L377.3 92.8L377.5 92.9L377.6 93.1L377.7 93.3L377.7 93.4L377.8 93.6L377.8 93.8L377.8 94L377.7 94.1L377.7 94.3L377.6 94.5L377.5 94.7L377.4 94.8L377.2 95L377 95.1L376.8 95.3L373.8 91.9L373.8 91.9L373.8 91.9L373.8 91.9L373.8 91.9L373.8 91.9L373.8 91.9L373.8 91.9L373.8 91.9L373.8 91.8L373.8 91.8L373.8 91.8L373.8 91.8L373.8 91.8L373.8 91.8L373.8 91.8L373.8 91.8L373.8 91.8L373.8 91.8ZM373.8 91.9L373.7 91.9L373.7 91.9L373.7 91.9L373.7 91.9L373.7 91.9L373.8 91.5L373.8 91.5L373.8 91.5L373.8 91.5L373.8 91.5L373.8 91.5Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M387.9 134.8L385.1 135.4L382.2 135.8L379.3 136.1L376.4 136.3L373.4 136.4L370.4 136.3L370.7 132.8L373.4 132.8L376.2 132.8L378.9 132.6L381.6 132.3L384.3 131.9L386.9 131.4ZM389.4 130.8L386.9 131.4L384.3 131.9L381.6 132.3L378.9 132.6L376.2 132.8L373.4 132.8L370.7 132.8L370.9 129.2L373.4 129.3L376 129.2L378.5 129.1L381 128.8L383.4 128.5L385.8 128L388.1 127.4ZM388.1 127.4L385.8 128L383.4 128.5L381 128.8L378.5 129.1L376 129.2L373.4 129.3L370.9 129.2L371.2 125.7L373.5 125.7L375.8 125.7L378.1 125.5L380.3 125.3L382.5 125L384.7 124.5L386.8 124ZM386.8 124L384.7 124.5L382.5 125L380.3 125.3L378.1 125.5L375.8 125.7L373.5 125.7L371.2 125.7L371.4 122.1L373.5 122.1L375.6 122.1L377.6 122L379.7 121.7L381.7 121.4L383.6 121L385.5 120.6ZM385.5 120.6L383.6 121L381.7 121.4L379.7 121.7L377.6 122L375.6 122.1L373.5 122.1L371.4 122.1L371.7 118.5L373.5 118.5L375.4 118.5L377.2 118.4L379 118.2L380.8 117.9L382.5 117.6L384.2 117.1ZM384.2 117.1L382.5 117.6L380.8 117.9L379 118.2L377.2 118.4L375.4 118.5L373.5 118.5L373.6 114.9L375.2 114.9L376.7 114.8L378.3 114.6L379.9 114.3L381.4 114L382.8 113.7ZM382.8 113.7L381.4 114L379.9 114.3L378.3 114.6L376.7 114.8L375.2 114.9L373.6 114.9L373.6 111.2L374.9 111.2L376.3 111.1L377.6 111L378.9 110.8L380.2 110.5L381.4 110.2ZM382.6 109.8L381.4 110.2L380.2 110.5L378.9 110.8L377.6 111L376.3 111.1L374.9 111.2L373.6 111.2L373.6 107.5L374.7 107.5L375.8 107.4L376.9 107.3L378 107.1L379 106.9L380 106.7L381 106.4ZM381 106.4L380 106.7L379 106.9L378 107.1L376.9 107.3L375.8 107.4L374.7 107.5L373.6 107.5L373.7 103.8L374.5 103.8L375.4 103.7L376.2 103.6L377 103.5L377.8 103.3L378.6 103.1L379.4 102.9ZM379.8 92.7L380.8 93L379.2 92.5L378.4 92.3ZM379.4 102.9L378.6 103.1L377.8 103.3L377 103.5L376.2 103.6L375.4 103.7L374.5 103.8L373.7 103.8L373.7 100L374.3 100L374.9 99.9L375.5 99.9L376 99.8L376.6 99.7L377.1 99.5L377.7 99.4ZM377.6 92.1L378.4 92.3L379.2 92.5L379.9 92.8L378 92.3L377.5 92.2L377 92L376.5 91.9ZM378.1 99.2L377.7 99.4L377.1 99.5L376.6 99.7L376 99.8L375.5 99.9L374.9 99.9L374.3 100L374 96.1L374.4 96L374.7 96L375 96L375.3 95.9L375.6 95.8L375.9 95.7L376.1 95.6ZM374.7 91.6L375.3 91.7L375.9 91.8L376.5 91.9L377 92L377.5 92.2L378 92.3L376.1 92L375.8 91.9L375.5 91.8L375.2 91.7L374.9 91.7L374.6 91.6L374.3 91.6ZM374.3 91.6L374.6 91.6L374.9 91.7L375.2 91.7L375.5 91.8L375.8 91.9L376.1 92L376.3 92.1L376.5 92.2L376.8 92.3L373.8 91.8L373.8 91.8L373.8 91.8L373.8 91.8L373.8 91.8L373.8 91.8L373.8 91.8L373.8 91.8L373.8 91.8L373.8 91.8ZM376.8 95.3L376.6 95.4L376.4 95.5L376.1 95.6L375.9 95.7L375.6 95.8L375.3 95.9L375 96L374.7 96L374.4 96L373.8 91.9L373.8 91.9L373.8 91.9L373.8 91.9L373.8 91.9L373.8 91.9L373.8 91.9L373.8 91.9L373.8 91.9L373.8 91.9ZM373.7 91.9L373.7 91.9L373.7 91.9L373.7 91.9L373.7 91.9L373.7 91.9L373.7 91.9L373.8 91.5L373.8 91.5L373.8 91.5L373.8 91.5L373.8 91.5L373.8 91.5L373.8 91.5Z\"/><path class=\"iso-top\" d=\"M370.4 136.3L367.5 136.1L364.5 135.7L361.7 135.3L358.9 134.7L356.2 133.9L353.6 133.1L351.2 132.2L348.9 131.1L346.8 129.9L344.8 128.7L343 127.4L341.4 126L340 124.5L338.8 123L337.8 121.4L337.1 119.8L336.6 118.1L336.3 116.5L336.3 114.8L336.5 113.1L337 111.5L337.6 109.9L338.5 108.3L339.7 106.8L341 105.3L342.6 103.8L344.3 102.5L346.2 101.2L348.3 100L350.6 99L352.3 98.2L350.2 99.2L348.3 100.3L346.5 101.5L344.9 102.7L343.5 104.1L342.2 105.4L341.2 106.9L340.3 108.3L339.7 109.8L339.3 111.4L339.1 112.9L339.1 114.4L339.4 116L339.9 117.5L340.5 119L341.4 120.4L342.5 121.9L343.8 123.2L345.3 124.5L346.9 125.7L348.8 126.9L350.8 128L352.9 128.9L355.2 129.8L357.5 130.6L360 131.3L362.6 131.8L365.2 132.3L367.9 132.6L370.7 132.8ZM370.7 132.8L367.9 132.6L365.2 132.3L362.6 131.8L360 131.3L357.5 130.6L355.2 129.8L352.9 128.9L350.8 128L348.8 126.9L346.9 125.7L345.3 124.5L343.8 123.2L342.5 121.9L341.4 120.4L340.5 119L339.9 117.5L339.4 116L339.1 114.4L339.1 112.9L339.3 111.4L339.7 109.8L340.3 108.3L341.2 106.9L342.2 105.4L343.5 104.1L344.9 102.7L346.5 101.5L348.3 100.3L350.2 99.2L352.3 98.2L354.1 97.5L352.2 98.4L350.4 99.4L348.7 100.5L347.3 101.7L345.9 102.9L344.8 104.1L343.9 105.4L343.1 106.8L342.5 108.2L342.1 109.6L342 111L342 112.4L342.2 113.8L342.6 115.2L343.3 116.6L344.1 117.9L345.1 119.2L346.3 120.4L347.6 121.6L349.1 122.8L350.8 123.8L352.6 124.8L354.6 125.7L356.7 126.5L358.9 127.2L361.1 127.8L363.5 128.3L365.9 128.7L368.4 129L370.9 129.2ZM370.9 129.2L368.4 129L365.9 128.7L363.5 128.3L361.1 127.8L358.9 127.2L356.7 126.5L354.6 125.7L352.6 124.8L350.8 123.8L349.1 122.8L347.6 121.6L346.3 120.4L345.1 119.2L344.1 117.9L343.3 116.6L342.6 115.2L342.2 113.8L342 112.4L342 111L342.1 109.6L342.5 108.2L343.1 106.8L343.9 105.4L344.8 104.1L345.9 102.9L347.3 101.7L348.7 100.5L350.4 99.4L352.2 98.4L354.1 97.5L356.1 96.7L357.7 96.1L355.9 96.8L354.1 97.7L352.5 98.6L351 99.5L349.7 100.6L348.5 101.7L347.4 102.8L346.6 104L345.9 105.2L345.3 106.5L345 107.8L344.8 109.1L344.9 110.3L345.1 111.6L345.4 112.9L346 114.1L346.8 115.4L347.7 116.5L348.7 117.7L350 118.8L351.4 119.8L352.9 120.7L354.6 121.6L356.3 122.5L358.2 123.2L360.2 123.8L362.3 124.4L364.4 124.9L366.6 125.2L368.9 125.5L371.2 125.7ZM371.2 125.7L368.9 125.5L366.6 125.2L364.4 124.9L362.3 124.4L360.2 123.8L358.2 123.2L356.3 122.5L354.6 121.6L352.9 120.7L351.4 119.8L350 118.8L348.7 117.7L347.7 116.5L346.8 115.4L346 114.1L345.4 112.9L345.1 111.6L344.9 110.3L344.8 109.1L345 107.8L345.3 106.5L345.9 105.2L346.6 104L347.4 102.8L348.5 101.7L349.7 100.6L351 99.5L352.5 98.6L354.1 97.7L355.9 96.8L357.7 96.1L359.4 95.5L357.7 96.1L356.1 96.9L354.6 97.7L353.3 98.6L352.1 99.5L351 100.5L350.1 101.5L349.3 102.6L348.7 103.7L348.2 104.8L347.9 106L347.7 107.1L347.8 108.3L347.9 109.4L348.3 110.6L348.8 111.7L349.5 112.8L350.3 113.9L351.3 114.9L352.4 115.9L353.6 116.8L355 117.7L356.5 118.5L358.1 119.2L359.8 119.9L361.6 120.4L363.4 120.9L365.4 121.4L367.4 121.7L369.4 121.9L371.4 122.1ZM371.4 122.1L369.4 121.9L367.4 121.7L365.4 121.4L363.4 120.9L361.6 120.4L359.8 119.9L358.1 119.2L356.5 118.5L355 117.7L353.6 116.8L352.4 115.9L351.3 114.9L350.3 113.9L349.5 112.8L348.8 111.7L348.3 110.6L347.9 109.4L347.8 108.3L347.7 107.1L347.9 106L348.2 104.8L348.7 103.7L349.3 102.6L350.1 101.5L351 100.5L352.1 99.5L353.3 98.6L354.6 97.7L356.1 96.9L357.7 96.1L359.4 95.5L361 94.9L359.5 95.5L358.1 96.1L356.8 96.9L355.6 97.6L354.5 98.5L353.6 99.3L352.8 100.3L352.1 101.2L351.5 102.2L351.1 103.2L350.8 104.2L350.7 105.2L350.7 106.2L350.9 107.3L351.2 108.3L351.6 109.3L352.2 110.2L352.9 111.2L353.8 112.1L354.8 113L355.9 113.8L357.1 114.6L358.4 115.3L359.9 115.9L361.4 116.5L363 117L364.6 117.5L366.3 117.8L368.1 118.1L369.9 118.3L371.7 118.5ZM373.5 118.5L371.7 118.5L369.9 118.3L368.1 118.1L366.3 117.8L364.6 117.5L363 117L361.4 116.5L359.9 115.9L358.4 115.3L357.1 114.6L355.9 113.8L354.8 113L353.8 112.1L352.9 111.2L352.2 110.2L351.6 109.3L351.2 108.3L350.9 107.3L350.7 106.2L350.7 105.2L350.8 104.2L351.1 103.2L351.5 102.2L352.1 101.2L352.8 100.3L353.6 99.3L354.5 98.5L355.6 97.6L356.8 96.9L358.1 96.1L359.5 95.5L361 94.9L362.6 94.3L361.3 94.8L360.1 95.4L359 96L358 96.7L357 97.4L356.2 98.2L355.5 99L354.9 99.8L354.4 100.7L354 101.5L353.8 102.4L353.7 103.3L353.7 104.2L353.8 105.1L354.1 106L354.5 106.8L355 107.7L355.6 108.5L356.4 109.3L357.2 110L358.2 110.8L359.3 111.4L360.4 112L361.7 112.6L363 113.1L364.4 113.6L365.8 114L367.3 114.3L368.8 114.5L370.4 114.7L372 114.8L373.6 114.9ZM373.6 114.9L372 114.8L370.4 114.7L368.8 114.5L367.3 114.3L365.8 114L364.4 113.6L363 113.1L361.7 112.6L360.4 112L359.3 111.4L358.2 110.8L357.2 110L356.4 109.3L355.6 108.5L355 107.7L354.5 106.8L354.1 106L353.8 105.1L353.7 104.2L353.7 103.3L353.8 102.4L354 101.5L354.4 100.7L354.9 99.8L355.5 99L356.2 98.2L357 97.4L358 96.7L359 96L360.1 95.4L361.3 94.8L362.6 94.3L364 93.8L365.5 93.3L364.3 93.7L363.2 94.2L362.2 94.7L361.2 95.2L360.3 95.8L359.6 96.4L358.8 97L358.2 97.7L357.7 98.4L357.3 99.1L357 99.9L356.8 100.6L356.7 101.4L356.7 102.2L356.8 102.9L357.1 103.7L357.4 104.4L357.8 105.1L358.4 105.8L359 106.5L359.7 107.1L360.6 107.7L361.5 108.3L362.4 108.8L363.5 109.3L364.6 109.7L365.8 110.1L367 110.4L368.3 110.7L369.6 110.9L370.9 111.1L372.2 111.2L373.6 111.2ZM373.6 111.2L372.2 111.2L370.9 111.1L369.6 110.9L368.3 110.7L367 110.4L365.8 110.1L364.6 109.7L363.5 109.3L362.4 108.8L361.5 108.3L360.6 107.7L359.7 107.1L359 106.5L358.4 105.8L357.8 105.1L357.4 104.4L357.1 103.7L356.8 102.9L356.7 102.2L356.7 101.4L356.8 100.6L357 99.9L357.3 99.1L357.7 98.4L358.2 97.7L358.8 97L359.6 96.4L360.3 95.8L361.2 95.2L362.2 94.7L363.2 94.2L364.3 93.7L365.5 93.3L367 92.9L366 93.2L365.1 93.6L364.3 94L363.5 94.4L362.8 94.9L362.1 95.4L361.6 95.9L361.1 96.5L360.6 97L360.3 97.6L360 98.2L359.9 98.9L359.8 99.5L359.8 100.1L359.9 100.7L360.1 101.3L360.4 101.9L360.7 102.5L361.2 103.1L361.7 103.6L362.3 104.2L363 104.7L363.7 105.1L364.5 105.5L365.4 105.9L366.3 106.3L367.2 106.6L368.2 106.9L369.3 107.1L370.3 107.3L371.4 107.4L372.5 107.5L373.6 107.5ZM373.6 107.5L372.5 107.5L371.4 107.4L370.3 107.3L369.3 107.1L368.2 106.9L367.2 106.6L366.3 106.3L365.4 105.9L364.5 105.5L363.7 105.1L363 104.7L362.3 104.2L361.7 103.6L361.2 103.1L360.7 102.5L360.4 101.9L360.1 101.3L359.9 100.7L359.8 100.1L359.8 99.5L359.9 98.9L360 98.2L360.3 97.6L360.6 97L361.1 96.5L361.6 95.9L362.1 95.4L362.8 94.9L363.5 94.4L364.3 94L365.1 93.6L366 93.2L367 92.9L368 92.6L369.3 92.3L368.5 92.5L367.8 92.7L367.1 93L366.4 93.3L365.8 93.7L365.3 94L364.8 94.4L364.3 94.8L363.9 95.2L363.6 95.7L363.4 96.1L363.2 96.6L363 97.1L363 97.6L363 98L363.1 98.5L363.2 99L363.4 99.5L363.7 99.9L364 100.4L364.4 100.8L364.9 101.2L365.4 101.6L366 101.9L366.6 102.3L367.3 102.6L368 102.8L368.7 103.1L369.5 103.3L370.3 103.5L371.1 103.6L371.9 103.7L372.8 103.7L373.7 103.8ZM373.7 103.8L372.8 103.7L371.9 103.7L371.1 103.6L370.3 103.5L369.5 103.3L368.7 103.1L368 102.8L367.3 102.6L366.6 102.3L366 101.9L365.4 101.6L364.9 101.2L364.4 100.8L364 100.4L363.7 99.9L363.4 99.5L363.2 99L363.1 98.5L363 98L363 97.6L363 97.1L363.2 96.6L363.4 96.1L363.6 95.7L363.9 95.2L364.3 94.8L364.8 94.4L365.3 94L365.8 93.7L366.4 93.3L367.1 93L367.8 92.7L368.5 92.5L369.3 92.3L370.1 92.1L371.2 91.8L370.7 92L370.1 92.1L369.6 92.3L369.1 92.5L368.7 92.7L368.3 92.9L367.9 93.2L367.5 93.5L367.2 93.7L366.9 94L366.7 94.4L366.5 94.7L366.4 95L366.3 95.3L366.3 95.7L366.3 96L366.3 96.3L366.4 96.6L366.6 97L366.8 97.3L367 97.6L367.3 97.9L367.6 98.2L368 98.4L368.4 98.7L368.8 98.9L369.2 99.1L369.7 99.3L370.3 99.5L370.8 99.6L371.3 99.7L371.9 99.8L372.5 99.9L373.1 100L373.7 100ZM374.3 100L373.7 100L373.1 100L372.5 99.9L371.9 99.8L371.3 99.7L370.8 99.6L370.3 99.5L369.7 99.3L369.2 99.1L368.8 98.9L368.4 98.7L368 98.4L367.6 98.2L367.3 97.9L367 97.6L366.8 97.3L366.6 97L366.4 96.6L366.3 96.3L366.3 96L366.3 95.7L366.3 95.3L366.4 95L366.5 94.7L366.7 94.4L366.9 94L367.2 93.7L367.5 93.5L367.9 93.2L368.3 92.9L368.7 92.7L369.1 92.5L369.6 92.3L370.1 92.1L370.7 92L371.2 91.8L371.8 91.7L372.4 91.7L373 91.6L372.7 91.6L372.4 91.7L372.1 91.8L371.8 91.8L371.5 91.9L371.3 92L371 92.2L370.8 92.3L370.6 92.4L370.4 92.6L370.2 92.7L370.1 92.9L370 93L369.9 93.2L369.8 93.4L369.8 93.6L369.7 93.7L369.7 93.9L369.8 94.1L369.8 94.3L369.9 94.5L370 94.6L370.1 94.8L370.3 94.9L370.4 95.1L370.6 95.2L370.9 95.4L371.1 95.5L371.3 95.6L371.6 95.7L371.9 95.8L372.2 95.9L372.5 95.9L372.8 96L373.1 96L373.4 96.1L373.7 96.1L374 96.1ZM374.4 96L374 96.1L373.7 96.1L373.4 96.1L373.1 96L372.8 96L372.5 95.9L372.2 95.9L371.9 95.8L371.6 95.7L371.3 95.6L371.1 95.5L370.9 95.4L370.6 95.2L370.4 95.1L370.3 94.9L370.1 94.8L370 94.6L369.9 94.5L369.8 94.3L369.8 94.1L369.7 93.9L369.7 93.7L369.8 93.6L369.8 93.4L369.9 93.2L370 93L370.1 92.9L370.2 92.7L370.4 92.6L370.6 92.4L370.8 92.3L371 92.2L371.3 92L371.5 91.9L371.8 91.8L372.1 91.8L372.4 91.7L372.7 91.6L373 91.6L373.3 91.6L373.6 91.6L374 91.6L374.3 91.6L373.8 91.8L373.8 91.8L373.8 91.8L373.8 91.8L373.8 91.8L373.8 91.8L373.7 91.8L373.7 91.8L373.7 91.8L373.7 91.8L373.7 91.8L373.7 91.8L373.7 91.8L373.7 91.8L373.7 91.8L373.7 91.8L373.7 91.8L373.7 91.8L373.7 91.8L373.7 91.8L373.7 91.8L373.7 91.8L373.7 91.9L373.7 91.9L373.7 91.9L373.7 91.9L373.7 91.9L373.7 91.9L373.7 91.9L373.7 91.9L373.7 91.9L373.7 91.9L373.7 91.9L373.7 91.9L373.7 91.9L373.7 91.9L373.7 91.9L373.7 91.9L373.8 91.9L373.8 91.9L373.8 91.9L373.8 91.9L373.8 91.9L373.8 91.9ZM373.7 91.9L373.7 91.9L373.7 91.9L373.7 91.9L373.7 91.9L373.7 91.9L373.7 91.8L373.8 91.5L373.8 91.5L373.8 91.5L373.8 91.5L373.8 91.5L373.8 91.5L373.8 91.5Z\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M336.3 115.3L336.3 114.5L336.4 113.7L336.6 112.8L336.8 112L337.1 111.2L337.4 110.4L337.8 109.5L338.3 108.7L338.8 108L339.3 107.2L340 106.4L340.6 105.7L341.4 104.9L342.1 104.2L343 103.5L343.8 102.8L344.8 102.2L345.7 101.5L346.7 100.9L347.8 100.3L348.9 99.8L350 99.2L351.2 98.7L352.9 98L354.6 97.3L355.7 96.9L357.3 96.2L358.9 95.6L359.8 95.3L361.4 94.7L363 94.2L363.7 93.9L365.2 93.4L365.8 93.2L367.2 92.8L367.7 92.7L369.1 92.3L369.5 92.2L369.9 92.1L371.1 91.9L371.4 91.8L371.6 91.8L371.9 91.7L373.8 91.5L375.5 91.7L375.8 91.7L376.1 91.8L376.4 91.9L377.5 92.1L377.9 92.2L378.3 92.3L379.6 92.6L380.1 92.8L381.6 93.2L382.2 93.4L383.7 93.9L384.4 94.1L385.9 94.6L386.7 94.9L388.4 95.5L390 96.1L391.6 96.8L392.6 97.2L394.3 97.9L396 98.6L397.2 99.1L398.3 99.6L399.4 100.2L400.5 100.8L401.5 101.4L402.5 102L403.5 102.7L404.3 103.3L405.2 104L406 104.8L406.7 105.5L407.4 106.2L408 107L408.6 107.8L409.1 108.5L409.6 109.3L410 110.1L410.4 111L410.6 111.8L410.9 112.6L411 113.4L411.2 114.3L411.2 115.1L411.2 116L411.1 116.8L411 117.6L410.8 118.5L410.6 119.3L410.3 120.1L409.9 120.9L409.5 121.7L409 122.5L408.5 123.3L407.9 124.1L407.2 124.8L406.5 125.6L405.8 126.3L405 127L404.1 127.7L403.2 128.4L402.3 129L401.3 129.6L400.2 130.2L399.2 130.8L398 131.4L396.9 131.9L395.7 132.4L394.4 132.9L393.2 133.3L391.9 133.8L390.6 134.2L389.2 134.5L387.8 134.8L386.4 135.1L385 135.4L383.6 135.6L382.1 135.9L380.7 136L379.2 136.2L377.7 136.3L376.2 136.3L374.7 136.4L373.2 136.4L371.7 136.3L370.2 136.3L368.7 136.2L367.2 136.1L365.8 135.9L364.3 135.7L362.9 135.5L361.4 135.2L360 134.9L358.6 134.6L357.3 134.2L356 133.9L354.7 133.4L353.4 133L352.1 132.5L350.9 132L349.8 131.5L348.6 131L347.5 130.4L346.5 129.8L345.5 129.2L344.5 128.5L343.6 127.9L342.7 127.2L341.9 126.5L341.2 125.8L340.5 125L339.8 124.3L339.2 123.5L338.6 122.7L338.1 121.9L337.7 121.1L337.3 120.3L337 119.5L336.8 118.7L336.5 117.8L336.4 117L336.3 116.2Z\"/></g></g><g class=\"it\" data-name=\"boom.silo.hub\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M353 208.1L353 207.3L353.3 206.6L353.6 206.1L354.1 205.7L361.4 201.6L362 201.3L362.6 201.3L363.3 201.4L364 201.8L364.8 202.2L365.4 202.9L366.1 203.6L366.6 204.5L367.1 205.4L367.4 206.3L367.7 207.3L367.7 208.1L367.7 208.9L367.4 209.6L367.1 210.2L366.6 210.6L359.3 214.7L358.7 214.9L358.1 215L357.4 214.8L356.7 214.5L355.9 214L355.2 213.4L354.6 212.7L354.1 211.8L353.6 210.9L353.3 210L353 209Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M359.3 214.7L359.7 214.3L360.1 213.8L360.3 213.1L360.3 212.3L360.3 211.4L360.1 210.5L359.7 209.5L367.1 205.4L367.4 206.3L367.7 207.3L367.7 208.1L367.7 208.9L367.4 209.6L367.1 210.2L366.6 210.6Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M359.7 209.5L359.3 208.6L366.6 204.5L367.1 205.4Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M359.3 208.6L358.7 207.8L366.1 203.6L366.6 204.5Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M358.7 207.8L358.1 207L357.4 206.4L364.8 202.2L365.4 202.9L366.1 203.6ZM356.7 210.2L356.7 210.2L356.7 210.2L356.7 210.2L356.7 210.2L356.7 210.2L356.7 210.2L356.7 210.2L356.7 210.2L356.7 210.2L356.7 210.2L356.7 210.2L356.7 210.2L356.7 210.2L356.7 210.2L356.7 210.2L356.7 210.2L356.7 210.2L356.7 210.2L356.7 210.2L356.7 210.2L356.7 210.2L356.7 210.2L356.7 210.2L356.7 210.2L356.7 210.2L356.7 210.2L356.7 210.2L356.7 210.2L356.7 210.2L356.7 210.2L356.7 210.2L356.7 210.2L360.3 212.3L360.3 213.1L360.1 213.8L359.7 214.3L359.3 214.7L358.7 214.9L358.1 215L357.4 214.8L356.7 214.5L355.9 214L355.2 213.4L354.6 212.7L354.1 211.8L353.6 210.9L353.3 210L353 209L353 208.1L353 207.3L353.3 206.6L353.6 206.1L354.1 205.7L354.6 205.5L355.2 205.4L355.9 205.6L356.7 205.9L357.4 206.4L358.1 207L358.7 207.8L359.3 208.6L359.7 209.5L360.1 210.5L360.3 211.4L360.3 212.3Z\"/><path class=\"iso-top\" d=\"M357.4 206.4L356.7 205.9L355.9 205.6L355.2 205.4L354.6 205.5L354.1 205.7L361.4 201.6L362 201.3L362.6 201.3L363.3 201.4L364 201.8L364.8 202.2Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M359.2 214.8L359.9 214.1L360.2 213.2L360.3 212.1L360.1 210.7L359.7 209.4L358.9 208.1L358 207L357 206.1L356 205.6L355 205.4L354.1 205.7\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M353 208.1L353 207.3L353.3 206.6L353.6 206.1L354.1 205.7L361.4 201.6L362 201.3L362.6 201.3L363.3 201.4L364 201.8L364.8 202.2L365.4 202.9L366.1 203.6L366.6 204.5L367.1 205.4L367.4 206.3L367.7 207.3L367.7 208.1L367.7 208.9L367.4 209.6L367.1 210.2L366.6 210.6L359.3 214.7L358.7 214.9L358.1 215L357.4 214.8L356.7 214.5L355.9 214L355.2 213.4L354.6 212.7L354.1 211.8L353.6 210.9L353.3 210L353 209Z\"/></g></g><g class=\"it\" data-name=\"press.base\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M469.8 241.2L471 240L507.9 219.4L510 218.7L512.4 218.7L514.6 219.4L564.9 247.5L566.1 248.7L566.1 273.7L564.9 274.8L528 295.5L525.9 296.2L523.4 296.2L521.3 295.5L471 267.3L469.8 266.2Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M566.1 273.7L564.9 274.8L564.9 251.3L566.1 250.1ZM564.9 274.8L528 295.5L528 271.9L564.9 251.3ZM528 295.5L525.9 296.2L525.9 272.6L528 271.9Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M525.9 296.2L523.4 296.2L523.4 272.6L525.9 272.6ZM523.4 296.2L521.3 295.5L521.3 271.9L523.4 272.6Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M521.3 295.5L471 267.3L471 243.8L521.3 271.9ZM471 267.3L469.8 266.2L469.8 242.6L471 243.8Z\"/><path class=\"iso-top\" d=\"M564.9 247.5L566.1 248.7L566.1 250.1L564.9 251.3L528 271.9L525.9 272.6L523.4 272.6L521.3 271.9L471 243.8L469.8 242.6L469.8 241.2L471 240L507.9 219.4L510 218.7L512.4 218.7L514.6 219.4Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M566.1 250.1L564.9 251.3L528 271.9L525.9 272.6L523.4 272.6L521.3 271.9L471 243.8L469.8 242.6\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M566.1 250.1L563.7 250.8L527.1 271.3L525.5 271.8L523.8 271.8L522.1 271.3L472.1 243.3L469.8 242.6\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M566.1 265.8L564.9 267L528 287.6L525.9 288.3L523.4 288.3L521.3 287.6L471 259.5L469.8 258.3\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M469.8 242.6L469.8 241.2L471 240L507.9 219.4L510 218.7L512.4 218.7L514.6 219.4L564.9 247.5L566.1 248.7L566.1 250.1M566.1 273.7L564.9 274.8L528 295.5L525.9 296.2L523.4 296.2L521.3 295.5L471 267.3L469.8 266.2M566.1 250.1L566.1 273.7M469.8 242.6L469.8 266.2\"/></g><g class=\"iso-dots\" data-tone=\"mid\"><circle cx=\"511.2\" cy=\"222\" r=\"0.5\"/><circle cx=\"560.2\" cy=\"249.4\" r=\"0.5\"/><circle cx=\"475.7\" cy=\"241.9\" r=\"0.5\"/><circle cx=\"524.6\" cy=\"269.3\" r=\"0.5\"/></g><g transform=\"matrix(1.6763 0.9374 0.0000 1.9654 501.07 266.58)\"><rect class=\"fe-window\" x=\"0\" y=\"0\" width=\"11\" height=\"5.4\" rx=\"0.8\"/><text class=\"fe-digits\" data-part=\"hb\" x=\"5.5\" y=\"4.2\" font-size=\"4.2\" text-anchor=\"middle\">105</text><path class=\"iso-line\" data-tone=\"mid\" d=\"M0.8 0H10.2Q11 0 11 0.8V4.6Q11 5.4 10.2 5.4H0.8Q0 5.4 0 4.6V0.8Q0 0 0.8 0Z\"/></g></g><g class=\"it\" data-name=\"press.column\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M507 159.7L507.4 159L508.2 158.4L509.3 157.9L510.5 157.7L511.9 157.7L513.2 157.9L514.2 158.4L515 159L515.4 159.7L515.4 227.3L515 228L514.2 228.6L513.2 229L511.9 229.2L510.5 229.2L509.3 229L508.2 228.6L507.4 228L507 227.3Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M514.2 228.6L513.2 229L513.2 162.2L514.2 161.8ZM515.4 227.3L515 228L515 161.1L515.4 160.4ZM515 228L514.2 228.6L514.2 161.8L515 161.1Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M513.2 229L511.9 229.2L511.9 162.4L513.2 162.2Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M511.9 229.2L510.5 229.2L510.5 162.4L511.9 162.4ZM510.5 229.2L509.3 229L509.3 162.2L510.5 162.4Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M509.3 229L508.2 228.6L508.2 161.8L509.3 162.2ZM508.2 228.6L507.4 228L507.4 161.1L508.2 161.8ZM507.4 228L507 227.3L507 160.4L507.4 161.1Z\"/><path class=\"iso-top\" d=\"M514.2 161.8L513.2 162.2L511.9 162.4L510.5 162.4L509.3 162.2L508.2 161.8L507.4 161.1L507 160.4L507 159.7L507.4 159L508.2 158.4L509.3 157.9L510.5 157.7L511.9 157.7L513.2 157.9L514.2 158.4L515 159L515.4 159.7L515.4 160.4L515 161.1Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M515.4 160.4L515 161.1L514.2 161.8L513.2 162.2L511.9 162.4L510.5 162.4L509.3 162.2L508.2 161.8L507.4 161.1L507 160.4\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M507 160.4L507 159.7L507.4 159L508.2 158.4L509.3 157.9L510.5 157.7L511.9 157.7L513.2 157.9L514.2 158.4L515 159L515.4 159.7L515.4 160.4M515.4 227.3L515 228L514.2 228.6L513.2 229L511.9 229.2L510.5 229.2L509.3 229L508.2 228.6L507.4 228L507 227.3M507 160.4L507 227.3M515.4 160.4L515.4 227.3\"/></g><path class=\"iso-line\" data-tone=\"faint\" d=\"M515.5 171.9L515.4 172.3L515.2 172.8L514.8 173.2L514.2 173.5L513.6 173.8L512.8 174.1L512 174.2L511.2 174.2L510.4 174.2L509.6 174.1L508.8 173.8L508.2 173.5L507.7 173.2L507.3 172.8L507 172.3L506.9 171.9\"/></g><g class=\"it\" data-name=\"press.die\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M500.5 236.9L501.2 236L514.6 228.5L516.2 228.1L517.9 228.5L538 239.7L538.7 240.7L538.7 246.6L538 247.5L524.6 255L522.9 255.4L521.3 255L501.2 243.8L500.5 242.8Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M538.7 246.6L538 247.5L538 241.6L538.7 240.7ZM538 247.5L524.6 255L524.6 249.1L538 241.6Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M524.6 255L522.9 255.4L522.9 249.5L524.6 249.1Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M522.9 255.4L521.3 255L521.3 249.1L522.9 249.5Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M521.3 255L501.2 243.8L501.2 237.9L521.3 249.1ZM501.2 243.8L500.5 242.8L500.5 236.9L501.2 237.9Z\"/><path class=\"iso-top\" d=\"M538 239.7L538.7 240.7L538 241.6L524.6 249.1L522.9 249.5L521.3 249.1L501.2 237.9L500.5 236.9L501.2 236L514.6 228.5L516.2 228.1L517.9 228.5Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M538.7 240.7L538 241.6L524.6 249.1L522.9 249.5L521.3 249.1L501.2 237.9L500.5 236.9\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M500.5 236.9L501.2 236L514.6 228.5L516.2 228.1L517.9 228.5L538 239.7L538.7 240.7M538.7 246.6L538 247.5L524.6 255L522.9 255.4L521.3 255L501.2 243.8L500.5 242.8M538.7 240.7L538.7 246.6M500.5 236.9L500.5 242.8\"/></g></g><g class=\"it\" data-name=\"press.column\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M486.9 170.9L487.3 170.2L488.1 169.6L489.2 169.2L490.4 169L491.8 169L493 169.2L494.1 169.6L494.9 170.2L495.3 170.9L495.3 238.5L494.9 239.2L494.1 239.8L493 240.3L491.8 240.5L490.4 240.5L489.2 240.3L488.1 239.8L487.3 239.2L486.9 238.5Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M494.1 239.8L493 240.3L493 173.4L494.1 173ZM495.3 238.5L494.9 239.2L494.9 172.4L495.3 171.7ZM494.9 239.2L494.1 239.8L494.1 173L494.9 172.4Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M493 240.3L491.8 240.5L491.8 173.7L493 173.4Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M491.8 240.5L490.4 240.5L490.4 173.7L491.8 173.7ZM490.4 240.5L489.2 240.3L489.2 173.4L490.4 173.7Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M489.2 240.3L488.1 239.8L488.1 173L489.2 173.4ZM488.1 239.8L487.3 239.2L487.3 172.4L488.1 173ZM487.3 239.2L486.9 238.5L486.9 171.7L487.3 172.4Z\"/><path class=\"iso-top\" d=\"M494.1 173L493 173.4L491.8 173.7L490.4 173.7L489.2 173.4L488.1 173L487.3 172.4L486.9 171.7L486.9 170.9L487.3 170.2L488.1 169.6L489.2 169.2L490.4 169L491.8 169L493 169.2L494.1 169.6L494.9 170.2L495.3 170.9L495.3 171.7L494.9 172.4Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M495.3 171.7L494.9 172.4L494.1 173L493 173.4L491.8 173.7L490.4 173.7L489.2 173.4L488.1 173L487.3 172.4L486.9 171.7\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M486.9 171.7L486.9 170.9L487.3 170.2L488.1 169.6L489.2 169.2L490.4 169L491.8 169L493 169.2L494.1 169.6L494.9 170.2L495.3 170.9L495.3 171.7M495.3 238.5L494.9 239.2L494.1 239.8L493 240.3L491.8 240.5L490.4 240.5L489.2 240.3L488.1 239.8L487.3 239.2L486.9 238.5M486.9 171.7L486.9 238.5M495.3 171.7L495.3 238.5\"/></g><path class=\"iso-line\" data-tone=\"faint\" d=\"M495.4 183.1L495.3 183.6L495 184L494.6 184.4L494.1 184.8L493.5 185.1L492.7 185.3L491.9 185.4L491.1 185.5L490.3 185.4L489.5 185.3L488.7 185.1L488.1 184.8L487.6 184.4L487.2 184L486.9 183.6L486.8 183.1\"/></g><g class=\"it\" data-name=\"press.chute\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M474.3 270.1L487.7 262.6L504.5 271.9L504.5 274.3L491.1 281.8L474.3 272.4Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M504.5 274.3L504.5 271.9L491.1 279.4L491.1 281.8Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M474.3 272.4L491.1 281.8L491.1 279.4L474.3 270.1Z\"/><path class=\"iso-top\" d=\"M504.5 271.9L487.7 262.6L474.3 270.1L491.1 279.4Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M491.1 281.8L491.1 279.4M504.5 271.9L491.1 279.4M491.1 279.4L474.3 270.1\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M474.3 270.1L487.7 262.6L504.5 271.9L504.5 274.3L491.1 281.8L474.3 272.4Z\"/></g></g><g class=\"it\" data-name=\"press.tray\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M455.8 281.5L456.7 280.6L466.8 275L468.4 274.4L470.2 274.4L471.8 275L493.6 287.1L494.5 288L494.5 295.9L494.5 296.9L493.6 297.8L483.6 303.4L482 303.9L480.1 303.9L478.5 303.4L456.7 291.2L455.8 290.4Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M494.5 296.9L493.6 297.8L493.6 289.9L494.5 289.1ZM493.6 297.8L483.6 303.4L483.6 295.6L493.6 289.9ZM483.6 303.4L482 303.9L482 296.1L483.6 295.6Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M482 303.9L480.1 303.9L480.1 296.1L482 296.1Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M480.1 303.9L478.5 303.4L478.5 295.6L480.1 296.1ZM478.5 303.4L456.7 291.2L456.7 283.4L478.5 295.6ZM456.7 291.2L455.8 290.4L455.8 282.5L456.7 283.4Z\"/><path class=\"iso-top\" d=\"M493.6 287.1L494.5 288L494.5 289.1L493.6 289.9L483.6 295.6L482 296.1L480.1 296.1L478.5 295.6L456.7 283.4L455.8 282.5L455.8 281.5L456.7 280.6L466.8 275L468.4 274.4L470.2 274.4L471.8 275Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M494.5 289.1L493.6 289.9L483.6 295.6L482 296.1L480.1 296.1L478.5 295.6L456.7 283.4L455.8 282.5\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M494.5 289.1L492.9 289.6L483 295.2L481.7 295.6L480.4 295.6L479.1 295.2L457.5 283.1L455.8 282.5\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M455.8 282.5L455.8 281.5L456.7 280.6L466.8 275L468.4 274.4L470.2 274.4L471.8 275L493.6 287.1L494.5 288L494.5 289.1M494.5 296.9L493.6 297.8L483.6 303.4L482 303.9L480.1 303.9L478.5 303.4L456.7 291.2L455.8 290.4M494.5 289.1L494.5 296.9M455.8 282.5L455.8 290.4\"/></g><g data-part=\"discs\"></g></g><g class=\"it\" data-name=\"press.column\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M547.2 182.2L547.6 181.5L548.4 180.9L549.5 180.4L550.8 180.2L552.1 180.2L553.4 180.4L554.5 180.9L555.2 181.5L555.7 182.2L555.7 249.8L555.2 250.5L554.5 251.1L553.4 251.5L552.1 251.7L550.8 251.7L549.5 251.5L548.4 251.1L547.6 250.5L547.2 249.8Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M554.5 251.1L553.4 251.5L553.4 184.7L554.5 184.2ZM555.7 249.8L555.2 250.5L555.2 183.6L555.7 182.9ZM555.2 250.5L554.5 251.1L554.5 184.2L555.2 183.6Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M553.4 251.5L552.1 251.7L552.1 184.9L553.4 184.7Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M552.1 251.7L550.8 251.7L550.8 184.9L552.1 184.9ZM550.8 251.7L549.5 251.5L549.5 184.7L550.8 184.9Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M549.5 251.5L548.4 251.1L548.4 184.2L549.5 184.7ZM548.4 251.1L547.6 250.5L547.6 183.6L548.4 184.2ZM547.6 250.5L547.2 249.8L547.2 182.9L547.6 183.6Z\"/><path class=\"iso-top\" d=\"M554.5 184.2L553.4 184.7L552.1 184.9L550.8 184.9L549.5 184.7L548.4 184.2L547.6 183.6L547.2 182.9L547.2 182.2L547.6 181.5L548.4 180.9L549.5 180.4L550.8 180.2L552.1 180.2L553.4 180.4L554.5 180.9L555.2 181.5L555.7 182.2L555.7 182.9L555.2 183.6Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M555.7 182.9L555.2 183.6L554.5 184.2L553.4 184.7L552.1 184.9L550.8 184.9L549.5 184.7L548.4 184.2L547.6 183.6L547.2 182.9\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M547.2 182.9L547.2 182.2L547.6 181.5L548.4 180.9L549.5 180.4L550.8 180.2L552.1 180.2L553.4 180.4L554.5 180.9L555.2 181.5L555.7 182.2L555.7 182.9M555.7 249.8L555.2 250.5L554.5 251.1L553.4 251.5L552.1 251.7L550.8 251.7L549.5 251.5L548.4 251.1L547.6 250.5L547.2 249.8M547.2 182.9L547.2 249.8M555.7 182.9L555.7 249.8\"/></g><path class=\"iso-line\" data-tone=\"faint\" d=\"M555.7 194.4L555.6 194.8L555.4 195.3L555 195.7L554.5 196L553.8 196.3L553.1 196.6L552.3 196.7L551.4 196.7L550.6 196.7L549.8 196.6L549.1 196.3L548.4 196L547.9 195.7L547.5 195.3L547.3 194.8L547.2 194.4\"/></g><g class=\"it\" data-name=\"press.ram\" data-move=\"ram\" data-part=\"ram\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M495.4 186.9L496.1 185.9L512.9 176.5L514.6 176.2L516.2 176.5L543.1 191.5L543.8 192.5L543.8 212.1L543.1 213.1L526.3 222.4L524.6 222.8L522.9 222.4L496.1 207.4L495.4 206.5Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M543.8 212.1L543.1 213.1L543.1 193.4L543.8 192.5ZM543.1 213.1L526.3 222.4L526.3 202.8L543.1 193.4Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M526.3 222.4L524.6 222.8L524.6 203.2L526.3 202.8Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M524.6 222.8L522.9 222.4L522.9 202.8L524.6 203.2Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M522.9 222.4L496.1 207.4L496.1 187.8L522.9 202.8ZM496.1 207.4L495.4 206.5L495.4 186.9L496.1 187.8Z\"/><path class=\"iso-top\" d=\"M543.1 191.5L543.8 192.5L543.1 193.4L526.3 202.8L524.6 203.2L522.9 202.8L496.1 187.8L495.4 186.9L496.1 185.9L512.9 176.5L514.6 176.2L516.2 176.5Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M543.8 192.5L543.1 193.4L526.3 202.8L524.6 203.2L522.9 202.8L496.1 187.8L495.4 186.9\"/><path class=\"iso-line iso-bevel\" data-tone=\"lo\" d=\"M543.8 192.5L542.3 193.1L525.8 202.4L524.6 202.6L523.5 202.4L496.9 187.5L495.4 186.9\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M495.4 186.9L496.1 185.9L512.9 176.5L514.6 176.2L516.2 176.5L543.1 191.5L543.8 192.5M543.8 212.1L543.1 213.1L526.3 222.4L524.6 222.8L522.9 222.4L496.1 207.4L495.4 206.5M543.8 192.5L543.8 212.1M495.4 186.9L495.4 206.5\"/></g></g><g class=\"it\" data-name=\"press.rod\" data-move=\"ram\"><clipPath id=\"fe-rod\"><path data-hold d=\"M513.6 177.9L513.6 177.4L513.8 177L514 176.6L514.4 176.2L514.8 175.8L515.3 175.5L515.9 175.2L516.6 175L517.3 174.8L518 174.6L518.8 174.5L519.6 174.5L520.4 174.5L521.2 174.6L521.9 174.8L522.6 175L523.3 175.2L523.9 175.5L524.4 175.8L524.8 176.2L525.2 176.6L525.4 177L525.6 177.4L525.6 177.9L525.6 213.3L525.6 213.7L525.4 214.1L525.2 214.5L524.8 214.9L524.4 215.3L523.9 215.6L523.3 215.9L522.6 216.2L521.9 216.4L521.2 216.5L520.4 216.6L519.6 216.6L518.8 216.6L518 216.5L517.3 216.4L516.6 216.2L515.9 215.9L515.3 215.6L514.8 215.3L514.4 214.9L514 214.5L513.8 214.1L513.6 213.7L513.6 213.3Z\"/></clipPath><g clip-path=\"url(#fe-rod)\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M513.9 154.3L514 153.7L514.3 153.1L514.9 152.5L515.6 152L516.4 151.6L517.4 151.4L518.5 151.2L519.6 151.1L520.7 151.2L521.8 151.4L522.8 151.6L523.6 152L524.3 152.5L524.9 153.1L525.2 153.7L525.3 154.3L525.3 189.7L525.2 190.3L524.9 190.9L524.3 191.4L523.6 191.9L522.8 192.3L521.8 192.6L520.7 192.8L519.6 192.8L518.5 192.8L517.4 192.6L516.4 192.3L515.6 191.9L514.9 191.4L514.3 190.9L514 190.3L513.9 189.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M519.6 157.5L520.7 157.4L521.8 157.2L522.8 156.9L523.6 156.5L524.3 156.1L524.9 155.5L525.2 154.9L525.3 154.3L525.3 189.7L525.2 190.3L524.9 190.9L524.3 191.4L523.6 191.9L522.8 192.3L521.8 192.6L520.7 192.8L519.6 192.8Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M517.4 157.2L518.5 157.4L519.6 157.5L519.6 192.8L518.5 192.8L517.4 192.6Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M515.6 156.5L516.4 156.9L517.4 157.2L517.4 192.6L516.4 192.3L515.6 191.9Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M514 154.9L514.3 155.5L514.9 156.1L515.6 156.5L515.6 191.9L514.9 191.4L514.3 190.9L514 190.3Z\"/><path class=\"iso-top\" d=\"M519.6 154.3L519.6 154.3L519.6 154.3L519.6 154.3L519.6 154.3L519.6 154.3L519.6 154.3L519.6 154.3L519.6 154.3L519.6 154.3L519.6 154.3L519.6 154.3L519.6 154.3L519.6 154.3L519.6 154.3L519.6 154.3L519.6 154.3L519.6 154.3L519.6 154.3L519.6 154.3L519.6 154.3L519.6 154.3L519.6 154.3L519.6 154.3L519.6 154.3L519.6 154.3L519.6 154.3L519.6 154.3L519.6 154.3L519.6 154.3L519.6 154.3L519.6 154.3L519.6 154.3L523.6 156.5L522.8 156.9L521.8 157.2L520.7 157.4L519.6 157.5L518.5 157.4L517.4 157.2L516.4 156.9L515.6 156.5L514.9 156.1L514.3 155.5L514 154.9L513.9 154.3L514 153.7L514.3 153.1L514.9 152.5L515.6 152L516.4 151.6L517.4 151.4L518.5 151.2L519.6 151.1L520.7 151.2L521.8 151.4L522.8 151.6L523.6 152L524.3 152.5L524.9 153.1L525.2 153.7L525.3 154.3L525.2 154.9L524.9 155.5L524.3 156.1L523.6 156.5ZM513.9 154.3L514 154.9L514 190.3L513.9 189.7Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M513.9 154.3L514.1 155.1L514.7 155.9L515.6 156.5L516.8 157L518.1 157.4L519.6 157.5L521.1 157.4L522.4 157L523.6 156.5L524.5 155.9L525.1 155.1L525.3 154.3\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M513.9 154.3L514 153.7L514.3 153.1L514.9 152.5L515.6 152L516.4 151.6L517.4 151.4L518.5 151.2L519.6 151.1L520.7 151.2L521.8 151.4L522.8 151.6L523.6 152L524.3 152.5L524.9 153.1L525.2 153.7L525.3 154.3L525.3 189.7L525.2 190.3L524.9 190.9L524.3 191.4L523.6 191.9L522.8 192.3L521.8 192.6L520.7 192.8L519.6 192.8L518.5 192.8L517.4 192.6L516.4 192.3L515.6 191.9L514.9 191.4L514.3 190.9L514 190.3L513.9 189.7Z\"/></g></g></g><g class=\"it\" data-name=\"press.column\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M527.1 193.4L527.5 192.7L528.3 192.1L529.4 191.7L530.7 191.5L532 191.5L533.3 191.7L534.3 192.1L535.1 192.7L535.5 193.4L535.5 261L535.1 261.7L534.3 262.3L533.3 262.8L532 263L530.7 263L529.4 262.8L528.3 262.3L527.5 261.7L527.1 261Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M534.3 262.3L533.3 262.8L533.3 195.9L534.3 195.5ZM535.5 261L535.1 261.7L535.1 194.9L535.5 194.2ZM535.1 261.7L534.3 262.3L534.3 195.5L535.1 194.9Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M533.3 262.8L532 263L532 196.2L533.3 195.9Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M532 263L530.7 263L530.7 196.2L532 196.2ZM530.7 263L529.4 262.8L529.4 195.9L530.7 196.2Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M529.4 262.8L528.3 262.3L528.3 195.5L529.4 195.9ZM528.3 262.3L527.5 261.7L527.5 194.9L528.3 195.5ZM527.5 261.7L527.1 261L527.1 194.2L527.5 194.9Z\"/><path class=\"iso-top\" d=\"M534.3 195.5L533.3 195.9L532 196.2L530.7 196.2L529.4 195.9L528.3 195.5L527.5 194.9L527.1 194.2L527.1 193.4L527.5 192.7L528.3 192.1L529.4 191.7L530.7 191.5L532 191.5L533.3 191.7L534.3 192.1L535.1 192.7L535.5 193.4L535.5 194.2L535.1 194.9Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M535.5 194.2L535.1 194.9L534.3 195.5L533.3 195.9L532 196.2L530.7 196.2L529.4 195.9L528.3 195.5L527.5 194.9L527.1 194.2\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M527.1 194.2L527.1 193.4L527.5 192.7L528.3 192.1L529.4 191.7L530.7 191.5L532 191.5L533.3 191.7L534.3 192.1L535.1 192.7L535.5 193.4L535.5 194.2M535.5 261L535.1 261.7L534.3 262.3L533.3 262.8L532 263L530.7 263L529.4 262.8L528.3 262.3L527.5 261.7L527.1 261M527.1 194.2L527.1 261M535.5 194.2L535.5 261\"/></g><path class=\"iso-line\" data-tone=\"faint\" d=\"M535.6 205.6L535.5 206.1L535.3 206.5L534.9 206.9L534.3 207.3L533.7 207.6L533 207.8L532.2 207.9L531.3 208L530.5 207.9L529.7 207.8L529 207.6L528.3 207.3L527.8 206.9L527.4 206.5L527.1 206.1L527.1 205.6\"/></g><g class=\"it\" data-name=\"press.crown\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M479.8 152.9L481 151.8L507.9 136.8L510 136.1L512.4 136.1L514.6 136.8L561.5 163L562.7 164.2L562.7 165.6L562.7 183.2L561.5 184.4L534.7 199.4L532.6 200.1L530.1 200.1L528 199.4L481 173.2L479.8 172Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M562.7 183.2L561.5 184.4L561.5 166.7L562.7 165.6ZM561.5 184.4L534.7 199.4L534.7 181.7L561.5 166.7ZM534.7 199.4L532.6 200.1L532.6 182.4L534.7 181.7Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M532.6 200.1L530.1 200.1L530.1 182.4L532.6 182.4ZM530.1 200.1L528 199.4L528 181.7L530.1 182.4Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M528 199.4L481 173.2L481 155.5L528 181.7ZM481 173.2L479.8 172L479.8 154.3L481 155.5Z\"/><path class=\"iso-top\" d=\"M561.5 163L562.7 164.2L562.7 165.6L561.5 166.7L534.7 181.7L532.6 182.4L530.1 182.4L528 181.7L481 155.5L479.8 154.3L479.8 152.9L481 151.8L507.9 136.8L510 136.1L512.4 136.1L514.6 136.8Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M562.7 165.6L561.5 166.7L534.7 181.7L532.6 182.4L530.1 182.4L528 181.7L481 155.5L479.8 154.3\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M562.7 165.6L560.4 166.3L533.8 181.1L532.2 181.7L530.5 181.7L528.8 181.1L482.2 155L479.8 154.3\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M562.7 177.4L561.5 178.5L534.7 193.5L532.6 194.2L530.1 194.2L528 193.5L481 167.3L479.8 166.1\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M479.8 154.3L479.8 152.9L481 151.8L507.9 136.8L510 136.1L512.4 136.1L514.6 136.8L561.5 163L562.7 164.2L562.7 165.6M562.7 183.2L561.5 184.4L534.7 199.4L532.6 200.1L530.1 200.1L528 199.4L481 173.2L479.8 172M562.7 165.6L562.7 183.2M479.8 154.3L479.8 172\"/></g></g><g data-part=\"booms\"></g><g data-part=\"carts\"></g><g data-part=\"pill\"></g><path class=\"iso-line\" data-tone=\"hi\" data-part=\"needle\" data-free=\"\" d=\"\" style=\"stroke-width:1.1\"/><g data-part=\"rider\"></g></svg></div><div class=\"fe-scrub\"><button type=\"button\" class=\"fe-play\" data-play aria-label=\"Play\">Play</button><input type=\"range\" class=\"fe-range\" min=\"0\" max=\"56\" step=\"0.25\" value=\"0\" aria-label=\"Day\"><span class=\"fe-week\" data-week aria-hidden=\"true\">Week 0</span></div><span class=\"fe-sr\" role=\"status\" aria-live=\"polite\" data-status></span><div class=\"opt-controls\"><div class=\"opt-seg\" role=\"radiogroup\" aria-label=\"Route\" data-control=\"mode\"><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"daily\" aria-checked=\"true\" tabindex=\"0\">Daily pills</button><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"alternate\" aria-checked=\"false\" tabindex=\"-1\">Alternate days</button><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"iv\" aria-checked=\"false\" tabindex=\"-1\">IV infusion</button></div></div><div class=\"opt-foot\"><span class=\"opt-hint\">Pick a route · drag the days · space to play</span><dl class=\"opt-readout\" data-readout aria-hidden=\"true\"><div class=\"opt-stat\" data-stat=\"day\"><dt>Day</dt><dd data-r=\"day\">0</dd></div><div class=\"opt-stat\" data-stat=\"gate\"><dt>Gut gate</dt><dd data-r=\"gate\">97% open</dd></div><div class=\"opt-stat\" data-stat=\"fer\"><dt>Ferritin</dt><dd data-r=\"fer\">8 µg/L</dd></div><div class=\"opt-stat\" data-stat=\"hb\"><dt>Hemoglobin</dt><dd data-r=\"hb\">105 g/L</dd></div></dl></div></div><figcaption class=\"iso-legend\"><span class=\"iso-keys\"><span class=\"iso-key\"><svg class=\"iso-swatch\" data-mark=\"lit\" viewBox=\"0 0 16 10\" aria-hidden=\"true\"><path d=\"M2 4.5 8 1.5 14 4.5 14 6 8 9 2 6Z\"/><path class=\"iso-swatch-crease\" d=\"M2 4.5 8 7.5 14 4.5\"/></svg>Iron (ingots on transferrin carts)</span><span class=\"iso-key\"><svg class=\"iso-swatch\" data-mark=\"raised\" viewBox=\"0 0 16 10\" aria-hidden=\"true\"><path d=\"M2 4.5 8 1.5 14 4.5 14 6 8 9 2 6Z\"/><path class=\"iso-swatch-crease\" d=\"M2 4.5 8 7.5 14 4.5\"/></svg>Gates: ferroportin, set by the hepcidin dial</span><span class=\"iso-key\"><svg class=\"iso-swatch\" data-mark=\"red\" viewBox=\"0 0 16 10\" aria-hidden=\"true\"><path d=\"M1.5 5h13\"/></svg>Red cells from the marrow press</span></span><span class=\"iso-caption\"><span class=\"fe-par\">Hepcidin is the body's iron gatekeeper: it closes the export gates (ferroportin) on gut cells and on the cells that store iron. A pill of 60 mg of iron or more raises hepcidin for about a day, so the next day's pill is absorbed roughly 35–⁠45 % less. That's why some people take pills every other day. Pills still work and are the right first step for many people.</span><span class=\"fe-par\">IV iron skips the gut gate: the infusion is taken up by the storage cells, which then hand iron to transferrin, the body's carts (each carries at most two iron atoms), for the marrow to build red cells. In this model, one 1000 mg infusion lifts ferritin to about 474 µg/L within a week, settling near 172 by week 7, while hemoglobin rises from 105 to about 130 g/L by week 8; on daily pills, hemoglobin also rises but ferritin stays near 19.</span><span class=\"fe-par\"><small>A typical pattern for one modelled woman (65 kg, starting Hb 105 g/L, ferritin 8 µg/L), not a prediction. Your NP confirms yours with bloodwork, rechecked at 6–⁠8 weeks; ferritin reads high for a few weeks after an infusion. Dose depends on weight and hemoglobin, and some people need a second infusion.</small></span></span></figcaption></figure>" + "</div>";
    mount(root.querySelector(".opt-figure"));
  }
}
customElements.define("optimal-fig-iv-iron", Fig);
})();
