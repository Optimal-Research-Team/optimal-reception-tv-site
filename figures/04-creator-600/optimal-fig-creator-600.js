/* optimal-fig-creator-600: Optimal Health explainer figure. Built with Anatomy (MIT). Generated; do not edit. */
(() => {
if (customElements.get("optimal-fig-creator-600")) return;
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

return { frameOf, frameAlong, prismOf, pointOf, solidOf, sphereOf, circleOf };})();

// An artist's mannequin with ball joints, shared by Fig 4 (treadmill) and Fig 5 (bike).
//
// Turned wooden segments between steel ball joints. It is the patient in these
// figures, and its joints are exactly what a markerless gait camera tracks.
// Proportions are the standard segment-length fractions of standing height
// (Drillis & Contini 1966, as tabled in Winter, Biomechanics and Motor Control of
// Human Movement, 4th ed., 2009, Fig. 4.1) for a 170 cm adult.
//
// Pure geometry: no kit imports, so the page can inline it with `export`
// stripped. `skeletonOf` places the joints from a pose; `partsOf` turns the
// joints into turned solids, balls and two foot blocks that the caller draws
// with the kit's lathe (`solidOf`, `sphereOf`, `prismOf`). Everything is one
// object, MANNEQUIN, so nothing clashes with the kit's globals in the page.
const MANNEQUIN = (() => {
  const H = 170;
  const footLen = 0.152 * H;
  const BODY = {
    H,
    thigh: 0.245 * H, //        hip joint → knee
    shank: 0.246 * H, //        knee → ankle
    ankleZ: 0.039 * H, //       ankle joint above the sole
    foot: footLen, //           heel → toe tip
    ankleX: 0.21 * footLen, //  ankle joint forward of the heel
    ball: 0.72 * footLen, //    ball of the foot (metatarsal heads) from the heel
    hipHalf: 8.5, //            hip joint centres ≈ 0.1 H apart
    kneeHalf: 7.2,
    ankleHalf: 5.2, //          runners land close to the midline
    trunk: 0.288 * H, //        hip line → shoulder line (0.818 H − 0.530 H)
    shoulderHalf: 0.106 * H,
    upperArm: 0.186 * H,
    forearm: 0.146 * H,
    hand: 0.108 * H,
    chin: 0.34 * H, //          hip line → chin (0.870 H − 0.530 H)
    head: 0.13 * H, //          chin → crown
  };
  const R = { hip: 5.4, knee: 4.7, ankle: 3.3, waist: 6.4, neck: 3.9, shoulder: 4.6, elbow: 3.5, wrist: 2.5 };

  // ---------------------------------------------------------------- vectors (local: the page has its own)
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const len = (a) => Math.hypot(a[0], a[1], a[2]);
  const unit = (a) => mul(a, 1 / (len(a) || 1));
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const lerp = (a, b, t) => add(a, mul(sub(b, a), t));
  /** Same convention as the kit's G.frameAlong. */
  function frameAlong(o, a) {
    const axis = unit(a);
    const helper = Math.abs(axis[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1];
    const u = unit(cross(helper, axis));
    return { o, a: axis, u, v: cross(axis, u) };
  }
  const RAD = Math.PI / 180;

  /**
   * Joint positions in the world.
   *   base     world point on the floor (or belt) straight under the pelvis
   *   heading  ° the body faces, from +x toward +y (0 = facing +x)
   *   pelvis   hip-joint height above base
   *   trunk    ° forward lean of the trunk about the hip line
   *   legs     { R, L }: sagittal { hip, knee, ankle } as [forward, up] relative to base, `sole` (rad, toe up +),
 *            optional `toe` (rad) and `width` ({ hip, knee, ankle } lateral offsets)
   *   arms     { R, L }: { shoulder: ° from vertical (+ forward), elbow: ° bend }
   */
  function skeletonOf({ base, heading = 0, pelvis, trunk = 0, legs, arms }) {
    const h = heading * RAD;
    const fwd = [Math.cos(h), Math.sin(h), 0];
    const left = [-Math.sin(h), Math.cos(h), 0];
    const up = [0, 0, 1];
    const at = (forward, side, z) => add(base, add(add(mul(fwd, forward), mul(left, side)), mul(up, z)));
    const J = { fwd, left, up };
    J.pelvis = at(0, 0, pelvis);
    const lean = trunk * RAD;
    J.axis = add(mul(fwd, Math.sin(lean)), mul(up, Math.cos(lean)));
    const onTrunk = (s, side = 0) => add(add(J.pelvis, mul(J.axis, s)), mul(left, side));
    J.waist = onTrunk(0.3 * BODY.trunk);
    J.neck = onTrunk(BODY.trunk + 0.025 * H);
    J.chin = onTrunk(BODY.chin);
    for (const [k, side] of [["R", -1], ["L", 1]]) {
      const leg = legs[k];
      const w = leg.width ?? {}; // optional lateral offsets: { hip, knee, ankle }
      J[`hip${k}`] = at(leg.hip[0], side * (w.hip ?? BODY.hipHalf), leg.hip[1]);
      J[`knee${k}`] = at(leg.knee[0], side * (w.knee ?? BODY.kneeHalf), leg.knee[1]);
      J[`ankle${k}`] = at(leg.ankle[0], side * (w.ankle ?? BODY.ankleHalf), leg.ankle[1]);
      // foot frame: origin at the heel's ground point, u along the sole toward the toe, v up off the sole
      const s = leg.sole;
      const u = add(mul(fwd, Math.cos(s)), mul(up, Math.sin(s)));
      const v = add(mul(fwd, -Math.sin(s)), mul(up, Math.cos(s)));
      const heel = sub(J[`ankle${k}`], add(mul(u, BODY.ankleX), mul(v, BODY.ankleZ)));
      J[`foot${k}`] = { o: heel, u, v, a: left };
      // toes: hinge at the ball of the foot, so they can stay flat while the heel lifts
      const t = leg.toe ?? s;
      const ball = add(heel, mul(u, BODY.ball));
      J[`toe${k}`] = { o: ball, u: add(mul(fwd, Math.cos(t)), mul(up, Math.sin(t))), v: add(mul(fwd, -Math.sin(t)), mul(up, Math.cos(t))), a: left };
      const arm = arms[k];
      const sh = add(onTrunk(BODY.trunk - 1.5), mul(left, side * BODY.shoulderHalf));
      J[`shoulder${k}`] = sh;
      const a1 = arm.shoulder * RAD;
      const out = mul(left, side * 0.1); // a little away from the body
      const d1 = unit(add(add(mul(fwd, Math.sin(a1)), mul(up, -Math.cos(a1))), out));
      J[`elbow${k}`] = add(sh, mul(d1, BODY.upperArm));
      const a2 = (arm.shoulder + arm.elbow) * RAD;
      const d2 = unit(add(add(mul(fwd, Math.sin(a2)), mul(up, -Math.cos(a2))), mul(left, -side * 0.12)));
      J[`wrist${k}`] = add(J[`elbow${k}`], mul(d2, BODY.forearm));
      J[`hand${k}`] = add(J[`wrist${k}`], mul(d2, BODY.hand * 0.55));
      J[`dir${k}`] = { upper: d1, fore: d2 };
    }
    J.head = add(J.chin, mul(unit(add(J.axis, mul(up, 1.5))), BODY.head * 0.5));
    return J;
  }

  // ---------------------------------------------------------------- turned profiles ([s, r, smooth]) along each segment
  // limbs are plain tapered dowels (a cone frustum shades smoothly round its axis and is cheap to redraw every frame)
  const taper = (length, r0, r1, { start = 0, end = 0 } = {}) => [[start, r0], [length - end, r1]];
  const egg = (length, r, { at = 0.55 } = {}) => {
    const pts = [];
    const n = 12;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const s = t * length;
      const x = t < at ? t / at : (1 - t) / (1 - at);
      pts.push([s, Math.max(0.01, r * Math.sqrt(Math.max(0, 1 - (1 - x) ** 2))), 1]);
    }
    return pts;
  };

  /**
   * The solids for a skeleton, each { name, kind: "lathe" | "ball" | "prism", ... , centre }.
   * Wood parts have `wood: true`; balls are steel joints. `dots` are the tracking points.
   */
  function partsOf(J) {
    const parts = [];
    let group = "trunk";
    const seg = (name, from, to, profileOf, extra = {}) => {
      const length = len(sub(to, from));
      const F = frameAlong(from, sub(to, from));
      parts.push({ name, group, kind: "lathe", F, profile: profileOf(length), centre: lerp(from, to, 0.5), wood: true, ...extra });
    };
    const ball = (name, c, r) => parts.push({ name, group, kind: "ball", c, r, centre: c });
    // trunk: pelvis barrel across the hips, waist ball, chest, shoulder yoke, neck, head
    {
      const o = add(J.pelvis, mul(J.axis, 2.5));
      const F = frameAlong(add(o, mul(J.left, -10.5)), J.left);
      const p = [[0, 4.6, 1], [0.7, 6.2, 1], [2.2, 7.2, 1], [5, 7.7, 1], [10.5, 7.9, 1], [16, 7.7, 1], [18.8, 7.2, 1], [20.3, 6.2, 1], [21, 4.6, 1]];
      parts.push({ name: "pelvis", group, rigid: true, kind: "lathe", F, profile: p, centre: o, wood: true });
    }
    ball("waist", J.waist, R.waist);
    {
      const F = frameAlong(add(J.pelvis, mul(J.axis, 0.3 * BODY.trunk + 4)), J.axis);
      const L = BODY.trunk - 0.3 * BODY.trunk - 2;
      const p = [[0, 6.2, 1], [0.25 * L, 9.8, 1], [0.55 * L, 12, 1], [0.8 * L, 12.2, 1], [0.95 * L, 10.4, 1], [L, 7.6, 1]];
      parts.push({ name: "chest", group, rigid: true, kind: "lathe", F, profile: p, centre: add(F.o, mul(J.axis, L / 2)), wood: true });
    }
    {
      const c = add(J.pelvis, mul(J.axis, BODY.trunk - 1.5));
      const half = BODY.shoulderHalf - 1;
      const F = frameAlong(add(c, mul(J.left, -half)), J.left);
      const p = [[0, 3.2, 1], [1.5, 4.2, 1], [half, 5.4, 1], [2 * half - 1.5, 4.2, 1], [2 * half, 3.2, 1]];
      parts.push({ name: "yoke", group, rigid: true, kind: "lathe", F, profile: p, centre: c, wood: true });
    }
    seg("neck", J.neck, J.chin, (l) => [[0, 3.4, 1], [l * 0.5, 3.1, 1], [l, 3.5, 1]], { rigid: true });
    ball("neckball", J.neck, R.neck);
    {
      const F = frameAlong(sub(J.chin, mul(unit(sub(J.head, J.chin)), 1.2)), sub(J.head, J.chin));
      parts.push({ name: "head", group, rigid: true, kind: "lathe", F, profile: egg(BODY.head + 1.2, 9.2, { at: 0.5 }), centre: J.head, wood: true });
    }
    for (const k of ["R", "L"]) {
      // legs
      group = `leg${k}`;
      ball(`hip${k}`, J[`hip${k}`], R.hip);
      seg(`thigh${k}`, J[`hip${k}`], J[`knee${k}`], (l) => taper(l, 6.4, 4.2, { start: 2.6, end: 2.4 }));
      ball(`knee${k}`, J[`knee${k}`], R.knee);
      seg(`shank${k}`, J[`knee${k}`], J[`ankle${k}`], (l) => taper(l, 4.6, 2.7, { start: 2.4, end: 1.8 }));
      ball(`ankle${k}`, J[`ankle${k}`], R.ankle);
      const f = J[`foot${k}`];
      const B = BODY;
      // the foot: a convex wedge from the heel to the ball, under the ankle ball, and a toe block hinged at the ball
      const poly = [[0.4, 0], [B.ball, 0], [B.ball + 0.6, 1.4], [B.ball - 0.4, 4.4], [B.ankleX + 2.6, B.ankleZ - 1.0], [B.ankleX - 2.4, B.ankleZ - 1.2], [0, 4.4], [-0.3, 1.6]];
      parts.push({ name: `foot${k}`, group: `leg${k}`, kind: "prism", F: f, poly, s0: -3.8, s1: 3.8, centre: add(f.o, mul(f.u, B.ball / 2)), wood: true });
      const t = J[`toe${k}`];
      const toe = B.foot - B.ball;
      parts.push({ name: `toe${k}`, group: `leg${k}`, kind: "prism", F: t, poly: [[0.9, 0], [toe - 1.6, 0], [toe, 1.2], [toe - 1.2, 2.6], [0.9, 3.4]], s0: -3.6, s1: 3.6, centre: add(t.o, mul(t.u, toe / 2)), wood: true });
      // arms
      group = `arm${k}`;
      ball(`shoulder${k}`, J[`shoulder${k}`], R.shoulder);
      seg(`upper${k}`, J[`shoulder${k}`], J[`elbow${k}`], (l) => taper(l, 3.9, 2.8, { start: 2.2, end: 1.8 }));
      ball(`elbow${k}`, J[`elbow${k}`], R.elbow);
      seg(`fore${k}`, J[`elbow${k}`], J[`wrist${k}`], (l) => taper(l, 3.1, 2.1, { start: 1.8, end: 1.2 }));
      ball(`wrist${k}`, J[`wrist${k}`], R.wrist);
      // a closed hand: a wooden ball just past the wrist
      parts.push({ name: `hand${k}`, group, kind: "ball", c: lerp(J[`wrist${k}`], J[`hand${k}`], 0.55), r: 3.4, centre: lerp(J[`wrist${k}`], J[`hand${k}`], 0.55), wood: true });
    }
    group = "trunk";
    const dots = ["pelvis", "head", "shoulderR", "shoulderL", "elbowR", "elbowL", "wristR", "wristL", "hipR", "hipL", "kneeR", "kneeL", "ankleR", "ankleL"].map((name) => ({ name, c: J[name] }));
    return { parts, dots };
  }

  return { BODY, R, skeletonOf, partsOf, frameAlong };
})();

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

// Page-side renderer for shared/mannequin.mjs (inlined after the kit, the lathe as G, and MANNEQUIN).
//
// One SVG group per part, created once; each frame rewrites the paths' `d`
// (no re-render) and re-appends groups only when the painter's order changes.
// Order: far arm, far leg, anything the figure slots "between" (a plumb line),
// trunk, near leg, near arm; inside each, back to front by depth, joint balls
// nudged forward so they sit over the ends of the segments they join.
function mannequinView(host, P, { between = [] } = {}) {
  const NS = "http://www.w3.org/2000/svg";
  const nodes = new Map();
  let lastOrder = "";
  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attrs || {})) n.setAttribute(key, value);
    if (parent) parent.appendChild(n);
    return n;
  };
  function nodeOf(part) {
    let n = nodes.get(part.name);
    if (n) return n;
    const g = el("g", { class: part.wood ? "mq-wood" : part.kind === "ball" ? "mq-joint" : "mq-part", "data-name": `mq.${part.name}` });
    const shape = el("g", { class: "iso-solid" }, g);
    n = {
      g,
      shape,
      fill: el("path", { class: "iso-fill" }, shape),
      shades: [0, 1, 2, 3].map((i) => el("path", { class: "iso-shade", "data-shade": i }, shape)),
      top: el("path", { class: "iso-top" }, shape),
      crease: el("path", { class: "iso-line iso-crease", "data-tone": "faint" }, shape),
      edge: el("path", { class: "iso-line iso-edge", "data-tone": "mid" }, shape),
      extra: el("g", {}, g),
      state: {},
    };
    nodes.set(part.name, n);
    return n;
  }
  function pathsOf(part) {
    if (part.kind === "ball") return G.sphereOf(part.c, part.r, P, { steps: 40 });
    if (part.kind === "prism") return G.prismOf(part.F, part.poly, part.s0, part.s1, P);
    return G.solidOf(part.profile, part.F, P);
  }
  // rigid parts (the trunk) only ride up and down with the pelvis: draw them once, then translate
  const rigid = new Map();
  function setPaths(n, paths) {
    n.fill.setAttribute("d", paths.fill);
    paths.shades.forEach((d, i) => n.shades[i].setAttribute("d", d || ""));
    n.top.setAttribute("d", paths.top || "");
    n.crease.setAttribute("d", paths.crease || "");
    n.edge.setAttribute("d", paths.outline);
    if (paths.seamless) n.shape.setAttribute("data-seamless", "");
    else n.shape.removeAttribute("data-seamless");
  }
  /**
   * parts: MANNEQUIN.partsOf(J).parts plus any extra parts ({ name, group, kind, ... }).
   * decorate(part, extraGroup, state): optional, draws dots, glows and the like into the part's group.
   */
  function draw(parts, J, decorate) {
    const near = depthOf(J.hipL, P) >= depthOf(J.hipR, P) ? "L" : "R";
    const far = near === "L" ? "R" : "L";
    const groups = [`arm${far}`, `leg${far}`, ...between, "trunk", `leg${near}`, `arm${near}`];
    const rank = Object.fromEntries(groups.map((g, i) => [g, i]));
    const list = [];
    for (const part of parts) {
      const n = nodeOf(part);
      if (part.kind === "line") {
        if (!n.line) {
          n.shape.remove();
          n.line = el("path", { class: "iso-line", "data-tone": "lit", "data-free": "" });
          n.g.insertBefore(n.line, n.extra);
        }
        n.line.setAttribute("d", pathOf(part.points.map((p) => iso(p, P))));
        if (part.className) n.line.setAttribute("class", `iso-line ${part.className}`);
      } else if (part.rigid) {
        const key = `${part.F.a.map((v) => v.toFixed(4))}|${part.F.o.map((v, i) => (v - J.pelvis[i]).toFixed(3))}`;
        let c = rigid.get(part.name);
        if (!c || c.key !== key) {
          c = { key, anchor: iso(J.pelvis, P) };
          setPaths(n, pathsOf(part));
          rigid.set(part.name, c);
        }
        const now = iso(J.pelvis, P);
        n.shape.setAttribute("transform", `translate(${(now[0] - c.anchor[0]).toFixed(2)} ${(now[1] - c.anchor[1]).toFixed(2)})`);
      } else {
        setPaths(n, pathsOf(part));
      }
      if (decorate) decorate(part, n.extra, n.state);
      list.push({ part, n, key: (rank[part.group] ?? 2) * 1e6 + depthOf(part.centre, P) + (part.kind === "ball" ? 3 : 0) + (part.bias || 0) });
    }
    list.sort((a, b) => a.key - b.key);
    const order = list.map((x) => x.part.name).join(",");
    if (order !== lastOrder) {
      for (const { n } of list) host.appendChild(n.g);
      lastOrder = order;
    }
  }
  return { draw, nodes };
}

