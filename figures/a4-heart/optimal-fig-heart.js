/* optimal-fig-heart: Optimal Health explainer figure. Built with Anatomy (MIT). Generated; do not edit. */
(() => {
if (customElements.get("optimal-fig-heart")) return;
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

// A4 model: one heartbeat at a chosen heart rate → phase, valve states, chamber volumes,
// stroke volume and cardiac output. Typical adult values, not a prediction.
//
// At 75 bpm a beat lasts 0.8 s: about 0.3 s of ventricular systole and 0.5 s of diastole;
// as the rate rises, diastole shortens much more than systole [A4-1][A4-2]. Left ventricle
// 120 ml at the end of filling, 50 ml at the end of ejection (stroke volume 70 ml, EF ≈ 58 %)
// [A4-1]; in hard exercise stroke volume rises toward ≈ 120 ml as filling rises and emptying
// deepens [A4-2]. Maximum heart rate for a 45-year-old: 208 − 0.7 × 45 ≈ 176 bpm [16].
const HEART = {
  rates: [60, 100, 140, 176],
  rest: { edv: 120, esv: 50 },
  hard: { edv: 135, esv: 22 }, // SV 113 ml at full effort (LOW: inside the "toward 120" range)
  systole75: 0.3, // s at 75 bpm [A4-1]
  atrial75: 0.1, //  s, atrial contraction just before ventricular systole (LOW: textbook)
  ivc: 0.05, //      s, isovolumic contraction (LOW)
  ivr: 0.07, //      s, isovolumic relaxation (LOW)
  kick: 0.18, //     share of filling from the atria's own squeeze (LOW, 15–25 %)
};
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
/** Effort share 0..1 from heart rate (60 → 0, ≥140 → 1). */
const effortOf = (hr) => smooth((hr - 60) / 80);
function volumesOf(hr) {
  const e = effortOf(hr);
  const edv = HEART.rest.edv + (HEART.hard.edv - HEART.rest.edv) * e;
  const esv = HEART.rest.esv + (HEART.hard.esv - HEART.rest.esv) * e;
  return { edv, esv, sv: edv - esv, co: (hr * (edv - esv)) / 1000 };
}
/** Durations of one beat at a heart rate (s). Systole shortens with the square root of the cycle. */
function timingOf(hr) {
  const T = 60 / hr;
  const ts = HEART.systole75 * Math.sqrt(T / 0.8);
  const ta = HEART.atrial75 * Math.sqrt(T / 0.8);
  return { T, ta, ts, td: T - ts };
}
/**
 * State at time t (s) into the beat, beat starting with the atria's squeeze (the P wave).
 * Returns the left-ventricle volume (right side drawn alike), atrial volume share, valve openness
 * (0..1) and the phase name.
 */
function beatAt(hr, t) {
  const { T, ta, ts } = timingOf(hr);
  const { edv, esv } = volumesOf(hr);
  const u = ((t % T) + T) % T;
  const pre = edv - HEART.kick * (edv - esv); // volume before the atria squeeze
  const sOn = ta; //             ventricular systole begins (QRS just before)
  const ejectOn = sOn + HEART.ivc;
  const sOff = sOn + ts; //      aortic valve closes
  const fillOn = sOff + HEART.ivr;
  let V;
  let phase;
  if (u < sOn) {
    V = pre + (edv - pre) * smooth(u / ta);
    phase = "atria squeeze";
  } else if (u < ejectOn) {
    V = edv;
    phase = "valves shut, pressure builds";
  } else if (u < sOff) {
    const x = (u - ejectOn) / (sOff - ejectOn);
    V = edv - (edv - esv) * (1 - (1 - x) ** 2.2);
    phase = "ejection";
  } else if (u < fillOn) {
    V = esv;
    phase = "valves shut, muscle relaxes";
  } else {
    const x = (u - fillOn) / Math.max(0.02, T - fillOn);
    V = esv + (pre - esv) * (1 - Math.exp(-4.5 * x)) / (1 - Math.exp(-4.5));
    phase = "filling";
  }
  // atria: squeeze during their systole, fill as reservoirs while the AV valves are shut, empty into the ventricles
  let A;
  if (u < sOn) A = 1 - 0.45 * smooth(u / ta);
  else if (u < fillOn) A = 0.55 + 0.45 * smooth((u - sOn) / (fillOn - sOn));
  else A = 1 - 0.3 * smooth((u - fillOn) / Math.max(0.02, (T - fillOn) * 0.5)) + 0.3 * smooth((u - fillOn - (T - fillOn) * 0.5) / Math.max(0.02, (T - fillOn) * 0.5));
  const ramp = (a, b, w = 0.03) => clamp(Math.min((u - a) / w, (b - u) / w), 0, 1);
  const av = u < sOn ? 1 : u > fillOn ? clamp((u - fillOn) / 0.03, 0, 1) : clamp((sOn - u) / 0.03 + 1, 0, 1) * 0;
  return { u, T, V, A: clamp(A, 0.5, 1), av: u < sOn ? 1 : av, semi: ramp(ejectOn, sOff), phase, edv, esv, sOn, ejectOn, sOff, fillOn };
}
/** A drawn ECG (mV-ish) at time u into the beat: P with the atria, QRS as systole starts, T near its end. */
function ecgAt(hr, u) {
  const { ta, ts } = timingOf(hr);
  const g = (x, m, s, a) => a * Math.exp(-(((x - m) / s) ** 2));
  return g(u, ta * 0.45, 0.025, 0.15) - g(u, ta - 0.012, 0.007, 0.12) + g(u, ta, 0.009, 1) - g(u, ta + 0.016, 0.008, 0.25) + g(u, ta + ts * 0.8, 0.045, 0.3);
}

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

// A4 live code: the heart cut open front to back, in 3-D, beating at the chosen rate.
//
// Everything is redrawn from the beat model each frame. On the cut face: the cut muscle, the
// chamber openings and the great vessels, all moved by one deformation field (the chambers
// squeeze toward their middles, the walls thicken, the valve plane is pulled toward the apex).
// Behind the cut, in true depth: each chamber is a cavity whose inner wall is shaded by facing
// and ridged with muscle bands, the papillary muscles stand up from the ventricle floors, chordae
// run to 3-D valve leaflets that swing open and shut, blood cells move at their own depths (the
// left ventricle's filling swirls), and the heart's back half keeps its round, vessel-lined
// outer wall. A monitor below runs the ECG, the left ventricle's volume and the valves' timing.
const DATA = {"geo":{"AVY":262,"APEXY":522,"OUT":[[140,150],[121,190],[116,236],[128,272],[148,302],[156,342],[176,394],[214,442],[268,482],[326,510],[378,524],[420,510],[452,472],[474,412],[484,342],[482,290],[490,250],[492,200],[480,158],[450,136],[405,130],[360,142],[330,168],[300,182],[262,176],[230,158],[196,140],[164,138]],"RA":[[150,162],[133,198],[134,240],[152,268],[190,282],[228,276],[244,240],[236,198],[212,168],[180,156]],"LA":[[378,170],[398,150],[430,144],[460,156],[470,190],[460,226],[432,246],[400,250],[380,234],[372,202]],"RV":[[204,290],[182,322],[186,382],[216,430],[262,460],[304,466],[318,440],[316,380],[306,322],[298,272],[292,232],[286,218],[260,218],[262,248],[250,288]],"LV":[[332,254],[360,258],[396,268],[430,274],[446,312],[446,372],[434,428],[410,468],[384,476],[358,450],[342,398],[334,330],[330,290]],"TRI":[[206,288],[248,288]],"MIT":[[374,266],[428,274]],"PUL":[[260,218],[286,218]],"AOR":[[332,254],[360,258]],"TRIc":[227,292],"MITc":[400,272],"PULc":[273,214],"AORc":[346,252],"RAin":[186,214],"LAin":[412,196],"PAPR":[236,418],"PAPL":[[376,432],[422,424]],"PULout":[[[284,142],[362,120],[398,127]],[[284,142],[196,116],[156,120]]],"AORout":[[[338,120],[356,72],[410,52],[452,70],[470,112],[478,160]],[[338,120],[356,72],[376,58],[373,18]],[[338,120],[356,72],[408,50],[411,14]]]},"mon":{"top":606,"x0":168,"w":392,"span":2.4,"ecg":{"y":650,"h":28},"vol":{"y":718,"h":48,"lo":15,"hi":145},"inR":{"y":734,"h":9},"outR":{"y":752,"h":9}},"lines":["Resting: about one beat a second, most of it spent filling.","Walking briskly: faster beats, and each beat empties more fully.","Running: the filling time shrinks; the squeeze barely does.","All out, about the top rate for a 45-year-old: little time to fill, but each beat is near its biggest."],"far":{"w":[0.5317,-0.5043],"A":62,"E":24,"dep":200}};

function mount(fig) {
  const svg = fig.querySelector("svg");
  const q = (s) => svg.querySelector(s);
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const out = Object.fromEntries([...fig.querySelectorAll("[data-r]")].map((n) => [n.dataset.r, n]));
  const status = fig.querySelector("[data-status]");
  const line = fig.querySelector("[data-scene]");
  const buttons = [...fig.querySelectorAll('[data-control="rate"] .opt-seg-btn')];
  const slowBtn = fig.querySelector("[data-slow]");
  const G = DATA.geo;
  const set = (sel, d) => q(sel).setAttribute("d", d);
  const f1 = (v) => v.toFixed(1);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  // ---------------------------------------------------------------- shapes
  function smooth(points, closed = true, k = 1) {
    const n = points.length;
    const at = (i) => points[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
    let d = `M${f1(points[0][0])} ${f1(points[0][1])}`;
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
      d += `C${f1(p1[0] + ((p2[0] - p0[0]) / 6) * k)} ${f1(p1[1] + ((p2[1] - p0[1]) / 6) * k)} ${f1(p2[0] - ((p3[0] - p1[0]) / 6) * k)} ${f1(p2[1] - ((p3[1] - p1[1]) / 6) * k)} ${f1(p2[0])} ${f1(p2[1])}`;
    }
    return d + (closed ? "Z" : "");
  }
  function curve(points, samples = 10) {
    // sampled Catmull-Rom centreline
    const out2 = [];
    const n = points.length;
    for (let i = 0; i < n - 1; i++) {
      const p0 = points[Math.max(0, i - 1)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(n - 1, i + 2)];
      for (let s = 0; s < samples; s++) {
        const t = s / samples, t2 = t * t, t3 = t2 * t;
        out2.push([0, 1].map((c) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)));
      }
    }
    out2.push(points[n - 1]);
    return out2;
  }
  function tube(points, w0, w1 = w0, sides = false) {
    // a closed vessel outline round a centreline, tapering w0 → w1 (sides: also its two edges as open lines)
    const c = curve(points);
    const L = [];
    const R = [];
    c.forEach((p, i) => {
      const a = c[Math.max(0, i - 1)];
      const b = c[Math.min(c.length - 1, i + 1)];
      let nx = -(b[1] - a[1]);
      let ny = b[0] - a[0];
      const l = Math.hypot(nx, ny) || 1;
      nx /= l;
      ny /= l;
      const w = (w0 + (w1 - w0) * (i / (c.length - 1))) / 2;
      L.push([p[0] + nx * w, p[1] + ny * w]);
      R.push([p[0] - nx * w, p[1] - ny * w]);
    });
    const ln = (ps) => `M${ps.map((p) => `${f1(p[0])} ${f1(p[1])}`).join("L")}`;
    const closed = `${ln([...L, ...[...R].reverse()])}Z`;
    return sides ? { d: closed, edges: ln(L) + ln(R), L, R } : closed;
  }
  /** A vessel, cut open lengthwise like the heart: a wall band each side, the blood down the middle with the
   *  lit far wall of the half-pipe showing as a soft band. Its back half and cut ends are drawn behind the cut. */
  const tubes = [];
  function vessel(name, list, cls) {
    let h = "";
    for (const [pts, w0, w1, capA, capB] of list) {
      tubes.push({ name, pts, w0, w1, cls, caps: [capA, capB] });
      const t = tube(pts, w0, w1, true);
      const lit = tube(pts, w0 * 0.28, w1 * 0.28, true);
      h += `<path class="a4-${cls} a4-vessel a4-vessel-fill" d="${t.d}"/><path class="a4-lumen a4-lumen-${cls} a4-lumen-cut" d="${tube(pts, w0 * 0.7, w1 * 0.7)}"/><path class="a4-lumen-lit a4-lumen-lit-${cls}" d="${lit.d}" transform="translate(${f1(DATA.far.w[0] * w0 * 0.18)} ${f1(DATA.far.w[1] * w0 * 0.18)})"/><path class="a4-vessel-edge" d="${t.edges}"/>`;
    }
    q(`[data-v="${name}"]`).innerHTML = h;
  }
  const centroid = (pts) => pts.reduce((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length], [0, 0]);
  const C = { RA: centroid(G.RA), LA: centroid(G.LA), RV: centroid(G.RV), LV: centroid(G.LV), V: [320, 392] };
  const FIB = { lv: G.LV.filter((p) => p[1] > G.AVY + 16), rv: G.RV.slice(0, 6) };

  // ---------------------------------------------------------------- the deformation field
  let def = { d: 0, sV: 1, sA: 1, sO: 1 };
  const wOf = (y) => (y <= G.AVY ? 1 : y >= G.APEXY ? 0 : (G.APEXY - y) / (G.APEXY - G.AVY));
  const shift = (p) => [p[0], p[1] + def.d * wOf(p[1])];
  const scaleAbout = (p, c, s) => [c[0] + (p[0] - c[0]) * s, c[1] + (p[1] - c[1]) * s];
  const cav = (pts, c, s) => pts.map((p) => shift(scaleAbout(p, c, s)));
  const outer = () =>
    G.OUT.map((p) => {
      if (p[1] > G.AVY - 4) return shift(scaleAbout(p, C.V, def.sO));
      const c = p[0] < 300 ? C.RA : C.LA;
      return shift(scaleAbout(p, c, 0.94 + 0.06 * def.sA));
    });

  // ---------------------------------------------------------------- 3-D: the camera, light and tones
  // A point (x, y) on the cut face at depth d behind it is drawn at (x, y) + d·w in the cut face's own
  // coordinates. World vectors: x right, y toward the viewer, z up; a section-plus-depth vector
  // (dx, dy, dd) is (dx, −dd, −dy) in world.
  const FAR = DATA.far;
  const RB = roundBack(FAR);
  const W = FAR.w;
  const RAD = Math.PI / 180;
  const sA = Math.sin(FAR.A * RAD), cA = Math.cos(FAR.A * RAD), sE = Math.sin(FAR.E * RAD), cE = Math.cos(FAR.E * RAD);
  const VIEW = [cA * cE, sA * cE, sE];
  const LIGHT = (() => {
    const l = [-0.35, 0.55, 0.76];
    const m = Math.hypot(...l);
    return l.map((v) => v / m);
  })();
  const P3 = (x, y, d) => [x + d * W[0], y + d * W[1]];
  const key3 = (x, y, d) => (x * cA + (FAR.dep - d) * sA) * cE - y * sE;
  const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const norm3 = (a) => {
    const m = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / m, a[1] / m, a[2] / m];
  };
  const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const toW = (v) => [v[0], -v[2], -v[1]]; // (dx, dy, dd) → world
  const mixc = (c, to, t) => c.map((v, i) => Math.round(v + (to[i] - v) * t));
  const rgb = (c) => `rgb(${c.join(",")})`;
  const tone = (tones, t, steps = 20) => rgb(mixc(tones[0], tones[1], Math.round(clamp(t, 0, 1) * steps) / steps));
  const lit = (n, two = false) => {
    const l = dot3(n, LIGHT);
    return 0.16 + 0.95 * Math.max(0, two ? Math.abs(l) : l);
  };
  const quad = (pts) => `M${pts.map((v) => `${f1(v[0])} ${f1(v[1])}`).join("L")}Z`;
  const pathOf = (pts) => `M${pts.map((v) => `${f1(v[0])} ${f1(v[1])}`).join("L")}`;
  const cssc = (name, fb) => RB.rgbOf(fig, name, fb);
  const BLACK = [0, 0, 0];
  const WHITE = [255, 255, 255];
  const M_LO = cssc("--a4-m2", "#b0604f");
  const M_HI = cssc("--a4-m0", "#e7a594");
  const VEN = cssc("--a4-ven", "#8892cc");
  const ART = cssc("--a4-art", "#dc6656");
  const T = {
    epi: [mixc(M_LO, BLACK, 0.18), mixc(M_HI, WHITE, 0.05)],
    muscle: [mixc(M_LO, BLACK, 0.12), M_HI],
    ven: [mixc(VEN, BLACK, 0.45), mixc(VEN, WHITE, 0.25)],
    art: [mixc(ART, BLACK, 0.45), mixc(ART, WHITE, 0.25)],
    // a chamber's inner wall: muscle seen through its blood
    cavR: [mixc(mixc(M_LO, VEN, 0.6), BLACK, 0.42), mixc(mixc(M_HI, VEN, 0.55), WHITE, 0.08)],
    cavL: [mixc(mixc(M_LO, ART, 0.55), BLACK, 0.42), mixc(mixc(M_HI, ART, 0.5), WHITE, 0.08)],
    leaf: [cssc("--a4-valve-edge", "#8a6a5e"), cssc("--a4-valve", "#fffaf2")],
  };
  const FAT = rgb(cssc("--a4-fat", "#f2d27a"));
  const COR_ART = rgb(mixc(ART, BLACK, 0.12));
  const COR_VEN = rgb(mixc(VEN, BLACK, 0.18));
  const CHORD = rgb(cssc("--a4-chord", "#8a6a5e"));

  // ---------------------------------------------------------------- the heart's back half, with its surface vessels
  function closedRing(points, n, smoothing = 3) {
    const closed = RB.sampleClosed(points, 1, 6);
    const raw = RB.byLength([...closed, closed[0]], n + 1).slice(0, -1);
    if (!smoothing) return raw;
    return raw.map((_, i) => {
      let x = 0;
      let y = 0;
      for (let k = -smoothing; k <= smoothing; k++) {
        const p = raw[(i + k + n) % n];
        x += p[0] / (2 * smoothing + 1);
        y += p[1] / (2 * smoothing + 1);
      }
      return [x, y];
    });
  }
  function backHalf(outline) {
    const pts = closedRing(outline, 72);
    const n = pts.length;
    let area = 0;
    for (let i = 0; i < n; i++) area += pts[i][0] * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * pts[i][1];
    const sg = area > 0 ? 1 : -1;
    const nrm = pts.map((p, i) => {
      const a = pts[(i - 1 + n) % n];
      const b = pts[(i + 1) % n];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      return [(sg * (b[1] - a[1])) / l, (-sg * (b[0] - a[0])) / l];
    });
    const [cx, cy] = centroid(pts);
    const rho = pts.map((p) => 0.92 * Math.hypot(p[0] - cx, p[1] - cy));
    const at = (i, ph) => {
      const r = rho[i];
      const inn = (1 - Math.cos(ph)) * r;
      return [pts[i][0] - nrm[i][0] * inn, pts[i][1] - nrm[i][1] * inn, Math.sin(ph) * r * 0.85];
    };
    const normal = (i, ph) => norm3([Math.cos(ph) * nrm[i][0], -Math.sin(ph), -Math.cos(ph) * nrm[i][1]]);
    const facets = [];
    const NPH = 9;
    for (let i = 0; i < n; i++) {
      const i1 = (i + 1) % n;
      for (let j = 0; j < NPH; j++) {
        const p0 = (j / NPH) * (Math.PI / 2);
        const p1 = ((j + 1) / NPH) * (Math.PI / 2);
        const nn = normal(i, (p0 + p1) / 2);
        if (dot3(nn, VIEW) <= 0.01) continue;
        const a = at(i, p0), b = at(i1, p0), c = at(i1, p1), d = at(i, p1);
        facets.push({ key: key3((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2), d: quad([P3(...a), P3(...b), P3(...c), P3(...d)]), fill: tone(T.epi, lit(nn)) });
      }
    }
    // surface vessels on the left side (viewer's right): the circumflex in the fat of the AV groove,
    // and a marginal branch with its vein running down toward the apex
    const visible = (i, ph) => dot3(normal(i, ph), VIEW) > 0.04;
    const runAlong = (ph, pick) => {
      const segs = [];
      let cur = [];
      for (let i = 0; i < n; i++) {
        if (pick(pts[i], nrm[i]) && visible(i, ph)) cur.push(P3(...at(i, ph)));
        else if (cur.length) (segs.push(cur), (cur = []));
      }
      if (cur.length) segs.push(cur);
      return segs.filter((s) => s.length > 1).map(pathOf).join("");
    };
    const right = (p, nn) => nn[0] > 0.3;
    const groove = (p, nn) => nn[0] > 0.2 && Math.abs(p[1] - (G.AVY + def.d * 0.2)) < 30;
    let fat = "";
    for (let i = 0; i < n; i++) {
      if (!groove(pts[i], nrm[i])) continue;
      const i1 = (i + 1) % n;
      if (!groove(pts[i1], nrm[i1]) || !visible(i, 0.6)) continue;
      fat += quad([P3(...at(i, 0.18)), P3(...at(i1, 0.18)), P3(...at(i1, 1.0)), P3(...at(i, 1.0))]);
    }
    const vein = runAlong(0.78, (p, nn) => right(p, nn) && p[1] > G.AVY - 10);
    const artery = runAlong(0.52, (p, nn) => right(p, nn) && p[1] > G.AVY - 18);
    const surf = `<path class="a4-epi-fat" d="${fat}" fill="${FAT}"/><path class="a4-cor-edge" d="${vein}"/><path class="a4-cor" d="${vein}" stroke="${COR_VEN}"/><path class="a4-cor-edge a4-cor-edge-a" d="${artery}"/><path class="a4-cor a4-cor-a" d="${artery}" stroke="${COR_ART}"/>`;
    return { facets, surf };
  }

  // ---------------------------------------------------------------- a chamber: a cavity behind its opening
  // Its inner wall is a half-ellipsoid behind the outline (a round opening becomes a hemispherical bowl).
  // Through the opening every point of the wall is seen once, so its facets can be merged by tone.
  function chamber(outlinePts, depthK, tones, ridges) {
    const P = closedRing(outlinePts, 72, 1);
    const n = P.length;
    const c = centroid(P);
    const R = P.map((p) => Math.hypot(p[0] - c[0], p[1] - c[1]) || 1);
    const rbar = R.reduce((a, v) => a + v, 0) / n;
    const D = depthK * rbar;
    const U = P.map((p, i) => [(p[0] - c[0]) / R[i], (p[1] - c[1]) / R[i]]);
    const K = 15;
    const at = (i, t) => {
      const th = (t * Math.PI) / 2;
      return [c[0] + U[i][0] * R[i] * Math.cos(th), c[1] + U[i][1] * R[i] * Math.cos(th), Math.sin(th) * D];
    };
    const facets = [];
    for (let i = 0; i < n; i++) {
      const i1 = (i + 1) % n;
      for (let k = 0; k < K; k++) {
        const t0 = k / K, t1 = (k + 1) / K, th = ((t0 + t1) / 2) * (Math.PI / 2);
        const a = Math.cos(th) / ((R[i] + R[i1]) / 2);
        const b = Math.sin(th) / D;
        const ux = (U[i][0] + U[i1][0]) / 2, uy = (U[i][1] + U[i1][1]) / 2;
        const nIn = norm3([-a * ux, b, a * uy]); // the wall's inner side, facing into the cavity
        const q0 = at(i, t0), q1 = at(i1, t0), q2 = at(i1, t1), q3 = at(i, t1);
        facets.push({ key: 0, d: quad([P3(...q0), P3(...q1), P3(...q2), P3(...q3)]), fill: tone(tones, lit(nIn), 64) });
      }
    }
    // muscle ridges on the wall: trabeculae in the ventricles, pectinate bands in the right atrium
    let ridgeD = "";
    for (const r of ridges) {
      const pts = [];
      for (let s = 0; s <= 10; s++) {
        const t = r.t0 + ((r.t1 - r.t0) * s) / 10;
        const fi = r.i + r.wob * Math.sin(s * 0.9 + r.i);
        const i0 = ((Math.floor(fi) % n) + n) % n;
        const fr = fi - Math.floor(fi);
        const a = at(i0, t);
        const b = at((i0 + 1) % n, t);
        pts.push(P3(a[0] + (b[0] - a[0]) * fr, a[1] + (b[1] - a[1]) * fr, a[2] + (b[2] - a[2]) * fr));
      }
      ridgeD += pathOf(pts);
    }
    /** How deep the wall lies behind an in-plane point inside the opening. */
    const depthAt = (x, y) => {
      const ang = Math.atan2(y - c[1], x - c[0]);
      let best = 0;
      let bd = 9;
      U.forEach((u, i) => {
        const dd = Math.abs(Math.atan2(Math.sin(ang - Math.atan2(u[1], u[0])), Math.cos(ang - Math.atan2(u[1], u[0]))));
        if (dd < bd) (bd = dd), (best = i);
      });
      const rr = Math.hypot(x - c[0], y - c[1]) / R[best];
      return Math.sqrt(Math.max(0, 1 - rr * rr)) * D;
    };
    return { facets, ridgeD, depthAt, c, D, outline: smooth(outlinePts) };
  }
  const RIDGE = {
    LV: [14, 21, 28, 35, 42, 49, 56].map((i, k) => ({ i, t0: 0.16, t1: 0.84 + (k % 3) * 0.04, wob: 0.55 })),
    RV: [17, 25, 33, 41, 49].map((i) => ({ i, t0: 0.18, t1: 0.8, wob: 0.5 })),
    RA: [27, 32, 37, 42, 47, 52].map((i) => ({ i, t0: 0.08, t1: 0.66, wob: 0.3 })),
    LA: [],
  };

  // ---------------------------------------------------------------- a papillary muscle: a tapered 3-D column
  function column(base, tip, r0, r1, tones) {
    const S = 6;
    const N = 12;
    const ax = norm3(toW([tip[0] - base[0], tip[1] - base[1], tip[2] - base[2]]));
    let side = norm3(cross3(ax, [0, 0, 1]));
    if (!isFinite(side[0])) side = [1, 0, 0];
    const up = cross3(side, ax);
    const ring = (s) => {
      const p = [base[0] + (tip[0] - base[0]) * s, base[1] + (tip[1] - base[1]) * s, base[2] + (tip[2] - base[2]) * s];
      const r = (r0 + (r1 - r0) * s) * (1 - 0.18 * Math.sin(Math.PI * s * 0.9));
      return Array.from({ length: N }, (_, j) => {
        const a = (j / N) * 2 * Math.PI;
        const v = [side[0] * Math.cos(a) + up[0] * Math.sin(a), side[1] * Math.cos(a) + up[1] * Math.sin(a), side[2] * Math.cos(a) + up[2] * Math.sin(a)];
        // world offset back to section + depth: x, −z, −y
        return { p: [p[0] + v[0] * r, p[1] - v[2] * r, p[2] - v[1] * r], n: v };
      });
    };
    const rows = Array.from({ length: S + 1 }, (_, s) => ring(s / S));
    const facets = [];
    for (let s = 0; s < S; s++)
      for (let j = 0; j < N; j++) {
        const a = rows[s][j], b = rows[s][(j + 1) % N], cc = rows[s + 1][(j + 1) % N], d = rows[s + 1][j];
        const nn = norm3([a.n[0] + b.n[0], a.n[1] + b.n[1], a.n[2] + b.n[2]]);
        if (dot3(nn, VIEW) <= 0) continue;
        facets.push({ key: key3((a.p[0] + cc.p[0]) / 2, (a.p[1] + cc.p[1]) / 2, (a.p[2] + cc.p[2]) / 2), d: quad([P3(...a.p), P3(...b.p), P3(...cc.p), P3(...d.p)]), fill: tone(tones, lit(nn)) });
      }
    return facets;
  }

  // ---------------------------------------------------------------- an AV valve: its annulus and two leaflets in 3-D
  // The annulus crosses the cut at its two ends; behind the cut it is a half-ring. Each leaflet hangs from half
  // of it: open, its free edge drops into the ventricle along the wall; shut, the free edges meet in the middle.
  function avValve(L0, R0, open, toward, len) {
    const L = shift(L0);
    const R = shift(R0);
    const m = [(L[0] + R[0]) / 2, (L[1] + R[1]) / 2];
    const h = [(R[0] - L[0]) / 2, (R[1] - L[1]) / 2];
    const a = Math.hypot(h[0], h[1]);
    const b = a * 0.9;
    let dv = [toward[0] - m[0], toward[1] - m[1]];
    const dl = Math.hypot(dv[0], dv[1]) || 1;
    dv = [dv[0] / dl, dv[1] / dl];
    const ring = (ph) => [m[0] + Math.cos(ph) * h[0], m[1] + Math.cos(ph) * h[1], Math.sin(ph) * b];
    const o = open * open * (3 - 2 * open);
    const edge = (ph) => {
      const r = ring(ph);
      const opened = [r[0] + dv[0] * len + (r[0] - m[0]) * 0.12, r[1] + dv[1] * len + (r[1] - m[1]) * 0.12, r[2] * 1.08];
      const shut = [m[0] + dv[0] * len * 0.22, m[1] + dv[1] * len * 0.22, r[2] * 0.95];
      return [shut[0] + (opened[0] - shut[0]) * o, shut[1] + (opened[1] - shut[1]) * o, shut[2] + (opened[2] - shut[2]) * o];
    };
    const facets = [];
    const tips = [];
    const ROWS = 5;
    const SEG = 9;
    let edgeD = "";
    for (const [ph0, ph1] of [[0.04, Math.PI / 2 - 0.03], [Math.PI / 2 + 0.03, Math.PI - 0.04]]) {
      const grid = [];
      for (let s = 0; s <= ROWS; s++) {
        const rowPts = [];
        for (let k = 0; k <= SEG; k++) {
          const ph = ph0 + ((ph1 - ph0) * k) / SEG;
          const r = ring(ph);
          const e = edge(ph);
          const u = s / ROWS;
          // a little belly: toward the atrium when shut, toward the wall when open
          const belly = Math.sin(Math.PI * u) * len * 0.18;
          const bx = -dv[0] * belly * (1 - o) + (r[0] - m[0]) / Math.max(1, a) * belly * o * 0.6;
          const by = -dv[1] * belly * (1 - o) + (r[1] - m[1]) / Math.max(1, a) * belly * o * 0.6;
          rowPts.push([r[0] + (e[0] - r[0]) * u + bx, r[1] + (e[1] - r[1]) * u + by, r[2] + (e[2] - r[2]) * u]);
        }
        grid.push(rowPts);
      }
      for (let s = 0; s < ROWS; s++)
        for (let k = 0; k < SEG; k++) {
          const p0 = grid[s][k], p1 = grid[s][k + 1], p2 = grid[s + 1][k + 1], p3 = grid[s + 1][k];
          const e1 = toW([p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]]);
          const e2 = toW([p3[0] - p0[0], p3[1] - p0[1], p3[2] - p0[2]]);
          const nn = norm3(cross3(e1, e2));
          facets.push({ key: key3((p0[0] + p2[0]) / 2, (p0[1] + p2[1]) / 2, (p0[2] + p2[2]) / 2), d: quad([P3(...p0), P3(...p1), P3(...p2), P3(...p3)]), fill: tone(T.leaf, 0.35 + 0.65 * lit(nn, true), 32) });
        }
      for (const k of [1, 4, 7]) tips.push(grid[ROWS][k]);
      // the free edge, scalloped where the chordae pull it
      edgeD += pathOf(grid[ROWS].map((p, k) => P3(p[0], p[1] + (k % 3 === 1 ? 1.6 : 0), p[2])));
    }
    const ringPts = [];
    for (let k = 0; k <= 20; k++) ringPts.push(P3(...ring((k / 20) * Math.PI)));
    return { facets, tips, edgeD, ring: pathOf(ringPts), ends: [L, R], neck: [L, R, [R[0] + dv[0] * 16, R[1] + dv[1] * 16], [L[0] + dv[0] * 16, L[1] + dv[1] * 16]], back: [[L[0] - dv[0] * 12, L[1] - dv[1] * 12], [R[0] - dv[0] * 12, R[1] - dv[1] * 12]] };
  }

  // ---------------------------------------------------------------- semilunar valves (on the cut, in the vessel roots)
  function leaflet(hh, ang, Ln, w = 6) {
    const a = (ang * Math.PI) / 180;
    const ux = Math.cos(a), uy = Math.sin(a);
    const nx = -uy, ny = ux;
    const t = [hh[0] + ux * Ln, hh[1] + uy * Ln];
    const m = [hh[0] + ux * Ln * 0.55, hh[1] + uy * Ln * 0.55];
    return smooth([[hh[0] + nx * w * 0.5, hh[1] + ny * w * 0.5], [m[0] + nx * w * 0.42, m[1] + ny * w * 0.42], t, [m[0] - nx * w * 0.42, m[1] - ny * w * 0.42], [hh[0] - nx * w * 0.5, hh[1] - ny * w * 0.5]], true, 0.8);
  }
  const lerp = (a, b, t) => a + (b - a) * t;
  function semilunar(b) {
    let d = "";
    for (const [l, r] of [G.PUL, G.AOR]) {
      const hl = shift(l);
      const hr = shift(r);
      const Ln = (r[0] - l[0]) * 0.58;
      d += leaflet(hl, lerp(28, -78, b.semi), Ln, 5) + leaflet(hr, lerp(152, -102, b.semi), Ln, 5);
    }
    return d;
  }

  // ---------------------------------------------------------------- blood: right side blue, left side red, each cell at its own depth
  const rnd = (a, b) => a + Math.random() * (b - a);
  const cells = [];
  let spawnR = 0;
  let spawnL = 0;
  let cham = null; // this frame's chambers, for depths
  function spawn(side) {
    const d = rnd(0, 8);
    if (side === "R") {
      const fromTop = Math.random() < 0.55;
      cells.push({ side, stage: 0, p: fromTop ? [rnd(165, 188), -6] : [rnd(78, 98), 372], path: fromTop ? [[176, 120]] : [[132, 288]], j: [rnd(-16, 16), rnd(-16, 16)], d, dT: d });
    } else cells.push({ side, stage: 0, p: [560, Math.random() < 0.5 ? 168 : 214], path: [[470, 196]], j: [rnd(-16, 16), rnd(-14, 14)], d, dT: d });
  }
  function moveTo(c, t, v, dt) {
    const dx = t[0] - c.p[0], dy = t[1] - c.p[1];
    const d = Math.hypot(dx, dy);
    if (d <= v * dt) {
      c.p = [t[0], t[1]];
      return true;
    }
    c.p = [c.p[0] + (dx / d) * v * dt, c.p[1] + (dy / d) * v * dt];
    return false;
  }
  const setStage = (c, s, dT) => {
    c.stage = s;
    c.dT = dT;
  };
  function stepCells(b, dt, hr) {
    const v = 70 * (hr / 60);
    for (const c of cells) {
      if (c.a === undefined) (c.a = Math.random() * Math.PI), (c.spin = (Math.random() - 0.5) * 3);
      c.a += c.spin * dt;
      c.d += (c.dT - c.d) * (1 - Math.exp(-dt * 3.5));
    }
    spawnR += dt * 6 * (hr / 60);
    spawnL += dt * 6 * (hr / 60);
    while (spawnR > 1) (spawnR -= 1), spawn("R");
    while (spawnL > 1) (spawnL -= 1), spawn("L");
    const DA = { R: cham ? cham.RA.D : 50, L: cham ? cham.LA.D : 50 };
    const DV = { R: cham ? cham.RV.D : 30, L: cham ? cham.LV.D : 60 };
    for (let i = cells.length - 1; i >= 0; i--) {
      const c = cells[i];
      const R = c.side === "R";
      const atrium = R ? C.RA : C.LA;
      const vent = R ? C.RV : C.LV;
      const ring = R ? G.TRIc : G.MITc;
      const exitV = R ? G.PULc : G.AORc;
      if (c.stage === 0) {
        // vein → atrium
        if (moveTo(c, c.path[0], v * 0.9, dt)) setStage(c, 1, rnd(0.15, 0.7) * DA[c.side]);
      } else if (c.stage === 1) {
        moveTo(c, shift([atrium[0] + c.j[0], atrium[1] + c.j[1]]), v * 0.5, dt);
        if (b.av > 0.5) setStage(c, 2, rnd(0.1, 0.45) * 18);
      } else if (c.stage === 2) {
        // through the open AV valve into the ventricle
        if (moveTo(c, shift(ring), v * 1.3, dt)) {
          setStage(c, 3, 0);
          c.th = Math.atan2(c.j[1], c.j[0]);
          c.rr = 10 + Math.hypot(c.j[0], c.j[1]) * (R ? 0.7 : 1.1);
        }
      } else if (c.stage === 3) {
        // filling swirls: the inflow curls down the free wall and back up the septum (a vortex ring, seen cut)
        c.th += (R ? 1.6 : 2.6) * (hr / 60) * dt * (R ? -1 : 1);
        const cx = vent[0] + (R ? -4 : 6);
        const cy = vent[1] + (R ? 10 : 18);
        moveTo(c, shift([cx + Math.cos(c.th) * c.rr * 0.75, cy + Math.sin(c.th) * c.rr * 1.6]), v * 1.1, dt);
        c.dT = DV[c.side] * (0.38 + 0.26 * Math.sin(c.th));
        if (b.semi > 0.5) setStage(c, 4, rnd(0, 0.3) * 18);
      } else if (c.stage === 4) {
        if (moveTo(c, shift(exitV), v * 2.2, dt)) {
          setStage(c, 5, rnd(0, 7));
          c.out = (R ? G.PULout : G.AORout)[Math.floor(Math.random() * (R ? G.PULout : G.AORout).length)];
        }
      } else if (c.stage === 5) {
        const way = c.out;
        if (moveTo(c, way[c.k ?? 0], v * 1.8, dt)) {
          c.k = (c.k ?? 0) + 1;
          if (c.k >= way.length) cells.splice(i, 1);
        }
      }
    }
  }
  const disc = (x, y, a, rx, ry) => {
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    const ang = ((a * 180) / Math.PI).toFixed(0);
    return `M${f1(x - ux * rx)} ${f1(y - uy * rx)}A${rx} ${ry} ${ang} 1 0 ${f1(x + ux * rx)} ${f1(y + uy * rx)}A${rx} ${ry} ${ang} 1 0 ${f1(x - ux * rx)} ${f1(y - uy * rx)}Z`;
  };

  // ---------------------------------------------------------------- the monitor: ECG, left-ventricle volume, valves
  const MON = DATA.mon;
  const trace = [];
  function monitorDraw(clock, b, hr) {
    trace.push([clock, ecgAt(hr, b.u), b.V, b.av > 0.5 ? 1 : 0, b.semi > 0.5 ? 1 : 0]);
    while (trace.length && clock - trace[0][0] > MON.span) trace.shift();
    const xOf = (t) => MON.x0 + ((t - clock + MON.span) / MON.span) * MON.w;
    let e = "";
    let v = "";
    for (const [t, ecg, V] of trace) {
      e += `${e ? "L" : "M"}${f1(xOf(t))} ${f1(MON.ecg.y - ecg * MON.ecg.h)}`;
      v += `${v ? "L" : "M"}${f1(xOf(t))} ${f1(MON.vol.y - ((V - MON.vol.lo) / (MON.vol.hi - MON.vol.lo)) * MON.vol.h)}`;
    }
    const bars = (idx, row) => {
      let d = "";
      let start = null;
      trace.forEach((s, k) => {
        if (s[idx] && start === null) start = s[0];
        if ((!s[idx] || k === trace.length - 1) && start !== null) {
          const x0 = xOf(start);
          const x1 = xOf(s[0]);
          if (x1 - x0 > 0.5) d += `M${f1(x0)} ${row.y}H${f1(x1)}V${row.y + row.h}H${f1(x0)}Z`;
          start = null;
        }
      });
      return d;
    };
    set('[data-part="ecg"]', e);
    set('[data-part="vol"]', v);
    set('[data-part="barIn"]', bars(3, MON.inR));
    set('[data-part="barOut"]', bars(4, MON.outR));
    const last = trace[trace.length - 1];
    const dot = q('[data-part="ecgdot"]');
    dot.setAttribute("cx", f1(MON.x0 + MON.w));
    dot.setAttribute("cy", f1(MON.ecg.y - last[1] * MON.ecg.h));
    const vd = q('[data-part="voldot"]');
    vd.setAttribute("cx", f1(MON.x0 + MON.w));
    vd.setAttribute("cy", f1(MON.vol.y - ((last[2] - MON.vol.lo) / (MON.vol.hi - MON.vol.lo)) * MON.vol.h));
    q('[data-part="volnow"]').textContent = `${Math.round(last[2])} mL`;
  }

  // ---------------------------------------------------------------- one frame
  function draw(b, hr) {
    const sV = Math.sqrt(b.V / 140);
    const contr = Math.min(1, Math.max(0, (b.edv - b.V) / (b.edv - b.esv)));
    def = { d: 15 * contr, sV, sA: b.A, sO: 1 - 0.22 * (1 - sV) };
    const sAt = 0.78 + 0.22 * b.A;
    tubes.length = 0;
    const outline = outer();
    const outerD = smooth(outline);
    set('[data-part="outer"]', outerD);
    set('[data-part="outerClip"]', outerD);
    // the chambers in this phase
    const shapes = { RA: cav(G.RA, C.RA, sAt), LA: cav(G.LA, C.LA, sAt), RV: cav(G.RV, C.RV, sV), LV: cav(G.LV, C.LV, sV) };
    cham = {
      RA: chamber(shapes.RA, 0.78, T.cavR, RIDGE.RA),
      LA: chamber(shapes.LA, 0.72, T.cavL, RIDGE.LA),
      RV: chamber(shapes.RV, 0.5, T.cavR, RIDGE.RV),
      LV: chamber(shapes.LV, 0.82 * (0.85 + 0.15 * sV), T.cavL, RIDGE.LV),
    };
    for (const k of ["RA", "LA", "RV", "LV"]) set(`[data-part="clip${k}"]`, cham[k].outline);
    // vessels: tops fixed, roots ride the valve plane
    vessel("svc", [[[[158, -12], [166, 60], [176, 120], shift([180, 176])], 38, 46, false, false]], "ven");
    vessel("ivc", [[[[84, 384], [108, 330], shift([142, 276])], 40, 38, true, false]], "ven");
    vessel("desc", [[[[470, 110], [480, 170], [486, 260], [492, 380], [494, 470]], 34, 32, false, true]], "art");
    vessel("aorta", [[[shift(G.AORc), shift([342, 196]), [338, 120], [356, 72], [410, 52], [452, 70], [470, 112]], 40, 36, false, false]], "art");
    vessel("branches", [[[[376, 60], [372, 14]], 16, 14, false, true], [[[408, 52], [412, 8]], 16, 14, false, true], [[[440, 62], [456, 18]], 16, 14, false, true]], "art");
    vessel("pt", [[[shift(G.PULc), shift([276, 186]), [284, 140], [318, 126], [362, 120], [404, 128]], 36, 26, false, true]], "ven");
    vessel("rpa", [[[[284, 142], [244, 124], [196, 116], [150, 120]], 26, 22, false, true]], "ven");
    vessel("pv", [[[[566, 168], [520, 168], shift([466, 176])], 18, 18, true, false], [[[566, 214], [520, 214], shift([464, 212])], 18, 18, true, false]], "art");
    // the back half: round outer wall with its surface vessels, and the vessels' back halves
    const back = backHalf(outline);
    const LUMEN = { ven: rgb(VEN), art: rgb(ART) };
    const WALL = rgb(cssc("--a4-vwall", "#f3d9cf"));
    const backOf = (t) => {
      const c = RB.byLength(curve(t.pts), 14);
      const Ae = [];
      const Be = [];
      c.forEach((p, i) => {
        const a = c[Math.max(0, i - 1)];
        const bb = c[Math.min(c.length - 1, i + 1)];
        const l = Math.hypot(bb[0] - a[0], bb[1] - a[1]) || 1;
        const nn = [-(bb[1] - a[1]) / l, (bb[0] - a[0]) / l];
        const w = (t.w0 + (t.w1 - t.w0) * (i / (c.length - 1))) / 2;
        Ae.push([p[0] + nn[0] * w, p[1] + nn[1] * w]);
        Be.push([p[0] - nn[0] * w, p[1] - nn[1] * w]);
      });
      return RB.chords(Ae, Be, { round: 1, nphi: 10, tones: T[t.cls], caps: t.caps, capFill: WALL, lumenFill: LUMEN[t.cls] });
    };
    // the descending aorta runs behind the heart: its back half (and its cut face) go under the heart's back half
    q('[data-part="behind"]').innerHTML = RB.paintObjects(tubes.filter((t) => t.name === "desc").map(backOf));
    q('[data-part="far"]').innerHTML = RB.paintObjects([back.facets, ...tubes.filter((t) => t.name !== "desc").map(backOf)]) + back.surf;
    // inside the cavities: walls and ridges, valves, papillary muscles, chordae and cells
    const tri = avValve(G.TRI[0], G.TRI[1], b.av, C.RV, 27);
    const mit = avValve(G.MIT[0], G.MIT[1], b.av, C.LV, 31);
    const papBase = (pt, k) => {
      const p = shift(scaleAbout(pt, k === "RV" ? C.RV : C.LV, 0.82 + 0.18 * sV));
      return [p[0], p[1], Math.max(4, cham[k].depthAt(p[0], p[1]) * 0.85)];
    };
    const paps = [
      { base: papBase(G.PAPR, "RV"), toward: [tri.ends[0][0] * 0.5 + tri.ends[1][0] * 0.5, tri.ends[0][1] * 0.5 + tri.ends[1][1] * 0.5], r: [8.5, 4], side: "R" },
      { base: papBase(G.PAPL[0], "LV"), toward: mit.ends[0], r: [11, 4.6], side: "L" },
      { base: papBase(G.PAPL[1], "LV"), toward: mit.ends[1], r: [11, 4.6], side: "L" },
    ].map((pm) => {
      const len = Math.hypot(pm.toward[0] - pm.base[0], pm.toward[1] - pm.base[1]);
      const k = 0.42;
      const tip = [pm.base[0] + (pm.toward[0] - pm.base[0]) * k, pm.base[1] + (pm.toward[1] - pm.base[1]) * k - 4, pm.base[2] * 0.5];
      return { ...pm, tip, len };
    });
    let cavSvg = "";
    for (const k of ["RA", "LA", "RV", "LV"]) {
      const ch = cham[k];
      cavSvg += `<g clip-path="url(#a4-clip${k})">${RB.paintObjects([ch.facets])}${ch.ridgeD ? `<path class="a4-ridge-shade" d="${ch.ridgeD}" transform="translate(1.2 1.2)"/><path class="a4-ridge-lit" d="${ch.ridgeD}"/>` : ""}</g>`;
    }
    // the AV orifices: the dark of the junction behind the leaflets, and the half-ring of each annulus
    const orifice = (v) => smooth([v.back[0], [(v.back[0][0] + v.back[1][0]) / 2, (v.back[0][1] + v.back[1][1]) / 2 - 3], v.back[1], v.neck[2], [(v.neck[2][0] + v.neck[3][0]) / 2, (v.neck[2][1] + v.neck[3][1]) / 2 + 3], v.neck[3]], true, 0.6);
    // the orifice behind the leaflets: the far wall of the junction, in its chamber's own shadow tone
    cavSvg += `<path d="${orifice(tri)}" fill="${tone(T.cavR, 0.3)}"/><path d="${orifice(mit)}" fill="${tone(T.cavL, 0.3)}"/>`;
    // deep cells first, then muscles, leaflets and chordae, then the cells nearer the cut
    const chamberCells = cells.filter((c) => c.stage >= 1 && c.stage <= 4);
    const dMax = (c) => (c.stage === 1 ? cham[c.side === "R" ? "RA" : "LA"].D : cham[c.side === "R" ? "RV" : "LV"].D);
    const cellPath = (list, deep) =>
      list
        .filter((c) => (c.d > dMax(c) * 0.32) === deep)
        .map((c) => {
          const p = P3(c.p[0], c.p[1], Math.min(c.d, dMax(c) * 0.9));
          return disc(p[0], p[1], c.a, 4, 2.7);
        })
        .join("");
    const papFacets = paps.flatMap((pm) => column(pm.base, pm.tip, pm.r[0], pm.r[1], T.muscle));
    const leafFacets = [...tri.facets, ...mit.facets].sort((x, y) => x.key - y.key);
    const chordD = [
      ...tri.tips.map((t) => [t, paps[0].tip]),
      ...mit.tips.slice(0, 3).map((t) => [t, paps[1].tip]),
      ...mit.tips.slice(3).map((t) => [t, paps[2].tip]),
    ]
      .map(([a, p]) => [-2.2, 0, 2.2].map((o) => `M${P3(...a).map(f1).join(" ")}L${P3(p[0] + o, p[1] - 3, p[2]).map(f1).join(" ")}`).join(""))
      .join("");
    const side = (s) => chamberCells.filter((c) => c.side === s);
    cavSvg +=
      `<path class="a4-cell a4-cell-ven a4-cell-deep" d="${cellPath(side("R"), true)}"/><path class="a4-cell a4-cell-art a4-cell-deep" d="${cellPath(side("L"), true)}"/>` +
      `<path class="a4-annulus-ring" d="${tri.ring}${mit.ring}"/>` +
      RB.paint(papFacets) +
      leafFacets.map((f) => `<path d="${f.d}" fill="${f.fill}" stroke="${f.fill}" stroke-width="0.6" class="a4-leaf"/>`).join("") +
      `<path class="a4-leaf-edge" d="${tri.edgeD}${mit.edgeD}"/>` +
      `<path class="a4-chordae" d="${chordD}"/>` +
      `<path class="a4-cell a4-cell-ven" d="${cellPath(side("R"), false)}"/><path class="a4-cell a4-cell-art" d="${cellPath(side("L"), false)}"/>`;
    q('[data-part="cav"]').innerHTML = cavSvg;
    // the cut face: muscle with the chamber openings (and the AV orifices) cut out of it
    set('[data-part="holes"]', ["RA", "LA", "RV", "LV"].map((k) => cham[k].outline).join("") + orifice(tri) + orifice(mit));
    set('[data-part="rims"]', ["RA", "LA", "RV", "LV"].map((k) => cham[k].outline).join(""));
    set('[data-part="annuli"]', [...tri.ends, ...mit.ends].map((p) => `M${f1(p[0] - 4.5)} ${f1(p[1])}a4.5 3.2 0 1 0 9 0a4.5 3.2 0 1 0 -9 0Z`).join(""));
    // muscle fibres in the cut wall wrap the ventricles and squeeze with them
    const fib = (seed, c, k, s) => smooth(seed.map((p) => shift(scaleAbout(p, c, k * s))), false, 1);
    const sMid = (sV + def.sO) / 2;
    set('[data-part="fibres"]', [1.12, 1.24, 1.36, 1.48].map((k) => fib(FIB.lv, C.LV, k, sMid)).join("") + [1.1, 1.2].map((k) => fib(FIB.rv, C.RV, k, sMid)).join(""));
    set('[data-part="valves"]', semilunar(b));
    // cells in the vessels (on the cut, in the open half-pipes)
    const vesselCells = cells.filter((c) => c.stage === 0 || c.stage === 5);
    for (const s of ["R", "L"]) {
      const list = vesselCells.filter((c) => c.side === s);
      set(`[data-part="vcells${s}"]`, list.map((c) => { const p = P3(c.p[0], c.p[1], c.d * 0.6); return disc(p[0], p[1], c.a, 4, 2.7); }).join(""));
    }
  }

  // ---------------------------------------------------------------- state, input, tour
  let rateAt = 0;
  let hr = HEART.rates[0];
  let hrShown = hr;
  let t = 0.6;
  let clock = 0;
  let speed = 1;
  function setRate(i, quiet) {
    rateAt = i;
    hr = HEART.rates[i];
    const v = volumesOf(hr);
    out.hr.textContent = `${hr} bpm`;
    out.sv.textContent = `${Math.round(v.sv)} mL`;
    out.co.textContent = `${v.co.toFixed(1)} L/min`;
    line.textContent = DATA.lines[i];
    buttons.forEach((b, j) => {
      b.setAttribute("aria-checked", j === i ? "true" : "false");
      b.tabIndex = j === i ? 0 : -1;
    });
    if (!quiet) status.textContent = `${hr} beats a minute: each beat pushes out about ${Math.round(v.sv)} millilitres, ${v.co.toFixed(1)} litres a minute.`;
  }
  const takeOver = () => {
    touring = false;
    idle = performance.now();
  };
  buttons.forEach((b, i) =>
    b.addEventListener("click", () => {
      takeOver();
      setRate(i);
      if (still.matches) renderStill();
    }),
  );
  fig.querySelector('[data-control="rate"]').addEventListener("keydown", (e) => {
    const i = buttons.indexOf(document.activeElement);
    if (i < 0) return;
    const j = e.key === "ArrowRight" || e.key === "ArrowDown" ? i + 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? i - 1 : null;
    if (j === null) return;
    e.preventDefault();
    const b = buttons[(j + buttons.length) % buttons.length];
    b.focus();
    b.click();
  });
  slowBtn.addEventListener("click", () => {
    speed = speed === 1 ? 0.25 : 1;
    slowBtn.setAttribute("aria-pressed", speed < 1 ? "true" : "false");
    slowBtn.textContent = speed < 1 ? "Real time" : "Slow";
  });
  function renderStill() {
    // mid-ejection: aortic and pulmonary valves open, the base pulled down, the traces filled in
    hrShown = hr;
    const T0 = timingOf(hr);
    const u = T0.ta + HEART.ivc + T0.ts * 0.35;
    trace.length = 0;
    cells.length = 0;
    draw(beatAt(hr, u), hr);
    for (let i = 0; i < 26; i++) spawn(i % 2 ? "R" : "L");
    for (let i = 0; i < 90; i++) stepCells(beatAt(hr, u - 0.9 + i * 0.01), 0.012, hr);
    for (let i = 0; i <= 140; i++) {
      const tt = -MON.span + (i / 140) * MON.span;
      const bb = beatAt(hr, u + tt);
      trace.push([tt, ecgAt(hr, bb.u), bb.V, bb.av > 0.5 ? 1 : 0, bb.semi > 0.5 ? 1 : 0]);
    }
    trace.pop();
    draw(beatAt(hr, u), hr);
    monitorDraw(0, beatAt(hr, u), hr);
  }
  let touring = true;
  let idle = -1e9;
  let tourClock = 0;
  let raf = 0;
  let last = 0;
  let visible = true;
  function tick(now) {
    raf = 0;
    if (!visible || still.matches) return;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016) * speed;
    last = now;
    if (!touring && now - idle > 9000) touring = true;
    if (touring && (tourClock += dt / speed) > 7) {
      tourClock = 0;
      setRate((rateAt + 1) % HEART.rates.length, true);
    }
    // the rate eases to its new value over a beat or two (phase kept continuous)
    const T0 = 60 / hrShown;
    const phase = (t % T0) / T0;
    hrShown += (hr - hrShown) * (1 - Math.exp(-dt * 2.5));
    const T1 = 60 / hrShown;
    t = phase * T1 + dt;
    clock += dt;
    const b = beatAt(hrShown, t);
    stepCells(b, dt, hrShown);
    draw(b, hrShown);
    monitorDraw(clock, b, hrShown);
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
  setRate(0, true);
  if (still.matches) renderStill();
  else {
    draw(beatAt(hr, t), hr);
    for (let i = 0; i < 160; i++) {
      t += 1 / 60;
      stepCells(beatAt(hr, t), 1 / 60, hr);
    }
    draw(beatAt(hr, t), hr);
    start();
  }
}

