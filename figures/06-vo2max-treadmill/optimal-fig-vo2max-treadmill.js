/* optimal-fig-vo2max-treadmill: Optimal Health explainer figure. Built with Anatomy (MIT). Generated; do not edit. */
(() => {
if (customElements.get("optimal-fig-vo2max-treadmill")) return;
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

// Fig 6 model: a treadmill VO₂max ramp on the Creator 600. The gait is Fig 4's, run at the
// speed of the moment (cadence and contact time follow speed); the test is a speed ramp at a
// 1 % grade with oxygen cost from the ACSM running equation.
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
  const key = `${Math.round(cadence * 20)}|${B.pelvis}|${TRUTH.speedKmh.toFixed(2)}`;
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

// ---------------------------------------------------------------- speed sets cadence and contact time
// Cadence rose 169 → 178 spm from 2.68 → 3.83 m/s on a treadmill [18] HIGH (straight line between).
// Duty factor falls as speed rises: 0.39 at 2.75 m/s [17]; −0.06 per m/s is a LOW shape, kept 0.30–0.46.
const cadenceAt = (kmh) => 169 + ((178 - 169) / (3.83 - 2.68)) * (kmh / 3.6 - 2.68);
function setSpeed(kmh) {
  TRUTH.speedKmh = kmh;
  TRUTH.duty = clamp(0.39 - 0.06 * (kmh / 3.6 - 2.75), 0.3, 0.46);
  TRUTH.cadence0 = cadenceAt(kmh);
}

// ---------------------------------------------------------------- the treadmill ramp test
const RUN = {
  bm: 75, age: 45,
  grade: 0.01, //          1 % incline, a common treadmill setting
  acsm: [0.2, 0.9, 3.5], // VO₂ = 0.2 S + 0.9 S G + 3.5 ml/kg/min, S in m/min [20] MEDIUM-HIGH
  startShare: 0.65, //     warm-up and ramp start where the cost is ≈ 65 % of the ceiling (model choice)
  rampMin: 10, //          ramp sized to reach the ceiling in about 10 min [1][3]
  tau: 0.6, tauOff: 1.0, // min, LOW shape only
  hrRest: 65, hrMax: [208, 0.7], // [16] HIGH for the maximum
  phases: { warm: 3, recovery: 3 },
  plateau: 0.6, hold: 1.0, // ml/kg/min softness of the ceiling; minutes on it before stopping
  breath: { f0: 14, f1: 36, exhale: 0.55 }, // LOW, drives the analyser light only
  ceilings: [35, 45, 55],
};
const softMin = (a, b, k) => -k * Math.log(Math.exp(-a / k) + Math.exp(-b / k));
/** Oxygen cost of running at km/h on the test grade (ml/kg/min). */
const costOf = (kmh) => RUN.acsm[0] * (kmh * 1000 / 60) + RUN.acsm[1] * (kmh * 1000 / 60) * RUN.grade + RUN.acsm[2];
const speedFor = (cost) => (cost - RUN.acsm[2]) / (RUN.acsm[0] + RUN.acsm[1] * RUN.grade) * 60 / 1000;
function runTestOf(ceiling) {
  const s0 = speedFor(RUN.startShare * ceiling);
  const s1 = speedFor(ceiling);
  const R = (s1 - s0) / RUN.rampMin; // km/h per min
  const t0 = RUN.phases.warm;
  const tCross = t0 + RUN.rampMin + RUN.tau;
  const tEnd = tCross + RUN.hold;
  const total = tEnd + RUN.phases.recovery;
  const dt = 0.01;
  const n = Math.ceil(total / dt) + 1;
  const T = { t: new Float32Array(n), v: new Float32Array(n), vo2: new Float32Array(n), hr: new Float32Array(n), f: new Float32Array(n) };
  const hrMax = RUN.hrMax[0] - RUN.hrMax[1] * RUN.age;
  const rest = 3.5;
  let y = costOf(s0) * 0.6;
  for (let i = 0; i < n; i++) {
    const t = i * dt;
    const v = t < t0 ? s0 : t < tEnd ? s0 + R * (t - t0) : s0;
    const target = softMin(costOf(v), ceiling, RUN.plateau);
    if (i) y += ((target - y) * dt) / (t >= tEnd ? RUN.tauOff : RUN.tau);
    const x = clamp((y - rest) / (ceiling - rest), 0, 1);
    T.t[i] = t;
    T.v[i] = v;
    T.vo2[i] = y;
    T.hr[i] = RUN.hrRest + (hrMax - RUN.hrRest) * x;
    T.f[i] = RUN.breath.f0 + RUN.breath.f1 * (y / ceiling) ** 2;
  }
  let peak = 0;
  for (const v of T.v) peak = Math.max(peak, v);
  return { ...T, n, dt, ceiling, s0, s1, R, t0, tCross, tEnd, total, peak };
}
function runSampleAt(T, t) {
  const u = clamp(t, 0, T.total) / T.dt;
  const i = Math.min(T.n - 2, Math.floor(u));
  const f = u - i;
  const lerp = (a) => a[i] + (a[i + 1] - a[i]) * f;
  const phase = t < T.t0 ? "warm" : t < T.tEnd ? "ramp" : "recovery";
  return { t, phase, v: lerp(T.v), vo2: lerp(T.vo2), hr: lerp(T.hr), f: lerp(T.f) };
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
// The tablet's live screen for the VO₂ figures (inlined into the page after the kit).
// Plots oxygen uptake (ml/kg/min) against the test's work (watts on a bike, km/h on a treadmill),
// with a dashed guide for the shared slope, the live trace, the current point, the ceiling once
// it shows, and the big VO₂ number with a breath marker.
function vo2Plot(host, screen, { xMin = 0, xMax, yMax = 60, xTicks, yTicks = [20, 40, 60], guide, xLabel }) {
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs) => {
    const n = document.createElementNS(NS, tag);
    for (const [k2, v] of Object.entries(attrs)) n.setAttribute(k2, v);
    host.appendChild(n);
    return n;
  };
  const head = 5.4; // the number strip at the top
  const box = { x0: 3.6, y0: screen.h - 2.6, w: screen.w - 5.2, h: screen.h - head - 4 };
  const px = (x) => box.x0 + ((x - xMin) / (xMax - xMin)) * box.w;
  const py = (v) => box.y0 - (v / yMax) * box.h;
  let grid = "";
  for (const x of xTicks) grid += `M${px(x).toFixed(2)} ${py(0).toFixed(2)}V${py(yMax).toFixed(2)}`;
  for (const v of yTicks) grid += `M${px(xMin).toFixed(2)} ${py(v).toFixed(2)}H${px(xMax).toFixed(2)}`;
  el("path", { class: "vp-grid", d: grid });
  el("path", { class: "vp-axis", d: `M${px(xMin)} ${py(yMax)}V${py(0)}H${px(xMax)}` });
  if (guide) el("path", { class: "vp-guide", d: `M${px(guide[0][0]).toFixed(2)} ${py(guide[0][1]).toFixed(2)}L${px(guide[1][0]).toFixed(2)} ${py(guide[1][1]).toFixed(2)}` });
  for (const x of xTicks) el("text", { class: "vp-tick", x: px(x).toFixed(2), y: (py(0) + 1.9).toFixed(2), "font-size": 1.5, "text-anchor": "middle" }).textContent = String(x);
  for (const v of yTicks) el("text", { class: "vp-tick", x: (px(xMin) - 0.5).toFixed(2), y: (py(v) + 0.5).toFixed(2), "font-size": 1.5, "text-anchor": "end" }).textContent = String(v);
  el("text", { class: "vp-unit", x: px(xMax).toFixed(2), y: (py(0) - 0.8).toFixed(2), "font-size": 1.5, "text-anchor": "end" }).textContent = xLabel;
  const big = el("text", { class: "vp-big", x: 1.6, y: 4.3, "font-size": 3.6 });
  el("text", { class: "vp-unit", x: 12.4, y: 4.3, "font-size": 1.6 }).textContent = "ml/kg/min VO₂";
  const breath = el("circle", { class: "vp-breath", cx: screen.w - 2.4, cy: 2.8, r: 0.8 });
  const ceil = el("path", { class: "vp-ceiling" });
  const trace = el("path", { class: "vp-trace" });
  const dot = el("circle", { class: "vp-dot", r: 0.7 });
  return {
    draw(points, now, ceiling, seen, pulse) {
      let d = "";
      for (const [x, v] of points) d += `${d ? "L" : "M"}${px(x).toFixed(2)} ${py(v).toFixed(2)}`;
      trace.setAttribute("d", d);
      dot.setAttribute("cx", px(now[0]).toFixed(2));
      dot.setAttribute("cy", py(now[1]).toFixed(2));
      ceil.setAttribute("d", `M${px(xMin).toFixed(2)} ${py(ceiling).toFixed(2)}H${px(xMax).toFixed(2)}`);
      ceil.setAttribute("stroke-opacity", seen.toFixed(2));
      big.textContent = now[1].toFixed(1);
      breath.setAttribute("fill-opacity", (0.25 + 0.75 * pulse).toFixed(2));
    },
  };
}

// Fig 6 live code: a treadmill ramp test you can play and scrub; the runner runs and breathes in real time.
const DATA = {"P":{"origin":[296.4802442977594,601.2450783104898],"scale":1.8721863566929118,"azimuth":132,"elevation":22},"B":{"H":170,"thigh":41.65,"shank":41.82,"ankleZ":6.63,"foot":25.84,"ankleX":5.4264,"ball":18.6048,"hipHalf":8.5,"kneeHalf":7.2,"ankleHalf":5.2,"trunk":48.959999999999994,"shoulderHalf":18.02,"upperArm":31.62,"forearm":24.819999999999997,"hand":18.36,"chin":57.800000000000004,"head":22.1,"pelvis":84.9435822727389},"beltZ":24,"runX":-12,"belt":{"x":-98,"x1":66,"half":29},"screen":{"y0":-31,"y1":31,"z0":115,"z1":226,"x":100},"tablet":{"w":29.49480515780368,"h":22.00349860828395}};

function mount(fig) {
  const P = DATA.P;
  const B = DATA.B;
  const stage = fig.querySelector(".iso-stage");
  const svg = stage.querySelector("svg");
  const q = (s) => svg.querySelector(s);
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const out = Object.fromEntries([...fig.querySelectorAll("[data-r]")].map((n) => [n.dataset.r, n]));
  const status = fig.querySelector("[data-status]");
  const buttons = [...fig.querySelectorAll('[data-control="ceiling"] .opt-seg-btn')];
  const range = fig.querySelector(".vo-range");
  const play = fig.querySelector("[data-play]");
  const clockEl = fig.querySelector("[data-clock]");
  const nodes = { runner: q('[data-part="runner"]'), slats: q('[data-part="slats"]'), screen: q('[data-part="screen-body"]'), speed: q('[data-part="speed"]'), tablet: q('[data-part="tablet"]') };
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attrs || {})) n.setAttribute(key, value);
    if (parent) parent.appendChild(n);
    return n;
  };
  const KS = P.scale * Math.sqrt(1.6);
  const view = mannequinView(nodes.runner, P, {});
  const Z = DATA.beltZ;
  const base = [DATA.runX, 0, Z];
  const fmt = (min) => {
    const s = Math.max(0, Math.round(min * 60));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };

  // ---------------------------------------------------------------- state
  let ceiling = 45;
  let T = runTestOf(ceiling);
  let t = 0;
  let playing = false;
  let phi = 0.62;
  let beltAt = 0;
  let breath = 0;
  const MIN_PER_S = 0.75;

  // ---------------------------------------------------------------- the mask and its analyser, from the head's own axis
  function maskParts(J) {
    const axis = MANNEQUIN.frameAlong([0, 0, 0], [0, 0, 1]).a;
    void axis;
    const ha = G.frameAlong(J.chin, [J.head[0] - J.chin[0], J.head[1] - J.chin[1], J.head[2] - J.chin[2]]).a;
    const d = ha[0];
    const faceRaw = [1 - ha[0] * d, -ha[1] * d, -ha[2] * d];
    const fl = Math.hypot(...faceRaw);
    const face = faceRaw.map((v) => v / fl);
    const baseM = [J.head[0] + face[0] * 6.4 - ha[0] * 4.6, J.head[1] + face[1] * 6.4 - ha[1] * 4.6, J.head[2] + face[2] * 6.4 - ha[2] * 4.6];
    const Fm = MANNEQUIN.frameAlong(baseM, face);
    return [
      { name: "mask", group: "trunk", rigid: true, kind: "lathe", F: Fm, profile: [[0, 6.0], [2.6, 6.0, 1], [4.6, 4.4, 1], [6.0, 3.2]], centre: G.pointOf(Fm, 5, 0, 0), bias: 2 },
      { name: "analyser", group: "trunk", rigid: true, kind: "lathe", F: Fm, profile: [[5.6, 3.0], [6.4, 4.6, 1], [8.6, 5.0, 1], [11.0, 4.6, 1], [12.0, 3.0]], centre: G.pointOf(Fm, 9, 0, 0), bias: 2.5 },
    ];
  }
  let led = null;
  function decorate(part, g, st) {
    if (part.name === "analyser") {
      if (!st.led) {
        st.led = el("circle", { class: "vo-led", r: (0.9 * KS).toFixed(2) }, g);
        led = st.led;
      }
      const c = iso(G.pointOf(part.F, 8.6, 5.0, Math.PI / 2), P);
      st.led.setAttribute("cx", c[0].toFixed(1));
      st.led.setAttribute("cy", c[1].toFixed(1));
    }
    if (part.kind === "ball" && /^(hip|knee|ankle|shoulder|elbow|wrist)/.test(part.name)) {
      if (!st.dot) st.dot = el("circle", { class: "mq-dot", r: (1.2 * KS).toFixed(2) }, g);
      const c = iso(part.c, P);
      st.dot.setAttribute("cx", c[0].toFixed(1));
      st.dot.setAttribute("cy", c[1].toFixed(1));
    }
  }

  // ---------------------------------------------------------------- belt slats and the display's live skeleton (front view)
  function beltSvg() {
    const gap = 12;
    const off = ((beltAt % gap) + gap) % gap;
    let d = "";
    for (let x = DATA.belt.x1 - off; x > DATA.belt.x + 0.5; x -= gap) d += lineOnTop([x, -DATA.belt.half + 0.6], [x, DATA.belt.half - 0.6], Z + 0.02, P);
    nodes.slats.setAttribute("d", d);
  }
  // the Creator's screen as a clean live dashboard: clock, belt speed, the tracked skeleton on its
  // floor line, and tiles for cadence, step length and grade (all from the model)
  const SC = DATA.screen;
  const SW = SC.y1 - SC.y0;
  const scr = nodes.screen;
  const txt = (x, y, size, cls, anchor = "start", text = "") => {
    const n = el("text", { x, y, "font-size": size, class: cls, "text-anchor": anchor }, scr);
    n.textContent = text;
    return n;
  };
  const liveDot = el("circle", { cx: 5, cy: 6.2, r: 1.3, class: "cr-live" }, scr);
  txt(8, 7.5, 3.2, "cr-ui-label", "start", "Live");
  const uiClock = txt(SW - 4, 7.5, 3.2, "cr-ui-label", "end", "0:00");
  el("path", { d: `M3 10.6H${SW - 3}`, class: "cr-floor" }, scr);
  const uiSpeed = txt(SW / 2, 26.5, 15, "cr-ui-hero", "middle", "0.0");
  txt(SW / 2, 32.4, 3.4, "cr-ui-label", "middle", "km/h");
  const FLOOR = 85;
  el("path", { d: `M9 ${FLOOR}H${SW - 9}`, class: "cr-floor" }, scr);
  const toScreen = (p) => [SW / 2 + p[1] * 0.26, FLOOR - (p[2] - Z) * 0.26];
  const bones = el("path", { class: "cr-bones" }, scr);
  const joints = el("g", { class: "cr-joints" }, scr);
  const jointDots = [];
  const tileW = (SW - 4 - 2 * 2) / 3;
  const tiles = ["Cadence", "Step", "Grade"].map((label, i) => {
    const x = 2 + i * (tileW + 2);
    el("rect", { x, y: 89, width: tileW, height: 19, rx: 1.6, class: "cr-well" }, scr);
    txt(x + tileW / 2, 94, 2.6, "cr-ui-label", "middle", label);
    const v = txt(x + tileW / 2, 102.2, 5.6, "cr-ui-val", "middle", "");
    const u = txt(x + tileW / 2, 106, 2.4, "cr-ui-label", "middle", ["steps/min", "metres", "incline"][i]);
    return { v, u };
  });
  function screenDraw(J, s) {
    const seg = (a, b) => {
      const p = toScreen(a);
      const r = toScreen(b);
      return `M${p[0].toFixed(1)} ${p[1].toFixed(1)}L${r[0].toFixed(1)} ${r[1].toFixed(1)}`;
    };
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    let d = seg(J.hipR, J.hipL) + seg(J.shoulderR, J.shoulderL) + seg(mid(J.hipR, J.hipL), mid(J.shoulderR, J.shoulderL)) + seg(mid(J.shoulderR, J.shoulderL), J.head);
    for (const k of ["R", "L"]) d += seg(J[`hip${k}`], J[`knee${k}`]) + seg(J[`knee${k}`], J[`ankle${k}`]) + seg(J[`shoulder${k}`], J[`elbow${k}`]) + seg(J[`elbow${k}`], J[`wrist${k}`]);
    bones.setAttribute("d", d);
    const pts = ["head", "shoulderR", "shoulderL", "elbowR", "elbowL", "wristR", "wristL", "hipR", "hipL", "kneeR", "kneeL", "ankleR", "ankleL"].map((n) => toScreen(J[n]));
    while (jointDots.length < pts.length) jointDots.push(el("circle", { r: jointDots.length === 0 ? 1.4 : 0.9 }, joints));
    pts.forEach((p, i) => {
      jointDots[i].setAttribute("cx", p[0].toFixed(1));
      jointDots[i].setAttribute("cy", p[1].toFixed(1));
    });
    // the numbers: belt speed, the model's cadence at that speed, the step it implies, the fixed grade
    const cad = TRUTH.cadence0;
    uiSpeed.textContent = s.v.toFixed(1);
    uiClock.textContent = fmt(t);
    tiles[0].v.textContent = String(Math.round(cad));
    tiles[1].v.textContent = (s.v / 3.6 / (cad / 60)).toFixed(2);
    tiles[2].v.textContent = `${Math.round(RUN.grade * 100)}%`;
    liveDot.setAttribute("fill-opacity", (0.35 + 0.65 * Math.abs(Math.cos(phi * 2 * Math.PI))).toFixed(2));
  }

  // ---------------------------------------------------------------- the tablet: VO₂ against speed
  const plot = vo2Plot(nodes.tablet, DATA.tablet, { xMin: 4, xMax: 18, xTicks: [6, 10, 14, 18], xLabel: "km/h", guide: [[4, costOf(4)], [18, costOf(18)]] });
  function plotDraw(now, pulse) {
    const pts = [];
    const step = Math.max(1, Math.round(0.1 / T.dt));
    const last = Math.min(T.n - 1, Math.round(now / T.dt));
    for (let i = 0; i <= last; i += step) pts.push([T.v[i], T.vo2[i]]);
    const s = runSampleAt(T, now);
    pts.push([s.v, s.vo2]);
    plot.draw(pts, [s.v, s.vo2], T.ceiling, Math.min(1, Math.max(0, (now - T.tCross) / 0.5)), pulse);
  }

  // ---------------------------------------------------------------- one frame
  function render(dtReal) {
    const s = runSampleAt(T, t);
    setSpeed(s.v);
    const cadence = TRUTH.cadence0;
    beltAt += beltOf() * dtReal;
    phi = (phi + (dtReal * cadence) / 120) % 1;
    const period = 60 / s.f;
    breath = (breath + dtReal / period) % 1;
    const pulse = breath < RUN.breath.exhale ? Math.sin((Math.PI * breath) / RUN.breath.exhale) : 0;
    const pose = poseAt(phi, cadence, B);
    const legs = {};
    for (const [k, leg] of [["R", pose.right], ["L", pose.left]]) legs[k] = { hip: leg.hip, knee: leg.knee, ankle: leg.ankle, sole: leg.sole, toe: leg.toe };
    const J = MANNEQUIN.skeletonOf({ base, pelvis: pose.pelvis, trunk: pose.trunk, legs, arms: { R: { shoulder: pose.armR, elbow: pose.elbow }, L: { shoulder: pose.armL, elbow: pose.elbow } } });
    const { parts } = MANNEQUIN.partsOf(J);
    view.draw([...parts, ...maskParts(J)], J, decorate);
    if (led) led.setAttribute("fill-opacity", (0.3 + 0.7 * pulse).toFixed(2));
    beltSvg();
    screenDraw(J, s);
    if (nodes.speed) nodes.speed.textContent = s.v.toFixed(1);
    plotDraw(t, pulse);
    readout(s);
  }

  // ---------------------------------------------------------------- readout
  let lastPhase = "";
  function readout(s) {
    out.v.textContent = `${s.v.toFixed(1)} km/h`;
    out.hr.textContent = `${Math.round(s.hr)} bpm`;
    out.vo2.textContent = `${s.vo2.toFixed(1)} ml/kg/min`;
    clockEl.textContent = fmt(t);
    const phaseText = { warm: "warm-up jog", ramp: s.t > T.tCross ? "at the ceiling" : "on the ramp", recovery: "recovery jog" }[s.phase];
    stage.setAttribute("aria-valuenow", t.toFixed(1));
    stage.setAttribute("aria-valuetext", `${fmt(t)}, ${phaseText}`);
    if (phaseText !== lastPhase) {
      status.textContent = `${fmt(t)}, ${phaseText}: ${s.v.toFixed(1)} kilometres an hour, oxygen uptake ${s.vo2.toFixed(1)} millilitres per kilogram per minute, heart rate ${Math.round(s.hr)}.`;
      lastPhase = phaseText;
    }
    if (document.activeElement !== range) range.value = String(t);
  }

  // ---------------------------------------------------------------- input, idle tour, offscreen pause, reduced motion
  const setCeiling = (c) => {
    ceiling = c;
    T = runTestOf(c);
    range.max = T.total.toFixed(2);
    stage.setAttribute("aria-valuemax", T.total.toFixed(1));
    t = Math.min(t, T.total);
    for (const b of buttons) {
      const on = +b.dataset.value === c;
      b.setAttribute("aria-checked", on ? "true" : "false");
      b.tabIndex = on ? 0 : -1;
    }
  };
  const setPlaying = (on) => {
    playing = on;
    play.textContent = on ? "Pause" : "Play";
    play.setAttribute("aria-label", on ? "Pause" : "Play");
  };
  let touring = true;
  let idleSince = -1e9;
  const TOUR = [45, 55, 35];
  let tourAt = 0;
  const takeOver = () => {
    touring = false;
    idleSince = performance.now();
  };
  for (const b of buttons)
    b.addEventListener("click", () => {
      takeOver();
      setCeiling(+b.dataset.value);
      if (still.matches) renderStill();
    });
  fig.querySelector('[data-control="ceiling"]').addEventListener("keydown", (e) => {
    const i = buttons.indexOf(document.activeElement);
    if (i < 0) return;
    const j = e.key === "ArrowRight" || e.key === "ArrowDown" ? i + 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? i - 1 : null;
    if (j === null) return;
    e.preventDefault();
    const b = buttons[(j + buttons.length) % buttons.length];
    b.focus();
    b.click();
  });
  range.addEventListener("input", () => {
    takeOver();
    setPlaying(false);
    t = +range.value;
    if (still.matches) render(0);
  });
  play.addEventListener("click", () => {
    takeOver();
    if (!playing && t >= T.total - 0.01) t = 0;
    setPlaying(!playing);
    start();
  });
  stage.addEventListener("keydown", (e) => {
    const map = { ArrowRight: 0.25, ArrowUp: 0.25, ArrowLeft: -0.25, ArrowDown: -0.25, PageUp: 1, PageDown: -1 };
    if (e.key in map) t = Math.min(T.total, Math.max(0, t + map[e.key]));
    else if (e.key === "Home") t = 0;
    else if (e.key === "End") t = T.total;
    else if (e.key === " ") {
      if (!playing && t >= T.total - 0.01) t = 0;
      setPlaying(!playing);
    } else return;
    e.preventDefault();
    takeOver();
    if (e.key !== " ") setPlaying(false);
    if (still.matches) render(0);
    start();
  });
  function renderStill() {
    t = T.tCross + 0.6;
    breath = 0.25;
    phi = 0.04;
    render(0);
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
      setPlaying(true);
    }
    if (touring && !playing) setPlaying(true);
    if (playing) {
      t += dt * MIN_PER_S;
      if (t >= T.total) {
        if (touring) {
          tourAt = (tourAt + 1) % TOUR.length;
          setCeiling(TOUR[tourAt]);
          t = 0;
        } else {
          t = T.total;
          setPlaying(false);
        }
      }
    }
    render(dt);
    raf = requestAnimationFrame(tick);
  }
  function start() {
    if (!raf && visible && !still.matches) {
      last = 0;
      raf = requestAnimationFrame(tick);
    }
  }
  new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    if (visible) start();
  }).observe(stage);
  still.addEventListener("change", () => (still.matches ? renderStill() : start()));
  for (const n of [range, stage, play, ...buttons]) n.addEventListener("pointerdown", takeOver);
  setCeiling(ceiling);
  if (still.matches) renderStill();
  else {
    render(0);
    start();
  }
}

class Fig extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    const root = this.attachShadow({ mode: "open" });
    const theme = this.getAttribute("theme") === "dark" ? "dark" : "light";
    root.innerHTML = "<style>" + "\n.iso{\n  --anatomy-page:#0b0b0b;--anatomy-card:#131313;--anatomy-text:#a3a3a3;--anatomy-strong:#e6e6e6;--anatomy-muted:#6e6e6e;\n  --anatomy-paper:#131313;--anatomy-face:#1b1b1b;--anatomy-top:#1c1c1c;\n  --anatomy-shade-0:#0f0f0f;--anatomy-shade-1:#121212;--anatomy-shade-2:#151515;--anatomy-shade-3:#181818;\n  --anatomy-lit-top:#262626;--anatomy-lit-shade:#1d1d1d;\n  --anatomy-hi:#d4d4d4;--anatomy-mid:#6a6a6a;--anatomy-lo:#3e3e3e;--anatomy-faint:#2a2a2a;--anatomy-lit:#ffffff;\n  --anatomy-halo:#050505;--anatomy-halo-opacity:.9;--anatomy-dot:#e6e6e6;\n  --anatomy-red:#ff6b6b;--anatomy-green:#6be0a0;--anatomy-blue:#6b9bff;\n  --anatomy-weight:.6px;--anatomy-ease:cubic-bezier(.32,.72,0,1);\n  --anatomy-mono:ui-monospace,\"SF Mono\",Menlo,Consolas,monospace;\n  --anatomy-lift:inset 0 1px 0 0 #ffffff0a,inset 0 0 0 1px #ffffff06,0 0 0 1px #00000026,0 1px 1px -.5px #00000014,0 3px 3px -1.5px #00000014,0 6px 6px -3px #00000014,0 12px 12px -6px #00000014;\n}\n.iso[data-theme=\"light\"]{\n  --anatomy-page:#f2f2ef;--anatomy-card:#fbfbfa;--anatomy-text:#57575a;--anatomy-strong:#18181a;--anatomy-muted:#8c8c90;\n  --anatomy-paper:#fbfbfa;--anatomy-face:#ffffff;--anatomy-top:#ffffff;\n  --anatomy-shade-0:#dcdcd9;--anatomy-shade-1:#e5e5e2;--anatomy-shade-2:#ededea;--anatomy-shade-3:#f4f4f1;\n  --anatomy-lit-top:#ffffff;--anatomy-lit-shade:#eeeeeb;\n  --anatomy-hi:#26262a;--anatomy-mid:#8a8a8f;--anatomy-lo:#b4b4b8;--anatomy-faint:#d4d4d6;--anatomy-lit:#000000;\n  --anatomy-halo:#8a8a80;--anatomy-halo-opacity:.32;--anatomy-dot:#3a3a3e;\n  --anatomy-red:#e5484d;--anatomy-green:#30a46c;--anatomy-blue:#3e63dd;\n  --anatomy-lift:inset 0 1px 0 0 #ffffff,0 0 0 1px #0000000f,0 1px 1px -.5px #0000000a,0 3px 3px -1.5px #0000000a,0 6px 6px -3px #0000000a,0 12px 12px -6px #0000000a;\n}\n.iso-svg{display:block;width:100%;height:auto;overflow:visible}\n.iso-svg path,.iso-svg circle{vector-effect:non-scaling-stroke}\n.iso-fill{fill:var(--anatomy-paper);stroke:none}\n.iso-solid[data-lit]>.iso-fill{fill:var(--anatomy-face)}\n.iso-shade,.iso-top{stroke:none}\n.iso-shade[data-shade=\"0\"]{fill:var(--anatomy-shade-0)}\n.iso-shade[data-shade=\"1\"]{fill:var(--anatomy-shade-1)}\n.iso-shade[data-shade=\"2\"]{fill:var(--anatomy-shade-2)}\n.iso-shade[data-shade=\"3\"]{fill:var(--anatomy-shade-3)}\n.iso-top{fill:var(--anatomy-top)}\n.iso-solid[data-lit]>.iso-top{fill:var(--anatomy-lit-top)}\n.iso-solid[data-lit]>.iso-shade{fill:var(--anatomy-lit-shade)}\n.iso-solid[data-seamless]>.iso-shade,.iso-solid[data-seamless]>.iso-top{stroke-width:.4;stroke-linejoin:round}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"0\"]{stroke:var(--anatomy-shade-0)}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"1\"]{stroke:var(--anatomy-shade-1)}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"2\"]{stroke:var(--anatomy-shade-2)}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"3\"]{stroke:var(--anatomy-shade-3)}\n.iso-solid[data-seamless]>.iso-top{stroke:var(--anatomy-top)}\n.iso-solid[data-seamless][data-lit]>.iso-top{stroke:var(--anatomy-lit-top)}\n.iso-solid[data-seamless][data-lit]>.iso-shade{stroke:var(--anatomy-lit-shade)}\n.iso-solid[data-lit]>.iso-edge{stroke:var(--anatomy-lit)}\n.iso-halo{fill:var(--anatomy-halo);stroke:none;filter:blur(9px);opacity:var(--anatomy-halo-opacity);transform:translateY(3px)}\n.iso-line{fill:none;stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight);stroke-linecap:round;stroke-linejoin:round}\n.iso-line[data-tone=\"hi\"]{stroke:var(--anatomy-hi)}\n.iso-line[data-tone=\"mid\"]{stroke:var(--anatomy-mid)}\n.iso-line[data-tone=\"lo\"]{stroke:var(--anatomy-lo)}\n.iso-line[data-tone=\"faint\"]{stroke:var(--anatomy-faint)}\n.iso-line[data-tone=\"lit\"]{stroke:var(--anatomy-lit)}\n.iso-line[data-tone=\"red\"]{stroke:var(--anatomy-red)}\n.iso-line[data-tone=\"green\"]{stroke:var(--anatomy-green)}\n.iso-line[data-tone=\"blue\"]{stroke:var(--anatomy-blue)}\n.iso-line[data-dotted]{stroke-dasharray:.01 3.5;stroke-width:1}\n.iso-line[data-dashed]{stroke-dasharray:3 3}\n.iso-line[data-flow]{stroke-dasharray:2 6}\n.iso-wire-end{fill:var(--anatomy-paper);stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight)}\n.iso-wire[data-tone=\"hi\"] .iso-wire-end{stroke:var(--anatomy-hi)}\n.iso-wire[data-tone=\"mid\"] .iso-wire-end{stroke:var(--anatomy-mid)}\n.iso-wire[data-tone=\"faint\"] .iso-wire-end{stroke:var(--anatomy-faint)}\n.iso-wire[data-tone=\"lit\"] .iso-wire-end{stroke:var(--anatomy-lit)}\n.iso-dots circle{fill:var(--anatomy-dot);stroke:none;opacity:.32}\n.iso-dots[data-tone=\"hi\"] circle{opacity:.85}\n.iso-dots[data-tone=\"mid\"] circle{opacity:.45}\n.iso-dots[data-tone=\"lo\"] circle{opacity:.22}\n.iso-dots[data-tone=\"faint\"] circle{opacity:.12}\n.iso-face-text{fill:var(--anatomy-mid);font-family:var(--anatomy-mono);letter-spacing:.04em}\n.iso-face-text[data-tone=\"hi\"]{fill:var(--anatomy-hi)}\n.iso-face-text[data-tone=\"lo\"]{fill:var(--anatomy-lo)}\n.iso-face-text[data-tone=\"faint\"]{fill:var(--anatomy-faint)}\n.tb-body{fill:var(--anatomy-shade-2);stroke:none}\n.tb-shine{fill:var(--anatomy-top);stroke:none}\n.tb-shade{fill:var(--anatomy-shade-0);stroke:none}\n.tb-ring{fill:none;stroke:var(--anatomy-lo);stroke-width:.45;stroke-linecap:butt;stroke-linejoin:round}\n.tb-ring[data-tone=\"mid\"]{stroke:var(--anatomy-mid)}\n.tb-ring[data-tone=\"faint\"]{stroke:var(--anatomy-faint)}\n.tb-ring[data-tone=\"hi\"]{stroke:var(--anatomy-hi)}\n@keyframes iso-flow{to{stroke-dashoffset:-32}}\n@keyframes iso-pulse{0%,100%{opacity:.18}12%{opacity:1}40%{opacity:.18}}\n.iso-line[data-flow]{animation:iso-flow 1600ms linear infinite}\n.iso-dots circle[data-pulse]{animation:iso-pulse 1600ms steps(1,end) infinite;animation-delay:var(--pulse-at,0ms)}\n.iso-figure{margin:32px 0 36px}\n.iso-plate{position:relative;padding:52px 24px;border-radius:0;background:var(--anatomy-card);box-shadow:0 0 0 1px var(--anatomy-mid);--anatomy-paper:var(--anatomy-card)}\n.iso-plate-corners{position:absolute;inset:18px 20px;pointer-events:none}\n.iso-plate-corner{position:absolute;color:var(--anatomy-muted);font-family:var(--anatomy-mono);font-size:10.5px;line-height:1;letter-spacing:.04em;white-space:nowrap}\n.iso-plate-corner[data-corner=\"fig\"]{top:0;left:0;color:var(--anatomy-text)}\n.iso-plate-corner[data-corner=\"title\"]{top:0;right:0;text-transform:uppercase;letter-spacing:.1em}\n.iso-plate-corner[data-corner=\"hint\"]{bottom:0;left:0;text-transform:uppercase;letter-spacing:.1em}\n.iso-plate-corner[data-corner=\"readout\"]{right:0;bottom:0;color:var(--anatomy-text);font-variant-numeric:tabular-nums}\n.iso-plate .iso-svg{margin:0 auto}\n.iso-legend{display:grid;gap:8px;margin-top:12px;color:var(--anatomy-muted);font-size:13px;line-height:1.55}\n.iso-keys{display:flex;flex-wrap:wrap;gap:6px 18px}\n.iso-key{display:inline-flex;align-items:center;gap:7px}\n.iso-swatch{width:16px;height:10px;flex:none;overflow:visible}\n.iso-swatch path{fill:none;stroke:var(--anatomy-hi);stroke-width:1;vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round}\n.iso-swatch[data-mark=\"raised\"] path,.iso-swatch[data-mark=\"flat\"] path{stroke:var(--anatomy-mid)}\n.iso-swatch[data-mark=\"lit\"] path{stroke:var(--anatomy-lit)}\n.iso-swatch[data-mark=\"dim\"] path{stroke:var(--anatomy-lo)}\n.iso-swatch[data-mark=\"dotted\"] path{stroke-dasharray:.01 3;stroke-width:1.4}\n.iso-swatch[data-mark=\"dashed\"] path{stroke-dasharray:3 2.5}\n.iso-swatch[data-mark=\"red\"] path{stroke:var(--anatomy-red)}\n.iso-swatch[data-mark=\"green\"] path{stroke:var(--anatomy-green)}\n.iso-swatch[data-mark=\"blue\"] path{stroke:var(--anatomy-blue)}\n.iso-swatch-crease{stroke:var(--anatomy-lo)!important}\n@media (max-width:560px){.iso-plate{padding:48px 12px 70px}.iso-plate-corner[data-corner=\"hint\"]{bottom:18px}}\n@media (prefers-reduced-motion:reduce){.iso-line[data-flow],.iso-dots circle[data-pulse]{animation:none}}\n/*\n * Optimal theme for Anatomy figures.\n *\n * Load AFTER the kit's ISO_CSS. Put `class=\"iso optimal\"` on the wrapper:\n *   - no data-theme  -> \"Forest night\"  (exam-room TV, dark)\n *   - data-theme=\"light\" -> \"Cream\"     (beoptimal.ca, the primary target)\n *\n * Values come from the live site (beoptimal-landing src/index.css), the\n * Performance package design and the ALE visualizer spec. The kit's grey\n * ramps are warmed so solids sit on the site's cream paper, and the single\n * \"lit\" accent is Optimal forest green instead of pure black/white.\n */\n\n.iso.optimal {\n  /* Forest night (dark) */\n  --anatomy-page: #152511;\n  --anatomy-card: #1c3118;\n  --anatomy-text: #c9cdbf;\n  --anatomy-strong: #fffcf7;\n  --anatomy-muted: #8e9884;\n  --anatomy-paper: #1c3118;\n  --anatomy-face: #253821;\n  --anatomy-top: #283c24;\n  --anatomy-shade-0: #172812;\n  --anatomy-shade-1: #1a2c16;\n  --anatomy-shade-2: #1e321a;\n  --anatomy-shade-3: #22371e;\n  --anatomy-lit-top: #34492f;\n  --anatomy-lit-shade: #2a3f26;\n  --anatomy-hi: #e9e6dc;\n  --anatomy-mid: #7e8a74;\n  --anatomy-lo: #4d5c46;\n  --anatomy-faint: #33452e;\n  --anatomy-lit: #fffcf7;\n  --anatomy-halo: #0b1508;\n  --anatomy-halo-opacity: 0.9;\n  --anatomy-dot: #e9e6dc;\n  --anatomy-red: #e0745f;\n  --anatomy-green: #8cc67f;\n  --anatomy-blue: #7fa8d9;\n  --anatomy-mono: \"JetBrains Mono\", ui-monospace, \"SF Mono\", Menlo, Consolas, monospace;\n\n  /* Optimal extras (use sparingly; colour only when colour is the subject) */\n  --opt-display: \"Castoro\", Georgia, serif;\n  --opt-ui: \"Public Sans\", system-ui, sans-serif;\n  --opt-forest: #2c4e25;\n  --opt-forest-light: #519044;\n  --opt-sage: #5e7a59;\n  --opt-borderline: #c97b2d;\n  --opt-out: #b3402f;\n  --opt-heat: #ff9776;\n}\n\n.iso.optimal[data-theme=\"light\"] {\n  /* Cream (light) */\n  --anatomy-page: #fef8f1;\n  --anatomy-card: #fffcf7;\n  --anatomy-text: #3e3d39;\n  --anatomy-strong: #252525;\n  --anatomy-muted: #76736d;\n  --anatomy-paper: #fffcf7;\n  --anatomy-face: #fffefb;\n  --anatomy-top: #fffefb;\n  --anatomy-shade-0: #ddd7cc;\n  --anatomy-shade-1: #e7e2d9;\n  --anatomy-shade-2: #f0ede5;\n  --anatomy-shade-3: #f6f3ec;\n  --anatomy-lit-top: #fffefb;\n  --anatomy-lit-shade: #efebe2;\n  --anatomy-hi: #252525;\n  --anatomy-mid: #8a867e;\n  --anatomy-lo: #b9b4aa;\n  --anatomy-faint: #d9d3c8;\n  --anatomy-lit: #2c4e25;\n  --anatomy-halo: #8a8070;\n  --anatomy-halo-opacity: 0.3;\n  --anatomy-dot: #3a3833;\n  --anatomy-red: #b3402f;\n  --anatomy-green: #3f7a35;\n  --anatomy-blue: #3e6a8f;\n}\n\n/* Card typography: brand fonts for titles and readouts, kit mono for plate corners */\n.iso.optimal .iso-plate-title,\n.iso.optimal [data-role=\"title\"] {\n  font-family: var(--opt-display);\n  letter-spacing: -0.02em;\n}\n.iso.optimal [data-role=\"readout\"],\n.iso.optimal .iso-readout {\n  font-family: var(--opt-ui);\n  font-feature-settings: \"tnum\" 1, \"ss01\" 1;\n}\n\n/*\n * Card layout for Optimal figures (shared/page.mjs `plate`).\n * Phone first: the drawing, then a row of real buttons (>=44 px), then a footer\n * where the hint and the readout wrap instead of overlapping at 320 px.\n */\n.iso.optimal {\n  --opt-rule: rgba(233, 230, 220, 0.16);\n  --opt-btn: rgba(233, 230, 220, 0.06);\n  --opt-btn-on: #e9e6dc;\n  --opt-btn-on-text: #1c3118;\n  --opt-title: #fffcf7;\n  --opt-fig: #8cc67f;\n  --opt-heat-ink: #ff9776;\n  --opt-heat-glow: rgba(255, 151, 118, 0.55);\n  --opt-heat-wash: rgba(255, 151, 118, 0.16);\n  --opt-cold-ink: #9cc3e6;\n}\n.iso.optimal[data-theme=\"light\"] {\n  --opt-rule: rgba(44, 78, 37, 0.2);\n  --opt-btn: #fffcf7;\n  --opt-btn-on: #2c4e25;\n  --opt-btn-on-text: #fffcf7;\n  --opt-title: #2c4e25;\n  --opt-fig: #5e7a59;\n  --opt-heat-ink: #c8552e;\n  --opt-heat-glow: rgba(232, 108, 64, 0.42);\n  --opt-heat-wash: rgba(255, 151, 118, 0.22);\n  --opt-cold-ink: #3e6a8f;\n}\n.iso.optimal .opt-plate {\n  padding: 52px 24px 20px;\n  box-shadow: 0 0 0 1px var(--opt-rule);\n  border-radius: 2px;\n}\n.iso.optimal .iso-plate-corner[data-corner=\"fig\"] {\n  font-family: var(--opt-display);\n  font-style: italic;\n  font-size: 15px;\n  letter-spacing: 0;\n  color: var(--opt-fig);\n  top: -2px;\n}\n.iso.optimal .iso-plate-corner[data-corner=\"title\"] {\n  font-family: var(--opt-display);\n  font-size: 17px;\n  text-transform: none;\n  letter-spacing: -0.01em;\n  color: var(--opt-title);\n  top: -4px;\n}\n.iso.optimal .opt-controls {\n  display: flex;\n  flex-wrap: wrap;\n  justify-content: center;\n  gap: 8px 12px;\n  margin: 10px 0 0;\n}\n.iso.optimal .opt-seg {\n  display: inline-flex;\n  border-radius: 999px;\n  box-shadow: inset 0 0 0 1px var(--opt-rule);\n  padding: 3px;\n  gap: 2px;\n  max-width: 100%;\n}\n.iso.optimal .opt-seg-btn {\n  appearance: none;\n  border: 0;\n  margin: 0;\n  min-height: 44px;\n  min-width: min-content; /* never shrink a label below its longest word (with the padding, always ≥ 44 px) */\n  padding: 0 16px;\n  border-radius: 999px;\n  background: transparent;\n  color: var(--anatomy-text);\n  font: 500 14px/1.1 var(--opt-ui);\n  letter-spacing: 0;\n  cursor: pointer;\n  touch-action: manipulation;\n  -webkit-tap-highlight-color: transparent;\n  transition: background-color 240ms var(--anatomy-ease), color 240ms var(--anatomy-ease);\n}\n.iso.optimal .opt-seg-btn[aria-checked=\"true\"] {\n  background: var(--opt-btn-on);\n  color: var(--opt-btn-on-text);\n}\n.iso.optimal .opt-seg-btn:focus-visible {\n  outline: 2px solid var(--opt-fig);\n  outline-offset: 2px;\n}\n.iso.optimal .opt-foot {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: flex-end;\n  justify-content: space-between;\n  gap: 10px 20px;\n  margin-top: 16px;\n}\n.iso.optimal .opt-hint {\n  font-family: var(--anatomy-mono);\n  font-size: 10.5px;\n  line-height: 1.4;\n  letter-spacing: 0.1em;\n  text-transform: uppercase;\n  color: var(--anatomy-muted);\n  flex: 1 1 160px;\n  min-width: 0;\n}\n.iso.optimal .opt-readout {\n  display: grid;\n  grid-auto-flow: column;\n  gap: 4px 18px;\n  margin: 0;\n  font-family: var(--opt-ui);\n  font-feature-settings: \"tnum\" 1;\n}\n.iso.optimal .opt-stat { margin: 0; min-width: 0; }\n.iso.optimal .opt-stat dt {\n  font-size: 10px;\n  font-weight: 600;\n  letter-spacing: 0.12em;\n  text-transform: uppercase;\n  color: var(--anatomy-muted);\n  white-space: nowrap;\n}\n.iso.optimal .opt-stat dd {\n  margin: 1px 0 0;\n  font-size: 15px;\n  font-weight: 500;\n  color: var(--anatomy-strong);\n  white-space: nowrap;\n}\n.iso.optimal .iso-legend { font-family: var(--opt-ui); font-size: 13.5px; }\n.iso.optimal .iso-caption { color: var(--anatomy-text); }\n.iso.optimal .iso-caption em { font-style: italic; }\n.iso.optimal .iso-swatch[data-mark=\"heat\"] path { stroke: var(--opt-heat-ink); stroke-width: 2; }\n.iso.optimal .iso-stage { outline: none; border-radius: 4px; touch-action: pan-y; -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none; }\n.iso.optimal .iso-stage:focus-visible { outline: 1px solid var(--anatomy-muted); outline-offset: 6px; }\n@media (max-width: 560px) {\n  .iso.optimal .opt-plate { padding: 44px 10px 14px; }\n  .iso.optimal .iso-plate-corners { inset: 16px 12px; }\n  .iso.optimal .opt-readout { grid-auto-flow: row; grid-template-columns: repeat(4, minmax(0, auto)); width: 100%; justify-content: space-between; gap: 4px 10px; order: -1; }\n  .iso.optimal .opt-stat dd { font-size: 14px; }\n  /* a long label wraps onto two lines instead of running into its neighbour; values stay on one baseline */\n  .iso.optimal .opt-stat { display: flex; flex-direction: column; justify-content: space-between; }\n  .iso.optimal .opt-stat dt { white-space: normal; line-height: 1.25; }\n  .iso.optimal .opt-seg-btn { padding: 0 12px; font-size: 13.5px; }\n}\n@media (max-width: 350px) {\n  .iso.optimal .opt-seg-btn { padding: 0 7px; font-size: 12.5px; }\n  .iso.optimal .opt-stat dt { font-size: 9px; letter-spacing: 0.08em; }\n  .iso.optimal .opt-stat dd { font-size: 13px; }\n}\n\n:host{display:block}\n.opt-host{background:transparent;color:var(--anatomy-text);font:15px/1.6 var(--opt-ui);-webkit-font-smoothing:antialiased}\n.opt-host *{box-sizing:border-box}\n.opt-host .iso-figure{margin:0}\n/* The mannequin (shared/mannequin.mjs): turned wood segments, steel ball joints, tracking dots. */\n.iso.optimal {\n  /* Forest night: dark walnut, so the figure sits in the room rather than glowing */\n  --mq-face: #6b5a44;\n  --mq-shade-0: #3f3326;\n  --mq-shade-1: #4b3d2d;\n  --mq-shade-2: #574735;\n  --mq-shade-3: #63523e;\n  --mq-top: #7a684f;\n  --mq-edge: #e9e6dc;\n}\n.iso.optimal[data-theme=\"light\"] {\n  /* Cream: pale beech */\n  --mq-face: #f3e6cf;\n  --mq-shade-0: #cdb592;\n  --mq-shade-1: #d9c4a3;\n  --mq-shade-2: #e4d2b5;\n  --mq-shade-3: #ecdec5;\n  --mq-top: #f8eedc;\n  --mq-edge: #3e3d39;\n}\n.mq-wood {\n  --anatomy-face: var(--mq-face);\n  --anatomy-paper: var(--mq-face);\n  --anatomy-shade-0: var(--mq-shade-0);\n  --anatomy-shade-1: var(--mq-shade-1);\n  --anatomy-shade-2: var(--mq-shade-2);\n  --anatomy-shade-3: var(--mq-shade-3);\n  --anatomy-top: var(--mq-top);\n}\n.mq-dot { fill: var(--anatomy-lit); stroke: var(--anatomy-card); stroke-width: 0.5; }\n.mq-glow { fill: var(--opt-heat); stroke: none; }\n.mq-glow-ring { fill: none; stroke: var(--opt-heat-ink); stroke-width: 0.6; }\n/* The assessor's tablet (shared/assessor.mjs) and its live screen (shared/vo2-plot.js). */\n.iso.optimal { --as-screen: #0f1b0c; --as-ink: #c9e3c1; --as-dim: #4f6b48; }\n.iso.optimal[data-theme=\"light\"] { --as-screen: #1d2a1a; --as-ink: #d9efd2; --as-dim: #5d7a56; }\n.as-screen { fill: var(--as-screen); }\n.vp-grid { fill: none; stroke: var(--as-dim); stroke-width: 0.22; opacity: 0.55; }\n.vp-axis { fill: none; stroke: var(--as-dim); stroke-width: 0.35; }\n.vp-guide { fill: none; stroke: var(--as-dim); stroke-width: 0.35; stroke-dasharray: 0.9 0.9; }\n.vp-ceiling { fill: none; stroke: var(--opt-heat); stroke-width: 0.4; stroke-dasharray: 1 0.7; }\n.vp-trace { fill: none; stroke: var(--opt-heat); stroke-width: 0.6; stroke-linejoin: round; stroke-linecap: round; }\n.vp-dot { fill: var(--as-ink); }\n.vp-tick { fill: var(--as-dim); font-family: var(--opt-ui); font-weight: 500; }\n.vp-big { fill: var(--as-ink); font-family: var(--opt-ui); font-weight: 600; font-feature-settings: \"tnum\" 1; }\n.vp-unit { fill: var(--as-dim); font-family: var(--opt-ui); font-weight: 500; }\n.vp-breath { fill: var(--as-ink); }\n/* Fig 4 · the belt, the instruments and the display's panels, in the figure's own inks. */\n.iso.optimal { --cr-screen: #0f1b0c; --cr-screen-ink: #c9e3c1; --cr-screen-dim: #4f6b48; --cr-screen-well: #1b2b17; }\n.iso.optimal[data-theme=\"light\"] { --cr-screen: #1d2a1a; --cr-screen-ink: #d9efd2; --cr-screen-dim: #5d7a56; --cr-screen-well: #2a3b26; }\n.cr-screen { fill: var(--cr-screen); }\n.cr-lens { fill: var(--anatomy-shade-0); }\n.cr-zero { fill: var(--anatomy-lit); stroke: none; }\n.cr-slats { stroke-width: 0.6; }\n.cr-mark { fill: none; stroke: var(--opt-heat-ink); stroke-width: 2.4; stroke-linecap: round; }\n.cr-laser { fill: none; stroke: var(--anatomy-lit); stroke-width: 1.1; stroke-linecap: round; }\n.cr-rider-mark { fill: none; stroke: var(--opt-heat-ink); stroke-width: 1.4; stroke-linecap: round; }\n.cr-well { fill: var(--cr-screen-well); }\n.cr-spot { fill: none; stroke: var(--anatomy-lit); stroke-width: 0.8; }\n.cr-beam { stroke-width: 0.6; stroke-dasharray: none; opacity: 0.85; }\n.cr-hold { fill: none; stroke: var(--anatomy-lit); stroke-width: 1; stroke-linecap: round; }\n.cr-com-ring { fill: none; stroke: var(--anatomy-lit); stroke-width: 0.7; }\n.cr-digits { fill: var(--cr-screen-ink); font-family: var(--opt-ui); font-weight: 600; font-feature-settings: \"tnum\" 1; }\n.cr-unit { fill: var(--cr-screen-dim); font-family: var(--opt-ui); font-weight: 500; }\n.cr-bones { fill: none; stroke: var(--cr-screen-ink); stroke-width: 0.7; stroke-linecap: round; opacity: 0.85; }\n.cr-joints circle { fill: var(--cr-screen-ink); }\n.cr-kneedot { fill: var(--opt-heat); }\n.cr-bar { fill: var(--opt-heat); }\n.cr-holdbar { fill: none; stroke: var(--opt-heat); stroke-width: 0.6; }\n.cr-ref { fill: none; stroke: var(--cr-screen-dim); stroke-width: 0.5; stroke-dasharray: 1 1; }\n.cr-axis { fill: none; stroke: var(--cr-screen-dim); stroke-width: 0.5; }\n.cr-trace { fill: none; stroke: var(--cr-screen-ink); stroke-width: 0.6; stroke-linejoin: round; }\n.cr-trace[data-side=\"R\"] { stroke: var(--cr-screen-dim); }\n.cr-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }\n.cr-par { display: block; margin-top: 6px; }\n.cr-par:first-child { margin-top: 0; }\n.cr-par small { font-size: 12.5px; color: var(--anatomy-muted); }\n.cr-scrub { display: flex; align-items: center; gap: 10px; margin: 10px 4px 0; }\n.cr-end { font: 500 13px/1 var(--opt-ui); color: var(--anatomy-muted); font-feature-settings: \"tnum\" 1; }\n.cr-slow { appearance: none; border: 0; min-height: 44px; min-width: 64px; padding: 0 14px; border-radius: 999px; background: transparent; box-shadow: inset 0 0 0 1px var(--opt-rule); color: var(--anatomy-text); font: 500 14px/1 var(--opt-ui); cursor: pointer; touch-action: manipulation; }\n.cr-slow[aria-pressed=\"true\"] { background: var(--opt-btn-on); color: var(--opt-btn-on-text); box-shadow: none; }\n.cr-slow:focus-visible { outline: 2px solid var(--opt-fig); outline-offset: 2px; }\n.cr-range { flex: 1; min-width: 0; height: 44px; margin: 0; background: transparent; accent-color: var(--opt-btn-on); -webkit-appearance: none; appearance: none; touch-action: pan-y; }\n.cr-range::-webkit-slider-runnable-track { height: 4px; border-radius: 2px; background: var(--opt-rule); }\n.cr-range::-moz-range-track { height: 4px; border-radius: 2px; background: var(--opt-rule); }\n.cr-range::-webkit-slider-thumb { -webkit-appearance: none; width: 28px; height: 28px; margin-top: -12px; border-radius: 50%; background: var(--opt-btn-on); border: 3px solid var(--anatomy-card); box-shadow: 0 0 0 1px var(--opt-rule); }\n.cr-range::-moz-range-thumb { width: 24px; height: 24px; border-radius: 50%; background: var(--opt-btn-on); border: 3px solid var(--anatomy-card); }\n.cr-range:focus-visible { outline: 2px solid var(--opt-fig); outline-offset: 2px; }\n/* Fig 5 · clear tubing and glass, the cart's screens, the breath layer. */\n.iso.optimal { --vo-screen: #0f1b0c; --vo-ink: #c9e3c1; --vo-dim: #4f6b48; --vo-glass: rgba(201, 227, 193, 0.10); --vo-glass-edge: #8e9884; }\n.iso.optimal[data-theme=\"light\"] { --vo-screen: #1d2a1a; --vo-ink: #d9efd2; --vo-dim: #5d7a56; --vo-glass: rgba(44, 78, 37, 0.06); --vo-glass-edge: #76736d; }\n.vo-stage { position: relative; }\n.vo-gl, .vo-front { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }\n.iso.optimal:not([data-theme=\"light\"]) .vo-gl { mix-blend-mode: screen; }\n.vo-stage[data-gl] .vo-fallback { display: none; }\n.vo-glass .iso-fill, .vo-glass .iso-top, .vo-glass .iso-shade { fill: var(--vo-glass); stroke: none; }\n.vo-hose .tb-body { fill: var(--vo-glass); }\n.vo-hose .tb-shine, .vo-hose .tb-shade { opacity: 0.35; }\n.vo-screen { fill: var(--vo-screen); }\n.vo-window { fill: var(--anatomy-shade-0); }\n.vo-level { fill: var(--anatomy-lit); }\n.vo-cell-label { fill: var(--anatomy-strong); font-family: var(--opt-ui); font-weight: 600; }\n.vo-grid { fill: none; stroke: var(--vo-dim); stroke-width: 0.25; opacity: 0.5; }\n.vo-axis { fill: none; stroke: var(--vo-dim); stroke-width: 0.4; }\n.vo-guide { fill: none; stroke: var(--vo-dim); stroke-width: 0.4; stroke-dasharray: 1 1; }\n.vo-ceiling { fill: none; stroke: var(--opt-heat); stroke-width: 0.45; stroke-dasharray: 1.2 0.8; }\n.vo-trace { fill: none; stroke: var(--opt-heat); stroke-width: 0.7; stroke-linejoin: round; stroke-linecap: round; }\n.vo-dot { fill: var(--vo-ink); }\n.vo-tick { fill: var(--vo-dim); font-family: var(--opt-ui); font-weight: 500; }\n.vo-strap { stroke-width: 1.6; }\n.vo-hole { fill: var(--anatomy-shade-1); stroke: var(--anatomy-lo); stroke-width: 0.4; }\n.vo-vane { fill: none; stroke: var(--anatomy-mid); stroke-width: 1.2; stroke-linecap: round; }\n.vo-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }\n.vo-par { display: block; margin-top: 6px; }\n.vo-par:first-child { margin-top: 0; }\n.vo-par small { font-size: 12.5px; color: var(--anatomy-muted); }\n.vo-scrub { display: flex; align-items: center; gap: 12px; margin: 10px 4px 0; }\n.vo-play { appearance: none; border: 0; min-height: 44px; min-width: 72px; padding: 0 16px; border-radius: 999px; background: transparent; box-shadow: inset 0 0 0 1px var(--opt-rule); color: var(--anatomy-text); font: 500 14px/1 var(--opt-ui); cursor: pointer; touch-action: manipulation; }\n.vo-play:focus-visible { outline: 2px solid var(--opt-fig); outline-offset: 2px; }\n.vo-clock { font: 500 13px/1 var(--opt-ui); color: var(--anatomy-muted); min-width: 40px; text-align: right; font-feature-settings: \"tnum\" 1; }\n.vo-range { flex: 1; min-width: 0; height: 44px; margin: 0; background: transparent; accent-color: var(--opt-btn-on); -webkit-appearance: none; appearance: none; touch-action: pan-y; }\n.vo-range::-webkit-slider-runnable-track { height: 4px; border-radius: 2px; background: var(--opt-rule); }\n.vo-range::-moz-range-track { height: 4px; border-radius: 2px; background: var(--opt-rule); }\n.vo-range::-webkit-slider-thumb { -webkit-appearance: none; width: 28px; height: 28px; margin-top: -12px; border-radius: 50%; background: var(--opt-btn-on); border: 3px solid var(--anatomy-card); box-shadow: 0 0 0 1px var(--opt-rule); }\n.vo-range::-moz-range-thumb { width: 24px; height: 24px; border-radius: 50%; background: var(--opt-btn-on); border: 3px solid var(--anatomy-card); }\n.vo-range:focus-visible { outline: 2px solid var(--opt-fig); outline-offset: 2px; }\n.vo-led { fill: var(--anatomy-lit); stroke: var(--anatomy-card); stroke-width: 0.4; }\n.cr-ui-label { fill: var(--cr-screen-dim); font-family: var(--opt-ui); font-weight: 500; letter-spacing: 0.02em; }\n.cr-ui-hero { fill: var(--cr-screen-ink); font-family: var(--opt-ui); font-weight: 600; font-feature-settings: \"tnum\" 1; }\n.cr-ui-val { fill: var(--cr-screen-ink); font-family: var(--opt-ui); font-weight: 600; font-feature-settings: \"tnum\" 1; }\n.cr-floor { fill: none; stroke: var(--cr-screen-dim); stroke-width: 0.4; }\n.cr-live { fill: var(--opt-heat-ink); }\n" + "</style><div class=\"iso optimal opt-host\" data-theme=\"" + theme + "\">" + "<figure class=\"iso-figure opt-figure \"><div class=\"iso-plate opt-plate\"><div class=\"iso-plate-corners\" aria-hidden=\"true\"><span class=\"iso-plate-corner\" data-corner=\"fig\">Fig 6</span><span class=\"iso-plate-corner\" data-corner=\"title\">The treadmill ramp</span></div><div class=\"iso-stage vo-stage\" tabindex=\"0\" role=\"slider\" aria-label=\"Minutes into the test. Left and right arrows move 15 seconds, Page Up and Down a minute, Space plays or pauses.\" aria-valuemin=\"0\" aria-valuemax=\"17.6\" aria-valuenow=\"0\" aria-valuetext=\"0:00, warm-up\"><svg xmlns=\"http://www.w3.org/2000/svg\" class=\"iso-svg\" viewBox=\"0 0 600 713\" role=\"img\" aria-label=\"A Creator 600 treadmill running a VO2max test: a wooden artist's mannequin runs on the belt in a face mask with a small wireless breath analyser on the front, while the belt speeds up a little every few seconds. Behind the treadmill an assessor stands holding a tablet that plots the oxygen the runner uses against speed: a straight line that flattens at the person's ceiling. The side touch panel shows the belt speed.\"><path class=\"iso-halo\" d=\"M15.8 637.6L16.4 636.2L17.7 634.9L19.6 633.7L22.1 632.7L416.3 499.7L419.3 498.9L422.6 498.3L426.2 498L430 497.9L433.6 498.1L437.1 498.6L440.3 499.3L443 500.3L579.3 557L581.5 558.1L583.1 559.3L584 560.7L584.2 562.1L584.2 562.3L583.6 563.7L582.3 565L580.4 566.2L577.9 567.2L183.7 700.2L180.7 701L177.4 701.6L173.8 701.9L170 702L166.4 701.8L162.9 701.3L159.7 700.6L157 699.6L20.7 642.9L18.5 641.8L16.9 640.6L16 639.2L15.8 637.8Z\"/><g class=\"it\" data-name=\"stand.foot\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M367.1 507.3L367.2 506.4L368 505.6L369.5 504.9L371.5 504.4L373.8 504.2L376.2 504.2L378.4 504.5L380.2 505.1L381.5 505.9L382.1 506.7L382.1 522.1L382 523L381.2 523.8L379.7 524.5L377.7 525L375.4 525.2L373 525.2L370.8 524.8L369 524.3L367.7 523.5L367.1 522.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M382.1 522.1L382 523L382 507.6L382.1 506.7ZM382 523L381.2 523.8L381.2 508.4L382 507.6ZM381.2 523.8L379.7 524.5L379.7 509.1L381.2 508.4ZM379.7 524.5L377.7 525L377.7 509.6L379.7 509.1Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M377.7 525L375.4 525.2L375.4 509.8L377.7 509.6Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M375.4 525.2L373 525.2L373 509.8L375.4 509.8ZM373 525.2L370.8 524.8L370.8 509.5L373 509.8Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M370.8 524.8L369 524.3L369 508.9L370.8 509.5ZM369 524.3L367.7 523.5L367.7 508.2L369 508.9ZM367.7 523.5L367.1 522.7L367.1 507.3L367.7 508.2Z\"/><path class=\"iso-top\" d=\"M380.2 505.1L381.5 505.9L382.1 506.7L382 507.6L381.2 508.4L379.7 509.1L377.7 509.6L375.4 509.8L373 509.8L370.8 509.5L369 508.9L367.7 508.2L367.1 507.3L367.2 506.4L368 505.6L369.5 504.9L371.5 504.4L373.8 504.2L376.2 504.2L378.4 504.5Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M382.1 506.7L382 507.6L381.2 508.4L379.7 509.1L377.7 509.6L375.4 509.8L373 509.8L370.8 509.5L369 508.9L367.7 508.2L367.1 507.3\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M367.1 507.3L367.2 506.4L368 505.6L369.5 504.9L371.5 504.4L373.8 504.2L376.2 504.2L378.4 504.5L380.2 505.1L381.5 505.9L382.1 506.7M382.1 522.1L382 523L381.2 523.8L379.7 524.5L377.7 525L375.4 525.2L373 525.2L370.8 524.8L369 524.3L367.7 523.5L367.1 522.7M382.1 506.7L382.1 522.1M367.1 507.3L367.1 522.7\"/></g></g><g class=\"it\" data-name=\"column\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M401.3 377.4L401.5 376L403.5 374.9L445.7 360.6L449 360L452.6 360.1L455.7 360.8L566.6 407L568.3 408.2L568.3 553.1L568.1 554.5L566.1 555.7L523.9 569.9L520.6 570.5L516.9 570.5L513.9 569.7L402.9 523.6L401.3 522.3Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M568.3 553.1L568.1 554.5L568.1 409.6L568.3 408.2ZM568.1 554.5L566.1 555.7L566.1 410.7L568.1 409.6ZM566.1 555.7L523.9 569.9L523.9 425L566.1 410.7Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M523.9 569.9L520.6 570.5L520.6 425.6L523.9 425Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M520.6 570.5L516.9 570.5L516.9 425.5L520.6 425.6Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M516.9 570.5L513.9 569.7L513.9 424.8L516.9 425.5ZM513.9 569.7L402.9 523.6L402.9 378.6L513.9 424.8ZM402.9 523.6L401.3 522.3L401.3 377.4L402.9 378.6Z\"/><path class=\"iso-top\" d=\"M445.7 360.6L449 360L452.6 360.1L455.7 360.8L566.6 407L568.3 408.2L568.1 409.6L566.1 410.7L523.9 425L520.6 425.6L516.9 425.5L513.9 424.8L402.9 378.6L401.3 377.4L401.5 376L403.5 374.9Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M568.3 408.2L568.1 409.6L566.1 410.7L523.9 425L520.6 425.6L516.9 425.5L513.9 424.8L402.9 378.6L401.3 377.4\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M568.3 408.2L566.8 409.4L565 410.4L523.1 424.5L520.3 425.1L517.4 425L514.8 424.4L404.1 378.3L401.3 377.4\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M401.3 377.4L401.5 376L403.5 374.9L445.7 360.6L449 360L452.6 360.1L455.7 360.8L566.6 407L568.3 408.2M568.3 553.1L568.1 554.5L566.1 555.7L523.9 569.9L520.6 570.5L516.9 570.5L513.9 569.7L402.9 523.6L401.3 522.3M568.3 408.2L568.3 553.1M401.3 377.4L401.3 522.3\"/></g><path class=\"iso-line\" data-tone=\"lo\" d=\"M417.2 504.5L499.6 538.8L499.6 536.1L417.2 501.8ZM417.2 491.3L499.6 525.6L499.6 522.9L417.2 488.7ZM417.2 478.1L499.6 512.4L499.6 509.8L417.2 475.5ZM417.2 465L499.6 499.2L499.6 496.6L417.2 462.3ZM417.2 451.8L499.6 486.1L499.6 483.4L417.2 449.1ZM417.2 438.6L499.6 472.9L499.6 470.2L417.2 436ZM417.2 425.4L499.6 459.7L499.6 457.1L417.2 422.8ZM417.2 412.3L499.6 446.5L499.6 443.9L417.2 409.6Z\"/></g><g class=\"it\" data-name=\"stand.foot\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M201.6 563.1L201.7 562.2L202.6 561.4L204.1 560.7L206.1 560.2L208.4 560L210.7 560L212.9 560.3L214.8 560.9L216.1 561.6L216.7 562.5L216.7 577.9L216.6 578.8L215.7 579.6L214.2 580.3L212.2 580.8L210 581L207.6 581L205.4 580.6L203.5 580.1L202.2 579.3L201.6 578.5Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M216.7 577.9L216.6 578.8L216.6 563.4L216.7 562.5ZM216.6 578.8L215.7 579.6L215.7 564.2L216.6 563.4ZM215.7 579.6L214.2 580.3L214.2 564.9L215.7 564.2ZM214.2 580.3L212.2 580.8L212.2 565.4L214.2 564.9Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M212.2 580.8L210 581L210 565.6L212.2 565.4Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M210 581L207.6 581L207.6 565.6L210 565.6ZM207.6 581L205.4 580.6L205.4 565.3L207.6 565.6Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M205.4 580.6L203.5 580.1L203.5 564.7L205.4 565.3ZM203.5 580.1L202.2 579.3L202.2 564L203.5 564.7ZM202.2 579.3L201.6 578.5L201.6 563.1L202.2 564Z\"/><path class=\"iso-top\" d=\"M214.8 560.9L216.1 561.6L216.7 562.5L216.6 563.4L215.7 564.2L214.2 564.9L212.2 565.4L210 565.6L207.6 565.6L205.4 565.3L203.5 564.7L202.2 564L201.6 563.1L201.7 562.2L202.6 561.4L204.1 560.7L206.1 560.2L208.4 560L210.7 560L212.9 560.3Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M216.7 562.5L216.6 563.4L215.7 564.2L214.2 564.9L212.2 565.4L210 565.6L207.6 565.6L205.4 565.3L203.5 564.7L202.2 564L201.6 563.1\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M201.6 563.1L201.7 562.2L202.6 561.4L204.1 560.7L206.1 560.2L208.4 560L210.7 560L212.9 560.3L214.8 560.9L216.1 561.6L216.7 562.5M216.7 577.9L216.6 578.8L215.7 579.6L214.2 580.3L212.2 580.8L210 581L207.6 581L205.4 580.6L203.5 580.1L202.2 579.3L201.6 578.5M216.7 562.5L216.7 577.9M201.6 563.1L201.6 578.5\"/></g></g><g class=\"it\" data-name=\"stand.foot\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M506.5 565.3L506.6 564.4L507.5 563.6L509 562.9L511 562.4L513.2 562.2L515.6 562.2L517.8 562.6L519.7 563.1L521 563.9L521.6 564.7L521.6 580.1L521.4 581L520.6 581.8L519.1 582.5L517.1 583L514.8 583.2L512.5 583.2L510.2 582.8L508.4 582.3L507.1 581.5L506.5 580.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M521.6 580.1L521.4 581L521.4 565.6L521.6 564.7ZM521.4 581L520.6 581.8L520.6 566.4L521.4 565.6ZM520.6 581.8L519.1 582.5L519.1 567.1L520.6 566.4ZM519.1 582.5L517.1 583L517.1 567.6L519.1 567.1Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M517.1 583L514.8 583.2L514.8 567.8L517.1 567.6Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M514.8 583.2L512.5 583.2L512.5 567.8L514.8 567.8ZM512.5 583.2L510.2 582.8L510.2 567.5L512.5 567.8Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M510.2 582.8L508.4 582.3L508.4 566.9L510.2 567.5ZM508.4 582.3L507.1 581.5L507.1 566.2L508.4 566.9ZM507.1 581.5L506.5 580.7L506.5 565.3L507.1 566.2Z\"/><path class=\"iso-top\" d=\"M519.7 563.1L521 563.9L521.6 564.7L521.4 565.6L520.6 566.4L519.1 567.1L517.1 567.6L514.8 567.8L512.5 567.8L510.2 567.5L508.4 566.9L507.1 566.2L506.5 565.3L506.6 564.4L507.5 563.6L509 562.9L511 562.4L513.2 562.2L515.6 562.2L517.8 562.6Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M521.6 564.7L521.4 565.6L520.6 566.4L519.1 567.1L517.1 567.6L514.8 567.8L512.5 567.8L510.2 567.5L508.4 566.9L507.1 566.2L506.5 565.3\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M506.5 565.3L506.6 564.4L507.5 563.6L509 562.9L511 562.4L513.2 562.2L515.6 562.2L517.8 562.6L519.7 563.1L521 563.9L521.6 564.7M521.6 580.1L521.4 581L520.6 581.8L519.1 582.5L517.1 583L514.8 583.2L512.5 583.2L510.2 582.8L508.4 582.3L507.1 581.5L506.5 580.7M521.6 564.7L521.6 580.1M506.5 565.3L506.5 580.7\"/></g></g><g class=\"it\" data-name=\"display\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M416.4 8.7L416.6 7.6L418.2 6.6L437.6 0.1L440.3 -0.4L443.4 -0.4L446 0.2L555.3 45.7L556.7 46.8L556.7 411.2L556.5 412.4L554.9 413.3L535.5 419.9L532.8 420.4L529.7 420.3L527.1 419.7L417.8 374.2L416.4 373.2Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M556.7 411.2L556.5 412.4L556.5 47.9L556.7 46.8ZM556.5 412.4L554.9 413.3L554.9 48.9L556.5 47.9ZM554.9 413.3L535.5 419.9L535.5 55.4L554.9 48.9Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M535.5 419.9L532.8 420.4L532.8 55.9L535.5 55.4Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M532.8 420.4L529.7 420.3L529.7 55.9L532.8 55.9Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M529.7 420.3L527.1 419.7L527.1 55.2L529.7 55.9ZM527.1 419.7L417.8 374.2L417.8 9.7L527.1 55.2ZM417.8 374.2L416.4 373.2L416.4 8.7L417.8 9.7Z\"/><path class=\"iso-top\" d=\"M437.6 0.1L440.3 -0.4L443.4 -0.4L446 0.2L555.3 45.7L556.7 46.8L556.5 47.9L554.9 48.9L535.5 55.4L532.8 55.9L529.7 55.9L527.1 55.2L417.8 9.7L416.4 8.7L416.6 7.6L418.2 6.6Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M556.7 46.8L556.5 47.9L554.9 48.9L535.5 55.4L532.8 55.9L529.7 55.9L527.1 55.2L417.8 9.7L416.4 8.7\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M556.7 46.8L554.7 47.7L553.4 48.4L534.4 54.8L532.4 55.2L530.3 55.2L528.4 54.7L419.4 9.3L416.4 8.7\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M416.4 8.7L416.6 7.6L418.2 6.6L437.6 0.1L440.3 -0.4L443.4 -0.4L446 0.2L555.3 45.7L556.7 46.8M556.7 411.2L556.5 412.4L554.9 413.3L535.5 419.9L532.8 420.4L529.7 420.3L527.1 419.7L417.8 374.2L416.4 373.2M556.7 46.8L556.7 411.2M416.4 8.7L416.4 373.2\"/></g><path class=\"iso-line\" data-tone=\"faint\" d=\"M434.4 369.1L510.4 400.7L510.4 398.5L434.4 366.9ZM434.4 360.3L510.4 391.9L510.4 389.8L434.4 358.1ZM434.4 351.5L510.4 383.2L510.4 381L434.4 349.3Z\"/><g data-part=\"screen\" transform=\"matrix(1.5846 0.6593 0.0000 2.1957 423.27 25.24)\"><rect class=\"cr-screen\" x=\"0\" y=\"0\" width=\"62\" height=\"111\" rx=\"1.2\"/><g data-part=\"screen-body\"></g><rect class=\"iso-line\" data-tone=\"mid\" fill=\"none\" x=\"0\" y=\"0\" width=\"62\" height=\"111\" rx=\"1.2\"/></g></g><g class=\"it\" data-name=\"camera\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M454.9 287.8L455.8 287L456.9 286.7L458.9 286.4L460.9 286.8L484 296.4L484.8 297.2L484.8 325.7L483.8 326.4L482.8 326.8L480.7 327.1L478.8 326.7L455.6 317.1L454.9 316.3Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M484.8 325.7L483.8 326.4L483.8 297.9L484.8 297.2ZM483.8 326.4L482.8 326.8L482.8 298.2L483.8 297.9Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M482.8 326.8L480.7 327.1L480.7 298.5L482.8 298.2Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M480.7 327.1L478.8 326.7L478.8 298.2L480.7 298.5Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M478.8 326.7L455.6 317.1L455.6 288.5L478.8 298.2ZM455.6 317.1L454.9 316.3L454.9 287.8L455.6 288.5Z\"/><path class=\"iso-top\" d=\"M456.9 286.7L458.9 286.4L460.9 286.8L484 296.4L484.8 297.2L483.8 297.9L482.8 298.2L480.7 298.5L478.8 298.2L455.6 288.5L454.9 287.8L455.8 287Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M484.8 297.2L483.8 297.9L482.8 298.2L480.7 298.5L478.8 298.2L455.6 288.5L454.9 287.8\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M454.9 287.8L455.8 287L456.9 286.7L458.9 286.4L460.9 286.8L484 296.4L484.8 297.2M484.8 325.7L483.8 326.4L482.8 326.8L480.7 327.1L478.8 326.7L455.6 317.1L454.9 316.3M484.8 297.2L484.8 325.7M454.9 287.8L454.9 316.3\"/></g><path class=\"cr-lens\" d=\"M464.6 306.6L464.5 305.1L464 303.5L463.4 302.1L462.5 300.8L461.5 299.8L460.5 299.2L459.4 298.9L458.4 299.1L457.6 299.6L456.9 300.5L456.5 301.7L456.4 303.2L456.5 304.7L456.9 306.2L457.6 307.7L458.4 309L459.4 309.9L460.5 310.6L461.5 310.8L462.5 310.7L463.4 310.1L464 309.2L464.5 308Z\"/><path class=\"iso-line\" data-tone=\"mid\" d=\"M464.6 306.6L464.5 305.1L464 303.5L463.4 302.1L462.5 300.8L461.5 299.8L460.5 299.2L459.4 298.9L458.4 299.1L457.6 299.6L456.9 300.5L456.5 301.7L456.4 303.2L456.5 304.7L456.9 306.2L457.6 307.7L458.4 309L459.4 309.9L460.5 310.6L461.5 310.8L462.5 310.7L463.4 310.1L464 309.2L464.5 308Z\"/><path class=\"cr-lens\" d=\"M477.9 312.1L477.8 310.6L477.4 309L476.7 307.6L475.9 306.3L474.9 305.3L473.8 304.7L472.7 304.5L471.7 304.6L470.9 305.2L470.2 306.1L469.8 307.3L469.7 308.7L469.8 310.2L470.2 311.8L470.9 313.2L471.7 314.5L472.7 315.5L473.8 316.1L474.9 316.4L475.9 316.2L476.7 315.7L477.4 314.8L477.8 313.5Z\"/><path class=\"iso-line\" data-tone=\"mid\" d=\"M477.9 312.1L477.8 310.6L477.4 309L476.7 307.6L475.9 306.3L474.9 305.3L473.8 304.7L472.7 304.5L471.7 304.6L470.9 305.2L470.2 306.1L469.8 307.3L469.7 308.7L469.8 310.2L470.2 311.8L470.9 313.2L471.7 314.5L472.7 315.5L473.8 316.1L474.9 316.4L475.9 316.2L476.7 315.7L477.4 314.8L477.8 313.5Z\"/><g class=\"iso-dots\" data-tone=\"lit\"><circle cx=\"467.1\" cy=\"316.2\" r=\"0.8\"/></g></g><g class=\"it\" data-name=\"stand.foot\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M341.1 621.1L341.2 620.2L342 619.4L343.5 618.7L345.5 618.2L347.8 618L350.2 618L352.4 618.4L354.2 618.9L355.5 619.7L356.1 620.5L356.1 635.9L356 636.8L355.2 637.6L353.7 638.3L351.7 638.8L349.4 639L347 639L344.8 638.6L343 638.1L341.7 637.3L341.1 636.5Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M356.1 635.9L356 636.8L356 621.4L356.1 620.5ZM356 636.8L355.2 637.6L355.2 622.2L356 621.4ZM355.2 637.6L353.7 638.3L353.7 622.9L355.2 622.2ZM353.7 638.3L351.7 638.8L351.7 623.4L353.7 622.9Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M351.7 638.8L349.4 639L349.4 623.6L351.7 623.4Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M349.4 639L347 639L347 623.6L349.4 623.6ZM347 639L344.8 638.6L344.8 623.3L347 623.6Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M344.8 638.6L343 638.1L343 622.7L344.8 623.3ZM343 638.1L341.7 637.3L341.7 622L343 622.7ZM341.7 637.3L341.1 636.5L341.1 621.1L341.7 622Z\"/><path class=\"iso-top\" d=\"M354.2 618.9L355.5 619.7L356.1 620.5L356 621.4L355.2 622.2L353.7 622.9L351.7 623.4L349.4 623.6L347 623.6L344.8 623.3L343 622.7L341.7 622L341.1 621.1L341.2 620.2L342 619.4L343.5 618.7L345.5 618.2L347.8 618L350.2 618L352.4 618.4Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M356.1 620.5L356 621.4L355.2 622.2L353.7 622.9L351.7 623.4L349.4 623.6L347 623.6L344.8 623.3L343 622.7L341.7 622L341.1 621.1\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M341.1 621.1L341.2 620.2L342 619.4L343.5 618.7L345.5 618.2L347.8 618L350.2 618L352.4 618.4L354.2 618.9L355.5 619.7L356.1 620.5M356.1 635.9L356 636.8L355.2 637.6L353.7 638.3L351.7 638.8L349.4 639L347 639L344.8 638.6L343 638.1L341.7 637.3L341.1 636.5M356.1 620.5L356.1 635.9M341.1 621.1L341.1 636.5\"/></g></g><g class=\"it\" data-name=\"deck\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M54.6 577.2L55 574.5L59 572.1L367 468.3L373.6 467L380.9 467.2L387.1 468.7L529.7 528L533 530.4L533 563.4L532.7 566.1L528.6 568.4L220.7 672.3L214.1 673.6L206.8 673.4L200.6 671.9L58 612.6L54.6 610.1Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M533 563.4L532.7 566.1L532.7 533.2L533 530.4ZM532.7 566.1L528.6 568.4L528.6 535.5L532.7 533.2ZM528.6 568.4L220.7 672.3L220.7 639.4L528.6 535.5Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M220.7 672.3L214.1 673.6L214.1 640.6L220.7 639.4Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M214.1 673.6L206.8 673.4L206.8 640.5L214.1 640.6Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M206.8 673.4L200.6 671.9L200.6 639L206.8 640.5ZM200.6 671.9L58 612.6L58 579.7L200.6 639ZM58 612.6L54.6 610.1L54.6 577.2L58 579.7Z\"/><path class=\"iso-top\" d=\"M367 468.3L373.6 467L380.9 467.2L387.1 468.7L529.7 528L533 530.4L532.7 533.2L528.6 535.5L220.7 639.4L214.1 640.6L206.8 640.5L200.6 639L58 579.7L54.6 577.2L55 574.5L59 572.1Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M533 530.4L532.7 533.2L528.6 535.5L220.7 639.4L214.1 640.6L206.8 640.5L200.6 639L58 579.7L54.6 577.2\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M533 530.4L531.3 533L527.6 535.2L219.9 639L213.8 640.1L207.2 640L201.5 638.6L59.2 579.4L54.6 577.2\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M533 552.4L532.7 555.2L528.6 557.5L220.7 661.3L214.1 662.6L206.8 662.5L200.6 661L58 601.6L54.6 599.2\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M54.6 577.2L55 574.5L59 572.1L367 468.3L373.6 467L380.9 467.2L387.1 468.7L529.7 528L533 530.4M533 563.4L532.7 566.1L528.6 568.4L220.7 672.3L214.1 673.6L206.8 673.4L200.6 671.9L58 612.6L54.6 610.1M533 530.4L533 563.4M54.6 577.2L54.6 610.1\"/></g></g><g class=\"it\" data-name=\"uprightR\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M324.9 270.4L335.9 263.6L342.8 266.5L381.5 468.6L370.6 475.4L363.6 472.5Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M381.5 468.6L370.6 475.4L331.8 273.3L342.8 266.5Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M370.6 475.4L363.6 472.5L324.9 270.4L331.8 273.3Z\"/><path class=\"iso-top\" d=\"M335.9 263.6L342.8 266.5L331.8 273.3L324.9 270.4Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M342.8 266.5L331.8 273.3M370.6 475.4L331.8 273.3M331.8 273.3L324.9 270.4\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M324.9 270.4L335.9 263.6L342.8 266.5L381.5 468.6L370.6 475.4L363.6 472.5Z\"/></g></g><g class=\"it\" data-name=\"hood\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M347.8 466.3L348.1 464.5L350.7 462.9L382.4 452.3L386.8 451.4L391.7 451.5L395.8 452.5L521 504.6L523.2 506.2L523.2 526L523 527.8L520.3 529.4L488.6 540.1L484.2 540.9L479.3 540.8L475.2 539.8L350 487.7L347.8 486.1Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M523.2 526L523 527.8L523 508.1L523.2 506.2ZM523 527.8L520.3 529.4L520.3 509.6L523 508.1ZM520.3 529.4L488.6 540.1L488.6 520.3L520.3 509.6Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M488.6 540.1L484.2 540.9L484.2 521.1L488.6 520.3Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M484.2 540.9L479.3 540.8L479.3 521L484.2 521.1Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M479.3 540.8L475.2 539.8L475.2 520L479.3 521ZM475.2 539.8L350 487.7L350 468L475.2 520ZM350 487.7L347.8 486.1L347.8 466.3L350 468Z\"/><path class=\"iso-top\" d=\"M382.4 452.3L386.8 451.4L391.7 451.5L395.8 452.5L521 504.6L523.2 506.2L523 508.1L520.3 509.6L488.6 520.3L484.2 521.1L479.3 521L475.2 520L350 468L347.8 466.3L348.1 464.5L350.7 462.9Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M523.2 506.2L523 508.1L520.3 509.6L488.6 520.3L484.2 521.1L479.3 521L475.2 520L350 468L347.8 466.3\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M523.2 506.2L521.6 507.9L519.2 509.3L487.8 519.9L483.9 520.6L479.8 520.5L476.1 519.6L351.2 467.7L347.8 466.3\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M347.8 466.3L348.1 464.5L350.7 462.9L382.4 452.3L386.8 451.4L391.7 451.5L395.8 452.5L521 504.6L523.2 506.2M523.2 526L523 527.8L520.3 529.4L488.6 540.1L484.2 540.9L479.3 540.8L475.2 539.8L350 487.7L347.8 486.1M523.2 506.2L523.2 526M347.8 466.3L347.8 486.1\"/></g><path class=\"iso-line\" data-tone=\"lo\" d=\"M397.6 462.3L399 462.1L400.3 462.4L400.3 462.4L400.8 462.9L400.2 463.4L381.8 469.5L380.5 469.7L379.2 469.5L379.2 469.5L378.7 469L379.3 468.5ZM416.6 470.2L418 470L419.3 470.3L419.3 470.3L419.8 470.8L419.2 471.3L400.9 477.4L399.5 477.6L398.2 477.4L398.2 477.4L397.7 476.9L398.3 476.4ZM435.6 478.1L437 477.9L438.3 478.2L438.3 478.2L438.8 478.7L438.2 479.2L419.9 485.3L418.5 485.5L417.2 485.3L417.2 485.3L416.7 484.8L417.3 484.3ZM454.7 486L456 485.9L457.3 486.1L457.3 486.1L457.8 486.6L457.2 487.1L438.9 493.3L437.5 493.4L436.2 493.2L436.2 493.2L435.7 492.7L436.4 492.2ZM473.7 493.9L475 493.8L476.4 494L476.4 494L476.8 494.5L476.2 495L457.9 501.2L456.5 501.4L455.2 501.1L455.2 501.1L454.8 500.6L455.4 500.1ZM492.7 501.9L494.1 501.7L495.4 501.9L495.4 501.9L495.9 502.4L495.2 502.9L476.9 509.1L475.6 509.3L474.2 509L474.2 509L473.8 508.5L474.4 508Z\"/></g><g class=\"it\" data-name=\"railR\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M204.9 301.1L205.1 299.9L206.8 298.9L338.8 254.4L341.5 253.9L344.6 254L347.1 254.6L348.7 255.3L350.1 256.3L350.1 269.4L349.9 270.6L348.3 271.6L216.3 316.1L213.6 316.6L210.5 316.5L207.9 315.9L206.3 315.3L204.9 314.2Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M350.1 269.4L349.9 270.6L349.9 257.4L350.1 256.3ZM349.9 270.6L348.3 271.6L348.3 258.4L349.9 257.4ZM348.3 271.6L216.3 316.1L216.3 302.9L348.3 258.4Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M216.3 316.1L213.6 316.6L213.6 303.4L216.3 302.9Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M213.6 316.6L210.5 316.5L210.5 303.4L213.6 303.4Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M210.5 316.5L207.9 315.9L207.9 302.7L210.5 303.4ZM207.9 315.9L206.3 315.3L206.3 302.1L207.9 302.7ZM206.3 315.3L204.9 314.2L204.9 301.1L206.3 302.1Z\"/><path class=\"iso-top\" d=\"M338.8 254.4L341.5 253.9L344.6 254L347.1 254.6L348.7 255.3L350.1 256.3L349.9 257.4L348.3 258.4L216.3 302.9L213.6 303.4L210.5 303.4L207.9 302.7L206.3 302.1L204.9 301.1L205.1 299.9L206.8 298.9Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M350.1 256.3L349.9 257.4L348.3 258.4L216.3 302.9L213.6 303.4L210.5 303.4L207.9 302.7L206.3 302.1L204.9 301.1\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M350.1 256.3L348.8 257.3L347.4 258.1L215.6 302.5L213.3 303L210.9 302.9L208.7 302.4L207.3 301.8L204.9 301.1\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M350.1 264.6L349.9 265.8L348.3 266.7L216.3 311.2L213.6 311.8L210.5 311.7L207.9 311.1L206.3 310.4L204.9 309.4\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M204.9 301.1L205.1 299.9L206.8 298.9L338.8 254.4L341.5 253.9L344.6 254L347.1 254.6L348.7 255.3L350.1 256.3M350.1 269.4L349.9 270.6L348.3 271.6L216.3 316.1L213.6 316.6L210.5 316.5L207.9 315.9L206.3 315.3L204.9 314.2M350.1 256.3L350.1 269.4M204.9 301.1L204.9 314.2\"/></g></g><g class=\"it\" data-name=\"deck.railR\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M49.5 570L50.2 569.4L330.1 475L331.8 474.8L333.4 475.1L365.1 488.3L365.7 488.9L365.7 494.6L364.9 495.2L85.1 589.6L83.4 589.8L81.8 589.6L50.1 576.4L49.5 575.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M365.7 494.6L364.9 495.2L364.9 489.5L365.7 488.9ZM364.9 495.2L85.1 589.6L85.1 583.9L364.9 489.5Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M85.1 589.6L83.4 589.8L83.4 584.1L85.1 583.9Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M83.4 589.8L81.8 589.6L81.8 583.8L83.4 584.1Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M81.8 589.6L50.1 576.4L50.1 570.7L81.8 583.8ZM50.1 576.4L49.5 575.7L49.5 570L50.1 570.7Z\"/><path class=\"iso-top\" d=\"M330.1 475L331.8 474.8L333.4 475.1L365.1 488.3L365.7 488.9L364.9 489.5L85.1 583.9L83.4 584.1L81.8 583.8L50.1 570.7L49.5 570L50.2 569.4Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M365.7 488.9L364.9 489.5L85.1 583.9L83.4 584.1L81.8 583.8L50.1 570.7L49.5 570\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M49.5 570L50.2 569.4L330.1 475L331.8 474.8L333.4 475.1L365.1 488.3L365.7 488.9M365.7 494.6L364.9 495.2L85.1 589.6L83.4 589.8L81.8 589.6L50.1 576.4L49.5 575.7M365.7 488.9L365.7 494.6M49.5 570L49.5 575.7\"/></g><path class=\"iso-line\" data-tone=\"lo\" d=\"M76.2 581.5L359.5 486M69.9 578.9L353.2 483.3M63.5 576.3L346.9 480.7M57.2 573.6L340.5 478.1\"/></g><g class=\"it\" data-name=\"railcapR\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M192.2 303.6L192.4 302.2L194.4 301.1L199.7 299.3L202.9 298.7L206.6 298.8L209.7 299.5L211.6 300.3L213.3 301.5L213.3 317.3L213.1 318.7L211.1 319.9L205.8 321.7L202.5 322.3L198.8 322.2L195.8 321.5L193.9 320.7L192.2 319.4Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M213.3 317.3L213.1 318.7L213.1 302.9L213.3 301.5ZM213.1 318.7L211.1 319.9L211.1 304.1L213.1 302.9ZM211.1 319.9L205.8 321.7L205.8 305.8L211.1 304.1Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M205.8 321.7L202.5 322.3L202.5 306.5L205.8 305.8Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M202.5 322.3L198.8 322.2L198.8 306.4L202.5 306.5Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M198.8 322.2L195.8 321.5L195.8 305.6L198.8 306.4ZM195.8 321.5L193.9 320.7L193.9 304.9L195.8 305.6ZM193.9 320.7L192.2 319.4L192.2 303.6L193.9 304.9Z\"/><path class=\"iso-top\" d=\"M199.7 299.3L202.9 298.7L206.6 298.8L209.7 299.5L211.6 300.3L213.3 301.5L213.1 302.9L211.1 304.1L205.8 305.8L202.5 306.5L198.8 306.4L195.8 305.6L193.9 304.9L192.2 303.6L192.4 302.2L194.4 301.1Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M213.3 301.5L213.1 302.9L211.1 304.1L205.8 305.8L202.5 306.5L198.8 306.4L195.8 305.6L193.9 304.9L192.2 303.6\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M192.2 303.6L192.4 302.2L194.4 301.1L199.7 299.3L202.9 298.7L206.6 298.8L209.7 299.5L211.6 300.3L213.3 301.5M213.3 317.3L213.1 318.7L211.1 319.9L205.8 321.7L202.5 322.3L198.8 322.2L195.8 321.5L193.9 320.7L192.2 319.4M213.3 301.5L213.3 317.3M192.2 303.6L192.2 319.4\"/></g><g class=\"iso-dots\" data-tone=\"mid\"><circle cx=\"197.9\" cy=\"302.5\" r=\"0.55\"/><circle cx=\"202.3\" cy=\"304.4\" r=\"0.55\"/></g></g><g class=\"it\" data-name=\"console.stalk\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M330.5 227.3L330.9 226.9L331.6 226.5L332.7 226.2L334 226.2L335.3 226.3L336.3 226.6L337 227L337.2 227.5L337.2 259.7L336.8 260.2L336.1 260.6L335 260.8L333.7 260.9L332.4 260.8L331.4 260.5L330.7 260.1L330.5 259.6Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M337.2 259.7L336.8 260.2L336.8 227.9L337.2 227.5ZM336.8 260.2L336.1 260.6L336.1 228.3L336.8 227.9ZM336.1 260.6L335 260.8L335 228.6L336.1 228.3Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M335 260.8L333.7 260.9L333.7 228.6L335 228.6Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M333.7 260.9L332.4 260.8L332.4 228.5L333.7 228.6Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M332.4 260.8L331.4 260.5L331.4 228.2L332.4 228.5ZM331.4 260.5L330.7 260.1L330.7 227.8L331.4 228.2ZM330.7 260.1L330.5 259.6L330.5 227.3L330.7 227.8Z\"/><path class=\"iso-top\" d=\"M336.3 226.6L337 227L337.2 227.5L336.8 227.9L336.1 228.3L335 228.6L333.7 228.6L332.4 228.5L331.4 228.2L330.7 227.8L330.5 227.3L330.9 226.9L331.6 226.5L332.7 226.2L334 226.2L335.3 226.3Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M337.2 227.5L336.8 227.9L336.1 228.3L335 228.6L333.7 228.6L332.4 228.5L331.4 228.2L330.7 227.8L330.5 227.3\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M330.5 227.3L330.9 226.9L331.6 226.5L332.7 226.2L334 226.2L335.3 226.3L336.3 226.6L337 227L337.2 227.5M337.2 259.7L336.8 260.2L336.1 260.6L335 260.8L333.7 260.9L332.4 260.8L331.4 260.5L330.7 260.1L330.5 259.6M337.2 227.5L337.2 259.7M330.5 227.3L330.5 259.6\"/></g></g><g class=\"it\" data-name=\"belt\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M78.5 587.6L78.9 587.3L365.8 490.5L366.7 490.4L367.5 490.6L457.8 528.2L458.1 528.5L458.1 532.9L457.7 533.2L170.8 629.9L170 630L169.2 629.9L78.9 592.3L78.5 592Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M458.1 532.9L457.7 533.2L457.7 528.8L458.1 528.5ZM457.7 533.2L170.8 629.9L170.8 625.5L457.7 528.8Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M170.8 629.9L170 630L170 625.7L170.8 625.5Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M170 630L169.2 629.9L169.2 625.5L170 625.7Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M169.2 629.9L78.9 592.3L78.9 587.9L169.2 625.5ZM78.9 592.3L78.5 592L78.5 587.6L78.9 587.9Z\"/><path class=\"iso-top\" d=\"M365.8 490.5L366.7 490.4L367.5 490.6L457.8 528.2L458.1 528.5L457.7 528.8L170.8 625.5L170 625.7L169.2 625.5L78.9 587.9L78.5 587.6L78.9 587.3Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M458.1 528.5L457.7 528.8L170.8 625.5L170 625.7L169.2 625.5L78.9 587.9L78.5 587.6\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M78.5 587.6L78.9 587.3L365.8 490.5L366.7 490.4L367.5 490.6L457.8 528.2L458.1 528.5M458.1 532.9L457.7 533.2L170.8 629.9L170 630L169.2 629.9L78.9 592.3L78.5 592M458.1 528.5L458.1 532.9M78.5 587.6L78.5 592\"/></g><path class=\"cr-slats iso-line\" data-tone=\"faint\" data-part=\"slats\" d=\"\"/><g data-part=\"marks\"></g></g><g class=\"it\" data-name=\"console\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M307.7 232.9L318.7 195L322 195.5L360 211.3L349 249.3L345.7 248.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M349 249.3L360 211.3L356.8 210.8L345.7 248.7Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M360 211.3L322 195.5L318.7 195L356.8 210.8Z\"/><path class=\"iso-top\" d=\"M307.7 232.9L345.7 248.7L356.8 210.8L318.7 195Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M345.7 248.7L356.8 210.8M360 211.3L356.8 210.8M356.8 210.8L318.7 195\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M307.7 232.9L318.7 195L322 195.5L360 211.3L349 249.3L345.7 248.7Z\"/></g><g transform=\"matrix(1.5846 0.6593 -0.6593 2.2582 318.17 196.77)\"><rect class=\"cr-screen\" x=\"0.8\" y=\"0.8\" width=\"22.4\" height=\"13.6\" rx=\"0.8\"/><text class=\"cr-digits\" data-part=\"speed\" x=\"12\" y=\"10.4\" font-size=\"8\" text-anchor=\"middle\">9.3</text><text class=\"cr-unit\" x=\"12\" y=\"13.4\" font-size=\"2.2\" text-anchor=\"middle\">km/h</text></g></g><g class=\"it\" data-name=\"stand.foot\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M29.2 621.3L29.3 620.4L30.1 619.6L31.6 618.9L33.6 618.4L35.9 618.2L38.3 618.2L40.5 618.5L42.3 619.1L43.6 619.8L44.2 620.7L44.2 636L44.1 636.9L43.3 637.8L41.8 638.5L39.8 638.9L37.5 639.2L35.1 639.1L32.9 638.8L31.1 638.2L29.8 637.5L29.2 636.6Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M44.2 636L44.1 636.9L44.1 621.6L44.2 620.7ZM44.1 636.9L43.3 637.8L43.3 622.4L44.1 621.6ZM43.3 637.8L41.8 638.5L41.8 623.1L43.3 622.4ZM41.8 638.5L39.8 638.9L39.8 623.6L41.8 623.1Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M39.8 638.9L37.5 639.2L37.5 623.8L39.8 623.6Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M37.5 639.2L35.1 639.1L35.1 623.8L37.5 623.8ZM35.1 639.1L32.9 638.8L32.9 623.4L35.1 623.8Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M32.9 638.8L31.1 638.2L31.1 622.9L32.9 623.4ZM31.1 638.2L29.8 637.5L29.8 622.1L31.1 622.9ZM29.8 637.5L29.2 636.6L29.2 621.3L29.8 622.1Z\"/><path class=\"iso-top\" d=\"M42.3 619.1L43.6 619.8L44.2 620.7L44.1 621.6L43.3 622.4L41.8 623.1L39.8 623.6L37.5 623.8L35.1 623.8L32.9 623.4L31.1 622.9L29.8 622.1L29.2 621.3L29.3 620.4L30.1 619.6L31.6 618.9L33.6 618.4L35.9 618.2L38.3 618.2L40.5 618.5Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M44.2 620.7L44.1 621.6L43.3 622.4L41.8 623.1L39.8 623.6L37.5 623.8L35.1 623.8L32.9 623.4L31.1 622.9L29.8 622.1L29.2 621.3\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M29.2 621.3L29.3 620.4L30.1 619.6L31.6 618.9L33.6 618.4L35.9 618.2L38.3 618.2L40.5 618.5L42.3 619.1L43.6 619.8L44.2 620.7M44.2 636L44.1 636.9L43.3 637.8L41.8 638.5L39.8 638.9L37.5 639.2L35.1 639.1L32.9 638.8L31.1 638.2L29.8 637.5L29.2 636.6M44.2 620.7L44.2 636M29.2 621.3L29.2 636.6\"/></g></g><g class=\"it\" data-name=\"deck.capR\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M13.1 584.9L13.5 582.6L16.8 580.7L39.7 573L45.1 571.9L51.3 572L56.4 573.3L75.4 581.2L78.2 583.3L78.2 621.9L77.9 624.2L74.5 626.1L51.7 633.8L46.2 634.9L40.1 634.8L34.9 633.5L15.9 625.6L13.1 623.5Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M78.2 621.9L77.9 624.2L77.9 585.5L78.2 583.3ZM77.9 624.2L74.5 626.1L74.5 587.5L77.9 585.5ZM74.5 626.1L51.7 633.8L51.7 595.2L74.5 587.5Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M51.7 633.8L46.2 634.9L46.2 596.2L51.7 595.2Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M46.2 634.9L40.1 634.8L40.1 596.1L46.2 596.2Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M40.1 634.8L34.9 633.5L34.9 594.9L40.1 596.1ZM34.9 633.5L15.9 625.6L15.9 586.9L34.9 594.9ZM15.9 625.6L13.1 623.5L13.1 584.9L15.9 586.9Z\"/><path class=\"iso-top\" d=\"M39.7 573L45.1 571.9L51.3 572L56.4 573.3L75.4 581.2L78.2 583.3L77.9 585.5L74.5 587.5L51.7 595.2L46.2 596.2L40.1 596.1L34.9 594.9L15.9 586.9L13.1 584.9L13.5 582.6L16.8 580.7Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M78.2 583.3L77.9 585.5L74.5 587.5L51.7 595.2L46.2 596.2L40.1 596.1L34.9 594.9L15.9 586.9L13.1 584.9\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M78.2 583.3L76.5 585.4L73.5 587.1L50.9 594.8L45.9 595.7L40.5 595.6L35.9 594.5L17.1 586.6L13.1 584.9\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M13.1 584.9L13.5 582.6L16.8 580.7L39.7 573L45.1 571.9L51.3 572L56.4 573.3L75.4 581.2L78.2 583.3M78.2 621.9L77.9 624.2L74.5 626.1L51.7 633.8L46.2 634.9L40.1 634.8L34.9 633.5L15.9 625.6L13.1 623.5M78.2 583.3L78.2 621.9M13.1 584.9L13.1 623.5\"/></g></g><g class=\"it\" data-name=\"deck.railL\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M176.2 622.8L177 622.1L456.8 527.8L458.5 527.5L460.2 527.8L491.9 541L492.5 541.7L492.5 547.4L491.7 548L211.9 642.4L210.2 642.6L208.5 642.3L176.8 629.1L176.2 628.5Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M492.5 547.4L491.7 548L491.7 542.3L492.5 541.7ZM491.7 548L211.9 642.4L211.9 636.7L491.7 542.3Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M211.9 642.4L210.2 642.6L210.2 636.9L211.9 636.7Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M210.2 642.6L208.5 642.3L208.5 636.6L210.2 636.9Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M208.5 642.3L176.8 629.1L176.8 623.4L208.5 636.6ZM176.8 629.1L176.2 628.5L176.2 622.8L176.8 623.4Z\"/><path class=\"iso-top\" d=\"M456.8 527.8L458.5 527.5L460.2 527.8L491.9 541L492.5 541.7L491.7 542.3L211.9 636.7L210.2 636.9L208.5 636.6L176.8 623.4L176.2 622.8L177 622.1Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M492.5 541.7L491.7 542.3L211.9 636.7L210.2 636.9L208.5 636.6L176.8 623.4L176.2 622.8\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M176.2 622.8L177 622.1L456.8 527.8L458.5 527.5L460.2 527.8L491.9 541L492.5 541.7M492.5 547.4L491.7 548L211.9 642.4L210.2 642.6L208.5 642.3L176.8 629.1L176.2 628.5M492.5 541.7L492.5 547.4M176.2 622.8L176.2 628.5\"/></g><path class=\"iso-line\" data-tone=\"lo\" d=\"M182.4 625.7L465.7 530.1M188.7 628.3L472.1 532.8M195.1 631L478.4 535.4M201.4 633.6L484.7 538\"/></g><g class=\"it\" data-name=\"roller\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M52.6 614.2L52.6 612.8L52.8 611.4L53 609.9L53.4 608.5L53.8 607.1L54.2 605.7L54.8 604.3L55.4 602.9L56.1 601.6L56.8 600.4L57.6 599.1L58.5 598L59.4 596.9L60.3 595.9L61.3 594.9L62.4 594L63.4 593.3L64.5 592.6L65.6 592L66.7 591.5L67.8 591.1L68.9 590.8L70 590.6L71.1 590.5L72.1 590.5L73.2 590.6L74.2 590.9L75.1 591.2L167 629.4L168 629.9L168.9 630.4L169.7 631L170.5 631.8L171.2 632.6L171.8 633.5L172.4 634.4L172.9 635.5L173.4 636.6L173.7 637.8L174 639L174.2 640.3L174.3 641.7L174.4 643L174.3 644.4L174.2 645.8L174 647.2L173.7 648.7L173.4 650.1L172.9 651.5L172.4 652.9L171.8 654.3L171.2 655.6L170.5 656.9L169.7 658.2L168.9 659.3L168 660.5L167 661.5L166.1 662.5L165.1 663.4L164 664.3L163 665L161.9 665.6L160.8 666.2L159.7 666.6L158.6 667L157.5 667.2L156.4 667.4L155.3 667.4L154.3 667.3L153.2 667.1L152.2 666.9L151.3 666.5L59.4 628.2L58.5 627.8L57.6 627.2L56.8 626.5L56.1 625.7L55.4 624.9L54.8 623.9L54.2 622.9L53.8 621.8L53.4 620.7L53 619.5L52.8 618.2L52.6 616.9L52.6 615.6Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M146.4 661.6L147.6 663.5L149 665L150.7 666.2L152.6 667L60.7 628.7L58.8 627.9L57.1 626.8L55.7 625.2L54.5 623.4ZM159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L159.4 648.1L174.4 643L174.2 645.8L173.7 648.6L173 651.4L171.9 654.2L170.5 656.8L169 659.2L167.2 661.4L165.3 663.3L163.2 664.8L161 666.1L158.9 666.9L156.7 667.3L154.6 667.4L152.6 667L150.7 666.2L149 665L147.6 663.5L146.4 661.6L145.4 659.4L144.8 657L144.5 654.5L144.5 651.7L144.8 648.9L145.4 646.1L146.4 643.3L147.6 640.7L149 638.1L150.7 635.8L152.6 633.8L154.6 632L156.7 630.6L158.9 629.6L161 629L163.2 628.7L165.3 628.9L167.2 629.5L169 630.5L170.5 631.9L171.9 633.6L173 635.6L173.7 637.9L174.2 640.4L174.4 643Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M145.4 659.4L146.4 661.6L54.5 623.4L53.5 621.2Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M144.5 654.5L144.8 657L145.4 659.4L53.5 621.2L52.9 618.8L52.6 616.2Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M167.2 629.5L165.3 628.9L163.2 628.7L71.3 590.5L73.4 590.7L75.3 591.3ZM144.8 648.9L144.5 651.7L144.5 654.5L52.6 616.2L52.6 613.5L52.9 610.7Z\"/><path class=\"iso-top\" d=\"M163.2 628.7L161 629L158.9 629.6L156.7 630.6L154.6 632L152.6 633.8L150.7 635.8L149 638.1L147.6 640.7L146.4 643.3L145.4 646.1L144.8 648.9L52.9 610.7L53.5 607.9L54.5 605.1L55.7 602.4L57.1 599.9L58.8 597.6L60.7 595.5L62.7 593.8L64.8 592.4L67 591.4L69.1 590.7L71.3 590.5Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M167.1 629.5L166.2 629.1L165.2 628.9L164.2 628.8L163.1 628.7L162.1 628.8L161 629L159.9 629.3L158.8 629.6L157.7 630.1L156.6 630.7L155.6 631.3L154.5 632.1L153.5 632.9L152.5 633.8L151.6 634.8L150.6 635.9L149.8 637L149 638.2L148.2 639.4L147.5 640.7L146.9 642.1L146.3 643.4L145.8 644.8L145.4 646.2L145.1 647.6L144.8 649L144.6 650.4L144.5 651.8L144.4 653.2L144.5 654.5L144.6 655.9L144.8 657.1L145.1 658.4L145.5 659.5L145.9 660.6L146.4 661.7L147 662.6L147.6 663.5L148.3 664.3L149.1 665L149.9 665.7L150.8 666.2L151.7 666.6\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M52.6 614.2L52.6 612.8L52.8 611.4L53 609.9L53.4 608.5L53.8 607.1L54.2 605.7L54.8 604.3L55.4 602.9L56.1 601.6L56.8 600.4L57.6 599.1L58.5 598L59.4 596.9L60.3 595.9L61.3 594.9L62.4 594L63.4 593.3L64.5 592.6L65.6 592L66.7 591.5L67.8 591.1L68.9 590.8L70 590.6L71.1 590.5L72.1 590.5L73.2 590.6L74.2 590.9L75.1 591.2L167 629.4L168 629.9L168.9 630.4L169.7 631L170.5 631.8L171.2 632.6L171.8 633.5L172.4 634.4L172.9 635.5L173.4 636.6L173.7 637.8L174 639L174.2 640.3L174.3 641.7L174.4 643L174.3 644.4L174.2 645.8L174 647.2L173.7 648.7L173.4 650.1L172.9 651.5L172.4 652.9L171.8 654.3L171.2 655.6L170.5 656.9L169.7 658.2L168.9 659.3L168 660.5L167 661.5L166.1 662.5L165.1 663.4L164 664.3L163 665L161.9 665.6L160.8 666.2L159.7 666.6L158.6 667L157.5 667.2L156.4 667.4L155.3 667.4L154.3 667.3L153.2 667.1L152.2 666.9L151.3 666.5L59.4 628.2L58.5 627.8L57.6 627.2L56.8 626.5L56.1 625.7L55.4 624.9L54.8 623.9L54.2 622.9L53.8 621.8L53.4 620.7L53 619.5L52.8 618.2L52.6 616.9L52.6 615.6Z\"/></g></g><g class=\"it\" data-name=\"stand.foot\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M168.6 679.3L168.7 678.4L169.6 677.6L171.1 676.9L173.1 676.4L175.3 676.2L177.7 676.2L179.9 676.5L181.8 677.1L183.1 677.8L183.7 678.7L183.7 694.1L183.5 695L182.7 695.8L181.2 696.5L179.2 697L176.9 697.2L174.6 697.1L172.3 696.8L170.5 696.3L169.2 695.5L168.6 694.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M183.7 694.1L183.5 695L183.5 679.6L183.7 678.7ZM183.5 695L182.7 695.8L182.7 680.4L183.5 679.6ZM182.7 695.8L181.2 696.5L181.2 681.1L182.7 680.4ZM181.2 696.5L179.2 697L179.2 681.6L181.2 681.1Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M179.2 697L176.9 697.2L176.9 681.8L179.2 681.6Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M176.9 697.2L174.6 697.1L174.6 681.8L176.9 681.8ZM174.6 697.1L172.3 696.8L172.3 681.5L174.6 681.8Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M172.3 696.8L170.5 696.3L170.5 680.9L172.3 681.5ZM170.5 696.3L169.2 695.5L169.2 680.1L170.5 680.9ZM169.2 695.5L168.6 694.7L168.6 679.3L169.2 680.1Z\"/><path class=\"iso-top\" d=\"M181.8 677.1L183.1 677.8L183.7 678.7L183.5 679.6L182.7 680.4L181.2 681.1L179.2 681.6L176.9 681.8L174.6 681.8L172.3 681.5L170.5 680.9L169.2 680.1L168.6 679.3L168.7 678.4L169.6 677.6L171.1 676.9L173.1 676.4L175.3 676.2L177.7 676.2L179.9 676.5Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M183.7 678.7L183.5 679.6L182.7 680.4L181.2 681.1L179.2 681.6L176.9 681.8L174.6 681.8L172.3 681.5L170.5 680.9L169.2 680.1L168.6 679.3\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M168.6 679.3L168.7 678.4L169.6 677.6L171.1 676.9L173.1 676.4L175.3 676.2L177.7 676.2L179.9 676.5L181.8 677.1L183.1 677.8L183.7 678.7M183.7 694.1L183.5 695L182.7 695.8L181.2 696.5L179.2 697L176.9 697.2L174.6 697.1L172.3 696.8L170.5 696.3L169.2 695.5L168.6 694.7M183.7 678.7L183.7 694.1M168.6 679.3L168.6 694.7\"/></g></g><g class=\"it\" data-name=\"deck.capL\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M139.9 637.6L140.2 635.4L143.6 633.4L166.4 625.7L171.9 624.7L178 624.8L183.2 626L202.2 633.9L205 636L205 674.6L204.6 676.9L201.3 678.9L178.4 686.6L173 687.6L166.8 687.5L161.7 686.2L142.7 678.3L139.9 676.3Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M205 674.6L204.6 676.9L204.6 638.3L205 636ZM204.6 676.9L201.3 678.9L201.3 640.2L204.6 638.3ZM201.3 678.9L178.4 686.6L178.4 647.9L201.3 640.2Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M178.4 686.6L173 687.6L173 649L178.4 647.9Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M173 687.6L166.8 687.5L166.8 648.9L173 649Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M166.8 687.5L161.7 686.2L161.7 647.6L166.8 648.9ZM161.7 686.2L142.7 678.3L142.7 639.7L161.7 647.6ZM142.7 678.3L139.9 676.3L139.9 637.6L142.7 639.7Z\"/><path class=\"iso-top\" d=\"M166.4 625.7L171.9 624.7L178 624.8L183.2 626L202.2 633.9L205 636L204.6 638.3L201.3 640.2L178.4 647.9L173 649L166.8 648.9L161.7 647.6L142.7 639.7L139.9 637.6L140.2 635.4L143.6 633.4Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M205 636L204.6 638.3L201.3 640.2L178.4 647.9L173 649L166.8 648.9L161.7 647.6L142.7 639.7L139.9 637.6\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M205 636L203.3 638.1L200.2 639.9L177.6 647.5L172.7 648.5L167.3 648.3L162.6 647.2L143.9 639.4L139.9 637.6\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M139.9 637.6L140.2 635.4L143.6 633.4L166.4 625.7L171.9 624.7L178 624.8L183.2 626L202.2 633.9L205 636M205 674.6L204.6 676.9L201.3 678.9L178.4 686.6L173 687.6L166.8 687.5L161.7 686.2L142.7 678.3L139.9 676.3M205 636L205 674.6M139.9 637.6L139.9 676.3\"/></g><g class=\"iso-dots\" data-tone=\"mid\"><circle cx=\"180.2\" cy=\"672.8\" r=\"0.6\"/><circle cx=\"194.3\" cy=\"668.1\" r=\"0.6\"/></g><path class=\"iso-line\" data-tone=\"lo\" d=\"M183 671.9L182.9 671L182.7 670.2L182.2 669.7L181.6 669.3L180.9 669.2L180.2 669.3L179.5 669.7L178.8 670.3L178.2 671L177.8 671.9L177.5 672.8L177.4 673.8L177.5 674.6L177.8 675.4L178.2 676L178.8 676.3L179.5 676.5L180.2 676.3L180.9 676L181.6 675.4L182.2 674.6L182.7 673.8L182.9 672.8ZM197.1 667.1L197 666.2L196.7 665.5L196.3 664.9L195.7 664.6L195 664.4L194.3 664.6L193.6 664.9L192.9 665.5L192.3 666.3L191.9 667.1L191.6 668.1L191.5 669L191.6 669.9L191.9 670.7L192.3 671.2L192.9 671.6L193.6 671.7L194.3 671.6L195 671.2L195.7 670.6L196.3 669.9L196.7 669L197 668.1Z\"/></g><g data-part=\"runner\"></g><g class=\"it\" data-name=\"front.uprightL\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M475.4 333L486.4 326.2L493.4 329.1L532.1 531.3L521.1 538L514.1 535.1Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M532.1 531.3L521.1 538L482.4 335.9L493.4 329.1Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M521.1 538L514.1 535.1L475.4 333L482.4 335.9Z\"/><path class=\"iso-top\" d=\"M486.4 326.2L493.4 329.1L482.4 335.9L475.4 333Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M493.4 329.1L482.4 335.9M521.1 538L482.4 335.9M482.4 335.9L475.4 333\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M475.4 333L486.4 326.2L493.4 329.1L532.1 531.3L521.1 538L514.1 535.1Z\"/></g></g><g class=\"it\" data-name=\"front.railL\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M355.5 363.7L355.6 362.5L357.3 361.6L489.3 317.1L492 316.5L495.1 316.6L497.7 317.2L499.3 317.9L500.6 318.9L500.6 332.1L500.5 333.2L498.8 334.2L366.8 378.7L364.1 379.2L361 379.2L358.5 378.5L356.9 377.9L355.5 376.9Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M500.6 332.1L500.5 333.2L500.5 320.1L500.6 318.9ZM500.5 333.2L498.8 334.2L498.8 321L500.5 320.1ZM498.8 334.2L366.8 378.7L366.8 365.5L498.8 321Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M366.8 378.7L364.1 379.2L364.1 366.1L366.8 365.5Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M364.1 379.2L361 379.2L361 366L364.1 366.1Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M361 379.2L358.5 378.5L358.5 365.4L361 366ZM358.5 378.5L356.9 377.9L356.9 364.7L358.5 365.4ZM356.9 377.9L355.5 376.9L355.5 363.7L356.9 364.7Z\"/><path class=\"iso-top\" d=\"M489.3 317.1L492 316.5L495.1 316.6L497.7 317.2L499.3 317.9L500.6 318.9L500.5 320.1L498.8 321L366.8 365.5L364.1 366.1L361 366L358.5 365.4L356.9 364.7L355.5 363.7L355.6 362.5L357.3 361.6Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M500.6 318.9L500.5 320.1L498.8 321L366.8 365.5L364.1 366.1L361 366L358.5 365.4L356.9 364.7L355.5 363.7\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M500.6 318.9L499.4 319.9L497.9 320.7L366.2 365.2L363.8 365.6L361.4 365.6L359.2 365L357.9 364.5L355.5 363.7\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M500.6 327.2L500.5 328.4L498.8 329.4L366.8 373.9L364.1 374.4L361 374.3L358.5 373.7L356.9 373.1L355.5 372\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M355.5 363.7L355.6 362.5L357.3 361.6L489.3 317.1L492 316.5L495.1 316.6L497.7 317.2L499.3 317.9L500.6 318.9M500.6 332.1L500.5 333.2L498.8 334.2L366.8 378.7L364.1 379.2L361 379.2L358.5 378.5L356.9 377.9L355.5 376.9M500.6 318.9L500.6 332.1M355.5 363.7L355.5 376.9\"/></g></g><g class=\"it\" data-name=\"front.railcapL\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M342.7 366.3L342.9 364.9L344.9 363.7L350.2 361.9L353.5 361.3L357.2 361.4L360.2 362.1L362.1 362.9L363.8 364.2L363.8 380L363.6 381.3L361.6 382.5L356.3 384.3L353.1 384.9L349.4 384.8L346.3 384.1L344.4 383.3L342.7 382.1Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M363.8 380L363.6 381.3L363.6 365.5L363.8 364.2ZM363.6 381.3L361.6 382.5L361.6 366.7L363.6 365.5ZM361.6 382.5L356.3 384.3L356.3 368.5L361.6 366.7Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M356.3 384.3L353.1 384.9L353.1 369.1L356.3 368.5Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M353.1 384.9L349.4 384.8L349.4 369L353.1 369.1Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M349.4 384.8L346.3 384.1L346.3 368.3L349.4 369ZM346.3 384.1L344.4 383.3L344.4 367.5L346.3 368.3ZM344.4 383.3L342.7 382.1L342.7 366.3L344.4 367.5Z\"/><path class=\"iso-top\" d=\"M350.2 361.9L353.5 361.3L357.2 361.4L360.2 362.1L362.1 362.9L363.8 364.2L363.6 365.5L361.6 366.7L356.3 368.5L353.1 369.1L349.4 369L346.3 368.3L344.4 367.5L342.7 366.3L342.9 364.9L344.9 363.7Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M363.8 364.2L363.6 365.5L361.6 366.7L356.3 368.5L353.1 369.1L349.4 369L346.3 368.3L344.4 367.5L342.7 366.3\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M342.7 366.3L342.9 364.9L344.9 363.7L350.2 361.9L353.5 361.3L357.2 361.4L360.2 362.1L362.1 362.9L363.8 364.2M363.8 380L363.6 381.3L361.6 382.5L356.3 384.3L353.1 384.9L349.4 384.8L346.3 384.1L344.4 383.3L342.7 382.1M363.8 364.2L363.8 380M342.7 366.3L342.7 382.1\"/></g><g class=\"iso-dots\" data-tone=\"mid\"><circle cx=\"348.4\" cy=\"365.2\" r=\"0.55\"/><circle cx=\"352.8\" cy=\"367\" r=\"0.55\"/></g></g><path class=\"iso-halo\" d=\"M29.5 703.8L30.6 701.1L33.2 698.5L37 696.1L42 694L48 692.4L54.7 691.2L61.9 690.5L69.3 690.4L76.7 690.8L83.7 691.8L90 693.2L95.5 695.1L99.9 697.3L103.1 699.8L104.9 702.5L105.2 705.3L105.2 705.5L104.1 708.3L101.6 710.9L97.7 713.3L92.7 715.3L86.7 717L80 718.2L72.8 718.8L65.4 719L58 718.5L51 717.6L44.7 716.2L39.2 714.3L34.8 712L31.6 709.5L29.9 706.8L29.5 704Z\"/><g class=\"as-tablet\" data-name=\"as.tablet\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M81.2 449.2L100.9 394.9L158.7 413.1L159.8 413.6L140.1 467.8L82.2 449.6Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M82.2 449.6L140.1 467.8L139.1 467.4L81.2 449.2ZM140.1 467.8L159.8 413.6L158.7 413.1L139.1 467.4Z\"/><path class=\"iso-top\" d=\"M81.2 449.2L139.1 467.4L158.7 413.1L100.9 394.9Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M81.2 449.2L139.1 467.4M140.1 467.8L139.1 467.4M139.1 467.4L158.7 413.1\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M81.2 449.2L100.9 394.9L158.7 413.1L159.8 413.6L140.1 467.8L82.2 449.6Z\"/><g transform=\"matrix(1.8141 0.5702 -0.8067 2.2222 102.06 398.28)\"><rect class=\"as-screen\" x=\"0\" y=\"0\" width=\"29.49\" height=\"22.00\" rx=\"0.9\"/><g data-part=\"tablet\"></g><rect class=\"iso-line\" data-tone=\"mid\" fill=\"none\" x=\"0\" y=\"0\" width=\"29.49\" height=\"22.00\" rx=\"0.9\"/></g></g></g><g class=\"mq-wood\" data-name=\"as.handR\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M78.3 422L78.4 420.7L78.7 419.5L79.1 418.3L79.8 417.2L80.6 416.3L81.6 415.4L82.7 414.8L83.8 414.3L85 414L86.3 413.9L87.6 414L88.8 414.3L90 414.8L91 415.4L92 416.3L92.8 417.2L93.5 418.3L94 419.5L94.3 420.7L94.4 422L94.3 423.2L94 424.4L93.5 425.6L92.8 426.7L92 427.7L91 428.5L90 429.1L88.8 429.6L87.6 429.9L86.3 430L85 429.9L83.8 429.6L82.7 429.1L81.6 428.5L80.6 427.7L79.8 426.7L79.1 425.6L78.7 424.4L78.4 423.2Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M78.3 422L78.4 420.7L78.7 419.5L79.1 418.3L79.8 417.2L80.6 416.3L81.6 415.4L82.7 414.8L83.8 414.3L85 414L86.3 413.9L87.6 414L88.8 414.3L90 414.8L91 415.4L92 416.3L92.8 417.2L93.5 418.3L94 419.5L94.3 420.7L94.4 422L94.3 423.2L94 424.4L93.5 425.6L92.8 426.7L92 427.7L91 428.5L90 429.1L88.8 429.6L87.6 429.9L86.3 430L85 429.9L83.8 429.6L82.7 429.1L81.6 428.5L80.6 427.7L79.8 426.7L79.1 425.6L78.7 424.4L78.4 423.2Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M78.3 422L78.4 420.7L78.7 419.5L79.1 418.3L79.8 417.2L80.6 416.3L81.6 415.4L82.7 414.8L83.8 414.3L85 414L86.3 413.9L87.6 414L88.8 414.3L90 414.8L91 415.4L91.3 415.7L91.3 416.1L91.3 416.7L91 417.3L90.7 418L90.2 418.8L89.6 419.6L88.8 420.5L88 421.3L87.2 422.2L86.2 423L85.3 423.8L84.3 424.5L83.4 425.1L82.5 425.6L81.7 426L81 426.2L80.4 426.3L79.9 426.3L79.5 426.2L79.1 425.6L78.7 424.4L78.4 423.2Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M78.3 422L78.4 420.7L78.7 419.5L79.1 418.3L79.8 417.2L80.6 416.3L81.6 415.4L82.7 414.8L83.8 414.3L85 414L86.3 413.9L87.6 414L88.8 414.3L89.5 414.6L89.7 414.8L89.8 415.2L89.7 415.7L89.5 416.3L89.1 416.9L88.7 417.7L88.1 418.4L87.4 419.2L86.7 420L85.9 420.8L85 421.6L84.1 422.3L83.3 422.9L82.4 423.5L81.6 424L80.8 424.3L80.2 424.6L79.6 424.7L79.1 424.7L78.8 424.5L78.6 424.3L78.4 423.2Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M78.3 422L78.4 420.7L78.7 419.5L79.1 418.3L79.8 417.2L80.6 416.3L81.6 415.4L82.7 414.8L83.8 414.3L85 414L86.3 413.9L87.4 414L87.7 414.1L87.9 414.3L88 414.7L87.9 415.1L87.7 415.6L87.4 416.1L87 416.8L86.5 417.4L86 418.1L85.3 418.8L84.6 419.5L83.9 420.2L83.1 420.8L82.4 421.3L81.6 421.8L80.9 422.2L80.3 422.5L79.7 422.7L79.2 422.8L78.8 422.8L78.5 422.7L78.3 422.5Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M78.3 422L78.4 420.7L78.7 419.5L79.1 418.3L79.8 417.2L80.6 416.3L81.6 415.4L82.7 414.8L83.8 414.3L85 414L86.3 413.9L87.6 414L88.8 414.3L90 414.8L91 415.4L92 416.3L92.8 417.2L93.5 418.3L94 419.5L94.3 420.7L94.4 422L94.3 423.2L94 424.4L93.5 425.6L92.8 426.7L92 427.7L91 428.5L90 429.1L88.8 429.6L87.6 429.9L86.3 430L85 429.9L83.8 429.6L82.7 429.1L81.6 428.5L80.6 427.7L79.8 426.7L79.1 425.6L78.7 424.4L78.4 423.2Z\"/></g></g><g class=\"mq-joint\" data-name=\"as.wristR\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M71.2 428.9L71.3 428L71.5 427.1L71.8 426.2L72.3 425.4L72.9 424.7L73.6 424.1L74.4 423.6L75.3 423.3L76.2 423L77.1 423L78.1 423L79 423.3L79.8 423.6L80.6 424.1L81.3 424.7L81.9 425.4L82.4 426.2L82.8 427.1L83 428L83 428.9L83 429.8L82.8 430.7L82.4 431.6L81.9 432.4L81.3 433.1L80.6 433.7L79.8 434.2L79 434.5L78.1 434.7L77.1 434.8L76.2 434.7L75.3 434.5L74.4 434.2L73.6 433.7L72.9 433.1L72.3 432.4L71.8 431.6L71.5 430.7L71.3 429.8Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M71.2 428.9L71.3 428L71.5 427.1L71.8 426.2L72.3 425.4L72.9 424.7L73.6 424.1L74.4 423.6L75.3 423.3L76.2 423L77.1 423L78.1 423L79 423.3L79.8 423.6L80.6 424.1L81.3 424.7L81.9 425.4L82.4 426.2L82.8 427.1L83 428L83 428.9L83 429.8L82.8 430.7L82.4 431.6L81.9 432.4L81.3 433.1L80.6 433.7L79.8 434.2L79 434.5L78.1 434.7L77.1 434.8L76.2 434.7L75.3 434.5L74.4 434.2L73.6 433.7L72.9 433.1L72.3 432.4L71.8 431.6L71.5 430.7L71.3 429.8Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M71.2 428.9L71.3 428L71.5 427.1L71.8 426.2L72.3 425.4L72.9 424.7L73.6 424.1L74.4 423.6L75.3 423.3L76.2 423L77.1 423L78.1 423L79 423.3L79.8 423.6L80.6 424.1L80.8 424.3L80.8 424.6L80.8 425L80.6 425.4L80.3 426L80 426.5L79.5 427.1L79 427.8L78.4 428.4L77.7 429L77.1 429.7L76.4 430.2L75.7 430.7L75 431.2L74.3 431.5L73.7 431.8L73.2 432L72.8 432.1L72.4 432.1L72.1 432L71.8 431.6L71.5 430.7L71.3 429.8Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M71.2 428.9L71.3 428L71.5 427.1L71.8 426.2L72.3 425.4L72.9 424.7L73.6 424.1L74.4 423.6L75.3 423.3L76.2 423L77.1 423L78.1 423L79 423.3L79.5 423.5L79.6 423.7L79.7 423.9L79.6 424.3L79.5 424.7L79.2 425.2L78.9 425.7L78.5 426.3L78 426.9L77.4 427.5L76.8 428L76.2 428.6L75.5 429.1L74.9 429.6L74.3 430L73.7 430.4L73.1 430.6L72.6 430.8L72.2 430.9L71.9 430.9L71.6 430.8L71.5 430.6L71.3 429.8Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M71.2 428.9L71.3 428L71.5 427.1L71.8 426.2L72.3 425.4L72.9 424.7L73.6 424.1L74.4 423.6L75.3 423.3L76.2 423L77.1 423L78 423L78.2 423.1L78.3 423.3L78.3 423.5L78.3 423.8L78.2 424.2L78 424.6L77.7 425.1L77.3 425.6L76.9 426.1L76.4 426.6L75.9 427.1L75.3 427.6L74.8 428L74.2 428.4L73.7 428.8L73.2 429.1L72.7 429.3L72.3 429.5L71.9 429.5L71.6 429.5L71.4 429.4L71.3 429.3Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M71.2 428.9L71.3 428L71.5 427.1L71.8 426.2L72.3 425.4L72.9 424.7L73.6 424.1L74.4 423.6L75.3 423.3L76.2 423L77.1 423L78.1 423L79 423.3L79.8 423.6L80.6 424.1L81.3 424.7L81.9 425.4L82.4 426.2L82.8 427.1L83 428L83 428.9L83 429.8L82.8 430.7L82.4 431.6L81.9 432.4L81.3 433.1L80.6 433.7L79.8 434.2L79 434.5L78.1 434.7L77.1 434.8L76.2 434.7L75.3 434.5L74.4 434.2L73.6 433.7L72.9 433.1L72.3 432.4L71.8 431.6L71.5 430.7L71.3 429.8Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.foreR\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M33.8 453.5L34 452.6L34.4 452L34.9 451.6L72.3 426.3L72.8 426.2L73.4 426.2L74 426.4L74.7 426.7L75.4 427.2L76.1 427.8L76.7 428.5L77.3 429.3L77.8 430.1L78.2 430.9L78.5 431.8L78.7 432.5L78.7 433.2L78.6 433.7L78.3 434.2L43.8 463.2L43.2 463.6L42.5 463.8L41.7 463.8L40.7 463.5L39.7 463L38.7 462.3L37.7 461.4L36.7 460.4L35.8 459.2L35.1 458L34.5 456.8L34.1 455.6L33.8 454.5Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M43.8 463.2L44.1 462.6L44.3 461.7L44.3 460.7L44 459.6L43.6 458.4L43 457.2L77.8 430.1L78.2 430.9L78.5 431.8L78.7 432.5L78.7 433.2L78.6 433.7L78.3 434.2Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M43 457.2L42.3 456L77.3 429.3L77.8 430.1Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M39.1 457.6L39.1 457.6L39.1 457.6L39.1 457.6L39.1 457.6L39.1 457.6L39.1 457.6L39.1 457.6L39.1 457.6L39.1 457.6L39.1 457.6L39.1 457.6L39.1 457.6L39.1 457.6L39.1 457.6L39.1 457.6L39.1 457.6L39.1 457.6L39.1 457.6L39.1 457.6L39.1 457.6L39.1 457.6L39.1 457.6L39.1 457.6L39.1 457.6L39.1 457.6L39.1 457.6L39.1 457.6L39.1 457.6L39.1 457.6L39.1 457.6L39.1 457.6L39.1 457.6L44 459.6L44.3 460.7L44.3 461.7L44.1 462.6L43.8 463.2L43.2 463.6L42.5 463.8L41.7 463.8L40.7 463.5L39.7 463L38.7 462.3L37.7 461.4L36.7 460.4L35.8 459.2L35.1 458L34.5 456.8L34.1 455.6L33.8 454.5L33.8 453.5L34 452.6L34.4 452L34.9 451.6L35.6 451.4L36.5 451.4L37.4 451.7L38.4 452.2L39.4 452.9L40.5 453.8L41.4 454.9L42.3 456L43 457.2L43.6 458.4L44 459.6ZM42.3 456L41.4 454.9L40.5 453.8L76.1 427.8L76.7 428.5L77.3 429.3Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M40.5 453.8L39.4 452.9L75.4 427.2L76.1 427.8Z\"/><path class=\"iso-top\" d=\"M39.4 452.9L38.4 452.2L37.4 451.7L36.5 451.4L35.6 451.4L34.9 451.6L72.3 426.3L72.8 426.2L73.4 426.2L74 426.4L74.7 426.7L75.4 427.2Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M43.6 463.4L44 462.9L44.2 462.1L44.3 461.2L44.2 460.2L43.9 459L43.4 457.8L42.7 456.6L41.9 455.5L41 454.4L40 453.4L39 452.6L38 452L37 451.6L36.1 451.4L35.4 451.4L34.7 451.7\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M33.8 453.5L34 452.6L34.4 452L34.9 451.6L72.3 426.3L72.8 426.2L73.4 426.2L74 426.4L74.7 426.7L75.4 427.2L76.1 427.8L76.7 428.5L77.3 429.3L77.8 430.1L78.2 430.9L78.5 431.8L78.7 432.5L78.7 433.2L78.6 433.7L78.3 434.2L43.8 463.2L43.2 463.6L42.5 463.8L41.7 463.8L40.7 463.5L39.7 463L38.7 462.3L37.7 461.4L36.7 460.4L35.8 459.2L35.1 458L34.5 456.8L34.1 455.6L33.8 454.5Z\"/></g></g><g class=\"mq-joint\" data-name=\"as.elbowR\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M27.8 459.8L27.9 458.6L28.2 457.3L28.7 456.1L29.4 455L30.2 454L31.2 453.1L32.3 452.5L33.5 452L34.8 451.7L36.1 451.6L37.4 451.7L38.6 452L39.8 452.5L41 453.1L41.9 454L42.8 455L43.5 456.1L44 457.3L44.3 458.6L44.4 459.8L44.3 461.1L44 462.4L43.5 463.6L42.8 464.7L41.9 465.7L41 466.6L39.8 467.2L38.6 467.7L37.4 468L36.1 468.1L34.8 468L33.5 467.7L32.3 467.2L31.2 466.6L30.2 465.7L29.4 464.7L28.7 463.6L28.2 462.4L27.9 461.1Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M27.8 459.8L27.9 458.6L28.2 457.3L28.7 456.1L29.4 455L30.2 454L31.2 453.1L32.3 452.5L33.5 452L34.8 451.7L36.1 451.6L37.4 451.7L38.6 452L39.8 452.5L41 453.1L41.9 454L42.8 455L43.5 456.1L44 457.3L44.3 458.6L44.4 459.8L44.3 461.1L44 462.4L43.5 463.6L42.8 464.7L41.9 465.7L41 466.6L39.8 467.2L38.6 467.7L37.4 468L36.1 468.1L34.8 468L33.5 467.7L32.3 467.2L31.2 466.6L30.2 465.7L29.4 464.7L28.7 463.6L28.2 462.4L27.9 461.1Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M27.8 459.8L27.9 458.6L28.2 457.3L28.7 456.1L29.4 455L30.2 454L31.2 453.1L32.3 452.5L33.5 452L34.8 451.7L36.1 451.6L37.4 451.7L38.6 452L39.8 452.5L41 453.1L41.2 453.4L41.3 453.8L41.2 454.4L41 455L40.6 455.8L40.1 456.6L39.4 457.4L38.7 458.3L37.9 459.2L37 460.1L36 460.9L35 461.7L34 462.4L33.1 463.1L32.2 463.6L31.4 464L30.6 464.2L30 464.4L29.5 464.3L29.1 464.2L28.7 463.6L28.2 462.4L27.9 461.1Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M27.8 459.8L27.9 458.6L28.2 457.3L28.7 456.1L29.4 455L30.2 454L31.2 453.1L32.3 452.5L33.5 452L34.8 451.7L36.1 451.6L37.4 451.7L38.6 452L39.4 452.3L39.6 452.5L39.6 452.9L39.6 453.4L39.4 454L39 454.7L38.5 455.4L37.9 456.2L37.3 457L36.5 457.9L35.6 458.7L34.8 459.5L33.9 460.2L33 460.9L32.1 461.4L31.2 461.9L30.5 462.3L29.8 462.5L29.2 462.6L28.7 462.6L28.4 462.5L28.1 462.2L27.9 461.1Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M27.8 459.8L27.9 458.6L28.2 457.3L28.7 456.1L29.4 455L30.2 454L31.2 453.1L32.3 452.5L33.5 452L34.8 451.7L36.1 451.6L37.2 451.6L37.5 451.8L37.7 452L37.8 452.3L37.7 452.8L37.5 453.3L37.2 453.9L36.8 454.5L36.3 455.2L35.7 455.9L35.1 456.6L34.3 457.3L33.6 458L32.8 458.6L32 459.2L31.3 459.7L30.5 460.1L29.9 460.4L29.3 460.6L28.8 460.7L28.3 460.7L28 460.6L27.9 460.4Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M27.8 459.8L27.9 458.6L28.2 457.3L28.7 456.1L29.4 455L30.2 454L31.2 453.1L32.3 452.5L33.5 452L34.8 451.7L36.1 451.6L37.4 451.7L38.6 452L39.8 452.5L41 453.1L41.9 454L42.8 455L43.5 456.1L44 457.3L44.3 458.6L44.4 459.8L44.3 461.1L44 462.4L43.5 463.6L42.8 464.7L41.9 465.7L41 466.6L39.8 467.2L38.6 467.7L37.4 468L36.1 468.1L34.8 468L33.5 467.7L32.3 467.2L31.2 466.6L30.2 465.7L29.4 464.7L28.7 463.6L28.2 462.4L27.9 461.1Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.upperR\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M29.1 398.7L29.1 398L29.4 397.3L29.9 396.7L30.7 396.1L31.6 395.5L32.7 395.1L34 394.7L35.3 394.5L36.8 394.4L38.3 394.3L39.7 394.4L41.2 394.7L42.5 395L43.8 395.4L44.9 395.9L45.9 396.5L46.6 397.1L47.1 397.8L47.4 398.5L47.5 399.2L42.8 456.4L42.7 456.9L42.4 457.4L42 457.9L41.4 458.3L40.6 458.6L39.8 458.9L38.8 459.1L37.8 459.3L36.8 459.3L35.7 459.3L34.7 459.2L33.6 459L32.7 458.7L31.8 458.4L31.1 458L30.5 457.6L30 457.1L29.7 456.6L29.6 456.1Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M36 403L37.8 403.2L39.6 403.2L41.3 403.1L43 402.7L44.4 402.3L45.7 401.7L46.6 400.9L47.2 400.1L47.5 399.3L42.8 456.5L42.6 457.1L42.2 457.7L41.5 458.2L40.6 458.6L39.6 459L38.4 459.2L37.1 459.3L35.8 459.3L34.6 459.2Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M34.3 402.7L36 403L34.6 459.2L33.3 458.9Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M31.4 401.5L32.7 402.2L34.3 402.7L33.3 458.9L32.2 458.5L31.3 458.1Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M29.1 399.1L29.6 400L30.3 400.8L31.4 401.5L31.3 458.1L30.5 457.6L30 457L29.7 456.4Z\"/><path class=\"iso-top\" d=\"M38.3 398.8L38.3 398.8L38.3 398.8L38.3 398.8L38.3 398.8L38.3 398.8L38.3 398.8L38.3 398.8L38.3 398.8L38.3 398.8L38.3 398.8L38.3 398.8L38.3 398.8L38.3 398.8L38.3 398.8L38.3 398.8L38.3 398.8L38.3 398.8L38.3 398.8L38.3 398.8L38.3 398.8L38.3 398.8L38.3 398.8L38.3 398.8L38.3 398.8L38.3 398.8L38.3 398.8L38.3 398.8L38.3 398.8L38.3 398.8L38.3 398.8L38.3 398.8L38.3 398.8L44.4 402.3L43 402.7L41.3 403.1L39.6 403.2L37.8 403.2L36 403L34.3 402.7L32.7 402.2L31.4 401.5L30.3 400.8L29.6 400L29.1 399.1L29.1 398.3L29.3 397.4L30 396.6L30.9 395.9L32.1 395.3L33.6 394.8L35.2 394.5L37 394.4L38.8 394.4L40.6 394.6L42.3 394.9L43.8 395.4L45.2 396L46.2 396.8L47 397.6L47.4 398.4L47.5 399.3L47.2 400.1L46.6 400.9L45.7 401.7L44.4 402.3ZM29.1 398.3L29.1 399.1L29.7 456.4L29.6 455.7Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M29.1 398.6L29.2 399.2L29.5 399.9L30.1 400.6L30.8 401.2L31.7 401.7L32.8 402.2L34 402.6L35.3 402.9L36.7 403.1L38.1 403.2L39.6 403.2L40.9 403.1L42.3 402.9L43.5 402.6L44.6 402.2L45.6 401.7L46.4 401.2L47 400.5L47.3 399.9L47.5 399.2\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M29.1 398.7L29.1 398L29.4 397.3L29.9 396.7L30.7 396.1L31.6 395.5L32.7 395.1L34 394.7L35.3 394.5L36.8 394.4L38.3 394.3L39.7 394.4L41.2 394.7L42.5 395L43.8 395.4L44.9 395.9L45.9 396.5L46.6 397.1L47.1 397.8L47.4 398.5L47.5 399.2L42.8 456.4L42.7 456.9L42.4 457.4L42 457.9L41.4 458.3L40.6 458.6L39.8 458.9L38.8 459.1L37.8 459.3L36.8 459.3L35.7 459.3L34.7 459.2L33.6 459L32.7 458.7L31.8 458.4L31.1 458L30.5 457.6L30 457.1L29.7 456.6L29.6 456.1Z\"/></g></g><g class=\"mq-joint\" data-name=\"as.shoulderR\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M27.6 394.2L27.7 392.5L28.1 390.9L28.7 389.3L29.6 387.8L30.7 386.5L32 385.4L33.5 384.5L35.1 383.9L36.7 383.5L38.5 383.3L40.2 383.5L41.8 383.9L43.4 384.5L44.9 385.4L46.2 386.5L47.3 387.8L48.2 389.3L48.8 390.9L49.2 392.5L49.3 394.2L49.2 395.9L48.8 397.6L48.2 399.2L47.3 400.6L46.2 401.9L44.9 403L43.4 403.9L41.8 404.6L40.2 405L38.5 405.1L36.7 405L35.1 404.6L33.5 403.9L32 403L30.7 401.9L29.6 400.6L28.7 399.2L28.1 397.6L27.7 395.9Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M27.6 394.2L27.7 392.5L28.1 390.9L28.7 389.3L29.6 387.8L30.7 386.5L32 385.4L33.5 384.5L35.1 383.9L36.7 383.5L38.5 383.3L40.2 383.5L41.8 383.9L43.4 384.5L44.9 385.4L46.2 386.5L47.3 387.8L48.2 389.3L48.8 390.9L49.2 392.5L49.3 394.2L49.2 395.9L48.8 397.6L48.2 399.2L47.3 400.6L46.2 401.9L44.9 403L43.4 403.9L41.8 404.6L40.2 405L38.5 405.1L36.7 405L35.1 404.6L33.5 403.9L32 403L30.7 401.9L29.6 400.6L28.7 399.2L28.1 397.6L27.7 395.9Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M27.6 394.2L27.7 392.5L28.1 390.9L28.7 389.3L29.6 387.8L30.7 386.5L32 385.4L33.5 384.5L35.1 383.9L36.7 383.5L38.5 383.3L40.2 383.5L41.8 383.9L43.4 384.5L44.9 385.4L45.2 385.8L45.3 386.3L45.2 387L44.9 387.9L44.4 388.8L43.7 389.9L42.9 391L41.9 392.2L40.8 393.4L39.6 394.5L38.3 395.6L37.1 396.7L35.8 397.6L34.5 398.4L33.3 399.1L32.2 399.6L31.3 400L30.4 400.1L29.7 400.1L29.3 399.9L28.7 399.2L28.1 397.6L27.7 395.9Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M27.6 394.2L27.7 392.5L28.1 390.9L28.7 389.3L29.6 387.8L30.7 386.5L32 385.4L33.5 384.5L35.1 383.9L36.7 383.5L38.5 383.3L40.2 383.5L41.8 383.9L42.7 384.2L43 384.6L43.1 385.1L43 385.7L42.7 386.5L42.3 387.4L41.7 388.4L40.9 389.4L40 390.5L39 391.6L37.9 392.7L36.7 393.7L35.5 394.7L34.3 395.5L33.2 396.3L32.1 396.9L31.1 397.4L30.2 397.7L29.4 397.9L28.8 397.9L28.3 397.7L28 397.3L27.7 395.9Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M27.6 394.2L27.7 392.5L28.1 390.9L28.7 389.3L29.6 387.8L30.7 386.5L32 385.4L33.5 384.5L35.1 383.9L36.7 383.5L38.5 383.3L40 383.4L40.4 383.6L40.6 383.9L40.7 384.3L40.6 384.9L40.4 385.6L40 386.3L39.4 387.2L38.8 388.1L38 389L37.1 390L36.2 390.9L35.2 391.8L34.1 392.6L33.1 393.4L32.1 394L31.1 394.6L30.3 395L29.5 395.3L28.8 395.4L28.3 395.4L27.9 395.2L27.6 394.9Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M27.6 394.2L27.7 392.5L28.1 390.9L28.7 389.3L29.6 387.8L30.7 386.5L32 385.4L33.5 384.5L35.1 383.9L36.7 383.5L38.5 383.3L40.2 383.5L41.8 383.9L43.4 384.5L44.9 385.4L46.2 386.5L47.3 387.8L48.2 389.3L48.8 390.9L49.2 392.5L49.3 394.2L49.2 395.9L48.8 397.6L48.2 399.2L47.3 400.6L46.2 401.9L44.9 403L43.4 403.9L41.8 404.6L40.2 405L38.5 405.1L36.7 405L35.1 404.6L33.5 403.9L32 403L30.7 401.9L29.6 400.6L28.7 399.2L28.1 397.6L27.7 395.9Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.toeR\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M65.5 678.7L73.3 677L86.4 681.1L88.2 683.3L85.8 687L78.6 690.3L65.5 686.2Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M78.6 690.3L85.8 687L88.2 683.3L86.4 681.1L78.6 682.8Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M65.5 678.7L65.5 686.2L78.6 690.3L78.6 682.8Z\"/><path class=\"iso-top\" d=\"M73.3 677L65.5 678.7L78.6 682.8L86.4 681.1Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M86.4 681.1L78.6 682.8M65.5 678.7L78.6 682.8M78.6 682.8L78.6 690.3\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M65.5 678.7L73.3 677L86.4 681.1L88.2 683.3L85.8 687L78.6 690.3L65.5 686.2Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.footR\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M35 696L35.4 689.6L40 685.3L47.7 681.5L63.2 677.3L76.9 681.6L78.5 687.5L77.5 691L49.8 703.4L36.1 699Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M49.8 703.4L77.5 691L78.5 687.5L76.9 681.6L61.4 685.8L53.8 689.7L49.2 694L48.8 700.3Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M35 696L36.1 699L49.8 703.4L48.8 700.3Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M35.4 689.6L35 696L48.8 700.3L49.2 694Z\"/><path class=\"iso-top\" d=\"M63.2 677.3L47.7 681.5L61.4 685.8L76.9 681.6ZM47.7 681.5L40 685.3L53.8 689.7L61.4 685.8ZM40 685.3L35.4 689.6L49.2 694L53.8 689.7Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M76.9 681.6L61.4 685.8M61.4 685.8L53.8 689.7M53.8 689.7L49.2 694M35.4 689.6L49.2 694M49.2 694L48.8 700.3M35 696L48.8 700.3M48.8 700.3L49.8 703.4\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M35 696L35.4 689.6L40 685.3L47.7 681.5L63.2 677.3L76.9 681.6L78.5 687.5L77.5 691L49.8 703.4L36.1 699Z\"/></g></g><g class=\"mq-joint\" data-name=\"as.ankleR\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M42.8 683.2L42.9 682L43.2 680.8L43.6 679.7L44.3 678.6L45.1 677.7L46 676.9L47 676.3L48.2 675.8L49.4 675.5L50.6 675.4L51.8 675.5L53 675.8L54.1 676.3L55.2 676.9L56.1 677.7L56.9 678.6L57.6 679.7L58 680.8L58.3 682L58.4 683.2L58.3 684.4L58 685.6L57.6 686.8L56.9 687.8L56.1 688.8L55.2 689.5L54.1 690.2L53 690.7L51.8 690.9L50.6 691L49.4 690.9L48.2 690.7L47 690.2L46 689.5L45.1 688.8L44.3 687.8L43.6 686.8L43.2 685.6L42.9 684.4Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M42.8 683.2L42.9 682L43.2 680.8L43.6 679.7L44.3 678.6L45.1 677.7L46 676.9L47 676.3L48.2 675.8L49.4 675.5L50.6 675.4L51.8 675.5L53 675.8L54.1 676.3L55.2 676.9L56.1 677.7L56.9 678.6L57.6 679.7L58 680.8L58.3 682L58.4 683.2L58.3 684.4L58 685.6L57.6 686.8L56.9 687.8L56.1 688.8L55.2 689.5L54.1 690.2L53 690.7L51.8 690.9L50.6 691L49.4 690.9L48.2 690.7L47 690.2L46 689.5L45.1 688.8L44.3 687.8L43.6 686.8L43.2 685.6L42.9 684.4Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M42.8 683.2L42.9 682L43.2 680.8L43.6 679.7L44.3 678.6L45.1 677.7L46 676.9L47 676.3L48.2 675.8L49.4 675.5L50.6 675.4L51.8 675.5L53 675.8L54.1 676.3L55.2 676.9L55.4 677.2L55.5 677.6L55.4 678.1L55.2 678.7L54.8 679.4L54.4 680.1L53.8 680.9L53.1 681.8L52.3 682.6L51.4 683.4L50.5 684.2L49.6 685L48.7 685.7L47.8 686.2L46.9 686.7L46.1 687.1L45.4 687.4L44.8 687.5L44.4 687.5L44 687.3L43.6 686.8L43.2 685.6L42.9 684.4Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M42.8 683.2L42.9 682L43.2 680.8L43.6 679.7L44.3 678.6L45.1 677.7L46 676.9L47 676.3L48.2 675.8L49.4 675.5L50.6 675.4L51.8 675.5L53 675.8L53.7 676.1L53.9 676.3L53.9 676.7L53.9 677.1L53.7 677.7L53.3 678.3L52.9 679L52.3 679.8L51.7 680.6L51 681.3L50.2 682.1L49.3 682.9L48.5 683.5L47.6 684.2L46.8 684.7L46 685.2L45.3 685.5L44.6 685.7L44.1 685.9L43.6 685.8L43.3 685.7L43.1 685.5L42.9 684.4Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M42.8 683.2L42.9 682L43.2 680.8L43.6 679.7L44.3 678.6L45.1 677.7L46 676.9L47 676.3L48.2 675.8L49.4 675.5L50.6 675.4L51.7 675.5L52 675.6L52.1 675.8L52.2 676.1L52.1 676.5L52 677L51.7 677.6L51.3 678.2L50.8 678.8L50.3 679.5L49.6 680.2L48.9 680.8L48.2 681.5L47.5 682.1L46.8 682.6L46 683.1L45.4 683.5L44.7 683.8L44.2 684L43.7 684.1L43.3 684.1L43 683.9L42.8 683.7Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M42.8 683.2L42.9 682L43.2 680.8L43.6 679.7L44.3 678.6L45.1 677.7L46 676.9L47 676.3L48.2 675.8L49.4 675.5L50.6 675.4L51.8 675.5L53 675.8L54.1 676.3L55.2 676.9L56.1 677.7L56.9 678.6L57.6 679.7L58 680.8L58.3 682L58.4 683.2L58.3 684.4L58 685.6L57.6 686.8L56.9 687.8L56.1 688.8L55.2 689.5L54.1 690.2L53 690.7L51.8 690.9L50.6 691L49.4 690.9L48.2 690.7L47 690.2L46 689.5L45.1 688.8L44.3 687.8L43.6 686.8L43.2 685.6L42.9 684.4Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.shankR\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M44.8 678.3L52.2 592.7L52.3 592.3L52.6 591.9L53.1 591.6L53.8 591.3L54.7 591.1L55.7 591L56.9 590.9L58.1 590.8L59.5 590.8L60.9 590.9L62.4 591.1L63.8 591.3L65.3 591.5L66.7 591.8L68.1 592.1L69.3 592.5L70.4 592.9L71.4 593.3L72.3 593.8L72.9 594.2L73.4 594.7L73.7 595.1L73.8 595.5L57.5 680L57.4 680.2L57.2 680.4L56.9 680.6L56.5 680.8L56 680.9L55.4 681L54.8 681L54 681.1L53.2 681.1L52.4 681L51.5 680.9L50.7 680.8L49.8 680.7L49 680.5L48.2 680.3L47.5 680.1L46.8 679.8L46.2 679.6L45.7 679.3L45.3 679.1L45 678.8L44.9 678.6Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M64.6 597.2L66.7 597.3L68.6 597.3L70.3 597.2L71.7 596.9L72.8 596.6L73.5 596.1L73.8 595.6L57.5 680L57.3 680.4L56.9 680.6L56.3 680.8L55.4 681L54.4 681.1L53.3 681.1L52.1 681Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M60.4 596.6L62.5 597L64.6 597.2L52.1 681L50.9 680.8L49.7 680.6Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M56.6 595.6L58.4 596.1L60.4 596.6L49.7 680.6L48.5 680.4L47.4 680.1Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M53.8 594.4L55 595L56.6 595.6L47.4 680.1L46.5 679.7L45.7 679.4Z\"/><path class=\"iso-top\" d=\"M63 594.1L63 594.1L63 594.1L63 594.1L63 594.1L63 594.1L63 594.1L63 594.1L63 594.1L63 594.1L63 594.1L63 594.1L63 594.1L63 594.1L63 594.1L63 594.1L63 594.1L63 594.1L63 594.1L63 594.1L63 594.1L63 594.1L63 594.1L63 594.1L63 594.1L63 594.1L63 594.1L63 594.1L63 594.1L63 594.1L63 594.1L63 594.1L63 594.1L70.3 597.2L68.6 597.3L66.7 597.3L64.6 597.2L62.5 597L60.4 596.6L58.4 596.1L56.6 595.6L55 595L53.8 594.4L52.8 593.8L52.3 593.1L52.2 592.6L52.5 592L53.2 591.6L54.3 591.2L55.7 591L57.4 590.8L59.3 590.8L61.4 591L63.5 591.2L65.6 591.6L67.6 592L69.4 592.5L71 593.1L72.2 593.7L73.1 594.4L73.7 595L73.8 595.6L73.5 596.1L72.8 596.6L71.7 596.9L70.3 597.2ZM52.2 592.6L52.3 593.1L52.8 593.8L53.8 594.4L45.7 679.4L45.2 679L44.9 678.6L44.8 678.3Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M52.2 592.6L52.3 593L52.5 593.4L53 593.9L53.6 594.3L54.4 594.8L55.4 595.2L56.5 595.6L57.7 596L59 596.3L60.4 596.6L61.9 596.9L63.3 597.1L64.8 597.2L66.2 597.3L67.6 597.3L68.8 597.3L70 597.2L71 597.1L71.9 596.9L72.7 596.6L73.2 596.3L73.6 596L73.8 595.6\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M44.8 678.3L52.2 592.7L52.3 592.3L52.6 591.9L53.1 591.6L53.8 591.3L54.7 591.1L55.7 591L56.9 590.9L58.1 590.8L59.5 590.8L60.9 590.9L62.4 591.1L63.8 591.3L65.3 591.5L66.7 591.8L68.1 592.1L69.3 592.5L70.4 592.9L71.4 593.3L72.3 593.8L72.9 594.2L73.4 594.7L73.7 595.1L73.8 595.5L57.5 680L57.4 680.2L57.2 680.4L56.9 680.6L56.5 680.8L56 680.9L55.4 681L54.8 681L54 681.1L53.2 681.1L52.4 681L51.5 680.9L50.7 680.8L49.8 680.7L49 680.5L48.2 680.3L47.5 680.1L46.8 679.8L46.2 679.6L45.7 679.3L45.3 679.1L45 678.8L44.9 678.6Z\"/></g></g><g class=\"mq-joint\" data-name=\"as.kneeR\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M52.6 588.7L52.7 586.9L53.2 585.2L53.8 583.6L54.7 582.1L55.9 580.8L57.2 579.6L58.7 578.7L60.3 578.1L62 577.7L63.7 577.5L65.5 577.7L67.2 578.1L68.8 578.7L70.3 579.6L71.6 580.8L72.7 582.1L73.7 583.6L74.3 585.2L74.7 586.9L74.9 588.7L74.7 590.4L74.3 592.1L73.7 593.7L72.7 595.2L71.6 596.5L70.3 597.7L68.8 598.6L67.2 599.2L65.5 599.6L63.7 599.8L62 599.6L60.3 599.2L58.7 598.6L57.2 597.7L55.9 596.5L54.7 595.2L53.8 593.7L53.2 592.1L52.7 590.4Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M52.6 588.7L52.7 586.9L53.2 585.2L53.8 583.6L54.7 582.1L55.9 580.8L57.2 579.6L58.7 578.7L60.3 578.1L62 577.7L63.7 577.5L65.5 577.7L67.2 578.1L68.8 578.7L70.3 579.6L71.6 580.8L72.7 582.1L73.7 583.6L74.3 585.2L74.7 586.9L74.9 588.7L74.7 590.4L74.3 592.1L73.7 593.7L72.7 595.2L71.6 596.5L70.3 597.7L68.8 598.6L67.2 599.2L65.5 599.6L63.7 599.8L62 599.6L60.3 599.2L58.7 598.6L57.2 597.7L55.9 596.5L54.7 595.2L53.8 593.7L53.2 592.1L52.7 590.4Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M52.6 588.7L52.7 586.9L53.2 585.2L53.8 583.6L54.7 582.1L55.9 580.8L57.2 579.6L58.7 578.7L60.3 578.1L62 577.7L63.7 577.5L65.5 577.7L67.2 578.1L68.8 578.7L70.3 579.6L70.6 580L70.7 580.6L70.6 581.3L70.3 582.2L69.8 583.2L69.1 584.2L68.2 585.4L67.2 586.6L66.1 587.8L64.9 589L63.6 590.1L62.3 591.2L61 592.1L59.7 593L58.5 593.6L57.4 594.2L56.4 594.5L55.5 594.7L54.9 594.7L54.3 594.5L53.8 593.7L53.2 592.1L52.7 590.4Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M52.6 588.7L52.7 586.9L53.2 585.2L53.8 583.6L54.7 582.1L55.9 580.8L57.2 579.6L58.7 578.7L60.3 578.1L62 577.7L63.7 577.5L65.5 577.7L67.2 578.1L68.1 578.5L68.4 578.8L68.5 579.3L68.4 580L68.1 580.8L67.7 581.7L67 582.7L66.2 583.8L65.3 584.9L64.3 586L63.1 587.1L62 588.1L60.7 589.1L59.5 590L58.4 590.8L57.2 591.4L56.2 591.9L55.3 592.2L54.5 592.4L53.8 592.4L53.4 592.2L53.1 591.8L52.7 590.4Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M52.6 588.7L52.7 586.9L53.2 585.2L53.8 583.6L54.7 582.1L55.9 580.8L57.2 579.6L58.7 578.7L60.3 578.1L62 577.7L63.7 577.5L65.3 577.6L65.7 577.8L66 578.1L66 578.6L66 579.1L65.7 579.8L65.3 580.6L64.8 581.5L64.1 582.4L63.3 583.3L62.4 584.3L61.4 585.2L60.4 586.2L59.3 587L58.3 587.8L57.3 588.5L56.3 589L55.4 589.4L54.6 589.7L53.9 589.9L53.3 589.8L52.9 589.7L52.7 589.4Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M52.6 588.7L52.7 586.9L53.2 585.2L53.8 583.6L54.7 582.1L55.9 580.8L57.2 579.6L58.7 578.7L60.3 578.1L62 577.7L63.7 577.5L65.5 577.7L67.2 578.1L68.8 578.7L70.3 579.6L71.6 580.8L72.7 582.1L73.7 583.6L74.3 585.2L74.7 586.9L74.9 588.7L74.7 590.4L74.3 592.1L73.7 593.7L72.7 595.2L71.6 596.5L70.3 597.7L68.8 598.6L67.2 599.2L65.5 599.6L63.7 599.8L62 599.6L60.3 599.2L58.7 598.6L57.2 597.7L55.9 596.5L54.7 595.2L53.8 593.7L53.2 592.1L52.7 590.4Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.thighR\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M37.6 511.8L37.8 511L38.1 510.2L38.5 509.4L39.1 508.6L39.8 507.8L40.6 507.1L41.5 506.4L42.5 505.7L43.7 505.1L44.9 504.6L46.2 504.1L47.6 503.6L49 503.2L50.4 502.9L51.9 502.7L53.4 502.6L54.9 502.5L56.3 502.5L57.7 502.6L59.1 502.7L60.4 503L61.6 503.3L62.8 503.6L63.8 504.1L64.7 504.6L65.6 505.2L66.3 505.8L66.8 506.4L67.3 507.1L67.6 507.9L67.7 508.6L72.9 582.6L72.9 583.1L72.8 583.6L72.6 584.1L72.4 584.7L72 585.2L71.5 585.7L71 586.2L70.4 586.6L69.7 587L69 587.5L68.2 587.8L67.3 588.2L66.4 588.4L65.5 588.7L64.5 588.9L63.6 589L62.6 589.1L61.6 589.2L60.7 589.2L59.8 589.1L58.9 589L58 588.9L57.2 588.7L56.4 588.4L55.8 588.1L55.1 587.8L54.6 587.4L54.1 587L53.8 586.6L53.5 586.1L53.3 585.6L37.8 513.3L37.6 512.5Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M49.1 518.7L52 518.6L54.9 518.3L57.8 517.6L60.4 516.6L62.8 515.5L64.8 514.1L66.3 512.6L67.3 511L67.7 509.4L72.9 583.1L72.6 584.1L72 585.2L71 586.2L69.7 587L68.2 587.8L66.4 588.4L64.5 588.9L62.6 589.1L60.7 589.2Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M43.7 517.9L46.3 518.5L49.1 518.7L60.7 589.2L58.9 589L57.2 588.7Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M38.5 514.8L39.8 516L41.6 517.1L43.7 517.9L57.2 588.7L55.8 588.1L54.6 587.4L53.8 586.6Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M37.8 513.3L38.5 514.8L53.8 586.6L53.3 585.6Z\"/><path class=\"iso-top\" d=\"M52.7 510.6L52.7 510.6L52.7 510.6L52.7 510.6L52.7 510.6L52.7 510.6L52.7 510.6L52.7 510.6L52.7 510.6L52.7 510.6L52.7 510.6L52.7 510.6L52.7 510.6L52.7 510.6L52.7 510.6L52.7 510.6L52.7 510.6L52.7 510.6L52.7 510.6L52.7 510.6L52.7 510.6L52.7 510.6L52.7 510.6L52.7 510.6L52.7 510.6L52.7 510.6L52.7 510.6L52.7 510.6L52.7 510.6L52.7 510.6L52.7 510.6L52.7 510.6L52.7 510.6L62.8 515.5L60.4 516.6L57.8 517.6L54.9 518.3L52 518.6L49.1 518.7L46.3 518.5L43.7 517.9L41.6 517.1L39.8 516L38.5 514.8L37.8 513.3L37.6 511.8L38.1 510.2L39.1 508.6L40.6 507.1L42.5 505.7L44.9 504.6L47.6 503.6L50.4 502.9L53.4 502.6L56.3 502.5L59.1 502.7L61.6 503.3L63.8 504.1L65.6 505.2L66.8 506.4L67.6 507.9L67.7 509.4L67.3 511L66.3 512.6L64.8 514.1L62.8 515.5Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M37.7 513L38 513.8L38.3 514.5L38.9 515.2L39.5 515.8L40.3 516.4L41.2 516.9L42.2 517.4L43.4 517.8L44.6 518.2L45.9 518.4L47.2 518.6L48.6 518.7L50.1 518.7L51.6 518.7L53 518.5L54.5 518.3L56 518L57.4 517.7L58.8 517.3L60.1 516.8L61.4 516.2L62.6 515.6L63.6 514.9L64.6 514.2L65.5 513.5L66.2 512.7L66.8 512L67.2 511.2L67.5 510.4L67.7 509.6L67.7 508.8\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M37.6 511.8L37.8 511L38.1 510.2L38.5 509.4L39.1 508.6L39.8 507.8L40.6 507.1L41.5 506.4L42.5 505.7L43.7 505.1L44.9 504.6L46.2 504.1L47.6 503.6L49 503.2L50.4 502.9L51.9 502.7L53.4 502.6L54.9 502.5L56.3 502.5L57.7 502.6L59.1 502.7L60.4 503L61.6 503.3L62.8 503.6L63.8 504.1L64.7 504.6L65.6 505.2L66.3 505.8L66.8 506.4L67.3 507.1L67.6 507.9L67.7 508.6L72.9 582.6L72.9 583.1L72.8 583.6L72.6 584.1L72.4 584.7L72 585.2L71.5 585.7L71 586.2L70.4 586.6L69.7 587L69 587.5L68.2 587.8L67.3 588.2L66.4 588.4L65.5 588.7L64.5 588.9L63.6 589L62.6 589.1L61.6 589.2L60.7 589.2L59.8 589.1L58.9 589L58 588.9L57.2 588.7L56.4 588.4L55.8 588.1L55.1 587.8L54.6 587.4L54.1 587L53.8 586.6L53.5 586.1L53.3 585.6L37.8 513.3L37.6 512.5Z\"/></g></g><g class=\"mq-joint\" data-name=\"as.hipR\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M39.2 505.4L39.3 503.4L39.8 501.5L40.5 499.6L41.6 497.9L42.9 496.4L44.4 495.1L46.1 494L48 493.2L49.9 492.8L51.9 492.6L53.9 492.8L55.9 493.2L57.7 494L59.5 495.1L61 496.4L62.3 497.9L63.3 499.6L64.1 501.5L64.6 503.4L64.7 505.4L64.6 507.4L64.1 509.4L63.3 511.2L62.3 512.9L61 514.4L59.5 515.7L57.7 516.8L55.9 517.6L53.9 518L51.9 518.2L49.9 518L48 517.6L46.1 516.8L44.4 515.7L42.9 514.4L41.6 512.9L40.5 511.2L39.8 509.4L39.3 507.4Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M39.2 505.4L39.3 503.4L39.8 501.5L40.5 499.6L41.6 497.9L42.9 496.4L44.4 495.1L46.1 494L48 493.2L49.9 492.8L51.9 492.6L53.9 492.8L55.9 493.2L57.7 494L59.5 495.1L61 496.4L62.3 497.9L63.3 499.6L64.1 501.5L64.6 503.4L64.7 505.4L64.6 507.4L64.1 509.4L63.3 511.2L62.3 512.9L61 514.4L59.5 515.7L57.7 516.8L55.9 517.6L53.9 518L51.9 518.2L49.9 518L48 517.6L46.1 516.8L44.4 515.7L42.9 514.4L41.6 512.9L40.5 511.2L39.8 509.4L39.3 507.4Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M39.2 505.4L39.3 503.4L39.8 501.5L40.5 499.6L41.6 497.9L42.9 496.4L44.4 495.1L46.1 494L48 493.2L49.9 492.8L51.9 492.6L53.9 492.8L55.9 493.2L57.7 494L59.5 495.1L59.8 495.5L59.9 496.1L59.8 497L59.5 498L58.9 499.1L58.1 500.3L57.1 501.6L56 503L54.7 504.4L53.3 505.7L51.8 507.1L50.3 508.3L48.8 509.4L47.3 510.3L45.9 511.1L44.6 511.7L43.5 512.2L42.5 512.4L41.7 512.3L41.1 512.1L40.5 511.2L39.8 509.4L39.3 507.4Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M39.2 505.4L39.3 503.4L39.8 501.5L40.5 499.6L41.6 497.9L42.9 496.4L44.4 495.1L46.1 494L48 493.2L49.9 492.8L51.9 492.6L53.9 492.8L55.9 493.2L57 493.7L57.3 494.1L57.4 494.7L57.3 495.5L57 496.4L56.4 497.4L55.7 498.6L54.8 499.8L53.7 501L52.5 502.3L51.3 503.6L49.9 504.8L48.5 505.9L47.1 506.9L45.7 507.8L44.5 508.6L43.3 509.1L42.2 509.5L41.3 509.7L40.6 509.7L40 509.5L39.7 509.1L39.3 507.4Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M39.2 505.4L39.3 503.4L39.8 501.5L40.5 499.6L41.6 497.9L42.9 496.4L44.4 495.1L46.1 494L48 493.2L49.9 492.8L51.9 492.6L53.7 492.7L54.2 492.9L54.5 493.3L54.6 493.8L54.5 494.5L54.2 495.3L53.7 496.2L53.1 497.1L52.3 498.2L51.4 499.3L50.4 500.4L49.2 501.5L48.1 502.5L46.9 503.5L45.7 504.4L44.5 505.2L43.4 505.8L42.3 506.3L41.4 506.6L40.6 506.8L40 506.8L39.5 506.6L39.3 506.2Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M39.2 505.4L39.3 503.4L39.8 501.5L40.5 499.6L41.6 497.9L42.9 496.4L44.4 495.1L46.1 494L48 493.2L49.9 492.8L51.9 492.6L53.9 492.8L55.9 493.2L57.7 494L59.5 495.1L61 496.4L62.3 497.9L63.3 499.6L64.1 501.5L64.6 503.4L64.7 505.4L64.6 507.4L64.1 509.4L63.3 511.2L62.3 512.9L61 514.4L59.5 515.7L57.7 516.8L55.9 517.6L53.9 518L51.9 518.2L49.9 518L48 517.6L46.1 516.8L44.4 515.7L42.9 514.4L41.6 512.9L40.5 511.2L39.8 509.4L39.3 507.4Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.pelvis\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M40.3 503.3L40.4 502.2L40.5 501.1L40.6 500L40.8 498.8L41.1 497.7L41.4 496.6L41.8 495.5L42.2 494.4L42.7 493.3L43.2 492.3L43.7 491.3L44.3 490.4L45 489.5L45.6 488.7L46.3 488L47 487.3L47.7 486.7L48.9 485.8L49.7 485.3L50.5 484.8L51.3 484.4L52.2 484.1L53.6 483.7L54.5 483.5L55.3 483.4L56.1 483.4L61.5 483.9L62.3 484L63.2 484.2L73.3 486.9L83.1 490.5L83.9 490.8L84.7 491.2L89.3 493.9L90 494.4L90.6 495L91.6 496.1L92.1 496.8L92.6 497.5L93 498.4L93.4 499.2L93.7 500.2L94.2 501.6L94.4 502.5L94.6 503.4L94.7 504.5L94.8 505.5L94.8 506.6L94.7 507.7L94.6 508.8L94.4 510L94.2 511.1L93.9 512.2L93.5 513.3L93.1 514.4L92.7 515.5L92.2 516.5L91.7 517.5L91.1 518.5L90.5 519.4L89.8 520.2L89.2 521L88.5 521.7L87.7 522.4L87 522.9L85.8 523.8L85 524.3L84.2 524.8L83.4 525.1L82.5 525.4L81.1 525.7L80.2 525.9L79.4 526L78.6 525.9L73.2 525.5L72.4 525.3L62.2 522.6L61.4 522.3L51.6 518.7L50.8 518.4L46.2 515.7L45.5 515.2L44.8 514.7L44.2 514L43.3 512.9L42.8 512.2L42.3 511.4L41.9 510.6L41.5 509.6L41.1 508.2L40.8 507.4L40.6 506.4L40.5 505.4L40.4 504.4Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M46.1 515.7L45.3 515.1L44.5 514.4L43.8 513.5L44.9 514.7L44.9 514.7ZM46.1 515.7L45.3 515.1L44.5 514.4L43.8 513.5L44.4 513.8L44.9 514L45.5 514.2L46.1 514.4L46.8 514.5L47 514.5L47 514.5L47 514.5L47.1 514.5L47.5 514.6L47.5 514.6L49 515.2L50.6 515.7L52.2 516.2L53.8 516.7L55.3 517.2L57 517.6L57 517.6L58.6 518L60.2 518.4L61.9 518.8L63.6 519.2L65.3 519.6L67 519.9L67 519.9L67.8 519.9L68.6 519.8L69.5 519.7L70.4 519.5L71.3 519.3L72.2 519.1L72.6 520.4L73.1 521.5L73.7 522.6L74.4 523.5L75.1 524.3L76 525L76.9 525.4L77.8 525.8L78.8 525.9L77.9 526L77 526L76.1 525.9L75.2 525.8L74.4 525.7L73.5 525.5L72.4 525.3L70.6 524.9L69 524.5L67.3 524.1L65.6 523.6L63.9 523.1L62.2 522.6L61.7 522.4L60 521.9L58.4 521.3L56.7 520.7L55.1 520.1L53.5 519.5L51.8 518.8L50.8 518.4L50.4 518.2L50.3 518.1L50.2 518.1L50.2 518.1L50 518L49.2 517.6L48.4 517.2L47.6 516.7L46.9 516.2ZM83 525.1L81.9 525.5L80.8 525.8L79.8 525.9L78.7 525.9L77.7 525.7L76.8 525.4L75.9 524.9L75.1 524.3L74.4 523.5L73.7 522.6L73.1 521.5L72.6 520.3L72.2 519.1L72.2 519.1L72.6 520.4L73.1 521.5L73.7 522.6L74.4 523.5L75.1 524.3L76 525L76.9 525.4L77.8 525.8L78.8 525.9ZM91.6 496.3L91.6 496.3L91.9 496.8L91.3 495.8ZM91.3 495.8L91.9 496.8L92 496.9L92.1 497L92.2 497.1L92.2 497.1L92.3 497.2L92.4 497.2L92.5 497.4L92.8 497.8L92.8 497.9L92.9 498L92.9 498.1L92.9 498.2L93 498.3L93.2 498.8L93.2 499.1L93.3 499.4L92.8 498.5L92.1 497.8L91.5 497.2L90.7 496.7L89.9 496.3L89.1 496.1L89.4 495.8L89.8 495.6L90.3 495.4L90.4 495.4L90.5 495.4L90.5 495.4L90.6 495.4L90.7 495.4L91 495.4L91.1 495.5L91.2 495.6L91.2 495.6L91.2 495.6L91.2 495.7L91.2 495.7ZM83 525.1L81.9 525.5L80.8 525.8L79.8 525.9L78.7 525.9L77.7 525.7L76.8 525.4L75.9 524.9L75.1 524.3L74.4 523.5L73.7 522.6L73.1 521.5L72.6 520.3L72.2 519.1L72.4 518.7L72.5 518.5L72.6 518.3L72.7 518.2L72.7 518.1L72.8 517.8L73.1 517.3L73.6 516.2L73.8 515.9L73.9 515.6L74 515.5L74.1 515.3L74.3 515L75.1 513.6L75.5 512.8L76.1 512L75.9 513.4L75.9 514.7L76 516L76.1 517.3L76.4 518.5L76.7 519.6L77.1 520.6L77.6 521.5L78.2 522.3L78.8 523L79.5 523.6L80.3 524L81.1 524.3L82 524.5L82.9 524.5L83.8 524.4L84.7 524.1L85.6 523.7L85.4 524L85.2 524.2L84.8 524.5L84.6 524.5L84.6 524.6L84.5 524.6L84.4 524.7L84.3 524.7L83.9 524.9L83.6 525L83.5 525L83.5 525L83.4 525L83.3 525L83.2 525ZM89.1 496.1L90 496.3L90.8 496.7L91.6 497.3L92.3 497.9L92.9 498.7L93.4 499.7L93.9 500.7L94.3 501.9L94.5 503.1L94.7 504.4L94.8 505.8L94.7 507.3L94.6 508.7L94.4 510.2L94 511.7L93.6 513.2L93.1 514.6L92.5 516L91.8 517.3L91 518.6L90.2 519.7L89.4 520.8L88.4 521.7L87.5 522.6L86.5 523.2L85.5 523.8L84.6 524.2L83.6 524.4L82.6 524.5L81.7 524.5L80.8 524.2L80 523.9L79.2 523.4L78.5 522.7L77.9 521.9L77.3 521L76.8 519.9L76.4 518.8L76.2 517.6L76 516.2L75.9 514.9L75.9 513.4L76.1 512L93.3 499.4L92.8 498.5L92.1 497.8L91.5 497.2L90.7 496.7L89.9 496.3L89.1 496.1ZM85.6 523.7L84.7 524.1L83.8 524.4L82.9 524.5L82 524.5L81.1 524.3L80.3 524L79.5 523.6L78.8 523L78.2 522.3L77.6 521.5L77.1 520.6L76.7 519.6L76.4 518.5L76.1 517.3L76 516L75.9 514.7L75.9 513.4L76.1 512L78.2 522.3L78.2 522.3ZM89.1 496.1L90 496.3L90.8 496.7L91.6 497.3L92.3 497.9L92.9 498.7L93.4 499.7L93.9 500.7L94.3 501.9L94.5 503.1L94.7 504.4L94.8 505.8L94.7 507.3L94.6 508.7L94.4 510.2L94 511.7L93.6 513.2L93.1 514.6L92.5 516L91.8 517.3L91 518.6L90.2 519.7L89.4 520.8L88.4 521.7L87.5 522.6L86.5 523.2L85.5 523.8L84.6 524.2L83.6 524.4L82.6 524.5L81.7 524.5L80.8 524.2L80 523.9L79.2 523.4L78.5 522.7L77.9 521.9L77.3 521L76.8 519.9L76.4 518.8L76.2 517.6L76 516.2L75.9 514.9L75.9 513.4L76.1 512L76.2 511.2L76.4 510.4L76.9 508.7L78.7 504.6L79.5 503.2L76.5 514.4L76.6 514.4L76.9 514.4L77.5 514.2L78.2 514.1L78.9 513.9L79.6 513.8L79.6 514.8L79.8 515.8L79.9 516.8L80.2 517.6L80.5 518.4L80.9 519.1L81.4 519.7L81.9 520.3L82.5 520.7L83.1 521L83.8 521.2L84.4 521.2L85.2 521.2L85.9 521L86.6 520.8L87.3 520.4L88.1 519.9L88.8 519.3L89.5 518.6L90.1 517.9L90.7 517L91.3 516.1L91.8 515.1L92.3 514.1L92.7 513L93 511.9L93.3 510.8L93.5 509.7L93.6 508.6L93.6 507.5L93.6 506.5L93.5 505.5L93.3 504.6L93 503.7L92.7 502.9L92.3 502.2L91.8 501.6L91.3 501.1L90.7 500.7L90.1 500.4L89.5 500.2L88.8 500.1L88.1 500.1L87.3 500.3L86.6 500.6L85.9 500.9L85.2 501.4L84.4 502L83.8 502.7L83.1 503.5L82.5 504.3L81.9 505.3L81.4 506.2L80.9 507.3L80.5 508.3L80.2 509.4L79.9 510.5L79.8 511.6L79.6 512.7L79.6 513.8L78.9 513.9L78.2 514.1L77.5 514.2L76.9 514.4L76.6 514.4L76.5 514.4L83.3 498.6L84.3 497.8L87 496.3L88.1 496.1L88.6 496.1ZM79.6 513.8L79.7 512.2L79.9 510.5L80.4 508.9L80.9 507.3L81.7 505.7L82.5 504.3L83.4 503.1L84.4 502L85.5 501.2L86.6 500.6L87.7 500.2L88.8 500.1L89.8 500.2L90.7 500.7L91.6 501.3L92.3 502.2L92.8 503.3L93.3 504.6L93.5 506L93.6 507.5L93.5 509.2L93.3 510.8L92.8 512.5L92.3 514.1L91.6 515.6L90.7 517L89.8 518.2L88.8 519.3L87.7 520.2L86.6 520.8L85.5 521.1L84.4 521.2L83.4 521.1L82.5 520.7L81.7 520L80.9 519.1L80.4 518L79.9 516.8L79.7 515.3L79.6 513.8L86.6 510.7L86.6 510.7L86.6 510.7L86.6 510.7L86.6 510.7L86.6 510.7L86.6 510.7L86.6 510.7L86.6 510.7L86.6 510.7L86.6 510.7L86.6 510.7L86.6 510.7L86.6 510.7L86.6 510.7L86.6 510.7L86.6 510.7L86.6 510.7L86.6 510.7L86.6 510.7L86.6 510.7L86.6 510.7L86.6 510.7L86.6 510.7L86.6 510.7L86.6 510.7L86.6 510.7L86.6 510.7L86.6 510.7L86.6 510.7L86.6 510.7L86.6 510.7L86.6 510.7L86.6 510.7L86.6 510.7L86.6 510.7L86.6 510.7L86.6 510.7L86.6 510.7L86.6 510.7L86.6 510.7Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M42.4 511.6L42.4 511.6L42.4 511.6L42.4 511.7ZM42.4 511.7L42.4 511.6L42.4 511.6L42.4 511.5L42.4 511.2L42.5 510.9L42.5 510.9L43.1 511.1L43.7 511.2L44.3 511.3L45 511.4L45.7 511.5L45.8 511.5L45.9 511.5L45.9 511.5L46 511.5L46.4 511.5L46.4 511.5L47.9 512L49.5 512.5L51.1 513L52.7 513.5L54.3 513.9L55.9 514.3L55.9 514.3L57.6 514.7L59.3 515.1L60.9 515.5L62.6 515.9L64.4 516.3L66.1 516.6L66.1 516.6L67 516.5L67.8 516.4L68.7 516.2L69.7 516L70.7 515.7L71.7 515.4L71.8 516.7L72 517.9L72.2 519.1L71.3 519.3L70.4 519.5L69.5 519.7L68.6 519.8L67.8 519.9L67 519.9L67 519.9L65.3 519.6L63.6 519.2L61.9 518.8L60.2 518.4L58.6 518L57 517.6L57 517.6L55.3 517.2L53.8 516.7L52.2 516.2L50.6 515.7L49 515.2L47.5 514.6L47.5 514.6L47.1 514.5L47 514.5L47 514.5L47 514.5L46.8 514.5L46.1 514.4L45.5 514.2L44.9 514L44.4 513.8L43.8 513.5L43.3 512.6L42.9 512.3L42.6 511.9L42.5 511.7ZM72.2 519.1L72 517.9L71.8 516.7L71.7 515.4L71.7 515.4L71.8 516.7L72 517.9L72.2 519.1ZM89.3 493.9L90 494.5L90.7 495.1L91.3 495.8L90.4 494.8L90.4 494.8ZM89.3 493.9L90 494.5L90.7 495.1L91.3 495.8L91.2 495.7L91.2 495.7L91.2 495.6L91.2 495.6L91.2 495.6L91.1 495.5L91 495.4L90.7 495.4L90.6 495.4L90.5 495.4L90.5 495.4L90.4 495.4L90.3 495.4L89.8 495.6L89.4 495.8L89.1 496.1L89.1 496.1L88.3 496L87.5 496.1L86.6 496.2L85.8 496.5L84.9 496.9L84.1 497.3L83.2 497.9L83.2 497.9L84.6 496.5L85.6 495.7L87 494.7L87.2 494.5L87.3 494.4L87.5 494.4L87.7 494.2L87.9 494.2L88.6 493.9L88.8 493.9L88.9 493.9L89 493.9L89 493.9L89.1 493.9L89.2 493.9ZM72.2 519.1L72 517.9L71.8 516.7L71.7 515.4L72 514.9L72.1 514.6L72.2 514.3L72.3 514.2L72.4 514L72.6 513.7L72.9 513L73.8 511.4L74 510.9L74.3 510.5L74.4 510.2L74.5 510L74.8 509.4L76.3 507L77.4 505.4L78.8 503.3L78.8 503.3L78.2 504.4L77.7 505.6L77.2 506.9L76.8 508.1L76.5 509.4L76.2 510.7L76.1 512L76.1 512L75.5 512.8L75.1 513.6L74.3 515L74.1 515.3L74 515.5L73.9 515.6L73.8 515.9L73.6 516.2L73.1 517.3L72.8 517.8L72.7 518.1L72.7 518.2L72.6 518.3L72.5 518.5L72.4 518.7ZM76.2 511.2L76.5 509.8L76.8 508.4L77.3 507L77.8 505.6L78.4 504.3L79 503.1L79.7 501.9L80.5 500.8L81.3 499.8L82.2 498.9L83.1 498.1L84 497.4L84.9 496.9L85.9 496.5L86.8 496.2L87.7 496.1L88.6 496.1L89.1 496.1L88.3 496L87.5 496.1L86.6 496.2L85.8 496.5L84.9 496.9L84.1 497.3L83.2 497.9ZM76.1 512L76.2 510.7L76.5 509.4L76.8 508.1L77.2 506.9L77.7 505.6L78.2 504.4L78.8 503.3L77.1 507.5L77.1 507.5ZM76.2 511.2L76.5 509.8L76.8 508.4L77.3 507L77.8 505.6L78.4 504.3L79 503.1L79.7 501.9L80.5 500.8L81.3 499.8L82.2 498.9L83.1 498.1L84 497.4L84.9 496.9L85.9 496.5L86.8 496.2L87.7 496.1L88.6 496.1L88.1 496.1L87 496.3L84.3 497.8L83.3 498.6L82.4 499.3L81.6 500.2L80.9 501.1L80.2 502.1L79.5 503.2L78.7 504.6L76.9 508.7L76.4 510.4ZM79.5 503.2L80.2 502.1L80.9 501.1L81.6 500.2L82.4 499.3L83.3 498.6L81.3 500.7L81.3 500.7Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M41.4 509.1L41.4 509.1L41.1 508.2L41.4 509.1L41.8 510ZM41.8 510L41.4 509.1L41.1 508.2L41 508.3L41.1 508.3L41.1 508.2L41.1 508.1L41.2 508.1L41.2 508L41.2 507.9L41.4 507.6L41.7 507.2L41.7 507.2L42.3 507.3L42.9 507.3L43.6 507.3L44.3 507.3L45.1 507.3L45.3 507.3L45.3 507.3L45.4 507.3L45.5 507.3L45.9 507.3L45.9 507.3L47.4 507.8L49 508.2L50.6 508.7L52.2 509.1L53.9 509.5L55.5 509.9L55.5 509.9L57.2 510.2L58.9 510.6L60.6 511L62.3 511.3L64.1 511.7L65.8 512.1L65.8 513.7L65.9 515.2L66.1 516.6L64.4 516.3L62.6 515.9L60.9 515.5L59.3 515.1L57.6 514.7L55.9 514.3L55.9 514.3L54.3 513.9L52.7 513.5L51.1 513L49.5 512.5L47.9 512L46.4 511.5L46.4 511.5L46 511.5L45.9 511.5L45.9 511.5L45.8 511.5L45.7 511.5L45 511.4L44.3 511.3L43.7 511.2L43.1 511.1L42.5 510.9L42.5 510.9L42.4 511.2L42.4 511.5L42.4 511.6L42.4 511.6L42.4 511.6L42.3 511.5L42.1 511.1L41.9 510.6ZM66.1 516.6L65.9 515.2L65.8 513.7L65.8 512.1L65.8 512.1L65.8 513.7L65.9 515.2L66.1 516.6ZM83.9 490.8L83.9 490.8L84.3 491L83.5 490.6ZM83.5 490.6L84.3 491L85.1 491.4L85.9 491.7L86.7 492.2L87.5 492.6L88.2 493.1L89 493.7L89.3 493.9L89.2 493.9L89.1 493.9L89 493.9L89 493.9L88.9 493.9L88.8 493.9L88.6 493.9L87.9 494.2L87.7 494.2L87.5 494.4L86.6 494.4L85.6 494.6L84.7 494.9L83.7 495.3L82.8 495.8L81.9 496.5L81 497.3L80.1 498.1L81.7 496.4L82.5 495.6L84.5 494L85.1 493.5L85.4 493.4L85.5 493.3L85.6 493.2L85.8 493.1L86 493L86.3 492.9L86.3 492.9L85.9 492.4L85.5 491.9L85.1 491.5L84.6 491.1L84 490.8ZM66.1 516.6L65.9 515.2L65.8 513.7L65.8 512.1L66.8 511.9L67.7 511.7L68.7 511.4L69.8 511.1L70.8 510.7L72 510.3L72 510.3L72.4 509.6L72.7 509.2L72.9 508.7L73 508.5L73.2 508.2L73.5 507.7L74.2 506.5L76.2 503.3L77.1 502L78.6 499.9L77.9 501L77.1 502.2L76.5 503.5L75.9 504.8L75.4 506.2L74.9 507.6L74.6 509L74.3 510.5L74 510.9L73.8 511.4L72.9 513L72.6 513.7L72.4 514L72.3 514.2L72.2 514.3L72.1 514.6L72 514.9L71.7 515.4L71.7 515.4L70.7 515.7L69.7 516L68.7 516.2L67.8 516.4L67 516.5ZM74.4 510.2L74.7 508.7L75.2 507.1L75.7 505.6L76.3 504.2L77 502.8L77.7 501.4L78.5 500.2L79.4 499L80.3 498L81.3 497.1L82.3 496.3L83.3 495.6L84.3 495.1L85.3 494.7L86.4 494.5L87.3 494.4L87.5 494.4L86.6 494.4L85.6 494.6L84.7 494.9L83.7 495.3L82.8 495.8L81.9 496.5L81 497.3L80.1 498.1ZM74.3 510.5L74.6 509L74.9 507.6L75.4 506.2L75.9 504.8L76.5 503.5L77.1 502.2L77.9 501L78.6 499.9L76 504.9L76 504.9ZM74.4 510.2L74.7 508.7L75.2 507.1L75.7 505.6L76.3 504.2L77 502.8L77.7 501.4L78.5 500.2L79.4 499L80.3 498L81.3 497.1L82.3 496.3L83.3 495.6L84.3 495.1L85.3 494.7L86.4 494.5L87.3 494.4L87.2 494.5L87 494.7L85.6 495.7L84.6 496.5L83.2 497.9L83.2 497.9L82.4 498.6L81.6 499.4L80.9 500.3L80.2 501.2L79.5 502.2L78.8 503.3L78.8 503.3L77.4 505.4L76.3 507L74.8 509.4L74.5 510ZM78.8 503.3L79.5 502.2L80.2 501.2L80.9 500.3L81.6 499.4L82.4 498.6L83.2 497.9L80.9 500.3L80.9 500.3Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M41.1 508.2L40.8 507.2L40.6 506.1L40.4 505L40.3 503.8L40.6 506.1L40.6 506.1ZM41.1 508.2L40.8 507.2L40.6 506.1L40.4 505L40.3 503.8L40.4 504L40.5 504.1L40.7 504L40.8 503.9L40.8 503.9L40.8 503.9L41 503.8L41.3 503.4L41.6 502.9L41.6 502.9L42.3 502.9L43 502.9L43.8 502.8L44.5 502.7L45.4 502.6L45.6 502.5L45.6 502.5L45.4 504.1L45.3 505.7L45.3 507.3L45.3 507.3L45.1 507.3L44.3 507.3L43.6 507.3L42.9 507.3L42.3 507.3L41.7 507.2L41.7 507.2L41.4 507.6L41.2 507.9L41.2 508L41.2 508.1L41.1 508.1L41.1 508.2L41.1 508.3L41 508.3ZM45.3 507.3L45.3 505.7L45.4 504.1L45.6 502.5L45.7 502.5L45.5 504.1L45.4 505.7L45.4 507.3ZM61 483.7L61 483.7L61.1 483.8L61.1 483.8ZM61.1 483.8L61.1 483.8L61.2 483.8L61.6 483.9L62.8 484.1L64.5 484.5L66.2 484.9L67.9 485.3L69.5 485.8L71.2 486.2L72.9 486.7L73.5 486.9L75.1 487.5L76.8 488L78.4 488.6L80 489.2L81.7 489.9L83.3 490.5L83.5 490.6L84 490.8L84.6 491.1L85.1 491.5L85.5 491.9L85.9 492.4L86.3 492.9L86.3 492.9L86 493L85.8 493.1L85.6 493.2L84.5 493.4L83.4 493.8L82.3 494.3L81.1 495L80.1 495.9L79 496.9L80.2 495.6L80.9 494.9L81.9 494L81.9 494L81.8 493L81.6 492.3L81.4 491.6L81.1 491L80.7 490.6L80.2 490.2L80.2 490.2L78.7 489.5L77.1 488.9L75.6 488.2L74 487.6L72.5 487.1L71 486.5L71 486.5L69.4 486L67.9 485.5L66.3 485.1L64.7 484.7L63.1 484.2L61.4 483.9L61.4 483.9L61.2 483.8ZM45.4 507.3L45.4 505.7L45.5 504.1L45.7 502.5L45.8 502.5L46.2 502.4L46.2 502.4L47.8 502.8L49.4 503.3L51.1 503.6L52.7 504L54.4 504.4L56.1 504.7L56.1 504.7L57.8 505L59.5 505.3L61.3 505.7L63 506L64.8 506.4L66.5 506.8L66.5 506.8L67.6 506.5L68.7 506.1L69.9 505.6L71.1 505.1L72.5 504.5L73.9 503.7L73.9 503.7L75 502.1L75.7 501.1L77 499.4L76.1 500.7L75.3 502.2L74.5 503.8L73.9 505.4L73.3 507L72.9 508.7L72.7 509.2L72.4 509.6L72 510.3L72 510.3L70.8 510.7L69.8 511.1L68.7 511.4L67.7 511.7L66.8 511.9L65.8 512.1L65.8 512.1L64.1 511.7L62.3 511.3L60.6 511L58.9 510.6L57.2 510.2L55.5 509.9L55.5 509.9L53.9 509.5L52.2 509.1L50.6 508.7L49 508.2L47.4 507.8L45.9 507.3L45.9 507.3L45.5 507.3ZM73 508.5L73.5 506.8L74 505.2L74.7 503.6L75.4 502.1L76.2 500.7L77.1 499.3L78 498.1L79 497L80.1 496L81.1 495.2L82.2 494.4L83.3 493.9L84.4 493.5L85.5 493.3L85.6 493.2L84.5 493.4L83.4 493.8L82.3 494.3L81.1 495L80.1 495.9L79 496.9ZM72.9 508.7L73.3 507L73.9 505.4L74.5 503.8L75.3 502.2L76.1 500.7L77 499.4L74.6 503.8L74.6 503.8ZM73 508.5L73.5 506.8L74 505.2L74.7 503.6L75.4 502.1L76.2 500.7L77.1 499.3L78 498.1L79 497L80.1 496L81.1 495.2L82.2 494.4L83.3 493.9L84.4 493.5L85.5 493.3L85.4 493.4L85.1 493.5L84.5 494L82.5 495.6L81.7 496.4L80.1 498.1L79.3 499L78.6 499.9L77.1 502L76.2 503.3L74.2 506.5L73.5 507.7L73.2 508.2ZM78.6 499.9L79.3 499L80.1 498.1L79.4 499L79.4 499Z\"/><path class=\"iso-top\" d=\"M40.3 503.8L40.4 502.5L40.5 501.1L40.7 499.7L40.9 498.3L41.3 496.9L41.8 495.5L42.3 494.2L42.9 492.9L43.5 491.7L44.3 490.5L45.1 489.4L45.9 488.4L46.7 487.6L47.6 486.8L48.5 486.1L49.5 485.6L42.9 492.9L42.9 492.9ZM40.3 503.8L40.4 502.5L40.5 501.1L40.7 499.7L40.9 498.3L41.3 496.9L41.8 495.5L42.3 494.2L42.9 492.9L43.5 491.7L44.3 490.5L45.1 489.4L45.9 488.4L46.7 487.6L47.6 486.8L48.5 486.1L49.5 485.6L49.9 485.2L50.4 484.9L50.8 484.6L50.9 484.6L51 484.6L51 484.5L51.3 484.5L51.7 484.4L52.1 484.3L56.3 483.4L57.2 483.4L58.1 483.4L59 483.5L59.9 483.6L60.8 483.7L61 483.7L61 483.7L61.1 483.8L61.2 483.8L61.4 483.9L61.4 483.9L63.1 484.2L64.7 484.7L66.3 485.1L67.9 485.5L69.4 486L71 486.5L71 486.5L72.5 487.1L74 487.6L75.6 488.2L77.1 488.9L78.7 489.5L80.2 490.2L80.2 490.2L80.7 490.6L81.1 491L81.4 491.6L81.6 492.3L81.8 493L81.9 494L81.9 494L80.9 494.9L80.2 495.6L79 496.9L78.3 497.7L77.6 498.5L77 499.4L75.7 501.1L75 502.1L73.9 503.7L73.9 503.7L72.5 504.5L71.1 505.1L69.9 505.6L68.7 506.1L67.6 506.5L66.5 506.8L66.5 506.8L64.8 506.4L63 506L61.3 505.7L59.5 505.3L57.8 505L56.1 504.7L56.1 504.7L54.4 504.4L52.7 504L51.1 503.6L49.4 503.3L47.8 502.8L46.2 502.4L46.2 502.4L45.8 502.5L45.7 502.5L45.6 502.5L45.6 502.5L45.4 502.6L44.5 502.7L43.8 502.8L43 502.9L42.3 502.9L41.6 502.9L41.6 502.9L41.3 503.4L41 503.8L40.8 503.9L40.8 503.9L40.8 503.9L40.7 504L40.5 504.1L40.4 504ZM77 499.4L77.6 498.5L78.3 497.7L79 496.9L78 498.1L78 498.1Z\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M40.3 503.3L40.4 502.2L40.5 501.1L40.6 500L40.8 498.8L41.1 497.7L41.4 496.6L41.8 495.5L42.2 494.4L42.7 493.3L43.2 492.3L43.7 491.3L44.3 490.4L45 489.5L45.6 488.7L46.3 488L47 487.3L47.7 486.7L48.9 485.8L49.7 485.3L50.5 484.8L51.3 484.4L52.2 484.1L53.6 483.7L54.5 483.5L55.3 483.4L56.1 483.4L61.5 483.9L62.3 484L63.2 484.2L73.3 486.9L83.1 490.5L83.9 490.8L84.7 491.2L89.3 493.9L90 494.4L90.6 495L91.6 496.1L92.1 496.8L92.6 497.5L93 498.4L93.4 499.2L93.7 500.2L94.2 501.6L94.4 502.5L94.6 503.4L94.7 504.5L94.8 505.5L94.8 506.6L94.7 507.7L94.6 508.8L94.4 510L94.2 511.1L93.9 512.2L93.5 513.3L93.1 514.4L92.7 515.5L92.2 516.5L91.7 517.5L91.1 518.5L90.5 519.4L89.8 520.2L89.2 521L88.5 521.7L87.7 522.4L87 522.9L85.8 523.8L85 524.3L84.2 524.8L83.4 525.1L82.5 525.4L81.1 525.7L80.2 525.9L79.4 526L78.6 525.9L73.2 525.5L72.4 525.3L62.2 522.6L61.4 522.3L51.6 518.7L50.8 518.4L46.2 515.7L45.5 515.2L44.8 514.7L44.2 514L43.3 512.9L42.8 512.2L42.3 511.4L41.9 510.6L41.5 509.6L41.1 508.2L40.8 507.4L40.6 506.4L40.5 505.4L40.4 504.4Z\"/></g></g><g class=\"mq-joint\" data-name=\"as.waist\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M53.4 477.5L53.6 475.1L54.1 472.8L55 470.6L56.3 468.6L57.8 466.8L59.6 465.3L61.6 464L63.8 463.1L66.2 462.6L68.5 462.4L70.9 462.6L73.2 463.1L75.4 464L77.4 465.3L79.2 466.8L80.8 468.6L82 470.6L82.9 472.8L83.5 475.1L83.7 477.5L83.5 479.9L82.9 482.2L82 484.4L80.8 486.4L79.2 488.2L77.4 489.8L75.4 491L73.2 491.9L70.9 492.5L68.5 492.7L66.2 492.5L63.8 491.9L61.6 491L59.6 489.8L57.8 488.2L56.3 486.4L55 484.4L54.1 482.2L53.6 479.9Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M53.4 477.5L53.6 475.1L54.1 472.8L55 470.6L56.3 468.6L57.8 466.8L59.6 465.3L61.6 464L63.8 463.1L66.2 462.6L68.5 462.4L70.9 462.6L73.2 463.1L75.4 464L77.4 465.3L79.2 466.8L80.8 468.6L82 470.6L82.9 472.8L83.5 475.1L83.7 477.5L83.5 479.9L82.9 482.2L82 484.4L80.8 486.4L79.2 488.2L77.4 489.8L75.4 491L73.2 491.9L70.9 492.5L68.5 492.7L66.2 492.5L63.8 491.9L61.6 491L59.6 489.8L57.8 488.2L56.3 486.4L55 484.4L54.1 482.2L53.6 479.9Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M53.4 477.5L53.6 475.1L54.1 472.8L55 470.6L56.3 468.6L57.8 466.8L59.6 465.3L61.6 464L63.8 463.1L66.2 462.6L68.5 462.4L70.9 462.6L73.2 463.1L75.4 464L77.4 465.3L77.9 465.8L78 466.5L77.9 467.5L77.4 468.7L76.8 470L75.8 471.5L74.7 473.1L73.3 474.7L71.8 476.3L70.1 477.9L68.4 479.5L66.6 480.9L64.8 482.2L63.1 483.4L61.4 484.3L59.9 485L58.5 485.5L57.4 485.8L56.4 485.7L55.7 485.5L55 484.4L54.1 482.2L53.6 479.9Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M53.4 477.5L53.6 475.1L54.1 472.8L55 470.6L56.3 468.6L57.8 466.8L59.6 465.3L61.6 464L63.8 463.1L66.2 462.6L68.5 462.4L70.9 462.6L73.2 463.1L74.5 463.6L74.9 464.1L75 464.8L74.9 465.7L74.5 466.8L73.9 468.1L73 469.4L71.9 470.9L70.7 472.4L69.3 473.9L67.7 475.4L66.1 476.8L64.5 478.1L62.8 479.4L61.2 480.4L59.7 481.3L58.2 482L57 482.4L55.9 482.6L55 482.6L54.4 482.3L54 481.9L53.6 479.9Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M53.4 477.5L53.6 475.1L54.1 472.8L55 470.6L56.3 468.6L57.8 466.8L59.6 465.3L61.6 464L63.8 463.1L66.2 462.6L68.5 462.4L70.7 462.5L71.2 462.7L71.5 463.2L71.6 463.8L71.5 464.6L71.2 465.5L70.7 466.6L69.9 467.7L69 469L67.9 470.3L66.7 471.6L65.3 472.9L63.9 474.1L62.5 475.3L61.1 476.3L59.7 477.2L58.4 478L57.1 478.6L56.1 479L55.1 479.2L54.4 479.1L53.8 478.9L53.5 478.5Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M53.4 477.5L53.6 475.1L54.1 472.8L55 470.6L56.3 468.6L57.8 466.8L59.6 465.3L61.6 464L63.8 463.1L66.2 462.6L68.5 462.4L70.9 462.6L73.2 463.1L75.4 464L77.4 465.3L79.2 466.8L80.8 468.6L82 470.6L82.9 472.8L83.5 475.1L83.7 477.5L83.5 479.9L82.9 482.2L82 484.4L80.8 486.4L79.2 488.2L77.4 489.8L75.4 491L73.2 491.9L70.9 492.5L68.5 492.7L66.2 492.5L63.8 491.9L61.6 491L59.6 489.8L57.8 488.2L56.3 486.4L55 484.4L54.1 482.2L53.6 479.9Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.chest\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M41.9 428L42 410L42.1 409.5L42.5 406.9L42.6 406.4L43.6 403.7L43.8 403.3L45.2 400.7L45.4 400.2L47.3 397.7L47.6 397.3L47.9 396.9L48.4 396.5L48.9 396.2L49.8 395.4L50.4 395.1L51 394.7L51.6 394.4L52.3 394.1L53 393.8L54.3 393.3L55.1 393L55.8 392.8L56.7 392.5L59.4 391.8L60.1 391.6L60.8 391.5L61.6 391.3L62.4 391.2L63.2 391L64 390.9L64.9 390.8L65.7 390.8L66.6 390.7L67.5 390.7L68.4 390.6L69.3 390.6L70.3 390.6L71.2 390.6L72.1 390.7L73 390.7L74 390.8L74.9 390.9L75.8 390.9L76.7 391.1L77.6 391.2L78.4 391.3L79.3 391.5L80.1 391.7L80.9 391.8L81.7 392L82.4 392.2L83.1 392.5L83.8 392.7L86.5 393.6L87.3 393.9L88 394.2L88.8 394.5L90 395.1L90.7 395.5L91.4 395.8L92 396.2L92.6 396.6L93.1 397L94 397.8L94.4 398.2L94.8 398.6L95.2 399L95.4 399.5L97.1 402.1L97.3 402.6L98.6 405.2L98.7 405.7L99.5 408.4L99.6 408.9L99.8 411.6L99.8 412.1L98.7 430.1L98.6 430.6L97.8 435.9L96.4 441.3L96.2 441.7L92.5 452.3L92.4 452.7L88.4 461.3L88.2 461.7L83.2 470.1L83 470.4L82.8 470.6L82.5 470.8L82.2 471.1L81.9 471.3L81.5 471.5L81.1 471.7L80.7 471.9L80.2 472.1L79.7 472.3L79.2 472.4L78.7 472.6L78.1 472.7L77.5 472.9L76.9 473L76.2 473.1L75.6 473.2L74.9 473.3L74.2 473.4L73.5 473.5L72.8 473.5L72 473.5L71.3 473.6L70.5 473.6L69.8 473.6L69 473.6L68.3 473.5L67.5 473.5L66.8 473.4L66 473.4L65.3 473.3L64.6 473.2L63.8 473.1L63.1 473L62.5 472.9L61.8 472.7L61.1 472.6L60.5 472.4L59.9 472.2L59.3 472.1L58.7 471.9L58.2 471.7L57.7 471.5L57.2 471.3L56.8 471L56.4 470.8L56 470.6L55.6 470.3L55.3 470.1L55.1 469.9L54.8 469.6L54.6 469.4L54.4 469.1L50 460.3L49.9 459.9L46.5 451L46.4 450.6L43.4 439.8L42.4 434.4L42.3 433.9L41.9 428.5Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M83.3 469.9L83.1 470.2L82.8 470.5L82.5 470.8L82.1 471.1L81.7 471.4L81.2 471.7L80.6 471.9L80 472.2L79.3 472.4L78.6 472.6L77.9 472.8L77.1 473L76.2 473.1L75.4 473.2L74.5 473.4L73.6 473.4L72.6 473.5L71.7 473.6L70.7 473.6L69.7 473.6L68.7 473.6L67.8 473.5L66.8 473.4L65.8 473.4L64.9 473.2L63.9 473.1L63 473L62.1 472.8L61.3 472.6L60.4 472.4L60 470L59.8 467.5L60 465.1L60.5 462.7L61.4 460.3L62.6 457.9L62.6 457.9L62.6 457.8L62.6 457.7L62.6 457.7L62.6 457.5L62.5 457.1L62.4 456.3L62.4 454.6L62.4 454.4L62.4 454.4L62.4 454.4L62.4 454.3L62.4 453.9L62.4 453.1L62.6 451.5L63.5 448.3L65.1 445.2L67.3 442L68.7 440.3L69.4 439.5L69.6 439.3L69.6 439.2L69.7 439.2L69.8 439.1L70.2 438.6L70.2 438.6L70.4 435.7L70.7 432.7L71.1 429.8L71.4 426.8L71.8 423.8L72.2 420.9L72.2 420.9L76.7 419L80.7 416.8L84.2 414.3L87.1 411.7L89.3 408.9L90.9 405.9L90.9 405.9L91.8 405.5L92.7 404.9L94.4 403.6L95.2 402.6L95.5 402.1L95.7 401.6L95.8 401L95.7 400.5L95.6 400L95.4 399.4L95.1 398.9L94.6 398.4L93.6 397.4L91.5 396.2L90.7 395.8L90.8 395.8L95.7 400.1L96.9 401.8L97.8 403.6L98.6 405.4L99.2 407.2L99.5 409L99.6 410.8L99.8 412.2L99.7 415.2L99.5 418.2L99.3 421.2L99.1 424.2L98.9 427.2L98.7 430.2L98.5 430.8L98.5 431.3L98.5 431.4L98.5 431.5L98.5 431.5L98.5 431.7L98.3 432.6L98.1 434.4L97.3 438L96.3 441.5L95.1 445L94.5 446.8L94.2 447.7L94 448.1L94 448.2L94 448.3L94 448.3L93.9 448.6L93.2 450.3L92.9 451.2L92.7 451.7L92.7 451.9L92.6 451.9L92.6 452L92.6 452.1L92.3 452.7L91.2 455.6L89.9 458.5L88.4 461.4L86.8 464.2L85.1 467.1ZM94.6 398.4L95.1 398.9L95.4 399.4L95.6 400L95.7 400.5L95.8 401L95.7 401.6L95.5 402.1L95.2 402.6L95.7 400.5L95.7 400.5Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M60.4 472.4L59.6 472.2L58.9 471.9L58.2 471.7L57.5 471.4L56.9 471.1L56.4 470.8L55.9 470.5L55.5 470.2L55.1 469.9L54.1 467.5L53.5 465.2L53.3 462.9L53.4 460.7L54.1 458.5L55.1 456.3L55.1 456.3L55.1 456.2L55.1 456.2L55.1 456.1L55 455.9L54.9 455.5L54.8 454.6L54.5 453L54.5 452.8L54.5 452.8L54.5 452.7L54.5 452.6L54.5 452.2L54.4 451.4L54.5 449.8L55.1 446.8L56.5 443.9L58.7 440.9L60 439.4L60.8 438.7L61 438.5L61 438.4L61.1 438.4L61.2 438.3L61.6 437.9L61.6 437.9L61.8 435L62.1 432L62.4 429.1L62.7 426.2L63.1 423.2L63.5 420.3L63.5 420.3L68 418.8L72 417.1L75.4 415.1L78.3 412.9L80.6 410.5L82.3 408.1L82.3 408.1L83.1 407.9L84.4 407.7L85.6 407.4L86.8 407.2L87.9 406.9L89 406.6L90 406.2L91 405.9L91.8 405.5L90.9 405.9L90.9 405.9L89.3 408.9L87.1 411.7L84.2 414.3L80.7 416.8L76.7 419L72.2 420.9L72.2 420.9L71.8 423.8L71.4 426.8L71.1 429.8L70.7 432.7L70.4 435.7L70.2 438.6L70.2 438.6L69.8 439.1L69.7 439.2L69.6 439.2L69.6 439.3L69.4 439.5L68.7 440.3L67.3 442L65.1 445.2L63.5 448.3L62.6 451.5L62.4 453.1L62.4 453.9L62.4 454.3L62.4 454.4L62.4 454.4L62.4 454.4L62.4 454.6L62.4 456.3L62.5 457.1L62.6 457.5L62.6 457.7L62.6 457.7L62.6 457.8L62.6 457.9L62.6 457.9L61.4 460.3L60.5 462.7L60 465.1L59.8 467.5L60 470ZM91.8 405.5L91 405.9L90 406.2L89 406.6L87.9 406.9L86.8 407.2L85.6 407.4L84.4 407.7L83.1 407.9L83.9 407.7L85.2 407.5L86.5 407.2L87.7 406.9L88.9 406.6L90 406.2L91 405.8L91.9 405.4L92.7 404.9ZM90.7 395.8L91.5 396.2L91.2 396L91.2 396ZM90.7 395.7L90.7 395.7L91.5 396.1L92.3 396.5L93 397L93.6 397.4L94.1 397.9L94.6 398.4L93.6 397.4L91.5 396.2L90.7 395.8ZM92.7 404.9L91.9 405.4L91 405.8L90 406.2L88.9 406.6L87.7 406.9L86.5 407.2L85.2 407.5L83.9 407.7L85.4 407.3L86.2 407.1L87.4 406.8L88.5 406.5L89.6 406.2L90.6 405.8L91.5 405.4L92.4 405L93.1 404.5L93.8 404.1L94.3 403.6L94.8 403.1L95.2 402.6L94.4 403.6ZM90.6 395.6L91.6 396.1L92.4 396.6L93.2 397.1L93.9 397.6L94.5 398.2L94.9 398.7L95.3 399.3L95.5 399.8L95.7 400.4L95.7 400.9L95.7 401.5L95.5 402L95.2 402.6L94.8 403.1L94.3 403.6L93.7 404.1L93 404.5L92.2 405L91.3 405.4L90.3 405.8L89.2 406.2L88.1 406.6L86.9 406.9L94.6 398.4L94.1 397.9L93.6 397.4L93 397L92.3 396.5L91.5 396.1L90.7 395.7ZM95.2 402.6L94.8 403.1L94.3 403.6L93.8 404.1L93.1 404.5L92.4 405L91.5 405.4L90.6 405.8L89.6 406.2L88.5 406.5L87.4 406.8L86.2 407.1L91.9 405.1L91.9 405.1ZM90.6 395.6L91.6 396.1L92.4 396.6L93.2 397.1L93.9 397.6L94.5 398.2L94.9 398.7L95.3 399.3L95.5 399.8L95.7 400.4L95.7 400.9L95.7 401.5L95.5 402L95.2 402.6L94.8 403.1L94.3 403.6L93.7 404.1L93 404.5L92.2 405L91.3 405.4L90.3 405.8L89.2 406.2L88.1 406.6L86.9 406.9L88.3 406.4L90.8 405.3L91.4 405L92 404.6L93.1 403.8L94.9 401.3L95.1 400.7L95.1 400.2L95 399.7L94.9 399.1L94.6 398.6L92 396.3L90.7 395.6L90.4 395.4L90.4 395.5L90.6 395.6ZM94.6 398.6L94.9 399.1L95 399.7L95.1 400.2L95.1 400.7L94.9 401.3L95 399.9L95 399.9Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M55.1 469.9L54.8 469.6L54.6 469.4L54.5 469.1L54.3 468.9L52.8 465.9L51.3 462.9L49.9 460L48.6 457L47.5 454L46.6 451.1L46.4 450.6L46.3 450.4L46.3 450.3L46.3 450.2L46.2 450L46.1 449.5L45.8 448.6L45.3 446.8L45.3 446.6L45.2 446.6L45.2 446.6L45.2 446.6L45.2 446.4L45.1 445.9L45.1 444.8L45.5 442.6L46.8 440.5L49 438.2L50.4 437L51.1 436.4L51.3 436.3L51.4 436.2L51.4 436.2L51.5 436.1L51.9 435.8L51.9 435.8L52.1 432.9L52.4 430L52.6 427.1L53 424.2L53.3 421.3L53.8 418.4L53.8 418.4L58.3 417.6L62.2 416.3L65.6 414.7L68.4 412.8L70.7 410.8L72.5 408.6L72.5 408.6L73.2 408.6L73.8 408.5L75.1 408.4L75.7 408.4L76.3 408.3L77.4 408.1L79.4 407.8L79.8 407.7L81.2 407.5L82.6 407.4L83.9 407.2L85.1 406.9L86.3 406.7L87.5 406.4L88.6 406L89.6 405.7L90.5 405.3L91.4 405L90.8 405.3L88.3 406.4L86.9 406.9L86.2 407.1L85.4 407.3L83.9 407.7L83.1 407.9L82.3 408.1L82.3 408.1L80.6 410.5L78.3 412.9L75.4 415.1L72 417.1L68 418.8L63.5 420.3L63.5 420.3L63.1 423.2L62.7 426.2L62.4 429.1L62.1 432L61.8 435L61.6 437.9L61.6 437.9L61.2 438.3L61.1 438.4L61 438.4L61 438.5L60.8 438.7L60 439.4L58.7 440.9L56.5 443.9L55.1 446.8L54.5 449.8L54.4 451.4L54.5 452.2L54.5 452.6L54.5 452.7L54.5 452.8L54.5 452.8L54.5 453L54.8 454.6L54.9 455.5L55 455.9L55.1 456.1L55.1 456.2L55.1 456.2L55.1 456.3L55.1 456.3L54.1 458.5L53.4 460.7L53.3 462.9L53.5 465.2L54.1 467.5ZM91.4 405L90.5 405.3L89.6 405.7L88.6 406L87.5 406.4L86.3 406.7L85.1 406.9L83.9 407.2L82.6 407.4L81.2 407.5L79.8 407.7L80.3 407.6L81.7 407.4L83.1 407.2L84.4 407L85.7 406.7L86.9 406.5L88.1 406.1L89.2 405.8L90.2 405.4L91.1 405L92 404.6ZM90.4 395.4L90.7 395.6L90.6 395.5L90.6 395.5ZM90.3 395.3L90.2 395.2L91 395.7L91.8 396.1L92.6 396.6L93.2 397.1L93.7 397.6L94.2 398.1L94.6 398.6L92 396.3L90.7 395.6L90.4 395.4ZM92 404.6L91.1 405L90.2 405.4L89.2 405.8L88.1 406.1L86.9 406.5L85.7 406.7L84.4 407L83.1 407.2L81.7 407.4L80.3 407.6L81.1 407.4L82.7 407L84.1 406.7L85.4 406.5L86.7 406.2L87.9 405.8L89 405.5L90 405.1L91 404.7L91.8 404.3L92.6 403.8L93.3 403.3L93.9 402.8L94.3 402.3L94.7 401.8L94.9 401.3L93.1 403.8ZM90.1 395.2L91.1 395.7L91.9 396.2L92.7 396.7L93.3 397.2L93.9 397.7L94.3 398.3L94.7 398.8L94.9 399.4L95 399.9L95.1 400.5L95 401L94.8 401.6L94.4 402.1L94 402.6L93.5 403.1L92.8 403.6L92.1 404L91.3 404.5L90.3 404.9L89.3 405.3L88.2 405.7L87 406L85.8 406.3L84.4 406.6L83.1 406.8L94.6 398.6L94.2 398.1L93.7 397.6L93.2 397.1L92.6 396.6L91.8 396.1L91 395.7L90.2 395.2ZM94.9 401.3L94.7 401.8L94.3 402.3L93.9 402.8L93.3 403.3L92.6 403.8L91.8 404.3L91 404.7L90 405.1L89 405.5L87.9 405.8L86.7 406.2L85.4 406.5L84.1 406.7L82.7 407L90.9 404.6L90.9 404.6ZM90.1 395.2L91.1 395.7L91.9 396.2L92.7 396.7L93.3 397.2L93.9 397.7L94.3 398.3L94.7 398.8L94.9 399.4L95 399.9L95.1 400.5L95 401L94.8 401.6L94.4 402.1L94 402.6L93.5 403.1L92.8 403.6L92.1 404L91.3 404.5L90.3 404.9L89.3 405.3L88.2 405.7L87 406L85.8 406.3L84.4 406.6L83.1 406.8L83.4 406.7L84.1 406.5L86.3 405.5L89.1 403.4L89.5 402.9L89.5 402.8L89.6 402.7L89.7 402.4L89.9 401.6L89.3 400.4L87.5 399.9L88 399.6L88.4 399.2L88.8 398.8L89.1 398.4L89.3 398L89.4 397.6L89.4 397.2L89.3 396.8L89.2 396.4L89 395.9L88.7 395.5L88.3 395.1L87.8 394.7L87.3 394.3L86.7 394L88.5 394.8L89 394.8L88.6 394.5L88.5 394.4L88.4 394.4L88.5 394.4L88.7 394.5L89.6 394.9L90 395.1L90.1 395.2Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M46.4 450.5L46.4 450.5L46.4 450.4L46.4 450.6ZM46.3 450.4L46.3 450.3L46.3 450.3L46.3 450.3L46.4 450.4L46.4 450.6ZM46.3 450.2L46.3 450.2L46.3 450.3L46.3 450.3ZM45.2 446.6L45.2 446.6L45.3 446.6L45.3 446.6ZM45.2 446.6L45.2 446.6L45.2 446.5L45.2 446.4L45.1 445.9L44.8 445L44.3 443.2L43.4 439.6L42.7 436L42.1 432.4L42 430.6L42 429.7L41.9 429.5L42 429.6L42.1 429.8L42.2 430.1L42.7 430.5L42.7 430.5L42.9 427.8L43.1 425.1L43.4 422.3L43.7 419.6L44.1 416.9L44.6 414.2L44.6 414.2L49.3 414.9L53.2 414.4L56.5 413.2L59.3 411.6L61.6 409.9L63.5 407.9L63.5 407.9L64 407.9L64.5 408L65.5 408L66 408L66.4 408L67.2 408L68.7 407.9L69 407.8L69.3 407.8L69.9 407.7L71 407.6L71.2 407.5L71.4 407.5L71.9 407.4L73.4 406.9L75.3 405.9L75.5 405.6L75.6 405.6L77 405.5L78.4 405.4L79.7 405.3L81.1 405.1L82.3 404.9L83.5 404.7L84.7 404.4L85.8 404.2L86.9 403.9L87.8 403.5L88.7 403.2L89.5 402.8L89.5 402.9L89.1 403.4L86.3 405.5L84.1 406.5L83.4 406.7L83.1 406.8L82.7 407L81.1 407.4L80.3 407.6L79.8 407.7L79.4 407.8L77.4 408.1L76.3 408.3L75.7 408.4L75.1 408.4L73.8 408.5L73.2 408.6L72.5 408.6L72.5 408.6L70.7 410.8L68.4 412.8L65.6 414.7L62.2 416.3L58.3 417.6L53.8 418.4L53.8 418.4L53.3 421.3L53 424.2L52.6 427.1L52.4 430L52.1 432.9L51.9 435.8L51.9 435.8L51.5 436.1L51.4 436.2L51.4 436.2L51.3 436.3L51.1 436.4L50.4 437L49 438.2L46.8 440.5L45.5 442.6L45.1 444.8L45.1 445.9L45.2 446.4L45.2 446.6L45.2 446.6ZM89.5 402.8L88.7 403.2L87.8 403.5L86.9 403.9L85.8 404.2L84.7 404.4L83.5 404.7L82.3 404.9L81.1 405.1L79.7 405.3L78.4 405.4L77 405.5L75.6 405.6L75.7 405.5L77.1 405.4L78.5 405.3L79.8 405.2L81.1 405L82.4 404.8L83.6 404.6L84.8 404.4L85.9 404.1L86.9 403.8L87.9 403.4L88.8 403.1L89.6 402.7ZM88.5 394.4L88.5 394.4L88.5 394.4L88.4 394.4ZM88.4 394.4L88.5 394.4L88.6 394.5L89 394.8L88.5 394.8L86.7 394L86.2 393.7L85.7 393.4L86.7 393.8L87.7 394.1L88.3 394.3ZM89.6 402.7L88.8 403.1L87.9 403.4L86.9 403.8L85.9 404.1L84.8 404.4L83.6 404.6L82.4 404.8L81.1 405L79.8 405.2L78.5 405.3L77.1 405.4L75.7 405.5L75.8 405.4L76.1 404.8L76.1 403.8L75.5 402.7L76.6 402.7L77.8 402.6L78.9 402.5L80 402.3L81 402.1L82 401.9L83 401.7L83.9 401.5L84.7 401.2L85.5 400.9L86.2 400.6L86.9 400.3L87.5 399.9L89.3 400.4L89.9 401.6L89.7 402.4Z\"/><path class=\"iso-top\" d=\"M42 429.6L42 429.6L41.9 429.4L42 429.6ZM42 429.6L41.9 429.4L41.9 429.4L41.9 429.3L41.9 428.8L41.9 428.1L41.8 425.1L41.8 422.1L41.8 419.1L41.9 416.1L41.9 413.1L42 410.1L42.3 408.8L42.5 407L43 405.2L43.7 403.5L44.6 401.7L45.7 400L46.9 398.3L52.2 394.5L52.2 394.4L52.2 394.4L52.3 394.3L52.3 394.3L52.3 394.3L52.4 394.2L52.5 394.1L52.6 394.1L52.6 394.1L52.7 394L52.8 393.9L52.9 393.9L52.9 393.8L53 393.8L53.4 393.6L54.3 393.3L54.5 393.2L54.6 393.2L54.7 393.2L54.8 393.1L55.3 393L56.4 392.7L57.5 392.4L56.7 392.7L56.1 393L55.5 393.4L55 393.7L54.5 394.1L54.1 394.5L53.8 394.9L53.6 395.3L53.5 395.6L53.4 396.1L53.5 396.5L53.6 396.9L53.8 397.3L54 397.7L54.4 398.1L54.8 398.5L55.3 398.9L55.8 399.2L56.5 399.6L57.2 400L58 400.3L58.8 400.6L59.7 400.9L60.6 401.2L61.6 401.5L62.6 401.7L63.7 401.9L64.8 402.1L65.9 402.3L67.1 402.4L68.3 402.6L69.5 402.7L70.7 402.7L71.9 402.8L73.1 402.8L74.3 402.8L75.5 402.7L76.1 403.8L76.1 404.8L75.8 405.4L75.7 405.5L75.6 405.6L75.5 405.6L75.3 405.9L73.4 406.9L71.9 407.4L71.4 407.5L71.2 407.5L71 407.6L69.9 407.7L69.3 407.8L69 407.8L68.7 407.9L67.2 408L66.4 408L66 408L65.5 408L64.5 408L64 407.9L63.5 407.9L63.5 407.9L61.6 409.9L59.3 411.6L56.5 413.2L53.2 414.4L49.3 414.9L44.6 414.2L44.6 414.2L44.1 416.9L43.7 419.6L43.4 422.3L43.1 425.1L42.9 427.8L42.7 430.5L42.7 430.5L42.2 430.1L42.1 429.8ZM59.4 391.8L60.8 391.5L62.4 391.2L64 390.9L65.7 390.8L67.5 390.7L69.3 390.6L71.2 390.6L73 390.7L74.9 390.9L76.7 391.1L78.4 391.3L80.1 391.7L81.7 392L83.1 392.5L84.5 392.9L85.7 393.4L86.7 394L87.6 394.6L88.3 395.2L88.9 395.8L89.2 396.4L89.4 397L89.4 397.7L89.2 398.3L88.8 398.9L88.2 399.4L87.4 400L86.5 400.5L85.4 401L84.1 401.4L82.8 401.8L81.3 402.1L79.7 402.4L78 402.6L76.2 402.7L74.4 402.8L72.6 402.8L70.7 402.7L68.9 402.6L67.1 402.4L65.3 402.2L63.6 401.9L62 401.6L60.4 401.2L59 400.7L57.8 400.2L56.6 399.7L55.6 399.1L54.8 398.5L54.2 397.9L53.8 397.3L53.5 396.7L53.4 396L53.6 395.4L53.9 394.8L54.4 394.2L55 393.7L55.9 393.1L56.9 392.7L58.1 392.2L59.4 391.8L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7L71.4 396.7Z\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M41.9 428L42 410L42.1 409.5L42.5 406.9L42.6 406.4L43.6 403.7L43.8 403.3L45.2 400.7L45.4 400.2L47.3 397.7L47.6 397.3L47.9 396.9L48.4 396.5L48.9 396.2L49.8 395.4L50.4 395.1L51 394.7L51.6 394.4L52.3 394.1L53 393.8L54.3 393.3L55.1 393L55.8 392.8L56.7 392.5L59.4 391.8L60.1 391.6L60.8 391.5L61.6 391.3L62.4 391.2L63.2 391L64 390.9L64.9 390.8L65.7 390.8L66.6 390.7L67.5 390.7L68.4 390.6L69.3 390.6L70.3 390.6L71.2 390.6L72.1 390.7L73 390.7L74 390.8L74.9 390.9L75.8 390.9L76.7 391.1L77.6 391.2L78.4 391.3L79.3 391.5L80.1 391.7L80.9 391.8L81.7 392L82.4 392.2L83.1 392.5L83.8 392.7L86.5 393.6L87.3 393.9L88 394.2L88.8 394.5L90 395.1L90.7 395.5L91.4 395.8L92 396.2L92.6 396.6L93.1 397L94 397.8L94.4 398.2L94.8 398.6L95.2 399L95.4 399.5L97.1 402.1L97.3 402.6L98.6 405.2L98.7 405.7L99.5 408.4L99.6 408.9L99.8 411.6L99.8 412.1L98.7 430.1L98.6 430.6L97.8 435.9L96.4 441.3L96.2 441.7L92.5 452.3L92.4 452.7L88.4 461.3L88.2 461.7L83.2 470.1L83 470.4L82.8 470.6L82.5 470.8L82.2 471.1L81.9 471.3L81.5 471.5L81.1 471.7L80.7 471.9L80.2 472.1L79.7 472.3L79.2 472.4L78.7 472.6L78.1 472.7L77.5 472.9L76.9 473L76.2 473.1L75.6 473.2L74.9 473.3L74.2 473.4L73.5 473.5L72.8 473.5L72 473.5L71.3 473.6L70.5 473.6L69.8 473.6L69 473.6L68.3 473.5L67.5 473.5L66.8 473.4L66 473.4L65.3 473.3L64.6 473.2L63.8 473.1L63.1 473L62.5 472.9L61.8 472.7L61.1 472.6L60.5 472.4L59.9 472.2L59.3 472.1L58.7 471.9L58.2 471.7L57.7 471.5L57.2 471.3L56.8 471L56.4 470.8L56 470.6L55.6 470.3L55.3 470.1L55.1 469.9L54.8 469.6L54.6 469.4L54.4 469.1L50 460.3L49.9 459.9L46.5 451L46.4 450.6L43.4 439.8L42.4 434.4L42.3 433.9L41.9 428.5Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.yoke\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M35.4 397L35.4 396.1L35.5 395.3L35.7 394.4L35.9 393.6L36.2 392.7L36.5 391.9L36.9 391.2L37.4 390.5L37.8 389.8L38.3 389.2L38.9 388.7L39.4 388.2L40.6 387.4L41.3 387L42 386.7L43.4 386.3L44.1 386.1L44.8 386L45.5 386L52.9 386.9L60.2 388.3L74.4 392.2L75.3 392.4L89.1 397.4L95.9 400.4L96.6 400.8L103.1 404.2L103.7 404.7L104.2 405.2L105.1 406.4L105.5 407L105.8 407.7L106.4 409.1L106.6 409.8L106.8 410.5L106.9 411.2L106.9 412L106.9 412.9L106.8 413.7L106.6 414.6L106.4 415.4L106.1 416.2L105.7 417.1L105.4 417.8L104.9 418.5L104.5 419.2L103.9 419.8L103.4 420.3L102.9 420.7L101.7 421.5L101 422L100.3 422.3L98.9 422.7L98.2 422.9L97.5 423L96.8 422.9L89.4 422L82.1 420.7L67.9 416.8L67 416.6L53.1 411.6L46.4 408.6L45.7 408.2L39.2 404.7L38.6 404.3L38.1 403.8L37.2 402.6L36.8 402L36.5 401.3L35.9 399.9L35.7 399.2L35.5 398.5L35.4 397.8Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M39.7 405L39.1 404.7L38.6 404.3L38.1 403.8L37.7 403.2L38.6 404.3L38.6 404.3ZM39.7 405L39.1 404.7L38.6 404.3L38.1 403.8L37.7 403.2L41.8 405.2L46 407.1L50.3 408.8L54.8 410.4L59.3 411.9L63.9 413.3L63.9 413.3L68.6 414.7L73.3 415.9L73.9 416L74.2 416.1L74.4 416.1L74.5 416.2L74.5 416.2L75.7 416.5L78.2 417L83.1 418L88.2 418.8L93.4 419.5L93.7 420.4L94.2 421.2L94.7 421.8L95.3 422.3L95.9 422.7L96.6 422.9L91.7 422.4L86.8 421.6L82 420.6L79.6 420.1L78.4 419.8L78.3 419.8L78.2 419.8L78.1 419.7L77.8 419.7L77.2 419.5L72.4 418.2L67.7 416.8L66.9 416.5L62.2 415L57.6 413.4L53 411.5L48.5 409.6L44.1 407.4ZM99.5 422.5L98.7 422.8L98 423L97.2 423L96.5 422.9L95.8 422.6L95.2 422.3L94.6 421.7L94.1 421.1L93.7 420.4L93.4 419.5L93.4 419.5L93.7 420.4L94.2 421.2L94.7 421.8L95.3 422.3L95.9 422.7L96.6 422.9ZM104.6 405.9L104.6 405.9L104.7 406L104.6 405.8ZM104.6 405.8L104.7 406L104.9 406.1L105 406.2L105 406.2L105 406.3L105.3 406.6L105.4 406.8L105.4 406.8L105.4 406.9L105.5 407.1L105.7 407.6L105.9 408.1L106 408.4L106.1 408.5L106.1 408.5L106.1 408.6L105.8 408.1L105.4 407.7L105 407.3L104.9 407.2L104.9 407.1L104.7 407L104.5 406.6L104.2 406L104.1 405.5L104.1 405.3L104.1 405.3L104.1 405.3L104.1 405.2L104.3 405.3L104.4 405.3L104.4 405.4L104.5 405.5ZM99.5 422.5L98.7 422.8L98 423L97.2 423L96.5 422.9L95.8 422.6L95.2 422.3L94.6 421.7L94.1 421.1L93.7 420.4L93.4 419.5L93.5 418.9L93.6 418.6L93.6 418.5L93.7 418.3L94.2 417.3L94.3 417.1L94.4 417.1L94.5 417L94.9 416.7L95.6 416.4L96.4 416.5L96.8 416.7L97 416.8L97.1 416.8L97.2 416.9L97.2 417.7L97.4 418.5L97.6 419.3L98 419.9L98.3 420.4L98.8 420.9L99.2 421.2L99.8 421.4L100.3 421.5L100.9 421.5L101.6 421.4L102.2 421.2L102.1 421.2L102.1 421.2L102 421.3L101.7 421.4L101.3 421.7L100.8 422L100.6 422.2L100.6 422.2L100.5 422.2L100.4 422.3L100 422.4L99.9 422.5L99.8 422.5L99.7 422.5ZM97.1 416.4L97.2 415L97.5 413.5L98 412.1L98.6 410.8L99.3 409.6L100.2 408.5L101.1 407.7L102 407.2L103 406.9L103.9 406.9L104.7 407.2L105.5 407.7L106.1 408.5L106.5 409.5L106.8 410.7L106.9 412L106.8 413.4L106.5 414.9L106.1 416.3L105.5 417.6L104.7 418.8L103.9 419.9L103 420.7L102 421.2L101.1 421.5L100.2 421.5L99.3 421.3L98.6 420.7L98 419.9L97.5 418.9L97.2 417.7L97.1 416.4L102 414.2L102 414.2L102 414.2L102 414.2L102 414.2L102 414.2L102 414.2L102 414.2L102 414.2L102 414.2L102 414.2L102 414.2L102 414.2L102 414.2L102 414.2L102 414.2L102 414.2L102 414.2L102 414.2L102 414.2L102 414.2L102 414.2L102 414.2L102 414.2L102 414.2L102 414.2L102 414.2L102 414.2L102 414.2L102 414.2L102 414.2L102 414.2L102 414.2Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M37 402.4L37 402.4L37 402.4L37 402.4ZM37 402.4L37 402.4L37 402.4L37 402.3L37 401.6L37 401.6L41.1 403.4L45.3 405.1L49.6 406.8L54 408.3L58.6 409.7L63.2 411.1L63.2 411.1L67.9 412.4L72.7 413.6L73.3 413.8L73.6 413.9L73.7 413.9L73.8 413.9L73.9 413.9L75.1 414.2L77.6 414.8L82.6 415.8L87.7 416.7L93 417.6L93.1 418.6L93.4 419.5L88.2 418.8L83.1 418L78.2 417L75.7 416.5L74.5 416.2L74.5 416.2L74.4 416.1L74.2 416.1L73.9 416L73.3 415.9L68.6 414.7L63.9 413.3L63.9 413.3L59.3 411.9L54.8 410.4L50.3 408.8L46 407.1L41.8 405.2L37.7 403.2L37.6 403L37.2 402.7L37.1 402.5ZM93.4 419.5L93.1 418.6L93 417.6L93 417.6L93.1 418.6L93.4 419.5ZM104.1 405.2L104.1 405.2L104.6 405.8L104.1 405.2L103.6 404.6ZM103.6 404.6L104.1 405.2L104.6 405.8L104.5 405.5L104.4 405.4L104.4 405.3L104.3 405.3L104.1 405.2L104.1 405.3L104.1 405.3L104.1 405.3L104.1 405.5L104.2 406L104.5 406.6L104.7 407L104.9 407.1L104.9 407.2L105 407.3L104.6 407.1L104.1 406.9L103.6 406.8L103.4 406.8L103.3 406.7L103.1 406.6L102.7 406.3L102.2 405.7L102.2 405L102.3 404.8L102.3 404.7L102.4 404.6L102.5 404.5L103 404.3L103.1 404.3L103.2 404.3L103.3 404.4ZM93.4 419.5L93.1 418.6L93 417.6L93.2 416.8L93.3 416.3L93.4 416.1L93.5 415.9L94.3 414.5L94.5 414.2L94.6 414.1L94.7 414L95.2 413.6L96 413.3L96.7 413.6L97 414L97.2 414.2L97.2 414.3L97.3 414.5L97.2 415.3L97.1 416.1L97.2 416.9L97.1 416.8L97 416.8L96.8 416.7L96.4 416.5L95.6 416.4L94.9 416.7L94.5 417L94.4 417.1L94.3 417.1L94.2 417.3L93.7 418.3L93.6 418.5L93.6 418.6L93.5 418.9Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M36.2 400.4L35.9 400L35.8 399.5L35.6 399L35.8 399.5L36 400L36.1 400.3L36.3 400.4L36.3 400.4L36.3 400.4L36.3 400.3L36.4 400.2L36.6 399.3L36.6 399.3L40.7 401L44.9 402.5L49.2 403.9L53.7 405.3L58.3 406.7L62.9 408L62.9 408L67.7 409.3L72.5 410.6L73.1 410.7L73.4 410.8L73.5 410.8L73.6 410.9L73.6 411.9L73.7 412.9L73.8 413.9L73.7 413.9L73.6 413.9L73.3 413.8L72.7 413.6L67.9 412.4L63.2 411.1L63.2 411.1L58.6 409.7L54 408.3L49.6 406.8L45.3 405.1L41.1 403.4L37 401.6L37 401.6L37 402.3L37 402.4L37 402.4L37 402.4L37 402.3L36.7 401.9L36.6 401.4L36.4 400.9ZM73.8 413.9L73.7 412.9L73.6 411.9L73.6 410.9L73.7 410.9L73.7 411.9L73.8 413L73.9 413.9ZM85.8 396.1L85.8 396.1L85.8 396L85.8 396ZM85.8 396.1L85.8 396.1L87 396.5L89.3 397.4L93.8 399.4L98.2 401.6L102.6 404L103.6 404.6L103.3 404.4L103.2 404.3L103.1 404.3L103 404.3L102.5 404.5L102.4 404.6L102.3 404.7L101.7 404.7L101 404.8L100.4 405.1L99.7 405.4L99.1 405.9L98.4 406.4L98.8 406L99.3 405.4L100.9 404.1L101.1 404L101.2 403.9L101.5 403.8L102.1 403.8L102.1 403.8L97.8 401.5L93.5 399.3L89.2 397.4L86.9 396.5ZM73.9 413.9L73.8 413L73.7 411.9L73.7 410.9L74.9 411.2L77.4 411.7L82.4 412.8L87.6 413.9L93 414.9L93 414.9L93.4 413.7L93.7 413.1L93.8 412.8L94 412.5L95.7 409.8L96.3 409L96.7 408.5L96.2 409.3L95.8 410.2L95.4 411.2L95.1 412.1L94.8 413.1L94.6 414.1L94.5 414.2L94.3 414.5L93.5 415.9L93.4 416.1L93.3 416.3L93.2 416.8L93 417.6L93 417.6L87.7 416.7L82.6 415.8L77.6 414.8L75.1 414.2ZM94.7 414L95 412.9L95.3 411.8L95.7 410.7L96.2 409.7L96.7 408.7L97.3 407.8L98 407L98.7 406.3L99.4 405.8L100.1 405.3L100.8 405L101.6 404.8L102.3 404.8L102.3 404.7L101.7 404.7L101 404.8L100.4 405.1L99.7 405.4L99.1 405.9L98.4 406.4ZM94.6 414.1L94.8 413.1L95.1 412.1L95.4 411.2L95.8 410.2L96.2 409.3L96.7 408.5L95.5 411.2L95.5 411.2ZM94.7 414L95 412.9L95.3 411.8L95.7 410.7L96.2 409.7L96.7 408.7L97.3 407.8L98 407L98.7 406.3L99.4 405.8L100.1 405.3L100.8 405L101.6 404.8L102.3 404.8L102.2 405L102.2 405.7L102.7 406.3L103.1 406.6L103.3 406.7L103.4 406.8L102.9 406.8L102.3 407L101.7 407.3L101.1 407.6L100.5 408.1L99.9 408.7L99.4 409.3L98.9 410L98.4 410.8L98.1 411.7L97.7 412.5L97.4 413.4L97.2 414.3L97.2 414.2L97 414L96.7 413.6L96 413.3L95.2 413.6ZM97.2 414.3L97.4 413.4L97.7 412.5L98.1 411.7L98.4 410.8L98.9 410L99.4 409.3L99.9 408.7L100.5 408.1L101.1 407.6L101.7 407.3L102.3 407L102.9 406.8L103.4 406.8L103.6 406.8L103 406.9L102.4 407L101.8 407.3L101.2 407.7L100.6 408.1L100 408.7ZM97.3 414.5L97.5 413.5L97.8 412.6L98.1 411.8L98.5 410.9L98.9 410.1L99.4 409.4L98 411.7L98 411.7Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M35.6 399L35.5 398.3L35.4 397.7L35.4 397L35.6 397.3L35.7 397.7L35.8 397.9L36 398L36 398L36.1 397.9L36.1 397.9L36.3 397.7L36.7 396.8L36.6 397.7L36.6 398.5L36.6 399.3L36.4 400.2L36.3 400.3L36.3 400.4L36.3 400.4L36.3 400.4L36.1 400.3L36 400L35.8 399.5ZM36.6 399.3L36.6 398.5L36.6 397.7L36.7 396.8L36.7 396.8L36.6 397.7L36.6 398.5L36.6 399.3ZM45.6 386.1L45.6 386.1L45.6 386.1L45.5 386ZM45.5 386L45.6 386.1L50.6 386.6L55.5 387.4L60.3 388.3L65.1 389.5L69.8 390.8L74.6 392.2L75.4 392.4L80.1 394L84.7 395.6L85.3 395.9L85.5 396L85.7 396L85.8 396L85.8 396.1L86.9 396.5L89.2 397.4L93.5 399.3L97.8 401.5L102.1 403.8L102.1 403.8L101.5 403.8L101.2 403.9L100.5 404L99.8 404.3L99.1 404.6L98.4 405L97.8 405.6L98.8 404.6L100 403.9L100 403.9L95.7 401.4L91.4 399.2L87 397.1L84.8 396.2L83.6 395.7L83.6 395.7L83.5 395.7L83.4 395.6L83.1 395.5L82.5 395.3L78 393.6L73.5 392.1L73.5 392.1L68.9 390.7L64.3 389.4L59.7 388.3L55 387.3L50.3 386.6ZM36.6 399.3L36.6 398.5L36.6 397.7L36.7 396.8L40.8 398.1L45.1 399.4L49.5 400.7L54 402L58.6 403.2L63.3 404.5L63.3 404.5L68.1 405.8L72.9 407L73.5 407.2L73.8 407.2L74 407.3L74.1 407.3L74.2 407.3L75.4 407.6L77.9 408.2L83 409.4L88.2 410.5L93.6 411.7L93.6 411.7L94.7 409.7L95.7 408.2L95.1 409.1L94.7 410L94.3 411L93.9 412.1L93.7 413.1L93.4 413.7L93 414.9L93 414.9L87.6 413.9L82.4 412.8L77.4 411.7L74.9 411.2L73.7 410.9L73.6 410.9L73.5 410.8L73.4 410.8L73.1 410.7L72.5 410.6L67.7 409.3L62.9 408L62.9 408L58.3 406.7L53.7 405.3L49.2 403.9L44.9 402.5L40.7 401ZM93.8 412.8L94.2 411.6L94.6 410.4L95.1 409.3L95.7 408.2L96.4 407.2L97.1 406.4L97.8 405.6L98.6 405L99.4 404.5L100.2 404.2L101.1 404L101.2 403.9L100.5 404L99.8 404.3L99.1 404.6L98.4 405L97.8 405.6ZM93.7 413.1L93.9 412.1L94.3 411L94.7 410L95.1 409.1L95.7 408.2L94.5 410.6L94.5 410.6ZM93.8 412.8L94.2 411.6L94.6 410.4L95.1 409.3L95.7 408.2L96.4 407.2L97.1 406.4L97.8 405.6L98.6 405L99.4 404.5L100.2 404.2L101.1 404L100.9 404.1L99.3 405.4L98.8 406L98.4 406.4L97.8 407L97.3 407.7L96.7 408.5L96.3 409L95.7 409.8L94 412.5ZM96.7 408.5L97.3 407.7L97.8 407L98.4 406.4L97.6 407.4L97.6 407.4ZM99.6 409L99.6 409L100 408.7L99.7 409L99.4 409.4Z\"/><path class=\"iso-top\" d=\"M35.4 397L35.4 396.1L35.6 395.1L35.7 394.2L36 393.2L36.4 392.3L36.8 391.5L37.2 390.7L37.7 389.9L38.3 389.2L38.9 388.7L39.5 388.2L40.1 387.8L40.6 387.6L41 387.3L41.4 387L41.9 386.7L41.9 386.7L42 386.7L42.1 386.6L42.3 386.6L42.8 386.5L45.5 386L50.3 386.6L55 387.3L59.7 388.3L64.3 389.4L68.9 390.7L73.5 392.1L73.5 392.1L78 393.6L82.5 395.3L83.1 395.5L83.4 395.6L83.5 395.7L83.6 395.7L83.6 395.7L84.8 396.2L87 397.1L91.4 399.2L95.7 401.4L100 403.9L100 403.9L98.8 404.6L97.8 405.6L97 406.3L96.3 407.2L95.7 408.2L94.7 409.7L93.6 411.7L93.6 411.7L88.2 410.5L83 409.4L77.9 408.2L75.4 407.6L74.2 407.3L74.1 407.3L74 407.3L73.8 407.2L73.5 407.2L72.9 407L68.1 405.8L63.3 404.5L63.3 404.5L58.6 403.2L54 402L49.5 400.7L45.1 399.4L40.8 398.1L36.7 396.8L36.7 396.8L36.3 397.7L36.1 397.9L36.1 397.9L36 398L36 398L35.8 397.9L35.7 397.7L35.6 397.3ZM95.7 408.2L96.3 407.2L97 406.3L97.8 405.6L96.7 406.8L96.7 406.8Z\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M35.4 397L35.4 396.1L35.5 395.3L35.7 394.4L35.9 393.6L36.2 392.7L36.5 391.9L36.9 391.2L37.4 390.5L37.8 389.8L38.3 389.2L38.9 388.7L39.4 388.2L40.6 387.4L41.3 387L42 386.7L43.4 386.3L44.1 386.1L44.8 386L45.5 386L52.9 386.9L60.2 388.3L74.4 392.2L75.3 392.4L89.1 397.4L95.9 400.4L96.6 400.8L103.1 404.2L103.7 404.7L104.2 405.2L105.1 406.4L105.5 407L105.8 407.7L106.4 409.1L106.6 409.8L106.8 410.5L106.9 411.2L106.9 412L106.9 412.9L106.8 413.7L106.6 414.6L106.4 415.4L106.1 416.2L105.7 417.1L105.4 417.8L104.9 418.5L104.5 419.2L103.9 419.8L103.4 420.3L102.9 420.7L101.7 421.5L101 422L100.3 422.3L98.9 422.7L98.2 422.9L97.5 423L96.8 422.9L89.4 422L82.1 420.7L67.9 416.8L67 416.6L53.1 411.6L46.4 408.6L45.7 408.2L39.2 404.7L38.6 404.3L38.1 403.8L37.2 402.6L36.8 402L36.5 401.3L35.9 399.9L35.7 399.2L35.5 398.5L35.4 397.8Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.neck\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M63.6 391.3L63.6 391.2L63.6 391.1L63.6 391L63.6 390.8L63.7 390.7L63.7 390.6L63.7 390.5L63.7 390.4L63.7 390.3L63.8 390.2L63.8 390.1L63.8 390L63.8 389.9L63.8 389.8L63.8 389.7L63.9 389.6L63.9 389.5L63.9 389.4L63.9 389.3L63.9 389.2L64 389L64 388.9L64 388.8L64 388.7L64 388.6L64 388.5L64.1 388.4L64.1 388.3L64.1 388.2L64.1 388.1L64.1 388L64.2 387.9L64.2 387.8L64.2 387.7L64.2 387.6L64.2 387.5L64.3 387.4L64.3 387.2L64.3 387.1L64.3 387L64.3 386.9L64.3 386.8L64.4 386.7L64.4 386.6L64.4 386.5L64.4 386.4L64.4 386.3L64.4 386.3L64.4 386.3L64.4 386.2L64.4 386.1L64.4 386L64.4 385.9L64.4 385.7L64.4 385.6L64.4 385.5L64.4 385.4L64.4 385.3L64.4 385.2L64.4 385.1L64.4 385L64.4 384.9L64.3 384.8L64.3 384.7L64.3 384.6L64.3 384.5L64.3 384.4L64.3 384.3L64.3 384.1L64.3 384L64.3 383.9L64.3 383.9L64.3 383.9L64.3 383.8L64.2 383.7L64.2 383.5L64.2 383.4L64.2 383.3L64.1 383.2L64.1 383.1L64.1 383L64.1 382.9L64 382.8L64 382.7L64 382.6L64 382.5L63.9 382.4L63.9 382.3L63.9 382.2L63.9 382.1L63.8 381.9L63.8 381.8L63.8 381.7L63.8 381.6L63.7 381.5L63.7 381.4L63.7 381.4L63.7 381.2L63.7 381.1L63.7 380.9L63.8 380.7L63.9 380.5L64.1 380.3L64.3 380.2L64.5 380L64.7 379.9L65 379.7L65.3 379.6L65.6 379.4L66 379.3L66.4 379.2L66.8 379.1L67.2 379L67.7 378.9L68.2 378.9L68.6 378.8L69.2 378.7L69.7 378.7L70.2 378.7L70.7 378.7L71.3 378.6L71.8 378.7L72.3 378.7L72.9 378.7L73.4 378.7L73.9 378.8L74.5 378.9L75 378.9L75.5 379L75.9 379.1L76.4 379.2L76.9 379.4L77.3 379.5L77.7 379.6L78.1 379.8L78.4 379.9L78.7 380.1L79 380.2L79.3 380.4L79.5 380.6L79.7 380.7L79.9 380.9L80 381.1L80.1 381.3L80.2 381.5L80.2 381.6L80.2 381.8L80.2 382L80.2 382L80.2 382.1L80.1 382.2L80.1 382.3L80.1 382.4L80 382.5L80 382.6L80 382.7L79.9 382.8L79.9 382.9L79.9 383.1L79.8 383.2L79.8 383.3L79.8 383.4L79.7 383.5L79.7 383.6L79.7 383.7L79.6 383.8L79.6 383.9L79.6 384L79.6 384.1L79.5 384.2L79.5 384.3L79.5 384.4L79.4 384.4L79.4 384.5L79.4 384.6L79.4 384.7L79.4 384.8L79.4 384.9L79.4 385L79.4 385.1L79.3 385.2L79.3 385.3L79.3 385.4L79.3 385.5L79.3 385.6L79.3 385.7L79.3 385.9L79.2 386L79.2 386.1L79.2 386.2L79.2 386.3L79.2 386.4L79.2 386.5L79.2 386.6L79.1 386.7L79.1 386.8L79.1 386.8L79.1 386.8L79.1 386.9L79.1 387L79.2 387.1L79.2 387.2L79.2 387.4L79.2 387.5L79.2 387.6L79.2 387.7L79.2 387.8L79.2 387.9L79.2 388L79.3 388.1L79.3 388.2L79.3 388.3L79.3 388.4L79.3 388.5L79.3 388.6L79.3 388.7L79.3 388.9L79.3 389L79.4 389.1L79.4 389.2L79.4 389.3L79.4 389.4L79.4 389.5L79.4 389.6L79.4 389.7L79.4 389.8L79.4 389.9L79.5 390L79.5 390.1L79.5 390.2L79.5 390.3L79.5 390.5L79.5 390.6L79.5 390.7L79.5 390.8L79.5 390.9L79.6 391L79.6 391.1L79.6 391.2L79.6 391.3L79.6 391.4L79.6 391.5L79.6 391.6L79.6 391.7L79.6 391.8L79.6 391.8L79.6 392L79.6 392.2L79.5 392.4L79.4 392.5L79.3 392.7L79.1 392.9L79 393L78.7 393.2L78.5 393.3L78.2 393.5L77.9 393.6L77.5 393.7L77.2 393.8L76.8 393.9L76.4 394L75.9 394.1L75.5 394.2L75 394.2L74.6 394.3L74.1 394.3L73.6 394.4L73.1 394.4L72.5 394.4L72 394.4L71.5 394.4L71 394.4L70.5 394.3L70 394.3L69.4 394.2L68.9 394.2L68.5 394.1L68 394L67.5 393.9L67.1 393.8L66.7 393.7L66.3 393.5L65.9 393.4L65.5 393.3L65.2 393.1L64.9 393L64.6 392.8L64.4 392.7L64.2 392.5L64 392.3L63.8 392.1L63.7 392L63.6 391.8L63.6 391.6L63.6 391.4L63.6 391.3Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M79.6 391.8L79.6 392.2L79.5 392.5L79.2 392.8L78.8 393.1L78.3 393.4L77.7 393.6L77 393.9L76.2 394L75.4 394.2L74.5 394.3L74 393.4L73.5 392.5L73.1 391.7L72.7 390.8L72.4 389.9L72.1 389.1L72.1 389.1L71.9 388.6L71.7 388.4L71.7 388.3L71.7 388.2L71.6 388.2L71.2 387.3L70.7 386.5L70.2 385.7L69.8 384.8L69.5 384.4L69.5 384.4L69.5 384.3L69.4 384.2L69.3 384L70.3 384.1L71.4 384.2L72.5 384.3L73.6 384.2L74.6 384.2L75.6 384.1L76.5 383.9L77.4 383.7L78.2 383.5L78.8 383.2L79.4 382.9L79.8 382.6L80.1 382.3L80.2 381.9L80.1 382.1L80.1 382.2L80.1 382.3L80.1 382.3L79.9 382.8L79.7 383.6L79.4 384.4L79.3 385.3L79.2 386.1L79.2 386.2L79.1 386.2L79.1 386.3L79.1 386.6L79.1 387L79.1 386.7L79.1 387.6L79.1 388.4L79.2 389.3L79.3 390.1L79.4 391Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M74.5 394.3L73.7 394.4L72.9 394.4L72 394.4L71.6 393.5L71.2 392.5L70.8 391.6L70.5 390.7L70.2 389.8L69.9 388.9L69.9 388.9L69.6 388.4L69.5 388.2L69.5 388.1L69.4 388L69.4 388L68.9 387.1L68.3 386.2L67.8 385.3L67.2 384.3L66.9 383.9L66.9 383.8L66.8 383.8L66.8 383.6L66.6 383.4L67.4 383.7L68.3 383.9L69.3 384L69.4 384.2L69.5 384.3L69.5 384.4L69.5 384.4L69.8 384.8L70.2 385.7L70.7 386.5L71.2 387.3L71.6 388.2L71.7 388.2L71.7 388.3L71.7 388.4L71.9 388.6L72.1 389.1L72.1 389.1L72.4 389.9L72.7 390.8L73.1 391.7L73.5 392.5L74 393.4Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M72 394.4L71.1 394.4L70.1 394.3L69.2 394.2L68.9 393.2L68.6 392.2L68.3 391.3L68 390.3L67.7 389.4L67.4 388.4L67.4 388.4L67.2 387.9L67 387.7L67 387.5L66.9 387.5L66.9 387.4L66.3 386.4L65.7 385.3L65 384.2L64.3 382.8L63.8 381.8L63.8 381.7L63.8 381.7L63.8 381.5L63.7 381.3L63.8 381.7L64 382L64.3 382.3L64.8 382.6L65.3 382.9L65.9 383.2L66.6 383.4L66.8 383.6L66.8 383.8L66.9 383.8L66.9 383.9L67.2 384.3L67.8 385.3L68.3 386.2L68.9 387.1L69.4 388L69.4 388L69.5 388.1L69.5 388.2L69.6 388.4L69.9 388.9L69.9 388.9L70.2 389.8L70.5 390.7L70.8 391.6L71.2 392.5L71.6 393.5Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M69.2 394.2L68.3 394.1L67.5 393.9L66.7 393.7L66.4 392.6L66.2 391.6L65.9 390.6L65.7 389.5L65.4 388.5L65.1 387.4L65.1 387.4L64.8 386.7L64.6 386.2L64.5 386L64.5 385.8L64.5 385.6L64.4 384.8L64.3 383.9L64.1 383L63.9 382.2L63.8 381.8L63.8 381.8L64.3 382.8L65 384.2L65.7 385.3L66.3 386.4L66.9 387.4L66.9 387.5L67 387.5L67 387.7L67.2 387.9L67.4 388.4L67.4 388.4L67.7 389.4L68 390.3L68.3 391.3L68.6 392.2L68.9 393.2ZM63.8 381.7L63.8 381.7L63.8 381.8L63.8 381.8Z\"/><path class=\"iso-top\" d=\"M66.7 393.7L65.9 393.4L65.3 393.2L64.7 392.9L64.3 392.6L63.9 392.3L63.7 391.9L63.6 391.6L63.6 391.3L63.8 390.4L64 389.6L64.2 388.7L64.3 387.9L64.4 387L64.5 386.2L64.5 386.5L64.5 386L64.5 385.8L64.5 385.7L64.5 385.7L64.5 385.8L64.5 386L64.6 386.2L64.8 386.7L65.1 387.4L65.1 387.4L65.4 388.5L65.7 389.5L65.9 390.6L66.2 391.6L66.4 392.6ZM64.5 385.8L64.5 385.7L64.5 385.7L64.5 385.7ZM66.4 379.2L67.7 378.9L69.2 378.7L70.8 378.7L72.4 378.7L74 378.8L75.5 379L76.9 379.4L78.1 379.8L79.1 380.3L79.8 380.8L80.2 381.3L80.2 381.9L80 382.4L79.4 382.9L78.6 383.3L77.5 383.7L76.2 384L74.7 384.2L73.2 384.3L71.5 384.2L69.9 384.1L68.4 383.9L67 383.5L65.8 383.1L64.8 382.7L64.2 382.1L63.8 381.6L63.7 381L63.9 380.5L64.5 380L65.3 379.6L66.4 379.2L72 381.5L72 381.5L72 381.5L72 381.5L72 381.5L72 381.5L72 381.5L72 381.5L72 381.5L72 381.5L72 381.5L72 381.5L72 381.5L72 381.5L72 381.5L72 381.5L72 381.5L72 381.5L72 381.5L72 381.5L72 381.5L72 381.5L72 381.5L72 381.5L72 381.5L72 381.5L72 381.5L72 381.5L72 381.5L72 381.5L72 381.5L72 381.5L72 381.5Z\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M63.6 391.3L63.6 391.2L63.6 391.1L63.6 391L63.6 390.8L63.7 390.7L63.7 390.6L63.7 390.5L63.7 390.4L63.7 390.3L63.8 390.2L63.8 390.1L63.8 390L63.8 389.9L63.8 389.8L63.8 389.7L63.9 389.6L63.9 389.5L63.9 389.4L63.9 389.3L63.9 389.2L64 389L64 388.9L64 388.8L64 388.7L64 388.6L64 388.5L64.1 388.4L64.1 388.3L64.1 388.2L64.1 388.1L64.1 388L64.2 387.9L64.2 387.8L64.2 387.7L64.2 387.6L64.2 387.5L64.3 387.4L64.3 387.2L64.3 387.1L64.3 387L64.3 386.9L64.3 386.8L64.4 386.7L64.4 386.6L64.4 386.5L64.4 386.4L64.4 386.3L64.4 386.3L64.4 386.3L64.4 386.2L64.4 386.1L64.4 386L64.4 385.9L64.4 385.7L64.4 385.6L64.4 385.5L64.4 385.4L64.4 385.3L64.4 385.2L64.4 385.1L64.4 385L64.4 384.9L64.3 384.8L64.3 384.7L64.3 384.6L64.3 384.5L64.3 384.4L64.3 384.3L64.3 384.1L64.3 384L64.3 383.9L64.3 383.9L64.3 383.9L64.3 383.8L64.2 383.7L64.2 383.5L64.2 383.4L64.2 383.3L64.1 383.2L64.1 383.1L64.1 383L64.1 382.9L64 382.8L64 382.7L64 382.6L64 382.5L63.9 382.4L63.9 382.3L63.9 382.2L63.9 382.1L63.8 381.9L63.8 381.8L63.8 381.7L63.8 381.6L63.7 381.5L63.7 381.4M79.6 391.8L79.6 391.7L79.6 391.6L79.6 391.5L79.6 391.4L79.6 391.3L79.6 391.2L79.6 391.1L79.6 391L79.5 390.9L79.5 390.8L79.5 390.7L79.5 390.6L79.5 390.5L79.5 390.3L79.5 390.2L79.5 390.1L79.5 390L79.4 389.9L79.4 389.8L79.4 389.7L79.4 389.6L79.4 389.5L79.4 389.4L79.4 389.3L79.4 389.2L79.4 389.1L79.3 389L79.3 388.9L79.3 388.7L79.3 388.6L79.3 388.5L79.3 388.4L79.3 388.3L79.3 388.2L79.3 388.1L79.2 388L79.2 387.9L79.2 387.8L79.2 387.7L79.2 387.6L79.2 387.5L79.2 387.4L79.2 387.2L79.2 387.1L79.1 387L79.1 386.9L79.1 386.8L79.1 386.8L79.1 386.8L79.1 386.7L79.2 386.6L79.2 386.5L79.2 386.4L79.2 386.3L79.2 386.2L79.2 386.1L79.2 386L79.3 385.9L79.3 385.7L79.3 385.6L79.3 385.5L79.3 385.4L79.3 385.3L79.3 385.2L79.4 385.1L79.4 385L79.4 384.9L79.4 384.8L79.4 384.7L79.4 384.6L79.4 384.5L79.4 384.4L79.5 384.4L79.5 384.3L79.5 384.2L79.6 384.1L79.6 384L79.6 383.9L79.6 383.8L79.7 383.7L79.7 383.6L79.7 383.5L79.8 383.4L79.8 383.3L79.8 383.2L79.9 383.1L79.9 382.9L79.9 382.8L80 382.7L80 382.6L80 382.5L80.1 382.4L80.1 382.3L80.1 382.2L80.2 382.1L80.2 382M63.7 381.4L63.7 381.2L63.7 381.1L63.7 380.9L63.8 380.7L63.9 380.5L64.1 380.3L64.3 380.2L64.5 380L64.7 379.9L65 379.7L65.3 379.6L65.6 379.4L66 379.3L66.4 379.2L66.8 379.1L67.2 379L67.7 378.9L68.2 378.9L68.6 378.8L69.2 378.7L69.7 378.7L70.2 378.7L70.7 378.7L71.3 378.6L71.8 378.7L72.3 378.7L72.9 378.7L73.4 378.7L73.9 378.8L74.5 378.9L75 378.9L75.5 379L75.9 379.1L76.4 379.2L76.9 379.4L77.3 379.5L77.7 379.6L78.1 379.8L78.4 379.9L78.7 380.1L79 380.2L79.3 380.4L79.5 380.6L79.7 380.7L79.9 380.9L80 381.1L80.1 381.3L80.2 381.5L80.2 381.6L80.2 381.8L80.2 382M79.6 391.8L79.6 392L79.6 392.2L79.5 392.4L79.4 392.5L79.3 392.7L79.1 392.9L79 393L78.7 393.2L78.5 393.3L78.2 393.5L77.9 393.6L77.5 393.7L77.2 393.8L76.8 393.9L76.4 394L75.9 394.1L75.5 394.2L75 394.2L74.6 394.3L74.1 394.3L73.6 394.4L73.1 394.4L72.5 394.4L72 394.4L71.5 394.4L71 394.4L70.5 394.3L70 394.3L69.4 394.2L68.9 394.2L68.5 394.1L68 394L67.5 393.9L67.1 393.8L66.7 393.7L66.3 393.5L65.9 393.4L65.5 393.3L65.2 393.1L64.9 393L64.6 392.8L64.4 392.7L64.2 392.5L64 392.3L63.8 392.1L63.7 392L63.6 391.8L63.6 391.6L63.6 391.4L63.6 391.3\"/></g></g><g class=\"mq-joint\" data-name=\"as.neckball\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M62.4 391.7L62.5 390.2L62.8 388.8L63.4 387.5L64.1 386.3L65.1 385.2L66.2 384.2L67.4 383.5L68.7 382.9L70.2 382.6L71.6 382.4L73 382.6L74.5 382.9L75.8 383.5L77 384.2L78.1 385.2L79.1 386.3L79.8 387.5L80.4 388.8L80.7 390.2L80.8 391.7L80.7 393.1L80.4 394.5L79.8 395.9L79.1 397.1L78.1 398.2L77 399.2L75.8 399.9L74.5 400.5L73 400.8L71.6 400.9L70.2 400.8L68.7 400.5L67.4 399.9L66.2 399.2L65.1 398.2L64.1 397.1L63.4 395.9L62.8 394.5L62.5 393.1Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M62.4 391.7L62.5 390.2L62.8 388.8L63.4 387.5L64.1 386.3L65.1 385.2L66.2 384.2L67.4 383.5L68.7 382.9L70.2 382.6L71.6 382.4L73 382.6L74.5 382.9L75.8 383.5L77 384.2L78.1 385.2L79.1 386.3L79.8 387.5L80.4 388.8L80.7 390.2L80.8 391.7L80.7 393.1L80.4 394.5L79.8 395.9L79.1 397.1L78.1 398.2L77 399.2L75.8 399.9L74.5 400.5L73 400.8L71.6 400.9L70.2 400.8L68.7 400.5L67.4 399.9L66.2 399.2L65.1 398.2L64.1 397.1L63.4 395.9L62.8 394.5L62.5 393.1Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M62.4 391.7L62.5 390.2L62.8 388.8L63.4 387.5L64.1 386.3L65.1 385.2L66.2 384.2L67.4 383.5L68.7 382.9L70.2 382.6L71.6 382.4L73 382.6L74.5 382.9L75.8 383.5L77 384.2L77.3 384.5L77.4 385L77.3 385.6L77 386.3L76.6 387.1L76 388L75.3 389L74.5 390L73.6 390.9L72.6 391.9L71.5 392.9L70.4 393.8L69.3 394.6L68.3 395.3L67.3 395.8L66.3 396.3L65.5 396.6L64.8 396.7L64.2 396.7L63.8 396.5L63.4 395.9L62.8 394.5L62.5 393.1Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M62.4 391.7L62.5 390.2L62.8 388.8L63.4 387.5L64.1 386.3L65.1 385.2L66.2 384.2L67.4 383.5L68.7 382.9L70.2 382.6L71.6 382.4L73 382.6L74.5 382.9L75.2 383.2L75.5 383.5L75.6 383.9L75.5 384.5L75.2 385.2L74.9 385.9L74.3 386.7L73.7 387.6L72.9 388.5L72 389.5L71.1 390.4L70.1 391.2L69.1 392.1L68.1 392.8L67.1 393.4L66.2 394L65.3 394.4L64.6 394.7L63.9 394.8L63.4 394.8L63 394.6L62.8 394.3L62.5 393.1Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M62.4 391.7L62.5 390.2L62.8 388.8L63.4 387.5L64.1 386.3L65.1 385.2L66.2 384.2L67.4 383.5L68.7 382.9L70.2 382.6L71.6 382.4L72.9 382.5L73.2 382.7L73.4 382.9L73.5 383.3L73.4 383.8L73.2 384.4L72.9 385L72.4 385.7L71.9 386.5L71.2 387.3L70.5 388.1L69.7 388.9L68.8 389.6L67.9 390.3L67.1 391L66.2 391.5L65.4 392L64.7 392.3L64 392.6L63.4 392.7L63 392.7L62.6 392.5L62.4 392.3Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M62.4 391.7L62.5 390.2L62.8 388.8L63.4 387.5L64.1 386.3L65.1 385.2L66.2 384.2L67.4 383.5L68.7 382.9L70.2 382.6L71.6 382.4L73 382.6L74.5 382.9L75.8 383.5L77 384.2L78.1 385.2L79.1 386.3L79.8 387.5L80.4 388.8L80.7 390.2L80.8 391.7L80.7 393.1L80.4 394.5L79.8 395.9L79.1 397.1L78.1 398.2L77 399.2L75.8 399.9L74.5 400.5L73 400.8L71.6 400.9L70.2 400.8L68.7 400.5L67.4 399.9L66.2 399.2L65.1 398.2L64.1 397.1L63.4 395.9L62.8 394.5L62.5 393.1Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.head\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M50.5 358L50.9 353.7L51 353.1L52 348.9L52.1 348.4L53.8 344.2L54.1 343.8L56.7 339.7L57 339.3L58.7 337.4L59 337.1L59.4 336.7L61.7 335L62 334.7L62.4 334.5L62.9 334.2L63.4 334L64 333.8L65.4 333.2L65.9 333.1L66.4 332.9L67 332.8L67.6 332.7L68.2 332.6L68.8 332.5L69.9 332.3L70.3 332.3L70.8 332.2L71.3 332.2L71.8 332.2L72.3 332.2L72.8 332.2L73.3 332.2L73.8 332.2L74.2 332.2L74.7 332.3L75.2 332.4L76.2 332.5L76.8 332.6L77.4 332.7L78 332.9L78.6 333L79.1 333.2L79.6 333.3L80.1 333.5L81.6 334.1L82.1 334.4L82.6 334.6L83 334.9L83.4 335.1L83.7 335.4L86 337.2L86.3 337.6L86.6 337.9L88.3 339.9L88.5 340.3L91 344.5L91.2 344.9L92.8 349.2L92.9 349.7L93.8 354L94.1 358.2L94.1 358.8L93.7 363.1L93.6 363.6L92.6 367.8L92.5 368.3L90.8 372.5L90.5 373L87.9 377L87.6 377.4L85.9 379.3L85.6 379.7L85.2 380L82.9 381.8L82.6 382L82.2 382.3L81.7 382.5L81.2 382.7L80.6 382.9L79.2 383.5L78.7 383.7L78.2 383.8L77.6 383.9L77 384.1L76.4 384.2L75.8 384.3L74.7 384.4L74.3 384.5L73.8 384.5L73.3 384.5L72.8 384.6L72.3 384.6L71.8 384.6L71.3 384.6L70.8 384.5L70.4 384.5L69.9 384.4L69.4 384.4L68.4 384.2L67.8 384.1L67.2 384L66.6 383.9L66 383.7L65.5 383.6L65 383.4L64.5 383.2L63 382.6L62.5 382.4L62 382.1L61.6 381.9L61.2 381.6L60.9 381.3L58.6 379.5L58.3 379.2L58 378.8L56.3 376.8L56.1 376.4L53.6 372.3L53.4 371.8L51.8 367.6L51.7 367.1L50.8 362.8L50.5 358.5Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M83.2 381.5L82.8 381.9L82.3 382.2L81.7 382.5L81 382.8L80.3 383.1L79.4 383.3L78.6 383.5L77.6 383.7L76.7 383.9L75.6 384L74.6 384.1L73.5 384.1L72.5 384.2L71.4 384.1L70.3 384.1L69.2 384L68.2 383.9L67.2 383.7L66.2 383.5L65.3 383.3L64.4 383.1L63.6 382.8L62.9 382.5L62.2 382.2L61.6 381.9L61.1 381.5L60.7 381.2L71.9 384.1L71.9 384.1ZM83.2 381.5L82.8 381.9L82.3 382.2L81.7 382.5L81 382.8L80.3 383.1L79.4 383.3L78.6 383.5L77.6 383.7L76.7 383.9L75.6 384L74.6 384.1L73.5 384.1L72.5 384.2L71.4 384.1L70.3 384.1L69.2 384L68.2 383.9L67.2 383.7L66.2 383.5L65.3 383.3L64.4 383.1L63.6 382.8L62.9 382.5L62.2 382.2L61.6 381.9L61.1 381.5L60.7 381.2L59.8 380.6L59.1 379.9L58.4 379.3L58.3 379.2L58.2 379.1L58.1 379L58.2 379.1L58.6 379.3L59.1 379.3L58.9 378.8L58.9 378.8L59.4 378.6L59.9 378.4L60.5 378.1L60.9 377.9L60.9 377.9L61 377.8L61 377.8L61.2 377.7L61.9 377.4L62.6 377L62.6 377L63 376.5L63.4 376L63.9 375.5L64.6 375L65.4 374.5L65.8 374.2L65.9 374.1L66 374.1L66 374.1L66.3 373.9L66.3 373.9L66.4 373.3L66.7 372.7L67.3 372.1L68 371.5L69 370.9L70.1 370.3L70.1 370.3L70.2 369.6L70.4 369L70.8 368.3L71.3 367.6L71.6 367.3L71.7 367.2L71.8 367.1L71.9 366.9L72.7 366.2L72.7 366.2L73.5 365.5L74.1 364.8L74.6 364L75 363.3L75.2 362.5L75.3 361.8L75.3 361.8L76.4 361L77.4 360.1L78.1 359.3L78.6 358.5L79 357.7L79.1 356.9L79.1 356.9L79.9 356L80.7 355L81.3 354.1L81.8 353.2L82.3 352.3L82.6 351.4L82.6 351.4L83.3 350.3L83.9 349.3L84.6 348.2L85.1 347L85.6 345.9L86 344.6L86 344.6L85.8 343.7L86.2 342.3L86.6 341.3L86.7 341.2L86.7 341L86.8 340.7L87.1 339.5L87.1 339.1L87 338.8L86.7 338L86.6 337.8L86.5 337.7L86.5 337.7L86.8 338.1L87.3 338.7L87.8 339.4L88.4 340.1L88.9 340.8L89.4 341.5L89.8 342.2L90.2 342.9L90.6 343.6L90.9 344.3L91.2 344.8L91.5 345.5L91.8 346.2L92.1 346.9L92.3 347.6L92.6 348.3L92.8 349L92.9 349.5L93.1 350.2L93.3 350.9L93.4 351.6L93.6 352.3L93.7 353.1L93.8 353.8L93.8 354.2L93.9 354.9L94 355.6L94 356.3L94.1 357.1L94.1 357.8L94.1 358.5L94.1 358.9L94.1 359.6L94 359.8L94 359.9L94 360L94 360.3L93.9 361L93.9 361.7L93.8 362.5L93.7 363.2L93.6 363.6L93.5 364.3L93.4 365L93.2 365.7L93 366.4L92.8 367.1L92.6 367.8L92.5 368.3L92.4 368.5L92.4 368.5L92.4 368.5L92.4 368.6L92.3 369L92 369.7L91.7 370.4L91.4 371.1L91.1 371.8L90.8 372.5L90.5 373L90.1 373.7L89.7 374.4L89.6 374.5L89.6 374.6L89.6 374.6L89.5 374.7L89.3 375L88.9 375.7L88.4 376.4L87.9 377L87.2 377.8L86.7 378.4L86.2 379.1L85.9 379.4L85.8 379.4L85.8 379.5L85.7 379.5L85.6 379.7L84.9 380.3L84.1 380.9ZM87 338.8L87.1 339.1L87.1 339.5L87 339.1L87 339.1Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M58.2 379.1L58.2 379.1L58.1 379L58.2 379.1ZM58.2 379.1L58.1 379L57.8 378.7L57.3 378L56.8 377.4L56.2 376.6L55.7 375.9L55.2 375.2L54.8 374.5L54.6 374.2L54.5 374.1L54.5 374.1L54.5 374.1L54.7 374.3L55.4 374.6L56.2 374.7L56.2 374.7L56.4 374.3L56.8 374L57.4 373.7L58 373.3L58.8 373L59.2 372.8L59.3 372.8L59.4 372.8L59.4 372.7L59.7 372.7L59.7 372.7L59.8 372L60 371.5L60.6 371L61.3 370.5L62.3 370.1L63.5 369.6L63.5 369.6L63.5 368.9L63.7 368.3L64.1 367.6L64.6 367L64.9 366.7L65 366.6L65 366.6L65.2 366.4L66 365.8L66 365.8L66.8 365.2L67.4 364.5L67.9 363.8L68.3 363.1L68.5 362.4L68.6 361.6L68.6 361.6L69.8 361L70.7 360.2L71.5 359.5L72 358.7L72.4 358L72.6 357.2L72.6 357.2L73.4 356.4L74.2 355.6L74.9 354.7L75.4 353.9L75.9 353L76.3 352.2L76.3 352.2L77 351.3L77.7 350.4L78.4 349.4L79 348.5L79.5 347.5L80 346.5L80 346.5L80 345.6L80.5 344.5L80.9 343.9L81.9 343.7L82.8 343.4L83.6 343.1L84.4 342.8L85.1 342.5L85.7 342.1L86.2 341.7L86.6 341.3L86.2 342.3L85.8 343.7L86 344.6L86 344.6L85.6 345.9L85.1 347L84.6 348.2L83.9 349.3L83.3 350.3L82.6 351.4L82.6 351.4L82.3 352.3L81.8 353.2L81.3 354.1L80.7 355L79.9 356L79.1 356.9L79.1 356.9L79 357.7L78.6 358.5L78.1 359.3L77.4 360.1L76.4 361L75.3 361.8L75.3 361.8L75.2 362.5L75 363.3L74.6 364L74.1 364.8L73.5 365.5L72.7 366.2L72.7 366.2L71.9 366.9L71.8 367.1L71.7 367.2L71.6 367.3L71.3 367.6L70.8 368.3L70.4 369L70.2 369.6L70.1 370.3L70.1 370.3L69 370.9L68 371.5L67.3 372.1L66.7 372.7L66.4 373.3L66.3 373.9L66.3 373.9L66 374.1L66 374.1L65.9 374.1L65.8 374.2L65.4 374.5L64.6 375L63.9 375.5L63.4 376L63 376.5L62.6 377L62.6 377L61.9 377.4L61.2 377.7L61 377.8L61 377.8L60.9 377.9L60.9 377.9L60.5 378.1L59.9 378.4L59.4 378.6L58.9 378.8L58.9 378.8L59.1 379.3L58.6 379.3ZM86.6 341.3L86.2 341.7L85.7 342.1L85.1 342.5L84.4 342.8L83.6 343.1L82.8 343.4L81.9 343.7L80.9 343.9L81 343.9L81.9 343.6L82.8 343.3L83.7 343L84.5 342.7L85.1 342.3L85.7 342L86.2 341.6L86.7 341.2ZM86.4 337.7L86.5 337.7L86.5 337.8L86.5 337.8ZM86.4 337.7L86.5 337.7L86.6 337.8L86.7 338L87 338.8L86.9 338.3L86.6 337.9L86.2 337.4L86.3 337.6L86.4 337.7ZM86.7 341.2L86.2 341.6L85.7 342L85.1 342.3L84.5 342.7L83.7 343L82.8 343.3L81.9 343.6L81 343.9L81 343.8L81.1 343.6L81.4 343.3L82.4 343L83.3 342.7L84.1 342.4L84.8 342L85.4 341.6L86 341.2L86.4 340.8L86.7 340.4L87 339.9L87.1 339.5L86.8 340.7L86.7 341ZM86.2 337.4L86.5 337.8L86.8 338.3L87 338.8L87 339.2L87 339.7L86.8 340.2L86.5 340.6L86.1 341.1L85.6 341.5L84.9 341.9L84.2 342.3L83.4 342.6L82.5 342.9L81.5 343.2L87 338.8L86.9 338.3L86.6 337.9L86.2 337.4ZM87.1 339.5L87 339.9L86.7 340.4L86.4 340.8L86 341.2L85.4 341.6L84.8 342L84.1 342.4L83.3 342.7L82.4 343L81.4 343.3L85.4 341.6L85.4 341.6ZM86.2 337.4L86.5 337.8L86.8 338.3L87 338.8L87 339.2L87 339.7L86.8 340.2L86.5 340.6L86.1 341.1L85.6 341.5L84.9 341.9L84.2 342.3L83.4 342.6L82.5 342.9L81.5 343.2L81.5 343.2L81.7 343L82 342.6L82.7 341.9L84.1 340L84.4 339.4L84.6 339L84.7 338.8L84.7 338.6L84.9 338L85 337.4L84.9 337L84.8 336.5L84.6 336.1L84.5 336L84.5 335.9L84.6 336L84.8 336.2L85.5 336.8L85.9 337.1L86 337.3L86.1 337.3ZM84.9 337L85 337.4L84.9 337.2L84.9 337.2Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M54.5 374.1L54.5 374.1L54.5 374L54.5 374.1ZM54.5 374.1L54.5 374L54.4 373.8L54 373.2L53.7 372.5L53.4 371.9L53.1 371.2L52.8 370.5L52.5 369.8L52.3 369.1L52 368.4L51.9 368L51.9 368L52 368.1L52 368.2L52.3 368.5L52.3 368.5L52.3 368.1L52.6 367.9L53.1 367.8L53.9 367.7L54.8 367.6L56.1 367.5L56.1 367.5L56.1 366.9L56.3 366.3L56.6 365.7L57.1 365.2L57.4 365L57.5 364.9L57.6 364.9L57.8 364.7L58.6 364.3L58.6 364.3L59.3 363.8L60 363.2L60.5 362.6L60.9 362L61.2 361.3L61.3 360.6L61.3 360.6L62.4 360L63.4 359.5L64.2 358.8L64.7 358.1L65.1 357.4L65.4 356.6L65.4 356.6L66.2 356L67 355.2L67.7 354.5L68.3 353.7L68.9 352.9L69.3 352.1L69.3 352.1L70.1 351.4L70.8 350.5L71.5 349.7L72.1 348.8L72.8 348L73.4 347.1L73.4 347.1L73.5 346.1L74.1 345.2L74.5 344.7L74.6 344.7L74.6 344.6L74.7 344.5L75 344.2L75.1 344.2L75.1 344.1L75.3 344L75.6 343.7L76.2 343.2L77.5 342L77.8 341.7L78 341.6L79 341.4L79.9 341.2L80.8 340.9L81.6 340.7L82.4 340.4L83.1 340.1L83.7 339.7L84.2 339.4L84.6 339L84.4 339.4L84.1 340L82.7 341.9L82 342.6L81.7 343L81.5 343.2L81.5 343.2L81.4 343.3L81.1 343.6L81 343.8L81 343.9L80.9 343.9L80.5 344.5L80 345.6L80 346.5L80 346.5L79.5 347.5L79 348.5L78.4 349.4L77.7 350.4L77 351.3L76.3 352.2L76.3 352.2L75.9 353L75.4 353.9L74.9 354.7L74.2 355.6L73.4 356.4L72.6 357.2L72.6 357.2L72.4 358L72 358.7L71.5 359.5L70.7 360.2L69.8 361L68.6 361.6L68.6 361.6L68.5 362.4L68.3 363.1L67.9 363.8L67.4 364.5L66.8 365.2L66 365.8L66 365.8L65.2 366.4L65 366.6L65 366.6L64.9 366.7L64.6 367L64.1 367.6L63.7 368.3L63.5 368.9L63.5 369.6L63.5 369.6L62.3 370.1L61.3 370.5L60.6 371L60 371.5L59.8 372L59.7 372.7L59.7 372.7L59.4 372.7L59.4 372.8L59.3 372.8L59.2 372.8L58.8 373L58 373.3L57.4 373.7L56.8 374L56.4 374.3L56.2 374.7L56.2 374.7L55.4 374.6L54.7 374.3ZM84.6 339L84.2 339.4L83.7 339.7L83.1 340.1L82.4 340.4L81.6 340.7L80.8 340.9L79.9 341.2L79 341.4L78 341.6L78 341.5L79 341.3L79.8 341.1L80.7 340.9L81.4 340.7L82.2 340.4L82.8 340.1L83.4 339.8L83.9 339.5L84.3 339.1L84.7 338.8ZM84.5 336L84.5 336L84.5 336L84.4 335.9ZM84.4 335.9L84.5 336L84.6 336.1L84.8 336.5L84.9 337L84.9 336.7L84.7 336.4L84.5 336.1L84.2 335.7L84.3 335.8L84.4 335.9ZM84.7 338.8L84.3 339.1L83.9 339.5L83.4 339.8L82.8 340.1L82.2 340.4L81.4 340.7L80.7 340.9L79.8 341.1L79 341.3L78 341.5L78.1 341.4L78.3 341.2L78.4 341.1L79.3 341L80.2 340.7L81 340.5L81.8 340.2L82.5 339.9L83.1 339.6L83.7 339.3L84.1 338.9L84.5 338.5L84.7 338.2L84.9 337.8L85 337.4L84.9 338L84.7 338.6ZM84.1 335.7L84.5 336.1L84.7 336.5L84.9 336.9L84.9 337.3L84.8 337.7L84.7 338L84.4 338.4L84.1 338.8L83.7 339.2L83.1 339.5L82.5 339.8L81.9 340.1L81.1 340.4L80.3 340.7L79.4 340.9L78.4 341.1L84.9 337L84.9 336.7L84.7 336.4L84.5 336.1L84.2 335.7ZM85 337.4L84.9 337.8L84.7 338.2L84.5 338.5L84.1 338.9L83.7 339.3L83.1 339.6L82.5 339.9L81.8 340.2L81 340.5L80.2 340.7L79.3 341L78.4 341.1L83.1 339.6L83.1 339.6ZM84.1 335.7L84.5 336.1L84.7 336.5L84.9 336.9L84.9 337.3L84.8 337.7L84.7 338L84.4 338.4L84.1 338.8L83.7 339.2L83.1 339.5L82.5 339.8L81.9 340.1L81.1 340.4L80.3 340.7L79.4 340.9L78.4 341.1L78.7 340.7L78.7 340.7L81.6 338.5L82.3 337L82.4 336.3L82.4 336L82.4 335.8L82.4 335.5L82.3 335.3L82.2 334.8L81.3 334L78.3 333.2L83.9 335.6ZM82.4 335.5L82.4 335.8L82.4 336L82.3 335.8L82.3 335.8Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M51.9 368L51.9 368L51.9 367.9L52 368.1ZM52 368.1L51.9 367.9L51.9 367.9L51.8 367.7L51.7 367.2L51.5 366.5L51.3 365.8L51.2 365.1L51 364.4L50.9 363.7L50.8 363L50.8 362.5L50.7 361.8L50.6 361.1L50.6 360.4L50.5 359.7L50.5 359.3L50.5 359.2L50.6 359.8L50.8 360.1L51.7 360.6L51.7 360.6L52.5 360.6L53.2 360.4L53.7 360L54.1 359.5L54.4 358.8L54.5 358.2L54.5 358.2L55.7 358L56.6 357.6L57.4 357.1L58 356.5L58.5 355.8L58.8 355.1L58.8 355.1L59.6 354.6L60.4 354L61.2 353.4L61.8 352.7L62.4 352L62.9 351.2L62.9 351.2L63.7 350.5L64.5 349.8L65.2 349.1L65.9 348.3L66.6 347.5L67.2 346.7L67.2 346.7L67.5 345.8L68.2 344.9L68.6 344.5L68.7 344.5L68.8 344.4L68.9 344.3L69.1 344.1L69.2 344L69.3 344L69.4 343.9L69.7 343.7L70.2 343.2L71.4 342.3L71.7 342L71.8 341.9L71.9 341.8L72 341.8L72.1 341.6L72.2 341.6L72.3 341.5L72.5 341.2L73.6 341.2L74.7 341.2L75.8 341.1L76.8 341L77.8 340.9L78.7 340.7L78.4 341.1L78.4 341.1L78.3 341.2L78.1 341.4L78 341.5L78 341.6L77.8 341.7L77.5 342L76.2 343.2L75.6 343.7L75.3 344L75.1 344.1L75.1 344.2L75 344.2L74.7 344.5L74.6 344.6L74.6 344.7L74.5 344.7L74.1 345.2L73.5 346.1L73.4 347.1L73.4 347.1L72.8 348L72.1 348.8L71.5 349.7L70.8 350.5L70.1 351.4L69.3 352.1L69.3 352.1L68.9 352.9L68.3 353.7L67.7 354.5L67 355.2L66.2 356L65.4 356.6L65.4 356.6L65.1 357.4L64.7 358.1L64.2 358.8L63.4 359.5L62.4 360L61.3 360.6L61.3 360.6L61.2 361.3L60.9 362L60.5 362.6L60 363.2L59.3 363.8L58.6 364.3L58.6 364.3L57.8 364.7L57.6 364.9L57.5 364.9L57.4 365L57.1 365.2L56.6 365.7L56.3 366.3L56.1 366.9L56.1 367.5L56.1 367.5L54.8 367.6L53.9 367.7L53.1 367.8L52.6 367.9L52.3 368.1L52.3 368.5L52.3 368.5L52 368.2ZM78.7 340.7L77.8 340.9L76.8 341L75.8 341.1L74.7 341.2L73.6 341.2L72.5 341.2L72.5 341.2L73.6 341.2L74.7 341.2L75.8 341.1L76.8 341L77.8 340.9L78.7 340.7ZM72.1 332.6L73.2 332.6L74.3 332.6L75.3 332.7L76.4 332.8L77.4 333L78.3 333.2L75.3 332.7L75.3 332.7ZM74.2 332.4L74.8 332.3L75 332.3L75 332.3L75.8 332.4L76.6 332.6L77.4 332.7L78.1 332.9L78.8 333.1L79.5 333.3L80 333.5L80.6 333.8L81.1 334.1L81.5 334.3L81.8 334.6L82.1 334.9L82.2 335.2L82.4 335.5L82.3 335.3L82.2 334.8L81.3 334L78.3 333.2L77.4 333L76.4 332.8L75.3 332.7L74.3 332.6L73.2 332.6L72.1 332.6ZM78.7 340.7L77.8 340.9L76.8 341L75.8 341.1L74.7 341.2L73.6 341.2L72.5 341.2L74.6 340L75.2 339.4L75.3 339.2L75.3 339.1L76.2 339.1L77 338.9L77.7 338.8L78.4 338.6L79.1 338.5L79.7 338.2L80.3 338L80.8 337.8L81.2 337.5L81.6 337.2L81.9 336.9L82.1 336.7L82.3 336.3L82.4 336L82.4 336.3L82.3 337L81.6 338.5ZM75 332.3L75.8 332.4L76.7 332.6L77.4 332.7L78.2 332.9L78.9 333.1L79.5 333.3L80.1 333.6L80.6 333.8L81.1 334.1L81.5 334.4L81.8 334.7L82.1 335L82.2 335.3L82.3 335.6L82.3 335.9L82.3 336.2L82.1 336.5L81.9 336.8L81.6 337.1L81.3 337.4L80.8 337.7L80.3 337.9L79.8 338.2L79.2 338.4L78.5 338.6L77.8 338.7L77 338.9L76.2 339L75.4 339.1L82.4 335.5L82.2 335.2L82.1 334.9L81.8 334.6L81.5 334.3L81.1 334.1L80.6 333.8L80 333.5L79.5 333.3L78.8 333.1L78.1 332.9L77.4 332.7L76.6 332.6L75.8 332.4L75 332.3ZM82.4 336L82.3 336.3L82.1 336.7L81.9 336.9L81.6 337.2L81.2 337.5L80.8 337.8L80.3 338L79.7 338.2L79.1 338.5L78.4 338.6L77.7 338.8L77 338.9L76.2 339.1L75.3 339.1L80.2 338L80.2 338ZM75 332.3L75.8 332.4L76.7 332.6L77.4 332.7L78.2 332.9L78.9 333.1L79.5 333.3L80.1 333.6L80.6 333.8L81.1 334.1L81.5 334.4L81.8 334.7L82.1 335L82.2 335.3L82.3 335.6L82.3 335.9L82.3 336.2L82.1 336.5L81.9 336.8L81.6 337.1L81.3 337.4L80.8 337.7L80.3 337.9L79.8 338.2L79.2 338.4L78.5 338.6L77.8 338.7L77 338.9L76.2 339L75.4 339.1L75.4 339L75.6 338.7L75.8 337.2L75.2 335.6L74.2 334.1L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L74.1 332.6L75.1 332.5L75.5 332.4L75.3 332.4L75.1 332.3Z\"/><path class=\"iso-top\" d=\"M50.6 359.5L50.6 359.5L50.5 359.1L50.6 359.8ZM50.6 359.8L50.5 359.1L50.5 359L50.5 358.3L50.5 357.9L50.5 357.1L50.6 356.4L50.6 355.7L50.7 355L50.8 354.3L50.9 353.6L51 353.2L51.1 352.4L51.2 351.7L51.4 351L51.5 350.3L51.7 349.6L52 348.9L52.1 348.5L52.3 347.8L52.6 347.1L52.9 346.4L53.2 345.7L53.5 345L53.8 344.3L54.1 343.7L54.5 343.1L54.8 342.4L55.3 341.7L55.7 341L56.2 340.4L56.7 339.7L57.4 338.9L57.9 338.3L58.4 337.7L58.7 337.3L58.8 337.3L58.8 337.3L58.9 337.2L59 337L59.1 337L59.1 337L59.2 336.9L59.3 336.7L59.7 336.4L60.5 335.8L60.7 335.7L60.8 335.6L60.8 335.6L60.9 335.5L61 335.4L61.1 335.4L61.1 335.4L61.4 335.2L72.1 332.6L74.2 332.4L74.8 332.3L75 332.3L75 332.3L75 332.3L75.1 332.3L75.3 332.4L75.5 332.4L75.1 332.5L74.1 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.6 332.6L72.6 332.6L72.6 332.6L72.6 332.6L72.6 332.6L72.6 332.6L72.6 332.6L72.6 332.6L72.6 332.6L72.6 332.6L72.6 332.6L72.6 332.6L72.6 332.6L72.6 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L74.2 334.1L75.2 335.6L75.8 337.2L75.6 338.7L75.4 339L75.4 339.1L75.3 339.1L75.3 339.2L75.2 339.4L74.6 340L72.5 341.2L72.5 341.2L72.3 341.5L72.2 341.6L72.1 341.6L72 341.8L71.9 341.8L71.8 341.9L71.7 342L71.4 342.3L70.2 343.2L69.7 343.7L69.4 343.9L69.3 344L69.2 344L69.1 344.1L68.9 344.3L68.8 344.4L68.7 344.5L68.6 344.5L68.2 344.9L67.5 345.8L67.2 346.7L67.2 346.7L66.6 347.5L65.9 348.3L65.2 349.1L64.5 349.8L63.7 350.5L62.9 351.2L62.9 351.2L62.4 352L61.8 352.7L61.2 353.4L60.4 354L59.6 354.6L58.8 355.1L58.8 355.1L58.5 355.8L58 356.5L57.4 357.1L56.6 357.6L55.7 358L54.5 358.2L54.5 358.2L54.4 358.8L54.1 359.5L53.7 360L53.2 360.4L52.5 360.6L51.7 360.6L51.7 360.6L50.8 360.1ZM72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.6 332.6L72.6 332.6L72.6 332.6L72.6 332.6L72.6 332.6L72.6 332.6L72.6 332.6L72.6 332.6L72.6 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6L72.7 332.6Z\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M50.5 358L50.9 353.7L51 353.1L52 348.9L52.1 348.4L53.8 344.2L54.1 343.8L56.7 339.7L57 339.3L58.7 337.4L59 337.1L59.4 336.7L61.7 335L62 334.7L62.4 334.5L62.9 334.2L63.4 334L64 333.8L65.4 333.2L65.9 333.1L66.4 332.9L67 332.8L67.6 332.7L68.2 332.6L68.8 332.5L69.9 332.3L70.3 332.3L70.8 332.2L71.3 332.2L71.8 332.2L72.3 332.2L72.8 332.2L73.3 332.2L73.8 332.2L74.2 332.2L74.7 332.3L75.2 332.4L76.2 332.5L76.8 332.6L77.4 332.7L78 332.9L78.6 333L79.1 333.2L79.6 333.3L80.1 333.5L81.6 334.1L82.1 334.4L82.6 334.6L83 334.9L83.4 335.1L83.7 335.4L86 337.2L86.3 337.6L86.6 337.9L88.3 339.9L88.5 340.3L91 344.5L91.2 344.9L92.8 349.2L92.9 349.7L93.8 354L94.1 358.2L94.1 358.8L93.7 363.1L93.6 363.6L92.6 367.8L92.5 368.3L90.8 372.5L90.5 373L87.9 377L87.6 377.4L85.9 379.3L85.6 379.7L85.2 380L82.9 381.8L82.6 382L82.2 382.3L81.7 382.5L81.2 382.7L80.6 382.9L79.2 383.5L78.7 383.7L78.2 383.8L77.6 383.9L77 384.1L76.4 384.2L75.8 384.3L74.7 384.4L74.3 384.5L73.8 384.5L73.3 384.5L72.8 384.6L72.3 384.6L71.8 384.6L71.3 384.6L70.8 384.5L70.4 384.5L69.9 384.4L69.4 384.4L68.4 384.2L67.8 384.1L67.2 384L66.6 383.9L66 383.7L65.5 383.6L65 383.4L64.5 383.2L63 382.6L62.5 382.4L62 382.1L61.6 381.9L61.2 381.6L60.9 381.3L58.6 379.5L58.3 379.2L58 378.8L56.3 376.8L56.1 376.4L53.6 372.3L53.4 371.8L51.8 367.6L51.7 367.1L50.8 362.8L50.5 358.5Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.toeL\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M99 692.7L106.8 691L119.9 695.1L121.7 697.3L119.3 701.1L112.1 704.3L99 700.2Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M112.1 704.3L119.3 701.1L121.7 697.3L119.9 695.1L112.1 696.8Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M99 692.7L99 700.2L112.1 704.3L112.1 696.8Z\"/><path class=\"iso-top\" d=\"M106.8 691L99 692.7L112.1 696.8L119.9 695.1Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M119.9 695.1L112.1 696.8M99 692.7L112.1 696.8M112.1 696.8L112.1 704.3\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M99 692.7L106.8 691L119.9 695.1L121.7 697.3L119.3 701.1L112.1 704.3L99 700.2Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.footL\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M68.5 710L69 703.7L73.6 699.3L81.2 695.5L96.7 691.3L110.5 695.6L112 701.5L111.1 705L83.4 717.4L69.6 713Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M83.4 717.4L111.1 705L112 701.5L110.5 695.6L95 699.8L87.4 703.7L82.8 708L82.3 714.3Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M68.5 710L69.6 713L83.4 717.4L82.3 714.3Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M69 703.7L68.5 710L82.3 714.3L82.8 708Z\"/><path class=\"iso-top\" d=\"M96.7 691.3L81.2 695.5L95 699.8L110.5 695.6ZM81.2 695.5L73.6 699.3L87.4 703.7L95 699.8ZM73.6 699.3L69 703.7L82.8 708L87.4 703.7Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M110.5 695.6L95 699.8M95 699.8L87.4 703.7M87.4 703.7L82.8 708M69 703.7L82.8 708M82.8 708L82.3 714.3M68.5 710L82.3 714.3M82.3 714.3L83.4 717.4\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M68.5 710L69 703.7L73.6 699.3L81.2 695.5L96.7 691.3L110.5 695.6L112 701.5L111.1 705L83.4 717.4L69.6 713Z\"/></g></g><g class=\"mq-joint\" data-name=\"as.ankleL\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M76.3 697.2L76.4 696L76.7 694.8L77.2 693.7L77.8 692.6L78.6 691.7L79.5 690.9L80.6 690.3L81.7 689.8L82.9 689.5L84.1 689.4L85.3 689.5L86.5 689.8L87.7 690.3L88.7 690.9L89.7 691.7L90.4 692.6L91.1 693.7L91.6 694.8L91.8 696L91.9 697.2L91.8 698.5L91.6 699.7L91.1 700.8L90.4 701.8L89.7 702.8L88.7 703.6L87.7 704.2L86.5 704.7L85.3 705L84.1 705.1L82.9 705L81.7 704.7L80.6 704.2L79.5 703.6L78.6 702.8L77.8 701.8L77.2 700.8L76.7 699.7L76.4 698.5Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M76.3 697.2L76.4 696L76.7 694.8L77.2 693.7L77.8 692.6L78.6 691.7L79.5 690.9L80.6 690.3L81.7 689.8L82.9 689.5L84.1 689.4L85.3 689.5L86.5 689.8L87.7 690.3L88.7 690.9L89.7 691.7L90.4 692.6L91.1 693.7L91.6 694.8L91.8 696L91.9 697.2L91.8 698.5L91.6 699.7L91.1 700.8L90.4 701.8L89.7 702.8L88.7 703.6L87.7 704.2L86.5 704.7L85.3 705L84.1 705.1L82.9 705L81.7 704.7L80.6 704.2L79.5 703.6L78.6 702.8L77.8 701.8L77.2 700.8L76.7 699.7L76.4 698.5Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M76.3 697.2L76.4 696L76.7 694.8L77.2 693.7L77.8 692.6L78.6 691.7L79.5 690.9L80.6 690.3L81.7 689.8L82.9 689.5L84.1 689.4L85.3 689.5L86.5 689.8L87.7 690.3L88.7 690.9L88.9 691.2L89 691.6L88.9 692.1L88.7 692.7L88.4 693.4L87.9 694.1L87.3 694.9L86.6 695.8L85.8 696.6L84.9 697.4L84 698.2L83.1 699L82.2 699.7L81.3 700.3L80.5 700.7L79.7 701.1L79 701.4L78.4 701.5L77.9 701.5L77.5 701.3L77.2 700.8L76.7 699.7L76.4 698.5Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M76.3 697.2L76.4 696L76.7 694.8L77.2 693.7L77.8 692.6L78.6 691.7L79.5 690.9L80.6 690.3L81.7 689.8L82.9 689.5L84.1 689.4L85.3 689.5L86.5 689.8L87.2 690.1L87.4 690.3L87.5 690.7L87.4 691.2L87.2 691.7L86.9 692.4L86.4 693.1L85.9 693.8L85.2 694.6L84.5 695.4L83.7 696.1L82.9 696.9L82 697.6L81.2 698.2L80.3 698.7L79.5 699.2L78.8 699.5L78.2 699.8L77.6 699.9L77.2 699.9L76.8 699.7L76.6 699.5L76.4 698.5Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M76.3 697.2L76.4 696L76.7 694.8L77.2 693.7L77.8 692.6L78.6 691.7L79.5 690.9L80.6 690.3L81.7 689.8L82.9 689.5L84.1 689.4L85.2 689.5L85.5 689.6L85.7 689.8L85.7 690.1L85.7 690.6L85.5 691L85.2 691.6L84.8 692.2L84.4 692.8L83.8 693.5L83.2 694.2L82.5 694.8L81.8 695.5L81 696.1L80.3 696.6L79.6 697.1L78.9 697.5L78.3 697.8L77.7 698L77.2 698.1L76.8 698.1L76.5 698L76.4 697.7Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M76.3 697.2L76.4 696L76.7 694.8L77.2 693.7L77.8 692.6L78.6 691.7L79.5 690.9L80.6 690.3L81.7 689.8L82.9 689.5L84.1 689.4L85.3 689.5L86.5 689.8L87.7 690.3L88.7 690.9L89.7 691.7L90.4 692.6L91.1 693.7L91.6 694.8L91.8 696L91.9 697.2L91.8 698.5L91.6 699.7L91.1 700.8L90.4 701.8L89.7 702.8L88.7 703.6L87.7 704.2L86.5 704.7L85.3 705L84.1 705.1L82.9 705L81.7 704.7L80.6 704.2L79.5 703.6L78.6 702.8L77.8 701.8L77.2 700.8L76.7 699.7L76.4 698.5Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.shankL\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M78.2 692.4L83.4 605.1L83.5 604.9L83.8 604.6L84.4 604.4L85.1 604.2L85.9 604L87 603.9L88.1 603.8L89.4 603.8L90.8 603.9L92.2 603.9L93.6 604.1L95.1 604.2L96.6 604.4L98 604.7L99.4 604.9L100.6 605.2L101.7 605.5L102.7 605.9L103.6 606.2L104.2 606.5L104.7 606.9L105 607.2L105.1 607.5L90.9 693.8L90.9 694L90.7 694.1L90.4 694.2L90 694.4L89.5 694.4L88.9 694.5L88.2 694.5L87.4 694.6L86.6 694.5L85.8 694.5L84.9 694.4L84.1 694.3L83.2 694.2L82.4 694.1L81.6 693.9L80.8 693.7L80.2 693.6L79.6 693.4L79.1 693.2L78.7 693L78.4 692.8L78.3 692.6Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M95.8 608.7L97.9 608.8L99.8 608.8L101.5 608.7L102.9 608.6L104 608.3L104.7 608L105 607.6L90.9 693.8L90.8 694.1L90.3 694.3L89.7 694.4L88.9 694.5L87.9 694.6L86.7 694.5L85.5 694.5Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M93.7 608.5L95.8 608.7L85.5 694.5L84.3 694.4Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M89.6 607.8L91.6 608.2L93.7 608.5L84.3 694.4L83 694.2L81.9 694Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M86.2 607L87.8 607.4L89.6 607.8L81.9 694L80.8 693.7L79.9 693.5Z\"/><path class=\"iso-top\" d=\"M94.2 606.3L94.2 606.3L94.2 606.3L94.2 606.3L94.2 606.3L94.2 606.3L94.2 606.3L94.2 606.3L94.2 606.3L94.2 606.3L94.2 606.3L94.2 606.3L94.2 606.3L94.2 606.3L94.2 606.3L94.2 606.3L94.2 606.3L94.2 606.3L94.2 606.3L94.2 606.3L94.2 606.3L94.2 606.3L94.2 606.3L94.2 606.3L94.2 606.3L94.2 606.3L94.2 606.3L94.2 606.3L94.2 606.3L94.2 606.3L94.2 606.3L94.2 606.3L94.2 606.3L101.5 608.7L99.8 608.8L97.9 608.8L95.8 608.7L93.7 608.5L91.6 608.2L89.6 607.8L87.8 607.4L86.2 607L84.9 606.5L84 606L83.5 605.5L83.4 605.1L83.7 604.7L84.4 604.3L85.5 604.1L87 603.9L88.7 603.8L90.6 603.9L92.6 604L94.8 604.2L96.9 604.5L98.9 604.8L100.7 605.2L102.3 605.7L103.5 606.2L104.4 606.7L104.9 607.1L105 607.6L104.7 608L104 608.3L102.9 608.6L101.5 608.7ZM83.4 605.1L83.5 605.5L84 606L84.9 606.5L86.2 607L79.9 693.5L79.1 693.2L78.6 692.9L78.3 692.6L78.2 692.3Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M83.4 605.1L83.5 605.5L83.8 605.8L84.2 606.1L84.9 606.5L85.7 606.8L86.7 607.1L87.8 607.4L89.1 607.7L90.4 608L91.8 608.2L93.3 608.4L94.7 608.6L96.2 608.7L97.6 608.8L99 608.8L100.2 608.8L101.4 608.7L102.4 608.6L103.3 608.5L104 608.3L104.6 608.1L104.9 607.8L105.1 607.6\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M78.2 692.4L83.4 605.1L83.5 604.9L83.8 604.6L84.4 604.4L85.1 604.2L85.9 604L87 603.9L88.1 603.8L89.4 603.8L90.8 603.9L92.2 603.9L93.6 604.1L95.1 604.2L96.6 604.4L98 604.7L99.4 604.9L100.6 605.2L101.7 605.5L102.7 605.9L103.6 606.2L104.2 606.5L104.7 606.9L105 607.2L105.1 607.5L90.9 693.8L90.9 694L90.7 694.1L90.4 694.2L90 694.4L89.5 694.4L88.9 694.5L88.2 694.5L87.4 694.6L86.6 694.5L85.8 694.5L84.9 694.4L84.1 694.3L83.2 694.2L82.4 694.1L81.6 693.9L80.8 693.7L80.2 693.6L79.6 693.4L79.1 693.2L78.7 693L78.4 692.8L78.3 692.6Z\"/></g></g><g class=\"mq-joint\" data-name=\"as.kneeL\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M83.7 600.8L83.9 599.1L84.3 597.4L84.9 595.7L85.8 594.3L87 592.9L88.3 591.8L89.8 590.9L91.4 590.2L93.1 589.8L94.8 589.7L96.6 589.8L98.3 590.2L99.9 590.9L101.4 591.8L102.7 592.9L103.8 594.3L104.8 595.7L105.4 597.4L105.8 599.1L106 600.8L105.8 602.5L105.4 604.2L104.8 605.8L103.8 607.3L102.7 608.7L101.4 609.8L99.9 610.7L98.3 611.4L96.6 611.8L94.8 611.9L93.1 611.8L91.4 611.4L89.8 610.7L88.3 609.8L87 608.7L85.8 607.3L84.9 605.8L84.3 604.2L83.9 602.5Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M83.7 600.8L83.9 599.1L84.3 597.4L84.9 595.7L85.8 594.3L87 592.9L88.3 591.8L89.8 590.9L91.4 590.2L93.1 589.8L94.8 589.7L96.6 589.8L98.3 590.2L99.9 590.9L101.4 591.8L102.7 592.9L103.8 594.3L104.8 595.7L105.4 597.4L105.8 599.1L106 600.8L105.8 602.5L105.4 604.2L104.8 605.8L103.8 607.3L102.7 608.7L101.4 609.8L99.9 610.7L98.3 611.4L96.6 611.8L94.8 611.9L93.1 611.8L91.4 611.4L89.8 610.7L88.3 609.8L87 608.7L85.8 607.3L84.9 605.8L84.3 604.2L83.9 602.5Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M83.7 600.8L83.9 599.1L84.3 597.4L84.9 595.7L85.8 594.3L87 592.9L88.3 591.8L89.8 590.9L91.4 590.2L93.1 589.8L94.8 589.7L96.6 589.8L98.3 590.2L99.9 590.9L101.4 591.8L101.7 592.2L101.8 592.7L101.7 593.5L101.4 594.3L100.9 595.3L100.2 596.4L99.3 597.5L98.3 598.7L97.2 599.9L96 601.1L94.7 602.2L93.4 603.3L92.1 604.3L90.8 605.1L89.6 605.8L88.5 606.3L87.5 606.7L86.6 606.8L86 606.8L85.5 606.6L84.9 605.8L84.3 604.2L83.9 602.5Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M83.7 600.8L83.9 599.1L84.3 597.4L84.9 595.7L85.8 594.3L87 592.9L88.3 591.8L89.8 590.9L91.4 590.2L93.1 589.8L94.8 589.7L96.6 589.8L98.3 590.2L99.2 590.6L99.5 590.9L99.6 591.5L99.5 592.1L99.2 592.9L98.8 593.8L98.1 594.8L97.3 595.9L96.4 597L95.4 598.1L94.2 599.2L93.1 600.3L91.9 601.2L90.6 602.1L89.5 602.9L88.3 603.6L87.3 604L86.4 604.4L85.6 604.5L84.9 604.5L84.5 604.3L84.2 604L83.9 602.5Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M83.7 600.8L83.9 599.1L84.3 597.4L84.9 595.7L85.8 594.3L87 592.9L88.3 591.8L89.8 590.9L91.4 590.2L93.1 589.8L94.8 589.7L96.4 589.8L96.8 589.9L97.1 590.2L97.1 590.7L97.1 591.3L96.8 592L96.4 592.7L95.9 593.6L95.2 594.5L94.4 595.5L93.5 596.4L92.5 597.4L91.5 598.3L90.4 599.1L89.4 599.9L88.4 600.6L87.4 601.1L86.5 601.6L85.7 601.9L85 602L84.4 602L84 601.8L83.8 601.5Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M83.7 600.8L83.9 599.1L84.3 597.4L84.9 595.7L85.8 594.3L87 592.9L88.3 591.8L89.8 590.9L91.4 590.2L93.1 589.8L94.8 589.7L96.6 589.8L98.3 590.2L99.9 590.9L101.4 591.8L102.7 592.9L103.8 594.3L104.8 595.7L105.4 597.4L105.8 599.1L106 600.8L105.8 602.5L105.4 604.2L104.8 605.8L103.8 607.3L102.7 608.7L101.4 609.8L99.9 610.7L98.3 611.4L96.6 611.8L94.8 611.9L93.1 611.8L91.4 611.4L89.8 610.7L88.3 609.8L87 608.7L85.8 607.3L84.9 605.8L84.3 604.2L83.9 602.5Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.thighL\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M68.5 521.7L68.6 521L68.9 520.3L69.4 519.5L69.9 518.8L70.6 518.1L71.4 517.4L72.4 516.7L73.4 516.1L74.5 515.5L75.8 515L77.1 514.5L78.4 514.1L79.8 513.7L81.3 513.4L82.7 513.2L84.2 513L85.7 513L87.1 512.9L88.6 513L89.9 513.1L91.2 513.3L92.5 513.6L93.6 513.9L94.6 514.3L95.6 514.8L96.4 515.3L97.1 515.8L97.7 516.4L98.1 517.1L98.4 517.7L98.6 518.4L104 594.5L104 595L103.9 595.5L103.7 596L103.5 596.5L103.1 596.9L102.6 597.4L102.1 597.8L101.5 598.3L100.8 598.7L100.1 599.1L99.3 599.4L98.4 599.7L97.5 600L96.6 600.3L95.6 600.5L94.7 600.6L93.7 600.7L92.7 600.8L91.8 600.8L90.9 600.7L90 600.7L89.1 600.5L88.3 600.4L87.5 600.1L86.9 599.9L86.2 599.6L85.7 599.3L85.2 598.9L84.9 598.5L84.6 598.1L84.4 597.6L84.3 597.2L68.5 522.5Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M79.9 527.9L82.8 527.8L85.8 527.4L88.7 526.8L91.3 525.9L93.7 524.8L95.6 523.5L97.2 522.1L98.1 520.6L98.6 519.2L104 595L103.7 596L103.1 596.9L102.1 597.8L100.8 598.7L99.3 599.4L97.5 600L95.6 600.5L93.7 600.7L91.8 600.8Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M74.6 527.3L77.1 527.8L79.9 527.9L91.8 600.8L90 600.7L88.3 600.4Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M69.4 524.5L70.7 525.6L72.4 526.6L74.6 527.3L88.3 600.4L86.9 599.9L85.7 599.3L84.9 598.5Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M68.7 523.2L69.4 524.5L84.9 598.5L84.4 597.6Z\"/><path class=\"iso-top\" d=\"M83.5 520.4L83.5 520.4L83.5 520.4L83.5 520.4L83.5 520.4L83.5 520.4L83.5 520.4L83.5 520.4L83.5 520.4L83.5 520.4L83.5 520.4L83.5 520.4L83.5 520.4L83.5 520.4L83.5 520.4L83.5 520.4L83.5 520.4L83.5 520.4L83.5 520.4L83.5 520.4L83.5 520.4L83.5 520.4L83.5 520.4L83.5 520.4L83.5 520.4L83.5 520.4L83.5 520.4L83.5 520.4L83.5 520.4L83.5 520.4L83.5 520.4L83.5 520.4L83.5 520.4L93.7 524.8L91.3 525.9L88.7 526.8L85.8 527.4L82.8 527.8L79.9 527.9L77.1 527.8L74.6 527.3L72.4 526.6L70.7 525.6L69.4 524.5L68.7 523.2L68.5 521.7L68.9 520.3L69.9 518.8L71.4 517.4L73.4 516.1L75.8 515L78.4 514.1L81.3 513.4L84.2 513L87.1 512.9L89.9 513.1L92.5 513.6L94.6 514.3L96.4 515.3L97.7 516.4L98.4 517.7L98.6 519.2L98.1 520.6L97.2 522.1L95.6 523.5L93.7 524.8Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M68.6 522.8L68.8 523.5L69.1 524.1L69.6 524.7L70.2 525.3L71 525.8L71.8 526.3L72.8 526.7L73.8 527.1L75 527.4L76.2 527.6L77.5 527.8L78.8 527.9L80.2 528L81.7 527.9L83.1 527.8L84.5 527.6L86 527.4L87.4 527.1L88.8 526.8L90.1 526.3L91.4 525.9L92.6 525.3L93.7 524.8L94.7 524.2L95.6 523.5L96.4 522.8L97.1 522.1L97.7 521.4L98.1 520.7L98.4 520L98.5 519.3L98.6 518.6\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M68.5 521.7L68.6 521L68.9 520.3L69.4 519.5L69.9 518.8L70.6 518.1L71.4 517.4L72.4 516.7L73.4 516.1L74.5 515.5L75.8 515L77.1 514.5L78.4 514.1L79.8 513.7L81.3 513.4L82.7 513.2L84.2 513L85.7 513L87.1 512.9L88.6 513L89.9 513.1L91.2 513.3L92.5 513.6L93.6 513.9L94.6 514.3L95.6 514.8L96.4 515.3L97.1 515.8L97.7 516.4L98.1 517.1L98.4 517.7L98.6 518.4L104 594.5L104 595L103.9 595.5L103.7 596L103.5 596.5L103.1 596.9L102.6 597.4L102.1 597.8L101.5 598.3L100.8 598.7L100.1 599.1L99.3 599.4L98.4 599.7L97.5 600L96.6 600.3L95.6 600.5L94.7 600.6L93.7 600.7L92.7 600.8L91.8 600.8L90.9 600.7L90 600.7L89.1 600.5L88.3 600.4L87.5 600.1L86.9 599.9L86.2 599.6L85.7 599.3L85.2 598.9L84.9 598.5L84.6 598.1L84.4 597.6L84.3 597.2L68.5 522.5Z\"/></g></g><g class=\"mq-joint\" data-name=\"as.hipL\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M70 515.1L70.1 513.1L70.6 511.1L71.4 509.3L72.4 507.6L73.7 506.1L75.3 504.8L77 503.7L78.8 502.9L80.8 502.5L82.8 502.3L84.8 502.5L86.7 502.9L88.6 503.7L90.3 504.8L91.8 506.1L93.1 507.6L94.2 509.3L94.9 511.1L95.4 513.1L95.6 515.1L95.4 517.1L94.9 519L94.2 520.9L93.1 522.6L91.8 524.1L90.3 525.4L88.6 526.5L86.7 527.3L84.8 527.7L82.8 527.9L80.8 527.7L78.8 527.3L77 526.5L75.3 525.4L73.7 524.1L72.4 522.6L71.4 520.9L70.6 519L70.1 517.1Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M70 515.1L70.1 513.1L70.6 511.1L71.4 509.3L72.4 507.6L73.7 506.1L75.3 504.8L77 503.7L78.8 502.9L80.8 502.5L82.8 502.3L84.8 502.5L86.7 502.9L88.6 503.7L90.3 504.8L91.8 506.1L93.1 507.6L94.2 509.3L94.9 511.1L95.4 513.1L95.6 515.1L95.4 517.1L94.9 519L94.2 520.9L93.1 522.6L91.8 524.1L90.3 525.4L88.6 526.5L86.7 527.3L84.8 527.7L82.8 527.9L80.8 527.7L78.8 527.3L77 526.5L75.3 525.4L73.7 524.1L72.4 522.6L71.4 520.9L70.6 519L70.1 517.1Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M70 515.1L70.1 513.1L70.6 511.1L71.4 509.3L72.4 507.6L73.7 506.1L75.3 504.8L77 503.7L78.8 502.9L80.8 502.5L82.8 502.3L84.8 502.5L86.7 502.9L88.6 503.7L90.3 504.8L90.6 505.2L90.8 505.8L90.6 506.7L90.3 507.7L89.7 508.8L88.9 510L87.9 511.3L86.8 512.7L85.5 514.1L84.1 515.4L82.6 516.7L81.1 518L79.6 519.1L78.2 520L76.8 520.8L75.5 521.4L74.3 521.9L73.4 522.1L72.6 522L72 521.8L71.4 520.9L70.6 519L70.1 517.1Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M70 515.1L70.1 513.1L70.6 511.1L71.4 509.3L72.4 507.6L73.7 506.1L75.3 504.8L77 503.7L78.8 502.9L80.8 502.5L82.8 502.3L84.8 502.5L86.7 502.9L87.8 503.4L88.1 503.8L88.3 504.4L88.1 505.1L87.8 506.1L87.3 507.1L86.6 508.3L85.6 509.5L84.6 510.7L83.4 512L82.1 513.3L80.7 514.5L79.3 515.6L77.9 516.6L76.6 517.5L75.3 518.3L74.1 518.8L73 519.2L72.1 519.4L71.4 519.4L70.9 519.2L70.5 518.8L70.1 517.1Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M70 515.1L70.1 513.1L70.6 511.1L71.4 509.3L72.4 507.6L73.7 506.1L75.3 504.8L77 503.7L78.8 502.9L80.8 502.5L82.8 502.3L84.6 502.4L85 502.6L85.3 503L85.4 503.5L85.3 504.2L85 504.9L84.6 505.8L83.9 506.8L83.2 507.9L82.2 509L81.2 510.1L80.1 511.2L78.9 512.2L77.7 513.2L76.5 514.1L75.3 514.9L74.2 515.5L73.2 516L72.3 516.3L71.5 516.5L70.8 516.5L70.4 516.3L70.1 515.9Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M70 515.1L70.1 513.1L70.6 511.1L71.4 509.3L72.4 507.6L73.7 506.1L75.3 504.8L77 503.7L78.8 502.9L80.8 502.5L82.8 502.3L84.8 502.5L86.7 502.9L88.6 503.7L90.3 504.8L91.8 506.1L93.1 507.6L94.2 509.3L94.9 511.1L95.4 513.1L95.6 515.1L95.4 517.1L94.9 519L94.2 520.9L93.1 522.6L91.8 524.1L90.3 525.4L88.6 526.5L86.7 527.3L84.8 527.7L82.8 527.9L80.8 527.7L78.8 527.3L77 526.5L75.3 525.4L73.7 524.1L72.4 522.6L71.4 520.9L70.6 519L70.1 517.1Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.handL\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M141.9 442L142 440.7L142.3 439.5L142.8 438.3L143.5 437.2L144.3 436.3L145.2 435.5L146.3 434.8L147.5 434.3L148.7 434L150 433.9L151.2 434L152.5 434.3L153.6 434.8L154.7 435.5L155.7 436.3L156.5 437.2L157.1 438.3L157.6 439.5L157.9 440.7L158 442L157.9 443.2L157.6 444.5L157.1 445.6L156.5 446.7L155.7 447.7L154.7 448.5L153.6 449.1L152.5 449.6L151.2 449.9L150 450L148.7 449.9L147.5 449.6L146.3 449.1L145.2 448.5L144.3 447.7L143.5 446.7L142.8 445.6L142.3 444.5L142 443.2Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M141.9 442L142 440.7L142.3 439.5L142.8 438.3L143.5 437.2L144.3 436.3L145.2 435.5L146.3 434.8L147.5 434.3L148.7 434L150 433.9L151.2 434L152.5 434.3L153.6 434.8L154.7 435.5L155.7 436.3L156.5 437.2L157.1 438.3L157.6 439.5L157.9 440.7L158 442L157.9 443.2L157.6 444.5L157.1 445.6L156.5 446.7L155.7 447.7L154.7 448.5L153.6 449.1L152.5 449.6L151.2 449.9L150 450L148.7 449.9L147.5 449.6L146.3 449.1L145.2 448.5L144.3 447.7L143.5 446.7L142.8 445.6L142.3 444.5L142 443.2Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M141.9 442L142 440.7L142.3 439.5L142.8 438.3L143.5 437.2L144.3 436.3L145.2 435.5L146.3 434.8L147.5 434.3L148.7 434L150 433.9L151.2 434L152.5 434.3L153.6 434.8L154.7 435.5L154.9 435.7L155 436.1L154.9 436.7L154.7 437.3L154.3 438L153.8 438.8L153.2 439.6L152.5 440.5L151.7 441.3L150.8 442.2L149.9 443L148.9 443.8L148 444.5L147.1 445.1L146.2 445.6L145.4 446L144.7 446.2L144 446.4L143.5 446.3L143.2 446.2L142.8 445.6L142.3 444.5L142 443.2Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M141.9 442L142 440.7L142.3 439.5L142.8 438.3L143.5 437.2L144.3 436.3L145.2 435.5L146.3 434.8L147.5 434.3L148.7 434L150 433.9L151.2 434L152.5 434.3L153.1 434.6L153.4 434.9L153.4 435.2L153.4 435.7L153.1 436.3L152.8 436.9L152.4 437.7L151.8 438.4L151.1 439.2L150.4 440L149.5 440.8L148.7 441.6L147.8 442.3L146.9 442.9L146.1 443.5L145.3 444L144.5 444.3L143.8 444.6L143.3 444.7L142.8 444.7L142.5 444.5L142.3 444.3L142 443.2Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M141.9 442L142 440.7L142.3 439.5L142.8 438.3L143.5 437.2L144.3 436.3L145.2 435.5L146.3 434.8L147.5 434.3L148.7 434L150 433.9L151.1 434L151.4 434.1L151.6 434.3L151.6 434.7L151.6 435.1L151.4 435.6L151.1 436.1L150.7 436.8L150.2 437.4L149.6 438.1L149 438.8L148.3 439.5L147.5 440.2L146.8 440.8L146 441.3L145.3 441.8L144.6 442.2L143.9 442.5L143.3 442.7L142.9 442.8L142.5 442.8L142.2 442.7L142 442.5Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M141.9 442L142 440.7L142.3 439.5L142.8 438.3L143.5 437.2L144.3 436.3L145.2 435.5L146.3 434.8L147.5 434.3L148.7 434L150 433.9L151.2 434L152.5 434.3L153.6 434.8L154.7 435.5L155.7 436.3L156.5 437.2L157.1 438.3L157.6 439.5L157.9 440.7L158 442L157.9 443.2L157.6 444.5L157.1 445.6L156.5 446.7L155.7 447.7L154.7 448.5L153.6 449.1L152.5 449.6L151.2 449.9L150 450L148.7 449.9L147.5 449.6L146.3 449.1L145.2 448.5L144.3 447.7L143.5 446.7L142.8 445.6L142.3 444.5L142 443.2Z\"/></g></g><g class=\"mq-joint\" data-name=\"as.wristL\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M137.3 449.7L137.3 448.7L137.6 447.8L137.9 447L138.4 446.2L139 445.5L139.7 444.9L140.5 444.4L141.4 444L142.3 443.8L143.2 443.7L144.1 443.8L145 444L145.9 444.4L146.7 444.9L147.4 445.5L148 446.2L148.5 447L148.8 447.8L149 448.7L149.1 449.7L149 450.6L148.8 451.5L148.5 452.3L148 453.1L147.4 453.8L146.7 454.4L145.9 454.9L145 455.3L144.1 455.5L143.2 455.6L142.3 455.5L141.4 455.3L140.5 454.9L139.7 454.4L139 453.8L138.4 453.1L137.9 452.3L137.6 451.5L137.3 450.6Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M137.3 449.7L137.3 448.7L137.6 447.8L137.9 447L138.4 446.2L139 445.5L139.7 444.9L140.5 444.4L141.4 444L142.3 443.8L143.2 443.7L144.1 443.8L145 444L145.9 444.4L146.7 444.9L147.4 445.5L148 446.2L148.5 447L148.8 447.8L149 448.7L149.1 449.7L149 450.6L148.8 451.5L148.5 452.3L148 453.1L147.4 453.8L146.7 454.4L145.9 454.9L145 455.3L144.1 455.5L143.2 455.6L142.3 455.5L141.4 455.3L140.5 454.9L139.7 454.4L139 453.8L138.4 453.1L137.9 452.3L137.6 451.5L137.3 450.6Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M137.3 449.7L137.3 448.7L137.6 447.8L137.9 447L138.4 446.2L139 445.5L139.7 444.9L140.5 444.4L141.4 444L142.3 443.8L143.2 443.7L144.1 443.8L145 444L145.9 444.4L146.7 444.9L146.8 445.1L146.9 445.4L146.8 445.8L146.7 446.2L146.4 446.7L146 447.3L145.6 447.9L145.1 448.5L144.5 449.2L143.8 449.8L143.1 450.4L142.4 451L141.7 451.5L141.1 451.9L140.4 452.3L139.8 452.6L139.3 452.8L138.8 452.9L138.5 452.9L138.2 452.8L137.9 452.3L137.6 451.5L137.3 450.6Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M137.3 449.7L137.3 448.7L137.6 447.8L137.9 447L138.4 446.2L139 445.5L139.7 444.9L140.5 444.4L141.4 444L142.3 443.8L143.2 443.7L144.1 443.8L145 444L145.5 444.2L145.7 444.4L145.7 444.7L145.7 445L145.5 445.5L145.3 446L144.9 446.5L144.5 447.1L144 447.6L143.5 448.2L142.9 448.8L142.2 449.4L141.6 449.9L141 450.4L140.3 450.8L139.7 451.1L139.2 451.4L138.7 451.6L138.3 451.6L137.9 451.6L137.7 451.5L137.5 451.3L137.3 450.6Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M137.3 449.7L137.3 448.7L137.6 447.8L137.9 447L138.4 446.2L139 445.5L139.7 444.9L140.5 444.4L141.4 444L142.3 443.8L143.2 443.7L144 443.8L144.2 443.9L144.4 444L144.4 444.3L144.4 444.6L144.2 445L144 445.4L143.7 445.8L143.4 446.3L142.9 446.8L142.5 447.3L141.9 447.8L141.4 448.3L140.8 448.8L140.3 449.2L139.7 449.5L139.2 449.8L138.7 450.1L138.3 450.2L138 450.3L137.7 450.3L137.4 450.2L137.3 450Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M137.3 449.7L137.3 448.7L137.6 447.8L137.9 447L138.4 446.2L139 445.5L139.7 444.9L140.5 444.4L141.4 444L142.3 443.8L143.2 443.7L144.1 443.8L145 444L145.9 444.4L146.7 444.9L147.4 445.5L148 446.2L148.5 447L148.8 447.8L149 448.7L149.1 449.7L149 450.6L148.8 451.5L148.5 452.3L148 453.1L147.4 453.8L146.7 454.4L145.9 454.9L145 455.3L144.1 455.5L143.2 455.6L142.3 455.5L141.4 455.3L140.5 454.9L139.7 454.4L139 453.8L138.4 453.1L137.9 452.3L137.6 451.5L137.3 450.6Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.foreL\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M108.8 478.9L108.9 477.9L109.3 477.1L109.9 476.4L138.2 447.8L138.7 447.5L139.4 447.3L140.1 447.3L140.9 447.4L141.7 447.7L142.6 448.1L143.4 448.6L144.1 449.3L144.7 450L145.3 450.8L145.7 451.5L145.9 452.3L146 453.1L145.9 453.7L145.7 454.3L120.9 485.9L120.3 486.6L119.5 487.1L118.6 487.4L117.5 487.4L116.3 487.3L115.1 486.9L113.8 486.3L112.7 485.5L111.6 484.5L110.6 483.5L109.8 482.3L109.3 481.2L108.9 480Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M120.9 485.9L121.2 485.1L121.4 484.1L121.2 483L120.9 481.8L120.3 480.7L119.5 479.5L144.7 450L145.3 450.8L145.7 451.5L145.9 452.3L146 453.1L145.9 453.7L145.7 454.3Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M115.1 481.5L115.1 481.5L115.1 481.5L115.1 481.5L115.1 481.5L115.1 481.5L115.1 481.5L115.1 481.5L115.1 481.5L115.1 481.5L115.1 481.5L115.1 481.5L115.1 481.5L115.1 481.5L115.1 481.5L115.1 481.5L115.1 481.5L115.1 481.5L115.1 481.5L115.1 481.5L115.1 481.5L115.1 481.5L115.1 481.5L115.1 481.5L115.1 481.5L115.1 481.5L115.1 481.5L115.1 481.5L115.1 481.5L115.1 481.5L115.1 481.5L115.1 481.5L115.1 481.5L121.2 483L121.4 484.1L121.2 485.1L120.9 485.9L120.3 486.6L119.5 487.1L118.6 487.4L117.5 487.4L116.3 487.3L115.1 486.9L113.8 486.3L112.7 485.5L111.6 484.5L110.6 483.5L109.8 482.3L109.3 481.2L108.9 480L108.8 478.9L108.9 477.9L109.3 477.1L109.9 476.4L110.6 475.9L111.6 475.6L112.7 475.6L113.9 475.7L115.1 476.1L116.3 476.7L117.5 477.5L118.6 478.5L119.5 479.5L120.3 480.7L120.9 481.8L121.2 483ZM119.5 479.5L118.6 478.5L144.1 449.3L144.7 450Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M118.6 478.5L117.5 477.5L143.4 448.6L144.1 449.3Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M117.5 477.5L116.3 476.7L142.6 448.1L143.4 448.6Z\"/><path class=\"iso-top\" d=\"M116.3 476.7L115.1 476.1L113.9 475.7L112.7 475.6L111.6 475.6L110.6 475.9L109.9 476.4L138.2 447.8L138.7 447.5L139.4 447.3L140.1 447.3L140.9 447.4L141.7 447.7L142.6 448.1Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M120.7 486.2L121.1 485.4L121.3 484.5L121.3 483.5L121.1 482.4L120.6 481.2L120 480.1L119.1 479L118.1 478.1L117 477.2L115.8 476.5L114.6 476L113.5 475.6L112.3 475.5L111.3 475.7L110.4 476L109.7 476.5\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M108.8 478.9L108.9 477.9L109.3 477.1L109.9 476.4L138.2 447.8L138.7 447.5L139.4 447.3L140.1 447.3L140.9 447.4L141.7 447.7L142.6 448.1L143.4 448.6L144.1 449.3L144.7 450L145.3 450.8L145.7 451.5L145.9 452.3L146 453.1L145.9 453.7L145.7 454.3L120.9 485.9L120.3 486.6L119.5 487.1L118.6 487.4L117.5 487.4L116.3 487.3L115.1 486.9L113.8 486.3L112.7 485.5L111.6 484.5L110.6 483.5L109.8 482.3L109.3 481.2L108.9 480Z\"/></g></g><g class=\"mq-joint\" data-name=\"as.elbowL\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M104.6 484L104.7 482.7L105 481.4L105.5 480.2L106.2 479.1L107 478.1L108 477.3L109.1 476.6L110.3 476.1L111.6 475.8L112.9 475.7L114.2 475.8L115.4 476.1L116.6 476.6L117.8 477.3L118.7 478.1L119.6 479.1L120.3 480.2L120.8 481.4L121.1 482.7L121.2 484L121.1 485.3L120.8 486.6L120.3 487.8L119.6 488.9L118.7 489.9L117.8 490.7L116.6 491.4L115.4 491.9L114.2 492.2L112.9 492.3L111.6 492.2L110.3 491.9L109.1 491.4L108 490.7L107 489.9L106.2 488.9L105.5 487.8L105 486.6L104.7 485.3Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M104.6 484L104.7 482.7L105 481.4L105.5 480.2L106.2 479.1L107 478.1L108 477.3L109.1 476.6L110.3 476.1L111.6 475.8L112.9 475.7L114.2 475.8L115.4 476.1L116.6 476.6L117.8 477.3L118.7 478.1L119.6 479.1L120.3 480.2L120.8 481.4L121.1 482.7L121.2 484L121.1 485.3L120.8 486.6L120.3 487.8L119.6 488.9L118.7 489.9L117.8 490.7L116.6 491.4L115.4 491.9L114.2 492.2L112.9 492.3L111.6 492.2L110.3 491.9L109.1 491.4L108 490.7L107 489.9L106.2 488.9L105.5 487.8L105 486.6L104.7 485.3Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M104.6 484L104.7 482.7L105 481.4L105.5 480.2L106.2 479.1L107 478.1L108 477.3L109.1 476.6L110.3 476.1L111.6 475.8L112.9 475.7L114.2 475.8L115.4 476.1L116.6 476.6L117.8 477.3L118 477.6L118.1 478L118 478.5L117.8 479.2L117.4 479.9L116.9 480.7L116.2 481.6L115.5 482.4L114.7 483.3L113.7 484.2L112.8 485.1L111.8 485.9L110.8 486.6L109.9 487.2L109 487.7L108.2 488.1L107.4 488.4L106.8 488.5L106.3 488.5L105.9 488.3L105.5 487.8L105 486.6L104.7 485.3Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M104.6 484L104.7 482.7L105 481.4L105.5 480.2L106.2 479.1L107 478.1L108 477.3L109.1 476.6L110.3 476.1L111.6 475.8L112.9 475.7L114.2 475.8L115.4 476.1L116.1 476.4L116.4 476.7L116.4 477L116.4 477.5L116.1 478.1L115.8 478.8L115.3 479.6L114.7 480.3L114 481.2L113.3 482L112.4 482.8L111.6 483.6L110.7 484.3L109.7 485L108.9 485.6L108 486L107.3 486.4L106.6 486.7L106 486.8L105.5 486.8L105.2 486.6L104.9 486.4L104.7 485.3Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M104.6 484L104.7 482.7L105 481.4L105.5 480.2L106.2 479.1L107 478.1L108 477.3L109.1 476.6L110.3 476.1L111.6 475.8L112.9 475.7L114 475.8L114.3 475.9L114.5 476.1L114.6 476.5L114.5 476.9L114.3 477.4L114 478L113.6 478.6L113.1 479.3L112.5 480L111.9 480.7L111.1 481.5L110.4 482.1L109.6 482.8L108.8 483.3L108 483.8L107.3 484.3L106.7 484.6L106.1 484.8L105.5 484.9L105.1 484.9L104.8 484.8L104.7 484.5Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M104.6 484L104.7 482.7L105 481.4L105.5 480.2L106.2 479.1L107 478.1L108 477.3L109.1 476.6L110.3 476.1L111.6 475.8L112.9 475.7L114.2 475.8L115.4 476.1L116.6 476.6L117.8 477.3L118.7 478.1L119.6 479.1L120.3 480.2L120.8 481.4L121.1 482.7L121.2 484L121.1 485.3L120.8 486.6L120.3 487.8L119.6 488.9L118.7 489.9L117.8 490.7L116.6 491.4L115.4 491.9L114.2 492.2L112.9 492.3L111.6 492.2L110.3 491.9L109.1 491.4L108 490.7L107 489.9L106.2 488.9L105.5 487.8L105 486.6L104.7 485.3Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.upperL\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M95.3 420.8L95.3 420.3L95.6 419.7L96.1 419.1L96.9 418.6L97.8 418L98.9 417.6L100.1 417.1L101.5 416.7L102.9 416.4L104.4 416.2L105.8 416.1L107.3 416.1L108.6 416.1L109.9 416.3L111 416.5L111.9 416.8L112.7 417.2L113.2 417.6L113.5 418.1L113.6 418.6L118.9 479.4L118.8 479.8L118.5 480.2L118.1 480.6L117.5 481L116.8 481.3L115.9 481.7L115 482L114 482.2L113 482.4L111.9 482.5L110.9 482.6L109.9 482.6L108.9 482.5L108.1 482.4L107.3 482.2L106.7 481.9L106.2 481.6L105.9 481.3L105.8 480.9Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M104 423L105.8 422.8L107.5 422.4L109.2 421.9L110.6 421.4L111.8 420.8L112.7 420.1L113.4 419.4L113.6 418.7L118.9 479.4L118.7 479.9L118.3 480.4L117.7 480.9L116.8 481.3L115.7 481.7L114.6 482.1L113.3 482.3L112 482.5Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M100.5 423.1L102.2 423.1L104 423L112 482.5L110.8 482.6L109.5 482.6Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M96.6 422.2L97.7 422.6L99 422.9L100.5 423.1L109.5 482.6L108.4 482.4L107.5 482.2L106.7 481.9Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M95.4 421.1L95.8 421.7L96.6 422.2L106.7 481.9L106.2 481.6L105.9 481.1Z\"/><path class=\"iso-top\" d=\"M104.5 419.6L104.5 419.6L104.5 419.6L104.5 419.6L104.5 419.6L104.5 419.6L104.5 419.6L104.5 419.6L104.5 419.6L104.5 419.6L104.5 419.6L104.5 419.6L104.5 419.6L104.5 419.6L104.5 419.6L104.5 419.6L104.5 419.6L104.5 419.6L104.5 419.6L104.5 419.6L104.5 419.6L104.5 419.6L104.5 419.6L104.5 419.6L104.5 419.6L104.5 419.6L104.5 419.6L104.5 419.6L104.5 419.6L104.5 419.6L104.5 419.6L104.5 419.6L104.5 419.6L110.6 421.4L109.2 421.9L107.5 422.4L105.8 422.8L104 423L102.2 423.1L100.5 423.1L99 422.9L97.7 422.6L96.6 422.2L95.8 421.7L95.4 421.1L95.3 420.5L95.6 419.8L96.2 419.1L97.1 418.4L98.3 417.8L99.7 417.2L101.4 416.8L103.1 416.4L104.9 416.2L106.7 416.1L108.4 416.1L109.9 416.3L111.3 416.6L112.3 417L113.1 417.5L113.5 418.1L113.6 418.7L113.4 419.4L112.7 420.1L111.8 420.8L110.6 421.4Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M95.3 420.8L95.5 421.3L95.9 421.8L96.5 422.2L97.4 422.5L98.3 422.8L99.5 423L100.7 423.1L102.1 423.1L103.5 423L104.9 422.9L106.3 422.7L107.7 422.4L109 422L110.1 421.6L111.2 421.1L112.1 420.6L112.8 420.1L113.3 419.5L113.6 419L113.6 418.4\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M95.3 420.8L95.3 420.3L95.6 419.7L96.1 419.1L96.9 418.6L97.8 418L98.9 417.6L100.1 417.1L101.5 416.7L102.9 416.4L104.4 416.2L105.8 416.1L107.3 416.1L108.6 416.1L109.9 416.3L111 416.5L111.9 416.8L112.7 417.2L113.2 417.6L113.5 418.1L113.6 418.6L118.9 479.4L118.8 479.8L118.5 480.2L118.1 480.6L117.5 481L116.8 481.3L115.9 481.7L115 482L114 482.2L113 482.4L111.9 482.5L110.9 482.6L109.9 482.6L108.9 482.5L108.1 482.4L107.3 482.2L106.7 481.9L106.2 481.6L105.9 481.3L105.8 480.9Z\"/></g></g><g class=\"mq-joint\" data-name=\"as.shoulderL\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M92.9 414.8L93.1 413.1L93.5 411.4L94.1 409.8L95 408.4L96.1 407.1L97.4 406L98.9 405.1L100.5 404.4L102.1 404L103.8 403.9L105.5 404L107.2 404.4L108.8 405.1L110.2 406L111.5 407.1L112.6 408.4L113.5 409.8L114.2 411.4L114.6 413.1L114.7 414.8L114.6 416.5L114.2 418.1L113.5 419.7L112.6 421.2L111.5 422.5L110.2 423.6L108.8 424.5L107.2 425.1L105.5 425.5L103.8 425.7L102.1 425.5L100.5 425.1L98.9 424.5L97.4 423.6L96.1 422.5L95 421.2L94.1 419.7L93.5 418.1L93.1 416.5Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M92.9 414.8L93.1 413.1L93.5 411.4L94.1 409.8L95 408.4L96.1 407.1L97.4 406L98.9 405.1L100.5 404.4L102.1 404L103.8 403.9L105.5 404L107.2 404.4L108.8 405.1L110.2 406L111.5 407.1L112.6 408.4L113.5 409.8L114.2 411.4L114.6 413.1L114.7 414.8L114.6 416.5L114.2 418.1L113.5 419.7L112.6 421.2L111.5 422.5L110.2 423.6L108.8 424.5L107.2 425.1L105.5 425.5L103.8 425.7L102.1 425.5L100.5 425.1L98.9 424.5L97.4 423.6L96.1 422.5L95 421.2L94.1 419.7L93.5 418.1L93.1 416.5Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M92.9 414.8L93.1 413.1L93.5 411.4L94.1 409.8L95 408.4L96.1 407.1L97.4 406L98.9 405.1L100.5 404.4L102.1 404L103.8 403.9L105.5 404L107.2 404.4L108.8 405.1L110.2 406L110.5 406.3L110.6 406.9L110.5 407.6L110.2 408.4L109.7 409.4L109.1 410.4L108.2 411.6L107.3 412.7L106.2 413.9L105 415.1L103.7 416.2L102.4 417.2L101.2 418.2L99.9 419L98.7 419.7L97.6 420.2L96.6 420.5L95.8 420.7L95.1 420.7L94.6 420.5L94.1 419.7L93.5 418.1L93.1 416.5Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M92.9 414.8L93.1 413.1L93.5 411.4L94.1 409.8L95 408.4L96.1 407.1L97.4 406L98.9 405.1L100.5 404.4L102.1 404L103.8 403.9L105.5 404L107.2 404.4L108.1 404.8L108.4 405.1L108.5 405.6L108.4 406.3L108.1 407.1L107.7 408L107 408.9L106.3 410L105.4 411.1L104.3 412.1L103.2 413.2L102.1 414.3L100.9 415.2L99.7 416.1L98.6 416.8L97.5 417.5L96.4 418L95.5 418.3L94.8 418.4L94.1 418.4L93.7 418.2L93.4 417.9L93.1 416.5Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M92.9 414.8L93.1 413.1L93.5 411.4L94.1 409.8L95 408.4L96.1 407.1L97.4 406L98.9 405.1L100.5 404.4L102.1 404L103.8 403.9L105.4 404L105.8 404.1L106 404.4L106.1 404.9L106 405.5L105.8 406.1L105.4 406.9L104.8 407.7L104.2 408.6L103.4 409.6L102.5 410.5L101.5 411.4L100.5 412.3L99.5 413.2L98.5 413.9L97.5 414.6L96.5 415.1L95.6 415.5L94.9 415.8L94.2 415.9L93.7 415.9L93.3 415.8L93 415.5Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M92.9 414.8L93.1 413.1L93.5 411.4L94.1 409.8L95 408.4L96.1 407.1L97.4 406L98.9 405.1L100.5 404.4L102.1 404L103.8 403.9L105.5 404L107.2 404.4L108.8 405.1L110.2 406L111.5 407.1L112.6 408.4L113.5 409.8L114.2 411.4L114.6 413.1L114.7 414.8L114.6 416.5L114.2 418.1L113.5 419.7L112.6 421.2L111.5 422.5L110.2 423.6L108.8 424.5L107.2 425.1L105.5 425.5L103.8 425.7L102.1 425.5L100.5 425.1L98.9 424.5L97.4 423.6L96.1 422.5L95 421.2L94.1 419.7L93.5 418.1L93.1 416.5Z\"/></g></g></svg></div><div class=\"vo-scrub\"><button type=\"button\" class=\"vo-play\" data-play aria-label=\"Play\">Play</button><input type=\"range\" class=\"vo-range\" min=\"0\" max=\"17.60\" step=\"0.05\" value=\"0\" aria-label=\"Minutes into the test\"><span class=\"vo-clock\" data-clock aria-hidden=\"true\">0:00</span></div><span class=\"vo-sr\" role=\"status\" aria-live=\"polite\" data-status></span><div class=\"opt-controls\"><div class=\"opt-seg\" role=\"radiogroup\" aria-label=\"VO₂max ceiling, ml/kg/min\" data-control=\"ceiling\"><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"35\" aria-checked=\"false\" tabindex=\"-1\">35</button><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"45\" aria-checked=\"true\" tabindex=\"0\">45</button><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"55\" aria-checked=\"false\" tabindex=\"-1\">55</button></div></div><div class=\"opt-foot\"><span class=\"opt-hint\">Pick a VO₂max ceiling · drag or play</span><dl class=\"opt-readout\" data-readout aria-hidden=\"true\"><div class=\"opt-stat\" data-stat=\"v\"><dt>Speed</dt><dd data-r=\"v\">7.4 km/h</dd></div><div class=\"opt-stat\" data-stat=\"hr\"><dt>Heart rate</dt><dd data-r=\"hr\">133 bpm</dd></div><div class=\"opt-stat\" data-stat=\"vo2\"><dt>VO₂</dt><dd data-r=\"vo2\">28.8 ml/kg/min</dd></div></dl></div></div><figcaption class=\"iso-legend\"><span class=\"iso-keys\"><span class=\"iso-key\"><svg class=\"iso-swatch\" data-mark=\"lit\" viewBox=\"0 0 16 10\" aria-hidden=\"true\"><path d=\"M2 4.5 8 1.5 14 4.5 14 6 8 9 2 6Z\"/><path class=\"iso-swatch-crease\" d=\"M2 4.5 8 7.5 14 4.5\"/></svg>The mask's analyser, blinking each breath</span><span class=\"iso-key\"><svg class=\"iso-swatch\" data-mark=\"raised\" viewBox=\"0 0 16 10\" aria-hidden=\"true\"><path d=\"M2 4.5 8 1.5 14 4.5 14 6 8 9 2 6Z\"/><path class=\"iso-swatch-crease\" d=\"M2 4.5 8 7.5 14 4.5\"/></svg>The belt, speeding up</span><span class=\"iso-key\"><svg class=\"iso-swatch\" data-mark=\"heat\" viewBox=\"0 0 16 10\" aria-hidden=\"true\"><path d=\"M1.5 5h13\"/></svg>Oxygen uptake against speed, on the tablet</span></span><span class=\"iso-caption\"><span class=\"vo-par\">On a treadmill ramp the belt speeds up a little every few seconds while you run. At a 1 % incline each extra 1 km/h costs about 3.5 ml of oxygen per kilogram each minute, the same for everyone, so oxygen use climbs in a straight line, a little behind the speed, until the heart and muscles can't deliver or use any more. That ceiling is VO₂max. A fitter body reaches a higher ceiling and a faster belt, but climbs the same slope.</span><span class=\"vo-par\">The analyser on the mask measures every breath, how much air goes out and how much oxygen it has lost, and sends it wirelessly to the assessor's tablet. You run freely, with nothing tethering you to a cart.</span><span class=\"vo-par\">Running usually gives a higher VO₂max than cycling, because more muscle is working: in a large registry, treadmill values averaged about 22 % above bike values. Compare a treadmill result with treadmill norms.</span><span class=\"vo-par\"><small>A typical pattern for one modelled person (45 years, 75 kg), not a prediction. The oxygen cost of running is the standard equation for a typical runner; yours differs a little with running economy. Many people stop before a clear plateau; their top value is called VO₂peak. Heart rates are typical for age and vary by 10 bpm or more.</small></span></span></figcaption></figure>" + "</div>";
    mount(root.querySelector(".opt-figure"));
  }
}
customElements.define("optimal-fig-vo2max-treadmill", Fig);
})();