// Fig 4 live code: the mannequin runs on the belt at 10 km/h; cadence comes from the slider.
const DATA = {"P":{"origin":[296.4802442977594,601.2450783104898],"scale":1.8721863566929118,"azimuth":132,"elevation":22},"B":{"H":170,"thigh":41.65,"shank":41.82,"ankleZ":6.63,"foot":25.84,"ankleX":5.4264,"ball":18.6048,"hipHalf":8.5,"kneeHalf":7.2,"ankleHalf":5.2,"trunk":48.959999999999994,"shoulderHalf":18.02,"upperArm":31.62,"forearm":24.819999999999997,"hand":18.36,"chin":57.800000000000004,"head":22.1,"pelvis":84.9435822727389},"beltZ":24,"railZ":24.6,"runX":-12,"belt":{"x":-98,"x1":66,"half":29},"screen":{"y0":-31,"y1":31,"z0":115,"z1":226,"x":100},"gauge":{"x":-42,"y":-42,"z0":107,"z1":126,"plateY":-39.18},"ruler":{"y":30,"d":4.6}};

function mount(fig) {
  const P = DATA.P;
  const B = DATA.B;
  const stage = fig.querySelector(".iso-stage");
  const svg = stage.querySelector("svg");
  const q = (s) => svg.querySelector(s);
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const out = Object.fromEntries([...fig.querySelectorAll("[data-r]")].map((n) => [n.dataset.r, n]));
  const status = fig.querySelector("[data-status]");
  const buttons = [...fig.querySelectorAll('[data-control="preset"] .opt-seg-btn')];
  const range = fig.querySelector(".cr-range");
  const slow = fig.querySelector("[data-slow]");
  const nodes = { runner: q('[data-part="runner"]'), slats: q('[data-part="slats"]'), marks: q('[data-part="marks"]'), gauge: q('[data-part="gauge"]'), rider: q('[data-part="rider"]'), screen: q('[data-part="screen-body"]'), cadence: q('[data-part="cadence"]') };
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attrs || {})) n.setAttribute(key, value);
    if (parent) parent.appendChild(n);
    return n;
  };
  const view = mannequinView(nodes.runner, P, { between: ["plumb"] });
  const Z = DATA.beltZ;
  const base = [DATA.runX, 0, Z];
  const V = beltOf(); // cm/s
  const lo = cadenceOf(TRUTH.range[0]);
  const hi = cadenceOf(TRUTH.range[1]);

  // ---------------------------------------------------------------- state
  let target = TRUTH.cadence0;
  let cadence = TRUTH.cadence0;
  let phi = 0.62;
  let beltAt = 0; // cm of belt travelled
  let clock = 0; // s of figure time
  let speed = 1; // 1 = real time, 0.25 = slow
  let wasStance = { R: false, L: false };
  const marks = []; // { x0, y, t }
  let rider = DATA.runX + landingOf(cadence);
  let riderTo = rider;
  const trace = { R: [], L: [] }; // [t, bend]
  const comLog = []; // [t, z]
  const peak = { R: 0, L: 0, holdR: 0, holdL: 0 };

  // ---------------------------------------------------------------- the plumb laser: an emitter under the pelvis and its beam to the belt
  function plumbParts(J) {
    const top = [J.pelvis[0], 0, J.pelvis[2] - 6.2];
    const F = MANNEQUIN.frameAlong(top, [0, 0, -1]);
    return [
      { name: "emitter", group: "plumb", kind: "lathe", F, profile: [[0, 1.9], [2.6, 1.9], [3.4, 1.2], [4.2, 1.2]], centre: [top[0], 0, top[2] - 2], bias: 0 },
      { name: "beam", group: "plumb", kind: "line", points: [[top[0], 0, top[2] - 4.2], [top[0], 0, Z + 0.05]], centre: [top[0], 0, (top[2] + Z) / 2], className: "cr-beam" },
    ];
  }

  // ---------------------------------------------------------------- decorations on the mannequin: tracking dots, knee glow, centre-of-mass marker
  const DOTS = new Set(["hipR", "hipL", "kneeR", "kneeL", "ankleR", "ankleL", "shoulderR", "shoulderL", "elbowR", "elbowL", "wristR", "wristL", "head"]);
  let frame = null; // { pose, J, loads }
  function decorate(part, g, st) {
    if (!frame) return;
    if (part.name === "kneeR" || part.name === "kneeL") {
      const side = part.name.slice(-1);
      if (!st.glow) {
        // under the ball: first in the part's own group
        const host = g.parentNode;
        st.ring = el("circle", { class: "mq-glow-ring" });
        st.glow = el("circle", { class: "mq-glow" });
        host.insertBefore(st.ring, host.firstChild);
        host.insertBefore(st.glow, host.firstChild);
      }
      const load = frame.loads[side];
      const c = iso(part.c, P);
      const k = P.scale;
      const r = (part.r + 1.6 + 5.5 * load) * k;
      st.glow.setAttribute("cx", c[0].toFixed(1));
      st.glow.setAttribute("cy", c[1].toFixed(1));
      st.glow.setAttribute("r", r.toFixed(2));
      st.glow.setAttribute("fill-opacity", (0.7 * Math.min(1, load)).toFixed(3));
      st.ring.setAttribute("cx", c[0].toFixed(1));
      st.ring.setAttribute("cy", c[1].toFixed(1));
      st.ring.setAttribute("r", r.toFixed(2));
      st.ring.setAttribute("stroke-opacity", (load > 0.02 ? 0.9 : 0).toFixed(2));
    }
    if (DOTS.has(part.name)) {
      if (!st.dot) st.dot = el("circle", { class: "mq-dot", r: (1.35 * P.scale).toFixed(2) }, g);
      const c = iso(part.c ?? part.centre, P);
      st.dot.setAttribute("cx", c[0].toFixed(1));
      st.dot.setAttribute("cy", c[1].toFixed(1));
    }
    if (part.name === "pelvis") {
      // the centre-of-mass marker on the pelvis's near side, at the true COM height
      if (!st.com) {
        st.ring = el("circle", { class: "cr-com-ring", r: (2.6 * P.scale).toFixed(2) }, g);
        st.com = el("circle", { class: "mq-dot", r: (1.35 * P.scale).toFixed(2) }, g);
      }
      const side = frame.near === "L" ? 1 : -1;
      const c = iso([frame.J.pelvis[0], side * 11.6, Z + frame.pose.com], P);
      for (const n of [st.com, st.ring]) {
        n.setAttribute("cx", c[0].toFixed(1));
        n.setAttribute("cy", c[1].toFixed(1));
      }
    }
  }

  // ---------------------------------------------------------------- belt slats, landing marks and the plumb spot
  function beltSvg() {
    const gap = 12;
    const off = ((beltAt % gap) + gap) % gap;
    let d = "";
    for (let x = DATA.belt.x1 - off; x > DATA.belt.x + 0.5; x -= gap) d += lineOnTop([x, -DATA.belt.half + 0.6], [x, DATA.belt.half - 0.6], Z + 0.02, P);
    nodes.slats.setAttribute("d", d);
    let m = "";
    for (const mk of marks) {
      const x = mk.x0 - (beltAt - mk.at);
      const age = clock - mk.t;
      if (x < DATA.belt.x + 2) continue;
      const a = Math.max(0, 1 - age / 1.2);
      m += `<path class="cr-mark" stroke-opacity="${a.toFixed(2)}" d="${lineOnTop([x, mk.y - 4.6], [x, mk.y + 4.6], Z + 0.04, P)}"/>`;
    }
    // the plumb laser draws a line across the belt straight below the centre of mass, zero on the rail ruler
    const px = frame.J.pelvis[0];
    m += `<path class="cr-laser" data-free="" d="${lineOnTop([px, -DATA.belt.half + 0.4], [px, DATA.belt.half - 0.4], Z + 0.05, P)}"/>`;
    const spot = iso([px, 0, Z + 0.05], P);
    m += `<circle class="mq-dot" cx="${spot[0].toFixed(1)}" cy="${spot[1].toFixed(1)}" r="${(0.9 * P.scale).toFixed(2)}"/>`;
    nodes.marks.innerHTML = m;
  }
  function riderSvg() {
    const y = DATA.ruler.y;
    const plan = { x: rider - 1.8, y: y - 0.8, w: 3.6, d: DATA.ruler.d + 1.6, r: 0.6 };
    nodes.rider.innerHTML = solidSvg(slabOf(plan, DATA.railZ + 0.3, 2, P, 2, 0.25), { tone: "mid", className: "cr-rider" }) + `<path class="cr-rider-mark" d="${lineOnTop([rider, y - 0.2], [rider, y + DATA.ruler.d + 0.2], DATA.railZ + 2.3, P)}"/>`;
  }
  function gaugeSvg(com) {
    const g = DATA.gauge;
    const z = Z + com;
    const y = g.plateY;
    // carriage on the post, a laser from it to the runner's side, hold marks for the last stride's top and bottom
    const car = { x: g.x - 2.6, y: g.y - 2.6, w: 5.2, d: 5.2, r: 0.8 };
    let s = solidSvg(slabOf(car, z - 1.6, 3.2, P, 2, 0.3), { tone: "hi", className: "cr-carriage" });
    s += lineSvg(pathOf([iso([g.x + 2.7, g.y + 1, z], P), iso([DATA.runX - 2, -6, z], P)]), { tone: "lit", className: "cr-beam", free: true });
    const window = 120 / cadence;
    let top = -Infinity;
    let bot = Infinity;
    for (const [t, v] of comLog) if (clock - t <= window) {
      top = Math.max(top, v);
      bot = Math.min(bot, v);
    }
    if (Number.isFinite(top)) for (const v of [top, bot]) s += `<path class="cr-hold" d="${pathOf([iso([g.x - 4.4, y + 0.05, Z + v], P), iso([g.x + 4.4, y + 0.05, Z + v], P)])}"/>`;
    nodes.gauge.innerHTML = s;
  }

  // ---------------------------------------------------------------- the display: live skeleton (front view), knee load per step, knee-angle trace
  const SC = DATA.screen;
  const SW = SC.y1 - SC.y0;
  const toScreen = (p) => [SW / 2 + p[1] * 0.46, 4 + (Z + B.H + 6 - p[2]) * 0.46];
  const screenParts = (() => {
    const g = nodes.screen;
    const bones = el("path", { class: "cr-bones" }, g);
    const joints = el("g", { class: "cr-joints" }, g);
    const kneeDots = { R: el("circle", { class: "cr-kneedot", r: 1.5 }, g), L: el("circle", { class: "cr-kneedot", r: 1.5 }, g) };
    const panel = el("g", {}, g);
    // knee load: two bars (L, R) against a reference at the usual cadence's peak
    const barY0 = 107;
    const barH = 19;
    el("path", { class: "cr-ref", d: `M3 ${barY0 - barH / 1.3}H27` }, panel);
    const bars = { L: el("rect", { class: "cr-bar", x: 5, width: 9, y: barY0, height: 0, rx: 0.6 }, panel), R: el("rect", { class: "cr-bar", x: 16, width: 9, y: barY0, height: 0, rx: 0.6 }, panel) };
    for (const x of [5, 16]) el("rect", { class: "cr-well", x, width: 9, y: barY0 - barH, height: barH, rx: 0.6 }, panel).parentNode.insertBefore(panel.lastChild, panel.firstChild);
    const holds = { L: el("path", { class: "cr-holdbar" }, panel), R: el("path", { class: "cr-holdbar" }, panel) };
    el("path", { class: "cr-axis", d: `M3 ${barY0}H27` }, panel);
    // knee-angle trace
    const traceBox = { x: 32, y: 88, w: 27, h: 19 };
    el("path", { class: "cr-axis", d: `M${traceBox.x} ${traceBox.y + traceBox.h}H${traceBox.x + traceBox.w}` }, panel);
    const lines = { L: el("path", { class: "cr-trace", "data-side": "L" }, panel), R: el("path", { class: "cr-trace", "data-side": "R" }, panel) };
    return { bones, joints, kneeDots, bars, holds, lines, barY0, barH, traceBox, jointDots: [] };
  })();
  function screenDraw(J, loads) {
    const s = screenParts;
    const seg = (a, b) => {
      const p = toScreen(a);
      const r = toScreen(b);
      return `M${p[0].toFixed(1)} ${p[1].toFixed(1)}L${r[0].toFixed(1)} ${r[1].toFixed(1)}`;
    };
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    let d = seg(J.hipR, J.hipL) + seg(J.shoulderR, J.shoulderL) + seg(mid(J.hipR, J.hipL), mid(J.shoulderR, J.shoulderL)) + seg(mid(J.shoulderR, J.shoulderL), J.head);
    for (const k of ["R", "L"]) d += seg(J[`hip${k}`], J[`knee${k}`]) + seg(J[`knee${k}`], J[`ankle${k}`]) + seg(J[`shoulder${k}`], J[`elbow${k}`]) + seg(J[`elbow${k}`], J[`wrist${k}`]);
    s.bones.setAttribute("d", d);
    const pts = ["head", "shoulderR", "shoulderL", "elbowR", "elbowL", "wristR", "wristL", "hipR", "hipL", "ankleR", "ankleL"].map((n) => toScreen(J[n]));
    while (s.jointDots.length < pts.length) s.jointDots.push(el("circle", { r: 1.1 }, s.joints));
    pts.forEach((p, i) => {
      s.jointDots[i].setAttribute("cx", p[0].toFixed(1));
      s.jointDots[i].setAttribute("cy", p[1].toFixed(1));
    });
    for (const k of ["R", "L"]) {
      const p = toScreen(J[`knee${k}`]);
      s.kneeDots[k].setAttribute("cx", p[0].toFixed(1));
      s.kneeDots[k].setAttribute("cy", p[1].toFixed(1));
      s.kneeDots[k].setAttribute("r", (1.3 + 1.4 * loads[k]).toFixed(2));
      // bars: live load, and the last landing's peak held as a line
      const h = (s.barH / 1.3) * loads[k];
      s.bars[k].setAttribute("y", (s.barY0 - h).toFixed(2));
      s.bars[k].setAttribute("height", h.toFixed(2));
      const hy = s.barY0 - (s.barH / 1.3) * peak[`hold${k}`];
      const x0 = k === "L" ? 5 : 16;
      s.holds[k].setAttribute("d", peak[`hold${k}`] > 0 ? `M${x0 - 0.6} ${hy.toFixed(2)}H${x0 + 9.6}` : "");
      // trace: knee bend over the last 1.6 s, 0–120°
      const tb = s.traceBox;
      const list = trace[k];
      let path = "";
      for (const [t, v] of list) {
        const x = tb.x + tb.w - ((clock - t) / 1.6) * tb.w;
        if (x < tb.x) continue;
        const y = tb.y + tb.h - (Math.min(120, v) / 120) * tb.h;
        path += `${path ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
      }
      s.lines[k].setAttribute("d", path);
    }
  }

  // ---------------------------------------------------------------- one frame
  function render() {
    const pose = poseAt(phi, cadence, B);
    const legs = {};
    for (const [k, leg] of [["R", pose.right], ["L", pose.left]]) legs[k] = { hip: leg.hip, knee: leg.knee, ankle: leg.ankle, sole: leg.sole, toe: leg.toe };
    const J = MANNEQUIN.skeletonOf({ base, pelvis: pose.pelvis, trunk: pose.trunk, legs, arms: { R: { shoulder: pose.armR, elbow: pose.elbow }, L: { shoulder: pose.armL, elbow: pose.elbow } } });
    const loads = { R: kneeLoadAt(pose.right, cadence), L: kneeLoadAt(pose.left, cadence) };
    const near = depthOf(J.hipL, P) >= depthOf(J.hipR, P) ? "L" : "R";
    frame = { pose, J, loads, near };
    const { parts } = MANNEQUIN.partsOf(J);
    view.draw([...parts, ...plumbParts(J)], J, decorate);
    beltSvg();
    riderSvg();
    gaugeSvg(pose.com);
    screenDraw(J, loads);
    if (nodes.cadence) nodes.cadence.textContent = String(Math.round(cadence));
    return pose;
  }

  // ---------------------------------------------------------------- readout
  let lastText = "";
  function readout() {
    const c = Math.round(cadence * 2) / 2;
    out.spm.textContent = `${Math.round(c)}/min`;
    out.step.textContent = `${stepOf(c).toFixed(2)} m`;
    out.ratio.textContent = `${ratioOf(c).toFixed(1)}%`;
    out.knee.textContent = `${Math.round(kneeOf(c) * 100)}%`;
    stage.setAttribute("aria-valuenow", String(Math.round(c)));
    stage.setAttribute("aria-valuetext", `${Math.round(c)} steps per minute`);
    const pct = Math.round(pctOf(c));
    const text = `${Math.round(c)} steps per minute (${pct > 0 ? "+" : ""}${pct}%): step ${stepOf(c).toFixed(2)} metres, vertical ratio ${ratioOf(c).toFixed(1)}%, kneecap force ${Math.round(kneeOf(c) * 100)}% of usual per step.`;
    if (text !== lastText && Math.abs(cadence - target) < 0.3) {
      status.textContent = text;
      lastText = text;
    }
    if (document.activeElement !== range) range.value = String(Math.round(cadence * 2) / 2);
    for (const b of buttons) {
      const on = Math.abs(cadenceOf(+b.dataset.value) - target) < 0.4;
      b.setAttribute("aria-checked", on ? "true" : "false");
      b.tabIndex = on ? 0 : -1;
    }
  }

  // ---------------------------------------------------------------- time
  function step(dt) {
    cadence += (target - cadence) * (1 - Math.exp(-dt * 3.2));
    const t = dt * speed;
    clock += t;
    beltAt += V * t;
    phi = (phi + (t * cadence) / 120) % 1;
    const pose = render();
    // landings: a mark on the belt under the heel, and the ruler's rider moves to it
    for (const [k, leg] of [["R", pose.right], ["L", pose.left]]) {
      if (leg.stance && !wasStance[k]) {
        const heelX = DATA.runX + leg.ankle[0] - Math.cos(leg.sole) * B.ankleX + Math.sin(leg.sole) * B.ankleZ;
        marks.push({ x0: heelX, at: beltAt, t: clock, y: (k === "L" ? 1 : -1) * B.ankleHalf });
        if (marks.length > 8) marks.shift();
        riderTo = heelX;
        peak[k] = 0;
      }
      if (leg.stance) peak[k] = Math.max(peak[k], kneeLoadAt(leg, cadence));
      if (!leg.stance && wasStance[k]) peak[`hold${k}`] = peak[k];
      wasStance[k] = leg.stance;
      trace[k].push([clock, leg.bend]);
      while (trace[k].length && clock - trace[k][0][0] > 1.8) trace[k].shift();
    }
    comLog.push([clock, pose.com]);
    while (comLog.length && clock - comLog[0][0] > 1.2) comLog.shift();
    rider += (riderTo - rider) * (1 - Math.exp(-dt * 18));
    readout();
  }

  // ---------------------------------------------------------------- input, idle tour, offscreen pause, reduced motion
  const TOUR = [0, 10, 0, -10, 5];
  let tourAt = 0;
  let tourClock = 0;
  let idleSince = -1e9;
  let touring = true;
  const setTarget = (c) => {
    target = clamp(c, lo, hi);
  };
  const takeOver = () => {
    touring = false;
    idleSince = performance.now();
  };
  range.addEventListener("input", () => {
    takeOver();
    setTarget(+range.value);
    if (still.matches) {
      cadence = target;
      renderStill();
    }
  });
  for (const b of buttons)
    b.addEventListener("click", () => {
      takeOver();
      setTarget(cadenceOf(+b.dataset.value));
      if (still.matches) {
        cadence = target;
        renderStill();
      }
    });
  fig.querySelector('[data-control="preset"]').addEventListener("keydown", (e) => {
    const i = buttons.indexOf(document.activeElement);
    if (i < 0) return;
    const j = e.key === "ArrowRight" || e.key === "ArrowDown" ? i + 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? i - 1 : null;
    if (j === null) return;
    e.preventDefault();
    const b = buttons[(j + buttons.length) % buttons.length];
    b.focus();
    b.click();
  });
  stage.addEventListener("keydown", (e) => {
    const map = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 5, PageDown: -5 };
    if (e.key in map) setTarget(Math.round(target) + map[e.key]);
    else if (e.key === "Home") setTarget(lo);
    else if (e.key === "End") setTarget(hi);
    else return;
    e.preventDefault();
    takeOver();
    if (still.matches) {
      cadence = target;
      renderStill();
    }
  });
  slow.addEventListener("click", () => {
    speed = speed === 1 ? 0.25 : 1;
    slow.setAttribute("aria-pressed", speed < 1 ? "true" : "false");
    slow.textContent = speed < 1 ? "Real time" : "Slow";
  });

  function renderStill() {
    // one frame that explains it: the right heel just landed, its mark and the rider at the landing, a full stride of history
    clock = 0;
    marks.length = 0;
    for (const k of ["R", "L"]) trace[k].length = 0;
    comLog.length = 0;
    const T = 120 / cadence;
    for (let i = 0; i <= 60; i++) {
      const p = (0.04 - 1.6 / T + (i / 60) * (1.6 / T) + 2) % 1;
      const ps = poseAt(p, cadence, B);
      const t = -1.6 + (i / 60) * 1.6;
      trace.R.push([t, ps.right.bend]);
      trace.L.push([t, ps.left.bend]);
      comLog.push([t * (1.2 / 1.6), ps.com]);
    }
    phi = 0.04;
    const contact = poseAt(0, cadence, B).right;
    const heelX = DATA.runX + contact.ankle[0] - Math.cos(contact.sole) * B.ankleX + Math.sin(contact.sole) * B.ankleZ;
    beltAt = 0;
    marks.push({ x0: heelX, at: -V * (0.04 * T), t: 0, y: -B.ankleHalf });
    rider = riderTo = heelX;
    peak.holdR = peak.holdL = kneeOf(cadence);
    render();
    readout();
  }

  let raf = 0;
  let last = 0;
  let visible = true;
  function tick(now) {
    raf = 0;
    if (!visible || still.matches) return;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    if (!touring && now - idleSince > 9000) {
      touring = true;
      tourClock = 0;
    }
    if (touring) {
      tourClock += dt;
      if (tourClock > 6) {
        tourClock = 0;
        tourAt = (tourAt + 1) % TOUR.length;
      }
      setTarget(cadenceOf(TOUR[tourAt]));
    }
    step(dt);
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
  }).observe(stage);
  still.addEventListener("change", () => (still.matches ? renderStill() : start()));
  for (const n of [range, stage, ...buttons]) n.addEventListener("pointerdown", takeOver);
  if (still.matches) renderStill();
  else {
    step(0);
    start();
  }
}

class Fig extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    const root = this.attachShadow({ mode: "open" });
    const theme = this.getAttribute("theme") === "dark" ? "dark" : "light";
    root.innerHTML = "<style>" + "\n.iso{\n  --anatomy-page:#0b0b0b;--anatomy-card:#131313;--anatomy-text:#a3a3a3;--anatomy-strong:#e6e6e6;--anatomy-muted:#6e6e6e;\n  --anatomy-paper:#131313;--anatomy-face:#1b1b1b;--anatomy-top:#1c1c1c;\n  --anatomy-shade-0:#0f0f0f;--anatomy-shade-1:#121212;--anatomy-shade-2:#151515;--anatomy-shade-3:#181818;\n  --anatomy-lit-top:#262626;--anatomy-lit-shade:#1d1d1d;\n  --anatomy-hi:#d4d4d4;--anatomy-mid:#6a6a6a;--anatomy-lo:#3e3e3e;--anatomy-faint:#2a2a2a;--anatomy-lit:#ffffff;\n  --anatomy-halo:#050505;--anatomy-halo-opacity:.9;--anatomy-dot:#e6e6e6;\n  --anatomy-red:#ff6b6b;--anatomy-green:#6be0a0;--anatomy-blue:#6b9bff;\n  --anatomy-weight:.6px;--anatomy-ease:cubic-bezier(.32,.72,0,1);\n  --anatomy-mono:ui-monospace,\"SF Mono\",Menlo,Consolas,monospace;\n  --anatomy-lift:inset 0 1px 0 0 #ffffff0a,inset 0 0 0 1px #ffffff06,0 0 0 1px #00000026,0 1px 1px -.5px #00000014,0 3px 3px -1.5px #00000014,0 6px 6px -3px #00000014,0 12px 12px -6px #00000014;\n}\n.iso[data-theme=\"light\"]{\n  --anatomy-page:#f2f2ef;--anatomy-card:#fbfbfa;--anatomy-text:#57575a;--anatomy-strong:#18181a;--anatomy-muted:#8c8c90;\n  --anatomy-paper:#fbfbfa;--anatomy-face:#ffffff;--anatomy-top:#ffffff;\n  --anatomy-shade-0:#dcdcd9;--anatomy-shade-1:#e5e5e2;--anatomy-shade-2:#ededea;--anatomy-shade-3:#f4f4f1;\n  --anatomy-lit-top:#ffffff;--anatomy-lit-shade:#eeeeeb;\n  --anatomy-hi:#26262a;--anatomy-mid:#8a8a8f;--anatomy-lo:#b4b4b8;--anatomy-faint:#d4d4d6;--anatomy-lit:#000000;\n  --anatomy-halo:#8a8a80;--anatomy-halo-opacity:.32;--anatomy-dot:#3a3a3e;\n  --anatomy-red:#e5484d;--anatomy-green:#30a46c;--anatomy-blue:#3e63dd;\n  --anatomy-lift:inset 0 1px 0 0 #ffffff,0 0 0 1px #0000000f,0 1px 1px -.5px #0000000a,0 3px 3px -1.5px #0000000a,0 6px 6px -3px #0000000a,0 12px 12px -6px #0000000a;\n}\n.iso-svg{display:block;width:100%;height:auto;overflow:visible}\n.iso-svg path,.iso-svg circle{vector-effect:non-scaling-stroke}\n.iso-fill{fill:var(--anatomy-paper);stroke:none}\n.iso-solid[data-lit]>.iso-fill{fill:var(--anatomy-face)}\n.iso-shade,.iso-top{stroke:none}\n.iso-shade[data-shade=\"0\"]{fill:var(--anatomy-shade-0)}\n.iso-shade[data-shade=\"1\"]{fill:var(--anatomy-shade-1)}\n.iso-shade[data-shade=\"2\"]{fill:var(--anatomy-shade-2)}\n.iso-shade[data-shade=\"3\"]{fill:var(--anatomy-shade-3)}\n.iso-top{fill:var(--anatomy-top)}\n.iso-solid[data-lit]>.iso-top{fill:var(--anatomy-lit-top)}\n.iso-solid[data-lit]>.iso-shade{fill:var(--anatomy-lit-shade)}\n.iso-solid[data-seamless]>.iso-shade,.iso-solid[data-seamless]>.iso-top{stroke-width:.4;stroke-linejoin:round}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"0\"]{stroke:var(--anatomy-shade-0)}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"1\"]{stroke:var(--anatomy-shade-1)}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"2\"]{stroke:var(--anatomy-shade-2)}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"3\"]{stroke:var(--anatomy-shade-3)}\n.iso-solid[data-seamless]>.iso-top{stroke:var(--anatomy-top)}\n.iso-solid[data-seamless][data-lit]>.iso-top{stroke:var(--anatomy-lit-top)}\n.iso-solid[data-seamless][data-lit]>.iso-shade{stroke:var(--anatomy-lit-shade)}\n.iso-solid[data-lit]>.iso-edge{stroke:var(--anatomy-lit)}\n.iso-halo{fill:var(--anatomy-halo);stroke:none;filter:blur(9px);opacity:var(--anatomy-halo-opacity);transform:translateY(3px)}\n.iso-line{fill:none;stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight);stroke-linecap:round;stroke-linejoin:round}\n.iso-line[data-tone=\"hi\"]{stroke:var(--anatomy-hi)}\n.iso-line[data-tone=\"mid\"]{stroke:var(--anatomy-mid)}\n.iso-line[data-tone=\"lo\"]{stroke:var(--anatomy-lo)}\n.iso-line[data-tone=\"faint\"]{stroke:var(--anatomy-faint)}\n.iso-line[data-tone=\"lit\"]{stroke:var(--anatomy-lit)}\n.iso-line[data-tone=\"red\"]{stroke:var(--anatomy-red)}\n.iso-line[data-tone=\"green\"]{stroke:var(--anatomy-green)}\n.iso-line[data-tone=\"blue\"]{stroke:var(--anatomy-blue)}\n.iso-line[data-dotted]{stroke-dasharray:.01 3.5;stroke-width:1}\n.iso-line[data-dashed]{stroke-dasharray:3 3}\n.iso-line[data-flow]{stroke-dasharray:2 6}\n.iso-wire-end{fill:var(--anatomy-paper);stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight)}\n.iso-wire[data-tone=\"hi\"] .iso-wire-end{stroke:var(--anatomy-hi)}\n.iso-wire[data-tone=\"mid\"] .iso-wire-end{stroke:var(--anatomy-mid)}\n.iso-wire[data-tone=\"faint\"] .iso-wire-end{stroke:var(--anatomy-faint)}\n.iso-wire[data-tone=\"lit\"] .iso-wire-end{stroke:var(--anatomy-lit)}\n.iso-dots circle{fill:var(--anatomy-dot);stroke:none;opacity:.32}\n.iso-dots[data-tone=\"hi\"] circle{opacity:.85}\n.iso-dots[data-tone=\"mid\"] circle{opacity:.45}\n.iso-dots[data-tone=\"lo\"] circle{opacity:.22}\n.iso-dots[data-tone=\"faint\"] circle{opacity:.12}\n.iso-face-text{fill:var(--anatomy-mid);font-family:var(--anatomy-mono);letter-spacing:.04em}\n.iso-face-text[data-tone=\"hi\"]{fill:var(--anatomy-hi)}\n.iso-face-text[data-tone=\"lo\"]{fill:var(--anatomy-lo)}\n.iso-face-text[data-tone=\"faint\"]{fill:var(--anatomy-faint)}\n.tb-body{fill:var(--anatomy-shade-2);stroke:none}\n.tb-shine{fill:var(--anatomy-top);stroke:none}\n.tb-shade{fill:var(--anatomy-shade-0);stroke:none}\n.tb-ring{fill:none;stroke:var(--anatomy-lo);stroke-width:.45;stroke-linecap:butt;stroke-linejoin:round}\n.tb-ring[data-tone=\"mid\"]{stroke:var(--anatomy-mid)}\n.tb-ring[data-tone=\"faint\"]{stroke:var(--anatomy-faint)}\n.tb-ring[data-tone=\"hi\"]{stroke:var(--anatomy-hi)}\n@keyframes iso-flow{to{stroke-dashoffset:-32}}\n@keyframes iso-pulse{0%,100%{opacity:.18}12%{opacity:1}40%{opacity:.18}}\n.iso-line[data-flow]{animation:iso-flow 1600ms linear infinite}\n.iso-dots circle[data-pulse]{animation:iso-pulse 1600ms steps(1,end) infinite;animation-delay:var(--pulse-at,0ms)}\n.iso-figure{margin:32px 0 36px}\n.iso-plate{position:relative;padding:52px 24px;border-radius:0;background:var(--anatomy-card);box-shadow:0 0 0 1px var(--anatomy-mid);--anatomy-paper:var(--anatomy-card)}\n.iso-plate-corners{position:absolute;inset:18px 20px;pointer-events:none}\n.iso-plate-corner{position:absolute;color:var(--anatomy-muted);font-family:var(--anatomy-mono);font-size:10.5px;line-height:1;letter-spacing:.04em;white-space:nowrap}\n.iso-plate-corner[data-corner=\"fig\"]{top:0;left:0;color:var(--anatomy-text)}\n.iso-plate-corner[data-corner=\"title\"]{top:0;right:0;text-transform:uppercase;letter-spacing:.1em}\n.iso-plate-corner[data-corner=\"hint\"]{bottom:0;left:0;text-transform:uppercase;letter-spacing:.1em}\n.iso-plate-corner[data-corner=\"readout\"]{right:0;bottom:0;color:var(--anatomy-text);font-variant-numeric:tabular-nums}\n.iso-plate .iso-svg{margin:0 auto}\n.iso-legend{display:grid;gap:8px;margin-top:12px;color:var(--anatomy-muted);font-size:13px;line-height:1.55}\n.iso-keys{display:flex;flex-wrap:wrap;gap:6px 18px}\n.iso-key{display:inline-flex;align-items:center;gap:7px}\n.iso-swatch{width:16px;height:10px;flex:none;overflow:visible}\n.iso-swatch path{fill:none;stroke:var(--anatomy-hi);stroke-width:1;vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round}\n.iso-swatch[data-mark=\"raised\"] path,.iso-swatch[data-mark=\"flat\"] path{stroke:var(--anatomy-mid)}\n.iso-swatch[data-mark=\"lit\"] path{stroke:var(--anatomy-lit)}\n.iso-swatch[data-mark=\"dim\"] path{stroke:var(--anatomy-lo)}\n.iso-swatch[data-mark=\"dotted\"] path{stroke-dasharray:.01 3;stroke-width:1.4}\n.iso-swatch[data-mark=\"dashed\"] path{stroke-dasharray:3 2.5}\n.iso-swatch[data-mark=\"red\"] path{stroke:var(--anatomy-red)}\n.iso-swatch[data-mark=\"green\"] path{stroke:var(--anatomy-green)}\n.iso-swatch[data-mark=\"blue\"] path{stroke:var(--anatomy-blue)}\n.iso-swatch-crease{stroke:var(--anatomy-lo)!important}\n@media (max-width:560px){.iso-plate{padding:48px 12px 70px}.iso-plate-corner[data-corner=\"hint\"]{bottom:18px}}\n@media (prefers-reduced-motion:reduce){.iso-line[data-flow],.iso-dots circle[data-pulse]{animation:none}}\n/*\n * Optimal theme for Anatomy figures.\n *\n * Load AFTER the kit's ISO_CSS. Put `class=\"iso optimal\"` on the wrapper:\n *   - no data-theme  -> \"Forest night\"  (exam-room TV, dark)\n *   - data-theme=\"light\" -> \"Cream\"     (beoptimal.ca, the primary target)\n *\n * Values come from the live site (beoptimal-landing src/index.css), the\n * Performance package design and the ALE visualizer spec. The kit's grey\n * ramps are warmed so solids sit on the site's cream paper, and the single\n * \"lit\" accent is Optimal forest green instead of pure black/white.\n */\n\n.iso.optimal {\n  /* Forest night (dark) */\n  --anatomy-page: #152511;\n  --anatomy-card: #1c3118;\n  --anatomy-text: #c9cdbf;\n  --anatomy-strong: #fffcf7;\n  --anatomy-muted: #8e9884;\n  --anatomy-paper: #1c3118;\n  --anatomy-face: #253821;\n  --anatomy-top: #283c24;\n  --anatomy-shade-0: #172812;\n  --anatomy-shade-1: #1a2c16;\n  --anatomy-shade-2: #1e321a;\n  --anatomy-shade-3: #22371e;\n  --anatomy-lit-top: #34492f;\n  --anatomy-lit-shade: #2a3f26;\n  --anatomy-hi: #e9e6dc;\n  --anatomy-mid: #7e8a74;\n  --anatomy-lo: #4d5c46;\n  --anatomy-faint: #33452e;\n  --anatomy-lit: #fffcf7;\n  --anatomy-halo: #0b1508;\n  --anatomy-halo-opacity: 0.9;\n  --anatomy-dot: #e9e6dc;\n  --anatomy-red: #e0745f;\n  --anatomy-green: #8cc67f;\n  --anatomy-blue: #7fa8d9;\n  --anatomy-mono: \"JetBrains Mono\", ui-monospace, \"SF Mono\", Menlo, Consolas, monospace;\n\n  /* Optimal extras (use sparingly; colour only when colour is the subject) */\n  --opt-display: \"Castoro\", Georgia, serif;\n  --opt-ui: \"Public Sans\", system-ui, sans-serif;\n  --opt-forest: #2c4e25;\n  --opt-forest-light: #519044;\n  --opt-sage: #5e7a59;\n  --opt-borderline: #c97b2d;\n  --opt-out: #b3402f;\n  --opt-heat: #ff9776;\n}\n\n.iso.optimal[data-theme=\"light\"] {\n  /* Cream (light) */\n  --anatomy-page: #fef8f1;\n  --anatomy-card: #fffcf7;\n  --anatomy-text: #3e3d39;\n  --anatomy-strong: #252525;\n  --anatomy-muted: #716e68; /* 4.97:1 on the cream card (was 4.46:1 for the legend) */\n  --anatomy-paper: #fffcf7;\n  --anatomy-face: #fffefb;\n  --anatomy-top: #fffefb;\n  --anatomy-shade-0: #ddd7cc;\n  --anatomy-shade-1: #e7e2d9;\n  --anatomy-shade-2: #f0ede5;\n  --anatomy-shade-3: #f6f3ec;\n  --anatomy-lit-top: #fffefb;\n  --anatomy-lit-shade: #efebe2;\n  --anatomy-hi: #252525;\n  --anatomy-mid: #8a867e;\n  --anatomy-lo: #b9b4aa;\n  --anatomy-faint: #d9d3c8;\n  --anatomy-lit: #2c4e25;\n  --anatomy-halo: #8a8070;\n  --anatomy-halo-opacity: 0.3;\n  --anatomy-dot: #3a3833;\n  --anatomy-red: #b3402f;\n  --anatomy-green: #3f7a35;\n  --anatomy-blue: #3e6a8f;\n}\n\n/* Card typography: brand fonts for titles and readouts, kit mono for plate corners */\n.iso.optimal .iso-plate-title,\n.iso.optimal [data-role=\"title\"] {\n  font-family: var(--opt-display);\n  letter-spacing: -0.02em;\n}\n.iso.optimal [data-role=\"readout\"],\n.iso.optimal .iso-readout {\n  font-family: var(--opt-ui);\n  font-feature-settings: \"tnum\" 1, \"ss01\" 1;\n}\n\n/*\n * Card layout for Optimal figures (shared/page.mjs `plate`).\n * Phone first: the drawing, then a row of real buttons (>=44 px), then a footer\n * where the hint and the readout wrap instead of overlapping at 320 px.\n */\n.iso.optimal {\n  --opt-rule: rgba(233, 230, 220, 0.16);\n  --opt-btn: rgba(233, 230, 220, 0.06);\n  --opt-btn-on: #e9e6dc;\n  --opt-btn-on-text: #1c3118;\n  --opt-title: #fffcf7;\n  --opt-fig: #8cc67f;\n  --opt-heat-ink: #ff9776;\n  --opt-heat-glow: rgba(255, 151, 118, 0.55);\n  --opt-heat-wash: rgba(255, 151, 118, 0.16);\n  --opt-cold-ink: #9cc3e6;\n}\n.iso.optimal[data-theme=\"light\"] {\n  --opt-rule: rgba(44, 78, 37, 0.2);\n  --opt-btn: #fffcf7;\n  --opt-btn-on: #2c4e25;\n  --opt-btn-on-text: #fffcf7;\n  --opt-title: #2c4e25;\n  --opt-fig: #5e7a59;\n  --opt-heat-ink: #c8552e;\n  --opt-heat-glow: rgba(232, 108, 64, 0.42);\n  --opt-heat-wash: rgba(255, 151, 118, 0.22);\n  --opt-cold-ink: #3e6a8f;\n}\n.iso.optimal .opt-plate {\n  padding: 52px 24px 20px;\n  box-shadow: 0 0 0 1px var(--opt-rule);\n  border-radius: 2px;\n}\n.iso.optimal .iso-plate-corner[data-corner=\"fig\"] {\n  font-family: var(--opt-display);\n  font-style: italic;\n  font-size: 15px;\n  letter-spacing: 0;\n  color: var(--opt-fig);\n  top: -2px;\n}\n.iso.optimal .iso-plate-corner[data-corner=\"title\"] {\n  font-family: var(--opt-display);\n  font-size: 17px;\n  text-transform: none;\n  letter-spacing: -0.01em;\n  color: var(--opt-title);\n  top: -4px;\n}\n.iso.optimal .opt-controls {\n  display: flex;\n  flex-wrap: wrap;\n  justify-content: center;\n  gap: 8px 12px;\n  margin: 10px 0 0;\n}\n.iso.optimal .opt-seg {\n  display: inline-flex;\n  border-radius: 999px;\n  box-shadow: inset 0 0 0 1px var(--opt-rule);\n  padding: 3px;\n  gap: 2px;\n  max-width: 100%;\n}\n.iso.optimal .opt-seg-btn {\n  appearance: none;\n  border: 0;\n  margin: 0;\n  min-height: 44px;\n  min-width: min-content; /* never shrink a label below its longest word (with the padding, always ≥ 44 px) */\n  padding: 0 16px;\n  border-radius: 999px;\n  background: transparent;\n  color: var(--anatomy-text);\n  font: 500 14px/1.1 var(--opt-ui);\n  letter-spacing: 0;\n  cursor: pointer;\n  touch-action: manipulation;\n  -webkit-tap-highlight-color: transparent;\n  transition: background-color 240ms var(--anatomy-ease), color 240ms var(--anatomy-ease);\n}\n/* A zero-height 30 px strut keeps every option at least 44 px wide, even \"Arm\", \"Leg\" or \"+5%\" with the\n   7 px padding below 350 px (min-content alone let them shrink to 36 px). */\n.iso.optimal .opt-seg-btn::after {\n  content: \"\";\n  display: block;\n  width: 30px;\n  height: 0;\n  margin: 0 auto;\n}\n.iso.optimal .opt-seg-btn[aria-checked=\"true\"] {\n  background: var(--opt-btn-on);\n  color: var(--opt-btn-on-text);\n}\n.iso.optimal .opt-seg-btn:focus-visible {\n  outline: 2px solid var(--opt-fig);\n  outline-offset: 2px;\n}\n.iso.optimal .opt-foot {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: flex-end;\n  justify-content: space-between;\n  gap: 10px 20px;\n  margin-top: 16px;\n}\n.iso.optimal .opt-hint {\n  font-family: var(--anatomy-mono);\n  font-size: 10.5px;\n  line-height: 1.4;\n  letter-spacing: 0.1em;\n  text-transform: uppercase;\n  color: var(--anatomy-muted);\n  flex: 1 1 160px;\n  min-width: 0;\n}\n.iso.optimal .opt-readout {\n  display: grid;\n  grid-auto-flow: column;\n  gap: 4px 18px;\n  margin: 0;\n  font-family: var(--opt-ui);\n  font-feature-settings: \"tnum\" 1;\n}\n.iso.optimal .opt-stat { margin: 0; min-width: 0; }\n.iso.optimal .opt-stat dt {\n  font-size: 10px;\n  font-weight: 600;\n  letter-spacing: 0.12em;\n  text-transform: uppercase;\n  color: var(--anatomy-muted);\n  white-space: nowrap;\n}\n.iso.optimal .opt-stat dd {\n  margin: 1px 0 0;\n  font-size: 15px;\n  font-weight: 500;\n  color: var(--anatomy-strong);\n  white-space: nowrap;\n}\n.iso.optimal .iso-legend { font-family: var(--opt-ui); font-size: 13.5px; }\n.iso.optimal .iso-caption { color: var(--anatomy-text); }\n.iso.optimal .iso-caption em { font-style: italic; }\n.iso.optimal .iso-swatch[data-mark=\"heat\"] path { stroke: var(--opt-heat-ink); stroke-width: 2; }\n.iso.optimal .iso-stage { outline: none; border-radius: 4px; touch-action: pan-y; -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none; }\n.iso.optimal .iso-stage:focus-visible { outline: 1px solid var(--anatomy-muted); outline-offset: 6px; }\n@media (max-width: 560px) {\n  .iso.optimal .opt-plate { padding: 44px 10px 14px; }\n  .iso.optimal .iso-plate-corners { inset: 16px 12px; }\n  .iso.optimal .opt-readout { grid-auto-flow: row; grid-template-columns: repeat(4, minmax(0, auto)); width: 100%; justify-content: space-between; gap: 4px 10px; order: -1; }\n  .iso.optimal .opt-stat dd { font-size: 14px; }\n  /* a long label wraps onto two lines instead of running into its neighbour; values stay on one baseline */\n  .iso.optimal .opt-stat { display: flex; flex-direction: column; justify-content: space-between; }\n  .iso.optimal .opt-stat dt { white-space: normal; line-height: 1.25; }\n  .iso.optimal .opt-seg-btn { padding: 0 12px; font-size: 13.5px; }\n}\n@media (max-width: 350px) {\n  .iso.optimal .opt-seg-btn { padding: 0 7px; font-size: 12.5px; }\n  .iso.optimal .opt-stat dt { font-size: 9px; letter-spacing: 0.08em; }\n  .iso.optimal .opt-stat dd { font-size: 13px; }\n}\n\n:host{display:block}\n.opt-host{background:transparent;color:var(--anatomy-text);font:15px/1.6 var(--opt-ui);-webkit-font-smoothing:antialiased}\n.opt-host *{box-sizing:border-box}\n.opt-host .iso-figure{margin:0}\n/* The mannequin (shared/mannequin.mjs): turned wood segments, steel ball joints, tracking dots. */\n.iso.optimal {\n  /* Forest night: dark walnut, so the figure sits in the room rather than glowing */\n  --mq-face: #6b5a44;\n  --mq-shade-0: #3f3326;\n  --mq-shade-1: #4b3d2d;\n  --mq-shade-2: #574735;\n  --mq-shade-3: #63523e;\n  --mq-top: #7a684f;\n  --mq-edge: #e9e6dc;\n}\n.iso.optimal[data-theme=\"light\"] {\n  /* Cream: pale beech */\n  --mq-face: #f3e6cf;\n  --mq-shade-0: #cdb592;\n  --mq-shade-1: #d9c4a3;\n  --mq-shade-2: #e4d2b5;\n  --mq-shade-3: #ecdec5;\n  --mq-top: #f8eedc;\n  --mq-edge: #3e3d39;\n}\n.mq-wood {\n  --anatomy-face: var(--mq-face);\n  --anatomy-paper: var(--mq-face);\n  --anatomy-shade-0: var(--mq-shade-0);\n  --anatomy-shade-1: var(--mq-shade-1);\n  --anatomy-shade-2: var(--mq-shade-2);\n  --anatomy-shade-3: var(--mq-shade-3);\n  --anatomy-top: var(--mq-top);\n}\n.mq-dot { fill: var(--anatomy-lit); stroke: var(--anatomy-card); stroke-width: 0.5; }\n.mq-glow { fill: var(--opt-heat); stroke: none; }\n.mq-glow-ring { fill: none; stroke: var(--opt-heat-ink); stroke-width: 0.6; }\n/* Fig 4 · the belt, the instruments and the display's panels, in the figure's own inks. */\n.iso.optimal { --cr-screen: #0f1b0c; --cr-screen-ink: #c9e3c1; --cr-screen-dim: #4f6b48; --cr-screen-well: #1b2b17; }\n.iso.optimal[data-theme=\"light\"] { --cr-screen: #1d2a1a; --cr-screen-ink: #d9efd2; --cr-screen-dim: #5d7a56; --cr-screen-well: #2a3b26; }\n.cr-screen { fill: var(--cr-screen); }\n.cr-lens { fill: var(--anatomy-shade-0); }\n.cr-zero { fill: var(--anatomy-lit); stroke: none; }\n.cr-slats { stroke-width: 0.6; }\n.cr-mark { fill: none; stroke: var(--opt-heat-ink); stroke-width: 2.4; stroke-linecap: round; }\n.cr-laser { fill: none; stroke: var(--anatomy-lit); stroke-width: 1.1; stroke-linecap: round; }\n.cr-rider-mark { fill: none; stroke: var(--opt-heat-ink); stroke-width: 1.4; stroke-linecap: round; }\n.cr-well { fill: var(--cr-screen-well); }\n.cr-spot { fill: none; stroke: var(--anatomy-lit); stroke-width: 0.8; }\n.cr-beam { stroke-width: 0.6; stroke-dasharray: none; opacity: 0.85; }\n.cr-hold { fill: none; stroke: var(--anatomy-lit); stroke-width: 1; stroke-linecap: round; }\n.cr-com-ring { fill: none; stroke: var(--anatomy-lit); stroke-width: 0.7; }\n.cr-digits { fill: var(--cr-screen-ink); font-family: var(--opt-ui); font-weight: 600; font-feature-settings: \"tnum\" 1; }\n.cr-unit { fill: var(--cr-screen-dim); font-family: var(--opt-ui); font-weight: 500; }\n.cr-bones { fill: none; stroke: var(--cr-screen-ink); stroke-width: 0.7; stroke-linecap: round; opacity: 0.85; }\n.cr-joints circle { fill: var(--cr-screen-ink); }\n.cr-kneedot { fill: var(--opt-heat); }\n.cr-bar { fill: var(--opt-heat); }\n.cr-holdbar { fill: none; stroke: var(--opt-heat); stroke-width: 0.6; }\n.cr-ref { fill: none; stroke: var(--cr-screen-dim); stroke-width: 0.5; stroke-dasharray: 1 1; }\n.cr-axis { fill: none; stroke: var(--cr-screen-dim); stroke-width: 0.5; }\n.cr-trace { fill: none; stroke: var(--cr-screen-ink); stroke-width: 0.6; stroke-linejoin: round; }\n.cr-trace[data-side=\"R\"] { stroke: var(--cr-screen-dim); }\n.cr-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }\n.cr-par { display: block; margin-top: 6px; }\n.cr-par:first-child { margin-top: 0; }\n.cr-par small { font-size: 12.5px; color: var(--anatomy-muted); }\n.cr-scrub { display: flex; align-items: center; gap: 10px; margin: 10px 4px 0; }\n.cr-end { font: 500 13px/1 var(--opt-ui); color: var(--anatomy-muted); font-feature-settings: \"tnum\" 1; }\n.cr-slow { appearance: none; border: 0; min-height: 44px; min-width: 64px; padding: 0 14px; border-radius: 999px; background: transparent; box-shadow: inset 0 0 0 1px var(--opt-rule); color: var(--anatomy-text); font: 500 14px/1 var(--opt-ui); cursor: pointer; touch-action: manipulation; }\n.cr-slow[aria-pressed=\"true\"] { background: var(--opt-btn-on); color: var(--opt-btn-on-text); box-shadow: none; }\n.cr-slow:focus-visible { outline: 2px solid var(--opt-fig); outline-offset: 2px; }\n.cr-range { flex: 1; min-width: 0; height: 44px; margin: 0; background: transparent; accent-color: var(--opt-btn-on); -webkit-appearance: none; appearance: none; touch-action: pan-y; }\n.cr-range::-webkit-slider-runnable-track { height: 4px; border-radius: 2px; background: var(--opt-rule); }\n.cr-range::-moz-range-track { height: 4px; border-radius: 2px; background: var(--opt-rule); }\n.cr-range::-webkit-slider-thumb { -webkit-appearance: none; width: 28px; height: 28px; margin-top: -12px; border-radius: 50%; background: var(--opt-btn-on); border: 3px solid var(--anatomy-card); box-shadow: 0 0 0 1px var(--opt-rule); }\n.cr-range::-moz-range-thumb { width: 24px; height: 24px; border-radius: 50%; background: var(--opt-btn-on); border: 3px solid var(--anatomy-card); }\n.cr-range:focus-visible { outline: 2px solid var(--opt-fig); outline-offset: 2px; }\n/* Fig 4 on phones (Fig 6 loads this file too, hence .cr-rig): four short values in equal columns. With content-sized columns \"1.01 m\" and \"7.6%\" sat 10 px apart\n   while \"100%\" floated off on its own; equal columns give the four values one even rhythm. */\n@media (max-width: 560px) {\n  .iso.optimal .cr-rig .opt-readout { grid-template-columns: repeat(4, minmax(0, 1fr)); justify-content: stretch; }\n}\n" + "</style><div class=\"iso optimal opt-host\" data-theme=\"" + theme + "\">" + "<figure class=\"iso-figure opt-figure cr-rig\"><div class=\"iso-plate opt-plate\"><div class=\"iso-plate-corners\" aria-hidden=\"true\"><span class=\"iso-plate-corner\" data-corner=\"fig\">Fig 4</span><span class=\"iso-plate-corner\" data-corner=\"title\">The runner rig</span></div><div class=\"iso-stage cr-stage\" tabindex=\"0\" role=\"slider\" aria-label=\"Step rate at 10 km/h. Left and right arrows change it by 1 step per minute, Page Up and Down by 5.\" aria-valuemin=\"149\" aria-valuemax=\"182\" aria-valuenow=\"165\" aria-valuetext=\"165 steps per minute\"><svg xmlns=\"http://www.w3.org/2000/svg\" class=\"iso-svg\" viewBox=\"0 0 600 713\" role=\"img\" aria-label=\"A Creator 600 treadmill with a wooden artist's mannequin running on the belt at 10 km/h. Each joint carries a tracking dot, and the tall display at the front draws the live skeleton the camera under it sees, with the knee load of each step and a knee-angle trace. A plumb laser under the pelvis marks the belt below the centre of mass, and a ruler on the step rail shows how far ahead of it each heel lands. A gauge behind the runner tracks how far the centre of mass rises and falls. The console shows the cadence.\"><path class=\"iso-halo\" d=\"M15.8 637.6L16.4 636.2L17.7 634.9L19.6 633.7L22.1 632.7L416.3 499.7L419.3 498.9L422.6 498.3L426.2 498L430 497.9L433.6 498.1L437.1 498.6L440.3 499.3L443 500.3L579.3 557L581.5 558.1L583.1 559.3L584 560.7L584.2 562.1L584.2 562.3L583.6 563.7L582.3 565L580.4 566.2L577.9 567.2L183.7 700.2L180.7 701L177.4 701.6L173.8 701.9L170 702L166.4 701.8L162.9 701.3L159.7 700.6L157 699.6L20.7 642.9L18.5 641.8L16.9 640.6L16 639.2L15.8 637.8Z\"/><g class=\"iso-solid cr-strip\"><path class=\"iso-fill\" d=\"M298.7 581.8L299 581.5L406.7 545.2L407.4 545.1L408 545.2L414 547.7L414.3 548L414.3 548.7L414 548.9L306.3 585.2L305.6 585.3L304.9 585.2L298.9 582.7L298.7 582.4Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M414.3 548.7L414 548.9L414 548.3L414.3 548ZM414 548.9L306.3 585.2L306.3 584.6L414 548.3Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M306.3 585.2L305.6 585.3L305.6 584.7L306.3 584.6Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M305.6 585.3L304.9 585.2L304.9 584.6L305.6 584.7Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M304.9 585.2L298.9 582.7L298.9 582L304.9 584.6ZM298.9 582.7L298.7 582.4L298.7 581.8L298.9 582Z\"/><path class=\"iso-top\" d=\"M406.7 545.2L407.4 545.1L408 545.2L414 547.7L414.3 548L414 548.3L306.3 584.6L305.6 584.7L304.9 584.6L298.9 582L298.7 581.8L299 581.5Z\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M298.7 581.8L299 581.5L406.7 545.2L407.4 545.1L408 545.2L414 547.7L414.3 548M414.3 548.7L414 548.9L306.3 585.2L305.6 585.3L304.9 585.2L298.9 582.7L298.7 582.4M414.3 548L414.3 548.7M298.7 581.8L298.7 582.4\"/></g><path class=\"iso-line\" data-tone=\"lo\" d=\"M301.8 580.6L305.3 582M308.8 578.2L312.3 579.7M312.3 577L315.8 578.5M315.9 575.8L319.3 577.3M319.4 574.7L322.9 576.1M326.4 572.3L329.9 573.7M329.9 571.1L333.4 572.5M333.5 569.9L336.9 571.4M337 568.7L340.5 570.2M344 566.3L347.5 567.8M347.5 565.2L351 566.6M351.1 564L354.5 565.4M354.6 562.8L358.1 564.2M361.6 560.4L365.1 561.9M365.1 559.2L368.6 560.7M368.7 558L372.1 559.5M372.2 556.9L375.7 558.3M379.2 554.5L382.7 555.9M382.7 553.3L386.2 554.7M386.3 552.1L389.7 553.6M389.8 550.9L393.3 552.4M396.8 548.5L400.3 550M400.3 547.4L403.8 548.8M403.9 546.2L407.3 547.6\"/><path class=\"iso-line\" data-tone=\"mid\" d=\"M305.3 579.4L312.6 582.4M322.9 573.5L330.2 576.5M340.5 567.5L347.8 570.6M358.1 561.6L365.4 564.6M375.7 555.7L383 558.7M393.3 549.7L400.6 552.8\"/><path class=\"cr-zero\" d=\"M324 573.1L324.6 573.1L331.3 575.9L331.2 576.1L329.1 576.9L328.5 576.8L321.8 574.1L321.8 573.8Z\"/><g class=\"it\" data-name=\"stand.foot\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M367.1 507.3L367.2 506.4L368 505.6L369.5 504.9L371.5 504.4L373.8 504.2L376.2 504.2L378.4 504.5L380.2 505.1L381.5 505.9L382.1 506.7L382.1 522.1L382 523L381.2 523.8L379.7 524.5L377.7 525L375.4 525.2L373 525.2L370.8 524.8L369 524.3L367.7 523.5L367.1 522.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M382.1 522.1L382 523L382 507.6L382.1 506.7ZM382 523L381.2 523.8L381.2 508.4L382 507.6ZM381.2 523.8L379.7 524.5L379.7 509.1L381.2 508.4ZM379.7 524.5L377.7 525L377.7 509.6L379.7 509.1Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M377.7 525L375.4 525.2L375.4 509.8L377.7 509.6Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M375.4 525.2L373 525.2L373 509.8L375.4 509.8ZM373 525.2L370.8 524.8L370.8 509.5L373 509.8Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M370.8 524.8L369 524.3L369 508.9L370.8 509.5ZM369 524.3L367.7 523.5L367.7 508.2L369 508.9ZM367.7 523.5L367.1 522.7L367.1 507.3L367.7 508.2Z\"/><path class=\"iso-top\" d=\"M380.2 505.1L381.5 505.9L382.1 506.7L382 507.6L381.2 508.4L379.7 509.1L377.7 509.6L375.4 509.8L373 509.8L370.8 509.5L369 508.9L367.7 508.2L367.1 507.3L367.2 506.4L368 505.6L369.5 504.9L371.5 504.4L373.8 504.2L376.2 504.2L378.4 504.5Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M382.1 506.7L382 507.6L381.2 508.4L379.7 509.1L377.7 509.6L375.4 509.8L373 509.8L370.8 509.5L369 508.9L367.7 508.2L367.1 507.3\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M367.1 507.3L367.2 506.4L368 505.6L369.5 504.9L371.5 504.4L373.8 504.2L376.2 504.2L378.4 504.5L380.2 505.1L381.5 505.9L382.1 506.7M382.1 522.1L382 523L381.2 523.8L379.7 524.5L377.7 525L375.4 525.2L373 525.2L370.8 524.8L369 524.3L367.7 523.5L367.1 522.7M382.1 506.7L382.1 522.1M367.1 507.3L367.1 522.7\"/></g></g><g class=\"it\" data-name=\"column\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M401.3 377.4L401.5 376L403.5 374.9L445.7 360.6L449 360L452.6 360.1L455.7 360.8L566.6 407L568.3 408.2L568.3 553.1L568.1 554.5L566.1 555.7L523.9 569.9L520.6 570.5L516.9 570.5L513.9 569.7L402.9 523.6L401.3 522.3Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M568.3 553.1L568.1 554.5L568.1 409.6L568.3 408.2ZM568.1 554.5L566.1 555.7L566.1 410.7L568.1 409.6ZM566.1 555.7L523.9 569.9L523.9 425L566.1 410.7Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M523.9 569.9L520.6 570.5L520.6 425.6L523.9 425Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M520.6 570.5L516.9 570.5L516.9 425.5L520.6 425.6Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M516.9 570.5L513.9 569.7L513.9 424.8L516.9 425.5ZM513.9 569.7L402.9 523.6L402.9 378.6L513.9 424.8ZM402.9 523.6L401.3 522.3L401.3 377.4L402.9 378.6Z\"/><path class=\"iso-top\" d=\"M445.7 360.6L449 360L452.6 360.1L455.7 360.8L566.6 407L568.3 408.2L568.1 409.6L566.1 410.7L523.9 425L520.6 425.6L516.9 425.5L513.9 424.8L402.9 378.6L401.3 377.4L401.5 376L403.5 374.9Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M568.3 408.2L568.1 409.6L566.1 410.7L523.9 425L520.6 425.6L516.9 425.5L513.9 424.8L402.9 378.6L401.3 377.4\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M568.3 408.2L566.8 409.4L565 410.4L523.1 424.5L520.3 425.1L517.4 425L514.8 424.4L404.1 378.3L401.3 377.4\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M401.3 377.4L401.5 376L403.5 374.9L445.7 360.6L449 360L452.6 360.1L455.7 360.8L566.6 407L568.3 408.2M568.3 553.1L568.1 554.5L566.1 555.7L523.9 569.9L520.6 570.5L516.9 570.5L513.9 569.7L402.9 523.6L401.3 522.3M568.3 408.2L568.3 553.1M401.3 377.4L401.3 522.3\"/></g><path class=\"iso-line\" data-tone=\"lo\" d=\"M417.2 504.5L499.6 538.8L499.6 536.1L417.2 501.8ZM417.2 491.3L499.6 525.6L499.6 522.9L417.2 488.7ZM417.2 478.1L499.6 512.4L499.6 509.8L417.2 475.5ZM417.2 465L499.6 499.2L499.6 496.6L417.2 462.3ZM417.2 451.8L499.6 486.1L499.6 483.4L417.2 449.1ZM417.2 438.6L499.6 472.9L499.6 470.2L417.2 436ZM417.2 425.4L499.6 459.7L499.6 457.1L417.2 422.8ZM417.2 412.3L499.6 446.5L499.6 443.9L417.2 409.6Z\"/></g><g class=\"it\" data-name=\"stand.foot\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M201.6 563.1L201.7 562.2L202.6 561.4L204.1 560.7L206.1 560.2L208.4 560L210.7 560L212.9 560.3L214.8 560.9L216.1 561.6L216.7 562.5L216.7 577.9L216.6 578.8L215.7 579.6L214.2 580.3L212.2 580.8L210 581L207.6 581L205.4 580.6L203.5 580.1L202.2 579.3L201.6 578.5Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M216.7 577.9L216.6 578.8L216.6 563.4L216.7 562.5ZM216.6 578.8L215.7 579.6L215.7 564.2L216.6 563.4ZM215.7 579.6L214.2 580.3L214.2 564.9L215.7 564.2ZM214.2 580.3L212.2 580.8L212.2 565.4L214.2 564.9Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M212.2 580.8L210 581L210 565.6L212.2 565.4Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M210 581L207.6 581L207.6 565.6L210 565.6ZM207.6 581L205.4 580.6L205.4 565.3L207.6 565.6Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M205.4 580.6L203.5 580.1L203.5 564.7L205.4 565.3ZM203.5 580.1L202.2 579.3L202.2 564L203.5 564.7ZM202.2 579.3L201.6 578.5L201.6 563.1L202.2 564Z\"/><path class=\"iso-top\" d=\"M214.8 560.9L216.1 561.6L216.7 562.5L216.6 563.4L215.7 564.2L214.2 564.9L212.2 565.4L210 565.6L207.6 565.6L205.4 565.3L203.5 564.7L202.2 564L201.6 563.1L201.7 562.2L202.6 561.4L204.1 560.7L206.1 560.2L208.4 560L210.7 560L212.9 560.3Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M216.7 562.5L216.6 563.4L215.7 564.2L214.2 564.9L212.2 565.4L210 565.6L207.6 565.6L205.4 565.3L203.5 564.7L202.2 564L201.6 563.1\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M201.6 563.1L201.7 562.2L202.6 561.4L204.1 560.7L206.1 560.2L208.4 560L210.7 560L212.9 560.3L214.8 560.9L216.1 561.6L216.7 562.5M216.7 577.9L216.6 578.8L215.7 579.6L214.2 580.3L212.2 580.8L210 581L207.6 581L205.4 580.6L203.5 580.1L202.2 579.3L201.6 578.5M216.7 562.5L216.7 577.9M201.6 563.1L201.6 578.5\"/></g></g><g class=\"it\" data-name=\"stand.foot\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M506.5 565.3L506.6 564.4L507.5 563.6L509 562.9L511 562.4L513.2 562.2L515.6 562.2L517.8 562.6L519.7 563.1L521 563.9L521.6 564.7L521.6 580.1L521.4 581L520.6 581.8L519.1 582.5L517.1 583L514.8 583.2L512.5 583.2L510.2 582.8L508.4 582.3L507.1 581.5L506.5 580.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M521.6 580.1L521.4 581L521.4 565.6L521.6 564.7ZM521.4 581L520.6 581.8L520.6 566.4L521.4 565.6ZM520.6 581.8L519.1 582.5L519.1 567.1L520.6 566.4ZM519.1 582.5L517.1 583L517.1 567.6L519.1 567.1Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M517.1 583L514.8 583.2L514.8 567.8L517.1 567.6Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M514.8 583.2L512.5 583.2L512.5 567.8L514.8 567.8ZM512.5 583.2L510.2 582.8L510.2 567.5L512.5 567.8Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M510.2 582.8L508.4 582.3L508.4 566.9L510.2 567.5ZM508.4 582.3L507.1 581.5L507.1 566.2L508.4 566.9ZM507.1 581.5L506.5 580.7L506.5 565.3L507.1 566.2Z\"/><path class=\"iso-top\" d=\"M519.7 563.1L521 563.9L521.6 564.7L521.4 565.6L520.6 566.4L519.1 567.1L517.1 567.6L514.8 567.8L512.5 567.8L510.2 567.5L508.4 566.9L507.1 566.2L506.5 565.3L506.6 564.4L507.5 563.6L509 562.9L511 562.4L513.2 562.2L515.6 562.2L517.8 562.6Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M521.6 564.7L521.4 565.6L520.6 566.4L519.1 567.1L517.1 567.6L514.8 567.8L512.5 567.8L510.2 567.5L508.4 566.9L507.1 566.2L506.5 565.3\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M506.5 565.3L506.6 564.4L507.5 563.6L509 562.9L511 562.4L513.2 562.2L515.6 562.2L517.8 562.6L519.7 563.1L521 563.9L521.6 564.7M521.6 580.1L521.4 581L520.6 581.8L519.1 582.5L517.1 583L514.8 583.2L512.5 583.2L510.2 582.8L508.4 582.3L507.1 581.5L506.5 580.7M521.6 564.7L521.6 580.1M506.5 565.3L506.5 580.7\"/></g></g><g class=\"it\" data-name=\"display\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M416.4 8.7L416.6 7.6L418.2 6.6L437.6 0.1L440.3 -0.4L443.4 -0.4L446 0.2L555.3 45.7L556.7 46.8L556.7 411.2L556.5 412.4L554.9 413.3L535.5 419.9L532.8 420.4L529.7 420.3L527.1 419.7L417.8 374.2L416.4 373.2Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M556.7 411.2L556.5 412.4L556.5 47.9L556.7 46.8ZM556.5 412.4L554.9 413.3L554.9 48.9L556.5 47.9ZM554.9 413.3L535.5 419.9L535.5 55.4L554.9 48.9Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M535.5 419.9L532.8 420.4L532.8 55.9L535.5 55.4Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M532.8 420.4L529.7 420.3L529.7 55.9L532.8 55.9Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M529.7 420.3L527.1 419.7L527.1 55.2L529.7 55.9ZM527.1 419.7L417.8 374.2L417.8 9.7L527.1 55.2ZM417.8 374.2L416.4 373.2L416.4 8.7L417.8 9.7Z\"/><path class=\"iso-top\" d=\"M437.6 0.1L440.3 -0.4L443.4 -0.4L446 0.2L555.3 45.7L556.7 46.8L556.5 47.9L554.9 48.9L535.5 55.4L532.8 55.9L529.7 55.9L527.1 55.2L417.8 9.7L416.4 8.7L416.6 7.6L418.2 6.6Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M556.7 46.8L556.5 47.9L554.9 48.9L535.5 55.4L532.8 55.9L529.7 55.9L527.1 55.2L417.8 9.7L416.4 8.7\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M556.7 46.8L554.7 47.7L553.4 48.4L534.4 54.8L532.4 55.2L530.3 55.2L528.4 54.7L419.4 9.3L416.4 8.7\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M416.4 8.7L416.6 7.6L418.2 6.6L437.6 0.1L440.3 -0.4L443.4 -0.4L446 0.2L555.3 45.7L556.7 46.8M556.7 411.2L556.5 412.4L554.9 413.3L535.5 419.9L532.8 420.4L529.7 420.3L527.1 419.7L417.8 374.2L416.4 373.2M556.7 46.8L556.7 411.2M416.4 8.7L416.4 373.2\"/></g><path class=\"iso-line\" data-tone=\"faint\" d=\"M434.4 369.1L510.4 400.7L510.4 398.5L434.4 366.9ZM434.4 360.3L510.4 391.9L510.4 389.8L434.4 358.1ZM434.4 351.5L510.4 383.2L510.4 381L434.4 349.3Z\"/><g data-part=\"screen\" transform=\"matrix(1.5846 0.6593 0.0000 2.1957 423.27 25.24)\"><rect class=\"cr-screen\" x=\"0\" y=\"0\" width=\"62\" height=\"111\" rx=\"1.2\"/><g data-part=\"screen-body\"></g><rect class=\"iso-line\" data-tone=\"mid\" fill=\"none\" x=\"0\" y=\"0\" width=\"62\" height=\"111\" rx=\"1.2\"/></g></g><g class=\"it\" data-name=\"camera\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M454.9 287.8L455.8 287L456.9 286.7L458.9 286.4L460.9 286.8L484 296.4L484.8 297.2L484.8 325.7L483.8 326.4L482.8 326.8L480.7 327.1L478.8 326.7L455.6 317.1L454.9 316.3Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M484.8 325.7L483.8 326.4L483.8 297.9L484.8 297.2ZM483.8 326.4L482.8 326.8L482.8 298.2L483.8 297.9Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M482.8 326.8L480.7 327.1L480.7 298.5L482.8 298.2Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M480.7 327.1L478.8 326.7L478.8 298.2L480.7 298.5Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M478.8 326.7L455.6 317.1L455.6 288.5L478.8 298.2ZM455.6 317.1L454.9 316.3L454.9 287.8L455.6 288.5Z\"/><path class=\"iso-top\" d=\"M456.9 286.7L458.9 286.4L460.9 286.8L484 296.4L484.8 297.2L483.8 297.9L482.8 298.2L480.7 298.5L478.8 298.2L455.6 288.5L454.9 287.8L455.8 287Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M484.8 297.2L483.8 297.9L482.8 298.2L480.7 298.5L478.8 298.2L455.6 288.5L454.9 287.8\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M454.9 287.8L455.8 287L456.9 286.7L458.9 286.4L460.9 286.8L484 296.4L484.8 297.2M484.8 325.7L483.8 326.4L482.8 326.8L480.7 327.1L478.8 326.7L455.6 317.1L454.9 316.3M484.8 297.2L484.8 325.7M454.9 287.8L454.9 316.3\"/></g><path class=\"cr-lens\" d=\"M464.6 306.6L464.5 305.1L464 303.5L463.4 302.1L462.5 300.8L461.5 299.8L460.5 299.2L459.4 298.9L458.4 299.1L457.6 299.6L456.9 300.5L456.5 301.7L456.4 303.2L456.5 304.7L456.9 306.2L457.6 307.7L458.4 309L459.4 309.9L460.5 310.6L461.5 310.8L462.5 310.7L463.4 310.1L464 309.2L464.5 308Z\"/><path class=\"iso-line\" data-tone=\"mid\" d=\"M464.6 306.6L464.5 305.1L464 303.5L463.4 302.1L462.5 300.8L461.5 299.8L460.5 299.2L459.4 298.9L458.4 299.1L457.6 299.6L456.9 300.5L456.5 301.7L456.4 303.2L456.5 304.7L456.9 306.2L457.6 307.7L458.4 309L459.4 309.9L460.5 310.6L461.5 310.8L462.5 310.7L463.4 310.1L464 309.2L464.5 308Z\"/><path class=\"cr-lens\" d=\"M477.9 312.1L477.8 310.6L477.4 309L476.7 307.6L475.9 306.3L474.9 305.3L473.8 304.7L472.7 304.5L471.7 304.6L470.9 305.2L470.2 306.1L469.8 307.3L469.7 308.7L469.8 310.2L470.2 311.8L470.9 313.2L471.7 314.5L472.7 315.5L473.8 316.1L474.9 316.4L475.9 316.2L476.7 315.7L477.4 314.8L477.8 313.5Z\"/><path class=\"iso-line\" data-tone=\"mid\" d=\"M477.9 312.1L477.8 310.6L477.4 309L476.7 307.6L475.9 306.3L474.9 305.3L473.8 304.7L472.7 304.5L471.7 304.6L470.9 305.2L470.2 306.1L469.8 307.3L469.7 308.7L469.8 310.2L470.2 311.8L470.9 313.2L471.7 314.5L472.7 315.5L473.8 316.1L474.9 316.4L475.9 316.2L476.7 315.7L477.4 314.8L477.8 313.5Z\"/><g class=\"iso-dots\" data-tone=\"lit\"><circle cx=\"467.1\" cy=\"316.2\" r=\"0.8\"/></g></g><g class=\"it\" data-name=\"stand.foot\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M341.1 621.1L341.2 620.2L342 619.4L343.5 618.7L345.5 618.2L347.8 618L350.2 618L352.4 618.4L354.2 618.9L355.5 619.7L356.1 620.5L356.1 635.9L356 636.8L355.2 637.6L353.7 638.3L351.7 638.8L349.4 639L347 639L344.8 638.6L343 638.1L341.7 637.3L341.1 636.5Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M356.1 635.9L356 636.8L356 621.4L356.1 620.5ZM356 636.8L355.2 637.6L355.2 622.2L356 621.4ZM355.2 637.6L353.7 638.3L353.7 622.9L355.2 622.2ZM353.7 638.3L351.7 638.8L351.7 623.4L353.7 622.9Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M351.7 638.8L349.4 639L349.4 623.6L351.7 623.4Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M349.4 639L347 639L347 623.6L349.4 623.6ZM347 639L344.8 638.6L344.8 623.3L347 623.6Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M344.8 638.6L343 638.1L343 622.7L344.8 623.3ZM343 638.1L341.7 637.3L341.7 622L343 622.7ZM341.7 637.3L341.1 636.5L341.1 621.1L341.7 622Z\"/><path class=\"iso-top\" d=\"M354.2 618.9L355.5 619.7L356.1 620.5L356 621.4L355.2 622.2L353.7 622.9L351.7 623.4L349.4 623.6L347 623.6L344.8 623.3L343 622.7L341.7 622L341.1 621.1L341.2 620.2L342 619.4L343.5 618.7L345.5 618.2L347.8 618L350.2 618L352.4 618.4Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M356.1 620.5L356 621.4L355.2 622.2L353.7 622.9L351.7 623.4L349.4 623.6L347 623.6L344.8 623.3L343 622.7L341.7 622L341.1 621.1\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M341.1 621.1L341.2 620.2L342 619.4L343.5 618.7L345.5 618.2L347.8 618L350.2 618L352.4 618.4L354.2 618.9L355.5 619.7L356.1 620.5M356.1 635.9L356 636.8L355.2 637.6L353.7 638.3L351.7 638.8L349.4 639L347 639L344.8 638.6L343 638.1L341.7 637.3L341.1 636.5M356.1 620.5L356.1 635.9M341.1 621.1L341.1 636.5\"/></g></g><g class=\"it\" data-name=\"deck\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M54.6 577.2L55 574.5L59 572.1L367 468.3L373.6 467L380.9 467.2L387.1 468.7L529.7 528L533 530.4L533 563.4L532.7 566.1L528.6 568.4L220.7 672.3L214.1 673.6L206.8 673.4L200.6 671.9L58 612.6L54.6 610.1Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M533 563.4L532.7 566.1L532.7 533.2L533 530.4ZM532.7 566.1L528.6 568.4L528.6 535.5L532.7 533.2ZM528.6 568.4L220.7 672.3L220.7 639.4L528.6 535.5Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M220.7 672.3L214.1 673.6L214.1 640.6L220.7 639.4Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M214.1 673.6L206.8 673.4L206.8 640.5L214.1 640.6Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M206.8 673.4L200.6 671.9L200.6 639L206.8 640.5ZM200.6 671.9L58 612.6L58 579.7L200.6 639ZM58 612.6L54.6 610.1L54.6 577.2L58 579.7Z\"/><path class=\"iso-top\" d=\"M367 468.3L373.6 467L380.9 467.2L387.1 468.7L529.7 528L533 530.4L532.7 533.2L528.6 535.5L220.7 639.4L214.1 640.6L206.8 640.5L200.6 639L58 579.7L54.6 577.2L55 574.5L59 572.1Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M533 530.4L532.7 533.2L528.6 535.5L220.7 639.4L214.1 640.6L206.8 640.5L200.6 639L58 579.7L54.6 577.2\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M533 530.4L531.3 533L527.6 535.2L219.9 639L213.8 640.1L207.2 640L201.5 638.6L59.2 579.4L54.6 577.2\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M533 552.4L532.7 555.2L528.6 557.5L220.7 661.3L214.1 662.6L206.8 662.5L200.6 661L58 601.6L54.6 599.2\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M54.6 577.2L55 574.5L59 572.1L367 468.3L373.6 467L380.9 467.2L387.1 468.7L529.7 528L533 530.4M533 563.4L532.7 566.1L528.6 568.4L220.7 672.3L214.1 673.6L206.8 673.4L200.6 671.9L58 612.6L54.6 610.1M533 530.4L533 563.4M54.6 577.2L54.6 610.1\"/></g></g><g class=\"it\" data-name=\"uprightR\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M324.9 270.4L335.9 263.6L342.8 266.5L381.5 468.6L370.6 475.4L363.6 472.5Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M381.5 468.6L370.6 475.4L331.8 273.3L342.8 266.5Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M370.6 475.4L363.6 472.5L324.9 270.4L331.8 273.3Z\"/><path class=\"iso-top\" d=\"M335.9 263.6L342.8 266.5L331.8 273.3L324.9 270.4Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M342.8 266.5L331.8 273.3M370.6 475.4L331.8 273.3M331.8 273.3L324.9 270.4\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M324.9 270.4L335.9 263.6L342.8 266.5L381.5 468.6L370.6 475.4L363.6 472.5Z\"/></g></g><g class=\"it\" data-name=\"hood\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M347.8 466.3L348.1 464.5L350.7 462.9L382.4 452.3L386.8 451.4L391.7 451.5L395.8 452.5L521 504.6L523.2 506.2L523.2 526L523 527.8L520.3 529.4L488.6 540.1L484.2 540.9L479.3 540.8L475.2 539.8L350 487.7L347.8 486.1Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M523.2 526L523 527.8L523 508.1L523.2 506.2ZM523 527.8L520.3 529.4L520.3 509.6L523 508.1ZM520.3 529.4L488.6 540.1L488.6 520.3L520.3 509.6Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M488.6 540.1L484.2 540.9L484.2 521.1L488.6 520.3Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M484.2 540.9L479.3 540.8L479.3 521L484.2 521.1Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M479.3 540.8L475.2 539.8L475.2 520L479.3 521ZM475.2 539.8L350 487.7L350 468L475.2 520ZM350 487.7L347.8 486.1L347.8 466.3L350 468Z\"/><path class=\"iso-top\" d=\"M382.4 452.3L386.8 451.4L391.7 451.5L395.8 452.5L521 504.6L523.2 506.2L523 508.1L520.3 509.6L488.6 520.3L484.2 521.1L479.3 521L475.2 520L350 468L347.8 466.3L348.1 464.5L350.7 462.9Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M523.2 506.2L523 508.1L520.3 509.6L488.6 520.3L484.2 521.1L479.3 521L475.2 520L350 468L347.8 466.3\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M523.2 506.2L521.6 507.9L519.2 509.3L487.8 519.9L483.9 520.6L479.8 520.5L476.1 519.6L351.2 467.7L347.8 466.3\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M347.8 466.3L348.1 464.5L350.7 462.9L382.4 452.3L386.8 451.4L391.7 451.5L395.8 452.5L521 504.6L523.2 506.2M523.2 526L523 527.8L520.3 529.4L488.6 540.1L484.2 540.9L479.3 540.8L475.2 539.8L350 487.7L347.8 486.1M523.2 506.2L523.2 526M347.8 466.3L347.8 486.1\"/></g><path class=\"iso-line\" data-tone=\"lo\" d=\"M397.6 462.3L399 462.1L400.3 462.4L400.3 462.4L400.8 462.9L400.2 463.4L381.8 469.5L380.5 469.7L379.2 469.5L379.2 469.5L378.7 469L379.3 468.5ZM416.6 470.2L418 470L419.3 470.3L419.3 470.3L419.8 470.8L419.2 471.3L400.9 477.4L399.5 477.6L398.2 477.4L398.2 477.4L397.7 476.9L398.3 476.4ZM435.6 478.1L437 477.9L438.3 478.2L438.3 478.2L438.8 478.7L438.2 479.2L419.9 485.3L418.5 485.5L417.2 485.3L417.2 485.3L416.7 484.8L417.3 484.3ZM454.7 486L456 485.9L457.3 486.1L457.3 486.1L457.8 486.6L457.2 487.1L438.9 493.3L437.5 493.4L436.2 493.2L436.2 493.2L435.7 492.7L436.4 492.2ZM473.7 493.9L475 493.8L476.4 494L476.4 494L476.8 494.5L476.2 495L457.9 501.2L456.5 501.4L455.2 501.1L455.2 501.1L454.8 500.6L455.4 500.1ZM492.7 501.9L494.1 501.7L495.4 501.9L495.4 501.9L495.9 502.4L495.2 502.9L476.9 509.1L475.6 509.3L474.2 509L474.2 509L473.8 508.5L474.4 508Z\"/></g><g class=\"it\" data-name=\"railR\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M204.9 301.1L205.1 299.9L206.8 298.9L338.8 254.4L341.5 253.9L344.6 254L347.1 254.6L348.7 255.3L350.1 256.3L350.1 269.4L349.9 270.6L348.3 271.6L216.3 316.1L213.6 316.6L210.5 316.5L207.9 315.9L206.3 315.3L204.9 314.2Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M350.1 269.4L349.9 270.6L349.9 257.4L350.1 256.3ZM349.9 270.6L348.3 271.6L348.3 258.4L349.9 257.4ZM348.3 271.6L216.3 316.1L216.3 302.9L348.3 258.4Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M216.3 316.1L213.6 316.6L213.6 303.4L216.3 302.9Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M213.6 316.6L210.5 316.5L210.5 303.4L213.6 303.4Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M210.5 316.5L207.9 315.9L207.9 302.7L210.5 303.4ZM207.9 315.9L206.3 315.3L206.3 302.1L207.9 302.7ZM206.3 315.3L204.9 314.2L204.9 301.1L206.3 302.1Z\"/><path class=\"iso-top\" d=\"M338.8 254.4L341.5 253.9L344.6 254L347.1 254.6L348.7 255.3L350.1 256.3L349.9 257.4L348.3 258.4L216.3 302.9L213.6 303.4L210.5 303.4L207.9 302.7L206.3 302.1L204.9 301.1L205.1 299.9L206.8 298.9Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M350.1 256.3L349.9 257.4L348.3 258.4L216.3 302.9L213.6 303.4L210.5 303.4L207.9 302.7L206.3 302.1L204.9 301.1\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M350.1 256.3L348.8 257.3L347.4 258.1L215.6 302.5L213.3 303L210.9 302.9L208.7 302.4L207.3 301.8L204.9 301.1\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M350.1 264.6L349.9 265.8L348.3 266.7L216.3 311.2L213.6 311.8L210.5 311.7L207.9 311.1L206.3 310.4L204.9 309.4\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M204.9 301.1L205.1 299.9L206.8 298.9L338.8 254.4L341.5 253.9L344.6 254L347.1 254.6L348.7 255.3L350.1 256.3M350.1 269.4L349.9 270.6L348.3 271.6L216.3 316.1L213.6 316.6L210.5 316.5L207.9 315.9L206.3 315.3L204.9 314.2M350.1 256.3L350.1 269.4M204.9 301.1L204.9 314.2\"/></g></g><g class=\"it\" data-name=\"deck.railR\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M49.5 570L50.2 569.4L330.1 475L331.8 474.8L333.4 475.1L365.1 488.3L365.7 488.9L365.7 494.6L364.9 495.2L85.1 589.6L83.4 589.8L81.8 589.6L50.1 576.4L49.5 575.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M365.7 494.6L364.9 495.2L364.9 489.5L365.7 488.9ZM364.9 495.2L85.1 589.6L85.1 583.9L364.9 489.5Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M85.1 589.6L83.4 589.8L83.4 584.1L85.1 583.9Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M83.4 589.8L81.8 589.6L81.8 583.8L83.4 584.1Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M81.8 589.6L50.1 576.4L50.1 570.7L81.8 583.8ZM50.1 576.4L49.5 575.7L49.5 570L50.1 570.7Z\"/><path class=\"iso-top\" d=\"M330.1 475L331.8 474.8L333.4 475.1L365.1 488.3L365.7 488.9L364.9 489.5L85.1 583.9L83.4 584.1L81.8 583.8L50.1 570.7L49.5 570L50.2 569.4Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M365.7 488.9L364.9 489.5L85.1 583.9L83.4 584.1L81.8 583.8L50.1 570.7L49.5 570\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M49.5 570L50.2 569.4L330.1 475L331.8 474.8L333.4 475.1L365.1 488.3L365.7 488.9M365.7 494.6L364.9 495.2L85.1 589.6L83.4 589.8L81.8 589.6L50.1 576.4L49.5 575.7M365.7 488.9L365.7 494.6M49.5 570L49.5 575.7\"/></g><path class=\"iso-line\" data-tone=\"lo\" d=\"M76.2 581.5L359.5 486M69.9 578.9L353.2 483.3M63.5 576.3L346.9 480.7M57.2 573.6L340.5 478.1\"/></g><g class=\"it\" data-name=\"railcapR\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M192.2 303.6L192.4 302.2L194.4 301.1L199.7 299.3L202.9 298.7L206.6 298.8L209.7 299.5L211.6 300.3L213.3 301.5L213.3 317.3L213.1 318.7L211.1 319.9L205.8 321.7L202.5 322.3L198.8 322.2L195.8 321.5L193.9 320.7L192.2 319.4Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M213.3 317.3L213.1 318.7L213.1 302.9L213.3 301.5ZM213.1 318.7L211.1 319.9L211.1 304.1L213.1 302.9ZM211.1 319.9L205.8 321.7L205.8 305.8L211.1 304.1Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M205.8 321.7L202.5 322.3L202.5 306.5L205.8 305.8Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M202.5 322.3L198.8 322.2L198.8 306.4L202.5 306.5Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M198.8 322.2L195.8 321.5L195.8 305.6L198.8 306.4ZM195.8 321.5L193.9 320.7L193.9 304.9L195.8 305.6ZM193.9 320.7L192.2 319.4L192.2 303.6L193.9 304.9Z\"/><path class=\"iso-top\" d=\"M199.7 299.3L202.9 298.7L206.6 298.8L209.7 299.5L211.6 300.3L213.3 301.5L213.1 302.9L211.1 304.1L205.8 305.8L202.5 306.5L198.8 306.4L195.8 305.6L193.9 304.9L192.2 303.6L192.4 302.2L194.4 301.1Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M213.3 301.5L213.1 302.9L211.1 304.1L205.8 305.8L202.5 306.5L198.8 306.4L195.8 305.6L193.9 304.9L192.2 303.6\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M192.2 303.6L192.4 302.2L194.4 301.1L199.7 299.3L202.9 298.7L206.6 298.8L209.7 299.5L211.6 300.3L213.3 301.5M213.3 317.3L213.1 318.7L211.1 319.9L205.8 321.7L202.5 322.3L198.8 322.2L195.8 321.5L193.9 320.7L192.2 319.4M213.3 301.5L213.3 317.3M192.2 303.6L192.2 319.4\"/></g><g class=\"iso-dots\" data-tone=\"mid\"><circle cx=\"197.9\" cy=\"302.5\" r=\"0.55\"/><circle cx=\"202.3\" cy=\"304.4\" r=\"0.55\"/></g></g><g class=\"it\" data-name=\"console.stalk\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M330.5 227.3L330.9 226.9L331.6 226.5L332.7 226.2L334 226.2L335.3 226.3L336.3 226.6L337 227L337.2 227.5L337.2 259.7L336.8 260.2L336.1 260.6L335 260.8L333.7 260.9L332.4 260.8L331.4 260.5L330.7 260.1L330.5 259.6Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M337.2 259.7L336.8 260.2L336.8 227.9L337.2 227.5ZM336.8 260.2L336.1 260.6L336.1 228.3L336.8 227.9ZM336.1 260.6L335 260.8L335 228.6L336.1 228.3Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M335 260.8L333.7 260.9L333.7 228.6L335 228.6Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M333.7 260.9L332.4 260.8L332.4 228.5L333.7 228.6Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M332.4 260.8L331.4 260.5L331.4 228.2L332.4 228.5ZM331.4 260.5L330.7 260.1L330.7 227.8L331.4 228.2ZM330.7 260.1L330.5 259.6L330.5 227.3L330.7 227.8Z\"/><path class=\"iso-top\" d=\"M336.3 226.6L337 227L337.2 227.5L336.8 227.9L336.1 228.3L335 228.6L333.7 228.6L332.4 228.5L331.4 228.2L330.7 227.8L330.5 227.3L330.9 226.9L331.6 226.5L332.7 226.2L334 226.2L335.3 226.3Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M337.2 227.5L336.8 227.9L336.1 228.3L335 228.6L333.7 228.6L332.4 228.5L331.4 228.2L330.7 227.8L330.5 227.3\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M330.5 227.3L330.9 226.9L331.6 226.5L332.7 226.2L334 226.2L335.3 226.3L336.3 226.6L337 227L337.2 227.5M337.2 259.7L336.8 260.2L336.1 260.6L335 260.8L333.7 260.9L332.4 260.8L331.4 260.5L330.7 260.1L330.5 259.6M337.2 227.5L337.2 259.7M330.5 227.3L330.5 259.6\"/></g></g><g class=\"it\" data-name=\"belt\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M78.5 587.6L78.9 587.3L365.8 490.5L366.7 490.4L367.5 490.6L457.8 528.2L458.1 528.5L458.1 532.9L457.7 533.2L170.8 629.9L170 630L169.2 629.9L78.9 592.3L78.5 592Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M458.1 532.9L457.7 533.2L457.7 528.8L458.1 528.5ZM457.7 533.2L170.8 629.9L170.8 625.5L457.7 528.8Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M170.8 629.9L170 630L170 625.7L170.8 625.5Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M170 630L169.2 629.9L169.2 625.5L170 625.7Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M169.2 629.9L78.9 592.3L78.9 587.9L169.2 625.5ZM78.9 592.3L78.5 592L78.5 587.6L78.9 587.9Z\"/><path class=\"iso-top\" d=\"M365.8 490.5L366.7 490.4L367.5 490.6L457.8 528.2L458.1 528.5L457.7 528.8L170.8 625.5L170 625.7L169.2 625.5L78.9 587.9L78.5 587.6L78.9 587.3Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M458.1 528.5L457.7 528.8L170.8 625.5L170 625.7L169.2 625.5L78.9 587.9L78.5 587.6\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M78.5 587.6L78.9 587.3L365.8 490.5L366.7 490.4L367.5 490.6L457.8 528.2L458.1 528.5M458.1 532.9L457.7 533.2L170.8 629.9L170 630L169.2 629.9L78.9 592.3L78.5 592M458.1 528.5L458.1 532.9M78.5 587.6L78.5 592\"/></g><path class=\"cr-slats iso-line\" data-tone=\"faint\" data-part=\"slats\" d=\"\"/><g data-part=\"marks\"></g></g><g class=\"it\" data-name=\"console\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M307.7 232.9L318.7 195L322 195.5L360 211.3L349 249.3L345.7 248.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M349 249.3L360 211.3L356.8 210.8L345.7 248.7Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M360 211.3L322 195.5L318.7 195L356.8 210.8Z\"/><path class=\"iso-top\" d=\"M307.7 232.9L345.7 248.7L356.8 210.8L318.7 195Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M345.7 248.7L356.8 210.8M360 211.3L356.8 210.8M356.8 210.8L318.7 195\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M307.7 232.9L318.7 195L322 195.5L360 211.3L349 249.3L345.7 248.7Z\"/></g><g transform=\"matrix(1.5846 0.6593 -0.6593 2.2582 318.17 196.77)\"><rect class=\"cr-screen\" x=\"0.8\" y=\"0.8\" width=\"22.4\" height=\"13.6\" rx=\"0.8\"/><text class=\"cr-digits\" data-part=\"cadence\" x=\"12\" y=\"10.4\" font-size=\"8\" text-anchor=\"middle\">165</text><text class=\"cr-unit\" x=\"12\" y=\"13.4\" font-size=\"2.2\" text-anchor=\"middle\">steps/min</text></g></g><g class=\"it\" data-name=\"gauge.base\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M144.2 541.2L144.3 540.2L145.1 539.3L146.3 538.4L148.1 537.7L150.2 537.1L152.7 536.7L155.3 536.5L158 536.6L160.5 536.9L162.8 537.3L164.8 538L166.4 538.8L167.4 539.7L167.8 540.7L167.8 544.2L167.7 545.2L167 546.2L165.7 547L163.9 547.8L161.8 548.3L159.3 548.7L156.7 548.9L154.1 548.8L151.5 548.6L149.2 548.1L147.2 547.4L145.7 546.6L144.6 545.7L144.2 544.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M167.8 544.2L167.7 545.2L167.7 541.7L167.8 540.7ZM167.7 545.2L167 546.2L167 542.6L167.7 541.7ZM167 546.2L165.7 547L165.7 543.5L167 542.6ZM165.7 547L163.9 547.8L163.9 544.3L165.7 543.5ZM163.9 547.8L161.8 548.3L161.8 544.8L163.9 544.3Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M161.8 548.3L159.3 548.7L159.3 545.2L161.8 544.8ZM159.3 548.7L156.7 548.9L156.7 545.4L159.3 545.2Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M156.7 548.9L154.1 548.8L154.1 545.3L156.7 545.4ZM154.1 548.8L151.5 548.6L151.5 545.1L154.1 545.3ZM151.5 548.6L149.2 548.1L149.2 544.6L151.5 545.1Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M149.2 548.1L147.2 547.4L147.2 543.9L149.2 544.6ZM147.2 547.4L145.7 546.6L145.7 543.1L147.2 543.9ZM145.7 546.6L144.6 545.7L144.6 542.2L145.7 543.1ZM144.6 545.7L144.2 544.7L144.2 541.2L144.6 542.2Z\"/><path class=\"iso-top\" d=\"M164.8 538L166.4 538.8L167.4 539.7L167.8 540.7L167.7 541.7L167 542.6L165.7 543.5L163.9 544.3L161.8 544.8L159.3 545.2L156.7 545.4L154.1 545.3L151.5 545.1L149.2 544.6L147.2 543.9L145.7 543.1L144.6 542.2L144.2 541.2L144.3 540.2L145.1 539.3L146.3 538.4L148.1 537.7L150.2 537.1L152.7 536.7L155.3 536.5L158 536.6L160.5 536.9L162.8 537.3Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M167.8 540.7L167.7 541.7L167 542.6L165.7 543.5L163.9 544.3L161.8 544.8L159.3 545.2L156.7 545.4L154.1 545.3L151.5 545.1L149.2 544.6L147.2 543.9L145.7 543.1L144.6 542.2L144.2 541.2\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M144.2 541.2L144.3 540.2L145.1 539.3L146.3 538.4L148.1 537.7L150.2 537.1L152.7 536.7L155.3 536.5L158 536.6L160.5 536.9L162.8 537.3L164.8 538L166.4 538.8L167.4 539.7L167.8 540.7M167.8 544.2L167.7 545.2L167 546.2L165.7 547L163.9 547.8L161.8 548.3L159.3 548.7L156.7 548.9L154.1 548.8L151.5 548.6L149.2 548.1L147.2 547.4L145.7 546.6L144.6 545.7L144.2 544.7M167.8 540.7L167.8 544.2M144.2 541.2L144.2 544.7\"/></g></g><g class=\"it\" data-name=\"gauge.post\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M150.1 308.5L150.7 308L155 306.6L156.3 306.4L157.6 306.7L161.4 308.3L161.9 308.8L161.9 541.1L161.3 541.6L157.1 543L155.7 543.2L154.4 542.9L150.6 541.4L150.1 540.8Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M161.9 541.1L161.3 541.6L161.3 309.3L161.9 308.8ZM161.3 541.6L157.1 543L157.1 310.7L161.3 309.3Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M157.1 543L155.7 543.2L155.7 310.9L157.1 310.7Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M155.7 543.2L154.4 542.9L154.4 310.6L155.7 310.9Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M154.4 542.9L150.6 541.4L150.6 309L154.4 310.6ZM150.6 541.4L150.1 540.8L150.1 308.5L150.6 309Z\"/><path class=\"iso-top\" d=\"M155 306.6L156.3 306.4L157.6 306.7L161.4 308.3L161.9 308.8L161.3 309.3L157.1 310.7L155.7 310.9L154.4 310.6L150.6 309L150.1 308.5L150.7 308Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M161.9 308.8L161.3 309.3L157.1 310.7L155.7 310.9L154.4 310.6L150.6 309L150.1 308.5\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M150.1 308.5L150.7 308L155 306.6L156.3 306.4L157.6 306.7L161.4 308.3L161.9 308.8M161.9 541.1L161.3 541.6L157.1 543L155.7 543.2L154.4 542.9L150.6 541.4L150.1 540.8M161.9 308.8L161.9 541.1M150.1 308.5L150.1 540.8\"/></g></g><g class=\"it\" data-name=\"stand.foot\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M29.2 621.3L29.3 620.4L30.1 619.6L31.6 618.9L33.6 618.4L35.9 618.2L38.3 618.2L40.5 618.5L42.3 619.1L43.6 619.8L44.2 620.7L44.2 636L44.1 636.9L43.3 637.8L41.8 638.5L39.8 638.9L37.5 639.2L35.1 639.1L32.9 638.8L31.1 638.2L29.8 637.5L29.2 636.6Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M44.2 636L44.1 636.9L44.1 621.6L44.2 620.7ZM44.1 636.9L43.3 637.8L43.3 622.4L44.1 621.6ZM43.3 637.8L41.8 638.5L41.8 623.1L43.3 622.4ZM41.8 638.5L39.8 638.9L39.8 623.6L41.8 623.1Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M39.8 638.9L37.5 639.2L37.5 623.8L39.8 623.6Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M37.5 639.2L35.1 639.1L35.1 623.8L37.5 623.8ZM35.1 639.1L32.9 638.8L32.9 623.4L35.1 623.8Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M32.9 638.8L31.1 638.2L31.1 622.9L32.9 623.4ZM31.1 638.2L29.8 637.5L29.8 622.1L31.1 622.9ZM29.8 637.5L29.2 636.6L29.2 621.3L29.8 622.1Z\"/><path class=\"iso-top\" d=\"M42.3 619.1L43.6 619.8L44.2 620.7L44.1 621.6L43.3 622.4L41.8 623.1L39.8 623.6L37.5 623.8L35.1 623.8L32.9 623.4L31.1 622.9L29.8 622.1L29.2 621.3L29.3 620.4L30.1 619.6L31.6 618.9L33.6 618.4L35.9 618.2L38.3 618.2L40.5 618.5Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M44.2 620.7L44.1 621.6L43.3 622.4L41.8 623.1L39.8 623.6L37.5 623.8L35.1 623.8L32.9 623.4L31.1 622.9L29.8 622.1L29.2 621.3\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M29.2 621.3L29.3 620.4L30.1 619.6L31.6 618.9L33.6 618.4L35.9 618.2L38.3 618.2L40.5 618.5L42.3 619.1L43.6 619.8L44.2 620.7M44.2 636L44.1 636.9L43.3 637.8L41.8 638.5L39.8 638.9L37.5 639.2L35.1 639.1L32.9 638.8L31.1 638.2L29.8 637.5L29.2 636.6M44.2 620.7L44.2 636M29.2 621.3L29.2 636.6\"/></g></g><g class=\"it\" data-name=\"gauge.scale\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M151.6 325.9L151.6 325.7L166.7 320.6L167.4 320.6L168.1 320.9L168.1 362.6L168 362.8L152.9 367.9L152.2 367.9L151.6 367.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M168.1 362.6L168 362.8L168 321.1L168.1 320.9ZM168 362.8L152.9 367.9L152.9 326.2L168 321.1Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M152.9 367.9L152.2 367.9L152.2 326.2L152.9 326.2Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M152.2 367.9L151.6 367.7L151.6 325.9L152.2 326.2Z\"/><path class=\"iso-top\" d=\"M166.7 320.6L167.4 320.6L168.1 320.9L168 321.1L152.9 326.2L152.2 326.2L151.6 325.9L151.6 325.7Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M168.1 320.9L168 321.1L152.9 326.2L152.2 326.2L151.6 325.9\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M151.6 325.9L151.6 325.7L166.7 320.6L167.4 320.6L168.1 320.9M168.1 362.6L168 362.8L152.9 367.9L152.2 367.9L151.6 367.7M168.1 320.9L168.1 362.6M151.6 325.9L151.6 367.7\"/></g><path class=\"iso-line\" data-tone=\"lo\" d=\"M153.4 365.6L157 364.4M153.4 363.4L157 362.2M153.4 359L157 357.8M153.4 356.8L157 355.6M153.4 354.6L157 353.4M153.4 352.4L157 351.2M153.4 348L157 346.8M153.4 345.8L157 344.6M153.4 343.6L157 342.4M153.4 341.4L157 340.2M153.4 337L157 335.9M153.4 334.8L157 333.7M153.4 332.6L157 331.5M153.4 330.5L157 329.3\"/><path class=\"iso-line\" data-tone=\"mid\" d=\"M153.4 361.2L159.4 359.2M153.4 350.2L159.4 348.2M153.4 339.2L159.4 337.2M153.4 328.3L159.4 326.2\"/></g><g class=\"it\" data-name=\"deck.capR\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M13.1 584.9L13.5 582.6L16.8 580.7L39.7 573L45.1 571.9L51.3 572L56.4 573.3L75.4 581.2L78.2 583.3L78.2 621.9L77.9 624.2L74.5 626.1L51.7 633.8L46.2 634.9L40.1 634.8L34.9 633.5L15.9 625.6L13.1 623.5Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M78.2 621.9L77.9 624.2L77.9 585.5L78.2 583.3ZM77.9 624.2L74.5 626.1L74.5 587.5L77.9 585.5ZM74.5 626.1L51.7 633.8L51.7 595.2L74.5 587.5Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M51.7 633.8L46.2 634.9L46.2 596.2L51.7 595.2Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M46.2 634.9L40.1 634.8L40.1 596.1L46.2 596.2Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M40.1 634.8L34.9 633.5L34.9 594.9L40.1 596.1ZM34.9 633.5L15.9 625.6L15.9 586.9L34.9 594.9ZM15.9 625.6L13.1 623.5L13.1 584.9L15.9 586.9Z\"/><path class=\"iso-top\" d=\"M39.7 573L45.1 571.9L51.3 572L56.4 573.3L75.4 581.2L78.2 583.3L77.9 585.5L74.5 587.5L51.7 595.2L46.2 596.2L40.1 596.1L34.9 594.9L15.9 586.9L13.1 584.9L13.5 582.6L16.8 580.7Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M78.2 583.3L77.9 585.5L74.5 587.5L51.7 595.2L46.2 596.2L40.1 596.1L34.9 594.9L15.9 586.9L13.1 584.9\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M78.2 583.3L76.5 585.4L73.5 587.1L50.9 594.8L45.9 595.7L40.5 595.6L35.9 594.5L17.1 586.6L13.1 584.9\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M13.1 584.9L13.5 582.6L16.8 580.7L39.7 573L45.1 571.9L51.3 572L56.4 573.3L75.4 581.2L78.2 583.3M78.2 621.9L77.9 624.2L74.5 626.1L51.7 633.8L46.2 634.9L40.1 634.8L34.9 633.5L15.9 625.6L13.1 623.5M78.2 583.3L78.2 621.9M13.1 584.9L13.1 623.5\"/></g></g><g class=\"it\" data-name=\"deck.railL\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M176.2 622.8L177 622.1L456.8 527.8L458.5 527.5L460.2 527.8L491.9 541L492.5 541.7L492.5 547.4L491.7 548L211.9 642.4L210.2 642.6L208.5 642.3L176.8 629.1L176.2 628.5Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M492.5 547.4L491.7 548L491.7 542.3L492.5 541.7ZM491.7 548L211.9 642.4L211.9 636.7L491.7 542.3Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M211.9 642.4L210.2 642.6L210.2 636.9L211.9 636.7Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M210.2 642.6L208.5 642.3L208.5 636.6L210.2 636.9Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M208.5 642.3L176.8 629.1L176.8 623.4L208.5 636.6ZM176.8 629.1L176.2 628.5L176.2 622.8L176.8 623.4Z\"/><path class=\"iso-top\" d=\"M456.8 527.8L458.5 527.5L460.2 527.8L491.9 541L492.5 541.7L491.7 542.3L211.9 636.7L210.2 636.9L208.5 636.6L176.8 623.4L176.2 622.8L177 622.1Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M492.5 541.7L491.7 542.3L211.9 636.7L210.2 636.9L208.5 636.6L176.8 623.4L176.2 622.8\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M176.2 622.8L177 622.1L456.8 527.8L458.5 527.5L460.2 527.8L491.9 541L492.5 541.7M492.5 547.4L491.7 548L211.9 642.4L210.2 642.6L208.5 642.3L176.8 629.1L176.2 628.5M492.5 541.7L492.5 547.4M176.2 622.8L176.2 628.5\"/></g><path class=\"iso-line\" data-tone=\"lo\" d=\"M182.4 625.7L465.7 530.1M188.7 628.3L472.1 532.8M195.1 631L478.4 535.4M201.4 633.6L484.7 538\"/></g><g class=\"it\" data-name=\"gauge.cap\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M149.4 305.8L149.5 305.1L150.3 304.3L151.6 303.7L153.3 303.3L155.3 303.1L157.4 303.2L159.3 303.4L160.9 303.9L162.1 304.6L162.6 305.3L162.6 308.4L162.5 309.2L161.8 309.9L160.4 310.5L158.7 310.9L156.7 311.1L154.6 311.1L152.7 310.8L151.1 310.3L150 309.7L149.4 308.9Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M162.6 308.4L162.5 309.2L162.5 306.1L162.6 305.3ZM162.5 309.2L161.8 309.9L161.8 306.8L162.5 306.1ZM161.8 309.9L160.4 310.5L160.4 307.4L161.8 306.8ZM160.4 310.5L158.7 310.9L158.7 307.8L160.4 307.4Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M158.7 310.9L156.7 311.1L156.7 308.1L158.7 307.8Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M156.7 311.1L154.6 311.1L154.6 308L156.7 308.1ZM154.6 311.1L152.7 310.8L152.7 307.7L154.6 308Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M152.7 310.8L151.1 310.3L151.1 307.2L152.7 307.7ZM151.1 310.3L150 309.7L150 306.6L151.1 307.2ZM150 309.7L149.4 308.9L149.4 305.8L150 306.6Z\"/><path class=\"iso-top\" d=\"M160.9 303.9L162.1 304.6L162.6 305.3L162.5 306.1L161.8 306.8L160.4 307.4L158.7 307.8L156.7 308.1L154.6 308L152.7 307.7L151.1 307.2L150 306.6L149.4 305.8L149.5 305.1L150.3 304.3L151.6 303.7L153.3 303.3L155.3 303.1L157.4 303.2L159.3 303.4Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M162.6 305.3L162.5 306.1L161.8 306.8L160.4 307.4L158.7 307.8L156.7 308.1L154.6 308L152.7 307.7L151.1 307.2L150 306.6L149.4 305.8\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M149.4 305.8L149.5 305.1L150.3 304.3L151.6 303.7L153.3 303.3L155.3 303.1L157.4 303.2L159.3 303.4L160.9 303.9L162.1 304.6L162.6 305.3M162.6 308.4L162.5 309.2L161.8 309.9L160.4 310.5L158.7 310.9L156.7 311.1L154.6 311.1L152.7 310.8L151.1 310.3L150 309.7L149.4 308.9M162.6 305.3L162.6 308.4M149.4 305.8L149.4 308.9\"/></g></g><g class=\"it\" data-name=\"roller\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M52.6 614.2L52.6 612.8L52.8 611.4L53 609.9L53.4 608.5L53.8 607.1L54.2 605.7L54.8 604.3L55.4 602.9L56.1 601.6L56.8 600.4L57.6 599.1L58.5 598L59.4 596.9L60.3 595.9L61.3 594.9L62.4 594L63.4 593.3L64.5 592.6L65.6 592L66.7 591.5L67.8 591.1L68.9 590.8L70 590.6L71.1 590.5L72.1 590.5L73.2 590.6L74.2 590.9L75.1 591.2L167 629.4L168 629.9L168.9 630.4L169.7 631L170.5 631.8L171.2 632.6L171.8 633.5L172.4 634.4L172.9 635.5L173.4 636.6L173.7 637.8L174 639L174.2 640.3L174.3 641.7L174.4 643L174.3 644.4L174.2 645.8L174 647.2L173.7 648.7L173.4 650.1L172.9 651.5L172.4 652.9L171.8 654.3L171.2 655.6L170.5 656.9L169.7 658.2L168.9 659.3L168 660.5L167 661.5L166.1 662.5L165.1 663.4L164 664.3L163 665L161.9 665.6L160.8 666.2L159.7 666.6L158.6 667L157.5 667.2L156.4 667.4L155.3 667.4L154.3 667.3L153.2 667.1L152.2 666.9L151.3 666.5L59.4 628.2L58.5 627.8L57.6 627.2L56.8 626.5L56.1 625.7L55.4 624.9L54.8 623.9L54.2 622.9L53.8 621.8L53.4 620.7L53 619.5L52.8 618.2L52.6 616.9L52.6 615.6Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M146.4 661.6L147.6 663.5L149 665L150.7 666.2L152.6 667L60.7 628.7L58.8 627.9L57.1 626.8L55.7 625.2L54.5 623.4ZM159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L174.4 643L174.2 645.8L173.7 648.6L173 651.4L171.9 654.2L170.5 656.8L169 659.2L167.2 661.4L165.3 663.3L163.2 664.8L161 666.1L158.9 666.9L156.7 667.3L154.6 667.4L152.6 667L150.7 666.2L149 665L147.6 663.5L146.4 661.6L145.4 659.4L144.8 657L144.5 654.5L144.5 651.7L144.8 648.9L145.4 646.1L146.4 643.3L147.6 640.7L149 638.1L150.7 635.8L152.6 633.8L154.6 632L156.7 630.6L158.9 629.6L161 629L163.2 628.7L165.3 628.9L167.2 629.5L169 630.5L170.5 631.9L171.9 633.6L173 635.6L173.7 637.9L174.2 640.4L174.4 643Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M145.4 659.4L146.4 661.6L54.5 623.4L53.5 621.2Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M144.5 654.5L144.8 657L145.4 659.4L53.5 621.2L52.9 618.8L52.6 616.2Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M167.2 629.5L165.3 628.9L163.2 628.7L71.3 590.5L73.4 590.7L75.3 591.3ZM144.8 648.9L144.5 651.7L144.5 654.5L52.6 616.2L52.6 613.5L52.9 610.7Z\"/><path class=\"iso-top\" d=\"M163.2 628.7L161 629L158.9 629.6L156.7 630.6L154.6 632L152.6 633.8L150.7 635.8L149 638.1L147.6 640.7L146.4 643.3L145.4 646.1L144.8 648.9L52.9 610.7L53.5 607.9L54.5 605.1L55.7 602.4L57.1 599.9L58.8 597.6L60.7 595.5L62.7 593.8L64.8 592.4L67 591.4L69.1 590.7L71.3 590.5Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M167.1 629.5L166.2 629.1L165.2 628.9L164.2 628.8L163.1 628.7L162.1 628.8L161 629L159.9 629.3L158.8 629.6L157.7 630.1L156.6 630.7L155.6 631.3L154.5 632.1L153.5 632.9L152.5 633.8L151.6 634.8L150.6 635.9L149.8 637L149 638.2L148.2 639.4L147.5 640.7L146.9 642.1L146.3 643.4L145.8 644.8L145.4 646.2L145.1 647.6L144.8 649L144.6 650.4L144.5 651.8L144.4 653.2L144.5 654.5L144.6 655.9L144.8 657.1L145.1 658.4L145.5 659.5L145.9 660.6L146.4 661.7L147 662.6L147.6 663.5L148.3 664.3L149.1 665L149.9 665.7L150.8 666.2L151.7 666.6\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M52.6 614.2L52.6 612.8L52.8 611.4L53 609.9L53.4 608.5L53.8 607.1L54.2 605.7L54.8 604.3L55.4 602.9L56.1 601.6L56.8 600.4L57.6 599.1L58.5 598L59.4 596.9L60.3 595.9L61.3 594.9L62.4 594L63.4 593.3L64.5 592.6L65.6 592L66.7 591.5L67.8 591.1L68.9 590.8L70 590.6L71.1 590.5L72.1 590.5L73.2 590.6L74.2 590.9L75.1 591.2L167 629.4L168 629.9L168.9 630.4L169.7 631L170.5 631.8L171.2 632.6L171.8 633.5L172.4 634.4L172.9 635.5L173.4 636.6L173.7 637.8L174 639L174.2 640.3L174.3 641.7L174.4 643L174.3 644.4L174.2 645.8L174 647.2L173.7 648.7L173.4 650.1L172.9 651.5L172.4 652.9L171.8 654.3L171.2 655.6L170.5 656.9L169.7 658.2L168.9 659.3L168 660.5L167 661.5L166.1 662.5L165.1 663.4L164 664.3L163 665L161.9 665.6L160.8 666.2L159.7 666.6L158.6 667L157.5 667.2L156.4 667.4L155.3 667.4L154.3 667.3L153.2 667.1L152.2 666.9L151.3 666.5L59.4 628.2L58.5 627.8L57.6 627.2L56.8 626.5L56.1 625.7L55.4 624.9L54.8 623.9L54.2 622.9L53.8 621.8L53.4 620.7L53 619.5L52.8 618.2L52.6 616.9L52.6 615.6Z\"/></g></g><g class=\"it\" data-name=\"stand.foot\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M168.6 679.3L168.7 678.4L169.6 677.6L171.1 676.9L173.1 676.4L175.3 676.2L177.7 676.2L179.9 676.5L181.8 677.1L183.1 677.8L183.7 678.7L183.7 694.1L183.5 695L182.7 695.8L181.2 696.5L179.2 697L176.9 697.2L174.6 697.1L172.3 696.8L170.5 696.3L169.2 695.5L168.6 694.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M183.7 694.1L183.5 695L183.5 679.6L183.7 678.7ZM183.5 695L182.7 695.8L182.7 680.4L183.5 679.6ZM182.7 695.8L181.2 696.5L181.2 681.1L182.7 680.4ZM181.2 696.5L179.2 697L179.2 681.6L181.2 681.1Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M179.2 697L176.9 697.2L176.9 681.8L179.2 681.6Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M176.9 697.2L174.6 697.1L174.6 681.8L176.9 681.8ZM174.6 697.1L172.3 696.8L172.3 681.5L174.6 681.8Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M172.3 696.8L170.5 696.3L170.5 680.9L172.3 681.5ZM170.5 696.3L169.2 695.5L169.2 680.1L170.5 680.9ZM169.2 695.5L168.6 694.7L168.6 679.3L169.2 680.1Z\"/><path class=\"iso-top\" d=\"M181.8 677.1L183.1 677.8L183.7 678.7L183.5 679.6L182.7 680.4L181.2 681.1L179.2 681.6L176.9 681.8L174.6 681.8L172.3 681.5L170.5 680.9L169.2 680.1L168.6 679.3L168.7 678.4L169.6 677.6L171.1 676.9L173.1 676.4L175.3 676.2L177.7 676.2L179.9 676.5Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M183.7 678.7L183.5 679.6L182.7 680.4L181.2 681.1L179.2 681.6L176.9 681.8L174.6 681.8L172.3 681.5L170.5 680.9L169.2 680.1L168.6 679.3\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M168.6 679.3L168.7 678.4L169.6 677.6L171.1 676.9L173.1 676.4L175.3 676.2L177.7 676.2L179.9 676.5L181.8 677.1L183.1 677.8L183.7 678.7M183.7 694.1L183.5 695L182.7 695.8L181.2 696.5L179.2 697L176.9 697.2L174.6 697.1L172.3 696.8L170.5 696.3L169.2 695.5L168.6 694.7M183.7 678.7L183.7 694.1M168.6 679.3L168.6 694.7\"/></g></g><g class=\"it\" data-name=\"deck.capL\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M139.9 637.6L140.2 635.4L143.6 633.4L166.4 625.7L171.9 624.7L178 624.8L183.2 626L202.2 633.9L205 636L205 674.6L204.6 676.9L201.3 678.9L178.4 686.6L173 687.6L166.8 687.5L161.7 686.2L142.7 678.3L139.9 676.3Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M205 674.6L204.6 676.9L204.6 638.3L205 636ZM204.6 676.9L201.3 678.9L201.3 640.2L204.6 638.3ZM201.3 678.9L178.4 686.6L178.4 647.9L201.3 640.2Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M178.4 686.6L173 687.6L173 649L178.4 647.9Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M173 687.6L166.8 687.5L166.8 648.9L173 649Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M166.8 687.5L161.7 686.2L161.7 647.6L166.8 648.9ZM161.7 686.2L142.7 678.3L142.7 639.7L161.7 647.6ZM142.7 678.3L139.9 676.3L139.9 637.6L142.7 639.7Z\"/><path class=\"iso-top\" d=\"M166.4 625.7L171.9 624.7L178 624.8L183.2 626L202.2 633.9L205 636L204.6 638.3L201.3 640.2L178.4 647.9L173 649L166.8 648.9L161.7 647.6L142.7 639.7L139.9 637.6L140.2 635.4L143.6 633.4Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M205 636L204.6 638.3L201.3 640.2L178.4 647.9L173 649L166.8 648.9L161.7 647.6L142.7 639.7L139.9 637.6\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M205 636L203.3 638.1L200.2 639.9L177.6 647.5L172.7 648.5L167.3 648.3L162.6 647.2L143.9 639.4L139.9 637.6\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M139.9 637.6L140.2 635.4L143.6 633.4L166.4 625.7L171.9 624.7L178 624.8L183.2 626L202.2 633.9L205 636M205 674.6L204.6 676.9L201.3 678.9L178.4 686.6L173 687.6L166.8 687.5L161.7 686.2L142.7 678.3L139.9 676.3M205 636L205 674.6M139.9 637.6L139.9 676.3\"/></g><g class=\"iso-dots\" data-tone=\"mid\"><circle cx=\"180.2\" cy=\"672.8\" r=\"0.6\"/><circle cx=\"194.3\" cy=\"668.1\" r=\"0.6\"/></g><path class=\"iso-line\" data-tone=\"lo\" d=\"M183 671.9L182.9 671L182.7 670.2L182.2 669.7L181.6 669.3L180.9 669.2L180.2 669.3L179.5 669.7L178.8 670.3L178.2 671L177.8 671.9L177.5 672.8L177.4 673.8L177.5 674.6L177.8 675.4L178.2 676L178.8 676.3L179.5 676.5L180.2 676.3L180.9 676L181.6 675.4L182.2 674.6L182.7 673.8L182.9 672.8ZM197.1 667.1L197 666.2L196.7 665.5L196.3 664.9L195.7 664.6L195 664.4L194.3 664.6L193.6 664.9L192.9 665.5L192.3 666.3L191.9 667.1L191.6 668.1L191.5 669L191.6 669.9L191.9 670.7L192.3 671.2L192.9 671.6L193.6 671.7L194.3 671.6L195 671.2L195.7 670.6L196.3 669.9L196.7 669L197 668.1Z\"/></g><g data-part=\"gauge\"></g><g data-part=\"rider\"></g><g data-part=\"runner\"></g><g class=\"it\" data-name=\"front.uprightL\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M475.4 333L486.4 326.2L493.4 329.1L532.1 531.3L521.1 538L514.1 535.1Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M532.1 531.3L521.1 538L482.4 335.9L493.4 329.1Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M521.1 538L514.1 535.1L475.4 333L482.4 335.9Z\"/><path class=\"iso-top\" d=\"M486.4 326.2L493.4 329.1L482.4 335.9L475.4 333Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M493.4 329.1L482.4 335.9M521.1 538L482.4 335.9M482.4 335.9L475.4 333\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M475.4 333L486.4 326.2L493.4 329.1L532.1 531.3L521.1 538L514.1 535.1Z\"/></g></g><g class=\"it\" data-name=\"front.railL\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M355.5 363.7L355.6 362.5L357.3 361.6L489.3 317.1L492 316.5L495.1 316.6L497.7 317.2L499.3 317.9L500.6 318.9L500.6 332.1L500.5 333.2L498.8 334.2L366.8 378.7L364.1 379.2L361 379.2L358.5 378.5L356.9 377.9L355.5 376.9Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M500.6 332.1L500.5 333.2L500.5 320.1L500.6 318.9ZM500.5 333.2L498.8 334.2L498.8 321L500.5 320.1ZM498.8 334.2L366.8 378.7L366.8 365.5L498.8 321Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M366.8 378.7L364.1 379.2L364.1 366.1L366.8 365.5Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M364.1 379.2L361 379.2L361 366L364.1 366.1Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M361 379.2L358.5 378.5L358.5 365.4L361 366ZM358.5 378.5L356.9 377.9L356.9 364.7L358.5 365.4ZM356.9 377.9L355.5 376.9L355.5 363.7L356.9 364.7Z\"/><path class=\"iso-top\" d=\"M489.3 317.1L492 316.5L495.1 316.6L497.7 317.2L499.3 317.9L500.6 318.9L500.5 320.1L498.8 321L366.8 365.5L364.1 366.1L361 366L358.5 365.4L356.9 364.7L355.5 363.7L355.6 362.5L357.3 361.6Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M500.6 318.9L500.5 320.1L498.8 321L366.8 365.5L364.1 366.1L361 366L358.5 365.4L356.9 364.7L355.5 363.7\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M500.6 318.9L499.4 319.9L497.9 320.7L366.2 365.2L363.8 365.6L361.4 365.6L359.2 365L357.9 364.5L355.5 363.7\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M500.6 327.2L500.5 328.4L498.8 329.4L366.8 373.9L364.1 374.4L361 374.3L358.5 373.7L356.9 373.1L355.5 372\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M355.5 363.7L355.6 362.5L357.3 361.6L489.3 317.1L492 316.5L495.1 316.6L497.7 317.2L499.3 317.9L500.6 318.9M500.6 332.1L500.5 333.2L498.8 334.2L366.8 378.7L364.1 379.2L361 379.2L358.5 378.5L356.9 377.9L355.5 376.9M500.6 318.9L500.6 332.1M355.5 363.7L355.5 376.9\"/></g></g><g class=\"it\" data-name=\"front.railcapL\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M342.7 366.3L342.9 364.9L344.9 363.7L350.2 361.9L353.5 361.3L357.2 361.4L360.2 362.1L362.1 362.9L363.8 364.2L363.8 380L363.6 381.3L361.6 382.5L356.3 384.3L353.1 384.9L349.4 384.8L346.3 384.1L344.4 383.3L342.7 382.1Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M363.8 380L363.6 381.3L363.6 365.5L363.8 364.2ZM363.6 381.3L361.6 382.5L361.6 366.7L363.6 365.5ZM361.6 382.5L356.3 384.3L356.3 368.5L361.6 366.7Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M356.3 384.3L353.1 384.9L353.1 369.1L356.3 368.5Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M353.1 384.9L349.4 384.8L349.4 369L353.1 369.1Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M349.4 384.8L346.3 384.1L346.3 368.3L349.4 369ZM346.3 384.1L344.4 383.3L344.4 367.5L346.3 368.3ZM344.4 383.3L342.7 382.1L342.7 366.3L344.4 367.5Z\"/><path class=\"iso-top\" d=\"M350.2 361.9L353.5 361.3L357.2 361.4L360.2 362.1L362.1 362.9L363.8 364.2L363.6 365.5L361.6 366.7L356.3 368.5L353.1 369.1L349.4 369L346.3 368.3L344.4 367.5L342.7 366.3L342.9 364.9L344.9 363.7Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M363.8 364.2L363.6 365.5L361.6 366.7L356.3 368.5L353.1 369.1L349.4 369L346.3 368.3L344.4 367.5L342.7 366.3\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M342.7 366.3L342.9 364.9L344.9 363.7L350.2 361.9L353.5 361.3L357.2 361.4L360.2 362.1L362.1 362.9L363.8 364.2M363.8 380L363.6 381.3L361.6 382.5L356.3 384.3L353.1 384.9L349.4 384.8L346.3 384.1L344.4 383.3L342.7 382.1M363.8 364.2L363.8 380M342.7 366.3L342.7 382.1\"/></g><g class=\"iso-dots\" data-tone=\"mid\"><circle cx=\"348.4\" cy=\"365.2\" r=\"0.55\"/><circle cx=\"352.8\" cy=\"367\" r=\"0.55\"/></g></g></svg></div><div class=\"cr-scrub\"><span class=\"cr-end\" aria-hidden=\"true\">149</span><input type=\"range\" class=\"cr-range\" min=\"148.5\" max=\"181.5\" step=\"0.5\" value=\"165\" aria-label=\"Step rate, steps per minute\"><span class=\"cr-end\" aria-hidden=\"true\">182</span><button type=\"button\" class=\"cr-slow\" data-slow aria-pressed=\"false\">Slow</button></div><span class=\"cr-sr\" role=\"status\" aria-live=\"polite\" data-status></span><div class=\"opt-controls\"><div class=\"opt-seg\" role=\"radiogroup\" aria-label=\"Step-rate change\" data-control=\"preset\"><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"-10\" aria-checked=\"false\" tabindex=\"-1\">−10%</button><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"0\" aria-checked=\"true\" tabindex=\"0\">Your usual</button><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"5\" aria-checked=\"false\" tabindex=\"-1\">+5%</button><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"10\" aria-checked=\"false\" tabindex=\"-1\">+10%</button></div></div><div class=\"opt-foot\"><span class=\"opt-hint\">Drag or tap to change step rate</span><dl class=\"opt-readout\" data-readout aria-hidden=\"true\"><div class=\"opt-stat\" data-stat=\"spm\"><dt>Step rate</dt><dd data-r=\"spm\">165/min</dd></div><div class=\"opt-stat\" data-stat=\"step\"><dt>Step</dt><dd data-r=\"step\">1.01 m</dd></div><div class=\"opt-stat\" data-stat=\"ratio\"><dt>Vertical ratio</dt><dd data-r=\"ratio\">7.6%</dd></div><div class=\"opt-stat\" data-stat=\"knee\"><dt>Kneecap force</dt><dd data-r=\"knee\">100%</dd></div></dl></div></div><figcaption class=\"iso-legend\"><span class=\"iso-keys\"><span class=\"iso-key\"><svg class=\"iso-swatch\" data-mark=\"lit\" viewBox=\"0 0 16 10\" aria-hidden=\"true\"><path d=\"M2 4.5 8 1.5 14 4.5 14 6 8 9 2 6Z\"/><path class=\"iso-swatch-crease\" d=\"M2 4.5 8 7.5 14 4.5\"/></svg>Tracking dots on the joints</span><span class=\"iso-key\"><svg class=\"iso-swatch\" data-mark=\"heat\" viewBox=\"0 0 16 10\" aria-hidden=\"true\"><path d=\"M1.5 5h13\"/></svg>Kneecap force, each landing</span><span class=\"iso-key\"><svg class=\"iso-swatch\" data-mark=\"raised\" viewBox=\"0 0 16 10\" aria-hidden=\"true\"><path d=\"M2 4.5 8 1.5 14 4.5 14 6 8 9 2 6Z\"/><path class=\"iso-swatch-crease\" d=\"M2 4.5 8 7.5 14 4.5\"/></svg>Plumb, landing ruler and bounce gauge</span></span><span class=\"iso-caption\"><span class=\"cr-par\">At a steady 10 km/h, step length is simply speed divided by cadence. Taking 10 % more steps per minute makes each step about 9 % shorter, so the heel lands closer under the body and the body bounces less. In a lab study of 30 healthy runners, modelling showed that a 10 % higher step rate lowered the peak force behind the kneecap by about 14 % per step, and a 10 % lower rate raised it by about 15 %.</span><span class=\"cr-par\">The Creator 600 sees a run the way this drawing does: a depth camera under the screen tracks the joints and reports cadence, step length, bounce and vertical ratio. Its knee and hip load rating is the machine's own estimate from that tracking, not a force measurement.</span><span class=\"cr-par\"><small>Group averages from healthy runners, not a prediction for you. More steps per kilometre partly offsets the lower load per step, and there isn't enough evidence yet that changing cadence prevents injury. At this pace most recreational runners take about 155–⁠175 steps a minute; 180 isn't a target for everyone. Any change starts from your own numbers in the review after your run.</small></span></span></figcaption></figure>" + "</div>";
    mount(root.querySelector(".opt-figure"));
  }
}
customElements.define("optimal-fig-creator-600", Fig);
})();