class Fig extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    const root = this.attachShadow({ mode: "open" });
    const theme = this.getAttribute("theme") === "dark" ? "dark" : "light";
    root.innerHTML = "<style>" + "\n.iso{\n  --anatomy-page:#0b0b0b;--anatomy-card:#131313;--anatomy-text:#a3a3a3;--anatomy-strong:#e6e6e6;--anatomy-muted:#6e6e6e;\n  --anatomy-paper:#131313;--anatomy-face:#1b1b1b;--anatomy-top:#1c1c1c;\n  --anatomy-shade-0:#0f0f0f;--anatomy-shade-1:#121212;--anatomy-shade-2:#151515;--anatomy-shade-3:#181818;\n  --anatomy-lit-top:#262626;--anatomy-lit-shade:#1d1d1d;\n  --anatomy-hi:#d4d4d4;--anatomy-mid:#6a6a6a;--anatomy-lo:#3e3e3e;--anatomy-faint:#2a2a2a;--anatomy-lit:#ffffff;\n  --anatomy-halo:#050505;--anatomy-halo-opacity:.9;--anatomy-dot:#e6e6e6;\n  --anatomy-red:#ff6b6b;--anatomy-green:#6be0a0;--anatomy-blue:#6b9bff;\n  --anatomy-weight:.6px;--anatomy-ease:cubic-bezier(.32,.72,0,1);\n  --anatomy-mono:ui-monospace,\"SF Mono\",Menlo,Consolas,monospace;\n  --anatomy-lift:inset 0 1px 0 0 #ffffff0a,inset 0 0 0 1px #ffffff06,0 0 0 1px #00000026,0 1px 1px -.5px #00000014,0 3px 3px -1.5px #00000014,0 6px 6px -3px #00000014,0 12px 12px -6px #00000014;\n}\n.iso[data-theme=\"light\"]{\n  --anatomy-page:#f2f2ef;--anatomy-card:#fbfbfa;--anatomy-text:#57575a;--anatomy-strong:#18181a;--anatomy-muted:#8c8c90;\n  --anatomy-paper:#fbfbfa;--anatomy-face:#ffffff;--anatomy-top:#ffffff;\n  --anatomy-shade-0:#dcdcd9;--anatomy-shade-1:#e5e5e2;--anatomy-shade-2:#ededea;--anatomy-shade-3:#f4f4f1;\n  --anatomy-lit-top:#ffffff;--anatomy-lit-shade:#eeeeeb;\n  --anatomy-hi:#26262a;--anatomy-mid:#8a8a8f;--anatomy-lo:#b4b4b8;--anatomy-faint:#d4d4d6;--anatomy-lit:#000000;\n  --anatomy-halo:#8a8a80;--anatomy-halo-opacity:.32;--anatomy-dot:#3a3a3e;\n  --anatomy-red:#e5484d;--anatomy-green:#30a46c;--anatomy-blue:#3e63dd;\n  --anatomy-lift:inset 0 1px 0 0 #ffffff,0 0 0 1px #0000000f,0 1px 1px -.5px #0000000a,0 3px 3px -1.5px #0000000a,0 6px 6px -3px #0000000a,0 12px 12px -6px #0000000a;\n}\n.iso-svg{display:block;width:100%;height:auto;overflow:visible}\n.iso-svg path,.iso-svg circle{vector-effect:non-scaling-stroke}\n.iso-fill{fill:var(--anatomy-paper);stroke:none}\n.iso-solid[data-lit]>.iso-fill{fill:var(--anatomy-face)}\n.iso-shade,.iso-top{stroke:none}\n.iso-shade[data-shade=\"0\"]{fill:var(--anatomy-shade-0)}\n.iso-shade[data-shade=\"1\"]{fill:var(--anatomy-shade-1)}\n.iso-shade[data-shade=\"2\"]{fill:var(--anatomy-shade-2)}\n.iso-shade[data-shade=\"3\"]{fill:var(--anatomy-shade-3)}\n.iso-top{fill:var(--anatomy-top)}\n.iso-solid[data-lit]>.iso-top{fill:var(--anatomy-lit-top)}\n.iso-solid[data-lit]>.iso-shade{fill:var(--anatomy-lit-shade)}\n.iso-solid[data-seamless]>.iso-shade,.iso-solid[data-seamless]>.iso-top{stroke-width:.4;stroke-linejoin:round}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"0\"]{stroke:var(--anatomy-shade-0)}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"1\"]{stroke:var(--anatomy-shade-1)}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"2\"]{stroke:var(--anatomy-shade-2)}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"3\"]{stroke:var(--anatomy-shade-3)}\n.iso-solid[data-seamless]>.iso-top{stroke:var(--anatomy-top)}\n.iso-solid[data-seamless][data-lit]>.iso-top{stroke:var(--anatomy-lit-top)}\n.iso-solid[data-seamless][data-lit]>.iso-shade{stroke:var(--anatomy-lit-shade)}\n.iso-solid[data-lit]>.iso-edge{stroke:var(--anatomy-lit)}\n.iso-halo{fill:var(--anatomy-halo);stroke:none;filter:blur(9px);opacity:var(--anatomy-halo-opacity);transform:translateY(3px)}\n.iso-line{fill:none;stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight);stroke-linecap:round;stroke-linejoin:round}\n.iso-line[data-tone=\"hi\"]{stroke:var(--anatomy-hi)}\n.iso-line[data-tone=\"mid\"]{stroke:var(--anatomy-mid)}\n.iso-line[data-tone=\"lo\"]{stroke:var(--anatomy-lo)}\n.iso-line[data-tone=\"faint\"]{stroke:var(--anatomy-faint)}\n.iso-line[data-tone=\"lit\"]{stroke:var(--anatomy-lit)}\n.iso-line[data-tone=\"red\"]{stroke:var(--anatomy-red)}\n.iso-line[data-tone=\"green\"]{stroke:var(--anatomy-green)}\n.iso-line[data-tone=\"blue\"]{stroke:var(--anatomy-blue)}\n.iso-line[data-dotted]{stroke-dasharray:.01 3.5;stroke-width:1}\n.iso-line[data-dashed]{stroke-dasharray:3 3}\n.iso-line[data-flow]{stroke-dasharray:2 6}\n.iso-wire-end{fill:var(--anatomy-paper);stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight)}\n.iso-wire[data-tone=\"hi\"] .iso-wire-end{stroke:var(--anatomy-hi)}\n.iso-wire[data-tone=\"mid\"] .iso-wire-end{stroke:var(--anatomy-mid)}\n.iso-wire[data-tone=\"faint\"] .iso-wire-end{stroke:var(--anatomy-faint)}\n.iso-wire[data-tone=\"lit\"] .iso-wire-end{stroke:var(--anatomy-lit)}\n.iso-dots circle{fill:var(--anatomy-dot);stroke:none;opacity:.32}\n.iso-dots[data-tone=\"hi\"] circle{opacity:.85}\n.iso-dots[data-tone=\"mid\"] circle{opacity:.45}\n.iso-dots[data-tone=\"lo\"] circle{opacity:.22}\n.iso-dots[data-tone=\"faint\"] circle{opacity:.12}\n.iso-face-text{fill:var(--anatomy-mid);font-family:var(--anatomy-mono);letter-spacing:.04em}\n.iso-face-text[data-tone=\"hi\"]{fill:var(--anatomy-hi)}\n.iso-face-text[data-tone=\"lo\"]{fill:var(--anatomy-lo)}\n.iso-face-text[data-tone=\"faint\"]{fill:var(--anatomy-faint)}\n.tb-body{fill:var(--anatomy-shade-2);stroke:none}\n.tb-shine{fill:var(--anatomy-top);stroke:none}\n.tb-shade{fill:var(--anatomy-shade-0);stroke:none}\n.tb-ring{fill:none;stroke:var(--anatomy-lo);stroke-width:.45;stroke-linecap:butt;stroke-linejoin:round}\n.tb-ring[data-tone=\"mid\"]{stroke:var(--anatomy-mid)}\n.tb-ring[data-tone=\"faint\"]{stroke:var(--anatomy-faint)}\n.tb-ring[data-tone=\"hi\"]{stroke:var(--anatomy-hi)}\n@keyframes iso-flow{to{stroke-dashoffset:-32}}\n@keyframes iso-pulse{0%,100%{opacity:.18}12%{opacity:1}40%{opacity:.18}}\n.iso-line[data-flow]{animation:iso-flow 1600ms linear infinite}\n.iso-dots circle[data-pulse]{animation:iso-pulse 1600ms steps(1,end) infinite;animation-delay:var(--pulse-at,0ms)}\n.iso-figure{margin:32px 0 36px}\n.iso-plate{position:relative;padding:52px 24px;border-radius:0;background:var(--anatomy-card);box-shadow:0 0 0 1px var(--anatomy-mid);--anatomy-paper:var(--anatomy-card)}\n.iso-plate-corners{position:absolute;inset:18px 20px;pointer-events:none}\n.iso-plate-corner{position:absolute;color:var(--anatomy-muted);font-family:var(--anatomy-mono);font-size:10.5px;line-height:1;letter-spacing:.04em;white-space:nowrap}\n.iso-plate-corner[data-corner=\"fig\"]{top:0;left:0;color:var(--anatomy-text)}\n.iso-plate-corner[data-corner=\"title\"]{top:0;right:0;text-transform:uppercase;letter-spacing:.1em}\n.iso-plate-corner[data-corner=\"hint\"]{bottom:0;left:0;text-transform:uppercase;letter-spacing:.1em}\n.iso-plate-corner[data-corner=\"readout\"]{right:0;bottom:0;color:var(--anatomy-text);font-variant-numeric:tabular-nums}\n.iso-plate .iso-svg{margin:0 auto}\n.iso-legend{display:grid;gap:8px;margin-top:12px;color:var(--anatomy-muted);font-size:13px;line-height:1.55}\n.iso-keys{display:flex;flex-wrap:wrap;gap:6px 18px}\n.iso-key{display:inline-flex;align-items:center;gap:7px}\n.iso-swatch{width:16px;height:10px;flex:none;overflow:visible}\n.iso-swatch path{fill:none;stroke:var(--anatomy-hi);stroke-width:1;vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round}\n.iso-swatch[data-mark=\"raised\"] path,.iso-swatch[data-mark=\"flat\"] path{stroke:var(--anatomy-mid)}\n.iso-swatch[data-mark=\"lit\"] path{stroke:var(--anatomy-lit)}\n.iso-swatch[data-mark=\"dim\"] path{stroke:var(--anatomy-lo)}\n.iso-swatch[data-mark=\"dotted\"] path{stroke-dasharray:.01 3;stroke-width:1.4}\n.iso-swatch[data-mark=\"dashed\"] path{stroke-dasharray:3 2.5}\n.iso-swatch[data-mark=\"red\"] path{stroke:var(--anatomy-red)}\n.iso-swatch[data-mark=\"green\"] path{stroke:var(--anatomy-green)}\n.iso-swatch[data-mark=\"blue\"] path{stroke:var(--anatomy-blue)}\n.iso-swatch-crease{stroke:var(--anatomy-lo)!important}\n@media (max-width:560px){.iso-plate{padding:48px 12px 70px}.iso-plate-corner[data-corner=\"hint\"]{bottom:18px}}\n@media (prefers-reduced-motion:reduce){.iso-line[data-flow],.iso-dots circle[data-pulse]{animation:none}}\n/*\n * Optimal theme for Anatomy figures.\n *\n * Load AFTER the kit's ISO_CSS. Put `class=\"iso optimal\"` on the wrapper:\n *   - no data-theme  -> \"Forest night\"  (exam-room TV, dark)\n *   - data-theme=\"light\" -> \"Cream\"     (beoptimal.ca, the primary target)\n *\n * Values come from the live site (beoptimal-landing src/index.css), the\n * Performance package design and the ALE visualizer spec. The kit's grey\n * ramps are warmed so solids sit on the site's cream paper, and the single\n * \"lit\" accent is Optimal forest green instead of pure black/white.\n */\n\n.iso.optimal {\n  /* Forest night (dark) */\n  --anatomy-page: #152511;\n  --anatomy-card: #1c3118;\n  --anatomy-text: #c9cdbf;\n  --anatomy-strong: #fffcf7;\n  --anatomy-muted: #8e9884;\n  --anatomy-paper: #1c3118;\n  --anatomy-face: #253821;\n  --anatomy-top: #283c24;\n  --anatomy-shade-0: #172812;\n  --anatomy-shade-1: #1a2c16;\n  --anatomy-shade-2: #1e321a;\n  --anatomy-shade-3: #22371e;\n  --anatomy-lit-top: #34492f;\n  --anatomy-lit-shade: #2a3f26;\n  --anatomy-hi: #e9e6dc;\n  --anatomy-mid: #7e8a74;\n  --anatomy-lo: #4d5c46;\n  --anatomy-faint: #33452e;\n  --anatomy-lit: #fffcf7;\n  --anatomy-halo: #0b1508;\n  --anatomy-halo-opacity: 0.9;\n  --anatomy-dot: #e9e6dc;\n  --anatomy-red: #e0745f;\n  --anatomy-green: #8cc67f;\n  --anatomy-blue: #7fa8d9;\n  --anatomy-mono: \"JetBrains Mono\", ui-monospace, \"SF Mono\", Menlo, Consolas, monospace;\n\n  /* Optimal extras (use sparingly; colour only when colour is the subject) */\n  --opt-display: \"Castoro\", Georgia, serif;\n  --opt-ui: \"Public Sans\", system-ui, sans-serif;\n  --opt-forest: #2c4e25;\n  --opt-forest-light: #519044;\n  --opt-sage: #5e7a59;\n  --opt-borderline: #c97b2d;\n  --opt-out: #b3402f;\n  --opt-heat: #ff9776;\n}\n\n.iso.optimal[data-theme=\"light\"] {\n  /* Cream (light) */\n  --anatomy-page: #fef8f1;\n  --anatomy-card: #fffcf7;\n  --anatomy-text: #3e3d39;\n  --anatomy-strong: #252525;\n  --anatomy-muted: #76736d;\n  --anatomy-paper: #fffcf7;\n  --anatomy-face: #fffefb;\n  --anatomy-top: #fffefb;\n  --anatomy-shade-0: #ddd7cc;\n  --anatomy-shade-1: #e7e2d9;\n  --anatomy-shade-2: #f0ede5;\n  --anatomy-shade-3: #f6f3ec;\n  --anatomy-lit-top: #fffefb;\n  --anatomy-lit-shade: #efebe2;\n  --anatomy-hi: #252525;\n  --anatomy-mid: #8a867e;\n  --anatomy-lo: #b9b4aa;\n  --anatomy-faint: #d9d3c8;\n  --anatomy-lit: #2c4e25;\n  --anatomy-halo: #8a8070;\n  --anatomy-halo-opacity: 0.3;\n  --anatomy-dot: #3a3833;\n  --anatomy-red: #b3402f;\n  --anatomy-green: #3f7a35;\n  --anatomy-blue: #3e6a8f;\n}\n\n/* Card typography: brand fonts for titles and readouts, kit mono for plate corners */\n.iso.optimal .iso-plate-title,\n.iso.optimal [data-role=\"title\"] {\n  font-family: var(--opt-display);\n  letter-spacing: -0.02em;\n}\n.iso.optimal [data-role=\"readout\"],\n.iso.optimal .iso-readout {\n  font-family: var(--opt-ui);\n  font-feature-settings: \"tnum\" 1, \"ss01\" 1;\n}\n\n/*\n * Card layout for Optimal figures (shared/page.mjs `plate`).\n * Phone first: the drawing, then a row of real buttons (>=44 px), then a footer\n * where the hint and the readout wrap instead of overlapping at 320 px.\n */\n.iso.optimal {\n  --opt-rule: rgba(233, 230, 220, 0.16);\n  --opt-btn: rgba(233, 230, 220, 0.06);\n  --opt-btn-on: #e9e6dc;\n  --opt-btn-on-text: #1c3118;\n  --opt-title: #fffcf7;\n  --opt-fig: #8cc67f;\n  --opt-heat-ink: #ff9776;\n  --opt-heat-glow: rgba(255, 151, 118, 0.55);\n  --opt-heat-wash: rgba(255, 151, 118, 0.16);\n  --opt-cold-ink: #9cc3e6;\n}\n.iso.optimal[data-theme=\"light\"] {\n  --opt-rule: rgba(44, 78, 37, 0.2);\n  --opt-btn: #fffcf7;\n  --opt-btn-on: #2c4e25;\n  --opt-btn-on-text: #fffcf7;\n  --opt-title: #2c4e25;\n  --opt-fig: #5e7a59;\n  --opt-heat-ink: #c8552e;\n  --opt-heat-glow: rgba(232, 108, 64, 0.42);\n  --opt-heat-wash: rgba(255, 151, 118, 0.22);\n  --opt-cold-ink: #3e6a8f;\n}\n.iso.optimal .opt-plate {\n  padding: 52px 24px 20px;\n  box-shadow: 0 0 0 1px var(--opt-rule);\n  border-radius: 2px;\n}\n.iso.optimal .iso-plate-corner[data-corner=\"fig\"] {\n  font-family: var(--opt-display);\n  font-style: italic;\n  font-size: 15px;\n  letter-spacing: 0;\n  color: var(--opt-fig);\n  top: -2px;\n}\n.iso.optimal .iso-plate-corner[data-corner=\"title\"] {\n  font-family: var(--opt-display);\n  font-size: 17px;\n  text-transform: none;\n  letter-spacing: -0.01em;\n  color: var(--opt-title);\n  top: -4px;\n}\n.iso.optimal .opt-controls {\n  display: flex;\n  flex-wrap: wrap;\n  justify-content: center;\n  gap: 8px 12px;\n  margin: 10px 0 0;\n}\n.iso.optimal .opt-seg {\n  display: inline-flex;\n  border-radius: 999px;\n  box-shadow: inset 0 0 0 1px var(--opt-rule);\n  padding: 3px;\n  gap: 2px;\n  max-width: 100%;\n}\n.iso.optimal .opt-seg-btn {\n  appearance: none;\n  border: 0;\n  margin: 0;\n  min-height: 44px;\n  min-width: min-content; /* never shrink a label below its longest word (with the padding, always ≥ 44 px) */\n  padding: 0 16px;\n  border-radius: 999px;\n  background: transparent;\n  color: var(--anatomy-text);\n  font: 500 14px/1.1 var(--opt-ui);\n  letter-spacing: 0;\n  cursor: pointer;\n  touch-action: manipulation;\n  -webkit-tap-highlight-color: transparent;\n  transition: background-color 240ms var(--anatomy-ease), color 240ms var(--anatomy-ease);\n}\n.iso.optimal .opt-seg-btn[aria-checked=\"true\"] {\n  background: var(--opt-btn-on);\n  color: var(--opt-btn-on-text);\n}\n.iso.optimal .opt-seg-btn:focus-visible {\n  outline: 2px solid var(--opt-fig);\n  outline-offset: 2px;\n}\n.iso.optimal .opt-foot {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: flex-end;\n  justify-content: space-between;\n  gap: 10px 20px;\n  margin-top: 16px;\n}\n.iso.optimal .opt-hint {\n  font-family: var(--anatomy-mono);\n  font-size: 10.5px;\n  line-height: 1.4;\n  letter-spacing: 0.1em;\n  text-transform: uppercase;\n  color: var(--anatomy-muted);\n  flex: 1 1 160px;\n  min-width: 0;\n}\n.iso.optimal .opt-readout {\n  display: grid;\n  grid-auto-flow: column;\n  gap: 4px 18px;\n  margin: 0;\n  font-family: var(--opt-ui);\n  font-feature-settings: \"tnum\" 1;\n}\n.iso.optimal .opt-stat { margin: 0; min-width: 0; }\n.iso.optimal .opt-stat dt {\n  font-size: 10px;\n  font-weight: 600;\n  letter-spacing: 0.12em;\n  text-transform: uppercase;\n  color: var(--anatomy-muted);\n  white-space: nowrap;\n}\n.iso.optimal .opt-stat dd {\n  margin: 1px 0 0;\n  font-size: 15px;\n  font-weight: 500;\n  color: var(--anatomy-strong);\n  white-space: nowrap;\n}\n.iso.optimal .iso-legend { font-family: var(--opt-ui); font-size: 13.5px; }\n.iso.optimal .iso-caption { color: var(--anatomy-text); }\n.iso.optimal .iso-caption em { font-style: italic; }\n.iso.optimal .iso-swatch[data-mark=\"heat\"] path { stroke: var(--opt-heat-ink); stroke-width: 2; }\n.iso.optimal .iso-stage { outline: none; border-radius: 4px; touch-action: pan-y; -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none; }\n.iso.optimal .iso-stage:focus-visible { outline: 1px solid var(--anatomy-muted); outline-offset: 6px; }\n@media (max-width: 560px) {\n  .iso.optimal .opt-plate { padding: 44px 10px 14px; }\n  .iso.optimal .iso-plate-corners { inset: 16px 12px; }\n  .iso.optimal .opt-readout { grid-auto-flow: row; grid-template-columns: repeat(4, minmax(0, auto)); width: 100%; justify-content: space-between; gap: 4px 10px; order: -1; }\n  .iso.optimal .opt-stat dd { font-size: 14px; }\n  /* a long label wraps onto two lines instead of running into its neighbour; values stay on one baseline */\n  .iso.optimal .opt-stat { display: flex; flex-direction: column; justify-content: space-between; }\n  .iso.optimal .opt-stat dt { white-space: normal; line-height: 1.25; }\n  .iso.optimal .opt-seg-btn { padding: 0 12px; font-size: 13.5px; }\n}\n@media (max-width: 350px) {\n  .iso.optimal .opt-seg-btn { padding: 0 7px; font-size: 12.5px; }\n  .iso.optimal .opt-stat dt { font-size: 9px; letter-spacing: 0.08em; }\n  .iso.optimal .opt-stat dd { font-size: 13px; }\n}\n\n:host{display:block}\n.opt-host{background:transparent;color:var(--anatomy-text);font:15px/1.6 var(--opt-ui);-webkit-font-smoothing:antialiased}\n.opt-host *{box-sizing:border-box}\n.opt-host .iso-figure{margin:0}\n/* A4 · the heart: muscle in a soft rose gradient, textbook blue and red pools, cream valves. */\n.iso.optimal {\n  --a4-m0: #9a4a3f; --a4-m1: #7a3530; --a4-m2: #5e2622; --a4-edge: #e2a99a;\n  --a4-ven: #4f5a97; --a4-art: #b9473c; --a4-ven-cell: #a9b4ec; --a4-art-cell: #ffc2b4;\n  --a4-valve: #f3e6d6; --a4-valve-edge: #c9a99a; --a4-chord: #e9d8c6; --a4-wall: #e2a99a;\n  --a4-g0: rgba(255, 151, 118, 0.22); --a4-g1: rgba(255, 151, 118, 0);\n  --a4-ecg-bg: #0f1b0c; --a4-ecg: #c9e3c1; --a4-ecg-dim: #33452e;\n  --a4-ven-pal: #d6dcff; --a4-art-pal: #ffe4dc; --a4-sheen: rgba(255, 240, 232, 0.22); --a4-lumen-ven: #262c55; --a4-lumen-art: #5e1c18; --a4-fibre: rgba(255, 200, 186, 0.16);\n}\n.iso.optimal[data-theme=\"light\"] {\n  --a4-m0: #e7a594; --a4-m1: #cf7f6e; --a4-m2: #b0604f; --a4-edge: #7a3a30;\n  --a4-ven: #8892cc; --a4-art: #dc6656; --a4-ven-cell: #3f4a96; --a4-art-cell: #8f261c;\n  --a4-valve: #fffaf2; --a4-valve-edge: #8a6a5e; --a4-chord: #8a6a5e; --a4-wall: #7a3a30;\n  --a4-g0: rgba(220, 102, 86, 0.18); --a4-g1: rgba(220, 102, 86, 0);\n  --a4-ecg-bg: #1d2a1a; --a4-ecg: #d9efd2; --a4-ecg-dim: #3d5436;\n  --a4-ven-pal: #7a84cf; --a4-art-pal: #d4604f; --a4-sheen: rgba(255, 255, 255, 0.4); --a4-lumen-ven: #3a427f; --a4-lumen-art: #7d2219; --a4-fibre: rgba(122, 58, 48, 0.2);\n}\n.a4-svg path, .a4-svg rect, .a4-svg circle { vector-effect: non-scaling-stroke; }\n.a4-m0 { stop-color: var(--a4-m0); } .a4-m1 { stop-color: var(--a4-m1); } .a4-m2 { stop-color: var(--a4-m2); }\n.a4-g0 { stop-color: var(--a4-g0); } .a4-g1 { stop-color: var(--a4-g1); }\n.a4-muscle { stroke: var(--a4-edge); stroke-width: 1.6; }\n.a4-pool { stroke: var(--a4-edge); stroke-width: 1.1; }\n.a4-ven { fill: var(--a4-ven); }\n.a4-art { fill: var(--a4-art); }\n.a4-vessel { stroke: var(--a4-wall); stroke-width: 1.4; stroke-linejoin: round; }\n.a4-valve { fill: var(--a4-valve); stroke: var(--a4-valve-edge); stroke-width: 0.9; }\n.a4-chordae { fill: none; stroke: var(--a4-chord); stroke-width: 0.7; opacity: 0.85; }\n.a4-pap { fill: url(#a4-muscle); stroke: var(--a4-edge); stroke-width: 1; }\n.a4-cell { stroke: rgba(0, 0, 0, 0.25); stroke-width: 0.5; }\n.a4-cell-ven { fill: var(--a4-ven-cell); } .a4-pal-ven { fill: var(--a4-ven-pal); }\n.a4-cell-art { fill: var(--a4-art-cell); } .a4-pal-art { fill: var(--a4-art-pal); }\n.a4-sheen { fill: none; stroke: var(--a4-sheen); stroke-linecap: round; }\n.a4-cap { stroke: var(--a4-wall); stroke-width: 1.2; }\n.a4-cap-ven { fill: var(--a4-ven); } .a4-cap-art { fill: var(--a4-art); }\n.a4-lumen-ven { fill: var(--a4-lumen-ven); } .a4-lumen-art { fill: var(--a4-lumen-art); }\n.a4-fibre { fill: none; stroke: var(--a4-fibre); stroke-width: 1.3; stroke-linecap: round; }\n.a4-glow { pointer-events: none; }\n.a4-ecg-bg { fill: var(--a4-ecg-bg); }\n.a4-ecg-base { fill: none; stroke: var(--a4-ecg-dim); stroke-width: 0.8; stroke-dasharray: 2 3; }\n.a4-ecg { fill: none; stroke: var(--a4-ecg); stroke-width: 1.6; stroke-linejoin: round; stroke-linecap: round; }\n.a4-ecg-dot { fill: var(--a4-ecg); }\n.a4-row { display: flex; align-items: center; gap: 12px; margin: 10px 4px 0; }\n.a4-scene { flex: 1; margin: 0; font: 500 14px/1.4 var(--opt-ui); color: var(--anatomy-text); min-height: 2.8em; }\n.a4-slow { appearance: none; border: 0; min-height: 44px; min-width: 64px; padding: 0 14px; border-radius: 999px; background: transparent; box-shadow: inset 0 0 0 1px var(--opt-rule); color: var(--anatomy-text); font: 500 14px/1 var(--opt-ui); cursor: pointer; touch-action: manipulation; }\n.a4-slow[aria-pressed=\"true\"] { background: var(--opt-btn-on); color: var(--opt-btn-on-text); box-shadow: none; }\n.a4-slow:focus-visible { outline: 2px solid var(--opt-fig); outline-offset: 2px; }\n.a4-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }\n.a4-par { display: block; margin-top: 6px; }\n.a4-par:first-child { margin-top: 0; }\n.a4-par small { font-size: 12.5px; color: var(--anatomy-muted); }\n\n/* round 2: cut open front to back; vessels show wall bands and blood, the back half rounds away behind */\n.iso.optimal { --a4-vwall: #a8695f; }\n.iso.optimal[data-theme=\"light\"] { --a4-vwall: #f3d9cf; }\n.a4-front .a4-vessel { fill: var(--a4-vwall); }\n.a4-front .a4-lumen-cut.a4-lumen-ven { fill: var(--a4-ven); }\n.a4-front .a4-lumen-cut.a4-lumen-art { fill: var(--a4-art); }\n.a4-lumen-cut { stroke: var(--a4-wall); stroke-width: 0.5; stroke-opacity: 0.5; }\n.a4-front .a4-vessel-fill { stroke: none; }\n.a4-vessel-edge { fill: none; stroke: var(--a4-wall); stroke-width: 1.4; stroke-linejoin: round; }\n.a4-front .a4-lumen-cut { stroke: none; }\n\n/* round 4: the heart in 3-D: cut muscle, deep chambers, papillary muscles, 3-D leaflets, a vessel-lined back half */\n.iso.optimal { --a4-c0: #a9564d; --a4-c1: #7c3631; --a4-neck: #2c1012; --a4-fat: #b8963e; --a4-ridge-lit: rgba(255, 220, 210, 0.16); --a4-ridge-shade: rgba(0, 0, 0, 0.32); --a4-lumen-lit: rgba(255, 235, 228, 0.12); --a4-bar-in: #9ad38d; --a4-bar-out: #ffb86b; --a4-vol: #ff8b7b; }\n.iso.optimal[data-theme=\"light\"] { --a4-c0: #eca898; --a4-c1: #d07f6d; --a4-neck: #8c4239; --a4-fat: #f2d27a; --a4-ridge-lit: rgba(255, 245, 240, 0.38); --a4-ridge-shade: rgba(90, 30, 25, 0.22); --a4-lumen-lit: rgba(255, 255, 255, 0.24); --a4-bar-in: #9ad38d; --a4-bar-out: #ffb86b; --a4-vol: #ff9a8b; }\n.a4-c0 { stop-color: var(--a4-c0); } .a4-c1 { stop-color: var(--a4-c1); }\n.a4-cut { stroke: var(--a4-edge); stroke-width: 1.6; }\n.a4-open-rim { fill: none; stroke: var(--a4-edge); stroke-width: 1.2; stroke-linejoin: round; opacity: 0.85; }\n.a4-annulus { fill: var(--a4-valve); stroke: var(--a4-valve-edge); stroke-width: 0.8; }\n.a4-annulus-ring { fill: none; stroke: var(--a4-valve); stroke-width: 3.2; stroke-linecap: round; opacity: 0.9; }\n.a4-neck { fill: var(--a4-neck); }\n.a4-ridge-shade { fill: none; stroke: var(--a4-ridge-shade); stroke-width: 4.2; stroke-linecap: round; stroke-linejoin: round; }\n.a4-ridge-lit { fill: none; stroke: var(--a4-ridge-lit); stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }\n.a4-leaf { stroke-linejoin: round; }\n.a4-leaf-edge { fill: none; stroke: var(--a4-valve-edge); stroke-width: 1.1; stroke-linecap: round; stroke-linejoin: round; opacity: 0.8; }\n.a4-cell-deep { opacity: 0.5; }\n.a4-epi-fat { opacity: 0.88; }\n.a4-cor { fill: none; stroke-width: 3.2; stroke-linecap: round; stroke-linejoin: round; }\n.a4-cor-edge { fill: none; stroke: rgba(0, 0, 0, 0.22); stroke-width: 5.2; stroke-linecap: round; stroke-linejoin: round; }\n.a4-cor-a { stroke-width: 2.6; }\n.a4-cor-edge.a4-cor-edge-a { stroke-width: 4.4; }\n.a4-lumen-lit { stroke: none; }\n.a4-lumen-lit-ven, .a4-lumen-lit-art { fill: var(--a4-lumen-lit); }\n.a4-mon-label { fill: var(--a4-ecg); font: 600 17px/1 var(--opt-ui); opacity: 0.85; }\n.a4-mon-num { fill: var(--a4-ecg); font: 500 17px/1 var(--opt-ui); font-variant-numeric: tabular-nums; }\n.a4-bar-track { fill: var(--a4-ecg-dim); opacity: 0.55; }\n.a4-bar-in { fill: var(--a4-bar-in); }\n.a4-bar-out { fill: var(--a4-bar-out); }\n.a4-vol { fill: none; stroke: var(--a4-vol); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }\n.a4-vol-dot { fill: var(--a4-vol); }\n" + "</style><div class=\"iso optimal opt-host\" data-theme=\"" + theme + "\">" + "<figure class=\"iso-figure opt-figure \"><div class=\"iso-plate opt-plate\"><div class=\"iso-plate-corners\" aria-hidden=\"true\"><span class=\"iso-plate-corner\" data-corner=\"fig\">A4</span><span class=\"iso-plate-corner\" data-corner=\"title\">The beating heart</span></div><div class=\"iso-stage a4-stage\"><svg class=\"iso-svg a4-svg\" viewBox=\"0 0 600 782\" role=\"img\" aria-label=\"The heart cut open front to back and seen in 3-D, beating: deep chambers with ridged walls, papillary muscles and cords holding the valve leaflets, and a round back half lined with its own vessels. Oxygen-poor blood (blue) comes in through the venae cavae to the right atrium, passes the tricuspid valve into the right ventricle and leaves through the pulmonary valve for the lungs. Oxygen-rich blood (red) returns through the pulmonary veins to the left atrium, passes the mitral valve into the thick-walled left ventricle and leaves through the aortic valve into the aorta. A monitor underneath runs the ECG, the left ventricle's volume and when the valves are open.\">\n<defs>\n  <radialGradient id=\"a4-muscle\" cx=\"38%\" cy=\"34%\" r=\"72%\"><stop offset=\"0\" class=\"a4-m0\"/><stop offset=\"0.65\" class=\"a4-m1\"/><stop offset=\"1\" class=\"a4-m2\"/></radialGradient>\n  <radialGradient id=\"a4-glow-g\" cx=\"50%\" cy=\"50%\" r=\"50%\"><stop offset=\"0\" class=\"a4-g0\"/><stop offset=\"1\" class=\"a4-g1\"/></radialGradient>\n</defs>\n<g transform=\"matrix(0.8672 0.1875 0.0000 0.8972 -14.07 12.83)\"><g data-part=\"behind\"></g><g data-v=\"desc\"></g></g>\n<g transform=\"matrix(0.8672 0.1875 0.0000 0.8972 -14.07 12.83)\"><g class=\"a4-far\" data-part=\"far\"></g></g>\n<g class=\"a4-front\" transform=\"matrix(0.8672 0.1875 0.0000 0.8972 -14.07 12.83)\">\n<defs>\n  <mask id=\"a4-cutmask\" maskUnits=\"userSpaceOnUse\" x=\"-200\" y=\"-200\" width=\"1000\" height=\"1000\"><rect x=\"-200\" y=\"-200\" width=\"1000\" height=\"1000\" fill=\"#fff\"/><path data-part=\"holes\" fill=\"#000\"/></mask>\n  <clipPath id=\"a4-muscleclip\"><path data-part=\"outerClip\"/></clipPath>\n  <clipPath id=\"a4-clipRA\"><path data-part=\"clipRA\"/></clipPath><clipPath id=\"a4-clipLA\"><path data-part=\"clipLA\"/></clipPath>\n  <clipPath id=\"a4-clipRV\"><path data-part=\"clipRV\"/></clipPath><clipPath id=\"a4-clipLV\"><path data-part=\"clipLV\"/></clipPath>\n  <radialGradient id=\"a4-cutg\" gradientUnits=\"userSpaceOnUse\" cx=\"300\" cy=\"300\" r=\"260\"><stop offset=\"0\" class=\"a4-c0\"/><stop offset=\"1\" class=\"a4-c1\"/></radialGradient>\n</defs>\n<g data-v=\"rpa\"></g><g data-v=\"pv\"></g><g data-v=\"ivc\"></g><g data-v=\"svc\"></g>\n<g class=\"a4-cav\" data-part=\"cav\"></g>\n<g mask=\"url(#a4-cutmask)\">\n  <path class=\"a4-cut\" data-part=\"outer\" fill=\"url(#a4-cutg)\"/>\n  <g clip-path=\"url(#a4-muscleclip)\"><path class=\"a4-fibre\" data-part=\"fibres\"/></g>\n</g>\n<path class=\"a4-open-rim\" data-part=\"rims\"/>\n<path class=\"a4-annulus\" data-part=\"annuli\"/>\n<path class=\"a4-valve\" data-part=\"valves\"/>\n<g data-v=\"branches\"></g><g data-v=\"aorta\"></g><g data-v=\"pt\"></g>\n<path class=\"a4-cell a4-cell-ven\" data-part=\"vcellsR\"/><path class=\"a4-cell a4-cell-art\" data-part=\"vcellsL\"/>\n</g>\n<g class=\"a4-mon\">\n<rect class=\"a4-ecg-bg\" x=\"24\" y=\"606\" width=\"552\" height=\"170\" rx=\"10\"/>\n<text class=\"a4-mon-label\" x=\"40\" y=\"644\">ECG</text>\n<text class=\"a4-mon-label\" x=\"40\" y=\"692\">Left ventricle</text>\n<text class=\"a4-mon-num\" x=\"40\" y=\"714\" data-part=\"volnow\">120 mL</text>\n<text class=\"a4-mon-label\" x=\"40\" y=\"743\">Valves in</text>\n<text class=\"a4-mon-label\" x=\"40\" y=\"761\">Valves out</text>\n<path class=\"a4-ecg-base\" d=\"M168 650H560M168 718H560M168 670H560\"/>\n<path class=\"a4-bar-track\" d=\"M168 734H560V743H168ZM168 752H560V761H168Z\"/>\n<path class=\"a4-bar-in\" data-part=\"barIn\"/><path class=\"a4-bar-out\" data-part=\"barOut\"/>\n<path class=\"a4-vol\" data-part=\"vol\"/><circle class=\"a4-vol-dot\" data-part=\"voldot\" r=\"3.2\"/>\n<path class=\"a4-ecg\" data-part=\"ecg\"/><circle class=\"a4-ecg-dot\" data-part=\"ecgdot\" r=\"3\"/>\n</g>\n</svg></div><div class=\"a4-row\"><p class=\"a4-scene\" data-scene>Resting: about one beat a second, most of it spent filling.</p><button type=\"button\" class=\"a4-slow\" data-slow aria-pressed=\"false\">Slow</button></div><span class=\"a4-sr\" role=\"status\" aria-live=\"polite\" data-status></span><div class=\"opt-controls\"><div class=\"opt-seg\" role=\"radiogroup\" aria-label=\"Heart rate\" data-control=\"rate\"><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"60\" aria-checked=\"true\" tabindex=\"0\">Rest</button><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"100\" aria-checked=\"false\" tabindex=\"-1\">Walk</button><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"140\" aria-checked=\"false\" tabindex=\"-1\">Run</button><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"176\" aria-checked=\"false\" tabindex=\"-1\">All out</button></div></div><div class=\"opt-foot\"><span class=\"opt-hint\">Pick a heart rate · Slow to watch the valves</span><dl class=\"opt-readout\" data-readout aria-hidden=\"true\"><div class=\"opt-stat\" data-stat=\"hr\"><dt>Heart rate</dt><dd data-r=\"hr\">60 bpm</dd></div><div class=\"opt-stat\" data-stat=\"sv\"><dt>Per beat</dt><dd data-r=\"sv\">70 mL</dd></div><div class=\"opt-stat\" data-stat=\"co\"><dt>Per minute</dt><dd data-r=\"co\">4.2 L/min</dd></div></dl></div></div><figcaption class=\"iso-legend\"><span class=\"iso-keys\"><span class=\"iso-key\"><svg class=\"iso-swatch\" data-mark=\"lit\" viewBox=\"0 0 16 10\" aria-hidden=\"true\"><path d=\"M2 4.5 8 1.5 14 4.5 14 6 8 9 2 6Z\"/><path class=\"iso-swatch-crease\" d=\"M2 4.5 8 7.5 14 4.5\"/></svg>Valves</span><span class=\"iso-key\"><svg class=\"iso-swatch\" data-mark=\"heat\" viewBox=\"0 0 16 10\" aria-hidden=\"true\"><path d=\"M1.5 5h13\"/></svg>Oxygen-rich blood, left side</span><span class=\"iso-key\"><svg class=\"iso-swatch\" data-mark=\"raised\" viewBox=\"0 0 16 10\" aria-hidden=\"true\"><path d=\"M2 4.5 8 1.5 14 4.5 14 6 8 9 2 6Z\"/><path class=\"iso-swatch-crease\" d=\"M2 4.5 8 7.5 14 4.5\"/></svg>Heart muscle</span></span><span class=\"iso-caption\"><span class=\"a4-par\">Each beat starts with a small squeeze of the two upper chambers, the atria. Then the two lower chambers, the ventricles, contract together: the valves between upper and lower chambers snap shut, pressure builds, and the outflow valves open. The right side sends oxygen-poor blood (blue) to the lungs; the thick-walled left side sends oxygen-rich blood (red) to the whole body. Cords inside the ventricles (chordae) tie the valve leaflets to small muscles in the walls, so the valves hold shut instead of blowing back into the atria. The monitor below tracks the ECG, the left ventricle's volume and when each set of valves is open.</span><span class=\"a4-par\">At rest, about 70 mL leaves each ventricle per beat, 4.2 litres a minute. Flat out, the heart beats about three times as often and empties more fully with each beat, so its output rises to roughly 20 litres a minute. That is the delivery side of VO₂max.</span><span class=\"a4-par\"><small>Typical adult values (end of filling ≈ 120 mL, end of ejection ≈ 50 mL at rest); individual hearts differ. Blue and red follow the textbook convention: venous blood is dark red, not blue. As the ventricles squeeze, the valve plane is pulled toward the tip of the heart, which draws blood into the atria at the same time. The ECG is a drawing timed to the beat. The chambers' depth, the muscle ridges and the swirl of blood as the left ventricle fills are drawn, not measured.</small></span></span></figcaption></figure>" + "</div>";
    mount(root.querySelector(".opt-figure"));
  }
}
customElements.define("optimal-fig-heart", Fig);
})();
