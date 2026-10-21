/* optimal-fig-menopause-thermostat: Optimal Health explainer figure. Built with Anatomy (MIT). Generated; do not edit. */
(() => {
if (customElements.get("optimal-fig-menopause-thermostat")) return;
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

return { frameOf, prismOf };})();

// Fig 1 model: the thermoneutral zone and one hot flash.
//
// Pure functions, no DOM. The build imports it for geometry, and the page inlines
// the same source (exports stripped) for every motion and readout, so nothing on
// screen is tuned by eye. Citation keys refer to reference/truth-pack.md §1.
//
// Temperatures are changes from the woman's own resting core temperature, not
// absolute °C: published thresholds differ by protocol and measuring site
// (≈37.2 °C in [Freedman 1999], ≈38.0 °C in [Freedman & Blacker 2002]), so the
// figure only shows what is comparable: the zone's width and the size of the rise.
//
// e is the estrogen state the knob sets: 1 = pre-menopause (zone like that of
// women without hot flashes), 0 = post-menopause in a woman who has hot flashes.

const TRUTH = {
  zonePre: 0.4, //            °C  interthreshold zone, women without hot flashes [Freedman 1999]
  zonePost: 0.0, //           °C  measured in women with hot flashes, "virtually nonexistent" [Freedman 1999]
  zoneFloor: 0.04, //         °C  drawn gap at the post end so the finger fits; shown as 0.0 (one decimal, the precision measured)
  sweatShare: 0.3 / 0.4, //       share of the narrowing from the sweating threshold falling: 37.5 → 37.2 °C [Freedman 1999 via Gombert-Labedens 2025]
  swing: 0.04, //             °C  a small natural rise in core temperature, the classic trigger "~0.03–0.05 °C" [Jones 2019]
  flashMin: 3.4, //           min duration of one flash, 3.4 ± 1.4 [Low 2008]
  hrRise: 10, //              bpm heart-rate rise during a flash, +9 ± 2 / +10 ± 1 [Low 2008]
  skinRise: 2.7, //           °C  finger skin-temperature rise, mean 2.7 ± 0.2 (range 1–7) [Meldrum 1979; Kronenberg 1994]
  skinPeakMin: 1, //          min sharp rise at onset [Molnar 1975]; time to peak taken as about 1 min (assumption)
  skinElevatedMin: 31, //     min finger temperature stays raised about 31 min [Meldrum 1979]
  chill: 0.05, //             °C  after-chill depth: direction sourced [Kronenberg 1984], size ILLUSTRATIVE (not measured)
  chillMin: [2, 6, 14], //    min dip begins, bottoms, recovers: ILLUSTRATIVE timing
  ratePost: 1.1, //           per hour, interval 54 ± 10 min in highly symptomatic women [Meldrum 1979]; lab 0.7–1.3 [Freedman 1998; Low 2008]
  swingRiseMin: 9, //         min the pre-flash rise is measured over 20 min [Jones 2019]; half of it to the peak
};

// What the figure draws: the scale board's range, the column's travel.
const SCALE = { low: -0.15, high: 0.3 };
const RANGE = { low: -0.07, high: 0.06 };

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Zone at estrogen state e, relative to resting core temperature. */
function zoneOf(e) {
  const width = lerp(TRUTH.zoneFloor, TRUTH.zonePre, e);
  // The post zone is centred on rest; widening comes 75 % from the sweat side.
  const sweat = TRUTH.zoneFloor / 2 + (width - TRUTH.zoneFloor) * TRUTH.sweatShare;
  const shiver = sweat - width;
  const shown = lerp(TRUTH.zonePost, TRUTH.zonePre, e); // 0.0 → 0.4, as measured
  return { sweat, shiver, width, shown };
}

/**
 * Flashes per hour at state e. Core temperature wanders by about σ = swing; the
 * rate at which a wandering (Gaussian) signal crosses a level u above its mean
 * falls as exp(−u²/2σ²) (Rice's formula). Anchored to the symptomatic rate.
 */
function rateOf(e) {
  const s = zoneOf(e).sweat;
  const s0 = zoneOf(0).sweat;
  const sigma = TRUTH.swing;
  return TRUTH.ratePost * Math.exp(-(s * s - s0 * s0) / (2 * sigma * sigma));
}

/** The response to one flash, t minutes after onset. Each part 0..1 or in its unit. */
function flashAt(t) {
  if (t < 0) return { on: 0, hr: 0, skin: 0, louvre: 0, chill: 0 };
  const D = TRUTH.flashMin;
  // Vasodilation (louvres) and heart rate: on for the flash, eased in and out.
  const on = smooth(0, 0.35, t) * (1 - smooth(D - 0.5, D + 0.4, t));
  // Finger skin: sharp rise, slow fall, back near baseline by ~31 min.
  const tau = TRUTH.skinElevatedMin / 3;
  const rise = smooth(0, TRUTH.skinPeakMin, t);
  const fall = t > TRUTH.skinPeakMin ? Math.exp(-(t - TRUTH.skinPeakMin) / tau) : 1;
  const skin = TRUTH.skinRise * rise * fall;
  // After-chill: core falls below rest after the heat is let out, then recovers.
  const [c0, c1, c2] = TRUTH.chillMin;
  const chill = -TRUTH.chill * (smooth(c0, c1, t) - smooth(c1, c2, t));
  return { on, hr: TRUTH.hrRise * on, skin, louvre: on, chill };
}

/** A natural swing of core temperature, s minutes into it (0 → peak → 0 over 2·swingRiseMin). */
function swingAt(s) {
  const T = TRUTH.swingRiseMin;
  return TRUTH.swing * (smooth(0, T, s) - smooth(T, 2 * T, s));
}

/** Knob angle (radians, 0 = −y, clockwise from above) for state e. */
const KNOB = { from: -0.75 * Math.PI, span: 1.5 * Math.PI };
const knobAngle = (e) => KNOB.from + (1 - e) * KNOB.span;

/** The two dials: their scales and where the needle points for a value. */
const DIALS = {
  skin: { unit: "°C", from: -0.75 * Math.PI, span: 1.5 * Math.PI, max: 6, count: 12, every: 2, base: 0 },
  hr: { unit: "bpm", from: -0.75 * Math.PI, span: 1.5 * Math.PI, max: 30, count: 12, every: 2, base: 0 },
};
for (const dial of Object.values(DIALS)) dial.angleOf = (v) => dial.from + clamp(v / dial.max, 0, 1) * dial.span;

// Fig 1 live code. The page inlines the kit, lathe (as G), model.mjs and this file,
// then calls mount(figure). Every value drawn or printed comes from the model.
const DATA = {"P":{"origin":[317.55506440575994,424.28116705938544],"scale":1.629023105445604,"azimuth":55,"elevation":30},"KZ":300,"zone0":{"sweat":167,"shiver":47.00000000000001},"rod0":59,"ZREF":80,"screw":[-44,2.6],"screwMid":80,"screwZ":[14,184],"knob":{"x":-44,"y":6,"r":8,"top":203.2},"dials":{"skin":[50,24],"hr":[88,24]},"dialR":10,"dialZ":17,"slats":[22,35,48,61,74,87,100],"slatOpen":60,"slat":{"x":29,"y":-8,"len":80,"poly":[[-7.7,-0.7],[7.7,-0.7],[7.7,0.7],[-7.7,0.7]]},"bar":{"x":119.39999999999999,"crank":5,"pivotY":-8}};

function mount(fig) {
  const P = DATA.P;
  const stage = fig.querySelector(".iso-stage");
  const svg = stage.querySelector("svg");
  const q = (sel) => svg.querySelector(sel);
  const movers = (piece) => [...svg.querySelectorAll(`[data-move="${piece}"]`)];
  const rodItems = movers("rod");
  const jawU = movers("jawU");
  const jawL = movers("jawL");
  const thread = q('[data-part="thread"]');
  const pointer = q('[data-part="pointer"]');
  const needles = { skin: q('[data-part="needle-skin"]'), hr: q('[data-part="needle-hr"]') };
  const slats = [...svg.querySelectorAll("[data-slat]")];
  const bar = q('[data-part="bar"]');
  const crankpins = q('[data-part="crankpins"]');
  const wash = q('[data-part="wash"]');
  const lamps = { warm: q('[data-lamp="warm"]'), cool: q('[data-lamp="cool"]') };
  const out = Object.fromEntries([...fig.querySelectorAll("[data-r]")].map((node) => [node.dataset.r, node]));
  const status = fig.querySelector("[data-status]");
  const buttons = [...fig.querySelectorAll('[data-control="stage"] .opt-seg-btn')];
  const still = matchMedia("(prefers-reduced-motion: reduce)");

  const zOf = (t) => DATA.ZREF + t * DATA.KZ;
  const SPEED = 1; // model minutes per real second
  const QUIET = 4; // minutes between the end of one event and the next rise (the cut quiet time)
  const CHILL_END = TRUTH.chillMin[2];

  // ---------------------------------------------------------------- drawing helpers (same maths as the build)
  const screwRings = (offset, from, to, dir) => {
    const [x, y] = DATA.screw;
    const pitch = 3;
    const rings = [];
    const start = (((offset % pitch) + pitch) % pitch);
    if (dir > 0) for (let z = from + start; z < to; z += pitch) rings.push(sideArc(x, y, 2.2, z, P, 12));
    else for (let z = to - start; z > from; z -= pitch) rings.push(sideArc(x, y, 2.2, z, P, 12));
    return rings.join("");
  };
  const pointerAt = (angle) => {
    const { x, y, r, top } = DATA.knob;
    return lineOnTop([x - Math.sin(angle) * 2, y + Math.cos(angle) * 2], [x + Math.sin(angle) * (r - 0.25), y - Math.cos(angle) * (r - 0.25)], top, P);
  };
  const needleAt = (name, angle) => {
    const [x, y] = DATA.dials[name];
    const R = DATA.dialR;
    return lineOnTop([x - Math.sin(angle) * 2.6, y + Math.cos(angle) * 2.6], [x + Math.sin(angle) * (R - 3.4), y - Math.cos(angle) * (R - 3.4)], DATA.dialZ + 0.2, P);
  };
  const slatSvg = (zc, deg) => {
    const a = (deg * Math.PI) / 180;
    const F = G.frameOf([DATA.slat.x, DATA.slat.y, zc], [1, 0, 0], [0, Math.sin(a), Math.cos(a)], [0, -Math.cos(a), Math.sin(a)]);
    return solidSvg(G.prismOf(F, DATA.slat.poly, 0, DATA.slat.len, P), { tone: "mid" });
  };
  const crankTip = (zc, deg) => {
    const a = (deg * Math.PI) / 180;
    return DATA.bar.pivotY - DATA.bar.crank * Math.cos(a);
  };
  const move = (nodes, dz) => {
    const t = translateAlong(P, [0, 0, dz]);
    const [dx, dy] = axisVector(P, [0, 0, dz]);
    for (const node of nodes) {
      if (dz) node.setAttribute("transform", t);
      else node.removeAttribute("transform");
      if (node.querySelector("[data-hold]")) holdStill(node, [dx, dy]);
    }
  };

  // ---------------------------------------------------------------- state (model minutes)
  const knob = { x: 1, v: 0 };
  let eTarget = 1;
  let clock = 0;
  let swingStart = -1e9;
  let flashStart = -1e9;
  let flashFrom = 0;
  let nextSwing = 1;
  let touring = !still.matches;
  let tourClock = 0;
  let fired = new Set();
  let visible = false;
  let frame = 0;
  let last = 0;
  let idleTimer = 0;
  let phase = "";
  const drawn = {};

  // The idle tour: a rise with the zone wide (nothing happens), the knob turns to
  // post-menopause, the same rise trips a flash and the after-chill, the knob turns back.
  const TOUR = { length: 54, events: [[1, "swing"], [19, "post"], [23, "swing"], [46, "pre"]] };

  const coreAt = (t) => {
    const ft = t - flashStart;
    if (ft >= 0 && ft < CHILL_END) return flashFrom * (1 - smooth(0.6, TRUTH.flashMin, ft)) + flashAt(ft).chill;
    return swingAt(t - swingStart);
  };

  function startSwing() {
    const ft = clock - flashStart;
    const swingOn = clock - swingStart < 2 * TRUTH.swingRiseMin;
    if (swingOn || (ft >= 0 && ft < CHILL_END)) return false;
    swingStart = clock;
    return true;
  }

  function step(dt) {
    const calm = still.matches;
    clock += dt * SPEED;
    if (touring) {
      const before = tourClock;
      tourClock += dt * SPEED;
      if (tourClock >= TOUR.length) {
        tourClock -= TOUR.length;
        fired = new Set();
      }
      for (const [at, what] of TOUR.events) {
        if (!fired.has(at) && tourClock >= at && (before < at || before > tourClock)) {
          fired.add(at);
          if (what === "swing") startSwing();
          else setTarget(what === "post" ? 0 : 1, false);
        }
      }
    } else if (!calm && clock >= nextSwing && startSwing()) {
      nextSwing = clock + 2 * TRUTH.swingRiseMin + QUIET;
    }
    settleKnob(dt, calm);
    const zone = zoneOf(knob.x);
    const core = coreAt(clock);
    const ft = clock - flashStart;
    if (!(ft >= 0 && ft < CHILL_END) && core >= zone.sweat - 1e-4) {
      flashStart = clock;
      flashFrom = zone.sweat;
      swingStart = -1e9;
      nextSwing = clock + CHILL_END + QUIET;
    }
  }

  function settleKnob(dt, calm) {
    if (calm) {
      knob.x = eTarget;
      knob.v = 0;
      return;
    }
    const w = 1 / 0.45;
    for (let i = 0; i < 4; i++) {
      const h = dt / 4;
      knob.v += (w * w * (eTarget - knob.x) - 2 * w * knob.v) * h;
      knob.x += knob.v * h;
    }
    if (Math.abs(eTarget - knob.x) < 1e-4 && Math.abs(knob.v) < 1e-4) {
      knob.x = eTarget;
      knob.v = 0;
    }
  }

  // ---------------------------------------------------------------- draw
  function draw() {
    const e = knob.x;
    const zone = zoneOf(e);
    const core = coreAt(clock);
    const shown = clamp(core, zone.shiver, zone.sweat);
    const ft = clock - flashStart;
    const flash = ft >= 0 && ft < 90 ? flashAt(ft) : flashAt(-1);
    const chilled = ft >= 0 && ft < CHILL_END && core <= zone.shiver + 1e-4;

    const set = (key, value, fn) => {
      if (drawn[key] !== value) {
        drawn[key] = value;
        fn(value);
      }
    };
    const zf = zOf(shown);
    set("rod", Math.round(zf * 100) / 100, (z) => move(rodItems, z - DATA.rod0));
    const du = zOf(zone.sweat) - DATA.zone0.sweat;
    const dl = zOf(zone.shiver) - DATA.zone0.shiver;
    set("jawU", Math.round(du * 100) / 100, (v) => move(jawU, v));
    set("jawL", Math.round(dl * 100) / 100, (v) => move(jawL, v));
    set("thread", Math.round(du * 50) / 50, () => {
      const lower = screwRings(dl, DATA.screwZ[0], DATA.screwMid - 1, 1);
      const upper = screwRings(-du, DATA.screwMid + 1, DATA.screwZ[1], -1);
      thread.setAttribute("d", lower + upper);
    });
    set("pointer", Math.round(e * 2000), () => pointer.setAttribute("d", pointerAt(knobAngle(e))));
    const deg = DATA.slatOpen * flash.louvre;
    set("slats", Math.round(deg * 4) / 4, (d) => {
      slats.forEach((node, i) => (node.innerHTML = slatSvg(DATA.slats[i], d)));
      const lift = DATA.bar.crank * Math.sin((d * Math.PI) / 180);
      move([bar], lift);
      crankpins.innerHTML = dotsSvg(DATA.slats.map((zc) => at3([DATA.bar.x, crankTip(zc, d), zc])), { size: 0.8, tone: "hi" });
      wash.style.opacity = String(flash.louvre);
    });
    set("skin", Math.round(flash.skin * 100), () => needles.skin.setAttribute("d", needleAt("skin", DIALS.skin.angleOf(flash.skin))));
    set("hr", Math.round(flash.hr * 10), () => needles.hr.setAttribute("d", needleAt("hr", DIALS.hr.angleOf(flash.hr))));
    set("warm", flash.on > 0.25, (on) => (on ? lamps.warm.setAttribute("data-on", "") : lamps.warm.removeAttribute("data-on")));
    set("cool", chilled, (on) => (on ? lamps.cool.setAttribute("data-on", "") : lamps.cool.removeAttribute("data-on")));

    const sign = (v, digits) => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(digits);
    const rate = rateOf(e);
    // The after-chill's size isn't measured, so the readout names it instead of printing a depth.
    const dipping = ft >= 0 && ft < CHILL_END && core < -0.005;
    set("out.core", dipping ? "dipping" : sign(Math.abs(shown) < 0.005 ? 0 : shown, 2) + " °C", (t) => (out.core.textContent = t));
    set("out.zone", zone.shown.toFixed(1) + " °C", (t) => (out.zone.textContent = t));
    set("out.rate", (rate < 0.05 ? "0" : rate.toFixed(1)) + " / h", (t) => (out.rate.textContent = t));
    set("out.skin", sign(flash.skin, 1) + " °C", (t) => (out.skin.textContent = t));

    const now = flash.on > 0.25 ? "Hot flash: skin vessels open, heart rate up" : chilled ? "After-chill: core dips below the zone" : "";
    if (now !== phase) {
      phase = now;
      if (now && document.activeElement === stage) status.textContent = now;
    }
    stage.setAttribute("data-flash", flash.on > 0.25 ? "on" : "off");
  }
  const at3 = (p) => iso(p, P);

  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    step(dt);
    draw();
    frame = visible ? requestAnimationFrame(tick) : 0;
  }
  const run = () => {
    if (!frame && visible && !still.matches) {
      last = 0;
      frame = requestAnimationFrame(tick);
    }
  };

  // ---------------------------------------------------------------- input
  const describe = () => {
    const e = eTarget;
    const zone = zoneOf(e);
    const rate = rateOf(e);
    const name = e >= 0.999 ? "Pre-menopause" : e <= 0.001 ? "Post-menopause, with hot flashes" : `Estrogen ${Math.round(e * 100)} %`;
    stage.setAttribute("aria-valuenow", String(Math.round(e * 100)));
    stage.setAttribute("aria-valuetext", `${name}: zone ${zone.shown.toFixed(1)} °C, ${rate < 0.05 ? "no hot flashes" : `about ${rate.toFixed(1)} hot flashes an hour`}`);
    buttons.forEach((b) => {
      const on = Number(b.dataset.value) === e;
      b.setAttribute("aria-checked", on ? "true" : "false");
      b.tabIndex = on || (!buttons.some((x) => Number(x.dataset.value) === e) && b === buttons[0]) ? 0 : -1;
    });
  };
  function setTarget(e, byHand = true) {
    eTarget = clamp(e, 0, 1);
    describe();
    if (byHand) takeOver();
    if (still.matches) stillFrame();
    run();
  }
  function takeOver() {
    touring = false;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (still.matches) return;
      touring = true;
      tourClock = 0;
      fired = new Set();
      run();
    }, 3600);
  }
  // Reduced motion: one still frame that still explains the idea. At the post end it
  // shows a flash at its height (finger on the upper jaw, louvres open, dials up).
  function stillFrame() {
    knob.x = eTarget;
    knob.v = 0;
    clock = 1000;
    swingStart = -1e9;
    if (eTarget < 0.5) {
      flashStart = clock - 0.9;
      flashFrom = zoneOf(eTarget).sweat;
    } else flashStart = -1e9;
    draw();
  }

  buttons.forEach((button) =>
    button.addEventListener("click", () => {
      setTarget(Number(button.dataset.value));
      if (!still.matches && Number(button.dataset.value) === 0) nextSwing = Math.min(nextSwing, clock + 1.5);
    }),
  );
  fig.querySelector('[data-control="stage"]')?.addEventListener("keydown", (event) => {
    const index = buttons.indexOf(document.activeElement) >= 0 ? buttons.indexOf(document.activeElement) : buttons.indexOf(fig.ownerDocument?.activeElement);
    let next = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = Math.min(buttons.length - 1, index + 1);
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = Math.max(0, index - 1);
    if (next === null || index < 0) return;
    event.preventDefault();
    buttons[next].focus();
    buttons[next].click();
  });
  stage.addEventListener("keydown", (event) => {
    const stepBy = event.shiftKey ? 0.25 : 0.1;
    let to = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") to = eTarget - stepBy;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") to = eTarget + stepBy;
    if (event.key === "Home") to = 1;
    if (event.key === "End") to = 0;
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      takeOver();
      if (!still.matches) startSwing();
      run();
      return;
    }
    if (to === null) return;
    event.preventDefault();
    if (touring) eTarget = knob.x;
    setTarget(Math.round(clamp(to, 0, 1) * 100) / 100);
  });
  let drag = null;
  stage.addEventListener("pointerdown", (event) => {
    drag = { x: event.clientX, e: eTarget, id: event.pointerId, live: false };
  });
  stage.addEventListener("pointermove", (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    if (!drag.live && Math.abs(dx) > 6) {
      drag.live = true;
      try {
        stage.setPointerCapture(event.pointerId);
      } catch {}
    }
    if (drag.live) setTarget(clamp(drag.e - dx / (stage.clientWidth * 0.55), 0, 1));
  });
  const endDrag = (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    if (!drag.live) {
      takeOver();
      if (!still.matches) startSwing();
      run();
    }
    drag = null;
  };
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", () => (drag = null));
  stage.addEventListener("focus", () => (status.textContent = stage.getAttribute("aria-valuetext")));
  still.addEventListener?.("change", () => {
    touring = !still.matches;
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

  describe();
  if (still.matches) {
    setTarget(0, false);
    stillFrame();
  } else draw();
}

class Fig extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    const root = this.attachShadow({ mode: "open" });
    const theme = this.getAttribute("theme") === "dark" ? "dark" : "light";
    root.innerHTML = "<style>" + "\n.iso{\n  --anatomy-page:#0b0b0b;--anatomy-card:#131313;--anatomy-text:#a3a3a3;--anatomy-strong:#e6e6e6;--anatomy-muted:#6e6e6e;\n  --anatomy-paper:#131313;--anatomy-face:#1b1b1b;--anatomy-top:#1c1c1c;\n  --anatomy-shade-0:#0f0f0f;--anatomy-shade-1:#121212;--anatomy-shade-2:#151515;--anatomy-shade-3:#181818;\n  --anatomy-lit-top:#262626;--anatomy-lit-shade:#1d1d1d;\n  --anatomy-hi:#d4d4d4;--anatomy-mid:#6a6a6a;--anatomy-lo:#3e3e3e;--anatomy-faint:#2a2a2a;--anatomy-lit:#ffffff;\n  --anatomy-halo:#050505;--anatomy-halo-opacity:.9;--anatomy-dot:#e6e6e6;\n  --anatomy-red:#ff6b6b;--anatomy-green:#6be0a0;--anatomy-blue:#6b9bff;\n  --anatomy-weight:.6px;--anatomy-ease:cubic-bezier(.32,.72,0,1);\n  --anatomy-mono:ui-monospace,\"SF Mono\",Menlo,Consolas,monospace;\n  --anatomy-lift:inset 0 1px 0 0 #ffffff0a,inset 0 0 0 1px #ffffff06,0 0 0 1px #00000026,0 1px 1px -.5px #00000014,0 3px 3px -1.5px #00000014,0 6px 6px -3px #00000014,0 12px 12px -6px #00000014;\n}\n.iso[data-theme=\"light\"]{\n  --anatomy-page:#f2f2ef;--anatomy-card:#fbfbfa;--anatomy-text:#57575a;--anatomy-strong:#18181a;--anatomy-muted:#8c8c90;\n  --anatomy-paper:#fbfbfa;--anatomy-face:#ffffff;--anatomy-top:#ffffff;\n  --anatomy-shade-0:#dcdcd9;--anatomy-shade-1:#e5e5e2;--anatomy-shade-2:#ededea;--anatomy-shade-3:#f4f4f1;\n  --anatomy-lit-top:#ffffff;--anatomy-lit-shade:#eeeeeb;\n  --anatomy-hi:#26262a;--anatomy-mid:#8a8a8f;--anatomy-lo:#b4b4b8;--anatomy-faint:#d4d4d6;--anatomy-lit:#000000;\n  --anatomy-halo:#8a8a80;--anatomy-halo-opacity:.32;--anatomy-dot:#3a3a3e;\n  --anatomy-red:#e5484d;--anatomy-green:#30a46c;--anatomy-blue:#3e63dd;\n  --anatomy-lift:inset 0 1px 0 0 #ffffff,0 0 0 1px #0000000f,0 1px 1px -.5px #0000000a,0 3px 3px -1.5px #0000000a,0 6px 6px -3px #0000000a,0 12px 12px -6px #0000000a;\n}\n.iso-svg{display:block;width:100%;height:auto;overflow:visible}\n.iso-svg path,.iso-svg circle{vector-effect:non-scaling-stroke}\n.iso-fill{fill:var(--anatomy-paper);stroke:none}\n.iso-solid[data-lit]>.iso-fill{fill:var(--anatomy-face)}\n.iso-shade,.iso-top{stroke:none}\n.iso-shade[data-shade=\"0\"]{fill:var(--anatomy-shade-0)}\n.iso-shade[data-shade=\"1\"]{fill:var(--anatomy-shade-1)}\n.iso-shade[data-shade=\"2\"]{fill:var(--anatomy-shade-2)}\n.iso-shade[data-shade=\"3\"]{fill:var(--anatomy-shade-3)}\n.iso-top{fill:var(--anatomy-top)}\n.iso-solid[data-lit]>.iso-top{fill:var(--anatomy-lit-top)}\n.iso-solid[data-lit]>.iso-shade{fill:var(--anatomy-lit-shade)}\n.iso-solid[data-seamless]>.iso-shade,.iso-solid[data-seamless]>.iso-top{stroke-width:.4;stroke-linejoin:round}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"0\"]{stroke:var(--anatomy-shade-0)}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"1\"]{stroke:var(--anatomy-shade-1)}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"2\"]{stroke:var(--anatomy-shade-2)}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"3\"]{stroke:var(--anatomy-shade-3)}\n.iso-solid[data-seamless]>.iso-top{stroke:var(--anatomy-top)}\n.iso-solid[data-seamless][data-lit]>.iso-top{stroke:var(--anatomy-lit-top)}\n.iso-solid[data-seamless][data-lit]>.iso-shade{stroke:var(--anatomy-lit-shade)}\n.iso-solid[data-lit]>.iso-edge{stroke:var(--anatomy-lit)}\n.iso-halo{fill:var(--anatomy-halo);stroke:none;filter:blur(9px);opacity:var(--anatomy-halo-opacity);transform:translateY(3px)}\n.iso-line{fill:none;stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight);stroke-linecap:round;stroke-linejoin:round}\n.iso-line[data-tone=\"hi\"]{stroke:var(--anatomy-hi)}\n.iso-line[data-tone=\"mid\"]{stroke:var(--anatomy-mid)}\n.iso-line[data-tone=\"lo\"]{stroke:var(--anatomy-lo)}\n.iso-line[data-tone=\"faint\"]{stroke:var(--anatomy-faint)}\n.iso-line[data-tone=\"lit\"]{stroke:var(--anatomy-lit)}\n.iso-line[data-tone=\"red\"]{stroke:var(--anatomy-red)}\n.iso-line[data-tone=\"green\"]{stroke:var(--anatomy-green)}\n.iso-line[data-tone=\"blue\"]{stroke:var(--anatomy-blue)}\n.iso-line[data-dotted]{stroke-dasharray:.01 3.5;stroke-width:1}\n.iso-line[data-dashed]{stroke-dasharray:3 3}\n.iso-line[data-flow]{stroke-dasharray:2 6}\n.iso-wire-end{fill:var(--anatomy-paper);stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight)}\n.iso-wire[data-tone=\"hi\"] .iso-wire-end{stroke:var(--anatomy-hi)}\n.iso-wire[data-tone=\"mid\"] .iso-wire-end{stroke:var(--anatomy-mid)}\n.iso-wire[data-tone=\"faint\"] .iso-wire-end{stroke:var(--anatomy-faint)}\n.iso-wire[data-tone=\"lit\"] .iso-wire-end{stroke:var(--anatomy-lit)}\n.iso-dots circle{fill:var(--anatomy-dot);stroke:none;opacity:.32}\n.iso-dots[data-tone=\"hi\"] circle{opacity:.85}\n.iso-dots[data-tone=\"mid\"] circle{opacity:.45}\n.iso-dots[data-tone=\"lo\"] circle{opacity:.22}\n.iso-dots[data-tone=\"faint\"] circle{opacity:.12}\n.iso-face-text{fill:var(--anatomy-mid);font-family:var(--anatomy-mono);letter-spacing:.04em}\n.iso-face-text[data-tone=\"hi\"]{fill:var(--anatomy-hi)}\n.iso-face-text[data-tone=\"lo\"]{fill:var(--anatomy-lo)}\n.iso-face-text[data-tone=\"faint\"]{fill:var(--anatomy-faint)}\n.tb-body{fill:var(--anatomy-shade-2);stroke:none}\n.tb-shine{fill:var(--anatomy-top);stroke:none}\n.tb-shade{fill:var(--anatomy-shade-0);stroke:none}\n.tb-ring{fill:none;stroke:var(--anatomy-lo);stroke-width:.45;stroke-linecap:butt;stroke-linejoin:round}\n.tb-ring[data-tone=\"mid\"]{stroke:var(--anatomy-mid)}\n.tb-ring[data-tone=\"faint\"]{stroke:var(--anatomy-faint)}\n.tb-ring[data-tone=\"hi\"]{stroke:var(--anatomy-hi)}\n@keyframes iso-flow{to{stroke-dashoffset:-32}}\n@keyframes iso-pulse{0%,100%{opacity:.18}12%{opacity:1}40%{opacity:.18}}\n.iso-line[data-flow]{animation:iso-flow 1600ms linear infinite}\n.iso-dots circle[data-pulse]{animation:iso-pulse 1600ms steps(1,end) infinite;animation-delay:var(--pulse-at,0ms)}\n.iso-figure{margin:32px 0 36px}\n.iso-plate{position:relative;padding:52px 24px;border-radius:0;background:var(--anatomy-card);box-shadow:0 0 0 1px var(--anatomy-mid);--anatomy-paper:var(--anatomy-card)}\n.iso-plate-corners{position:absolute;inset:18px 20px;pointer-events:none}\n.iso-plate-corner{position:absolute;color:var(--anatomy-muted);font-family:var(--anatomy-mono);font-size:10.5px;line-height:1;letter-spacing:.04em;white-space:nowrap}\n.iso-plate-corner[data-corner=\"fig\"]{top:0;left:0;color:var(--anatomy-text)}\n.iso-plate-corner[data-corner=\"title\"]{top:0;right:0;text-transform:uppercase;letter-spacing:.1em}\n.iso-plate-corner[data-corner=\"hint\"]{bottom:0;left:0;text-transform:uppercase;letter-spacing:.1em}\n.iso-plate-corner[data-corner=\"readout\"]{right:0;bottom:0;color:var(--anatomy-text);font-variant-numeric:tabular-nums}\n.iso-plate .iso-svg{margin:0 auto}\n.iso-legend{display:grid;gap:8px;margin-top:12px;color:var(--anatomy-muted);font-size:13px;line-height:1.55}\n.iso-keys{display:flex;flex-wrap:wrap;gap:6px 18px}\n.iso-key{display:inline-flex;align-items:center;gap:7px}\n.iso-swatch{width:16px;height:10px;flex:none;overflow:visible}\n.iso-swatch path{fill:none;stroke:var(--anatomy-hi);stroke-width:1;vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round}\n.iso-swatch[data-mark=\"raised\"] path,.iso-swatch[data-mark=\"flat\"] path{stroke:var(--anatomy-mid)}\n.iso-swatch[data-mark=\"lit\"] path{stroke:var(--anatomy-lit)}\n.iso-swatch[data-mark=\"dim\"] path{stroke:var(--anatomy-lo)}\n.iso-swatch[data-mark=\"dotted\"] path{stroke-dasharray:.01 3;stroke-width:1.4}\n.iso-swatch[data-mark=\"dashed\"] path{stroke-dasharray:3 2.5}\n.iso-swatch[data-mark=\"red\"] path{stroke:var(--anatomy-red)}\n.iso-swatch[data-mark=\"green\"] path{stroke:var(--anatomy-green)}\n.iso-swatch[data-mark=\"blue\"] path{stroke:var(--anatomy-blue)}\n.iso-swatch-crease{stroke:var(--anatomy-lo)!important}\n@media (max-width:560px){.iso-plate{padding:48px 12px 70px}.iso-plate-corner[data-corner=\"hint\"]{bottom:18px}}\n@media (prefers-reduced-motion:reduce){.iso-line[data-flow],.iso-dots circle[data-pulse]{animation:none}}\n/*\n * Optimal theme for Anatomy figures.\n *\n * Load AFTER the kit's ISO_CSS. Put `class=\"iso optimal\"` on the wrapper:\n *   - no data-theme  -> \"Forest night\"  (exam-room TV, dark)\n *   - data-theme=\"light\" -> \"Cream\"     (beoptimal.ca, the primary target)\n *\n * Values come from the live site (beoptimal-landing src/index.css), the\n * Performance package design and the ALE visualizer spec. The kit's grey\n * ramps are warmed so solids sit on the site's cream paper, and the single\n * \"lit\" accent is Optimal forest green instead of pure black/white.\n */\n\n.iso.optimal {\n  /* Forest night (dark) */\n  --anatomy-page: #152511;\n  --anatomy-card: #1c3118;\n  --anatomy-text: #c9cdbf;\n  --anatomy-strong: #fffcf7;\n  --anatomy-muted: #8e9884;\n  --anatomy-paper: #1c3118;\n  --anatomy-face: #253821;\n  --anatomy-top: #283c24;\n  --anatomy-shade-0: #172812;\n  --anatomy-shade-1: #1a2c16;\n  --anatomy-shade-2: #1e321a;\n  --anatomy-shade-3: #22371e;\n  --anatomy-lit-top: #34492f;\n  --anatomy-lit-shade: #2a3f26;\n  --anatomy-hi: #e9e6dc;\n  --anatomy-mid: #7e8a74;\n  --anatomy-lo: #4d5c46;\n  --anatomy-faint: #33452e;\n  --anatomy-lit: #fffcf7;\n  --anatomy-halo: #0b1508;\n  --anatomy-halo-opacity: 0.9;\n  --anatomy-dot: #e9e6dc;\n  --anatomy-red: #e0745f;\n  --anatomy-green: #8cc67f;\n  --anatomy-blue: #7fa8d9;\n  --anatomy-mono: \"JetBrains Mono\", ui-monospace, \"SF Mono\", Menlo, Consolas, monospace;\n\n  /* Optimal extras (use sparingly; colour only when colour is the subject) */\n  --opt-display: \"Castoro\", Georgia, serif;\n  --opt-ui: \"Public Sans\", system-ui, sans-serif;\n  --opt-forest: #2c4e25;\n  --opt-forest-light: #519044;\n  --opt-sage: #5e7a59;\n  --opt-borderline: #c97b2d;\n  --opt-out: #b3402f;\n  --opt-heat: #ff9776;\n}\n\n.iso.optimal[data-theme=\"light\"] {\n  /* Cream (light) */\n  --anatomy-page: #fef8f1;\n  --anatomy-card: #fffcf7;\n  --anatomy-text: #3e3d39;\n  --anatomy-strong: #252525;\n  --anatomy-muted: #76736d;\n  --anatomy-paper: #fffcf7;\n  --anatomy-face: #fffefb;\n  --anatomy-top: #fffefb;\n  --anatomy-shade-0: #ddd7cc;\n  --anatomy-shade-1: #e7e2d9;\n  --anatomy-shade-2: #f0ede5;\n  --anatomy-shade-3: #f6f3ec;\n  --anatomy-lit-top: #fffefb;\n  --anatomy-lit-shade: #efebe2;\n  --anatomy-hi: #252525;\n  --anatomy-mid: #8a867e;\n  --anatomy-lo: #b9b4aa;\n  --anatomy-faint: #d9d3c8;\n  --anatomy-lit: #2c4e25;\n  --anatomy-halo: #8a8070;\n  --anatomy-halo-opacity: 0.3;\n  --anatomy-dot: #3a3833;\n  --anatomy-red: #b3402f;\n  --anatomy-green: #3f7a35;\n  --anatomy-blue: #3e6a8f;\n}\n\n/* Card typography: brand fonts for titles and readouts, kit mono for plate corners */\n.iso.optimal .iso-plate-title,\n.iso.optimal [data-role=\"title\"] {\n  font-family: var(--opt-display);\n  letter-spacing: -0.02em;\n}\n.iso.optimal [data-role=\"readout\"],\n.iso.optimal .iso-readout {\n  font-family: var(--opt-ui);\n  font-feature-settings: \"tnum\" 1, \"ss01\" 1;\n}\n\n/*\n * Card layout for Optimal figures (shared/page.mjs `plate`).\n * Phone first: the drawing, then a row of real buttons (>=44 px), then a footer\n * where the hint and the readout wrap instead of overlapping at 320 px.\n */\n.iso.optimal {\n  --opt-rule: rgba(233, 230, 220, 0.16);\n  --opt-btn: rgba(233, 230, 220, 0.06);\n  --opt-btn-on: #e9e6dc;\n  --opt-btn-on-text: #1c3118;\n  --opt-title: #fffcf7;\n  --opt-fig: #8cc67f;\n  --opt-heat-ink: #ff9776;\n  --opt-heat-glow: rgba(255, 151, 118, 0.55);\n  --opt-heat-wash: rgba(255, 151, 118, 0.16);\n  --opt-cold-ink: #9cc3e6;\n}\n.iso.optimal[data-theme=\"light\"] {\n  --opt-rule: rgba(44, 78, 37, 0.2);\n  --opt-btn: #fffcf7;\n  --opt-btn-on: #2c4e25;\n  --opt-btn-on-text: #fffcf7;\n  --opt-title: #2c4e25;\n  --opt-fig: #5e7a59;\n  --opt-heat-ink: #c8552e;\n  --opt-heat-glow: rgba(232, 108, 64, 0.42);\n  --opt-heat-wash: rgba(255, 151, 118, 0.22);\n  --opt-cold-ink: #3e6a8f;\n}\n.iso.optimal .opt-plate {\n  padding: 52px 24px 20px;\n  box-shadow: 0 0 0 1px var(--opt-rule);\n  border-radius: 2px;\n}\n.iso.optimal .iso-plate-corner[data-corner=\"fig\"] {\n  font-family: var(--opt-display);\n  font-style: italic;\n  font-size: 15px;\n  letter-spacing: 0;\n  color: var(--opt-fig);\n  top: -2px;\n}\n.iso.optimal .iso-plate-corner[data-corner=\"title\"] {\n  font-family: var(--opt-display);\n  font-size: 17px;\n  text-transform: none;\n  letter-spacing: -0.01em;\n  color: var(--opt-title);\n  top: -4px;\n}\n.iso.optimal .opt-controls {\n  display: flex;\n  flex-wrap: wrap;\n  justify-content: center;\n  gap: 8px 12px;\n  margin: 10px 0 0;\n}\n.iso.optimal .opt-seg {\n  display: inline-flex;\n  border-radius: 999px;\n  box-shadow: inset 0 0 0 1px var(--opt-rule);\n  padding: 3px;\n  gap: 2px;\n  max-width: 100%;\n}\n.iso.optimal .opt-seg-btn {\n  appearance: none;\n  border: 0;\n  margin: 0;\n  min-height: 44px;\n  min-width: min-content; /* never shrink a label below its longest word (with the padding, always ≥ 44 px) */\n  padding: 0 16px;\n  border-radius: 999px;\n  background: transparent;\n  color: var(--anatomy-text);\n  font: 500 14px/1.1 var(--opt-ui);\n  letter-spacing: 0;\n  cursor: pointer;\n  touch-action: manipulation;\n  -webkit-tap-highlight-color: transparent;\n  transition: background-color 240ms var(--anatomy-ease), color 240ms var(--anatomy-ease);\n}\n/* A zero-height 30 px strut keeps every option at least 44 px wide, even \"Arm\", \"Leg\" or \"+5%\" with the\n   7 px padding below 350 px (min-content alone let them shrink to 36 px). */\n.iso.optimal .opt-seg-btn::after {\n  content: \"\";\n  display: block;\n  width: 30px;\n  height: 0;\n  margin: 0 auto;\n}\n.iso.optimal .opt-seg-btn[aria-checked=\"true\"] {\n  background: var(--opt-btn-on);\n  color: var(--opt-btn-on-text);\n}\n.iso.optimal .opt-seg-btn:focus-visible {\n  outline: 2px solid var(--opt-fig);\n  outline-offset: 2px;\n}\n.iso.optimal .opt-foot {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: flex-end;\n  justify-content: space-between;\n  gap: 10px 20px;\n  margin-top: 16px;\n}\n.iso.optimal .opt-hint {\n  font-family: var(--anatomy-mono);\n  font-size: 10.5px;\n  line-height: 1.4;\n  letter-spacing: 0.1em;\n  text-transform: uppercase;\n  color: var(--anatomy-muted);\n  flex: 1 1 160px;\n  min-width: 0;\n}\n.iso.optimal .opt-readout {\n  display: grid;\n  grid-auto-flow: column;\n  gap: 4px 18px;\n  margin: 0;\n  font-family: var(--opt-ui);\n  font-feature-settings: \"tnum\" 1;\n}\n.iso.optimal .opt-stat { margin: 0; min-width: 0; }\n.iso.optimal .opt-stat dt {\n  font-size: 10px;\n  font-weight: 600;\n  letter-spacing: 0.12em;\n  text-transform: uppercase;\n  color: var(--anatomy-muted);\n  white-space: nowrap;\n}\n.iso.optimal .opt-stat dd {\n  margin: 1px 0 0;\n  font-size: 15px;\n  font-weight: 500;\n  color: var(--anatomy-strong);\n  white-space: nowrap;\n}\n.iso.optimal .iso-legend { font-family: var(--opt-ui); font-size: 13.5px; }\n.iso.optimal .iso-caption { color: var(--anatomy-text); }\n.iso.optimal .iso-caption em { font-style: italic; }\n.iso.optimal .iso-swatch[data-mark=\"heat\"] path { stroke: var(--opt-heat-ink); stroke-width: 2; }\n.iso.optimal .iso-stage { outline: none; border-radius: 4px; touch-action: pan-y; -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none; }\n.iso.optimal .iso-stage:focus-visible { outline: 1px solid var(--anatomy-muted); outline-offset: 6px; }\n@media (max-width: 560px) {\n  .iso.optimal .opt-plate { padding: 44px 10px 14px; }\n  .iso.optimal .iso-plate-corners { inset: 16px 12px; }\n  .iso.optimal .opt-readout { grid-auto-flow: row; grid-template-columns: repeat(4, minmax(0, auto)); width: 100%; justify-content: space-between; gap: 4px 10px; order: -1; }\n  .iso.optimal .opt-stat dd { font-size: 14px; }\n  /* a long label wraps onto two lines instead of running into its neighbour; values stay on one baseline */\n  .iso.optimal .opt-stat { display: flex; flex-direction: column; justify-content: space-between; }\n  .iso.optimal .opt-stat dt { white-space: normal; line-height: 1.25; }\n  .iso.optimal .opt-seg-btn { padding: 0 12px; font-size: 13.5px; }\n}\n@media (max-width: 350px) {\n  .iso.optimal .opt-seg-btn { padding: 0 7px; font-size: 12.5px; }\n  .iso.optimal .opt-stat dt { font-size: 9px; letter-spacing: 0.08em; }\n  .iso.optimal .opt-stat dd { font-size: 13px; }\n}\n\n:host{display:block}\n.opt-host{background:transparent;color:var(--anatomy-text);font:15px/1.6 var(--opt-ui);-webkit-font-smoothing:antialiased}\n.opt-host *{box-sizing:border-box}\n.opt-host .iso-figure{margin:0}\n/* Fig 1 · figure-specific styles. Colour only where heat is the subject. */\n.mt-heat { fill: var(--opt-heat-wash); stroke: none; opacity: 0; }\n.mt-lamp .iso-fill, .mt-lamp .iso-shade, .mt-lamp .iso-top { transition: fill 300ms var(--anatomy-ease), stroke 300ms var(--anatomy-ease); }\n.mt-lamp[data-lamp=\"warm\"][data-on] .iso-fill, .mt-lamp[data-lamp=\"warm\"][data-on] .iso-shade, .mt-lamp[data-lamp=\"warm\"][data-on] .iso-top { fill: var(--opt-heat-ink); stroke: var(--opt-heat-ink); }\n.mt-lamp[data-lamp=\"cool\"][data-on] .iso-fill, .mt-lamp[data-lamp=\"cool\"][data-on] .iso-shade, .mt-lamp[data-lamp=\"cool\"][data-on] .iso-top { fill: var(--opt-cold-ink); stroke: var(--opt-cold-ink); }\n.mt-heat { transition: none; }\n.mt-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }\n.mt-par { display: block; margin-top: 6px; }\n.mt-par:first-child { margin-top: 0; }\n/* The lit column: forest green wash in Cream, deep green in Forest night. */\n.iso.optimal .iso-solid[data-lit] > .iso-top { fill: var(--mt-lit-top); }\n.iso.optimal .iso-solid[data-lit] > .iso-shade { fill: var(--mt-lit-side); }\n.iso.optimal .iso-solid[data-lit] > .iso-fill { fill: var(--mt-lit-side); }\n.iso.optimal { --mt-lit-top: #3f6a37; --mt-lit-side: #2f5229; }\n.iso.optimal[data-theme=\"light\"] { --mt-lit-top: #e2eddf; --mt-lit-side: #c9dcc4; }\n.mt-par small { font-size: 12.5px; color: var(--anatomy-muted); }\n" + "</style><div class=\"iso optimal opt-host\" data-theme=\"" + theme + "\">" + "<figure class=\"iso-figure opt-figure \"><div class=\"iso-plate opt-plate\"><div class=\"iso-plate-corners\" aria-hidden=\"true\"><span class=\"iso-plate-corner\" data-corner=\"fig\">Fig 1</span><span class=\"iso-plate-corner\" data-corner=\"title\">The narrowing thermostat</span></div><div class=\"iso-stage mt-stage\" tabindex=\"0\" role=\"slider\" aria-label=\"Estrogen, from pre-menopause to post-menopause. Arrow keys turn the knob, Home and End jump to each end, Space starts a small rise in core temperature.\" aria-valuemin=\"0\" aria-valuemax=\"100\" aria-valuenow=\"100\" aria-valuetext=\"Pre-menopause: zone 0.4 °C, no hot flashes\"><svg xmlns=\"http://www.w3.org/2000/svg\" class=\"iso-svg\" viewBox=\"0 0 600 580\" role=\"img\" aria-label=\"A bench regulator drawn as a machine. A sealed capsule pushes a lit column up and down beside a temperature scale. Two contact jaws on a lead screw sit above and below the column's finger: the upper jaw is the sweating threshold, the lower jaw the shivering threshold, and the gap between them is the thermoneutral zone. An estrogen knob on top closes the jaws. When the finger touches the upper jaw, a relay opens the louvres on a radiator and swings the skin-temperature and heart-rate dials; afterwards the column dips, and with a narrow zone it can touch the lower jaw, a chill.\"><path class=\"iso-halo\" d=\"M17.3 380.9L17.7 379.1L18.9 377.4L20.6 375.8L103.4 316.7L105.7 315.3L108.6 314.2L111.8 313.4L115.3 312.9L119 312.8L122.6 313L126 313.5L129.2 314.4L574.8 470.4L577.6 471.6L579.8 473.1L581.5 474.7L582.4 476.4L582.7 478.2L582.7 496.1L582.3 497.9L581.1 499.6L579.4 501.2L496.6 560.3L494.3 561.7L491.4 562.8L488.2 563.6L484.7 564.1L481 564.2L477.4 564L474 563.4L470.8 562.6L25.2 406.5L22.4 405.4L20.2 403.9L18.5 402.3L17.6 400.6L17.3 398.7Z\"/><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M110.7 356.1L110.9 354.5L111.8 353L113.3 351.5L115.5 350.3L118.1 349.4L121.1 348.8L124.2 348.5L127.5 348.6L130.6 349L133.4 349.8L135.8 350.8L137.7 352.1L139 353.6L139.5 355.2L139.5 358.1L139.4 359.7L138.5 361.2L137 362.7L134.8 363.9L132.2 364.8L129.2 365.4L126 365.7L122.8 365.6L119.7 365.2L116.9 364.4L114.4 363.4L112.6 362.1L111.3 360.6L110.7 359Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M137 362.7L134.8 363.9L134.8 361L137 359.8ZM134.8 363.9L132.2 364.8L132.2 362L134.8 361ZM139.5 358.1L139.4 359.7L139.4 356.8L139.5 355.2ZM139.4 359.7L138.5 361.2L138.5 358.4L139.4 356.8ZM138.5 361.2L137 362.7L137 359.8L138.5 358.4Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M132.2 364.8L129.2 365.4L129.2 362.6L132.2 362ZM129.2 365.4L126 365.7L126 362.9L129.2 362.6Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M126 365.7L122.8 365.6L122.8 362.8L126 362.9ZM122.8 365.6L119.7 365.2L119.7 362.4L122.8 362.8ZM119.7 365.2L116.9 364.4L116.9 361.6L119.7 362.4Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M116.9 364.4L114.4 363.4L114.4 360.5L116.9 361.6ZM114.4 363.4L112.6 362.1L112.6 359.2L114.4 360.5ZM112.6 362.1L111.3 360.6L111.3 357.7L112.6 359.2ZM111.3 360.6L110.7 359L110.7 356.1L111.3 357.7Z\"/><path class=\"iso-top\" d=\"M137 359.8L134.8 361L132.2 362L129.2 362.6L126 362.9L122.8 362.8L119.7 362.4L116.9 361.6L114.4 360.5L112.6 359.2L111.3 357.7L110.7 356.1L110.9 354.5L111.8 353L113.3 351.5L115.5 350.3L118.1 349.4L121.1 348.8L124.2 348.5L127.5 348.6L130.6 349L133.4 349.8L135.8 350.8L137.7 352.1L139 353.6L139.5 355.2L139.4 356.8L138.5 358.4Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M139.5 355.2L139.4 356.8L138.5 358.4L137 359.8L134.8 361L132.2 362L129.2 362.6L126 362.9L122.8 362.8L119.7 362.4L116.9 361.6L114.4 360.5L112.6 359.2L111.3 357.7L110.7 356.1\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M110.7 356.1L110.9 354.5L111.8 353L113.3 351.5L115.5 350.3L118.1 349.4L121.1 348.8L124.2 348.5L127.5 348.6L130.6 349L133.4 349.8L135.8 350.8L137.7 352.1L139 353.6L139.5 355.2M139.5 358.1L139.4 359.7L138.5 361.2L137 362.7L134.8 363.9L132.2 364.8L129.2 365.4L126 365.7L122.8 365.6L119.7 365.2L116.9 364.4L114.4 363.4L112.6 362.1L111.3 360.6L110.7 359M110.7 356.1L110.7 359M139.5 355.2L139.5 358.1\"/></g><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M114 350L114.2 348.7L114.8 347.5L116 346.4L117.7 345.5L119.7 344.8L122 344.3L124.4 344.1L126.9 344.1L129.3 344.5L131.5 345L133.4 345.9L134.8 346.9L135.8 348L136.2 349.3L136.2 355.3L136.1 356.6L135.4 357.8L134.3 358.9L132.6 359.8L130.6 360.5L128.3 361L125.8 361.2L123.3 361.2L120.9 360.8L118.8 360.2L116.9 359.4L115.4 358.4L114.5 357.2L114 356Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M134.3 358.9L132.6 359.8L132.6 353.7L134.3 352.8ZM132.6 359.8L130.6 360.5L130.6 354.5L132.6 353.7ZM136.2 355.3L136.1 356.6L136.1 350.5L136.2 349.3ZM136.1 356.6L135.4 357.8L135.4 351.7L136.1 350.5ZM135.4 357.8L134.3 358.9L134.3 352.8L135.4 351.7Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M130.6 360.5L128.3 361L128.3 354.9L130.6 354.5ZM128.3 361L125.8 361.2L125.8 355.2L128.3 354.9Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M125.8 361.2L123.3 361.2L123.3 355.1L125.8 355.2ZM123.3 361.2L120.9 360.8L120.9 354.8L123.3 355.1ZM120.9 360.8L118.8 360.2L118.8 354.2L120.9 354.8Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M118.8 360.2L116.9 359.4L116.9 353.3L118.8 354.2ZM116.9 359.4L115.4 358.4L115.4 352.3L116.9 353.3ZM115.4 358.4L114.5 357.2L114.5 351.2L115.4 352.3ZM114.5 357.2L114 356L114 350L114.5 351.2Z\"/><path class=\"iso-top\" d=\"M134.3 352.8L132.6 353.7L130.6 354.5L128.3 354.9L125.8 355.2L123.3 355.1L120.9 354.8L118.8 354.2L116.9 353.3L115.4 352.3L114.5 351.2L114 350L114.2 348.7L114.8 347.5L116 346.4L117.7 345.5L119.7 344.8L122 344.3L124.4 344.1L126.9 344.1L129.3 344.5L131.5 345L133.4 345.9L134.8 346.9L135.8 348L136.2 349.3L136.1 350.5L135.4 351.7Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M136.2 349.3L136.1 350.5L135.4 351.7L134.3 352.8L132.6 353.7L130.6 354.5L128.3 354.9L125.8 355.2L123.3 355.1L120.9 354.8L118.8 354.2L116.9 353.3L115.4 352.3L114.5 351.2L114 350\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M114 350L114.2 348.7L114.8 347.5L116 346.4L117.7 345.5L119.7 344.8L122 344.3L124.4 344.1L126.9 344.1L129.3 344.5L131.5 345L133.4 345.9L134.8 346.9L135.8 348L136.2 349.3M136.2 355.3L136.1 356.6L135.4 357.8L134.3 358.9L132.6 359.8L130.6 360.5L128.3 361L125.8 361.2L123.3 361.2L120.9 360.8L118.8 360.2L116.9 359.4L115.4 358.4L114.5 357.2L114 356M114 350L114 356M136.2 349.3L136.2 355.3\"/></g><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M58.7 393.3L58.9 391.6L59.8 390.1L61.3 388.7L63.5 387.5L66.1 386.5L69.1 385.9L72.2 385.6L75.5 385.7L78.6 386.1L81.4 386.9L83.8 388L85.7 389.3L87 390.8L87.5 392.4L87.5 395.2L87.4 396.8L86.5 398.4L85 399.8L82.8 401L80.2 402L77.2 402.6L74 402.9L70.8 402.8L67.7 402.3L64.9 401.6L62.4 400.5L60.6 399.2L59.3 397.7L58.7 396.1Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M85 399.8L82.8 401L82.8 398.2L85 396.9ZM82.8 401L80.2 402L80.2 399.1L82.8 398.2ZM87.5 395.2L87.4 396.8L87.4 394L87.5 392.4ZM87.4 396.8L86.5 398.4L86.5 395.5L87.4 394ZM86.5 398.4L85 399.8L85 396.9L86.5 395.5Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M80.2 402L77.2 402.6L77.2 399.7L80.2 399.1ZM77.2 402.6L74 402.9L74 400L77.2 399.7Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M74 402.9L70.8 402.8L70.8 399.9L74 400ZM70.8 402.8L67.7 402.3L67.7 399.5L70.8 399.9ZM67.7 402.3L64.9 401.6L64.9 398.7L67.7 399.5Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M64.9 401.6L62.4 400.5L62.4 397.6L64.9 398.7ZM62.4 400.5L60.6 399.2L60.6 396.3L62.4 397.6ZM60.6 399.2L59.3 397.7L59.3 394.8L60.6 396.3ZM59.3 397.7L58.7 396.1L58.7 393.3L59.3 394.8Z\"/><path class=\"iso-top\" d=\"M85 396.9L82.8 398.2L80.2 399.1L77.2 399.7L74 400L70.8 399.9L67.7 399.5L64.9 398.7L62.4 397.6L60.6 396.3L59.3 394.8L58.7 393.3L58.9 391.6L59.8 390.1L61.3 388.7L63.5 387.5L66.1 386.5L69.1 385.9L72.2 385.6L75.5 385.7L78.6 386.1L81.4 386.9L83.8 388L85.7 389.3L87 390.8L87.5 392.4L87.4 394L86.5 395.5Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M87.5 392.4L87.4 394L86.5 395.5L85 396.9L82.8 398.2L80.2 399.1L77.2 399.7L74 400L70.8 399.9L67.7 399.5L64.9 398.7L62.4 397.6L60.6 396.3L59.3 394.8L58.7 393.3\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M58.7 393.3L58.9 391.6L59.8 390.1L61.3 388.7L63.5 387.5L66.1 386.5L69.1 385.9L72.2 385.6L75.5 385.7L78.6 386.1L81.4 386.9L83.8 388L85.7 389.3L87 390.8L87.5 392.4M87.5 395.2L87.4 396.8L86.5 398.4L85 399.8L82.8 401L80.2 402L77.2 402.6L74 402.9L70.8 402.8L67.7 402.3L64.9 401.6L62.4 400.5L60.6 399.2L59.3 397.7L58.7 396.1M58.7 393.3L58.7 396.1M87.5 392.4L87.5 395.2\"/></g><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M62 387.1L62.2 385.8L62.8 384.6L64 383.5L65.7 382.6L67.7 381.9L70 381.4L72.4 381.2L74.9 381.2L77.3 381.6L79.5 382.2L81.4 383L82.8 384L83.8 385.2L84.2 386.4L84.2 392.5L84.1 393.7L83.4 394.9L82.3 396L80.6 396.9L78.6 397.7L76.3 398.1L73.8 398.4L71.3 398.3L68.9 398L66.8 397.4L64.9 396.5L63.4 395.5L62.5 394.4L62 393.2Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M82.3 396L80.6 396.9L80.6 390.9L82.3 389.9ZM80.6 396.9L78.6 397.7L78.6 391.6L80.6 390.9ZM84.2 392.5L84.1 393.7L84.1 387.6L84.2 386.4ZM84.1 393.7L83.4 394.9L83.4 388.8L84.1 387.6ZM83.4 394.9L82.3 396L82.3 389.9L83.4 388.8Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M78.6 397.7L76.3 398.1L76.3 392.1L78.6 391.6ZM76.3 398.1L73.8 398.4L73.8 392.3L76.3 392.1Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M73.8 398.4L71.3 398.3L71.3 392.2L73.8 392.3ZM71.3 398.3L68.9 398L68.9 391.9L71.3 392.2ZM68.9 398L66.8 397.4L66.8 391.3L68.9 391.9Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M66.8 397.4L64.9 396.5L64.9 390.5L66.8 391.3ZM64.9 396.5L63.4 395.5L63.4 389.5L64.9 390.5ZM63.4 395.5L62.5 394.4L62.5 388.3L63.4 389.5ZM62.5 394.4L62 393.2L62 387.1L62.5 388.3Z\"/><path class=\"iso-top\" d=\"M82.3 389.9L80.6 390.9L78.6 391.6L76.3 392.1L73.8 392.3L71.3 392.2L68.9 391.9L66.8 391.3L64.9 390.5L63.4 389.5L62.5 388.3L62 387.1L62.2 385.8L62.8 384.6L64 383.5L65.7 382.6L67.7 381.9L70 381.4L72.4 381.2L74.9 381.2L77.3 381.6L79.5 382.2L81.4 383L82.8 384L83.8 385.2L84.2 386.4L84.1 387.6L83.4 388.8Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M84.2 386.4L84.1 387.6L83.4 388.8L82.3 389.9L80.6 390.9L78.6 391.6L76.3 392.1L73.8 392.3L71.3 392.2L68.9 391.9L66.8 391.3L64.9 390.5L63.4 389.5L62.5 388.3L62 387.1\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M62 387.1L62.2 385.8L62.8 384.6L64 383.5L65.7 382.6L67.7 381.9L70 381.4L72.4 381.2L74.9 381.2L77.3 381.6L79.5 382.2L81.4 383L82.8 384L83.8 385.2L84.2 386.4M84.2 392.5L84.1 393.7L83.4 394.9L82.3 396L80.6 396.9L78.6 397.7L76.3 398.1L73.8 398.4L71.3 398.3L68.9 398L66.8 397.4L64.9 396.5L63.4 395.5L62.5 394.4L62 393.2M62 387.1L62 393.2M84.2 386.4L84.2 392.5\"/></g><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M512.5 496.8L512.6 495.2L513.5 493.6L515 492.2L517.2 491L519.8 490L522.8 489.4L526 489.1L529.2 489.2L532.3 489.6L535.1 490.4L537.6 491.5L539.4 492.8L540.7 494.3L541.3 495.9L541.3 498.7L541.1 500.3L540.2 501.9L538.7 503.3L536.5 504.5L533.9 505.5L530.9 506.1L527.8 506.4L524.5 506.3L521.4 505.9L518.6 505.1L516.2 504L514.3 502.7L513 501.2L512.5 499.6Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M538.7 503.3L536.5 504.5L536.5 501.7L538.7 500.5ZM536.5 504.5L533.9 505.5L533.9 502.6L536.5 501.7ZM541.3 498.7L541.1 500.3L541.1 497.5L541.3 495.9ZM541.1 500.3L540.2 501.9L540.2 499L541.1 497.5ZM540.2 501.9L538.7 503.3L538.7 500.5L540.2 499Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M533.9 505.5L530.9 506.1L530.9 503.2L533.9 502.6ZM530.9 506.1L527.8 506.4L527.8 503.5L530.9 503.2Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M527.8 506.4L524.5 506.3L524.5 503.4L527.8 503.5ZM524.5 506.3L521.4 505.9L521.4 503L524.5 503.4ZM521.4 505.9L518.6 505.1L518.6 502.2L521.4 503Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M518.6 505.1L516.2 504L516.2 501.2L518.6 502.2ZM516.2 504L514.3 502.7L514.3 499.8L516.2 501.2ZM514.3 502.7L513 501.2L513 498.4L514.3 499.8ZM513 501.2L512.5 499.6L512.5 496.8L513 498.4Z\"/><path class=\"iso-top\" d=\"M538.7 500.5L536.5 501.7L533.9 502.6L530.9 503.2L527.8 503.5L524.5 503.4L521.4 503L518.6 502.2L516.2 501.2L514.3 499.8L513 498.4L512.5 496.8L512.6 495.2L513.5 493.6L515 492.2L517.2 491L519.8 490L522.8 489.4L526 489.1L529.2 489.2L532.3 489.6L535.1 490.4L537.6 491.5L539.4 492.8L540.7 494.3L541.3 495.9L541.1 497.5L540.2 499Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M541.3 495.9L541.1 497.5L540.2 499L538.7 500.5L536.5 501.7L533.9 502.6L530.9 503.2L527.8 503.5L524.5 503.4L521.4 503L518.6 502.2L516.2 501.2L514.3 499.8L513 498.4L512.5 496.8\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M512.5 496.8L512.6 495.2L513.5 493.6L515 492.2L517.2 491L519.8 490L522.8 489.4L526 489.1L529.2 489.2L532.3 489.6L535.1 490.4L537.6 491.5L539.4 492.8L540.7 494.3L541.3 495.9M541.3 498.7L541.1 500.3L540.2 501.9L538.7 503.3L536.5 504.5L533.9 505.5L530.9 506.1L527.8 506.4L524.5 506.3L521.4 505.9L518.6 505.1L516.2 504L514.3 502.7L513 501.2L512.5 499.6M512.5 496.8L512.5 499.6M541.3 495.9L541.3 498.7\"/></g><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M515.8 490.6L515.9 489.4L516.6 488.2L517.7 487.1L519.4 486.1L521.4 485.4L523.7 484.9L526.2 484.7L528.7 484.8L531.1 485.1L533.2 485.7L535.1 486.5L536.6 487.5L537.5 488.7L538 489.9L538 496L537.8 497.2L537.2 498.4L536 499.5L534.3 500.4L532.3 501.2L530 501.7L527.6 501.9L525.1 501.8L522.7 501.5L520.5 500.9L518.6 500.1L517.2 499L516.2 497.9L515.8 496.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M536 499.5L534.3 500.4L534.3 494.4L536 493.4ZM534.3 500.4L532.3 501.2L532.3 495.1L534.3 494.4ZM538 496L537.8 497.2L537.8 491.1L538 489.9ZM537.8 497.2L537.2 498.4L537.2 492.3L537.8 491.1ZM537.2 498.4L536 499.5L536 493.4L537.2 492.3Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M532.3 501.2L530 501.7L530 495.6L532.3 495.1ZM530 501.7L527.6 501.9L527.6 495.8L530 495.6Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M527.6 501.9L525.1 501.8L525.1 495.7L527.6 495.8ZM525.1 501.8L522.7 501.5L522.7 495.4L525.1 495.7ZM522.7 501.5L520.5 500.9L520.5 494.8L522.7 495.4Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M520.5 500.9L518.6 500.1L518.6 494L520.5 494.8ZM518.6 500.1L517.2 499L517.2 493L518.6 494ZM517.2 499L516.2 497.9L516.2 491.8L517.2 493ZM516.2 497.9L515.8 496.7L515.8 490.6L516.2 491.8Z\"/><path class=\"iso-top\" d=\"M536 493.4L534.3 494.4L532.3 495.1L530 495.6L527.6 495.8L525.1 495.7L522.7 495.4L520.5 494.8L518.6 494L517.2 493L516.2 491.8L515.8 490.6L515.9 489.4L516.6 488.2L517.7 487.1L519.4 486.1L521.4 485.4L523.7 484.9L526.2 484.7L528.7 484.8L531.1 485.1L533.2 485.7L535.1 486.5L536.6 487.5L537.5 488.7L538 489.9L537.8 491.1L537.2 492.3Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M538 489.9L537.8 491.1L537.2 492.3L536 493.4L534.3 494.4L532.3 495.1L530 495.6L527.6 495.8L525.1 495.7L522.7 495.4L520.5 494.8L518.6 494L517.2 493L516.2 491.8L515.8 490.6\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M515.8 490.6L515.9 489.4L516.6 488.2L517.7 487.1L519.4 486.1L521.4 485.4L523.7 484.9L526.2 484.7L528.7 484.8L531.1 485.1L533.2 485.7L535.1 486.5L536.6 487.5L537.5 488.7L538 489.9M538 496L537.8 497.2L537.2 498.4L536 499.5L534.3 500.4L532.3 501.2L530 501.7L527.6 501.9L525.1 501.8L522.7 501.5L520.5 500.9L518.6 500.1L517.2 499L516.2 497.9L515.8 496.7M515.8 490.6L515.8 496.7M538 489.9L538 496\"/></g><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M460.5 533.9L460.6 532.3L461.5 530.7L463 529.3L465.2 528.1L467.8 527.2L470.8 526.5L474 526.3L477.2 526.3L480.3 526.8L483.1 527.5L485.6 528.6L487.4 529.9L488.7 531.4L489.3 533L489.3 535.9L489.1 537.5L488.2 539L486.7 540.4L484.5 541.7L481.9 542.6L478.9 543.2L475.8 543.5L472.5 543.4L469.4 543L466.6 542.2L464.2 541.1L462.3 539.8L461 538.3L460.5 536.8Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M486.7 540.4L484.5 541.7L484.5 538.8L486.7 537.6ZM484.5 541.7L481.9 542.6L481.9 539.7L484.5 538.8ZM489.3 535.9L489.1 537.5L489.1 534.6L489.3 533ZM489.1 537.5L488.2 539L488.2 536.2L489.1 534.6ZM488.2 539L486.7 540.4L486.7 537.6L488.2 536.2Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M481.9 542.6L478.9 543.2L478.9 540.4L481.9 539.7ZM478.9 543.2L475.8 543.5L475.8 540.7L478.9 540.4Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M475.8 543.5L472.5 543.4L472.5 540.6L475.8 540.7ZM472.5 543.4L469.4 543L469.4 540.1L472.5 540.6ZM469.4 543L466.6 542.2L466.6 539.4L469.4 540.1Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M466.6 542.2L464.2 541.1L464.2 538.3L466.6 539.4ZM464.2 541.1L462.3 539.8L462.3 537L464.2 538.3ZM462.3 539.8L461 538.3L461 535.5L462.3 537ZM461 538.3L460.5 536.8L460.5 533.9L461 535.5Z\"/><path class=\"iso-top\" d=\"M486.7 537.6L484.5 538.8L481.9 539.7L478.9 540.4L475.8 540.7L472.5 540.6L469.4 540.1L466.6 539.4L464.2 538.3L462.3 537L461 535.5L460.5 533.9L460.6 532.3L461.5 530.7L463 529.3L465.2 528.1L467.8 527.2L470.8 526.5L474 526.3L477.2 526.3L480.3 526.8L483.1 527.5L485.6 528.6L487.4 529.9L488.7 531.4L489.3 533L489.1 534.6L488.2 536.2Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M489.3 533L489.1 534.6L488.2 536.2L486.7 537.6L484.5 538.8L481.9 539.7L478.9 540.4L475.8 540.7L472.5 540.6L469.4 540.1L466.6 539.4L464.2 538.3L462.3 537L461 535.5L460.5 533.9\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M460.5 533.9L460.6 532.3L461.5 530.7L463 529.3L465.2 528.1L467.8 527.2L470.8 526.5L474 526.3L477.2 526.3L480.3 526.8L483.1 527.5L485.6 528.6L487.4 529.9L488.7 531.4L489.3 533M489.3 535.9L489.1 537.5L488.2 539L486.7 540.4L484.5 541.7L481.9 542.6L478.9 543.2L475.8 543.5L472.5 543.4L469.4 543L466.6 542.2L464.2 541.1L462.3 539.8L461 538.3L460.5 536.8M460.5 533.9L460.5 536.8M489.3 533L489.3 535.9\"/></g><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M463.8 527.7L463.9 526.5L464.6 525.3L465.7 524.2L467.4 523.3L469.4 522.5L471.7 522L474.2 521.8L476.7 521.9L479.1 522.2L481.2 522.8L483.1 523.7L484.6 524.7L485.5 525.8L486 527L486 533.1L485.8 534.4L485.2 535.5L484 536.6L482.3 537.6L480.3 538.3L478 538.8L475.6 539L473.1 538.9L470.7 538.6L468.5 538L466.6 537.2L465.2 536.2L464.2 535L463.8 533.8Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M484 536.6L482.3 537.6L482.3 531.5L484 530.6ZM482.3 537.6L480.3 538.3L480.3 532.2L482.3 531.5ZM486 533.1L485.8 534.4L485.8 528.3L486 527ZM485.8 534.4L485.2 535.5L485.2 529.5L485.8 528.3ZM485.2 535.5L484 536.6L484 530.6L485.2 529.5Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M480.3 538.3L478 538.8L478 532.7L480.3 532.2ZM478 538.8L475.6 539L475.6 532.9L478 532.7Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M475.6 539L473.1 538.9L473.1 532.9L475.6 532.9ZM473.1 538.9L470.7 538.6L470.7 532.5L473.1 532.9ZM470.7 538.6L468.5 538L468.5 531.9L470.7 532.5Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M468.5 538L466.6 537.2L466.6 531.1L468.5 531.9ZM466.6 537.2L465.2 536.2L465.2 530.1L466.6 531.1ZM465.2 536.2L464.2 535L464.2 529L465.2 530.1ZM464.2 535L463.8 533.8L463.8 527.7L464.2 529Z\"/><path class=\"iso-top\" d=\"M484 530.6L482.3 531.5L480.3 532.2L478 532.7L475.6 532.9L473.1 532.9L470.7 532.5L468.5 531.9L466.6 531.1L465.2 530.1L464.2 529L463.8 527.7L463.9 526.5L464.6 525.3L465.7 524.2L467.4 523.3L469.4 522.5L471.7 522L474.2 521.8L476.7 521.9L479.1 522.2L481.2 522.8L483.1 523.7L484.6 524.7L485.5 525.8L486 527L485.8 528.3L485.2 529.5Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M486 527L485.8 528.3L485.2 529.5L484 530.6L482.3 531.5L480.3 532.2L478 532.7L475.6 532.9L473.1 532.9L470.7 532.5L468.5 531.9L466.6 531.1L465.2 530.1L464.2 529L463.8 527.7\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M463.8 527.7L463.9 526.5L464.6 525.3L465.7 524.2L467.4 523.3L469.4 522.5L471.7 522L474.2 521.8L476.7 521.9L479.1 522.2L481.2 522.8L483.1 523.7L484.6 524.7L485.5 525.8L486 527M486 533.1L485.8 534.4L485.2 535.5L484 536.6L482.3 537.6L480.3 538.3L478 538.8L475.6 539L473.1 538.9L470.7 538.6L468.5 538L466.6 537.2L465.2 536.2L464.2 535L463.8 533.8M463.8 527.7L463.8 533.8M486 527L486 533.1\"/></g><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M17.3 372L17.7 370.2L18.9 368.4L20.6 366.9L103.4 307.8L105.7 306.4L108.6 305.3L111.8 304.5L115.3 304L119 303.8L122.6 304.1L126 304.6L129.2 305.5L574.8 461.5L577.6 462.7L579.8 464.1L581.5 465.8L582.4 467.5L582.7 469.3L582.7 487.2L582.3 489L581.1 490.7L579.4 492.3L496.6 551.4L494.3 552.7L491.4 553.9L488.2 554.7L484.7 555.2L481 555.3L477.4 555.1L474 554.5L470.8 553.6L25.2 397.6L22.4 396.4L20.2 395L18.5 393.4L17.6 391.6L17.3 389.8Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M582.7 487.2L582.3 489L582.3 471.1L582.7 469.3ZM582.3 489L581.1 490.7L581.1 472.9L582.3 471.1ZM581.1 490.7L579.4 492.3L579.4 474.4L581.1 472.9ZM579.4 492.3L496.6 551.4L496.6 533.5L579.4 474.4ZM496.6 551.4L494.3 552.7L494.3 534.9L496.6 533.5ZM494.3 552.7L491.4 553.9L491.4 536L494.3 534.9Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M491.4 553.9L488.2 554.7L488.2 536.8L491.4 536ZM488.2 554.7L484.7 555.2L484.7 537.3L488.2 536.8ZM484.7 555.2L481 555.3L481 537.5L484.7 537.3Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M481 555.3L477.4 555.1L477.4 537.2L481 537.5ZM477.4 555.1L474 554.5L474 536.7L477.4 537.2ZM474 554.5L470.8 553.6L470.8 535.8L474 536.7Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M470.8 553.6L25.2 397.6L25.2 379.8L470.8 535.8ZM25.2 397.6L22.4 396.4L22.4 378.6L25.2 379.8ZM22.4 396.4L20.2 395L20.2 377.2L22.4 378.6ZM20.2 395L18.5 393.4L18.5 375.5L20.2 377.2ZM18.5 393.4L17.6 391.6L17.6 373.8L18.5 375.5ZM17.6 391.6L17.3 389.8L17.3 372L17.6 373.8Z\"/><path class=\"iso-top\" d=\"M574.8 461.5L577.6 462.7L579.8 464.1L581.5 465.8L582.4 467.5L582.7 469.3L582.3 471.1L581.1 472.9L579.4 474.4L496.6 533.5L494.3 534.9L491.4 536L488.2 536.8L484.7 537.3L481 537.5L477.4 537.2L474 536.7L470.8 535.8L25.2 379.8L22.4 378.6L20.2 377.2L18.5 375.5L17.6 373.8L17.3 372L17.7 370.2L18.9 368.4L20.6 366.9L103.4 307.8L105.7 306.4L108.6 305.3L111.8 304.5L115.3 304L119 303.8L122.6 304.1L126 304.6L129.2 305.5Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M582.7 469.3L582.3 471.1L581.1 472.9L579.4 474.4L496.6 533.5L494.3 534.9L491.4 536L488.2 536.8L484.7 537.3L481 537.5L477.4 537.2L474 536.7L470.8 535.8L25.2 379.8L22.4 378.6L20.2 377.2L18.5 375.5L17.6 373.8L17.3 372\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M582.7 469.3L579.1 470.8L578.1 472.2L576.6 473.6L494 532.5L492 533.7L489.6 534.6L487 535.3L484.1 535.7L481.1 535.8L478.1 535.6L475.3 535.2L472.6 534.4L27.2 378.5L24.8 377.5L23 376.3L21.6 374.9L20.8 373.5L17.3 372\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M582.7 476.5L582.3 478.3L581.1 480L579.4 481.6L496.6 540.7L494.3 542L491.4 543.2L488.2 544L484.7 544.5L481 544.6L477.4 544.4L474 543.8L470.8 542.9L25.2 386.9L22.4 385.7L20.2 384.3L18.5 382.7L17.6 380.9L17.3 379.1\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M17.3 372L17.7 370.2L18.9 368.4L20.6 366.9L103.4 307.8L105.7 306.4L108.6 305.3L111.8 304.5L115.3 304L119 303.8L122.6 304.1L126 304.6L129.2 305.5L574.8 461.5L577.6 462.7L579.8 464.1L581.5 465.8L582.4 467.5L582.7 469.3M582.7 487.2L582.3 489L581.1 490.7L579.4 492.3L496.6 551.4L494.3 552.7L491.4 553.9L488.2 554.7L484.7 555.2L481 555.3L477.4 555.1L474 554.5L470.8 553.6L25.2 397.6L22.4 396.4L20.2 395L18.5 393.4L17.6 391.6L17.3 389.8M582.7 469.3L582.7 487.2M17.3 372L17.3 389.8\"/></g><path class=\"iso-line\" data-tone=\"lo\" d=\"M568.9 465.7L570.1 466.3L571.1 466.9L571.9 467.6L572.3 468.4L572.4 469.2L572.2 470L571.7 470.8L570.9 471.5L488.2 530.6L487.1 531.2L485.9 531.7L484.4 532L482.9 532.3L481.3 532.3L479.7 532.2L478.1 532L476.7 531.6L31.1 375.6L29.9 375L28.9 374.4L28.1 373.7L27.7 372.9L27.6 372.1L27.8 371.3L28.3 370.5L29.1 369.8L111.8 310.7L112.9 310.1L114.1 309.6L115.6 309.3L117.1 309L118.7 309L120.3 309.1L121.9 309.3L123.3 309.7Z\"/><path class=\"iso-line\" data-tone=\"lo\" d=\"M122.8 315.8L121.5 316.5L119.9 316.8L118.1 316.8L116.5 316.4L115.2 315.8L114.6 314.9L114.6 314.1L115.4 313.2L116.6 312.6L118.3 312.3L120 312.3L121.7 312.7L122.9 313.3L123.5 314.1L123.5 315ZM565 470.7L563.7 471.3L562.1 471.6L560.3 471.6L558.7 471.2L557.5 470.6L556.8 469.8L556.9 468.9L557.6 468.1L558.9 467.5L560.5 467.1L562.3 467.2L563.9 467.5L565.1 468.2L565.8 469L565.7 469.9ZM42.4 373.2L41.1 373.8L39.5 374.2L37.7 374.1L36.1 373.8L34.9 373.1L34.2 372.3L34.3 371.4L35 370.6L36.3 370L37.9 369.7L39.7 369.7L41.3 370.1L42.5 370.7L43.2 371.5L43.1 372.4ZM484.6 528.1L483.4 528.7L481.7 529L480 529L478.3 528.6L477.1 528L476.5 527.2L476.5 526.3L477.2 525.5L478.5 524.8L480.1 524.5L481.9 524.5L483.5 524.9L484.8 525.5L485.4 526.4L485.4 527.2Z\"/><g class=\"iso-dots\" data-tone=\"mid\"><circle cx=\"119.1\" cy=\"314.5\" r=\"0.5\"/><circle cx=\"561.3\" cy=\"469.4\" r=\"0.5\"/><circle cx=\"38.7\" cy=\"371.9\" r=\"0.5\"/><circle cx=\"480.9\" cy=\"526.8\" r=\"0.5\"/></g><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M34.6 368.3L35.1 367.7L46.4 359.6L47.4 359.2L48.6 359.1L49.8 359.3L86.3 372.1L87.1 372.6L87.3 373.2L87.3 374.6L86.9 375.2L75.6 383.3L74.6 383.7L73.3 383.9L72.1 383.6L35.7 370.9L34.8 370.4L34.6 369.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M87.3 374.6L86.9 375.2L86.9 373.8L87.3 373.2ZM86.9 375.2L75.6 383.3L75.6 381.9L86.9 373.8ZM75.6 383.3L74.6 383.7L74.6 382.3L75.6 381.9Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M74.6 383.7L73.3 383.9L73.3 382.4L74.6 382.3Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M73.3 383.9L72.1 383.6L72.1 382.2L73.3 382.4Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M72.1 383.6L35.7 370.9L35.7 369.4L72.1 382.2ZM35.7 370.9L34.8 370.4L34.8 368.9L35.7 369.4ZM34.8 370.4L34.6 369.7L34.6 368.3L34.8 368.9Z\"/><path class=\"iso-top\" d=\"M86.3 372.1L87.1 372.6L87.3 373.2L86.9 373.8L75.6 381.9L74.6 382.3L73.3 382.4L72.1 382.2L35.7 369.4L34.8 368.9L34.6 368.3L35.1 367.7L46.4 359.6L47.4 359.2L48.6 359.1L49.8 359.3Z\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M34.6 368.3L35.1 367.7L46.4 359.6L47.4 359.2L48.6 359.1L49.8 359.3L86.3 372.1L87.1 372.6L87.3 373.2M87.3 374.6L86.9 375.2L75.6 383.3L74.6 383.7L73.3 383.9L72.1 383.6L35.7 370.9L34.8 370.4L34.6 369.7M87.3 373.2L87.3 374.6M34.6 368.3L34.6 369.7\"/></g><path class=\"iso-line\" data-tone=\"faint\" d=\"M84.3 373.1L73.4 380.9L37.7 368.4L48.5 360.6Z\"/><path class=\"iso-line\" data-tone=\"lo\" data-free=\"\" d=\"M49.5 363.5L76.5 372.9M46 366L63.5 372.2M42.4 368.5L64.1 376.1\"/><g class=\"iso-dots\" data-tone=\"mid\"><circle cx=\"81.1\" cy=\"373.3\" r=\"0.45\"/><circle cx=\"72.6\" cy=\"379.4\" r=\"0.45\"/></g><g class=\"it\" data-name=\"scale.foot\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M65.3 335.5L66.1 334.5L75.5 327.8L77.1 327.1L79.2 326.9L81.2 327.3L113.3 338.5L114.7 339.3L115.1 340.4L115.1 354.6L114.3 355.6L104.9 362.4L103.2 363.1L101.1 363.3L99.1 362.9L67.1 351.7L65.7 350.9L65.3 349.8Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M115.1 354.6L114.3 355.6L114.3 341.4L115.1 340.4ZM114.3 355.6L104.9 362.4L104.9 348.1L114.3 341.4ZM104.9 362.4L103.2 363.1L103.2 348.8L104.9 348.1Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M103.2 363.1L101.1 363.3L101.1 349L103.2 348.8Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M101.1 363.3L99.1 362.9L99.1 348.6L101.1 349Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M99.1 362.9L67.1 351.7L67.1 337.4L99.1 348.6ZM67.1 351.7L65.7 350.9L65.7 336.6L67.1 337.4ZM65.7 350.9L65.3 349.8L65.3 335.5L65.7 336.6Z\"/><path class=\"iso-top\" d=\"M113.3 338.5L114.7 339.3L115.1 340.4L114.3 341.4L104.9 348.1L103.2 348.8L101.1 349L99.1 348.6L67.1 337.4L65.7 336.6L65.3 335.5L66.1 334.5L75.5 327.8L77.1 327.1L79.2 326.9L81.2 327.3Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M115.1 340.4L114.3 341.4L104.9 348.1L103.2 348.8L101.1 349L99.1 348.6L67.1 337.4L65.7 336.6L65.3 335.5\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M115.1 340.4L113.4 341.1L104.1 347.8L102.8 348.3L101.2 348.5L99.6 348.2L67.8 337L66.6 336.4L65.3 335.5\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M65.3 335.5L66.1 334.5L75.5 327.8L77.1 327.1L79.2 326.9L81.2 327.3L113.3 338.5L114.7 339.3L115.1 340.4M115.1 354.6L114.3 355.6L104.9 362.4L103.2 363.1L101.1 363.3L99.1 362.9L67.1 351.7L65.7 350.9L65.3 349.8M115.1 340.4L115.1 354.6M65.3 335.5L65.3 349.8\"/></g><g class=\"iso-dots\" data-tone=\"mid\"><circle cx=\"75\" cy=\"332.6\" r=\"0.45\"/><circle cx=\"107.1\" cy=\"343.9\" r=\"0.45\"/></g></g><g class=\"it\" data-name=\"can.flange\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M101.2 369.5L101.2 368.7L101.3 368L101.4 367.3L101.6 366.5L101.9 365.8L102.2 365L102.5 364.3L103 363.6L103.4 362.9L104 362.2L104.6 361.5L105.2 360.8L105.9 360.1L106.6 359.5L107.4 358.8L108.2 358.2L109.1 357.6L110.1 357L111 356.5L112.1 355.9L113.1 355.4L114.2 354.9L115.3 354.4L116.5 353.9L117.7 353.5L119 353L120.2 352.6L121.5 352.3L122.9 351.9L124.2 351.6L125.6 351.3L127 351L128.4 350.8L129.9 350.6L131.3 350.4L132.8 350.2L134.3 350.1L135.7 350L137.2 349.9L138.7 349.9L140.2 349.9L141.7 349.9L143.2 349.9L144.7 350L146.2 350.1L147.7 350.2L149.2 350.4L150.6 350.6L152.1 350.8L153.5 351L154.9 351.3L156.3 351.6L157.6 351.9L158.9 352.2L160.3 352.6L161.5 353L162.8 353.4L164 353.9L165.2 354.3L166.3 354.8L167.4 355.3L168.5 355.9L169.5 356.4L170.5 357L171.4 357.6L172.3 358.2L173.1 358.8L173.9 359.4L174.7 360.1L175.4 360.7L176 361.4L176.6 362.1L177.1 362.8L177.6 363.5L178 364.2L178.4 365L178.7 365.7L179 366.4L179.2 367.2L179.3 367.9L179.4 368.7L179.5 369.4L179.5 374.8L179.4 375.5L179.4 376.3L179.2 377L179 377.8L178.8 378.5L178.5 379.2L178.1 380L177.7 380.7L177.2 381.4L176.7 382.1L176.1 382.8L175.4 383.5L174.8 384.1L174 384.8L173.2 385.4L172.4 386L171.5 386.6L170.6 387.2L169.6 387.8L168.6 388.4L167.5 388.9L166.4 389.4L165.3 389.9L164.1 390.4L162.9 390.8L161.7 391.2L160.4 391.6L159.1 392L157.8 392.3L156.4 392.7L155 392.9L153.6 393.2L152.2 393.5L150.8 393.7L149.3 393.9L147.9 394L146.4 394.1L144.9 394.2L143.4 394.3L141.9 394.4L140.4 394.4L138.9 394.4L137.4 394.3L135.9 394.3L134.4 394.2L132.9 394L131.5 393.9L130 393.7L128.6 393.5L127.2 393.2L125.8 393L124.4 392.7L123 392.4L121.7 392L120.4 391.7L119.1 391.3L117.9 390.8L116.7 390.4L115.5 389.9L114.3 389.4L113.2 388.9L112.2 388.4L111.1 387.9L110.2 387.3L109.2 386.7L108.3 386.1L107.5 385.5L106.7 384.8L106 384.2L105.3 383.5L104.6 382.9L104 382.2L103.5 381.5L103 380.8L102.6 380L102.2 379.3L101.9 378.6L101.6 377.8L101.4 377.1L101.3 376.3L101.2 375.6L101.2 374.8Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M179.5 374.8L179.4 376.3L179 377.8L178.5 379.2L177.7 380.7L176.7 382.1L175.4 383.5L174 384.8L172.4 386L170.6 387.2L168.6 388.4L166.4 389.4L164.1 390.4L161.7 391.2L159.1 392L156.4 392.7L153.6 393.2L150.8 393.7L147.9 394L144.9 394.2L141.9 394.4L138.9 394.4L138.9 389L141.9 389L144.9 388.9L147.9 388.7L150.8 388.3L153.6 387.9L156.4 387.3L159.1 386.6L161.7 385.9L164.1 385L166.4 384L168.6 383L170.6 381.9L172.4 380.7L174 379.4L175.4 378.1L176.7 376.7L177.7 375.3L178.5 373.9L179 372.4L179.4 370.9L179.5 369.4Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M138.9 394.4L135.9 394.3L132.9 394L130 393.7L127.2 393.2L127.2 387.9L130 388.3L132.9 388.7L135.9 388.9L138.9 389Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M127.2 393.2L124.4 392.7L121.7 392L119.1 391.3L116.7 390.4L114.3 389.4L114.3 384.1L116.7 385L119.1 385.9L121.7 386.7L124.4 387.3L127.2 387.9Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M114.3 389.4L112.2 388.4L110.2 387.3L108.3 386.1L106.7 384.8L105.3 383.5L104 382.2L103 380.8L102.2 379.3L102.2 374L103 375.4L104 376.8L105.3 378.2L106.7 379.5L108.3 380.8L110.2 381.9L112.2 383.1L114.3 384.1Z\"/><path class=\"iso-top\" d=\"M102.2 379.3L101.6 377.8L101.3 376.3L101.2 374.8L101.2 369.5L101.3 371L101.6 372.5L102.2 374ZM172.4 380.7L170.6 381.9L168.6 383L166.4 384L164.1 385L161.7 385.9L159.1 386.6L156.4 387.3L153.6 387.9L150.8 388.3L147.9 388.7L144.9 388.9L141.9 389L138.9 389L135.9 388.9L132.9 388.7L130 388.3L127.2 387.9L124.4 387.3L121.7 386.7L119.1 385.9L116.7 385L114.3 384.1L112.2 383.1L110.2 381.9L108.3 380.8L106.7 379.5L105.3 378.2L104 376.8L103 375.4L102.2 374L101.6 372.5L101.3 371L101.2 369.5L101.3 368L101.6 366.5L102.2 365L103 363.6L104 362.2L105.2 360.8L106.6 359.5L108.2 358.2L110.1 357L112.1 355.9L114.2 354.9L116.5 353.9L119 353L121.5 352.3L124.2 351.6L127 351L129.9 350.6L132.8 350.2L135.7 350L138.7 349.9L141.7 349.9L144.7 350L147.7 350.2L150.6 350.6L153.5 351L156.3 351.6L158.9 352.2L161.5 353L164 353.9L166.3 354.8L168.5 355.9L170.5 357L172.3 358.2L173.9 359.4L175.4 360.7L176.6 362.1L177.6 363.5L178.4 365L179 366.4L179.3 367.9L179.5 369.4L179.4 370.9L179 372.4L178.5 373.9L177.7 375.3L176.7 376.7L175.4 378.1L174 379.4L172.4 380.7L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5L140.3 369.5Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M179.5 369.5L179.4 370.2L179.4 371L179.2 371.7L179 372.4L178.8 373.2L178.4 373.9L178.1 374.6L177.6 375.4L177.2 376.1L176.6 376.8L176 377.5L175.4 378.1L174.7 378.8L174 379.5L173.2 380.1L172.3 380.7L171.5 381.3L170.5 381.9L169.5 382.5L168.5 383L167.5 383.6L166.4 384.1L165.2 384.6L164.1 385L162.8 385.5L161.6 385.9L160.3 386.3L159 386.7L157.7 387L156.3 387.3L155 387.6L153.6 387.9L152.1 388.1L150.7 388.3L149.2 388.5L147.8 388.7L146.3 388.8L144.8 388.9L143.3 389L141.8 389L140.3 389L138.8 389L137.3 389L135.8 388.9L134.3 388.8L132.9 388.7L131.4 388.5L129.9 388.3L128.5 388.1L127.1 387.9L125.7 387.6L124.3 387.3L122.9 387L121.6 386.7L120.3 386.3L119 385.9L117.8 385.5L116.6 385L115.4 384.6L114.3 384.1L113.2 383.6L112.1 383L111.1 382.5L110.1 381.9L109.2 381.3L108.3 380.7L107.5 380.1L106.7 379.5L105.9 378.8L105.2 378.1L104.6 377.5L104 376.8L103.5 376.1L103 375.4L102.6 374.6L102.2 373.9L101.9 373.2L101.6 372.4L101.4 371.7L101.3 371L101.2 370.2L101.2 369.5\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M101.2 369.5L101.2 368.7L101.3 368L101.4 367.3L101.6 366.5L101.9 365.8L102.2 365L102.5 364.3L103 363.6L103.4 362.9L104 362.2L104.6 361.5L105.2 360.8L105.9 360.1L106.6 359.5L107.4 358.8L108.2 358.2L109.1 357.6L110.1 357L111 356.5L112.1 355.9L113.1 355.4L114.2 354.9L115.3 354.4L116.5 353.9L117.7 353.5L119 353L120.2 352.6L121.5 352.3L122.9 351.9L124.2 351.6L125.6 351.3L127 351L128.4 350.8L129.9 350.6L131.3 350.4L132.8 350.2L134.3 350.1L135.7 350L137.2 349.9L138.7 349.9L140.2 349.9L141.7 349.9L143.2 349.9L144.7 350L146.2 350.1L147.7 350.2L149.2 350.4L150.6 350.6L152.1 350.8L153.5 351L154.9 351.3L156.3 351.6L157.6 351.9L158.9 352.2L160.3 352.6L161.5 353L162.8 353.4L164 353.9L165.2 354.3L166.3 354.8L167.4 355.3L168.5 355.9L169.5 356.4L170.5 357L171.4 357.6L172.3 358.2L173.1 358.8L173.9 359.4L174.7 360.1L175.4 360.7L176 361.4L176.6 362.1L177.1 362.8L177.6 363.5L178 364.2L178.4 365L178.7 365.7L179 366.4L179.2 367.2L179.3 367.9L179.4 368.7L179.5 369.4L179.5 374.8L179.4 375.5L179.4 376.3L179.2 377L179 377.8L178.8 378.5L178.5 379.2L178.1 380L177.7 380.7L177.2 381.4L176.7 382.1L176.1 382.8L175.4 383.5L174.8 384.1L174 384.8L173.2 385.4L172.4 386L171.5 386.6L170.6 387.2L169.6 387.8L168.6 388.4L167.5 388.9L166.4 389.4L165.3 389.9L164.1 390.4L162.9 390.8L161.7 391.2L160.4 391.6L159.1 392L157.8 392.3L156.4 392.7L155 392.9L153.6 393.2L152.2 393.5L150.8 393.7L149.3 393.9L147.9 394L146.4 394.1L144.9 394.2L143.4 394.3L141.9 394.4L140.4 394.4L138.9 394.4L137.4 394.3L135.9 394.3L134.4 394.2L132.9 394L131.5 393.9L130 393.7L128.6 393.5L127.2 393.2L125.8 393L124.4 392.7L123 392.4L121.7 392L120.4 391.7L119.1 391.3L117.9 390.8L116.7 390.4L115.5 389.9L114.3 389.4L113.2 388.9L112.2 388.4L111.1 387.9L110.2 387.3L109.2 386.7L108.3 386.1L107.5 385.5L106.7 384.8L106 384.2L105.3 383.5L104.6 382.9L104 382.2L103.5 381.5L103 380.8L102.6 380L102.2 379.3L101.9 378.6L101.6 377.8L101.4 377.1L101.3 376.3L101.2 375.6L101.2 374.8Z\"/></g><g class=\"iso-dots\" data-tone=\"mid\"><circle cx=\"169\" cy=\"379.5\" r=\"0.5\"/><circle cx=\"151.7\" cy=\"386\" r=\"0.5\"/><circle cx=\"130.1\" cy=\"386.2\" r=\"0.5\"/><circle cx=\"112.3\" cy=\"380\" r=\"0.5\"/></g></g><g class=\"it\" data-name=\"can.body\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M107.4 310.6L107.4 309.8L107.5 309.1L107.7 308.3L107.9 307.6L108.2 306.9L108.6 306.1L109 305.4L109.5 304.7L110 304L110.7 303.4L111.4 302.7L112.1 302L112.9 301.4L113.7 300.8L114.7 300.2L115.6 299.6L116.6 299.1L117.7 298.6L118.8 298.1L119.9 297.6L121.1 297.2L122.4 296.7L123.6 296.3L124.9 296L126.3 295.7L127.6 295.3L129 295.1L130.4 294.8L131.9 294.6L133.3 294.5L134.8 294.3L136.3 294.2L137.7 294.1L139.2 294.1L140.7 294.1L142.2 294.1L143.7 294.2L145.2 294.3L146.6 294.4L148.1 294.5L149.5 294.7L151 295L152.4 295.2L153.7 295.5L155.1 295.8L156.4 296.2L157.7 296.5L158.9 297L160.1 297.4L161.3 297.9L162.4 298.3L163.5 298.9L164.6 299.4L165.5 299.9L166.5 300.5L167.4 301.1L168.2 301.7L168.9 302.4L169.7 303L170.3 303.7L170.9 304.4L171.4 305.1L171.9 305.8L172.3 306.5L172.6 307.2L172.9 308L173.1 308.7L173.2 309.5L173.3 310.2L173.3 369.1L173.3 369.8L173.2 370.6L173.1 371.3L172.9 372.1L172.6 372.8L172.3 373.5L171.9 374.2L171.4 374.9L170.9 375.6L170.3 376.3L169.6 377L168.9 377.7L168.2 378.3L167.3 378.9L166.4 379.5L165.5 380.1L164.5 380.6L163.5 381.2L162.4 381.7L161.3 382.2L160.1 382.6L158.9 383.1L157.6 383.5L156.4 383.9L155 384.2L153.7 384.5L152.3 384.8L150.9 385.1L149.5 385.3L148.1 385.5L146.6 385.6L145.1 385.8L143.6 385.9L142.2 385.9L140.7 385.9L139.2 385.9L137.7 385.9L136.2 385.8L134.7 385.7L133.3 385.6L131.8 385.4L130.4 385.2L129 384.9L127.6 384.7L126.2 384.4L124.9 384L123.6 383.7L122.3 383.3L121.1 382.9L119.9 382.4L118.8 381.9L117.7 381.4L116.6 380.9L115.6 380.4L114.6 379.8L113.7 379.2L112.9 378.6L112.1 378L111.3 377.3L110.7 376.6L110 376L109.5 375.3L109 374.6L108.6 373.9L108.2 373.1L107.9 372.4L107.7 371.7L107.5 370.9L107.4 370.2L107.4 369.4Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M173.3 369.2L173.2 370.6L172.9 372.1L172.2 373.6L171.4 375L170.3 376.3L168.9 377.7L167.3 378.9L165.5 380.1L163.5 381.2L161.3 382.2L159 383.1L156.4 383.8L153.8 384.5L151.1 385L148.2 385.5L145.3 385.7L142.4 385.9L139.4 385.9L139.4 327L142.4 327L145.3 326.9L148.2 326.6L151.1 326.2L153.8 325.6L156.4 324.9L159 324.2L161.3 323.3L163.5 322.3L165.5 321.2L167.3 320L168.9 318.8L170.3 317.5L171.4 316.1L172.2 314.7L172.9 313.2L173.2 311.8L173.3 310.3Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M139.4 385.9L136.5 385.8L133.5 385.6L130.7 385.2L130.7 326.3L133.5 326.7L136.5 326.9L139.4 327Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M130.7 385.2L127.9 384.7L125.2 384.1L122.6 383.4L120.2 382.5L118 381.6L118 322.7L120.2 323.6L122.6 324.5L125.2 325.2L127.9 325.8L130.7 326.3Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M118 381.6L115.9 380.5L114 379.4L112.3 378.2L110.9 376.9L109.7 375.5L108.7 374.1L108.7 315.2L109.7 316.6L110.9 318L112.3 319.3L114 320.5L115.9 321.6L118 322.7Z\"/><path class=\"iso-top\" d=\"M108.7 374.1L108 372.7L107.5 371.2L107.4 369.7L107.4 310.9L107.5 312.3L108 313.8L108.7 315.2ZM167.3 320L165.5 321.2L163.5 322.3L161.3 323.3L159 324.2L156.4 324.9L153.8 325.6L151.1 326.2L148.2 326.6L145.3 326.9L142.4 327L139.4 327L136.5 326.9L133.5 326.7L130.7 326.3L127.9 325.8L125.2 325.2L122.6 324.5L120.2 323.6L118 322.7L115.9 321.6L114 320.5L112.3 319.3L110.9 318L109.7 316.6L108.7 315.2L108 313.8L107.5 312.3L107.4 310.9L107.4 309.4L107.8 307.9L108.4 306.5L109.3 305L110.4 303.7L111.7 302.4L113.3 301.1L115.1 299.9L117.1 298.9L119.3 297.9L121.7 297L124.2 296.2L126.8 295.5L129.6 295L132.4 294.6L135.3 294.3L138.3 294.1L141.2 294.1L144.2 294.2L147.1 294.4L150 294.8L152.7 295.3L155.4 295.9L158 296.7L160.4 297.5L162.7 298.5L164.8 299.5L166.7 300.6L168.3 301.9L169.8 303.2L171 304.5L171.9 305.9L172.7 307.3L173.1 308.8L173.3 310.3L173.2 311.8L172.9 313.2L172.2 314.7L171.4 316.1L170.3 317.5L168.9 318.8L167.3 320L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6L140.3 310.6Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M173.3 310.6L173.3 311.3L173.2 312L173 312.8L172.8 313.5L172.5 314.2L172.1 315L171.7 315.7L171.2 316.4L170.6 317L170 317.7L169.4 318.4L168.6 319L167.8 319.6L167 320.3L166.1 320.8L165.1 321.4L164.1 322L163.1 322.5L162 323L160.9 323.5L159.7 323.9L158.5 324.3L157.2 324.7L155.9 325.1L154.6 325.4L153.3 325.7L151.9 326L150.5 326.2L149.1 326.5L147.7 326.6L146.2 326.8L144.7 326.9L143.3 327L141.8 327L140.3 327.1L138.8 327L137.4 327L135.9 326.9L134.4 326.8L133 326.6L131.5 326.5L130.1 326.2L128.7 326L127.4 325.7L126 325.4L124.7 325.1L123.4 324.7L122.2 324.3L120.9 323.9L119.8 323.5L118.6 323L117.5 322.5L116.5 322L115.5 321.4L114.5 320.8L113.6 320.3L112.8 319.6L112 319L111.3 318.4L110.6 317.7L110 317L109.5 316.4L109 315.7L108.5 315L108.2 314.2L107.9 313.5L107.6 312.8L107.5 312L107.4 311.3L107.4 310.6\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M173.3 349.8L173.2 351.1L172.9 352.4L172.4 353.7L171.7 354.9L170.8 356.1L169.7 357.3L168.4 358.4L167 359.5L165.4 360.5L163.6 361.5L161.7 362.4L159.7 363.2L157.5 363.9L155.3 364.5L152.9 365.1L150.5 365.5L148 365.9L145.5 366.1L142.9 366.3L140.3 366.3L137.7 366.3L135.2 366.1L132.6 365.9L130.1 365.5L127.7 365.1L125.4 364.5L123.1 363.9L120.9 363.2L118.9 362.4L117 361.5L115.3 360.5L113.6 359.5L112.2 358.4L110.9 357.3L109.9 356.1L109 354.9L108.3 353.7L107.8 352.4L107.5 351.1L107.4 349.8M173.3 324.8L173.2 326.1L172.9 327.4L172.4 328.7L171.7 329.9L170.8 331.2L169.7 332.3L168.4 333.5L167 334.5L165.4 335.5L163.6 336.5L161.7 337.4L159.7 338.2L157.5 338.9L155.3 339.5L152.9 340.1L150.5 340.5L148 340.9L145.5 341.1L142.9 341.3L140.3 341.3L137.7 341.3L135.2 341.1L132.6 340.9L130.1 340.5L127.7 340.1L125.4 339.5L123.1 338.9L120.9 338.2L118.9 337.4L117 336.5L115.3 335.5L113.6 334.5L112.2 333.5L110.9 332.3L109.9 331.2L109 329.9L108.3 328.7L107.8 327.4L107.5 326.1L107.4 324.8\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M167.3 358.6L167.3 335M164.4 360.4L164.4 336.8M160.9 362L160.9 338.4M157 363.3L157 339.8M152.8 364.4L152.8 340.8M148.3 365.1L148.3 341.5M143.7 365.5L143.7 342M139 365.6L139 342M134.3 365.3L134.3 341.8M129.8 364.7L129.8 341.2M125.4 363.8L125.4 340.3M121.4 362.6L121.4 339.1M117.8 361.1L117.8 337.6M114.6 359.4L114.6 335.8M111.9 357.5L111.9 333.9M109.8 355.4L109.8 331.8M108.3 353.1L108.3 329.6M172.7 352.1L172.7 328.5M171.6 354.4L171.6 330.8M169.7 356.5L169.7 333\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M107.4 310.6L107.4 309.8L107.5 309.1L107.7 308.3L107.9 307.6L108.2 306.9L108.6 306.1L109 305.4L109.5 304.7L110 304L110.7 303.4L111.4 302.7L112.1 302L112.9 301.4L113.7 300.8L114.7 300.2L115.6 299.6L116.6 299.1L117.7 298.6L118.8 298.1L119.9 297.6L121.1 297.2L122.4 296.7L123.6 296.3L124.9 296L126.3 295.7L127.6 295.3L129 295.1L130.4 294.8L131.9 294.6L133.3 294.5L134.8 294.3L136.3 294.2L137.7 294.1L139.2 294.1L140.7 294.1L142.2 294.1L143.7 294.2L145.2 294.3L146.6 294.4L148.1 294.5L149.5 294.7L151 295L152.4 295.2L153.7 295.5L155.1 295.8L156.4 296.2L157.7 296.5L158.9 297L160.1 297.4L161.3 297.9L162.4 298.3L163.5 298.9L164.6 299.4L165.5 299.9L166.5 300.5L167.4 301.1L168.2 301.7L168.9 302.4L169.7 303L170.3 303.7L170.9 304.4L171.4 305.1L171.9 305.8L172.3 306.5L172.6 307.2L172.9 308L173.1 308.7L173.2 309.5L173.3 310.2L173.3 369.1L173.3 369.8L173.2 370.6L173.1 371.3L172.9 372.1L172.6 372.8L172.3 373.5L171.9 374.2L171.4 374.9L170.9 375.6L170.3 376.3L169.6 377L168.9 377.7L168.2 378.3L167.3 378.9L166.4 379.5L165.5 380.1L164.5 380.6L163.5 381.2L162.4 381.7L161.3 382.2L160.1 382.6L158.9 383.1L157.6 383.5L156.4 383.9L155 384.2L153.7 384.5L152.3 384.8L150.9 385.1L149.5 385.3L148.1 385.5L146.6 385.6L145.1 385.8L143.6 385.9L142.2 385.9L140.7 385.9L139.2 385.9L137.7 385.9L136.2 385.8L134.7 385.7L133.3 385.6L131.8 385.4L130.4 385.2L129 384.9L127.6 384.7L126.2 384.4L124.9 384L123.6 383.7L122.3 383.3L121.1 382.9L119.9 382.4L118.8 381.9L117.7 381.4L116.6 380.9L115.6 380.4L114.6 379.8L113.7 379.2L112.9 378.6L112.1 378L111.3 377.3L110.7 376.6L110 376L109.5 375.3L109 374.6L108.6 373.9L108.2 373.1L107.9 372.4L107.7 371.7L107.5 370.9L107.4 370.2L107.4 369.4Z\"/></g></g><g class=\"it\" data-name=\"can.cap\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M107.4 307.7L107.4 307L107.5 306.2L107.7 305.5L107.9 304.7L108.2 304L108.6 303.3L109 302.6L109.5 301.9L110 301.2L110.7 300.5L111.4 299.8L112.1 299.2L112.9 298.6L113.7 298L114.7 297.4L115.6 296.8L116.6 296.2L122.6 293L123.3 292.7L124.2 292.3L125 291.9L125.9 291.6L126.9 291.3L127.8 291L128.8 290.7L129.8 290.5L130.8 290.2L131.8 290L132.9 289.8L134 289.7L135.1 289.6L136.2 289.5L137.3 289.4L138.4 289.3L139.5 289.3L140.6 289.3L141.7 289.3L142.8 289.3L144 289.4L145.1 289.5L146.1 289.6L147.2 289.8L148.3 289.9L149.3 290.1L150.4 290.3L151.4 290.6L152.4 290.8L153.3 291.1L154.3 291.4L155.2 291.8L156.1 292.1L156.9 292.5L157.7 292.9L158.5 293.3L164.6 296.5L165.5 297.1L166.5 297.7L167.4 298.3L168.2 298.9L168.9 299.5L169.7 300.2L170.3 300.9L170.9 301.5L171.4 302.2L171.9 302.9L172.3 303.7L172.6 304.4L172.9 305.1L173.1 305.9L173.2 306.6L173.3 307.3L173.3 310.2L173.3 310.9L173.2 311.7L173.1 312.4L172.9 313.2L172.6 313.9L172.3 314.6L171.9 315.3L171.4 316.1L170.9 316.8L170.3 317.4L169.6 318.1L168.9 318.8L168.2 319.4L167.3 320L166.4 320.6L165.5 321.2L164.5 321.8L163.5 322.3L162.4 322.8L161.3 323.3L160.1 323.8L158.9 324.2L157.6 324.6L156.4 325L155 325.3L153.7 325.6L152.3 325.9L150.9 326.2L149.5 326.4L148.1 326.6L146.6 326.7L145.1 326.9L143.6 327L142.2 327L140.7 327L139.2 327L137.7 327L136.2 326.9L134.7 326.8L133.3 326.7L131.8 326.5L130.4 326.3L129 326L127.6 325.8L126.2 325.5L124.9 325.1L123.6 324.8L122.3 324.4L121.1 324L119.9 323.5L118.8 323L117.7 322.5L116.6 322L115.6 321.5L114.6 320.9L113.7 320.3L112.9 319.7L112.1 319.1L111.3 318.4L110.7 317.8L110 317.1L109.5 316.4L109 315.7L108.6 315L108.2 314.2L107.9 313.5L107.7 312.8L107.5 312L107.4 311.3L107.4 310.6Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M173.3 310.3L173.2 311.8L172.9 313.2L172.2 314.7L171.4 316.1L170.3 317.5L168.9 318.8L167.3 320L165.5 321.2L163.5 322.3L161.3 323.3L159 324.2L156.4 324.9L153.8 325.6L151.1 326.2L148.2 326.6L145.3 326.9L142.4 327L139.4 327L139.4 324.2L142.4 324.2L145.3 324L148.2 323.7L151.1 323.3L153.8 322.8L156.4 322.1L159 321.3L161.3 320.4L163.5 319.4L165.5 318.3L167.3 317.2L168.9 315.9L170.3 314.6L171.4 313.2L172.2 311.8L172.9 310.4L173.2 308.9L173.3 307.4Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M139.4 327L136.5 326.9L133.5 326.7L130.7 326.3L130.7 323.5L133.5 323.8L136.5 324.1L139.4 324.2ZM161.7 295.4L163.1 296.4L164.2 297.4L165.2 298.5L166 299.6L166.6 300.8L167 302L167.1 303.2L167 304.4L166.8 305.6L166.3 306.8L165.6 307.9L164.7 309L163.6 310.1L162.3 311.1L160.8 312.1L159.2 309.6L160.6 308.7L161.8 307.8L162.8 306.8L163.6 305.8L164.3 304.7L164.7 303.6L165 302.5L165 301.4L164.9 300.3L164.6 299.2L164 298.1L163.3 297.1L162.4 296.1L161.3 295.1L160.1 294.2Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M130.7 326.3L127.9 325.8L125.2 325.2L122.6 324.5L120.2 323.6L118 322.7L118 319.8L120.2 320.8L122.6 321.6L125.2 322.4L127.9 323L130.7 323.5ZM162.7 295.6L164.8 296.6L166.7 297.8L168.3 299L169.8 300.3L171 301.6L171.9 303L172.7 304.5L173.1 305.9L173.3 307.4L173.2 308.9L172.9 310.4L172.2 311.8L171.4 313.2L170.3 314.6L168.9 315.9L167.3 317.2L165.5 318.3L163.5 319.4L161.3 320.4L159 321.3L156.4 322.1L153.4 315.1L155.5 314.5L157.4 313.8L159.2 312.9L160.8 312.1L162.3 311.1L163.6 310.1L164.7 309L165.6 307.9L166.3 306.8L166.8 305.6L167 304.4L167.1 303.2L167 302L166.6 300.8L166 299.6L165.2 298.5L164.2 297.4L163.1 296.4L161.7 295.4L160.2 294.4L158.5 293.6ZM160.8 312.1L159.2 312.9L157.4 313.8L155.5 314.5L153.4 315.1L151.3 315.6L149 316.1L146.7 316.4L146.2 313.6L148.4 313.3L150.4 312.9L152.4 312.4L154.3 311.8L156.1 311.2L157.7 310.4L159.2 309.6Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M118 322.7L115.9 321.6L114 320.5L112.3 319.3L110.9 318L109.7 316.6L108.7 315.2L108.7 312.4L109.7 313.8L110.9 315.1L112.3 316.4L114 317.6L115.9 318.8L118 319.8ZM156.4 322.1L153.8 322.8L151.1 323.3L148.2 323.7L145.3 324L142.4 324.2L139.4 324.2L139.6 316.8L142 316.8L144.4 316.7L146.7 316.4L149 316.1L151.3 315.6L153.4 315.1ZM146.7 316.4L144.4 316.7L142 316.8L139.6 316.8L137.2 316.7L134.8 316.5L135.2 313.7L137.4 313.9L139.6 314L141.9 314L144.1 313.9L146.2 313.6Z\"/><path class=\"iso-top\" d=\"M108.7 315.2L108 313.8L107.5 312.3L107.4 310.9L107.4 308L107.5 309.5L108 310.9L108.7 312.4ZM139.4 324.2L136.5 324.1L133.5 323.8L130.7 323.5L127.9 323L125.2 322.4L122.6 321.6L120.2 320.8L118 319.8L115.9 318.8L114 317.6L112.3 316.4L110.9 315.1L109.7 313.8L108.7 312.4L108 310.9L107.5 309.5L107.4 308L107.4 306.5L107.8 305.1L108.4 303.6L109.3 302.2L110.4 300.8L111.7 299.5L113.3 298.3L115.1 297.1L117.1 296L121.5 293.9L119.8 294.8L118.4 295.7L117.1 296.8L116 297.8L115.1 298.9L114.4 300.1L113.9 301.3L113.6 302.5L113.5 303.7L113.7 304.9L114.1 306L114.6 307.2L115.4 308.4L116.4 309.4L117.6 310.5L118.9 311.5L120.5 312.4L122.1 313.3L124 314L126 314.7L128 315.3L130.2 315.8L132.5 316.2L134.8 316.5L137.2 316.7L139.6 316.8ZM134.8 316.5L132.5 316.2L130.2 315.8L128 315.3L126 314.7L124 314L122.1 313.3L120.5 312.4L118.9 311.5L117.6 310.5L116.4 309.4L115.4 308.4L114.6 307.2L114.1 306L113.7 304.9L113.5 303.7L113.6 302.5L113.9 301.3L114.4 300.1L115.1 298.9L116 297.8L117.1 296.8L118.4 295.7L120.1 294.6L118.9 295.5L117.9 296.5L117 297.5L116.4 298.6L115.9 299.6L115.7 300.8L115.6 301.9L115.7 303L116.1 304.1L116.6 305.1L117.3 306.2L118.2 307.2L119.3 308.2L120.6 309.1L122 309.9L123.5 310.7L125.2 311.4L127.1 312.1L129 312.6L131 313.1L133.1 313.5L135.2 313.7ZM160.6 308.7L159.2 309.6L157.7 310.4L156.1 311.2L154.3 311.8L152.4 312.4L150.4 312.9L148.4 313.3L146.2 313.6L144.1 313.9L141.9 314L139.6 314L137.4 313.9L135.2 313.7L133.1 313.5L131 313.1L129 312.6L127.1 312.1L125.2 311.4L123.5 310.7L122 309.9L120.6 309.1L119.3 308.2L118.2 307.2L117.3 306.2L116.6 305.1L116.1 304.1L115.7 303L115.6 301.9L115.7 300.8L115.9 299.6L116.4 298.6L117 297.5L117.9 296.5L118.9 295.5L120.1 294.6L121.4 293.7L122.9 292.9L124.6 292.1L126.3 291.4L128.2 290.9L130.2 290.4L132.3 290L134.4 289.6L136.6 289.4L138.8 289.3L141 289.3L143.2 289.4L145.4 289.5L147.5 289.8L149.6 290.2L151.7 290.7L153.6 291.2L155.4 291.8L157.1 292.6L158.7 293.3L160.1 294.2L161.3 295.1L162.4 296.1L163.3 297.1L164 298.1L164.6 299.2L164.9 300.3L165 301.4L165 302.5L164.7 303.6L164.3 304.7L163.6 305.8L162.8 306.8L161.8 307.8L160.6 308.7L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6L140.3 301.6Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M173.3 307.7L173.3 308.5L173.2 309.2L173 309.9L172.8 310.7L172.5 311.4L172.1 312.1L171.7 312.8L171.2 313.5L170.6 314.2L170 314.9L169.4 315.5L168.6 316.2L167.8 316.8L167 317.4L166.1 318L165.1 318.6L164.1 319.1L163.1 319.6L162 320.1L160.9 320.6L159.7 321L158.5 321.5L157.2 321.9L155.9 322.2L154.6 322.6L153.3 322.9L151.9 323.1L150.5 323.4L149.1 323.6L147.7 323.8L146.2 323.9L144.7 324L143.3 324.1L141.8 324.2L140.3 324.2L138.8 324.2L137.4 324.1L135.9 324L134.4 323.9L133 323.8L131.5 323.6L130.1 323.4L128.7 323.1L127.4 322.9L126 322.6L124.7 322.2L123.4 321.9L122.2 321.5L120.9 321L119.8 320.6L118.6 320.1L117.5 319.6L116.5 319.1L115.5 318.6L114.5 318L113.6 317.4L112.8 316.8L112 316.2L111.3 315.5L110.6 314.9L110 314.2L109.5 313.5L109 312.8L108.5 312.1L108.2 311.4L107.9 310.7L107.6 309.9L107.5 309.2L107.4 308.5L107.4 307.7M162.2 295.7L163 296.3L163.8 297L164.4 297.6L165.1 298.3L165.6 299L166 299.7L166.4 300.4L166.7 301.1L166.9 301.9L167.1 302.6L167.1 303.3L167.1 304.1L167 304.8L166.8 305.6L166.5 306.3L166.1 307L165.7 307.7L165.2 308.4L164.6 309.1L163.9 309.7L163.2 310.4L162.4 311L161.5 311.6L160.6 312.2L159.6 312.7L158.5 313.3L157.4 313.7L156.2 314.2L155 314.6L153.8 315L152.5 315.4L151.1 315.7L149.8 316L148.3 316.2L146.9 316.4L145.5 316.6L144 316.7L142.5 316.8L141.1 316.8L139.6 316.8L138.1 316.8L136.6 316.7L135.2 316.6L133.7 316.4L132.3 316.2L130.9 316L129.5 315.7L128.2 315.4L126.9 315L125.6 314.6L124.4 314.2L123.2 313.7L122.1 313.3L121.1 312.7L120.1 312.2L119.1 311.6L118.2 311L117.4 310.4L116.7 309.7L116 309.1L115.5 308.4L114.9 307.7L114.5 307L114.1 306.3L113.9 305.6L113.7 304.8L113.6 304.1L113.5 303.3L113.6 302.6L113.7 301.9L113.9 301.1L114.2 300.4L114.6 299.7L115.1 299L115.6 298.3L116.2 297.6L116.9 297L117.6 296.3L118.4 295.7M160.5 294.5L161.3 295.1L162.1 295.8L162.7 296.4L163.3 297.1L163.8 297.8L164.2 298.5L164.6 299.2L164.8 300L165 300.7L165 301.4L165 302.2L164.9 302.9L164.7 303.7L164.4 304.4L164.1 305.1L163.6 305.8L163.1 306.5L162.4 307.2L161.7 307.8L161 308.4L160.1 309.1L159.2 309.6L158.2 310.2L157.2 310.7L156 311.2L154.9 311.6L153.6 312.1L152.4 312.4L151.1 312.8L149.7 313.1L148.3 313.3L146.9 313.6L145.5 313.7L144 313.9L142.5 314L141.1 314L139.6 314L138.1 314L136.6 313.9L135.2 313.7L133.7 313.6L132.3 313.3L130.9 313.1L129.6 312.8L128.3 312.4L127 312.1L125.8 311.6L124.6 311.2L123.5 310.7L122.4 310.2L121.4 309.6L120.5 309.1L119.7 308.4L118.9 307.8L118.2 307.2L117.6 306.5L117 305.8L116.6 305.1L116.2 304.4L115.9 303.7L115.7 302.9L115.6 302.2L115.6 301.4L115.7 300.7L115.8 300L116.1 299.2L116.4 298.5L116.8 297.8L117.3 297.1L117.9 296.4L118.6 295.8L119.3 295.1L120.1 294.5\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M107.4 307.7L107.4 307L107.5 306.2L107.7 305.5L107.9 304.7L108.2 304L108.6 303.3L109 302.6L109.5 301.9L110 301.2L110.7 300.5L111.4 299.8L112.1 299.2L112.9 298.6L113.7 298L114.7 297.4L115.6 296.8L116.6 296.2L122.6 293L123.3 292.7L124.2 292.3L125 291.9L125.9 291.6L126.9 291.3L127.8 291L128.8 290.7L129.8 290.5L130.8 290.2L131.8 290L132.9 289.8L134 289.7L135.1 289.6L136.2 289.5L137.3 289.4L138.4 289.3L139.5 289.3L140.6 289.3L141.7 289.3L142.8 289.3L144 289.4L145.1 289.5L146.1 289.6L147.2 289.8L148.3 289.9L149.3 290.1L150.4 290.3L151.4 290.6L152.4 290.8L153.3 291.1L154.3 291.4L155.2 291.8L156.1 292.1L156.9 292.5L157.7 292.9L158.5 293.3L164.6 296.5L165.5 297.1L166.5 297.7L167.4 298.3L168.2 298.9L168.9 299.5L169.7 300.2L170.3 300.9L170.9 301.5L171.4 302.2L171.9 302.9L172.3 303.7L172.6 304.4L172.9 305.1L173.1 305.9L173.2 306.6L173.3 307.3L173.3 310.2L173.3 310.9L173.2 311.7L173.1 312.4L172.9 313.2L172.6 313.9L172.3 314.6L171.9 315.3L171.4 316.1L170.9 316.8L170.3 317.4L169.6 318.1L168.9 318.8L168.2 319.4L167.3 320L166.4 320.6L165.5 321.2L164.5 321.8L163.5 322.3L162.4 322.8L161.3 323.3L160.1 323.8L158.9 324.2L157.6 324.6L156.4 325L155 325.3L153.7 325.6L152.3 325.9L150.9 326.2L149.5 326.4L148.1 326.6L146.6 326.7L145.1 326.9L143.6 327L142.2 327L140.7 327L139.2 327L137.7 327L136.2 326.9L134.7 326.8L133.3 326.7L131.8 326.5L130.4 326.3L129 326L127.6 325.8L126.2 325.5L124.9 325.1L123.6 324.8L122.3 324.4L121.1 324L119.9 323.5L118.8 323L117.7 322.5L116.6 322L115.6 321.5L114.6 320.9L113.7 320.3L112.9 319.7L112.1 319.1L111.3 318.4L110.7 317.8L110 317.1L109.5 316.4L109 315.7L108.6 315L108.2 314.2L107.9 313.5L107.7 312.8L107.5 312L107.4 311.3L107.4 310.6Z\"/></g></g><g class=\"it\" data-name=\"can.gland\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M127.5 294.7L127.7 293.9L128 293.2L128.4 292.5L130 290.7L130.5 290.1L131.2 289.5L132 289L132.9 288.6L133.9 288.2L135 287.8L136.2 287.6L137.4 287.3L138.7 287.2L140 287.2L141.3 287.2L142.6 287.3L143.8 287.4L145 287.7L146.2 288L147.2 288.4L148.2 288.8L149 289.3L149.8 289.8L150.4 290.4L151.9 292.2L152.4 292.9L152.8 293.6L153 294.3L153.1 295L153.1 301.8L153 302.6L152.7 303.3L152.2 304L151.6 304.7L150.8 305.3L149.9 305.9L148.8 306.4L147.6 306.9L146.4 307.3L145 307.6L143.6 307.8L142.2 308L140.7 308L139.2 308L137.7 307.9L136.3 307.7L134.9 307.4L133.6 307.1L132.4 306.7L131.3 306.2L130.3 305.6L129.4 305L128.7 304.3L128.2 303.7L127.8 302.9L127.6 302.2L127.5 301.5Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M153.1 301.8L152.8 303L152 304.2L150.8 305.3L149.2 306.3L147.2 307L145 307.6L142.5 307.9L140 308L140 301.2L142.5 301.2L145 300.8L147.2 300.2L149.2 299.5L150.8 298.5L152 297.4L152.8 296.2L153.1 295ZM152.2 292.5L152.9 293.8L153.1 295L152.8 296.2L152 297.4L150.8 298.5L149.4 295.9L150.5 295L151.2 293.9L151.4 292.8L151.3 291.8L150.7 290.7Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M140 308L137.6 307.9L135.2 307.5L135.2 300.7L137.6 301.1L140 301.2ZM150.8 298.5L149.2 299.5L147.2 300.2L145 300.8L144.4 297.9L146.3 297.4L148 296.7L149.4 295.9Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M135.2 307.5L133 306.9L131.1 306.1L131.1 299.3L133 300.1L135.2 300.7ZM145 300.8L142.5 301.2L140 301.2L140.1 298.3L142.3 298.2L144.4 297.9Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M131.1 306.1L129.5 305.1L128.4 304L127.7 302.8L127.7 296L128.4 297.2L129.5 298.3L131.1 299.3ZM140 301.2L137.6 301.1L135.2 300.7L135.8 297.8L137.9 298.2L140.1 298.3Z\"/><path class=\"iso-top\" d=\"M127.7 302.8L127.5 301.5L127.5 294.7L127.7 296ZM135.2 300.7L133 300.1L131.1 299.3L129.5 298.3L128.4 297.2L127.7 296L127.5 294.7L127.8 293.5L128.6 292.3L130.1 290.5L129.5 291.5L129.2 292.6L129.4 293.7L129.9 294.7L130.9 295.7L132.3 296.6L133.9 297.3L135.8 297.8ZM149.4 295.9L148 296.7L146.3 297.4L144.4 297.9L142.3 298.2L140.1 298.3L137.9 298.2L135.8 297.8L133.9 297.3L132.3 296.6L130.9 295.7L129.9 294.7L129.4 293.7L129.2 292.6L129.5 291.5L130.1 290.5L131.2 289.5L132.6 288.7L134.3 288L136.3 287.5L138.4 287.2L140.6 287.2L142.7 287.3L144.8 287.6L146.7 288.2L148.4 288.9L149.7 289.7L150.7 290.7L151.3 291.8L151.4 292.8L151.2 293.9L150.5 295L149.4 295.9L140.3 292.7L140.3 292.7L140.3 292.7L140.3 292.7L140.3 292.7L140.3 292.7L140.3 292.7L140.3 292.7L140.3 292.7L140.3 292.7L140.3 292.7L140.3 292.7L140.3 292.7L140.3 292.7L140.3 292.7L140.3 292.7L140.3 292.7L140.3 292.7L140.3 292.7L140.3 292.7L140.3 292.7L140.3 292.7L140.3 292.7L140.3 292.7L140.3 292.7L140.3 292.7L140.3 292.7L140.3 292.7L140.3 292.7L140.3 292.7L140.3 292.7L140.3 292.7L140.3 292.7Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M153.1 294.9L153 295.6L152.8 296.3L152.3 297L151.7 297.7L151 298.4L150.1 299L149.1 299.5L147.9 300L146.7 300.4L145.4 300.7L144 301L142.5 301.2L141.1 301.2L139.6 301.2L138.1 301.2L136.7 301L135.3 300.7L133.9 300.4L132.7 300L131.6 299.5L130.5 299L129.6 298.4L128.9 297.7L128.3 297L127.9 296.3L127.6 295.6L127.5 294.9M150.6 290.6L151.1 291.3L151.3 292L151.4 292.7L151.4 293.4L151.1 294.2L150.6 294.8L150 295.5L149.2 296.1L148.2 296.7L147.1 297.1L145.9 297.5L144.6 297.9L143.2 298.1L141.8 298.2L140.3 298.3L138.9 298.2L137.4 298.1L136.1 297.9L134.8 297.5L133.5 297.1L132.4 296.7L131.5 296.1L130.7 295.5L130 294.8L129.6 294.2L129.3 293.4L129.2 292.7L129.3 292L129.6 291.3L130.1 290.6\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M127.5 294.7L127.7 293.9L128 293.2L128.4 292.5L130 290.7L130.5 290.1L131.2 289.5L132 289L132.9 288.6L133.9 288.2L135 287.8L136.2 287.6L137.4 287.3L138.7 287.2L140 287.2L141.3 287.2L142.6 287.3L143.8 287.4L145 287.7L146.2 288L147.2 288.4L148.2 288.8L149 289.3L149.8 289.8L150.4 290.4L151.9 292.2L152.4 292.9L152.8 293.6L153 294.3L153.1 295L153.1 301.8L153 302.6L152.7 303.3L152.2 304L151.6 304.7L150.8 305.3L149.9 305.9L148.8 306.4L147.6 306.9L146.4 307.3L145 307.6L143.6 307.8L142.2 308L140.7 308L139.2 308L137.7 307.9L136.3 307.7L134.9 307.4L133.6 307.1L132.4 306.7L131.3 306.2L130.3 305.6L129.4 305L128.7 304.3L128.2 303.7L127.8 302.9L127.6 302.2L127.5 301.5Z\"/></g><path class=\"iso-line\" data-tone=\"faint\" d=\"M145.6 294.6L144.4 295.2L143 295.6L141.4 295.9L139.8 295.9L138.1 295.7L136.7 295.3L135.4 294.8L134.5 294.1L134 293.3L134 292.4L134.3 291.6L135.1 290.9L136.2 290.3L137.6 289.8L139.2 289.6L140.9 289.5L142.5 289.7L144 290.1L145.2 290.7L146.1 291.4L146.6 292.2L146.7 293L146.3 293.8Z\"/></g><g class=\"it\" data-name=\"rod\" data-move=\"rod\" data-hold-group><clipPath id=\"mt-rod\"><path data-hold d=\"M134.6 206.3L134.6 205.9L134.7 205.6L135 205.2L135.3 204.9L135.6 204.5L136.1 204.2L136.7 204L137.3 203.8L137.9 203.6L138.6 203.5L139.3 203.4L140.1 203.3L140.8 203.3L141.6 203.4L142.3 203.5L143 203.6L143.6 203.8L144.2 204.1L144.7 204.3L145.1 204.6L145.5 205L145.8 205.3L145.9 205.7L146 206L146 292.6L146 293L145.9 293.3L145.7 293.7L145.4 294L145 294.4L144.5 294.6L144 294.9L143.4 295.1L142.7 295.3L142 295.4L141.3 295.5L140.6 295.6L139.8 295.6L139.1 295.5L138.4 295.4L137.7 295.3L137 295.1L136.5 294.8L135.9 294.6L135.5 294.3L135.1 293.9L134.9 293.6L134.7 293.2L134.6 292.8Z\"/></clipPath><g clip-path=\"url(#mt-rod)\"><g class=\"iso-solid\" data-lit=\"\"><path class=\"iso-fill\" d=\"M135 275.7L135.1 275.2L135.4 274.7L135.9 274.2L136.6 273.8L137.4 273.5L138.4 273.3L139.4 273.1L140.4 273.1L141.5 273.2L142.5 273.3L143.4 273.6L144.2 273.9L144.8 274.3L145.3 274.8L145.6 275.3L145.7 275.8L145.7 362.4L145.6 362.9L145.2 363.4L144.7 363.9L144 364.3L143.2 364.6L142.3 364.8L141.3 365L140.2 365L139.2 364.9L138.2 364.8L137.2 364.5L136.4 364.2L135.8 363.8L135.3 363.3L135 362.8L135 362.3Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M145.7 362.4L145.6 362.9L145.2 363.4L144.7 363.9L144 364.3L143.2 364.6L142.3 364.8L141.3 365L140.2 365L140.2 278.4L141.3 278.4L142.3 278.3L143.2 278L144 277.7L144.7 277.3L145.2 276.8L145.6 276.3L145.7 275.8Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M140.2 365L139.2 364.9L138.2 364.8L138.2 278.2L139.2 278.4L140.2 278.4Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M138.2 364.8L137.2 364.5L136.4 364.2L136.4 277.6L137.2 278L138.2 278.2Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M136.4 364.2L135.8 363.8L135.3 363.3L135 362.8L135 276.2L135.3 276.7L135.8 277.2L136.4 277.6Z\"/><path class=\"iso-top\" d=\"M135 362.8L135 362.3L135 275.7L135 276.2ZM144.7 277.3L144 277.7L143.2 278L142.3 278.3L141.3 278.4L140.2 278.4L139.2 278.4L138.2 278.2L137.2 278L136.4 277.6L135.8 277.2L135.3 276.7L135 276.2L135 275.7L135.1 275.2L135.4 274.7L135.9 274.2L136.6 273.8L137.4 273.5L138.4 273.3L139.4 273.1L140.4 273.1L141.5 273.2L142.5 273.3L143.4 273.6L144.2 273.9L144.8 274.3L145.3 274.8L145.6 275.3L145.7 275.8L145.6 276.3L145.2 276.8L144.7 277.3L140.3 275.8L140.3 275.8L140.3 275.8L140.3 275.8L140.3 275.8L140.3 275.8L140.3 275.8L140.3 275.8L140.3 275.8L140.3 275.8L140.3 275.8L140.3 275.8L140.3 275.8L140.3 275.8L140.3 275.8L140.3 275.8L140.3 275.8L140.3 275.8L140.3 275.8L140.3 275.8L140.3 275.8L140.3 275.8L140.3 275.8L140.3 275.8L140.3 275.8L140.3 275.8L140.3 275.8L140.3 275.8L140.3 275.8L140.3 275.8L140.3 275.8L140.3 275.8L140.3 275.8Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M145.7 275.8L145.5 276.5L145 277.1L144.1 277.7L143 278.1L141.7 278.4L140.3 278.4L138.9 278.4L137.6 278.1L136.5 277.7L135.7 277.1L135.1 276.5L135 275.8\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M135 275.7L135.1 275.2L135.4 274.7L135.9 274.2L136.6 273.8L137.4 273.5L138.4 273.3L139.4 273.1L140.4 273.1L141.5 273.2L142.5 273.3L143.4 273.6L144.2 273.9L144.8 274.3L145.3 274.8L145.6 275.3L145.7 275.8L145.7 362.4L145.6 362.9L145.2 363.4L144.7 363.9L144 364.3L143.2 364.6L142.3 364.8L141.3 365L140.2 365L139.2 364.9L138.2 364.8L137.2 364.5L136.4 364.2L135.8 363.8L135.3 363.3L135 362.8L135 362.3Z\"/></g></g></g><g class=\"it\" data-name=\"can.boss\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M132.2 350.8L132.5 348L132.6 347L132.9 346L133.5 345.1L134.3 344.3L135.2 343.6L136.3 343.2L137.4 342.9L138.6 342.8L139.8 343L141 343.3L142.1 343.8L143 344.5L143.8 345.3L144.3 346.3L144.7 347.3L144.8 348.3L144.5 351.1L144.4 352.2L144 353.2L143.5 354.1L142.7 354.9L141.8 355.5L140.7 356L139.5 356.2L138.3 356.3L137.1 356.2L136 355.8L134.9 355.3L134 354.6L133.2 353.8L132.6 352.8L132.3 351.8Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M144.5 351.1L144.4 350.1L144 349.1L143.5 348.1L142.7 347.3L143 344.5L143.8 345.3L144.3 346.3L144.7 347.3L144.8 348.3Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M142.7 347.3L141.8 346.6L142.1 343.8L143 344.5ZM138.3 350.9L138.3 350.9L138.3 350.9L138.3 350.9L138.3 350.9L138.3 350.9L138.3 350.9L138.3 350.9L138.3 350.9L138.3 350.9L138.3 350.9L138.3 350.9L138.3 350.9L138.3 350.9L138.3 350.9L138.3 350.9L138.3 350.9L138.3 350.9L138.3 350.9L138.3 350.9L138.3 350.9L138.3 350.9L138.3 350.9L138.3 350.9L138.3 350.9L138.3 350.9L138.3 350.9L138.3 350.9L138.3 350.9L138.3 350.9L138.3 350.9L138.3 350.9L138.3 350.9L138.3 345.6L139.5 345.7L140.7 346.1L141.8 346.6L142.7 347.3L143.5 348.1L144 349.1L144.4 350.1L144.5 351.1L144.4 352.2L144 353.2L143.5 354.1L142.7 354.9L141.8 355.5L140.7 356L139.5 356.2L138.3 356.3L137.1 356.2L136 355.8L134.9 355.3L134 354.6L133.2 353.8L132.6 352.8L132.3 351.8L132.2 350.8L132.3 349.7L132.6 348.7L133.2 347.8L134 347L134.9 346.4L136 345.9L137.1 345.7L138.3 345.6Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M141.8 346.6L140.7 346.1L141 343.3L142.1 343.8Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M140.7 346.1L139.5 345.7L139.8 343L141 343.3Z\"/><path class=\"iso-top\" d=\"M139.5 345.7L138.3 345.6L137.1 345.7L136 345.9L134.9 346.4L134 347L133.2 347.8L132.6 348.7L132.3 349.7L132.2 350.8L132.5 348L132.6 347L132.9 346L133.5 345.1L134.3 344.3L135.2 343.6L136.3 343.2L137.4 342.9L138.6 342.8L139.8 343Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M144.5 351.6L144.4 350.3L144 349.1L143.3 347.9L142.3 346.9L141 346.2L139.6 345.8L138.2 345.6L136.7 345.7L135.3 346.2L134.1 346.9L133.2 347.9L132.5 349L132.2 350.3\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M132.2 350.8L132.5 348L132.6 347L132.9 346L133.5 345.1L134.3 344.3L135.2 343.6L136.3 343.2L137.4 342.9L138.6 342.8L139.8 343L141 343.3L142.1 343.8L143 344.5L143.8 345.3L144.3 346.3L144.7 347.3L144.8 348.3L144.5 351.1L144.4 352.2L144 353.2L143.5 354.1L142.7 354.9L141.8 355.5L140.7 356L139.5 356.2L138.3 356.3L137.1 356.2L136 355.8L134.9 355.3L134 354.6L133.2 353.8L132.6 352.8L132.3 351.8Z\"/></g></g><g class=\"it\" data-name=\"up.base\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M178.2 377.4L179.3 375.8L205.3 357.3L207.8 356.3L210.9 356L213.9 356.5L291.6 383.7L293.6 384.9L294.2 386.5L294.2 407.9L293.1 409.4L267.1 428L264.6 429L261.5 429.3L258.5 428.8L180.8 401.6L178.8 400.3L178.2 398.8Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M294.2 407.9L293.1 409.4L293.1 388L294.2 386.5ZM293.1 409.4L267.1 428L267.1 406.6L293.1 388ZM267.1 428L264.6 429L264.6 407.6L267.1 406.6Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M264.6 429L261.5 429.3L261.5 407.9L264.6 407.6Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M261.5 429.3L258.5 428.8L258.5 407.3L261.5 407.9Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M258.5 428.8L180.8 401.6L180.8 380.2L258.5 407.3ZM180.8 401.6L178.8 400.3L178.8 378.9L180.8 380.2ZM178.8 400.3L178.2 398.8L178.2 377.4L178.8 378.9Z\"/><path class=\"iso-top\" d=\"M291.6 383.7L293.6 384.9L294.2 386.5L293.1 388L267.1 406.6L264.6 407.6L261.5 407.9L258.5 407.3L180.8 380.2L178.8 378.9L178.2 377.4L179.3 375.8L205.3 357.3L207.8 356.3L210.9 356L213.9 356.5Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M294.2 386.5L293.1 388L267.1 406.6L264.6 407.6L261.5 407.9L258.5 407.3L180.8 380.2L178.8 378.9L178.2 377.4\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M294.2 386.5L292 387.7L266.2 406.2L264.1 407L261.6 407.3L259 406.8L181.7 379.7L179.9 378.7L178.2 377.4\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M294.2 400.8L293.1 402.3L267.1 420.9L264.6 421.9L261.5 422.2L258.5 421.6L180.8 394.4L178.8 393.2L178.2 391.6\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M178.2 377.4L179.3 375.8L205.3 357.3L207.8 356.3L210.9 356L213.9 356.5L291.6 383.7L293.6 384.9L294.2 386.5M294.2 407.9L293.1 409.4L267.1 428L264.6 429L261.5 429.3L258.5 428.8L180.8 401.6L178.8 400.3L178.2 398.8M294.2 386.5L294.2 407.9M178.2 377.4L178.2 398.8\"/></g><g class=\"iso-dots\" data-tone=\"mid\"><circle cx=\"187.2\" cy=\"377.4\" r=\"0.5\"/><circle cx=\"261.5\" cy=\"403.4\" r=\"0.5\"/></g></g><g class=\"it\" data-name=\"cable.com:1\" data-route=\"cable.com\"><g class=\"tb\"><path class=\"tb-body\" d=\"M136 376.4L136 376.9L136 378.7L136 380.5L136 382.2L136 384L136 385.8L136 387.6L136.1 389.3L136.1 391.1L136.1 392.9L136.1 394.7L136.2 396.6L136.4 398.6L137.1 400.7L138.2 402.7L139.8 404.3L141.5 405.4L141.6 405.5L143.4 402.2L143.3 402.2L142.2 401.4L141.2 400.4L140.5 399.2L140.1 397.8L139.9 396.3L139.8 394.6L139.8 392.9L139.8 391.1L139.8 389.3L139.8 387.5L139.7 385.8L139.7 384L139.7 382.2L139.7 380.5L139.7 378.7L139.7 376.9L139.7 376.4Z\"/><path class=\"tb-shine\" d=\"M136.9 375.4L136.9 376.9L136.9 378.7L137 380.5L137 382.2L137 384L137 385.8L137 387.6L137 389.3L137 391.1L137 392.9L137.1 394.7L137.2 396.5L137.5 398.4L138.3 400.2L139.4 401.8L140.8 403L142.4 403.9L143.3 404.2L143.7 403.4L142.8 403.1L141.4 402.3L140.1 401.3L139.1 399.8L138.4 398.2L138.1 396.4L138 394.6L137.9 392.9L137.9 391.1L137.9 389.3L137.9 387.6L137.9 385.8L137.9 384L137.9 382.2L137.8 380.5L137.8 378.7L137.8 376.9L137.8 375.4Z\"/><path class=\"tb-shade\" d=\"M138.1 375.4L138.1 376.9L138.1 378.7L138.1 380.5L138.1 382.2L138.1 384L138.1 385.8L138.2 387.5L138.2 389.3L138.2 391.1L138.2 392.9L138.2 394.6L138.2 396.4L138.3 398.2L138.6 400L139.4 401.8L140.5 403.4L141.9 404.6L142.9 405.1L143.2 404.5L142.3 403.9L141 402.8L140 401.4L139.3 399.7L139 398L138.9 396.3L138.9 394.6L138.9 392.9L138.9 391.1L138.9 389.3L138.9 387.5L138.9 385.8L138.9 384L138.9 382.2L138.8 380.5L138.8 378.7L138.8 376.9L138.8 375.4Z\"/><path class=\"iso-line tb-edge\" data-tone=\"mid\" d=\"M136 376.4L136 376.9L136 378.7L136 380.5L136 382.2L136 384L136 385.8L136 387.6L136.1 389.3L136.1 391.1L136.1 392.9L136.1 394.7L136.2 396.6L136.4 398.6L137.1 400.7L138.2 402.7L139.8 404.3L141.5 405.4L141.6 405.5M139.7 376.4L139.7 376.9L139.7 378.7L139.7 380.5L139.7 382.2L139.7 384L139.7 385.8L139.8 387.5L139.8 389.3L139.8 391.1L139.8 392.9L139.8 394.6L139.9 396.3L140.1 397.8L140.5 399.2L141.2 400.4L142.2 401.4L143.3 402.2L143.4 402.2\"/></g></g><g class=\"it\" data-name=\"can.stud\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M134.4 352.9L134.6 350.9L134.7 350.2L134.9 349.6L135.3 349.1L135.7 348.6L136.3 348.2L136.9 347.9L137.6 347.8L138.3 347.7L139.1 347.8L139.7 348L140.4 348.3L140.9 348.7L141.4 349.2L141.8 349.8L142 350.4L142 351L141.8 353.1L141.7 353.7L141.5 354.3L141.2 354.9L140.7 355.3L140.2 355.7L139.5 356L138.8 356.2L138.1 356.2L137.4 356.1L136.7 355.9L136.1 355.6L135.5 355.2L135 354.7L134.7 354.1L134.5 353.5Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M141.8 353.1L141.7 352.5L141.5 351.9L141.2 351.3L140.7 350.8L140.9 348.7L141.4 349.2L141.8 349.8L142 350.4L142 351Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M140.7 350.8L140.2 350.4L140.4 348.3L140.9 348.7ZM138.1 353L138.1 353L138.1 353L138.1 353L138.1 353L138.1 353L138.1 353L138.1 353L138.1 353L138.1 353L138.1 353L138.1 353L138.1 353L138.1 353L138.1 353L138.1 353L138.1 353L138.1 353L138.1 353L138.1 353L138.1 353L138.1 353L138.1 353L138.1 353L138.1 353L138.1 353L138.1 353L138.1 353L138.1 353L138.1 353L138.1 353L138.1 353L138.1 353L138.1 349.8L138.8 349.9L139.5 350.1L140.2 350.4L140.7 350.8L141.2 351.3L141.5 351.9L141.7 352.5L141.8 353.1L141.7 353.7L141.5 354.3L141.2 354.9L140.7 355.3L140.2 355.7L139.5 356L138.8 356.2L138.1 356.2L137.4 356.1L136.7 355.9L136.1 355.6L135.5 355.2L135 354.7L134.7 354.1L134.5 353.5L134.4 352.9L134.5 352.3L134.7 351.7L135 351.1L135.5 350.7L136.1 350.3L136.7 350L137.4 349.8L138.1 349.8Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M140.2 350.4L139.5 350.1L139.7 348L140.4 348.3Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M139.5 350.1L138.8 349.9L139.1 347.8L139.7 348Z\"/><path class=\"iso-top\" d=\"M138.8 349.9L138.1 349.8L137.4 349.8L136.7 350L136.1 350.3L135.5 350.7L135 351.1L134.7 351.7L134.5 352.3L134.4 352.9L134.6 350.9L134.7 350.2L134.9 349.6L135.3 349.1L135.7 348.6L136.3 348.2L136.9 347.9L137.6 347.8L138.3 347.7L139.1 347.8Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M141.8 353.4L141.6 352.2L141 351L139.8 350.2L138.5 349.8L137 349.9L135.7 350.5L134.8 351.4L134.4 352.6\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M134.4 352.9L134.6 350.9L134.7 350.2L134.9 349.6L135.3 349.1L135.7 348.6L136.3 348.2L136.9 347.9L137.6 347.8L138.3 347.7L139.1 347.8L139.7 348L140.4 348.3L140.9 348.7L141.4 349.2L141.8 349.8L142 350.4L142 351L141.8 353.1L141.7 353.7L141.5 354.3L141.2 354.9L140.7 355.3L140.2 355.7L139.5 356L138.8 356.2L138.1 356.2L137.4 356.1L136.7 355.9L136.1 355.6L135.5 355.2L135 354.7L134.7 354.1L134.5 353.5Z\"/></g></g><g class=\"it\" data-name=\"scale.board\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M77 16.7L77.3 16L78.9 14.9L80 14.5L81.2 14.7L105.6 23.2L106.2 23.7L106.2 341.3L106 342L104.3 343.1L103.2 343.5L102 343.3L77.7 334.8L77 334.3Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M106.2 341.3L106 342L106 24.3L106.2 23.7ZM106 342L104.3 343.1L104.3 25.5L106 24.3ZM104.3 343.1L103.2 343.5L103.2 25.8L104.3 25.5Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M103.2 343.5L102 343.3L102 25.7L103.2 25.8Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M102 343.3L77.7 334.8L77.7 17.2L102 25.7ZM77.7 334.8L77 334.3L77 16.7L77.7 17.2Z\"/><path class=\"iso-top\" d=\"M105.6 23.2L106.2 23.7L106 24.3L104.3 25.5L103.2 25.8L102 25.7L77.7 17.2L77 16.7L77.3 16L78.9 14.9L80 14.5L81.2 14.7Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M106.2 23.7L106 24.3L104.3 25.5L103.2 25.8L102 25.7L77.7 17.2L77 16.7\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M106.2 23.7L105.2 24.2L103.7 25.2L103.1 25.4L102.3 25.3L78.3 16.9L77 16.7\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M77 16.7L77.3 16L78.9 14.9L80 14.5L81.2 14.7L105.6 23.2L106.2 23.7M106.2 341.3L106 342L104.3 343.1L103.2 343.5L102 343.3L77.7 334.8L77 334.3M106.2 23.7L106.2 341.3M77 16.7L77 334.3\"/></g><path class=\"iso-line\" data-tone=\"mid\" d=\"M101.3 343.1L101.3 25.5M91.2 339.6L91.2 21.9\"/><path class=\"iso-line\" data-tone=\"lo\" d=\"M101.3 281.5L97.6 280.2M101.3 254.8L97.6 253.5M101.3 228L97.6 226.7M101.3 201.2L97.6 199.9M101.3 174.5L97.6 173.2M101.3 147.7L97.6 146.4M101.3 120.9L97.6 119.6M101.3 94.2L97.6 92.9M101.3 67.4L97.6 66.1\"/><path class=\"iso-line\" data-tone=\"mid\" d=\"M101.3 294.9L94.9 292.7M101.3 268.2L91.2 264.6M101.3 241.4L94.9 239.1M101.3 187.9L94.9 185.6M101.3 161.1L91.2 157.5M101.3 134.3L94.9 132.1M101.3 107.6L91.2 104M101.3 80.8L94.9 78.5M101.3 54L91.2 50.5\"/><path class=\"iso-line\" data-tone=\"hi\" d=\"M101.3 214.6L91.2 211.1\" style=\"stroke-width:1.2\"/><g class=\"iso-dots\" data-tone=\"mid\"><circle cx=\"82.3\" cy=\"27.7\" r=\"0.5\"/><circle cx=\"82.3\" cy=\"327.5\" r=\"0.5\"/></g></g><g class=\"it\" data-name=\"index\" data-move=\"rod\"><g class=\"iso-solid\" data-lit=\"\"><path class=\"iso-fill\" d=\"M90.1 252.5L90.3 252.1L92.4 250.6L93.2 250.3L94.2 250.4L132.6 263.9L133.1 264.3L133.1 266.4L132.9 266.9L130.8 268.4L130 268.7L129.1 268.5L90.6 255.1L90.1 254.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M133.1 266.4L132.9 266.9L132.9 264.7L133.1 264.3ZM132.9 266.9L130.8 268.4L130.8 266.3L132.9 264.7ZM130.8 268.4L130 268.7L130 266.5L130.8 266.3Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M130 268.7L129.1 268.5L129.1 266.4L130 266.5Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M129.1 268.5L90.6 255.1L90.6 252.9L129.1 266.4ZM90.6 255.1L90.1 254.7L90.1 252.5L90.6 252.9Z\"/><path class=\"iso-top\" d=\"M132.6 263.9L133.1 264.3L132.9 264.7L130.8 266.3L130 266.5L129.1 266.4L90.6 252.9L90.1 252.5L90.3 252.1L92.4 250.6L93.2 250.3L94.2 250.4Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M133.1 264.3L132.9 264.7L130.8 266.3L130 266.5L129.1 266.4L90.6 252.9L90.1 252.5\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M90.1 252.5L90.3 252.1L92.4 250.6L93.2 250.3L94.2 250.4L132.6 263.9L133.1 264.3M133.1 266.4L132.9 266.9L130.8 268.4L130 268.7L129.1 268.5L90.6 255.1L90.1 254.7M133.1 264.3L133.1 266.4M90.1 252.5L90.1 254.7\"/></g></g><g class=\"it\" data-name=\"collar\" data-move=\"rod\"><g class=\"iso-solid\" data-lit=\"\"><path class=\"iso-fill\" d=\"M129.6 263.2L129.9 262.1L130.5 261.1L131.5 260.2L132.9 259.4L134.6 258.8L136.4 258.3L138.5 258L140.6 257.9L142.6 258L144.6 258.4L146.5 258.9L148.1 259.6L149.4 260.4L150.3 261.3L150.9 262.3L151 263.4L151 275.9L150.8 276.9L150.1 277.9L149.1 278.8L147.7 279.6L146.1 280.3L144.2 280.8L142.2 281L140.1 281.1L138 281L136 280.7L134.2 280.2L132.6 279.5L131.3 278.6L130.3 277.7L129.8 276.7L129.6 275.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M149.1 278.8L147.7 279.6L147.7 267.1L149.1 266.3ZM147.7 279.6L146.1 280.3L146.1 267.8L147.7 267.1ZM151 275.9L150.8 276.9L150.8 264.4L151 263.4ZM150.8 276.9L150.1 277.9L150.1 265.4L150.8 264.4ZM150.1 277.9L149.1 278.8L149.1 266.3L150.1 265.4Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M146.1 280.3L144.2 280.8L144.2 268.3L146.1 267.8ZM144.2 280.8L142.2 281L142.2 268.6L144.2 268.3ZM142.2 281L140.1 281.1L140.1 268.6L142.2 268.6Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M140.1 281.1L138 281L138 268.5L140.1 268.6ZM138 281L136 280.7L136 268.2L138 268.5ZM136 280.7L134.2 280.2L134.2 267.7L136 268.2Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M134.2 280.2L132.6 279.5L132.6 267L134.2 267.7ZM132.6 279.5L131.3 278.6L131.3 266.2L132.6 267ZM131.3 278.6L130.3 277.7L130.3 265.2L131.3 266.2ZM130.3 277.7L129.8 276.7L129.8 264.2L130.3 265.2ZM129.8 276.7L129.6 275.7L129.6 263.2L129.8 264.2Z\"/><path class=\"iso-top\" d=\"M149.1 266.3L147.7 267.1L146.1 267.8L144.2 268.3L142.2 268.6L140.1 268.6L138 268.5L136 268.2L134.2 267.7L132.6 267L131.3 266.2L130.3 265.2L129.8 264.2L129.6 263.2L129.9 262.1L130.5 261.1L131.5 260.2L132.9 259.4L134.6 258.8L136.4 258.3L138.5 258L140.6 257.9L142.6 258L144.6 258.4L146.5 258.9L148.1 259.6L149.4 260.4L150.3 261.3L150.9 262.3L151 263.4L150.8 264.4L150.1 265.4Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M151 263.4L150.8 264.4L150.1 265.4L149.1 266.3L147.7 267.1L146.1 267.8L144.2 268.3L142.2 268.6L140.1 268.6L138 268.5L136 268.2L134.2 267.7L132.6 267L131.3 266.2L130.3 265.2L129.8 264.2L129.6 263.2\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M151 263.4L150 264.3L149.4 265.3L148.4 266.1L147.2 266.8L145.6 267.4L143.9 267.9L142 268.1L140.1 268.2L138.2 268.1L136.3 267.8L134.6 267.3L133.2 266.7L132 265.9L131.1 265.1L130.6 264.1L129.6 263.2\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M129.6 263.2L129.9 262.1L130.5 261.1L131.5 260.2L132.9 259.4L134.6 258.8L136.4 258.3L138.5 258L140.6 257.9L142.6 258L144.6 258.4L146.5 258.9L148.1 259.6L149.4 260.4L150.3 261.3L150.9 262.3L151 263.4M151 275.9L150.8 276.9L150.1 277.9L149.1 278.8L147.7 279.6L146.1 280.3L144.2 280.8L142.2 281L140.1 281.1L138 281L136 280.7L134.2 280.2L132.6 279.5L131.3 278.6L130.3 277.7L129.8 276.7L129.6 275.7M129.6 263.2L129.6 275.7M151 263.4L151 275.9\"/></g><path class=\"iso-line\" data-tone=\"lit\" d=\"M151 269.5L150.9 270.2L150.7 270.9L150.2 271.6L149.6 272.2L148.8 272.8L147.9 273.3L146.8 273.8L145.7 274.2L144.4 274.5L143.1 274.7L141.7 274.8L140.3 274.9L138.9 274.8L137.5 274.7L136.2 274.5L135 274.2L133.8 273.8L132.7 273.3L131.8 272.8L131 272.2L130.4 271.6L130 270.9L129.7 270.2L129.6 269.5\"/></g><g class=\"it\" data-name=\"cable.com:2\" data-route=\"cable.com\"><g class=\"tb\"><path class=\"tb-body\" d=\"M139.7 404.2L139.8 404.3L141.5 405.4L143.2 406.2L144.8 406.8L146.3 407.3L147.8 407.8L149.4 408.4L150.9 408.9L152.4 409.4L153.9 410L155.4 410.5L157 411L158.5 411.6L160 412.1L161.5 412.6L163.1 413.2L164.6 413.7L165.1 413.9L166.3 410.4L165.8 410.2L164.3 409.7L162.8 409.1L161.2 408.6L159.7 408.1L158.2 407.5L156.7 407L155.1 406.5L153.6 405.9L152.1 405.4L150.6 404.9L149.1 404.3L147.5 403.8L146 403.3L144.6 402.8L143.3 402.2L142.2 401.4L142.1 401.4Z\"/><path class=\"tb-shine\" d=\"M140 402.3L140.8 403L142.4 403.9L143.9 404.5L145.4 405L146.9 405.5L148.5 406L150 406.6L151.5 407.1L153 407.6L154.6 408.2L156.1 408.7L157.6 409.2L159.1 409.8L160.6 410.3L162.2 410.8L163.7 411.4L165.2 411.9L166.5 412.4L166.8 411.5L165.5 411.1L164 410.5L162.5 410L160.9 409.5L159.4 408.9L157.9 408.4L156.4 407.9L154.8 407.3L153.3 406.8L151.8 406.3L150.3 405.7L148.8 405.2L147.2 404.7L145.7 404.1L144.2 403.6L142.8 403.1L141.4 402.3L140.7 401.7Z\"/><path class=\"tb-shade\" d=\"M139.8 402.5L140.5 403.4L141.9 404.6L143.5 405.4L145.1 406L146.6 406.6L148.1 407.1L149.6 407.6L151.1 408.2L152.7 408.7L154.2 409.2L155.7 409.7L157.2 410.3L158.7 410.8L160.3 411.3L161.8 411.9L163.3 412.4L164.8 412.9L166.2 413.4L166.4 412.7L165.1 412.2L163.6 411.7L162 411.2L160.5 410.6L159 410.1L157.5 409.6L155.9 409L154.4 408.5L152.9 408L151.4 407.5L149.9 406.9L148.3 406.4L146.8 405.9L145.3 405.3L143.8 404.7L142.3 403.9L141 402.8L140.4 402Z\"/><path class=\"iso-line tb-edge\" data-tone=\"mid\" d=\"M139.7 404.2L139.8 404.3L141.5 405.4L143.2 406.2L144.8 406.8L146.3 407.3L147.8 407.8L149.4 408.4L150.9 408.9L152.4 409.4L153.9 410L155.4 410.5L157 411L158.5 411.6L160 412.1L161.5 412.6L163.1 413.2L164.6 413.7L165.1 413.9M142.1 401.4L142.2 401.4L143.3 402.2L144.6 402.8L146 403.3L147.5 403.8L149.1 404.3L150.6 404.9L152.1 405.4L153.6 405.9L155.1 406.5L156.7 407L158.2 407.5L159.7 408.1L161.2 408.6L162.8 409.1L164.3 409.7L165.8 410.2L166.3 410.4\"/></g></g><g class=\"it\" data-name=\"cable.com:0\" data-route=\"cable.com\"><g class=\"tb\"><path class=\"tb-body\" d=\"M136.3 352.8L136.2 353.7L136.1 354.7L136 355.8L135.9 357.3L135.8 359.1L135.8 361L135.9 362.8L135.9 364.5L135.9 366.3L135.9 368.1L135.9 369.8L135.9 371.6L135.9 373.4L136 375.2L136 376.9L136 378.4L139.7 378.4L139.7 376.9L139.7 375.1L139.6 373.4L139.6 371.6L139.6 369.8L139.6 368L139.6 366.3L139.6 364.5L139.6 362.7L139.6 361L139.6 359.2L139.6 357.4L139.7 356L139.8 355L139.9 354.1L140 353.2ZM139.9 352.8L139.8 352.5L139.7 352.2L139.4 351.9L139.1 351.7L138.7 351.5L138.3 351.4L137.9 351.4L137.5 351.5L137.1 351.6L136.8 351.9L136.5 352.1L136.4 352.5L136.3 352.8L136.3 353.2L136.4 353.5L136.6 353.8L136.8 354.1L137.2 354.4L137.5 354.5L137.9 354.6L138.4 354.6L138.8 354.5L139.1 354.4L139.4 354.2L139.7 353.9L139.9 353.6L140 353.2Z\"/><path class=\"tb-shine\" d=\"M137.2 352.9L137.1 353.8L137 354.8L136.9 355.8L136.8 357.3L136.8 359.1L136.8 361L136.8 362.8L136.8 364.5L136.9 366.3L136.9 368.1L136.9 369.8L136.9 371.6L136.9 373.4L136.9 375.2L136.9 376.9L136.9 378.7L136.9 379.4L137.8 379.4L137.8 378.7L137.8 376.9L137.8 375.1L137.8 373.4L137.8 371.6L137.8 369.8L137.8 368.1L137.7 366.3L137.7 364.5L137.7 362.7L137.7 361L137.7 359.2L137.7 357.4L137.8 355.9L137.8 354.9L137.9 353.9L138 353L138.2 351.4L137.9 351.4L137.5 351.5L137.3 351.6Z\"/><path class=\"tb-shade\" d=\"M138.5 353L138.4 354L138.3 354.9L138.1 355.9L138 357.4L138 359.2L138 361L138 362.7L138 364.5L138 366.3L138 368.1L138 369.8L138 371.6L138 373.4L138.1 375.1L138.1 376.9L138.1 378.7L138.1 379.4L138.8 379.3L138.8 378.7L138.8 376.9L138.8 375.1L138.8 373.4L138.8 371.6L138.8 369.8L138.7 368.1L138.7 366.3L138.7 364.5L138.7 362.7L138.7 361L138.7 359.2L138.8 357.4L138.9 356L139 355L139.1 354.1L139.2 353.1L139.3 351.8L139.1 351.7L138.7 351.5L138.6 351.5Z\"/><path class=\"iso-line tb-edge\" data-tone=\"mid\" d=\"M136.3 352.8L136.2 353.7L136.1 354.7L136 355.8L135.9 357.3L135.8 359.1L135.8 361L135.9 362.8L135.9 364.5L135.9 366.3L135.9 368.1L135.9 369.8L135.9 371.6L135.9 373.4L136 375.2L136 376.9L136 378.4M140 353.2L139.9 354.1L139.8 355L139.7 356L139.6 357.4L139.6 359.2L139.6 361L139.6 362.7L139.6 364.5L139.6 366.3L139.6 368L139.6 369.8L139.6 371.6L139.6 373.4L139.7 375.1L139.7 376.9L139.7 378.4M136.3 352.8L136.4 352.5L136.5 352.1L136.8 351.9L137.1 351.6L137.5 351.5L137.9 351.4L138.3 351.4L138.7 351.5L139.1 351.7L139.4 351.9L139.7 352.2L139.8 352.5L139.9 352.8L140 353.2\"/></g></g><g class=\"it\" data-name=\"lower.arm\" data-move=\"jawL\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M168.6 310L168.9 309.3L172.5 306.7L173.8 306.3L175.3 306.5L195.6 313.6L196.4 314.2L196.4 319.6L196.1 320.4L192.6 322.9L191.2 323.3L189.7 323.1L169.4 316.1L168.6 315.4Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M196.4 319.6L196.1 320.4L196.1 315L196.4 314.2ZM196.1 320.4L192.6 322.9L192.6 317.5L196.1 315ZM192.6 322.9L191.2 323.3L191.2 318L192.6 317.5Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M191.2 323.3L189.7 323.1L189.7 317.8L191.2 318Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M189.7 323.1L169.4 316.1L169.4 310.7L189.7 317.8ZM169.4 316.1L168.6 315.4L168.6 310L169.4 310.7Z\"/><path class=\"iso-top\" d=\"M195.6 313.6L196.4 314.2L196.1 315L192.6 317.5L191.2 318L189.7 317.8L169.4 310.7L168.6 310L168.9 309.3L172.5 306.7L173.8 306.3L175.3 306.5Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M196.4 314.2L196.1 315L192.6 317.5L191.2 318L189.7 317.8L169.4 310.7L168.6 310\"/><path class=\"iso-line iso-bevel\" data-tone=\"lo\" d=\"M196.4 314.2L195.5 314.9L192.1 317.3L191.1 317.7L189.9 317.5L169.9 310.5L168.6 310\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M168.6 310L168.9 309.3L172.5 306.7L173.8 306.3L175.3 306.5L195.6 313.6L196.4 314.2M196.4 319.6L196.1 320.4L192.6 322.9L191.2 323.3L189.7 323.1L169.4 316.1L168.6 315.4M196.4 314.2L196.4 319.6M168.6 310L168.6 315.4\"/></g></g><g class=\"it\" data-name=\"lower.button\" data-move=\"jawL\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M176.3 309.8L176.5 309.1L177.1 308.5L178.1 307.9L179.4 307.6L180.8 307.5L182.2 307.6L183.4 307.9L184.5 308.4L185.1 309L185.4 309.7L185.4 311.5L185.2 312.2L184.5 312.8L183.6 313.4L182.3 313.7L180.9 313.8L179.5 313.7L178.2 313.4L177.2 312.9L176.5 312.3L176.3 311.6Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M184.5 312.8L183.6 313.4L183.6 311.6L184.5 311.1ZM185.4 311.5L185.2 312.2L185.2 310.4L185.4 309.7ZM185.2 312.2L184.5 312.8L184.5 311.1L185.2 310.4Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M183.6 313.4L182.3 313.7L182.3 311.9L183.6 311.6ZM182.3 313.7L180.9 313.8L180.9 312L182.3 311.9Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M180.9 313.8L179.5 313.7L179.5 311.9L180.9 312ZM179.5 313.7L178.2 313.4L178.2 311.6L179.5 311.9Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M178.2 313.4L177.2 312.9L177.2 311.1L178.2 311.6ZM177.2 312.9L176.5 312.3L176.5 310.5L177.2 311.1ZM176.5 312.3L176.3 311.6L176.3 309.8L176.5 310.5Z\"/><path class=\"iso-top\" d=\"M184.5 311.1L183.6 311.6L182.3 311.9L180.9 312L179.5 311.9L178.2 311.6L177.2 311.1L176.5 310.5L176.3 309.8L176.5 309.1L177.1 308.5L178.1 307.9L179.4 307.6L180.8 307.5L182.2 307.6L183.4 307.9L184.5 308.4L185.1 309L185.4 309.7L185.2 310.4Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M185.4 309.7L185.2 310.4L184.5 311.1L183.6 311.6L182.3 311.9L180.9 312L179.5 311.9L178.2 311.6L177.2 311.1L176.5 310.5L176.3 309.8\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M176.3 309.8L176.5 309.1L177.1 308.5L178.1 307.9L179.4 307.6L180.8 307.5L182.2 307.6L183.4 307.9L184.5 308.4L185.1 309L185.4 309.7M185.4 311.5L185.2 312.2L184.5 312.8L183.6 313.4L182.3 313.7L180.9 313.8L179.5 313.7L178.2 313.4L177.2 312.9L176.5 312.3L176.3 311.6M176.3 309.8L176.3 311.6M185.4 309.7L185.4 311.5\"/></g></g><g class=\"it\" data-name=\"cable.com:3\" data-route=\"cable.com\"><g class=\"tb\"><path class=\"tb-body\" d=\"M163.4 413.3L164.6 413.7L166.1 414.2L167.6 414.8L169.1 415.3L170.7 415.8L172.2 416.4L173.7 416.9L175.2 417.4L176.7 417.9L178.3 418.5L179.8 419L181.3 419.5L182.8 420.1L184.4 420.6L185.9 421.1L187.4 421.7L188.2 422L189.5 418.5L188.6 418.2L187.1 417.6L185.6 417.1L184.1 416.6L182.5 416L181 415.5L179.5 415L178 414.4L176.4 413.9L174.9 413.4L173.4 412.9L171.9 412.3L170.4 411.8L168.8 411.3L167.3 410.7L165.8 410.2L164.6 409.8Z\"/><path class=\"tb-shine\" d=\"M163.2 411.2L163.7 411.4L165.2 411.9L166.7 412.4L168.2 413L169.8 413.5L171.3 414L172.8 414.6L174.3 415.1L175.9 415.6L177.4 416.2L178.9 416.7L180.4 417.2L181.9 417.8L183.5 418.3L185 418.8L186.5 419.3L188 419.9L189.5 420.4L189.7 420.5L190 419.6L189.8 419.6L188.3 419L186.8 418.5L185.3 418L183.8 417.4L182.2 416.9L180.7 416.4L179.2 415.8L177.7 415.3L176.1 414.8L174.6 414.2L173.1 413.7L171.6 413.2L170.1 412.6L168.5 412.1L167 411.6L165.5 411.1L164 410.5L163.5 410.3Z\"/><path class=\"tb-shade\" d=\"M162.8 412.2L163.3 412.4L164.8 412.9L166.4 413.5L167.9 414L169.4 414.5L170.9 415.1L172.4 415.6L174 416.1L175.5 416.7L177 417.2L178.5 417.7L180 418.3L181.6 418.8L183.1 419.3L184.6 419.9L186.1 420.4L187.7 420.9L189.2 421.5L189.4 421.5L189.6 420.8L189.4 420.8L187.9 420.2L186.4 419.7L184.9 419.2L183.3 418.6L181.8 418.1L180.3 417.6L178.8 417L177.2 416.5L175.7 416L174.2 415.4L172.7 414.9L171.2 414.4L169.6 413.8L168.1 413.3L166.6 412.8L165.1 412.2L163.6 411.7L163 411.5Z\"/><path class=\"iso-line tb-edge\" data-tone=\"mid\" d=\"M163.4 413.3L164.6 413.7L166.1 414.2L167.6 414.8L169.1 415.3L170.7 415.8L172.2 416.4L173.7 416.9L175.2 417.4L176.7 417.9L178.3 418.5L179.8 419L181.3 419.5L182.8 420.1L184.4 420.6L185.9 421.1L187.4 421.7L188.2 422M164.6 409.8L165.8 410.2L167.3 410.7L168.8 411.3L170.4 411.8L171.9 412.3L173.4 412.9L174.9 413.4L176.4 413.9L178 414.4L179.5 415L181 415.5L182.5 416L184.1 416.6L185.6 417.1L187.1 417.6L188.6 418.2L189.5 418.5\"/></g></g><g class=\"it\" data-name=\"finger.pad.bottom\" data-move=\"rod\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M176.3 286.4L176.5 285.7L177.1 285.1L178.1 284.6L179.4 284.2L180.8 284.1L182.2 284.2L183.4 284.5L184.5 285L185.1 285.6L185.4 286.3L185.4 288.3L185.2 289L184.5 289.6L183.6 290.2L182.3 290.5L180.9 290.6L179.5 290.5L178.2 290.2L177.2 289.7L176.5 289.1L176.3 288.4Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M184.5 289.6L183.6 290.2L183.6 288.2L184.5 287.7ZM185.4 288.3L185.2 289L185.2 287L185.4 286.3ZM185.2 289L184.5 289.6L184.5 287.7L185.2 287Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M183.6 290.2L182.3 290.5L182.3 288.5L183.6 288.2ZM182.3 290.5L180.9 290.6L180.9 288.6L182.3 288.5Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M180.9 290.6L179.5 290.5L179.5 288.5L180.9 288.6ZM179.5 290.5L178.2 290.2L178.2 288.2L179.5 288.5Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M178.2 290.2L177.2 289.7L177.2 287.7L178.2 288.2ZM177.2 289.7L176.5 289.1L176.5 287.1L177.2 287.7ZM176.5 289.1L176.3 288.4L176.3 286.4L176.5 287.1Z\"/><path class=\"iso-top\" d=\"M184.5 287.7L183.6 288.2L182.3 288.5L180.9 288.6L179.5 288.5L178.2 288.2L177.2 287.7L176.5 287.1L176.3 286.4L176.5 285.7L177.1 285.1L178.1 284.6L179.4 284.2L180.8 284.1L182.2 284.2L183.4 284.5L184.5 285L185.1 285.6L185.4 286.3L185.2 287Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M185.4 286.3L185.2 287L184.5 287.7L183.6 288.2L182.3 288.5L180.9 288.6L179.5 288.5L178.2 288.2L177.2 287.7L176.5 287.1L176.3 286.4\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M176.3 286.4L176.5 285.7L177.1 285.1L178.1 284.6L179.4 284.2L180.8 284.1L182.2 284.2L183.4 284.5L184.5 285L185.1 285.6L185.4 286.3M185.4 288.3L185.2 289L184.5 289.6L183.6 290.2L182.3 290.5L180.9 290.6L179.5 290.5L178.2 290.2L177.2 289.7L176.5 289.1L176.3 288.4M176.3 286.4L176.3 288.4M185.4 286.3L185.4 288.3\"/></g></g><g class=\"it\" data-name=\"finger\" data-move=\"rod\"><g class=\"iso-solid\" data-lit=\"\"><path class=\"iso-fill\" d=\"M146.3 271.7L146.6 270.9L150.2 268.4L151.5 268L153.1 268.2L188.8 280.7L189.7 281.4L189.7 286.7L189.4 287.5L185.8 290L184.5 290.4L182.9 290.3L147.2 277.7L146.3 277.1Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M189.7 286.7L189.4 287.5L189.4 282.1L189.7 281.4ZM189.4 287.5L185.8 290L185.8 284.7L189.4 282.1ZM185.8 290L184.5 290.4L184.5 285.1L185.8 284.7Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M184.5 290.4L182.9 290.3L182.9 284.9L184.5 285.1Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M182.9 290.3L147.2 277.7L147.2 272.4L182.9 284.9ZM147.2 277.7L146.3 277.1L146.3 271.7L147.2 272.4Z\"/><path class=\"iso-top\" d=\"M188.8 280.7L189.7 281.4L189.4 282.1L185.8 284.7L184.5 285.1L182.9 284.9L147.2 272.4L146.3 271.7L146.6 270.9L150.2 268.4L151.5 268L153.1 268.2Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M189.7 281.4L189.4 282.1L185.8 284.7L184.5 285.1L182.9 284.9L147.2 272.4L146.3 271.7\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M189.7 281.4L188.8 282L185.4 284.4L184.4 284.8L183.2 284.6L147.6 272.2L146.3 271.7\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M146.3 271.7L146.6 270.9L150.2 268.4L151.5 268L153.1 268.2L188.8 280.7L189.7 281.4M189.7 286.7L189.4 287.5L185.8 290L184.5 290.4L182.9 290.3L147.2 277.7L146.3 277.1M189.7 281.4L189.7 286.7M146.3 271.7L146.3 277.1\"/></g></g><g class=\"it\" data-name=\"finger.pad.top\" data-move=\"rod\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M176.3 279.1L176.5 278.4L177.1 277.8L178.1 277.3L179.4 276.9L180.8 276.8L182.2 276.9L183.4 277.2L184.5 277.7L185.1 278.3L185.4 279L185.4 281L185.2 281.7L184.5 282.3L183.6 282.8L182.3 283.2L180.9 283.3L179.5 283.2L178.2 282.9L177.2 282.4L176.5 281.8L176.3 281.1Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M184.5 282.3L183.6 282.8L183.6 280.9L184.5 280.4ZM185.4 281L185.2 281.7L185.2 279.7L185.4 279ZM185.2 281.7L184.5 282.3L184.5 280.4L185.2 279.7Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M183.6 282.8L182.3 283.2L182.3 281.2L183.6 280.9ZM182.3 283.2L180.9 283.3L180.9 281.3L182.3 281.2Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M180.9 283.3L179.5 283.2L179.5 281.2L180.9 281.3ZM179.5 283.2L178.2 282.9L178.2 280.9L179.5 281.2Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M178.2 282.9L177.2 282.4L177.2 280.4L178.2 280.9ZM177.2 282.4L176.5 281.8L176.5 279.8L177.2 280.4ZM176.5 281.8L176.3 281.1L176.3 279.1L176.5 279.8Z\"/><path class=\"iso-top\" d=\"M184.5 280.4L183.6 280.9L182.3 281.2L180.9 281.3L179.5 281.2L178.2 280.9L177.2 280.4L176.5 279.8L176.3 279.1L176.5 278.4L177.1 277.8L178.1 277.3L179.4 276.9L180.8 276.8L182.2 276.9L183.4 277.2L184.5 277.7L185.1 278.3L185.4 279L185.2 279.7Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M185.4 279L185.2 279.7L184.5 280.4L183.6 280.9L182.3 281.2L180.9 281.3L179.5 281.2L178.2 280.9L177.2 280.4L176.5 279.8L176.3 279.1\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M176.3 279.1L176.5 278.4L177.1 277.8L178.1 277.3L179.4 276.9L180.8 276.8L182.2 276.9L183.4 277.2L184.5 277.7L185.1 278.3L185.4 279M185.4 281L185.2 281.7L184.5 282.3L183.6 282.8L182.3 283.2L180.9 283.3L179.5 283.2L178.2 282.9L177.2 282.4L176.5 281.8L176.3 281.1M176.3 279.1L176.3 281.1M185.4 279L185.4 281\"/></g></g><g class=\"it\" data-name=\"cable.com:4\" data-route=\"cable.com\"><g class=\"tb\"><path class=\"tb-body\" d=\"M186.6 421.4L187.4 421.7L188.9 422.2L190.4 422.7L192 423.3L193.5 423.8L195 424.3L196.5 424.9L198 425.4L199.6 425.9L201.1 426.5L202.6 427L204.1 427.5L205.7 428.1L207.2 428.6L208.7 429.1L210.2 429.7L211.4 430.1L212.7 426.6L211.4 426.2L209.9 425.6L208.4 425.1L206.9 424.6L205.4 424L203.8 423.5L202.3 423L200.8 422.4L199.3 421.9L197.7 421.4L196.2 420.8L194.7 420.3L193.2 419.8L191.7 419.2L190.1 418.7L188.6 418.2L187.8 417.9Z\"/><path class=\"tb-shine\" d=\"M186.3 419.3L186.5 419.3L188 419.9L189.5 420.4L191.1 420.9L192.6 421.5L194.1 422L195.6 422.5L197.2 423.1L198.7 423.6L200.2 424.1L201.7 424.7L203.2 425.2L204.8 425.7L206.3 426.3L207.8 426.8L209.3 427.3L210.8 427.9L212.4 428.4L212.9 428.6L213.2 427.8L212.7 427.6L211.1 427L209.6 426.5L208.1 426L206.6 425.4L205.1 424.9L203.5 424.4L202 423.8L200.5 423.3L199 422.8L197.4 422.2L195.9 421.7L194.4 421.2L192.9 420.6L191.4 420.1L189.8 419.6L188.3 419L186.8 418.5L186.6 418.5Z\"/><path class=\"tb-shade\" d=\"M186 420.3L186.1 420.4L187.7 420.9L189.2 421.5L190.7 422L192.2 422.5L193.7 423.1L195.3 423.6L196.8 424.1L198.3 424.7L199.8 425.2L201.3 425.7L202.9 426.3L204.4 426.8L205.9 427.3L207.4 427.9L209 428.4L210.5 428.9L212 429.5L212.5 429.6L212.8 428.9L212.2 428.8L210.7 428.2L209.2 427.7L207.7 427.2L206.2 426.6L204.6 426.1L203.1 425.6L201.6 425L200.1 424.5L198.5 424L197 423.4L195.5 422.9L194 422.4L192.5 421.8L190.9 421.3L189.4 420.8L187.9 420.2L186.4 419.7L186.2 419.6Z\"/><path class=\"iso-line tb-edge\" data-tone=\"mid\" d=\"M186.6 421.4L187.4 421.7L188.9 422.2L190.4 422.7L192 423.3L193.5 423.8L195 424.3L196.5 424.9L198 425.4L199.6 425.9L201.1 426.5L202.6 427L204.1 427.5L205.7 428.1L207.2 428.6L208.7 429.1L210.2 429.7L211.4 430.1M187.8 417.9L188.6 418.2L190.1 418.7L191.7 419.2L193.2 419.8L194.7 420.3L196.2 420.8L197.7 421.4L199.3 421.9L200.8 422.4L202.3 423L203.8 423.5L205.4 424L206.9 424.6L208.4 425.1L209.9 425.6L211.4 426.2L212.7 426.6\"/></g></g><g class=\"it\" data-name=\"cable.com:5\" data-route=\"cable.com\"><g class=\"tb\"><path class=\"tb-body\" d=\"M209.8 429.5L210.2 429.7L211.7 430.2L213.3 430.7L214.8 431.3L216.3 431.8L217.8 432.3L219.3 432.9L220.9 433.4L222.4 433.9L223.9 434.5L225.4 435L227 435.5L228.5 436.1L230 436.6L231.5 437.1L233 437.7L234.6 438.2L234.6 438.2L235.9 434.7L235.8 434.7L234.3 434.2L232.7 433.6L231.2 433.1L229.7 432.6L228.2 432L226.7 431.5L225.1 431L223.6 430.4L222.1 429.9L220.6 429.4L219 428.8L217.5 428.3L216 427.8L214.5 427.2L213 426.7L211.4 426.2L211 426Z\"/><path class=\"tb-shine\" d=\"M209.5 427.4L210.8 427.9L212.4 428.4L213.9 428.9L215.4 429.5L216.9 430L218.5 430.5L220 431.1L221.5 431.6L223 432.1L224.5 432.7L226.1 433.2L227.6 433.7L229.1 434.3L230.6 434.8L232.1 435.3L233.7 435.9L235.2 436.4L236.1 436.7L236.4 435.9L235.5 435.6L234 435L232.4 434.5L230.9 434L229.4 433.4L227.9 432.9L226.4 432.4L224.8 431.8L223.3 431.3L221.8 430.8L220.3 430.2L218.7 429.7L217.2 429.2L215.7 428.6L214.2 428.1L212.7 427.6L211.1 427L209.8 426.6Z\"/><path class=\"tb-shade\" d=\"M209.2 428.5L210.5 428.9L212 429.5L213.5 430L215 430.5L216.6 431.1L218.1 431.6L219.6 432.1L221.1 432.7L222.6 433.2L224.2 433.7L225.7 434.3L227.2 434.8L228.7 435.3L230.3 435.9L231.8 436.4L233.3 436.9L234.8 437.4L235.7 437.8L236 437.1L235.1 436.7L233.5 436.2L232 435.7L230.5 435.2L229 434.6L227.5 434.1L225.9 433.6L224.4 433L222.9 432.5L221.4 432L219.8 431.4L218.3 430.9L216.8 430.4L215.3 429.8L213.8 429.3L212.2 428.8L210.7 428.2L209.4 427.8Z\"/><path class=\"iso-line tb-edge\" data-tone=\"mid\" d=\"M209.8 429.5L210.2 429.7L211.7 430.2L213.3 430.7L214.8 431.3L216.3 431.8L217.8 432.3L219.3 432.9L220.9 433.4L222.4 433.9L223.9 434.5L225.4 435L227 435.5L228.5 436.1L230 436.6L231.5 437.1L233 437.7L234.6 438.2L234.6 438.2M211 426L211.4 426.2L213 426.7L214.5 427.2L216 427.8L217.5 428.3L219 428.8L220.6 429.4L222.1 429.9L223.6 430.4L225.1 431L226.7 431.5L228.2 432L229.7 432.6L231.2 433.1L232.7 433.6L234.3 434.2L235.8 434.7L235.9 434.7\"/></g></g><g class=\"it\" data-name=\"cable.com:6\" data-route=\"cable.com\"><g class=\"tb\"><path class=\"tb-body\" d=\"M232.9 437.6L233 437.7L234.6 438.2L236.1 438.7L237.6 439.3L239.1 439.8L240.6 440.3L242.2 440.9L243.7 441.4L245.2 441.9L246.7 442.5L248.3 443L250 443.5L251.9 443.9L254 443.8L256.2 443.2L258.2 442.1L259.8 440.6L260.2 440L257.3 437.7L257.1 438.1L256 439.1L254.8 439.8L253.5 440.1L252.2 440.2L250.9 439.9L249.4 439.5L248 439L246.4 438.4L244.9 437.9L243.4 437.4L241.9 436.8L240.3 436.3L238.8 435.8L237.3 435.2L235.8 434.7L234.3 434.2L234.2 434.1Z\"/><path class=\"tb-shine\" d=\"M232.7 435.5L233.7 435.9L235.2 436.4L236.7 436.9L238.2 437.5L239.8 438L241.3 438.5L242.8 439.1L244.3 439.6L245.8 440.1L247.4 440.7L248.9 441.2L250.4 441.6L252.1 441.8L253.7 441.7L255.4 441.2L256.9 440.3L258.2 439.1L259.1 437.9L258.4 437.4L257.5 438.5L256.3 439.6L255 440.4L253.6 440.8L252.1 440.9L250.7 440.8L249.2 440.3L247.7 439.8L246.1 439.3L244.6 438.7L243.1 438.2L241.6 437.7L240 437.2L238.5 436.6L237 436.1L235.5 435.6L234 435L233 434.7Z\"/><path class=\"tb-shade\" d=\"M232.4 436.6L233.3 436.9L234.8 437.4L236.3 438L237.9 438.5L239.4 439L240.9 439.6L242.4 440.1L243.9 440.6L245.5 441.2L247 441.7L248.5 442.3L250.1 442.8L251.9 443.3L254 443.4L256.1 442.9L258 441.8L259.5 440.3L260.6 438.9L259.9 438.5L259 439.8L257.5 441.2L255.8 442.2L253.9 442.6L252 442.6L250.3 442.1L248.8 441.6L247.2 441L245.7 440.5L244.2 439.9L242.7 439.4L241.2 438.9L239.6 438.3L238.1 437.8L236.6 437.3L235.1 436.7L233.5 436.2L232.6 435.9Z\"/><path class=\"iso-line tb-edge\" data-tone=\"mid\" d=\"M232.9 437.6L233 437.7L234.6 438.2L236.1 438.7L237.6 439.3L239.1 439.8L240.6 440.3L242.2 440.9L243.7 441.4L245.2 441.9L246.7 442.5L248.3 443L250 443.5L251.9 443.9L254 443.8L256.2 443.2L258.2 442.1L259.8 440.6L260.2 440M234.2 434.1L234.3 434.2L235.8 434.7L237.3 435.2L238.8 435.8L240.3 436.3L241.9 436.8L243.4 437.4L244.9 437.9L246.4 438.4L248 439L249.4 439.5L250.9 439.9L252.2 440.2L253.5 440.1L254.8 439.8L256 439.1L257.1 438.1L257.3 437.7\"/></g></g><g class=\"it\" data-name=\"up.back\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M206 50.4L206.3 49.6L208.7 48L210 47.5L211.6 47.7L289.2 74.9L290 75.6L290 386.1L289.7 386.8L287.3 388.5L286 388.9L284.5 388.8L206.8 361.6L206 360.9Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M290 386.1L289.7 386.8L289.7 76.3L290 75.6ZM289.7 386.8L287.3 388.5L287.3 78L289.7 76.3ZM287.3 388.5L286 388.9L286 78.4L287.3 78Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M286 388.9L284.5 388.8L284.5 78.3L286 78.4Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M284.5 388.8L206.8 361.6L206.8 51.1L284.5 78.3ZM206.8 361.6L206 360.9L206 50.4L206.8 51.1Z\"/><path class=\"iso-top\" d=\"M289.2 74.9L290 75.6L289.7 76.3L287.3 78L286 78.4L284.5 78.3L206.8 51.1L206 50.4L206.3 49.6L208.7 48L210 47.5L211.6 47.7Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M290 75.6L289.7 76.3L287.3 78L286 78.4L284.5 78.3L206.8 51.1L206 50.4\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M290 75.6L289 76.2L286.8 77.7L285.9 78L284.8 77.9L207.4 50.8L206 50.4\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M206 50.4L206.3 49.6L208.7 48L210 47.5L211.6 47.7L289.2 74.9L290 75.6M290 386.1L289.7 386.8L287.3 388.5L286 388.9L284.5 388.8L206.8 361.6L206 360.9M290 75.6L290 386.1M206 50.4L206 360.9\"/></g></g><g class=\"it\" data-name=\"up.rail\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M210 54.5L210.2 54L211.2 53.4L212 53.1L212.9 53.2L217.6 54.9L218.1 55.3L218.1 365.8L217.9 366.2L217 366.9L216.2 367.2L215.3 367.1L210.5 365.4L210 365Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M218.1 365.8L217.9 366.2L217.9 55.7L218.1 55.3ZM217.9 366.2L217 366.9L217 56.4L217.9 55.7ZM217 366.9L216.2 367.2L216.2 56.7L217 56.4Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M216.2 367.2L215.3 367.1L215.3 56.6L216.2 56.7Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M215.3 367.1L210.5 365.4L210.5 54.9L215.3 56.6ZM210.5 365.4L210 365L210 54.5L210.5 54.9Z\"/><path class=\"iso-top\" d=\"M217.6 54.9L218.1 55.3L217.9 55.7L217 56.4L216.2 56.7L215.3 56.6L210.5 54.9L210 54.5L210.2 54L211.2 53.4L212 53.1L212.9 53.2Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M218.1 55.3L217.9 55.7L217 56.4L216.2 56.7L215.3 56.6L210.5 54.9L210 54.5\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M210 54.5L210.2 54L211.2 53.4L212 53.1L212.9 53.2L217.6 54.9L218.1 55.3M218.1 365.8L217.9 366.2L217 366.9L216.2 367.2L215.3 367.1L210.5 365.4L210 365M218.1 55.3L218.1 365.8M210 54.5L210 365\"/></g></g><g class=\"it\" data-name=\"screw.foot\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M232.8 375.4L233 374.7L233.4 374L234.1 373.4L235.1 372.8L236.2 372.4L237.5 372L238.9 371.8L240.4 371.8L241.8 371.9L243.2 372.1L244.5 372.5L245.6 372.9L246.5 373.5L247.1 374.1L247.5 374.8L247.6 375.6L247.6 379.1L247.5 379.9L247 380.6L246.3 381.2L245.3 381.7L244.2 382.2L242.9 382.5L241.5 382.7L240.1 382.8L238.6 382.7L237.2 382.5L236 382.1L234.9 381.6L234 381.1L233.3 380.4L232.9 379.7L232.8 379Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M247.6 379.1L247.5 379.9L247 380.6L246.3 381.2L245.3 381.7L244.2 382.2L242.9 382.5L241.5 382.7L240.1 382.8L240.1 379.2L241.5 379.1L242.9 378.9L244.2 378.6L245.3 378.2L246.3 377.6L247 377L247.5 376.3L247.6 375.6Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M240.1 382.8L238.6 382.7L237.2 382.5L237.2 378.9L238.6 379.1L240.1 379.2Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M237.2 382.5L236 382.1L234.9 381.6L234.9 378.1L236 378.5L237.2 378.9Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M234.9 381.6L234 381.1L233.3 380.4L232.9 379.7L232.9 376.1L233.3 376.8L234 377.5L234.9 378.1Z\"/><path class=\"iso-top\" d=\"M232.9 379.7L232.8 379L232.8 375.4L232.9 376.1ZM246.3 377.6L245.3 378.2L244.2 378.6L242.9 378.9L241.5 379.1L240.1 379.2L238.6 379.1L237.2 378.9L236 378.5L234.9 378.1L234 377.5L233.3 376.8L232.9 376.1L232.8 375.4L233 374.7L233.4 374L234.1 373.4L235.1 372.8L236.2 372.4L237.5 372L238.9 371.8L240.4 371.8L241.8 371.9L243.2 372.1L244.5 372.5L245.6 372.9L246.5 373.5L247.1 374.1L247.5 374.8L247.6 375.6L247.5 376.3L247 377L246.3 377.6L240.2 375.5L240.2 375.5L240.2 375.5L240.2 375.5L240.2 375.5L240.2 375.5L240.2 375.5L240.2 375.5L240.2 375.5L240.2 375.5L240.2 375.5L240.2 375.5L240.2 375.5L240.2 375.5L240.2 375.5L240.2 375.5L240.2 375.5L240.2 375.5L240.2 375.5L240.2 375.5L240.2 375.5L240.2 375.5L240.2 375.5L240.2 375.5L240.2 375.5L240.2 375.5L240.2 375.5L240.2 375.5L240.2 375.5L240.2 375.5L240.2 375.5L240.2 375.5L240.2 375.5Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M247.6 375.5L247.5 376.2L247.1 376.9L246.4 377.6L245.5 378.1L244.3 378.6L243.1 378.9L241.7 379.1L240.2 379.2L238.8 379.1L237.4 378.9L236.1 378.6L235 378.1L234 377.6L233.4 376.9L232.9 376.2L232.8 375.5\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M232.8 375.4L233 374.7L233.4 374L234.1 373.4L235.1 372.8L236.2 372.4L237.5 372L238.9 371.8L240.4 371.8L241.8 371.9L243.2 372.1L244.5 372.5L245.6 372.9L246.5 373.5L247.1 374.1L247.5 374.8L247.6 375.6L247.6 379.1L247.5 379.9L247 380.6L246.3 381.2L245.3 381.7L244.2 382.2L242.9 382.5L241.5 382.7L240.1 382.8L238.6 382.7L237.2 382.5L236 382.1L234.9 381.6L234 381.1L233.3 380.4L232.9 379.7L232.8 379Z\"/></g></g><g class=\"it\" data-name=\"relay\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M268.3 399.3L269.4 397.8L290.7 382.6L293.2 381.5L296.3 381.3L299.3 381.8L333.1 393.6L335.1 394.8L335.7 396.4L335.7 425L334.6 426.5L313.3 441.7L310.9 442.7L307.7 443L304.7 442.4L271 430.6L268.9 429.4L268.3 427.8Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M335.7 425L334.6 426.5L334.6 397.9L335.7 396.4ZM334.6 426.5L313.3 441.7L313.3 413.1L334.6 397.9ZM313.3 441.7L310.9 442.7L310.9 414.1L313.3 413.1Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M310.9 442.7L307.7 443L307.7 414.4L310.9 414.1Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M307.7 443L304.7 442.4L304.7 413.9L307.7 414.4Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M304.7 442.4L271 430.6L271 402.1L304.7 413.9ZM271 430.6L268.9 429.4L268.9 400.8L271 402.1ZM268.9 429.4L268.3 427.8L268.3 399.3L268.9 400.8Z\"/><path class=\"iso-top\" d=\"M333.1 393.6L335.1 394.8L335.7 396.4L334.6 397.9L313.3 413.1L310.9 414.1L307.7 414.4L304.7 413.9L271 402.1L268.9 400.8L268.3 399.3L269.4 397.8L290.7 382.6L293.2 381.5L296.3 381.3L299.3 381.8Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M335.7 396.4L334.6 397.9L313.3 413.1L310.9 414.1L307.7 414.4L304.7 413.9L271 402.1L268.9 400.8L268.3 399.3\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M335.7 396.4L333.5 397.6L312.4 412.7L310.4 413.6L307.8 413.8L305.3 413.3L271.8 401.6L270 400.6L268.3 399.3\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M335.7 401.8L334.6 403.3L313.3 418.5L310.9 419.5L307.7 419.8L304.7 419.2L271 407.4L268.9 406.2L268.3 404.6\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M268.3 399.3L269.4 397.8L290.7 382.6L293.2 381.5L296.3 381.3L299.3 381.8L333.1 393.6L335.1 394.8L335.7 396.4M335.7 425L334.6 426.5L313.3 441.7L310.9 442.7L307.7 443L304.7 442.4L271 430.6L268.9 429.4L268.3 427.8M335.7 396.4L335.7 425M268.3 399.3L268.3 427.8\"/></g><g class=\"iso-dots\" data-tone=\"mid\"><circle cx=\"295.6\" cy=\"383.8\" r=\"0.5\"/><circle cx=\"330.7\" cy=\"396.1\" r=\"0.5\"/><circle cx=\"273.4\" cy=\"399.6\" r=\"0.5\"/><circle cx=\"308.5\" cy=\"411.9\" r=\"0.5\"/></g></g><g class=\"it\" data-name=\"lower.bushing\" data-move=\"jawL\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M200.7 310.9L201 310.3L205.2 307.3L206.3 306.9L207.5 307.1L218.3 310.8L219 311.4L219 323.9L218.7 324.5L214.5 327.5L213.4 327.9L212.2 327.7L201.4 323.9L200.7 323.4Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M219 323.9L218.7 324.5L218.7 312L219 311.4ZM218.7 324.5L214.5 327.5L214.5 315L218.7 312ZM214.5 327.5L213.4 327.9L213.4 315.4L214.5 315Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M213.4 327.9L212.2 327.7L212.2 315.2L213.4 315.4Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M212.2 327.7L201.4 323.9L201.4 311.4L212.2 315.2ZM201.4 323.9L200.7 323.4L200.7 310.9L201.4 311.4Z\"/><path class=\"iso-top\" d=\"M218.3 310.8L219 311.4L218.7 312L214.5 315L213.4 315.4L212.2 315.2L201.4 311.4L200.7 310.9L201 310.3L205.2 307.3L206.3 306.9L207.5 307.1Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M219 311.4L218.7 312L214.5 315L213.4 315.4L212.2 315.2L201.4 311.4L200.7 310.9\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M200.7 310.9L201 310.3L205.2 307.3L206.3 306.9L207.5 307.1L218.3 310.8L219 311.4M219 323.9L218.7 324.5L214.5 327.5L213.4 327.9L212.2 327.7L201.4 323.9L200.7 323.4M219 311.4L219 323.9M200.7 310.9L200.7 323.4\"/></g></g><g class=\"it\" data-name=\"lamp.warm.bezel\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M284.3 395.7L284.4 394.9L284.9 394.1L285.7 393.4L286.7 392.8L288.1 392.3L289.6 392L291.3 391.8L292.9 391.8L294.5 392.1L296 392.5L297.2 393L298.2 393.7L298.8 394.5L299.1 395.3L299.1 397.8L299 398.6L298.6 399.4L297.8 400.1L296.7 400.8L295.4 401.2L293.8 401.6L292.2 401.7L290.5 401.7L288.9 401.4L287.5 401L286.2 400.5L285.3 399.8L284.6 399.1L284.3 398.2Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M297.8 400.1L296.7 400.8L296.7 398.3L297.8 397.6ZM296.7 400.8L295.4 401.2L295.4 398.7L296.7 398.3ZM299.1 397.8L299 398.6L299 396.1L299.1 395.3ZM299 398.6L298.6 399.4L298.6 396.9L299 396.1ZM298.6 399.4L297.8 400.1L297.8 397.6L298.6 396.9Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M295.4 401.2L293.8 401.6L293.8 399.1L295.4 398.7ZM293.8 401.6L292.2 401.7L292.2 399.2L293.8 399.1Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M292.2 401.7L290.5 401.7L290.5 399.2L292.2 399.2ZM290.5 401.7L288.9 401.4L288.9 398.9L290.5 399.2ZM288.9 401.4L287.5 401L287.5 398.5L288.9 398.9Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M287.5 401L286.2 400.5L286.2 398L287.5 398.5ZM286.2 400.5L285.3 399.8L285.3 397.3L286.2 398ZM285.3 399.8L284.6 399.1L284.6 396.6L285.3 397.3ZM284.6 399.1L284.3 398.2L284.3 395.7L284.6 396.6Z\"/><path class=\"iso-top\" d=\"M297.8 397.6L296.7 398.3L295.4 398.7L293.8 399.1L292.2 399.2L290.5 399.2L288.9 398.9L287.5 398.5L286.2 398L285.3 397.3L284.6 396.6L284.3 395.7L284.4 394.9L284.9 394.1L285.7 393.4L286.7 392.8L288.1 392.3L289.6 392L291.3 391.8L292.9 391.8L294.5 392.1L296 392.5L297.2 393L298.2 393.7L298.8 394.5L299.1 395.3L299 396.1L298.6 396.9Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M299.1 395.3L299 396.1L298.6 396.9L297.8 397.6L296.7 398.3L295.4 398.7L293.8 399.1L292.2 399.2L290.5 399.2L288.9 398.9L287.5 398.5L286.2 398L285.3 397.3L284.6 396.6L284.3 395.7\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M284.3 395.7L284.4 394.9L284.9 394.1L285.7 393.4L286.7 392.8L288.1 392.3L289.6 392L291.3 391.8L292.9 391.8L294.5 392.1L296 392.5L297.2 393L298.2 393.7L298.8 394.5L299.1 395.3M299.1 397.8L299 398.6L298.6 399.4L297.8 400.1L296.7 400.8L295.4 401.2L293.8 401.6L292.2 401.7L290.5 401.7L288.9 401.4L287.5 401L286.2 400.5L285.3 399.8L284.6 399.1L284.3 398.2M284.3 395.7L284.3 398.2M299.1 395.3L299.1 397.8\"/></g><path class=\"iso-line\" data-tone=\"faint\" d=\"M296.6 397.2L295.7 397.7L294.6 398.1L293.4 398.4L292.1 398.5L290.8 398.5L289.5 398.3L288.3 398L287.3 397.5L286.5 397L286 396.4L285.8 395.7L285.8 395L286.2 394.4L286.8 393.8L287.7 393.3L288.8 392.9L290 392.6L291.4 392.5L292.7 392.6L294 392.7L295.2 393.1L296.2 393.5L296.9 394L297.5 394.7L297.7 395.3L297.6 396L297.3 396.6Z\"/></g><g class=\"it\" data-name=\"lamp.cool.bezel\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M300.4 401.4L300.4 400.5L300.9 399.7L301.7 399L302.8 398.4L304.1 397.9L305.7 397.6L307.3 397.4L309 397.5L310.6 397.7L312 398.1L313.3 398.6L314.2 399.3L314.9 400.1L315.2 400.9L315.2 403.4L315.1 404.2L314.6 405L313.8 405.7L312.7 406.4L311.4 406.9L309.9 407.2L308.2 407.3L306.6 407.3L305 407.1L303.5 406.7L302.3 406.1L301.3 405.4L300.6 404.7L300.4 403.9Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M313.8 405.7L312.7 406.4L312.7 403.9L313.8 403.2ZM312.7 406.4L311.4 406.9L311.4 404.4L312.7 403.9ZM315.2 403.4L315.1 404.2L315.1 401.7L315.2 400.9ZM315.1 404.2L314.6 405L314.6 402.5L315.1 401.7ZM314.6 405L313.8 405.7L313.8 403.2L314.6 402.5Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M311.4 406.9L309.9 407.2L309.9 404.7L311.4 404.4ZM309.9 407.2L308.2 407.3L308.2 404.8L309.9 404.7Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M308.2 407.3L306.6 407.3L306.6 404.8L308.2 404.8ZM306.6 407.3L305 407.1L305 404.6L306.6 404.8ZM305 407.1L303.5 406.7L303.5 404.2L305 404.6Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M303.5 406.7L302.3 406.1L302.3 403.6L303.5 404.2ZM302.3 406.1L301.3 405.4L301.3 402.9L302.3 403.6ZM301.3 405.4L300.6 404.7L300.6 402.2L301.3 402.9ZM300.6 404.7L300.4 403.9L300.4 401.4L300.6 402.2Z\"/><path class=\"iso-top\" d=\"M313.8 403.2L312.7 403.9L311.4 404.4L309.9 404.7L308.2 404.8L306.6 404.8L305 404.6L303.5 404.2L302.3 403.6L301.3 402.9L300.6 402.2L300.4 401.4L300.4 400.5L300.9 399.7L301.7 399L302.8 398.4L304.1 397.9L305.7 397.6L307.3 397.4L309 397.5L310.6 397.7L312 398.1L313.3 398.6L314.2 399.3L314.9 400.1L315.2 400.9L315.1 401.7L314.6 402.5Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M315.2 400.9L315.1 401.7L314.6 402.5L313.8 403.2L312.7 403.9L311.4 404.4L309.9 404.7L308.2 404.8L306.6 404.8L305 404.6L303.5 404.2L302.3 403.6L301.3 402.9L300.6 402.2L300.4 401.4\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M300.4 401.4L300.4 400.5L300.9 399.7L301.7 399L302.8 398.4L304.1 397.9L305.7 397.6L307.3 397.4L309 397.5L310.6 397.7L312 398.1L313.3 398.6L314.2 399.3L314.9 400.1L315.2 400.9M315.2 403.4L315.1 404.2L314.6 405L313.8 405.7L312.7 406.4L311.4 406.9L309.9 407.2L308.2 407.3L306.6 407.3L305 407.1L303.5 406.7L302.3 406.1L301.3 405.4L300.6 404.7L300.4 403.9M300.4 401.4L300.4 403.9M315.2 400.9L315.2 403.4\"/></g><path class=\"iso-line\" data-tone=\"faint\" d=\"M312.7 402.8L311.8 403.3L310.7 403.7L309.5 404L308.1 404.1L306.8 404.1L305.5 403.9L304.3 403.6L303.3 403.1L302.6 402.6L302 402L301.8 401.3L301.9 400.6L302.2 400L302.9 399.4L303.8 398.9L304.8 398.5L306.1 398.3L307.4 398.1L308.7 398.2L310 398.4L311.2 398.7L312.2 399.1L313 399.7L313.5 400.3L313.7 400.9L313.7 401.6L313.3 402.2Z\"/></g><g class=\"it\" data-name=\"stud.relay.com.boss\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M270.6 417.7L270.6 416.9L270.9 416.2L271.2 415.6L271.7 415.1L273.2 414.1L273.8 413.8L274.5 413.6L275.2 413.6L276 413.8L276.8 414.2L277.6 414.7L278.3 415.3L278.9 416.1L279.4 416.9L279.8 417.8L280 418.7L280.1 419.5L280 420.3L279.8 421.1L279.4 421.7L278.9 422.1L277.5 423.1L276.9 423.5L276.2 423.6L275.4 423.6L274.6 423.4L273.8 423L273.1 422.5L272.4 421.9L271.7 421.1L271.2 420.3L270.9 419.4L270.6 418.6Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M279.4 416.9L279.8 417.8L280 418.7L280.1 419.5L280 420.3L279.8 421.1L279.4 421.7L278.9 422.1L277.5 423.1L278 422.7L278.4 422.1L278.6 421.3L278.7 420.5L278.6 419.7L278.4 418.8L278 417.9Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M278.9 416.1L279.4 416.9L278 417.9L277.5 417.1Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M278.3 415.3L278.9 416.1L277.5 417.1L276.9 416.3ZM270.6 417.7L270.6 416.9L270.9 416.2L271.2 415.6L271.7 415.1L272.4 414.8L273.1 414.6L273.8 414.6L274.6 414.8L275.4 415.2L276.2 415.7L276.9 416.3L277.5 417.1L278 417.9L278.4 418.8L278.6 419.7L278.7 420.5L278.6 421.3L278.4 422.1L278 422.7L277.5 423.1L276.9 423.5L276.2 423.6L275.4 423.6L274.6 423.4L273.8 423L273.1 422.5L272.4 421.9L271.7 421.1L271.2 420.3L270.9 419.4L270.6 418.6L270.6 417.7L274.6 419.1L274.6 419.1L274.6 419.1L274.6 419.1L274.6 419.1L274.6 419.1L274.6 419.1L274.6 419.1L274.6 419.1L274.6 419.1L274.6 419.1L274.6 419.1L274.6 419.1L274.6 419.1L274.6 419.1L274.6 419.1L274.6 419.1L274.6 419.1L274.6 419.1L274.6 419.1L274.6 419.1L274.6 419.1L274.6 419.1L274.6 419.1L274.6 419.1L274.6 419.1L274.6 419.1L274.6 419.1L274.6 419.1L274.6 419.1L274.6 419.1L274.6 419.1L274.6 419.1Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M276.8 414.2L277.6 414.7L278.3 415.3L276.9 416.3L276.2 415.7L275.4 415.2Z\"/><path class=\"iso-top\" d=\"M273.2 414.1L273.8 413.8L274.5 413.6L275.2 413.6L276 413.8L276.8 414.2L275.4 415.2L274.6 414.8L273.8 414.6L273.1 414.6L272.4 414.8L271.7 415.1Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M271.7 415.1L272.7 414.7L273.7 414.6L274.9 414.9L276 415.6L277 416.5L277.8 417.7L278.4 418.9L278.6 420.2L278.6 421.4L278.2 422.4L277.5 423.1\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M270.6 417.7L270.6 416.9L270.9 416.2L271.2 415.6L271.7 415.1L273.2 414.1L273.8 413.8L274.5 413.6L275.2 413.6L276 413.8L276.8 414.2L277.6 414.7L278.3 415.3L278.9 416.1L279.4 416.9L279.8 417.8L280 418.7L280.1 419.5L280 420.3L279.8 421.1L279.4 421.7L278.9 422.1L277.5 423.1L276.9 423.5L276.2 423.6L275.4 423.6L274.6 423.4L273.8 423L273.1 422.5L272.4 421.9L271.7 421.1L271.2 420.3L270.9 419.4L270.6 418.6Z\"/></g></g><g class=\"it\" data-name=\"stud.relay.out.boss\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M328.2 416.8L328.3 415.9L328.4 415L328.7 414L329.1 413.1L329.5 412.3L330 411.6L330.5 410.9L331.1 410.4L331.6 410.1L332.1 410L332.6 410L334.7 410.8L335.1 411L335.4 411.4L335.7 411.9L335.9 412.6L335.9 413.4L335.9 414.3L335.7 415.2L335.4 416.1L335.1 417L334.7 417.9L334.2 418.6L333.6 419.2L333.1 419.7L332.5 420L332 420.2L331.5 420.1L329.5 419.4L329.1 419.2L328.7 418.8L328.4 418.2L328.3 417.6Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M329.5 419.4L329.1 419.2L328.7 418.8L328.4 418.2L330.5 419L330.7 419.5L331.1 419.9L331.5 420.1ZM330.2 417.5L330.3 416.6L330.5 415.7L330.7 414.7L331.1 413.8L331.5 413L332 412.3L332.5 411.6L333.1 411.2L333.6 410.8L334.2 410.7L334.7 410.8L335.1 411L335.4 411.4L335.7 411.9L335.9 412.6L335.9 413.4L335.9 414.3L335.7 415.2L335.4 416.1L335.1 417L334.7 417.9L334.2 418.6L333.6 419.2L333.1 419.7L332.5 420L332 420.2L331.5 420.1L331.1 419.9L330.7 419.5L330.5 419L330.3 418.3L330.2 417.5L333.1 415.4L333.1 415.4L333.1 415.4L333.1 415.4L333.1 415.4L333.1 415.4L333.1 415.4L333.1 415.4L333.1 415.4L333.1 415.4L333.1 415.4L333.1 415.4L333.1 415.4L333.1 415.4L333.1 415.4L333.1 415.4L333.1 415.4L333.1 415.4L333.1 415.4L333.1 415.4L333.1 415.4L333.1 415.4L333.1 415.4L333.1 415.4L333.1 415.4L333.1 415.4L333.1 415.4L333.1 415.4L333.1 415.4L333.1 415.4L333.1 415.4L333.1 415.4L333.1 415.4Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M328.4 418.2L328.3 417.6L330.3 418.3L330.5 419Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M328.3 417.6L328.2 416.8L330.2 417.5L330.3 418.3Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M328.2 416.8L328.3 415.9L328.4 415L330.5 415.7L330.3 416.6L330.2 417.5ZM332.1 410L332.6 410L334.7 410.8L334.2 410.7Z\"/><path class=\"iso-top\" d=\"M328.4 415L328.7 414L329.1 413.1L329.5 412.3L330 411.6L330.5 410.9L331.1 410.4L331.6 410.1L332.1 410L334.2 410.7L333.6 410.8L333.1 411.2L332.5 411.6L332 412.3L331.5 413L331.1 413.8L330.7 414.7L330.5 415.7Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M331.4 420.1L330.9 419.7L330.5 418.9L330.3 417.9L330.3 416.6L330.6 415.3L331 414L331.7 412.8L332.4 411.8L333.2 411.1L334 410.7L334.7 410.8\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M328.2 416.8L328.3 415.9L328.4 415L328.7 414L329.1 413.1L329.5 412.3L330 411.6L330.5 410.9L331.1 410.4L331.6 410.1L332.1 410L332.6 410L334.7 410.8L335.1 411L335.4 411.4L335.7 411.9L335.9 412.6L335.9 413.4L335.9 414.3L335.7 415.2L335.4 416.1L335.1 417L334.7 417.9L334.2 418.6L333.6 419.2L333.1 419.7L332.5 420L332 420.2L331.5 420.1L329.5 419.4L329.1 419.2L328.7 418.8L328.4 418.2L328.3 417.6Z\"/></g></g><g class=\"it\" data-name=\"stud.relay.hr.boss\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M317.6 424.4L317.6 423.5L317.8 422.6L318.1 421.6L318.4 420.7L318.8 419.9L319.3 419.1L319.9 418.5L320.4 418L321 417.7L321.5 417.6L322 417.6L324 418.4L324.5 418.6L324.8 419L325.1 419.5L325.2 420.2L325.3 421L325.2 421.9L325.1 422.8L324.8 423.7L324.5 424.6L324 425.5L323.5 426.2L323 426.8L322.4 427.3L321.9 427.6L321.4 427.8L320.9 427.7L318.8 427L318.4 426.8L318.1 426.4L317.8 425.8L317.6 425.2Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M318.8 427L318.4 426.8L318.1 426.4L317.8 425.8L319.8 426.5L320.1 427.1L320.4 427.5L320.9 427.7ZM319.6 425.1L319.7 424.2L319.8 423.3L320.1 422.3L320.4 421.4L320.9 420.6L321.4 419.9L321.9 419.2L322.4 418.8L323 418.4L323.5 418.3L324 418.4L324.5 418.6L324.8 419L325.1 419.5L325.2 420.2L325.3 421L325.2 421.9L325.1 422.8L324.8 423.7L324.5 424.6L324 425.5L323.5 426.2L323 426.8L322.4 427.3L321.9 427.6L321.4 427.8L320.9 427.7L320.4 427.5L320.1 427.1L319.8 426.5L319.7 425.9L319.6 425.1L322.4 423L322.4 423L322.4 423L322.4 423L322.4 423L322.4 423L322.4 423L322.4 423L322.4 423L322.4 423L322.4 423L322.4 423L322.4 423L322.4 423L322.4 423L322.4 423L322.4 423L322.4 423L322.4 423L322.4 423L322.4 423L322.4 423L322.4 423L322.4 423L322.4 423L322.4 423L322.4 423L322.4 423L322.4 423L322.4 423L322.4 423L322.4 423L322.4 423Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M317.8 425.8L317.6 425.2L319.7 425.9L319.8 426.5Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M317.6 425.2L317.6 424.4L319.6 425.1L319.7 425.9Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M317.6 424.4L317.6 423.5L317.8 422.6L319.8 423.3L319.7 424.2L319.6 425.1ZM321.5 417.6L322 417.6L324 418.4L323.5 418.3Z\"/><path class=\"iso-top\" d=\"M317.8 422.6L318.1 421.6L318.4 420.7L318.8 419.9L319.3 419.1L319.9 418.5L320.4 418L321 417.7L321.5 417.6L323.5 418.3L323 418.4L322.4 418.8L321.9 419.2L321.4 419.9L320.9 420.6L320.4 421.4L320.1 422.3L319.8 423.3Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M320.8 427.7L320.2 427.3L319.8 426.5L319.6 425.5L319.7 424.2L319.9 422.9L320.4 421.6L321 420.4L321.8 419.4L322.6 418.7L323.4 418.3L324.1 418.4\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M317.6 424.4L317.6 423.5L317.8 422.6L318.1 421.6L318.4 420.7L318.8 419.9L319.3 419.1L319.9 418.5L320.4 418L321 417.7L321.5 417.6L322 417.6L324 418.4L324.5 418.6L324.8 419L325.1 419.5L325.2 420.2L325.3 421L325.2 421.9L325.1 422.8L324.8 423.7L324.5 424.6L324 425.5L323.5 426.2L323 426.8L322.4 427.3L321.9 427.6L321.4 427.8L320.9 427.7L318.8 427L318.4 426.8L318.1 426.4L317.8 425.8L317.6 425.2Z\"/></g></g><g class=\"it\" data-name=\"lamp.warm\"><g class=\"mt-lamp\" data-lamp=\"warm\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M286.2 395.4L286.2 394.8L286.4 394.2L286.5 393.7L286.7 393.1L287 392.6L287.3 392.1L287.7 391.7L288.1 391.3L288.5 391L289 390.7L289.4 390.5L289.9 390.3L290.2 390.2L290.7 390L291.2 390L291.8 389.9L292.3 390L292.8 390.1L293.3 390.2L293.7 390.3L294.2 390.5L294.6 390.7L295 391L295.4 391.4L295.8 391.8L296.2 392.2L296.5 392.7L296.8 393.2L297 393.8L297.2 394.4L297.2 394.9L297.3 395.6L297.2 396.1L296.8 396.6L296.3 397.1L295.6 397.5L294.7 397.9L293.7 398.1L292.7 398.2L291.6 398.3L290.5 398.2L289.5 398.1L288.5 397.8L287.7 397.4L287 397L286.5 396.5L286.2 396Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M297.3 395.4L297.3 395.7L297.2 396.1L297 396.4L296.7 396.7L296.4 397L296 397.3L295.5 397.6L295 397.8L294.4 398L293.7 398.1L293.1 398.2L292.4 398.3L291.7 398.3L291.9 398.2L292 398.1L292.2 398L292.3 397.8L292.5 397.7L292.6 397.6L292.6 397.6L292.7 397.5L292.9 397.4L293 397.2L293.2 397.1L293.3 396.9L293.5 396.8L293.5 396.8L293.6 396.7L293.7 396.5L293.9 396.4L294 396.2L294.1 396.1L294.3 395.9L294.3 395.9L294.4 395.7L294.5 395.6L294.7 395.4L294.8 395.2L294.9 395L295.1 394.8L295.1 394.8L295.2 394.6L295.3 394.4L295.4 394.2L295.5 394L295.7 393.7L295.8 393.4L295.8 393.4L295.9 393.1L296 392.9L296 392.6L296 392.3L296 392.1L295.9 391.9L295.8 391.7L295.8 391.7L295.9 391.8L295.9 391.9L296 391.9L296.1 392L296.1 392.1L296.2 392.2L296.3 392.4L296.4 392.5L296.5 392.6L296.5 392.7L296.6 392.8L296.6 392.8L296.7 392.9L296.8 393.2L296.8 393.3L296.9 393.4L296.9 393.4L296.9 393.5L297 393.6L297 393.7L297.1 394L297.1 394.1L297.1 394.2L297.1 394.3L297.2 394.4L297.2 394.5L297.2 394.6L297.2 394.8L297.3 394.9L297.3 395L297.3 395.1L297.3 395.2L297.3 395.3ZM296 392.1L296 392.3L296 392.6L296 392.9L296 392.4L296 392.4Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M291.7 398.3L291.1 398.3L290.6 398.2L290 398.2L290.1 398.1L290.3 398L290.4 397.9L290.6 397.8L290.7 397.7L290.9 397.6L290.9 397.6L291 397.5L291.1 397.4L291.3 397.3L291.4 397.2L291.6 397.1L291.7 396.9L291.7 396.9L291.9 396.8L292 396.7L292.1 396.6L292.3 396.5L292.4 396.3L292.5 396.2L292.5 396.2L292.7 396.1L292.8 395.9L292.9 395.8L293.1 395.7L293.2 395.5L293.3 395.4L293.3 395.4L293.4 395.2L293.6 395.1L293.7 394.9L293.8 394.8L293.9 394.6L294.1 394.5L294.5 394.3L294.9 394.1L295.2 393.9L295.5 393.7L295.8 393.4L295.7 393.7L295.5 394L295.4 394.2L295.3 394.4L295.2 394.6L295.1 394.8L295.1 394.8L294.9 395L294.8 395.2L294.7 395.4L294.5 395.6L294.4 395.7L294.3 395.9L294.3 395.9L294.1 396.1L294 396.2L293.9 396.4L293.7 396.5L293.6 396.7L293.5 396.8L293.5 396.8L293.3 396.9L293.2 397.1L293 397.2L292.9 397.4L292.7 397.5L292.6 397.6L292.6 397.6L292.5 397.7L292.3 397.8L292.2 398L292 398.1L291.9 398.2ZM295.8 393.4L295.5 393.7L295.2 393.9L294.9 394.1L294.5 394.3L294.1 394.5L294.1 394.5L294.5 394.3L294.9 394.1L295.2 393.9L295.5 393.7L295.8 393.4ZM295.7 391.6L295.7 391.6L295.8 391.7L295.5 391.5ZM295.5 391.5L295.8 391.7L295.9 391.9L296 392.1L295.8 391.8L295.7 391.6L295.4 391.4L295.5 391.4ZM295.8 393.4L295.5 393.7L295.2 393.9L294.9 394.1L294.5 394.3L294.1 394.5L294.2 394.3L294.2 394.2L294.6 394L295 393.8L295.3 393.6L295.6 393.4L295.8 393.1L296 392.9L295.9 393.1ZM295.4 391.3L295.6 391.6L295.8 391.8L295.9 392.1L296 392.3L296 392.6L295.9 392.8L295.8 393.1L295.6 393.3L295.3 393.6L295 393.8L294.7 394L294.3 394.1L296 392.1L295.8 391.8L295.7 391.6L295.4 391.4ZM296 392.9L295.8 393.1L295.6 393.4L295.3 393.6L295 393.8L294.6 394L294.2 394.2L295.3 393.6L295.3 393.6ZM295.4 391.3L295.6 391.6L295.8 391.8L295.9 392.1L296 392.3L296 392.6L295.9 392.8L295.8 393.1L295.6 393.3L295.3 393.6L295 393.8L294.7 394L294.3 394.1L294.4 394L294.5 393.8L294.6 393.6L294.7 393.4L294.7 393.4L294.8 393.2L294.9 393L295 392.7L295.1 392.4L295.2 392L295.2 391.8L295.2 391.5L295.1 391.2L295 391.1L294.9 390.9L294.8 390.9L294.7 390.8L295.1 391.1L295.2 391.2L295.3 391.2L295.3 391.3ZM295.2 391.5L295.2 391.8L295.2 392L295.2 391.7L295.2 391.7Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M290 398.2L289.5 398.1L289 397.9L288.5 397.8L288.1 397.6L288.2 397.6L288.4 397.5L288.5 397.5L288.7 397.4L288.8 397.3L288.9 397.3L288.9 397.3L289.1 397.2L289.2 397.1L289.4 397L289.5 396.9L289.7 396.9L289.8 396.8L289.8 396.8L289.9 396.7L290.1 396.6L290.2 396.5L290.4 396.4L290.5 396.3L290.6 396.2L290.6 396.2L290.8 396.1L290.9 396L291 395.9L291.2 395.7L291.3 395.6L291.4 395.5L291.4 395.5L291.5 395.4L291.7 395.3L291.8 395.2L291.9 395L292 394.9L292.1 394.8L292.1 394.8L292.3 394.7L292.3 394.6L292.4 394.5L292.5 394.4L292.6 394.3L292.7 394.1L292.8 394L293.2 393.9L293.6 393.8L294 393.7L294.4 393.5L294.7 393.4L294.6 393.6L294.5 393.8L294.4 394L294.3 394.1L294.2 394.2L294.2 394.3L294.1 394.5L294.1 394.5L293.9 394.6L293.8 394.8L293.7 394.9L293.6 395.1L293.4 395.2L293.3 395.4L293.3 395.4L293.2 395.5L293.1 395.7L292.9 395.8L292.8 395.9L292.7 396.1L292.5 396.2L292.5 396.2L292.4 396.3L292.3 396.5L292.1 396.6L292 396.7L291.9 396.8L291.7 396.9L291.7 396.9L291.6 397.1L291.4 397.2L291.3 397.3L291.1 397.4L291 397.5L290.9 397.6L290.9 397.6L290.7 397.7L290.6 397.8L290.4 397.9L290.3 398L290.1 398.1ZM294.7 393.4L294.4 393.5L294 393.7L293.6 393.8L293.2 393.9L292.8 394L292.8 394L293.2 393.9L293.6 393.8L294 393.7L294.4 393.5L294.7 393.4ZM294.7 390.8L294.7 390.8L294.7 390.8L294.7 390.8ZM294.7 390.8L294.7 390.8L294.8 390.9L294.9 390.9L295 391.1L295.1 391.2L295.2 391.5L295.1 391.3L295 391.1L294.8 390.9L294.6 390.8L294.4 390.6L294.4 390.6L294.5 390.7L294.6 390.7L294.6 390.8ZM294.7 393.4L294.4 393.5L294 393.7L293.6 393.8L293.2 393.9L292.8 394L292.9 393.9L293 393.7L293.1 393.6L293.2 393.5L293.3 393.3L293.7 393.2L294 393.1L294.3 392.9L294.6 392.8L294.8 392.6L295 392.4L295.1 392.2L295.2 392L295.1 392.4L295 392.7L294.9 393L294.8 393.2ZM294.3 390.6L294.6 390.8L294.8 391L295 391.2L295.1 391.4L295.2 391.6L295.2 391.8L295.1 392L295 392.2L294.8 392.5L294.6 392.6L294.4 392.8L294 393L293.7 393.1L293.3 393.2L295.2 391.5L295.1 391.3L295 391.1L294.8 390.9L294.6 390.8L294.4 390.6ZM295.2 392L295.1 392.2L295 392.4L294.8 392.6L294.6 392.8L294.3 392.9L294 393.1L293.7 393.2L293.3 393.3L294.5 392.7L294.5 392.7ZM294.3 390.6L294.6 390.8L294.8 391L295 391.2L295.1 391.4L295.2 391.6L295.2 391.8L295.1 392L295 392.2L294.8 392.5L294.6 392.6L294.4 392.8L294 393L293.7 393.1L293.3 393.2L293.4 393.2L293.4 393.2L293.4 393.1L293.5 393L293.5 392.9L293.6 392.7L293.7 392.6L293.8 392.4L293.9 392.2L293.9 392.2L293.9 392.1L294 391.9L294.1 391.6L294.1 391.5L294.1 391.3L294.2 391.2L294.1 391L294.1 390.9L294.1 390.8L294 390.6L293.9 390.5L293.9 390.4L293.9 390.4L293.8 390.4L293.7 390.3L293.6 390.3L293.5 390.2L293.5 390.2L293.4 390.2L293.4 390.2L294.3 390.6ZM294.1 390.9L294.1 391L294.2 391.2L294.1 391.3L294.1 391.5L294.1 391.1L294.1 391.1Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M288.1 397.6L287.6 397.4L287.2 397.1L286.8 396.8L286.5 396.5L286.3 396.2L286.5 396.3L286.6 396.4L286.8 396.4L286.9 396.5L287.1 396.5L287.2 396.5L287.2 396.5L287.4 396.4L287.5 396.4L287.6 396.4L287.8 396.3L287.9 396.3L288.1 396.2L288.1 396.2L288.2 396.2L288.3 396.1L288.5 396L288.6 396L288.8 395.9L288.9 395.8L288.9 395.8L289 395.7L289.2 395.6L289.3 395.6L289.4 395.5L289.5 395.4L289.7 395.3L289.7 395.3L289.8 395.2L289.9 395.1L290 395L290.2 394.9L290.3 394.8L290.4 394.7L290.4 394.7L290.5 394.6L290.6 394.5L290.6 394.5L290.7 394.4L290.8 394.3L291 394.2L291.1 394L291.1 394L291.2 393.9L291.3 393.8L291.3 393.7L291.4 393.6L291.5 393.5L291.6 393.4L291.6 393.4L291.6 393.4L292 393.4L292.4 393.3L292.7 393.3L293 393.2L293.4 393.2L293.4 393.2L293.3 393.2L293.3 393.3L293.2 393.5L293.1 393.6L293 393.7L292.9 393.9L292.8 394L292.8 394L292.7 394.1L292.6 394.3L292.5 394.4L292.4 394.5L292.3 394.6L292.3 394.7L292.1 394.8L292.1 394.8L292 394.9L291.9 395L291.8 395.2L291.7 395.3L291.5 395.4L291.4 395.5L291.4 395.5L291.3 395.6L291.2 395.7L291 395.9L290.9 396L290.8 396.1L290.6 396.2L290.6 396.2L290.5 396.3L290.4 396.4L290.2 396.5L290.1 396.6L289.9 396.7L289.8 396.8L289.8 396.8L289.7 396.9L289.5 396.9L289.4 397L289.2 397.1L289.1 397.2L288.9 397.3L288.9 397.3L288.8 397.3L288.7 397.4L288.5 397.5L288.4 397.5L288.2 397.6ZM293.4 393.2L293 393.2L292.7 393.3L292.4 393.3L292 393.4L291.6 393.4L291.7 393.3L292 393.3L292.4 393.3L292.8 393.2L293.1 393.2L293.4 393.1ZM293.4 390.2L293.4 390.2L293.4 390.2L293.4 390.2ZM293.4 390.2L293.4 390.2L293.5 390.2L293.5 390.2L293.6 390.3L293.7 390.3L293.8 390.4L293.9 390.4L293.9 390.4L293.9 390.5L294 390.6L294.1 390.8L294.1 390.9L294 390.7L293.9 390.6L293.7 390.5L293.6 390.4L293.4 390.3L293.1 390.2L292.9 390.1L292.6 390L292.3 390L292.3 390L292.2 390L292.2 390L292.1 390L293.1 390.1L293.2 390.1L293.2 390.2L293.3 390.2L293.3 390.2L293.4 390.2ZM293.4 393.1L293.1 393.2L292.8 393.2L292.4 393.3L292 393.3L291.7 393.3L291.7 393.3L291.8 393.2L291.9 393.1L292 392.9L292 392.8L292.1 392.7L292.1 392.7L292.2 392.6L292.2 392.5L292.3 392.4L292.3 392.3L292.6 392.3L292.9 392.2L293.1 392.2L293.4 392.1L293.6 392L293.7 391.9L293.9 391.7L294 391.6L294.1 391.5L294.1 391.6L294 391.9L293.9 392.1L293.9 392.2L293.9 392.2L293.8 392.4L293.7 392.6L293.6 392.7L293.5 392.9L293.5 393ZM292.4 390L292.7 390.1L292.9 390.1L293.2 390.2L293.4 390.3L293.6 390.4L293.8 390.6L293.9 390.7L294 390.8L294.1 391L294.1 391.1L294.1 391.3L294 391.5L293.9 391.6L293.8 391.7L293.6 391.9L293.4 392L293.2 392.1L292.9 392.2L292.7 392.2L292.4 392.3L294.1 390.9L294 390.7L293.9 390.6L293.7 390.5L293.6 390.4L293.4 390.3L293.1 390.2L292.9 390.1L292.6 390L292.3 390ZM294.1 391.5L294 391.6L293.9 391.7L293.7 391.9L293.6 392L293.4 392.1L293.1 392.2L292.9 392.2L292.6 392.3L292.3 392.3L293.4 392L293.4 392ZM292.4 390L292.7 390.1L292.9 390.1L293.2 390.2L293.4 390.3L293.6 390.4L293.8 390.6L293.9 390.7L294 390.8L294.1 391L294.1 391.1L294.1 391.3L294 391.5L293.9 391.6L293.8 391.7L293.6 391.9L293.4 392L293.2 392.1L292.9 392.2L292.7 392.2L292.4 392.3L292.4 392.2L292.5 392L292.5 392L292.6 392L292.6 391.8L292.6 391.7L292.7 391.6L292.7 391.5L292.8 391.3L292.8 391.3L292.8 391.2L292.8 391.1L292.9 391L292.9 390.9L292.9 390.9L292.9 390.8L292.9 390.7L292.9 390.7L292.9 390.6L292.8 390.5L292.8 390.4L292.8 390.4L292.8 390.4L292.7 390.3L292.7 390.2L292.6 390.2L292.6 390.1L292.6 390.1L292.5 390.1L292.5 390.1L292.4 390ZM292.9 390.6L292.9 390.7L292.9 390.7L292.9 390.8L292.9 390.9L292.9 390.9L292.9 391L292.9 390.8L292.9 390.8Z\"/><path class=\"iso-top\" d=\"M286.3 396.2L286.2 395.9L286.2 395.7L286.2 395.4L286.2 395.3L286.2 395.2L286.2 395.1L286.2 395L286.2 394.9L286.2 394.8L286.2 394.6L286.3 394.5L286.3 394.4L286.3 394.3L286.3 394.2L286.4 394.1L286.4 394L286.5 393.7L286.5 393.6L286.5 393.5L286.6 393.4L286.6 393.4L286.6 393.3L286.7 393.2L286.8 392.9L286.8 392.8L286.9 392.8L286.9 392.7L287 392.6L287 392.5L287.1 392.4L287.3 392.2L287.3 392.1L287.4 392L287.5 391.9L287.5 391.9L287.6 391.8L287.7 391.7L287.9 391.5L288 391.4L288 391.4L288 391.3L288.1 391.3L288.2 391.2L288.3 391.2L288.3 391.1L288.8 390.8L288.8 390.8L288.9 390.7L289 390.7L289 390.6L289.1 390.6L289.1 390.6L289.2 390.6L290 390.2L290 390.2L290.1 390.2L290.1 390.2L290.2 390.2L290.2 390.2L290.3 390.1L290.3 390.1L292.1 390L292.2 390L292.2 390L292.3 390L292.3 390L292.4 390L292.4 390L292.5 390.1L292.5 390.1L292.6 390.1L292.6 390.1L292.6 390.2L292.7 390.2L292.7 390.3L292.8 390.4L292.8 390.4L292.8 390.4L292.8 390.5L292.9 390.6L292.7 391.1L292.6 391.1L292.5 391L292.3 390.9L292.3 390.9L292.3 390.9L292.2 390.9L292.1 390.9L292.1 390.8L292 390.8L291.7 390.7L291.7 390.7L291.7 390.7L291.7 390.7L291.7 390.7L291.7 390.7L291.7 390.7L291.7 390.7L291.7 390.7L291.7 390.7L291.7 390.7L291.7 390.7L291.7 390.7L291.7 390.7L291.7 390.7L291.7 390.7L291.7 390.7L291.7 390.7L291.7 390.7L291.7 390.7L291.7 390.7L291.7 390.7L291.7 390.7L291.7 390.7L291.7 390.7L291.7 390.7L291.7 390.7L291.7 390.7L291.7 390.7L291.7 390.7L291.7 390.7L291.7 390.7L291.7 390.7L291.7 390.7L291.7 390.7L291.7 390.7L291.7 390.7L291.7 390.7L291.7 390.7L291.7 390.7L291.7 390.7L291.7 390.7L291.7 390.7L291.7 390.7L291.7 390.7L291.7 390.7L291.7 390.7L291.7 390.7L291.7 390.7L292 390.8L292.1 390.8L292.1 390.9L292.2 390.9L292.3 390.9L292.3 390.9L292.3 390.9L292.5 391L292.6 391.1L292.7 391.1L292.9 391L292.8 391.1L292.8 391.2L292.8 391.3L292.8 391.3L292.7 391.5L292.7 391.6L292.6 391.7L292.6 391.8L292.6 392L292.5 392L292.5 392L292.4 392.2L292.4 392.3L292.3 392.3L292.3 392.4L292.2 392.5L292.2 392.6L292.1 392.7L292.1 392.7L292 392.8L292 392.9L291.9 393.1L291.8 393.2L291.7 393.3L291.7 393.3L291.6 393.4L291.6 393.4L291.6 393.4L291.5 393.5L291.4 393.6L291.3 393.7L291.3 393.8L291.2 393.9L291.1 394L291.1 394L291 394.2L290.8 394.3L290.7 394.4L290.6 394.5L290.6 394.5L290.5 394.6L290.4 394.7L290.4 394.7L290.3 394.8L290.2 394.9L290 395L289.9 395.1L289.8 395.2L289.7 395.3L289.7 395.3L289.5 395.4L289.4 395.5L289.3 395.6L289.2 395.6L289 395.7L288.9 395.8L288.9 395.8L288.8 395.9L288.6 396L288.5 396L288.3 396.1L288.2 396.2L288.1 396.2L288.1 396.2L287.9 396.3L287.8 396.3L287.6 396.4L287.5 396.4L287.4 396.4L287.2 396.5L287.2 396.5L287.1 396.5L286.9 396.5L286.8 396.4L286.6 396.4L286.5 396.3Z\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M286.2 395.4L286.2 394.8L286.4 394.2L286.5 393.7L286.7 393.1L287 392.6L287.3 392.1L287.7 391.7L288.1 391.3L288.5 391L289 390.7L289.4 390.5L289.9 390.3L290.2 390.2L290.7 390L291.2 390L291.8 389.9L292.3 390L292.8 390.1L293.3 390.2L293.7 390.3L294.2 390.5L294.6 390.7L295 391L295.4 391.4L295.8 391.8L296.2 392.2L296.5 392.7L296.8 393.2L297 393.8L297.2 394.4L297.2 394.9L297.3 395.6L297.2 396.1L296.8 396.6L296.3 397.1L295.6 397.5L294.7 397.9L293.7 398.1L292.7 398.2L291.6 398.3L290.5 398.2L289.5 398.1L288.5 397.8L287.7 397.4L287 397L286.5 396.5L286.2 396Z\"/></g></g></g><g class=\"it\" data-name=\"lamp.cool\"><g class=\"mt-lamp\" data-lamp=\"cool\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M302.2 401.1L302.2 400.4L302.4 399.8L302.5 399.3L302.7 398.7L303.1 398.2L303.4 397.7L303.7 397.3L304.1 396.9L304.5 396.6L305 396.3L305.4 396.1L305.9 395.9L306.3 395.8L306.8 395.7L307.3 395.6L307.8 395.6L308.4 395.6L308.9 395.7L309.4 395.8L309.7 395.9L310.2 396.1L310.6 396.4L311.1 396.7L311.5 397L311.9 397.4L312.3 397.8L312.6 398.3L312.8 398.8L313.1 399.4L313.2 400L313.3 400.6L313.3 401.2L313.2 401.7L312.9 402.2L312.3 402.7L311.6 403.1L310.8 403.5L309.8 403.7L308.7 403.9L307.6 403.9L306.6 403.8L305.5 403.7L304.6 403.4L303.7 403L303.1 402.6L302.6 402.1L302.3 401.6Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M313.3 401L313.3 401.4L313.2 401.7L313 402L312.8 402.3L312.4 402.6L312 402.9L311.5 403.2L311 403.4L310.4 403.6L309.8 403.7L309.1 403.8L308.4 403.9L307.8 403.9L307.9 403.8L308.1 403.7L308.2 403.6L308.3 403.5L308.5 403.3L308.6 403.2L308.6 403.2L308.8 403.1L308.9 403L309.1 402.8L309.2 402.7L309.3 402.6L309.5 402.4L309.5 402.4L309.6 402.3L309.8 402.1L309.9 402L310 401.8L310.2 401.7L310.3 401.5L310.3 401.5L310.4 401.3L310.6 401.2L310.7 401L310.8 400.8L311 400.6L311.1 400.5L311.1 400.5L311.2 400.3L311.3 400.1L311.5 399.8L311.6 399.6L311.7 399.3L311.8 399L311.8 399L311.9 398.7L312 398.5L312.1 398.2L312.1 397.9L312 397.7L311.9 397.5L311.8 397.3L311.8 397.3L311.9 397.4L312 397.5L312 397.6L312.1 397.6L312.2 397.7L312.2 397.8L312.4 398L312.4 398.1L312.5 398.2L312.5 398.3L312.6 398.4L312.6 398.5L312.7 398.5L312.8 398.8L312.8 398.9L312.9 399L312.9 399.1L313 399.2L313 399.3L313 399.3L313.1 399.6L313.1 399.7L313.2 399.8L313.2 399.9L313.2 400L313.2 400.1L313.2 400.2L313.3 400.4L313.3 400.5L313.3 400.6L313.3 400.7L313.3 400.8L313.3 400.9ZM312 397.7L312.1 397.9L312.1 398.2L312 398.5L312 398L312 398Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M307.8 403.9L307.2 403.9L306.6 403.8L306 403.8L306.2 403.7L306.3 403.6L306.5 403.5L306.6 403.4L306.8 403.3L306.9 403.2L306.9 403.2L307 403.1L307.2 403L307.3 402.9L307.5 402.8L307.6 402.7L307.8 402.6L307.8 402.6L307.9 402.4L308 402.3L308.2 402.2L308.3 402.1L308.4 401.9L308.6 401.8L308.6 401.8L308.7 401.7L308.8 401.6L309 401.4L309.1 401.3L309.2 401.1L309.4 401L309.4 401L309.5 400.8L309.6 400.7L309.7 400.5L309.8 400.4L310 400.2L310.1 400.1L310.5 399.9L310.9 399.7L311.3 399.5L311.6 399.3L311.8 399L311.7 399.3L311.6 399.6L311.5 399.8L311.3 400.1L311.2 400.3L311.1 400.5L311.1 400.5L311 400.6L310.8 400.8L310.7 401L310.6 401.2L310.4 401.3L310.3 401.5L310.3 401.5L310.2 401.7L310 401.8L309.9 402L309.8 402.1L309.6 402.3L309.5 402.4L309.5 402.4L309.3 402.6L309.2 402.7L309.1 402.8L308.9 403L308.8 403.1L308.6 403.2L308.6 403.2L308.5 403.3L308.3 403.5L308.2 403.6L308.1 403.7L307.9 403.8ZM311.8 399L311.6 399.3L311.3 399.5L310.9 399.7L310.5 399.9L310.1 400.1L310.1 400.1L310.5 399.9L310.9 399.7L311.3 399.5L311.6 399.3L311.8 399ZM311.7 397.2L311.7 397.2L311.8 397.3L311.6 397.1ZM311.6 397.1L311.8 397.3L311.9 397.5L312 397.7L311.9 397.4L311.7 397.2L311.5 397L311.5 397ZM311.8 399L311.6 399.3L311.3 399.5L310.9 399.7L310.5 399.9L310.1 400.1L310.2 399.9L310.3 399.8L310.7 399.7L311.1 399.5L311.4 399.2L311.6 399L311.9 398.7L312 398.5L311.9 398.7ZM311.4 397L311.7 397.2L311.9 397.4L312 397.7L312 397.9L312 398.2L311.9 398.5L311.8 398.7L311.6 398.9L311.4 399.2L311.1 399.4L310.7 399.6L310.3 399.7L312 397.7L311.9 397.4L311.7 397.2L311.5 397ZM312 398.5L311.9 398.7L311.6 399L311.4 399.2L311.1 399.5L310.7 399.7L310.3 399.8L311.4 399.2L311.4 399.2ZM311.4 397L311.7 397.2L311.9 397.4L312 397.7L312 397.9L312 398.2L311.9 398.5L311.8 398.7L311.6 398.9L311.4 399.2L311.1 399.4L310.7 399.6L310.3 399.7L310.4 399.6L310.5 399.4L310.6 399.2L310.7 399L310.7 399L310.8 398.8L310.9 398.6L311 398.3L311.1 398.1L311.2 397.6L311.3 397.4L311.2 397.2L311.1 396.8L311 396.7L310.9 396.6L310.8 396.5L310.7 396.4L311.2 396.7L311.2 396.8L311.3 396.8L311.4 396.9ZM311.2 397.2L311.3 397.4L311.2 397.6L311.2 397.3L311.2 397.3Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M306 403.8L305.5 403.7L305 403.5L304.5 403.4L304.1 403.2L304.3 403.2L304.4 403.1L304.5 403.1L304.7 403L304.8 402.9L305 402.9L305 402.9L305.1 402.8L305.3 402.7L305.4 402.6L305.6 402.6L305.7 402.5L305.8 402.4L305.8 402.4L306 402.3L306.1 402.2L306.3 402.1L306.4 402L306.5 401.9L306.7 401.8L306.7 401.8L306.8 401.7L306.9 401.6L307.1 401.5L307.2 401.4L307.3 401.2L307.5 401.1L307.5 401.1L307.6 401L307.7 400.9L307.8 400.8L307.9 400.6L308.1 400.5L308.2 400.4L308.2 400.4L308.3 400.3L308.3 400.2L308.4 400.1L308.5 400L308.6 399.9L308.7 399.7L308.8 399.6L309.3 399.5L309.7 399.4L310.1 399.3L310.4 399.2L310.7 399L310.6 399.2L310.5 399.4L310.4 399.6L310.3 399.7L310.3 399.8L310.2 399.9L310.1 400.1L310.1 400.1L310 400.2L309.8 400.4L309.7 400.5L309.6 400.7L309.5 400.8L309.4 401L309.4 401L309.2 401.1L309.1 401.3L309 401.4L308.8 401.6L308.7 401.7L308.6 401.8L308.6 401.8L308.4 401.9L308.3 402.1L308.2 402.2L308 402.3L307.9 402.4L307.8 402.6L307.8 402.6L307.6 402.7L307.5 402.8L307.3 402.9L307.2 403L307 403.1L306.9 403.2L306.9 403.2L306.8 403.3L306.6 403.4L306.5 403.5L306.3 403.6L306.2 403.7ZM310.7 399L310.4 399.2L310.1 399.3L309.7 399.4L309.3 399.5L308.8 399.6L308.8 399.6L309.3 399.5L309.7 399.4L310.1 399.3L310.4 399.2L310.7 399ZM310.7 396.4L310.7 396.4L310.7 396.4L310.7 396.4ZM310.7 396.4L310.7 396.4L310.8 396.5L310.9 396.6L311 396.7L311.1 396.8L311.2 397.2L311.1 397L311 396.8L310.9 396.6L310.6 396.4L310.4 396.2L310.5 396.3L310.5 396.3L310.6 396.3L310.7 396.4ZM310.7 399L310.4 399.2L310.1 399.3L309.7 399.4L309.3 399.5L308.8 399.6L308.9 399.5L309 399.4L309.1 399.2L309.2 399.1L309.3 398.9L309.7 398.8L310 398.7L310.3 398.5L310.6 398.4L310.8 398.2L311 398L311.1 397.8L311.2 397.6L311.1 398.1L311 398.3L310.9 398.6L310.8 398.8ZM310.4 396.2L310.6 396.4L310.8 396.6L311 396.8L311.1 397L311.2 397.2L311.2 397.4L311.1 397.6L311 397.9L310.9 398.1L310.7 398.3L310.4 398.4L310.1 398.6L309.7 398.7L309.4 398.9L311.2 397.2L311.1 397L311 396.8L310.9 396.6L310.6 396.4L310.4 396.2ZM311.2 397.6L311.1 397.8L311 398L310.8 398.2L310.6 398.4L310.3 398.5L310 398.7L309.7 398.8L309.3 398.9L310.6 398.3L310.6 398.3ZM310.4 396.2L310.6 396.4L310.8 396.6L311 396.8L311.1 397L311.2 397.2L311.2 397.4L311.1 397.6L311 397.9L310.9 398.1L310.7 398.3L310.4 398.4L310.1 398.6L309.7 398.7L309.4 398.9L309.4 398.8L309.4 398.8L309.4 398.7L309.5 398.6L309.6 398.5L309.7 398.4L309.7 398.2L309.8 398L309.9 397.8L309.9 397.8L310 397.7L310 397.5L310.1 397.2L310.1 397.1L310.2 396.9L310.2 396.8L310.2 396.6L310.1 396.5L310.1 396.4L310 396.2L310 396.1L309.9 396.1L309.9 396.1L309.8 396L309.7 395.9L309.7 395.9L309.6 395.9L309.5 395.8L309.4 395.8L309.5 395.8L310.3 396.2ZM310.1 396.5L310.2 396.6L310.2 396.8L310.2 396.9L310.1 397.1L310.1 396.8L310.1 396.8Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M304.1 403.2L303.6 403L303.2 402.7L302.9 402.4L302.6 402.1L302.4 401.8L302.5 401.9L302.7 402L302.8 402.1L303 402.1L303.1 402.1L303.2 402.1L303.2 402.1L303.4 402.1L303.5 402L303.7 402L303.8 401.9L304 401.9L304.1 401.8L304.1 401.8L304.2 401.8L304.4 401.7L304.5 401.7L304.7 401.6L304.8 401.5L304.9 401.4L304.9 401.4L305.1 401.3L305.2 401.3L305.3 401.2L305.5 401.1L305.6 401L305.7 400.9L305.7 400.9L305.8 400.8L306 400.7L306.1 400.6L306.2 400.5L306.3 400.4L306.4 400.3L306.4 400.3L306.5 400.2L306.6 400.1L306.7 400.1L306.8 400L306.9 399.9L307 399.8L307.1 399.7L307.1 399.7L307.2 399.6L307.3 399.4L307.4 399.3L307.5 399.2L307.6 399.1L307.6 399.1L307.7 399L307.7 399L308 399L308.4 399L308.7 398.9L309.1 398.9L309.4 398.8L309.4 398.8L309.4 398.9L309.3 398.9L309.2 399.1L309.1 399.2L309 399.4L308.9 399.5L308.8 399.6L308.8 399.6L308.7 399.7L308.6 399.9L308.5 400L308.4 400.1L308.3 400.2L308.3 400.3L308.2 400.4L308.2 400.4L308.1 400.5L307.9 400.6L307.8 400.8L307.7 400.9L307.6 401L307.5 401.1L307.5 401.1L307.3 401.2L307.2 401.4L307.1 401.5L306.9 401.6L306.8 401.7L306.7 401.8L306.7 401.8L306.5 401.9L306.4 402L306.3 402.1L306.1 402.2L306 402.3L305.8 402.4L305.8 402.4L305.7 402.5L305.6 402.6L305.4 402.6L305.3 402.7L305.1 402.8L305 402.9L305 402.9L304.8 402.9L304.7 403L304.5 403.1L304.4 403.1L304.3 403.2ZM309.4 398.8L309.1 398.9L308.7 398.9L308.4 399L308 399L307.7 399L307.7 398.9L308.1 398.9L308.4 398.9L308.8 398.9L309.1 398.8L309.4 398.7ZM309.4 395.8L309.4 395.8L309.5 395.8L309.5 395.8ZM309.4 395.8L309.4 395.8L309.5 395.8L309.6 395.9L309.7 395.9L309.7 395.9L309.8 396L309.9 396.1L309.9 396.1L310 396.1L310 396.2L310.1 396.4L310.1 396.5L310 396.4L309.9 396.2L309.8 396.1L309.6 396L309.4 395.9L309.2 395.8L308.9 395.7L308.7 395.7L308.4 395.6L308.3 395.6L308.3 395.6L308.2 395.6L308.2 395.6L309.2 395.7L309.2 395.8L309.3 395.8L309.3 395.8L309.4 395.8L309.4 395.8ZM309.4 398.7L309.1 398.8L308.8 398.9L308.4 398.9L308.1 398.9L307.7 398.9L307.8 398.9L307.8 398.8L307.9 398.7L308 398.6L308.1 398.4L308.2 398.3L308.2 398.3L308.2 398.2L308.3 398.1L308.3 398L308.4 398L308.7 397.9L308.9 397.9L309.2 397.8L309.4 397.7L309.6 397.6L309.8 397.5L309.9 397.3L310 397.2L310.1 397.1L310.1 397.2L310 397.5L310 397.7L309.9 397.8L309.9 397.8L309.8 398L309.7 398.2L309.7 398.4L309.6 398.5L309.5 398.6ZM308.4 395.6L308.7 395.7L309 395.7L309.2 395.8L309.5 395.9L309.7 396L309.8 396.2L310 396.3L310.1 396.5L310.1 396.6L310.1 396.8L310.1 396.9L310.1 397.1L310 397.2L309.8 397.3L309.7 397.5L309.5 397.6L309.2 397.7L309 397.8L308.7 397.9L308.4 397.9L310.1 396.5L310 396.4L309.9 396.2L309.8 396.1L309.6 396L309.4 395.9L309.2 395.8L308.9 395.7L308.7 395.7L308.4 395.6ZM310.1 397.1L310 397.2L309.9 397.3L309.8 397.5L309.6 397.6L309.4 397.7L309.2 397.8L308.9 397.9L308.7 397.9L308.4 398L309.5 397.6L309.5 397.6ZM308.4 395.6L308.7 395.7L309 395.7L309.2 395.8L309.5 395.9L309.7 396L309.8 396.2L310 396.3L310.1 396.5L310.1 396.6L310.1 396.8L310.1 396.9L310.1 397.1L310 397.2L309.8 397.3L309.7 397.5L309.5 397.6L309.2 397.7L309 397.8L308.7 397.9L308.4 397.9L308.5 397.8L308.5 397.7L308.5 397.7L308.6 397.6L308.6 397.5L308.7 397.4L308.7 397.2L308.8 397.1L308.8 397L308.8 397L308.9 396.8L308.9 396.7L308.9 396.6L308.9 396.5L309 396.5L309 396.4L309 396.4L308.9 396.3L308.9 396.2L308.9 396.1L308.9 396L308.8 396L308.8 396L308.8 395.9L308.7 395.8L308.7 395.8L308.6 395.7L308.6 395.7L308.5 395.7L308.5 395.7L308.5 395.6ZM308.9 396.2L308.9 396.3L309 396.4L309 396.4L309 396.5L308.9 396.5L308.9 396.6L308.9 396.4L308.9 396.4Z\"/><path class=\"iso-top\" d=\"M302.4 401.8L302.3 401.6L302.2 401.3L302.2 401L302.2 400.9L302.2 400.8L302.2 400.7L302.2 400.6L302.2 400.5L302.2 400.4L302.3 400.2L302.3 400.1L302.3 400L302.3 399.9L302.4 399.8L302.4 399.7L302.4 399.6L302.5 399.3L302.5 399.3L302.6 399.2L302.6 399.1L302.6 399L302.7 398.9L302.7 398.8L302.8 398.5L302.9 398.5L302.9 398.4L303 398.3L303 398.2L303.1 398.1L303.1 398L303.3 397.8L303.4 397.7L303.4 397.6L303.5 397.6L303.6 397.5L303.6 397.4L303.7 397.3L304 397.1L304 397L304 397L304.1 397L304.1 396.9L304.2 396.8L304.3 396.8L304.4 396.7L304.8 396.4L304.9 396.4L304.9 396.3L305 396.3L305.1 396.3L305.1 396.2L305.2 396.2L305.2 396.2L306.1 395.8L306.1 395.8L306.1 395.8L306.1 395.8L306.2 395.8L306.3 395.8L306.3 395.8L306.4 395.7L308.2 395.6L308.2 395.6L308.3 395.6L308.3 395.6L308.4 395.6L308.4 395.6L308.5 395.6L308.5 395.7L308.5 395.7L308.6 395.7L308.6 395.7L308.7 395.8L308.7 395.8L308.8 395.9L308.8 396L308.8 396L308.9 396L308.9 396.1L308.9 396.2L308.7 396.7L308.6 396.7L308.5 396.6L308.4 396.6L308.4 396.6L308.3 396.5L308.2 396.5L308.2 396.5L308.1 396.4L308 396.4L307.8 396.3L307.8 396.3L307.8 396.3L307.8 396.3L307.8 396.3L307.8 396.3L307.8 396.3L307.8 396.3L307.8 396.3L307.8 396.3L307.8 396.3L307.8 396.3L307.8 396.3L307.8 396.3L307.8 396.3L307.8 396.3L307.8 396.3L307.8 396.3L307.8 396.3L307.8 396.3L307.8 396.3L307.8 396.3L307.8 396.3L307.8 396.3L307.8 396.3L307.8 396.3L307.8 396.3L307.8 396.3L307.8 396.3L307.8 396.3L307.8 396.3L307.8 396.3L307.8 396.3L307.8 396.3L307.8 396.3L307.8 396.3L307.8 396.3L307.8 396.3L307.8 396.3L307.8 396.3L307.8 396.3L307.8 396.3L307.8 396.3L307.8 396.3L307.8 396.3L307.8 396.3L307.8 396.3L307.8 396.3L307.8 396.3L308 396.4L308.1 396.4L308.2 396.5L308.2 396.5L308.3 396.5L308.4 396.6L308.4 396.6L308.5 396.6L308.6 396.7L308.7 396.7L308.9 396.6L308.9 396.7L308.9 396.8L308.8 397L308.8 397L308.8 397.1L308.7 397.2L308.7 397.4L308.6 397.5L308.6 397.6L308.5 397.7L308.5 397.7L308.5 397.8L308.4 397.9L308.4 398L308.3 398L308.3 398.1L308.2 398.2L308.2 398.3L308.2 398.3L308.1 398.4L308 398.6L307.9 398.7L307.8 398.8L307.8 398.9L307.7 398.9L307.7 399L307.7 399L307.6 399.1L307.6 399.1L307.5 399.2L307.4 399.3L307.3 399.4L307.2 399.6L307.1 399.7L307.1 399.7L307 399.8L306.9 399.9L306.8 400L306.7 400.1L306.6 400.1L306.5 400.2L306.4 400.3L306.4 400.3L306.3 400.4L306.2 400.5L306.1 400.6L306 400.7L305.8 400.8L305.7 400.9L305.7 400.9L305.6 401L305.5 401.1L305.3 401.2L305.2 401.3L305.1 401.3L304.9 401.4L304.9 401.4L304.8 401.5L304.7 401.6L304.5 401.7L304.4 401.7L304.2 401.8L304.1 401.8L304.1 401.8L304 401.9L303.8 401.9L303.7 402L303.5 402L303.4 402.1L303.2 402.1L303.2 402.1L303.1 402.1L303 402.1L302.8 402.1L302.7 402L302.5 401.9Z\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M302.2 401.1L302.2 400.4L302.4 399.8L302.5 399.3L302.7 398.7L303.1 398.2L303.4 397.7L303.7 397.3L304.1 396.9L304.5 396.6L305 396.3L305.4 396.1L305.9 395.9L306.3 395.8L306.8 395.7L307.3 395.6L307.8 395.6L308.4 395.6L308.9 395.7L309.4 395.8L309.7 395.9L310.2 396.1L310.6 396.4L311.1 396.7L311.5 397L311.9 397.4L312.3 397.8L312.6 398.3L312.8 398.8L313.1 399.4L313.2 400L313.3 400.6L313.3 401.2L313.2 401.7L312.9 402.2L312.3 402.7L311.6 403.1L310.8 403.5L309.8 403.7L308.7 403.9L307.6 403.9L306.6 403.8L305.5 403.7L304.6 403.4L303.7 403L303.1 402.6L302.6 402.1L302.3 401.6Z\"/></g></g></g><g class=\"it\" data-name=\"stud.relay.com\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M270.4 419.4L270.5 418.9L270.6 418.5L270.8 418.1L271.2 417.8L272.8 416.6L273.2 416.4L273.6 416.3L274.1 416.3L274.6 416.4L275.1 416.7L275.6 417L276 417.4L276.4 417.9L276.7 418.4L276.9 418.9L277.1 419.5L277.1 420L277.1 420.5L276.9 421L276.7 421.3L276.4 421.6L274.7 422.8L274.4 423L273.9 423.1L273.4 423.1L273 423L272.5 422.8L272 422.4L271.5 422L271.2 421.6L270.8 421L270.6 420.5L270.5 420Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M276.7 418.4L276.9 418.9L277.1 419.5L277.1 420L277.1 420.5L276.9 421L276.7 421.3L276.4 421.6L274.7 422.8L275.1 422.5L275.3 422.1L275.4 421.7L275.5 421.2L275.4 420.6L275.3 420.1L275.1 419.5Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M276.4 417.9L276.7 418.4L275.1 419.5L274.7 419Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M276 417.4L276.4 417.9L274.7 419L274.4 418.6ZM270.4 419.4L270.5 418.9L270.6 418.5L270.8 418.1L271.2 417.8L271.5 417.6L272 417.5L272.5 417.5L273 417.6L273.4 417.8L273.9 418.2L274.4 418.6L274.7 419L275.1 419.5L275.3 420.1L275.4 420.6L275.5 421.2L275.4 421.7L275.3 422.1L275.1 422.5L274.7 422.8L274.4 423L273.9 423.1L273.4 423.1L273 423L272.5 422.8L272 422.4L271.5 422L271.2 421.6L270.8 421L270.6 420.5L270.5 420L270.4 419.4L273 420.3L273 420.3L273 420.3L273 420.3L273 420.3L273 420.3L273 420.3L273 420.3L273 420.3L273 420.3L273 420.3L273 420.3L273 420.3L273 420.3L273 420.3L273 420.3L273 420.3L273 420.3L273 420.3L273 420.3L273 420.3L273 420.3L273 420.3L273 420.3L273 420.3L273 420.3L273 420.3L273 420.3L273 420.3L273 420.3L273 420.3L273 420.3L273 420.3Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M275.1 416.7L275.6 417L276 417.4L274.4 418.6L273.9 418.2L273.4 417.8Z\"/><path class=\"iso-top\" d=\"M272.8 416.6L273.2 416.4L273.6 416.3L274.1 416.3L274.6 416.4L275.1 416.7L273.4 417.8L273 417.6L272.5 417.5L272 417.5L271.5 417.6L271.2 417.8Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M271.2 417.8L272.1 417.5L273.2 417.7L274.3 418.5L275.1 419.6L275.5 420.9L275.3 422L274.7 422.8\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M270.4 419.4L270.5 418.9L270.6 418.5L270.8 418.1L271.2 417.8L272.8 416.6L273.2 416.4L273.6 416.3L274.1 416.3L274.6 416.4L275.1 416.7L275.6 417L276 417.4L276.4 417.9L276.7 418.4L276.9 418.9L277.1 419.5L277.1 420L277.1 420.5L276.9 421L276.7 421.3L276.4 421.6L274.7 422.8L274.4 423L273.9 423.1L273.4 423.1L273 423L272.5 422.8L272 422.4L271.5 422L271.2 421.6L270.8 421L270.6 420.5L270.5 420Z\"/></g></g><g class=\"it\" data-name=\"stud.relay.out\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M331.3 416.7L331.3 416.2L331.4 415.6L331.6 415L331.8 414.4L332.1 413.9L332.4 413.5L332.7 413.1L333.1 412.8L333.4 412.6L333.8 412.5L334.1 412.5L336.4 413.3L336.7 413.5L336.9 413.7L337.1 414.1L337.2 414.5L337.2 415L337.2 415.5L337.1 416.1L336.9 416.7L336.7 417.3L336.4 417.8L336.1 418.3L335.8 418.6L335.4 418.9L335.1 419.1L334.8 419.2L334.5 419.2L332.1 418.4L331.8 418.2L331.6 418L331.4 417.6L331.3 417.2Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M332.1 418.4L331.8 418.2L331.6 418L331.4 417.6L333.8 418.5L334 418.8L334.2 419.1L334.5 419.2ZM333.7 417.5L333.7 417L333.8 416.4L334 415.8L334.2 415.3L334.5 414.7L334.8 414.3L335.1 413.9L335.4 413.6L335.8 413.4L336.1 413.3L336.4 413.3L336.7 413.5L336.9 413.7L337.1 414.1L337.2 414.5L337.2 415L337.2 415.5L337.1 416.1L336.9 416.7L336.7 417.3L336.4 417.8L336.1 418.3L335.8 418.6L335.4 418.9L335.1 419.1L334.8 419.2L334.5 419.2L334.2 419.1L334 418.8L333.8 418.5L333.7 418L333.7 417.5L335.4 416.3L335.4 416.3L335.4 416.3L335.4 416.3L335.4 416.3L335.4 416.3L335.4 416.3L335.4 416.3L335.4 416.3L335.4 416.3L335.4 416.3L335.4 416.3L335.4 416.3L335.4 416.3L335.4 416.3L335.4 416.3L335.4 416.3L335.4 416.3L335.4 416.3L335.4 416.3L335.4 416.3L335.4 416.3L335.4 416.3L335.4 416.3L335.4 416.3L335.4 416.3L335.4 416.3L335.4 416.3L335.4 416.3L335.4 416.3L335.4 416.3L335.4 416.3L335.4 416.3Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M331.4 417.6L331.3 417.2L333.7 418L333.8 418.5Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M331.3 417.2L331.3 416.7L333.7 417.5L333.7 418Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M331.3 416.7L331.3 416.2L331.4 415.6L333.8 416.4L333.7 417L333.7 417.5ZM333.8 412.5L334.1 412.5L336.4 413.3L336.1 413.3Z\"/><path class=\"iso-top\" d=\"M331.4 415.6L331.6 415L331.8 414.4L332.1 413.9L332.4 413.5L332.7 413.1L333.1 412.8L333.4 412.6L333.8 412.5L336.1 413.3L335.8 413.4L335.4 413.6L335.1 413.9L334.8 414.3L334.5 414.7L334.2 415.3L334 415.8L333.8 416.4Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M334.4 419.2L333.9 418.7L333.7 417.7L333.8 416.4L334.3 415.1L335 414.1L335.7 413.4L336.5 413.4\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M331.3 416.7L331.3 416.2L331.4 415.6L331.6 415L331.8 414.4L332.1 413.9L332.4 413.5L332.7 413.1L333.1 412.8L333.4 412.6L333.8 412.5L334.1 412.5L336.4 413.3L336.7 413.5L336.9 413.7L337.1 414.1L337.2 414.5L337.2 415L337.2 415.5L337.1 416.1L336.9 416.7L336.7 417.3L336.4 417.8L336.1 418.3L335.8 418.6L335.4 418.9L335.1 419.1L334.8 419.2L334.5 419.2L332.1 418.4L331.8 418.2L331.6 418L331.4 417.6L331.3 417.2Z\"/></g></g><g class=\"it\" data-name=\"stud.relay.hr\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M320.7 424.3L320.7 423.8L320.8 423.2L321 422.6L321.2 422L321.5 421.5L321.8 421L322.1 420.7L322.4 420.4L322.8 420.2L323.1 420.1L323.4 420.1L325.8 420.9L326.1 421.1L326.3 421.3L326.4 421.7L326.5 422.1L326.6 422.6L326.5 423.1L326.4 423.7L326.3 424.3L326.1 424.9L325.8 425.4L325.5 425.9L325.2 426.2L324.8 426.5L324.5 426.7L324.1 426.8L323.8 426.8L321.5 426L321.2 425.8L321 425.6L320.8 425.2L320.7 424.8Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M321.5 426L321.2 425.8L321 425.6L320.8 425.2L323.2 426.1L323.3 426.4L323.6 426.7L323.8 426.8ZM323 425.1L323.1 424.6L323.2 424L323.3 423.4L323.6 422.9L323.8 422.3L324.1 421.9L324.5 421.5L324.8 421.2L325.2 421L325.5 420.9L325.8 420.9L326.1 421.1L326.3 421.3L326.4 421.7L326.5 422.1L326.6 422.6L326.5 423.1L326.4 423.7L326.3 424.3L326.1 424.9L325.8 425.4L325.5 425.9L325.2 426.2L324.8 426.5L324.5 426.7L324.1 426.8L323.8 426.8L323.6 426.7L323.3 426.4L323.2 426.1L323.1 425.6L323 425.1L324.8 423.9L324.8 423.9L324.8 423.9L324.8 423.9L324.8 423.9L324.8 423.9L324.8 423.9L324.8 423.9L324.8 423.9L324.8 423.9L324.8 423.9L324.8 423.9L324.8 423.9L324.8 423.9L324.8 423.9L324.8 423.9L324.8 423.9L324.8 423.9L324.8 423.9L324.8 423.9L324.8 423.9L324.8 423.9L324.8 423.9L324.8 423.9L324.8 423.9L324.8 423.9L324.8 423.9L324.8 423.9L324.8 423.9L324.8 423.9L324.8 423.9L324.8 423.9L324.8 423.9Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M320.8 425.2L320.7 424.8L323.1 425.6L323.2 426.1Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M320.7 424.8L320.7 424.3L323 425.1L323.1 425.6Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M320.7 424.3L320.7 423.8L320.8 423.2L323.2 424L323.1 424.6L323 425.1ZM323.1 420.1L323.4 420.1L325.8 420.9L325.5 420.9Z\"/><path class=\"iso-top\" d=\"M320.8 423.2L321 422.6L321.2 422L321.5 421.5L321.8 421L322.1 420.7L322.4 420.4L322.8 420.2L323.1 420.1L325.5 420.9L325.2 421L324.8 421.2L324.5 421.5L324.1 421.9L323.8 422.3L323.6 422.9L323.3 423.4L323.2 424Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M323.8 426.8L323.3 426.3L323 425.3L323.2 424L323.6 422.7L324.3 421.6L325.1 421L325.8 420.9\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M320.7 424.3L320.7 423.8L320.8 423.2L321 422.6L321.2 422L321.5 421.5L321.8 421L322.1 420.7L322.4 420.4L322.8 420.2L323.1 420.1L323.4 420.1L325.8 420.9L326.1 421.1L326.3 421.3L326.4 421.7L326.5 422.1L326.6 422.6L326.5 423.1L326.4 423.7L326.3 424.3L326.1 424.9L325.8 425.4L325.5 425.9L325.2 426.2L324.8 426.5L324.5 426.7L324.1 426.8L323.8 426.8L321.5 426L321.2 425.8L321 425.6L320.8 425.2L320.7 424.8Z\"/></g></g><g class=\"it\" data-name=\"cable.com:7\" data-route=\"cable.com\"><g class=\"tb\"><path class=\"tb-body\" d=\"M258.5 441.8L259.8 440.6L261.1 438.9L262 437.3L262.9 435.7L263.8 434.1L264.7 432.6L265.5 431L266.4 429.5L267.2 428.1L268.1 426.8L269 425.7L269.9 424.8L270.9 424.1L271.9 423.3L273 422.6L274 421.8L271.9 418.8L270.8 419.6L269.7 420.3L268.6 421.1L267.5 422.1L266.3 423.2L265.2 424.6L264.1 426.1L263.2 427.6L262.3 429.2L261.4 430.8L260.6 432.3L259.7 433.9L258.8 435.4L258 436.8L257.1 438.1L256.2 438.9ZM271.9 418.8L271.7 419L271.5 419.3L271.4 419.6L271.4 420L271.5 420.3L271.7 420.7L271.9 421.1L272.1 421.4L272.5 421.6L272.8 421.8L273.1 422L273.5 422L273.8 421.9L274 421.8L274.2 421.6L274.4 421.3L274.5 421L274.5 420.6L274.4 420.3L274.2 419.9L274 419.5L273.8 419.2L273.5 419L273.1 418.8L272.8 418.6L272.4 418.6L272.1 418.7Z\"/><path class=\"tb-shine\" d=\"M256.3 440.6L256.9 440.3L258.2 439.1L259.3 437.7L260.2 436.2L261.1 434.6L261.9 433.1L262.8 431.5L263.7 430L264.5 428.4L265.4 426.9L266.4 425.5L267.4 424.2L268.5 423.2L269.5 422.3L270.6 421.5L271.7 420.8L272.7 420L273.8 419.3L273.8 419.2L273.5 419L273.1 418.8L273 418.7L272.2 419.3L271.2 420L270.1 420.8L269 421.6L267.9 422.5L266.7 423.6L265.7 425L264.7 426.4L263.8 428L262.9 429.6L262 431.1L261.2 432.7L260.3 434.2L259.4 435.7L258.5 437.2L257.5 438.5L256.3 439.6L255.8 439.9Z\"/><path class=\"tb-shade\" d=\"M257.3 442.2L258 441.8L259.5 440.3L260.7 438.7L261.7 437L262.5 435.5L263.4 433.9L264.3 432.4L265.1 430.8L266 429.3L266.9 427.8L267.8 426.6L268.7 425.5L269.7 424.6L270.7 423.8L271.7 423.1L272.8 422.3L273.8 421.5L274.4 421.1L274.5 421L274.5 420.6L274.4 420.3L274.4 420.2L273.4 420.9L272.3 421.7L271.3 422.5L270.2 423.2L269.2 424L268.2 425L267.2 426.1L266.3 427.4L265.3 428.9L264.5 430.4L263.6 432L262.7 433.5L261.9 435.1L261 436.7L260.1 438.3L259 439.8L257.5 441.2L256.9 441.6Z\"/><path class=\"iso-line tb-edge\" data-tone=\"mid\" d=\"M258.5 441.8L259.8 440.6L261.1 438.9L262 437.3L262.9 435.7L263.8 434.1L264.7 432.6L265.5 431L266.4 429.5L267.2 428.1L268.1 426.8L269 425.7L269.9 424.8L270.9 424.1L271.9 423.3L273 422.6L274 421.8M256.2 438.9L257.1 438.1L258 436.8L258.8 435.4L259.7 433.9L260.6 432.3L261.4 430.8L262.3 429.2L263.2 427.6L264.1 426.1L265.2 424.6L266.3 423.2L267.5 422.1L268.6 421.1L269.7 420.3L270.8 419.6L271.9 418.8M274 421.8L274.2 421.6L274.4 421.3L274.5 421L274.5 420.6L274.4 420.3L274.2 419.9L274 419.5L273.8 419.2L273.5 419L273.1 418.8L272.8 418.6L272.4 418.6L272.1 418.7L271.9 418.8\"/></g></g><g class=\"it\" data-name=\"cable.sol:0\" data-route=\"cable.sol\"><g class=\"tb\"><path class=\"tb-body\" d=\"M334.8 418L336.4 418.6L337.9 419.1L339.3 419.6L340.5 420.2L341.5 420.9L342.3 422L342.9 423.3L343.3 425L343.8 426.7L344.2 428.5L344.6 430.4L345.1 432.3L346 434.3L347.3 436.1L348.4 437L350.7 434L350 433.5L349.2 432.4L348.6 431.1L348.2 429.5L347.8 427.7L347.4 425.9L346.9 424L346.4 422.1L345.5 420.1L344.2 418.3L342.5 417L340.7 416.2L339.1 415.6L337.6 415.1L336.1 414.5ZM335.9 414.5L335.6 414.6L335.4 414.7L335.1 414.9L334.9 415.2L334.7 415.6L334.6 416L334.5 416.4L334.4 416.8L334.4 417.1L334.4 417.4L334.5 417.7L334.7 417.9L334.8 418L335 418L335.3 418L335.5 417.8L335.7 417.6L336 417.3L336.2 417L336.3 416.6L336.4 416.2L336.5 415.8L336.5 415.4L336.5 415.1L336.4 414.8L336.2 414.6L336.1 414.5Z\"/><path class=\"tb-shine\" d=\"M335.5 416.2L337 416.8L338.5 417.3L340 417.9L341.4 418.7L342.6 419.8L343.5 421.3L344 422.9L344.4 424.7L344.9 426.5L345.3 428.3L345.7 430.1L346.3 431.9L347.2 433.6L348.5 435L349.9 436L350.3 436.1L350.7 435.3L350.4 435.2L349.1 434.4L348 433.2L347.1 431.6L346.6 429.9L346.1 428.1L345.7 426.3L345.3 424.4L344.9 422.6L344.2 420.9L343.2 419.2L341.9 417.9L340.4 417L338.8 416.4L337.3 415.9L335.8 415.4L335 415.1L334.9 415.2L334.7 415.6L334.6 415.9Z\"/><path class=\"tb-shade\" d=\"M335.1 417.3L336.6 417.8L338.1 418.3L339.6 418.8L341 419.3L342.4 420L343.6 421.2L344.5 422.7L345.1 424.5L345.6 426.3L346 428.1L346.4 429.9L346.8 431.7L347.4 433.5L348.3 435.2L349.5 436.6L349.9 436.8L350.3 436.2L349.9 435.9L348.8 434.7L348 433.1L347.5 431.5L347.1 429.7L346.7 427.9L346.3 426.1L345.9 424.3L345.2 422.5L344.2 420.8L342.9 419.5L341.4 418.7L339.9 418.1L338.4 417.6L336.9 417.1L335.3 416.6L334.5 416.3L334.5 416.4L334.4 416.8L334.4 417Z\"/><path class=\"iso-line tb-edge\" data-tone=\"mid\" d=\"M334.8 418L336.4 418.6L337.9 419.1L339.3 419.6L340.5 420.2L341.5 420.9L342.3 422L342.9 423.3L343.3 425L343.8 426.7L344.2 428.5L344.6 430.4L345.1 432.3L346 434.3L347.3 436.1L348.4 437M336.1 414.5L337.6 415.1L339.1 415.6L340.7 416.2L342.5 417L344.2 418.3L345.5 420.1L346.4 422.1L346.9 424L347.4 425.9L347.8 427.7L348.2 429.5L348.6 431.1L349.2 432.4L350 433.5L350.7 434M334.8 418L334.7 417.9L334.5 417.7L334.4 417.4L334.4 417.1L334.4 416.8L334.5 416.4L334.6 416L334.7 415.6L334.9 415.2L335.1 414.9L335.4 414.7L335.6 414.6L335.9 414.5L336.1 414.5\"/></g></g><g class=\"it\" data-name=\"cable.hr:0\" data-route=\"cable.hr\"><g class=\"tb\"><path class=\"tb-body\" d=\"M324.2 425.6L325.7 426.1L327.2 426.7L328.7 427.2L330 427.9L331.3 428.7L332.5 429.8L333.6 431L334.7 432.4L335.8 433.8L336.9 435.2L338.2 436.6L339.6 438L341.1 439.3L342.7 440.5L344.4 441.5L346 442.4L346.1 442.4L347.7 439L347.6 439L346.2 438.3L344.8 437.4L343.4 436.4L342.1 435.3L340.9 434.1L339.8 432.8L338.7 431.5L337.6 430.1L336.5 428.6L335.1 427.2L333.6 425.8L331.9 424.6L330.1 423.8L328.5 423.2L326.9 422.6L325.4 422.1ZM325.2 422.1L325 422.2L324.7 422.3L324.5 422.5L324.3 422.8L324.1 423.2L323.9 423.6L323.8 424L323.8 424.3L323.7 424.7L323.8 425L323.9 425.3L324 425.5L324.2 425.6L324.4 425.6L324.6 425.6L324.9 425.4L325.1 425.2L325.3 424.9L325.5 424.6L325.7 424.2L325.8 423.8L325.9 423.4L325.9 423L325.8 422.7L325.7 422.4L325.6 422.2L325.4 422.1Z\"/><path class=\"tb-shine\" d=\"M324.8 423.8L326.3 424.4L327.9 424.9L329.4 425.5L330.9 426.3L332.3 427.4L333.6 428.7L334.8 430.1L335.8 431.5L337 432.9L338.1 434.2L339.3 435.6L340.7 436.9L342.2 438L343.7 439.1L345.2 440L346.8 440.7L347.7 441.1L348.1 440.2L347.2 439.9L345.7 439.2L344.2 438.3L342.7 437.3L341.3 436.2L340 435L338.8 433.7L337.6 432.3L336.5 430.9L335.4 429.5L334.3 428.1L332.9 426.7L331.3 425.5L329.7 424.7L328.2 424.1L326.6 423.5L325.1 423L324.4 422.7L324.3 422.8L324.1 423.2L324 423.5Z\"/><path class=\"tb-shade\" d=\"M324.5 424.9L326 425.4L327.5 425.9L329 426.4L330.5 427L332 427.9L333.4 428.9L334.6 430.2L335.8 431.5L336.9 432.9L338 434.3L339.1 435.8L340.4 437.1L341.8 438.4L343.3 439.6L344.8 440.7L346.4 441.6L347.3 442L347.6 441.3L346.7 440.9L345.2 440L343.7 439L342.3 437.9L340.9 436.6L339.7 435.2L338.5 433.9L337.4 432.5L336.3 431.1L335.2 429.7L333.9 428.4L332.4 427.3L330.9 426.4L329.3 425.7L327.7 425.2L326.2 424.7L324.7 424.2L323.8 423.9L323.8 424L323.8 424.3L323.8 424.6Z\"/><path class=\"iso-line tb-edge\" data-tone=\"mid\" d=\"M324.2 425.6L325.7 426.1L327.2 426.7L328.7 427.2L330 427.9L331.3 428.7L332.5 429.8L333.6 431L334.7 432.4L335.8 433.8L336.9 435.2L338.2 436.6L339.6 438L341.1 439.3L342.7 440.5L344.4 441.5L346 442.4L346.1 442.4M325.4 422.1L326.9 422.6L328.5 423.2L330.1 423.8L331.9 424.6L333.6 425.8L335.1 427.2L336.5 428.6L337.6 430.1L338.7 431.5L339.8 432.8L340.9 434.1L342.1 435.3L343.4 436.4L344.8 437.4L346.2 438.3L347.6 439L347.7 439M324.2 425.6L324 425.5L323.9 425.3L323.8 425L323.7 424.7L323.8 424.3L323.8 424L323.9 423.6L324.1 423.2L324.3 422.8L324.5 422.5L324.7 422.3L325 422.2L325.2 422.1L325.4 422.1\"/></g></g><g class=\"it\" data-name=\"screw\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M235.7 72.2L235.9 71.5L236.5 70.8L237.5 70.3L238.7 70L240.1 69.9L241.5 70L242.8 70.3L243.8 70.8L244.5 71.4L244.7 72.1L244.7 375.5L244.5 376.2L243.9 376.8L242.9 377.3L241.7 377.6L240.3 377.8L238.9 377.7L237.6 377.3L236.6 376.9L235.9 376.2L235.7 375.5Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M243.9 376.8L242.9 377.3L242.9 73.9L243.9 73.4ZM244.7 375.5L244.5 376.2L244.5 72.8L244.7 72.1ZM244.5 376.2L243.9 376.8L243.9 73.4L244.5 72.8Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M242.9 377.3L241.7 377.6L241.7 74.3L242.9 73.9ZM241.7 377.6L240.3 377.8L240.3 74.4L241.7 74.3Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M240.3 377.8L238.9 377.7L238.9 74.3L240.3 74.4ZM238.9 377.7L237.6 377.3L237.6 74L238.9 74.3Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M237.6 377.3L236.6 376.9L236.6 73.5L237.6 74ZM236.6 376.9L235.9 376.2L235.9 72.9L236.6 73.5ZM235.9 376.2L235.7 375.5L235.7 72.2L235.9 72.9Z\"/><path class=\"iso-top\" d=\"M243.9 73.4L242.9 73.9L241.7 74.3L240.3 74.4L238.9 74.3L237.6 74L236.6 73.5L235.9 72.9L235.7 72.2L235.9 71.5L236.5 70.8L237.5 70.3L238.7 70L240.1 69.9L241.5 70L242.8 70.3L243.8 70.8L244.5 71.4L244.7 72.1L244.5 72.8Z\"/><path class=\"iso-line\" data-tone=\"lo\" data-part=\"thread\" d=\"M244.7 375.5L244.6 376.1L244.1 376.6L243.4 377.1L242.5 377.5L241.4 377.7L240.2 377.8L239 377.7L237.9 377.5L237 377.1L236.3 376.6L235.8 376.1L235.7 375.5M244.7 370.1L244.6 370.7L244.1 371.3L243.4 371.7L242.5 372.1L241.4 372.3L240.2 372.4L239 372.3L237.9 372.1L237 371.7L236.3 371.3L235.8 370.7L235.7 370.1M244.7 364.8L244.6 365.4L244.1 365.9L243.4 366.4L242.5 366.7L241.4 367L240.2 367.1L239 367L237.9 366.7L237 366.4L236.3 365.9L235.8 365.4L235.7 364.8M244.7 359.4L244.6 360L244.1 360.6L243.4 361L242.5 361.4L241.4 361.6L240.2 361.7L239 361.6L237.9 361.4L237 361L236.3 360.6L235.8 360L235.7 359.4M244.7 354.1L244.6 354.7L244.1 355.2L243.4 355.7L242.5 356L241.4 356.3L240.2 356.3L239 356.3L237.9 356L237 355.7L236.3 355.2L235.8 354.7L235.7 354.1M244.7 348.7L244.6 349.3L244.1 349.9L243.4 350.3L242.5 350.7L241.4 350.9L240.2 351L239 350.9L237.9 350.7L237 350.3L236.3 349.9L235.8 349.3L235.7 348.7M244.7 343.4L244.6 344L244.1 344.5L243.4 345L242.5 345.3L241.4 345.6L240.2 345.6L239 345.6L237.9 345.3L237 345L236.3 344.5L235.8 344L235.7 343.4M244.7 338L244.6 338.6L244.1 339.1L243.4 339.6L242.5 340L241.4 340.2L240.2 340.3L239 340.2L237.9 340L237 339.6L236.3 339.1L235.8 338.6L235.7 338M244.7 332.7L244.6 333.2L244.1 333.8L243.4 334.3L242.5 334.6L241.4 334.9L240.2 334.9L239 334.9L237.9 334.6L237 334.3L236.3 333.8L235.8 333.2L235.7 332.7M244.7 327.3L244.6 327.9L244.1 328.4L243.4 328.9L242.5 329.3L241.4 329.5L240.2 329.6L239 329.5L237.9 329.3L237 328.9L236.3 328.4L235.8 327.9L235.7 327.3M244.7 322L244.6 322.5L244.1 323.1L243.4 323.6L242.5 323.9L241.4 324.1L240.2 324.2L239 324.1L237.9 323.9L237 323.6L236.3 323.1L235.8 322.5L235.7 322M244.7 316.6L244.6 317.2L244.1 317.7L243.4 318.2L242.5 318.6L241.4 318.8L240.2 318.9L239 318.8L237.9 318.6L237 318.2L236.3 317.7L235.8 317.2L235.7 316.6M244.7 311.2L244.6 311.8L244.1 312.4L243.4 312.9L242.5 313.2L241.4 313.4L240.2 313.5L239 313.4L237.9 313.2L237 312.9L236.3 312.4L235.8 311.8L235.7 311.2M244.7 305.9L244.6 306.5L244.1 307L243.4 307.5L242.5 307.9L241.4 308.1L240.2 308.2L239 308.1L237.9 307.9L237 307.5L236.3 307L235.8 306.5L235.7 305.9M244.7 300.5L244.6 301.1L244.1 301.7L243.4 302.1L242.5 302.5L241.4 302.7L240.2 302.8L239 302.7L237.9 302.5L237 302.1L236.3 301.7L235.8 301.1L235.7 300.5M244.7 295.2L244.6 295.8L244.1 296.3L243.4 296.8L242.5 297.2L241.4 297.4L240.2 297.5L239 297.4L237.9 297.2L237 296.8L236.3 296.3L235.8 295.8L235.7 295.2M244.7 289.8L244.6 290.4L244.1 291L243.4 291.4L242.5 291.8L241.4 292L240.2 292.1L239 292L237.9 291.8L237 291.4L236.3 291L235.8 290.4L235.7 289.8M244.7 284.5L244.6 285.1L244.1 285.6L243.4 286.1L242.5 286.4L241.4 286.7L240.2 286.7L239 286.7L237.9 286.4L237 286.1L236.3 285.6L235.8 285.1L235.7 284.5M244.7 279.1L244.6 279.7L244.1 280.3L243.4 280.7L242.5 281.1L241.4 281.3L240.2 281.4L239 281.3L237.9 281.1L237 280.7L236.3 280.3L235.8 279.7L235.7 279.1M244.7 273.8L244.6 274.4L244.1 274.9L243.4 275.4L242.5 275.7L241.4 276L240.2 276L239 276L237.9 275.7L237 275.4L236.3 274.9L235.8 274.4L235.7 273.8M244.7 268.4L244.6 269L244.1 269.6L243.4 270L242.5 270.4L241.4 270.6L240.2 270.7L239 270.6L237.9 270.4L237 270L236.3 269.6L235.8 269L235.7 268.4M244.7 263.1L244.6 263.7L244.1 264.2L243.4 264.7L242.5 265L241.4 265.3L240.2 265.3L239 265.3L237.9 265L237 264.7L236.3 264.2L235.8 263.7L235.7 263.1M244.7 72.1L244.6 72.7L244.1 73.3L243.4 73.7L242.5 74.1L241.4 74.3L240.2 74.4L239 74.3L237.9 74.1L237 73.7L236.3 73.3L235.8 72.7L235.7 72.1M244.7 77.5L244.6 78.1L244.1 78.6L243.4 79.1L242.5 79.4L241.4 79.7L240.2 79.7L239 79.7L237.9 79.4L237 79.1L236.3 78.6L235.8 78.1L235.7 77.5M244.7 82.8L244.6 83.4L244.1 84L243.4 84.4L242.5 84.8L241.4 85L240.2 85.1L239 85L237.9 84.8L237 84.4L236.3 84L235.8 83.4L235.7 82.8M244.7 88.2L244.6 88.8L244.1 89.3L243.4 89.8L242.5 90.1L241.4 90.4L240.2 90.5L239 90.4L237.9 90.1L237 89.8L236.3 89.3L235.8 88.8L235.7 88.2M244.7 93.5L244.6 94.1L244.1 94.7L243.4 95.1L242.5 95.5L241.4 95.7L240.2 95.8L239 95.7L237.9 95.5L237 95.1L236.3 94.7L235.8 94.1L235.7 93.5M244.7 98.9L244.6 99.5L244.1 100L243.4 100.5L242.5 100.9L241.4 101.1L240.2 101.2L239 101.1L237.9 100.9L237 100.5L236.3 100L235.8 99.5L235.7 98.9M244.7 104.2L244.6 104.8L244.1 105.4L243.4 105.8L242.5 106.2L241.4 106.4L240.2 106.5L239 106.4L237.9 106.2L237 105.8L236.3 105.4L235.8 104.8L235.7 104.2M244.7 109.6L244.6 110.2L244.1 110.7L243.4 111.2L242.5 111.6L241.4 111.8L240.2 111.9L239 111.8L237.9 111.6L237 111.2L236.3 110.7L235.8 110.2L235.7 109.6M244.7 115L244.6 115.5L244.1 116.1L243.4 116.6L242.5 116.9L241.4 117.1L240.2 117.2L239 117.1L237.9 116.9L237 116.6L236.3 116.1L235.8 115.5L235.7 115M244.7 120.3L244.6 120.9L244.1 121.4L243.4 121.9L242.5 122.3L241.4 122.5L240.2 122.6L239 122.5L237.9 122.3L237 121.9L236.3 121.4L235.8 120.9L235.7 120.3M244.7 125.7L244.6 126.2L244.1 126.8L243.4 127.3L242.5 127.6L241.4 127.8L240.2 127.9L239 127.8L237.9 127.6L237 127.3L236.3 126.8L235.8 126.2L235.7 125.7M244.7 131L244.6 131.6L244.1 132.1L243.4 132.6L242.5 133L241.4 133.2L240.2 133.3L239 133.2L237.9 133L237 132.6L236.3 132.1L235.8 131.6L235.7 131M244.7 136.4L244.6 137L244.1 137.5L243.4 138L242.5 138.3L241.4 138.6L240.2 138.6L239 138.6L237.9 138.3L237 138L236.3 137.5L235.8 137L235.7 136.4M244.7 141.7L244.6 142.3L244.1 142.9L243.4 143.3L242.5 143.7L241.4 143.9L240.2 144L239 143.9L237.9 143.7L237 143.3L236.3 142.9L235.8 142.3L235.7 141.7M244.7 147.1L244.6 147.7L244.1 148.2L243.4 148.7L242.5 149L241.4 149.3L240.2 149.3L239 149.3L237.9 149L237 148.7L236.3 148.2L235.8 147.7L235.7 147.1M244.7 152.4L244.6 153L244.1 153.6L243.4 154L242.5 154.4L241.4 154.6L240.2 154.7L239 154.6L237.9 154.4L237 154L236.3 153.6L235.8 153L235.7 152.4M244.7 157.8L244.6 158.4L244.1 158.9L243.4 159.4L242.5 159.7L241.4 160L240.2 160L239 160L237.9 159.7L237 159.4L236.3 158.9L235.8 158.4L235.7 157.8M244.7 163.1L244.6 163.7L244.1 164.3L243.4 164.7L242.5 165.1L241.4 165.3L240.2 165.4L239 165.3L237.9 165.1L237 164.7L236.3 164.3L235.8 163.7L235.7 163.1M244.7 168.5L244.6 169.1L244.1 169.6L243.4 170.1L242.5 170.5L241.4 170.7L240.2 170.8L239 170.7L237.9 170.5L237 170.1L236.3 169.6L235.8 169.1L235.7 168.5M244.7 173.8L244.6 174.4L244.1 175L243.4 175.4L242.5 175.8L241.4 176L240.2 176.1L239 176L237.9 175.8L237 175.4L236.3 175L235.8 174.4L235.7 173.8M244.7 179.2L244.6 179.8L244.1 180.3L243.4 180.8L242.5 181.2L241.4 181.4L240.2 181.5L239 181.4L237.9 181.2L237 180.8L236.3 180.3L235.8 179.8L235.7 179.2M244.7 184.5L244.6 185.1L244.1 185.7L243.4 186.2L242.5 186.5L241.4 186.7L240.2 186.8L239 186.7L237.9 186.5L237 186.2L236.3 185.7L235.8 185.1L235.7 184.5M244.7 189.9L244.6 190.5L244.1 191L243.4 191.5L242.5 191.9L241.4 192.1L240.2 192.2L239 192.1L237.9 191.9L237 191.5L236.3 191L235.8 190.5L235.7 189.9M244.7 195.3L244.6 195.8L244.1 196.4L243.4 196.9L242.5 197.2L241.4 197.4L240.2 197.5L239 197.4L237.9 197.2L237 196.9L236.3 196.4L235.8 195.8L235.7 195.3M244.7 200.6L244.6 201.2L244.1 201.7L243.4 202.2L242.5 202.6L241.4 202.8L240.2 202.9L239 202.8L237.9 202.6L237 202.2L236.3 201.7L235.8 201.2L235.7 200.6M244.7 206L244.6 206.5L244.1 207.1L243.4 207.6L242.5 207.9L241.4 208.2L240.2 208.2L239 208.2L237.9 207.9L237 207.6L236.3 207.1L235.8 206.5L235.7 206M244.7 211.3L244.6 211.9L244.1 212.4L243.4 212.9L242.5 213.3L241.4 213.5L240.2 213.6L239 213.5L237.9 213.3L237 212.9L236.3 212.4L235.8 211.9L235.7 211.3M244.7 216.7L244.6 217.3L244.1 217.8L243.4 218.3L242.5 218.6L241.4 218.9L240.2 218.9L239 218.9L237.9 218.6L237 218.3L236.3 217.8L235.8 217.3L235.7 216.7M244.7 222L244.6 222.6L244.1 223.2L243.4 223.6L242.5 224L241.4 224.2L240.2 224.3L239 224.2L237.9 224L237 223.6L236.3 223.2L235.8 222.6L235.7 222M244.7 227.4L244.6 228L244.1 228.5L243.4 229L242.5 229.3L241.4 229.6L240.2 229.6L239 229.6L237.9 229.3L237 229L236.3 228.5L235.8 228L235.7 227.4M244.7 232.7L244.6 233.3L244.1 233.9L243.4 234.3L242.5 234.7L241.4 234.9L240.2 235L239 234.9L237.9 234.7L237 234.3L236.3 233.9L235.8 233.3L235.7 232.7M244.7 238.1L244.6 238.7L244.1 239.2L243.4 239.7L242.5 240L241.4 240.3L240.2 240.4L239 240.3L237.9 240L237 239.7L236.3 239.2L235.8 238.7L235.7 238.1M244.7 243.4L244.6 244L244.1 244.6L243.4 245L242.5 245.4L241.4 245.6L240.2 245.7L239 245.6L237.9 245.4L237 245L236.3 244.6L235.8 244L235.7 243.4M244.7 248.8L244.6 249.4L244.1 249.9L243.4 250.4L242.5 250.8L241.4 251L240.2 251.1L239 251L237.9 250.8L237 250.4L236.3 249.9L235.8 249.4L235.7 248.8M244.7 254.1L244.6 254.7L244.1 255.3L243.4 255.7L242.5 256.1L241.4 256.3L240.2 256.4L239 256.3L237.9 256.1L237 255.7L236.3 255.3L235.8 254.7L235.7 254.1\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M235.7 72.2L235.9 71.5L236.5 70.8L237.5 70.3L238.7 70L240.1 69.9L241.5 70L242.8 70.3L243.8 70.8L244.5 71.4L244.7 72.1M244.7 375.5L244.5 376.2L243.9 376.8L242.9 377.3L241.7 377.6L240.3 377.8L238.9 377.7L237.6 377.3L236.6 376.9L235.9 376.2L235.7 375.5M235.7 72.2L235.7 375.5M244.7 72.1L244.7 375.5\"/></g></g><g class=\"it\" data-name=\"rad.post.l\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M355.7 237.3L356.1 236.4L379.3 219.9L380.9 219.4L382.7 219.6L390.5 222.3L391.5 223.1L391.5 422.9L391.1 423.9L367.9 440.4L366.3 440.9L364.5 440.7L356.7 438L355.7 437.2Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M391.5 422.9L391.1 423.9L391.1 224L391.5 223.1ZM391.1 423.9L367.9 440.4L367.9 240.5L391.1 224ZM367.9 440.4L366.3 440.9L366.3 241L367.9 240.5Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M366.3 440.9L364.5 440.7L364.5 240.8L366.3 241Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M364.5 440.7L356.7 438L356.7 238.1L364.5 240.8ZM356.7 438L355.7 437.2L355.7 237.3L356.7 238.1Z\"/><path class=\"iso-top\" d=\"M390.5 222.3L391.5 223.1L391.1 224L367.9 240.5L366.3 241L364.5 240.8L356.7 238.1L355.7 237.3L356.1 236.4L379.3 219.9L380.9 219.4L382.7 219.6Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M391.5 223.1L391.1 224L367.9 240.5L366.3 241L364.5 240.8L356.7 238.1L355.7 237.3\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M391.5 223.1L390.3 223.8L367.4 240.2L366.2 240.6L364.8 240.5L357.3 237.8L355.7 237.3\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M355.7 237.3L356.1 236.4L379.3 219.9L380.9 219.4L382.7 219.6L390.5 222.3L391.5 223.1M391.5 422.9L391.1 423.9L367.9 440.4L366.3 440.9L364.5 440.7L356.7 438L355.7 437.2M391.5 223.1L391.5 422.9M355.7 237.3L355.7 437.2\"/></g></g><g class=\"it\" data-name=\"rad.rail\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M367 423.5L367.2 423.1L391.8 405.5L392.6 405.3L393.5 405.4L526.5 451.9L527 452.3L527 470.2L526.8 470.6L502.2 488.2L501.4 488.4L500.5 488.3L367.5 441.8L367 441.4Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M527 470.2L526.8 470.6L526.8 452.8L527 452.3ZM526.8 470.6L502.2 488.2L502.2 470.3L526.8 452.8ZM502.2 488.2L501.4 488.4L501.4 470.6L502.2 470.3Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M501.4 488.4L500.5 488.3L500.5 470.5L501.4 470.6Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M500.5 488.3L367.5 441.8L367.5 423.9L500.5 470.5ZM367.5 441.8L367 441.4L367 423.5L367.5 423.9Z\"/><path class=\"iso-top\" d=\"M526.5 451.9L527 452.3L526.8 452.8L502.2 470.3L501.4 470.6L500.5 470.5L367.5 423.9L367 423.5L367.2 423.1L391.8 405.5L392.6 405.3L393.5 405.4Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M527 452.3L526.8 452.8L502.2 470.3L501.4 470.6L500.5 470.5L367.5 423.9L367 423.5\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M367 423.5L367.2 423.1L391.8 405.5L392.6 405.3L393.5 405.4L526.5 451.9L527 452.3M527 470.2L526.8 470.6L502.2 488.2L501.4 488.4L500.5 488.3L367.5 441.8L367 441.4M527 452.3L527 470.2M367 423.5L367 441.4\"/></g></g><g class=\"it\" data-name=\"cable.sol:1\" data-route=\"cable.sol\"><g class=\"tb\"><path class=\"tb-body\" d=\"M346.7 435.3L347.3 436.1L349 437.4L350.7 438.3L352.4 438.9L353.9 439.4L355.4 440L356.9 440.5L358.5 441L360 441.6L361.5 442.1L363 442.6L364.6 443.2L366.1 443.7L367.6 444.2L369.1 444.8L370.3 445.2L371.5 441.7L370.3 441.3L368.8 440.7L367.3 440.2L365.8 439.7L364.3 439.1L362.7 438.6L361.2 438.1L359.7 437.5L358.2 437L356.6 436.5L355.1 435.9L353.6 435.4L352.2 434.9L351 434.3L350 433.5L349.7 433.1Z\"/><path class=\"tb-shine\" d=\"M347.2 433.6L348.5 435L349.9 436L351.5 436.6L353 437.1L354.5 437.6L356 438.2L357.6 438.7L359.1 439.2L360.6 439.8L362.1 440.3L363.7 440.8L365.2 441.4L366.7 441.9L368.2 442.4L369.8 443L371.3 443.5L371.8 443.7L372.1 442.8L371.6 442.7L370 442.1L368.5 441.6L367 441.1L365.5 440.5L364 440L362.4 439.5L360.9 438.9L359.4 438.4L357.9 437.9L356.3 437.3L354.8 436.8L353.3 436.3L351.8 435.8L350.4 435.2L349.1 434.4L348 433.2Z\"/><path class=\"tb-shade\" d=\"M347.4 433.5L348.3 435.2L349.5 436.6L351.1 437.5L352.6 438.2L354.2 438.7L355.7 439.2L357.2 439.8L358.7 440.3L360.2 440.8L361.8 441.4L363.3 441.9L364.8 442.4L366.3 443L367.9 443.5L369.4 444L370.9 444.6L371.4 444.7L371.6 444L371.2 443.9L369.6 443.3L368.1 442.8L366.6 442.3L365.1 441.7L363.5 441.2L362 440.7L360.5 440.1L359 439.6L357.4 439.1L355.9 438.5L354.4 438L352.9 437.5L351.4 436.8L349.9 435.9L348.8 434.7L348 433.1Z\"/><path class=\"iso-line tb-edge\" data-tone=\"mid\" d=\"M346.7 435.3L347.3 436.1L349 437.4L350.7 438.3L352.4 438.9L353.9 439.4L355.4 440L356.9 440.5L358.5 441L360 441.6L361.5 442.1L363 442.6L364.6 443.2L366.1 443.7L367.6 444.2L369.1 444.8L370.3 445.2M349.7 433.1L350 433.5L351 434.3L352.2 434.9L353.6 435.4L355.1 435.9L356.6 436.5L358.2 437L359.7 437.5L361.2 438.1L362.7 438.6L364.3 439.1L365.8 439.7L367.3 440.2L368.8 440.7L370.3 441.3L371.5 441.7\"/></g></g><g class=\"it\" data-name=\"cable.sol:2\" data-route=\"cable.sol\"><g class=\"tb\"><path class=\"tb-body\" d=\"M368.6 444.6L369.1 444.8L370.6 445.3L372.2 445.8L373.7 446.4L375.2 446.9L376.7 447.4L378.3 448L379.8 448.5L381.3 449L382.8 449.6L384.4 450.1L385.9 450.6L387.4 451.2L388.9 451.7L390.5 452.2L391.8 452.7L393 449.2L391.7 448.7L390.2 448.2L388.6 447.7L387.1 447.1L385.6 446.6L384.1 446.1L382.5 445.5L381 445L379.5 444.5L378 443.9L376.4 443.4L374.9 442.9L373.4 442.3L371.9 441.8L370.3 441.3L369.8 441.1Z\"/><path class=\"tb-shine\" d=\"M368.4 442.5L369.8 443L371.3 443.5L372.8 444L374.3 444.6L375.8 445.1L377.4 445.6L378.9 446.2L380.4 446.7L381.9 447.2L383.5 447.8L385 448.3L386.5 448.8L388 449.4L389.6 449.9L391.1 450.4L392.6 451L393.2 451.2L393.5 450.4L392.9 450.1L391.4 449.6L389.9 449.1L388.3 448.5L386.8 448L385.3 447.5L383.8 446.9L382.2 446.4L380.7 445.9L379.2 445.3L377.7 444.8L376.1 444.3L374.6 443.7L373.1 443.2L371.6 442.7L370 442.1L368.7 441.7Z\"/><path class=\"tb-shade\" d=\"M368 443.5L369.4 444L370.9 444.6L372.4 445.1L374 445.6L375.5 446.2L377 446.7L378.5 447.2L380 447.8L381.6 448.3L383.1 448.8L384.6 449.4L386.1 449.9L387.7 450.4L389.2 451L390.7 451.5L392.2 452L392.9 452.2L393.1 451.5L392.5 451.3L391 450.8L389.4 450.3L387.9 449.7L386.4 449.2L384.9 448.7L383.3 448.1L381.8 447.6L380.3 447.1L378.8 446.5L377.2 446L375.7 445.5L374.2 444.9L372.7 444.4L371.2 443.9L369.6 443.3L368.3 442.8Z\"/><path class=\"iso-line tb-edge\" data-tone=\"mid\" d=\"M368.6 444.6L369.1 444.8L370.6 445.3L372.2 445.8L373.7 446.4L375.2 446.9L376.7 447.4L378.3 448L379.8 448.5L381.3 449L382.8 449.6L384.4 450.1L385.9 450.6L387.4 451.2L388.9 451.7L390.5 452.2L391.8 452.7M369.8 441.1L370.3 441.3L371.9 441.8L373.4 442.3L374.9 442.9L376.4 443.4L378 443.9L379.5 444.5L381 445L382.5 445.5L384.1 446.1L385.6 446.6L387.1 447.1L388.6 447.7L390.2 448.2L391.7 448.7L393 449.2\"/></g></g><g class=\"it\" data-name=\"cable.sol:3\" data-route=\"cable.sol\"><g class=\"tb\"><path class=\"tb-body\" d=\"M390.1 452.1L390.5 452.2L392 452.8L393.5 453.3L395 453.8L396.5 454.4L398.1 454.9L399.6 455.4L401.1 456L402.6 456.5L404.2 457L405.7 457.6L407.2 458.1L408.7 458.6L410.3 459.2L411.8 459.7L413.2 460.2L414.5 456.7L413 456.2L411.5 455.7L410 455.1L408.4 454.6L406.9 454.1L405.4 453.5L403.9 453L402.3 452.5L400.8 451.9L399.3 451.4L397.8 450.9L396.2 450.3L394.7 449.8L393.2 449.3L391.7 448.7L391.3 448.6Z\"/><path class=\"tb-shine\" d=\"M389.9 450L391.1 450.4L392.6 451L394.1 451.5L395.6 452L397.2 452.6L398.7 453.1L400.2 453.6L401.7 454.2L403.3 454.7L404.8 455.2L406.3 455.8L407.8 456.3L409.4 456.8L410.9 457.4L412.4 457.9L413.9 458.4L414.7 458.7L415 457.9L414.2 457.6L412.7 457.1L411.2 456.5L409.7 456L408.1 455.5L406.6 454.9L405.1 454.4L403.6 453.9L402 453.3L400.5 452.8L399 452.3L397.5 451.7L395.9 451.2L394.4 450.7L392.9 450.1L391.4 449.6L390.1 449.2Z\"/><path class=\"tb-shade\" d=\"M389.5 451.1L390.7 451.5L392.2 452L393.8 452.6L395.3 453.1L396.8 453.6L398.3 454.2L399.9 454.7L401.4 455.2L402.9 455.8L404.4 456.3L405.9 456.8L407.5 457.4L409 457.9L410.5 458.4L412 459L413.6 459.5L414.3 459.8L414.6 459.1L413.8 458.8L412.3 458.3L410.8 457.7L409.2 457.2L407.7 456.7L406.2 456.1L404.7 455.6L403.1 455.1L401.6 454.5L400.1 454L398.6 453.5L397 452.9L395.5 452.4L394 451.9L392.5 451.3L391 450.8L389.7 450.4Z\"/><path class=\"iso-line tb-edge\" data-tone=\"mid\" d=\"M390.1 452.1L390.5 452.2L392 452.8L393.5 453.3L395 453.8L396.5 454.4L398.1 454.9L399.6 455.4L401.1 456L402.6 456.5L404.2 457L405.7 457.6L407.2 458.1L408.7 458.6L410.3 459.2L411.8 459.7L413.2 460.2M391.3 448.6L391.7 448.7L393.2 449.3L394.7 449.8L396.2 450.3L397.8 450.9L399.3 451.4L400.8 451.9L402.3 452.5L403.9 453L405.4 453.5L406.9 454.1L408.4 454.6L410 455.1L411.5 455.7L413 456.2L414.5 456.7\"/></g></g><g class=\"it\" data-name=\"cable.hr:1\" data-route=\"cable.hr\"><g class=\"tb\"><path class=\"tb-body\" d=\"M344.3 441.5L344.4 441.5L346 442.4L347.6 443L349.1 443.6L350.6 444.2L352.1 444.7L353.6 445.3L355.1 445.8L356.6 446.4L358.1 447L359.6 447.5L361.1 448.1L362.9 448.5L364.8 448.6L366.7 448L368.3 446.6L369.1 444.9L369.4 443.8L365.7 443.1L365.6 443.7L365.3 444.4L364.9 444.7L364.4 444.9L363.4 444.8L362.2 444.5L360.8 444L359.4 443.5L357.9 442.9L356.4 442.4L354.9 441.8L353.4 441.3L351.9 440.7L350.4 440.1L349 439.6L347.6 439L346.2 438.3L346.1 438.2Z\"/><path class=\"tb-shine\" d=\"M344.3 439.4L345.2 440L346.8 440.7L348.3 441.3L349.8 441.8L351.3 442.4L352.8 443L354.3 443.5L355.7 444.1L357.2 444.6L358.7 445.2L360.2 445.7L361.7 446.2L363.2 446.5L364.5 446.5L365.6 446L366.5 445.3L367.2 444.2L367.6 442.8L367.6 442.6L366.7 442.6L366.7 442.7L366.4 443.9L365.8 444.8L365.2 445.3L364.4 445.6L363.3 445.6L362 445.4L360.5 444.9L359 444.4L357.5 443.8L356.1 443.2L354.6 442.7L353.1 442.1L351.6 441.6L350.1 441L348.6 440.5L347.2 439.9L345.7 439.2L344.8 438.7Z\"/><path class=\"tb-shade\" d=\"M343.9 440L344.8 440.7L346.4 441.6L347.9 442.3L349.4 442.9L350.9 443.4L352.4 444L353.9 444.5L355.4 445.1L356.9 445.6L358.3 446.2L359.8 446.8L361.4 447.4L363 447.9L364.7 448.1L366.6 447.7L368 446.4L368.6 444.7L368.8 443L368.8 442.8L368.1 442.7L368.1 442.9L367.9 444.4L367.4 445.9L366.2 447L364.7 447.4L363.1 447.2L361.6 446.7L360.1 446.1L358.6 445.5L357.1 445L355.6 444.4L354.1 443.8L352.7 443.3L351.2 442.7L349.7 442.2L348.2 441.6L346.7 440.9L345.2 440L344.3 439.4Z\"/><path class=\"iso-line tb-edge\" data-tone=\"mid\" d=\"M344.3 441.5L344.4 441.5L346 442.4L347.6 443L349.1 443.6L350.6 444.2L352.1 444.7L353.6 445.3L355.1 445.8L356.6 446.4L358.1 447L359.6 447.5L361.1 448.1L362.9 448.5L364.8 448.6L366.7 448L368.3 446.6L369.1 444.9L369.4 443.8M346.1 438.2L346.2 438.3L347.6 439L349 439.6L350.4 440.1L351.9 440.7L353.4 441.3L354.9 441.8L356.4 442.4L357.9 442.9L359.4 443.5L360.8 444L362.2 444.5L363.4 444.8L364.4 444.9L364.9 444.7L365.3 444.4L365.6 443.7L365.7 443.1\"/></g></g><g class=\"it\" data-name=\"cable.hr:2\" data-route=\"cable.hr\"><g class=\"tb\"><path class=\"tb-body\" d=\"M368.7 445.8L369.1 444.9L369.5 443.1L369.6 441.3L369.6 439.6L369.6 438L369.6 436.4L369.6 434.8L369.6 433.2L369.6 431.6L369.6 430L369.6 428.4L369.6 426.8L369.6 425.1L369.6 423.5L369.6 421.8L369.3 420.1L368.8 418.5L368.8 418.5L365.4 420.1L365.5 420.1L365.7 420.9L365.9 422.1L365.9 423.6L365.9 425.1L365.9 426.8L365.9 428.4L365.9 430L365.9 431.6L365.9 433.2L365.9 434.8L365.9 436.4L365.9 438L365.9 439.6L365.9 441.2L365.9 442.6L365.6 443.7L365.4 444.1Z\"/><path class=\"tb-shine\" d=\"M366.4 445.4L366.5 445.3L367.2 444.2L367.6 442.8L367.7 441.2L367.8 439.6L367.8 438L367.8 436.4L367.8 434.8L367.8 433.2L367.8 431.6L367.8 430L367.8 428.4L367.8 426.8L367.8 425.1L367.8 423.5L367.8 422L367.7 420.5L367.4 419.2L367.2 418.5L366.5 419L366.6 419.6L366.8 420.7L366.9 422L366.9 423.6L366.9 425.1L366.9 426.8L366.9 428.4L366.9 430L366.9 431.6L366.9 433.2L366.9 434.8L366.9 436.4L366.9 438L366.9 439.6L366.9 441.2L366.7 442.7L366.4 443.9L365.8 444.8L365.7 444.8Z\"/><path class=\"tb-shade\" d=\"M367.8 446.6L368 446.4L368.6 444.7L368.8 443L368.8 441.3L368.8 439.6L368.8 438L368.8 436.4L368.8 434.8L368.8 433.2L368.8 431.6L368.8 430L368.8 428.4L368.8 426.8L368.8 425.1L368.8 423.5L368.6 421.9L368.3 420.4L367.6 419.1L367 418.6L366.4 419.1L366.9 419.4L367.6 420.5L367.9 422L368 423.5L368 425.1L368 426.8L368 428.4L368 430L368 431.6L368 433.2L368 434.8L368 436.4L368 438L368 439.6L368 441.2L368.1 442.9L367.9 444.4L367.4 445.9L367.2 446.1Z\"/><path class=\"iso-line tb-edge\" data-tone=\"mid\" d=\"M368.7 445.8L369.1 444.9L369.5 443.1L369.6 441.3L369.6 439.6L369.6 438L369.6 436.4L369.6 434.8L369.6 433.2L369.6 431.6L369.6 430L369.6 428.4L369.6 426.8L369.6 425.1L369.6 423.5L369.6 421.8L369.3 420.1L368.8 418.5L368.8 418.5M365.4 444.1L365.6 443.7L365.9 442.6L365.9 441.2L365.9 439.6L365.9 438L365.9 436.4L365.9 434.8L365.9 433.2L365.9 431.6L365.9 430L365.9 428.4L365.9 426.8L365.9 425.1L365.9 423.6L365.9 422.1L365.7 420.9L365.5 420.1L365.4 420.1\"/></g></g><g class=\"it\" data-name=\"cable.sol:4\" data-route=\"cable.sol\"><g class=\"tb\"><path class=\"tb-body\" d=\"M411.5 459.6L411.8 459.7L413.3 460.2L414.8 460.8L416.3 461.3L417.9 461.8L419.4 462.4L420.9 462.9L422.4 463.4L424 464L425.5 464.5L427 465L428.5 465.6L430.1 466.1L431.6 466.6L433.1 467.2L434.6 467.7L434.7 467.7L435.9 464.2L435.9 464.2L434.3 463.7L432.8 463.1L431.3 462.6L429.8 462.1L428.2 461.5L426.7 461L425.2 460.5L423.7 459.9L422.1 459.4L420.6 458.9L419.1 458.3L417.6 457.8L416 457.3L414.5 456.7L413 456.2L412.8 456.1Z\"/><path class=\"tb-shine\" d=\"M411.3 457.5L412.4 457.9L413.9 458.4L415.5 459L417 459.5L418.5 460L420 460.6L421.5 461.1L423.1 461.6L424.6 462.2L426.1 462.7L427.6 463.2L429.2 463.8L430.7 464.3L432.2 464.8L433.7 465.4L435.3 465.9L436.2 466.2L436.5 465.4L435.6 465.1L434 464.5L432.5 464L431 463.5L429.5 462.9L427.9 462.4L426.4 461.9L424.9 461.3L423.4 460.8L421.8 460.3L420.3 459.7L418.8 459.2L417.3 458.7L415.7 458.1L414.2 457.6L412.7 457.1L411.6 456.7Z\"/><path class=\"tb-shade\" d=\"M411 458.6L412 459L413.6 459.5L415.1 460L416.6 460.6L418.1 461.1L419.7 461.6L421.2 462.2L422.7 462.7L424.2 463.2L425.7 463.8L427.3 464.3L428.8 464.8L430.3 465.4L431.8 465.9L433.4 466.4L434.9 467L435.8 467.3L436 466.6L435.1 466.3L433.6 465.7L432.1 465.2L430.6 464.7L429 464.1L427.5 463.6L426 463.1L424.5 462.5L422.9 462L421.4 461.5L419.9 460.9L418.4 460.4L416.9 459.9L415.3 459.3L413.8 458.8L412.3 458.3L411.2 457.9Z\"/><path class=\"iso-line tb-edge\" data-tone=\"mid\" d=\"M411.5 459.6L411.8 459.7L413.3 460.2L414.8 460.8L416.3 461.3L417.9 461.8L419.4 462.4L420.9 462.9L422.4 463.4L424 464L425.5 464.5L427 465L428.5 465.6L430.1 466.1L431.6 466.6L433.1 467.2L434.6 467.7L434.7 467.7M412.8 456.1L413 456.2L414.5 456.7L416 457.3L417.6 457.8L419.1 458.3L420.6 458.9L422.1 459.4L423.7 459.9L425.2 460.5L426.7 461L428.2 461.5L429.8 462.1L431.3 462.6L432.8 463.1L434.3 463.7L435.9 464.2L435.9 464.2\"/></g></g><g class=\"it\" data-name=\"up.rail\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M270.8 75.8L271 75.3L271.9 74.6L272.7 74.4L273.7 74.5L278.4 76.1L278.9 76.5L278.9 387L278.7 387.5L277.8 388.2L277 388.4L276 388.3L271.3 386.7L270.8 386.3Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M278.9 387L278.7 387.5L278.7 77L278.9 76.5ZM278.7 387.5L277.8 388.2L277.8 77.7L278.7 77ZM277.8 388.2L277 388.4L277 77.9L277.8 77.7Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M277 388.4L276 388.3L276 77.8L277 77.9Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M276 388.3L271.3 386.7L271.3 76.2L276 77.8ZM271.3 386.7L270.8 386.3L270.8 75.8L271.3 76.2Z\"/><path class=\"iso-top\" d=\"M278.4 76.1L278.9 76.5L278.7 77L277.8 77.7L277 77.9L276 77.8L271.3 76.2L270.8 75.8L271 75.3L271.9 74.6L272.7 74.4L273.7 74.5Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M278.9 76.5L278.7 77L277.8 77.7L277 77.9L276 77.8L271.3 76.2L270.8 75.8\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M270.8 75.8L271 75.3L271.9 74.6L272.7 74.4L273.7 74.5L278.4 76.1L278.9 76.5M278.9 387L278.7 387.5L277.8 388.2L277 388.4L276 388.3L271.3 386.7L270.8 386.3M278.9 76.5L278.9 387M270.8 75.8L270.8 386.3\"/></g></g><g class=\"it\" data-name=\"lower.bushing\" data-move=\"jawL\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M261.4 332.2L261.7 331.6L266 328.5L267 328.2L268.3 328.3L279.1 332.1L279.7 332.6L279.7 345.1L279.5 345.8L275.2 348.8L274.2 349.1L272.9 349L262.1 345.2L261.4 344.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M279.7 345.1L279.5 345.8L279.5 333.3L279.7 332.6ZM279.5 345.8L275.2 348.8L275.2 336.3L279.5 333.3ZM275.2 348.8L274.2 349.1L274.2 336.6L275.2 336.3Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M274.2 349.1L272.9 349L272.9 336.5L274.2 336.6Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M272.9 349L262.1 345.2L262.1 332.7L272.9 336.5ZM262.1 345.2L261.4 344.7L261.4 332.2L262.1 332.7Z\"/><path class=\"iso-top\" d=\"M279.1 332.1L279.7 332.6L279.5 333.3L275.2 336.3L274.2 336.6L272.9 336.5L262.1 332.7L261.4 332.2L261.7 331.6L266 328.5L267 328.2L268.3 328.3Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M279.7 332.6L279.5 333.3L275.2 336.3L274.2 336.6L272.9 336.5L262.1 332.7L261.4 332.2\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M261.4 332.2L261.7 331.6L266 328.5L267 328.2L268.3 328.3L279.1 332.1L279.7 332.6M279.7 345.1L279.5 345.8L275.2 348.8L274.2 349.1L272.9 349L262.1 345.2L261.4 344.7M279.7 332.6L279.7 345.1M261.4 332.2L261.4 344.7\"/></g></g><g class=\"it\" data-name=\"lower.carriage\" data-move=\"jawL\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M189.8 316.9L190.6 315.9L197.6 310.9L199.3 310.2L201.4 310L203.4 310.4L270.9 334L272.3 334.8L272.6 335.9L272.6 351.9L271.9 352.9L264.8 358L263.2 358.7L261.1 358.9L259.1 358.5L191.6 334.9L190.2 334.1L189.8 333Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M272.6 351.9L271.9 352.9L271.9 336.9L272.6 335.9ZM271.9 352.9L264.8 358L264.8 341.9L271.9 336.9ZM264.8 358L263.2 358.7L263.2 342.6L264.8 341.9Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M263.2 358.7L261.1 358.9L261.1 342.8L263.2 342.6Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M261.1 358.9L259.1 358.5L259.1 342.4L261.1 342.8Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M259.1 358.5L191.6 334.9L191.6 318.8L259.1 342.4ZM191.6 334.9L190.2 334.1L190.2 318L191.6 318.8ZM190.2 334.1L189.8 333L189.8 316.9L190.2 318Z\"/><path class=\"iso-top\" d=\"M270.9 334L272.3 334.8L272.6 335.9L271.9 336.9L264.8 341.9L263.2 342.6L261.1 342.8L259.1 342.4L191.6 318.8L190.2 318L189.8 316.9L190.6 315.9L197.6 310.9L199.3 310.2L201.4 310L203.4 310.4Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M272.6 335.9L271.9 336.9L264.8 341.9L263.2 342.6L261.1 342.8L259.1 342.4L191.6 318.8L190.2 318L189.8 316.9\"/><path class=\"iso-line iso-bevel\" data-tone=\"lo\" d=\"M272.6 335.9L271 336.6L264.1 341.6L262.8 342.2L261.2 342.3L259.6 342L192.3 318.4L191.1 317.8L189.8 316.9\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M272.6 343.9L271.9 344.9L264.8 350L263.2 350.7L261.1 350.8L259.1 350.5L191.6 326.8L190.2 326L189.8 325\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M189.8 316.9L190.6 315.9L197.6 310.9L199.3 310.2L201.4 310L203.4 310.4L270.9 334L272.3 334.8L272.6 335.9M272.6 351.9L271.9 352.9L264.8 358L263.2 358.7L261.1 358.9L259.1 358.5L191.6 334.9L190.2 334.1L189.8 333M272.6 335.9L272.6 351.9M189.8 316.9L189.8 333\"/></g><g class=\"iso-dots\" data-tone=\"mid\"><circle cx=\"199.2\" cy=\"315.2\" r=\"0.5\"/><circle cx=\"263.3\" cy=\"337.6\" r=\"0.5\"/></g><g class=\"iso-dots\" data-tone=\"mid\"><circle cx=\"198.3\" cy=\"332.9\" r=\"0.55\"/><circle cx=\"252.3\" cy=\"351.9\" r=\"0.55\"/></g><path class=\"iso-line\" data-tone=\"lo\" d=\"M200.2 333.6L200 332.8L199.6 332L199 331.4L198.3 331L197.6 330.9L197 331.1L196.6 331.6L196.5 332.3L196.6 333.1L197 333.9L197.6 334.5L198.3 334.9L199 335L199.6 334.8L200 334.3ZM254.2 352.5L254 351.7L253.6 350.9L253 350.3L252.3 349.9L251.6 349.8L251 350L250.6 350.5L250.5 351.2L250.6 352L251 352.8L251.6 353.4L252.3 353.8L253 353.9L253.6 353.7L254 353.2Z\"/></g><g class=\"it\" data-name=\"cable.sol:5\" data-route=\"cable.sol\"><g class=\"tb\"><path class=\"tb-body\" d=\"M433 467.1L433.1 467.2L434.6 467.7L436.2 468.2L437.7 468.8L439.2 469.3L440.7 469.8L442.2 470.4L443.8 470.9L445.3 471.4L446.8 472L448.3 472.5L449.9 473L451.4 473.6L452.9 474.1L454.4 474.6L456 475.2L456.2 475.2L457.4 471.7L457.2 471.7L455.7 471.1L454.1 470.6L452.6 470.1L451.1 469.5L449.6 469L448 468.5L446.5 467.9L445 467.4L443.5 466.9L441.9 466.3L440.4 465.8L438.9 465.3L437.4 464.7L435.9 464.2L434.3 463.7L434.2 463.6Z\"/><path class=\"tb-shine\" d=\"M432.8 465L433.7 465.4L435.3 465.9L436.8 466.4L438.3 467L439.8 467.5L441.3 468L442.9 468.6L444.4 469.1L445.9 469.6L447.4 470.2L449 470.7L450.5 471.2L452 471.8L453.5 472.3L455.1 472.8L456.6 473.4L457.6 473.7L457.9 472.9L456.9 472.5L455.4 472L453.8 471.5L452.3 470.9L450.8 470.4L449.3 469.9L447.7 469.3L446.2 468.8L444.7 468.3L443.2 467.7L441.6 467.2L440.1 466.7L438.6 466.1L437.1 465.6L435.6 465.1L434 464.5L433.1 464.2Z\"/><path class=\"tb-shade\" d=\"M432.4 466.1L433.4 466.4L434.9 467L436.4 467.5L437.9 468L439.5 468.6L441 469.1L442.5 469.6L444 470.2L445.6 470.7L447.1 471.2L448.6 471.8L450.1 472.3L451.6 472.8L453.2 473.4L454.7 473.9L456.2 474.4L457.3 474.8L457.5 474.1L456.5 473.7L454.9 473.2L453.4 472.7L451.9 472.1L450.4 471.6L448.8 471.1L447.3 470.5L445.8 470L444.3 469.5L442.7 468.9L441.2 468.4L439.7 467.9L438.2 467.3L436.7 466.8L435.1 466.3L433.6 465.7L432.7 465.4Z\"/><path class=\"iso-line tb-edge\" data-tone=\"mid\" d=\"M433 467.1L433.1 467.2L434.6 467.7L436.2 468.2L437.7 468.8L439.2 469.3L440.7 469.8L442.2 470.4L443.8 470.9L445.3 471.4L446.8 472L448.3 472.5L449.9 473L451.4 473.6L452.9 474.1L454.4 474.6L456 475.2L456.2 475.2M434.2 463.6L434.3 463.7L435.9 464.2L437.4 464.7L438.9 465.3L440.4 465.8L441.9 466.3L443.5 466.9L445 467.4L446.5 467.9L448 468.5L449.6 469L451.1 469.5L452.6 470.1L454.1 470.6L455.7 471.1L457.2 471.7L457.4 471.7\"/></g></g><g class=\"it\" data-name=\"cable.sol:6\" data-route=\"cable.sol\"><g class=\"tb\"><path class=\"tb-body\" d=\"M454.5 474.6L456 475.2L457.5 475.7L459 476.2L460.5 476.8L462 477.3L463.6 477.8L465.1 478.4L466.6 478.9L468.1 479.4L469.7 480L471.2 480.5L472.7 481L474.2 481.6L475.8 482.1L477.3 482.6L477.6 482.8L478.9 479.3L478.5 479.1L477 478.6L475.5 478.1L473.9 477.5L472.4 477L470.9 476.5L469.4 475.9L467.8 475.4L466.3 474.9L464.8 474.3L463.3 473.8L461.7 473.3L460.2 472.7L458.7 472.2L457.2 471.7L455.7 471.1Z\"/><path class=\"tb-shine\" d=\"M454.3 472.6L455.1 472.8L456.6 473.4L458.1 473.9L459.6 474.4L461.2 475L462.7 475.5L464.2 476L465.7 476.6L467.2 477.1L468.8 477.6L470.3 478.2L471.8 478.7L473.3 479.2L474.9 479.8L476.4 480.3L477.9 480.8L479.1 481.3L479.4 480.4L478.2 480L476.7 479.5L475.2 478.9L473.6 478.4L472.1 477.9L470.6 477.3L469.1 476.8L467.5 476.3L466 475.7L464.5 475.2L463 474.7L461.4 474.1L459.9 473.6L458.4 473.1L456.9 472.5L455.4 472L454.6 471.7Z\"/><path class=\"tb-shade\" d=\"M453.9 473.6L454.7 473.9L456.2 474.4L457.7 475L459.3 475.5L460.8 476L462.3 476.6L463.8 477.1L465.4 477.6L466.9 478.2L468.4 478.7L469.9 479.2L471.4 479.8L473 480.3L474.5 480.8L476 481.4L477.5 481.9L478.7 482.3L479 481.6L477.8 481.2L476.3 480.7L474.7 480.1L473.2 479.6L471.7 479.1L470.2 478.5L468.6 478L467.1 477.5L465.6 476.9L464.1 476.4L462.6 475.9L461 475.3L459.5 474.8L458 474.3L456.5 473.7L454.9 473.2L454.1 472.9Z\"/><path class=\"iso-line tb-edge\" data-tone=\"mid\" d=\"M454.5 474.6L456 475.2L457.5 475.7L459 476.2L460.5 476.8L462 477.3L463.6 477.8L465.1 478.4L466.6 478.9L468.1 479.4L469.7 480L471.2 480.5L472.7 481L474.2 481.6L475.8 482.1L477.3 482.6L477.6 482.8M455.7 471.1L457.2 471.7L458.7 472.2L460.2 472.7L461.7 473.3L463.3 473.8L464.8 474.3L466.3 474.9L467.8 475.4L469.4 475.9L470.9 476.5L472.4 477L473.9 477.5L475.5 478.1L477 478.6L478.5 479.1L478.9 479.3\"/></g></g><g class=\"it\" data-name=\"rad.core\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M386.9 227.2L387.1 226.9L392 223.3L392.6 223.2L393.2 223.2L526.9 270L527.2 270.3L527.2 452.3L527.1 452.6L522.1 456.2L521.6 456.3L521 456.3L387.3 409.5L386.9 409.2Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M527.2 452.3L527.1 452.6L527.1 270.6L527.2 270.3ZM527.1 452.6L522.1 456.2L522.1 274.1L527.1 270.6ZM522.1 456.2L521.6 456.3L521.6 274.3L522.1 274.1Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M521.6 456.3L521 456.3L521 274.2L521.6 274.3Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M521 456.3L387.3 409.5L387.3 227.4L521 274.2ZM387.3 409.5L386.9 409.2L386.9 227.2L387.3 227.4Z\"/><path class=\"iso-top\" d=\"M526.9 270L527.2 270.3L527.1 270.6L522.1 274.1L521.6 274.3L521 274.2L387.3 227.4L386.9 227.2L387.1 226.9L392 223.3L392.6 223.2L393.2 223.2Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M527.2 270.3L527.1 270.6L522.1 274.1L521.6 274.3L521 274.2L387.3 227.4L386.9 227.2\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M386.9 227.2L387.1 226.9L392 223.3L392.6 223.2L393.2 223.2L526.9 270L527.2 270.3M527.2 452.3L527.1 452.6L522.1 456.2L521.6 456.3L521 456.3L387.3 409.5L386.9 409.2M527.2 270.3L527.2 452.3M386.9 227.2L386.9 409.2\"/></g><path class=\"mt-heat\" data-part=\"wash\" d=\"M521.6 456.5L521.6 274.5L386.6 227.2L386.6 409.2Z\"/><path class=\"iso-line\" data-tone=\"lo\" d=\"M395.2 406.9L396.1 406.9L396.8 406.5L397.1 405.6L397.1 238.2L396.8 237.1L396.1 236.2L395.2 235.6L395.2 235.6L394.3 235.5L393.6 236L393.3 236.9L393.3 404.3L393.6 405.3L394.3 406.3L395.2 406.9ZM405.3 410.4L406.3 410.5L406.9 410L407.2 409.1L407.2 241.7L406.9 240.7L406.3 239.7L405.3 239.1L405.3 239.1L404.4 239.1L403.7 239.5L403.5 240.4L403.5 407.8L403.7 408.9L404.4 409.8L405.3 410.4ZM415.5 414L416.4 414L417.1 413.6L417.3 412.7L417.3 245.3L417.1 244.2L416.4 243.3L415.5 242.7L415.5 242.7L414.5 242.6L413.9 243.1L413.6 244L413.6 411.4L413.9 412.4L414.5 413.4L415.5 414ZM425.6 417.5L426.5 417.6L427.2 417.1L427.4 416.2L427.4 248.8L427.2 247.8L426.5 246.8L425.6 246.2L425.6 246.2L424.7 246.1L424 246.6L423.7 247.5L423.7 414.9L424 416L424.7 416.9L425.6 417.5ZM435.7 421.1L436.6 421.1L437.3 420.7L437.6 419.8L437.6 252.4L437.3 251.3L436.6 250.3L435.7 249.8L435.7 249.8L434.8 249.7L434.1 250.2L433.9 251.1L433.9 418.5L434.1 419.5L434.8 420.5L435.7 421.1ZM445.8 424.6L446.8 424.7L447.5 424.2L447.7 423.3L447.7 255.9L447.5 254.8L446.8 253.9L445.8 253.3L445.8 253.3L444.9 253.2L444.2 253.7L444 254.6L444 422L444.2 423.1L444.9 424L445.8 424.6ZM456 428.2L456.9 428.2L457.6 427.7L457.8 426.8L457.8 259.5L457.6 258.4L456.9 257.4L456 256.8L456 256.8L455 256.8L454.4 257.3L454.1 258.2L454.1 425.5L454.4 426.6L455 427.6L456 428.2ZM466.1 431.7L467 431.8L467.7 431.3L468 430.4L468 263L467.7 261.9L467 261L466.1 260.4L466.1 260.4L465.2 260.3L464.5 260.8L464.2 261.7L464.2 429.1L464.5 430.2L465.2 431.1L466.1 431.7ZM476.2 435.3L477.2 435.3L477.8 434.8L478.1 433.9L478.1 266.6L477.8 265.5L477.2 264.5L476.2 263.9L476.2 263.9L475.3 263.9L474.6 264.4L474.4 265.3L474.4 432.6L474.6 433.7L475.3 434.7L476.2 435.3ZM486.4 438.8L487.3 438.9L488 438.4L488.2 437.5L488.2 270.1L488 269L487.3 268.1L486.4 267.5L486.4 267.5L485.4 267.4L484.7 267.9L484.5 268.8L484.5 436.2L484.7 437.3L485.4 438.2L486.4 438.8ZM496.5 442.3L497.4 442.4L498.1 441.9L498.3 441L498.3 273.6L498.1 272.6L497.4 271.6L496.5 271L496.5 271L495.6 271L494.9 271.4L494.6 272.3L494.6 439.7L494.9 440.8L495.6 441.8L496.5 442.3ZM506.6 445.9L507.5 446L508.2 445.5L508.5 444.6L508.5 277.2L508.2 276.1L507.5 275.2L506.6 274.6L506.6 274.6L505.7 274.5L505 275L504.8 275.9L504.8 443.3L505 444.3L505.7 445.3L506.6 445.9ZM516.7 449.4L517.7 449.5L518.3 449L518.6 448.1L518.6 280.7L518.3 279.7L517.7 278.7L516.7 278.1L516.7 278.1L515.8 278.1L515.1 278.5L514.9 279.4L514.9 446.8L515.1 447.9L515.8 448.8L516.7 449.4Z\"/></g><g class=\"it\" data-name=\"slat\"><g data-slat=\"0\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M375.1 382.3L376.8 381.1L511.8 428.4L511.8 455.8L510.2 457L375.1 409.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M510.2 457L510.2 429.5L511.8 428.4L511.8 455.8Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M375.1 409.7L375.1 382.3L510.2 429.5L510.2 457Z\"/><path class=\"iso-top\" d=\"M375.1 382.3L376.8 381.1L511.8 428.4L510.2 429.5Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M510.2 457L510.2 429.5M375.1 382.3L510.2 429.5M510.2 429.5L511.8 428.4\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M375.1 382.3L376.8 381.1L511.8 428.4L511.8 455.8L510.2 457L375.1 409.7Z\"/></g></g></g><g class=\"it\" data-name=\"slat\"><g data-slat=\"1\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M375.1 359.1L376.8 357.9L511.8 405.2L511.8 432.6L510.2 433.8L375.1 386.5Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M510.2 433.8L510.2 406.3L511.8 405.2L511.8 432.6Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M375.1 386.5L375.1 359.1L510.2 406.3L510.2 433.8Z\"/><path class=\"iso-top\" d=\"M375.1 359.1L376.8 357.9L511.8 405.2L510.2 406.3Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M510.2 433.8L510.2 406.3M375.1 359.1L510.2 406.3M510.2 406.3L511.8 405.2\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M375.1 359.1L376.8 357.9L511.8 405.2L511.8 432.6L510.2 433.8L375.1 386.5Z\"/></g></g></g><g class=\"it\" data-name=\"slat\"><g data-slat=\"2\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M375.1 335.9L376.8 334.7L511.8 382L511.8 409.4L510.2 410.6L375.1 363.3Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M510.2 410.6L510.2 383.1L511.8 382L511.8 409.4Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M375.1 363.3L375.1 335.9L510.2 383.1L510.2 410.6Z\"/><path class=\"iso-top\" d=\"M375.1 335.9L376.8 334.7L511.8 382L510.2 383.1Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M510.2 410.6L510.2 383.1M375.1 335.9L510.2 383.1M510.2 383.1L511.8 382\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M375.1 335.9L376.8 334.7L511.8 382L511.8 409.4L510.2 410.6L375.1 363.3Z\"/></g></g></g><g class=\"it\" data-name=\"cable.sol:7\" data-route=\"cable.sol\"><g class=\"tb\"><path class=\"tb-body\" d=\"M475.9 482.2L477.3 482.6L478.8 483.2L480.3 483.7L481.9 484.2L483.4 484.8L484.9 485.3L486.4 485.8L487.9 486.4L489.5 486.9L491 487.4L492.5 488L494 488.5L495.6 489L497.1 489.6L498.6 490.1L499.1 490.3L500.3 486.8L499.8 486.6L498.3 486.1L496.8 485.5L495.3 485L493.7 484.5L492.2 483.9L490.7 483.4L489.2 482.9L487.6 482.3L486.1 481.8L484.6 481.3L483.1 480.7L481.6 480.2L480 479.7L478.5 479.1L477.2 478.7Z\"/><path class=\"tb-shine\" d=\"M475.7 480.1L476.4 480.3L477.9 480.8L479.4 481.4L481 481.9L482.5 482.4L484 483L485.5 483.5L487 484L488.6 484.6L490.1 485.1L491.6 485.6L493.1 486.2L494.7 486.7L496.2 487.2L497.7 487.8L499.2 488.3L500.6 488.8L500.9 487.9L499.5 487.5L498 486.9L496.5 486.4L495 485.9L493.4 485.3L491.9 484.8L490.4 484.3L488.9 483.7L487.3 483.2L485.8 482.7L484.3 482.1L482.8 481.6L481.3 481.1L479.7 480.5L478.2 480L476.7 479.5L476 479.2Z\"/><path class=\"tb-shade\" d=\"M475.4 481.1L476 481.4L477.5 481.9L479.1 482.4L480.6 483L482.1 483.5L483.6 484L485.2 484.6L486.7 485.1L488.2 485.6L489.7 486.2L491.3 486.7L492.8 487.2L494.3 487.8L495.8 488.3L497.3 488.8L498.9 489.4L500.2 489.8L500.4 489.1L499.1 488.7L497.6 488.1L496.1 487.6L494.5 487.1L493 486.5L491.5 486L490 485.5L488.4 484.9L486.9 484.4L485.4 483.9L483.9 483.3L482.4 482.8L480.8 482.3L479.3 481.7L477.8 481.2L476.3 480.7L475.6 480.4Z\"/><path class=\"iso-line tb-edge\" data-tone=\"mid\" d=\"M475.9 482.2L477.3 482.6L478.8 483.2L480.3 483.7L481.9 484.2L483.4 484.8L484.9 485.3L486.4 485.8L487.9 486.4L489.5 486.9L491 487.4L492.5 488L494 488.5L495.6 489L497.1 489.6L498.6 490.1L499.1 490.3M477.2 478.7L478.5 479.1L480 479.7L481.6 480.2L483.1 480.7L484.6 481.3L486.1 481.8L487.6 482.3L489.2 482.9L490.7 483.4L492.2 483.9L493.7 484.5L495.3 485L496.8 485.5L498.3 486.1L499.8 486.6L500.3 486.8\"/></g></g><g class=\"it\" data-name=\"console\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M328.1 449.9L329.2 448.4L350.5 433.3L352.9 432.2L356.1 431.9L359.1 432.5L480.6 475L482.7 476.3L483.2 477.8L483.2 499.3L482.1 500.8L460.8 516L458.4 517L455.2 517.3L452.2 516.7L330.7 474.2L328.7 472.9L328.1 471.4Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M483.2 499.3L482.1 500.8L482.1 479.3L483.2 477.8ZM482.1 500.8L460.8 516L460.8 494.5L482.1 479.3ZM460.8 516L458.4 517L458.4 495.6L460.8 494.5Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M458.4 517L455.2 517.3L455.2 495.8L458.4 495.6Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M455.2 517.3L452.2 516.7L452.2 495.3L455.2 495.8Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M452.2 516.7L330.7 474.2L330.7 452.8L452.2 495.3ZM330.7 474.2L328.7 472.9L328.7 451.5L330.7 452.8ZM328.7 472.9L328.1 471.4L328.1 449.9L328.7 451.5Z\"/><path class=\"iso-top\" d=\"M480.6 475L482.7 476.3L483.2 477.8L482.1 479.3L460.8 494.5L458.4 495.6L455.2 495.8L452.2 495.3L330.7 452.8L328.7 451.5L328.1 449.9L329.2 448.4L350.5 433.3L352.9 432.2L356.1 431.9L359.1 432.5Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M483.2 477.8L482.1 479.3L460.8 494.5L458.4 495.6L455.2 495.8L452.2 495.3L330.7 452.8L328.7 451.5L328.1 449.9\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M483.2 477.8L481 479.1L459.9 494.1L457.9 495L455.4 495.2L452.8 494.8L331.5 452.3L329.8 451.3L328.1 449.9\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M483.2 492.1L482.1 493.6L460.8 508.8L458.4 509.8L455.2 510.1L452.2 509.6L330.7 467L328.7 465.8L328.1 464.2\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M328.1 449.9L329.2 448.4L350.5 433.3L352.9 432.2L356.1 431.9L359.1 432.5L480.6 475L482.7 476.3L483.2 477.8M483.2 499.3L482.1 500.8L460.8 516L458.4 517L455.2 517.3L452.2 516.7L330.7 474.2L328.7 472.9L328.1 471.4M483.2 477.8L483.2 499.3M328.1 449.9L328.1 471.4\"/></g><g class=\"iso-dots\" data-tone=\"mid\"><circle cx=\"355.4\" cy=\"434.7\" r=\"0.5\"/><circle cx=\"477.6\" cy=\"477.5\" r=\"0.5\"/><circle cx=\"333.7\" cy=\"450.3\" r=\"0.5\"/><circle cx=\"455.9\" cy=\"493.1\" r=\"0.5\"/></g></g><g class=\"it\" data-name=\"stud.console.boss\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M352.2 435.3L352.3 434.8L352.6 434.3L353.1 433.9L353.7 433.5L354.5 433.2L355.3 433L356.3 432.9L357.2 432.9L358.2 432.9L359.1 433.1L360 433.3L360.7 433.6L361.3 434L361.7 434.4L362 434.9L362.1 435.4L362.1 437.5L362 438L361.7 438.5L361.2 438.9L360.6 439.3L359.8 439.6L358.9 439.8L358 439.9L357 439.9L356.1 439.9L355.1 439.7L354.3 439.5L353.6 439.2L353 438.8L352.5 438.4L352.3 437.9L352.2 437.4Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M362.1 437.5L362 438L361.7 438.5L361.2 438.9L360.6 439.3L359.8 439.6L358.9 439.8L358 439.9L357 439.9L357 437.8L358 437.8L358.9 437.6L359.8 437.4L360.6 437.1L361.2 436.8L361.7 436.3L362 435.9L362.1 435.4Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M357 439.9L356.1 439.9L355.1 439.7L355.1 437.6L356.1 437.7L357 437.8Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M355.1 439.7L354.3 439.5L353.6 439.2L353.6 437L354.3 437.4L355.1 437.6Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M353.6 439.2L353 438.8L352.5 438.4L352.3 437.9L352.3 435.8L352.5 436.2L353 436.7L353.6 437Z\"/><path class=\"iso-top\" d=\"M352.3 437.9L352.2 437.4L352.2 435.3L352.3 435.8ZM360 433.3L360.7 433.6L361.3 434L361.7 434.4L362 434.9L362.1 435.4L362 435.9L361.7 436.3L361.2 436.8L360.6 437.1L359.8 437.4L358.9 437.6L358 437.8L357 437.8L356.1 437.7L355.1 437.6L354.3 437.4L353.6 437L353 436.7L352.5 436.2L352.3 435.8L352.2 435.3L352.3 434.8L352.6 434.3L353.1 433.9L353.7 433.5L354.5 433.2L355.3 433L356.3 432.9L357.2 432.9L358.2 432.9L359.1 433.1L360 433.3L357.1 435.3L357.1 435.3L357.1 435.3L357.1 435.3L357.1 435.3L357.1 435.3L357.1 435.3L357.1 435.3L357.1 435.3L357.1 435.3L357.1 435.3L357.1 435.3L357.1 435.3L357.1 435.3L357.1 435.3L357.1 435.3L357.1 435.3L357.1 435.3L357.1 435.3L357.1 435.3L357.1 435.3L357.1 435.3L357.1 435.3L357.1 435.3L357.1 435.3L357.1 435.3L357.1 435.3L357.1 435.3L357.1 435.3L357.1 435.3L357.1 435.3L357.1 435.3L357.1 435.3Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M362.1 435.3L361.9 436L361.3 436.7L360.4 437.2L359.2 437.6L357.8 437.8L356.4 437.8L355.1 437.6L353.9 437.2L353 436.7L352.4 436L352.2 435.3\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M352.2 435.3L352.3 434.8L352.6 434.3L353.1 433.9L353.7 433.5L354.5 433.2L355.3 433L356.3 432.9L357.2 432.9L358.2 432.9L359.1 433.1L360 433.3L360.7 433.6L361.3 434L361.7 434.4L362 434.9L362.1 435.4L362.1 437.5L362 438L361.7 438.5L361.2 438.9L360.6 439.3L359.8 439.6L358.9 439.8L358 439.9L357 439.9L356.1 439.9L355.1 439.7L354.3 439.5L353.6 439.2L353 438.8L352.5 438.4L352.3 437.9L352.2 437.4Z\"/></g></g><g class=\"it\" data-name=\"dial.skin\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M353 443.8L353 443L353.2 442.3L353.4 441.6L353.8 440.8L354.3 440.1L354.9 439.4L355.5 438.8L356.3 438.1L357.1 437.5L358.1 437L359.1 436.4L360.2 435.9L361.4 435.5L362.6 435L363.9 434.7L365.2 434.3L366.6 434.1L368 433.8L369.5 433.7L370.9 433.5L372.4 433.5L373.9 433.4L375.4 433.5L376.9 433.6L378.3 433.7L379.8 433.9L381.2 434.2L382.5 434.5L383.8 434.8L385.1 435.2L386.3 435.6L387.4 436.1L388.5 436.6L389.5 437.2L390.4 437.8L391.2 438.4L391.9 439.1L392.6 439.7L393.1 440.4L393.5 441.1L393.8 441.9L394.1 442.6L394.2 443.3L394.2 444.1L394.2 453L394.1 453.8L393.9 454.5L393.6 455.2L393.1 455.9L392.6 456.6L392 457.3L391.3 458L390.5 458.6L389.6 459.2L388.6 459.7L387.5 460.3L386.4 460.7L385.2 461.2L383.9 461.6L382.6 461.9L381.3 462.2L379.9 462.5L378.4 462.7L377 462.8L375.5 462.9L374 463L372.5 463L371 462.9L369.6 462.8L368.1 462.6L366.7 462.4L365.3 462.1L364 461.8L362.7 461.4L361.5 461L360.3 460.5L359.2 460L358.2 459.5L357.2 458.9L356.4 458.3L355.6 457.7L354.9 457L354.3 456.3L353.9 455.6L353.5 454.9L353.2 454.2L353 453.4L353 452.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M394.2 453.1L393.8 454.5L393.1 456L392 457.3L390.5 458.6L388.6 459.7L386.5 460.7L384 461.6L381.4 462.2L378.6 462.7L375.7 462.9L372.8 463L372.8 454L375.7 454L378.6 453.7L381.4 453.3L384 452.6L386.5 451.8L388.6 450.8L390.5 449.7L392 448.4L393.1 447L393.8 445.6L394.2 444.2Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M372.8 463L369.8 462.8L367 462.4L367 453.5L369.8 453.9L372.8 454Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M367 462.4L364.3 461.9L361.8 461.1L359.5 460.2L359.5 451.3L361.8 452.2L364.3 452.9L367 453.5Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M359.5 460.2L357.5 459.1L355.8 457.9L354.5 456.6L353.6 455.2L353.6 446.3L354.5 447.7L355.8 449L357.5 450.2L359.5 451.3Z\"/><path class=\"iso-top\" d=\"M353.6 455.2L353.1 453.7L353 452.3L353 443.3L353.1 444.8L353.6 446.3ZM390.5 449.7L388.6 450.8L386.5 451.8L384 452.6L381.4 453.3L378.6 453.7L375.7 454L372.8 454L369.8 453.9L367 453.5L364.3 452.9L361.8 452.2L359.5 451.3L357.5 450.2L355.8 449L354.5 447.7L353.6 446.3L353.1 444.8L353 443.3L353.3 441.9L354.1 440.5L355.2 439.1L356.7 437.8L358.6 436.7L360.7 435.7L363.1 434.9L365.8 434.2L368.6 433.8L371.5 433.5L374.4 433.5L377.3 433.6L380.2 434L382.9 434.6L385.4 435.3L387.7 436.2L389.7 437.3L391.3 438.5L392.7 439.8L393.6 441.2L394.1 442.7L394.2 444.2L393.8 445.6L393.1 447L392 448.4L390.5 449.7L373.6 443.7L373.6 443.7L373.6 443.7L373.6 443.7L373.6 443.7L373.6 443.7L373.6 443.7L373.6 443.7L373.6 443.7L373.6 443.7L373.6 443.7L373.6 443.7L373.6 443.7L373.6 443.7L373.6 443.7L373.6 443.7L373.6 443.7L373.6 443.7L373.6 443.7L373.6 443.7L373.6 443.7L373.6 443.7L373.6 443.7L373.6 443.7L373.6 443.7L373.6 443.7L373.6 443.7L373.6 443.7L373.6 443.7L373.6 443.7L373.6 443.7L373.6 443.7L373.6 443.7L373.6 443.7L373.6 443.7L373.6 443.7L373.6 443.7L373.6 443.7L373.6 443.7L373.6 443.7L373.6 443.7L373.6 443.7L373.6 443.7L373.6 443.7L373.6 443.7Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M394.2 443.7L394.1 444.5L394 445.2L393.7 445.9L393.4 446.6L392.9 447.3L392.3 448L391.7 448.7L390.9 449.3L390.1 449.9L389.2 450.5L388.2 451L387.1 451.5L385.9 452L384.7 452.4L383.5 452.8L382.1 453.1L380.8 453.4L379.4 453.6L378 453.8L376.5 453.9L375.1 454L373.6 454L372.1 454L370.7 453.9L369.2 453.8L367.8 453.6L366.4 453.4L365 453.1L363.7 452.8L362.4 452.4L361.2 452L360.1 451.5L359 451L358 450.5L357.1 449.9L356.3 449.3L355.5 448.7L354.8 448L354.3 447.3L353.8 446.6L353.5 445.9L353.2 445.2L353 444.5L353 443.7\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M353 443.8L353 443L353.2 442.3L353.4 441.6L353.8 440.8L354.3 440.1L354.9 439.4L355.5 438.8L356.3 438.1L357.1 437.5L358.1 437L359.1 436.4L360.2 435.9L361.4 435.5L362.6 435L363.9 434.7L365.2 434.3L366.6 434.1L368 433.8L369.5 433.7L370.9 433.5L372.4 433.5L373.9 433.4L375.4 433.5L376.9 433.6L378.3 433.7L379.8 433.9L381.2 434.2L382.5 434.5L383.8 434.8L385.1 435.2L386.3 435.6L387.4 436.1L388.5 436.6L389.5 437.2L390.4 437.8L391.2 438.4L391.9 439.1L392.6 439.7L393.1 440.4L393.5 441.1L393.8 441.9L394.1 442.6L394.2 443.3L394.2 444.1L394.2 453L394.1 453.8L393.9 454.5L393.6 455.2L393.1 455.9L392.6 456.6L392 457.3L391.3 458L390.5 458.6L389.6 459.2L388.6 459.7L387.5 460.3L386.4 460.7L385.2 461.2L383.9 461.6L382.6 461.9L381.3 462.2L379.9 462.5L378.4 462.7L377 462.8L375.5 462.9L374 463L372.5 463L371 462.9L369.6 462.8L368.1 462.6L366.7 462.4L365.3 462.1L364 461.8L362.7 461.4L361.5 461L360.3 460.5L359.2 460L358.2 459.5L357.2 458.9L356.4 458.3L355.6 457.7L354.9 457L354.3 456.3L353.9 455.6L353.5 454.9L353.2 454.2L353 453.4L353 452.7Z\"/></g><path class=\"iso-line\" data-tone=\"lo\" d=\"M390.5 453L390.5 450.2M389.1 453.9L389.1 451M387.6 454.7L387.6 451.8M386 455.4L386 452.5M384.2 456L384.2 453.1M382.3 456.5L382.3 453.6M380.3 456.9L380.3 454M378.2 457.2L378.2 454.3M376.1 457.4L376.1 454.5M373.9 457.4L373.9 454.6M371.8 457.4L371.8 454.5M369.7 457.3L369.7 454.4M367.6 457L367.6 454.1M365.5 456.6L365.5 453.8M363.6 456.1L363.6 453.3M361.8 455.6L361.8 452.7M360.1 454.9L360.1 452.1M358.5 454.2L358.5 451.3M357.1 453.3L357.1 450.5M355.9 452.4L355.9 449.6M354.9 451.5L354.9 448.6M354.1 450.5L354.1 447.6M353.5 449.5L353.5 446.6M393.8 449.1L393.8 446.2M393.3 450.1L393.3 447.3M392.6 451.2L392.6 448.3M391.6 452.1L391.6 449.3\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M394.2 447.7L394.1 448.5L393.9 449.3L393.6 450.1L393.2 450.9L392.6 451.6L391.9 452.4L391.2 453.1L390.3 453.7L389.3 454.4L388.2 455L387 455.5L385.7 456L384.4 456.5L382.9 456.9L381.5 457.2L380 457.5L378.4 457.7L376.8 457.8L375.2 457.9L373.6 458L372 457.9L370.4 457.8L368.8 457.7L367.2 457.5L365.7 457.2L364.2 456.9L362.8 456.5L361.5 456L360.2 455.5L359 455L357.9 454.4L356.9 453.7L356 453.1L355.2 452.4L354.5 451.6L354 450.9L353.5 450.1L353.2 449.3L353 448.5L353 447.7\"/><path class=\"iso-line\" data-tone=\"lo\" d=\"M387.4 448.6L386 449.5L384.4 450.2L382.7 450.9L380.7 451.4L378.7 451.8L376.5 452.1L374.3 452.2L372.1 452.2L369.9 452L367.8 451.7L365.8 451.2L363.9 450.7L362.2 450L360.6 449.2L359.3 448.3L358.3 447.3L357.5 446.3L356.9 445.2L356.7 444.1L356.8 443L357.1 441.9L357.7 440.9L358.6 439.8L359.7 438.9L361.1 438L362.7 437.3L364.5 436.6L366.4 436.1L368.5 435.7L370.7 435.4L372.8 435.3L375.1 435.3L377.2 435.5L379.4 435.8L381.4 436.3L383.3 436.8L385 437.5L386.5 438.3L387.8 439.2L388.9 440.2L389.7 441.2L390.2 442.3L390.5 443.4L390.4 444.5L390.1 445.6L389.5 446.6L388.6 447.6Z\"/><path class=\"iso-line\" data-tone=\"lo\" d=\"M361.1 442.4L358.7 442.1M366.7 438.4L365.4 437.3M376.4 437.5L376.9 436.3M384.4 440.3L386.4 439.7M386.1 445.1L388.5 445.4M380.4 449.1L381.8 450.2\"/><path class=\"iso-line\" data-tone=\"mid\" d=\"M363.4 444.6L358.6 445.1M365.1 440.8L361.1 439.4M371.8 438.7L370.9 436.2M379.5 439.5L382.3 437.5M383.7 442.9L388.6 442.4M382 446.7L386.1 448.1M375.4 448.8L376.2 451.3\"/><path class=\"iso-line\" data-tone=\"mid\" d=\"M375.8 444.5L375 444.9L374.1 445.1L373 445.1L372 444.8L371.3 444.5L370.9 444L371 443.5L371.4 443L372.1 442.6L373.1 442.4L374.2 442.4L375.1 442.6L375.8 443L376.2 443.5L376.2 444Z\"/></g><g class=\"it\" data-name=\"stud.console\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M354 432.8L354.1 432.5L354.3 432.2L354.6 431.9L355 431.7L355.5 431.5L356 431.4L356.6 431.3L357.2 431.3L357.8 431.3L358.4 431.4L358.9 431.6L359.4 431.8L359.7 432L360 432.3L360.2 432.6L360.2 432.9L360.2 435.4L360.1 435.7L360 436L359.7 436.2L359.3 436.5L358.8 436.6L358.3 436.8L357.7 436.9L357.1 436.9L356.5 436.8L355.9 436.7L355.4 436.6L354.9 436.4L354.5 436.2L354.3 435.9L354.1 435.6L354 435.3Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M360.2 435.4L360.1 435.7L360 436L359.7 436.2L359.3 436.5L358.8 436.6L358.3 436.8L357.7 436.9L357.1 436.9L357.1 434.4L357.7 434.4L358.3 434.3L358.8 434.1L359.3 434L359.7 433.7L360 433.5L360.1 433.2L360.2 432.9Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M357.1 436.9L356.5 436.8L355.9 436.7L355.9 434.3L356.5 434.3L357.1 434.4Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M355.9 436.7L355.4 436.6L354.9 436.4L354.9 433.9L355.4 434.1L355.9 434.3Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M354.9 436.4L354.5 436.2L354.3 435.9L354.1 435.6L354.1 433.1L354.3 433.4L354.5 433.7L354.9 433.9Z\"/><path class=\"iso-top\" d=\"M354.1 435.6L354 435.3L354 432.8L354.1 433.1ZM358.9 431.6L359.4 431.8L359.7 432L360 432.3L360.2 432.6L360.2 432.9L360.1 433.2L360 433.5L359.7 433.7L359.3 434L358.8 434.1L358.3 434.3L357.7 434.4L357.1 434.4L356.5 434.3L355.9 434.3L355.4 434.1L354.9 433.9L354.5 433.7L354.3 433.4L354.1 433.1L354 432.8L354.1 432.5L354.3 432.2L354.6 431.9L355 431.7L355.5 431.5L356 431.4L356.6 431.3L357.2 431.3L357.8 431.3L358.4 431.4L358.9 431.6L357.1 432.8L357.1 432.8L357.1 432.8L357.1 432.8L357.1 432.8L357.1 432.8L357.1 432.8L357.1 432.8L357.1 432.8L357.1 432.8L357.1 432.8L357.1 432.8L357.1 432.8L357.1 432.8L357.1 432.8L357.1 432.8L357.1 432.8L357.1 432.8L357.1 432.8L357.1 432.8L357.1 432.8L357.1 432.8L357.1 432.8L357.1 432.8L357.1 432.8L357.1 432.8L357.1 432.8L357.1 432.8L357.1 432.8L357.1 432.8L357.1 432.8L357.1 432.8L357.1 432.8Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M360.2 432.8L359.9 433.5L359.1 434L357.8 434.3L356.4 434.3L355.2 434L354.3 433.5L354 432.8\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M354 432.8L354.1 432.5L354.3 432.2L354.6 431.9L355 431.7L355.5 431.5L356 431.4L356.6 431.3L357.2 431.3L357.8 431.3L358.4 431.4L358.9 431.6L359.4 431.8L359.7 432L360 432.3L360.2 432.6L360.2 432.9L360.2 435.4L360.1 435.7L360 436L359.7 436.2L359.3 436.5L358.8 436.6L358.3 436.8L357.7 436.9L357.1 436.9L356.5 436.8L355.9 436.7L355.4 436.6L354.9 436.4L354.5 436.2L354.3 435.9L354.1 435.6L354 435.3Z\"/></g></g><g class=\"it\" data-name=\"cable.hr:3\" data-route=\"cable.hr\"><g class=\"tb\"><path class=\"tb-body\" d=\"M369.4 420.3L369.3 420.1L368.8 418.5L367.7 417L365.9 416.3L364.2 416.4L362.8 417L361.5 417.8L360.4 418.6L359.3 419.4L358 420.4L356.8 422L355.8 424L355.4 426.1L355.3 428L355.3 429.6L355.3 431.2L355.3 432.8L359 432.8L359 431.2L359 429.6L359 428.1L359.1 426.6L359.4 425.2L360 423.9L360.7 423L361.6 422.3L362.6 421.6L363.6 420.9L364.5 420.3L365.1 420L365.4 420L365.3 419.9L365.5 420.1L365.7 420.9L365.7 421ZM359 432.8L358.9 432.6L358.8 432.4L358.6 432.3L358.3 432.1L357.9 432L357.5 431.9L357.1 431.9L356.7 431.9L356.3 432L356 432.1L355.7 432.3L355.5 432.4L355.3 432.6L355.3 432.8L355.3 433L355.5 433.2L355.7 433.4L356 433.6L356.3 433.7L356.7 433.7L357.1 433.8L357.5 433.7L357.9 433.7L358.3 433.6L358.6 433.4L358.8 433.2L358.9 433Z\"/><path class=\"tb-shine\" d=\"M367.7 421.4L367.7 420.5L367.4 419.2L366.9 417.9L365.8 417.1L364.4 417L363 417.5L361.9 418.3L360.8 419.1L359.7 419.8L358.5 420.8L357.4 422.3L356.6 424.2L356.3 426.2L356.2 428L356.2 429.6L356.2 431.2L356.2 432.8L356.2 433.6L356.3 433.7L356.7 433.7L357.1 433.8L357.1 432.8L357.1 431.2L357.1 429.6L357.1 428L357.1 426.3L357.4 424.5L358.1 422.8L359.1 421.5L360.2 420.5L361.3 419.8L362.4 419L363.5 418.3L364.6 417.9L365.7 418L366.4 418.6L366.6 419.6L366.8 420.7L366.8 421.5Z\"/><path class=\"tb-shade\" d=\"M368.5 421.3L368.3 420.4L367.6 419.1L366.5 418.4L365.6 418.6L364.8 418.9L364 419.3L363 420L362 420.7L360.9 421.5L359.9 422.2L358.9 423.3L358.1 424.8L357.6 426.4L357.4 428L357.4 429.6L357.4 431.2L357.4 432.8L357.4 433.7L357.5 433.7L357.9 433.7L358.1 433.6L358.1 432.8L358.1 431.2L358.1 429.6L358.2 428L358.3 426.5L358.8 425L359.6 423.7L360.4 422.8L361.4 422L362.4 421.3L363.4 420.6L364.3 420L365 419.6L365.5 419.3L366.1 419L366.9 419.4L367.6 420.5L367.8 421.4Z\"/><path class=\"iso-line tb-edge\" data-tone=\"mid\" d=\"M369.4 420.3L369.3 420.1L368.8 418.5L367.7 417L365.9 416.3L364.2 416.4L362.8 417L361.5 417.8L360.4 418.6L359.3 419.4L358 420.4L356.8 422L355.8 424L355.4 426.1L355.3 428L355.3 429.6L355.3 431.2L355.3 432.8M365.7 421L365.7 420.9L365.5 420.1L365.3 419.9L365.4 420L365.1 420L364.5 420.3L363.6 420.9L362.6 421.6L361.6 422.3L360.7 423L360 423.9L359.4 425.2L359.1 426.6L359 428.1L359 429.6L359 431.2L359 432.8M355.3 432.8L355.3 433L355.5 433.2L355.7 433.4L356 433.6L356.3 433.7L356.7 433.7L357.1 433.8L357.5 433.7L357.9 433.7L358.3 433.6L358.6 433.4L358.8 433.2L358.9 433L359 432.8\"/></g></g><g class=\"it\" data-name=\"upper.button\" data-move=\"jawU\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M176.3 84.6L176.5 83.9L177.1 83.3L178.1 82.7L179.4 82.4L180.8 82.3L182.2 82.4L183.4 82.7L184.5 83.2L185.1 83.8L185.4 84.5L185.4 86.3L185.2 87L184.5 87.6L183.6 88.1L182.3 88.5L180.9 88.6L179.5 88.5L178.2 88.2L177.2 87.7L176.5 87.1L176.3 86.4Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M184.5 87.6L183.6 88.1L183.6 86.4L184.5 85.9ZM185.4 86.3L185.2 87L185.2 85.2L185.4 84.5ZM185.2 87L184.5 87.6L184.5 85.9L185.2 85.2Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M183.6 88.1L182.3 88.5L182.3 86.7L183.6 86.4ZM182.3 88.5L180.9 88.6L180.9 86.8L182.3 86.7Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M180.9 88.6L179.5 88.5L179.5 86.7L180.9 86.8ZM179.5 88.5L178.2 88.2L178.2 86.4L179.5 86.7Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M178.2 88.2L177.2 87.7L177.2 85.9L178.2 86.4ZM177.2 87.7L176.5 87.1L176.5 85.3L177.2 85.9ZM176.5 87.1L176.3 86.4L176.3 84.6L176.5 85.3Z\"/><path class=\"iso-top\" d=\"M184.5 85.9L183.6 86.4L182.3 86.7L180.9 86.8L179.5 86.7L178.2 86.4L177.2 85.9L176.5 85.3L176.3 84.6L176.5 83.9L177.1 83.3L178.1 82.7L179.4 82.4L180.8 82.3L182.2 82.4L183.4 82.7L184.5 83.2L185.1 83.8L185.4 84.5L185.2 85.2Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M185.4 84.5L185.2 85.2L184.5 85.9L183.6 86.4L182.3 86.7L180.9 86.8L179.5 86.7L178.2 86.4L177.2 85.9L176.5 85.3L176.3 84.6\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M176.3 84.6L176.5 83.9L177.1 83.3L178.1 82.7L179.4 82.4L180.8 82.3L182.2 82.4L183.4 82.7L184.5 83.2L185.1 83.8L185.4 84.5M185.4 86.3L185.2 87L184.5 87.6L183.6 88.1L182.3 88.5L180.9 88.6L179.5 88.5L178.2 88.2L177.2 87.7L176.5 87.1L176.3 86.4M176.3 84.6L176.3 86.4M185.4 84.5L185.4 86.3\"/></g></g><g class=\"it\" data-name=\"upper.arm\" data-move=\"jawU\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M168.6 77.7L168.9 76.9L172.5 74.4L173.8 74L175.3 74.1L195.6 81.2L196.4 81.9L196.4 87.2L196.1 88L192.6 90.5L191.2 91L189.7 90.8L169.4 83.7L168.6 83Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M196.4 87.2L196.1 88L196.1 82.7L196.4 81.9ZM196.1 88L192.6 90.5L192.6 85.2L196.1 82.7ZM192.6 90.5L191.2 91L191.2 85.6L192.6 85.2Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M191.2 91L189.7 90.8L189.7 85.4L191.2 85.6Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M189.7 90.8L169.4 83.7L169.4 78.4L189.7 85.4ZM169.4 83.7L168.6 83L168.6 77.7L169.4 78.4Z\"/><path class=\"iso-top\" d=\"M195.6 81.2L196.4 81.9L196.1 82.7L192.6 85.2L191.2 85.6L189.7 85.4L169.4 78.4L168.6 77.7L168.9 76.9L172.5 74.4L173.8 74L175.3 74.1Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M196.4 81.9L196.1 82.7L192.6 85.2L191.2 85.6L189.7 85.4L169.4 78.4L168.6 77.7\"/><path class=\"iso-line iso-bevel\" data-tone=\"lo\" d=\"M196.4 81.9L195.5 82.5L192.1 85L191.1 85.3L189.9 85.2L169.9 78.1L168.6 77.7\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M168.6 77.7L168.9 76.9L172.5 74.4L173.8 74L175.3 74.1L195.6 81.2L196.4 81.9M196.4 87.2L196.1 88L192.6 90.5L191.2 91L189.7 90.8L169.4 83.7L168.6 83M196.4 81.9L196.4 87.2M168.6 77.7L168.6 83\"/></g></g><g class=\"it\" data-name=\"slat\"><g data-slat=\"3\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M375.1 312.7L376.8 311.5L511.8 358.8L511.8 386.2L510.2 387.4L375.1 340.1Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M510.2 387.4L510.2 359.9L511.8 358.8L511.8 386.2Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M375.1 340.1L375.1 312.7L510.2 359.9L510.2 387.4Z\"/><path class=\"iso-top\" d=\"M375.1 312.7L376.8 311.5L511.8 358.8L510.2 359.9Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M510.2 387.4L510.2 359.9M375.1 312.7L510.2 359.9M510.2 359.9L511.8 358.8\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M375.1 312.7L376.8 311.5L511.8 358.8L511.8 386.2L510.2 387.4L375.1 340.1Z\"/></g></g></g><g class=\"it\" data-name=\"upper.bushing\" data-move=\"jawU\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M200.7 73.9L201 73.3L205.2 70.3L206.3 69.9L207.5 70.1L218.3 73.9L219 74.4L219 86.9L218.7 87.5L214.5 90.5L213.4 90.9L212.2 90.7L201.4 87L200.7 86.4Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M219 86.9L218.7 87.5L218.7 75L219 74.4ZM218.7 87.5L214.5 90.5L214.5 78L218.7 75ZM214.5 90.5L213.4 90.9L213.4 78.4L214.5 78Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M213.4 90.9L212.2 90.7L212.2 78.2L213.4 78.4Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M212.2 90.7L201.4 87L201.4 74.5L212.2 78.2ZM201.4 87L200.7 86.4L200.7 73.9L201.4 74.5Z\"/><path class=\"iso-top\" d=\"M218.3 73.9L219 74.4L218.7 75L214.5 78L213.4 78.4L212.2 78.2L201.4 74.5L200.7 73.9L201 73.3L205.2 70.3L206.3 69.9L207.5 70.1Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M219 74.4L218.7 75L214.5 78L213.4 78.4L212.2 78.2L201.4 74.5L200.7 73.9\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M200.7 73.9L201 73.3L205.2 70.3L206.3 69.9L207.5 70.1L218.3 73.9L219 74.4M219 86.9L218.7 87.5L214.5 90.5L213.4 90.9L212.2 90.7L201.4 87L200.7 86.4M219 74.4L219 86.9M200.7 73.9L200.7 86.4\"/></g></g><g class=\"it\" data-name=\"slat\"><g data-slat=\"4\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M375.1 289.5L376.8 288.3L511.8 335.6L511.8 363L510.2 364.2L375.1 316.9Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M510.2 364.2L510.2 336.7L511.8 335.6L511.8 363Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M375.1 316.9L375.1 289.5L510.2 336.7L510.2 364.2Z\"/><path class=\"iso-top\" d=\"M375.1 289.5L376.8 288.3L511.8 335.6L510.2 336.7Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M510.2 364.2L510.2 336.7M375.1 289.5L510.2 336.7M510.2 336.7L511.8 335.6\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M375.1 289.5L376.8 288.3L511.8 335.6L511.8 363L510.2 364.2L375.1 316.9Z\"/></g></g></g><g class=\"it\" data-name=\"dial.hr\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M417.1 466.2L417.2 465.5L417.3 464.8L417.6 464L418 463.3L418.4 462.6L419 461.9L419.7 461.2L420.4 460.6L421.3 460L422.2 459.4L423.2 458.9L424.3 458.4L425.5 457.9L426.7 457.5L428 457.1L429.4 456.8L430.7 456.5L432.2 456.3L433.6 456.1L435.1 456L436.5 455.9L438 455.9L439.5 455.9L441 456L442.5 456.2L443.9 456.4L445.3 456.6L446.7 456.9L448 457.3L449.2 457.7L450.4 458.1L451.6 458.6L452.6 459.1L453.6 459.7L454.5 460.2L455.4 460.9L456.1 461.5L456.7 462.2L457.2 462.9L457.7 463.6L458 464.3L458.2 465.1L458.3 465.8L458.3 466.5L458.3 475.5L458.2 476.2L458 476.9L457.7 477.7L457.3 478.4L456.8 479.1L456.1 479.8L455.4 480.4L454.6 481L453.7 481.6L452.7 482.2L451.7 482.7L450.5 483.2L449.3 483.6L448.1 484L446.8 484.4L445.4 484.7L444 484.9L442.6 485.1L441.1 485.3L439.6 485.4L438.2 485.4L436.7 485.4L435.2 485.4L433.7 485.2L432.3 485.1L430.9 484.8L429.5 484.6L428.1 484.2L426.8 483.9L425.6 483.5L424.4 483L423.3 482.5L422.3 482L421.4 481.4L420.5 480.8L419.7 480.1L419.1 479.5L418.5 478.8L418 478.1L417.6 477.4L417.3 476.6L417.2 475.9L417.1 475.2Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M458.3 475.5L458 477L457.3 478.4L456.1 479.8L454.6 481L452.8 482.2L450.6 483.2L448.2 484L445.5 484.7L442.7 485.1L439.8 485.4L436.9 485.4L436.9 476.5L439.8 476.5L442.7 476.2L445.5 475.7L448.2 475.1L450.6 474.3L452.8 473.3L454.6 472.1L456.1 470.9L457.3 469.5L458 468.1L458.3 466.6Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M436.9 485.4L434 485.3L431.1 484.9L431.1 476L434 476.3L436.9 476.5Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M431.1 484.9L428.4 484.3L425.9 483.6L423.6 482.6L423.6 473.7L425.9 474.6L428.4 475.4L431.1 476Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M423.6 482.6L421.6 481.6L420 480.3L418.7 479L417.7 477.6L417.7 468.7L418.7 470.1L420 471.4L421.6 472.6L423.6 473.7Z\"/><path class=\"iso-top\" d=\"M417.7 477.6L417.2 476.2L417.1 474.7L417.1 465.8L417.2 467.3L417.7 468.7ZM454.6 472.1L452.8 473.3L450.6 474.3L448.2 475.1L445.5 475.7L442.7 476.2L439.8 476.5L436.9 476.5L434 476.3L431.1 476L428.4 475.4L425.9 474.6L423.6 473.7L421.6 472.6L420 471.4L418.7 470.1L417.7 468.7L417.2 467.3L417.1 465.8L417.5 464.3L418.2 462.9L419.3 461.6L420.8 460.3L422.7 459.2L424.9 458.2L427.3 457.3L429.9 456.7L432.7 456.2L435.6 456L438.5 455.9L441.5 456.1L444.3 456.4L447 457L449.5 457.8L451.8 458.7L453.8 459.8L455.5 461L456.8 462.3L457.7 463.7L458.2 465.1L458.3 466.6L458 468.1L457.3 469.5L456.1 470.9L454.6 472.1L437.7 466.2L437.7 466.2L437.7 466.2L437.7 466.2L437.7 466.2L437.7 466.2L437.7 466.2L437.7 466.2L437.7 466.2L437.7 466.2L437.7 466.2L437.7 466.2L437.7 466.2L437.7 466.2L437.7 466.2L437.7 466.2L437.7 466.2L437.7 466.2L437.7 466.2L437.7 466.2L437.7 466.2L437.7 466.2L437.7 466.2L437.7 466.2L437.7 466.2L437.7 466.2L437.7 466.2L437.7 466.2L437.7 466.2L437.7 466.2L437.7 466.2L437.7 466.2L437.7 466.2L437.7 466.2L437.7 466.2L437.7 466.2L437.7 466.2L437.7 466.2L437.7 466.2L437.7 466.2L437.7 466.2L437.7 466.2L437.7 466.2L437.7 466.2L437.7 466.2Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M458.3 466.2L458.3 466.9L458.1 467.7L457.9 468.4L457.5 469.1L457 469.8L456.5 470.5L455.8 471.1L455.1 471.8L454.2 472.4L453.3 472.9L452.3 473.5L451.2 474L450.1 474.5L448.9 474.9L447.6 475.2L446.3 475.6L444.9 475.9L443.5 476.1L442.1 476.3L440.7 476.4L439.2 476.5L437.7 476.5L436.3 476.5L434.8 476.4L433.3 476.3L431.9 476.1L430.5 475.9L429.2 475.6L427.9 475.2L426.6 474.9L425.4 474.5L424.2 474L423.2 473.5L422.2 472.9L421.2 472.4L420.4 471.8L419.6 471.1L419 470.5L418.4 469.8L418 469.1L417.6 468.4L417.3 467.7L417.2 466.9L417.1 466.2\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M417.1 466.2L417.2 465.5L417.3 464.8L417.6 464L418 463.3L418.4 462.6L419 461.9L419.7 461.2L420.4 460.6L421.3 460L422.2 459.4L423.2 458.9L424.3 458.4L425.5 457.9L426.7 457.5L428 457.1L429.4 456.8L430.7 456.5L432.2 456.3L433.6 456.1L435.1 456L436.5 455.9L438 455.9L439.5 455.9L441 456L442.5 456.2L443.9 456.4L445.3 456.6L446.7 456.9L448 457.3L449.2 457.7L450.4 458.1L451.6 458.6L452.6 459.1L453.6 459.7L454.5 460.2L455.4 460.9L456.1 461.5L456.7 462.2L457.2 462.9L457.7 463.6L458 464.3L458.2 465.1L458.3 465.8L458.3 466.5L458.3 475.5L458.2 476.2L458 476.9L457.7 477.7L457.3 478.4L456.8 479.1L456.1 479.8L455.4 480.4L454.6 481L453.7 481.6L452.7 482.2L451.7 482.7L450.5 483.2L449.3 483.6L448.1 484L446.8 484.4L445.4 484.7L444 484.9L442.6 485.1L441.1 485.3L439.6 485.4L438.2 485.4L436.7 485.4L435.2 485.4L433.7 485.2L432.3 485.1L430.9 484.8L429.5 484.6L428.1 484.2L426.8 483.9L425.6 483.5L424.4 483L423.3 482.5L422.3 482L421.4 481.4L420.5 480.8L419.7 480.1L419.1 479.5L418.5 478.8L418 478.1L417.6 477.4L417.3 476.6L417.2 475.9L417.1 475.2Z\"/></g><path class=\"iso-line\" data-tone=\"lo\" d=\"M454.6 475.5L454.6 472.6M453.3 476.4L453.3 473.5M451.8 477.1L451.8 474.3M450.1 477.8L450.1 475M448.3 478.4L448.3 475.6M446.4 478.9L446.4 476.1M444.4 479.3L444.4 476.5M442.4 479.6L442.4 476.8M440.2 479.8L440.2 477M438.1 479.9L438.1 477M435.9 479.9L435.9 477M433.8 479.7L433.8 476.9M431.7 479.4L431.7 476.6M429.7 479.1L429.7 476.2M427.7 478.6L427.7 475.7M425.9 478L425.9 475.2M424.2 477.4L424.2 474.5M422.7 476.6L422.7 473.8M421.3 475.8L421.3 472.9M420.1 474.9L420.1 472M419.1 473.9L419.1 471.1M418.2 472.9L418.2 470.1M417.6 471.9L417.6 469.1M458 471.6L458 468.7M457.4 472.6L457.4 469.8M456.7 473.6L456.7 470.8M455.7 474.6L455.7 471.7\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M458.3 470.1L458.3 470.9L458.1 471.7L457.8 472.5L457.3 473.3L456.8 474.1L456.1 474.8L455.3 475.5L454.4 476.2L453.4 476.8L452.3 477.4L451.1 478L449.8 478.5L448.5 478.9L447.1 479.3L445.6 479.6L444.1 479.9L442.5 480.1L440.9 480.3L439.3 480.4L437.7 480.4L436.1 480.4L434.5 480.3L432.9 480.1L431.4 479.9L429.8 479.6L428.4 479.3L427 478.9L425.6 478.5L424.3 478L423.2 477.4L422.1 476.8L421.1 476.2L420.2 475.5L419.4 474.8L418.7 474.1L418.1 473.3L417.7 472.5L417.4 471.7L417.2 470.9L417.1 470.1\"/><path class=\"iso-line\" data-tone=\"lo\" d=\"M451.6 471L450.2 471.9L448.6 472.7L446.8 473.3L444.9 473.9L442.8 474.3L440.7 474.5L438.5 474.6L436.3 474.6L434.1 474.5L431.9 474.1L429.9 473.7L428 473.1L426.3 472.4L424.8 471.6L423.5 470.7L422.4 469.8L421.6 468.7L421.1 467.7L420.8 466.6L420.9 465.5L421.2 464.4L421.8 463.3L422.7 462.3L423.9 461.4L425.3 460.5L426.9 459.7L428.6 459.1L430.6 458.5L432.6 458.1L434.8 457.9L437 457.8L439.2 457.8L441.4 458L443.5 458.3L445.5 458.7L447.4 459.3L449.1 460L450.7 460.8L452 461.7L453 462.6L453.8 463.7L454.4 464.7L454.6 465.8L454.6 466.9L454.2 468L453.6 469.1L452.7 470.1Z\"/><path class=\"iso-line\" data-tone=\"lo\" d=\"M425.3 464.8L422.8 464.6M430.9 460.8L429.5 459.8M440.5 460L441 458.8M448.5 462.8L450.6 462.1M450.2 467.6L452.6 467.9M444.6 471.6L445.9 472.6\"/><path class=\"iso-line\" data-tone=\"mid\" d=\"M427.6 467.1L422.7 467.5M429.3 463.2L425.2 461.8M435.9 461.1L435.1 458.7M443.6 462L446.5 460M447.9 465.3L452.7 464.9M446.2 469.2L450.2 470.6M439.5 471.3L440.4 473.7\"/><path class=\"iso-line\" data-tone=\"mid\" d=\"M439.9 467L439.2 467.3L438.2 467.5L437.1 467.5L436.2 467.3L435.5 466.9L435.1 466.4L435.1 465.9L435.5 465.4L436.3 465.1L437.3 464.9L438.3 464.9L439.3 465.1L440 465.5L440.4 466L440.3 466.5Z\"/></g><g class=\"it\" data-name=\"screw.head\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M232.8 68.5L233 67.8L233.4 67.1L234.1 66.4L235.1 65.9L236.2 65.4L237.5 65.1L238.9 64.9L240.4 64.8L241.8 64.9L243.2 65.2L244.5 65.5L245.6 66L246.5 66.6L247.1 67.2L247.5 67.9L247.6 68.6L247.6 72.2L247.5 72.9L247 73.6L246.3 74.3L245.3 74.8L244.2 75.3L242.9 75.6L241.5 75.8L240.1 75.8L238.6 75.7L237.2 75.5L236 75.2L234.9 74.7L234 74.1L233.3 73.5L232.9 72.8L232.8 72Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M247.6 72.2L247.5 72.9L247 73.6L246.3 74.3L245.3 74.8L244.2 75.3L242.9 75.6L241.5 75.8L240.1 75.8L240.1 72.3L241.5 72.2L242.9 72L244.2 71.7L245.3 71.2L246.3 70.7L247 70L247.5 69.4L247.6 68.6Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M240.1 75.8L238.6 75.7L237.2 75.5L237.2 72L238.6 72.2L240.1 72.3Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M237.2 75.5L236 75.2L234.9 74.7L234.9 71.1L236 71.6L237.2 72Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M234.9 74.7L234 74.1L233.3 73.5L232.9 72.8L232.9 69.2L233.3 69.9L234 70.5L234.9 71.1Z\"/><path class=\"iso-top\" d=\"M232.9 72.8L232.8 72L232.8 68.5L232.9 69.2ZM246.3 70.7L245.3 71.2L244.2 71.7L242.9 72L241.5 72.2L240.1 72.3L238.6 72.2L237.2 72L236 71.6L234.9 71.1L234 70.5L233.3 69.9L232.9 69.2L232.8 68.5L233 67.8L233.4 67.1L234.1 66.4L235.1 65.9L236.2 65.4L237.5 65.1L238.9 64.9L240.4 64.8L241.8 64.9L243.2 65.2L244.5 65.5L245.6 66L246.5 66.6L247.1 67.2L247.5 67.9L247.6 68.6L247.5 69.4L247 70L246.3 70.7L240.2 68.6L240.2 68.6L240.2 68.6L240.2 68.6L240.2 68.6L240.2 68.6L240.2 68.6L240.2 68.6L240.2 68.6L240.2 68.6L240.2 68.6L240.2 68.6L240.2 68.6L240.2 68.6L240.2 68.6L240.2 68.6L240.2 68.6L240.2 68.6L240.2 68.6L240.2 68.6L240.2 68.6L240.2 68.6L240.2 68.6L240.2 68.6L240.2 68.6L240.2 68.6L240.2 68.6L240.2 68.6L240.2 68.6L240.2 68.6L240.2 68.6L240.2 68.6L240.2 68.6Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M247.6 68.6L247.5 69.3L247.1 70L246.4 70.6L245.5 71.2L244.3 71.6L243.1 72L241.7 72.2L240.2 72.3L238.8 72.2L237.4 72L236.1 71.6L235 71.2L234 70.6L233.4 70L232.9 69.3L232.8 68.6\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M232.8 68.5L233 67.8L233.4 67.1L234.1 66.4L235.1 65.9L236.2 65.4L237.5 65.1L238.9 64.9L240.4 64.8L241.8 64.9L243.2 65.2L244.5 65.5L245.6 66L246.5 66.6L247.1 67.2L247.5 67.9L247.6 68.6L247.6 72.2L247.5 72.9L247 73.6L246.3 74.3L245.3 74.8L244.2 75.3L242.9 75.6L241.5 75.8L240.1 75.8L238.6 75.7L237.2 75.5L236 75.2L234.9 74.7L234 74.1L233.3 73.5L232.9 72.8L232.8 72Z\"/></g></g><g class=\"it\" data-name=\"slat\"><g data-slat=\"5\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M375.1 266.3L376.8 265.1L511.8 312.4L511.8 339.8L510.2 341L375.1 293.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M510.2 341L510.2 313.5L511.8 312.4L511.8 339.8Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M375.1 293.7L375.1 266.3L510.2 313.5L510.2 341Z\"/><path class=\"iso-top\" d=\"M375.1 266.3L376.8 265.1L511.8 312.4L510.2 313.5Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M510.2 341L510.2 313.5M375.1 266.3L510.2 313.5M510.2 313.5L511.8 312.4\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M375.1 266.3L376.8 265.1L511.8 312.4L511.8 339.8L510.2 341L375.1 293.7Z\"/></g></g></g><g class=\"it\" data-name=\"upper.bushing\" data-move=\"jawU\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M261.4 95.2L261.7 94.6L266 91.5L267 91.2L268.3 91.3L279.1 95.1L279.7 95.7L279.7 108.2L279.5 108.8L275.2 111.8L274.2 112.1L272.9 112L262.1 108.2L261.4 107.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M279.7 108.2L279.5 108.8L279.5 96.3L279.7 95.7ZM279.5 108.8L275.2 111.8L275.2 99.3L279.5 96.3ZM275.2 111.8L274.2 112.1L274.2 99.7L275.2 99.3Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M274.2 112.1L272.9 112L272.9 99.5L274.2 99.7Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M272.9 112L262.1 108.2L262.1 95.7L272.9 99.5ZM262.1 108.2L261.4 107.7L261.4 95.2L262.1 95.7Z\"/><path class=\"iso-top\" d=\"M279.1 95.1L279.7 95.7L279.5 96.3L275.2 99.3L274.2 99.7L272.9 99.5L262.1 95.7L261.4 95.2L261.7 94.6L266 91.5L267 91.2L268.3 91.3Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M279.7 95.7L279.5 96.3L275.2 99.3L274.2 99.7L272.9 99.5L262.1 95.7L261.4 95.2\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M261.4 95.2L261.7 94.6L266 91.5L267 91.2L268.3 91.3L279.1 95.1L279.7 95.7M279.7 108.2L279.5 108.8L275.2 111.8L274.2 112.1L272.9 112L262.1 108.2L261.4 107.7M279.7 95.7L279.7 108.2M261.4 95.2L261.4 107.7\"/></g></g><g class=\"it\" data-name=\"upper.carriage\" data-move=\"jawU\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M189.8 80L190.6 79L197.6 73.9L199.3 73.2L201.4 73L203.4 73.4L270.9 97L272.3 97.8L272.6 98.9L272.6 115L271.9 116L264.8 121L263.2 121.7L261.1 121.9L259.1 121.5L191.6 97.9L190.2 97.1L189.8 96Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M272.6 115L271.9 116L271.9 99.9L272.6 98.9ZM271.9 116L264.8 121L264.8 105L271.9 99.9ZM264.8 121L263.2 121.7L263.2 105.6L264.8 105Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M263.2 121.7L261.1 121.9L261.1 105.8L263.2 105.6Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M261.1 121.9L259.1 121.5L259.1 105.5L261.1 105.8Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M259.1 121.5L191.6 97.9L191.6 81.8L259.1 105.5ZM191.6 97.9L190.2 97.1L190.2 81L191.6 81.8ZM190.2 97.1L189.8 96L189.8 80L190.2 81Z\"/><path class=\"iso-top\" d=\"M270.9 97L272.3 97.8L272.6 98.9L271.9 99.9L264.8 105L263.2 105.6L261.1 105.8L259.1 105.5L191.6 81.8L190.2 81L189.8 80L190.6 79L197.6 73.9L199.3 73.2L201.4 73L203.4 73.4Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M272.6 98.9L271.9 99.9L264.8 105L263.2 105.6L261.1 105.8L259.1 105.5L191.6 81.8L190.2 81L189.8 80\"/><path class=\"iso-line iso-bevel\" data-tone=\"lo\" d=\"M272.6 98.9L271 99.7L264.1 104.6L262.8 105.2L261.2 105.3L259.6 105L192.3 81.4L191.1 80.8L189.8 80\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M272.6 106.9L271.9 107.9L264.8 113L263.2 113.7L261.1 113.9L259.1 113.5L191.6 89.9L190.2 89L189.8 88\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M189.8 80L190.6 79L197.6 73.9L199.3 73.2L201.4 73L203.4 73.4L270.9 97L272.3 97.8L272.6 98.9M272.6 115L271.9 116L264.8 121L263.2 121.7L261.1 121.9L259.1 121.5L191.6 97.9L190.2 97.1L189.8 96M272.6 98.9L272.6 115M189.8 80L189.8 96\"/></g><g class=\"iso-dots\" data-tone=\"mid\"><circle cx=\"199.2\" cy=\"78.2\" r=\"0.5\"/><circle cx=\"263.3\" cy=\"100.7\" r=\"0.5\"/></g><g class=\"iso-dots\" data-tone=\"mid\"><circle cx=\"198.3\" cy=\"96\" r=\"0.55\"/><circle cx=\"252.3\" cy=\"114.9\" r=\"0.55\"/></g><path class=\"iso-line\" data-tone=\"lo\" d=\"M200.2 96.6L200 95.8L199.6 95L199 94.4L198.3 94L197.6 93.9L197 94.1L196.6 94.6L196.5 95.3L196.6 96.1L197 96.9L197.6 97.5L198.3 97.9L199 98L199.6 97.8L200 97.3ZM254.2 115.5L254 114.7L253.6 113.9L253 113.3L252.3 112.9L251.6 112.8L251 113L250.6 113.5L250.5 114.2L250.6 115L251 115.8L251.6 116.4L252.3 116.8L253 116.9L253.6 116.7L254 116.2Z\"/></g><g class=\"it\" data-name=\"up.bridge\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M178.2 49L179.3 47.5L205.3 28.9L207.8 27.9L210.9 27.6L213.9 28.2L291.6 55.4L293.6 56.6L294.2 58.2L294.2 76L293.1 77.5L267.1 96.1L264.6 97.1L261.5 97.4L258.5 96.8L180.8 69.6L178.8 68.4L178.2 66.8Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M294.2 76L293.1 77.5L293.1 59.7L294.2 58.2ZM293.1 77.5L267.1 96.1L267.1 78.2L293.1 59.7ZM267.1 96.1L264.6 97.1L264.6 79.3L267.1 78.2Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M264.6 97.1L261.5 97.4L261.5 79.5L264.6 79.3Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M261.5 97.4L258.5 96.8L258.5 79L261.5 79.5Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M258.5 96.8L180.8 69.6L180.8 51.8L258.5 79ZM180.8 69.6L178.8 68.4L178.8 50.6L180.8 51.8ZM178.8 68.4L178.2 66.8L178.2 49L178.8 50.6Z\"/><path class=\"iso-top\" d=\"M291.6 55.4L293.6 56.6L294.2 58.2L293.1 59.7L267.1 78.2L264.6 79.3L261.5 79.5L258.5 79L180.8 51.8L178.8 50.6L178.2 49L179.3 47.5L205.3 28.9L207.8 27.9L210.9 27.6L213.9 28.2Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M294.2 58.2L293.1 59.7L267.1 78.2L264.6 79.3L261.5 79.5L258.5 79L180.8 51.8L178.8 50.6L178.2 49\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M294.2 58.2L292 59.4L266.2 77.8L264.1 78.7L261.6 78.9L259 78.4L181.7 51.3L179.9 50.3L178.2 49\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M294.2 70.6L293.1 72.2L267.1 90.7L264.6 91.7L261.5 92L258.5 91.5L180.8 64.3L178.8 63.1L178.2 61.5\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M178.2 49L179.3 47.5L205.3 28.9L207.8 27.9L210.9 27.6L213.9 28.2L291.6 55.4L293.6 56.6L294.2 58.2M294.2 76L293.1 77.5L267.1 96.1L264.6 97.1L261.5 97.4L258.5 96.8L180.8 69.6L178.8 68.4L178.2 66.8M294.2 58.2L294.2 76M178.2 49L178.2 66.8\"/></g><g class=\"iso-dots\" data-tone=\"mid\"><circle cx=\"210.9\" cy=\"32.1\" r=\"0.5\"/><circle cx=\"187.2\" cy=\"49\" r=\"0.5\"/><circle cx=\"261.5\" cy=\"75\" r=\"0.5\"/><circle cx=\"285.1\" cy=\"58.1\" r=\"0.5\"/></g><text class=\"iso-face-text\" data-tone=\"mid\" transform=\"matrix(1.688 0.591 0 1.785 219.649 71.82)\" font-size=\"3.6\" text-anchor=\"middle\">ESTROGEN</text></g><g class=\"it\" data-name=\"slat\"><g data-slat=\"6\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M375.1 243.1L376.8 241.9L511.8 289.2L511.8 316.6L510.2 317.8L375.1 270.5Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M510.2 317.8L510.2 290.3L511.8 289.2L511.8 316.6Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M375.1 270.5L375.1 243.1L510.2 290.3L510.2 317.8Z\"/><path class=\"iso-top\" d=\"M375.1 243.1L376.8 241.9L511.8 289.2L510.2 290.3Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M510.2 317.8L510.2 290.3M375.1 243.1L510.2 290.3M510.2 290.3L511.8 289.2\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M375.1 243.1L376.8 241.9L511.8 289.2L511.8 316.6L510.2 317.8L375.1 270.5Z\"/></g></g></g><g class=\"it\" data-name=\"rad.post.r\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M502.5 288.7L503 287.8L526.1 271.3L527.7 270.8L529.6 271L537.3 273.7L538.3 274.5L538.3 474.4L537.9 475.3L514.8 491.8L513.2 492.3L511.3 492.1L503.6 489.4L502.5 488.6Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M538.3 474.4L537.9 475.3L537.9 275.4L538.3 274.5ZM537.9 475.3L514.8 491.8L514.8 292L537.9 275.4ZM514.8 491.8L513.2 492.3L513.2 292.5L514.8 292Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M513.2 492.3L511.3 492.1L511.3 292.3L513.2 292.5Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M511.3 492.1L503.6 489.4L503.6 289.5L511.3 292.3ZM503.6 489.4L502.5 488.6L502.5 288.7L503.6 289.5Z\"/><path class=\"iso-top\" d=\"M537.3 273.7L538.3 274.5L537.9 275.4L514.8 292L513.2 292.5L511.3 292.3L503.6 289.5L502.5 288.7L503 287.8L526.1 271.3L527.7 270.8L529.6 271Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M538.3 274.5L537.9 275.4L514.8 292L513.2 292.5L511.3 292.3L503.6 289.5L502.5 288.7\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M538.3 274.5L537.2 275.2L514.2 291.7L513 292.1L511.7 291.9L504.2 289.3L502.5 288.7\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M502.5 288.7L503 287.8L526.1 271.3L527.7 270.8L529.6 271L537.3 273.7L538.3 274.5M538.3 474.4L537.9 475.3L514.8 491.8L513.2 492.3L511.3 492.1L503.6 489.4L502.5 488.6M538.3 274.5L538.3 474.4M502.5 288.7L502.5 488.6\"/></g></g><g class=\"it\" data-name=\"slat.pin\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M521 448.1L521.1 447.5L521.2 447L521.3 446.4L521.6 445.8L521.8 445.3L522.1 444.8L522.5 444.4L522.8 444.1L523.2 443.9L523.5 443.9L523.8 443.9L526.5 444.8L526.8 445L527 445.2L527.1 445.6L527.2 446L527.3 446.5L527.2 447L527.1 447.6L527 448.2L526.8 448.8L526.5 449.3L526.2 449.8L525.9 450.1L525.5 450.4L525.2 450.6L524.8 450.7L524.5 450.7L521.8 449.7L521.6 449.6L521.3 449.4L521.2 449L521.1 448.6Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M521.8 449.7L521.6 449.6L521.3 449.4L521.2 449L523.9 450L524 450.3L524.3 450.6L524.5 450.7ZM523.7 449L523.8 448.5L523.9 447.9L524 447.3L524.3 446.8L524.5 446.2L524.8 445.8L525.2 445.4L525.5 445.1L525.9 444.9L526.2 444.8L526.5 444.8L526.8 445L527 445.2L527.1 445.6L527.2 446L527.3 446.5L527.2 447L527.1 447.6L527 448.2L526.8 448.8L526.5 449.3L526.2 449.8L525.9 450.1L525.5 450.4L525.2 450.6L524.8 450.7L524.5 450.7L524.3 450.6L524 450.3L523.9 450L523.8 449.5L523.7 449L525.5 447.8L525.5 447.8L525.5 447.8L525.5 447.8L525.5 447.8L525.5 447.8L525.5 447.8L525.5 447.8L525.5 447.8L525.5 447.8L525.5 447.8L525.5 447.8L525.5 447.8L525.5 447.8L525.5 447.8L525.5 447.8L525.5 447.8L525.5 447.8L525.5 447.8L525.5 447.8L525.5 447.8L525.5 447.8L525.5 447.8L525.5 447.8L525.5 447.8L525.5 447.8L525.5 447.8L525.5 447.8L525.5 447.8L525.5 447.8L525.5 447.8L525.5 447.8L525.5 447.8Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M521.2 449L521.1 448.6L523.8 449.5L523.9 450Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M521.1 448.6L521 448.1L523.7 449L523.8 449.5Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M521 448.1L521.1 447.5L521.2 447L523.9 447.9L523.8 448.5L523.7 449ZM523.5 443.9L523.8 443.9L526.5 444.8L526.2 444.8Z\"/><path class=\"iso-top\" d=\"M521.2 447L521.3 446.4L521.6 445.8L521.8 445.3L522.1 444.8L522.5 444.4L522.8 444.1L523.2 443.9L523.5 443.9L526.2 444.8L525.9 444.9L525.5 445.1L525.2 445.4L524.8 445.8L524.5 446.2L524.3 446.8L524 447.3L523.9 447.9Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M524.5 450.7L524 450.2L523.7 449.2L523.9 447.9L524.3 446.6L525 445.6L525.8 444.9L526.5 444.8\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M521 448.1L521.1 447.5L521.2 447L521.3 446.4L521.6 445.8L521.8 445.3L522.1 444.8L522.5 444.4L522.8 444.1L523.2 443.9L523.5 443.9L523.8 443.9L526.5 444.8L526.8 445L527 445.2L527.1 445.6L527.2 446L527.3 446.5L527.2 447L527.1 447.6L527 448.2L526.8 448.8L526.5 449.3L526.2 449.8L525.9 450.1L525.5 450.4L525.2 450.6L524.8 450.7L524.5 450.7L521.8 449.7L521.6 449.6L521.3 449.4L521.2 449L521.1 448.6Z\"/></g></g><g class=\"it\" data-name=\"slat.pin\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M521 424.9L521.1 424.3L521.2 423.8L521.3 423.2L521.6 422.6L521.8 422.1L522.1 421.6L522.5 421.2L522.8 420.9L523.2 420.7L523.5 420.7L523.8 420.7L526.5 421.6L526.8 421.8L527 422L527.1 422.4L527.2 422.8L527.3 423.3L527.2 423.8L527.1 424.4L527 425L526.8 425.6L526.5 426.1L526.2 426.6L525.9 426.9L525.5 427.2L525.2 427.4L524.8 427.5L524.5 427.5L521.8 426.6L521.6 426.4L521.3 426.2L521.2 425.8L521.1 425.4Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M521.8 426.6L521.6 426.4L521.3 426.2L521.2 425.8L523.9 426.8L524 427.1L524.3 427.4L524.5 427.5ZM523.7 425.8L523.8 425.3L523.9 424.7L524 424.1L524.3 423.6L524.5 423L524.8 422.6L525.2 422.2L525.5 421.9L525.9 421.7L526.2 421.6L526.5 421.6L526.8 421.8L527 422L527.1 422.4L527.2 422.8L527.3 423.3L527.2 423.8L527.1 424.4L527 425L526.8 425.6L526.5 426.1L526.2 426.6L525.9 426.9L525.5 427.2L525.2 427.4L524.8 427.5L524.5 427.5L524.3 427.4L524 427.1L523.9 426.8L523.8 426.3L523.7 425.8L525.5 424.6L525.5 424.6L525.5 424.6L525.5 424.6L525.5 424.6L525.5 424.6L525.5 424.6L525.5 424.6L525.5 424.6L525.5 424.6L525.5 424.6L525.5 424.6L525.5 424.6L525.5 424.6L525.5 424.6L525.5 424.6L525.5 424.6L525.5 424.6L525.5 424.6L525.5 424.6L525.5 424.6L525.5 424.6L525.5 424.6L525.5 424.6L525.5 424.6L525.5 424.6L525.5 424.6L525.5 424.6L525.5 424.6L525.5 424.6L525.5 424.6L525.5 424.6L525.5 424.6Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M521.2 425.8L521.1 425.4L523.8 426.3L523.9 426.8Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M521.1 425.4L521 424.9L523.7 425.8L523.8 426.3Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M521 424.9L521.1 424.3L521.2 423.8L523.9 424.7L523.8 425.3L523.7 425.8ZM523.5 420.7L523.8 420.7L526.5 421.6L526.2 421.6Z\"/><path class=\"iso-top\" d=\"M521.2 423.8L521.3 423.2L521.6 422.6L521.8 422.1L522.1 421.6L522.5 421.2L522.8 420.9L523.2 420.7L523.5 420.7L526.2 421.6L525.9 421.7L525.5 421.9L525.2 422.2L524.8 422.6L524.5 423L524.3 423.6L524 424.1L523.9 424.7Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M524.5 427.5L524 427L523.7 426L523.9 424.7L524.3 423.4L525 422.4L525.8 421.7L526.5 421.6\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M521 424.9L521.1 424.3L521.2 423.8L521.3 423.2L521.6 422.6L521.8 422.1L522.1 421.6L522.5 421.2L522.8 420.9L523.2 420.7L523.5 420.7L523.8 420.7L526.5 421.6L526.8 421.8L527 422L527.1 422.4L527.2 422.8L527.3 423.3L527.2 423.8L527.1 424.4L527 425L526.8 425.6L526.5 426.1L526.2 426.6L525.9 426.9L525.5 427.2L525.2 427.4L524.8 427.5L524.5 427.5L521.8 426.6L521.6 426.4L521.3 426.2L521.2 425.8L521.1 425.4Z\"/></g></g><g class=\"it\" data-name=\"slat.pin\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M521 401.7L521.1 401.1L521.2 400.6L521.3 400L521.6 399.4L521.8 398.9L522.1 398.4L522.5 398L522.8 397.7L523.2 397.6L523.5 397.5L523.8 397.5L526.5 398.4L526.8 398.6L527 398.8L527.1 399.2L527.2 399.6L527.3 400.1L527.2 400.6L527.1 401.2L527 401.8L526.8 402.4L526.5 402.9L526.2 403.4L525.9 403.7L525.5 404L525.2 404.2L524.8 404.3L524.5 404.3L521.8 403.4L521.6 403.2L521.3 403L521.2 402.6L521.1 402.2Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M521.8 403.4L521.6 403.2L521.3 403L521.2 402.6L523.9 403.6L524 403.9L524.3 404.2L524.5 404.3ZM523.7 402.6L523.8 402.1L523.9 401.5L524 400.9L524.3 400.4L524.5 399.8L524.8 399.4L525.2 399L525.5 398.7L525.9 398.5L526.2 398.4L526.5 398.4L526.8 398.6L527 398.8L527.1 399.2L527.2 399.6L527.3 400.1L527.2 400.6L527.1 401.2L527 401.8L526.8 402.4L526.5 402.9L526.2 403.4L525.9 403.7L525.5 404L525.2 404.2L524.8 404.3L524.5 404.3L524.3 404.2L524 403.9L523.9 403.6L523.8 403.1L523.7 402.6L525.5 401.4L525.5 401.4L525.5 401.4L525.5 401.4L525.5 401.4L525.5 401.4L525.5 401.4L525.5 401.4L525.5 401.4L525.5 401.4L525.5 401.4L525.5 401.4L525.5 401.4L525.5 401.4L525.5 401.4L525.5 401.4L525.5 401.4L525.5 401.4L525.5 401.4L525.5 401.4L525.5 401.4L525.5 401.4L525.5 401.4L525.5 401.4L525.5 401.4L525.5 401.4L525.5 401.4L525.5 401.4L525.5 401.4L525.5 401.4L525.5 401.4L525.5 401.4L525.5 401.4Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M521.2 402.6L521.1 402.2L523.8 403.1L523.9 403.6Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M521.1 402.2L521 401.7L523.7 402.6L523.8 403.1Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M521 401.7L521.1 401.1L521.2 400.6L523.9 401.5L523.8 402.1L523.7 402.6ZM523.5 397.5L523.8 397.5L526.5 398.4L526.2 398.4Z\"/><path class=\"iso-top\" d=\"M521.2 400.6L521.3 400L521.6 399.4L521.8 398.9L522.1 398.4L522.5 398L522.8 397.7L523.2 397.6L523.5 397.5L526.2 398.4L525.9 398.5L525.5 398.7L525.2 399L524.8 399.4L524.5 399.8L524.3 400.4L524 400.9L523.9 401.5Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M524.5 404.3L524 403.8L523.7 402.8L523.9 401.5L524.3 400.2L525 399.2L525.8 398.5L526.5 398.5\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M521 401.7L521.1 401.1L521.2 400.6L521.3 400L521.6 399.4L521.8 398.9L522.1 398.4L522.5 398L522.8 397.7L523.2 397.6L523.5 397.5L523.8 397.5L526.5 398.4L526.8 398.6L527 398.8L527.1 399.2L527.2 399.6L527.3 400.1L527.2 400.6L527.1 401.2L527 401.8L526.8 402.4L526.5 402.9L526.2 403.4L525.9 403.7L525.5 404L525.2 404.2L524.8 404.3L524.5 404.3L521.8 403.4L521.6 403.2L521.3 403L521.2 402.6L521.1 402.2Z\"/></g></g><g class=\"it\" data-name=\"sol.plinth\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M521.4 477.5L521.8 476.4L532.7 468.7L534.6 468.1L536.7 468.3L549.6 472.8L550.8 473.7L550.8 484.4L550.3 485.5L539.4 493.3L537.5 493.9L535.4 493.6L522.6 489.1L521.4 488.2Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M550.8 484.4L550.3 485.5L550.3 474.8L550.8 473.7ZM550.3 485.5L539.4 493.3L539.4 482.6L550.3 474.8ZM539.4 493.3L537.5 493.9L537.5 483.2L539.4 482.6Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M537.5 493.9L535.4 493.6L535.4 482.9L537.5 483.2Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M535.4 493.6L522.6 489.1L522.6 478.4L535.4 482.9ZM522.6 489.1L521.4 488.2L521.4 477.5L522.6 478.4Z\"/><path class=\"iso-top\" d=\"M549.6 472.8L550.8 473.7L550.3 474.8L539.4 482.6L537.5 483.2L535.4 482.9L522.6 478.4L521.4 477.5L521.8 476.4L532.7 468.7L534.6 468.1L536.7 468.3Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M550.8 473.7L550.3 474.8L539.4 482.6L537.5 483.2L535.4 482.9L522.6 478.4L521.4 477.5\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M550.8 473.7L549.5 474.6L538.8 482.3L537.4 482.8L535.7 482.5L523.2 478.1L521.4 477.5\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M521.4 477.5L521.8 476.4L532.7 468.7L534.6 468.1L536.7 468.3L549.6 472.8L550.8 473.7M550.8 484.4L550.3 485.5L539.4 493.3L537.5 493.9L535.4 493.6L522.6 489.1L521.4 488.2M550.8 473.7L550.8 484.4M521.4 477.5L521.4 488.2\"/></g><g class=\"iso-dots\" data-tone=\"mid\"><circle cx=\"535.2\" cy=\"469.8\" r=\"0.45\"/><circle cx=\"547.3\" cy=\"474\" r=\"0.45\"/><circle cx=\"524.8\" cy=\"477.2\" r=\"0.45\"/><circle cx=\"536.9\" cy=\"481.5\" r=\"0.45\"/></g></g><g class=\"it\" data-name=\"cable.sol:8\" data-route=\"cable.sol\"><g class=\"tb\"><path class=\"tb-body\" d=\"M497.4 489.7L498.6 490.1L500.1 490.6L501.7 491.2L503.2 491.7L504.7 492.2L506.2 492.8L507.7 493.3L509.3 493.8L510.8 494.4L512.6 494.9L514.5 495.1L516.5 494.8L518.5 493.9L519.9 492.2L520.8 490.4L521.1 489.5L517.5 488.5L517.4 489.1L516.8 490.2L516.2 490.9L515.4 491.3L514.5 491.4L513.3 491.3L512 490.9L510.5 490.3L509 489.8L507.4 489.3L505.9 488.7L504.4 488.2L502.9 487.7L501.4 487.1L499.8 486.6L498.6 486.2Z\"/><path class=\"tb-shine\" d=\"M497.2 487.6L497.7 487.8L499.2 488.3L500.8 488.8L502.3 489.4L503.8 489.9L505.3 490.4L506.9 491L508.4 491.5L509.9 492L511.4 492.6L513 493L514.5 493L515.9 492.8L517.1 492.1L518.1 491L518.9 489.6L519.4 488L518.5 487.8L518.1 489.3L517.4 490.6L516.6 491.4L515.6 491.9L514.5 492.1L513.2 492.1L511.7 491.7L510.2 491.2L508.7 490.7L507.1 490.1L505.6 489.6L504.1 489.1L502.6 488.5L501.1 488L499.5 487.5L498 486.9L497.5 486.7Z\"/><path class=\"tb-shade\" d=\"M496.8 488.6L497.3 488.8L498.9 489.4L500.4 489.9L501.9 490.4L503.4 491L505 491.5L506.5 492L508 492.6L509.5 493.1L511.1 493.7L512.7 494.2L514.5 494.6L516.4 494.5L518.3 493.6L519.6 492L520.3 490.2L520.7 488.3L520 488.2L519.6 489.9L519 491.6L517.8 493L516.2 493.8L514.5 493.9L512.8 493.5L511.3 492.9L509.8 492.4L508.3 491.9L506.7 491.3L505.2 490.8L503.7 490.3L502.2 489.7L500.6 489.2L499.1 488.7L497.6 488.1L497.1 487.9Z\"/><path class=\"iso-line tb-edge\" data-tone=\"mid\" d=\"M497.4 489.7L498.6 490.1L500.1 490.6L501.7 491.2L503.2 491.7L504.7 492.2L506.2 492.8L507.7 493.3L509.3 493.8L510.8 494.4L512.6 494.9L514.5 495.1L516.5 494.8L518.5 493.9L519.9 492.2L520.8 490.4L521.1 489.5M498.6 486.2L499.8 486.6L501.4 487.1L502.9 487.7L504.4 488.2L505.9 488.7L507.4 489.3L509 489.8L510.5 490.3L512 490.9L513.3 491.3L514.5 491.4L515.4 491.3L516.2 490.9L516.8 490.2L517.4 489.1L517.5 488.5\"/></g></g><g class=\"it\" data-name=\"sol.can\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M526 452.6L526 451.9L526.3 451.2L526.9 450.5L528.4 448.7L529 448.1L529.8 447.7L530.7 447.3L531.7 447L532.9 446.7L534.1 446.6L535.3 446.6L536.5 446.6L537.7 446.8L538.8 447.1L539.8 447.4L540.7 447.8L541.4 448.3L541.9 448.9L543.5 450.7L543.9 451.4L544.1 452.2L544.1 475L544.1 475.8L543.8 476.5L543.2 477.2L542.5 477.9L541.5 478.4L540.4 478.9L539.1 479.3L537.7 479.6L536.3 479.7L534.8 479.8L533.3 479.7L531.8 479.5L530.5 479.2L529.3 478.7L528.2 478.2L527.3 477.6L526.6 476.9L526.2 476.2L526 475.5Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M544.1 475.4L543.9 476.2L543.3 477.1L542.5 477.9L541.3 478.5L539.9 479.1L538.3 479.5L536.6 479.7L534.8 479.8L534.8 456.9L536.6 456.9L538.3 456.6L539.9 456.2L541.3 455.7L542.5 455L543.3 454.2L543.9 453.4L544.1 452.5ZM543.5 450.8L544 451.6L544.1 452.5L543.9 453.4L543.3 454.2L542.5 455L541.1 452.4L541.8 451.8L542.3 451.1L542.5 450.4L542.4 449.6L542 448.9Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M534.8 479.8L533.1 479.7L531.4 479.4L531.4 456.6L533.1 456.8L534.8 456.9ZM542.5 455L541.3 455.7L539.9 456.2L538.3 456.6L537.7 453.7L539 453.4L540.2 453L541.1 452.4Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M531.4 479.4L529.8 479L528.5 478.4L528.5 455.5L529.8 456.1L531.4 456.6ZM538.3 456.6L536.6 456.9L534.8 456.9L534.9 454L536.3 453.9L537.7 453.7Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M528.5 478.4L527.4 477.7L526.6 476.9L526.1 476L526.1 453.2L526.6 454.1L527.4 454.8L528.5 455.5ZM534.8 456.9L533.1 456.8L531.4 456.6L532.1 453.7L533.4 453.9L534.9 454Z\"/><path class=\"iso-top\" d=\"M526.1 476L526 475.2L526 452.3L526.1 453.2ZM531.4 456.6L529.8 456.1L528.5 455.5L527.4 454.8L526.6 454.1L526.1 453.2L526 452.3L526.2 451.4L526.7 450.6L528.3 448.8L527.8 449.5L527.6 450.2L527.7 450.9L528.1 451.6L528.8 452.3L529.7 452.8L530.8 453.3L532.1 453.7ZM541.1 452.4L540.2 453L539 453.4L537.7 453.7L536.3 453.9L534.9 454L533.4 453.9L532.1 453.7L530.8 453.3L529.7 452.8L528.8 452.3L528.1 451.6L527.7 450.9L527.6 450.2L527.8 449.5L528.3 448.8L529 448.1L529.9 447.6L531.1 447.1L532.4 446.8L533.8 446.6L535.2 446.6L536.7 446.7L538 446.9L539.3 447.2L540.4 447.7L541.3 448.3L542 448.9L542.4 449.6L542.5 450.4L542.3 451.1L541.8 451.8L541.1 452.4L535 450.3L535 450.3L535 450.3L535 450.3L535 450.3L535 450.3L535 450.3L535 450.3L535 450.3L535 450.3L535 450.3L535 450.3L535 450.3L535 450.3L535 450.3L535 450.3L535 450.3L535 450.3L535 450.3L535 450.3L535 450.3L535 450.3L535 450.3L535 450.3L535 450.3L535 450.3L535 450.3L535 450.3L535 450.3L535 450.3L535 450.3L535 450.3L535 450.3Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M544.1 452.4L544 453.2L543.6 453.9L543 454.6L542.2 455.2L541.2 455.7L540 456.2L538.7 456.6L537.3 456.8L535.8 456.9L534.3 456.9L532.8 456.8L531.4 456.6L530.1 456.2L528.9 455.7L527.9 455.2L527.1 454.6L526.5 453.9L526.1 453.2L526 452.4M541.9 448.8L542.3 449.5L542.5 450.3L542.3 451L541.9 451.7L541.2 452.3L540.3 452.9L539.2 453.4L537.9 453.7L536.5 453.9L535 454L533.6 453.9L532.2 453.7L530.9 453.4L529.8 452.9L528.9 452.3L528.2 451.7L527.8 451L527.6 450.3L527.8 449.5L528.2 448.8\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M544.1 469.9L544 470.5L543.8 471.1L543.4 471.6L542.9 472.2L542.2 472.7L541.5 473.1L540.6 473.5L539.6 473.8L538.5 474.1L537.4 474.3L536.2 474.4L535 474.4L533.9 474.4L532.7 474.3L531.6 474.1L530.5 473.8L529.5 473.5L528.6 473.1L527.9 472.7L527.2 472.2L526.7 471.6L526.3 471.1L526.1 470.5L526 469.9M544.1 457.4L544 458L543.8 458.6L543.4 459.1L542.9 459.7L542.2 460.2L541.5 460.6L540.6 461L539.6 461.3L538.5 461.6L537.4 461.8L536.2 461.9L535 461.9L533.9 461.9L532.7 461.8L531.6 461.6L530.5 461.3L529.5 461L528.6 460.6L527.9 460.2L527.2 459.7L526.7 459.1L526.3 458.6L526.1 458L526 457.4\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M526 452.6L526 451.9L526.3 451.2L526.9 450.5L528.4 448.7L529 448.1L529.8 447.7L530.7 447.3L531.7 447L532.9 446.7L534.1 446.6L535.3 446.6L536.5 446.6L537.7 446.8L538.8 447.1L539.8 447.4L540.7 447.8L541.4 448.3L541.9 448.9L543.5 450.7L543.9 451.4L544.1 452.2L544.1 475L544.1 475.8L543.8 476.5L543.2 477.2L542.5 477.9L541.5 478.4L540.4 478.9L539.1 479.3L537.7 479.6L536.3 479.7L534.8 479.8L533.3 479.7L531.8 479.5L530.5 479.2L529.3 478.7L528.2 478.2L527.3 477.6L526.6 476.9L526.2 476.2L526 475.5Z\"/></g></g><g class=\"it\" data-name=\"stud.sol.boss\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M524.4 466.1L524.5 465.3L524.7 464.5L525.1 463.9L525.6 463.5L527 462.4L527.6 462.1L528.3 462L529.1 462L529.8 462.2L530.6 462.6L531.4 463.1L532.1 463.7L532.7 464.5L533.2 465.3L533.6 466.1L533.8 467L533.9 467.9L533.8 468.7L533.6 469.4L533.2 470L532.7 470.5L531.3 471.5L530.7 471.8L530 472L529.2 472L528.4 471.8L527.6 471.4L526.9 470.9L526.2 470.3L525.6 469.5L525.1 468.7L524.7 467.8L524.5 466.9Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M533.2 465.3L533.6 466.1L533.8 467L533.9 467.9L533.8 468.7L533.6 469.4L533.2 470L532.7 470.5L531.3 471.5L531.8 471L532.2 470.4L532.4 469.7L532.5 468.9L532.4 468L532.2 467.2L531.8 466.3Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M532.7 464.5L533.2 465.3L531.8 466.3L531.3 465.5Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M532.1 463.7L532.7 464.5L531.3 465.5L530.7 464.7ZM524.4 466.1L524.5 465.3L524.7 464.5L525.1 463.9L525.6 463.5L526.2 463.1L526.9 463L527.6 463L528.4 463.2L529.2 463.6L530 464.1L530.7 464.7L531.3 465.5L531.8 466.3L532.2 467.2L532.4 468L532.5 468.9L532.4 469.7L532.2 470.4L531.8 471L531.3 471.5L530.7 471.8L530 472L529.2 472L528.4 471.8L527.6 471.4L526.9 470.9L526.2 470.3L525.6 469.5L525.1 468.7L524.7 467.8L524.5 466.9L524.4 466.1L528.4 467.5L528.4 467.5L528.4 467.5L528.4 467.5L528.4 467.5L528.4 467.5L528.4 467.5L528.4 467.5L528.4 467.5L528.4 467.5L528.4 467.5L528.4 467.5L528.4 467.5L528.4 467.5L528.4 467.5L528.4 467.5L528.4 467.5L528.4 467.5L528.4 467.5L528.4 467.5L528.4 467.5L528.4 467.5L528.4 467.5L528.4 467.5L528.4 467.5L528.4 467.5L528.4 467.5L528.4 467.5L528.4 467.5L528.4 467.5L528.4 467.5L528.4 467.5L528.4 467.5Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M530.6 462.6L531.4 463.1L532.1 463.7L530.7 464.7L530 464.1L529.2 463.6Z\"/><path class=\"iso-top\" d=\"M527 462.4L527.6 462.1L528.3 462L529.1 462L529.8 462.2L530.6 462.6L529.2 463.6L528.4 463.2L527.6 463L526.9 463L526.2 463.1L525.6 463.5Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M525.6 463.5L526.5 463.1L527.6 463L528.7 463.3L529.8 464L530.8 464.9L531.7 466L532.2 467.3L532.5 468.6L532.4 469.8L532 470.8L531.3 471.5\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M524.4 466.1L524.5 465.3L524.7 464.5L525.1 463.9L525.6 463.5L527 462.4L527.6 462.1L528.3 462L529.1 462L529.8 462.2L530.6 462.6L531.4 463.1L532.1 463.7L532.7 464.5L533.2 465.3L533.6 466.1L533.8 467L533.9 467.9L533.8 468.7L533.6 469.4L533.2 470L532.7 470.5L531.3 471.5L530.7 471.8L530 472L529.2 472L528.4 471.8L527.6 471.4L526.9 470.9L526.2 470.3L525.6 469.5L525.1 468.7L524.7 467.8L524.5 466.9Z\"/></g></g><g class=\"it\" data-name=\"stud.sol\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M524.2 467.8L524.3 467.3L524.4 466.8L524.7 466.4L525 466.2L526.6 465L527 464.8L527.5 464.7L527.9 464.7L528.4 464.8L528.9 465L529.4 465.4L529.8 465.8L530.2 466.2L530.5 466.7L530.8 467.3L530.9 467.8L531 468.4L530.9 468.9L530.8 469.3L530.5 469.7L530.2 470L528.6 471.2L528.2 471.4L527.7 471.5L527.3 471.5L526.8 471.3L526.3 471.1L525.8 470.8L525.4 470.4L525 469.9L524.7 469.4L524.4 468.9L524.3 468.3Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M530.5 466.7L530.8 467.3L530.9 467.8L531 468.4L530.9 468.9L530.8 469.3L530.5 469.7L530.2 470L528.6 471.2L528.9 470.9L529.1 470.5L529.3 470.1L529.3 469.6L529.3 469L529.1 468.5L528.9 467.9Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M530.2 466.2L530.5 466.7L528.9 467.9L528.6 467.4Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M529.8 465.8L530.2 466.2L528.6 467.4L528.2 466.9ZM524.2 467.8L524.3 467.3L524.4 466.8L524.7 466.4L525 466.2L525.4 466L525.8 465.9L526.3 465.9L526.8 466L527.3 466.2L527.7 466.5L528.2 466.9L528.6 467.4L528.9 467.9L529.1 468.5L529.3 469L529.3 469.6L529.3 470.1L529.1 470.5L528.9 470.9L528.6 471.2L528.2 471.4L527.7 471.5L527.3 471.5L526.8 471.3L526.3 471.1L525.8 470.8L525.4 470.4L525 469.9L524.7 469.4L524.4 468.9L524.3 468.3L524.2 467.8L526.8 468.7L526.8 468.7L526.8 468.7L526.8 468.7L526.8 468.7L526.8 468.7L526.8 468.7L526.8 468.7L526.8 468.7L526.8 468.7L526.8 468.7L526.8 468.7L526.8 468.7L526.8 468.7L526.8 468.7L526.8 468.7L526.8 468.7L526.8 468.7L526.8 468.7L526.8 468.7L526.8 468.7L526.8 468.7L526.8 468.7L526.8 468.7L526.8 468.7L526.8 468.7L526.8 468.7L526.8 468.7L526.8 468.7L526.8 468.7L526.8 468.7L526.8 468.7L526.8 468.7Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M528.9 465L529.4 465.4L529.8 465.8L528.2 466.9L527.7 466.5L527.3 466.2Z\"/><path class=\"iso-top\" d=\"M526.6 465L527 464.8L527.5 464.7L527.9 464.7L528.4 464.8L528.9 465L527.3 466.2L526.8 466L526.3 465.9L525.8 465.9L525.4 466L525 466.2Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M525 466.2L525.9 465.9L527 466.1L528.1 466.9L528.9 468L529.3 469.2L529.2 470.4L528.6 471.2\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M524.2 467.8L524.3 467.3L524.4 466.8L524.7 466.4L525 466.2L526.6 465L527 464.8L527.5 464.7L527.9 464.7L528.4 464.8L528.9 465L529.4 465.4L529.8 465.8L530.2 466.2L530.5 466.7L530.8 467.3L530.9 467.8L531 468.4L530.9 468.9L530.8 469.3L530.5 469.7L530.2 470L528.6 471.2L528.2 471.4L527.7 471.5L527.3 471.5L526.8 471.3L526.3 471.1L525.8 470.8L525.4 470.4L525 469.9L524.7 469.4L524.4 468.9L524.3 468.3Z\"/></g></g><g class=\"it\" data-name=\"cable.sol:9\" data-route=\"cable.sol\"><g class=\"tb\"><path class=\"tb-body\" d=\"M520.2 491.6L520.8 490.4L521.4 488.5L521.7 486.6L522 484.8L522.2 483.1L522.5 481.3L522.8 479.6L523 477.8L523.3 476.2L523.6 474.6L524.2 473.3L524.9 472.3L525.8 471.7L526.8 470.9L527.9 470.2L525.7 467.2L524.6 467.9L523.5 468.7L522.2 469.8L521 471.4L520.1 473.5L519.6 475.5L519.4 477.3L519.1 479L518.8 480.8L518.6 482.5L518.3 484.3L518 486L517.7 487.7L517.4 489.1L517 489.8ZM525.7 467.2L525.5 467.4L525.3 467.6L525.3 468L525.3 468.3L525.3 468.7L525.5 469.1L525.7 469.4L526 469.8L526.3 470L526.6 470.2L526.9 470.3L527.3 470.4L527.6 470.3L527.9 470.2L528.1 470L528.2 469.7L528.3 469.4L528.3 469L528.2 468.6L528.1 468.3L527.8 467.9L527.6 467.6L527.3 467.3L526.9 467.1L526.6 467L526.3 467L526 467Z\"/><path class=\"tb-shine\" d=\"M517.9 491.3L518.1 491L518.9 489.6L519.4 488L519.7 486.3L520 484.5L520.3 482.8L520.6 481L520.8 479.3L521.1 477.5L521.3 475.8L521.7 474L522.3 472.2L523.3 470.8L524.4 469.9L525.5 469.1L526.6 468.4L527.6 467.6L527.6 467.6L527.3 467.3L526.9 467.1L526.8 467.1L526 467.6L525 468.4L523.9 469.2L522.7 470.2L521.6 471.8L520.8 473.7L520.5 475.6L520.2 477.4L519.9 479.2L519.7 480.9L519.4 482.7L519.1 484.4L518.9 486.2L518.5 487.8L518.1 489.3L517.4 490.6L517.2 490.7Z\"/><path class=\"tb-shade\" d=\"M519.3 492.4L519.6 492L520.3 490.2L520.7 488.3L521 486.5L521.3 484.7L521.5 483L521.8 481.2L522.1 479.5L522.3 477.7L522.6 476L523.1 474.4L523.8 473.1L524.7 472.1L525.6 471.4L526.6 470.7L527.7 469.9L528.3 469.5L528.3 469.4L528.3 469L528.2 468.6L528.2 468.6L527.2 469.3L526.2 470.1L525.1 470.8L524.1 471.6L523.2 472.7L522.4 474.2L521.9 475.9L521.6 477.6L521.3 479.4L521.1 481.1L520.8 482.9L520.5 484.6L520.3 486.4L520 488.1L519.6 489.9L519 491.6L518.7 491.9Z\"/><path class=\"iso-line tb-edge\" data-tone=\"mid\" d=\"M520.2 491.6L520.8 490.4L521.4 488.5L521.7 486.6L522 484.8L522.2 483.1L522.5 481.3L522.8 479.6L523 477.8L523.3 476.2L523.6 474.6L524.2 473.3L524.9 472.3L525.8 471.7L526.8 470.9L527.9 470.2M517 489.8L517.4 489.1L517.7 487.7L518 486L518.3 484.3L518.6 482.5L518.8 480.8L519.1 479L519.4 477.3L519.6 475.5L520.1 473.5L521 471.4L522.2 469.8L523.5 468.7L524.6 467.9L525.7 467.2M527.9 470.2L528.1 470L528.2 469.7L528.3 469.4L528.3 469L528.2 468.6L528.1 468.3L527.8 467.9L527.6 467.6L527.3 467.3L526.9 467.1L526.6 467L526.3 467L526 467L525.7 467.2\"/></g></g><g class=\"it\" data-name=\"knob.plate\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M209.4 51.1L209.5 50.3L209.7 49.6L209.9 48.9L210.2 48.1L210.6 47.4L211.1 46.7L211.7 46L212.3 45.4L213 44.7L213.8 44.1L214.7 43.5L215.6 42.9L216.6 42.3L217.6 41.8L218.7 41.3L219.9 40.8L221.1 40.4L222.4 40L223.7 39.6L225 39.3L226.4 39L227.8 38.7L229.2 38.5L230.6 38.3L232.1 38.2L233.6 38.1L235.1 38.1L236.5 38L238 38.1L239.5 38.1L241 38.3L242.4 38.4L243.9 38.6L245.3 38.8L246.7 39.1L248 39.4L249.4 39.8L250.6 40.2L251.9 40.6L253 41L254.2 41.5L255.3 42L256.3 42.6L257.2 43.1L258.1 43.7L258.9 44.4L259.7 45L260.4 45.7L261 46.3L261.5 47L261.9 47.8L262.3 48.5L262.6 49.2L262.8 49.9L262.9 50.7L263 51.4L263 53.6L262.9 54.3L262.8 55.1L262.6 55.8L262.3 56.5L262 57.2L261.5 58L261 58.7L260.4 59.3L259.7 60L259 60.6L258.1 61.3L257.3 61.9L256.3 62.4L255.3 63L254.2 63.5L253.1 64L251.9 64.4L250.7 64.9L249.4 65.2L248.1 65.6L246.7 65.9L245.3 66.2L243.9 66.4L242.5 66.6L241 66.8L239.6 66.9L238.1 66.9L236.6 67L235.1 67L233.6 66.9L232.1 66.8L230.7 66.7L229.2 66.5L227.8 66.3L226.4 66L225 65.8L223.7 65.4L222.4 65.1L221.1 64.7L219.9 64.2L218.8 63.8L217.7 63.3L216.6 62.7L215.6 62.2L214.7 61.6L213.9 61L213.1 60.3L212.4 59.7L211.7 59L211.1 58.3L210.7 57.6L210.2 56.9L209.9 56.2L209.7 55.4L209.5 54.7L209.4 54L209.4 53.2Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M262.9 52.9L262.9 54.4L262.6 55.8L261.9 57.3L261 58.7L259.7 60L258.1 61.3L256.3 62.4L254.2 63.5L252 64.4L249.5 65.2L246.8 65.9L244.1 66.4L241.2 66.7L238.3 66.9L235.3 67L235.3 64.8L238.3 64.8L241.2 64.6L244.1 64.2L246.8 63.7L249.5 63.1L252 62.3L254.2 61.3L256.3 60.3L258.1 59.1L259.7 57.9L261 56.5L261.9 55.1L262.6 53.7L262.9 52.2L262.9 50.8Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M235.3 67L232.4 66.8L229.5 66.5L226.7 66.1L226.7 64L229.5 64.4L232.4 64.7L235.3 64.8Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M226.7 66.1L224 65.5L221.4 64.8L219.1 63.9L219.1 61.7L221.4 62.6L224 63.4L226.7 64Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M219.1 63.9L216.9 62.9L215 61.8L213.3 60.5L211.9 59.2L210.8 57.9L210 56.4L210 54.3L210.8 55.7L211.9 57.1L213.3 58.4L215 59.6L216.9 60.7L219.1 61.7Z\"/><path class=\"iso-top\" d=\"M210 56.4L209.6 55L209.4 53.5L209.4 51.4L209.6 52.9L210 54.3ZM258.1 59.1L256.3 60.3L254.2 61.3L252 62.3L249.5 63.1L246.8 63.7L244.1 64.2L241.2 64.6L238.3 64.8L235.3 64.8L232.4 64.7L229.5 64.4L226.7 64L224 63.4L221.4 62.6L219.1 61.7L216.9 60.7L215 59.6L213.3 58.4L211.9 57.1L210.8 55.7L210 54.3L209.6 52.9L209.4 51.4L209.6 49.9L210.1 48.4L210.9 47L212 45.7L213.4 44.4L215.1 43.2L217.1 42.1L219.3 41.1L221.6 40.2L224.2 39.5L226.9 38.9L229.7 38.4L232.6 38.2L235.6 38L238.5 38.1L241.5 38.3L244.3 38.7L247.1 39.2L249.7 39.9L252.2 40.7L254.4 41.6L256.5 42.7L258.3 43.9L259.8 45.1L261.1 46.5L262 47.9L262.6 49.3L262.9 50.8L262.9 52.2L262.6 53.7L261.9 55.1L261 56.5L259.7 57.9L258.1 59.1L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4L236.2 51.4Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M263 51.4L262.9 52.2L262.8 52.9L262.6 53.6L262.3 54.4L262 55.1L261.5 55.8L261 56.5L260.4 57.2L259.8 57.8L259 58.5L258.2 59.1L257.3 59.7L256.4 60.2L255.4 60.8L254.3 61.3L253.2 61.8L252.1 62.2L250.8 62.7L249.6 63L248.3 63.4L247 63.7L245.6 64L244.2 64.2L242.8 64.4L241.3 64.6L239.9 64.7L238.4 64.8L236.9 64.8L235.5 64.8L234 64.8L232.5 64.7L231.1 64.6L229.6 64.4L228.2 64.2L226.8 64L225.4 63.7L224.1 63.4L222.8 63L221.5 62.7L220.3 62.2L219.2 61.8L218.1 61.3L217 60.8L216 60.2L215.1 59.7L214.2 59.1L213.4 58.5L212.6 57.8L212 57.2L211.4 56.5L210.9 55.8L210.4 55.1L210.1 54.4L209.8 53.6L209.6 52.9L209.4 52.2L209.4 51.4\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M209.4 51.1L209.5 50.3L209.7 49.6L209.9 48.9L210.2 48.1L210.6 47.4L211.1 46.7L211.7 46L212.3 45.4L213 44.7L213.8 44.1L214.7 43.5L215.6 42.9L216.6 42.3L217.6 41.8L218.7 41.3L219.9 40.8L221.1 40.4L222.4 40L223.7 39.6L225 39.3L226.4 39L227.8 38.7L229.2 38.5L230.6 38.3L232.1 38.2L233.6 38.1L235.1 38.1L236.5 38L238 38.1L239.5 38.1L241 38.3L242.4 38.4L243.9 38.6L245.3 38.8L246.7 39.1L248 39.4L249.4 39.8L250.6 40.2L251.9 40.6L253 41L254.2 41.5L255.3 42L256.3 42.6L257.2 43.1L258.1 43.7L258.9 44.4L259.7 45L260.4 45.7L261 46.3L261.5 47L261.9 47.8L262.3 48.5L262.6 49.2L262.8 49.9L262.9 50.7L263 51.4L263 53.6L262.9 54.3L262.8 55.1L262.6 55.8L262.3 56.5L262 57.2L261.5 58L261 58.7L260.4 59.3L259.7 60L259 60.6L258.1 61.3L257.3 61.9L256.3 62.4L255.3 63L254.2 63.5L253.1 64L251.9 64.4L250.7 64.9L249.4 65.2L248.1 65.6L246.7 65.9L245.3 66.2L243.9 66.4L242.5 66.6L241 66.8L239.6 66.9L238.1 66.9L236.6 67L235.1 67L233.6 66.9L232.1 66.8L230.7 66.7L229.2 66.5L227.8 66.3L226.4 66L225 65.8L223.7 65.4L222.4 65.1L221.1 64.7L219.9 64.2L218.8 63.8L217.7 63.3L216.6 62.7L215.6 62.2L214.7 61.6L213.9 61L213.1 60.3L212.4 59.7L211.7 59L211.1 58.3L210.7 57.6L210.2 56.9L209.9 56.2L209.7 55.4L209.5 54.7L209.4 54L209.4 53.2Z\"/></g><path class=\"iso-line\" data-tone=\"lo\" d=\"M214.5 49L211.7 48.7M218 45.1L215.6 44.2M224.2 42.1L222.7 40.8M232.3 40.5L231.8 39.1M241 40.6L241.6 39.2M249 42.3L250.6 41.1M255 45.5L257.4 44.7M258.1 49.5L261 49.3M257.9 53.8L260.7 54.2M254.4 57.8L256.8 58.6M240.1 62.4L240.6 63.8\"/><path class=\"iso-line\" data-tone=\"hi\" d=\"M216.7 53.2L211.4 53.6M246.8 59.8L249.7 62\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M256.8 58.6L254.7 59.9L252.4 61.1L249.7 62L246.8 62.8L243.8 63.4L240.6 63.8L237.3 64L234 64L230.8 63.7L227.6 63.3L224.6 62.6L221.8 61.7L219.2 60.7L216.9 59.5L215 58.2L213.4 56.8L212.2 55.2L211.4 53.6L211.1 52L211.2 50.3L211.7 48.7L212.6 47.1L213.9 45.6L215.6 44.2L217.7 42.9L220 41.8L222.7 40.8L225.6 40L228.6 39.5L231.8 39.1L235.1 38.9L238.4 38.9L241.6 39.2L244.8 39.6L247.8 40.3L250.6 41.1L253.2 42.2L255.5 43.4L257.4 44.7L259 46.1L260.2 47.7L261 49.3L261.3 50.9L261.2 52.5L260.7 54.2L259.8 55.7L258.5 57.2Z\"/></g><g class=\"it\" data-name=\"bar\" data-part=\"bar\"><clipPath id=\"mt-bar\"><path data-hold d=\"M527.3 286.1L527.5 285.7L531.8 282.7L532.4 282.5L533.2 282.6L534.6 283L535 283.4L535 447.5L534.8 447.9L530.6 451L529.9 451.2L529.1 451.1L527.8 450.6L527.3 450.3Z\"/></clipPath><g clip-path=\"url(#mt-bar)\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M527.3 296.8L527.5 296.4L531.8 293.4L532.4 293.2L533.2 293.3L534.6 293.7L535 294.1L535 451.1L534.8 451.5L530.6 454.5L529.9 454.7L529.1 454.7L527.8 454.2L527.3 453.9Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M535 451.1L534.8 451.5L534.8 294.5L535 294.1ZM534.8 451.5L530.6 454.5L530.6 297.5L534.8 294.5ZM530.6 454.5L529.9 454.7L529.9 297.7L530.6 297.5Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M529.9 454.7L529.1 454.7L529.1 297.6L529.9 297.7Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M529.1 454.7L527.8 454.2L527.8 297.2L529.1 297.6ZM527.8 454.2L527.3 453.9L527.3 296.8L527.8 297.2Z\"/><path class=\"iso-top\" d=\"M534.6 293.7L535 294.1L534.8 294.5L530.6 297.5L529.9 297.7L529.1 297.6L527.8 297.2L527.3 296.8L527.5 296.4L531.8 293.4L532.4 293.2L533.2 293.3Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M535 294.1L534.8 294.5L530.6 297.5L529.9 297.7L529.1 297.6L527.8 297.2L527.3 296.8\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M535 294.1L534.2 294.3L530.1 297.3L529.8 297.4L529.4 297.3L528.2 296.9L527.3 296.8\"/><path class=\"iso-line\" data-tone=\"lo\" d=\"M531.9 447.7L531.4 447.8L531.1 447.6L531 447.1L531 447.1L531.1 446.4L531.4 445.7L531.9 445.2L533.5 444L533.9 443.9L534.2 444.1L534.3 444.7L534.3 444.7L534.2 445.4L533.9 446.1L533.5 446.5ZM531.9 424.5L531.4 424.6L531.1 424.4L531 423.9L531 423.9L531.1 423.2L531.4 422.5L531.9 422L533.5 420.8L533.9 420.7L534.2 421L534.3 421.5L534.3 421.5L534.2 422.2L533.9 422.9L533.5 423.3ZM531.9 401.3L531.4 401.4L531.1 401.2L531 400.7L531 400.7L531.1 400L531.4 399.3L531.9 398.8L533.5 397.6L533.9 397.5L534.2 397.8L534.3 398.3L534.3 398.3L534.2 399L533.9 399.7L533.5 400.1ZM531.9 378.1L531.4 378.2L531.1 378L531 377.5L531 377.5L531.1 376.8L531.4 376.1L531.9 375.6L533.5 374.4L533.9 374.3L534.2 374.6L534.3 375.1L534.3 375.1L534.2 375.8L533.9 376.5L533.5 376.9ZM531.9 354.9L531.4 355L531.1 354.8L531 354.3L531 354.3L531.1 353.6L531.4 352.9L531.9 352.4L533.5 351.2L533.9 351.1L534.2 351.4L534.3 351.9L534.3 351.9L534.2 352.6L533.9 353.3L533.5 353.7ZM531.9 331.7L531.4 331.9L531.1 331.6L531 331.1L531 331.1L531.1 330.4L531.4 329.7L531.9 329.2L533.5 328L533.9 327.9L534.2 328.2L534.3 328.7L534.3 328.7L534.2 329.4L533.9 330.1L533.5 330.5ZM531.9 308.5L531.4 308.7L531.1 308.4L531 307.9L531 307.9L531.1 307.2L531.4 306.5L531.9 306L533.5 304.8L533.9 304.7L534.2 305L534.3 305.5L534.3 305.5L534.2 306.2L533.9 306.9L533.5 307.3Z\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M527.3 296.8L527.5 296.4L531.8 293.4L532.4 293.2L533.2 293.3L534.6 293.7L535 294.1M535 451.1L534.8 451.5L530.6 454.5L529.9 454.7L529.1 454.7L527.8 454.2L527.3 453.9M535 294.1L535 451.1M527.3 296.8L527.3 453.9\"/></g><g data-part=\"crankpins\"><g class=\"iso-dots\" data-tone=\"hi\"><circle cx=\"534.5\" cy=\"444.6\" r=\"0.8\"/><circle cx=\"534.5\" cy=\"421.4\" r=\"0.8\"/><circle cx=\"534.5\" cy=\"398.2\" r=\"0.8\"/><circle cx=\"534.5\" cy=\"375\" r=\"0.8\"/><circle cx=\"534.5\" cy=\"351.8\" r=\"0.8\"/><circle cx=\"534.5\" cy=\"328.6\" r=\"0.8\"/><circle cx=\"534.5\" cy=\"305.4\" r=\"0.8\"/></g></g></g></g><g class=\"it\" data-name=\"knob\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M219.7 40.9L219.8 40.1L219.9 39.4L220.2 38.7L220.7 38L221.2 37.3L221.9 36.6L222.7 36L223.6 35.4L224.6 34.9L225.7 34.4L226.9 33.9L228.1 33.5L229.5 33.2L230.8 32.9L232.2 32.7L233.7 32.6L235.2 32.5L236.6 32.5L238.1 32.5L239.6 32.7L241 32.8L242.4 33.1L243.8 33.4L245 33.8L246.2 34.2L247.4 34.7L248.4 35.2L249.4 35.8L250.2 36.4L250.9 37L251.5 37.7L252 38.4L252.4 39.1L252.6 39.8L252.7 40.6L252.7 51.3L252.6 52L252.5 52.8L252.2 53.5L251.7 54.2L251.2 54.9L250.5 55.5L249.7 56.2L248.8 56.8L247.8 57.3L246.7 57.8L245.5 58.2L244.3 58.6L242.9 59L241.6 59.2L240.1 59.4L238.7 59.6L237.2 59.7L235.7 59.7L234.3 59.6L232.8 59.5L231.4 59.3L230 59.1L228.6 58.8L227.4 58.4L226.1 58L225 57.5L224 57L223 56.4L222.2 55.8L221.5 55.1L220.9 54.5L220.4 53.8L220 53.1L219.8 52.3L219.7 51.6Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M252.6 52L252.2 53.5L251.2 54.9L249.7 56.2L247.8 57.3L245.5 58.2L242.9 59L240.1 59.4L237.2 59.7L237.2 49L240.1 48.7L242.9 48.3L245.5 47.5L247.8 46.6L249.7 45.5L251.2 44.2L252.2 42.8L252.6 41.3Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M237.2 59.7L234.3 59.6L231.4 59.3L231.4 48.6L234.3 48.9L237.2 49Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M231.4 59.3L228.6 58.8L226.1 58L226.1 47.3L228.6 48.1L231.4 48.6Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M226.1 58L224 57L222.2 55.8L220.9 54.5L220 53.1L220 42.3L220.9 43.8L222.2 45.1L224 46.3L226.1 47.3Z\"/><path class=\"iso-top\" d=\"M220 53.1L219.7 51.6L219.7 40.9L220 42.3ZM249.7 45.5L247.8 46.6L245.5 47.5L242.9 48.3L240.1 48.7L237.2 49L234.3 48.9L231.4 48.6L228.6 48.1L226.1 47.3L224 46.3L222.2 45.1L220.9 43.8L220 42.3L219.7 40.9L219.9 39.4L220.7 38L221.9 36.6L223.6 35.4L225.7 34.4L228.1 33.5L230.8 32.9L233.7 32.6L236.6 32.5L239.6 32.7L242.4 33.1L245 33.8L247.4 34.7L249.4 35.8L250.9 37L252 38.4L252.6 39.8L252.6 41.3L252.2 42.8L251.2 44.2L249.7 45.5L236.2 40.7L236.2 40.7L236.2 40.7L236.2 40.7L236.2 40.7L236.2 40.7L236.2 40.7L236.2 40.7L236.2 40.7L236.2 40.7L236.2 40.7L236.2 40.7L236.2 40.7L236.2 40.7L236.2 40.7L236.2 40.7L236.2 40.7L236.2 40.7L236.2 40.7L236.2 40.7L236.2 40.7L236.2 40.7L236.2 40.7L236.2 40.7L236.2 40.7L236.2 40.7L236.2 40.7L236.2 40.7L236.2 40.7L236.2 40.7L236.2 40.7L236.2 40.7L236.2 40.7L236.2 40.7L236.2 40.7L236.2 40.7Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M252.7 40.7L252.6 41.5L252.4 42.2L252.1 42.9L251.6 43.6L251 44.3L250.3 45L249.5 45.6L248.6 46.2L247.6 46.7L246.5 47.2L245.3 47.6L244 48L242.7 48.3L241.3 48.6L239.9 48.8L238.4 48.9L236.9 49L235.5 49L234 48.9L232.5 48.8L231.1 48.6L229.7 48.3L228.4 48L227.1 47.6L225.9 47.2L224.8 46.7L223.8 46.2L222.9 45.6L222 45L221.3 44.3L220.8 43.6L220.3 42.9L220 42.2L219.8 41.5L219.7 40.7\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M219.7 40.9L219.8 40.1L219.9 39.4L220.2 38.7L220.7 38L221.2 37.3L221.9 36.6L222.7 36L223.6 35.4L224.6 34.9L225.7 34.4L226.9 33.9L228.1 33.5L229.5 33.2L230.8 32.9L232.2 32.7L233.7 32.6L235.2 32.5L236.6 32.5L238.1 32.5L239.6 32.7L241 32.8L242.4 33.1L243.8 33.4L245 33.8L246.2 34.2L247.4 34.7L248.4 35.2L249.4 35.8L250.2 36.4L250.9 37L251.5 37.7L252 38.4L252.4 39.1L252.6 39.8L252.7 40.6L252.7 51.3L252.6 52L252.5 52.8L252.2 53.5L251.7 54.2L251.2 54.9L250.5 55.5L249.7 56.2L248.8 56.8L247.8 57.3L246.7 57.8L245.5 58.2L244.3 58.6L242.9 59L241.6 59.2L240.1 59.4L238.7 59.6L237.2 59.7L235.7 59.7L234.3 59.6L232.8 59.5L231.4 59.3L230 59.1L228.6 58.8L227.4 58.4L226.1 58L225 57.5L224 57L223 56.4L222.2 55.8L221.5 55.1L220.9 54.5L220.4 53.8L220 53.1L219.8 52.3L219.7 51.6Z\"/></g><path class=\"iso-line\" data-tone=\"lo\" d=\"M249.7 55.5L249.7 46.2M248.1 56.5L248.1 47.2M246.1 57.3L246.1 48M243.9 58L243.9 48.7M241.6 58.5L241.6 49.2M239.1 58.8L239.1 49.6M236.5 59L236.5 49.7M233.9 58.9L233.9 49.6M231.4 58.6L231.4 49.3M229 58.1L229 48.9M226.7 57.5L226.7 48.2M224.7 56.7L224.7 47.4M223 55.7L223 46.4M221.6 54.6L221.6 45.3M220.6 53.4L220.6 44.1M220 52.2L220 42.9M252 53.1L252 43.9M251 54.3L251 45.1\"/></g><g class=\"it\" data-name=\"slat.pin\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M521 378.5L521.1 377.9L521.2 377.4L521.3 376.8L521.6 376.2L521.8 375.7L522.1 375.2L522.5 374.8L522.8 374.5L523.2 374.4L523.5 374.3L523.8 374.3L526.5 375.2L526.8 375.4L527 375.6L527.1 376L527.2 376.4L527.3 376.9L527.2 377.5L527.1 378L527 378.6L526.8 379.2L526.5 379.7L526.2 380.2L525.9 380.5L525.5 380.8L525.2 381L524.8 381.1L524.5 381.1L521.8 380.2L521.6 380L521.3 379.8L521.2 379.4L521.1 379Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M521.8 380.2L521.6 380L521.3 379.8L521.2 379.4L523.9 380.4L524 380.7L524.3 381L524.5 381.1ZM523.7 379.4L523.8 378.9L523.9 378.3L524 377.7L524.3 377.2L524.5 376.6L524.8 376.2L525.2 375.8L525.5 375.5L525.9 375.3L526.2 375.2L526.5 375.2L526.8 375.4L527 375.6L527.1 376L527.2 376.4L527.3 376.9L527.2 377.5L527.1 378L527 378.6L526.8 379.2L526.5 379.7L526.2 380.2L525.9 380.5L525.5 380.8L525.2 381L524.8 381.1L524.5 381.1L524.3 381L524 380.7L523.9 380.4L523.8 379.9L523.7 379.4L525.5 378.2L525.5 378.2L525.5 378.2L525.5 378.2L525.5 378.2L525.5 378.2L525.5 378.2L525.5 378.2L525.5 378.2L525.5 378.2L525.5 378.2L525.5 378.2L525.5 378.2L525.5 378.2L525.5 378.2L525.5 378.2L525.5 378.2L525.5 378.2L525.5 378.2L525.5 378.2L525.5 378.2L525.5 378.2L525.5 378.2L525.5 378.2L525.5 378.2L525.5 378.2L525.5 378.2L525.5 378.2L525.5 378.2L525.5 378.2L525.5 378.2L525.5 378.2L525.5 378.2Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M521.2 379.4L521.1 379L523.8 379.9L523.9 380.4Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M521.1 379L521 378.5L523.7 379.4L523.8 379.9Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M521 378.5L521.1 377.9L521.2 377.4L523.9 378.3L523.8 378.9L523.7 379.4ZM523.5 374.3L523.8 374.3L526.5 375.2L526.2 375.2Z\"/><path class=\"iso-top\" d=\"M521.2 377.4L521.3 376.8L521.6 376.2L521.8 375.7L522.1 375.2L522.5 374.8L522.8 374.5L523.2 374.4L523.5 374.3L526.2 375.2L525.9 375.3L525.5 375.5L525.2 375.8L524.8 376.2L524.5 376.6L524.3 377.2L524 377.7L523.9 378.3Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M524.5 381.1L524 380.6L523.7 379.6L523.9 378.3L524.3 377L525 376L525.8 375.3L526.5 375.3\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M521 378.5L521.1 377.9L521.2 377.4L521.3 376.8L521.6 376.2L521.8 375.7L522.1 375.2L522.5 374.8L522.8 374.5L523.2 374.4L523.5 374.3L523.8 374.3L526.5 375.2L526.8 375.4L527 375.6L527.1 376L527.2 376.4L527.3 376.9L527.2 377.5L527.1 378L527 378.6L526.8 379.2L526.5 379.7L526.2 380.2L525.9 380.5L525.5 380.8L525.2 381L524.8 381.1L524.5 381.1L521.8 380.2L521.6 380L521.3 379.8L521.2 379.4L521.1 379Z\"/></g></g><g class=\"it\" data-name=\"rad.header\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M350.6 223L351.3 222L377.3 203.4L378.9 202.7L381.1 202.5L383.1 202.9L541.7 258.4L543.1 259.3L543.5 260.3L543.5 274.6L542.7 275.6L516.7 294.1L515.1 294.8L513 295L511 294.7L352.3 239.1L351 238.3L350.6 237.2Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M543.5 274.6L542.7 275.6L542.7 261.3L543.5 260.3ZM542.7 275.6L516.7 294.1L516.7 279.9L542.7 261.3ZM516.7 294.1L515.1 294.8L515.1 280.6L516.7 279.9Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M515.1 294.8L513 295L513 280.7L515.1 280.6Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M513 295L511 294.7L511 280.4L513 280.7Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M511 294.7L352.3 239.1L352.3 224.8L511 280.4ZM352.3 239.1L351 238.3L351 224L352.3 224.8ZM351 238.3L350.6 237.2L350.6 223L351 224Z\"/><path class=\"iso-top\" d=\"M541.7 258.4L543.1 259.3L543.5 260.3L542.7 261.3L516.7 279.9L515.1 280.6L513 280.7L511 280.4L352.3 224.8L351 224L350.6 223L351.3 222L377.3 203.4L378.9 202.7L381.1 202.5L383.1 202.9Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M543.5 260.3L542.7 261.3L516.7 279.9L515.1 280.6L513 280.7L511 280.4L352.3 224.8L351 224L350.6 223\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M543.5 260.3L541.6 261L515.8 279.5L514.6 280L513.1 280.1L511.6 279.8L353.2 224.4L352.1 223.8L350.6 223\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M543.5 269.2L542.7 270.2L516.7 288.8L515.1 289.5L513 289.7L511 289.3L352.3 233.8L351 232.9L350.6 231.9\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M350.6 223L351.3 222L377.3 203.4L378.9 202.7L381.1 202.5L383.1 202.9L541.7 258.4L543.1 259.3L543.5 260.3M543.5 274.6L542.7 275.6L516.7 294.1L515.1 294.8L513 295L511 294.7L352.3 239.1L351 238.3L350.6 237.2M543.5 260.3L543.5 274.6M350.6 223L350.6 237.2\"/></g><g class=\"iso-dots\" data-tone=\"mid\"><circle cx=\"384.2\" cy=\"208.3\" r=\"0.5\"/><circle cx=\"363\" cy=\"223.5\" r=\"0.5\"/><circle cx=\"531.1\" cy=\"259.7\" r=\"0.5\"/><circle cx=\"509.8\" cy=\"274.9\" r=\"0.5\"/></g></g><g class=\"it\" data-name=\"slat.pin\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M521 355.3L521.1 354.7L521.2 354.2L521.3 353.6L521.6 353L521.8 352.5L522.1 352L522.5 351.6L522.8 351.3L523.2 351.2L523.5 351.1L523.8 351.1L526.5 352L526.8 352.2L527 352.4L527.1 352.8L527.2 353.2L527.3 353.7L527.2 354.3L527.1 354.8L527 355.4L526.8 356L526.5 356.5L526.2 357L525.9 357.3L525.5 357.6L525.2 357.8L524.8 357.9L524.5 357.9L521.8 357L521.6 356.8L521.3 356.6L521.2 356.2L521.1 355.8Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M521.8 357L521.6 356.8L521.3 356.6L521.2 356.2L523.9 357.2L524 357.5L524.3 357.8L524.5 357.9ZM523.7 356.2L523.8 355.7L523.9 355.1L524 354.5L524.3 354L524.5 353.4L524.8 353L525.2 352.6L525.5 352.3L525.9 352.1L526.2 352L526.5 352L526.8 352.2L527 352.4L527.1 352.8L527.2 353.2L527.3 353.7L527.2 354.3L527.1 354.8L527 355.4L526.8 356L526.5 356.5L526.2 357L525.9 357.3L525.5 357.6L525.2 357.8L524.8 357.9L524.5 357.9L524.3 357.8L524 357.5L523.9 357.2L523.8 356.7L523.7 356.2L525.5 355L525.5 355L525.5 355L525.5 355L525.5 355L525.5 355L525.5 355L525.5 355L525.5 355L525.5 355L525.5 355L525.5 355L525.5 355L525.5 355L525.5 355L525.5 355L525.5 355L525.5 355L525.5 355L525.5 355L525.5 355L525.5 355L525.5 355L525.5 355L525.5 355L525.5 355L525.5 355L525.5 355L525.5 355L525.5 355L525.5 355L525.5 355L525.5 355Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M521.2 356.2L521.1 355.8L523.8 356.7L523.9 357.2Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M521.1 355.8L521 355.3L523.7 356.2L523.8 356.7Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M521 355.3L521.1 354.7L521.2 354.2L523.9 355.1L523.8 355.7L523.7 356.2ZM523.5 351.1L523.8 351.1L526.5 352L526.2 352Z\"/><path class=\"iso-top\" d=\"M521.2 354.2L521.3 353.6L521.6 353L521.8 352.5L522.1 352L522.5 351.6L522.8 351.3L523.2 351.2L523.5 351.1L526.2 352L525.9 352.1L525.5 352.3L525.2 352.6L524.8 353L524.5 353.4L524.3 354L524 354.5L523.9 355.1Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M524.5 357.9L524 357.4L523.7 356.4L523.9 355.1L524.3 353.8L525 352.8L525.8 352.1L526.5 352.1\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M521 355.3L521.1 354.7L521.2 354.2L521.3 353.6L521.6 353L521.8 352.5L522.1 352L522.5 351.6L522.8 351.3L523.2 351.2L523.5 351.1L523.8 351.1L526.5 352L526.8 352.2L527 352.4L527.1 352.8L527.2 353.2L527.3 353.7L527.2 354.3L527.1 354.8L527 355.4L526.8 356L526.5 356.5L526.2 357L525.9 357.3L525.5 357.6L525.2 357.8L524.8 357.9L524.5 357.9L521.8 357L521.6 356.8L521.3 356.6L521.2 356.2L521.1 355.8Z\"/></g></g><g class=\"it\" data-name=\"slat.pin\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M521 332.1L521.1 331.5L521.2 331L521.3 330.4L521.6 329.8L521.8 329.3L522.1 328.8L522.5 328.4L522.8 328.2L523.2 328L523.5 327.9L523.8 327.9L526.5 328.8L526.8 329L527 329.2L527.1 329.6L527.2 330L527.3 330.5L527.2 331.1L527.1 331.6L527 332.2L526.8 332.8L526.5 333.3L526.2 333.8L525.9 334.2L525.5 334.4L525.2 334.6L524.8 334.7L524.5 334.7L521.8 333.8L521.6 333.6L521.3 333.4L521.2 333L521.1 332.6Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M521.8 333.8L521.6 333.6L521.3 333.4L521.2 333L523.9 334L524 334.3L524.3 334.6L524.5 334.7ZM523.7 333L523.8 332.5L523.9 331.9L524 331.3L524.3 330.8L524.5 330.3L524.8 329.8L525.2 329.4L525.5 329.1L525.9 328.9L526.2 328.8L526.5 328.8L526.8 329L527 329.2L527.1 329.6L527.2 330L527.3 330.5L527.2 331.1L527.1 331.6L527 332.2L526.8 332.8L526.5 333.3L526.2 333.8L525.9 334.2L525.5 334.4L525.2 334.6L524.8 334.7L524.5 334.7L524.3 334.6L524 334.3L523.9 334L523.8 333.5L523.7 333L525.5 331.8L525.5 331.8L525.5 331.8L525.5 331.8L525.5 331.8L525.5 331.8L525.5 331.8L525.5 331.8L525.5 331.8L525.5 331.8L525.5 331.8L525.5 331.8L525.5 331.8L525.5 331.8L525.5 331.8L525.5 331.8L525.5 331.8L525.5 331.8L525.5 331.8L525.5 331.8L525.5 331.8L525.5 331.8L525.5 331.8L525.5 331.8L525.5 331.8L525.5 331.8L525.5 331.8L525.5 331.8L525.5 331.8L525.5 331.8L525.5 331.8L525.5 331.8L525.5 331.8Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M521.2 333L521.1 332.6L523.8 333.5L523.9 334Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M521.1 332.6L521 332.1L523.7 333L523.8 333.5Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M521 332.1L521.1 331.5L521.2 331L523.9 331.9L523.8 332.5L523.7 333ZM523.5 327.9L523.8 327.9L526.5 328.8L526.2 328.8Z\"/><path class=\"iso-top\" d=\"M521.2 331L521.3 330.4L521.6 329.8L521.8 329.3L522.1 328.8L522.5 328.4L522.8 328.2L523.2 328L523.5 327.9L526.2 328.8L525.9 328.9L525.5 329.1L525.2 329.4L524.8 329.8L524.5 330.3L524.3 330.8L524 331.3L523.9 331.9Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M524.5 334.7L524 334.2L523.7 333.2L523.9 331.9L524.3 330.6L525 329.6L525.8 328.9L526.5 328.9\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M521 332.1L521.1 331.5L521.2 331L521.3 330.4L521.6 329.8L521.8 329.3L522.1 328.8L522.5 328.4L522.8 328.2L523.2 328L523.5 327.9L523.8 327.9L526.5 328.8L526.8 329L527 329.2L527.1 329.6L527.2 330L527.3 330.5L527.2 331.1L527.1 331.6L527 332.2L526.8 332.8L526.5 333.3L526.2 333.8L525.9 334.2L525.5 334.4L525.2 334.6L524.8 334.7L524.5 334.7L521.8 333.8L521.6 333.6L521.3 333.4L521.2 333L521.1 332.6Z\"/></g></g><g class=\"it\" data-name=\"slat.pin\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M521 308.9L521.1 308.3L521.2 307.8L521.3 307.2L521.6 306.6L521.8 306.1L522.1 305.6L522.5 305.3L522.8 305L523.2 304.8L523.5 304.7L523.8 304.7L526.5 305.6L526.8 305.8L527 306L527.1 306.4L527.2 306.8L527.3 307.3L527.2 307.9L527.1 308.4L527 309L526.8 309.6L526.5 310.1L526.2 310.6L525.9 311L525.5 311.3L525.2 311.4L524.8 311.5L524.5 311.5L521.8 310.6L521.6 310.4L521.3 310.2L521.2 309.8L521.1 309.4Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M521.8 310.6L521.6 310.4L521.3 310.2L521.2 309.8L523.9 310.8L524 311.1L524.3 311.4L524.5 311.5ZM523.7 309.8L523.8 309.3L523.9 308.7L524 308.1L524.3 307.6L524.5 307.1L524.8 306.6L525.2 306.2L525.5 305.9L525.9 305.7L526.2 305.6L526.5 305.6L526.8 305.8L527 306L527.1 306.4L527.2 306.8L527.3 307.3L527.2 307.9L527.1 308.4L527 309L526.8 309.6L526.5 310.1L526.2 310.6L525.9 311L525.5 311.3L525.2 311.4L524.8 311.5L524.5 311.5L524.3 311.4L524 311.1L523.9 310.8L523.8 310.3L523.7 309.8L525.5 308.6L525.5 308.6L525.5 308.6L525.5 308.6L525.5 308.6L525.5 308.6L525.5 308.6L525.5 308.6L525.5 308.6L525.5 308.6L525.5 308.6L525.5 308.6L525.5 308.6L525.5 308.6L525.5 308.6L525.5 308.6L525.5 308.6L525.5 308.6L525.5 308.6L525.5 308.6L525.5 308.6L525.5 308.6L525.5 308.6L525.5 308.6L525.5 308.6L525.5 308.6L525.5 308.6L525.5 308.6L525.5 308.6L525.5 308.6L525.5 308.6L525.5 308.6L525.5 308.6Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M521.2 309.8L521.1 309.4L523.8 310.3L523.9 310.8Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M521.1 309.4L521 308.9L523.7 309.8L523.8 310.3Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M521 308.9L521.1 308.3L521.2 307.8L523.9 308.7L523.8 309.3L523.7 309.8ZM523.5 304.7L523.8 304.7L526.5 305.6L526.2 305.6Z\"/><path class=\"iso-top\" d=\"M521.2 307.8L521.3 307.2L521.6 306.6L521.8 306.1L522.1 305.6L522.5 305.3L522.8 305L523.2 304.8L523.5 304.7L526.2 305.6L525.9 305.7L525.5 305.9L525.2 306.2L524.8 306.6L524.5 307.1L524.3 307.6L524 308.1L523.9 308.7Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M524.5 311.5L524 311L523.7 310L523.9 308.7L524.3 307.4L525 306.4L525.8 305.7L526.5 305.7\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M521 308.9L521.1 308.3L521.2 307.8L521.3 307.2L521.6 306.6L521.8 306.1L522.1 305.6L522.5 305.3L522.8 305L523.2 304.8L523.5 304.7L523.8 304.7L526.5 305.6L526.8 305.8L527 306L527.1 306.4L527.2 306.8L527.3 307.3L527.2 307.9L527.1 308.4L527 309L526.8 309.6L526.5 310.1L526.2 310.6L525.9 311L525.5 311.3L525.2 311.4L524.8 311.5L524.5 311.5L521.8 310.6L521.6 310.4L521.3 310.2L521.2 309.8L521.1 309.4Z\"/></g></g><path class=\"iso-line\" data-tone=\"hi\" data-part=\"pointer\" data-free=\"start\" d=\"M240.3 40.4L220.5 42.1\" style=\"stroke-width:1.2\"/><path class=\"iso-line\" data-tone=\"hi\" data-part=\"needle-skin\" data-free=\"start\" d=\"M378.9 442.9L360.2 444.6\" style=\"stroke-width:1\"/><path class=\"iso-line\" data-tone=\"hi\" data-part=\"needle-hr\" data-free=\"start\" d=\"M443 465.4L424.3 467\" style=\"stroke-width:1\"/></svg></div><span class=\"mt-sr\" role=\"status\" aria-live=\"polite\" data-status></span><div class=\"opt-controls\"><div class=\"opt-seg\" role=\"radiogroup\" aria-label=\"Estrogen\" data-control=\"stage\"><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"1\" aria-checked=\"true\" tabindex=\"0\">Pre-menopause</button><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"0\" aria-checked=\"false\" tabindex=\"-1\">Post-menopause</button></div></div><div class=\"opt-foot\"><span class=\"opt-hint\">Pick a stage · drag sideways · space for a small rise</span><dl class=\"opt-readout\" data-readout aria-hidden=\"true\"><div class=\"opt-stat\" data-stat=\"core\"><dt>Core</dt><dd data-r=\"core\">+0.00 °C</dd></div><div class=\"opt-stat\" data-stat=\"zone\"><dt>Zone</dt><dd data-r=\"zone\">0.4 °C</dd></div><div class=\"opt-stat\" data-stat=\"rate\"><dt>Flashes</dt><dd data-r=\"rate\">0 / h</dd></div><div class=\"opt-stat\" data-stat=\"skin\"><dt>Skin</dt><dd data-r=\"skin\">+0.0 °C</dd></div></dl></div></div><figcaption class=\"iso-legend\"><span class=\"iso-keys\"><span class=\"iso-key\"><svg class=\"iso-swatch\" data-mark=\"lit\" viewBox=\"0 0 16 10\" aria-hidden=\"true\"><path d=\"M2 4.5 8 1.5 14 4.5 14 6 8 9 2 6Z\"/><path class=\"iso-swatch-crease\" d=\"M2 4.5 8 7.5 14 4.5\"/></svg>Core temperature, as a change from rest</span><span class=\"iso-key\"><svg class=\"iso-swatch\" data-mark=\"raised\" viewBox=\"0 0 16 10\" aria-hidden=\"true\"><path d=\"M2 4.5 8 1.5 14 4.5 14 6 8 9 2 6Z\"/><path class=\"iso-swatch-crease\" d=\"M2 4.5 8 7.5 14 4.5\"/></svg>Sweating threshold (upper jaw) and shivering threshold (lower jaw)</span><span class=\"iso-key\"><svg class=\"iso-swatch\" data-mark=\"heat\" viewBox=\"0 0 16 10\" aria-hidden=\"true\"><path d=\"M1.5 5h13\"/></svg>Heat let out through the skin</span></span><span class=\"iso-caption\"><span class=\"mt-par\">Your brain holds core temperature inside a band, the <em>thermoneutral zone</em>: above it you sweat and flush, below it you shiver. In lab studies the zone was about 0.4 °C wide in women without hot flashes and close to 0.0 °C in women with them, mostly because the sweating threshold sat lower. Falling estrogen is thought to narrow it through neurokinin B signalling in the brain.</span><span class=\"mt-par\">In the leading explanation, on a narrow zone a rise of about 0.04 °C, too small to feel, sets off the whole response: finger skin warms by about 2.7 °C, heart rate rises by about 10 beats a minute, and a typical flash lasts about 3.4 minutes. Core temperature then dips, and some women feel a chill.</span><span class=\"mt-par\"><small>A typical pattern from small studies, not a diagnosis; not every woman's zone narrows, and many have no hot flashes. Time runs at about a minute a second with quiet spells cut. Flashes per hour come from the model, set for a woman with frequent flashes (about one an hour); the size of the after-chill is illustrative.</small></span></span></figcaption></figure>" + "</div>";
    mount(root.querySelector(".opt-figure"));
  }
}
customElements.define("optimal-fig-menopause-thermostat", Fig);
})();
