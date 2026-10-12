/* optimal-fig-hypothalamus: Optimal Health explainer figure. Built with Anatomy (MIT). Generated; do not edit. */
(() => {
if (customElements.get("optimal-fig-hypothalamus")) return;
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

// A2 model: KNDy neurons in the arcuate (infundibular) nucleus and the heat-loss centre they
// signal. e is the estrogen state, as in Fig 1: 1 = before menopause, 0 = after menopause in a
// woman who has hot flashes. Keys refer to reference/truth-pack.md §1 and "A2".
//
// Sourced: after menopause these neurons are enlarged (NKB neurons ≈ 194 % of premenopausal
// cross-sectional area [Rance & Young 1991], % LOW) with more NKB and kisspeptin gene
// expression [Rance & Young 1991][Rometo 2007]; NKB acting on NK3 receptors in the median
// preoptic nucleus drives heat loss [Rance 2013][Mittelman-Smith 2012]; NKB given to women
// causes flushes [Jayasena 2015]. Firing and signal sizes below are DRAWN, not measured.
const KNDY = {
  area: 1.94, //            post ÷ pre soma area [Rance & Young 1991] (direction HIGH, % LOW)
  burst: [3.4, 1.7], //     s between drawn bursts, pre → post: ILLUSTRATIVE (more NKB signalling)
  packets: [2, 4], //       NKB packets per axon per burst, pre → post: ILLUSTRATIVE
  axons: 4, //              drawn KNDy → MnPO axons
  tau: 2.5, //              s, how fast the heat-loss centre's drive fades: ILLUSTRATIVE
  k: 0.034, //              drive added per packet: sets the post mean near 0.8 of the tipping point
  swing: 0.22, //           a small natural wander in core temperature (Fig 1's trigger), as drive
  refractory: 6, //         s after a flash before the next can start (drawn)
  therapy: 0.85, //         estrogen state drawn under hormone therapy: ILLUSTRATIVE (estrogen reverses the hypertrophy in monkeys [Rometo 2007])
  blocked: 0.2, //          share of the neurokinin B signal still received under a receptor blocker: ILLUSTRATIVE (mechanism [Rance 2013]; no threshold data)
};
const lerp = (a, b, t) => a + (b - a) * t;
/** KNDy state at estrogen e: soma scale (diameter), seconds between bursts, packets per axon. */
const kndyOf = (e) => ({
  scale: Math.sqrt(lerp(KNDY.area, 1, e)),
  area: lerp(KNDY.area, 1, e),
  burst: lerp(KNDY.burst[1], KNDY.burst[0], e),
  packets: Math.round(lerp(KNDY.packets[1], KNDY.packets[0], e)),
});
/** Mean drive on the heat-loss centre (1 = tipping point) at estrogen e. */
const meanDrive = (e) => {
  const s = kndyOf(e);
  return (KNDY.k * s.packets * KNDY.axons * KNDY.tau) / s.burst;
};
/** The wander: 0 … swing, irregular. */
const wanderAt = (t) => KNDY.swing * (0.5 + 0.3 * Math.sin((2 * Math.PI * t) / 7.3) + 0.2 * Math.sin((2 * Math.PI * t) / 11.9 + 1.3));

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

// A2 live code: the KNDy cluster bursts, neurokinin B travels to the heat-loss centre, and the
// centre's drive (a leaky sum of what arrives, plus a small natural wander) tips into a hot flash
// when it reaches 1. Estrogen from the vessels docks on the KNDy cells; its level, the cells'
// size, how often they burst and how much they send all come from kndyOf(e).
const DATA = {"far":{"w":[0.5317,-0.5043],"A":62,"E":24,"dep":220,"parts":[{"pts":[[240,506],[246,538],[266,560],[306,566],[346,560],[364,536],[368,506],[378,506],[376,544],[354,574],[306,582],[258,576],[236,546],[230,506]],"k":0.9,"tone":"--a2-bone","rho":0.35},{"pts":[[256,520],[272,502],[300,498],[318,512],[318,536],[300,550],[274,550],[258,540]],"k":1,"tone":"--a2-ant","rho":0.9},{"pts":[[312,504],[332,498],[350,508],[352,530],[340,546],[320,548],[314,530]],"k":1,"tone":"--a2-gland","rho":0.9},{"pts":[[287,446],[317,446],[322,470],[328,500],[312,506],[298,502],[296,472]],"k":0.8,"tone":"--a2-gland","rho":0.8},{"pts":[[164,418],[160.95518130045147,424.50561835020653],[152.2842712474619,430.0208152801713],[139.3073372946036,433.7059520526919],[124,435],[108.69266270539642,433.7059520526919],[95.7157287525381,430.0208152801713],[87.04481869954853,424.50561835020653],[84,418],[87.04481869954853,411.49438164979347],[95.7157287525381,405.9791847198287],[108.69266270539639,402.2940479473081],[123.99999999999999,401],[139.3073372946036,402.2940479473081],[152.2842712474619,405.9791847198287],[160.95518130045144,411.49438164979347]],"k":1,"tone":"--a2-white","rho":0.6},{"pts":[[494,444],[492.17310878027087,453.18440237676214],[486.97056274847716,460.97056274847716],[479.18440237676214,466.17310878027087],[470,468],[460.81559762323786,466.17310878027087],[453.02943725152284,460.97056274847716],[447.82689121972913,453.18440237676214],[446,444],[447.82689121972913,434.81559762323786],[453.02943725152284,427.02943725152284],[460.8155976232378,421.82689121972913],[470,420],[479.18440237676214,421.82689121972913],[486.97056274847716,427.02943725152284],[492.17310878027087,434.8155976232378]],"k":1,"tone":"--a2-t0","rho":0.9}],"nerve":[[112,424],[110.7,424.4],[109.1,424.9],[107.2,425.4],[105.1,426.1],[102.8,426.8],[100.4,427.5],[97.9,428.3],[95.3,429],[92.8,429.8],[90.4,430.6],[88.1,431.3],[86,432],[84,432.7],[81.8,433.4],[79.7,434.2],[77.6,435],[75.4,435.7],[73.4,436.5],[71.4,437.2],[69.6,437.9],[67.9,438.6],[66.3,439.1],[65.1,439.6],[64,440]],"nerveW":[24,25]},"kndy":[[262,402],[282,390],[302,400],[322,388],[342,402],[276,416],[314,416],[298,380]],"mnpo":[[160,226],[180,214],[200,228],[170,246],[192,248],[212,242]],"axons":[[[262,402],[260.7,399.6],[258.8,396.6],[256.6,393],[254.1,389],[251.5,384.6],[248.9,380.1],[246.6,375.4],[244.5,370.8],[243,366.3],[242,362],[241.9,357.9],[242.5,353.7],[243.7,349.4],[245.3,345.2],[247,340.9],[248.6,336.6],[250,332.4],[250.8,328.2],[250.9,324],[250,320],[248.1,316.1],[245.2,312.3],[241.6,308.6],[237.5,305],[233.1,301.4],[228.6,297.7],[224.3,294],[220.2,290.2],[216.7,286.2],[214,282],[211.9,277.4],[210.2,272.3],[208.8,266.8],[207.6,261.2],[206.8,255.6],[206,250.2],[205.4,245.2],[204.9,240.7],[204.5,236.9],[204,234]],[[282,390],[280.4,387.6],[278.3,384.5],[275.7,380.8],[272.9,376.6],[269.9,372.1],[266.8,367.5],[263.7,362.8],[260.8,358.3],[258.2,353.9],[256,350],[254.2,346.4],[252.7,342.9],[251.5,339.5],[250.4,336.1],[249.4,332.8],[248.3,329.5],[247.1,326.2],[245.8,322.9],[244.1,319.5],[242,316],[239.4,312.4],[236.5,308.6],[233.2,304.7],[229.6,300.8],[226,296.9],[222.4,293.1],[218.8,289.3],[215.5,285.7],[212.6,282.2],[210,279],[207.8,275.9],[205.8,272.8],[204,269.8],[202.4,266.9],[201,264.2],[199.7,261.6],[198.6,259.3],[197.6,257.2],[196.8,255.4],[196,254]],[[322,388],[320.2,385.6],[318,382.5],[315.5,378.8],[312.7,374.7],[309.5,370.3],[306.1,365.6],[302.4,361],[298.4,356.4],[294.3,352],[290,348],[285.2,344.2],[279.9,340.5],[274.1,336.9],[268,333.3],[261.8,329.8],[255.5,326.2],[249.5,322.7],[243.8,319.1],[238.6,315.6],[234,312],[229.9,308.4],[226,304.7],[222.3,300.9],[219,297.2],[215.9,293.5],[213.1,289.8],[210.7,286.2],[208.7,282.7],[207.1,279.3],[206,276],[205.5,272.8],[205.7,269.4],[206.5,266.1],[207.7,262.9],[209.3,259.8],[210.9,256.8],[212.5,254.1],[214,251.7],[215.2,249.6],[216,248]],[[342,402],[339.9,399.7],[337.5,396.8],[334.7,393.4],[331.5,389.6],[327.9,385.4],[323.9,380.9],[319.5,376.3],[314.8,371.5],[309.6,366.7],[304,362],[297.6,357.1],[290.1,351.8],[281.8,346.2],[273.1,340.5],[264.1,334.7],[255.2,328.9],[246.7,323.2],[238.8,317.8],[231.8,312.7],[226,308],[221.4,303.8],[217.6,300.1],[214.6,296.7],[212.2,293.5],[210.3,290.4],[208.6,287.4],[207.1,284.2],[205.6,280.8],[203.9,277.1],[202,273],[199.9,268.2],[197.7,262.7],[195.6,256.8],[193.5,250.6],[191.5,244.3],[189.6,238.2],[187.9,232.6],[186.4,227.5],[185,223.2],[184,220]]],"down":[[[302,400],[301.7,401.9],[301.5,404.3],[301.1,407.2],[300.8,410.5],[300.3,413.9],[299.7,417.4],[298.9,420.8],[298,424],[296.8,427.2],[295.3,430.6],[293.6,434.1],[291.8,437.5],[290,440.8],[288.3,443.7],[287,446.1],[286,448]],[[276,416],[277.3,417.4],[279.1,419.2],[281.2,421.4],[283.5,423.9],[285.9,426.5],[288.2,429.1],[290.3,431.6],[292,434],[293.4,436.4],[294.8,438.9],[295.9,441.5],[297,444.1],[297.9,446.6],[298.8,448.8],[299.4,450.6],[300,452]],[[314,416],[314.4,417.2],[314.9,418.9],[315.6,420.8],[316.3,423],[316.9,425.3],[317.5,427.6],[317.9,429.9],[318,432],[317.9,434.1],[317.5,436.4],[316.9,438.7],[316.3,441],[315.6,443.2],[314.9,445.1],[314.4,446.8],[314,448]]],"out":[[206,240],[208.5,241.3],[211.6,242.8],[215.1,244.6],[219.1,246.6],[223.5,248.9],[228.4,251.3],[233.7,253.8],[239.4,256.5],[245.5,259.2],[252,262],[259,264.9],[266.7,268.1],[274.9,271.5],[283.6,275],[292.6,278.6],[301.9,282.3],[311.4,285.9],[321,289.4],[330.5,292.8],[340,296],[349.7,299.1],[359.9,302.2],[370.4,305.3],[381.1,308.4],[391.8,311.4],[402.3,314.2],[412.6,317],[422.4,319.5],[431.6,321.9],[440,324],[447.7,325.9],[454.9,327.5],[461.6,328.9],[467.8,330.1],[473.8,331.3],[479.4,332.3],[484.7,333.2],[489.9,334.1],[495,335],[500,336],[505,337],[509.9,338],[514.7,338.9],[519.4,339.9],[523.8,340.8],[527.8,341.6],[531.6,342.3],[534.9,343],[537.7,343.5],[540,344]],"vessels":[[[228,440],[229.1,435.7],[230.7,429.9],[232.6,423],[234.4,415.4],[235.6,407.6],[236,400],[235.1,392.5],[233.1,384.7],[230.6,376.8],[228.2,368.6],[226.5,360.3],[226,352],[227.2,343.4],[229.7,334.4],[232.9,325.4],[236.1,316.4],[238.7,307.9],[240,300],[239.8,292.4],[238.7,284.9],[236.9,277.8],[234.9,271.3],[233.1,266],[232,262]],[[372,448],[371.1,443.3],[369.6,436.9],[367.9,429.3],[366.4,420.9],[365.7,412.3],[366,404],[368,395.8],[371.3,387.3],[375.4,378.5],[379.3,369.6],[382.5,360.8],[384,352],[383.6,342.7],[381.8,332.7],[379.1,322.8],[376.2,313.5],[373.7,305.7],[372,300]],[[226,352],[221.8,349.8],[215.9,347],[208.9,343.5],[201.7,339.5],[195.1,335],[190,330],[186.2,323.9],[183.2,316.5],[180.8,308.6],[178.8,301],[177.3,294.6],[176,290]]],"lines":["Before menopause: estrogen keeps the KNDy cells small and their signal modest. The heat-loss centre idles, and everyday wanders in body heat pass unnoticed.","After menopause: with little estrogen, the cells swell and send neurokinin B more often. The heat-loss centre runs close to its edge, and a small wander tips it into a hot flash.","Hormone therapy, where it suits: estrogen is replaced, the KNDy cells quieten, and the heat-loss centre moves back from its edge.","A non-hormonal prescription option: the cells still signal, but a neurokinin-receptor blocker stops the heat-loss centre from receiving it."],"rate":[4.807038969646711e-12,1.1]};

function mount(fig) {
  const svg = fig.querySelector("svg");
  const q = (s) => svg.querySelector(s);
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const out = Object.fromEntries([...fig.querySelectorAll("[data-r]")].map((n) => [n.dataset.r, n]));
  const status = fig.querySelector("[data-status]");
  const line = fig.querySelector("[data-scene]");
  const buttons = [...fig.querySelectorAll('[data-control="state"] .opt-seg-btn')];
  const f1 = (v) => v.toFixed(1);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const kGroups = [...svg.querySelectorAll(".a2-kndy")];
  const kGlows = kGroups.map((g) => g.querySelector(".a2-kglow"));

  // ---------------------------------------------------------------- the hanging parts' back halves (static: drawn once)
  // The optic nerve and chiasm, the stalk, the pituitary lobes, the mammillary body and the bony cup
  // are cut in half by the midline cut; behind it each keeps its round back half (shared/round-back.js).
  {
    const RB = roundBack(DATA.far);
    const mixc = (c, to, t) => c.map((v, i) => Math.round(v + (to[i] - v) * t));
    const tonesOf = (name) => {
      const c = RB.rgbOf(fig, name, "#c0a0a8");
      return [mixc(c, [0, 0, 0], 0.32), mixc(c, [255, 255, 255], 0.22)];
    };
    const objects = DATA.far.parts.map((part) => {
      const closed = RB.sampleClosed(part.pts, part.k, 6);
      const ring = RB.byLength([...closed, closed[0]], 49).slice(0, -1);
      const cx = ring.reduce((a, p) => a + p[0], 0) / ring.length;
      const cy = ring.reduce((a, p) => a + p[1], 0) / ring.length;
      return RB.rim(ring, { rho: (p) => part.rho * Math.hypot(p[0] - cx, p[1] - cy), nphi: 8, tones: tonesOf(part.tone) });
    });
    const c = RB.byLength(DATA.far.nerve, 14);
    const Ae = [];
    const Be = [];
    c.forEach((p, i) => {
      const a = c[Math.max(0, i - 1)];
      const b = c[Math.min(c.length - 1, i + 1)];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const n = [-(b[1] - a[1]) / l, (b[0] - a[0]) / l];
      const w = (DATA.far.nerveW[0] + (DATA.far.nerveW[1] - DATA.far.nerveW[0]) * (i / (c.length - 1))) / 2;
      Ae.push([p[0] + n[0] * w, p[1] + n[1] * w]);
      Be.push([p[0] - n[0] * w, p[1] - n[1] * w]);
    });
    objects.push(RB.chords(Ae, Be, { round: 1, nphi: 12, tones: tonesOf("--a2-white") }));
    q('[data-part="far"]').innerHTML = RB.paintObjects(objects);
  }

  // ---------------------------------------------------------------- paths with lengths
  const measure = (pts) => {
    const acc = [0];
    for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return { pts, acc, L: acc[acc.length - 1] };
  };
  const along = (m, s) => {
    let i = 1;
    while (i < m.acc.length - 1 && m.acc[i] < s) i++;
    const t = Math.max(0, Math.min(1, (s - m.acc[i - 1]) / (m.acc[i] - m.acc[i - 1] || 1)));
    return [m.pts[i - 1][0] + (m.pts[i][0] - m.pts[i - 1][0]) * t, m.pts[i - 1][1] + (m.pts[i][1] - m.pts[i - 1][1]) * t];
  };
  const AX = DATA.axons.map(measure);
  const DN = DATA.down.map(measure);
  const OUTP = measure(DATA.out);
  const VS = DATA.vessels;

  // ---------------------------------------------------------------- state
  let target = 1;
  let block = false; // a neurokinin-receptor blocker: the signal arrives but isn't received
  let e = 1;
  let clock = 0;
  let sinceBurst = 0;
  let drive = 0.2;
  let flash = -1; // seconds into the current flash, −1 when none
  let refractory = 0;
  let outClock = 0;
  const packets = [];
  const pulses = [];
  const estro = [];
  const glow = DATA.kndy.map(() => 0);

  function burst(s) {
    glow.fill(1);
    AX.forEach((m, j) => {
      for (let p = 0; p < s.packets; p++) packets.push({ m, s: -p * 14 - j * 3, mn: true });
    });
    DN.forEach((m) => packets.push({ m, s: 0, mn: false }));
  }
  function spawnEstro() {
    const v = VS[Math.floor(Math.random() * VS.length)];
    const p = v[Math.floor(Math.random() * v.length)];
    return { x: p[0], y: p[1], vx: rnd(-14, 14), vy: rnd(-14, 14), age: 0, life: rnd(6, 10), dock: -1, dt: 0 };
  }
  function step(dt) {
    clock += dt;
    e += (target - e) * (1 - Math.exp(-dt * 1.4));
    const s = kndyOf(e);
    // bursts
    sinceBurst += dt;
    if (sinceBurst >= s.burst) {
      sinceBurst = 0;
      burst(s);
    }
    for (let i = 0; i < glow.length; i++) glow[i] *= Math.exp(-dt / 0.28);
    // packets travel; arrivals at the heat-loss centre add drive
    for (let i = packets.length - 1; i >= 0; i--) {
      const p = packets[i];
      p.s += dt * 150;
      if (p.s >= p.m.L) {
        if (p.mn) drive += KNDY.k * (block ? KNDY.blocked : 1);
        packets.splice(i, 1);
      }
    }
    drive *= Math.exp(-dt / KNDY.tau);
    const total = drive + wanderAt(clock);
    refractory -= dt;
    if (flash < 0 && refractory <= 0 && total >= 1) {
      flash = 0;
      refractory = KNDY.refractory;
    }
    if (flash >= 0) {
      flash += dt;
      outClock += dt;
      if (flash < 2.6 && outClock > 0.11) {
        outClock = 0;
        pulses.push({ s: 0 });
      }
      if (flash > 3.6) flash = -1;
    }
    for (let i = pulses.length - 1; i >= 0; i--) {
      pulses[i].s += dt * 230;
      if (pulses[i].s > OUTP.L) pulses.splice(i, 1);
    }
    // estrogen: as many molecules as the level, leaving the vessels, docking on KNDy cells
    const want = Math.round(30 * e);
    if (estro.length < want && Math.random() < dt * 8) estro.push(spawnEstro());
    const sc = s.scale;
    for (let i = estro.length - 1; i >= 0; i--) {
      const m = estro[i];
      m.age += dt;
      if (m.dock >= 0) {
        m.dt -= dt;
        if (m.dt <= 0) m.dock = -1;
      } else {
        m.vx += rnd(-40, 40) * dt;
        m.vy += rnd(-40, 40) * dt;
        m.vx *= 1 - 0.6 * dt;
        m.vy *= 1 - 0.6 * dt;
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        DATA.kndy.forEach(([kx, ky], k) => {
          if (m.dock < 0 && Math.hypot(m.x - kx, m.y - ky) < 10 * sc + 3 && Math.random() < 0.5) {
            m.dock = k;
            m.dt = rnd(1.2, 2.4);
            const a = Math.atan2(m.y - ky, m.x - kx);
            m.ox = Math.cos(a) * (8.5 * sc + 2.5);
            m.oy = Math.sin(a) * (7.2 * sc + 2.5);
          }
        });
      }
      if (m.age > m.life || (estro.length > want + 2 && m.dock < 0 && Math.random() < dt * 2)) estro.splice(i, 1);
    }
  }

  // ---------------------------------------------------------------- drawing
  const dot = (x, y, r) => `M${f1(x - r)} ${f1(y)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
  const hexD = (x, y, r) => {
    let d = "";
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * 2 * Math.PI + Math.PI / 6;
      d += `${k ? "L" : "M"}${f1(x + Math.cos(a) * r)} ${f1(y + Math.sin(a) * r)}`;
    }
    return d + "Z";
  };
  function draw() {
    const s = kndyOf(e);
    kGroups.forEach((g, i) => {
      const [x, y] = DATA.kndy[i];
      g.setAttribute("transform", `translate(${x} ${y}) scale(${s.scale.toFixed(3)})`);
      kGlows[i].setAttribute("opacity", (0.18 + 0.82 * glow[i]).toFixed(2));
    });
    q('[data-part="nkb"]').setAttribute(
      "d",
      packets
        .filter((p) => p.s >= 0)
        .map((p) => {
          const [x, y] = along(p.m, p.s);
          return dot(x, y, p.mn ? 2.8 : 2.2);
        })
        .join(""),
    );
    q('[data-part="estro"]').setAttribute(
      "d",
      estro
        .map((m) => {
          const fade = Math.min(1, m.age / 0.6, (m.life - m.age) / 0.6);
          if (fade <= 0.05) return "";
          const r = 3.2 * Math.max(0.4, fade);
          if (m.dock >= 0) {
            const [kx, ky] = DATA.kndy[m.dock];
            return hexD(kx + m.ox, ky + m.oy, r);
          }
          return hexD(m.x, m.y, r);
        })
        .join(""),
    );
    const total = Math.min(1.2, drive + wanderAt(clock));
    q('[data-part="mglow"]').setAttribute("opacity", (0.12 + 0.7 * Math.min(1, total)).toFixed(2));
    const h = flash < 0 ? 0 : Math.min(1, flash / 0.5) * (1 - Math.max(0, (flash - 2.4) / 1.2));
    q('[data-part="heat"]').setAttribute("opacity", h.toFixed(2));
    svg.classList.toggle("a2-hot", flash >= 0 && flash < 3);
    q('[data-part="outpulse"]').setAttribute("d", pulses.map((p) => {
      const [x, y] = along(OUTP, p.s);
      return dot(x, y, 3.2);
    }).join(""));
  }

  // ---------------------------------------------------------------- input, tour, loop
  function setState(i, quiet) {
    // 0 before, 1 after, 2 hormone therapy (estrogen replaced), 3 non-hormonal blocker
    target = [1, 0, KNDY.therapy, 0][i];
    block = i === 3;
    svg.classList.toggle("a2-blocked", block);
    const s = kndyOf(target);
    out.estro.textContent = ["Cycling", "Low", "Replaced", "Low"][i];
    out.size.textContent = i === 2 ? "Smaller" : `${Math.round(100 * s.area)}%`;
    out.rate.textContent = i < 2 ? (DATA.rate[i] < 0.05 ? "Rare" : `≈ ${DATA.rate[i].toFixed(1)} an hour`) : "Fewer, typically";
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
  let stateAt = 0;
  const takeOver = () => {
    touring = false;
    idle = performance.now();
  };
  buttons.forEach((b, i) =>
    b.addEventListener("click", () => {
      takeOver();
      stateAt = i;
      setState(i);
      if (still.matches) renderStill();
    }),
  );
  for (const b of buttons) b.addEventListener("pointerdown", takeOver);
  fig.querySelector('[data-control="state"]').addEventListener("keydown", (ev) => {
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
    // after menopause: mid-flash, with signal on the axons; before: a burst just sent
    e = target;
    packets.length = 0;
    pulses.length = 0;
    estro.length = 0;
    flash = -1;
    refractory = 0;
    for (let i = 0; i < 2400; i++) {
      step(1 / 60);
      if (target === 0 && flash > 1.0 && packets.length) break;
      if (target === 1 && i > 900 && sinceBurst > 0.45 && sinceBurst < 0.5) break;
    }
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
    if (touring && (tourClock += dt) > 12) {
      tourClock = 0;
      stateAt = (stateAt + 1) % 4;
      setState(stateAt, true);
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
  setState(0, true);
  if (still.matches) renderStill();
  else {
    for (let i = 0; i < 300; i++) step(1 / 60);
    draw();
    start();
  }
}

class Fig extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    const root = this.attachShadow({ mode: "open" });
    const theme = this.getAttribute("theme") === "dark" ? "dark" : "light";
    root.innerHTML = "<style>" + "\n.iso{\n  --anatomy-page:#0b0b0b;--anatomy-card:#131313;--anatomy-text:#a3a3a3;--anatomy-strong:#e6e6e6;--anatomy-muted:#6e6e6e;\n  --anatomy-paper:#131313;--anatomy-face:#1b1b1b;--anatomy-top:#1c1c1c;\n  --anatomy-shade-0:#0f0f0f;--anatomy-shade-1:#121212;--anatomy-shade-2:#151515;--anatomy-shade-3:#181818;\n  --anatomy-lit-top:#262626;--anatomy-lit-shade:#1d1d1d;\n  --anatomy-hi:#d4d4d4;--anatomy-mid:#6a6a6a;--anatomy-lo:#3e3e3e;--anatomy-faint:#2a2a2a;--anatomy-lit:#ffffff;\n  --anatomy-halo:#050505;--anatomy-halo-opacity:.9;--anatomy-dot:#e6e6e6;\n  --anatomy-red:#ff6b6b;--anatomy-green:#6be0a0;--anatomy-blue:#6b9bff;\n  --anatomy-weight:.6px;--anatomy-ease:cubic-bezier(.32,.72,0,1);\n  --anatomy-mono:ui-monospace,\"SF Mono\",Menlo,Consolas,monospace;\n  --anatomy-lift:inset 0 1px 0 0 #ffffff0a,inset 0 0 0 1px #ffffff06,0 0 0 1px #00000026,0 1px 1px -.5px #00000014,0 3px 3px -1.5px #00000014,0 6px 6px -3px #00000014,0 12px 12px -6px #00000014;\n}\n.iso[data-theme=\"light\"]{\n  --anatomy-page:#f2f2ef;--anatomy-card:#fbfbfa;--anatomy-text:#57575a;--anatomy-strong:#18181a;--anatomy-muted:#8c8c90;\n  --anatomy-paper:#fbfbfa;--anatomy-face:#ffffff;--anatomy-top:#ffffff;\n  --anatomy-shade-0:#dcdcd9;--anatomy-shade-1:#e5e5e2;--anatomy-shade-2:#ededea;--anatomy-shade-3:#f4f4f1;\n  --anatomy-lit-top:#ffffff;--anatomy-lit-shade:#eeeeeb;\n  --anatomy-hi:#26262a;--anatomy-mid:#8a8a8f;--anatomy-lo:#b4b4b8;--anatomy-faint:#d4d4d6;--anatomy-lit:#000000;\n  --anatomy-halo:#8a8a80;--anatomy-halo-opacity:.32;--anatomy-dot:#3a3a3e;\n  --anatomy-red:#e5484d;--anatomy-green:#30a46c;--anatomy-blue:#3e63dd;\n  --anatomy-lift:inset 0 1px 0 0 #ffffff,0 0 0 1px #0000000f,0 1px 1px -.5px #0000000a,0 3px 3px -1.5px #0000000a,0 6px 6px -3px #0000000a,0 12px 12px -6px #0000000a;\n}\n.iso-svg{display:block;width:100%;height:auto;overflow:visible}\n.iso-svg path,.iso-svg circle{vector-effect:non-scaling-stroke}\n.iso-fill{fill:var(--anatomy-paper);stroke:none}\n.iso-solid[data-lit]>.iso-fill{fill:var(--anatomy-face)}\n.iso-shade,.iso-top{stroke:none}\n.iso-shade[data-shade=\"0\"]{fill:var(--anatomy-shade-0)}\n.iso-shade[data-shade=\"1\"]{fill:var(--anatomy-shade-1)}\n.iso-shade[data-shade=\"2\"]{fill:var(--anatomy-shade-2)}\n.iso-shade[data-shade=\"3\"]{fill:var(--anatomy-shade-3)}\n.iso-top{fill:var(--anatomy-top)}\n.iso-solid[data-lit]>.iso-top{fill:var(--anatomy-lit-top)}\n.iso-solid[data-lit]>.iso-shade{fill:var(--anatomy-lit-shade)}\n.iso-solid[data-seamless]>.iso-shade,.iso-solid[data-seamless]>.iso-top{stroke-width:.4;stroke-linejoin:round}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"0\"]{stroke:var(--anatomy-shade-0)}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"1\"]{stroke:var(--anatomy-shade-1)}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"2\"]{stroke:var(--anatomy-shade-2)}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"3\"]{stroke:var(--anatomy-shade-3)}\n.iso-solid[data-seamless]>.iso-top{stroke:var(--anatomy-top)}\n.iso-solid[data-seamless][data-lit]>.iso-top{stroke:var(--anatomy-lit-top)}\n.iso-solid[data-seamless][data-lit]>.iso-shade{stroke:var(--anatomy-lit-shade)}\n.iso-solid[data-lit]>.iso-edge{stroke:var(--anatomy-lit)}\n.iso-halo{fill:var(--anatomy-halo);stroke:none;filter:blur(9px);opacity:var(--anatomy-halo-opacity);transform:translateY(3px)}\n.iso-line{fill:none;stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight);stroke-linecap:round;stroke-linejoin:round}\n.iso-line[data-tone=\"hi\"]{stroke:var(--anatomy-hi)}\n.iso-line[data-tone=\"mid\"]{stroke:var(--anatomy-mid)}\n.iso-line[data-tone=\"lo\"]{stroke:var(--anatomy-lo)}\n.iso-line[data-tone=\"faint\"]{stroke:var(--anatomy-faint)}\n.iso-line[data-tone=\"lit\"]{stroke:var(--anatomy-lit)}\n.iso-line[data-tone=\"red\"]{stroke:var(--anatomy-red)}\n.iso-line[data-tone=\"green\"]{stroke:var(--anatomy-green)}\n.iso-line[data-tone=\"blue\"]{stroke:var(--anatomy-blue)}\n.iso-line[data-dotted]{stroke-dasharray:.01 3.5;stroke-width:1}\n.iso-line[data-dashed]{stroke-dasharray:3 3}\n.iso-line[data-flow]{stroke-dasharray:2 6}\n.iso-wire-end{fill:var(--anatomy-paper);stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight)}\n.iso-wire[data-tone=\"hi\"] .iso-wire-end{stroke:var(--anatomy-hi)}\n.iso-wire[data-tone=\"mid\"] .iso-wire-end{stroke:var(--anatomy-mid)}\n.iso-wire[data-tone=\"faint\"] .iso-wire-end{stroke:var(--anatomy-faint)}\n.iso-wire[data-tone=\"lit\"] .iso-wire-end{stroke:var(--anatomy-lit)}\n.iso-dots circle{fill:var(--anatomy-dot);stroke:none;opacity:.32}\n.iso-dots[data-tone=\"hi\"] circle{opacity:.85}\n.iso-dots[data-tone=\"mid\"] circle{opacity:.45}\n.iso-dots[data-tone=\"lo\"] circle{opacity:.22}\n.iso-dots[data-tone=\"faint\"] circle{opacity:.12}\n.iso-face-text{fill:var(--anatomy-mid);font-family:var(--anatomy-mono);letter-spacing:.04em}\n.iso-face-text[data-tone=\"hi\"]{fill:var(--anatomy-hi)}\n.iso-face-text[data-tone=\"lo\"]{fill:var(--anatomy-lo)}\n.iso-face-text[data-tone=\"faint\"]{fill:var(--anatomy-faint)}\n.tb-body{fill:var(--anatomy-shade-2);stroke:none}\n.tb-shine{fill:var(--anatomy-top);stroke:none}\n.tb-shade{fill:var(--anatomy-shade-0);stroke:none}\n.tb-ring{fill:none;stroke:var(--anatomy-lo);stroke-width:.45;stroke-linecap:butt;stroke-linejoin:round}\n.tb-ring[data-tone=\"mid\"]{stroke:var(--anatomy-mid)}\n.tb-ring[data-tone=\"faint\"]{stroke:var(--anatomy-faint)}\n.tb-ring[data-tone=\"hi\"]{stroke:var(--anatomy-hi)}\n@keyframes iso-flow{to{stroke-dashoffset:-32}}\n@keyframes iso-pulse{0%,100%{opacity:.18}12%{opacity:1}40%{opacity:.18}}\n.iso-line[data-flow]{animation:iso-flow 1600ms linear infinite}\n.iso-dots circle[data-pulse]{animation:iso-pulse 1600ms steps(1,end) infinite;animation-delay:var(--pulse-at,0ms)}\n.iso-figure{margin:32px 0 36px}\n.iso-plate{position:relative;padding:52px 24px;border-radius:0;background:var(--anatomy-card);box-shadow:0 0 0 1px var(--anatomy-mid);--anatomy-paper:var(--anatomy-card)}\n.iso-plate-corners{position:absolute;inset:18px 20px;pointer-events:none}\n.iso-plate-corner{position:absolute;color:var(--anatomy-muted);font-family:var(--anatomy-mono);font-size:10.5px;line-height:1;letter-spacing:.04em;white-space:nowrap}\n.iso-plate-corner[data-corner=\"fig\"]{top:0;left:0;color:var(--anatomy-text)}\n.iso-plate-corner[data-corner=\"title\"]{top:0;right:0;text-transform:uppercase;letter-spacing:.1em}\n.iso-plate-corner[data-corner=\"hint\"]{bottom:0;left:0;text-transform:uppercase;letter-spacing:.1em}\n.iso-plate-corner[data-corner=\"readout\"]{right:0;bottom:0;color:var(--anatomy-text);font-variant-numeric:tabular-nums}\n.iso-plate .iso-svg{margin:0 auto}\n.iso-legend{display:grid;gap:8px;margin-top:12px;color:var(--anatomy-muted);font-size:13px;line-height:1.55}\n.iso-keys{display:flex;flex-wrap:wrap;gap:6px 18px}\n.iso-key{display:inline-flex;align-items:center;gap:7px}\n.iso-swatch{width:16px;height:10px;flex:none;overflow:visible}\n.iso-swatch path{fill:none;stroke:var(--anatomy-hi);stroke-width:1;vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round}\n.iso-swatch[data-mark=\"raised\"] path,.iso-swatch[data-mark=\"flat\"] path{stroke:var(--anatomy-mid)}\n.iso-swatch[data-mark=\"lit\"] path{stroke:var(--anatomy-lit)}\n.iso-swatch[data-mark=\"dim\"] path{stroke:var(--anatomy-lo)}\n.iso-swatch[data-mark=\"dotted\"] path{stroke-dasharray:.01 3;stroke-width:1.4}\n.iso-swatch[data-mark=\"dashed\"] path{stroke-dasharray:3 2.5}\n.iso-swatch[data-mark=\"red\"] path{stroke:var(--anatomy-red)}\n.iso-swatch[data-mark=\"green\"] path{stroke:var(--anatomy-green)}\n.iso-swatch[data-mark=\"blue\"] path{stroke:var(--anatomy-blue)}\n.iso-swatch-crease{stroke:var(--anatomy-lo)!important}\n@media (max-width:560px){.iso-plate{padding:48px 12px 70px}.iso-plate-corner[data-corner=\"hint\"]{bottom:18px}}\n@media (prefers-reduced-motion:reduce){.iso-line[data-flow],.iso-dots circle[data-pulse]{animation:none}}\n/*\n * Optimal theme for Anatomy figures.\n *\n * Load AFTER the kit's ISO_CSS. Put `class=\"iso optimal\"` on the wrapper:\n *   - no data-theme  -> \"Forest night\"  (exam-room TV, dark)\n *   - data-theme=\"light\" -> \"Cream\"     (beoptimal.ca, the primary target)\n *\n * Values come from the live site (beoptimal-landing src/index.css), the\n * Performance package design and the ALE visualizer spec. The kit's grey\n * ramps are warmed so solids sit on the site's cream paper, and the single\n * \"lit\" accent is Optimal forest green instead of pure black/white.\n */\n\n.iso.optimal {\n  /* Forest night (dark) */\n  --anatomy-page: #152511;\n  --anatomy-card: #1c3118;\n  --anatomy-text: #c9cdbf;\n  --anatomy-strong: #fffcf7;\n  --anatomy-muted: #8e9884;\n  --anatomy-paper: #1c3118;\n  --anatomy-face: #253821;\n  --anatomy-top: #283c24;\n  --anatomy-shade-0: #172812;\n  --anatomy-shade-1: #1a2c16;\n  --anatomy-shade-2: #1e321a;\n  --anatomy-shade-3: #22371e;\n  --anatomy-lit-top: #34492f;\n  --anatomy-lit-shade: #2a3f26;\n  --anatomy-hi: #e9e6dc;\n  --anatomy-mid: #7e8a74;\n  --anatomy-lo: #4d5c46;\n  --anatomy-faint: #33452e;\n  --anatomy-lit: #fffcf7;\n  --anatomy-halo: #0b1508;\n  --anatomy-halo-opacity: 0.9;\n  --anatomy-dot: #e9e6dc;\n  --anatomy-red: #e0745f;\n  --anatomy-green: #8cc67f;\n  --anatomy-blue: #7fa8d9;\n  --anatomy-mono: \"JetBrains Mono\", ui-monospace, \"SF Mono\", Menlo, Consolas, monospace;\n\n  /* Optimal extras (use sparingly; colour only when colour is the subject) */\n  --opt-display: \"Castoro\", Georgia, serif;\n  --opt-ui: \"Public Sans\", system-ui, sans-serif;\n  --opt-forest: #2c4e25;\n  --opt-forest-light: #519044;\n  --opt-sage: #5e7a59;\n  --opt-borderline: #c97b2d;\n  --opt-out: #b3402f;\n  --opt-heat: #ff9776;\n}\n\n.iso.optimal[data-theme=\"light\"] {\n  /* Cream (light) */\n  --anatomy-page: #fef8f1;\n  --anatomy-card: #fffcf7;\n  --anatomy-text: #3e3d39;\n  --anatomy-strong: #252525;\n  --anatomy-muted: #76736d;\n  --anatomy-paper: #fffcf7;\n  --anatomy-face: #fffefb;\n  --anatomy-top: #fffefb;\n  --anatomy-shade-0: #ddd7cc;\n  --anatomy-shade-1: #e7e2d9;\n  --anatomy-shade-2: #f0ede5;\n  --anatomy-shade-3: #f6f3ec;\n  --anatomy-lit-top: #fffefb;\n  --anatomy-lit-shade: #efebe2;\n  --anatomy-hi: #252525;\n  --anatomy-mid: #8a867e;\n  --anatomy-lo: #b9b4aa;\n  --anatomy-faint: #d9d3c8;\n  --anatomy-lit: #2c4e25;\n  --anatomy-halo: #8a8070;\n  --anatomy-halo-opacity: 0.3;\n  --anatomy-dot: #3a3833;\n  --anatomy-red: #b3402f;\n  --anatomy-green: #3f7a35;\n  --anatomy-blue: #3e6a8f;\n}\n\n/* Card typography: brand fonts for titles and readouts, kit mono for plate corners */\n.iso.optimal .iso-plate-title,\n.iso.optimal [data-role=\"title\"] {\n  font-family: var(--opt-display);\n  letter-spacing: -0.02em;\n}\n.iso.optimal [data-role=\"readout\"],\n.iso.optimal .iso-readout {\n  font-family: var(--opt-ui);\n  font-feature-settings: \"tnum\" 1, \"ss01\" 1;\n}\n\n/*\n * Card layout for Optimal figures (shared/page.mjs `plate`).\n * Phone first: the drawing, then a row of real buttons (>=44 px), then a footer\n * where the hint and the readout wrap instead of overlapping at 320 px.\n */\n.iso.optimal {\n  --opt-rule: rgba(233, 230, 220, 0.16);\n  --opt-btn: rgba(233, 230, 220, 0.06);\n  --opt-btn-on: #e9e6dc;\n  --opt-btn-on-text: #1c3118;\n  --opt-title: #fffcf7;\n  --opt-fig: #8cc67f;\n  --opt-heat-ink: #ff9776;\n  --opt-heat-glow: rgba(255, 151, 118, 0.55);\n  --opt-heat-wash: rgba(255, 151, 118, 0.16);\n  --opt-cold-ink: #9cc3e6;\n}\n.iso.optimal[data-theme=\"light\"] {\n  --opt-rule: rgba(44, 78, 37, 0.2);\n  --opt-btn: #fffcf7;\n  --opt-btn-on: #2c4e25;\n  --opt-btn-on-text: #fffcf7;\n  --opt-title: #2c4e25;\n  --opt-fig: #5e7a59;\n  --opt-heat-ink: #c8552e;\n  --opt-heat-glow: rgba(232, 108, 64, 0.42);\n  --opt-heat-wash: rgba(255, 151, 118, 0.22);\n  --opt-cold-ink: #3e6a8f;\n}\n.iso.optimal .opt-plate {\n  padding: 52px 24px 20px;\n  box-shadow: 0 0 0 1px var(--opt-rule);\n  border-radius: 2px;\n}\n.iso.optimal .iso-plate-corner[data-corner=\"fig\"] {\n  font-family: var(--opt-display);\n  font-style: italic;\n  font-size: 15px;\n  letter-spacing: 0;\n  color: var(--opt-fig);\n  top: -2px;\n}\n.iso.optimal .iso-plate-corner[data-corner=\"title\"] {\n  font-family: var(--opt-display);\n  font-size: 17px;\n  text-transform: none;\n  letter-spacing: -0.01em;\n  color: var(--opt-title);\n  top: -4px;\n}\n.iso.optimal .opt-controls {\n  display: flex;\n  flex-wrap: wrap;\n  justify-content: center;\n  gap: 8px 12px;\n  margin: 10px 0 0;\n}\n.iso.optimal .opt-seg {\n  display: inline-flex;\n  border-radius: 999px;\n  box-shadow: inset 0 0 0 1px var(--opt-rule);\n  padding: 3px;\n  gap: 2px;\n  max-width: 100%;\n}\n.iso.optimal .opt-seg-btn {\n  appearance: none;\n  border: 0;\n  margin: 0;\n  min-height: 44px;\n  min-width: min-content; /* never shrink a label below its longest word (with the padding, always ≥ 44 px) */\n  padding: 0 16px;\n  border-radius: 999px;\n  background: transparent;\n  color: var(--anatomy-text);\n  font: 500 14px/1.1 var(--opt-ui);\n  letter-spacing: 0;\n  cursor: pointer;\n  touch-action: manipulation;\n  -webkit-tap-highlight-color: transparent;\n  transition: background-color 240ms var(--anatomy-ease), color 240ms var(--anatomy-ease);\n}\n.iso.optimal .opt-seg-btn[aria-checked=\"true\"] {\n  background: var(--opt-btn-on);\n  color: var(--opt-btn-on-text);\n}\n.iso.optimal .opt-seg-btn:focus-visible {\n  outline: 2px solid var(--opt-fig);\n  outline-offset: 2px;\n}\n.iso.optimal .opt-foot {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: flex-end;\n  justify-content: space-between;\n  gap: 10px 20px;\n  margin-top: 16px;\n}\n.iso.optimal .opt-hint {\n  font-family: var(--anatomy-mono);\n  font-size: 10.5px;\n  line-height: 1.4;\n  letter-spacing: 0.1em;\n  text-transform: uppercase;\n  color: var(--anatomy-muted);\n  flex: 1 1 160px;\n  min-width: 0;\n}\n.iso.optimal .opt-readout {\n  display: grid;\n  grid-auto-flow: column;\n  gap: 4px 18px;\n  margin: 0;\n  font-family: var(--opt-ui);\n  font-feature-settings: \"tnum\" 1;\n}\n.iso.optimal .opt-stat { margin: 0; min-width: 0; }\n.iso.optimal .opt-stat dt {\n  font-size: 10px;\n  font-weight: 600;\n  letter-spacing: 0.12em;\n  text-transform: uppercase;\n  color: var(--anatomy-muted);\n  white-space: nowrap;\n}\n.iso.optimal .opt-stat dd {\n  margin: 1px 0 0;\n  font-size: 15px;\n  font-weight: 500;\n  color: var(--anatomy-strong);\n  white-space: nowrap;\n}\n.iso.optimal .iso-legend { font-family: var(--opt-ui); font-size: 13.5px; }\n.iso.optimal .iso-caption { color: var(--anatomy-text); }\n.iso.optimal .iso-caption em { font-style: italic; }\n.iso.optimal .iso-swatch[data-mark=\"heat\"] path { stroke: var(--opt-heat-ink); stroke-width: 2; }\n.iso.optimal .iso-stage { outline: none; border-radius: 4px; touch-action: pan-y; -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none; }\n.iso.optimal .iso-stage:focus-visible { outline: 1px solid var(--anatomy-muted); outline-offset: 6px; }\n@media (max-width: 560px) {\n  .iso.optimal .opt-plate { padding: 44px 10px 14px; }\n  .iso.optimal .iso-plate-corners { inset: 16px 12px; }\n  .iso.optimal .opt-readout { grid-auto-flow: row; grid-template-columns: repeat(4, minmax(0, auto)); width: 100%; justify-content: space-between; gap: 4px 10px; order: -1; }\n  .iso.optimal .opt-stat dd { font-size: 14px; }\n  /* a long label wraps onto two lines instead of running into its neighbour; values stay on one baseline */\n  .iso.optimal .opt-stat { display: flex; flex-direction: column; justify-content: space-between; }\n  .iso.optimal .opt-stat dt { white-space: normal; line-height: 1.25; }\n  .iso.optimal .opt-seg-btn { padding: 0 12px; font-size: 13.5px; }\n}\n@media (max-width: 350px) {\n  .iso.optimal .opt-seg-btn { padding: 0 7px; font-size: 12.5px; }\n  .iso.optimal .opt-stat dt { font-size: 9px; letter-spacing: 0.08em; }\n  .iso.optimal .opt-stat dd { font-size: 13px; }\n}\n\n:host{display:block}\n.opt-host{background:transparent;color:var(--anatomy-text);font:15px/1.6 var(--opt-ui);-webkit-font-smoothing:antialiased}\n.opt-host *{box-sizing:border-box}\n.opt-host .iso-figure{margin:0}\n/* A2 · the hypothalamus: Forest night reads as a fluorescence slide (magenta KNDy cells, green\n   heat-loss centre on dark tissue); Cream reads as a stained section (purple and teal on pink). */\n.iso.optimal {\n  --a2-t0: #2b2334; --a2-t1: #16121c; --a2-edge: #5d4d68;\n  --a2-thal: rgba(255, 255, 255, 0.035); --a2-speck: rgba(175, 165, 205, 0.24); --a2-sulcus: rgba(205, 195, 225, 0.28);\n  --a2-vessel: #6e2735; --a2-vessel-edge: #a8485a; --a2-loops: #c04a5c;\n  --a2-white: #3a3546; --a2-white-edge: #6a6178; --a2-fibre: rgba(220, 215, 235, 0.13);\n  --a2-gland: #3d3045; --a2-ant: #4c3448; --a2-gland-edge: #7b6a86; --a2-bone: #3f3a30; --a2-bone-edge: #7d7462;\n  --a2-kndy: #e055b8; --a2-kndy-nuc: #ffd2f0; --a2-kndy-dark: #6e1a5a; --a2-nkb: #ffa3e4; --a2-axon: rgba(224, 85, 184, 0.55);\n  --a2-kg0: rgba(255, 92, 200, 0.75); --a2-kg1: rgba(255, 92, 200, 0);\n  --a2-mn: #48d29a; --a2-mn-nuc: #d4ffe9; --a2-rec: #c9ffe6; --a2-mg0: rgba(72, 210, 154, 0.55); --a2-mg1: rgba(72, 210, 154, 0);\n  --a2-hot: #ffb057; --a2-hg0: rgba(255, 150, 70, 0.55); --a2-hg1: rgba(255, 150, 70, 0); --a2-out: rgba(72, 210, 154, 0.35);\n  --a2-estro: #ffd166;\n  --a2-loc-bg: rgba(255, 255, 255, 0.04); --a2-loc-brain: #4a4155;\n}\n.iso.optimal[data-theme=\"light\"] {\n  --a2-t0: #f8e4e7; --a2-t1: #edc7ce; --a2-edge: #b07f8a;\n  --a2-thal: rgba(120, 60, 90, 0.05); --a2-speck: rgba(110, 60, 120, 0.26); --a2-sulcus: rgba(120, 70, 90, 0.35);\n  --a2-vessel: #df7f8a; --a2-vessel-edge: #a8485a; --a2-loops: #c0485a;\n  --a2-white: #fcf4ef; --a2-white-edge: #c9a3a8; --a2-fibre: rgba(150, 110, 120, 0.26);\n  --a2-gland: #ebc9d0; --a2-ant: #e4aab8; --a2-gland-edge: #a87584; --a2-bone: #f1e8d8; --a2-bone-edge: #b8a888;\n  --a2-kndy: #8e2f88; --a2-kndy-nuc: #f4cdf0; --a2-kndy-dark: #3a0d38; --a2-nkb: #c2189b; --a2-axon: rgba(142, 47, 136, 0.55);\n  --a2-kg0: rgba(194, 24, 155, 0.42); --a2-kg1: rgba(194, 24, 155, 0);\n  --a2-mn: #138a63; --a2-mn-nuc: #c8f0df; --a2-rec: #0b5c41; --a2-mg0: rgba(19, 138, 99, 0.4); --a2-mg1: rgba(19, 138, 99, 0);\n  --a2-hot: #e0731e; --a2-hg0: rgba(240, 130, 40, 0.45); --a2-hg1: rgba(240, 130, 40, 0); --a2-out: rgba(19, 138, 99, 0.4);\n  --a2-estro: #c98a00;\n  --a2-loc-bg: rgba(0, 0, 0, 0.03); --a2-loc-brain: #dcb6c0;\n}\n.a2-t0 { stop-color: var(--a2-t0); } .a2-t1 { stop-color: var(--a2-t1); }\n.a2-kg0 { stop-color: var(--a2-kg0); } .a2-kg1 { stop-color: var(--a2-kg1); }\n.a2-mg0 { stop-color: var(--a2-mg0); } .a2-mg1 { stop-color: var(--a2-mg1); }\n.a2-hg0 { stop-color: var(--a2-hg0); } .a2-hg1 { stop-color: var(--a2-hg1); }\n.a2-brain { stroke: var(--a2-edge); stroke-width: 1.4; }\n.a2-thal { fill: var(--a2-thal); }\n.a2-adh { fill: var(--a2-thal); stroke: var(--a2-sulcus); stroke-width: 1; }\n.a2-speck { fill: var(--a2-speck); }\n.a2-sulcus { fill: none; stroke: var(--a2-sulcus); stroke-width: 1.4; stroke-linecap: round; }\n.a2-vessel { fill: var(--a2-vessel); stroke: var(--a2-vessel-edge); stroke-width: 0.8; }\n.a2-loops { fill: none; stroke: var(--a2-loops); stroke-width: 2.4; stroke-linecap: round; }\n.a2-white { fill: var(--a2-white); stroke: var(--a2-white-edge); stroke-width: 1.1; }\n.a2-fibre { fill: none; stroke: var(--a2-fibre); stroke-width: 1; }\n.a2-acdots { fill: var(--a2-fibre); }\n.a2-mamm { fill: var(--a2-thal); stroke: var(--a2-sulcus); stroke-width: 1.2; }\n.a2-lamina { fill: none; stroke: var(--a2-white-edge); stroke-width: 1.6; stroke-linecap: round; }\n.a2-stalk, .a2-post { fill: var(--a2-gland); stroke: var(--a2-gland-edge); stroke-width: 1.1; }\n.a2-ant { fill: var(--a2-ant); stroke: var(--a2-gland-edge); stroke-width: 1.1; }\n.a2-sella { fill: var(--a2-bone); stroke: var(--a2-bone-edge); stroke-width: 1.1; }\n.a2-den { fill: var(--a2-kndy); opacity: 0.8; }\n.a2-soma { fill: var(--a2-kndy); stroke: var(--a2-kndy-dark); stroke-width: 0.5; }\n.a2-nuc { fill: var(--a2-kndy-nuc); opacity: 0.85; }\n.a2-nucleolus { fill: var(--a2-kndy-dark); }\n.a2-axon { fill: none; stroke: var(--a2-axon); stroke-width: 1.3; stroke-linecap: round; }\n.a2-bead { fill: var(--a2-kndy); opacity: 0.8; }\n.a2-nkb { fill: var(--a2-nkb); }\n.a2-mden { fill: var(--a2-mn); opacity: 0.8; transition: fill 0.4s; }\n.a2-msoma { fill: var(--a2-mn); stroke: var(--a2-kndy-dark); stroke-width: 0.4; transition: fill 0.4s; }\n.a2-mnuc { fill: var(--a2-mn-nuc); opacity: 0.85; }\n.a2-rec { fill: var(--a2-rec); }\n.a2-hot .a2-msoma, .a2-hot .a2-mden { fill: var(--a2-hot); }\n.a2-out { fill: none; stroke: var(--a2-out); stroke-width: 1.3; stroke-dasharray: 1 0; }\n.a2-outpulse { fill: var(--a2-hot); }\n.a2-estro { fill: var(--a2-estro); }\n.a2-heat, .a2-mglow, .a2-kglow { pointer-events: none; }\n.a2-loc-bg { fill: var(--a2-loc-bg); stroke: var(--opt-rule); stroke-width: 1; }\n.a2-loc-brain { fill: var(--a2-loc-brain); }\n.a2-loc-mark { fill: none; stroke: var(--a2-nkb); stroke-width: 1.6; }\n.iso.optimal .iso-swatch[data-mark=\"kndy\"] path { stroke: var(--a2-kndy); stroke-width: 4; stroke-linecap: round; }\n.iso.optimal .iso-swatch[data-mark=\"mnpo\"] path { stroke: var(--a2-mn); stroke-width: 4; stroke-linecap: round; }\n.iso.optimal .iso-swatch[data-mark=\"estro\"] path { stroke: var(--a2-estro); stroke-width: 4; stroke-linecap: round; }\n.a2-scene { margin: 10px 4px 0; font: 500 14px/1.45 var(--opt-ui); color: var(--anatomy-text); min-height: 4.4em; }\n.a2-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }\n.a2-par { display: block; margin-top: 6px; }\n.a2-par:first-child { margin-top: 0; }\n.a2-par small { font-size: 12.5px; color: var(--anatomy-muted); }\n.a2-blocked .a2-rec { fill: var(--a2-edge); opacity: 0.55; }\n.a2-blocked .a2-mn { filter: saturate(0.55); }\n\n/* round 3: a block of brain cut out around the hypothalamus; top and end are cuts, the hanging parts keep round backs */\n.iso.optimal { --a2-top-thal: rgba(255, 255, 255, 0.05); --a2-top-grey: rgba(255, 255, 255, 0.07); --a2-top-white: #463f55; --a2-top-light: rgba(255, 255, 255, 0.04); --a2-end-shade: rgba(0, 0, 0, 0.22); }\n.iso.optimal[data-theme=\"light\"] { --a2-top-thal: rgba(150, 70, 100, 0.07); --a2-top-grey: rgba(150, 70, 100, 0.1); --a2-top-white: #fbf1ee; --a2-top-light: rgba(255, 255, 255, 0.2); --a2-end-shade: rgba(90, 30, 50, 0.1); }\n.a2-brain-top { stroke: none; }\n.a2-top-thal { fill: var(--a2-top-thal); }\n.a2-top-grey { fill: var(--a2-top-grey); stroke: var(--a2-edge); stroke-width: 0.6; stroke-opacity: 0.4; }\n.a2-top-white { fill: var(--a2-top-white); stroke: var(--a2-white-edge); stroke-width: 0.8; }\n.a2-top-vessel { fill: var(--a2-vessel); }\n.a2-top-light { fill: var(--a2-top-light); }\n.a2-end-shade { fill: var(--a2-end-shade); }\n.a2-block-edge { fill: none; stroke: var(--a2-edge); stroke-width: 1.2; stroke-linejoin: round; }\n.a2-brain-fill { stroke: none; }\n.a2-base-edge { fill: none; stroke: var(--a2-edge); stroke-width: 1.4; }\n" + "</style><div class=\"iso optimal opt-host\" data-theme=\"" + theme + "\">" + "<figure class=\"iso-figure opt-figure \"><div class=\"iso-plate opt-plate\"><div class=\"iso-plate-corners\" aria-hidden=\"true\"><span class=\"iso-plate-corner\" data-corner=\"fig\">A2</span><span class=\"iso-plate-corner\" data-corner=\"title\">The hot-flash switch</span></div><div class=\"iso-stage a2-stage\"><svg class=\"iso-svg a2-svg\" viewBox=\"0 0 600 602\" role=\"img\" aria-label=\"A block of brain cut out around the hypothalamus and seen in 3-D. Its front face is a midline cut, the front of the head on the left; its top shows the thalamus cut across, and the pituitary hangs underneath in its bony cup. At its base, just above the pituitary stalk, a cluster of KNDy nerve cells sends signals of neurokinin B up to the heat-loss centre near the front. Estrogen from the blood keeps the cluster small and quiet. After menopause the cells are drawn larger and signal more often, and the heat-loss centre periodically tips over, sending a heat-loss burst: a hot flash.\">\n<defs>\n  <radialGradient id=\"a2-tissue\" cx=\"44%\" cy=\"56%\" r=\"72%\"><stop offset=\"0\" class=\"a2-t0\"/><stop offset=\"1\" class=\"a2-t1\"/></radialGradient>\n  <radialGradient id=\"a2-kglow\" cx=\"50%\" cy=\"50%\" r=\"50%\"><stop offset=\"0\" class=\"a2-kg0\"/><stop offset=\"1\" class=\"a2-kg1\"/></radialGradient>\n  <radialGradient id=\"a2-mglow\" cx=\"50%\" cy=\"50%\" r=\"50%\"><stop offset=\"0\" class=\"a2-mg0\"/><stop offset=\"1\" class=\"a2-mg1\"/></radialGradient>\n  <radialGradient id=\"a2-hglow\" cx=\"50%\" cy=\"50%\" r=\"50%\"><stop offset=\"0\" class=\"a2-hg0\"/><stop offset=\"1\" class=\"a2-hg1\"/></radialGradient>\n</defs>\n<g transform=\"matrix(1.0207 0.2207 0.0000 1.0561 -41.46 -96.32)\"><g class=\"a2-far\" data-part=\"far\"></g></g>\n<g transform=\"matrix(1.0207 0.2207 0.5427 -0.4152 -41.46 62.09)\"><clipPath id=\"a2-topclip\"><rect x=\"74\" y=\"0\" width=\"446\" height=\"160\"/></clipPath><g clip-path=\"url(#a2-topclip)\">\n<rect class=\"a2-brain-top\" x=\"74\" y=\"0\" width=\"446\" height=\"160\" fill=\"url(#a2-tissue)\"/>\n<path class=\"a2-top-thal\" d=\"M196.0 0.0C240.0 -6.9 485.5 -17.1 530.0 0.0C574.5 17.1 552.7 115.2 530.0 128.0C507.3 140.8 397.3 104.5 360.0 96.0C322.7 87.5 271.3 69.9 250.0 64.0C228.7 58.1 207.2 60.5 200.0 52.0C192.8 43.5 152.0 6.9 196.0 0.0Z\"/>\n<path class=\"a2-top-grey\" d=\"M68.0 22.0C77.3 10.0 113.5 15.3 130.0 18.0C146.5 20.7 171.1 33.7 178.0 40.0C184.9 46.3 181.7 54.0 176.0 60.0C170.3 66.0 156.2 74.3 140.0 80.0C123.8 85.7 78.8 106.7 68.0 98.0C57.2 89.3 58.7 34.0 68.0 22.0Z\"/><path class=\"a2-top-grey\" d=\"M120.0 128.0C129.0 121.1 155.0 108.8 170.0 104.0C185.0 99.2 202.0 94.8 220.0 96.0C238.0 97.2 272.0 106.0 290.0 112.0C308.0 118.0 334.0 127.0 340.0 136.0C346.0 145.0 358.5 166.6 330.0 172.0C301.5 177.4 183.0 175.3 150.0 172.0C117.0 168.7 114.5 156.6 110.0 150.0C105.5 143.4 111.0 134.9 120.0 128.0Z\"/>\n<path class=\"a2-top-white\" d=\"M68.0 112.0C77.6 105.9 135.1 87.8 150.0 82.0C164.9 76.2 184.3 63.4 196.0 62.0C207.7 60.6 230.9 65.1 250.0 70.0C269.1 74.9 327.3 96.1 360.0 104.0C392.7 111.9 510.2 131.5 530.0 138.0C549.8 144.5 550.3 161.6 530.0 160.0C509.7 158.4 388.9 131.9 356.0 124.0C323.1 116.1 265.7 96.7 248.0 92.0C230.3 87.3 214.7 82.8 204.0 84.0C193.3 85.2 171.9 96.2 156.0 102.0C140.1 107.8 78.3 132.8 68.0 134.0C57.7 135.2 58.4 118.1 68.0 112.0Z\"/>\n<path class=\"a2-speck\" d=\"M-1.0 63.1a1.040134369619316 1.040134369619316 0 1 0 2.080268739238632 0a1.040134369619316 1.040134369619316 0 1 0 -2.080268739238632 0M166.3 95.7a1.3911898029420429 1.3911898029420429 0 1 0 2.7823796058840857 0a1.3911898029420429 1.3911898029420429 0 1 0 -2.7823796058840857 0M62.1 5.9a0.8341002953556369 0.8341002953556369 0 1 0 1.6682005907112738 0a0.8341002953556369 0.8341002953556369 0 1 0 -1.6682005907112738 0M357.3 24.1a1.3024242043983416 1.3024242043983416 0 1 0 2.6048484087966832 0a1.3024242043983416 1.3024242043983416 0 1 0 -2.6048484087966832 0M218.9 16.6a0.9443464142683395 0.9443464142683395 0 1 0 1.888692828536679 0a0.9443464142683395 0.9443464142683395 0 1 0 -1.888692828536679 0M261.9 2.2a0.8207851023606818 0.8207851023606818 0 1 0 1.6415702047213636 0a0.8207851023606818 0.8207851023606818 0 1 0 -1.6415702047213636 0M66.0 32.1a1.0272121307227873 1.0272121307227873 0 1 0 2.0544242614455746 0a1.0272121307227873 1.0272121307227873 0 1 0 -2.0544242614455746 0M25.4 122.7a1.512178535677659 1.512178535677659 0 1 0 3.024357071355318 0a1.512178535677659 1.512178535677659 0 1 0 -3.024357071355318 0M239.1 92.9a1.0483052047419412 1.0483052047419412 0 1 0 2.0966104094838824 0a1.0483052047419412 1.0483052047419412 0 1 0 -2.0966104094838824 0M428.1 39.7a0.893214604624747 0.893214604624747 0 1 0 1.786429209249494 0a0.893214604624747 0.893214604624747 0 1 0 -1.786429209249494 0M324.5 45.9a1.5086230828041427 1.5086230828041427 0 1 0 3.0172461656082854 0a1.5086230828041427 1.5086230828041427 0 1 0 -3.0172461656082854 0M61.8 33.3a1.6862324105447462 1.6862324105447462 0 1 0 3.3724648210894923 0a1.6862324105447462 1.6862324105447462 0 1 0 -3.3724648210894923 0M398.8 43.1a1.675800940930658 1.675800940930658 0 1 0 3.351601881861316 0a1.675800940930658 1.675800940930658 0 1 0 -3.351601881861316 0M41.2 118.6a1.6528857727561945 1.6528857727561945 0 1 0 3.305771545512389 0a1.6528857727561945 1.6528857727561945 0 1 0 -3.305771545512389 0M73.3 41.6a1.659100151815545 1.659100151815545 0 1 0 3.31820030363109 0a1.659100151815545 1.659100151815545 0 1 0 -3.31820030363109 0M95.9 143.2a1.3887092470086266 1.3887092470086266 0 1 0 2.7774184940172533 0a1.3887092470086266 1.3887092470086266 0 1 0 -2.7774184940172533 0M363.8 49.5a1.069535899972111 1.069535899972111 0 1 0 2.139071799944222 0a1.069535899972111 1.069535899972111 0 1 0 -2.139071799944222 0M191.7 114.1a1.5422484687457314 1.5422484687457314 0 1 0 3.084496937491463 0a1.5422484687457314 1.5422484687457314 0 1 0 -3.084496937491463 0M33.5 79.9a1.2135969339065227 1.2135969339065227 0 1 0 2.4271938678130454 0a1.2135969339065227 1.2135969339065227 0 1 0 -2.4271938678130454 0M308.1 116.4a0.9635236840355431 0.9635236840355431 0 1 0 1.9270473680710862 0a0.9635236840355431 0.9635236840355431 0 1 0 -1.9270473680710862 0M317.1 82.2a1.2939883016459537 1.2939883016459537 0 1 0 2.5879766032919074 0a1.2939883016459537 1.2939883016459537 0 1 0 -2.5879766032919074 0M425.6 153.6a1.2337370492366488 1.2337370492366488 0 1 0 2.4674740984732977 0a1.2337370492366488 1.2337370492366488 0 1 0 -2.4674740984732977 0M354.5 43.6a1.558963474825922 1.558963474825922 0 1 0 3.117926949651844 0a1.558963474825922 1.558963474825922 0 1 0 -3.117926949651844 0M97.7 80.3a0.937183799303308 0.937183799303308 0 1 0 1.874367598606616 0a0.937183799303308 0.937183799303308 0 1 0 -1.874367598606616 0M369.4 118.6a1.3303179628032429 1.3303179628032429 0 1 0 2.6606359256064858 0a1.3303179628032429 1.3303179628032429 0 1 0 -2.6606359256064858 0M174.5 131.7a0.9352267556686205 0.9352267556686205 0 1 0 1.870453511337241 0a0.9352267556686205 0.9352267556686205 0 1 0 -1.870453511337241 0M125.7 49.7a1.235106710470381 1.235106710470381 0 1 0 2.470213420940762 0a1.235106710470381 1.235106710470381 0 1 0 -2.470213420940762 0M166.9 7.6a0.8588293128263479 0.8588293128263479 0 1 0 1.7176586256526958 0a0.8588293128263479 0.8588293128263479 0 1 0 -1.7176586256526958 0M268.7 142.2a0.9878061883037967 0.9878061883037967 0 1 0 1.9756123766075935 0a0.9878061883037967 0.9878061883037967 0 1 0 -1.9756123766075935 0M77.2 159.7a1.3991449767250055 1.3991449767250055 0 1 0 2.798289953450011 0a1.3991449767250055 1.3991449767250055 0 1 0 -2.798289953450011 0M311.2 147.0a0.8477411692941014 0.8477411692941014 0 1 0 1.6954823385882027 0a0.8477411692941014 0.8477411692941014 0 1 0 -1.6954823385882027 0M239.5 123.7a1.2841502121036408 1.2841502121036408 0 1 0 2.5683004242072816 0a1.2841502121036408 1.2841502121036408 0 1 0 -2.5683004242072816 0M103.8 83.9a1.5271566349800274 1.5271566349800274 0 1 0 3.054313269960055 0a1.5271566349800274 1.5271566349800274 0 1 0 -3.054313269960055 0M108.6 97.9a1.1633768946988292 1.1633768946988292 0 1 0 2.3267537893976584 0a1.1633768946988292 1.1633768946988292 0 1 0 -2.3267537893976584 0M383.1 85.6a1.2150439378945568 1.2150439378945568 0 1 0 2.4300878757891136 0a1.2150439378945568 1.2150439378945568 0 1 0 -2.4300878757891136 0M318.0 65.2a0.8892451364446852 0.8892451364446852 0 1 0 1.7784902728893703 0a0.8892451364446852 0.8892451364446852 0 1 0 -1.7784902728893703 0M267.5 79.3a1.5794740518363883 1.5794740518363883 0 1 0 3.1589481036727767 0a1.5794740518363883 1.5794740518363883 0 1 0 -3.1589481036727767 0M107.8 106.2a1.4049911995464854 1.4049911995464854 0 1 0 2.809982399092971 0a1.4049911995464854 1.4049911995464854 0 1 0 -2.809982399092971 0M388.8 84.2a1.2313723106695083 1.2313723106695083 0 1 0 2.4627446213390165 0a1.2313723106695083 1.2313723106695083 0 1 0 -2.4627446213390165 0M283.5 23.1a1.152153606807956 1.152153606807956 0 1 0 2.304307213615912 0a1.152153606807956 1.152153606807956 0 1 0 -2.304307213615912 0M120.9 131.8a0.8080989221652028 0.8080989221652028 0 1 0 1.6161978443304057 0a0.8080989221652028 0.8080989221652028 0 1 0 -1.6161978443304057 0M107.4 12.9a0.9165129003734449 0.9165129003734449 0 1 0 1.8330258007468898 0a0.9165129003734449 0.9165129003734449 0 1 0 -1.8330258007468898 0M361.6 115.2a1.2884189536221502 1.2884189536221502 0 1 0 2.5768379072443004 0a1.2884189536221502 1.2884189536221502 0 1 0 -2.5768379072443004 0M423.2 105.8a1.6605584520944938 1.6605584520944938 0 1 0 3.3211169041889876 0a1.6605584520944938 1.6605584520944938 0 1 0 -3.3211169041889876 0M200.2 7.0a0.9416996996772473 0.9416996996772473 0 1 0 1.8833993993544946 0a0.9416996996772473 0.9416996996772473 0 1 0 -1.8833993993544946 0M71.6 79.9a1.1983391087021111 1.1983391087021111 0 1 0 2.3966782174042223 0a1.1983391087021111 1.1983391087021111 0 1 0 -2.3966782174042223 0M338.2 85.9a1.4932932469931368 1.4932932469931368 0 1 0 2.9865864939862736 0a1.4932932469931368 1.4932932469931368 0 1 0 -2.9865864939862736 0M385.1 107.0a1.2000092175789263 1.2000092175789263 0 1 0 2.4000184351578526 0a1.2000092175789263 1.2000092175789263 0 1 0 -2.4000184351578526 0M422.5 36.2a1.1829133826614484 1.1829133826614484 0 1 0 2.365826765322897 0a1.1829133826614484 1.1829133826614484 0 1 0 -2.365826765322897 0M308.6 121.0a1.2189892829572684 1.2189892829572684 0 1 0 2.4379785659145368 0a1.2189892829572684 1.2189892829572684 0 1 0 -2.4379785659145368 0M173.7 141.3a1.1402831760610297 1.1402831760610297 0 1 0 2.2805663521220594 0a1.1402831760610297 1.1402831760610297 0 1 0 -2.2805663521220594 0M265.7 153.2a1.5990267223203805 1.5990267223203805 0 1 0 3.198053444640761 0a1.5990267223203805 1.5990267223203805 0 1 0 -3.198053444640761 0M168.0 152.6a1.5784118698243161 1.5784118698243161 0 1 0 3.1568237396486323 0a1.5784118698243161 1.5784118698243161 0 1 0 -3.1568237396486323 0M181.3 119.0a1.186365868045358 1.186365868045358 0 1 0 2.372731736090716 0a1.186365868045358 1.186365868045358 0 1 0 -2.372731736090716 0M74.0 97.6a0.8766129893498616 0.8766129893498616 0 1 0 1.7532259786997233 0a0.8766129893498616 0.8766129893498616 0 1 0 -1.7532259786997233 0M313.3 44.7a1.1834567864737071 1.1834567864737071 0 1 0 2.3669135729474142 0a1.1834567864737071 1.1834567864737071 0 1 0 -2.3669135729474142 0M374.6 37.0a1.154209034707592 1.154209034707592 0 1 0 2.308418069415184 0a1.154209034707592 1.154209034707592 0 1 0 -2.308418069415184 0M291.8 44.2a1.2379360902010799 1.2379360902010799 0 1 0 2.4758721804021597 0a1.2379360902010799 1.2379360902010799 0 1 0 -2.4758721804021597 0M93.6 15.4a1.4832548815135425 1.4832548815135425 0 1 0 2.966509763027085 0a1.4832548815135425 1.4832548815135425 0 1 0 -2.966509763027085 0M179.6 55.9a1.1293296668486015 1.1293296668486015 0 1 0 2.258659333697203 0a1.1293296668486015 1.1293296668486015 0 1 0 -2.258659333697203 0M20.5 57.1a1.1841503847708463 1.1841503847708463 0 1 0 2.3683007695416927 0a1.1841503847708463 1.1841503847708463 0 1 0 -2.3683007695416927 0M353.2 152.8a1.381170637049871 1.381170637049871 0 1 0 2.762341274099742 0a1.381170637049871 1.381170637049871 0 1 0 -2.762341274099742 0M15.8 116.3a1.4753391039328083 1.4753391039328083 0 1 0 2.9506782078656166 0a1.4753391039328083 1.4753391039328083 0 1 0 -2.9506782078656166 0M258.6 66.2a1.2660808627177784 1.2660808627177784 0 1 0 2.532161725435557 0a1.2660808627177784 1.2660808627177784 0 1 0 -2.532161725435557 0M356.3 72.4a1.040777536519596 1.040777536519596 0 1 0 2.081555073039192 0a1.040777536519596 1.040777536519596 0 1 0 -2.081555073039192 0M170.9 136.7a1.608394489864255 1.608394489864255 0 1 0 3.21678897972851 0a1.608394489864255 1.608394489864255 0 1 0 -3.21678897972851 0M141.0 75.9a0.8602484650074025 0.8602484650074025 0 1 0 1.720496930014805 0a0.8602484650074025 0.8602484650074025 0 1 0 -1.720496930014805 0M46.0 153.8a1.576920237230994 1.576920237230994 0 1 0 3.153840474461988 0a1.576920237230994 1.576920237230994 0 1 0 -3.153840474461988 0M245.6 138.9a1.3510495014498471 1.3510495014498471 0 1 0 2.7020990028996943 0a1.3510495014498471 1.3510495014498471 0 1 0 -2.7020990028996943 0M241.3 49.6a1.017876904241626 1.017876904241626 0 1 0 2.035753808483252 0a1.017876904241626 1.017876904241626 0 1 0 -2.035753808483252 0M324.6 100.8a1.088104379957639 1.088104379957639 0 1 0 2.176208759915278 0a1.088104379957639 1.088104379957639 0 1 0 -2.176208759915278 0M83.5 97.2a0.9322343034969962 0.9322343034969962 0 1 0 1.8644686069939924 0a0.9322343034969962 0.9322343034969962 0 1 0 -1.8644686069939924 0M178.4 19.1a1.0026329234266962 1.0026329234266962 0 1 0 2.0052658468533924 0a1.0026329234266962 1.0026329234266962 0 1 0 -2.0052658468533924 0M24.2 105.3a1.3174659944302087 1.3174659944302087 0 1 0 2.6349319888604175 0a1.3174659944302087 1.3174659944302087 0 1 0 -2.6349319888604175 0M173.0 31.3a0.9262402653938535 0.9262402653938535 0 1 0 1.852480530787707 0a0.9262402653938535 0.9262402653938535 0 1 0 -1.852480530787707 0M207.4 0.5a0.8415326227820783 0.8415326227820783 0 1 0 1.6830652455641566 0a0.8415326227820783 0.8415326227820783 0 1 0 -1.6830652455641566 0M265.7 120.0a1.3378832062593506 1.3378832062593506 0 1 0 2.6757664125187013 0a1.3378832062593506 1.3378832062593506 0 1 0 -2.6757664125187013 0M297.7 101.1a1.1758264969343566 1.1758264969343566 0 1 0 2.351652993868713 0a1.1758264969343566 1.1758264969343566 0 1 0 -2.351652993868713 0M155.2 154.9a1.381936351565585 1.381936351565585 0 1 0 2.76387270313117 0a1.381936351565585 1.381936351565585 0 1 0 -2.76387270313117 0M149.5 151.6a1.2895805353667407 1.2895805353667407 0 1 0 2.5791610707334813 0a1.2895805353667407 1.2895805353667407 0 1 0 -2.5791610707334813 0M286.3 51.1a1.1623358095179646 1.1623358095179646 0 1 0 2.324671619035929 0a1.1623358095179646 1.1623358095179646 0 1 0 -2.324671619035929 0M185.9 15.3a1.3711011847677652 1.3711011847677652 0 1 0 2.7422023695355304 0a1.3711011847677652 1.3711011847677652 0 1 0 -2.7422023695355304 0M443.2 73.7a1.602318328388332 1.602318328388332 0 1 0 3.204636656776664 0a1.602318328388332 1.602318328388332 0 1 0 -3.204636656776664 0M377.9 0.3a0.8023732994239529 0.8023732994239529 0 1 0 1.6047465988479057 0a0.8023732994239529 0.8023732994239529 0 1 0 -1.6047465988479057 0M141.1 29.1a1.661779487935621 1.661779487935621 0 1 0 3.323558975871242 0a1.661779487935621 1.661779487935621 0 1 0 -3.323558975871242 0M112.1 7.6a0.8375173558830445 0.8375173558830445 0 1 0 1.675034711766089 0a0.8375173558830445 0.8375173558830445 0 1 0 -1.675034711766089 0M273.7 81.5a0.9140856491532975 0.9140856491532975 0 1 0 1.828171298306595 0a0.9140856491532975 0.9140856491532975 0 1 0 -1.828171298306595 0M215.8 45.4a1.0206915456528698 1.0206915456528698 0 1 0 2.0413830913057396 0a1.0206915456528698 1.0206915456528698 0 1 0 -2.0413830913057396 0M128.9 142.2a1.3774008790286265 1.3774008790286265 0 1 0 2.754801758057253 0a1.3774008790286265 1.3774008790286265 0 1 0 -2.754801758057253 0M284.8 38.9a0.9498227420261343 0.9498227420261343 0 1 0 1.8996454840522685 0a0.9498227420261343 0.9498227420261343 0 1 0 -1.8996454840522685 0M381.0 134.8a0.9526046810230284 0.9526046810230284 0 1 0 1.9052093620460568 0a0.9526046810230284 0.9526046810230284 0 1 0 -1.9052093620460568 0M358.6 12.2a1.5668945996713775 1.5668945996713775 0 1 0 3.133789199342755 0a1.5668945996713775 1.5668945996713775 0 1 0 -3.133789199342755 0M146.4 56.3a1.0406415074510886 1.0406415074510886 0 1 0 2.0812830149021773 0a1.0406415074510886 1.0406415074510886 0 1 0 -2.0812830149021773 0M376.7 93.1a0.8305538119567129 0.8305538119567129 0 1 0 1.6611076239134257 0a0.8305538119567129 0.8305538119567129 0 1 0 -1.6611076239134257 0M255.2 152.0a1.4589464662679905 1.4589464662679905 0 1 0 2.917892932535981 0a1.4589464662679905 1.4589464662679905 0 1 0 -2.917892932535981 0M203.8 65.5a0.9749879646347724 0.9749879646347724 0 1 0 1.9499759292695449 0a0.9749879646347724 0.9749879646347724 0 1 0 -1.9499759292695449 0M356.9 84.9a1.2365577360955604 1.2365577360955604 0 1 0 2.473115472191121 0a1.2365577360955604 1.2365577360955604 0 1 0 -2.473115472191121 0M209.5 154.2a1.4943553707509818 1.4943553707509818 0 1 0 2.9887107415019636 0a1.4943553707509818 1.4943553707509818 0 1 0 -2.9887107415019636 0M311.2 48.8a1.392408742469185 1.392408742469185 0 1 0 2.78481748493837 0a1.392408742469185 1.392408742469185 0 1 0 -2.78481748493837 0M402.1 14.1a1.1458784941545488 1.1458784941545488 0 1 0 2.2917569883090976 0a1.1458784941545488 1.1458784941545488 0 1 0 -2.2917569883090976 0M38.8 41.4a0.807705732954392 0.807705732954392 0 1 0 1.615411465908784 0a0.807705732954392 0.807705732954392 0 1 0 -1.615411465908784 0M400.0 27.1a1.5151849181532722 1.5151849181532722 0 1 0 3.0303698363065443 0a1.5151849181532722 1.5151849181532722 0 1 0 -3.0303698363065443 0M302.8 153.0a0.8895529882419417 0.8895529882419417 0 1 0 1.7791059764838835 0a0.8895529882419417 0.8895529882419417 0 1 0 -1.7791059764838835 0M155.8 46.0a1.3205328468890236 1.3205328468890236 0 1 0 2.6410656937780472 0a1.3205328468890236 1.3205328468890236 0 1 0 -2.6410656937780472 0M293.4 122.2a1.690099248606804 1.690099248606804 0 1 0 3.380198497213608 0a1.690099248606804 1.690099248606804 0 1 0 -3.380198497213608 0M47.4 68.7a1.2365568140862109 1.2365568140862109 0 1 0 2.4731136281724218 0a1.2365568140862109 1.2365568140862109 0 1 0 -2.4731136281724218 0M202.2 92.9a1.1958174244461743 1.1958174244461743 0 1 0 2.3916348488923487 0a1.1958174244461743 1.1958174244461743 0 1 0 -2.3916348488923487 0M297.4 34.7a1.6532198129717446 1.6532198129717446 0 1 0 3.306439625943489 0a1.6532198129717446 1.6532198129717446 0 1 0 -3.306439625943489 0M179.4 93.7a1.6389949378920674 1.6389949378920674 0 1 0 3.277989875784135 0a1.6389949378920674 1.6389949378920674 0 1 0 -3.277989875784135 0M339.8 88.7a1.0632890385233695 1.0632890385233695 0 1 0 2.126578077046739 0a1.0632890385233695 1.0632890385233695 0 1 0 -2.126578077046739 0M345.4 17.7a0.9611475297353673 0.9611475297353673 0 1 0 1.9222950594707346 0a0.9611475297353673 0.9611475297353673 0 1 0 -1.9222950594707346 0M151.0 68.4a0.9471442901968438 0.9471442901968438 0 1 0 1.8942885803936875 0a0.9471442901968438 0.9471442901968438 0 1 0 -1.8942885803936875 0M372.8 37.6a0.8983034202347542 0.8983034202347542 0 1 0 1.7966068404695084 0a0.8983034202347542 0.8983034202347542 0 1 0 -1.7966068404695084 0M338.9 2.5a0.8258396871162949 0.8258396871162949 0 1 0 1.6516793742325897 0a0.8258396871162949 0.8258396871162949 0 1 0 -1.6516793742325897 0M240.7 29.7a0.9460731139835652 0.9460731139835652 0 1 0 1.8921462279671304 0a0.9460731139835652 0.9460731139835652 0 1 0 -1.8921462279671304 0M370.5 61.1a1.5384404242862395 1.5384404242862395 0 1 0 3.076880848572479 0a1.5384404242862395 1.5384404242862395 0 1 0 -3.076880848572479 0M429.0 61.0a1.2962923577486467 1.2962923577486467 0 1 0 2.5925847154972934 0a1.2962923577486467 1.2962923577486467 0 1 0 -2.5925847154972934 0M437.4 32.9a1.535227200328584 1.535227200328584 0 1 0 3.070454400657168 0a1.535227200328584 1.535227200328584 0 1 0 -3.070454400657168 0M427.1 72.2a0.809265680992292 0.809265680992292 0 1 0 1.618531361984584 0a0.809265680992292 0.809265680992292 0 1 0 -1.618531361984584 0M12.7 100.0a1.3115808259337962 1.3115808259337962 0 1 0 2.6231616518675924 0a1.3115808259337962 1.3115808259337962 0 1 0 -2.6231616518675924 0M216.0 7.2a1.5403662784401013 1.5403662784401013 0 1 0 3.0807325568802026 0a1.5403662784401013 1.5403662784401013 0 1 0 -3.0807325568802026 0M412.8 102.1a1.4781888412108541 1.4781888412108541 0 1 0 2.9563776824217083 0a1.4781888412108541 1.4781888412108541 0 1 0 -2.9563776824217083 0M355.3 145.6a1.4661794925724898 1.4661794925724898 0 1 0 2.9323589851449796 0a1.4661794925724898 1.4661794925724898 0 1 0 -2.9323589851449796 0M236.1 13.1a1.1305293133301002 1.1305293133301002 0 1 0 2.2610586266602004 0a1.1305293133301002 1.1305293133301002 0 1 0 -2.2610586266602004 0M200.0 10.6a1.2340220599286464 1.2340220599286464 0 1 0 2.468044119857293 0a1.2340220599286464 1.2340220599286464 0 1 0 -2.468044119857293 0M52.8 19.8a1.078923813420277 1.078923813420277 0 1 0 2.157847626840554 0a1.078923813420277 1.078923813420277 0 1 0 -2.157847626840554 0M331.6 40.8a1.6771391880485595 1.6771391880485595 0 1 0 3.354278376097119 0a1.6771391880485595 1.6771391880485595 0 1 0 -3.354278376097119 0M37.8 134.2a1.0354294150000714 1.0354294150000714 0 1 0 2.0708588300001427 0a1.0354294150000714 1.0354294150000714 0 1 0 -2.0708588300001427 0M227.8 2.0a1.2383659053951184 1.2383659053951184 0 1 0 2.4767318107902367 0a1.2383659053951184 1.2383659053951184 0 1 0 -2.4767318107902367 0M105.5 78.3a1.4389131954767866 1.4389131954767866 0 1 0 2.8778263909535733 0a1.4389131954767866 1.4389131954767866 0 1 0 -2.8778263909535733 0M154.6 38.4a1.0783493257391727 1.0783493257391727 0 1 0 2.1566986514783455 0a1.0783493257391727 1.0783493257391727 0 1 0 -2.1566986514783455 0M7.2 120.7a1.2998917410149162 1.2998917410149162 0 1 0 2.5997834820298324 0a1.2998917410149162 1.2998917410149162 0 1 0 -2.5997834820298324 0M88.5 101.1a0.9522748095470246 0.9522748095470246 0 1 0 1.9045496190940492 0a0.9522748095470246 0.9522748095470246 0 1 0 -1.9045496190940492 0M287.2 25.2a1.5925257001933881 1.5925257001933881 0 1 0 3.1850514003867763 0a1.5925257001933881 1.5925257001933881 0 1 0 -3.1850514003867763 0M434.5 20.5a1.354385480894135 1.354385480894135 0 1 0 2.70877096178827 0a1.354385480894135 1.354385480894135 0 1 0 -2.70877096178827 0M374.1 71.6a0.9041561532804334 0.9041561532804334 0 1 0 1.8083123065608668 0a0.9041561532804334 0.9041561532804334 0 1 0 -1.8083123065608668 0M25.2 148.9a0.8252383081943154 0.8252383081943154 0 1 0 1.6504766163886309 0a0.8252383081943154 0.8252383081943154 0 1 0 -1.6504766163886309 0M137.8 90.1a1.0948768873185637 1.0948768873185637 0 1 0 2.1897537746371274 0a1.0948768873185637 1.0948768873185637 0 1 0 -2.1897537746371274 0M294.3 26.5a0.9907141508913732 0.9907141508913732 0 1 0 1.9814283017827463 0a0.9907141508913732 0.9907141508913732 0 1 0 -1.9814283017827463 0M212.8 27.4a1.601959696926139 1.601959696926139 0 1 0 3.203919393852278 0a1.601959696926139 1.601959696926139 0 1 0 -3.203919393852278 0M66.6 69.3a1.134337119324447 1.134337119324447 0 1 0 2.268674238648894 0a1.134337119324447 1.134337119324447 0 1 0 -2.268674238648894 0M248.5 54.3a1.205841140035392 1.205841140035392 0 1 0 2.411682280070784 0a1.205841140035392 1.205841140035392 0 1 0 -2.411682280070784 0M381.7 80.2a0.8782209786849292 0.8782209786849292 0 1 0 1.7564419573698584 0a0.8782209786849292 0.8782209786849292 0 1 0 -1.7564419573698584 0M325.4 7.0a1.6941723795553414 1.6941723795553414 0 1 0 3.388344759110683 0a1.6941723795553414 1.6941723795553414 0 1 0 -3.388344759110683 0M75.5 153.7a1.3644615024928577 1.3644615024928577 0 1 0 2.7289230049857154 0a1.3644615024928577 1.3644615024928577 0 1 0 -2.7289230049857154 0M1.3 91.0a0.8792597953036985 0.8792597953036985 0 1 0 1.758519590607397 0a0.8792597953036985 0.8792597953036985 0 1 0 -1.758519590607397 0M57.7 75.0a1.455666995100367 1.455666995100367 0 1 0 2.911333990200734 0a1.455666995100367 1.455666995100367 0 1 0 -2.911333990200734 0M95.4 6.1a1.3479202763158087 1.3479202763158087 0 1 0 2.6958405526316174 0a1.3479202763158087 1.3479202763158087 0 1 0 -2.6958405526316174 0M46.0 58.8a1.6280602334794219 1.6280602334794219 0 1 0 3.2561204669588437 0a1.6280602334794219 1.6280602334794219 0 1 0 -3.2561204669588437 0M250.4 8.6a1.5581389034242732 1.5581389034242732 0 1 0 3.1162778068485464 0a1.5581389034242732 1.5581389034242732 0 1 0 -3.1162778068485464 0M365.6 60.4a1.3927277845262809 1.3927277845262809 0 1 0 2.7854555690525618 0a1.3927277845262809 1.3927277845262809 0 1 0 -2.7854555690525618 0M383.2 11.3a1.2628744260062226 1.2628744260062226 0 1 0 2.525748852012445 0a1.2628744260062226 1.2628744260062226 0 1 0 -2.525748852012445 0M410.1 124.3a1.4791245139009548 1.4791245139009548 0 1 0 2.9582490278019096 0a1.4791245139009548 1.4791245139009548 0 1 0 -2.9582490278019096 0M120.3 70.3a1.4243684405687902 1.4243684405687902 0 1 0 2.8487368811375804 0a1.4243684405687902 1.4243684405687902 0 1 0 -2.8487368811375804 0M326.4 45.1a0.8761123336629126 0.8761123336629126 0 1 0 1.7522246673258253 0a0.8761123336629126 0.8761123336629126 0 1 0 -1.7522246673258253 0M156.9 126.5a1.696859328958075 1.696859328958075 0 1 0 3.39371865791615 0a1.696859328958075 1.696859328958075 0 1 0 -3.39371865791615 0M154.9 100.6a1.1069243069802637 1.1069243069802637 0 1 0 2.2138486139605273 0a1.1069243069802637 1.1069243069802637 0 1 0 -2.2138486139605273 0M284.6 2.9a1.2751304972219566 1.2751304972219566 0 1 0 2.550260994443913 0a1.2751304972219566 1.2751304972219566 0 1 0 -2.550260994443913 0M354.9 47.3a1.0227676571558861 1.0227676571558861 0 1 0 2.0455353143117723 0a1.0227676571558861 1.0227676571558861 0 1 0 -2.0455353143117723 0M26.5 20.1a1.257757709136007 1.257757709136007 0 1 0 2.515515418272014 0a1.257757709136007 1.257757709136007 0 1 0 -2.515515418272014 0M164.5 147.2a0.880015288088485 0.880015288088485 0 1 0 1.76003057617697 0a0.880015288088485 0.880015288088485 0 1 0 -1.76003057617697 0M106.4 77.2a1.0774809232703233 1.0774809232703233 0 1 0 2.1549618465406466 0a1.0774809232703233 1.0774809232703233 0 1 0 -2.1549618465406466 0M356.9 120.1a0.8710761350310186 0.8710761350310186 0 1 0 1.742152270062037 0a0.8710761350310186 0.8710761350310186 0 1 0 -1.742152270062037 0M136.1 80.0a1.0229793618181529 1.0229793618181529 0 1 0 2.0459587236363057 0a1.0229793618181529 1.0229793618181529 0 1 0 -2.0459587236363057 0M6.0 7.2a1.0432794780407841 1.0432794780407841 0 1 0 2.0865589560815683 0a1.0432794780407841 1.0432794780407841 0 1 0 -2.0865589560815683 0M47.3 110.7a1.3985017565996403 1.3985017565996403 0 1 0 2.7970035131992805 0a1.3985017565996403 1.3985017565996403 0 1 0 -2.7970035131992805 0M305.2 153.3a1.5648481559146645 1.5648481559146645 0 1 0 3.129696311829329 0a1.5648481559146645 1.5648481559146645 0 1 0 -3.129696311829329 0M49.6 107.9a1.4309670452316916 1.4309670452316916 0 1 0 2.861934090463383 0a1.4309670452316916 1.4309670452316916 0 1 0 -2.861934090463383 0M426.7 79.6a1.0090814149091778 1.0090814149091778 0 1 0 2.0181628298183556 0a1.0090814149091778 1.0090814149091778 0 1 0 -2.0181628298183556 0M212.1 22.9a1.6873824805835098 1.6873824805835098 0 1 0 3.3747649611670196 0a1.6873824805835098 1.6873824805835098 0 1 0 -3.3747649611670196 0M166.0 135.6a1.2072872505125471 1.2072872505125471 0 1 0 2.4145745010250943 0a1.2072872505125471 1.2072872505125471 0 1 0 -2.4145745010250943 0M384.1 118.7a0.8484502032850406 0.8484502032850406 0 1 0 1.6969004065700812 0a0.8484502032850406 0.8484502032850406 0 1 0 -1.6969004065700812 0M346.9 26.5a1.2407714030619443 1.2407714030619443 0 1 0 2.4815428061238887 0a1.2407714030619443 1.2407714030619443 0 1 0 -2.4815428061238887 0M70.5 52.0a1.3017721334023142 1.3017721334023142 0 1 0 2.6035442668046285 0a1.3017721334023142 1.3017721334023142 0 1 0 -2.6035442668046285 0M139.8 31.4a1.0955339074093233 1.0955339074093233 0 1 0 2.1910678148186467 0a1.0955339074093233 1.0955339074093233 0 1 0 -2.1910678148186467 0M413.8 64.5a1.6884514791783425 1.6884514791783425 0 1 0 3.376902958356685 0a1.6884514791783425 1.6884514791783425 0 1 0 -3.376902958356685 0M149.3 36.8a1.3544215339742802 1.3544215339742802 0 1 0 2.7088430679485604 0a1.3544215339742802 1.3544215339742802 0 1 0 -2.7088430679485604 0M227.8 18.8a1.5372585885108063 1.5372585885108063 0 1 0 3.0745171770216126 0a1.5372585885108063 1.5372585885108063 0 1 0 -3.0745171770216126 0M398.0 122.4a0.9899050625412773 0.9899050625412773 0 1 0 1.9798101250825546 0a0.9899050625412773 0.9899050625412773 0 1 0 -1.9798101250825546 0M164.5 92.6a1.232224537741602 1.232224537741602 0 1 0 2.464449075483204 0a1.232224537741602 1.232224537741602 0 1 0 -2.464449075483204 0M245.4 50.5a1.272255317095905 1.272255317095905 0 1 0 2.54451063419181 0a1.272255317095905 1.272255317095905 0 1 0 -2.54451063419181 0M45.5 43.5a1.6835144032570668 1.6835144032570668 0 1 0 3.3670288065141336 0a1.6835144032570668 1.6835144032570668 0 1 0 -3.3670288065141336 0M61.4 116.9a1.354087419578887 1.354087419578887 0 1 0 2.708174839157774 0a1.354087419578887 1.354087419578887 0 1 0 -2.708174839157774 0M121.6 81.6a0.8894359764544629 0.8894359764544629 0 1 0 1.7788719529089259 0a0.8894359764544629 0.8894359764544629 0 1 0 -1.7788719529089259 0M73.0 128.9a1.5351268890640948 1.5351268890640948 0 1 0 3.0702537781281896 0a1.5351268890640948 1.5351268890640948 0 1 0 -3.0702537781281896 0M37.3 99.0a1.1286954581073443 1.1286954581073443 0 1 0 2.2573909162146886 0a1.1286954581073443 1.1286954581073443 0 1 0 -2.2573909162146886 0M90.4 115.4a1.0243314248270647 1.0243314248270647 0 1 0 2.0486628496541295 0a1.0243314248270647 1.0243314248270647 0 1 0 -2.0486628496541295 0M116.5 66.7a1.5823694541420505 1.5823694541420505 0 1 0 3.164738908284101 0a1.5823694541420505 1.5823694541420505 0 1 0 -3.164738908284101 0M139.3 103.9a1.1654503529103941 1.1654503529103941 0 1 0 2.3309007058207882 0a1.1654503529103941 1.1654503529103941 0 1 0 -2.3309007058207882 0M258.4 1.0a1.3318354330322104 1.3318354330322104 0 1 0 2.663670866064421 0a1.3318354330322104 1.3318354330322104 0 1 0 -2.663670866064421 0M324.6 21.6a1.5118899040034879 1.5118899040034879 0 1 0 3.0237798080069758 0a1.5118899040034879 1.5118899040034879 0 1 0 -3.0237798080069758 0M65.1 38.9a1.1413594773890074 1.1413594773890074 0 1 0 2.282718954778015 0a1.1413594773890074 1.1413594773890074 0 1 0 -2.282718954778015 0M310.3 61.8a1.2266263291487716 1.2266263291487716 0 1 0 2.453252658297543 0a1.2266263291487716 1.2266263291487716 0 1 0 -2.453252658297543 0M2.6 127.7a1.694659845060352 1.694659845060352 0 1 0 3.389319690120704 0a1.694659845060352 1.694659845060352 0 1 0 -3.389319690120704 0M121.3 89.7a1.6013840605052039 1.6013840605052039 0 1 0 3.2027681210104078 0a1.6013840605052039 1.6013840605052039 0 1 0 -3.2027681210104078 0M177.8 62.0a1.5543203497345748 1.5543203497345748 0 1 0 3.1086406994691496 0a1.5543203497345748 1.5543203497345748 0 1 0 -3.1086406994691496 0M228.0 130.9a0.9722697817462216 0.9722697817462216 0 1 0 1.9445395634924432 0a0.9722697817462216 0.9722697817462216 0 1 0 -1.9445395634924432 0M17.7 140.4a1.2760772151649717 1.2760772151649717 0 1 0 2.5521544303299435 0a1.2760772151649717 1.2760772151649717 0 1 0 -2.5521544303299435 0M212.0 80.5a0.9613964102337104 0.9613964102337104 0 1 0 1.9227928204674207 0a0.9613964102337104 0.9613964102337104 0 1 0 -1.9227928204674207 0M439.2 65.0a1.6057608388883629 1.6057608388883629 0 1 0 3.2115216777767257 0a1.6057608388883629 1.6057608388883629 0 1 0 -3.2115216777767257 0M59.5 19.9a1.2139507985803772 1.2139507985803772 0 1 0 2.4279015971607545 0a1.2139507985803772 1.2139507985803772 0 1 0 -2.4279015971607545 0M133.0 29.6a1.302118682770169 1.302118682770169 0 1 0 2.604237365540338 0a1.302118682770169 1.302118682770169 0 1 0 -2.604237365540338 0M349.9 105.8a1.3523198832313716 1.3523198832313716 0 1 0 2.7046397664627433 0a1.3523198832313716 1.3523198832313716 0 1 0 -2.7046397664627433 0M118.2 15.9a0.9074454392375848 0.9074454392375848 0 1 0 1.8148908784751696 0a0.9074454392375848 0.9074454392375848 0 1 0 -1.8148908784751696 0M214.9 125.7a0.9212424336664774 0.9212424336664774 0 1 0 1.8424848673329548 0a0.9212424336664774 0.9212424336664774 0 1 0 -1.8424848673329548 0M58.8 96.3a1.4280405460652341 1.4280405460652341 0 1 0 2.8560810921304682 0a1.4280405460652341 1.4280405460652341 0 1 0 -2.8560810921304682 0M136.2 65.4a1.3252060772620198 1.3252060772620198 0 1 0 2.6504121545240396 0a1.3252060772620198 1.3252060772620198 0 1 0 -2.6504121545240396 0M414.7 53.4a0.8924563680239547 0.8924563680239547 0 1 0 1.7849127360479093 0a0.8924563680239547 0.8924563680239547 0 1 0 -1.7849127360479093 0M253.8 15.2a1.033569184442581 1.033569184442581 0 1 0 2.067138368885162 0a1.033569184442581 1.033569184442581 0 1 0 -2.067138368885162 0M343.9 75.0a1.6898629506024188 1.6898629506024188 0 1 0 3.3797259012048375 0a1.6898629506024188 1.6898629506024188 0 1 0 -3.3797259012048375 0M309.5 97.5a1.0626697009547332 1.0626697009547332 0 1 0 2.1253394019094665 0a1.0626697009547332 1.0626697009547332 0 1 0 -2.1253394019094665 0M92.4 153.9a1.6106560618715884 1.6106560618715884 0 1 0 3.2213121237431768 0a1.6106560618715884 1.6106560618715884 0 1 0 -3.2213121237431768 0M244.4 96.4a1.641334006880721 1.641334006880721 0 1 0 3.282668013761442 0a1.641334006880721 1.641334006880721 0 1 0 -3.282668013761442 0M196.9 158.8a1.626712905407616 1.626712905407616 0 1 0 3.253425810815232 0a1.626712905407616 1.626712905407616 0 1 0 -3.253425810815232 0M179.4 127.3a0.8650860707881731 0.8650860707881731 0 1 0 1.7301721415763462 0a0.8650860707881731 0.8650860707881731 0 1 0 -1.7301721415763462 0M197.6 99.9a1.4465776094203608 1.4465776094203608 0 1 0 2.8931552188407217 0a1.4465776094203608 1.4465776094203608 0 1 0 -2.8931552188407217 0M211.8 133.7a1.2176009765990088 1.2176009765990088 0 1 0 2.4352019531980176 0a1.2176009765990088 1.2176009765990088 0 1 0 -2.4352019531980176 0M207.1 19.7a0.8277561162391269 0.8277561162391269 0 1 0 1.6555122324782539 0a0.8277561162391269 0.8277561162391269 0 1 0 -1.6555122324782539 0M145.9 46.3a1.3006878378341793 1.3006878378341793 0 1 0 2.6013756756683586 0a1.3006878378341793 1.3006878378341793 0 1 0 -2.6013756756683586 0M28.7 109.5a1.313565517276121 1.313565517276121 0 1 0 2.627131034552242 0a1.313565517276121 1.313565517276121 0 1 0 -2.627131034552242 0M244.6 3.8a0.9903722161803137 0.9903722161803137 0 1 0 1.9807444323606274 0a0.9903722161803137 0.9903722161803137 0 1 0 -1.9807444323606274 0M41.2 10.9a1.318356141651381 1.318356141651381 0 1 0 2.636712283302762 0a1.318356141651381 1.318356141651381 0 1 0 -2.636712283302762 0M4.8 6.0a0.9789837515717221 0.9789837515717221 0 1 0 1.9579675031434443 0a0.9789837515717221 0.9789837515717221 0 1 0 -1.9579675031434443 0M186.9 122.1a1.3984724404741753 1.3984724404741753 0 1 0 2.7969448809483506 0a1.3984724404741753 1.3984724404741753 0 1 0 -2.7969448809483506 0M61.3 121.3a1.251744577476517 1.251744577476517 0 1 0 2.503489154953034 0a1.251744577476517 1.251744577476517 0 1 0 -2.503489154953034 0M34.2 11.7a1.0583284924350014 1.0583284924350014 0 1 0 2.1166569848700028 0a1.0583284924350014 1.0583284924350014 0 1 0 -2.1166569848700028 0M61.4 37.1a1.4924852059618434 1.4924852059618434 0 1 0 2.984970411923687 0a1.4924852059618434 1.4924852059618434 0 1 0 -2.984970411923687 0M345.3 126.3a1.0622042073516216 1.0622042073516216 0 1 0 2.124408414703243 0a1.0622042073516216 1.0622042073516216 0 1 0 -2.124408414703243 0M229.5 79.0a1.48193755101593 1.48193755101593 0 1 0 2.96387510203186 0a1.48193755101593 1.48193755101593 0 1 0 -2.96387510203186 0M357.7 27.4a1.3022089131197045 1.3022089131197045 0 1 0 2.604417826239409 0a1.3022089131197045 1.3022089131197045 0 1 0 -2.604417826239409 0M209.1 77.5a1.635512035000615 1.635512035000615 0 1 0 3.27102407000123 0a1.635512035000615 1.635512035000615 0 1 0 -3.27102407000123 0M321.2 131.2a1.3348536981128656 1.3348536981128656 0 1 0 2.669707396225731 0a1.3348536981128656 1.3348536981128656 0 1 0 -2.669707396225731 0M41.6 0.2a1.0630678635677955 1.0630678635677955 0 1 0 2.126135727135591 0a1.0630678635677955 1.0630678635677955 0 1 0 -2.126135727135591 0M287.4 133.2a0.8035066836080577 0.8035066836080577 0 1 0 1.6070133672161153 0a0.8035066836080577 0.8035066836080577 0 1 0 -1.6070133672161153 0M215.0 114.4a1.48999771190807 1.48999771190807 0 1 0 2.97999542381614 0a1.48999771190807 1.48999771190807 0 1 0 -2.97999542381614 0M143.2 72.6a1.256141767051203 1.256141767051203 0 1 0 2.512283534102406 0a1.256141767051203 1.256141767051203 0 1 0 -2.512283534102406 0M85.6 15.2a0.9393651196168411 0.9393651196168411 0 1 0 1.8787302392336822 0a0.9393651196168411 0.9393651196168411 0 1 0 -1.8787302392336822 0M251.6 153.9a0.894660669839625 0.894660669839625 0 1 0 1.78932133967925 0a0.894660669839625 0.894660669839625 0 1 0 -1.78932133967925 0M327.1 51.4a0.9340149897933147 0.9340149897933147 0 1 0 1.8680299795866293 0a0.9340149897933147 0.9340149897933147 0 1 0 -1.8680299795866293 0M290.8 126.6a1.54999852310866 1.54999852310866 0 1 0 3.09999704621732 0a1.54999852310866 1.54999852310866 0 1 0 -3.09999704621732 0M358.1 50.6a1.2855009243688555 1.2855009243688555 0 1 0 2.571001848737711 0a1.2855009243688555 1.2855009243688555 0 1 0 -2.571001848737711 0M204.3 152.1a0.8818885193969017 0.8818885193969017 0 1 0 1.7637770387938034 0a0.8818885193969017 0.8818885193969017 0 1 0 -1.7637770387938034 0M98.1 73.7a1.1954137092413508 1.1954137092413508 0 1 0 2.3908274184827016 0a1.1954137092413508 1.1954137092413508 0 1 0 -2.3908274184827016 0M57.0 96.4a1.5469468050142257 1.5469468050142257 0 1 0 3.0938936100284513 0a1.5469468050142257 1.5469468050142257 0 1 0 -3.0938936100284513 0M363.3 134.4a0.8990975376675814 0.8990975376675814 0 1 0 1.7981950753351628 0a0.8990975376675814 0.8990975376675814 0 1 0 -1.7981950753351628 0M262.4 130.4a1.435587340533349 1.435587340533349 0 1 0 2.871174681066698 0a1.435587340533349 1.435587340533349 0 1 0 -2.871174681066698 0M106.1 126.8a1.1141063055154927 1.1141063055154927 0 1 0 2.2282126110309854 0a1.1141063055154927 1.1141063055154927 0 1 0 -2.2282126110309854 0M338.1 7.1a1.2171787952232909 1.2171787952232909 0 1 0 2.4343575904465817 0a1.2171787952232909 1.2171787952232909 0 1 0 -2.4343575904465817 0M258.5 110.5a1.1879472067001715 1.1879472067001715 0 1 0 2.375894413400343 0a1.1879472067001715 1.1879472067001715 0 1 0 -2.375894413400343 0M309.9 120.7a1.6590892486358895 1.6590892486358895 0 1 0 3.318178497271779 0a1.6590892486358895 1.6590892486358895 0 1 0 -3.318178497271779 0M4.9 129.2a1.5434532436946902 1.5434532436946902 0 1 0 3.0869064873893803 0a1.5434532436946902 1.5434532436946902 0 1 0 -3.0869064873893803 0M255.5 133.9a1.5715635397672314 1.5715635397672314 0 1 0 3.143127079534463 0a1.5715635397672314 1.5715635397672314 0 1 0 -3.143127079534463 0M231.1 59.0a1.0244836477325145 1.0244836477325145 0 1 0 2.048967295465029 0a1.0244836477325145 1.0244836477325145 0 1 0 -2.048967295465029 0M46.8 49.5a1.0908947859340299 1.0908947859340299 0 1 0 2.1817895718680598 0a1.0908947859340299 1.0908947859340299 0 1 0 -2.1817895718680598 0M132.1 47.9a1.091416097564079 1.091416097564079 0 1 0 2.182832195128158 0a1.091416097564079 1.091416097564079 0 1 0 -2.182832195128158 0M14.0 142.6a1.045577079239839 1.045577079239839 0 1 0 2.091154158479678 0a1.045577079239839 1.045577079239839 0 1 0 -2.091154158479678 0M6.0 158.8a0.9501367042308084 0.9501367042308084 0 1 0 1.9002734084616169 0a0.9501367042308084 0.9501367042308084 0 1 0 -1.9002734084616169 0M319.6 72.9a1.3467013196057653 1.3467013196057653 0 1 0 2.6934026392115307 0a1.3467013196057653 1.3467013196057653 0 1 0 -2.6934026392115307 0M151.8 147.7a1.334445645692242 1.334445645692242 0 1 0 2.668891291384484 0a1.334445645692242 1.334445645692242 0 1 0 -2.668891291384484 0M210.9 16.3a1.1732633989520962 1.1732633989520962 0 1 0 2.3465267979041924 0a1.1732633989520962 1.1732633989520962 0 1 0 -2.3465267979041924 0\" transform=\"translate(74 0)\"/>\n<ellipse class=\"a2-white\" cx=\"218\" cy=\"11\" rx=\"12\" ry=\"8\"/>\n<path class=\"a2-top-vessel\" d=\"M198.4 40.0a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0M298.4 52.0a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0M418.4 70.0a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0M178.4 128.0a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0M298.4 146.0a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0M458.4 150.0a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0M118.4 110.0a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0\"/>\n<rect class=\"a2-top-light\" x=\"74\" y=\"0\" width=\"446\" height=\"160\"/>\n</g></g>\n<g transform=\"matrix(0.5427 -0.4152 0.0000 1.0561 489.30 18.47)\"><clipPath id=\"a2-endclip\"><path d=\"M0 150H160V414Q96 428 0 420Z\"/></clipPath><g clip-path=\"url(#a2-endclip)\">\n<rect x=\"0\" y=\"150\" width=\"160\" height=\"280\" fill=\"url(#a2-tissue)\"/>\n<path class=\"a2-top-thal\" d=\"M0.0 146.0C22.1 130.5 143.9 132.1 166.0 146.0C188.1 159.9 178.8 233.5 166.0 250.0C153.2 266.5 92.1 268.4 70.0 270.0C47.9 271.6 9.3 278.5 0.0 262.0C-9.3 245.5 -22.1 161.5 0.0 146.0Z\"/>\n<path class=\"a2-top-white\" d=\"M96.0 146.0C98.7 122.8 119.5 128.1 124.0 146.0C128.5 163.9 126.5 251.5 130.0 280.0C133.5 308.5 144.9 344.0 150.0 360.0C155.1 376.0 165.6 390.7 168.0 400.0C170.4 409.3 173.3 430.0 168.0 430.0C162.7 430.0 136.5 414.7 128.0 400.0C119.5 385.3 108.3 353.9 104.0 320.0C99.7 286.1 93.3 169.2 96.0 146.0Z\"/>\n<ellipse class=\"a2-white\" cx=\"70\" cy=\"398\" rx=\"16\" ry=\"9\"/>\n<path class=\"a2-speck\" d=\"M-1.5 49.6a1.520403109696138 1.520403109696138 0 1 0 3.040806219392276 0a1.520403109696138 1.520403109696138 0 1 0 -3.040806219392276 0M18.8 214.6a1.673569409245224 1.673569409245224 0 1 0 3.347138818490448 0a1.673569409245224 1.673569409245224 0 1 0 -3.347138818490448 0M66.8 29.6a0.902300886905101 0.902300886905101 0 1 0 1.804601773810202 0a0.902300886905101 0.902300886905101 0 1 0 -1.804601773810202 0M64.6 121.9a1.4072726136141203 1.4072726136141203 0 1 0 2.8145452272282405 0a1.4072726136141203 1.4072726136141203 0 1 0 -2.8145452272282405 0M75.4 84.0a1.2330392436432087 1.2330392436432087 0 1 0 2.4660784872864174 0a1.2330392436432087 1.2330392436432087 0 1 0 -2.4660784872864174 0M121.9 10.9a0.8623553079202355 0.8623553079202355 0 1 0 1.724710615840471 0a0.8623553079202355 0.8623553079202355 0 1 0 -1.724710615840471 0M70.6 162.4a1.4816363930065526 1.4816363930065526 0 1 0 2.963272786013105 0a1.4816363930065526 1.4816363930065526 0 1 0 -2.963272786013105 0M27.8 81.2a1.1365356070329766 1.1365356070329766 0 1 0 2.2730712140659532 0a1.1365356070329766 1.1365356070329766 0 1 0 -2.2730712140659532 0M96.9 200.4a1.5449156150640135 1.5449156150640135 0 1 0 3.089831230128027 0a1.5449156150640135 1.5449156150640135 0 1 0 -3.089831230128027 0M140.6 200.9a1.0796438147124312 1.0796438147124312 0 1 0 2.1592876294248624 0a1.0796438147124312 1.0796438147124312 0 1 0 -2.1592876294248624 0M29.7 232.1a1.1258692484124277 1.1258692484124277 0 1 0 2.2517384968248555 0a1.1258692484124277 1.1258692484124277 0 1 0 -2.2517384968248555 0M66.7 168.7a1.658697231634238 1.658697231634238 0 1 0 3.317394463268476 0a1.658697231634238 1.658697231634238 0 1 0 -3.317394463268476 0M109.4 218.1a1.627402822791974 1.627402822791974 0 1 0 3.254805645583948 0a1.627402822791974 1.627402822791974 0 1 0 -3.254805645583948 0M44.5 60.3a1.5586573182685837 1.5586573182685837 0 1 0 3.1173146365371673 0a1.5586573182685837 1.5586573182685837 0 1 0 -3.1173146365371673 0M79.1 210.7a1.5773004554466348 1.5773004554466348 0 1 0 3.1546009108932695 0a1.5773004554466348 1.5773004554466348 0 1 0 -3.1546009108932695 0M103.0 184.9a1.666127741444975 1.666127741444975 0 1 0 3.33225548288995 0a1.666127741444975 1.666127741444975 0 1 0 -3.33225548288995 0M71.1 250.5a1.608607700754523 1.608607700754523 0 1 0 3.217215401509046 0a1.608607700754523 1.608607700754523 0 1 0 -3.217215401509046 0M46.7 37.8a1.2267454062371939 1.2267454062371939 0 1 0 2.4534908124743877 0a1.2267454062371939 1.2267454062371939 0 1 0 -2.4534908124743877 0M36.2 134.6a1.1407908021386628 1.1407908021386628 0 1 0 2.2815816042773256 0a1.1407908021386628 1.1407908021386628 0 1 0 -2.2815816042773256 0M11.3 49.4a1.2905710529448196 1.2905710529448196 0 1 0 2.581142105889639 0a1.2905710529448196 1.2905710529448196 0 1 0 -2.581142105889639 0M21.3 146.0a1.3819649053569556 1.3819649053569556 0 1 0 2.763929810713911 0a1.3819649053569556 1.3819649053569556 0 1 0 -2.763929810713911 0M138.2 237.5a1.2012111481290415 1.2012111481290415 0 1 0 2.402422296258083 0a1.2012111481290415 1.2012111481290415 0 1 0 -2.402422296258083 0M62.0 220.5a1.2768904244777657 1.2768904244777657 0 1 0 2.5537808489555314 0a1.2768904244777657 1.2768904244777657 0 1 0 -2.5537808489555314 0M105.0 136.7a1.2115513987481141 1.2115513987481141 0 1 0 2.4231027974962283 0a1.2115513987481141 1.2115513987481141 0 1 0 -2.4231027974962283 0M77.5 60.6a1.4909538888288232 1.4909538888288232 0 1 0 2.9819077776576464 0a1.4909538888288232 1.4909538888288232 0 1 0 -2.9819077776576464 0M27.6 126.6a1.2056802678440515 1.2056802678440515 0 1 0 2.411360535688103 0a1.2056802678440515 1.2056802678440515 0 1 0 -2.411360535688103 0M135.4 251.6a1.205320131830238 1.205320131830238 0 1 0 2.410640263660476 0a1.205320131830238 1.205320131830238 0 1 0 -2.410640263660476 0M19.5 38.6a0.9764879393172339 0.9764879393172339 0 1 0 1.9529758786344678 0a0.9764879393172339 0.9764879393172339 0 1 0 -1.9529758786344678 0M128.9 179.8a1.3634185657495808 1.3634185657495808 0 1 0 2.7268371314991615 0a1.3634185657495808 1.3634185657495808 0 1 0 -2.7268371314991615 0M82.9 268.7a1.6974349305941119 1.6974349305941119 0 1 0 3.3948698611882238 0a1.6974349305941119 1.6974349305941119 0 1 0 -3.3948698611882238 0M14.9 204.4a0.9432235087204943 0.9432235087204943 0 1 0 1.8864470174409886 0a0.9432235087204943 0.9432235087204943 0 1 0 -1.8864470174409886 0M97.8 86.4a1.3524506367300178 1.3524506367300178 0 1 0 2.7049012734600355 0a1.3524506367300178 1.3524506367300178 0 1 0 -2.7049012734600355 0M112.2 154.9a1.1814699049400816 1.1814699049400816 0 1 0 2.3629398098801633 0a1.1814699049400816 1.1814699049400816 0 1 0 -2.3629398098801633 0M117.2 225.6a0.9901306845155831 0.9901306845155831 0 1 0 1.9802613690311661 0a0.9901306845155831 0.9901306845155831 0 1 0 -1.9802613690311661 0M92.4 163.3a1.145131814102765 1.145131814102765 0 1 0 2.29026362820553 0a1.145131814102765 1.145131814102765 0 1 0 -2.29026362820553 0M22.1 59.8a1.0677354101722458 1.0677354101722458 0 1 0 2.1354708203444916 0a1.0677354101722458 1.0677354101722458 0 1 0 -2.1354708203444916 0M128.3 131.3a1.3384221555091647 1.3384221555091647 0 1 0 2.6768443110183293 0a1.3384221555091647 1.3384221555091647 0 1 0 -2.6768443110183293 0M116.7 267.6a0.8149735986394562 0.8149735986394562 0 1 0 1.6299471972789124 0a0.8149735986394562 0.8149735986394562 0 1 0 -1.6299471972789124 0M98.6 156.2a1.1941169324276195 1.1941169324276195 0 1 0 2.388233864855239 0a1.1941169324276195 1.1941169324276195 0 1 0 -2.388233864855239 0M145.4 116.7a0.9564608208429635 0.9564608208429635 0 1 0 1.912921641685927 0a0.9564608208429635 0.9564608208429635 0 1 0 -1.912921641685927 0M130.2 127.2a0.8242967673337989 0.8242967673337989 0 1 0 1.6485935346675977 0a0.8242967673337989 0.8242967673337989 0 1 0 -1.6485935346675977 0M115.4 65.3a1.1495387019585248 1.1495387019585248 0 1 0 2.2990774039170496 0a1.1495387019585248 1.1495387019585248 0 1 0 -2.2990774039170496 0M69.2 43.0a1.3652568612855458 1.3652568612855458 0 1 0 2.7305137225710916 0a1.3652568612855458 1.3652568612855458 0 1 0 -2.7305137225710916 0M135.7 265.4a1.5816753562834815 1.5816753562834815 0 1 0 3.163350712566963 0a1.5816753562834815 1.5816753562834815 0 1 0 -3.163350712566963 0M55.3 35.7a1.2250990998699323 1.2250990998699323 0 1 0 2.4501981997398645 0a1.2250990998699323 1.2250990998699323 0 1 0 -2.4501981997398645 0M77.2 134.4a1.0950173265254288 1.0950173265254288 0 1 0 2.1900346530508576 0a1.0950173265254288 1.0950173265254288 0 1 0 -2.1900346530508576 0M44.5 164.7a1.0798797409794105 1.0798797409794105 0 1 0 2.159759481958821 0a1.0798797409794105 1.0798797409794105 0 1 0 -2.159759481958821 0M94.7 1.4a1.1000276531558741 1.1000276531558741 0 1 0 2.2000553063117483 0a1.1000276531558741 1.1000276531558741 0 1 0 -2.2000553063117483 0M134.9 183.3a1.0487401484034398 1.0487401484034398 0 1 0 2.0974802968068795 0a1.0487401484034398 1.0487401484034398 0 1 0 -2.0974802968068795 0M12.3 72.7a1.1569678492909 1.1569678492909 0 1 0 2.3139356985818 0a1.1569678492909 1.1569678492909 0 1 0 -2.3139356985818 0M27.3 175.5a0.9208495286021843 0.9208495286021843 0 1 0 1.8416990572043686 0a0.9208495286021843 0.9208495286021843 0 1 0 -1.8416990572043686 0M126.3 235.8a1.3970801669611412 1.3970801669611412 0 1 0 2.7941603339222825 0a1.3970801669611412 1.3970801669611412 0 1 0 -2.7941603339222825 0M21.1 232.5a1.3352356094729487 1.3352356094729487 0 1 0 2.6704712189458975 0a1.3352356094729487 1.3352356094729487 0 1 0 -2.6704712189458975 0M35.4 62.3a1.0590976045551688 1.0590976045551688 0 1 0 2.1181952091103375 0a1.0590976045551688 1.0590976045551688 0 1 0 -2.1181952091103375 0M79.6 223.9a1.0298389688877752 1.0298389688877752 0 1 0 2.0596779377755503 0a1.0298389688877752 1.0298389688877752 0 1 0 -2.0596779377755503 0M17.4 226.4a1.0503703598402165 1.0503703598402165 0 1 0 2.100740719680433 0a1.0503703598402165 1.0503703598402165 0 1 0 -2.100740719680433 0M83.4 187.1a0.962627104541871 0.962627104541871 0 1 0 1.925254209083742 0a0.962627104541871 0.962627104541871 0 1 0 -1.925254209083742 0M154.1 224.0a1.213808271022335 1.213808271022335 0 1 0 2.42761654204467 0a1.213808271022335 1.213808271022335 0 1 0 -2.42761654204467 0M101.3 77.8a1.0497646445406272 1.0497646445406272 0 1 0 2.0995292890812545 0a1.0497646445406272 1.0497646445406272 0 1 0 -2.0995292890812545 0M33.7 13.1a0.8879890009648996 0.8879890009648996 0 1 0 1.7759780019297993 0a0.8879890009648996 0.8879890009648996 0 1 0 -1.7759780019297993 0M22.3 19.1a1.0524511547316342 1.0524511547316342 0 1 0 2.1049023094632684 0a1.0524511547316342 1.0524511547316342 0 1 0 -2.1049023094632684 0M60.0 233.5a1.6435119115687087 1.6435119115687087 0 1 0 3.2870238231374174 0a1.6435119115687087 1.6435119115687087 0 1 0 -3.2870238231374174 0M17.6 48.7a1.0260173117984248 1.0260173117984248 0 1 0 2.0520346235968496 0a1.0260173117984248 1.0260173117984248 0 1 0 -2.0520346235968496 0M118.3 65.2a1.29824258857243 1.29824258857243 0 1 0 2.59648517714486 0a1.29824258857243 1.29824258857243 0 1 0 -2.59648517714486 0M63.0 96.7a1.5223326103969783 1.5223326103969783 0 1 0 3.0446652207939566 0a1.5223326103969783 1.5223326103969783 0 1 0 -3.0446652207939566 0M24.2 151.8a1.4251834695927645 1.4251834695927645 0 1 0 2.850366939185529 0a1.4251834695927645 1.4251834695927645 0 1 0 -2.850366939185529 0M151.7 114.0a0.9807453958603977 0.9807453958603977 0 1 0 1.9614907917207953 0a0.9807453958603977 0.9807453958603977 0 1 0 -1.9614907917207953 0M49.8 238.8a1.330760711692982 1.330760711692982 0 1 0 2.661521423385964 0a1.330760711692982 1.330760711692982 0 1 0 -2.661521423385964 0M104.3 163.0a1.5531485047686366 1.5531485047686366 0 1 0 3.1062970095372733 0a1.5531485047686366 1.5531485047686366 0 1 0 -3.1062970095372733 0M99.3 251.3a1.4536307135630686 1.4536307135630686 0 1 0 2.907261427126137 0a1.4536307135630686 1.4536307135630686 0 1 0 -2.907261427126137 0M28.8 240.1a1.6643131407111076 1.6643131407111076 0 1 0 3.328626281422215 0a1.6643131407111076 1.6643131407111076 0 1 0 -3.328626281422215 0M89.6 222.3a1.196702911329179 1.196702911329179 0 1 0 2.393405822658358 0a1.196702911329179 1.196702911329179 0 1 0 -2.393405822658358 0M31.6 96.9a1.4078987711182784 1.4078987711182784 0 1 0 2.815797542236557 0a1.4078987711182784 1.4078987711182784 0 1 0 -2.815797542236557 0M26.0 263.1a1.452397983709721 1.452397983709721 0 1 0 2.904795967419442 0a1.452397983709721 1.452397983709721 0 1 0 -2.904795967419442 0M26.0 158.4a1.1787207970197506 1.1787207970197506 0 1 0 2.3574415940395013 0a1.1787207970197506 1.1787207970197506 0 1 0 -2.3574415940395013 0M63.2 2.5a0.924597869184425 0.924597869184425 0 1 0 1.84919573836885 0a0.924597869184425 0.924597869184425 0 1 0 -1.84919573836885 0M125.8 67.4a1.5136496191971467 1.5136496191971467 0 1 0 3.0272992383942934 0a1.5136496191971467 1.5136496191971467 0 1 0 -3.0272992383942934 0M0.6 241.8a1.0274794912221652 1.0274794912221652 0 1 0 2.0549589824443304 0a1.0274794912221652 1.0274794912221652 0 1 0 -2.0549589824443304 0M6.9 244.2a1.64580905511585 1.64580905511585 0 1 0 3.2916181102317 0a1.64580905511585 1.64580905511585 0 1 0 -3.2916181102317 0M0.9 227.2a1.368741606519317 1.368741606519317 0 1 0 2.737483213038634 0a1.368741606519317 1.368741606519317 0 1 0 -2.737483213038634 0M148.4 258.5a0.9870074289729889 0.9870074289729889 0 1 0 1.9740148579459778 0a0.9870074289729889 0.9870074289729889 0 1 0 -1.9740148579459778 0M40.0 77.3a1.6133035547223908 1.6133035547223908 0 1 0 3.2266071094447817 0a1.6133035547223908 1.6133035547223908 0 1 0 -3.2266071094447817 0M157.3 103.3a1.4069549851649952 1.4069549851649952 0 1 0 2.8139099703299904 0a1.4069549851649952 1.4069549851649952 0 1 0 -2.8139099703299904 0M86.7 1.4a0.807119899110049 0.807119899110049 0 1 0 1.614239798220098 0a0.807119899110049 0.807119899110049 0 1 0 -1.614239798220098 0M152.0 147.4a1.5853384638068624 1.5853384638068624 0 1 0 3.1706769276137248 0a1.5853384638068624 1.5853384638068624 0 1 0 -3.1706769276137248 0M120.6 38.5a0.912552068487324 0.912552068487324 0 1 0 1.825104136974648 0a0.912552068487324 0.912552068487324 0 1 0 -1.825104136974648 0M134.4 142.5a1.1422569482980827 1.1422569482980827 0 1 0 2.2845138965961653 0a1.1422569482980827 1.1422569482980827 0 1 0 -2.2845138965961653 0M71.9 229.8a1.4620746377967992 1.4620746377967992 0 1 0 2.9241492755935985 0a1.4620746377967992 1.4620746377967992 0 1 0 -2.9241492755935985 0M138.5 179.9a1.632202637504975 1.632202637504975 0 1 0 3.26440527500995 0a1.632202637504975 1.632202637504975 0 1 0 -3.26440527500995 0M146.3 197.0a1.2494682269165929 1.2494682269165929 0 1 0 2.4989364538331857 0a1.2494682269165929 1.2494682269165929 0 1 0 -2.4989364538331857 0M89.9 142.5a1.2578140439072756 1.2578140439072756 0 1 0 2.515628087814551 0a1.2578140439072756 1.2578140439072756 0 1 0 -2.515628087814551 0M66.4 62.0a1.3006837990141324 1.3006837990141324 0 1 0 2.601367598028265 0a1.3006837990141324 1.3006837990141324 0 1 0 -2.601367598028265 0M157.2 14.8a1.5219245231914562 1.5219245231914562 0 1 0 3.0438490463829124 0a1.5219245231914562 1.5219245231914562 0 1 0 -3.0438490463829124 0M85.4 201.3a0.8916614367083288 0.8916614367083288 0 1 0 1.7833228734166575 0a0.8916614367083288 0.8916614367083288 0 1 0 -1.7833228734166575 0M115.2 229.3a0.9768393988039712 0.9768393988039712 0 1 0 1.9536787976079424 0a0.9768393988039712 0.9768393988039712 0 1 0 -1.9536787976079424 0M59.1 61.6a1.3249638947425075 1.3249638947425075 0 1 0 2.649927789485015 0a1.3249638947425075 1.3249638947425075 0 1 0 -2.649927789485015 0M64.2 159.8a1.2096732087057767 1.2096732087057767 0 1 0 2.4193464174115533 0a1.2096732087057767 1.2096732087057767 0 1 0 -2.4193464174115533 0M66.0 240.7a1.0830661122529452 1.0830661122529452 0 1 0 2.1661322245058905 0a1.0830661122529452 1.0830661122529452 0 1 0 -2.1661322245058905 0M14.7 247.0a1.6772262278266497 1.6772262278266497 0 1 0 3.3544524556532993 0a1.6772262278266497 1.6772262278266497 0 1 0 -3.3544524556532993 0M113.1 71.3a0.9376354828827413 0.9376354828827413 0 1 0 1.8752709657654827 0a0.9376354828827413 0.9376354828827413 0 1 0 -1.8752709657654827 0M41.8 209.6a0.8231171997013662 0.8231171997013662 0 1 0 1.6462343994027324 0a0.8231171997013662 0.8231171997013662 0 1 0 -1.6462343994027324 0M111.0 137.2a1.145554754459816 1.145554754459816 0 1 0 2.291109508919632 0a1.145554754459816 1.145554754459816 0 1 0 -2.291109508919632 0M5.8 234.6a1.0686589655640153 1.0686589655640153 0 1 0 2.1373179311280306 0a1.0686589655640153 1.0686589655640153 0 1 0 -2.1373179311280306 0M7.6 233.0a1.4615985410861656 1.4615985410861656 0 1 0 2.923197082172331 0a1.4615985410861656 1.4615985410861656 0 1 0 -2.923197082172331 0M156.0 78.8a1.6702977458204122 1.6702977458204122 0 1 0 3.3405954916408245 0a1.6702977458204122 1.6702977458204122 0 1 0 -3.3405954916408245 0M51.1 77.6a1.2096704426777274 1.2096704426777274 0 1 0 2.4193408853554548 0a1.2096704426777274 1.2096704426777274 0 1 0 -2.4193408853554548 0M57.8 200.3a1.0874522737576182 1.0874522737576182 0 1 0 2.1749045475152364 0a1.0874522737576182 1.0874522737576182 0 1 0 -2.1749045475152364 0M0.3 175.8a1.5596594389152336 1.5596594389152336 0 1 0 3.1193188778304672 0a1.5596594389152336 1.5596594389152336 0 1 0 -3.1193188778304672 0M33.4 204.4a1.5169848136762016 1.5169848136762016 0 1 0 3.0339696273524033 0a1.5169848136762016 1.5169848136762016 0 1 0 -3.0339696273524033 0M45.3 178.9a1.589867116408299 1.589867116408299 0 1 0 3.179734232816598 0a1.589867116408299 1.589867116408299 0 1 0 -3.179734232816598 0\" transform=\"translate(0 150)\"/>\n<rect class=\"a2-end-shade\" x=\"0\" y=\"150\" width=\"160\" height=\"280\"/>\n</g><path class=\"a2-block-edge\" d=\"M0 150H160V414Q96 428 0 420\"/></g>\n<path class=\"a2-block-edge\" d=\"M34.1 78.4L120.9 12L576.1 110.4L489.3 176.9\"/>\n<g class=\"a2-front\" transform=\"matrix(1.0207 0.2207 0.0000 1.0561 -41.46 -96.32)\">\n<defs><radialGradient id=\"a2-tissue-front\" gradientUnits=\"userSpaceOnUse\" cx=\"268\" cy=\"323\" r=\"330\"><stop offset=\"0\" class=\"a2-t0\"/><stop offset=\"1\" class=\"a2-t1\"/></radialGradient><clipPath id=\"a2-brainclip\"><path d=\"M80.0 168.0C87.8 160.2 134.0 143.8 150.0 142.0C166.0 140.2 222.0 150.4 240.0 150.0C258.0 149.6 312.0 138.4 330.0 138.0C348.0 137.6 403.0 145.8 420.0 146.0C437.0 146.2 489.8 137.6 500.0 140.0C510.2 142.4 520.0 154.0 522.0 170.0C524.0 186.0 520.0 275.0 520.0 300.0C520.0 325.0 522.4 404.4 522.0 420.0C521.6 435.6 517.6 452.8 516.0 456.0C514.4 459.2 508.2 451.4 506.0 452.0C503.8 452.6 497.6 460.4 494.0 462.0C490.4 463.6 474.6 468.2 470.0 468.0C465.4 467.8 452.0 462.0 448.0 460.0C444.0 458.0 435.2 449.8 430.0 448.0C424.8 446.2 403.8 442.8 396.0 442.0C388.2 441.2 358.8 439.8 352.0 440.0C345.2 440.2 331.6 443.0 328.0 444.0C324.4 445.0 319.8 449.4 316.0 450.0C312.2 450.6 294.0 450.8 290.0 450.0C286.0 449.2 280.6 443.8 276.0 442.0C271.4 440.2 251.0 434.2 244.0 432.0C237.0 429.8 213.4 421.4 206.0 420.0C198.6 418.6 175.6 417.6 170.0 418.0C164.4 418.4 155.2 423.0 150.0 424.0C144.8 425.0 123.8 427.4 118.0 428.0C112.2 428.6 96.2 431.0 92.0 430.0C87.8 429.0 77.8 431.0 76.0 418.0C74.2 405.0 74.4 319.8 74.0 300.0C73.6 280.2 71.4 233.2 72.0 220.0C72.6 206.8 72.2 175.8 80.0 168.0Z\"/><path d=\"M74 150H520V400H74Z\"/></clipPath><clipPath id=\"a2-baseclip\"><rect x=\"77\" y=\"396\" width=\"440\" height=\"120\"/></clipPath><clipPath id=\"a2-cutclip\"><rect x=\"74\" y=\"150\" width=\"446\" height=\"600\"/><rect x=\"40\" y=\"400\" width=\"480\" height=\"200\"/></clipPath></defs>\n<g clip-path=\"url(#a2-cutclip)\">\n<path class=\"a2-sella\" d=\"M240.0 506.0C242.4 510.8 242.1 529.9 246.0 538.0C249.9 546.1 257.0 555.8 266.0 560.0C275.0 564.2 294.0 566.0 306.0 566.0C318.0 566.0 337.3 564.5 346.0 560.0C354.7 555.5 360.7 544.1 364.0 536.0C367.3 527.9 365.9 510.5 368.0 506.0C370.1 501.5 376.8 500.3 378.0 506.0C379.2 511.7 379.6 533.8 376.0 544.0C372.4 554.2 364.5 568.3 354.0 574.0C343.5 579.7 320.4 581.7 306.0 582.0C291.6 582.3 268.5 581.4 258.0 576.0C247.5 570.6 240.2 556.5 236.0 546.0C231.8 535.5 229.4 512.0 230.0 506.0C230.6 500.0 237.6 501.2 240.0 506.0Z\"/>\n<path class=\"a2-brain a2-brain-fill\" d=\"M74 150H520V400H74Z\" fill=\"url(#a2-tissue-front)\"/>\n<path class=\"a2-brain a2-brain-fill\" d=\"M80.0 168.0C87.8 160.2 134.0 143.8 150.0 142.0C166.0 140.2 222.0 150.4 240.0 150.0C258.0 149.6 312.0 138.4 330.0 138.0C348.0 137.6 403.0 145.8 420.0 146.0C437.0 146.2 489.8 137.6 500.0 140.0C510.2 142.4 520.0 154.0 522.0 170.0C524.0 186.0 520.0 275.0 520.0 300.0C520.0 325.0 522.4 404.4 522.0 420.0C521.6 435.6 517.6 452.8 516.0 456.0C514.4 459.2 508.2 451.4 506.0 452.0C503.8 452.6 497.6 460.4 494.0 462.0C490.4 463.6 474.6 468.2 470.0 468.0C465.4 467.8 452.0 462.0 448.0 460.0C444.0 458.0 435.2 449.8 430.0 448.0C424.8 446.2 403.8 442.8 396.0 442.0C388.2 441.2 358.8 439.8 352.0 440.0C345.2 440.2 331.6 443.0 328.0 444.0C324.4 445.0 319.8 449.4 316.0 450.0C312.2 450.6 294.0 450.8 290.0 450.0C286.0 449.2 280.6 443.8 276.0 442.0C271.4 440.2 251.0 434.2 244.0 432.0C237.0 429.8 213.4 421.4 206.0 420.0C198.6 418.6 175.6 417.6 170.0 418.0C164.4 418.4 155.2 423.0 150.0 424.0C144.8 425.0 123.8 427.4 118.0 428.0C112.2 428.6 96.2 431.0 92.0 430.0C87.8 429.0 77.8 431.0 76.0 418.0C74.2 405.0 74.4 319.8 74.0 300.0C73.6 280.2 71.4 233.2 72.0 220.0C72.6 206.8 72.2 175.8 80.0 168.0Z\" fill=\"url(#a2-tissue-front)\"/>\n<path class=\"a2-base-edge\" clip-path=\"url(#a2-baseclip)\" d=\"M80.0 168.0C87.8 160.2 134.0 143.8 150.0 142.0C166.0 140.2 222.0 150.4 240.0 150.0C258.0 149.6 312.0 138.4 330.0 138.0C348.0 137.6 403.0 145.8 420.0 146.0C437.0 146.2 489.8 137.6 500.0 140.0C510.2 142.4 520.0 154.0 522.0 170.0C524.0 186.0 520.0 275.0 520.0 300.0C520.0 325.0 522.4 404.4 522.0 420.0C521.6 435.6 517.6 452.8 516.0 456.0C514.4 459.2 508.2 451.4 506.0 452.0C503.8 452.6 497.6 460.4 494.0 462.0C490.4 463.6 474.6 468.2 470.0 468.0C465.4 467.8 452.0 462.0 448.0 460.0C444.0 458.0 435.2 449.8 430.0 448.0C424.8 446.2 403.8 442.8 396.0 442.0C388.2 441.2 358.8 439.8 352.0 440.0C345.2 440.2 331.6 443.0 328.0 444.0C324.4 445.0 319.8 449.4 316.0 450.0C312.2 450.6 294.0 450.8 290.0 450.0C286.0 449.2 280.6 443.8 276.0 442.0C271.4 440.2 251.0 434.2 244.0 432.0C237.0 429.8 213.4 421.4 206.0 420.0C198.6 418.6 175.6 417.6 170.0 418.0C164.4 418.4 155.2 423.0 150.0 424.0C144.8 425.0 123.8 427.4 118.0 428.0C112.2 428.6 96.2 431.0 92.0 430.0C87.8 429.0 77.8 431.0 76.0 418.0C74.2 405.0 74.4 319.8 74.0 300.0C73.6 280.2 71.4 233.2 72.0 220.0C72.6 206.8 72.2 175.8 80.0 168.0Z\"/>\n<g clip-path=\"url(#a2-brainclip)\">\n  <path class=\"a2-thal\" d=\"M180.0 30.0C198.7 10.0 287.3 10.5 330.0 10.0C372.7 9.5 464.0 18.0 500.0 26.0C536.0 34.0 586.7 40.1 600.0 70.0C613.3 99.9 617.3 228.7 600.0 250.0C582.7 271.3 506.0 234.3 470.0 230.0C434.0 225.7 362.0 221.5 330.0 218.0C298.0 214.5 248.7 211.7 230.0 204.0C211.3 196.3 196.7 183.2 190.0 160.0C183.3 136.8 161.3 50.0 180.0 30.0Z\"/>\n  <ellipse class=\"a2-adh\" cx=\"384\" cy=\"184\" rx=\"36\" ry=\"20\"/>\n  <path class=\"a2-speck\" d=\"M506.8 412.7a1.116522091549376 1.116522091549376 0 1 0 2.233044183098752 0a1.116522091549376 1.116522091549376 0 1 0 -2.233044183098752 0M321.6 360.9a1.2584261172995215 1.2584261172995215 0 1 0 2.516852234599043 0a1.2584261172995215 1.2584261172995215 0 1 0 -2.516852234599043 0M460.8 277.5a1.6348306214761275 1.6348306214761275 0 1 0 3.269661242952255 0a1.6348306214761275 1.6348306214761275 0 1 0 -3.269661242952255 0M442.2 302.6a1.003007265090018 1.003007265090018 0 1 0 2.006014530180036 0a1.003007265090018 1.003007265090018 0 1 0 -2.006014530180036 0M449.4 167.0a1.1157015426230632 1.1157015426230632 0 1 0 2.2314030852461264 0a1.1157015426230632 1.1157015426230632 0 1 0 -2.2314030852461264 0M322.2 258.1a1.2250250126468252 1.2250250126468252 0 1 0 2.4500500252936503 0a1.2250250126468252 1.2250250126468252 0 1 0 -2.4500500252936503 0M117.8 258.9a0.9570902422602198 0.9570902422602198 0 1 0 1.9141804845204395 0a0.9570902422602198 0.9570902422602198 0 1 0 -1.9141804845204395 0M332.0 317.2a1.6324798371013998 1.6324798371013998 0 1 0 3.2649596742027995 0a1.6324798371013998 1.6324798371013998 0 1 0 -3.2649596742027995 0M328.4 255.6a1.5750509554753553 1.5750509554753553 0 1 0 3.1501019109507107 0a1.5750509554753553 1.5750509554753553 0 1 0 -3.1501019109507107 0M366.1 300.8a1.0752174447991116 1.0752174447991116 0 1 0 2.1504348895982233 0a1.0752174447991116 1.0752174447991116 0 1 0 -2.1504348895982233 0M313.5 217.2a1.6662409952061634 1.6662409952061634 0 1 0 3.332481990412327 0a1.6662409952061634 1.6662409952061634 0 1 0 -3.332481990412327 0M331.0 439.5a0.9323819477878343 0.9323819477878343 0 1 0 1.8647638955756687 0a0.9323819477878343 0.9323819477878343 0 1 0 -1.8647638955756687 0M386.3 228.0a1.543816697265782 1.543816697265782 0 1 0 3.087633394531564 0a1.543816697265782 1.543816697265782 0 1 0 -3.087633394531564 0M236.0 428.8a1.2349531783116545 1.2349531783116545 0 1 0 2.469906356623309 0a1.2349531783116545 1.2349531783116545 0 1 0 -2.469906356623309 0M303.2 208.6a0.890380097264778 0.890380097264778 0 1 0 1.780760194529556 0a0.890380097264778 0.890380097264778 0 1 0 -1.780760194529556 0M436.1 426.9a1.036192163579345 1.036192163579345 0 1 0 2.07238432715869 0a1.036192163579345 1.036192163579345 0 1 0 -2.07238432715869 0M416.8 245.7a1.5756286802474677 1.5756286802474677 0 1 0 3.1512573604949354 0a1.5756286802474677 1.5756286802474677 0 1 0 -3.1512573604949354 0M324.8 230.5a1.5272139692932498 1.5272139692932498 0 1 0 3.0544279385864996 0a1.5272139692932498 1.5272139692932498 0 1 0 -3.0544279385864996 0M214.1 347.3a1.6908694973130427 1.6908694973130427 0 1 0 3.3817389946260854 0a1.6908694973130427 1.6908694973130427 0 1 0 -3.3817389946260854 0M295.8 387.3a0.9553809907337474 0.9553809907337474 0 1 0 1.9107619814674948 0a0.9553809907337474 0.9553809907337474 0 1 0 -1.9107619814674948 0M369.7 298.2a1.0195655664611287 1.0195655664611287 0 1 0 2.0391311329222574 0a1.0195655664611287 1.0195655664611287 0 1 0 -2.0391311329222574 0M190.5 299.0a1.360576732606233 1.360576732606233 0 1 0 2.721153465212466 0a1.360576732606233 1.360576732606233 0 1 0 -2.721153465212466 0M279.9 232.5a1.2420752391145335 1.2420752391145335 0 1 0 2.484150478229067 0a1.2420752391145335 1.2420752391145335 0 1 0 -2.484150478229067 0M303.0 170.0a1.3667004651545551 1.3667004651545551 0 1 0 2.7334009303091102 0a1.3667004651545551 1.3667004651545551 0 1 0 -2.7334009303091102 0M444.2 298.8a1.3040157371238021 1.3040157371238021 0 1 0 2.6080314742476043 0a1.3040157371238021 1.3040157371238021 0 1 0 -2.6080314742476043 0M167.3 393.0a1.136294038068777 1.136294038068777 0 1 0 2.272588076137554 0a1.136294038068777 1.136294038068777 0 1 0 -2.272588076137554 0M116.8 324.5a1.1477049795889342 1.1477049795889342 0 1 0 2.2954099591778685 0a1.1477049795889342 1.1477049795889342 0 1 0 -2.2954099591778685 0M159.1 304.0a1.6297646486477597 1.6297646486477597 0 1 0 3.2595292972955194 0a1.6297646486477597 1.6297646486477597 0 1 0 -3.2595292972955194 0M249.6 185.7a1.5541768561621914 1.5541768561621914 0 1 0 3.1083537123243827 0a1.5541768561621914 1.5541768561621914 0 1 0 -3.1083537123243827 0M452.5 376.9a1.016674850058439 1.016674850058439 0 1 0 2.033349700116878 0a1.016674850058439 1.016674850058439 0 1 0 -2.033349700116878 0M198.8 210.2a1.080914295400413 1.080914295400413 0 1 0 2.161828590800826 0a1.080914295400413 1.080914295400413 0 1 0 -2.161828590800826 0M491.2 365.1a1.3060082177687513 1.3060082177687513 0 1 0 2.6120164355375026 0a1.3060082177687513 1.3060082177687513 0 1 0 -2.6120164355375026 0M263.1 304.6a1.1987664612929956 1.1987664612929956 0 1 0 2.397532922585991 0a1.1987664612929956 1.1987664612929956 0 1 0 -2.397532922585991 0M429.9 395.8a0.8168563848984022 0.8168563848984022 0 1 0 1.6337127697968044 0a0.8168563848984022 0.8168563848984022 0 1 0 -1.6337127697968044 0M429.1 295.3a1.353216370524109 1.353216370524109 0 1 0 2.706432741048218 0a1.353216370524109 1.353216370524109 0 1 0 -2.706432741048218 0M517.6 435.5a1.0235765627804927 1.0235765627804927 0 1 0 2.0471531255609854 0a1.0235765627804927 1.0235765627804927 0 1 0 -2.0471531255609854 0M146.1 255.0a1.227964438803461 1.227964438803461 0 1 0 2.455928877606922 0a1.227964438803461 1.227964438803461 0 1 0 -2.455928877606922 0M284.6 192.5a1.308963163857314 1.308963163857314 0 1 0 2.617926327714628 0a1.308963163857314 1.308963163857314 0 1 0 -2.617926327714628 0M213.3 158.8a1.2185377586339952 1.2185377586339952 0 1 0 2.4370755172679903 0a1.2185377586339952 1.2185377586339952 0 1 0 -2.4370755172679903 0M510.8 413.1a0.8645041294996666 0.8645041294996666 0 1 0 1.7290082589993332 0a0.8645041294996666 0.8645041294996666 0 1 0 -1.7290082589993332 0M334.7 376.3a1.5727404478217852 1.5727404478217852 0 1 0 3.1454808956435705 0a1.5727404478217852 1.5727404478217852 0 1 0 -3.1454808956435705 0M298.4 253.7a0.964230410488537 0.964230410488537 0 1 0 1.928460820977074 0a0.964230410488537 0.964230410488537 0 1 0 -1.928460820977074 0M488.5 354.0a0.9239958871845119 0.9239958871845119 0 1 0 1.8479917743690237 0a0.9239958871845119 0.9239958871845119 0 1 0 -1.8479917743690237 0M323.6 246.9a1.378000617612154 1.378000617612154 0 1 0 2.756001235224308 0a1.378000617612154 1.378000617612154 0 1 0 -2.756001235224308 0M326.9 426.5a1.5271312369752035 1.5271312369752035 0 1 0 3.054262473950407 0a1.5271312369752035 1.5271312369752035 0 1 0 -3.054262473950407 0M424.1 184.0a0.9890147975543653 0.9890147975543653 0 1 0 1.9780295951087306 0a0.9890147975543653 0.9890147975543653 0 1 0 -1.9780295951087306 0M412.4 393.5a0.8868950683035842 0.8868950683035842 0 1 0 1.7737901366071684 0a0.8868950683035842 0.8868950683035842 0 1 0 -1.7737901366071684 0M398.7 418.2a1.140537277227768 1.140537277227768 0 1 0 2.281074554455536 0a1.140537277227768 1.140537277227768 0 1 0 -2.281074554455536 0M227.5 300.9a0.9755919955909178 0.9755919955909178 0 1 0 1.9511839911818356 0a0.9755919955909178 0.9755919955909178 0 1 0 -1.9511839911818356 0M106.7 308.4a1.511184928110973 1.511184928110973 0 1 0 3.022369856221946 0a1.511184928110973 1.511184928110973 0 1 0 -3.022369856221946 0M507.6 430.2a1.1337666226865413 1.1337666226865413 0 1 0 2.2675332453730825 0a1.1337666226865413 1.1337666226865413 0 1 0 -2.2675332453730825 0M485.5 290.8a1.3951286302368424 1.3951286302368424 0 1 0 2.790257260473685 0a1.3951286302368424 1.3951286302368424 0 1 0 -2.790257260473685 0M389.5 414.6a0.928564635457997 0.928564635457997 0 1 0 1.857129270915994 0a0.928564635457997 0.928564635457997 0 1 0 -1.857129270915994 0M73.6 302.3a0.8006164009688576 0.8006164009688576 0 1 0 1.6012328019377151 0a0.8006164009688576 0.8006164009688576 0 1 0 -1.6012328019377151 0M303.8 332.3a1.2566928993972883 1.2566928993972883 0 1 0 2.5133857987945767 0a1.2566928993972883 1.2566928993972883 0 1 0 -2.5133857987945767 0M292.7 217.7a0.9805568101634801 0.9805568101634801 0 1 0 1.9611136203269601 0a0.9805568101634801 0.9805568101634801 0 1 0 -1.9611136203269601 0M436.3 169.4a0.8360331525896054 0.8360331525896054 0 1 0 1.6720663051792108 0a0.8360331525896054 0.8360331525896054 0 1 0 -1.6720663051792108 0M482.0 267.4a1.6327611790343757 1.6327611790343757 0 1 0 3.2655223580687514 0a1.6327611790343757 1.6327611790343757 0 1 0 -3.2655223580687514 0M230.5 248.7a1.6025018950016257 1.6025018950016257 0 1 0 3.2050037900032513 0a1.6025018950016257 1.6025018950016257 0 1 0 -3.2050037900032513 0M196.3 291.1a1.1806961115269887 1.1806961115269887 0 1 0 2.3613922230539774 0a1.1806961115269887 1.1806961115269887 0 1 0 -2.3613922230539774 0M351.1 172.3a1.2909716345751394 1.2909716345751394 0 1 0 2.581943269150279 0a1.2909716345751394 1.2909716345751394 0 1 0 -2.581943269150279 0M355.5 350.0a0.8933432660003596 0.8933432660003596 0 1 0 1.7866865320007193 0a0.8933432660003596 0.8933432660003596 0 1 0 -1.7866865320007193 0M130.6 172.3a0.899055990249902 0.899055990249902 0 1 0 1.798111980499804 0a0.899055990249902 0.899055990249902 0 1 0 -1.798111980499804 0M444.4 362.8a0.8152883261118907 0.8152883261118907 0 1 0 1.6305766522237815 0a0.8152883261118907 0.8152883261118907 0 1 0 -1.6305766522237815 0M299.1 259.1a1.350000066217035 1.350000066217035 0 1 0 2.70000013243407 0a1.350000066217035 1.350000066217035 0 1 0 -2.70000013243407 0M503.6 168.0a1.4615386787909443 1.4615386787909443 0 1 0 2.9230773575818887 0a1.4615386787909443 1.4615386787909443 0 1 0 -2.9230773575818887 0M467.6 411.8a1.3126320108888971 1.3126320108888971 0 1 0 2.6252640217777943 0a1.3126320108888971 1.3126320108888971 0 1 0 -2.6252640217777943 0M122.6 270.6a1.6837026520014766 1.6837026520014766 0 1 0 3.3674053040029532 0a1.6837026520014766 1.6837026520014766 0 1 0 -3.3674053040029532 0M370.4 382.4a1.3928038381438739 1.3928038381438739 0 1 0 2.7856076762877477 0a1.3928038381438739 1.3928038381438739 0 1 0 -2.7856076762877477 0M198.2 254.0a1.6709560755835438 1.6709560755835438 0 1 0 3.3419121511670875 0a1.6709560755835438 1.6709560755835438 0 1 0 -3.3419121511670875 0M354.3 327.3a1.2473764441882973 1.2473764441882973 0 1 0 2.4947528883765946 0a1.2473764441882973 1.2473764441882973 0 1 0 -2.4947528883765946 0M302.0 367.4a1.0626256586635725 1.0626256586635725 0 1 0 2.125251317327145 0a1.0626256586635725 1.0626256586635725 0 1 0 -2.125251317327145 0M247.7 397.7a0.883722323070953 0.883722323070953 0 1 0 1.767444646141906 0a0.883722323070953 0.883722323070953 0 1 0 -1.767444646141906 0M283.8 343.0a1.4595951773781284 1.4595951773781284 0 1 0 2.9191903547562568 0a1.4595951773781284 1.4595951773781284 0 1 0 -2.9191903547562568 0M332.7 394.7a1.1047192378013575 1.1047192378013575 0 1 0 2.209438475602715 0a1.1047192378013575 1.1047192378013575 0 1 0 -2.209438475602715 0M126.4 173.8a1.228472647423365 1.228472647423365 0 1 0 2.45694529484673 0a1.228472647423365 1.228472647423365 0 1 0 -2.45694529484673 0M293.6 406.8a1.1763147721312146 1.1763147721312146 0 1 0 2.352629544262429 0a1.1763147721312146 1.1763147721312146 0 1 0 -2.352629544262429 0M284.4 367.6a1.4653931422302438 1.4653931422302438 0 1 0 2.9307862844604875 0a1.4653931422302438 1.4653931422302438 0 1 0 -2.9307862844604875 0M458.7 154.6a1.0908742766742356 1.0908742766742356 0 1 0 2.1817485533484713 0a1.0908742766742356 1.0908742766742356 0 1 0 -2.1817485533484713 0M490.1 209.9a1.0395290650329825 1.0395290650329825 0 1 0 2.079058130065965 0a1.0395290650329825 1.0395290650329825 0 1 0 -2.079058130065965 0M102.4 422.7a0.8604458751719872 0.8604458751719872 0 1 0 1.7208917503439745 0a0.8604458751719872 0.8604458751719872 0 1 0 -1.7208917503439745 0M433.7 262.5a1.1947455206836999 1.1947455206836999 0 1 0 2.3894910413673998 0a1.1947455206836999 1.1947455206836999 0 1 0 -2.3894910413673998 0M496.2 263.4a0.8609036477849853 0.8609036477849853 0 1 0 1.7218072955699706 0a0.8609036477849853 0.8609036477849853 0 1 0 -1.7218072955699706 0M226.4 312.6a0.8582983121353186 0.8582983121353186 0 1 0 1.7165966242706372 0a0.8582983121353186 0.8582983121353186 0 1 0 -1.7165966242706372 0M385.6 223.5a1.1781457624194638 1.1781457624194638 0 1 0 2.3562915248389276 0a1.1781457624194638 1.1781457624194638 0 1 0 -2.3562915248389276 0M373.1 419.5a1.3888995044761332 1.3888995044761332 0 1 0 2.7777990089522664 0a1.3888995044761332 1.3888995044761332 0 1 0 -2.7777990089522664 0M239.0 395.9a1.6629306715102221 1.6629306715102221 0 1 0 3.3258613430204442 0a1.6629306715102221 1.6629306715102221 0 1 0 -3.3258613430204442 0M414.5 171.4a0.948010630717511 0.948010630717511 0 1 0 1.896021261435022 0a0.948010630717511 0.948010630717511 0 1 0 -1.896021261435022 0M497.6 358.1a1.4426581397118587 1.4426581397118587 0 1 0 2.8853162794237175 0a1.4426581397118587 1.4426581397118587 0 1 0 -2.8853162794237175 0M199.7 345.6a0.8119408161024944 0.8119408161024944 0 1 0 1.6238816322049887 0a0.8119408161024944 0.8119408161024944 0 1 0 -1.6238816322049887 0M421.9 394.0a1.5074803783627977 1.5074803783627977 0 1 0 3.0149607567255954 0a1.5074803783627977 1.5074803783627977 0 1 0 -3.0149607567255954 0M438.3 268.3a1.0419299203827326 1.0419299203827326 0 1 0 2.083859840765465 0a1.0419299203827326 1.0419299203827326 0 1 0 -2.083859840765465 0M486.3 351.8a0.8671662542197539 0.8671662542197539 0 1 0 1.7343325084395078 0a0.8671662542197539 0.8671662542197539 0 1 0 -1.7343325084395078 0M89.9 283.9a1.5911771584220018 1.5911771584220018 0 1 0 3.1823543168440036 0a1.5911771584220018 1.5911771584220018 0 1 0 -3.1823543168440036 0M433.8 448.3a1.351620879444872 1.351620879444872 0 1 0 2.703241758889744 0a1.351620879444872 1.351620879444872 0 1 0 -2.703241758889744 0M167.3 402.2a0.8627827325954873 0.8627827325954873 0 1 0 1.7255654651909746 0a0.8627827325954873 0.8627827325954873 0 1 0 -1.7255654651909746 0M267.6 369.1a1.4618126865586385 1.4618126865586385 0 1 0 2.923625373117277 0a1.4618126865586385 1.4618126865586385 0 1 0 -2.923625373117277 0M240.5 212.8a1.605927567515455 1.605927567515455 0 1 0 3.21185513503091 0a1.605927567515455 1.605927567515455 0 1 0 -3.21185513503091 0M183.2 402.9a1.632746763837288 1.632746763837288 0 1 0 3.265493527674576 0a1.632746763837288 1.632746763837288 0 1 0 -3.265493527674576 0M110.7 316.0a1.1706724898150866 1.1706724898150866 0 1 0 2.3413449796301733 0a1.1706724898150866 1.1706724898150866 0 1 0 -2.3413449796301733 0M115.8 178.2a1.4575046833674468 1.4575046833674468 0 1 0 2.9150093667348935 0a1.4575046833674468 1.4575046833674468 0 1 0 -2.9150093667348935 0M314.6 275.4a1.347260027515944 1.347260027515944 0 1 0 2.694520055031888 0a1.347260027515944 1.347260027515944 0 1 0 -2.694520055031888 0M425.7 389.4a1.6652609340523006 1.6652609340523006 0 1 0 3.330521868104601 0a1.6652609340523006 1.6652609340523006 0 1 0 -3.330521868104601 0M191.9 319.3a1.0302627415678118 1.0302627415678118 0 1 0 2.0605254831356237 0a1.0302627415678118 1.0302627415678118 0 1 0 -2.0605254831356237 0M81.6 374.8a1.6202468068993157 1.6202468068993157 0 1 0 3.2404936137986313 0a1.6202468068993157 1.6202468068993157 0 1 0 -3.2404936137986313 0M369.6 179.4a0.9534531328859303 0.9534531328859303 0 1 0 1.9069062657718605 0a0.9534531328859303 0.9534531328859303 0 1 0 -1.9069062657718605 0M368.7 250.9a1.243528210179441 1.243528210179441 0 1 0 2.487056420358882 0a1.243528210179441 1.243528210179441 0 1 0 -2.487056420358882 0M364.2 345.0a1.5701415892878003 1.5701415892878003 0 1 0 3.1402831785756007 0a1.5701415892878003 1.5701415892878003 0 1 0 -3.1402831785756007 0M261.4 239.8a0.937749006122117 0.937749006122117 0 1 0 1.875498012244234 0a0.937749006122117 0.937749006122117 0 1 0 -1.875498012244234 0M246.7 244.9a0.9156914013584064 0.9156914013584064 0 1 0 1.8313828027168129 0a0.9156914013584064 0.9156914013584064 0 1 0 -1.8313828027168129 0M286.3 435.6a1.1523182491793467 1.1523182491793467 0 1 0 2.3046364983586933 0a1.1523182491793467 1.1523182491793467 0 1 0 -2.3046364983586933 0M229.0 370.4a0.8639303890652307 0.8639303890652307 0 1 0 1.7278607781304613 0a0.8639303890652307 0.8639303890652307 0 1 0 -1.7278607781304613 0M466.3 386.8a1.4153535272603421 1.4153535272603421 0 1 0 2.8307070545206843 0a1.4153535272603421 1.4153535272603421 0 1 0 -2.8307070545206843 0M246.0 157.7a1.2448821058914832 1.2448821058914832 0 1 0 2.4897642117829664 0a1.2448821058914832 1.2448821058914832 0 1 0 -2.4897642117829664 0M494.6 204.5a1.4450981280720776 1.4450981280720776 0 1 0 2.890196256144155 0a1.4450981280720776 1.4450981280720776 0 1 0 -2.890196256144155 0M459.2 390.7a1.4009251605262283 1.4009251605262283 0 1 0 2.8018503210524566 0a1.4009251605262283 1.4009251605262283 0 1 0 -2.8018503210524566 0M502.6 428.2a1.421403588327955 1.421403588327955 0 1 0 2.84280717665591 0a1.421403588327955 1.421403588327955 0 1 0 -2.84280717665591 0M237.1 348.8a1.6733271755961023 1.6733271755961023 0 1 0 3.3466543511922047 0a1.6733271755961023 1.6733271755961023 0 1 0 -3.3466543511922047 0M482.9 239.0a1.0540533504952243 1.0540533504952243 0 1 0 2.1081067009904486 0a1.0540533504952243 1.0540533504952243 0 1 0 -2.1081067009904486 0M209.6 215.1a0.8150508823013407 0.8150508823013407 0 1 0 1.6301017646026814 0a0.8150508823013407 0.8150508823013407 0 1 0 -1.6301017646026814 0M341.1 385.3a1.6168147440225025 1.6168147440225025 0 1 0 3.233629488045005 0a1.6168147440225025 1.6168147440225025 0 1 0 -3.233629488045005 0M327.3 173.7a0.9784449339177879 0.9784449339177879 0 1 0 1.9568898678355757 0a0.9784449339177879 0.9784449339177879 0 1 0 -1.9568898678355757 0M234.5 370.3a1.0933893907753651 1.0933893907753651 0 1 0 2.1867787815507302 0a1.0933893907753651 1.0933893907753651 0 1 0 -2.1867787815507302 0M475.4 278.5a1.2174300528293756 1.2174300528293756 0 1 0 2.434860105658751 0a1.2174300528293756 1.2174300528293756 0 1 0 -2.434860105658751 0M194.5 385.6a1.6606124965107185 1.6606124965107185 0 1 0 3.321224993021437 0a1.6606124965107185 1.6606124965107185 0 1 0 -3.321224993021437 0M280.7 299.8a1.0175909941714174 1.0175909941714174 0 1 0 2.035181988342835 0a1.0175909941714174 1.0175909941714174 0 1 0 -2.035181988342835 0M248.7 299.4a1.0920247536543988 1.0920247536543988 0 1 0 2.1840495073087975 0a1.0920247536543988 1.0920247536543988 0 1 0 -2.1840495073087975 0M252.8 312.3a1.1945064411447444 1.1945064411447444 0 1 0 2.3890128822894887 0a1.1945064411447444 1.1945064411447444 0 1 0 -2.3890128822894887 0M155.3 190.8a1.5044432384934678 1.5044432384934678 0 1 0 3.0088864769869357 0a1.5044432384934678 1.5044432384934678 0 1 0 -3.0088864769869357 0M108.3 290.8a1.3135458327955993 1.3135458327955993 0 1 0 2.6270916655911987 0a1.3135458327955993 1.3135458327955993 0 1 0 -2.6270916655911987 0M153.3 410.6a0.9666318555051758 0.9666318555051758 0 1 0 1.9332637110103517 0a0.9666318555051758 0.9666318555051758 0 1 0 -1.9332637110103517 0M417.3 308.2a1.0537357618601395 1.0537357618601395 0 1 0 2.107471523720279 0a1.0537357618601395 1.0537357618601395 0 1 0 -2.107471523720279 0M241.1 279.8a1.0933865857714662 1.0933865857714662 0 1 0 2.1867731715429324 0a1.0933865857714662 1.0933865857714662 0 1 0 -2.1867731715429324 0M451.5 148.5a0.9776507464960691 0.9776507464960691 0 1 0 1.9553014929921382 0a0.9776507464960691 0.9776507464960691 0 1 0 -1.9553014929921382 0M312.1 449.8a1.2161618117859232 1.2161618117859232 0 1 0 2.4323236235718464 0a1.2161618117859232 1.2161618117859232 0 1 0 -2.4323236235718464 0M340.3 421.7a1.439831156367279 1.439831156367279 0 1 0 2.879662312734558 0a1.439831156367279 1.439831156367279 0 1 0 -2.879662312734558 0M294.5 374.4a1.5836243281454077 1.5836243281454077 0 1 0 3.1672486562908153 0a1.5836243281454077 1.5836243281454077 0 1 0 -3.1672486562908153 0M413.2 179.4a1.357655423514224 1.357655423514224 0 1 0 2.715310847028448 0a1.357655423514224 1.357655423514224 0 1 0 -2.715310847028448 0M485.4 189.8a1.0328789581850906 1.0328789581850906 0 1 0 2.065757916370181 0a1.0328789581850906 1.0328789581850906 0 1 0 -2.065757916370181 0M476.1 163.2a1.1032814912062898 1.1032814912062898 0 1 0 2.2065629824125796 0a1.1032814912062898 1.1032814912062898 0 1 0 -2.2065629824125796 0M350.7 403.5a1.496318563768937 1.496318563768937 0 1 0 2.992637127537874 0a1.496318563768937 1.496318563768937 0 1 0 -2.992637127537874 0M235.2 398.5a1.4848233057510325 1.4848233057510325 0 1 0 2.969646611502065 0a1.4848233057510325 1.4848233057510325 0 1 0 -2.969646611502065 0M388.6 183.4a1.0316028297707465 1.0316028297707465 0 1 0 2.063205659541493 0a1.0316028297707465 1.0316028297707465 0 1 0 -2.063205659541493 0M93.6 355.4a1.3395528118028799 1.3395528118028799 0 1 0 2.6791056236057598 0a1.3395528118028799 1.3395528118028799 0 1 0 -2.6791056236057598 0M459.2 247.1a1.3316538722083475 1.3316538722083475 0 1 0 2.663307744416695 0a1.3316538722083475 1.3316538722083475 0 1 0 -2.663307744416695 0M225.3 198.9a1.4279319149236493 1.4279319149236493 0 1 0 2.8558638298472987 0a1.4279319149236493 1.4279319149236493 0 1 0 -2.8558638298472987 0M197.2 227.8a1.3954652600413797 1.3954652600413797 0 1 0 2.7909305200827594 0a1.3954652600413797 1.3954652600413797 0 1 0 -2.7909305200827594 0M362.2 196.7a0.9686879983811528 0.9686879983811528 0 1 0 1.9373759967623057 0a0.9686879983811528 0.9686879983811528 0 1 0 -1.9373759967623057 0M139.6 259.3a1.5399846281763026 1.5399846281763026 0 1 0 3.079969256352605 0a1.5399846281763026 1.5399846281763026 0 1 0 -3.079969256352605 0M437.6 251.4a1.2500632548705333 1.2500632548705333 0 1 0 2.5001265097410665 0a1.2500632548705333 1.2500632548705333 0 1 0 -2.5001265097410665 0M381.8 411.3a1.6102629816255187 1.6102629816255187 0 1 0 3.2205259632510375 0a1.6102629816255187 1.6102629816255187 0 1 0 -3.2205259632510375 0M94.9 320.9a1.473990854689843 1.473990854689843 0 1 0 2.947981709379686 0a1.473990854689843 1.473990854689843 0 1 0 -2.947981709379686 0M495.2 235.9a1.4093918940139858 1.4093918940139858 0 1 0 2.8187837880279716 0a1.4093918940139858 1.4093918940139858 0 1 0 -2.8187837880279716 0M94.1 333.4a1.2269875032612938 1.2269875032612938 0 1 0 2.4539750065225876 0a1.2269875032612938 1.2269875032612938 0 1 0 -2.4539750065225876 0M415.4 268.2a1.5944368068077015 1.5944368068077015 0 1 0 3.188873613615403 0a1.5944368068077015 1.5944368068077015 0 1 0 -3.188873613615403 0M374.8 368.6a1.5401675154363434 1.5401675154363434 0 1 0 3.080335030872687 0a1.5401675154363434 1.5401675154363434 0 1 0 -3.080335030872687 0M169.0 336.1a0.875781516289135 0.875781516289135 0 1 0 1.75156303257827 0a0.875781516289135 0.875781516289135 0 1 0 -1.75156303257827 0M355.3 409.8a1.6544564093970289 1.6544564093970289 0 1 0 3.3089128187940577 0a1.6544564093970289 1.6544564093970289 0 1 0 -3.3089128187940577 0M298.0 284.9a1.4178195954932082 1.4178195954932082 0 1 0 2.8356391909864165 0a1.4178195954932082 1.4178195954932082 0 1 0 -2.8356391909864165 0M269.9 360.9a1.4411018373827469 1.4411018373827469 0 1 0 2.8822036747654938 0a1.4411018373827469 1.4411018373827469 0 1 0 -2.8822036747654938 0M170.5 274.7a1.0251729054610925 1.0251729054610925 0 1 0 2.050345810922185 0a1.0251729054610925 1.0251729054610925 0 1 0 -2.050345810922185 0M518.8 366.8a1.4939666117950963 1.4939666117950963 0 1 0 2.9879332235901925 0a1.4939666117950963 1.4939666117950963 0 1 0 -2.9879332235901925 0M271.3 429.1a1.5445555913677027 1.5445555913677027 0 1 0 3.0891111827354054 0a1.5445555913677027 1.5445555913677027 0 1 0 -3.0891111827354054 0M143.2 200.4a1.302815335851922 1.302815335851922 0 1 0 2.605630671703844 0a1.302815335851922 1.302815335851922 0 1 0 -2.605630671703844 0M435.4 185.9a1.2257556170465012 1.2257556170465012 0 1 0 2.4515112340930023 0a1.2257556170465012 1.2257556170465012 0 1 0 -2.4515112340930023 0M413.7 432.5a1.1390066838720876 1.1390066838720876 0 1 0 2.278013367744175 0a1.1390066838720876 1.1390066838720876 0 1 0 -2.278013367744175 0M419.2 248.3a1.0564203437943203 1.0564203437943203 0 1 0 2.1128406875886405 0a1.0564203437943203 1.0564203437943203 0 1 0 -2.1128406875886405 0M302.1 147.6a1.362830818735837 1.362830818735837 0 1 0 2.725661637471674 0a1.362830818735837 1.362830818735837 0 1 0 -2.725661637471674 0M322.9 436.6a1.4631222378119102 1.4631222378119102 0 1 0 2.9262444756238204 0a1.4631222378119102 1.4631222378119102 0 1 0 -2.9262444756238204 0M270.7 422.6a1.3724055601958238 1.3724055601958238 0 1 0 2.7448111203916477 0a1.3724055601958238 1.3724055601958238 0 1 0 -2.7448111203916477 0M232.5 314.5a1.1848913584229457 1.1848913584229457 0 1 0 2.3697827168458914 0a1.1848913584229457 1.1848913584229457 0 1 0 -2.3697827168458914 0M85.0 180.6a1.0259557710270917 1.0259557710270917 0 1 0 2.0519115420541834 0a1.0259557710270917 1.0259557710270917 0 1 0 -2.0519115420541834 0M508.7 232.3a1.476239541616514 1.476239541616514 0 1 0 2.952479083233028 0a1.476239541616514 1.476239541616514 0 1 0 -2.952479083233028 0M394.9 283.6a1.5017724276071158 1.5017724276071158 0 1 0 3.0035448552142316 0a1.5017724276071158 1.5017724276071158 0 1 0 -3.0035448552142316 0M165.3 151.1a1.4358554059507842 1.4358554059507842 0 1 0 2.8717108119015684 0a1.4358554059507842 1.4358554059507842 0 1 0 -2.8717108119015684 0M182.2 189.9a1.1830735637648717 1.1830735637648717 0 1 0 2.3661471275297434 0a1.1830735637648717 1.1830735637648717 0 1 0 -2.3661471275297434 0M384.7 272.7a0.8980314601660069 0.8980314601660069 0 1 0 1.7960629203320138 0a0.8980314601660069 0.8980314601660069 0 1 0 -1.7960629203320138 0M383.3 215.3a0.9006391863344603 0.9006391863344603 0 1 0 1.8012783726689205 0a0.9006391863344603 0.9006391863344603 0 1 0 -1.8012783726689205 0M243.8 403.6a1.4562737568805681 1.4562737568805681 0 1 0 2.9125475137611363 0a1.4562737568805681 1.4562737568805681 0 1 0 -2.9125475137611363 0M320.8 175.0a1.1943989486847064 1.1943989486847064 0 1 0 2.388797897369413 0a1.1943989486847064 1.1943989486847064 0 1 0 -2.388797897369413 0M151.8 281.7a1.556396784779054 1.556396784779054 0 1 0 3.112793569558108 0a1.556396784779054 1.556396784779054 0 1 0 -3.112793569558108 0M202.1 334.8a1.1472044730998618 1.1472044730998618 0 1 0 2.2944089461997237 0a1.1472044730998618 1.1472044730998618 0 1 0 -2.2944089461997237 0M460.1 419.2a1.2391124219997902 1.2391124219997902 0 1 0 2.4782248439995804 0a1.2391124219997902 1.2391124219997902 0 1 0 -2.4782248439995804 0M151.6 207.1a1.461415427933834 1.461415427933834 0 1 0 2.922830855867668 0a1.461415427933834 1.461415427933834 0 1 0 -2.922830855867668 0M329.3 178.9a0.9004376870584094 0.9004376870584094 0 1 0 1.8008753741168189 0a0.9004376870584094 0.9004376870584094 0 1 0 -1.8008753741168189 0M396.3 265.7a1.4980522129200886 1.4980522129200886 0 1 0 2.996104425840177 0a1.4980522129200886 1.4980522129200886 0 1 0 -2.996104425840177 0M408.3 238.1a0.8051860012628008 0.8051860012628008 0 1 0 1.6103720025256016 0a0.8051860012628008 0.8051860012628008 0 1 0 -1.6103720025256016 0M457.9 362.6a1.1037879798596613 1.1037879798596613 0 1 0 2.2075759597193225 0a1.1037879798596613 1.1037879798596613 0 1 0 -2.2075759597193225 0M399.1 248.2a1.2017408617788377 1.2017408617788377 0 1 0 2.4034817235576753 0a1.2017408617788377 1.2017408617788377 0 1 0 -2.4034817235576753 0M200.6 292.4a1.5690008357344203 1.5690008357344203 0 1 0 3.1380016714688406 0a1.5690008357344203 1.5690008357344203 0 1 0 -3.1380016714688406 0M374.3 308.5a0.840501778610518 0.840501778610518 0 1 0 1.681003557221036 0a0.840501778610518 0.840501778610518 0 1 0 -1.681003557221036 0M228.7 323.0a1.4684282951694245 1.4684282951694245 0 1 0 2.936856590338849 0a1.4684282951694245 1.4684282951694245 0 1 0 -2.936856590338849 0M311.0 261.1a1.426909090557051 1.426909090557051 0 1 0 2.853818181114102 0a1.426909090557051 1.426909090557051 0 1 0 -2.853818181114102 0M151.5 202.3a0.8631113203830192 0.8631113203830192 0 1 0 1.7262226407660384 0a0.8631113203830192 0.8631113203830192 0 1 0 -1.7262226407660384 0M330.6 375.6a1.0589898908128867 1.0589898908128867 0 1 0 2.1179797816257735 0a1.0589898908128867 1.0589898908128867 0 1 0 -2.1179797816257735 0M295.4 349.2a1.1181434081104988 1.1181434081104988 0 1 0 2.2362868162209977 0a1.1181434081104988 1.1181434081104988 0 1 0 -2.2362868162209977 0M138.4 356.8a1.2346236571992038 1.2346236571992038 0 1 0 2.4692473143984075 0a1.2346236571992038 1.2346236571992038 0 1 0 -2.4692473143984075 0M231.9 224.4a1.5334556176173089 1.5334556176173089 0 1 0 3.0669112352346177 0a1.5334556176173089 1.5334556176173089 0 1 0 -3.0669112352346177 0M471.7 144.7a1.3948279302984736 1.3948279302984736 0 1 0 2.7896558605969473 0a1.3948279302984736 1.3948279302984736 0 1 0 -2.7896558605969473 0M105.8 380.6a1.5518467729928407 1.5518467729928407 0 1 0 3.1036935459856814 0a1.5518467729928407 1.5518467729928407 0 1 0 -3.1036935459856814 0M216.3 330.4a1.293592848902189 1.293592848902189 0 1 0 2.587185697804378 0a1.293592848902189 1.293592848902189 0 1 0 -2.587185697804378 0M332.3 338.4a0.9104984087501639 0.9104984087501639 0 1 0 1.8209968175003277 0a0.9104984087501639 0.9104984087501639 0 1 0 -1.8209968175003277 0M437.4 311.2a1.3224730919324543 1.3224730919324543 0 1 0 2.6449461838649087 0a1.3224730919324543 1.3224730919324543 0 1 0 -2.6449461838649087 0M480.6 390.3a0.9499939113855306 0.9499939113855306 0 1 0 1.8999878227710612 0a0.9499939113855306 0.9499939113855306 0 1 0 -1.8999878227710612 0M93.5 230.4a0.8259952267408327 0.8259952267408327 0 1 0 1.6519904534816654 0a0.8259952267408327 0.8259952267408327 0 1 0 -1.6519904534816654 0M274.1 153.2a1.2290663124798484 1.2290663124798484 0 1 0 2.458132624959697 0a1.2290663124798484 1.2290663124798484 0 1 0 -2.458132624959697 0M333.2 249.8a1.323106709330442 1.323106709330442 0 1 0 2.646213418660884 0a1.323106709330442 1.323106709330442 0 1 0 -2.646213418660884 0M403.5 402.5a0.9666142157899349 0.9666142157899349 0 1 0 1.9332284315798698 0a0.9666142157899349 0.9666142157899349 0 1 0 -1.9332284315798698 0M265.3 163.5a1.5685256920461783 1.5685256920461783 0 1 0 3.1370513840923566 0a1.5685256920461783 1.5685256920461783 0 1 0 -3.1370513840923566 0M432.5 221.0a1.100449291384266 1.100449291384266 0 1 0 2.200898582768532 0a1.100449291384266 1.100449291384266 0 1 0 -2.200898582768532 0M401.5 347.0a1.3505012499638847 1.3505012499638847 0 1 0 2.7010024999277693 0a1.3505012499638847 1.3505012499638847 0 1 0 -2.7010024999277693 0M209.3 245.0a1.004571505500536 1.004571505500536 0 1 0 2.009143011001072 0a1.004571505500536 1.004571505500536 0 1 0 -2.009143011001072 0M188.0 374.1a1.2596340346239825 1.2596340346239825 0 1 0 2.519268069247965 0a1.2596340346239825 1.2596340346239825 0 1 0 -2.519268069247965 0M461.4 396.6a1.4798400342276694 1.4798400342276694 0 1 0 2.959680068455339 0a1.4798400342276694 1.4798400342276694 0 1 0 -2.959680068455339 0M361.1 348.2a0.9342040825953746 0.9342040825953746 0 1 0 1.8684081651907491 0a0.9342040825953746 0.9342040825953746 0 1 0 -1.8684081651907491 0M154.5 375.1a1.3989219523024952 1.3989219523024952 0 1 0 2.7978439046049903 0a1.3989219523024952 1.3989219523024952 0 1 0 -2.7978439046049903 0M314.8 185.8a1.152442161368618 1.152442161368618 0 1 0 2.304884322737236 0a1.152442161368618 1.152442161368618 0 1 0 -2.304884322737236 0M470.5 168.9a1.6220576818772199 1.6220576818772199 0 1 0 3.2441153637544398 0a1.6220576818772199 1.6220576818772199 0 1 0 -3.2441153637544398 0M285.4 428.8a1.0671750397115713 1.0671750397115713 0 1 0 2.1343500794231427 0a1.0671750397115713 1.0671750397115713 0 1 0 -2.1343500794231427 0M227.4 414.2a1.4699250344372587 1.4699250344372587 0 1 0 2.9398500688745175 0a1.4699250344372587 1.4699250344372587 0 1 0 -2.9398500688745175 0M288.5 146.7a1.307991309005759 1.307991309005759 0 1 0 2.615982618011518 0a1.307991309005759 1.307991309005759 0 1 0 -2.615982618011518 0M277.9 225.5a1.6377642729205677 1.6377642729205677 0 1 0 3.2755285458411354 0a1.6377642729205677 1.6377642729205677 0 1 0 -3.2755285458411354 0M428.5 245.1a1.3583769046313847 1.3583769046313847 0 1 0 2.7167538092627694 0a1.3583769046313847 1.3583769046313847 0 1 0 -2.7167538092627694 0M242.7 211.8a1.4197624225819134 1.4197624225819134 0 1 0 2.839524845163827 0a1.4197624225819134 1.4197624225819134 0 1 0 -2.839524845163827 0M399.8 158.9a0.9569475395204011 0.9569475395204011 0 1 0 1.9138950790408022 0a0.9569475395204011 0.9569475395204011 0 1 0 -1.9138950790408022 0M486.2 358.1a1.5214035891661455 1.5214035891661455 0 1 0 3.042807178332291 0a1.5214035891661455 1.5214035891661455 0 1 0 -3.042807178332291 0M441.5 357.7a1.6578562233204548 1.6578562233204548 0 1 0 3.3157124466409096 0a1.6578562233204548 1.6578562233204548 0 1 0 -3.3157124466409096 0M337.8 150.6a1.179459145040679 1.179459145040679 0 1 0 2.358918290081358 0a1.179459145040679 1.179459145040679 0 1 0 -2.358918290081358 0M372.0 287.4a1.6885330866449821 1.6885330866449821 0 1 0 3.3770661732899643 0a1.6885330866449821 1.6885330866449821 0 1 0 -3.3770661732899643 0M465.3 355.3a1.1160599389728718 1.1160599389728718 0 1 0 2.2321198779457436 0a1.1160599389728718 1.1160599389728718 0 1 0 -2.2321198779457436 0M181.1 181.8a0.9879340165182334 0.9879340165182334 0 1 0 1.9758680330364669 0a0.9879340165182334 0.9879340165182334 0 1 0 -1.9758680330364669 0M327.6 245.3a1.56053541317632 1.56053541317632 0 1 0 3.12107082635264 0a1.56053541317632 1.56053541317632 0 1 0 -3.12107082635264 0M333.6 216.4a1.515020907358286 1.515020907358286 0 1 0 3.030041814716572 0a1.515020907358286 1.515020907358286 0 1 0 -3.030041814716572 0M352.9 232.2a1.4612200147576817 1.4612200147576817 0 1 0 2.9224400295153634 0a1.4612200147576817 1.4612200147576817 0 1 0 -2.9224400295153634 0M489.9 297.7a1.696036637198214 1.696036637198214 0 1 0 3.392073274396428 0a1.696036637198214 1.696036637198214 0 1 0 -3.392073274396428 0M407.5 374.0a1.527758460238351 1.527758460238351 0 1 0 3.055516920476702 0a1.527758460238351 1.527758460238351 0 1 0 -3.055516920476702 0M291.4 239.7a1.6622744456047887 1.6622744456047887 0 1 0 3.3245488912095773 0a1.6622744456047887 1.6622744456047887 0 1 0 -3.3245488912095773 0M297.2 180.4a1.0351503064251975 1.0351503064251975 0 1 0 2.070300612850395 0a1.0351503064251975 1.0351503064251975 0 1 0 -2.070300612850395 0M207.6 336.8a0.9891827918488373 0.9891827918488373 0 1 0 1.9783655836976746 0a0.9891827918488373 0.9891827918488373 0 1 0 -1.9783655836976746 0M475.2 367.1a1.240956759630662 1.240956759630662 0 1 0 2.481913519261324 0a1.240956759630662 1.240956759630662 0 1 0 -2.481913519261324 0M355.4 332.2a0.9513929306542436 0.9513929306542436 0 1 0 1.9027858613084871 0a0.9513929306542436 0.9513929306542436 0 1 0 -1.9027858613084871 0M151.3 274.3a0.9434436409673129 0.9434436409673129 0 1 0 1.8868872819346258 0a0.9434436409673129 0.9434436409673129 0 1 0 -1.8868872819346258 0M404.4 243.0a1.5586540237615387 1.5586540237615387 0 1 0 3.1173080475230774 0a1.5586540237615387 1.5586540237615387 0 1 0 -3.1173080475230774 0M272.7 389.0a0.8452064574651481 0.8452064574651481 0 1 0 1.6904129149302962 0a0.8452064574651481 0.8452064574651481 0 1 0 -1.6904129149302962 0M163.1 334.5a1.4517803887387557 1.4517803887387557 0 1 0 2.9035607774775114 0a1.4517803887387557 1.4517803887387557 0 1 0 -2.9035607774775114 0M361.2 256.5a1.6544660473283996 1.6544660473283996 0 1 0 3.3089320946567993 0a1.6544660473283996 1.6544660473283996 0 1 0 -3.3089320946567993 0M381.1 276.2a1.1078546626100827 1.1078546626100827 0 1 0 2.2157093252201654 0a1.1078546626100827 1.1078546626100827 0 1 0 -2.2157093252201654 0M75.9 377.2a0.9050690255175057 0.9050690255175057 0 1 0 1.8101380510350114 0a0.9050690255175057 0.9050690255175057 0 1 0 -1.8101380510350114 0M117.8 224.4a0.8266734274818315 0.8266734274818315 0 1 0 1.653346854963663 0a0.8266734274818315 0.8266734274818315 0 1 0 -1.653346854963663 0M119.8 161.9a1.510444213878777 1.510444213878777 0 1 0 3.020888427757554 0a1.510444213878777 1.510444213878777 0 1 0 -3.020888427757554 0M199.5 360.3a1.366527903980136 1.366527903980136 0 1 0 2.733055807960272 0a1.366527903980136 1.366527903980136 0 1 0 -2.733055807960272 0M342.1 200.3a1.1018776825181003 1.1018776825181003 0 1 0 2.2037553650362005 0a1.1018776825181003 1.1018776825181003 0 1 0 -2.2037553650362005 0M251.8 287.0a1.3270103091625594 1.3270103091625594 0 1 0 2.6540206183251187 0a1.3270103091625594 1.3270103091625594 0 1 0 -2.6540206183251187 0M356.5 150.9a0.9162123726831864 0.9162123726831864 0 1 0 1.832424745366373 0a0.9162123726831864 0.9162123726831864 0 1 0 -1.832424745366373 0M161.2 361.8a1.5101097709127793 1.5101097709127793 0 1 0 3.0202195418255586 0a1.5101097709127793 1.5101097709127793 0 1 0 -3.0202195418255586 0M485.6 198.3a0.9531166455737471 0.9531166455737471 0 1 0 1.9062332911474942 0a0.9531166455737471 0.9531166455737471 0 1 0 -1.9062332911474942 0M315.5 143.1a0.9304839135897196 0.9304839135897196 0 1 0 1.8609678271794392 0a0.9304839135897196 0.9304839135897196 0 1 0 -1.8609678271794392 0M397.6 236.9a1.0931346550985563 1.0931346550985563 0 1 0 2.1862693101971127 0a1.0931346550985563 1.0931346550985563 0 1 0 -2.1862693101971127 0M127.4 382.9a0.9530527561931431 0.9530527561931431 0 1 0 1.9061055123862862 0a0.9530527561931431 0.9530527561931431 0 1 0 -1.9061055123862862 0M149.3 324.2a1.2740521473568418 1.2740521473568418 0 1 0 2.5481042947136836 0a1.2740521473568418 1.2740521473568418 0 1 0 -2.5481042947136836 0M372.8 439.6a1.0362346497701804 1.0362346497701804 0 1 0 2.072469299540361 0a1.0362346497701804 1.0362346497701804 0 1 0 -2.072469299540361 0M322.5 169.1a0.8962572392507059 0.8962572392507059 0 1 0 1.7925144785014118 0a0.8962572392507059 0.8962572392507059 0 1 0 -1.7925144785014118 0M322.2 406.2a1.0042485394554665 1.0042485394554665 0 1 0 2.008497078910933 0a1.0042485394554665 1.0042485394554665 0 1 0 -2.008497078910933 0M173.5 179.9a1.3832695619978659 1.3832695619978659 0 1 0 2.7665391239957318 0a1.3832695619978659 1.3832695619978659 0 1 0 -2.7665391239957318 0M176.4 206.0a1.693838252167998 1.693838252167998 0 1 0 3.387676504335996 0a1.693838252167998 1.693838252167998 0 1 0 -3.387676504335996 0M497.8 223.6a1.2352504014365846 1.2352504014365846 0 1 0 2.470500802873169 0a1.2352504014365846 1.2352504014365846 0 1 0 -2.470500802873169 0M95.7 161.8a1.6155203233617548 1.6155203233617548 0 1 0 3.2310406467235095 0a1.6155203233617548 1.6155203233617548 0 1 0 -3.2310406467235095 0M247.6 287.6a1.2997681926002431 1.2997681926002431 0 1 0 2.5995363852004862 0a1.2997681926002431 1.2997681926002431 0 1 0 -2.5995363852004862 0M479.9 318.8a1.0082796033083272 1.0082796033083272 0 1 0 2.0165592066166544 0a1.0082796033083272 1.0082796033083272 0 1 0 -2.0165592066166544 0M301.8 280.0a0.9353356663466763 0.9353356663466763 0 1 0 1.8706713326933526 0a0.9353356663466763 0.9353356663466763 0 1 0 -1.8706713326933526 0M215.3 186.8a1.1547224413647525 1.1547224413647525 0 1 0 2.309444882729505 0a1.1547224413647525 1.1547224413647525 0 1 0 -2.309444882729505 0M181.5 402.8a0.9872685533364012 0.9872685533364012 0 1 0 1.9745371066728024 0a0.9872685533364012 0.9872685533364012 0 1 0 -1.9745371066728024 0M131.3 178.1a1.38045923810495 1.38045923810495 0 1 0 2.7609184762099 0a1.38045923810495 1.38045923810495 0 1 0 -2.7609184762099 0M415.1 152.7a1.625968081109196 1.625968081109196 0 1 0 3.251936162218392 0a1.625968081109196 1.625968081109196 0 1 0 -3.251936162218392 0M296.8 200.7a0.9634457595771605 0.9634457595771605 0 1 0 1.926891519154321 0a0.9634457595771605 0.9634457595771605 0 1 0 -1.926891519154321 0M102.1 417.2a1.5952742938839592 1.5952742938839592 0 1 0 3.1905485877679185 0a1.5952742938839592 1.5952742938839592 0 1 0 -3.1905485877679185 0M209.3 319.6a1.3049609961965691 1.3049609961965691 0 1 0 2.6099219923931383 0a1.3049609961965691 1.3049609961965691 0 1 0 -2.6099219923931383 0M467.6 163.2a0.839008886217148 0.839008886217148 0 1 0 1.678017772434296 0a0.839008886217148 0.839008886217148 0 1 0 -1.678017772434296 0M284.6 228.5a1.318473261984506 1.318473261984506 0 1 0 2.636946523969012 0a1.318473261984506 1.318473261984506 0 1 0 -2.636946523969012 0M160.7 329.9a1.3959903133530078 1.3959903133530078 0 1 0 2.7919806267060157 0a1.3959903133530078 1.3959903133530078 0 1 0 -2.7919806267060157 0M430.8 434.5a1.6992625639301377 1.6992625639301377 0 1 0 3.3985251278602755 0a1.6992625639301377 1.6992625639301377 0 1 0 -3.3985251278602755 0M173.8 229.2a1.4079621672238802 1.4079621672238802 0 1 0 2.8159243344477605 0a1.4079621672238802 1.4079621672238802 0 1 0 -2.8159243344477605 0M232.5 321.7a1.1477327920009688 1.1477327920009688 0 1 0 2.2954655840019376 0a1.1477327920009688 1.1477327920009688 0 1 0 -2.2954655840019376 0M398.7 386.4a0.9421617944186198 0.9421617944186198 0 1 0 1.8843235888372396 0a0.9421617944186198 0.9421617944186198 0 1 0 -1.8843235888372396 0M433.2 196.6a1.363810918027359 1.363810918027359 0 1 0 2.727621836054718 0a1.363810918027359 1.363810918027359 0 1 0 -2.727621836054718 0M462.5 206.7a1.1493173317046066 1.1493173317046066 0 1 0 2.298634663409213 0a1.1493173317046066 1.1493173317046066 0 1 0 -2.298634663409213 0M210.2 328.6a1.1067438865143284 1.1067438865143284 0 1 0 2.213487773028657 0a1.1067438865143284 1.1067438865143284 0 1 0 -2.213487773028657 0M232.1 424.2a1.1653163137057017 1.1653163137057017 0 1 0 2.3306326274114033 0a1.1653163137057017 1.1653163137057017 0 1 0 -2.3306326274114033 0M105.3 223.7a1.1066575591980086 1.1066575591980086 0 1 0 2.213315118396017 0a1.1066575591980086 1.1066575591980086 0 1 0 -2.213315118396017 0M372.5 194.3a0.8669829218806541 0.8669829218806541 0 1 0 1.7339658437613081 0a0.8669829218806541 0.8669829218806541 0 1 0 -1.7339658437613081 0M468.9 449.8a0.8088286259293823 0.8088286259293823 0 1 0 1.6176572518587646 0a0.8088286259293823 0.8088286259293823 0 1 0 -1.6176572518587646 0M468.8 441.6a1.2821756846571115 1.2821756846571115 0 1 0 2.564351369314223 0a1.2821756846571115 1.2821756846571115 0 1 0 -2.564351369314223 0M235.9 334.1a1.123397183346932 1.123397183346932 0 1 0 2.246794366693864 0a1.123397183346932 1.123397183346932 0 1 0 -2.246794366693864 0M427.6 325.3a1.0112672710896164 1.0112672710896164 0 1 0 2.022534542179233 0a1.0112672710896164 1.0112672710896164 0 1 0 -2.022534542179233 0M261.2 363.7a1.2372952828065449 1.2372952828065449 0 1 0 2.4745905656130898 0a1.2372952828065449 1.2372952828065449 0 1 0 -2.4745905656130898 0M182.1 265.3a1.3182177568489852 1.3182177568489852 0 1 0 2.6364355136979705 0a1.3182177568489852 1.3182177568489852 0 1 0 -2.6364355136979705 0M266.3 263.1a0.8693786215217585 0.8693786215217585 0 1 0 1.738757243043517 0a0.8693786215217585 0.8693786215217585 0 1 0 -1.738757243043517 0M348.0 318.5a1.3045427262359697 1.3045427262359697 0 1 0 2.6090854524719393 0a1.3045427262359697 1.3045427262359697 0 1 0 -2.6090854524719393 0M94.1 234.5a1.257224818325811 1.257224818325811 0 1 0 2.514449636651622 0a1.257224818325811 1.257224818325811 0 1 0 -2.514449636651622 0M261.7 154.1a1.2683520726564825 1.2683520726564825 0 1 0 2.536704145312965 0a1.2683520726564825 1.2683520726564825 0 1 0 -2.536704145312965 0M167.3 318.9a1.511898145509789 1.511898145509789 0 1 0 3.023796291019578 0a1.511898145509789 1.511898145509789 0 1 0 -3.023796291019578 0M185.8 234.2a0.927857779923694 0.927857779923694 0 1 0 1.855715559847388 0a0.927857779923694 0.927857779923694 0 1 0 -1.855715559847388 0M378.8 251.7a0.8102347794549865 0.8102347794549865 0 1 0 1.620469558909973 0a0.8102347794549865 0.8102347794549865 0 1 0 -1.620469558909973 0M128.2 202.6a1.1020838521906025 1.1020838521906025 0 1 0 2.204167704381205 0a1.1020838521906025 1.1020838521906025 0 1 0 -2.204167704381205 0M183.3 184.8a0.8609908711267551 0.8609908711267551 0 1 0 1.7219817422535102 0a0.8609908711267551 0.8609908711267551 0 1 0 -1.7219817422535102 0M514.9 325.9a1.6201223897003778 1.6201223897003778 0 1 0 3.2402447794007556 0a1.6201223897003778 1.6201223897003778 0 1 0 -3.2402447794007556 0M220.2 262.8a1.5766083076378408 1.5766083076378408 0 1 0 3.1532166152756815 0a1.5766083076378408 1.5766083076378408 0 1 0 -3.1532166152756815 0M403.6 202.4a1.5741842444745677 1.5741842444745677 0 1 0 3.1483684889491355 0a1.5741842444745677 1.5741842444745677 0 1 0 -3.1483684889491355 0M280.7 260.9a1.2071741803150384 1.2071741803150384 0 1 0 2.414348360630077 0a1.2071741803150384 1.2071741803150384 0 1 0 -2.414348360630077 0M414.3 256.8a1.4842939655150231 1.4842939655150231 0 1 0 2.9685879310300463 0a1.4842939655150231 1.4842939655150231 0 1 0 -2.9685879310300463 0M441.5 366.7a0.9594002868136394 0.9594002868136394 0 1 0 1.9188005736272788 0a0.9594002868136394 0.9594002868136394 0 1 0 -1.9188005736272788 0M396.5 245.5a0.8939739480558541 0.8939739480558541 0 1 0 1.7879478961117081 0a0.8939739480558541 0.8939739480558541 0 1 0 -1.7879478961117081 0M487.6 425.7a1.5819673063531214 1.5819673063531214 0 1 0 3.163934612706243 0a1.5819673063531214 1.5819673063531214 0 1 0 -3.163934612706243 0M184.3 247.1a1.5295358218527735 1.5295358218527735 0 1 0 3.059071643705547 0a1.5295358218527735 1.5295358218527735 0 1 0 -3.059071643705547 0M379.9 301.8a1.1143211688979726 1.1143211688979726 0 1 0 2.2286423377959452 0a1.1143211688979726 1.1143211688979726 0 1 0 -2.2286423377959452 0M424.7 253.7a1.000282609695832 1.000282609695832 0 1 0 2.000565219391664 0a1.000282609695832 1.000282609695832 0 1 0 -2.000565219391664 0M207.6 375.0a1.5494923403947545 1.5494923403947545 0 1 0 3.098984680789509 0a1.5494923403947545 1.5494923403947545 0 1 0 -3.098984680789509 0M231.4 166.4a0.968213269178023 0.968213269178023 0 1 0 1.936426538356046 0a0.968213269178023 0.968213269178023 0 1 0 -1.936426538356046 0M201.9 202.7a1.1642294264531037 1.1642294264531037 0 1 0 2.3284588529062074 0a1.1642294264531037 1.1642294264531037 0 1 0 -2.3284588529062074 0M428.2 243.7a1.6277079605289808 1.6277079605289808 0 1 0 3.2554159210579616 0a1.6277079605289808 1.6277079605289808 0 1 0 -3.2554159210579616 0M186.0 368.9a1.411809405881734 1.411809405881734 0 1 0 2.823618811763468 0a1.411809405881734 1.411809405881734 0 1 0 -2.823618811763468 0M161.3 207.4a1.0338406696765132 1.0338406696765132 0 1 0 2.0676813393530264 0a1.0338406696765132 1.0338406696765132 0 1 0 -2.0676813393530264 0M457.0 198.3a1.5243164090666141 1.5243164090666141 0 1 0 3.0486328181332283 0a1.5243164090666141 1.5243164090666141 0 1 0 -3.0486328181332283 0M163.6 254.3a1.3797867596892517 1.3797867596892517 0 1 0 2.7595735193785034 0a1.3797867596892517 1.3797867596892517 0 1 0 -2.7595735193785034 0M158.6 149.7a1.3761525056102804 1.3761525056102804 0 1 0 2.7523050112205607 0a1.3761525056102804 1.3761525056102804 0 1 0 -2.7523050112205607 0M136.5 353.0a1.1831320225104056 1.1831320225104056 0 1 0 2.3662640450208112 0a1.1831320225104056 1.1831320225104056 0 1 0 -2.3662640450208112 0M426.0 253.3a1.6856955672481058 1.6856955672481058 0 1 0 3.3713911344962115 0a1.6856955672481058 1.6856955672481058 0 1 0 -3.3713911344962115 0M470.4 431.7a1.061723465809341 1.061723465809341 0 1 0 2.123446931618682 0a1.061723465809341 1.061723465809341 0 1 0 -2.123446931618682 0M317.4 227.3a1.1836253603767841 1.1836253603767841 0 1 0 2.3672507207535682 0a1.1836253603767841 1.1836253603767841 0 1 0 -2.3672507207535682 0M431.4 427.7a1.5566542089513078 1.5566542089513078 0 1 0 3.1133084179026156 0a1.5566542089513078 1.5566542089513078 0 1 0 -3.1133084179026156 0M113.0 167.5a1.5989094628476628 1.5989094628476628 0 1 0 3.1978189256953256 0a1.5989094628476628 1.5989094628476628 0 1 0 -3.1978189256953256 0M156.3 379.2a1.2865350362253702 1.2865350362253702 0 1 0 2.5730700724507405 0a1.2865350362253702 1.2865350362253702 0 1 0 -2.5730700724507405 0M423.7 379.1a1.160570869884054 1.160570869884054 0 1 0 2.321141739768108 0a1.160570869884054 1.160570869884054 0 1 0 -2.321141739768108 0M280.8 365.6a1.146629335821261 1.146629335821261 0 1 0 2.293258671642522 0a1.146629335821261 1.146629335821261 0 1 0 -2.293258671642522 0M119.1 288.5a1.5924405132349957 1.5924405132349957 0 1 0 3.1848810264699914 0a1.5924405132349957 1.5924405132349957 0 1 0 -3.1848810264699914 0M246.7 208.5a1.030195894632671 1.030195894632671 0 1 0 2.060391789265342 0a1.030195894632671 1.030195894632671 0 1 0 -2.060391789265342 0M427.7 146.3a1.3361113398206528 1.3361113398206528 0 1 0 2.6722226796413056 0a1.3361113398206528 1.3361113398206528 0 1 0 -2.6722226796413056 0M336.2 188.7a1.2710659325784688 1.2710659325784688 0 1 0 2.5421318651569376 0a1.2710659325784688 1.2710659325784688 0 1 0 -2.5421318651569376 0M480.1 264.8a1.410370068820538 1.410370068820538 0 1 0 2.820740137641076 0a1.410370068820538 1.410370068820538 0 1 0 -2.820740137641076 0M246.2 300.2a1.3965975038675569 1.3965975038675569 0 1 0 2.7931950077351138 0a1.3965975038675569 1.3965975038675569 0 1 0 -2.7931950077351138 0M126.9 318.0a1.5315613812595248 1.5315613812595248 0 1 0 3.0631227625190496 0a1.5315613812595248 1.5315613812595248 0 1 0 -3.0631227625190496 0M299.8 263.1a1.3320215707943044 1.3320215707943044 0 1 0 2.6640431415886088 0a1.3320215707943044 1.3320215707943044 0 1 0 -2.6640431415886088 0M163.8 330.9a1.564999215831048 1.564999215831048 0 1 0 3.129998431662096 0a1.564999215831048 1.564999215831048 0 1 0 -3.129998431662096 0M499.1 316.8a1.1152001950100066 1.1152001950100066 0 1 0 2.230400390020013 0a1.1152001950100066 1.1152001950100066 0 1 0 -2.230400390020013 0M155.4 374.5a1.2844793053199344 1.2844793053199344 0 1 0 2.5689586106398687 0a1.2844793053199344 1.2844793053199344 0 1 0 -2.5689586106398687 0M244.3 190.5a1.358350549832313 1.358350549832313 0 1 0 2.716701099664626 0a1.358350549832313 1.358350549832313 0 1 0 -2.716701099664626 0M476.5 295.5a1.2031448112830005 1.2031448112830005 0 1 0 2.406289622566001 0a1.2031448112830005 1.2031448112830005 0 1 0 -2.406289622566001 0M494.9 302.5a1.0367538743063378 1.0367538743063378 0 1 0 2.0735077486126756 0a1.0367538743063378 1.0367538743063378 0 1 0 -2.0735077486126756 0M182.7 350.5a0.9273641428233722 0.9273641428233722 0 1 0 1.8547282856467444 0a0.9273641428233722 0.9273641428233722 0 1 0 -1.8547282856467444 0M277.7 379.1a1.4337350421899324 1.4337350421899324 0 1 0 2.867470084379865 0a1.4337350421899324 1.4337350421899324 0 1 0 -2.867470084379865 0M368.0 423.8a0.9733432173015022 0.9733432173015022 0 1 0 1.9466864346030044 0a0.9733432173015022 0.9733432173015022 0 1 0 -1.9466864346030044 0M109.6 419.1a1.0574029693914606 1.0574029693914606 0 1 0 2.1148059387829212 0a1.0574029693914606 1.0574029693914606 0 1 0 -2.1148059387829212 0M463.6 227.0a0.8590198850343189 0.8590198850343189 0 1 0 1.7180397700686378 0a0.8590198850343189 0.8590198850343189 0 1 0 -1.7180397700686378 0M144.1 179.7a1.094838231238386 1.094838231238386 0 1 0 2.189676462476772 0a1.094838231238386 1.094838231238386 0 1 0 -2.189676462476772 0M501.3 305.1a1.1994211780367616 1.1994211780367616 0 1 0 2.3988423560735233 0a1.1994211780367616 1.1994211780367616 0 1 0 -2.3988423560735233 0\"/>\n  <path class=\"a2-sulcus\" d=\"M160.0 196.0C175.0 199.0 216.7 209.0 250.0 214.0C283.3 219.0 325.0 222.0 360.0 226.0C395.0 230.0 426.7 232.0 460.0 238.0C493.3 244.0 533.3 255.7 560.0 262.0C586.7 268.3 610.0 273.7 620.0 276.0\"/>\n  <path class=\"a2-vessel\" d=\"M229.8 440.4L230.2 438.5L230.8 436.2L231.6 433.5L232.4 430.4L233.4 427.0L234.3 423.4L235.2 419.6L236.0 415.7L236.7 411.8L237.3 407.8L237.6 403.8L237.6 400.0L237.3 396.1L236.7 392.2L235.8 388.3L234.6 384.3L233.4 380.3L232.1 376.3L230.9 372.2L229.7 368.2L228.7 364.2L228.0 360.1L227.6 356.1L227.5 352.1L227.9 348.0L228.6 343.7L229.7 339.3L231.1 334.9L232.6 330.4L234.2 325.9L235.8 321.4L237.4 316.9L238.8 312.5L240.0 308.2L240.9 304.1L241.3 300.1L241.4 296.2L241.2 292.3L240.7 288.4L239.9 284.6L239.1 280.9L238.1 277.4L237.1 274.1L236.1 270.9L235.1 268.1L234.3 265.6L233.6 263.5L233.2 261.7L230.8 262.3L231.3 264.1L232.0 266.3L232.8 268.9L233.7 271.7L234.7 274.8L235.6 278.1L236.6 281.6L237.4 285.2L238.1 288.8L238.5 292.5L238.7 296.2L238.7 299.9L238.2 303.6L237.3 307.6L236.2 311.7L234.7 316.0L233.2 320.4L231.5 324.9L229.9 329.4L228.3 334.0L226.9 338.6L225.8 343.1L224.9 347.6L224.5 351.9L224.5 356.3L225.0 360.5L225.7 364.8L226.7 369.0L227.9 373.1L229.1 377.2L230.4 381.2L231.6 385.2L232.6 389.1L233.5 392.8L234.1 396.5L234.4 400.0L234.3 403.7L234.0 407.4L233.4 411.2L232.7 415.1L231.9 418.9L231.0 422.6L230.0 426.1L229.1 429.4L228.2 432.5L227.4 435.3L226.7 437.7L226.2 439.6ZM373.8 447.7L373.4 445.6L372.8 442.9L372.1 439.9L371.2 436.5L370.4 432.8L369.5 428.9L368.8 424.8L368.1 420.7L367.6 416.4L367.3 412.3L367.3 408.1L367.6 404.2L368.3 400.3L369.4 396.3L371.0 392.1L372.7 387.9L374.7 383.5L376.7 379.1L378.8 374.7L380.7 370.2L382.4 365.7L383.8 361.1L384.9 356.6L385.4 352.1L385.4 347.4L385.0 342.6L384.2 337.5L383.1 332.4L381.8 327.4L380.4 322.4L378.9 317.6L377.4 313.1L376.0 309.0L374.8 305.3L373.8 302.2L373.2 299.7L370.8 300.3L371.5 302.9L372.5 306.0L373.7 309.7L375.0 313.9L376.4 318.4L377.9 323.1L379.2 328.0L380.5 333.0L381.5 338.0L382.2 342.9L382.6 347.6L382.6 351.9L382.1 356.1L381.1 360.4L379.7 364.7L378.0 369.1L376.1 373.5L374.0 377.9L371.9 382.3L369.9 386.6L368.1 391.0L366.5 395.3L365.2 399.6L364.4 403.8L364.1 408.0L364.0 412.4L364.3 416.7L364.8 421.1L365.4 425.4L366.2 429.6L367.0 433.6L367.9 437.3L368.7 440.7L369.3 443.7L369.9 446.2L370.2 448.3ZM226.9 350.4L225.0 349.4L222.6 348.2L219.8 346.9L216.6 345.4L213.2 343.8L209.6 342.0L206.1 340.1L202.5 338.1L199.2 336.0L196.1 333.8L193.4 331.4L191.2 329.1L189.3 326.4L187.5 323.3L185.9 319.8L184.5 316.1L183.2 312.2L182.1 308.3L181.0 304.4L180.1 300.7L179.2 297.3L178.5 294.3L177.8 291.7L177.1 289.7L174.9 290.3L175.4 292.3L176.1 294.9L176.8 297.9L177.6 301.3L178.4 305.1L179.4 309.0L180.6 313.0L181.9 317.0L183.3 320.9L184.9 324.6L186.8 327.9L188.8 330.9L191.3 333.6L194.2 336.2L197.4 338.6L200.9 340.8L204.5 343.0L208.1 345.0L211.7 346.8L215.1 348.5L218.3 350.0L221.1 351.4L223.4 352.6L225.1 353.6Z\"/>\n  <path class=\"a2-white\" d=\"M249.3 -26.7L248.6 -23.0L247.7 -18.5L246.7 -13.3L245.6 -7.5L244.4 -1.1L243.1 5.6L241.7 12.5L240.3 19.6L238.8 26.8L237.2 33.7L235.7 40.5L234.1 46.8L232.4 53.1L230.6 59.4L228.6 66.0L226.5 72.7L224.3 79.4L222.1 86.2L220.0 93.0L217.8 99.7L215.8 106.3L213.9 112.8L212.2 119.2L210.7 125.2L209.4 130.9L208.2 136.2L207.1 141.3L206.0 146.4L205.1 151.3L204.2 156.3L203.6 161.2L203.0 166.2L202.7 171.2L202.6 176.3L202.7 181.6L203.1 186.8L203.6 192.0L204.3 197.2L205.0 202.4L206.0 207.6L207.1 212.9L208.5 218.3L210.2 223.7L212.1 229.1L214.4 234.6L217.0 240.2L219.9 245.8L223.3 251.4L227.0 257.0L231.1 262.7L235.5 268.4L240.2 274.1L245.2 279.8L250.5 285.5L255.9 291.2L261.6 296.8L267.4 302.5L273.4 308.1L279.5 313.7L285.7 319.2L292.2 324.7L299.1 330.3L306.4 335.9L313.8 341.5L321.4 347.1L329.1 352.6L336.8 358.0L344.5 363.4L351.9 368.6L359.2 373.6L366.2 378.5L372.8 383.2L379.3 387.8L385.8 392.4L392.3 396.9L398.8 401.3L405.0 405.6L411.1 409.8L417.0 413.8L422.6 417.6L427.8 421.2L432.7 424.6L437.1 427.7L441.1 430.5L444.5 433.1L447.4 435.4L450.0 437.5L452.2 439.4L454.1 441.1L455.7 442.6L457.1 443.9L458.4 445.1L459.5 446.3L460.6 447.4L461.8 448.5L462.8 449.4L473.2 438.6L472.4 437.8L471.7 436.9L470.7 435.8L469.6 434.6L468.3 433.1L466.8 431.4L465.0 429.6L462.9 427.6L460.5 425.4L457.7 423.0L454.5 420.3L450.9 417.5L446.9 414.4L442.4 411.1L437.5 407.5L432.2 403.8L426.7 399.8L420.9 395.7L414.8 391.5L408.6 387.1L402.3 382.7L396.0 378.1L389.6 373.5L383.2 368.8L376.6 364.0L369.6 358.9L362.4 353.8L355.0 348.5L347.4 343.1L339.9 337.6L332.4 332.1L325.0 326.6L317.8 321.1L311.0 315.6L304.4 310.2L298.3 304.8L292.4 299.4L286.6 294.0L281.0 288.5L275.4 283.0L270.1 277.5L265.0 272.0L260.2 266.6L255.6 261.2L251.3 255.9L247.4 250.7L243.9 245.6L240.7 240.6L238.0 235.8L235.6 231.1L233.5 226.4L231.8 221.8L230.2 217.3L229.0 212.7L227.9 208.2L227.0 203.7L226.3 199.1L225.7 194.5L225.3 189.8L224.9 185.2L224.7 180.8L224.7 176.6L224.9 172.4L225.3 168.3L225.8 164.2L226.5 160.0L227.3 155.6L228.3 151.1L229.4 146.4L230.6 141.4L231.9 136.2L233.3 130.8L234.8 125.2L236.4 119.4L238.3 113.3L240.4 107.0L242.6 100.4L244.9 93.8L247.2 87.0L249.5 80.2L251.8 73.4L253.9 66.6L256.0 59.8L257.9 53.2L259.7 46.4L261.4 39.4L263.1 32.2L264.8 25.0L266.4 17.7L267.9 10.7L269.3 3.9L270.7 -2.5L271.9 -8.3L273.0 -13.5L273.9 -17.8L274.7 -21.3Z\"/>\n  <path class=\"a2-fibre\" d=\"M267.9 -22.8L267.1 -19.2L266.2 -14.8L265.2 -9.6L264.0 -3.8L262.8 2.6L261.4 9.3L259.9 16.4L258.4 23.6L256.8 30.8L255.2 37.9L253.5 44.9L251.8 51.5L250.0 58.1L248.0 64.7L245.9 71.5L243.7 78.3L241.5 85.1L239.2 91.9L237.0 98.6L234.8 105.2L232.8 111.6L230.9 117.8L229.3 123.7L227.8 129.4L226.5 134.9L225.3 140.2L224.1 145.2L223.1 150.0L222.1 154.6L221.3 159.1L220.6 163.5L220.1 167.8L219.8 172.2L219.6 176.5L219.7 180.9L220.0 185.5L220.4 190.3L221.0 195.1L221.6 199.8L222.4 204.5L223.4 209.2L224.5 213.9L225.9 218.7L227.6 223.4L229.5 228.2L231.7 233.0L234.2 237.9L237.1 242.8L240.4 247.9L244.1 253.1L248.1 258.4L252.5 263.8L257.2 269.2L262.2 274.7L267.4 280.2L272.8 285.7L278.4 291.2L284.1 296.7L290.0 302.1L296.0 307.5L302.2 312.9L308.8 318.3L315.8 323.8L323.0 329.3L330.4 334.8L338.0 340.3L345.6 345.7L353.2 351.0L360.6 356.3L367.9 361.4L374.9 366.4L381.5 371.1L387.9 375.8L394.4 380.4L400.8 384.9L407.1 389.3L413.4 393.6L419.4 397.8L425.3 401.9L430.8 405.7L436.1 409.4L441.0 412.9L445.5 416.2L449.6 419.2L453.2 422.0L456.4 424.6L459.2 426.9L461.6 429.0L463.7 431.0L465.5 432.8L467.0 434.3L468.4 435.7L469.5 437.0L470.5 438.0L471.3 438.9L472.1 439.7M264.0 -23.6L263.2 -20.0L262.3 -15.6L261.3 -10.4L260.1 -4.6L258.8 1.8L257.5 8.5L256.0 15.5L254.5 22.7L252.9 29.9L251.3 37.0L249.6 43.9L247.9 50.5L246.2 57.0L244.2 63.6L242.1 70.3L239.9 77.1L237.7 83.9L235.4 90.6L233.2 97.3L231.0 103.9L229.0 110.4L227.1 116.7L225.4 122.7L223.9 128.5L222.6 134.0L221.4 139.3L220.2 144.3L219.1 149.2L218.2 153.9L217.3 158.5L216.7 163.0L216.1 167.5L215.8 171.9L215.6 176.5L215.7 181.1L216.0 185.8L216.4 190.7L217.0 195.6L217.7 200.4L218.5 205.3L219.5 210.1L220.7 215.0L222.1 219.9L223.8 224.8L225.8 229.7L228.1 234.8L230.7 239.8L233.7 244.9L237.1 250.2L240.9 255.5L245.0 260.9L249.5 266.3L254.2 271.9L259.2 277.4L264.5 283.0L269.9 288.5L275.6 294.1L281.4 299.6L287.3 305.1L293.3 310.5L299.6 315.9L306.3 321.4L313.3 326.9L320.6 332.5L328.1 338.0L335.7 343.5L343.3 348.9L350.9 354.3L358.3 359.5L365.6 364.6L372.5 369.6L379.2 374.4L385.6 379.0L392.1 383.6L398.5 388.1L404.8 392.6L411.1 396.9L417.1 401.1L423.0 405.2L428.6 409.0L433.8 412.7L438.7 416.2L443.2 419.4L447.2 422.4L450.8 425.1L453.9 427.6L456.6 429.9L458.9 432.0L460.9 433.9L462.7 435.6L464.2 437.1L465.5 438.5L466.6 439.7L467.6 440.8L468.5 441.7L469.4 442.6M260.0 -24.4L259.3 -20.8L258.4 -16.4L257.4 -11.2L256.2 -5.4L254.9 1.0L253.5 7.7L252.1 14.7L250.6 21.9L249.0 29.0L247.4 36.1L245.7 43.0L244.1 49.5L242.3 55.9L240.4 62.4L238.3 69.1L236.1 75.8L233.9 82.6L231.6 89.4L229.4 96.1L227.2 102.7L225.2 109.2L223.2 115.6L221.5 121.7L220.1 127.5L218.7 133.1L217.5 138.3L216.3 143.4L215.2 148.3L214.3 153.1L213.4 157.8L212.7 162.4L212.2 167.1L211.8 171.7L211.6 176.4L211.7 181.2L212.0 186.2L212.5 191.1L213.0 196.1L213.7 201.0L214.6 206.0L215.6 211.0L216.8 216.0L218.3 221.1L220.1 226.2L222.1 231.3L224.5 236.5L227.2 241.8L230.3 247.1L233.8 252.4L237.7 257.9L241.9 263.4L246.4 268.9L251.2 274.5L256.3 280.1L261.6 285.7L267.1 291.3L272.8 296.9L278.6 302.5L284.6 308.0L290.7 313.5L297.0 319.0L303.8 324.5L310.9 330.1L318.2 335.7L325.7 341.2L333.3 346.7L341.0 352.2L348.6 357.6L356.0 362.8L363.3 367.9L370.2 372.9L376.8 377.6L383.3 382.3L389.8 386.9L396.2 391.4L402.6 395.9L408.8 400.2L414.9 404.4L420.7 408.4L426.3 412.3L431.5 416.0L436.4 419.4L440.8 422.6L444.8 425.6L448.3 428.3L451.3 430.7L453.9 433.0L456.2 435.0L458.2 436.8L459.8 438.4L461.3 439.9L462.5 441.2L463.7 442.4L464.7 443.5L465.7 444.5L466.6 445.4M256.1 -25.2L255.4 -21.6L254.5 -17.2L253.4 -12.0L252.3 -6.1L251.0 0.2L249.6 6.9L248.2 13.9L246.7 21.0L245.1 28.2L243.5 35.2L241.8 42.0L240.2 48.5L238.5 54.8L236.5 61.3L234.5 67.9L232.3 74.6L230.1 81.3L227.8 88.1L225.6 94.8L223.4 101.5L221.3 108.0L219.4 114.4L217.7 120.6L216.2 126.6L214.9 132.1L213.6 137.4L212.4 142.5L211.3 147.5L210.3 152.3L209.5 157.1L208.7 161.9L208.2 166.7L207.8 171.5L207.6 176.4L207.7 181.4L208.0 186.5L208.5 191.5L209.1 196.6L209.8 201.6L210.6 206.7L211.7 211.9L213.0 217.1L214.5 222.3L216.3 227.6L218.4 232.9L220.9 238.3L223.7 243.7L226.9 249.2L230.5 254.7L234.4 260.2L238.7 265.8L243.3 271.5L248.2 277.1L253.3 282.8L258.7 288.5L264.3 294.2L270.0 299.8L275.9 305.4L281.9 311.0L288.0 316.5L294.5 322.0L301.3 327.6L308.4 333.3L315.8 338.9L323.4 344.5L331.0 350.0L338.7 355.5L346.2 360.8L353.7 366.1L360.9 371.2L367.9 376.1L374.5 380.9L380.9 385.5L387.4 390.1L393.9 394.7L400.3 399.1L406.5 403.5L412.6 407.7L418.4 411.7L424.0 415.6L429.2 419.2L434.0 422.7L438.5 425.9L442.4 428.8L445.8 431.4L448.8 433.8L451.3 436.0L453.5 437.9L455.4 439.7L457.0 441.2L458.4 442.7L459.6 444.0L460.7 445.2L461.8 446.3L462.9 447.4L463.9 448.3M114.0 430.7L112.8 431.1L111.1 431.6L109.2 432.1L107.1 432.8L104.8 433.5L102.4 434.2L99.9 435.0L97.4 435.7L94.9 436.5L92.5 437.2L90.3 438.0L88.2 438.6L86.2 439.3L84.2 440.0L82.1 440.8L79.9 441.5L77.9 442.3L75.8 443.1L73.9 443.8L72.0 444.5L70.3 445.1L68.8 445.7L67.5 446.2L66.4 446.6M112.7 426.4L111.5 426.8L109.8 427.3L108.0 427.8L105.8 428.5L103.5 429.2L101.1 429.9L98.6 430.7L96.1 431.4L93.6 432.2L91.2 433.0L88.9 433.7L86.8 434.4L84.8 435.1L82.7 435.8L80.5 436.5L78.4 437.3L76.3 438.1L74.2 438.8L72.3 439.6L70.4 440.3L68.7 440.9L67.2 441.5L65.9 442.0L64.9 442.3M111.3 421.6L110.0 422.0L108.4 422.5L106.5 423.0L104.4 423.7L102.1 424.4L99.7 425.1L97.1 425.9L94.6 426.6L92.1 427.4L89.6 428.2L87.3 428.9L85.2 429.6L83.1 430.3L81.0 431.1L78.9 431.8L76.7 432.6L74.6 433.4L72.5 434.2L70.5 434.9L68.7 435.6L67.0 436.2L65.5 436.8L64.2 437.3L63.1 437.7M110.0 417.3L108.7 417.7L107.1 418.2L105.2 418.7L103.1 419.4L100.8 420.1L98.3 420.8L95.8 421.6L93.3 422.3L90.7 423.1L88.3 423.9L86.0 424.6L83.8 425.4L81.7 426.1L79.5 426.8L77.3 427.6L75.2 428.4L73.0 429.2L70.9 429.9L69.0 430.7L67.1 431.4L65.4 432.0L63.9 432.6L62.6 433.1L61.6 433.4\"/>\n  <circle class=\"a2-mamm\" cx=\"470\" cy=\"444\" r=\"24\"/>\n</g>\n<path class=\"a2-white\" d=\"M108.5 412.5L107.2 412.9L105.7 413.3L103.8 413.9L101.6 414.5L99.3 415.2L96.9 415.9L94.3 416.6L91.8 417.4L89.2 418.2L86.7 418.9L84.3 419.7L82.1 420.4L80.0 421.1L77.8 421.8L75.6 422.6L73.3 423.4L71.2 424.1L69.1 424.9L67.1 425.6L65.2 426.3L63.5 426.9L62.0 427.5L60.7 427.9L59.7 428.3L68.3 451.7L69.4 451.3L70.7 450.8L72.2 450.2L73.9 449.6L75.7 448.8L77.7 448.1L79.7 447.3L81.8 446.6L83.9 445.8L85.9 445.0L87.9 444.3L89.9 443.6L91.9 442.9L94.1 442.2L96.5 441.4L98.9 440.7L101.4 439.9L103.9 439.1L106.3 438.4L108.6 437.6L110.7 437.0L112.6 436.4L114.2 435.9L115.5 435.5Z\"/>\n<path class=\"a2-fibre\" d=\"M114.0 430.7L112.8 431.1L111.1 431.6L109.2 432.1L107.1 432.8L104.8 433.5L102.4 434.2L99.9 435.0L97.4 435.7L94.9 436.5L92.5 437.2L90.3 438.0L88.2 438.6L86.2 439.3L84.2 440.0L82.1 440.8L79.9 441.5L77.9 442.3L75.8 443.1L73.9 443.8L72.0 444.5L70.3 445.1L68.8 445.7L67.5 446.2L66.4 446.6M112.7 426.4L111.5 426.8L109.8 427.3L108.0 427.8L105.8 428.5L103.5 429.2L101.1 429.9L98.6 430.7L96.1 431.4L93.6 432.2L91.2 433.0L88.9 433.7L86.8 434.4L84.8 435.1L82.7 435.8L80.5 436.5L78.4 437.3L76.3 438.1L74.2 438.8L72.3 439.6L70.4 440.3L68.7 440.9L67.2 441.5L65.9 442.0L64.9 442.3M111.3 421.6L110.0 422.0L108.4 422.5L106.5 423.0L104.4 423.7L102.1 424.4L99.7 425.1L97.1 425.9L94.6 426.6L92.1 427.4L89.6 428.2L87.3 428.9L85.2 429.6L83.1 430.3L81.0 431.1L78.9 431.8L76.7 432.6L74.6 433.4L72.5 434.2L70.5 434.9L68.7 435.6L67.0 436.2L65.5 436.8L64.2 437.3L63.1 437.7M110.0 417.3L108.7 417.7L107.1 418.2L105.2 418.7L103.1 419.4L100.8 420.1L98.3 420.8L95.8 421.6L93.3 422.3L90.7 423.1L88.3 423.9L86.0 424.6L83.8 425.4L81.7 426.1L79.5 426.8L77.3 427.6L75.2 428.4L73.0 429.2L70.9 429.9L69.0 430.7L67.1 431.4L65.4 432.0L63.9 432.6L62.6 433.1L61.6 433.4\"/>\n<ellipse class=\"a2-white\" cx=\"124\" cy=\"418\" rx=\"40\" ry=\"17\"/>\n<ellipse class=\"a2-white\" cx=\"156\" cy=\"172\" rx=\"25\" ry=\"18\"/>\n<path class=\"a2-acdots\" d=\"M168.2 172.0a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0 -2.4 0M153.2 174.8a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0 -2.4 0M163.0 164.9a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0 -2.4 0M141.2 170.9a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0 -2.4 0M144.3 173.3a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0 -2.4 0M158.1 183.9a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0 -2.4 0M162.6 178.9a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0 -2.4 0M139.3 165.1a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0 -2.4 0M150.5 174.8a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0 -2.4 0M158.3 184.1a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0 -2.4 0M142.3 166.1a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0 -2.4 0M145.2 172.9a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0 -2.4 0M148.5 184.0a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0 -2.4 0M163.6 172.5a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0 -2.4 0M139.8 166.4a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0 -2.4 0M167.2 172.8a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0 -2.4 0M165.8 165.2a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0 -2.4 0M167.6 178.4a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0 -2.4 0M165.7 169.9a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0 -2.4 0M157.0 170.9a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0 -2.4 0M151.1 159.3a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0 -2.4 0M165.0 169.6a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0 -2.4 0M163.7 183.2a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0 -2.4 0M171.0 168.0a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0 -2.4 0M172.7 172.0a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0 -2.4 0M145.6 175.0a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0 -2.4 0\"/>\n<path class=\"a2-lamina\" d=\"M146.0 190.0C143.7 201.7 136.3 235.0 132.0 260.0C127.7 285.0 122.3 316.3 120.0 340.0C117.7 363.7 118.3 391.7 118.0 402.0\"/>\n<path class=\"a2-stalk\" d=\"M287.0 446.0C289.8 442.5 312.3 442.8 317.0 446.0C321.7 449.2 320.5 462.8 322.0 470.0C323.5 477.2 329.3 495.2 328.0 500.0C326.7 504.8 316.0 505.7 312.0 506.0C308.0 506.3 300.1 506.5 298.0 502.0C295.9 497.5 297.5 479.5 296.0 472.0C294.5 464.5 284.2 449.5 287.0 446.0Z\"/>\n<path class=\"a2-post\" d=\"M312.0 504.0C315.0 498.7 325.7 497.3 332.0 498.0C338.3 498.7 346.7 502.7 350.0 508.0C353.3 513.3 353.7 523.7 352.0 530.0C350.3 536.3 345.3 543.0 340.0 546.0C334.7 549.0 324.3 550.7 320.0 548.0C315.7 545.3 315.3 537.3 314.0 530.0C312.7 522.7 309.0 509.3 312.0 504.0Z\"/>\n<path class=\"a2-ant\" d=\"M256.0 520.0C258.3 513.7 264.7 505.7 272.0 502.0C279.3 498.3 292.3 496.3 300.0 498.0C307.7 499.7 315.0 505.7 318.0 512.0C321.0 518.3 321.0 529.7 318.0 536.0C315.0 542.3 307.3 547.7 300.0 550.0C292.7 552.3 281.0 551.7 274.0 550.0C267.0 548.3 261.0 545.0 258.0 540.0C255.0 535.0 253.7 526.3 256.0 520.0Z\"/>\n<path class=\"a2-loops\" d=\"M279 444C277 458 291 458 289 444M295 447C293 461 307 461 305 447M311 444C309 458 323 458 321 444\"/>\n<circle data-part=\"heat\" class=\"a2-heat\" cx=\"186\" cy=\"234\" r=\"120\" fill=\"url(#a2-hglow)\" opacity=\"0\" clip-path=\"url(#a2-brainclip)\"/>\n<circle data-part=\"mglow\" class=\"a2-mglow\" cx=\"186\" cy=\"234\" r=\"58\" fill=\"url(#a2-mglow)\" opacity=\"0.2\"/>\n<path class=\"a2-axon\" d=\"M262.0 402.0L260.7 399.6L258.8 396.6L256.6 393.0L254.1 389.0L251.5 384.6L248.9 380.1L246.6 375.4L244.5 370.8L243.0 366.3L242.0 362.0L241.9 357.9L242.5 353.7L243.7 349.4L245.3 345.2L247.0 340.9L248.6 336.6L250.0 332.4L250.8 328.2L250.9 324.0L250.0 320.0L248.1 316.1L245.2 312.3L241.6 308.6L237.5 305.0L233.1 301.4L228.6 297.7L224.3 294.0L220.2 290.2L216.7 286.2L214.0 282.0L211.9 277.4L210.2 272.3L208.8 266.8L207.6 261.2L206.8 255.6L206.0 250.2L205.4 245.2L204.9 240.7L204.5 236.9L204.0 234.0M282.0 390.0L280.4 387.6L278.3 384.5L275.7 380.8L272.9 376.6L269.9 372.1L266.8 367.5L263.7 362.8L260.8 358.3L258.2 353.9L256.0 350.0L254.2 346.4L252.7 342.9L251.5 339.5L250.4 336.1L249.4 332.8L248.3 329.5L247.1 326.2L245.8 322.9L244.1 319.5L242.0 316.0L239.4 312.4L236.5 308.6L233.2 304.7L229.6 300.8L226.0 296.9L222.4 293.1L218.8 289.3L215.5 285.7L212.6 282.2L210.0 279.0L207.8 275.9L205.8 272.8L204.0 269.8L202.4 266.9L201.0 264.2L199.7 261.6L198.6 259.3L197.6 257.2L196.8 255.4L196.0 254.0M322.0 388.0L320.2 385.6L318.0 382.5L315.5 378.8L312.7 374.7L309.5 370.3L306.1 365.6L302.4 361.0L298.4 356.4L294.3 352.0L290.0 348.0L285.2 344.2L279.9 340.5L274.1 336.9L268.0 333.3L261.8 329.8L255.5 326.2L249.5 322.7L243.8 319.1L238.6 315.6L234.0 312.0L229.9 308.4L226.0 304.7L222.3 300.9L219.0 297.2L215.9 293.5L213.1 289.8L210.7 286.2L208.7 282.7L207.1 279.3L206.0 276.0L205.5 272.8L205.7 269.4L206.5 266.1L207.7 262.9L209.3 259.8L210.9 256.8L212.5 254.1L214.0 251.7L215.2 249.6L216.0 248.0M342.0 402.0L339.9 399.7L337.5 396.8L334.7 393.4L331.5 389.6L327.9 385.4L323.9 380.9L319.5 376.3L314.8 371.5L309.6 366.7L304.0 362.0L297.6 357.1L290.1 351.8L281.8 346.2L273.1 340.5L264.1 334.7L255.2 328.9L246.7 323.2L238.8 317.8L231.8 312.7L226.0 308.0L221.4 303.8L217.6 300.1L214.6 296.7L212.2 293.5L210.3 290.4L208.6 287.4L207.1 284.2L205.6 280.8L203.9 277.1L202.0 273.0L199.9 268.2L197.7 262.7L195.6 256.8L193.5 250.6L191.5 244.3L189.6 238.2L187.9 232.6L186.4 227.5L185.0 223.2L184.0 220.0\"/>\n<path class=\"a2-axon a2-axon-down\" d=\"M302.0 400.0L301.7 401.9L301.5 404.3L301.1 407.2L300.8 410.5L300.3 413.9L299.7 417.4L298.9 420.8L298.0 424.0L296.8 427.2L295.3 430.6L293.6 434.1L291.8 437.5L290.0 440.8L288.3 443.7L287.0 446.1L286.0 448.0M276.0 416.0L277.3 417.4L279.1 419.2L281.2 421.4L283.5 423.9L285.9 426.5L288.2 429.1L290.3 431.6L292.0 434.0L293.4 436.4L294.8 438.9L295.9 441.5L297.0 444.1L297.9 446.6L298.8 448.8L299.4 450.6L300.0 452.0M314.0 416.0L314.4 417.2L314.9 418.9L315.6 420.8L316.3 423.0L316.9 425.3L317.5 427.6L317.9 429.9L318.0 432.0L317.9 434.1L317.5 436.4L316.9 438.7L316.3 441.0L315.6 443.2L314.9 445.1L314.4 446.8L314.0 448.0\"/>\n<path class=\"a2-bead\" d=\"M255.1 393.0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0M241.5 366.3a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0M245.5 340.9a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0M246.6 316.1a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0M222.8 294.0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0M207.3 266.8a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0M203.0 236.9a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0M274.2 380.8a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0M256.7 353.9a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0M247.9 332.8a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0M237.9 312.4a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0M217.3 289.3a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0M202.5 269.8a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0M195.3 255.4a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0M314.0 378.8a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0M292.8 352.0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0M260.3 329.8a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0M228.4 308.4a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0M209.2 286.2a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0M205.0 266.1a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0M213.7 249.6a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0M333.2 393.4a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0M308.1 366.7a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0M262.6 334.7a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0M219.9 303.8a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0M205.6 284.2a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0M194.1 256.8a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0M183.5 223.2a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0\"/>\n<g clip-path=\"url(#a2-brainclip)\"><path class=\"a2-out\" d=\"M206.0 240.0L208.5 241.3L211.6 242.8L215.1 244.6L219.1 246.6L223.5 248.9L228.4 251.3L233.7 253.8L239.4 256.5L245.5 259.2L252.0 262.0L259.0 264.9L266.7 268.1L274.9 271.5L283.6 275.0L292.6 278.6L301.9 282.3L311.4 285.9L321.0 289.4L330.5 292.8L340.0 296.0L349.7 299.1L359.9 302.2L370.4 305.3L381.1 308.4L391.8 311.4L402.3 314.2L412.6 317.0L422.4 319.5L431.6 321.9L440.0 324.0L447.7 325.9L454.9 327.5L461.6 328.9L467.8 330.1L473.8 331.3L479.4 332.3L484.7 333.2L489.9 334.1L495.0 335.0L500.0 336.0L505.0 337.0L509.9 338.0L514.7 338.9L519.4 339.9L523.8 340.8L527.8 341.6L531.6 342.3L534.9 343.0L537.7 343.5L540.0 344.0\"/><path data-part=\"outpulse\" class=\"a2-outpulse\"/></g>\n<g class=\"a2-mn\" transform=\"translate(160 226)\"><path class=\"a2-mden\" d=\"M0.7 5.3C1.3 6.4 8.0 10.6 10.2 11.7C12.5 12.7 19.9 14.5 20.1 14.3C20.3 14.2 13.5 11.9 11.7 10.5C10.0 9.0 6.2 2.5 5.0 1.9C3.7 1.3 0.1 4.1 0.7 5.3ZM-4.8 -2.3C-5.8 -2.4 -11.4 1.0 -12.9 2.2C-14.5 3.5 -17.9 8.6 -17.9 8.8C-17.9 9.0 -14.3 4.8 -12.8 4.1C-11.2 3.5 -5.2 3.9 -4.3 3.2C-3.3 2.4 -3.8 -2.1 -4.8 -2.3ZM3.6 -3.9C4.2 -5.1 3.9 -12.9 4.1 -15.3C4.4 -17.7 5.7 -24.5 5.4 -24.5C5.2 -24.5 3.1 -17.9 2.3 -15.7C1.4 -13.4 -2.0 -6.4 -1.8 -5.0C-1.7 -3.6 2.9 -2.7 3.6 -3.9Z\"/><path class=\"a2-msoma\" d=\"M7.0 2.5C6.2 3.8 3.6 4.6 1.7 5.0C-0.2 5.5 -3.0 6.0 -4.5 5.2C-6.0 4.4 -7.2 1.8 -7.2 0.3C-7.2 -1.2 -5.6 -2.9 -4.2 -4.0C-2.8 -5.1 -0.5 -6.4 1.3 -6.2C3.1 -6.0 5.5 -4.4 6.4 -2.9C7.4 -1.5 7.8 1.1 7.0 2.5Z\"/><path class=\"a2-mnuc\" d=\"M-3.1 -0.3a2.73 2.73 0 1 0 5.46 0a2.73 2.73 0 1 0 -5.46 0\"/><path class=\"a2-rec\" d=\"M6.3 0.0a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0M2.6 5.5a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0M-4.8 5.5a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0M-8.5 0.0a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0M-4.8 -5.5a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0M2.6 -5.5a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0\"/></g><g class=\"a2-mn\" transform=\"translate(180 214)\"><path class=\"a2-mden\" d=\"M2.2 -4.8C2.6 -5.9 0.7 -11.6 0.9 -13.3C1.0 -15.1 3.6 -19.7 3.4 -19.7C3.1 -19.6 -0.2 -14.9 -1.0 -13.1C-1.8 -11.3 -3.6 -5.2 -3.3 -4.2C-2.9 -3.2 1.7 -3.8 2.2 -4.8ZM4.3 3.1C5.6 4.0 13.8 4.0 16.0 5.1C18.3 6.2 23.5 13.1 23.5 12.8C23.5 12.6 18.4 5.0 16.2 3.2C14.0 1.4 6.2 -2.3 4.8 -2.3C3.4 -2.3 3.0 2.2 4.3 3.1ZM-5.0 1.8C-6.0 2.4 -8.6 8.7 -9.4 10.6C-10.3 12.4 -12.8 17.6 -12.7 17.8C-12.5 17.9 -9.4 13.2 -8.0 11.8C-6.6 10.3 -1.1 6.4 -0.8 5.2C-0.5 4.1 -4.0 1.1 -5.0 1.8Z\"/><path class=\"a2-msoma\" d=\"M-5.5 3.4C-6.7 2.1 -8.2 -0.3 -7.8 -1.7C-7.4 -3.2 -4.7 -4.6 -2.8 -5.3C-0.9 -6.0 2.1 -6.6 3.7 -6.0C5.4 -5.3 6.8 -2.8 7.1 -1.2C7.3 0.5 6.6 2.5 5.4 3.8C4.2 5.1 1.6 6.6 -0.2 6.6C-2.1 6.5 -4.2 4.8 -5.5 3.4Z\"/><path class=\"a2-mnuc\" d=\"M-2.5 0.1a2.73 2.73 0 1 0 5.46 0a2.73 2.73 0 1 0 -5.46 0\"/><path class=\"a2-rec\" d=\"M2.9 5.4a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0M-4.5 5.7a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0M-8.5 0.3a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0M-5.1 -5.4a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0M2.3 -5.7a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0M6.3 -0.3a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0\"/></g><g class=\"a2-mn\" transform=\"translate(200 228)\"><path class=\"a2-mden\" d=\"M-3.5 4.0C-4.0 5.2 -3.0 13.0 -2.5 15.4C-2.0 17.8 0.4 24.8 0.6 24.8C0.8 24.8 -0.8 18.1 -0.6 15.8C-0.5 13.4 2.2 6.3 1.9 5.0C1.5 3.6 -3.0 2.8 -3.5 4.0ZM-2.0 -4.9C-3.0 -5.9 -11.0 -8.4 -13.6 -8.9C-16.3 -9.4 -24.6 -9.0 -24.7 -8.9C-24.8 -8.7 -17.0 -8.3 -14.8 -7.4C-12.5 -6.4 -6.8 -0.8 -5.3 -0.5C-3.8 -0.2 -1.1 -3.9 -2.0 -4.9ZM4.7 2.4C5.8 3.1 11.8 1.8 13.5 2.4C15.2 2.9 19.2 7.5 19.2 7.2C19.2 7.0 15.1 1.7 13.4 0.5C11.6 -0.7 5.4 -3.3 4.4 -3.0C3.3 -2.8 3.7 1.8 4.7 2.4Z\"/><path class=\"a2-msoma\" d=\"M-0.7 -5.3C1.0 -5.6 3.9 -5.3 5.1 -4.3C6.2 -3.3 6.4 -1.0 6.2 0.6C6.0 2.2 5.4 4.2 3.9 5.2C2.4 6.1 -0.8 6.8 -2.6 6.3C-4.4 5.8 -6.5 3.6 -7.0 2.0C-7.5 0.5 -6.5 -1.7 -5.5 -2.9C-4.5 -4.1 -2.5 -5.1 -0.7 -5.3Z\"/><path class=\"a2-mnuc\" d=\"M-3.1 0.1a2.73 2.73 0 1 0 5.46 0a2.73 2.73 0 1 0 -5.46 0\"/><path class=\"a2-rec\" d=\"M-4.2 5.8a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0M-8.5 0.6a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0M-5.4 -5.2a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0M2.0 -5.8a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0M6.3 -0.6a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0M3.2 5.2a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0\"/></g><g class=\"a2-mn\" transform=\"translate(170 246)\"><path class=\"a2-mden\" d=\"M5.3 -0.5C6.6 -0.6 11.3 -5.2 13.2 -5.7C15.1 -6.2 21.5 -4.7 21.3 -4.9C21.2 -5.1 14.3 -7.2 12.1 -7.2C9.8 -7.2 2.8 -5.7 2.0 -4.9C1.2 -4.1 4.0 -0.4 5.3 -0.5ZM-0.4 5.3C0.0 6.4 5.7 11.0 7.7 12.0C9.8 13.1 17.1 14.2 17.3 14.1C17.5 14.0 10.9 12.5 9.4 11.2C7.9 9.8 5.6 3.5 4.5 2.8C3.4 2.1 -0.7 4.2 -0.4 5.3ZM-4.6 -2.7C-5.7 -3.2 -12.0 -1.5 -13.9 -1.5C-15.8 -1.5 -21.1 -2.9 -21.1 -2.6C-21.1 -2.4 -15.8 -0.2 -13.9 0.4C-11.9 1.0 -5.6 3.2 -4.5 2.8C-3.4 2.4 -3.5 -2.2 -4.6 -2.7Z\"/><path class=\"a2-msoma\" d=\"M6.9 2.6C6.3 3.9 3.5 5.1 1.7 5.4C-0.1 5.7 -2.5 5.4 -4.1 4.6C-5.6 3.7 -7.5 1.8 -7.6 0.2C-7.8 -1.4 -6.4 -4.0 -5.0 -4.9C-3.5 -5.8 -0.5 -5.5 1.2 -5.1C2.9 -4.7 4.5 -3.7 5.5 -2.4C6.4 -1.1 7.5 1.3 6.9 2.6Z\"/><path class=\"a2-mnuc\" d=\"M-2.3 0.2a2.73 2.73 0 1 0 5.46 0a2.73 2.73 0 1 0 -5.46 0\"/><path class=\"a2-rec\" d=\"M-8.4 0.9a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0M-5.7 -5.0a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0M1.7 -5.9a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0M6.2 -0.9a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0M3.5 5.0a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0M-3.9 5.9a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0\"/></g><g class=\"a2-mn\" transform=\"translate(192 248)\"><path class=\"a2-mden\" d=\"M-5.3 0.2C-6.5 0.8 -11.2 7.4 -12.3 9.8C-13.4 12.2 -14.5 20.5 -14.4 20.7C-14.2 20.9 -12.7 13.3 -11.2 11.4C-9.8 9.6 -3.0 6.1 -2.3 4.8C-1.6 3.5 -4.1 -0.4 -5.3 0.2ZM2.3 -4.8C2.9 -6.1 1.1 -13.3 1.3 -15.5C1.5 -17.7 4.6 -24.0 4.4 -24.0C4.2 -23.9 0.3 -17.6 -0.6 -15.3C-1.5 -13.1 -3.4 -5.5 -3.1 -4.3C-2.8 -3.1 1.8 -3.5 2.3 -4.8ZM2.3 4.8C3.1 6.0 10.2 9.2 11.9 10.9C13.7 12.5 17.1 19.0 17.2 18.8C17.3 18.7 14.4 11.4 13.0 9.3C11.6 7.1 6.5 0.7 5.3 0.2C4.1 -0.3 1.5 3.5 2.3 4.8Z\"/><path class=\"a2-msoma\" d=\"M-5.3 3.2C-6.2 1.9 -6.5 0.0 -6.1 -1.4C-5.7 -2.9 -4.4 -5.2 -2.9 -5.7C-1.4 -6.2 1.4 -5.4 3.0 -4.6C4.6 -3.8 6.4 -2.3 6.7 -1.0C6.9 0.3 5.8 2.2 4.6 3.4C3.4 4.6 1.3 6.5 -0.4 6.5C-2.0 6.4 -4.3 4.5 -5.3 3.2Z\"/><path class=\"a2-mnuc\" d=\"M-3.3 -0.1a2.73 2.73 0 1 0 5.46 0a2.73 2.73 0 1 0 -5.46 0\"/><path class=\"a2-rec\" d=\"M-5.9 -4.8a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0M1.3 -6.0a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0M6.2 -1.2a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0M3.7 4.8a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0M-3.5 6.0a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0M-8.4 1.2a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0\"/></g><g class=\"a2-mn\" transform=\"translate(212 242)\"><path class=\"a2-mden\" d=\"M4.4 2.9C5.7 3.1 13.3 0.4 15.4 -1.1C17.6 -2.5 22.9 -9.0 22.9 -9.3C22.9 -9.5 17.7 -3.8 15.5 -3.0C13.4 -2.2 6.0 -3.2 4.7 -2.5C3.4 -1.9 3.2 2.7 4.4 2.9ZM-3.6 3.9C-4.5 5.1 -5.0 13.1 -5.9 15.3C-6.9 17.6 -12.0 23.3 -11.8 23.4C-11.5 23.4 -5.6 17.9 -4.1 15.7C-2.5 13.6 1.7 6.4 1.7 5.0C1.8 3.6 -2.7 2.7 -3.6 3.9ZM-1.0 -5.2C-1.6 -6.3 -7.8 -9.9 -9.8 -11.1C-11.7 -12.2 -17.5 -15.0 -17.7 -14.8C-17.9 -14.7 -12.7 -11.3 -11.2 -9.8C-9.7 -8.2 -6.3 -2.1 -5.1 -1.6C-3.9 -1.0 -0.5 -4.1 -1.0 -5.2Z\"/><path class=\"a2-msoma\" d=\"M-0.7 -6.1C1.1 -6.4 4.5 -5.8 5.7 -4.6C7.0 -3.5 7.3 -0.8 6.9 0.7C6.4 2.3 4.8 3.7 3.2 4.4C1.7 5.2 -0.6 5.7 -2.4 5.3C-4.1 4.9 -6.9 3.4 -7.4 2.1C-7.9 0.7 -6.4 -1.5 -5.3 -2.9C-4.2 -4.3 -2.5 -5.8 -0.7 -6.1Z\"/><path class=\"a2-mnuc\" d=\"M-2.3 -0.3a2.73 2.73 0 1 0 5.46 0a2.73 2.73 0 1 0 -5.46 0\"/><path class=\"a2-rec\" d=\"M1.0 -6.1a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0M6.1 -1.5a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0M4.0 4.6a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0M-3.2 6.1a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0M-8.3 1.5a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0M-6.2 -4.6a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0\"/></g>\n<g class=\"a2-kndy\" data-k=\"0\" transform=\"translate(262 402)\"><circle class=\"a2-kglow\" r=\"20\" fill=\"url(#a2-kglow)\" opacity=\"0\"/><path class=\"a2-den\" d=\"M4.7 3.9C5.7 4.3 12.7 2.3 14.7 1.3C16.7 0.3 21.7 -4.1 21.7 -4.4C21.8 -4.6 16.9 -1.1 15.0 -0.9C13.1 -0.6 6.9 -2.9 5.7 -2.3C4.5 -1.7 3.7 3.5 4.7 3.9ZM-6.1 0.6C-7.8 1.0 -14.5 7.8 -17.1 9.1C-19.8 10.4 -28.8 11.7 -28.6 11.9C-28.4 12.1 -18.9 11.6 -15.8 10.8C-12.7 10.1 -3.4 6.9 -2.3 5.7C-1.2 4.5 -4.4 0.2 -6.1 0.6ZM1.0 -6.0C0.5 -7.6 -6.2 -15.0 -8.8 -16.9C-11.4 -18.8 -21.3 -22.2 -21.6 -22.1C-21.8 -22.0 -12.8 -18.2 -10.9 -16.1C-8.9 -13.9 -6.3 -4.9 -4.9 -3.7C-3.5 -2.5 1.4 -4.5 1.0 -6.0Z\"/><path class=\"a2-soma\" d=\"M9.3 0.0C9.3 1.7 6.8 3.9 4.9 5.1C3.0 6.3 0.2 7.5 -2.0 7.2C-4.2 6.9 -7.2 5.1 -8.3 3.3C-9.3 1.6 -9.6 -1.9 -8.4 -3.4C-7.3 -5.0 -3.9 -5.7 -1.6 -6.0C0.6 -6.3 3.0 -6.1 4.8 -5.1C6.7 -4.1 9.3 -1.7 9.3 0.0Z\"/><path class=\"a2-nuc\" d=\"M-3.0 0.6a3.15 3.15 0 1 0 6.3 0a3.15 3.15 0 1 0 -6.3 0\"/><path class=\"a2-nucleolus\" d=\"M-0.3 -0.4a0.8999999999999999 0.8999999999999999 0 1 0 1.7999999999999998 0a0.8999999999999999 0.8999999999999999 0 1 0 -1.7999999999999998 0\"/></g><g class=\"a2-kndy\" data-k=\"1\" transform=\"translate(282 390)\"><circle class=\"a2-kglow\" r=\"20\" fill=\"url(#a2-kglow)\" opacity=\"0\"/><path class=\"a2-den\" d=\"M-6.1 0.5C-7.8 0.8 -14.6 7.2 -17.3 8.3C-19.9 9.3 -29.1 9.3 -28.9 9.5C-28.8 9.7 -19.1 10.5 -16.0 10.1C-12.9 9.6 -3.5 6.7 -2.4 5.6C-1.2 4.5 -4.4 0.2 -6.1 0.5ZM2.6 -5.5C3.0 -6.7 0.4 -13.0 -0.0 -14.9C-0.4 -16.8 -0.4 -22.2 -0.7 -22.2C-1.0 -22.1 -1.9 -16.7 -2.2 -14.7C-2.6 -12.7 -4.2 -6.0 -3.7 -4.9C-3.1 -3.8 2.2 -4.4 2.6 -5.5ZM4.7 3.9C6.0 4.4 14.4 2.5 16.9 1.6C19.4 0.6 26.2 -4.2 26.3 -4.4C26.3 -4.7 19.6 -0.9 17.2 -0.6C14.8 -0.4 7.1 -2.8 5.7 -2.3C4.2 -1.8 3.4 3.5 4.7 3.9Z\"/><path class=\"a2-soma\" d=\"M2.0 6.0C-0.1 6.4 -2.7 6.0 -4.3 5.0C-6.0 4.1 -7.9 1.9 -8.0 0.3C-8.2 -1.3 -6.6 -3.7 -5.0 -4.8C-3.5 -5.9 -0.6 -6.4 1.3 -6.1C3.2 -5.8 5.5 -4.5 6.6 -3.0C7.7 -1.5 8.8 1.4 8.0 2.8C7.2 4.3 4.0 5.6 2.0 6.0Z\"/><path class=\"a2-nuc\" d=\"M-3.3 -0.2a3.15 3.15 0 1 0 6.3 0a3.15 3.15 0 1 0 -6.3 0\"/><path class=\"a2-nucleolus\" d=\"M-0.3 -0.4a0.8999999999999999 0.8999999999999999 0 1 0 1.7999999999999998 0a0.8999999999999999 0.8999999999999999 0 1 0 -1.7999999999999998 0\"/></g><g class=\"a2-kndy\" data-k=\"2\" transform=\"translate(302 400)\"><circle class=\"a2-kglow\" r=\"20\" fill=\"url(#a2-kglow)\" opacity=\"0\"/><path class=\"a2-den\" d=\"M2.7 -5.5C3.3 -7.2 1.2 -16.5 1.5 -19.4C1.8 -22.3 5.6 -30.7 5.3 -30.7C5.1 -30.7 0.3 -22.2 -0.7 -19.2C-1.8 -16.2 -4.0 -6.6 -3.6 -5.0C-3.2 -3.4 2.1 -3.8 2.7 -5.5ZM4.4 4.3C5.8 5.4 15.1 6.3 17.7 7.5C20.3 8.8 26.6 15.3 26.6 15.0C26.7 14.8 20.6 7.3 18.2 5.4C15.7 3.4 7.4 -1.7 5.8 -1.9C4.2 -2.0 3.0 3.2 4.4 4.3ZM-6.0 1.0C-7.5 1.3 -12.5 7.3 -14.6 8.3C-16.6 9.4 -23.8 10.0 -23.7 10.2C-23.5 10.4 -15.7 10.5 -13.2 10.0C-10.6 9.5 -2.8 6.8 -2.0 5.8C-1.1 4.7 -4.6 0.7 -6.0 1.0Z\"/><path class=\"a2-soma\" d=\"M-6.3 3.2C-7.6 1.4 -9.4 -1.2 -8.7 -2.7C-8.0 -4.2 -4.5 -5.1 -2.2 -5.7C0.1 -6.3 3.3 -7.2 5.0 -6.4C6.8 -5.6 8.1 -2.6 8.2 -0.6C8.4 1.3 7.5 3.8 5.9 5.2C4.4 6.6 0.8 8.0 -1.2 7.7C-3.3 7.4 -5.1 4.9 -6.3 3.2Z\"/><path class=\"a2-nuc\" d=\"M-3.1 -0.1a3.15 3.15 0 1 0 6.3 0a3.15 3.15 0 1 0 -6.3 0\"/><path class=\"a2-nucleolus\" d=\"M-0.3 -0.4a0.8999999999999999 0.8999999999999999 0 1 0 1.7999999999999998 0a0.8999999999999999 0.8999999999999999 0 1 0 -1.7999999999999998 0\"/></g><g class=\"a2-kndy\" data-k=\"3\" transform=\"translate(322 388)\"><circle class=\"a2-kglow\" r=\"20\" fill=\"url(#a2-kglow)\" opacity=\"0\"/><path class=\"a2-den\" d=\"M3.2 5.2C4.1 6.6 11.8 9.7 13.3 11.6C14.9 13.6 16.3 22.2 16.4 21.9C16.6 21.7 15.5 12.3 14.3 9.7C13.1 7.1 7.4 0.1 6.1 -0.4C4.8 -0.9 2.4 3.8 3.2 5.2ZM-5.6 -2.6C-6.8 -3.2 -13.5 -1.1 -15.5 -1.4C-17.5 -1.6 -22.8 -5.0 -22.8 -4.8C-22.8 -4.5 -17.4 -0.2 -15.3 0.8C-13.2 1.8 -6.0 4.1 -4.9 3.7C-3.8 3.3 -4.3 -2.0 -5.6 -2.6ZM4.5 -4.2C5.4 -5.2 5.5 -12.4 5.9 -14.5C6.4 -16.5 9.0 -21.9 8.7 -21.9C8.5 -22.0 5.0 -16.9 3.8 -15.1C2.6 -13.2 -1.6 -7.2 -1.6 -5.9C-1.5 -4.6 3.6 -3.2 4.5 -4.2Z\"/><path class=\"a2-soma\" d=\"M-6.0 -4.8C-4.6 -6.0 -1.4 -6.9 0.7 -6.7C2.7 -6.5 5.3 -5.0 6.4 -3.6C7.5 -2.1 8.0 0.3 7.4 2.0C6.9 3.7 4.9 6.1 3.0 6.7C1.2 7.2 -1.8 6.1 -3.6 5.2C-5.5 4.2 -7.6 2.6 -8.0 0.9C-8.4 -0.7 -7.5 -3.5 -6.0 -4.8Z\"/><path class=\"a2-nuc\" d=\"M-2.6 0.3a3.15 3.15 0 1 0 6.3 0a3.15 3.15 0 1 0 -6.3 0\"/><path class=\"a2-nucleolus\" d=\"M-0.3 -0.4a0.8999999999999999 0.8999999999999999 0 1 0 1.7999999999999998 0a0.8999999999999999 0.8999999999999999 0 1 0 -1.7999999999999998 0\"/></g><g class=\"a2-kndy\" data-k=\"4\" transform=\"translate(342 402)\"><circle class=\"a2-kglow\" r=\"20\" fill=\"url(#a2-kglow)\" opacity=\"0\"/><path class=\"a2-den\" d=\"M-6.1 -0.1C-7.5 0.4 -13.2 7.2 -14.7 9.6C-16.2 11.9 -19.2 19.9 -19.0 20.2C-18.9 20.4 -15.5 13.2 -13.6 11.5C-11.7 9.7 -3.8 6.7 -3.0 5.4C-2.1 4.0 -4.8 -0.6 -6.1 -0.1ZM4.9 -3.6C5.8 -4.9 6.6 -13.9 6.7 -16.7C6.8 -19.6 6.1 -28.0 5.8 -28.1C5.6 -28.2 5.4 -20.2 4.7 -17.6C3.9 -15.0 -0.9 -7.7 -0.9 -6.1C-0.9 -4.4 4.0 -2.4 4.9 -3.6ZM1.0 6.0C1.3 7.5 7.5 12.6 8.8 14.6C10.1 16.6 11.6 23.7 11.8 23.5C12.0 23.3 11.2 15.7 10.5 13.2C9.8 10.7 6.9 2.8 5.8 2.0C4.7 1.1 0.6 4.6 1.0 6.0Z\"/><path class=\"a2-soma\" d=\"M3.6 -5.6C5.4 -4.7 7.2 -2.9 7.7 -1.2C8.2 0.5 7.8 3.4 6.5 4.7C5.2 6.0 2.0 6.4 -0.3 6.4C-2.5 6.3 -5.6 5.7 -7.0 4.3C-8.4 2.9 -9.4 -0.1 -8.8 -2.0C-8.3 -3.8 -5.6 -6.2 -3.5 -6.8C-1.5 -7.4 1.7 -6.6 3.6 -5.6Z\"/><path class=\"a2-nuc\" d=\"M-3.4 0.2a3.15 3.15 0 1 0 6.3 0a3.15 3.15 0 1 0 -6.3 0\"/><path class=\"a2-nucleolus\" d=\"M-0.3 -0.4a0.8999999999999999 0.8999999999999999 0 1 0 1.7999999999999998 0a0.8999999999999999 0.8999999999999999 0 1 0 -1.7999999999999998 0\"/></g><g class=\"a2-kndy\" data-k=\"5\" transform=\"translate(276 416)\"><circle class=\"a2-kglow\" r=\"20\" fill=\"url(#a2-kglow)\" opacity=\"0\"/><path class=\"a2-den\" d=\"M4.6 -4.0C5.3 -5.4 5.1 -14.7 4.7 -17.6C4.2 -20.6 0.9 -29.1 0.6 -29.1C0.4 -29.2 2.8 -21.0 2.6 -18.3C2.3 -15.6 -1.6 -7.6 -1.4 -6.0C-1.1 -4.3 3.9 -2.7 4.6 -4.0ZM0.0 6.1C0.4 7.7 7.1 14.2 9.0 16.3C11.0 18.5 16.5 24.7 16.8 24.6C17.0 24.4 12.2 17.7 10.9 15.2C9.6 12.6 6.7 3.9 5.4 2.9C4.1 1.8 -0.4 4.6 0.0 6.1ZM-5.2 -3.3C-6.7 -3.7 -15.6 -1.1 -18.4 -0.1C-21.1 1.0 -28.8 5.1 -28.8 5.3C-28.9 5.6 -21.2 2.4 -18.4 2.1C-15.7 1.9 -6.9 3.6 -5.3 3.0C-3.8 2.4 -3.6 -2.9 -5.2 -3.3Z\"/><path class=\"a2-soma\" d=\"M8.4 1.5C8.1 3.3 5.7 5.7 3.7 6.4C1.8 7.1 -1.3 6.5 -3.2 5.7C-5.1 4.9 -7.0 3.1 -7.5 1.5C-8.1 -0.2 -7.6 -2.8 -6.4 -4.2C-5.1 -5.6 -2.1 -6.8 -0.1 -6.8C2.0 -6.7 4.3 -5.3 5.7 -3.9C7.1 -2.5 8.7 -0.2 8.4 1.5Z\"/><path class=\"a2-nuc\" d=\"M-2.7 0.3a3.15 3.15 0 1 0 6.3 0a3.15 3.15 0 1 0 -6.3 0\"/><path class=\"a2-nucleolus\" d=\"M-0.3 -0.4a0.8999999999999999 0.8999999999999999 0 1 0 1.7999999999999998 0a0.8999999999999999 0.8999999999999999 0 1 0 -1.7999999999999998 0\"/></g><g class=\"a2-kndy\" data-k=\"6\" transform=\"translate(314 416)\"><circle class=\"a2-kglow\" r=\"20\" fill=\"url(#a2-kglow)\" opacity=\"0\"/><path class=\"a2-den\" d=\"M0.5 6.1C1.1 7.4 8.4 12.4 10.8 13.7C13.2 15.1 21.1 17.7 21.3 17.5C21.5 17.4 14.4 14.2 12.6 12.4C10.8 10.7 7.0 3.1 5.6 2.4C4.2 1.7 -0.1 4.8 0.5 6.1ZM-5.3 -3.1C-6.7 -3.4 -14.7 -0.4 -17.1 0.8C-19.6 2.1 -26.0 7.0 -26.0 7.3C-26.0 7.5 -19.5 3.5 -17.1 3.1C-14.7 2.6 -6.6 3.9 -5.2 3.2C-3.8 2.5 -3.9 -2.8 -5.3 -3.1ZM5.4 -3.0C6.7 -4.0 9.9 -12.6 11.6 -14.9C13.3 -17.2 20.1 -22.4 19.9 -22.5C19.6 -22.7 12.0 -17.9 9.7 -16.0C7.4 -14.1 0.4 -7.6 -0.1 -6.1C-0.6 -4.6 4.0 -1.9 5.4 -3.0Z\"/><path class=\"a2-soma\" d=\"M0.5 7.2C-1.8 7.2 -4.5 5.6 -5.7 4.3C-7.0 2.9 -7.4 0.6 -7.1 -1.0C-6.7 -2.6 -5.2 -4.6 -3.5 -5.4C-1.9 -6.1 1.0 -6.1 2.7 -5.5C4.5 -4.9 6.3 -3.4 7.1 -1.7C7.9 -0.0 8.7 3.0 7.6 4.5C6.5 6.0 2.7 7.2 0.5 7.2Z\"/><path class=\"a2-nuc\" d=\"M-3.0 -0.3a3.15 3.15 0 1 0 6.3 0a3.15 3.15 0 1 0 -6.3 0\"/><path class=\"a2-nucleolus\" d=\"M-0.3 -0.4a0.8999999999999999 0.8999999999999999 0 1 0 1.7999999999999998 0a0.8999999999999999 0.8999999999999999 0 1 0 -1.7999999999999998 0\"/></g><g class=\"a2-kndy\" data-k=\"7\" transform=\"translate(298 380)\"><circle class=\"a2-kglow\" r=\"20\" fill=\"url(#a2-kglow)\" opacity=\"0\"/><path class=\"a2-den\" d=\"M-4.1 -4.6C-5.0 -5.6 -11.8 -6.2 -13.5 -7.2C-15.2 -8.2 -18.7 -13.1 -18.7 -12.8C-18.8 -12.6 -15.6 -6.8 -14.1 -5.1C-12.6 -3.4 -7.1 1.4 -5.9 1.5C-4.8 1.5 -3.2 -3.5 -4.1 -4.6ZM5.4 -2.8C6.4 -4.1 8.4 -14.1 8.2 -17.3C8.1 -20.6 4.6 -30.8 4.4 -30.9C4.1 -31.0 6.9 -21.4 6.4 -18.5C5.9 -15.6 0.2 -8.0 0.1 -6.1C-0.0 -4.3 4.5 -1.5 5.4 -2.8ZM0.0 6.1C0.5 7.3 7.0 12.0 9.3 13.0C11.6 14.1 19.3 15.4 19.5 15.2C19.7 15.1 12.8 13.3 11.2 11.9C9.5 10.5 6.7 3.6 5.4 2.9C4.1 2.2 -0.4 4.9 0.0 6.1Z\"/><path class=\"a2-soma\" d=\"M-7.2 2.0C-8.0 0.2 -8.8 -2.8 -7.7 -4.2C-6.7 -5.5 -3.0 -5.8 -0.7 -6.0C1.6 -6.1 4.8 -6.2 6.2 -5.1C7.7 -3.9 8.3 -0.9 8.0 0.8C7.6 2.6 5.8 4.4 4.0 5.4C2.2 6.4 -1.1 7.3 -2.9 6.8C-4.8 6.2 -6.4 3.8 -7.2 2.0Z\"/><path class=\"a2-nuc\" d=\"M-3.4 -0.3a3.15 3.15 0 1 0 6.3 0a3.15 3.15 0 1 0 -6.3 0\"/><path class=\"a2-nucleolus\" d=\"M-0.3 -0.4a0.8999999999999999 0.8999999999999999 0 1 0 1.7999999999999998 0a0.8999999999999999 0.8999999999999999 0 1 0 -1.7999999999999998 0\"/></g>\n<path data-part=\"estro\" class=\"a2-estro\"/>\n<path data-part=\"nkb\" class=\"a2-nkb\"/>\n</g></g>\n<g class=\"a2-loc\" aria-hidden=\"true\" transform=\"translate(472 510) scale(0.72) translate(-16 -478)\"><rect class=\"a2-loc-bg\" x=\"16\" y=\"478\" width=\"150\" height=\"108\" rx=\"10\"/><path class=\"a2-loc-brain\" d=\"M30.0 548.0C27.0 539.7 30.7 521.0 36.0 512.0C41.3 503.0 51.3 497.7 62.0 494.0C72.7 490.3 88.0 489.0 100.0 490.0C112.0 491.0 125.7 494.7 134.0 500.0C142.3 505.3 147.7 514.3 150.0 522.0C152.3 529.7 151.0 540.3 148.0 546.0C145.0 551.7 138.0 555.0 132.0 556.0C126.0 557.0 118.0 552.0 112.0 552.0C106.0 552.0 101.7 554.7 96.0 556.0C90.3 557.3 85.0 559.0 78.0 560.0C71.0 561.0 62.0 564.0 54.0 562.0C46.0 560.0 33.0 556.3 30.0 548.0Z\"/><path class=\"a2-loc-brain\" d=\"M126.0 556.0C130.0 553.0 141.7 550.3 146.0 552.0C150.3 553.7 153.3 562.0 152.0 566.0C150.7 570.0 143.0 575.3 138.0 576.0C133.0 576.7 124.0 573.3 122.0 570.0C120.0 566.7 122.0 559.0 126.0 556.0Z\"/><path class=\"a2-loc-brain\" d=\"M106.0 554.0C107.0 549.0 114.0 551.0 116.0 556.0C118.0 561.0 119.0 579.0 118.0 584.0C117.0 589.0 112.0 591.0 110.0 586.0C108.0 581.0 105.0 559.0 106.0 554.0Z\"/><rect class=\"a2-loc-mark\" x=\"76\" y=\"536\" width=\"20\" height=\"16\" rx=\"3\"/></g>\n</svg></div><p class=\"a2-scene\" data-scene>Before menopause: estrogen keeps the KNDy cells small and their signal modest. The heat-loss centre idles, and everyday wanders in body heat pass unnoticed.</p><span class=\"a2-sr\" role=\"status\" aria-live=\"polite\" data-status></span><div class=\"opt-controls\"><div class=\"opt-seg\" role=\"radiogroup\" aria-label=\"Menopause and treatment\" data-control=\"state\"><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"pre\" aria-checked=\"true\" tabindex=\"0\">Before</button><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"post\" aria-checked=\"false\" tabindex=\"-1\">After</button><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"ht\" aria-checked=\"false\" tabindex=\"-1\">Hormone therapy</button><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"nk\" aria-checked=\"false\" tabindex=\"-1\">Non-hormonal</button></div></div><div class=\"opt-foot\"><span class=\"opt-hint\">Before, after, or with a treatment · watch the cells at the base</span><dl class=\"opt-readout\" data-readout aria-hidden=\"true\"><div class=\"opt-stat\" data-stat=\"estro\"><dt>Estrogen</dt><dd data-r=\"estro\">Cycling</dd></div><div class=\"opt-stat\" data-stat=\"size\"><dt>KNDy cell size</dt><dd data-r=\"size\">100%</dd></div><div class=\"opt-stat\" data-stat=\"rate\"><dt>Hot flashes</dt><dd data-r=\"rate\">Rare</dd></div></dl></div></div><figcaption class=\"iso-legend\"><span class=\"iso-keys\"><span class=\"iso-key\"><svg class=\"iso-swatch\" data-mark=\"kndy\" viewBox=\"0 0 16 10\" aria-hidden=\"true\"><path d=\"M1.5 5h13\"/></svg>KNDy cells and neurokinin B</span><span class=\"iso-key\"><svg class=\"iso-swatch\" data-mark=\"mnpo\" viewBox=\"0 0 16 10\" aria-hidden=\"true\"><path d=\"M1.5 5h13\"/></svg>Heat-loss centre (MnPO)</span><span class=\"iso-key\"><svg class=\"iso-swatch\" data-mark=\"estro\" viewBox=\"0 0 16 10\" aria-hidden=\"true\"><path d=\"M1.5 5h13\"/></svg>Estrogen</span></span><span class=\"iso-caption\"><span class=\"a2-par\">Deep in the brain, just above the pituitary, a small cluster of nerve cells called KNDy neurons (for the kisspeptin, neurokinin B and dynorphin they make) also times the pulses of reproductive hormones, and sends neurokinin B to the brain's heat-loss centre, the median preoptic nucleus. Estrogen keeps these cells in check.</span><span class=\"a2-par\">After menopause they are larger (about twice the cross-section in a post-mortem study) and make more neurokinin B. The heat-loss centre then sits near its tipping point, so a tiny everyday rise in body heat sets off a full heat-loss response: flushing, sweating and a faster heart. In a study, neurokinin B given to women caused flushes.</span><span class=\"a2-par\">Treatment can act at either end. Hormone therapy replaces the estrogen that keeps these cells in check. Non-hormonal neurokinin-receptor blockers leave the cells signalling but stop the heat-loss centre receiving it. Neither is for everyone: each needs a safety review and has its own benefits and risks, and not treating is always an option.</span><span class=\"a2-par\"><small>A typical pattern in women who have hot flashes; many women have few or none. How much a treatment helps varies from person to person; the drawing shows the mechanism, not an expected result. Time is compressed: the drawn bursts come seconds apart, while hot flashes come about an hour apart. Firing rates are drawn, not measured. Cell size from post-mortem studies of postmenopausal women.</small></span></span></figcaption></figure>" + "</div>";
    mount(root.querySelector(".opt-figure"));
  }
}
customElements.define("optimal-fig-hypothalamus", Fig);
})();
