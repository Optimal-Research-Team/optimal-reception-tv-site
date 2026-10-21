/* optimal-fig-vo2max: Optimal Health explainer figure. Built with Anatomy (MIT). Generated; do not edit. */
(() => {
if (customElements.get("optimal-fig-vo2max")) return;
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

return { frameOf, frameAlong, prismOf, pointOf, solidOf, sphereOf, circleOf, arcOf };})();

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

// Fig 5 model: a ramp test on a bike ergometer → power, oxygen uptake, heart rate, RER, breathing,
// and the pedalling pose that draws it.
//
// Pure functions, no DOM. [n] keys refer to reference/truth-pack.md §5.
// One modelled person (45 years, 75 kg): a typical pattern, not a prediction.

const TRUTH = {
  bm: 75, //              kg, the modelled rider
  age: 45, //             years
  slope: 10.3, //         mL O₂/min per W on a ramp, 10.29 ± 1.01 in healthy men [7] HIGH
  rest: 3.5, //           mL/kg/min seated at rest, 1 MET [21] (convention) HIGH
  base: [150, 6], //      unloaded pedalling VO₂ = 150 + 6 × body mass, mL/min [9] MEDIUM
  rampMin: 10, //         ramp sized to reach the ceiling in about 10 min [1][3] HIGH
  tau: 0.6, //            min, VO₂ lags the ramp as a first-order response (30–45 s) LOW: shape only
  tauOff: 1.0, //         min, recovery fall-off LOW: shape only
  hrRest: 65, //          bpm, typical adult at rest LOW
  hrMax: [208, 0.7], //   HRmax = 208 − 0.7 × age [16] HIGH (a population average, ±10 bpm or more)
  rer: { rest: 0.8, vt1: 0.9, xVT1: 0.55, max: 1.15, bend: 1.6 }, // LOW shape; RER ≥ 1.10 at max is the usual criterion [11] HIGH
  cadence: 60, //         rpm, the usual target (55–70) [6] MEDIUM
  phases: { rest: 3, unloaded: 3, recovery: 3 }, // min [3][5] HIGH
  plateau: 45, //         mL/min softness of the ceiling (shape only)
  hold: 1.0, //           min the plateau runs before the test stops
  breath: { f0: 14, f1: 36, ve: 27, veTop: 10, xRCP: 0.85, exhale: 0.55 }, // breathing, LOW: drives the turbine and the hose only
  hoseArea: 9.6, //       cm², a 35 mm breathing hose
  ceilings: [25, 35, 45, 55], // mL/kg/min offered by the fitness control (model values, not norms)
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const hrMaxOf = (age = TRUTH.age) => TRUTH.hrMax[0] - TRUTH.hrMax[1] * age;
const baseOf = (bm = TRUTH.bm) => TRUTH.base[0] + TRUTH.base[1] * bm;
const softMin = (a, b, k) => -k * Math.log(Math.exp(-a / k) + Math.exp(-b / k));

/** RER for a share x of VO₂max (LOW shape, crosses 1.0 near 80 %). */
function rerOf(x) {
  const r = TRUTH.rer;
  if (x <= r.xVT1) return r.rest + (r.vt1 - r.rest) * clamp(x / r.xVT1, 0, 1);
  return r.vt1 + (r.max - r.vt1) * Math.pow(clamp((x - r.xVT1) / (1 - r.xVT1), 0, 1), r.bend);
}

/**
 * The whole test for one ceiling (mL/kg/min): arrays sampled every 0.01 min.
 * Ramp rate is chosen, as a lab would, so the line reaches the ceiling in about 10 minutes.
 */
function testOf(ceilingPerKg) {
  const bm = TRUTH.bm;
  const max = ceilingPerKg * bm;
  const rest = TRUTH.rest * bm;
  const base = baseOf(bm);
  const R = (max - base) / (TRUTH.slope * TRUTH.rampMin); // W/min
  const p = TRUTH.phases;
  const t0 = p.rest + p.unloaded; // ramp start
  const tCross = t0 + (max - base) / (TRUTH.slope * R) + TRUTH.tau; // the lagging line meets the ceiling
  const tEnd = tCross + TRUTH.hold; // the plateau has held: stop
  const total = tEnd + p.recovery;
  const dt = 0.01;
  const n = Math.ceil(total / dt) + 1;
  const T = { t: new Float32Array(n), W: new Float32Array(n), vo2: new Float32Array(n), hr: new Float32Array(n), rer: new Float32Array(n), f: new Float32Array(n), ve: new Float32Array(n), pedal: new Uint8Array(n) };
  let y = rest;
  const hrMax = hrMaxOf();
  for (let i = 0; i < n; i++) {
    const t = i * dt;
    const ramping = t >= t0 && t < tEnd;
    const W = ramping ? R * (t - t0) : 0;
    const pedal = t >= p.rest ? 1 : 0;
    const target = t < p.rest ? rest : softMin(base + TRUTH.slope * W, max, TRUTH.plateau);
    const tau = t >= tEnd ? TRUTH.tauOff : TRUTH.tau;
    if (i) y += ((target - y) * dt) / tau;
    const x = clamp((y - rest) / (max - rest), 0, 1);
    const xr = y / max;
    const rer = rerOf(xr);
    const b = TRUTH.breath;
    const f = b.f0 + b.f1 * xr * xr;
    const vco2 = (rer * y) / 1000; // L/min
    const ve = vco2 * (b.ve + b.veTop * clamp((xr - b.xRCP) / (1 - b.xRCP), 0, 1));
    T.t[i] = t;
    T.W[i] = W;
    T.vo2[i] = y;
    T.hr[i] = TRUTH.hrRest + (hrMax - TRUTH.hrRest) * x;
    T.rer[i] = rer;
    T.f[i] = f;
    T.ve[i] = ve;
    T.pedal[i] = pedal;
  }
  let peakW = 0;
  for (const w of T.W) peakW = Math.max(peakW, w);
  return { ...T, n, dt, ceiling: ceilingPerKg, max, rest, base, R, t0, tCross, tEnd, total, peakW };
}

/** State of a test at minute t (linear between samples). */
function sampleAt(T, t) {
  const u = clamp(t, 0, T.total) / T.dt;
  const i = Math.min(T.n - 2, Math.floor(u));
  const f = u - i;
  const lerp = (a) => a[i] + (a[i + 1] - a[i]) * f;
  const phase = t < TRUTH.phases.rest ? "rest" : t < T.t0 ? "unloaded" : t < T.tEnd ? "ramp" : "recovery";
  const vo2 = lerp(T.vo2);
  const f2 = lerp(T.f);
  const ve = lerp(T.ve);
  return { t, phase, W: lerp(T.W), vo2, perKg: vo2 / TRUTH.bm, hr: lerp(T.hr), rer: lerp(T.rer), f: f2, ve, tv: ve / f2, pedal: T.pedal[Math.round(u)] === 1 };
}

// ---------------------------------------------------------------- the rider on the bike (animation geometry)
// Sagittal [forward, up] points relative to the floor under the bottom bracket. A
// standard bike fit: knee bent about 30° at the bottom of the stroke, ball of the
// foot over the pedal axle, trunk leaning 35° forward. LOW as numbers; never printed.
const BIKE = {
  bb: [0, 32], //       bottom bracket
  crank: 17.2, //       cm (172.5 mm)
  hip: [-20, 0], //     hip x; height set by the knee-at-bottom fit below
  kneeBottom: 30, //    ° knee bend at the bottom of the stroke
  sole: -14, //         ° sole angle (toe down) with a little ankling through the stroke
  ankling: 8,
  grip: [46, 106, 22], // handlebar grip: forward, up, half-width
  trunk: 35, //         ° forward lean
};
const RAD = Math.PI / 180;
const rot2 = ([x, z], a) => [x * Math.cos(a) - z * Math.sin(a), x * Math.sin(a) + z * Math.cos(a)];

function knee2(hip, ankle, B) {
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
  return { knee: [hip[0] + ux * a - uz * h, hip[1] + uz * a + ux * h], ankle: [hip[0] + dx, hip[1] + dz] };
}
const footAnkle = (pedal, sole, B) => {
  const r = rot2([B.ankleX - B.ball, B.ankleZ], sole);
  return [pedal[0] + r[0], pedal[1] + r[1]];
};
/** Hip height that gives `kneeBottom` at the bottom of the stroke. */
function saddleOf(B) {
  const pedal = [BIKE.bb[0], BIKE.bb[1] - BIKE.crank];
  const ankle = footAnkle(pedal, (BIKE.sole - BIKE.ankling) * RAD, B); // sole at the bottom of the stroke (sin = −1)
  const d = Math.sqrt(B.thigh ** 2 + B.shank ** 2 + 2 * B.thigh * B.shank * Math.cos(BIKE.kneeBottom * RAD));
  const dx = BIKE.hip[0] - ankle[0];
  return ankle[1] + Math.sqrt(d * d - dx * dx);
}
/** Pedal axle position for crank angle θ (rad, 0 = forward, π/2 = top), right crank; the left is opposite. */
const pedalAt = (theta) => [BIKE.bb[0] + BIKE.crank * Math.cos(theta), BIKE.bb[1] + BIKE.crank * Math.sin(theta)];

/** Both legs and both arms for crank angle θ. B = mannequin body with `hipZ` from saddleOf. */
function riderAt(theta, B) {
  const hip = [BIKE.hip[0], B.hipZ];
  const legs = {};
  for (const [k, off] of [["R", 0], ["L", Math.PI]]) {
    const th = theta + off;
    const pedal = pedalAt(th);
    // ankling: toe drops most on the down-stroke's back half, flattens over the top
    const sole = (BIKE.sole + BIKE.ankling * Math.sin(th)) * RAD;
    const s = knee2(hip, footAnkle(pedal, sole, B), B);
    legs[k] = { hip, knee: s.knee, ankle: s.ankle, sole, toe: sole, pedal };
  }
  // arms: reach from the shoulder to the grips (two-link, elbows bent down and back)
  const lean = BIKE.trunk * RAD;
  const shoulder = [hip[0] + Math.sin(lean) * (B.trunk - 1.5), hip[1] + Math.cos(lean) * (B.trunk - 1.5)];
  const fore = B.forearm + 0.3 * B.hand; // wrist to the middle of the fist
  const dx = BIKE.grip[0] - shoulder[0];
  const dz = BIKE.grip[1] - shoulder[1];
  const d = Math.min(Math.hypot(dx, dz), B.upperArm + fore - 0.1);
  const line = Math.atan2(dx, -dz); // from straight down, + forward
  const alpha = Math.acos(clamp((B.upperArm ** 2 + d * d - fore ** 2) / (2 * B.upperArm * d), -1, 1));
  const bend = Math.PI - Math.acos(clamp((B.upperArm ** 2 + fore ** 2 - d * d) / (2 * B.upperArm * fore), -1, 1));
  const arm = { shoulder: (line - alpha) / RAD, elbow: bend / RAD };
  return { legs, arms: { R: arm, L: arm }, trunk: BIKE.trunk, pelvis: B.hipZ };
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
// Plots oxygen uptake (mL/kg/min) against the test's work (watts on a bike, km/h on a treadmill),
// with a dashed guide for the shared slope, the live trace, the current point, the ceiling once
// it shows, and the big VO₂ number with a breath marker.
// numberRight puts the big number at the right of the strip and the unit at the left, for a pose where the
// assessor's arm crosses the tablet's left edge (Fig 6), so the arm hides the unit rather than the reading.
function vo2Plot(host, screen, { xMin = 0, xMax, yMax = 60, xTicks, yTicks = [20, 40, 60], guide, xLabel, numberRight = false }) {
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
  const big = numberRight
    ? el("text", { class: "vp-big", x: (screen.w - 4).toFixed(2), y: 4.3, "font-size": 3.6, "text-anchor": "end" })
    : el("text", { class: "vp-big", x: 1.6, y: 4.3, "font-size": 3.6 });
  el("text", { class: "vp-unit", x: numberRight ? 1.6 : 12.4, y: 4.3, "font-size": 1.6 }).textContent = "mL/kg/min VO₂";
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

// Fig 5 live code: a ramp test you can play and scrub; the rider pedals and breathes in real time.
const DATA = {"P":{"origin":[233.16346932425174,519.1604213234489],"scale":2.3992694305907993,"azimuth":50,"elevation":22},"B":{"H":170,"thigh":41.65,"shank":41.82,"ankleZ":6.63,"foot":25.84,"ankleX":5.4264,"ball":18.6048,"hipHalf":8.5,"kneeHalf":7.2,"ankleHalf":5.2,"trunk":48.959999999999994,"shoulderHalf":18.02,"upperArm":31.62,"forearm":24.819999999999997,"hand":18.36,"chin":57.800000000000004,"head":22.1,"hipZ":105.85368383441602},"W":600,"H":602,"mask":{"base":[20.91409164589365,0,157.92545552970097],"face":[0.9707511885171749,0,-0.24008775477414987],"axis":[0.24008775477414993,0,0.9707511885171748]},"bike":{"bb":[0,0,32],"fly":{"x":-45,"y":0,"z":33,"r":24,"t":10},"cover":{"x":0,"y":11.43,"z":32,"r":6.2},"crank":17.2,"hipX":-20},"screen":{"w":29.494805157803658,"h":22.003498608283937}};

function mount(fig) {
  const P = DATA.P;
  const B = { ...DATA.B };
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
  const nodes = { runner: q('[data-part="runner"]'), power: q('[data-part="power"]'), fly: q('[data-part="flyspin"]'), tablet: q('[data-part="tablet"]') };
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attrs || {})) n.setAttribute(key, value);
    if (parent) parent.appendChild(n);
    return n;
  };
  const KS = P.scale * Math.sqrt(1.6);
  const view = mannequinView(nodes.runner, P, {});
  const base = [DATA.bike.hipX, 0, 0];
  const fmt = (min) => {
    const s = Math.max(0, Math.round(min * 60));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };

  // ---------------------------------------------------------------- state
  let ceiling = 35;
  let T = testOf(ceiling);
  let t = 0; // test minute
  let playing = false;
  let theta = 0.6; // crank angle (rad)
  let flyAngle = 0;
  let breath = 0; // breath phase 0..1 (breath out first)
  const MIN_PER_S = 0.75; // test minutes per second of playback (the rider still pedals and breathes in real time)

  // ---------------------------------------------------------------- the mask and its analyser, crank arms and pedals
  const WIDTH = { hip: B.hipHalf, knee: 8.6, ankle: 9 };
  function riderParts(pose) {
    const parts = [];
    const m = DATA.mask;
    const Fm = MANNEQUIN.frameAlong(m.base, m.face);
    parts.push({ name: "mask", group: "trunk", rigid: true, kind: "lathe", F: Fm, profile: [[0, 6.0], [2.6, 6.0, 1], [4.6, 4.4, 1], [6.0, 3.2]], centre: G.pointOf(Fm, 5, 0, 0), bias: 2 });
    // the wireless analyser: a capsule on the mask's front with a flow tube through it (generic, not any one brand)
    parts.push({ name: "analyser", group: "trunk", rigid: true, kind: "lathe", F: Fm, profile: [[5.6, 3.0], [6.4, 4.6, 1], [8.6, 5.0, 1], [11.0, 4.6, 1], [12.0, 3.0]], centre: G.pointOf(Fm, 9, 0, 0), bias: 2.5 });
    const bb = DATA.bike.bb;
    for (const [k, off] of [["R", 0], ["L", Math.PI]]) {
      const th = theta + off;
      const side = k === "L" ? 1 : -1;
      const u = [Math.cos(th), 0, Math.sin(th)];
      const v = [-Math.sin(th), 0, Math.cos(th)];
      const a = [0, side, 0];
      parts.push({ name: `crank${k}`, group: `leg${k}`, kind: "prism", F: { o: [bb[0], side * 13, bb[2]], a, u, v }, poly: [[-2.4, -1.8], [DATA.bike.crank + 1.8, -1.3], [DATA.bike.crank + 1.8, 1.3], [-2.4, 1.8]], s0: 0, s1: 1.6, centre: [bb[0] + u[0] * 9, side * 14, bb[2] + u[2] * 9], bias: 1 });
      const pedal = pose.legs[k].pedal;
      const sole = pose.legs[k].sole;
      parts.push({ name: `pedal${k}`, group: `leg${k}`, kind: "prism", F: { o: [pedal[0], side * 5, pedal[1]], a, u: [Math.cos(sole), 0, Math.sin(sole)], v: [-Math.sin(sole), 0, Math.cos(sole)] }, poly: [[-5, -2.4], [5, -2.4], [5, -0.2], [-5, -0.2]], s0: 0, s1: 8, centre: [pedal[0], side * 9, pedal[1] - 1.2], bias: -1 });
    }
    return parts;
  }
  let strapDone = false;
  let led = null;
  function decorate(part, g, st) {
    if (part.name === "chest" && !strapDone) {
      const L = part.profile[part.profile.length - 1][0];
      g.innerHTML = lineSvg(G.arcOf(part.F, 0.6 * L - 1.2, 12.25, P) + G.arcOf(part.F, 0.6 * L + 1.2, 12.25, P), { tone: "mid", className: "vo-strap" });
      strapDone = true;
    }
    if (part.name === "analyser" && !st.led) {
      // a status light on top of the analyser: it blinks with each breath it records
      const top = G.pointOf(part.F, 8.6, 5.0, Math.PI / 2);
      const up = iso(G.pointOf(part.F, 8.6, 5.1, Math.atan2(1, 0)), P);
      const c = iso(top, P);
      st.led = el("circle", { class: "vo-led", cx: c[0].toFixed(1), cy: c[1].toFixed(1), r: (0.9 * KS).toFixed(2) }, g);
      led = st.led;
      void up;
    }
    if (part.kind === "ball" && /^(hip|knee|ankle|shoulder|elbow|wrist)/.test(part.name)) {
      if (!st.dot) st.dot = el("circle", { class: "mq-dot", r: (1.2 * KS).toFixed(2) }, g);
      const c = iso(part.c, P);
      st.dot.setAttribute("cx", c[0].toFixed(1));
      st.dot.setAttribute("cy", c[1].toFixed(1));
    }
  }

  // ---------------------------------------------------------------- power on the flywheel cover; the spinning hub
  const FLY = DATA.bike.fly;
  const yFace = FLY.y + FLY.t / 2 + 0.02;
  const ring = (r, a0, a1) => {
    let d = "";
    const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / 0.06));
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      const p = iso([FLY.x + r * Math.cos(a), yFace, FLY.z + r * Math.sin(a)], P);
      d += `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
    }
    return d;
  };
  const A0 = (62 * Math.PI) / 180;
  const SPAN = (250 * Math.PI) / 180;
  const TRACK = ring(FLY.r - 2.8, A0, A0 + SPAN);
  function powerSvg(W) {
    // a track round the disc's rim, and an arc that sweeps up, over and round the back: full at 420 W
    const f = Math.max(0, Math.min(1, W / 420));
    const arc = f > 0.002 ? ring(FLY.r - 2.8, A0, A0 + f * SPAN) : "";
    return `<path class="vo-power-track" d="${TRACK}" style="stroke-width:${(2.6 * KS).toFixed(2)}"/><path class="vo-power" d="${arc}" style="stroke-width:${(2.6 * KS).toFixed(2)}"/>`;
  }
  function flySvg() {
    // five bolts on the crank cover turning with the cranks
    const C = DATA.bike.cover;
    return [0, 1, 2, 3, 4]
      .map((i) => {
        const a = flyAngle + (i * 2 * Math.PI) / 5;
        const p = iso([C.x + C.r * Math.cos(a), C.y, C.z + C.r * Math.sin(a)], P);
        return `<circle class="vo-hole" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${(0.9 * KS).toFixed(2)}"/>`;
      })
      .join("");
  }

  // ---------------------------------------------------------------- the tablet: VO₂ against watts
  const b0 = baseOf() / TRUTH.bm;
  const plot = vo2Plot(nodes.tablet, DATA.screen, { xMax: 420, xTicks: [100, 200, 300, 400], xLabel: "watts", guide: [[0, b0], [420, b0 + (TRUTH.slope * 420) / TRUTH.bm]] });
  function plotDraw(now, pulse) {
    const pts = [];
    const step = Math.max(1, Math.round(0.1 / T.dt));
    const last = Math.min(T.n - 1, Math.round(now / T.dt));
    for (let i = 0; i <= last; i += step) pts.push([T.W[i], T.vo2[i] / TRUTH.bm]);
    const s = sampleAt(T, now);
    pts.push([s.W, s.perKg]);
    plot.draw(pts, [s.W, s.perKg], T.ceiling, Math.min(1, Math.max(0, (now - T.tCross) / 0.5)), pulse);
  }

  // ---------------------------------------------------------------- one frame
  function render(dtReal) {
    const s = sampleAt(T, t);
    if (s.pedal) {
      theta -= dtReal * ((TRUTH.cadence / 60) * 2 * Math.PI);
      flyAngle -= dtReal * ((TRUTH.cadence / 60) * 2 * Math.PI);
    }
    const period = 60 / s.f;
    breath = (breath + dtReal / period) % 1;
    const pulse = breath < TRUTH.breath.exhale ? Math.sin((Math.PI * breath) / TRUTH.breath.exhale) : 0;
    const pose = riderAt(theta, B);
    const legs = {};
    for (const k of ["R", "L"]) {
      const L = pose.legs[k];
      legs[k] = { hip: [L.hip[0] - DATA.bike.hipX, L.hip[1]], knee: [L.knee[0] - DATA.bike.hipX, L.knee[1]], ankle: [L.ankle[0] - DATA.bike.hipX, L.ankle[1]], sole: L.sole, toe: L.toe, width: WIDTH };
    }
    const J = MANNEQUIN.skeletonOf({ base, pelvis: pose.pelvis, trunk: pose.trunk, legs, arms: pose.arms });
    const { parts } = MANNEQUIN.partsOf(J);
    view.draw([...parts, ...riderParts(pose)], J, decorate);
    if (led) led.setAttribute("fill-opacity", (0.3 + 0.7 * pulse).toFixed(2));
    nodes.power.innerHTML = powerSvg(s.W);
    nodes.fly.innerHTML = flySvg();
    plotDraw(t, pulse);
    readout(s);
  }

  // ---------------------------------------------------------------- readout
  let lastPhase = "";
  function readout(s) {
    out.w.textContent = `${Math.round(s.W)} W`;
    out.hr.textContent = `${Math.round(s.hr)} bpm`;
    out.vo2.textContent = `${s.perKg.toFixed(1)} mL/kg/min`;
    clockEl.textContent = fmt(t);
    const phaseText = { rest: "at rest", unloaded: "pedalling, no load", ramp: s.t > T.tCross ? "at the ceiling" : "on the ramp", recovery: "recovery" }[s.phase];
    stage.setAttribute("aria-valuenow", t.toFixed(1));
    stage.setAttribute("aria-valuetext", `${fmt(t)}, ${phaseText}`);
    if (phaseText !== lastPhase) {
      status.textContent = `${fmt(t)}, ${phaseText}: ${Math.round(s.W)} watts, oxygen uptake ${s.perKg.toFixed(1)} millilitres per kilogram per minute, heart rate ${Math.round(s.hr)}.`;
      lastPhase = phaseText;
    }
    if (document.activeElement !== range) range.value = String(t);
  }

  // ---------------------------------------------------------------- input, idle tour, offscreen pause, reduced motion
  const setCeiling = (c) => {
    ceiling = c;
    T = testOf(c);
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
  const TOUR = [35, 45, 25, 55];
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
    theta = 0.6;
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
    root.innerHTML = "<style>" + "\n.iso{\n  --anatomy-page:#0b0b0b;--anatomy-card:#131313;--anatomy-text:#a3a3a3;--anatomy-strong:#e6e6e6;--anatomy-muted:#6e6e6e;\n  --anatomy-paper:#131313;--anatomy-face:#1b1b1b;--anatomy-top:#1c1c1c;\n  --anatomy-shade-0:#0f0f0f;--anatomy-shade-1:#121212;--anatomy-shade-2:#151515;--anatomy-shade-3:#181818;\n  --anatomy-lit-top:#262626;--anatomy-lit-shade:#1d1d1d;\n  --anatomy-hi:#d4d4d4;--anatomy-mid:#6a6a6a;--anatomy-lo:#3e3e3e;--anatomy-faint:#2a2a2a;--anatomy-lit:#ffffff;\n  --anatomy-halo:#050505;--anatomy-halo-opacity:.9;--anatomy-dot:#e6e6e6;\n  --anatomy-red:#ff6b6b;--anatomy-green:#6be0a0;--anatomy-blue:#6b9bff;\n  --anatomy-weight:.6px;--anatomy-ease:cubic-bezier(.32,.72,0,1);\n  --anatomy-mono:ui-monospace,\"SF Mono\",Menlo,Consolas,monospace;\n  --anatomy-lift:inset 0 1px 0 0 #ffffff0a,inset 0 0 0 1px #ffffff06,0 0 0 1px #00000026,0 1px 1px -.5px #00000014,0 3px 3px -1.5px #00000014,0 6px 6px -3px #00000014,0 12px 12px -6px #00000014;\n}\n.iso[data-theme=\"light\"]{\n  --anatomy-page:#f2f2ef;--anatomy-card:#fbfbfa;--anatomy-text:#57575a;--anatomy-strong:#18181a;--anatomy-muted:#8c8c90;\n  --anatomy-paper:#fbfbfa;--anatomy-face:#ffffff;--anatomy-top:#ffffff;\n  --anatomy-shade-0:#dcdcd9;--anatomy-shade-1:#e5e5e2;--anatomy-shade-2:#ededea;--anatomy-shade-3:#f4f4f1;\n  --anatomy-lit-top:#ffffff;--anatomy-lit-shade:#eeeeeb;\n  --anatomy-hi:#26262a;--anatomy-mid:#8a8a8f;--anatomy-lo:#b4b4b8;--anatomy-faint:#d4d4d6;--anatomy-lit:#000000;\n  --anatomy-halo:#8a8a80;--anatomy-halo-opacity:.32;--anatomy-dot:#3a3a3e;\n  --anatomy-red:#e5484d;--anatomy-green:#30a46c;--anatomy-blue:#3e63dd;\n  --anatomy-lift:inset 0 1px 0 0 #ffffff,0 0 0 1px #0000000f,0 1px 1px -.5px #0000000a,0 3px 3px -1.5px #0000000a,0 6px 6px -3px #0000000a,0 12px 12px -6px #0000000a;\n}\n.iso-svg{display:block;width:100%;height:auto;overflow:visible}\n.iso-svg path,.iso-svg circle{vector-effect:non-scaling-stroke}\n.iso-fill{fill:var(--anatomy-paper);stroke:none}\n.iso-solid[data-lit]>.iso-fill{fill:var(--anatomy-face)}\n.iso-shade,.iso-top{stroke:none}\n.iso-shade[data-shade=\"0\"]{fill:var(--anatomy-shade-0)}\n.iso-shade[data-shade=\"1\"]{fill:var(--anatomy-shade-1)}\n.iso-shade[data-shade=\"2\"]{fill:var(--anatomy-shade-2)}\n.iso-shade[data-shade=\"3\"]{fill:var(--anatomy-shade-3)}\n.iso-top{fill:var(--anatomy-top)}\n.iso-solid[data-lit]>.iso-top{fill:var(--anatomy-lit-top)}\n.iso-solid[data-lit]>.iso-shade{fill:var(--anatomy-lit-shade)}\n.iso-solid[data-seamless]>.iso-shade,.iso-solid[data-seamless]>.iso-top{stroke-width:.4;stroke-linejoin:round}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"0\"]{stroke:var(--anatomy-shade-0)}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"1\"]{stroke:var(--anatomy-shade-1)}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"2\"]{stroke:var(--anatomy-shade-2)}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"3\"]{stroke:var(--anatomy-shade-3)}\n.iso-solid[data-seamless]>.iso-top{stroke:var(--anatomy-top)}\n.iso-solid[data-seamless][data-lit]>.iso-top{stroke:var(--anatomy-lit-top)}\n.iso-solid[data-seamless][data-lit]>.iso-shade{stroke:var(--anatomy-lit-shade)}\n.iso-solid[data-lit]>.iso-edge{stroke:var(--anatomy-lit)}\n.iso-halo{fill:var(--anatomy-halo);stroke:none;filter:blur(9px);opacity:var(--anatomy-halo-opacity);transform:translateY(3px)}\n.iso-line{fill:none;stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight);stroke-linecap:round;stroke-linejoin:round}\n.iso-line[data-tone=\"hi\"]{stroke:var(--anatomy-hi)}\n.iso-line[data-tone=\"mid\"]{stroke:var(--anatomy-mid)}\n.iso-line[data-tone=\"lo\"]{stroke:var(--anatomy-lo)}\n.iso-line[data-tone=\"faint\"]{stroke:var(--anatomy-faint)}\n.iso-line[data-tone=\"lit\"]{stroke:var(--anatomy-lit)}\n.iso-line[data-tone=\"red\"]{stroke:var(--anatomy-red)}\n.iso-line[data-tone=\"green\"]{stroke:var(--anatomy-green)}\n.iso-line[data-tone=\"blue\"]{stroke:var(--anatomy-blue)}\n.iso-line[data-dotted]{stroke-dasharray:.01 3.5;stroke-width:1}\n.iso-line[data-dashed]{stroke-dasharray:3 3}\n.iso-line[data-flow]{stroke-dasharray:2 6}\n.iso-wire-end{fill:var(--anatomy-paper);stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight)}\n.iso-wire[data-tone=\"hi\"] .iso-wire-end{stroke:var(--anatomy-hi)}\n.iso-wire[data-tone=\"mid\"] .iso-wire-end{stroke:var(--anatomy-mid)}\n.iso-wire[data-tone=\"faint\"] .iso-wire-end{stroke:var(--anatomy-faint)}\n.iso-wire[data-tone=\"lit\"] .iso-wire-end{stroke:var(--anatomy-lit)}\n.iso-dots circle{fill:var(--anatomy-dot);stroke:none;opacity:.32}\n.iso-dots[data-tone=\"hi\"] circle{opacity:.85}\n.iso-dots[data-tone=\"mid\"] circle{opacity:.45}\n.iso-dots[data-tone=\"lo\"] circle{opacity:.22}\n.iso-dots[data-tone=\"faint\"] circle{opacity:.12}\n.iso-face-text{fill:var(--anatomy-mid);font-family:var(--anatomy-mono);letter-spacing:.04em}\n.iso-face-text[data-tone=\"hi\"]{fill:var(--anatomy-hi)}\n.iso-face-text[data-tone=\"lo\"]{fill:var(--anatomy-lo)}\n.iso-face-text[data-tone=\"faint\"]{fill:var(--anatomy-faint)}\n.tb-body{fill:var(--anatomy-shade-2);stroke:none}\n.tb-shine{fill:var(--anatomy-top);stroke:none}\n.tb-shade{fill:var(--anatomy-shade-0);stroke:none}\n.tb-ring{fill:none;stroke:var(--anatomy-lo);stroke-width:.45;stroke-linecap:butt;stroke-linejoin:round}\n.tb-ring[data-tone=\"mid\"]{stroke:var(--anatomy-mid)}\n.tb-ring[data-tone=\"faint\"]{stroke:var(--anatomy-faint)}\n.tb-ring[data-tone=\"hi\"]{stroke:var(--anatomy-hi)}\n@keyframes iso-flow{to{stroke-dashoffset:-32}}\n@keyframes iso-pulse{0%,100%{opacity:.18}12%{opacity:1}40%{opacity:.18}}\n.iso-line[data-flow]{animation:iso-flow 1600ms linear infinite}\n.iso-dots circle[data-pulse]{animation:iso-pulse 1600ms steps(1,end) infinite;animation-delay:var(--pulse-at,0ms)}\n.iso-figure{margin:32px 0 36px}\n.iso-plate{position:relative;padding:52px 24px;border-radius:0;background:var(--anatomy-card);box-shadow:0 0 0 1px var(--anatomy-mid);--anatomy-paper:var(--anatomy-card)}\n.iso-plate-corners{position:absolute;inset:18px 20px;pointer-events:none}\n.iso-plate-corner{position:absolute;color:var(--anatomy-muted);font-family:var(--anatomy-mono);font-size:10.5px;line-height:1;letter-spacing:.04em;white-space:nowrap}\n.iso-plate-corner[data-corner=\"fig\"]{top:0;left:0;color:var(--anatomy-text)}\n.iso-plate-corner[data-corner=\"title\"]{top:0;right:0;text-transform:uppercase;letter-spacing:.1em}\n.iso-plate-corner[data-corner=\"hint\"]{bottom:0;left:0;text-transform:uppercase;letter-spacing:.1em}\n.iso-plate-corner[data-corner=\"readout\"]{right:0;bottom:0;color:var(--anatomy-text);font-variant-numeric:tabular-nums}\n.iso-plate .iso-svg{margin:0 auto}\n.iso-legend{display:grid;gap:8px;margin-top:12px;color:var(--anatomy-muted);font-size:13px;line-height:1.55}\n.iso-keys{display:flex;flex-wrap:wrap;gap:6px 18px}\n.iso-key{display:inline-flex;align-items:center;gap:7px}\n.iso-swatch{width:16px;height:10px;flex:none;overflow:visible}\n.iso-swatch path{fill:none;stroke:var(--anatomy-hi);stroke-width:1;vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round}\n.iso-swatch[data-mark=\"raised\"] path,.iso-swatch[data-mark=\"flat\"] path{stroke:var(--anatomy-mid)}\n.iso-swatch[data-mark=\"lit\"] path{stroke:var(--anatomy-lit)}\n.iso-swatch[data-mark=\"dim\"] path{stroke:var(--anatomy-lo)}\n.iso-swatch[data-mark=\"dotted\"] path{stroke-dasharray:.01 3;stroke-width:1.4}\n.iso-swatch[data-mark=\"dashed\"] path{stroke-dasharray:3 2.5}\n.iso-swatch[data-mark=\"red\"] path{stroke:var(--anatomy-red)}\n.iso-swatch[data-mark=\"green\"] path{stroke:var(--anatomy-green)}\n.iso-swatch[data-mark=\"blue\"] path{stroke:var(--anatomy-blue)}\n.iso-swatch-crease{stroke:var(--anatomy-lo)!important}\n@media (max-width:560px){.iso-plate{padding:48px 12px 70px}.iso-plate-corner[data-corner=\"hint\"]{bottom:18px}}\n@media (prefers-reduced-motion:reduce){.iso-line[data-flow],.iso-dots circle[data-pulse]{animation:none}}\n/*\n * Optimal theme for Anatomy figures.\n *\n * Load AFTER the kit's ISO_CSS. Put `class=\"iso optimal\"` on the wrapper:\n *   - no data-theme  -> \"Forest night\"  (exam-room TV, dark)\n *   - data-theme=\"light\" -> \"Cream\"     (beoptimal.ca, the primary target)\n *\n * Values come from the live site (beoptimal-landing src/index.css), the\n * Performance package design and the ALE visualizer spec. The kit's grey\n * ramps are warmed so solids sit on the site's cream paper, and the single\n * \"lit\" accent is Optimal forest green instead of pure black/white.\n */\n\n.iso.optimal {\n  /* Forest night (dark) */\n  --anatomy-page: #152511;\n  --anatomy-card: #1c3118;\n  --anatomy-text: #c9cdbf;\n  --anatomy-strong: #fffcf7;\n  --anatomy-muted: #8e9884;\n  --anatomy-paper: #1c3118;\n  --anatomy-face: #253821;\n  --anatomy-top: #283c24;\n  --anatomy-shade-0: #172812;\n  --anatomy-shade-1: #1a2c16;\n  --anatomy-shade-2: #1e321a;\n  --anatomy-shade-3: #22371e;\n  --anatomy-lit-top: #34492f;\n  --anatomy-lit-shade: #2a3f26;\n  --anatomy-hi: #e9e6dc;\n  --anatomy-mid: #7e8a74;\n  --anatomy-lo: #4d5c46;\n  --anatomy-faint: #33452e;\n  --anatomy-lit: #fffcf7;\n  --anatomy-halo: #0b1508;\n  --anatomy-halo-opacity: 0.9;\n  --anatomy-dot: #e9e6dc;\n  --anatomy-red: #e0745f;\n  --anatomy-green: #8cc67f;\n  --anatomy-blue: #7fa8d9;\n  --anatomy-mono: \"JetBrains Mono\", ui-monospace, \"SF Mono\", Menlo, Consolas, monospace;\n\n  /* Optimal extras (use sparingly; colour only when colour is the subject) */\n  --opt-display: \"Castoro\", Georgia, serif;\n  --opt-ui: \"Public Sans\", system-ui, sans-serif;\n  --opt-forest: #2c4e25;\n  --opt-forest-light: #519044;\n  --opt-sage: #5e7a59;\n  --opt-borderline: #c97b2d;\n  --opt-out: #b3402f;\n  --opt-heat: #ff9776;\n}\n\n.iso.optimal[data-theme=\"light\"] {\n  /* Cream (light) */\n  --anatomy-page: #fef8f1;\n  --anatomy-card: #fffcf7;\n  --anatomy-text: #3e3d39;\n  --anatomy-strong: #252525;\n  --anatomy-muted: #716e68; /* 4.97:1 on the cream card (was 4.46:1 for the legend) */\n  --anatomy-paper: #fffcf7;\n  --anatomy-face: #fffefb;\n  --anatomy-top: #fffefb;\n  --anatomy-shade-0: #ddd7cc;\n  --anatomy-shade-1: #e7e2d9;\n  --anatomy-shade-2: #f0ede5;\n  --anatomy-shade-3: #f6f3ec;\n  --anatomy-lit-top: #fffefb;\n  --anatomy-lit-shade: #efebe2;\n  --anatomy-hi: #252525;\n  --anatomy-mid: #8a867e;\n  --anatomy-lo: #b9b4aa;\n  --anatomy-faint: #d9d3c8;\n  --anatomy-lit: #2c4e25;\n  --anatomy-halo: #8a8070;\n  --anatomy-halo-opacity: 0.3;\n  --anatomy-dot: #3a3833;\n  --anatomy-red: #b3402f;\n  --anatomy-green: #3f7a35;\n  --anatomy-blue: #3e6a8f;\n}\n\n/* Card typography: brand fonts for titles and readouts, kit mono for plate corners */\n.iso.optimal .iso-plate-title,\n.iso.optimal [data-role=\"title\"] {\n  font-family: var(--opt-display);\n  letter-spacing: -0.02em;\n}\n.iso.optimal [data-role=\"readout\"],\n.iso.optimal .iso-readout {\n  font-family: var(--opt-ui);\n  font-feature-settings: \"tnum\" 1, \"ss01\" 1;\n}\n\n/*\n * Card layout for Optimal figures (shared/page.mjs `plate`).\n * Phone first: the drawing, then a row of real buttons (>=44 px), then a footer\n * where the hint and the readout wrap instead of overlapping at 320 px.\n */\n.iso.optimal {\n  --opt-rule: rgba(233, 230, 220, 0.16);\n  --opt-btn: rgba(233, 230, 220, 0.06);\n  --opt-btn-on: #e9e6dc;\n  --opt-btn-on-text: #1c3118;\n  --opt-title: #fffcf7;\n  --opt-fig: #8cc67f;\n  --opt-heat-ink: #ff9776;\n  --opt-heat-glow: rgba(255, 151, 118, 0.55);\n  --opt-heat-wash: rgba(255, 151, 118, 0.16);\n  --opt-cold-ink: #9cc3e6;\n}\n.iso.optimal[data-theme=\"light\"] {\n  --opt-rule: rgba(44, 78, 37, 0.2);\n  --opt-btn: #fffcf7;\n  --opt-btn-on: #2c4e25;\n  --opt-btn-on-text: #fffcf7;\n  --opt-title: #2c4e25;\n  --opt-fig: #5e7a59;\n  --opt-heat-ink: #c8552e;\n  --opt-heat-glow: rgba(232, 108, 64, 0.42);\n  --opt-heat-wash: rgba(255, 151, 118, 0.22);\n  --opt-cold-ink: #3e6a8f;\n}\n.iso.optimal .opt-plate {\n  padding: 52px 24px 20px;\n  box-shadow: 0 0 0 1px var(--opt-rule);\n  border-radius: 2px;\n}\n.iso.optimal .iso-plate-corner[data-corner=\"fig\"] {\n  font-family: var(--opt-display);\n  font-style: italic;\n  font-size: 15px;\n  letter-spacing: 0;\n  color: var(--opt-fig);\n  top: -2px;\n}\n.iso.optimal .iso-plate-corner[data-corner=\"title\"] {\n  font-family: var(--opt-display);\n  font-size: 17px;\n  text-transform: none;\n  letter-spacing: -0.01em;\n  color: var(--opt-title);\n  top: -4px;\n}\n.iso.optimal .opt-controls {\n  display: flex;\n  flex-wrap: wrap;\n  justify-content: center;\n  gap: 8px 12px;\n  margin: 10px 0 0;\n}\n.iso.optimal .opt-seg {\n  display: inline-flex;\n  border-radius: 999px;\n  box-shadow: inset 0 0 0 1px var(--opt-rule);\n  padding: 3px;\n  gap: 2px;\n  max-width: 100%;\n}\n.iso.optimal .opt-seg-btn {\n  appearance: none;\n  border: 0;\n  margin: 0;\n  min-height: 44px;\n  min-width: min-content; /* never shrink a label below its longest word (with the padding, always ≥ 44 px) */\n  padding: 0 16px;\n  border-radius: 999px;\n  background: transparent;\n  color: var(--anatomy-text);\n  font: 500 14px/1.1 var(--opt-ui);\n  letter-spacing: 0;\n  cursor: pointer;\n  touch-action: manipulation;\n  -webkit-tap-highlight-color: transparent;\n  transition: background-color 240ms var(--anatomy-ease), color 240ms var(--anatomy-ease);\n}\n/* A zero-height 30 px strut keeps every option at least 44 px wide, even \"Arm\", \"Leg\" or \"+5%\" with the\n   7 px padding below 350 px (min-content alone let them shrink to 36 px). */\n.iso.optimal .opt-seg-btn::after {\n  content: \"\";\n  display: block;\n  width: 30px;\n  height: 0;\n  margin: 0 auto;\n}\n.iso.optimal .opt-seg-btn[aria-checked=\"true\"] {\n  background: var(--opt-btn-on);\n  color: var(--opt-btn-on-text);\n}\n.iso.optimal .opt-seg-btn:focus-visible {\n  outline: 2px solid var(--opt-fig);\n  outline-offset: 2px;\n}\n.iso.optimal .opt-foot {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: flex-end;\n  justify-content: space-between;\n  gap: 10px 20px;\n  margin-top: 16px;\n}\n.iso.optimal .opt-hint {\n  font-family: var(--anatomy-mono);\n  font-size: 10.5px;\n  line-height: 1.4;\n  letter-spacing: 0.1em;\n  text-transform: uppercase;\n  color: var(--anatomy-muted);\n  flex: 1 1 160px;\n  min-width: 0;\n}\n.iso.optimal .opt-readout {\n  display: grid;\n  grid-auto-flow: column;\n  gap: 4px 18px;\n  margin: 0;\n  font-family: var(--opt-ui);\n  font-feature-settings: \"tnum\" 1;\n}\n.iso.optimal .opt-stat { margin: 0; min-width: 0; }\n.iso.optimal .opt-stat dt {\n  font-size: 10px;\n  font-weight: 600;\n  letter-spacing: 0.12em;\n  text-transform: uppercase;\n  color: var(--anatomy-muted);\n  white-space: nowrap;\n}\n.iso.optimal .opt-stat dd {\n  margin: 1px 0 0;\n  font-size: 15px;\n  font-weight: 500;\n  color: var(--anatomy-strong);\n  white-space: nowrap;\n}\n.iso.optimal .iso-legend { font-family: var(--opt-ui); font-size: 13.5px; }\n.iso.optimal .iso-caption { color: var(--anatomy-text); }\n.iso.optimal .iso-caption em { font-style: italic; }\n.iso.optimal .iso-swatch[data-mark=\"heat\"] path { stroke: var(--opt-heat-ink); stroke-width: 2; }\n.iso.optimal .iso-stage { outline: none; border-radius: 4px; touch-action: pan-y; -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none; }\n.iso.optimal .iso-stage:focus-visible { outline: 1px solid var(--anatomy-muted); outline-offset: 6px; }\n@media (max-width: 560px) {\n  .iso.optimal .opt-plate { padding: 44px 10px 14px; }\n  .iso.optimal .iso-plate-corners { inset: 16px 12px; }\n  .iso.optimal .opt-readout { grid-auto-flow: row; grid-template-columns: repeat(4, minmax(0, auto)); width: 100%; justify-content: space-between; gap: 4px 10px; order: -1; }\n  .iso.optimal .opt-stat dd { font-size: 14px; }\n  /* a long label wraps onto two lines instead of running into its neighbour; values stay on one baseline */\n  .iso.optimal .opt-stat { display: flex; flex-direction: column; justify-content: space-between; }\n  .iso.optimal .opt-stat dt { white-space: normal; line-height: 1.25; }\n  .iso.optimal .opt-seg-btn { padding: 0 12px; font-size: 13.5px; }\n}\n@media (max-width: 350px) {\n  .iso.optimal .opt-seg-btn { padding: 0 7px; font-size: 12.5px; }\n  .iso.optimal .opt-stat dt { font-size: 9px; letter-spacing: 0.08em; }\n  .iso.optimal .opt-stat dd { font-size: 13px; }\n}\n\n:host{display:block}\n.opt-host{background:transparent;color:var(--anatomy-text);font:15px/1.6 var(--opt-ui);-webkit-font-smoothing:antialiased}\n.opt-host *{box-sizing:border-box}\n.opt-host .iso-figure{margin:0}\n/* The mannequin (shared/mannequin.mjs): turned wood segments, steel ball joints, tracking dots. */\n.iso.optimal {\n  /* Forest night: dark walnut, so the figure sits in the room rather than glowing */\n  --mq-face: #6b5a44;\n  --mq-shade-0: #3f3326;\n  --mq-shade-1: #4b3d2d;\n  --mq-shade-2: #574735;\n  --mq-shade-3: #63523e;\n  --mq-top: #7a684f;\n  --mq-edge: #e9e6dc;\n}\n.iso.optimal[data-theme=\"light\"] {\n  /* Cream: pale beech */\n  --mq-face: #f3e6cf;\n  --mq-shade-0: #cdb592;\n  --mq-shade-1: #d9c4a3;\n  --mq-shade-2: #e4d2b5;\n  --mq-shade-3: #ecdec5;\n  --mq-top: #f8eedc;\n  --mq-edge: #3e3d39;\n}\n.mq-wood {\n  --anatomy-face: var(--mq-face);\n  --anatomy-paper: var(--mq-face);\n  --anatomy-shade-0: var(--mq-shade-0);\n  --anatomy-shade-1: var(--mq-shade-1);\n  --anatomy-shade-2: var(--mq-shade-2);\n  --anatomy-shade-3: var(--mq-shade-3);\n  --anatomy-top: var(--mq-top);\n}\n.mq-dot { fill: var(--anatomy-lit); stroke: var(--anatomy-card); stroke-width: 0.5; }\n.mq-glow { fill: var(--opt-heat); stroke: none; }\n.mq-glow-ring { fill: none; stroke: var(--opt-heat-ink); stroke-width: 0.6; }\n/* The assessor's tablet (shared/assessor.mjs) and its live screen (shared/vo2-plot.js). */\n.iso.optimal { --as-screen: #0f1b0c; --as-ink: #c9e3c1; --as-dim: #4f6b48; }\n.iso.optimal[data-theme=\"light\"] { --as-screen: #1d2a1a; --as-ink: #d9efd2; --as-dim: #5d7a56; }\n.as-screen { fill: var(--as-screen); }\n.vp-grid { fill: none; stroke: var(--as-dim); stroke-width: 0.22; opacity: 0.55; }\n.vp-axis { fill: none; stroke: var(--as-dim); stroke-width: 0.35; }\n.vp-guide { fill: none; stroke: var(--as-dim); stroke-width: 0.35; stroke-dasharray: 0.9 0.9; }\n.vp-ceiling { fill: none; stroke: var(--opt-heat); stroke-width: 0.4; stroke-dasharray: 1 0.7; }\n.vp-trace { fill: none; stroke: var(--opt-heat); stroke-width: 0.6; stroke-linejoin: round; stroke-linecap: round; }\n.vp-dot { fill: var(--as-ink); }\n.vp-tick { fill: var(--as-dim); font-family: var(--opt-ui); font-weight: 500; }\n.vp-big { fill: var(--as-ink); font-family: var(--opt-ui); font-weight: 600; font-feature-settings: \"tnum\" 1; }\n.vp-unit { fill: var(--as-dim); font-family: var(--opt-ui); font-weight: 500; }\n.vp-breath { fill: var(--as-ink); }\n/* Fig 5 · clear tubing and glass, the cart's screens, the breath layer. */\n.iso.optimal { --vo-screen: #0f1b0c; --vo-ink: #c9e3c1; --vo-dim: #4f6b48; --vo-glass: rgba(201, 227, 193, 0.10); --vo-glass-edge: #8e9884; }\n.iso.optimal[data-theme=\"light\"] { --vo-screen: #1d2a1a; --vo-ink: #d9efd2; --vo-dim: #5d7a56; --vo-glass: rgba(44, 78, 37, 0.06); --vo-glass-edge: #76736d; }\n.vo-stage { position: relative; }\n.vo-gl, .vo-front { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }\n.iso.optimal:not([data-theme=\"light\"]) .vo-gl { mix-blend-mode: screen; }\n.vo-stage[data-gl] .vo-fallback { display: none; }\n.vo-glass .iso-fill, .vo-glass .iso-top, .vo-glass .iso-shade { fill: var(--vo-glass); stroke: none; }\n.vo-hose .tb-body { fill: var(--vo-glass); }\n.vo-hose .tb-shine, .vo-hose .tb-shade { opacity: 0.35; }\n.vo-screen { fill: var(--vo-screen); }\n.vo-window { fill: var(--anatomy-shade-0); }\n.vo-level { fill: var(--anatomy-lit); }\n.vo-cell-label { fill: var(--anatomy-strong); font-family: var(--opt-ui); font-weight: 600; }\n.vo-grid { fill: none; stroke: var(--vo-dim); stroke-width: 0.25; opacity: 0.5; }\n.vo-axis { fill: none; stroke: var(--vo-dim); stroke-width: 0.4; }\n.vo-guide { fill: none; stroke: var(--vo-dim); stroke-width: 0.4; stroke-dasharray: 1 1; }\n.vo-ceiling { fill: none; stroke: var(--opt-heat); stroke-width: 0.45; stroke-dasharray: 1.2 0.8; }\n.vo-trace { fill: none; stroke: var(--opt-heat); stroke-width: 0.7; stroke-linejoin: round; stroke-linecap: round; }\n.vo-dot { fill: var(--vo-ink); }\n.vo-tick { fill: var(--vo-dim); font-family: var(--opt-ui); font-weight: 500; }\n.vo-strap { stroke-width: 1.6; }\n.vo-hole { fill: var(--anatomy-shade-1); stroke: var(--anatomy-lo); stroke-width: 0.4; }\n.vo-vane { fill: none; stroke: var(--anatomy-mid); stroke-width: 1.2; stroke-linecap: round; }\n.vo-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }\n.vo-par { display: block; margin-top: 6px; }\n.vo-par:first-child { margin-top: 0; }\n.vo-par small { font-size: 12.5px; color: var(--anatomy-muted); }\n.vo-scrub { display: flex; align-items: center; gap: 12px; margin: 10px 4px 0; }\n.vo-play { appearance: none; border: 0; min-height: 44px; min-width: 72px; padding: 0 16px; border-radius: 999px; background: transparent; box-shadow: inset 0 0 0 1px var(--opt-rule); color: var(--anatomy-text); font: 500 14px/1 var(--opt-ui); cursor: pointer; touch-action: manipulation; }\n.vo-play:focus-visible { outline: 2px solid var(--opt-fig); outline-offset: 2px; }\n.vo-clock { font: 500 13px/1 var(--opt-ui); color: var(--anatomy-muted); min-width: 40px; text-align: right; font-feature-settings: \"tnum\" 1; }\n.vo-range { flex: 1; min-width: 0; height: 44px; margin: 0; background: transparent; accent-color: var(--opt-btn-on); -webkit-appearance: none; appearance: none; touch-action: pan-y; }\n.vo-range::-webkit-slider-runnable-track { height: 4px; border-radius: 2px; background: var(--opt-rule); }\n.vo-range::-moz-range-track { height: 4px; border-radius: 2px; background: var(--opt-rule); }\n.vo-range::-webkit-slider-thumb { -webkit-appearance: none; width: 28px; height: 28px; margin-top: -12px; border-radius: 50%; background: var(--opt-btn-on); border: 3px solid var(--anatomy-card); box-shadow: 0 0 0 1px var(--opt-rule); }\n.vo-range::-moz-range-thumb { width: 24px; height: 24px; border-radius: 50%; background: var(--opt-btn-on); border: 3px solid var(--anatomy-card); }\n.vo-range:focus-visible { outline: 2px solid var(--opt-fig); outline-offset: 2px; }\n.vo-led { fill: var(--anatomy-lit); stroke: var(--anatomy-card); stroke-width: 0.4; }\n.vo-power-track { fill: none; stroke: var(--anatomy-shade-1); stroke-linecap: round; opacity: 0.9; }\n.vo-power { fill: none; stroke: var(--opt-heat-ink); stroke-linecap: round; }\n" + "</style><div class=\"iso optimal opt-host\" data-theme=\"" + theme + "\">" + "<figure class=\"iso-figure opt-figure \"><div class=\"iso-plate opt-plate\"><div class=\"iso-plate-corners\" aria-hidden=\"true\"><span class=\"iso-plate-corner\" data-corner=\"fig\">Fig 5</span><span class=\"iso-plate-corner\" data-corner=\"title\">The ramp and the mask</span></div><div class=\"iso-stage vo-stage\" tabindex=\"0\" role=\"slider\" aria-label=\"Minutes into the test. Left and right arrows move 15 seconds, Page Up and Down a minute, Space plays or pauses.\" aria-valuemin=\"0\" aria-valuemax=\"20.6\" aria-valuenow=\"0\" aria-valuetext=\"0:00, at rest\"><svg xmlns=\"http://www.w3.org/2000/svg\" class=\"iso-svg\" viewBox=\"0 0 600 602\" role=\"img\" aria-label=\"A smart training bike with a large covered flywheel at the rear, and a wooden artist's mannequin pedalling it, wearing a face mask with a small wireless breath analyser on the front. A glowing arc on the flywheel cover grows as the ramp adds watts. Beside the bike an assessor stands holding a tablet, which plots the oxygen the rider uses against the watts: a straight line that flattens at the person's ceiling, the VO2max.\"><path class=\"iso-halo\" d=\"M19.1 496.8L19.2 494.2L20.7 491.6L23.5 489.1L27.5 486.9L113.3 448.6L118.4 446.7L124.4 445.2L131 444.2L138.1 443.7L145.2 443.8L152.2 444.3L158.8 445.4L164.6 446.9L425 528.7L430 530.6L433.9 532.9L436.6 535.4L437.9 538L437.9 538.3L437.8 540.9L436.4 543.6L433.6 546L429.5 548.2L343.7 586.6L338.6 588.4L332.6 589.9L326 590.9L319 591.4L311.8 591.3L304.8 590.8L298.3 589.7L292.4 588.2L32 506.4L27 504.5L23.1 502.2L20.4 499.8L19.1 497.1Z\"/><g class=\"it\" data-name=\"stand.rear\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M58.9 490.7L61.6 488.6L163 443.3L168.1 442L174.4 441.8L180.1 442.8L194 447.1L197.6 449.1L198.2 451.4L198.2 466.6L195.5 468.7L94.1 514L89 515.4L82.7 515.6L77 514.6L63 510.2L59.4 508.3L58.9 505.9Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M198.2 466.6L195.5 468.7L195.5 453.6L198.2 451.4ZM195.5 468.7L94.1 514L94.1 498.8L195.5 453.6ZM94.1 514L89 515.4L89 500.2L94.1 498.8Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M89 515.4L82.7 515.6L82.7 500.4L89 500.2Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M82.7 515.6L77 514.6L77 499.4L82.7 500.4Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M77 514.6L63 510.2L63 495L77 499.4ZM63 510.2L59.4 508.3L59.4 493.1L63 495ZM59.4 508.3L58.9 505.9L58.9 490.7L59.4 493.1Z\"/><path class=\"iso-top\" d=\"M194 447.1L197.6 449.1L198.2 451.4L195.5 453.6L94.1 498.8L89 500.2L82.7 500.4L77 499.4L63 495L59.4 493.1L58.9 490.7L61.6 488.6L163 443.3L168.1 442L174.4 441.8L180.1 442.8Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M198.2 451.4L195.5 453.6L94.1 498.8L89 500.2L82.7 500.4L77 499.4L63 495L59.4 493.1L58.9 490.7\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M198.2 451.4L194.5 453.3L93.3 498.5L88.5 499.8L82.9 499.9L77.6 499L63.9 494.7L60.6 492.9L58.9 490.7\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M198.3 458.7L94.1 506.4L83.5 508L63 502.6L58.8 498.6\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M58.9 490.7L61.6 488.6L163 443.3L168.1 442L174.4 441.8L180.1 442.8L194 447.1L197.6 449.1L198.2 451.4M198.2 466.6L195.5 468.7L94.1 514L89 515.4L82.7 515.6L77 514.6L63 510.2L59.4 508.3L58.9 505.9M198.2 451.4L198.2 466.6M58.9 490.7L58.9 505.9\"/></g></g><g class=\"it\" data-name=\"fly.post\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M116.4 459.3L117.1 457.7L119.2 456.3L122.5 455.3L126.4 454.8L130.7 454.8L134.6 455.3L137.8 456.3L140 457.7L140.7 459.3L140.7 472.2L140 473.8L137.8 475.1L134.6 476.1L130.7 476.7L126.4 476.7L122.5 476.1L119.2 475.1L117.1 473.8L116.4 472.2Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M137.8 475.1L134.6 476.1L134.6 463.2L137.8 462.2ZM140.7 472.2L140 473.8L140 460.8L140.7 459.3ZM140 473.8L137.8 475.1L137.8 462.2L140 460.8Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M134.6 476.1L130.7 476.7L130.7 463.7L134.6 463.2Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M130.7 476.7L126.4 476.7L126.4 463.7L130.7 463.7ZM126.4 476.7L122.5 476.1L122.5 463.2L126.4 463.7Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M122.5 476.1L119.2 475.1L119.2 462.2L122.5 463.2ZM119.2 475.1L117.1 473.8L117.1 460.8L119.2 462.2ZM117.1 473.8L116.4 472.2L116.4 459.3L117.1 460.8Z\"/><path class=\"iso-top\" d=\"M137.8 462.2L134.6 463.2L130.7 463.7L126.4 463.7L122.5 463.2L119.2 462.2L117.1 460.8L116.4 459.3L117.1 457.7L119.2 456.3L122.5 455.3L126.4 454.8L130.7 454.8L134.6 455.3L137.8 456.3L140 457.7L140.7 459.3L140 460.8Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M140.7 459.3L140 460.8L137.8 462.2L134.6 463.2L130.7 463.7L126.4 463.7L122.5 463.2L119.2 462.2L117.1 460.8L116.4 459.3\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M116.4 459.3L117.1 457.7L119.2 456.3L122.5 455.3L126.4 454.8L130.7 454.8L134.6 455.3L137.8 456.3L140 457.7L140.7 459.3M140.7 472.2L140 473.8L137.8 475.1L134.6 476.1L130.7 476.7L126.4 476.7L122.5 476.1L119.2 475.1L117.1 473.8L116.4 472.2M116.4 459.3L116.4 472.2M140.7 459.3L140.7 472.2\"/></g></g><g class=\"it\" data-name=\"fly.housing\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M65.4 379.9L65.4 378.5L65.4 377.2L65.5 375.8L65.6 374.5L65.7 373.1L65.8 371.8L65.8 371.4L66 370.1L66.2 368.8L66.4 367.5L66.6 366.2L66.8 365L67.1 363.7L67.4 362.5L67.7 361.2L68 360L68.4 358.8L68.7 357.7L69.1 356.5L69.6 355.3L70 354.2L70.5 353.1L71 352L71.5 350.9L72 349.9L72.5 348.9L73.1 347.9L73.7 346.9L74.3 345.9L74.9 344.9L75.6 344L76.2 343.1L76.9 342.2L77.6 341.4L78.4 340.5L79.1 339.7L79.9 338.9L80.6 338.2L81.4 337.4L82.2 336.7L83.9 335.3L84.7 334.6L85.5 334L86.4 333.3L87.3 332.7L88.2 332.1L89.1 331.6L90 331L90.9 330.5L91.9 330L92.8 329.6L104.5 324.4L105.5 323.9L106.5 323.6L107.5 323.2L108.5 322.8L109.5 322.5L110.6 322.3L111.6 322L112.6 321.8L113.7 321.6L114.8 321.4L116.9 321.1L118 321L119 320.9L120.1 320.8L121.2 320.8L122.3 320.7L123.4 320.8L124.5 320.8L125.6 320.9L126.7 321L127.9 321.1L129 321.2L130.1 321.4L131.2 321.6L132.4 321.9L133.5 322.2L134.6 322.5L135.8 322.8L136.9 323.1L138.1 323.5L139.2 323.9L140.3 324.4L141.5 324.9L142.6 325.4L143.7 325.9L144.8 326.4L146 327L147.1 327.6L148.2 328.2L149.3 328.9L150.4 329.6L151.5 330.3L152.6 331L153.7 331.8L154 332L155.1 332.8L156.1 333.6L157.2 334.4L158.2 335.3L159.3 336.1L160.3 337L161.3 337.9L162.3 338.9L163.3 339.8L164.3 340.8L165.2 341.8L166.2 342.8L167.2 343.9L168.1 344.9L169 346L169.9 347.1L170.8 348.2L171.7 349.3L172.5 350.5L173.4 351.7L174.2 352.8L175 354L175.8 355.2L176.6 356.5L177.4 357.7L178.1 359L178.9 360.2L179.6 361.5L180.3 362.8L181 364.1L181.6 365.4L182.3 366.7L182.9 368.1L183.5 369.4L184.1 370.8L184.6 372.1L185.2 373.5L185.7 374.9L186.2 376.2L186.7 377.6L187.2 379L187.6 380.4L188 381.8L188.4 383.2L188.8 384.6L189.1 386L189.5 387.4L189.8 388.8L190.1 390.2L190.3 391.7L190.6 393.1L190.8 394.5L191 395.9L191.2 397.3L191.3 398.7L191.4 400.1L191.5 401.5L191.6 402.8L191.7 404.2L191.7 405.6L191.7 407L191.7 408.3L191.7 409.7L191.6 411L191.5 412.4L191.4 413.7L191.3 415L191.3 415.4L191.1 416.7L190.9 418L190.7 419.3L190.5 420.6L190.3 421.9L190 423.1L189.7 424.4L189.4 425.6L189.1 426.8L188.7 428L188.3 429.2L187.9 430.3L187.5 431.5L187.1 432.6L186.6 433.7L186.1 434.8L185.6 435.9L185.1 436.9L184.5 438L184 439L183.4 440L182.8 440.9L182.2 441.9L181.5 442.8L180.8 443.7L180.2 444.6L179.5 445.5L178.7 446.3L178 447.1L177.2 447.9L176.5 448.7L175.7 449.4L174.9 450.1L173.2 451.5L172.4 452.2L171.6 452.9L170.7 453.5L169.8 454.1L168.9 454.7L168 455.3L167.1 455.8L166.2 456.3L165.2 456.8L164.3 457.2L152.6 462.5L151.6 462.9L150.6 463.3L149.6 463.7L148.6 464L147.6 464.3L146.5 464.6L145.5 464.8L144.4 465.1L143.4 465.3L142.3 465.4L140.2 465.7L139.1 465.8L138.1 466L137 466L135.9 466.1L134.8 466.1L133.7 466.1L132.6 466L131.5 466L130.4 465.9L129.2 465.7L128.1 465.6L127 465.4L125.8 465.2L124.7 464.9L123.6 464.7L122.4 464.4L121.3 464L120.2 463.7L119 463.3L117.9 462.9L116.8 462.4L115.6 462L114.5 461.5L113.4 461L112.3 460.4L111.1 459.8L110 459.2L108.9 458.6L107.8 457.9L106.7 457.3L105.6 456.6L104.5 455.8L103.4 455.1L103.1 454.8L102 454L101 453.2L99.9 452.4L98.9 451.6L97.8 450.7L96.8 449.8L95.8 448.9L94.8 448L93.8 447L92.8 446L91.8 445L90.9 444L89.9 443L89 441.9L88.1 440.8L87.2 439.7L86.3 438.6L85.4 437.5L84.5 436.3L83.7 435.2L82.9 434L82 432.8L81.2 431.6L80.5 430.4L79.7 429.1L78.9 427.9L78.2 426.6L77.5 425.3L76.8 424L76.1 422.7L75.5 421.4L74.8 420.1L74.2 418.8L73.6 417.4L73 416.1L72.4 414.7L71.9 413.3L71.4 412L70.9 410.6L70.4 409.2L69.9 407.8L69.5 406.4L69.1 405L68.7 403.6L68.3 402.2L68 400.8L67.6 399.4L67.3 398L67 396.6L66.8 395.2L66.5 393.8L66.3 392.4L66.1 391L65.9 389.6L65.8 388.2L65.7 386.8L65.6 385.4L65.5 384L65.4 382.6L65.4 381.2Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M191.6 409.9L191.6 409.9L177.6 358.3L179.6 361.8L181.5 365.5L183.3 369.2L184.9 373L186.3 376.8L187.6 380.7L188.7 384.6L189.6 388.5L190.4 392.5L191 396.4L191.4 400.3L191.6 404.2L191.7 408L191.6 411.8L191.3 415.5L190.8 419.1L190.1 422.6L189.3 426L188.3 429.3L187.1 432.5L185.8 435.5L184.3 438.4L182.7 441.1L180.9 443.7L178.9 446.1L176.9 448.3L174.6 450.3ZM174.4 450.6L174.2 450.9L173.9 451.1L173.6 451.3L173.3 451.5L173 451.7L164.1 457.3L162.1 458.2L160.2 459.1L158.2 459.9L156.3 460.8L154.3 461.7L152.4 462.5L142.2 465.4L141.9 465.6L141.6 465.6L141.2 465.7L140.9 465.7L140.5 465.7L140.1 465.7L79.5 428.6L82 432.6L84.6 436.4L90.2 443.3L96 449.1L102 453.9L108.1 457.8L114.3 460.7L120.5 462.7L126.9 463.7L133.6 463.7L137.5 463.2L139.7 462.7L142.6 461.8L144.8 461L147.3 460L149.7 458.8L151.8 457.6L154.4 455.9L156.3 454.5L159.4 451.9L164.2 446.6L167.9 440.9L170.8 434.8L173 428L174.5 420.7L175.1 412.8L174.9 404.4L173.8 395.6L172.8 391L171.6 386.4L171.6 386.4L171.6 384.9L171.5 383.3L171.3 381.4L170.9 379.3L170.4 377L169.7 374.5L169.7 374.5L171.7 373.6L173.6 372.7L175.6 371.9L177.5 371L179.5 370.1L181.4 369.3L181.4 369.3L180.7 366.8L179.9 364.6L179.2 362.7L178.6 361L178.1 359.5L177.6 358.3L179.6 361.8L181.5 365.5L183.3 369.2L184.9 373L186.3 376.8L187.6 380.7L188.7 384.6L189.6 388.5L190.4 392.5L191 396.4L191.4 400.3L191.6 404.2L191.7 408L191.6 411.8L191.3 415.5L190.8 419.1L190.1 422.6L189.3 426L188.3 429.3L187.1 432.5L185.8 435.5L184.3 438.4L182.7 441.1L180.9 443.7L178.9 446.1L176.9 448.3L174.6 450.3ZM147.3 459.9L147.3 459.9L149.7 458.8L147.3 460L144.8 461Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M172.8 351L172.8 351L167.5 344.4L169.7 347L171.8 349.7L173.8 352.4L175.8 355.3L177.6 358.3ZM178.1 359.5L178.6 361L179.2 362.7L179.9 364.6L180.7 366.8L181.4 369.3L181.4 369.3L179.5 370.1L177.5 371L175.6 371.9L173.6 372.7L171.7 373.6L169.7 374.5L169.7 374.5L170.4 377L170.9 379.3L171.3 381.4L171.5 383.3L171.6 384.9L171.6 386.4L170.5 383.2L169.3 380L168 376.9L166.6 373.8L165.1 370.8L165 369.6L164.8 368.2L164.4 366.6L163.8 364.8L163 362.7L162 360.4L162 360.4L163.9 359.6L165.9 358.7L167.8 357.8L169.8 357L171.7 356.1L173.7 355.2L173.7 355.2L172.5 352.9L171.4 350.8L170.3 348.8L169.2 347.1L168.3 345.6L167.5 344.4L169.7 347L171.8 349.7L173.8 352.4L175.8 355.3L177.6 358.3ZM171.6 386.4L170.5 383.2L169.3 380L168 376.9L166.6 373.8L165.1 370.8L165.1 370.8L166.6 373.8L168 376.9L169.3 380L170.5 383.2L171.6 386.4ZM75.5 421.2L75.5 421.2L79.5 428.6L77.8 425.7L76.2 422.7L74.7 419.7L73.4 416.6L72.1 413.5ZM73.5 417L74.9 420.2L77.6 425.6L80.2 430L82.7 433.6L84.9 436.6L87 439.1L88.9 441L90.5 442.6L91.9 443.7L92.5 444.2L92.8 444.4L93 444.5L93.1 444.6L95.8 447.2L98.5 449.5L101.3 451.7L104.2 453.8L107.1 455.6L110 457.3L113 458.7L116 460L119 461.1L122 461.9L125 462.5L127.9 463L130.9 463.2L133.8 463.2L136.7 463L139.5 462.5L142.2 461.9L144.8 461L142.6 461.8L139.7 462.7L137.5 463.2L133.6 463.7L126.9 463.7L120.5 462.7L114.3 460.7L108.1 457.8L102 453.9L96 449.1L90.2 443.3L84.6 436.4L82 432.6L79.5 428.6L77.8 425.7L76.2 422.7L74.7 419.7L73.4 416.6L72.1 413.5ZM172.8 391L173.8 395.6L174.9 404.4L175.1 412.8L174.5 420.7L173 428L170.8 434.8L167.9 440.9L164.2 446.6L159.4 451.9L156.3 454.5L154.4 455.9L151.8 457.6L149.7 458.8L152.1 457.3L154.4 455.7L156.5 453.9L158.6 451.8L160.5 449.6L162.3 447.2L163.9 444.7L165.4 442L166.7 439.2L167.9 436.2L168.9 433.1L169.8 429.9L170.5 426.6L171 423.2L171.3 419.7L171.5 416.1L171.5 412.4L171.3 408.8L171.4 408.6L171.5 408.3L171.6 407.9L171.9 407.1L172.2 405.1L172.5 402.7L172.5 399.9L172.4 396.5L172 392.7L171.2 388.3L169.9 383.3L168 377.6L166.7 374.3L165.1 370.8L166.6 373.8L168 376.9L169.3 380L170.5 383.2L171.6 386.4ZM93.1 444.6L95.8 447.2L98.5 449.5L101.3 451.7L104.2 453.8L107.1 455.6L110 457.3L113 458.7L116 460L119 461.1L122 461.9L125 462.5L127.9 463L130.9 463.2L133.8 463.2L136.7 463L139.5 462.5L142.2 461.9L144.8 461L171.3 408.9L171.4 412.6L171.4 416.2L171.2 419.7L170.9 423.2L170.4 426.6L169.7 429.9L168.8 433.1L167.8 436.2L166.6 439.2L165.3 442L163.8 444.7L162.2 447.2L160.4 449.5L158.5 451.7L156.5 453.8L154.4 455.6L152.1 457.2L149.7 458.7L147.3 459.9L144.7 461L142.1 461.8L139.3 462.5L136.5 462.9L133.7 463.1L130.8 463.1L127.9 462.9L124.9 462.5L121.9 461.8L119 461L116 460L113 458.7L110 457.3L107.1 455.6L104.2 453.8L101.4 451.8L98.6 449.6L95.9 447.2L93.2 444.7ZM166.6 439.2L166.6 439.2L171.3 408.8L171.5 412.4L171.5 416.1L171.3 419.7L171 423.2L170.5 426.6L169.8 429.9L168.9 433.1L167.9 436.2L166.7 439.2L165.4 442L163.9 444.7L162.3 447.2L160.5 449.6L158.6 451.8L156.5 453.9L154.4 455.7L152.1 457.3L149.7 458.8ZM93.5 444.8L93.8 445L94.4 445.1L97 447.6L99.7 449.8L102.5 451.9L105.4 453.9L108.2 455.6L111.1 457.1L114.1 458.5L117 459.7L120 460.6L123 461.3L125.9 461.9L128.8 462.2L131.7 462.3L134.5 462.2L137.3 461.9L140.1 461.4L142.7 460.6L145.3 459.7L147.8 458.6L150.2 457.2L152.5 455.7L154.7 453.9L156.7 452L158.7 449.9L160.5 447.7L162.2 445.3L163.7 442.7L165.1 439.9L166.3 437.1L167.4 434.1L168.3 431L169.1 427.7L169.6 424.4L170.1 421L170.3 417.5L170.4 413.9L170.3 410.3L170.9 409.7L171.2 409.2L171.3 408.9L171.4 412.6L171.4 416.2L171.2 419.7L170.9 423.2L170.4 426.6L169.7 429.9L168.8 433.1L167.8 436.2L166.6 439.2L165.3 442L163.8 444.7L162.2 447.2L160.4 449.5L158.5 451.7L156.5 453.8L154.4 455.6L152.1 457.2L149.7 458.7L147.3 459.9L144.7 461L142.1 461.8L139.3 462.5L136.5 462.9L133.7 463.1L130.8 463.1L127.9 462.9L124.9 462.5L121.9 461.8L119 461L116 460L113 458.7L110 457.3L107.1 455.6L104.2 453.8L101.4 451.8L98.6 449.6L95.9 447.2L93.2 444.7Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M160.3 337.1L160.3 337.1L152.5 330.9L155.1 332.8L157.7 334.9L160.3 337.1L162.7 339.4L165.2 341.8L167.5 344.4ZM168.3 345.6L169.2 347.1L170.3 348.8L171.4 350.8L172.5 352.9L173.7 355.2L173.7 355.2L171.7 356.1L169.8 357L167.8 357.8L165.9 358.7L163.9 359.6L162 360.4L162 360.4L163 362.7L163.8 364.8L164.4 366.6L164.8 368.2L165 369.6L165.1 370.8L163.3 367.5L161.4 364.3L159.4 361.1L157.2 358L155 355.1L154.8 354.1L154.5 353L154 351.7L153.2 350.1L152.1 348.4L150.6 346.3L150.6 346.3L152.5 345.4L154.5 344.6L156.4 343.7L158.4 342.8L160.4 342L162.3 341.1L162.3 341.1L160.6 339L158.8 337L157.1 335.2L155.4 333.5L153.8 332.1L152.5 330.9L155.1 332.8L157.7 334.9L160.3 337.1L162.7 339.4L165.2 341.8L167.5 344.4ZM165.1 370.8L163.3 367.5L161.4 364.3L159.4 361.1L157.2 358L155 355.1L155 355.1L157.2 358L159.4 361.1L161.4 364.3L163.3 367.5L165.1 370.8ZM69 404.5L69 404.5L72.1 413.5L70.8 409.9L69.6 406.3L68.5 402.7L67.7 399.1L66.9 395.5ZM67.4 398.4L67.9 400.7L68.7 403.9L69.4 406L69.9 407.4L70.3 408.4L70.6 409L70.9 409.5L71.2 409.9L71.5 410.1L71.7 410.2L71.7 410.2L71.8 410.3L71.8 410.3L71.9 410.3L71.9 410.3L72.1 410.3L72.3 410.4L73.7 414L75.2 417.5L76.8 421L78.6 424.4L80.5 427.7L82.6 430.9L84.7 434L87 437L89.4 439.8L91.8 442.6L94.4 445.1L93.8 445L93.5 444.8L93.2 444.7L93.1 444.6L93 444.5L92.8 444.4L92.5 444.2L91.9 443.7L90.5 442.6L88.9 441L87 439.1L84.9 436.6L82.7 433.6L80.2 430L77.6 425.6L74.9 420.2L73.5 417L72.1 413.5L70.8 409.9L69.6 406.3L68.5 402.7L67.7 399.1L66.9 395.5ZM166.7 374.3L168 377.6L169.9 383.3L171.2 388.3L172 392.7L172.4 396.5L172.5 399.9L172.5 402.7L172.2 405.1L171.9 407.1L171.6 407.9L171.5 408.3L171.4 408.6L171.3 408.8L171.3 408.9L171.2 409.2L170.9 409.7L170.3 410.3L170.1 406.7L169.6 403L169.1 399.4L168.3 395.7L167.4 392L166.3 388.4L165.1 384.7L163.7 381.1L162.2 377.6L160.5 374.2L158.7 370.8L159.2 370.4L159.4 370.2L159.5 370.1L159.6 370L159.6 370L159.7 369.9L159.8 369.8L160 369.5L160.4 369L160.6 368.4L160.8 367.7L160.9 366.8L160.7 365.8L160.3 364.3L159.5 362.3L157.9 359.4L156.7 357.5L155 355.1L157.2 358L159.4 361.1L161.4 364.3L163.3 367.5L165.1 370.8ZM118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L118.8 397.8L170.4 414L170.2 419.4L169.6 424.6L168.6 429.6L167.3 434.4L165.6 438.9L163.5 443.1L161.1 446.9L158.3 450.4L155.3 453.4L152 456.1L148.4 458.2L144.6 460L140.6 461.2L136.4 462L132.1 462.3L127.8 462.1L123.3 461.4L118.8 460.2L114.3 458.6L109.8 456.5L105.4 453.9L101.1 450.9L97 447.5L93 443.8L89.2 439.6L85.6 435.2L82.3 430.5L79.3 425.5L76.5 420.3L74.1 415L72 409.5L70.3 403.9L68.9 398.3L68 392.6L67.4 387.1L67.2 381.5L67.4 376.2L68 370.9L68.9 365.9L70.3 361.2L72 356.7L74.1 352.5L76.5 348.7L79.3 345.2L82.3 342.1L85.6 339.5L89.2 337.3L93 335.6L97 334.3L101.1 333.5L105.4 333.2L109.8 333.4L114.3 334.1L118.8 335.3L123.3 337L127.8 339.1L132.1 341.6L136.4 344.6L140.6 348L144.6 351.8L148.4 355.9L152 360.3L155.3 365.1L158.3 370L161.1 375.2L163.5 380.6L165.6 386.1L167.3 391.7L168.6 397.3L169.6 402.9L170.2 408.5L170.4 414Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M142.3 325.2L142.3 325.2L132 321.8L135 322.5L137.9 323.5L140.9 324.6L143.8 325.9L146.7 327.4L149.6 329.1L152.5 330.9ZM153.8 332.1L155.4 333.5L157.1 335.2L158.8 337L160.6 339L162.3 341.1L162.3 341.1L160.4 342L158.4 342.8L156.4 343.7L154.5 344.6L152.5 345.4L150.6 346.3L150.6 346.3L152.1 348.4L153.2 350.1L154 351.7L154.5 353L154.8 354.1L155 355.1L152.7 352.3L150.3 349.6L147.8 347L145.2 344.6L142.6 342.3L142.4 341.5L142 340.6L141.3 339.5L140.3 338.3L138.8 336.8L136.7 335.1L136.7 335.1L138.7 334.2L140.6 333.3L142.6 332.5L144.5 331.6L146.5 330.7L148.4 329.9L148.4 329.9L145.9 328.1L143.2 326.4L140.4 324.9L137.6 323.6L134.7 322.6L132 321.8L135 322.5L137.9 323.5L140.9 324.6L143.8 325.9L146.7 327.4L149.6 329.1L152.5 330.9ZM155 355.1L152.7 352.3L150.3 349.6L147.8 347L145.2 344.6L142.6 342.3L142.6 342.3L145.2 344.6L147.8 347L150.3 349.6L152.7 352.3L155 355.1ZM65.7 386.5L65.7 386.5L66.9 395.5L66.3 391.9L65.9 388.3L65.6 384.7L65.4 381.1L65.4 377.6ZM65.4 379.8L65.4 381.2L65.4 382L65.4 381.5L65.5 380.3L65.6 378.7L65.8 377.1L66.1 375.6L66.4 374.3L66.8 373.2L67 372.7L67.1 372.6L67.2 372.4L67.2 372.3L67.2 372.2L67.3 372.1L67.5 371.8L67.9 371.6L67.5 375L67.2 378.4L67.2 381.8L67.3 385.3L67.5 388.9L67.9 392.5L68.5 396.1L69.2 399.7L70.1 403.2L71.2 406.8L72.3 410.4L72.1 410.3L71.9 410.3L71.9 410.3L71.8 410.3L71.8 410.3L71.7 410.2L71.7 410.2L71.5 410.1L71.2 409.9L70.9 409.5L70.6 409L70.3 408.4L69.9 407.4L69.4 406L68.7 403.9L67.9 400.7L67.4 398.4L66.9 395.5L66.3 391.9L65.9 388.3L65.6 384.7L65.4 381.1L65.4 377.6ZM156.7 357.5L157.9 359.4L159.5 362.3L160.3 364.3L160.7 365.8L160.9 366.8L160.8 367.7L160.6 368.4L160.4 369L160 369.5L159.8 369.8L159.7 369.9L159.6 370L159.6 370L159.5 370.1L159.4 370.2L159.2 370.4L158.7 370.8L156.9 367.5L154.9 364.4L152.7 361.4L150.5 358.5L148.2 355.7L145.8 353L143.3 350.5L140.7 348.1L138.1 345.9L135.4 343.8L132.6 341.9L133.3 341.7L133.8 341.6L134 341.6L134.2 341.6L134.3 341.6L134.6 341.6L134.9 341.6L135.5 341.7L136.9 342L138.4 342.5L140.1 343.1L141.7 343.8L143.3 344.6L144.6 345.2L145.3 345.4L145 344.7L144.1 343.7L142.6 342.3L145.2 344.6L147.8 347L150.3 349.6L152.7 352.3L155 355.1Z\"/><path class=\"iso-top\" d=\"M124.4 320.8L124.4 320.8L117 321.1L119.9 320.8L122.9 320.7L125.9 320.9L128.9 321.2L132 321.8ZM134.7 322.6L137.6 323.6L140.4 324.9L143.2 326.4L145.9 328.1L148.4 329.9L148.4 329.9L146.5 330.7L144.5 331.6L142.6 332.5L140.6 333.3L138.7 334.2L136.7 335.1L136.7 335.1L138.8 336.8L140.3 338.3L141.3 339.5L142 340.6L142.4 341.5L142.6 342.3L142.6 342.3L144.1 343.7L145 344.7L145.3 345.4L144.6 345.2L143.3 344.6L141.7 343.8L140.1 343.1L138.4 342.5L136.9 342L135.5 341.7L134.9 341.6L134.6 341.6L134.3 341.6L134.2 341.6L134 341.6L133.8 341.6L133.3 341.7L132.6 341.9L129.7 340.2L126.8 338.6L123.8 337.2L120.9 336L117.9 335L114.9 334.3L111.9 333.7L109 333.4L106 333.2L103.2 333.3L100.3 333.6L97.6 334.2L94.9 334.9L92.3 335.8L89.8 337L87.4 338.4L85 339.9L82.8 341.7L80.7 343.6L78.8 345.7L77 348L75.3 350.5L73.8 353.1L72.4 355.9L71.1 358.8L70.1 361.8L69.2 365L68.4 368.3L67.9 371.6L67.5 371.8L67.3 372.1L67.2 372.2L67.2 372.3L67.2 372.4L67.1 372.6L67 372.7L66.8 373.2L66.4 374.3L66.1 375.6L65.8 377.1L65.6 378.7L65.5 380.3L65.4 381.5L65.4 382L65.4 381.2L65.4 379.8L65.4 377.6L82.4 336.5L82.7 336.2L82.9 336L83.2 335.7L83.5 335.5L83.8 335.3L84.1 335.1L93 329.5L95 328.6L96.9 327.8L98.9 326.9L100.8 326L102.8 325.2L104.7 324.3L114.8 321.4L115.2 321.3L115.5 321.2L115.9 321.1L116.2 321.1L116.6 321.1L117 321.1L119.9 320.8L122.9 320.7L125.9 320.9L128.9 321.2L132 321.8Z\"/><path class=\"iso-line iso-crease\" data-tone=\"mid\" d=\"M162.5 378.3L161.9 376.9L161.2 375.6L160.6 374.2L159.9 372.9L159.2 371.6L158.5 370.3L157.7 369L156.9 367.7L156.2 366.4L155.4 365.2L154.6 364L153.7 362.8L152.9 361.6L152 360.4L151.1 359.2L150.2 358.1L149.3 357L148.4 355.9L147.4 354.8L146.5 353.7L145.5 352.7L144.5 351.7L143.5 350.7L142.5 349.7L141.5 348.8L140.4 347.9L139.4 347L138.3 346.1L137.3 345.2L136.2 344.4L135.1 343.6L134 342.9L132.9 342.1L131.8 341.4L130.7 340.7L129.6 340.1L128.4 339.4L127.3 338.8L126.2 338.3L125.1 337.7L123.9 337.2L122.8 336.7L121.6 336.3L120.5 335.9L119.3 335.5L118.2 335.1L117 334.8L115.9 334.5L114.8 334.2L113.6 334L112.5 333.8L111.3 333.6L110.2 333.5L109.1 333.4L108 333.3L106.8 333.2L105.7 333.2L104.6 333.3L103.5 333.3L102.4 333.4L101.4 333.5L100.3 333.6L99.2 333.8L98.2 334L97.1 334.3L96.1 334.5L95.1 334.8L94 335.2L93 335.5L92.1 335.9L91.1 336.4L90.1 336.8L89.2 337.3L88.2 337.8L87.3 338.4L86.4 338.9L85.5 339.5L84.7 340.2L83.8 340.8L83 341.5L82.2 342.2L81.4 343L80.6 343.8L79.8 344.6L79.1 345.4L78.4 346.2L77.7 347.1L77 348L76.3 348.9L75.7 349.9L75.1 350.8L74.5 351.8L73.9 352.9L73.3 353.9L72.8 355L72.3 356L71.8 357.1L71.3 358.3L70.9 359.4L70.5 360.6L70.1 361.8L69.7 362.9L69.4 364.2L69.1 365.4L68.8 366.6L68.5 367.9L68.3 369.2L68 370.5L67.8 371.8L67.7 373.1L67.5 374.4L67.4 375.8L67.3 377.1L67.2 378.5L67.2 379.9L67.2 381.2L67.2 382.6L67.2 384L67.3 385.4L67.4 386.8L67.5 388.2L67.6 389.7L67.8 391.1L67.9 392.5L68.2 393.9L68.4 395.4L68.7 396.8L68.9 398.2L69.2 399.7L69.6 401.1L69.9 402.5L70.3 404L70.7 405.4L71.1 406.8L71.6 408.2L72.1 409.6L72.6 411L73.1 412.4L73.6 413.8L74.2 415.2L74.8 416.6L75.4 418L76 419.3L76.7 420.7L77.4 422L78.1 423.3L78.8 424.6L79.5 425.9L80.3 427.2L81 428.5L81.8 429.7L82.6 431L83.4 432.2L84.3 433.4L85.2 434.6L86 435.7L86.9 436.9L87.8 438L88.8 439.1L89.7 440.2L90.6 441.3L91.6 442.3L92.6 443.4L93.6 444.4L94.6 445.3L95.6 446.3L96.6 447.2L97.7 448.1L98.7 449L99.8 449.9L100.9 450.7L101.9 451.5L103 452.3L104.1 453.1L105.2 453.8L106.3 454.5L107.5 455.2L108.6 455.8L109.7 456.4L110.8 457L112 457.5L113.1 458.1L114.2 458.6L115.4 459L116.5 459.5L117.7 459.9L118.8 460.2L120 460.6L121.1 460.9L122.3 461.2L123.4 461.4L124.5 461.7L125.7 461.8L126.8 462L127.9 462.1L129.1 462.2L130.2 462.3L131.3 462.3L132.4 462.3L133.5 462.3L134.6 462.2L135.7 462.1L136.8 462L137.8 461.8L138.9 461.6L139.9 461.4L141 461.1L142 460.9L143 460.5L144 460.2L145 459.8L146 459.4L147 459L147.9 458.5L148.9 458L149.8 457.5L150.7 456.9L151.6 456.3L152.5 455.7L153.3 455L154.2 454.4L155 453.7L155.8 452.9L156.6 452.2L157.4 451.4L158.1 450.6L158.9 449.7L159.6 448.9L160.3 448L160.9 447.1L161.6 446.2L162.2 445.2L162.8 444.2L163.4 443.2L164 442.2L164.5 441.1L165 440L165.5 439L166 437.8L166.5 436.7L166.9 435.6L167.3 434.4L167.7 433.2L168 432L168.4 430.8L168.7 429.5L168.9 428.3L169.2 427L169.4 425.7L169.6 424.4L169.8 423.1L170 421.8L170.1 420.4L170.2 419.1L170.3 417.7L170.4 416.4L170.4 415L170.4 413.6L170.4 412.2L170.3 410.8L170.3 409.4L170.2 408L170 406.6L169.9 405.2L169.7 403.7L169.5 402.3L169.3 400.9L169.1 399.4L168.8 398L168.5 396.6L168.2 395.2L167.8 393.7L167.5 392.3L167.1 390.9L166.7 389.4L166.2 388L165.7 386.6L165.3 385.2L164.8 383.8L164.2 382.4L163.7 381L163.1 379.6L162.5 378.3\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M109.5 344L109.4 344L107.6 344L105.8 344.1L104 344.2L102.3 344.5L100.6 344.9L98.9 345.4L97.2 345.9L95.6 346.6L94.1 347.4L92.6 348.3L91.1 349.2L89.7 350.3L88.3 351.4L87 352.7L85.8 354L84.6 355.4L83.5 356.9L82.5 358.4L81.5 360.1L80.6 361.8L79.8 363.5L79 365.4L78.3 367.3L77.7 369.2L77.2 371.3L76.8 373.3L76.4 375.4L76.1 377.6L75.9 379.8L75.8 382L75.7 384.3L75.8 386.6L75.9 388.9L76.1 391.2L76.4 393.5L76.8 395.9L77.2 398.2L77.7 400.5L78.1 401.9L109.5 411.7L109.5 344M101.6 409.3L109.5 398.2M94.2 407L109.5 385.4M86.8 404.6L109.5 372.7M79.5 402.3L109.5 359.9M76.4 393.8L109.5 347.2M75.8 382L102.3 344.5\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M65.4 379.9L65.4 378.5L65.4 377.2L65.5 375.8L65.6 374.5L65.7 373.1L65.8 371.8L65.8 371.4L66 370.1L66.2 368.8L66.4 367.5L66.6 366.2L66.8 365L67.1 363.7L67.4 362.5L67.7 361.2L68 360L68.4 358.8L68.7 357.7L69.1 356.5L69.6 355.3L70 354.2L70.5 353.1L71 352L71.5 350.9L72 349.9L72.5 348.9L73.1 347.9L73.7 346.9L74.3 345.9L74.9 344.9L75.6 344L76.2 343.1L76.9 342.2L77.6 341.4L78.4 340.5L79.1 339.7L79.9 338.9L80.6 338.2L81.4 337.4L82.2 336.7L83.9 335.3L84.7 334.6L85.5 334L86.4 333.3L87.3 332.7L88.2 332.1L89.1 331.6L90 331L90.9 330.5L91.9 330L92.8 329.6L104.5 324.4L105.5 323.9L106.5 323.6L107.5 323.2L108.5 322.8L109.5 322.5L110.6 322.3L111.6 322L112.6 321.8L113.7 321.6L114.8 321.4L116.9 321.1L118 321L119 320.9L120.1 320.8L121.2 320.8L122.3 320.7L123.4 320.8L124.5 320.8L125.6 320.9L126.7 321L127.9 321.1L129 321.2L130.1 321.4L131.2 321.6L132.4 321.9L133.5 322.2L134.6 322.5L135.8 322.8L136.9 323.1L138.1 323.5L139.2 323.9L140.3 324.4L141.5 324.9L142.6 325.4L143.7 325.9L144.8 326.4L146 327L147.1 327.6L148.2 328.2L149.3 328.9L150.4 329.6L151.5 330.3L152.6 331L153.7 331.8L154 332L155.1 332.8L156.1 333.6L157.2 334.4L158.2 335.3L159.3 336.1L160.3 337L161.3 337.9L162.3 338.9L163.3 339.8L164.3 340.8L165.2 341.8L166.2 342.8L167.2 343.9L168.1 344.9L169 346L169.9 347.1L170.8 348.2L171.7 349.3L172.5 350.5L173.4 351.7L174.2 352.8L175 354L175.8 355.2L176.6 356.5L177.4 357.7L178.1 359L178.9 360.2L179.6 361.5L180.3 362.8L181 364.1L181.6 365.4L182.3 366.7L182.9 368.1L183.5 369.4L184.1 370.8L184.6 372.1L185.2 373.5L185.7 374.9L186.2 376.2L186.7 377.6L187.2 379L187.6 380.4L188 381.8L188.4 383.2L188.8 384.6L189.1 386L189.5 387.4L189.8 388.8L190.1 390.2L190.3 391.7L190.6 393.1L190.8 394.5L191 395.9L191.2 397.3L191.3 398.7L191.4 400.1L191.5 401.5L191.6 402.8L191.7 404.2L191.7 405.6L191.7 407L191.7 408.3L191.7 409.7L191.6 411L191.5 412.4L191.4 413.7L191.3 415L191.3 415.4L191.1 416.7L190.9 418L190.7 419.3L190.5 420.6L190.3 421.9L190 423.1L189.7 424.4L189.4 425.6L189.1 426.8L188.7 428L188.3 429.2L187.9 430.3L187.5 431.5L187.1 432.6L186.6 433.7L186.1 434.8L185.6 435.9L185.1 436.9L184.5 438L184 439L183.4 440L182.8 440.9L182.2 441.9L181.5 442.8L180.8 443.7L180.2 444.6L179.5 445.5L178.7 446.3L178 447.1L177.2 447.9L176.5 448.7L175.7 449.4L174.9 450.1L173.2 451.5L172.4 452.2L171.6 452.9L170.7 453.5L169.8 454.1L168.9 454.7L168 455.3L167.1 455.8L166.2 456.3L165.2 456.8L164.3 457.2L152.6 462.5L151.6 462.9L150.6 463.3L149.6 463.7L148.6 464L147.6 464.3L146.5 464.6L145.5 464.8L144.4 465.1L143.4 465.3L142.3 465.4L140.2 465.7L139.1 465.8L138.1 466L137 466L135.9 466.1L134.8 466.1L133.7 466.1L132.6 466L131.5 466L130.4 465.9L129.2 465.7L128.1 465.6L127 465.4L125.8 465.2L124.7 464.9L123.6 464.7L122.4 464.4L121.3 464L120.2 463.7L119 463.3L117.9 462.9L116.8 462.4L115.6 462L114.5 461.5L113.4 461L112.3 460.4L111.1 459.8L110 459.2L108.9 458.6L107.8 457.9L106.7 457.3L105.6 456.6L104.5 455.8L103.4 455.1L103.1 454.8L102 454L101 453.2L99.9 452.4L98.9 451.6L97.8 450.7L96.8 449.8L95.8 448.9L94.8 448L93.8 447L92.8 446L91.8 445L90.9 444L89.9 443L89 441.9L88.1 440.8L87.2 439.7L86.3 438.6L85.4 437.5L84.5 436.3L83.7 435.2L82.9 434L82 432.8L81.2 431.6L80.5 430.4L79.7 429.1L78.9 427.9L78.2 426.6L77.5 425.3L76.8 424L76.1 422.7L75.5 421.4L74.8 420.1L74.2 418.8L73.6 417.4L73 416.1L72.4 414.7L71.9 413.3L71.4 412L70.9 410.6L70.4 409.2L69.9 407.8L69.5 406.4L69.1 405L68.7 403.6L68.3 402.2L68 400.8L67.6 399.4L67.3 398L67 396.6L66.8 395.2L66.5 393.8L66.3 392.4L66.1 391L65.9 389.6L65.8 388.2L65.7 386.8L65.6 385.4L65.5 384L65.4 382.6L65.4 381.2Z\"/></g></g><g class=\"it\" data-name=\"stand.bar\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M139.3 481.2L140.1 480.5L149.5 476.4L151 476L152.9 475.9L154.6 476.2L353.6 538.7L354.7 539.3L354.9 540L354.9 553L354.1 553.6L344.7 557.8L343.2 558.2L341.3 558.3L339.6 558L140.6 495.4L139.5 494.8L139.3 494.1Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M354.9 553L354.1 553.6L354.1 540.7L354.9 540ZM354.1 553.6L344.7 557.8L344.7 544.8L354.1 540.7ZM344.7 557.8L343.2 558.2L343.2 545.3L344.7 544.8Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M343.2 558.2L341.3 558.3L341.3 545.3L343.2 545.3Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M341.3 558.3L339.6 558L339.6 545L341.3 545.3Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M339.6 558L140.6 495.4L140.6 482.5L339.6 545ZM140.6 495.4L139.5 494.8L139.5 481.9L140.6 482.5ZM139.5 494.8L139.3 494.1L139.3 481.2L139.5 481.9Z\"/><path class=\"iso-top\" d=\"M353.6 538.7L354.7 539.3L354.9 540L354.1 540.7L344.7 544.8L343.2 545.3L341.3 545.3L339.6 545L140.6 482.5L139.5 481.9L139.3 481.2L140.1 480.5L149.5 476.4L151 476L152.9 475.9L154.6 476.2Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M354.9 540L354.1 540.7L344.7 544.8L343.2 545.3L341.3 545.3L339.6 545L140.6 482.5L139.5 481.9L139.3 481.2\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M354.9 540L353.1 540.4L343.9 544.5L342.8 544.8L341.5 544.9L340.2 544.6L141.5 482.2L140.6 481.7L139.3 481.2\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M354.6 546.8L344.7 551.3L340.4 551.7L140.6 488.9L139.6 487.3\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M139.3 481.2L140.1 480.5L149.5 476.4L151 476L152.9 475.9L154.6 476.2L353.6 538.7L354.7 539.3L354.9 540M354.9 553L354.1 553.6L344.7 557.8L343.2 558.2L341.3 558.3L339.6 558L140.6 495.4L139.5 494.8L139.3 494.1M354.9 540L354.9 553M139.3 481.2L139.3 494.1\"/></g></g><g class=\"it\" data-name=\"bb.stub\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M238.8 422L238.9 420.7L239.2 419.5L239.7 418.4L240.4 417.6L241.2 416.9L254.1 411.2L255 410.7L256.1 410.6L257.2 410.7L258.3 411L259.4 411.6L260.4 412.4L261.4 413.4L262.2 414.6L262.9 415.9L263.4 417.3L263.7 418.7L263.8 420L263.7 421.4L263.4 422.6L262.9 423.6L262.2 424.5L261.4 425.1L248.5 430.9L247.6 431.3L246.5 431.4L245.4 431.4L244.3 431L243.2 430.4L242.2 429.6L241.2 428.6L240.4 427.4L239.7 426.1L239.2 424.8L238.9 423.4Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M248.2 431L249.1 430.4L249.9 429.5L250.5 428.4L250.8 427.2L250.9 425.8L250.8 424.3L250.5 422.8L249.9 421.4L262.8 415.7L263.3 417.1L263.7 418.6L263.8 420L263.7 421.4L263.3 422.7L262.8 423.8L262 424.7L261.1 425.3Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M249.9 421.4L249.1 420.1L262 414.3L262.8 415.7Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M249.1 420.1L248.2 418.9L261.1 413.1L262 414.3ZM244.9 423.9L244.9 423.9L244.9 423.9L244.9 423.9L244.9 423.9L244.9 423.9L244.9 423.9L244.9 423.9L244.9 423.9L244.9 423.9L244.9 423.9L244.9 423.9L244.9 423.9L244.9 423.9L244.9 423.9L244.9 423.9L244.9 423.9L244.9 423.9L244.9 423.9L244.9 423.9L244.9 423.9L244.9 423.9L244.9 423.9L244.9 423.9L244.9 423.9L244.9 423.9L244.9 423.9L244.9 423.9L244.9 423.9L244.9 423.9L244.9 423.9L244.9 423.9L244.9 423.9L250.9 425.8L250.8 427.2L250.5 428.4L249.9 429.5L249.1 430.4L248.2 431L247.2 431.4L246 431.4L244.9 431.2L243.7 430.7L242.6 429.9L241.5 428.9L240.6 427.7L239.8 426.4L239.3 424.9L238.9 423.5L238.8 422L238.9 420.6L239.3 419.3L239.8 418.2L240.6 417.4L241.5 416.8L242.6 416.4L243.7 416.3L244.9 416.6L246 417.1L247.2 417.9L248.2 418.9L249.1 420.1L249.9 421.4L250.5 422.8L250.8 424.3L250.9 425.8Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M248.2 418.9L247.2 417.9L246 417.1L258.9 411.3L260.1 412.1L261.1 413.1Z\"/><path class=\"iso-top\" d=\"M246 417.1L244.9 416.6L243.7 416.3L242.6 416.4L241.5 416.8L254.4 411L255.4 410.7L256.6 410.6L257.7 410.8L258.9 411.3Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M248.1 431.1L249 430.6L249.7 429.8L250.3 428.8L250.7 427.7L250.9 426.4L250.9 425.1L250.7 423.7L250.3 422.3L249.7 421L248.9 419.7L248 418.6L247 417.7L245.9 417L244.8 416.6L243.7 416.3L242.6 416.4L241.7 416.7\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M238.8 422L238.9 420.7L239.2 419.5L239.7 418.4L240.4 417.6L241.2 416.9L254.1 411.2L255 410.7L256.1 410.6L257.2 410.7L258.3 411L259.4 411.6L260.4 412.4L261.4 413.4L262.2 414.6L262.9 415.9L263.4 417.3L263.7 418.7L263.8 420L263.7 421.4L263.4 422.6L262.9 423.6L262.2 424.5L261.4 425.1L248.5 430.9L247.6 431.3L246.5 431.4L245.4 431.4L244.3 431L243.2 430.4L242.2 429.6L241.2 428.6L240.4 427.4L239.7 426.1L239.2 424.8L238.9 423.4Z\"/></g></g><g class=\"it\" data-name=\"bb.house\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M203 395.9L205.6 393.8L211.5 391.2L216.6 389.8L222.9 389.6L228.6 390.6L261.1 400.9L264.7 402.8L265.3 405.1L265.3 467L262.6 469.2L256.8 471.8L251.6 473.1L245.4 473.3L239.7 472.4L207.1 462.1L203.5 460.2L203 457.8Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M265.3 467L262.6 469.2L262.6 407.3L265.3 405.1ZM262.6 469.2L256.8 471.8L256.8 409.9L262.6 407.3ZM256.8 471.8L251.6 473.1L251.6 411.2L256.8 409.9Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M251.6 473.1L245.4 473.3L245.4 411.4L251.6 411.2Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M245.4 473.3L239.7 472.4L239.7 410.4L245.4 411.4Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M239.7 472.4L207.1 462.1L207.1 400.2L239.7 410.4ZM207.1 462.1L203.5 460.2L203.5 398.3L207.1 400.2ZM203.5 460.2L203 457.8L203 395.9L203.5 398.3Z\"/><path class=\"iso-top\" d=\"M261.1 400.9L264.7 402.8L265.3 405.1L262.6 407.3L256.8 409.9L251.6 411.2L245.4 411.4L239.7 410.4L207.1 400.2L203.5 398.3L203 395.9L205.6 393.8L211.5 391.2L216.6 389.8L222.9 389.6L228.6 390.6Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M265.3 405.1L262.6 407.3L256.8 409.9L251.6 411.2L245.4 411.4L239.7 410.4L207.1 400.2L203.5 398.3L203 395.9\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M265.3 405.1L261.6 407L256 409.6L251.2 410.8L245.6 411L240.3 410.1L208 399.9L204.7 398.1L203 395.9\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M203 395.9L205.6 393.8L211.5 391.2L216.6 389.8L222.9 389.6L228.6 390.6L261.1 400.9L264.7 402.8L265.3 405.1M265.3 467L262.6 469.2L256.8 471.8L251.6 473.1L245.4 473.3L239.7 472.4L207.1 462.1L203.5 460.2L203 457.8M265.3 405.1L265.3 467M203 395.9L203 457.8\"/></g></g><g class=\"it\" data-name=\"seat.slider\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M178.3 280.7L178.6 279.8L179.7 279.1L181.5 278.5L183.8 278.3L186.2 278.4L188.2 278.8L189.7 279.5L190.4 280.3L190.4 311.3L190.1 312.2L189 312.9L187.1 313.5L184.9 313.7L182.5 313.6L180.4 313.2L179 312.5L178.3 311.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M189 312.9L187.1 313.5L187.1 282.5L189 282ZM190.4 311.3L190.1 312.2L190.1 281.2L190.4 280.3ZM190.1 312.2L189 312.9L189 282L190.1 281.2Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M187.1 313.5L184.9 313.7L184.9 282.8L187.1 282.5Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M184.9 313.7L182.5 313.6L182.5 282.7L184.9 282.8ZM182.5 313.6L180.4 313.2L180.4 282.3L182.5 282.7Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M180.4 313.2L179 312.5L179 281.6L180.4 282.3ZM179 312.5L178.3 311.7L178.3 280.7L179 281.6Z\"/><path class=\"iso-top\" d=\"M189 282L187.1 282.5L184.9 282.8L182.5 282.7L180.4 282.3L179 281.6L178.3 280.7L178.6 279.8L179.7 279.1L181.5 278.5L183.8 278.3L186.2 278.4L188.2 278.8L189.7 279.5L190.4 280.3L190.1 281.2Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M190.4 280.3L190.1 281.2L189 282L187.1 282.5L184.9 282.8L182.5 282.7L180.4 282.3L179 281.6L178.3 280.7\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M178.3 280.7L178.6 279.8L179.7 279.1L181.5 278.5L183.8 278.3L186.2 278.4L188.2 278.8L189.7 279.5L190.4 280.3M190.4 311.3L190.1 312.2L189 312.9L187.1 313.5L184.9 313.7L182.5 313.6L180.4 313.2L179 312.5L178.3 311.7M178.3 280.7L178.3 311.7M190.4 280.3L190.4 311.3\"/></g></g><g class=\"it\" data-name=\"frame.post\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M207.3 291.9L208.3 291L216.1 287.6L218.2 287L220.7 286.9L223 287.3L236.5 291.6L237.9 292.3L238.1 293.3L238.1 398.4L237.1 399.2L229.3 402.7L227.2 403.3L224.7 403.3L222.4 402.9L208.9 398.7L207.5 397.9L207.3 397Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M238.1 398.4L237.1 399.2L237.1 294.1L238.1 293.3ZM237.1 399.2L229.3 402.7L229.3 297.6L237.1 294.1ZM229.3 402.7L227.2 403.3L227.2 298.2L229.3 297.6Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M227.2 403.3L224.7 403.3L224.7 298.2L227.2 298.2Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M224.7 403.3L222.4 402.9L222.4 297.8L224.7 298.2Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M222.4 402.9L208.9 398.7L208.9 293.6L222.4 297.8ZM208.9 398.7L207.5 397.9L207.5 292.8L208.9 293.6ZM207.5 397.9L207.3 397L207.3 291.9L207.5 292.8Z\"/><path class=\"iso-top\" d=\"M236.5 291.6L237.9 292.3L238.1 293.3L237.1 294.1L229.3 297.6L227.2 298.2L224.7 298.2L222.4 297.8L208.9 293.6L207.5 292.8L207.3 291.9L208.3 291L216.1 287.6L218.2 287L220.7 286.9L223 287.3Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M238.1 293.3L237.1 294.1L229.3 297.6L227.2 298.2L224.7 298.2L222.4 297.8L208.9 293.6L207.5 292.8L207.3 291.9\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M238.1 293.3L236.3 293.9L228.6 297.4L226.9 297.8L224.9 297.9L222.9 297.5L209.6 293.4L208.4 292.7L207.3 291.9\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M207.3 291.9L208.3 291L216.1 287.6L218.2 287L220.7 286.9L223 287.3L236.5 291.6L237.9 292.3L238.1 293.3M238.1 398.4L237.1 399.2L229.3 402.7L227.2 403.3L224.7 403.3L222.4 402.9L208.9 398.7L207.5 397.9L207.3 397M238.1 293.3L238.1 398.4M207.3 291.9L207.3 397\"/></g></g><g class=\"it\" data-name=\"drive.case\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M99.7 385.1L109.5 380.8L132.7 374L227.2 399.8L240.1 409.9L249.2 425.3L252.5 442.6L249.2 457.8L240.1 467.5L230.3 471.9L217.4 473.9L123 434.7L99.7 416.1Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M240.1 467.5L249.2 457.8L239.4 462.2L230.3 471.9ZM249.2 457.8L252.5 442.6L242.7 447L239.4 462.2ZM252.5 442.6L249.2 425.3L239.4 429.7L242.7 447Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M249.2 425.3L240.1 409.9L230.3 414.3L239.4 429.7Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M99.7 416.1L123 434.7L192.7 463.6L203.7 467.8L217.4 473.9L230.3 471.9L239.4 462.2L242.7 447L239.4 429.7L230.3 414.3L217.4 404.1L203.7 401.6L192.7 401.7L123 378.4L99.7 385.1Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M240.1 409.9L227.2 399.8L217.4 404.1L230.3 414.3Z\"/><path class=\"iso-top\" d=\"M227.2 399.8L213.5 397.3L203.7 401.6L217.4 404.1ZM213.5 397.3L202.5 397.3L192.7 401.7L203.7 401.6ZM202.5 397.3L132.7 374L123 378.4L192.7 401.7ZM132.7 374L109.5 380.8L99.7 385.1L123 378.4Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M230.3 471.9L239.4 462.2M249.2 457.8L239.4 462.2M239.4 462.2L242.7 447M252.5 442.6L242.7 447M242.7 447L239.4 429.7M249.2 425.3L239.4 429.7M239.4 429.7L230.3 414.3M240.1 409.9L230.3 414.3M230.3 414.3L217.4 404.1M227.2 399.8L217.4 404.1M217.4 404.1L203.7 401.6M203.7 401.6L192.7 401.7M192.7 401.7L123 378.4M132.7 374L123 378.4M123 378.4L99.7 385.1\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M99.7 385.1L109.5 380.8L132.7 374L227.2 399.8L240.1 409.9L249.2 425.3L252.5 442.6L249.2 457.8L240.1 467.5L230.3 471.9L217.4 473.9L123 434.7L99.7 416.1Z\"/></g></g><g class=\"it\" data-name=\"crank.cover\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M184.9 430.9L184.9 429.5L185 428.2L185 427.6L185.1 426.2L185.3 424.9L185.5 423.6L185.8 422.4L186.1 421.2L186.5 420L186.9 418.8L187.3 417.7L187.8 416.6L188.3 415.5L188.9 414.5L189.5 413.6L190.2 412.7L190.9 411.8L191.6 411L192.4 410.2L193.2 409.5L193.8 408.9L194.7 408.2L195.5 407.6L196.4 407.1L197.4 406.6L198.3 406.1L199.3 405.7L200.3 405.4L201.4 405.1L202.4 404.9L203.5 404.7L204.6 404.7L205.7 404.6L206.8 404.7L207.9 404.7L208.6 404.8L209.7 405L210.8 405.2L211.9 405.4L213.1 405.8L214.2 406.1L215.3 406.6L216.5 407.1L217.6 407.6L218.7 408.3L219.8 408.9L220.9 409.6L222 410.4L223 411.2L224.1 412.1L225.1 413L226.1 414L227.1 415L228 416L229 417.1L229.8 418.2L230.7 419.4L231.5 420.6L231.7 420.7L232.5 421.9L233.2 423.1L233.9 424.4L234.6 425.7L235.2 427L235.8 428.3L236.4 429.6L236.9 430.9L237.4 432.3L237.8 433.7L238.2 435L238.6 436.4L238.6 436.6L238.9 438.1L239.2 439.5L239.4 440.9L239.6 442.3L239.7 443.7L239.8 445.1L239.8 446.5L239.8 447.8L239.7 449.2L239.6 450.5L239.4 451.8L239.2 453.1L238.9 454.4L238.6 455.6L238.3 456.8L237.9 457.9L237.4 459.1L236.9 460.1L236.4 461.2L235.8 462.2L235.2 463.1L234.5 464.1L234.2 464.6L233.5 465.4L232.7 466.3L232 467.1L231.1 467.8L230.3 468.5L229.4 469.1L228.5 469.6L227.6 470.1L226.6 470.6L225.6 471L224.6 471.3L223.6 471.6L222.5 471.8L221.5 471.9L220.6 472.1L219.5 472.1L218.5 472.2L217.3 472.1L216.2 472.1L215.1 471.9L214 471.7L212.8 471.4L211.7 471.1L210.6 470.7L209.4 470.3L208.3 469.8L207.2 469.2L206.1 468.6L205 467.9L203.9 467.2L202.8 466.4L201.7 465.6L201.2 465.2L200.2 464.4L199.2 463.5L198.2 462.6L197.3 461.6L196.3 460.6L195.4 459.5L194.6 458.4L193.7 457.3L192.9 456.1L192.1 454.9L191.4 453.7L190.7 452.5L190 451.2L189.4 449.9L188.8 448.6L188.2 447.3L187.7 445.9L187.2 444.6L186.8 443.2L186.4 441.8L186 440.4L185.7 439.1L185.5 437.7L185.3 436.3L185.1 434.9L185 433.6L184.9 432.2Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M238.7 454.2L239.1 452.6L239.4 450.9L239.6 449.3L239.7 447.5L239.7 445.8L239.6 444L239.5 442.2L239.3 440.4L239 438.6L238.6 436.8L238.2 435L237.7 433.2L237.1 431.4L236.4 429.6L235.6 427.9L234.8 426.2L234 424.5L233 422.8L232 421.2L231 419.7L229.8 418.2L228.7 416.8L227.5 415.5L226.2 414.2L224.9 413L226.4 414.2L227.2 415L227.6 415.5L228 416L229.8 418.2L231.7 420.9L232.1 421.6L232.6 422.4L233.5 424.1L234.4 425.9L234.8 426.9L235.2 427.9L235.2 427.9L235.7 429.9L236.3 432.3L236.8 435.2L237.1 438.5L237.3 442.4L237 446.8L236.9 448.5L236.8 450.3L236.7 451.9L236.4 453.6L236.1 455.2L235.6 456.7L235.2 458.2L234.6 459.6L234 461L233.2 462.3L232.5 463.5L231.6 464.7L230.7 465.7L229.8 466.7L228.7 467.6L227.6 468.5L226.5 469.2L225.3 469.8L224.1 470.4L222.8 470.8L221.5 471.2L220.2 471.4L218.9 471.6L217.5 471.6L216.1 471.6L214.6 471.4L213.2 471.2L211.8 470.8L212 471.1L212.3 471.3L212.6 471.4L212.8 471.4L213.1 471.3L213.4 471.2L238.5 455.3L238.5 455.3L238.6 455.2L238.6 455.2L238.7 455.1L238.7 455.1L238.7 455L238.8 454.9L238.8 454.6L238.8 454.6L238.8 454.5L238.8 454.4Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M226.4 414.2L227.2 415L227.6 415.5L228 416L229.8 418.2L231.7 420.9L232.1 421.6L232.6 422.4L233.5 424.1L234.4 425.9L234.8 426.9L235.2 427.9L235.2 427.9L235.7 429.9L236.3 432.3L236.8 435.2L237.1 438.5L237.3 442.4L237 446.8L236.9 445.2L236.8 443.5L236.6 441.8L236.3 440.1L236 438.4L235.6 436.7L235.1 435L234.9 432.3L234.4 429.7L233.8 427.3L233 425L232.2 422.9L231.5 421.1L231.5 421.1L230.9 420.2L230.3 419.3L229 417.4L227.5 415.6L226.8 414.8L226 414L222.8 411L219.4 408.7L218.6 408.2L218 407.9L218.1 408L218.2 408.2L219.6 409L221 409.9L222.3 410.8L223.6 411.9L224.9 413Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M218.3 408.1L218.3 408.1L218 407.9L218.6 408.2ZM219.4 408.7L222.8 411L226 414L226.8 414.8L227.5 415.6L229 417.4L230.3 419.3L230.9 420.2L231.5 421.1L231.5 421.1L232.2 422.9L233 425L233.8 427.3L234.4 429.7L234.9 432.3L235.1 435L234.6 433.3L234 431.6L233.3 429.9L232.6 428.3L231.7 426.7L230.9 425.1L230 423.5L229.9 422.3L229.5 420.9L228.9 419.3L228.1 417.6L227 415.9L226 414.3L226 414.3L225.2 413.5L224.3 412.6L222.3 410.8L220 409.1L218.7 408.3L217.6 407.7L217.8 407.7L217.9 407.9L218 407.9L218.6 408.2ZM210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L210.9 439L237 447.2L236.9 449.9L236.6 452.4L236.1 454.9L235.5 457.3L234.7 459.5L233.7 461.6L232.5 463.5L231.2 465.2L229.7 466.8L228.1 468.1L226.4 469.2L224.6 470.2L222.6 470.9L220.6 471.3L218.5 471.6L216.4 471.6L214.2 471.3L212 470.9L209.8 470.2L207.6 469.3L205.4 468.1L203.3 466.8L201.2 465.2L199.2 463.5L197.3 461.6L195.4 459.5L193.7 457.3L192.1 454.9L190.7 452.5L189.4 449.9L188.2 447.3L187.2 444.6L186.4 441.8L185.7 439.1L185.3 436.3L185 433.6L184.9 430.9L185 428.2L185.3 425.7L185.7 423.2L186.4 420.8L187.2 418.6L188.2 416.5L189.4 414.6L190.7 412.9L192.1 411.3L193.7 410L195.4 408.8L197.3 407.9L199.2 407.2L201.2 406.8L203.3 406.5L205.4 406.5L207.6 406.7L209.8 407.2L212 407.9L214.2 408.8L216.4 410L218.5 411.3L220.6 412.9L222.6 414.6L224.6 416.5L226.4 418.6L228.1 420.8L229.7 423.1L231.2 425.6L232.5 428.2L233.7 430.8L234.7 433.5L235.5 436.3L236.1 439L236.6 441.8L236.9 444.5L237 447.2Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M218.7 408.3L217.5 407.7L218.2 408L218.2 408ZM220 409.1L222.3 410.8L224.3 412.6L225.2 413.5L226 414.3L226 414.3L227 415.9L228.1 417.6L228.9 419.3L229.5 420.9L229.9 422.3L230 423.5L229 422.1L228 420.7L227 419.3L225.9 418L224.8 416.7L223.6 415.5L222.4 414.4L223.1 414.2L223.2 413.7L222.9 412.8L222 411.6L220.8 410.2L219.3 408.9L219.3 408.9L218.1 408.2L217.3 407.7L217.4 407.7L217.5 407.7L217.5 407.7L218.7 408.3Z\"/><path class=\"iso-top\" d=\"M218.1 408.2L217.3 407.7L217.8 407.9L217.8 407.9ZM218.1 408.2L217.3 407.7L217.2 407.7L188.6 415.7L188.3 415.9L188.1 416L188 416.2L187.9 416.5L187.8 416.8L187.8 417.2L188.5 415.9L189.3 414.7L190.1 413.5L191 412.4L192 411.4L193 410.5L194.1 409.7L195.2 409L196.4 408.3L197.6 407.8L198.9 407.3L200.1 407L201.5 406.7L202.8 406.5L204.2 406.5L205.6 406.5L207 406.7L208.5 406.9L209.9 407.2L211.3 407.7L212.8 408.2L214.2 408.8L215.6 409.5L217 410.3L218.4 411.2L219.8 412.2L221.1 413.2L222.4 414.4L223.1 414.2L223.2 413.7L222.9 412.8L222 411.6L220.8 410.2L219.3 408.9L219.3 408.9Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M211.8 470.8L212.9 471.1L214 471.3L215.2 471.5L216.3 471.6L217.4 471.6L218.5 471.6L219.6 471.5L220.6 471.3L221.7 471.1L222.7 470.9L223.7 470.5L224.7 470.1L225.6 469.7L226.6 469.2L227.5 468.6L228.3 468L229.2 467.3L230 466.5L230.7 465.7L231.4 464.9L232.1 464L232.8 463.1L233.4 462.1L233.9 461.1L234.4 460L234.9 458.9L235.3 457.7L235.7 456.6L236 455.3L236.3 454.1L236.5 452.8L236.7 451.5L236.8 450.2L236.9 448.8L237 447.5L236.9 446.1L236.9 444.7L236.8 443.3L236.6 441.9L236.4 440.4L236.1 439L235.8 437.6L235.5 436.2L235 434.8L234.6 433.3L234.1 432L233.6 430.6L233 429.2L232.3 427.9L231.7 426.5L231 425.2L230.2 424L229.4 422.7L228.6 421.5L227.8 420.3L226.9 419.2L226 418.1L225 417L224.1 416L223.1 415L222 414L221 413.2L219.9 412.3L218.9 411.5L217.8 410.8L216.7 410.1L215.5 409.5L214.4 408.9L213.3 408.4L212.2 408L211 407.6L209.9 407.2L208.7 407L207.6 406.7L206.5 406.6L205.4 406.5L204.3 406.5L203.2 406.5L202.1 406.6L201 406.8L200 407L199 407.3L198 407.6L197 408L196 408.5L195.1 409L194.2 409.6L193.4 410.3L192.5 410.9L191.8 411.7L191 412.5L190.3 413.3L189.6 414.2L189 415.2L188.4 416.2L187.8 417.2\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M229.5 444.9L228.9 438.9L227 432.9L224 427.3L220.2 422.5L215.7 418.8L210.9 416.6L206.1 415.8L201.6 416.6L197.7 419L194.8 422.7L192.9 427.6L192.3 433.2L192.9 439.2L194.8 445.3L197.7 450.8L201.6 455.6L206.1 459.3L210.9 461.6L215.7 462.3L220.2 461.5L224 459.1L227 455.4L228.9 450.5Z\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M184.9 430.9L184.9 429.5L185 428.2L185 427.6L185.1 426.2L185.3 424.9L185.5 423.6L185.8 422.4L186.1 421.2L186.5 420L186.9 418.8L187.3 417.7L187.8 416.6L188.3 415.5L188.9 414.5L189.5 413.6L190.2 412.7L190.9 411.8L191.6 411L192.4 410.2L193.2 409.5L193.8 408.9L194.7 408.2L195.5 407.6L196.4 407.1L197.4 406.6L198.3 406.1L199.3 405.7L200.3 405.4L201.4 405.1L202.4 404.9L203.5 404.7L204.6 404.7L205.7 404.6L206.8 404.7L207.9 404.7L208.6 404.8L209.7 405L210.8 405.2L211.9 405.4L213.1 405.8L214.2 406.1L215.3 406.6L216.5 407.1L217.6 407.6L218.7 408.3L219.8 408.9L220.9 409.6L222 410.4L223 411.2L224.1 412.1L225.1 413L226.1 414L227.1 415L228 416L229 417.1L229.8 418.2L230.7 419.4L231.5 420.6L231.7 420.7L232.5 421.9L233.2 423.1L233.9 424.4L234.6 425.7L235.2 427L235.8 428.3L236.4 429.6L236.9 430.9L237.4 432.3L237.8 433.7L238.2 435L238.6 436.4L238.6 436.6L238.9 438.1L239.2 439.5L239.4 440.9L239.6 442.3L239.7 443.7L239.8 445.1L239.8 446.5L239.8 447.8L239.7 449.2L239.6 450.5L239.4 451.8L239.2 453.1L238.9 454.4L238.6 455.6L238.3 456.8L237.9 457.9L237.4 459.1L236.9 460.1L236.4 461.2L235.8 462.2L235.2 463.1L234.5 464.1L234.2 464.6L233.5 465.4L232.7 466.3L232 467.1L231.1 467.8L230.3 468.5L229.4 469.1L228.5 469.6L227.6 470.1L226.6 470.6L225.6 471L224.6 471.3L223.6 471.6L222.5 471.8L221.5 471.9L220.6 472.1L219.5 472.1L218.5 472.2L217.3 472.1L216.2 472.1L215.1 471.9L214 471.7L212.8 471.4L211.7 471.1L210.6 470.7L209.4 470.3L208.3 469.8L207.2 469.2L206.1 468.6L205 467.9L203.9 467.2L202.8 466.4L201.7 465.6L201.2 465.2L200.2 464.4L199.2 463.5L198.2 462.6L197.3 461.6L196.3 460.6L195.4 459.5L194.6 458.4L193.7 457.3L192.9 456.1L192.1 454.9L191.4 453.7L190.7 452.5L190 451.2L189.4 449.9L188.8 448.6L188.2 447.3L187.7 445.9L187.2 444.6L186.8 443.2L186.4 441.8L186 440.4L185.7 439.1L185.5 437.7L185.3 436.3L185.1 434.9L185 433.6L184.9 432.2Z\"/></g><g data-part=\"flyspin\"></g></g><g class=\"it\" data-name=\"frame.beam\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M167.6 257.1L168.8 256.1L176.6 252.6L178.9 252L181.8 251.9L184.3 252.4L320.1 295L321.7 295.9L322 297L322 319.5L320.8 320.4L313 323.9L310.6 324.5L307.8 324.6L305.3 324.2L169.5 281.5L167.9 280.6L167.6 279.6Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M322 319.5L320.8 320.4L320.8 297.9L322 297ZM320.8 320.4L313 323.9L313 301.4L320.8 297.9ZM313 323.9L310.6 324.5L310.6 302L313 301.4Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M310.6 324.5L307.8 324.6L307.8 302.1L310.6 302Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M307.8 324.6L305.3 324.2L305.3 301.7L307.8 302.1Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M305.3 324.2L169.5 281.5L169.5 259L305.3 301.7ZM169.5 281.5L167.9 280.6L167.9 258.1L169.5 259ZM167.9 280.6L167.6 279.6L167.6 257.1L167.9 258.1Z\"/><path class=\"iso-top\" d=\"M320.1 295L321.7 295.9L322 297L320.8 297.9L313 301.4L310.6 302L307.8 302.1L305.3 301.7L169.5 259L167.9 258.1L167.6 257.1L168.8 256.1L176.6 252.6L178.9 252L181.8 251.9L184.3 252.4Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M322 297L320.8 297.9L313 301.4L310.6 302L307.8 302.1L305.3 301.7L169.5 259L167.9 258.1L167.6 257.1\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M322 297L319.7 297.7L312.1 301.1L310.2 301.6L308 301.7L305.9 301.3L170.4 258.7L169 258L167.6 257.1\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M322 307.5L321.2 308.9L313 312.7L309.6 313.4L305.9 313.1L169.5 270.2L167.6 269\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M167.6 257.1L168.8 256.1L176.6 252.6L178.9 252L181.8 251.9L184.3 252.4L320.1 295L321.7 295.9L322 297M322 319.5L320.8 320.4L313 323.9L310.6 324.5L307.8 324.6L305.3 324.2L169.5 281.5L167.9 280.6L167.6 279.6M322 297L322 319.5M167.6 257.1L167.6 279.6\"/></g></g><g class=\"it\" data-name=\"frame.knobS\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M200.5 257.1L200.6 256.3L201.5 255.5L203.3 255.1L205.4 254.9L207.5 255.1L209.1 255.6L210 256.3L210 265.4L210 266.2L209 266.9L207.3 267.4L205.1 267.5L203.1 267.3L201.4 266.8L200.5 266.1Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M209 266.9L207.3 267.4L207.3 258.4L209 257.9ZM210 265.4L210 266.2L210 257.2L210 256.3ZM210 266.2L209 266.9L209 257.9L210 257.2Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M207.3 267.4L205.1 267.5L205.1 258.5L207.3 258.4Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M205.1 267.5L203.1 267.3L203.1 258.3L205.1 258.5Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M203.1 267.3L201.4 266.8L201.4 257.8L203.1 258.3ZM201.4 266.8L200.5 266.1L200.5 257.1L201.4 257.8Z\"/><path class=\"iso-top\" d=\"M209 257.9L207.3 258.4L205.1 258.5L203.1 258.3L201.4 257.8L200.5 257.1L200.6 256.3L201.5 255.5L203.3 255.1L205.4 254.9L207.5 255.1L209.1 255.6L210 256.3L210 257.2Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M210 256.3L210 257.2L209 257.9L207.3 258.4L205.1 258.5L203.1 258.3L201.4 257.8L200.5 257.1\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M200.5 257.1L200.6 256.3L201.5 255.5L203.3 255.1L205.4 254.9L207.5 255.1L209.1 255.6L210 256.3M210 265.4L210 266.2L209 266.9L207.3 267.4L205.1 267.5L203.1 267.3L201.4 266.8L200.5 266.1M200.5 257.1L200.5 266.1M210 256.3L210 265.4\"/></g></g><g class=\"it\" data-name=\"seat.post\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M178.3 244.1L178.6 243.3L179.7 242.5L181.5 241.9L183.8 241.7L186.2 241.8L188.2 242.2L189.7 242.9L190.4 243.7L190.4 257.8L190.1 258.7L189 259.5L187.1 260L184.9 260.3L182.5 260.2L180.4 259.8L179 259.1L178.3 258.2Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M189 259.5L187.1 260L187.1 246L189 245.4ZM190.4 257.8L190.1 258.7L190.1 244.6L190.4 243.7ZM190.1 258.7L189 259.5L189 245.4L190.1 244.6Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M187.1 260L184.9 260.3L184.9 246.2L187.1 246Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M184.9 260.3L182.5 260.2L182.5 246.1L184.9 246.2ZM182.5 260.2L180.4 259.8L180.4 245.7L182.5 246.1Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M180.4 259.8L179 259.1L179 245L180.4 245.7ZM179 259.1L178.3 258.2L178.3 244.1L179 245Z\"/><path class=\"iso-top\" d=\"M189 245.4L187.1 246L184.9 246.2L182.5 246.1L180.4 245.7L179 245L178.3 244.1L178.6 243.3L179.7 242.5L181.5 241.9L183.8 241.7L186.2 241.8L188.2 242.2L189.7 242.9L190.4 243.7L190.1 244.6Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M190.4 243.7L190.1 244.6L189 245.4L187.1 246L184.9 246.2L182.5 246.1L180.4 245.7L179 245L178.3 244.1\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M178.3 244.1L178.6 243.3L179.7 242.5L181.5 241.9L183.8 241.7L186.2 241.8L188.2 242.2L189.7 242.9L190.4 243.7M190.4 257.8L190.1 258.7L189 259.5L187.1 260L184.9 260.3L182.5 260.2L180.4 259.8L179 259.1L178.3 258.2M178.3 244.1L178.3 258.2M190.4 243.7L190.4 257.8\"/></g></g><g class=\"it\" data-name=\"seat.clamp\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M175.9 232.5L176.5 231.5L177.8 230.6L179.8 230L182.3 229.6L184.9 229.5L187.5 229.7L189.8 230.2L191.5 231L192.6 231.9L192.8 232.9L192.8 244.2L192.2 245.1L190.9 246L188.8 246.6L186.4 247L183.7 247.1L181.2 246.9L178.9 246.4L177.1 245.6L176.1 244.7L175.9 243.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M190.9 246L188.8 246.6L188.8 235.4L190.9 234.7ZM192.8 244.2L192.2 245.1L192.2 233.9L192.8 232.9ZM192.2 245.1L190.9 246L190.9 234.7L192.2 233.9Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M188.8 246.6L186.4 247L186.4 235.8L188.8 235.4ZM186.4 247L183.7 247.1L183.7 235.9L186.4 235.8Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M183.7 247.1L181.2 246.9L181.2 235.6L183.7 235.9Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M181.2 246.9L178.9 246.4L178.9 235.1L181.2 235.6ZM178.9 246.4L177.1 245.6L177.1 234.4L178.9 235.1ZM177.1 245.6L176.1 244.7L176.1 233.5L177.1 234.4ZM176.1 244.7L175.9 243.7L175.9 232.5L176.1 233.5Z\"/><path class=\"iso-top\" d=\"M190.9 234.7L188.8 235.4L186.4 235.8L183.7 235.9L181.2 235.6L178.9 235.1L177.1 234.4L176.1 233.5L175.9 232.5L176.5 231.5L177.8 230.6L179.8 230L182.3 229.6L184.9 229.5L187.5 229.7L189.8 230.2L191.5 231L192.6 231.9L192.8 232.9L192.2 233.9Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M192.8 232.9L192.2 233.9L190.9 234.7L188.8 235.4L186.4 235.8L183.7 235.9L181.2 235.6L178.9 235.1L177.1 234.4L176.1 233.5L175.9 232.5\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M175.9 232.5L176.5 231.5L177.8 230.6L179.8 230L182.3 229.6L184.9 229.5L187.5 229.7L189.8 230.2L191.5 231L192.6 231.9L192.8 232.9M192.8 244.2L192.2 245.1L190.9 246L188.8 246.6L186.4 247L183.7 247.1L181.2 246.9L178.9 246.4L177.1 245.6L176.1 244.7L175.9 243.7M175.9 232.5L175.9 243.7M192.8 232.9L192.8 244.2\"/></g></g><g class=\"it\" data-name=\"saddle\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M142.8 219.9L151.8 212.3L170.1 207.7L186 211.2L228.2 233.1L233.2 237.9L233.2 248L219.6 247L154.8 235.3L142.8 230Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M233.2 248L219.6 247L219.6 236.9L233.2 237.9Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M219.6 247L180.6 239.7L180.6 229.5L219.6 236.9ZM180.6 239.7L154.8 235.3L154.8 225.1L180.6 229.5Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M154.8 235.3L142.8 230L142.8 219.9L154.8 225.1Z\"/><path class=\"iso-top\" d=\"M170.1 207.7L186 211.2L202 220L228.2 233.1L233.2 237.9L219.6 236.9L180.6 229.5L154.8 225.1L142.8 219.9L151.8 212.3Z\"/><path class=\"iso-line iso-crease\" data-tone=\"mid\" d=\"M233.2 237.9L219.6 236.9M219.6 236.9L180.6 229.5M180.6 229.5L154.8 225.1M154.8 235.3L154.8 225.1M154.8 225.1L142.8 219.9\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M142.8 219.9L151.8 212.3L170.1 207.7L186 211.2L228.2 233.1L233.2 237.9L233.2 248L219.6 247L154.8 235.3L142.8 230Z\"/></g></g><g class=\"it\" data-name=\"stand.front\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M299.9 563.5L302.6 561.4L396.2 519.6L401.4 518.3L407.6 518L413.3 519L422.6 522L426.2 523.9L426.8 526.2L426.8 541.4L424.1 543.6L330.5 585.4L325.3 586.7L319.1 586.9L313.4 585.9L304.1 583L300.5 581.1L299.9 578.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M426.8 541.4L424.1 543.6L424.1 528.4L426.8 526.2ZM424.1 543.6L330.5 585.4L330.5 570.2L424.1 528.4ZM330.5 585.4L325.3 586.7L325.3 571.5L330.5 570.2Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M325.3 586.7L319.1 586.9L319.1 571.7L325.3 571.5Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M319.1 586.9L313.4 585.9L313.4 570.7L319.1 571.7Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M313.4 585.9L304.1 583L304.1 567.8L313.4 570.7ZM304.1 583L300.5 581.1L300.5 565.9L304.1 567.8ZM300.5 581.1L299.9 578.7L299.9 563.5L300.5 565.9Z\"/><path class=\"iso-top\" d=\"M422.6 522L426.2 523.9L426.8 526.2L424.1 528.4L330.5 570.2L325.3 571.5L319.1 571.7L313.4 570.7L304.1 567.8L300.5 565.9L299.9 563.5L302.6 561.4L396.2 519.6L401.4 518.3L407.6 518L413.3 519Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M426.8 526.2L424.1 528.4L330.5 570.2L325.3 571.5L319.1 571.7L313.4 570.7L304.1 567.8L300.5 565.9L299.9 563.5\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M426.8 526.2L423.1 528.1L329.7 569.8L324.9 571.1L319.3 571.3L314 570.4L305 567.5L301.6 565.7L299.9 563.5\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M426.9 533.5L330.5 577.8L319.9 579.4L304.1 575.4L299.8 571.4\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M299.9 563.5L302.6 561.4L396.2 519.6L401.4 518.3L407.6 518L413.3 519L422.6 522L426.2 523.9L426.8 526.2M426.8 541.4L424.1 543.6L330.5 585.4L325.3 586.7L319.1 586.9L313.4 585.9L304.1 583L300.5 581.1L299.9 578.7M426.8 526.2L426.8 541.4M299.9 563.5L299.9 578.7\"/></g></g><g class=\"it\" data-name=\"plugR\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M382 269L382.2 267.6L382.6 266.3L383.3 265L384.1 264.1L385 263.5L385.9 263.3L386.7 263.5L389.9 264.5L390.6 265.2L391 266.2L391.2 267.4L391 268.8L390.6 270.1L389.9 271.3L389.1 272.3L388.2 272.9L387.3 273.1L386.5 272.9L383.3 271.9L382.6 271.2L382.2 270.2Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M388.2 268.7L388.2 268.7L388.2 268.7L388.2 268.7L388.2 268.7L388.2 268.7L388.2 268.7L388.2 268.7L388.2 268.7L388.2 268.7L388.2 268.7L388.2 268.7L388.2 268.7L388.2 268.7L388.2 268.7L385.3 270L385.6 268L386.4 266.2L387.6 264.9L388.9 264.3L390.1 264.6L390.9 265.7L391.2 267.4L390.9 269.4L390.1 271.2L388.9 272.5L387.6 273.1L386.4 272.8L385.6 271.7L385.3 270ZM385.6 271.7L386.4 272.8L383.1 271.8L382.3 270.7Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M385.3 270L385.6 271.7L382.3 270.7L382 269Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M390.1 264.6L388.9 264.3L385.6 263.3L386.8 263.6ZM385.6 268L385.3 270L382 269L382.3 267Z\"/><path class=\"iso-top\" d=\"M388.9 264.3L387.6 264.9L386.4 266.2L385.6 268L382.3 267L383.1 265.2L384.3 263.9L385.6 263.3Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M389.6 264.4L388.7 264.3L387.8 264.7L386.9 265.5L386.2 266.6L385.6 267.9L385.3 269.3L385.3 270.6L385.6 271.7L386.1 272.6L386.9 273\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M382 269L382.2 267.6L382.6 266.3L383.3 265L384.1 264.1L385 263.5L385.9 263.3L386.7 263.5L389.9 264.5L390.6 265.2L391 266.2L391.2 267.4L391 268.8L390.6 270.1L389.9 271.3L389.1 272.3L388.2 272.9L387.3 273.1L386.5 272.9L383.3 271.9L382.6 271.2L382.2 270.2Z\"/></g></g><g class=\"it\" data-name=\"frame.knobB\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M284.2 283.4L284.3 282.6L285.2 281.8L287 281.4L289.1 281.2L291.2 281.4L292.8 281.9L293.7 282.7L293.7 291.7L293.7 292.5L292.7 293.2L291 293.7L288.8 293.8L286.7 293.6L285.1 293.1L284.2 292.4Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M292.7 293.2L291 293.7L291 284.7L292.7 284.2ZM293.7 291.7L293.7 292.5L293.7 283.5L293.7 282.7ZM293.7 292.5L292.7 293.2L292.7 284.2L293.7 283.5Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M291 293.7L288.8 293.8L288.8 284.8L291 284.7Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M288.8 293.8L286.7 293.6L286.7 284.6L288.8 284.8Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M286.7 293.6L285.1 293.1L285.1 284.1L286.7 284.6ZM285.1 293.1L284.2 292.4L284.2 283.4L285.1 284.1Z\"/><path class=\"iso-top\" d=\"M292.7 284.2L291 284.7L288.8 284.8L286.7 284.6L285.1 284.1L284.2 283.4L284.3 282.6L285.2 281.8L287 281.4L289.1 281.2L291.2 281.4L292.8 281.9L293.7 282.7L293.7 283.5Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M293.7 282.7L293.7 283.5L292.7 284.2L291 284.7L288.8 284.8L286.7 284.6L285.1 284.1L284.2 283.4\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M284.2 283.4L284.3 282.6L285.2 281.8L287 281.4L289.1 281.2L291.2 281.4L292.8 281.9L293.7 282.7M293.7 291.7L293.7 292.5L292.7 293.2L291 293.7L288.8 293.8L286.7 293.6L285.1 293.1L284.2 292.4M284.2 283.4L284.2 292.4M293.7 282.7L293.7 291.7\"/></g></g><g class=\"it\" data-name=\"dropR:1\" data-route=\"dropR\"><g class=\"tb\"><path class=\"tb-body\" d=\"M403.3 259.9L403.3 261.1L402.9 263.9L402.3 265.4L401.5 266L399.6 266.3L397.1 266.5L394.9 266.6L392.4 265.9L389.4 264.9L387 272.5L390.2 273.5L393.9 274.4L397.6 274.4L400.9 274.1L404.7 273.2L408.5 270.3L410.5 266L411.1 261.8L411.2 260.3ZM387 272.5L387.6 272.5L388.1 272.4L388.7 272.1L389.2 271.6L389.7 271L390.2 270.2L390.5 269.4L390.7 268.6L390.8 267.7L390.7 266.9L390.6 266.2L390.3 265.6L389.9 265.2L389.4 264.9L388.9 264.9L388.3 265L387.8 265.3L387.2 265.8L386.7 266.4L386.3 267.2L386 268L385.8 268.9L385.7 269.7L385.7 270.5L385.9 271.2L386.2 271.8L386.6 272.2Z\"/><path class=\"tb-shine\" d=\"M405.3 258.6L405.2 261.3L404.6 264.4L403.4 266.3L402 267.1L399.9 267.7L397.2 268L394.7 268.3L391.9 267.7L388.8 266.8L386.9 266.2L386.7 266.4L386.3 267.2L386 267.9L388.3 268.6L391.4 269.5L394.4 270.1L397.3 269.9L400.2 269.5L402.8 268.9L404.8 267.4L406.4 264.9L407.1 261.4L407.2 258.7Z\"/><path class=\"tb-shade\" d=\"M407.9 258.7L407.9 261.5L407.8 265.3L406.6 268.8L403.7 271.1L400.5 271.6L397.4 271.8L394.2 271.5L391.1 270.4L388 269.4L385.8 268.7L385.8 268.9L385.7 269.7L385.7 270.4L387.5 270.9L390.6 271.9L394 273.1L397.5 273.4L400.7 273.2L404.4 272.5L407.8 269.8L409.3 265.7L409.5 261.6L409.5 258.8Z\"/><path class=\"iso-line tb-edge\" data-tone=\"lo\" d=\"M403.3 259.9L403.3 261.1L402.9 263.9L402.3 265.4L401.5 266L399.6 266.3L397.1 266.5L394.9 266.6L392.4 265.9L389.4 264.9M411.2 260.3L411.1 261.8L410.5 266L408.5 270.3L404.7 273.2L400.9 274.1L397.6 274.4L393.9 274.4L390.2 273.5L387 272.5M389.4 264.9L388.9 264.9L388.3 265L387.8 265.3L387.2 265.8L386.7 266.4L386.3 267.2L386 268L385.8 268.9L385.7 269.7L385.7 270.5L385.9 271.2L386.2 271.8L386.6 272.2L387 272.5\"/></g></g><g class=\"it\" data-name=\"riser\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M300.7 306.4L328.6 254.8L338 250.6L346.9 259.5L319 311.1L309.7 315.2Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M319 311.1L309.7 315.2L337.6 263.7L346.9 259.5Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M309.7 315.2L300.7 306.4L328.6 254.8L337.6 263.7Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M346.9 259.5L337.6 263.7L328.6 254.8L338 250.6Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M346.9 259.5L337.6 263.7M309.7 315.2L337.6 263.7M337.6 263.7L328.6 254.8\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M300.7 306.4L328.6 254.8L338 250.6L346.9 259.5L319 311.1L309.7 315.2Z\"/></g></g><g class=\"it\" data-name=\"handlebar\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M292 273.5L292 272.8L292.2 272.1L292.5 271.5L292.9 271L293.4 270.7L383.2 230.6L383.7 230.4L384.3 230.4L385 230.5L385.6 230.8L386.2 231.2L386.8 231.8L387.3 232.4L387.7 233.1L388 233.9L388.2 234.7L388.2 235.5L388.2 236.2L388 236.9L387.7 237.5L387.3 238L386.8 238.3L297 278.4L296.5 278.6L295.9 278.6L295.2 278.5L294.6 278.2L294 277.8L293.4 277.2L292.9 276.6L292.5 275.9L292.2 275.1L292 274.3Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M297 278.4L297.5 278L297.9 277.6L298.2 277L298.4 276.3L298.5 275.6L298.4 274.8L298.2 274L297.9 273.2L387.7 233.1L388 233.9L388.2 234.7L388.2 235.5L388.2 236.2L388 236.9L387.7 237.5L387.3 238L386.8 238.3Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M297.9 273.2L297.5 272.5L387.3 232.4L387.7 233.1Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M297.5 272.5L297 271.8L386.8 231.8L387.3 232.4ZM295.2 274.5L295.2 274.5L295.2 274.5L295.2 274.5L295.2 274.5L295.2 274.5L295.2 274.5L295.2 274.5L295.2 274.5L295.2 274.5L295.2 274.5L295.2 274.5L295.2 274.5L295.2 274.5L295.2 274.5L295.2 274.5L295.2 274.5L295.2 274.5L295.2 274.5L295.2 274.5L295.2 274.5L295.2 274.5L295.2 274.5L295.2 274.5L295.2 274.5L295.2 274.5L295.2 274.5L295.2 274.5L295.2 274.5L295.2 274.5L295.2 274.5L295.2 274.5L295.2 274.5L298.5 275.6L298.4 276.3L298.2 277L297.9 277.6L297.5 278L297 278.4L296.5 278.6L295.9 278.6L295.2 278.5L294.6 278.2L294 277.8L293.4 277.2L292.9 276.6L292.5 275.9L292.2 275.1L292 274.3L292 273.5L292 272.8L292.2 272.1L292.5 271.5L292.9 271L293.4 270.7L294 270.5L294.6 270.5L295.2 270.6L295.9 270.9L296.5 271.3L297 271.8L297.5 272.5L297.9 273.2L298.2 274L298.4 274.8L298.5 275.6Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M297 271.8L296.5 271.3L295.9 270.9L385.6 230.8L386.2 231.2L386.8 231.8Z\"/><path class=\"iso-top\" d=\"M295.9 270.9L295.2 270.6L294.6 270.5L294 270.5L293.4 270.7L383.2 230.6L383.7 230.4L384.3 230.4L385 230.5L385.6 230.8Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M297 278.4L297.8 277.8L298.3 276.7L298.5 275.4L298.3 274L297.7 272.7L296.8 271.5L295.7 270.8L294.6 270.5L293.5 270.7\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M292 273.5L292 272.8L292.2 272.1L292.5 271.5L292.9 271L293.4 270.7L383.2 230.6L383.7 230.4L384.3 230.4L385 230.5L385.6 230.8L386.2 231.2L386.8 231.8L387.3 232.4L387.7 233.1L388 233.9L388.2 234.7L388.2 235.5L388.2 236.2L388 236.9L387.7 237.5L387.3 238L386.8 238.3L297 278.4L296.5 278.6L295.9 278.6L295.2 278.5L294.6 278.2L294 277.8L293.4 277.2L292.9 276.6L292.5 275.9L292.2 275.1L292 274.3Z\"/></g></g><g class=\"it\" data-name=\"hoodR\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M382.4 226.9L382.8 226.6L389 223.8L389.8 223.6L390.7 223.6L391.6 223.7L400.9 226.6L401.4 226.9L401.5 227.3L401.5 239.7L401.1 240L394.9 242.8L394.1 243L393.2 243L392.3 242.9L383 239.9L382.5 239.6L382.4 239.3Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M401.5 239.7L401.1 240L401.1 227.6L401.5 227.3ZM401.1 240L394.9 242.8L394.9 230.4L401.1 227.6ZM394.9 242.8L394.1 243L394.1 230.6L394.9 230.4Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M394.1 243L393.2 243L393.2 230.6L394.1 230.6Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M393.2 243L392.3 242.9L392.3 230.5L393.2 230.6Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M392.3 242.9L383 239.9L383 227.6L392.3 230.5ZM383 239.9L382.5 239.6L382.5 227.3L383 227.6ZM382.5 239.6L382.4 239.3L382.4 226.9L382.5 227.3Z\"/><path class=\"iso-top\" d=\"M400.9 226.6L401.4 226.9L401.5 227.3L401.1 227.6L394.9 230.4L394.1 230.6L393.2 230.6L392.3 230.5L383 227.6L382.5 227.3L382.4 226.9L382.8 226.6L389 223.8L389.8 223.6L390.7 223.6L391.6 223.7Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M401.5 227.3L401.1 227.6L394.9 230.4L394.1 230.6L393.2 230.6L392.3 230.5L383 227.6L382.5 227.3L382.4 226.9\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M401.5 227.3L400.3 227.4L394.3 230.1L393.8 230.3L393.3 230.3L392.8 230.2L383.7 227.3L383.3 227.1L382.4 226.9\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M382.4 226.9L382.8 226.6L389 223.8L389.8 223.6L390.7 223.6L391.6 223.7L400.9 226.6L401.4 226.9L401.5 227.3M401.5 239.7L401.1 240L394.9 242.8L394.1 243L393.2 243L392.3 242.9L383 239.9L382.5 239.6L382.4 239.3M401.5 227.3L401.5 239.7M382.4 226.9L382.4 239.3\"/></g></g><g class=\"it\" data-name=\"dropR:0\" data-route=\"dropR\"><g class=\"tb\"><path class=\"tb-body\" d=\"M396.7 238.9L398.7 239.4L400.1 241.3L401.5 244.4L402.9 247.7L403.6 250.8L403.6 254L403.4 257.6L403.3 261.1L403.1 262.4L410.9 263.3L411.1 261.8L411.3 258L411.4 254.2L411.4 250L410.5 245.4L408.8 241.3L406.8 237.1L403.4 233.1L399.3 231.5ZM398.8 231.4L398.2 231.5L397.7 231.8L397.1 232.3L396.6 232.9L396.2 233.6L395.8 234.4L395.6 235.3L395.5 236.1L395.5 236.9L395.6 237.6L395.9 238.2L396.2 238.6L396.7 238.9L397.2 239L397.7 238.9L398.3 238.6L398.9 238.1L399.4 237.5L399.8 236.8L400.2 236L400.4 235.1L400.5 234.3L400.5 233.5L400.4 232.8L400.1 232.2L399.8 231.7L399.3 231.5Z\"/><path class=\"tb-shine\" d=\"M398 235.1L400.9 236.6L402.6 239.7L404 243.3L405.3 247L405.8 250.6L405.6 254.1L405.4 257.7L405.2 261.3L404.7 263.7L406.6 264.1L407.1 261.4L407.3 257.8L407.5 254.1L407.6 250.4L407.1 246.4L405.8 242.6L404.2 238.7L402 235L398.7 233.3L396.8 232.7L396.6 232.9L396.2 233.6L395.9 234.3Z\"/><path class=\"tb-shade\" d=\"M397.2 237.3L400.1 237.6L402.8 239.6L404.8 243L406.6 246.6L407.8 250.3L408.1 254.1L408 257.8L407.9 261.5L407.8 264.3L409.3 264.7L409.5 261.6L409.6 257.9L409.7 254.1L409.4 250.2L408.1 246.1L406.2 242.4L404.2 238.8L401 236.3L397.8 235.8L395.6 235.1L395.6 235.3L395.5 236.1L395.5 236.7Z\"/><path class=\"iso-line tb-edge\" data-tone=\"lo\" d=\"M396.7 238.9L398.7 239.4L400.1 241.3L401.5 244.4L402.9 247.7L403.6 250.8L403.6 254L403.4 257.6L403.3 261.1L403.1 262.4M399.3 231.5L403.4 233.1L406.8 237.1L408.8 241.3L410.5 245.4L411.4 250L411.4 254.2L411.3 258L411.1 261.8L410.9 263.3M396.7 238.9L396.2 238.6L395.9 238.2L395.6 237.6L395.5 236.9L395.5 236.1L395.6 235.3L395.8 234.4L396.2 233.6L396.6 232.9L397.1 232.3L397.7 231.8L398.2 231.5L398.8 231.4L399.3 231.5\"/></g></g><g class=\"it\" data-name=\"plugL\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M292.3 309L292.5 307.7L292.9 306.3L293.5 305.1L294.3 304.1L295.2 303.5L296.1 303.3L297 303.6L300.2 304.6L300.9 305.2L301.3 306.2L301.4 307.5L301.3 308.8L300.9 310.2L300.2 311.4L299.4 312.4L298.5 313L297.6 313.2L296.8 312.9L293.5 311.9L292.9 311.3L292.5 310.3Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M298.5 308.8L298.5 308.8L298.5 308.8L298.5 308.8L298.5 308.8L298.5 308.8L298.5 308.8L298.5 308.8L298.5 308.8L298.5 308.8L298.5 308.8L298.5 308.8L298.5 308.8L298.5 308.8L298.5 308.8L295.6 310.1L295.9 308.1L296.7 306.3L297.8 304.9L299.1 304.4L300.3 304.6L301.1 305.8L301.4 307.5L301.1 309.4L300.3 311.2L299.1 312.6L297.8 313.2L296.7 312.9L295.9 311.8L295.6 310.1ZM295.9 311.8L296.7 312.9L293.4 311.9L292.6 310.7Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M295.6 310.1L295.9 311.8L292.6 310.7L292.3 309Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M300.3 304.6L299.1 304.4L295.9 303.3L297.1 303.6ZM295.9 308.1L295.6 310.1L292.3 309L292.6 307.1Z\"/><path class=\"iso-top\" d=\"M299.1 304.4L297.8 304.9L296.7 306.3L295.9 308.1L292.6 307.1L293.4 305.3L294.6 303.9L295.9 303.3Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M299.9 304.4L299 304.4L298.1 304.8L297.2 305.6L296.5 306.6L295.9 307.9L295.6 309.3L295.6 310.7L295.9 311.8L296.4 312.6L297.1 313.1\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M292.3 309L292.5 307.7L292.9 306.3L293.5 305.1L294.3 304.1L295.2 303.5L296.1 303.3L297 303.6L300.2 304.6L300.9 305.2L301.3 306.2L301.4 307.5L301.3 308.8L300.9 310.2L300.2 311.4L299.4 312.4L298.5 313L297.6 313.2L296.8 312.9L293.5 311.9L292.9 311.3L292.5 310.3Z\"/></g></g><g class=\"it\" data-name=\"dropL:1\" data-route=\"dropL\"><g class=\"tb\"><path class=\"tb-body\" d=\"M313.6 299.9L313.5 301.2L313.2 304L312.6 305.5L311.7 306L309.9 306.3L307.4 306.6L305.2 306.6L302.7 305.9L299.7 305L297.3 312.5L300.5 313.5L304.1 314.5L307.8 314.5L311.1 314.1L314.9 313.2L318.7 310.4L320.8 306.1L321.4 301.8L321.4 300.4ZM297.3 312.5L297.8 312.6L298.4 312.5L299 312.1L299.5 311.7L300 311L300.4 310.3L300.7 309.5L300.9 308.6L301 307.8L301 307L300.8 306.3L300.5 305.7L300.1 305.3L299.7 305L299.1 304.9L298.6 305.1L298 305.4L297.5 305.9L297 306.5L296.6 307.2L296.2 308.1L296 308.9L296 309.8L296 310.6L296.2 311.3L296.5 311.8L296.8 312.3Z\"/><path class=\"tb-shine\" d=\"M315.6 298.7L315.4 301.3L314.8 304.4L313.6 306.3L312.2 307.2L310.1 307.7L307.5 308.1L304.9 308.3L302.2 307.7L299.1 306.8L297.2 306.2L297 306.5L296.6 307.2L296.3 307.9L298.5 308.6L301.6 309.6L304.7 310.2L307.6 310L310.4 309.6L313 308.9L315.1 307.5L316.7 304.9L317.3 301.5L317.5 298.8Z\"/><path class=\"tb-shade\" d=\"M318.2 298.8L318.2 301.6L318 305.3L316.9 308.9L314 311.1L310.7 311.7L307.7 311.9L304.5 311.6L301.3 310.5L298.3 309.5L296.1 308.8L296 308.9L296 309.8L296 310.4L297.8 311L300.9 312L304.3 313.2L307.8 313.4L311 313.2L314.6 312.6L318.1 309.9L319.5 305.8L319.7 301.7L319.8 298.9Z\"/><path class=\"iso-line tb-edge\" data-tone=\"lo\" d=\"M313.6 299.9L313.5 301.2L313.2 304L312.6 305.5L311.7 306L309.9 306.3L307.4 306.6L305.2 306.6L302.7 305.9L299.7 305M321.4 300.4L321.4 301.8L320.8 306.1L318.7 310.4L314.9 313.2L311.1 314.1L307.8 314.5L304.1 314.5L300.5 313.5L297.3 312.5M299.7 305L299.1 304.9L298.6 305.1L298 305.4L297.5 305.9L297 306.5L296.6 307.2L296.2 308.1L296 308.9L296 309.8L296 310.6L296.2 311.3L296.5 311.8L296.8 312.3L297.3 312.5\"/></g></g><g class=\"it\" data-name=\"hoodL\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M292.6 267L293 266.7L299.3 263.9L300.1 263.7L301 263.6L301.9 263.8L311.2 266.7L311.7 267L311.8 267.3L311.8 279.7L311.4 280L305.1 282.8L304.4 283L303.4 283.1L302.6 282.9L293.3 280L292.7 279.7L292.6 279.4Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M311.8 279.7L311.4 280L311.4 267.7L311.8 267.3ZM311.4 280L305.1 282.8L305.1 270.5L311.4 267.7ZM305.1 282.8L304.4 283L304.4 270.7L305.1 270.5Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M304.4 283L303.4 283.1L303.4 270.7L304.4 270.7Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M303.4 283.1L302.6 282.9L302.6 270.5L303.4 270.7Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M302.6 282.9L293.3 280L293.3 267.6L302.6 270.5ZM293.3 280L292.7 279.7L292.7 267.3L293.3 267.6ZM292.7 279.7L292.6 279.4L292.6 267L292.7 267.3Z\"/><path class=\"iso-top\" d=\"M311.2 266.7L311.7 267L311.8 267.3L311.4 267.7L305.1 270.5L304.4 270.7L303.4 270.7L302.6 270.5L293.3 267.6L292.7 267.3L292.6 267L293 266.7L299.3 263.9L300.1 263.7L301 263.6L301.9 263.8Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M311.8 267.3L311.4 267.7L305.1 270.5L304.4 270.7L303.4 270.7L302.6 270.5L293.3 267.6L292.7 267.3L292.6 267\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M311.8 267.3L310.6 267.5L304.5 270.2L304.1 270.3L303.6 270.4L303.1 270.3L293.9 267.4L293.6 267.2L292.6 267\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M292.6 267L293 266.7L299.3 263.9L300.1 263.7L301 263.6L301.9 263.8L311.2 266.7L311.7 267L311.8 267.3M311.8 279.7L311.4 280L305.1 282.8L304.4 283L303.4 283.1L302.6 282.9L293.3 280L292.7 279.7L292.6 279.4M311.8 267.3L311.8 279.7M292.6 267L292.6 279.4\"/></g></g><g class=\"it\" data-name=\"dropL:0\" data-route=\"dropL\"><g class=\"tb\"><path class=\"tb-body\" d=\"M306.9 279L309 279.5L310.4 281.4L311.8 284.5L313.2 287.8L313.8 290.9L313.8 294.1L313.7 297.7L313.5 301.2L313.4 302.4L321.2 303.3L321.4 301.8L321.5 298L321.7 294.2L321.7 290L320.7 285.4L319 281.3L317.1 277.2L313.7 273.2L309.6 271.5ZM309.1 271.5L308.5 271.6L307.9 271.9L307.4 272.3L306.9 272.9L306.4 273.7L306.1 274.5L305.8 275.3L305.7 276.2L305.7 277L305.9 277.7L306.1 278.3L306.5 278.7L306.9 279L307.5 279L308 278.9L308.6 278.6L309.1 278.2L309.6 277.6L310.1 276.8L310.4 276L310.7 275.2L310.8 274.3L310.8 273.5L310.6 272.8L310.4 272.2L310 271.8L309.6 271.5Z\"/><path class=\"tb-shine\" d=\"M308.3 275.2L311.1 276.6L312.9 279.8L314.3 283.4L315.6 287L316 290.6L315.8 294.1L315.6 297.8L315.4 301.3L315 303.8L316.8 304.2L317.3 301.5L317.5 297.8L317.7 294.2L317.9 290.4L317.4 286.5L316 282.6L314.5 278.8L312.2 275.1L308.9 273.4L307.1 272.7L306.9 272.9L306.4 273.7L306.1 274.4Z\"/><path class=\"tb-shade\" d=\"M307.5 277.4L310.4 277.6L313.1 279.7L315.1 283.1L316.8 286.6L318.1 290.4L318.4 294.2L318.3 297.9L318.2 301.6L318 304.4L319.6 304.7L319.7 301.7L319.8 297.9L319.9 294.2L319.6 290.2L318.4 286.2L316.5 282.4L314.4 278.8L311.3 276.4L308 275.9L305.9 275.1L305.8 275.3L305.7 276.2L305.7 276.8Z\"/><path class=\"iso-line tb-edge\" data-tone=\"lo\" d=\"M306.9 279L309 279.5L310.4 281.4L311.8 284.5L313.2 287.8L313.8 290.9L313.8 294.1L313.7 297.7L313.5 301.2L313.4 302.4M309.6 271.5L313.7 273.2L317.1 277.2L319 281.3L320.7 285.4L321.7 290L321.7 294.2L321.5 298L321.4 301.8L321.2 303.3M306.9 279L306.5 278.7L306.1 278.3L305.9 277.7L305.7 277L305.7 276.2L305.8 275.3L306.1 274.5L306.4 273.7L306.9 272.9L307.4 272.3L307.9 271.9L308.5 271.6L309.1 271.5L309.6 271.5\"/></g></g><g data-part=\"power\"></g><g data-part=\"runner\"></g><path class=\"iso-halo\" d=\"M500.1 542.4L500.2 538.8L502.2 535.4L505.9 532.1L511.3 529.1L518.1 526.6L526.1 524.7L534.9 523.4L544.3 522.7L553.8 522.7L563.1 523.5L571.8 524.9L579.7 526.9L586.4 529.4L591.6 532.4L595.1 535.7L596.9 539.2L596.9 539.5L596.8 543.1L594.8 546.6L591.1 549.9L585.7 552.8L578.9 555.3L570.9 557.2L562.1 558.6L552.7 559.2L543.2 559.2L533.9 558.5L525.1 557.1L517.3 555L510.6 552.5L505.4 549.5L501.9 546.2L500.1 542.7Z\"/><g class=\"as-tablet\" data-name=\"as.tablet\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M415.5 182.9L466.8 152.1L468.5 151.3L501.8 217.3L450.5 248.1L448.8 248.9Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M450.5 248.1L501.8 217.3L468.5 151.3L417.3 182.1Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M415.5 182.9L448.8 248.9L450.5 248.1L417.3 182.1Z\"/><path class=\"iso-top\" d=\"M466.8 152.1L415.5 182.9L417.3 182.1L468.5 151.3Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M468.5 151.3L417.3 182.1M415.5 182.9L417.3 182.1M417.3 182.1L450.5 248.1\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M415.5 182.9L466.8 152.1L468.5 151.3L501.8 217.3L450.5 248.1L448.8 248.9Z\"/><g transform=\"matrix(1.6082 -0.9641 1.3639 2.7056 420.86 184.14)\"><rect class=\"as-screen\" x=\"0\" y=\"0\" width=\"29.49\" height=\"22.00\" rx=\"0.9\"/><g data-part=\"tablet\"></g><rect class=\"iso-line\" data-tone=\"mid\" fill=\"none\" x=\"0\" y=\"0\" width=\"29.49\" height=\"22.00\" rx=\"0.9\"/></g></g></g><g class=\"mq-wood\" data-name=\"as.handL\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M480.5 183.5L480.7 181.9L481 180.3L481.7 178.8L482.5 177.4L483.6 176.2L484.8 175.2L486.2 174.3L487.7 173.7L489.2 173.3L490.8 173.2L492.5 173.3L494 173.7L495.5 174.3L496.9 175.2L498.1 176.2L499.2 177.4L500 178.8L500.7 180.3L501 181.9L501.2 183.5L501 185.1L500.7 186.7L500 188.2L499.2 189.6L498.1 190.8L496.9 191.9L495.5 192.7L494 193.3L492.5 193.7L490.8 193.8L489.2 193.7L487.7 193.3L486.2 192.7L484.8 191.9L483.6 190.8L482.5 189.6L481.7 188.2L481 186.7L480.7 185.1Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M480.5 183.5L480.7 181.9L481 180.3L481.7 178.8L482.5 177.4L483.6 176.2L484.8 175.2L486.2 174.3L487.7 173.7L489.2 173.3L490.8 173.2L492.5 173.3L494 173.7L495.5 174.3L496.9 175.2L498.1 176.2L499.2 177.4L500 178.8L500.7 180.3L501 181.9L501.2 183.5L501 185.1L500.7 186.7L500 188.2L499.2 189.6L498.1 190.8L496.9 191.9L495.5 192.7L494 193.3L492.5 193.7L490.8 193.8L489.2 193.7L487.7 193.3L486.2 192.7L484.8 191.9L483.6 190.8L482.5 189.6L481.7 188.2L481 186.7L480.7 185.1Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M480.5 183.5L480.7 181.9L481 180.3L481.7 178.8L482.5 177.4L483.6 176.2L484.8 175.2L486.2 174.3L487.7 173.7L489.2 173.3L490.8 173.2L492.5 173.3L494 173.7L495.5 174.3L496.9 175.2L497.2 175.5L497.3 176L497.2 176.7L496.9 177.5L496.4 178.4L495.8 179.4L495 180.5L494.1 181.6L493.1 182.7L491.9 183.8L490.7 184.8L489.5 185.8L488.3 186.7L487.1 187.5L486 188.1L485 188.6L484 189L483.2 189.1L482.6 189.1L482.1 188.9L481.7 188.2L481 186.7L480.7 185.1Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M480.5 183.5L480.7 181.9L481 180.3L481.7 178.8L482.5 177.4L483.6 176.2L484.8 175.2L486.2 174.3L487.7 173.7L489.2 173.3L490.8 173.2L492.5 173.3L494 173.7L494.9 174.1L495.2 174.4L495.3 174.9L495.2 175.5L494.9 176.2L494.5 177.1L493.9 178L493.2 179L492.3 180L491.3 181L490.3 182L489.2 183L488.1 183.9L487 184.8L485.9 185.5L484.8 186.1L483.8 186.5L483 186.8L482.3 187L481.7 187L481.2 186.8L481 186.5L480.7 185.1Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M480.5 183.5L480.7 181.9L481 180.3L481.7 178.8L482.5 177.4L483.6 176.2L484.8 175.2L486.2 174.3L487.7 173.7L489.2 173.3L490.8 173.2L492.3 173.3L492.7 173.4L492.9 173.7L493 174.1L492.9 174.7L492.7 175.3L492.3 176L491.8 176.8L491.2 177.7L490.4 178.6L489.6 179.5L488.7 180.4L487.7 181.2L486.8 182L485.8 182.7L484.8 183.3L483.9 183.8L483.1 184.2L482.4 184.5L481.7 184.6L481.2 184.6L480.8 184.5L480.6 184.2Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M480.5 183.5L480.7 181.9L481 180.3L481.7 178.8L482.5 177.4L483.6 176.2L484.8 175.2L486.2 174.3L487.7 173.7L489.2 173.3L490.8 173.2L492.5 173.3L494 173.7L495.5 174.3L496.9 175.2L498.1 176.2L499.2 177.4L500 178.8L500.7 180.3L501 181.9L501.2 183.5L501 185.1L500.7 186.7L500 188.2L499.2 189.6L498.1 190.8L496.9 191.9L495.5 192.7L494 193.3L492.5 193.7L490.8 193.8L489.2 193.7L487.7 193.3L486.2 192.7L484.8 191.9L483.6 190.8L482.5 189.6L481.7 188.2L481 186.7L480.7 185.1Z\"/></g></g><g class=\"mq-joint\" data-name=\"as.wristL\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M497.8 190.8L497.9 189.6L498.2 188.5L498.7 187.4L499.3 186.4L500 185.5L501 184.7L502 184.1L503.1 183.6L504.2 183.3L505.4 183.2L506.6 183.3L507.8 183.6L508.9 184.1L509.9 184.7L510.8 185.5L511.5 186.4L512.2 187.4L512.6 188.5L512.9 189.6L513 190.8L512.9 192L512.6 193.2L512.2 194.3L511.5 195.3L510.8 196.2L509.9 197L508.9 197.6L507.8 198L506.6 198.3L505.4 198.4L504.2 198.3L503.1 198L502 197.6L501 197L500 196.2L499.3 195.3L498.7 194.3L498.2 193.2L497.9 192Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M497.8 190.8L497.9 189.6L498.2 188.5L498.7 187.4L499.3 186.4L500 185.5L501 184.7L502 184.1L503.1 183.6L504.2 183.3L505.4 183.2L506.6 183.3L507.8 183.6L508.9 184.1L509.9 184.7L510.8 185.5L511.5 186.4L512.2 187.4L512.6 188.5L512.9 189.6L513 190.8L512.9 192L512.6 193.2L512.2 194.3L511.5 195.3L510.8 196.2L509.9 197L508.9 197.6L507.8 198L506.6 198.3L505.4 198.4L504.2 198.3L503.1 198L502 197.6L501 197L500 196.2L499.3 195.3L498.7 194.3L498.2 193.2L497.9 192Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M497.8 190.8L497.9 189.6L498.2 188.5L498.7 187.4L499.3 186.4L500 185.5L501 184.7L502 184.1L503.1 183.6L504.2 183.3L505.4 183.2L506.6 183.3L507.8 183.6L508.9 184.1L509.9 184.7L510.1 185L510.2 185.3L510.1 185.8L509.9 186.4L509.5 187.1L509.1 187.8L508.5 188.6L507.8 189.4L507 190.2L506.2 191L505.3 191.8L504.4 192.5L503.5 193.2L502.7 193.8L501.8 194.2L501.1 194.6L500.4 194.8L499.8 195L499.4 194.9L499 194.8L498.7 194.3L498.2 193.2L497.9 192Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M497.8 190.8L497.9 189.6L498.2 188.5L498.7 187.4L499.3 186.4L500 185.5L501 184.7L502 184.1L503.1 183.6L504.2 183.3L505.4 183.2L506.6 183.3L507.8 183.6L508.4 183.9L508.6 184.1L508.7 184.5L508.6 184.9L508.4 185.5L508.1 186.1L507.7 186.8L507.1 187.5L506.5 188.2L505.8 189L505 189.7L504.2 190.5L503.4 191.1L502.5 191.7L501.7 192.3L501 192.7L500.3 193L499.6 193.3L499.1 193.4L498.7 193.4L498.3 193.2L498.1 193L497.9 192Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M497.8 190.8L497.9 189.6L498.2 188.5L498.7 187.4L499.3 186.4L500 185.5L501 184.7L502 184.1L503.1 183.6L504.2 183.3L505.4 183.2L506.5 183.3L506.7 183.4L506.9 183.6L507 183.9L506.9 184.3L506.7 184.8L506.5 185.3L506.1 185.9L505.6 186.6L505.1 187.2L504.5 187.9L503.8 188.5L503.1 189.1L502.4 189.7L501.7 190.2L501 190.7L500.3 191.1L499.7 191.4L499.2 191.6L498.7 191.6L498.3 191.6L498.1 191.5L497.9 191.3Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M497.8 190.8L497.9 189.6L498.2 188.5L498.7 187.4L499.3 186.4L500 185.5L501 184.7L502 184.1L503.1 183.6L504.2 183.3L505.4 183.2L506.6 183.3L507.8 183.6L508.9 184.1L509.9 184.7L510.8 185.5L511.5 186.4L512.2 187.4L512.6 188.5L512.9 189.6L513 190.8L512.9 192L512.6 193.2L512.2 194.3L511.5 195.3L510.8 196.2L509.9 197L508.9 197.6L507.8 198L506.6 198.3L505.4 198.4L504.2 198.3L503.1 198L502 197.6L501 197L500 196.2L499.3 195.3L498.7 194.3L498.2 193.2L497.9 192Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.foreL\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M505.4 197.3L505.4 196.8L505.5 196.1L505.6 195.4L505.9 194.6L506.2 193.7L506.6 192.8L507 191.9L507.4 191L507.9 190.2L508.4 189.4L508.9 188.7L509.4 188L509.9 187.5L510.3 187.1L510.7 186.8L511.1 186.7L511.4 186.7L569.9 212.7L570.2 212.9L570.4 213.3L570.5 214L570.5 214.7L570.3 215.7L570.1 216.8L569.7 218L569.3 219.2L568.7 220.5L568.1 221.9L567.4 223.2L566.7 224.4L566 225.6L565.2 226.7L564.5 227.6L563.8 228.4L563.1 229L562.6 229.4L562.1 229.6L561.6 229.6L505.8 198.1L505.6 198L505.4 197.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M565.8 221.2L565.8 221.2L565.8 221.2L565.8 221.2L565.8 221.2L565.8 221.2L565.8 221.2L565.8 221.2L565.8 221.2L565.8 221.2L565.8 221.2L565.8 221.2L565.8 221.2L565.8 221.2L565.8 221.2L565.8 221.2L565.8 221.2L565.8 221.2L565.8 221.2L565.8 221.2L565.8 221.2L565.8 221.2L565.8 221.2L565.8 221.2L565.8 221.2L565.8 221.2L565.8 221.2L565.8 221.2L565.8 221.2L565.8 221.2L565.8 221.2L565.8 221.2L565.8 221.2L569.7 218L569.1 219.5L568.4 221.2L567.6 222.9L566.7 224.4L565.8 225.9L564.9 227.2L564 228.2L563.1 229L562.4 229.5L561.8 229.6L561.4 229.5L561.1 229L561 228.2L561.1 227.1L561.4 225.8L561.8 224.4L562.4 222.8L563.1 221.1L563.9 219.5L564.8 217.9L565.8 216.4L566.7 215.1L567.6 214.1L568.4 213.3L569.1 212.8L569.7 212.7L570.1 212.8L570.4 213.3L570.5 214.1L570.4 215.2L570.2 216.5L569.7 218ZM561 228.2L561.1 229L561.4 229.5L505.6 198L505.4 197.7L505.3 197.2Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M561.4 225.8L561.1 227.1L561 228.2L505.3 197.2L505.4 196.4L505.6 195.6Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M570.1 212.8L569.7 212.7L511.2 186.7L511.5 186.8ZM562.4 222.8L561.8 224.4L561.4 225.8L505.6 195.6L505.9 194.6L506.3 193.5Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M569.7 212.7L569.1 212.8L568.4 213.3L567.6 214.1L509.8 187.6L510.3 187.1L510.8 186.8L511.2 186.7ZM564.8 217.9L563.9 219.5L563.1 221.1L562.4 222.8L506.3 193.5L506.8 192.4L507.3 191.3L507.9 190.2Z\"/><path class=\"iso-top\" d=\"M567.6 214.1L566.7 215.1L565.8 216.4L564.8 217.9L507.9 190.2L508.5 189.2L509.2 188.3L509.8 187.6Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M570 212.7L569.6 212.7L569.1 212.8L568.5 213.2L567.9 213.7L567.2 214.5L566.5 215.4L565.8 216.4L565 217.5L564.3 218.8L563.6 220.1L563 221.4L562.4 222.7L561.9 224L561.6 225.2L561.3 226.3L561.1 227.3L561 228.1L561.1 228.8L561.2 229.3L561.5 229.5\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M505.4 197.3L505.4 196.8L505.5 196.1L505.6 195.4L505.9 194.6L506.2 193.7L506.6 192.8L507 191.9L507.4 191L507.9 190.2L508.4 189.4L508.9 188.7L509.4 188L509.9 187.5L510.3 187.1L510.7 186.8L511.1 186.7L511.4 186.7L569.9 212.7L570.2 212.9L570.4 213.3L570.5 214L570.5 214.7L570.3 215.7L570.1 216.8L569.7 218L569.3 219.2L568.7 220.5L568.1 221.9L567.4 223.2L566.7 224.4L566 225.6L565.2 226.7L564.5 227.6L563.8 228.4L563.1 229L562.6 229.4L562.1 229.6L561.6 229.6L505.8 198.1L505.6 198L505.4 197.7Z\"/></g></g><g class=\"mq-joint\" data-name=\"as.elbowL\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M559.9 223.5L560 221.9L560.4 220.2L561 218.7L561.9 217.3L563 216L564.2 214.9L565.7 214.1L567.2 213.4L568.8 213L570.5 212.9L572.1 213L573.8 213.4L575.3 214.1L576.7 214.9L578 216L579.1 217.3L580 218.7L580.6 220.2L581 221.9L581.1 223.5L581 225.2L580.6 226.8L580 228.3L579.1 229.8L578 231L576.7 232.1L575.3 233L573.8 233.6L572.1 234L570.5 234.1L568.8 234L567.2 233.6L565.7 233L564.2 232.1L563 231L561.9 229.8L561 228.3L560.4 226.8L560 225.2Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M559.9 223.5L560 221.9L560.4 220.2L561 218.7L561.9 217.3L563 216L564.2 214.9L565.7 214.1L567.2 213.4L568.8 213L570.5 212.9L572.1 213L573.8 213.4L575.3 214.1L576.7 214.9L578 216L579.1 217.3L580 218.7L580.6 220.2L581 221.9L581.1 223.5L581 225.2L580.6 226.8L580 228.3L579.1 229.8L578 231L576.7 232.1L575.3 233L573.8 233.6L572.1 234L570.5 234.1L568.8 234L567.2 233.6L565.7 233L564.2 232.1L563 231L561.9 229.8L561 228.3L560.4 226.8L560 225.2Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M559.9 223.5L560 221.9L560.4 220.2L561 218.7L561.9 217.3L563 216L564.2 214.9L565.7 214.1L567.2 213.4L568.8 213L570.5 212.9L572.1 213L573.8 213.4L575.3 214.1L576.7 214.9L577 215.3L577.1 215.8L577 216.5L576.7 217.3L576.3 218.3L575.6 219.3L574.8 220.4L573.8 221.5L572.8 222.7L571.6 223.8L570.4 224.9L569.1 225.9L567.9 226.8L566.7 227.6L565.5 228.3L564.4 228.8L563.5 229.1L562.7 229.3L562 229.3L561.5 229.1L561 228.3L560.4 226.8L560 225.2Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M559.9 223.5L560 221.9L560.4 220.2L561 218.7L561.9 217.3L563 216L564.2 214.9L565.7 214.1L567.2 213.4L568.8 213L570.5 212.9L572.1 213L573.8 213.4L574.7 213.8L574.9 214.1L575 214.6L574.9 215.3L574.7 216L574.2 216.9L573.6 217.8L572.9 218.9L572 219.9L571 221L569.9 222L568.8 223L567.6 224L566.5 224.8L565.3 225.5L564.3 226.2L563.3 226.6L562.4 226.9L561.6 227.1L561 227.1L560.6 226.9L560.3 226.6L560 225.2Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M559.9 223.5L560 221.9L560.4 220.2L561 218.7L561.9 217.3L563 216L564.2 214.9L565.7 214.1L567.2 213.4L568.8 213L570.5 212.9L572 213L572.4 213.2L572.6 213.5L572.7 213.9L572.6 214.4L572.4 215.1L572 215.8L571.5 216.7L570.8 217.5L570 218.5L569.2 219.4L568.3 220.3L567.3 221.1L566.3 222L565.3 222.7L564.3 223.3L563.4 223.9L562.5 224.3L561.7 224.5L561.1 224.7L560.6 224.7L560.2 224.5L559.9 224.2Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M559.9 223.5L560 221.9L560.4 220.2L561 218.7L561.9 217.3L563 216L564.2 214.9L565.7 214.1L567.2 213.4L568.8 213L570.5 212.9L572.1 213L573.8 213.4L575.3 214.1L576.7 214.9L578 216L579.1 217.3L580 218.7L580.6 220.2L581 221.9L581.1 223.5L581 225.2L580.6 226.8L580 228.3L579.1 229.8L578 231L576.7 232.1L575.3 233L573.8 233.6L572.1 234L570.5 234.1L568.8 234L567.2 233.6L565.7 233L564.2 232.1L563 231L561.9 229.8L561 228.3L560.4 226.8L560 225.2Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.upperL\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M559.2 145.3L559.3 144.6L559.6 143.9L560 143.2L560.7 142.6L561.5 142L562.4 141.4L563.5 140.9L564.7 140.5L566 140.2L567.4 139.9L568.9 139.8L570.3 139.7L571.8 139.7L573.3 139.8L574.7 140L576.1 140.3L577.4 140.6L578.6 141L579.7 141.5L580.6 142.1L581.4 142.7L582.1 143.4L582.5 144.1L582.8 144.8L582.9 145.5L579 218.8L578.9 219.3L578.7 219.8L578.4 220.3L578 220.8L577.4 221.2L576.7 221.6L575.9 222L575 222.3L574.1 222.5L573.1 222.7L572.1 222.8L571 222.9L570 222.8L568.9 222.8L567.9 222.6L566.9 222.4L565.9 222.2L565.1 221.9L564.3 221.5L563.6 221.1L563.1 220.7L562.6 220.2L562.3 219.7L562.1 219.2L562 218.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M569.8 151.1L572.1 151.1L574.4 150.9L576.5 150.5L578.5 149.9L580.1 149.1L581.4 148.2L582.3 147.2L582.8 146.1L579 219.2L578.6 220L578 220.8L577 221.4L575.9 222L574.5 222.4L572.9 222.7L571.3 222.8L569.6 222.8Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M565.4 150.4L567.5 150.9L569.8 151.1L569.6 222.8L568 222.7L566.5 222.3Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M561.8 149L563.5 149.8L565.4 150.4L566.5 222.3L565.1 221.9L563.9 221.3Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M559.2 145.9L559.7 147L560.6 148L561.8 149L563.9 221.3L563 220.6L562.4 219.9L562.1 219.1Z\"/><path class=\"iso-top\" d=\"M571 145.4L571 145.4L571 145.4L571 145.4L571 145.4L571 145.4L571 145.4L571 145.4L571 145.4L571 145.4L571 145.4L571 145.4L571 145.4L571 145.4L571 145.4L571 145.4L571 145.4L571 145.4L571 145.4L571 145.4L571 145.4L571 145.4L571 145.4L571 145.4L571 145.4L571 145.4L571 145.4L571 145.4L571 145.4L571 145.4L571 145.4L571 145.4L571 145.4L563.5 149.8L561.8 149L560.6 148L559.7 147L559.2 145.9L559.3 144.7L559.7 143.6L560.6 142.6L561.9 141.7L563.6 140.9L565.5 140.3L567.7 139.9L570 139.7L572.3 139.7L574.6 140L576.7 140.4L578.6 141L580.2 141.9L581.5 142.8L582.4 143.8L582.8 144.9L582.8 146.1L582.3 147.2L581.4 148.2L580.1 149.1L578.5 149.9L576.5 150.5L574.4 150.9L572.1 151.1L569.8 151.1L567.5 150.9L565.4 150.4L563.5 149.8Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M559.2 145.4L559.3 146.2L559.6 146.9L560.1 147.5L560.7 148.2L561.5 148.8L562.5 149.3L563.5 149.8L564.7 150.2L566 150.6L567.4 150.8L568.8 151L570.3 151.1L571.7 151.1L573.2 151.1L574.6 150.9L576 150.6L577.3 150.3L578.5 149.9L579.5 149.4L580.5 148.9L581.3 148.3L582 147.7L582.4 147L582.7 146.3L582.9 145.6\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M559.2 145.3L559.3 144.6L559.6 143.9L560 143.2L560.7 142.6L561.5 142L562.4 141.4L563.5 140.9L564.7 140.5L566 140.2L567.4 139.9L568.9 139.8L570.3 139.7L571.8 139.7L573.3 139.8L574.7 140L576.1 140.3L577.4 140.6L578.6 141L579.7 141.5L580.6 142.1L581.4 142.7L582.1 143.4L582.5 144.1L582.8 144.8L582.9 145.5L579 218.8L578.9 219.3L578.7 219.8L578.4 220.3L578 220.8L577.4 221.2L576.7 221.6L575.9 222L575 222.3L574.1 222.5L573.1 222.7L572.1 222.8L571 222.9L570 222.8L568.9 222.8L567.9 222.6L566.9 222.4L565.9 222.2L565.1 221.9L564.3 221.5L563.6 221.1L563.1 220.7L562.6 220.2L562.3 219.7L562.1 219.2L562 218.7Z\"/></g></g><g class=\"mq-joint\" data-name=\"as.shoulderL\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M557.1 139.6L557.3 137.4L557.8 135.2L558.6 133.2L559.8 131.4L561.2 129.7L562.9 128.3L564.7 127.1L566.8 126.3L568.9 125.8L571.1 125.6L573.3 125.8L575.4 126.3L577.4 127.1L579.3 128.3L580.9 129.7L582.4 131.4L583.5 133.2L584.4 135.2L584.9 137.4L585 139.6L584.9 141.7L584.4 143.9L583.5 145.9L582.4 147.8L580.9 149.4L579.3 150.9L577.4 152L575.4 152.8L573.3 153.4L571.1 153.5L568.9 153.4L566.8 152.8L564.7 152L562.9 150.9L561.2 149.4L559.8 147.8L558.6 145.9L557.8 143.9L557.3 141.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M557.1 139.6L557.3 137.4L557.8 135.2L558.6 133.2L559.8 131.4L561.2 129.7L562.9 128.3L564.7 127.1L566.8 126.3L568.9 125.8L571.1 125.6L573.3 125.8L575.4 126.3L577.4 127.1L579.3 128.3L580.9 129.7L582.4 131.4L583.5 133.2L584.4 135.2L584.9 137.4L585 139.6L584.9 141.7L584.4 143.9L583.5 145.9L582.4 147.8L580.9 149.4L579.3 150.9L577.4 152L575.4 152.8L573.3 153.4L571.1 153.5L568.9 153.4L566.8 152.8L564.7 152L562.9 150.9L561.2 149.4L559.8 147.8L558.6 145.9L557.8 143.9L557.3 141.7Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M557.1 139.6L557.3 137.4L557.8 135.2L558.6 133.2L559.8 131.4L561.2 129.7L562.9 128.3L564.7 127.1L566.8 126.3L568.9 125.8L571.1 125.6L573.3 125.8L575.4 126.3L577.4 127.1L579.3 128.3L579.7 128.8L579.8 129.5L579.7 130.4L579.3 131.4L578.7 132.7L577.8 134L576.7 135.5L575.5 136.9L574.1 138.5L572.5 139.9L570.9 141.4L569.3 142.7L567.6 143.9L566 145L564.5 145.8L563.1 146.5L561.9 146.9L560.8 147.2L559.9 147.1L559.3 146.9L558.6 145.9L557.8 143.9L557.3 141.7Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M557.1 139.6L557.3 137.4L557.8 135.2L558.6 133.2L559.8 131.4L561.2 129.7L562.9 128.3L564.7 127.1L566.8 126.3L568.9 125.8L571.1 125.6L573.3 125.8L575.4 126.3L576.6 126.8L576.9 127.2L577.1 127.9L576.9 128.7L576.6 129.7L576 130.8L575.2 132.1L574.2 133.4L573 134.8L571.7 136.2L570.3 137.6L568.8 138.9L567.3 140.1L565.8 141.2L564.3 142.2L562.9 143L561.6 143.6L560.4 144.1L559.4 144.3L558.7 144.2L558.1 144L557.7 143.6L557.3 141.7Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M557.1 139.6L557.3 137.4L557.8 135.2L558.6 133.2L559.8 131.4L561.2 129.7L562.9 128.3L564.7 127.1L566.8 126.3L568.9 125.8L571.1 125.6L573 125.7L573.5 125.9L573.8 126.3L573.9 126.9L573.8 127.6L573.5 128.5L573 129.5L572.3 130.5L571.5 131.7L570.5 132.9L569.4 134.1L568.1 135.3L566.9 136.4L565.5 137.5L564.2 138.5L562.9 139.3L561.7 140L560.6 140.5L559.6 140.9L558.7 141.1L558 141.1L557.5 140.8L557.2 140.5Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M557.1 139.6L557.3 137.4L557.8 135.2L558.6 133.2L559.8 131.4L561.2 129.7L562.9 128.3L564.7 127.1L566.8 126.3L568.9 125.8L571.1 125.6L573.3 125.8L575.4 126.3L577.4 127.1L579.3 128.3L580.9 129.7L582.4 131.4L583.5 133.2L584.4 135.2L584.9 137.4L585 139.6L584.9 141.7L584.4 143.9L583.5 145.9L582.4 147.8L580.9 149.4L579.3 150.9L577.4 152L575.4 152.8L573.3 153.4L571.1 153.5L568.9 153.4L566.8 152.8L564.7 152L562.9 150.9L561.2 149.4L559.8 147.8L558.6 145.9L557.8 143.9L557.3 141.7Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.toeL\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M510.9 519.7L514 516.5L525.6 509.5L538.8 510.4L538.8 519.9L527.2 526.9L515 524Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M527.2 517.3L527.2 526.9L538.8 519.9L538.8 510.4Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M527.2 526.9L515 524L510.9 519.7L514 516.5L527.2 517.3Z\"/><path class=\"iso-top\" d=\"M514 516.5L527.2 517.3L538.8 510.4L525.6 509.5Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M514 516.5L527.2 517.3M527.2 517.3L538.8 510.4M527.2 517.3L527.2 526.9\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M510.9 519.7L514 516.5L525.6 509.5L538.8 510.4L538.8 519.9L527.2 526.9L515 524Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.footL\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M527.7 523.3L530.2 515.5L542.5 508.1L568.7 510.8L581.5 514.4L589.3 519.1L590.1 527.2L588.3 531.2L576.1 538.6L529.2 527.6Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M577.1 526.4L577.9 534.5L590.1 527.2L589.3 519.1ZM577.9 534.5L576.1 538.6L588.3 531.2L590.1 527.2Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M576.1 538.6L529.2 527.6L527.7 523.3L530.2 515.5L556.4 518.1L569.3 521.7L577.1 526.4L577.9 534.5Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M569.3 521.7L577.1 526.4L589.3 519.1L581.5 514.4Z\"/><path class=\"iso-top\" d=\"M530.2 515.5L556.4 518.1L568.7 510.8L542.5 508.1ZM556.4 518.1L569.3 521.7L581.5 514.4L568.7 510.8Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M530.2 515.5L556.4 518.1M556.4 518.1L569.3 521.7M569.3 521.7L577.1 526.4M577.1 526.4L589.3 519.1M577.1 526.4L577.9 534.5M577.9 534.5L590.1 527.2M577.9 534.5L576.1 538.6\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M527.7 523.3L530.2 515.5L542.5 508.1L568.7 510.8L581.5 514.4L589.3 519.1L590.1 527.2L588.3 531.2L576.1 538.6L529.2 527.6Z\"/></g></g><g class=\"mq-joint\" data-name=\"as.ankleL\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M559.2 513.2L559.3 511.7L559.7 510.1L560.3 508.7L561.1 507.3L562.2 506.1L563.3 505.1L564.7 504.3L566.1 503.7L567.7 503.3L569.2 503.2L570.8 503.3L572.3 503.7L573.8 504.3L575.1 505.1L576.3 506.1L577.3 507.3L578.2 508.7L578.8 510.1L579.1 511.7L579.3 513.2L579.1 514.8L578.8 516.3L578.2 517.8L577.3 519.1L576.3 520.3L575.1 521.3L573.8 522.2L572.3 522.8L570.8 523.1L569.2 523.2L567.7 523.1L566.1 522.8L564.7 522.2L563.3 521.3L562.2 520.3L561.1 519.1L560.3 517.8L559.7 516.3L559.3 514.8Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M559.2 513.2L559.3 511.7L559.7 510.1L560.3 508.7L561.1 507.3L562.2 506.1L563.3 505.1L564.7 504.3L566.1 503.7L567.7 503.3L569.2 503.2L570.8 503.3L572.3 503.7L573.8 504.3L575.1 505.1L576.3 506.1L577.3 507.3L578.2 508.7L578.8 510.1L579.1 511.7L579.3 513.2L579.1 514.8L578.8 516.3L578.2 517.8L577.3 519.1L576.3 520.3L575.1 521.3L573.8 522.2L572.3 522.8L570.8 523.1L569.2 523.2L567.7 523.1L566.1 522.8L564.7 522.2L563.3 521.3L562.2 520.3L561.1 519.1L560.3 517.8L559.7 516.3L559.3 514.8Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M559.2 513.2L559.3 511.7L559.7 510.1L560.3 508.7L561.1 507.3L562.2 506.1L563.3 505.1L564.7 504.3L566.1 503.7L567.7 503.3L569.2 503.2L570.8 503.3L572.3 503.7L573.8 504.3L575.1 505.1L575.4 505.5L575.5 506L575.4 506.6L575.1 507.4L574.7 508.3L574.1 509.3L573.3 510.3L572.4 511.4L571.4 512.4L570.3 513.5L569.1 514.5L568 515.5L566.8 516.3L565.6 517.1L564.5 517.7L563.5 518.2L562.6 518.5L561.9 518.7L561.2 518.7L560.8 518.5L560.3 517.8L559.7 516.3L559.3 514.8Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M559.2 513.2L559.3 511.7L559.7 510.1L560.3 508.7L561.1 507.3L562.2 506.1L563.3 505.1L564.7 504.3L566.1 503.7L567.7 503.3L569.2 503.2L570.8 503.3L572.3 503.7L573.2 504L573.4 504.4L573.5 504.8L573.4 505.4L573.2 506.2L572.8 507L572.2 507.9L571.5 508.8L570.6 509.8L569.7 510.8L568.7 511.8L567.6 512.8L566.5 513.6L565.5 514.4L564.4 515.1L563.4 515.7L562.4 516.2L561.6 516.5L560.9 516.6L560.3 516.6L559.9 516.4L559.6 516.1L559.3 514.8Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M559.2 513.2L559.3 511.7L559.7 510.1L560.3 508.7L561.1 507.3L562.2 506.1L563.3 505.1L564.7 504.3L566.1 503.7L567.7 503.3L569.2 503.2L570.6 503.3L571 503.5L571.2 503.7L571.3 504.1L571.2 504.7L571 505.3L570.6 506L570.1 506.8L569.5 507.6L568.8 508.4L568 509.3L567.1 510.2L566.2 511L565.3 511.7L564.3 512.4L563.4 513L562.5 513.5L561.7 513.9L561 514.2L560.4 514.3L559.9 514.3L559.5 514.2L559.3 513.9Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M559.2 513.2L559.3 511.7L559.7 510.1L560.3 508.7L561.1 507.3L562.2 506.1L563.3 505.1L564.7 504.3L566.1 503.7L567.7 503.3L569.2 503.2L570.8 503.3L572.3 503.7L573.8 504.3L575.1 505.1L576.3 506.1L577.3 507.3L578.2 508.7L578.8 510.1L579.1 511.7L579.3 513.2L579.1 514.8L578.8 516.3L578.2 517.8L577.3 519.1L576.3 520.3L575.1 521.3L573.8 522.2L572.3 522.8L570.8 523.1L569.2 523.2L567.7 523.1L566.1 522.8L564.7 522.2L563.3 521.3L562.2 520.3L561.1 519.1L560.3 517.8L559.7 516.3L559.3 514.8Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.shankL\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M532.7 403.5L532.8 403.1L533 402.6L533.4 402.1L533.9 401.6L534.6 401.1L535.4 400.6L536.3 400.1L537.3 399.6L538.5 399.1L539.7 398.6L541 398.2L542.4 397.8L543.8 397.4L545.2 397.1L546.7 396.8L548.2 396.6L549.6 396.4L551 396.2L552.3 396.2L553.6 396.1L554.8 396.2L555.9 396.2L556.9 396.4L557.8 396.6L558.5 396.8L559.2 397.1L559.6 397.4L559.9 397.8L560.1 398.2L576.2 506.5L576.2 506.7L576.1 507L576 507.3L575.7 507.6L575.4 507.9L574.9 508.2L574.4 508.5L573.8 508.8L573.2 509.1L572.5 509.3L571.8 509.6L571 509.9L570.2 510.1L569.3 510.3L568.5 510.5L567.6 510.6L566.8 510.8L565.9 510.8L565.1 510.9L564.3 510.9L563.6 510.9L562.9 510.9L562.3 510.8L561.8 510.8L561.3 510.6L560.9 510.5L560.6 510.3L560.3 510.1L560.2 509.9L532.8 404Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M547.4 404.9L550.1 404.3L552.6 403.5L554.8 402.7L556.8 401.7L558.3 400.8L559.4 399.9L560 399L560.1 398.1L576.2 506.4L576.2 506.9L575.8 507.4L575.2 508L574.3 508.6L573.1 509.1L571.8 509.6L570.3 510L568.8 510.4Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M542.1 405.7L544.7 405.4L547.4 404.9L568.8 510.4L567.2 510.7L565.7 510.9Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M534.2 405.1L535.6 405.5L537.5 405.8L539.7 405.8L542.1 405.7L565.7 510.9L564.2 510.9L562.9 510.9L561.9 510.8L561 510.5Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M532.8 403.8L533.2 404.5L534.2 405.1L561 510.5L560.4 510.2L560.2 509.8Z\"/><path class=\"iso-top\" d=\"M546.4 401L546.4 401L546.4 401L546.4 401L546.4 401L546.4 401L546.4 401L546.4 401L546.4 401L546.4 401L546.4 401L546.4 401L546.4 401L546.4 401L546.4 401L546.4 401L546.4 401L546.4 401L546.4 401L546.4 401L546.4 401L546.4 401L546.4 401L546.4 401L546.4 401L546.4 401L546.4 401L546.4 401L546.4 401L546.4 401L546.4 401L546.4 401L546.4 401L537.5 405.8L535.6 405.5L534.2 405.1L533.2 404.5L532.8 403.8L532.8 403L533.4 402.1L534.5 401.1L536.1 400.2L538 399.3L540.3 398.4L542.8 397.7L545.4 397L548.1 396.6L550.7 396.3L553.2 396.1L555.4 396.2L557.2 396.4L558.7 396.8L559.6 397.4L560.1 398.1L560 399L559.4 399.9L558.3 400.8L556.8 401.7L554.8 402.7L552.6 403.5L550.1 404.3L547.4 404.9L544.7 405.4L542.1 405.7L539.7 405.8L537.5 405.8Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M532.8 403.8L532.9 404.2L533.3 404.6L533.8 404.9L534.4 405.2L535.2 405.4L536.1 405.6L537.1 405.7L538.3 405.8L539.5 405.8L540.8 405.8L542.2 405.7L543.6 405.5L545 405.3L546.5 405.1L548 404.8L549.4 404.4L550.8 404.1L552.2 403.6L553.5 403.2L554.7 402.7L555.8 402.2L556.8 401.7L557.7 401.2L558.5 400.7L559.1 400.2L559.6 399.7L559.9 399.2L560.1 398.7L560.1 398.3\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M532.7 403.5L532.8 403.1L533 402.6L533.4 402.1L533.9 401.6L534.6 401.1L535.4 400.6L536.3 400.1L537.3 399.6L538.5 399.1L539.7 398.6L541 398.2L542.4 397.8L543.8 397.4L545.2 397.1L546.7 396.8L548.2 396.6L549.6 396.4L551 396.2L552.3 396.2L553.6 396.1L554.8 396.2L555.9 396.2L556.9 396.4L557.8 396.6L558.5 396.8L559.2 397.1L559.6 397.4L559.9 397.8L560.1 398.2L576.2 506.5L576.2 506.7L576.1 507L576 507.3L575.7 507.6L575.4 507.9L574.9 508.2L574.4 508.5L573.8 508.8L573.2 509.1L572.5 509.3L571.8 509.6L571 509.9L570.2 510.1L569.3 510.3L568.5 510.5L567.6 510.6L566.8 510.8L565.9 510.8L565.1 510.9L564.3 510.9L563.6 510.9L562.9 510.9L562.3 510.8L561.8 510.8L561.3 510.6L560.9 510.5L560.6 510.3L560.3 510.1L560.2 509.9L532.8 404Z\"/></g></g><g class=\"mq-joint\" data-name=\"as.kneeL\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M530.8 394.1L530.9 391.9L531.5 389.7L532.3 387.7L533.5 385.8L534.9 384.1L536.7 382.6L538.6 381.4L540.6 380.6L542.8 380.1L545 379.9L547.3 380.1L549.4 380.6L551.5 381.4L553.4 382.6L555.1 384.1L556.6 385.8L557.7 387.7L558.6 389.7L559.1 391.9L559.3 394.1L559.1 396.4L558.6 398.5L557.7 400.6L556.6 402.5L555.1 404.2L553.4 405.7L551.5 406.8L549.4 407.7L547.3 408.2L545 408.4L542.8 408.2L540.6 407.7L538.6 406.8L536.7 405.7L534.9 404.2L533.5 402.5L532.3 400.6L531.5 398.5L530.9 396.4Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M530.8 394.1L530.9 391.9L531.5 389.7L532.3 387.7L533.5 385.8L534.9 384.1L536.7 382.6L538.6 381.4L540.6 380.6L542.8 380.1L545 379.9L547.3 380.1L549.4 380.6L551.5 381.4L553.4 382.6L555.1 384.1L556.6 385.8L557.7 387.7L558.6 389.7L559.1 391.9L559.3 394.1L559.1 396.4L558.6 398.5L557.7 400.6L556.6 402.5L555.1 404.2L553.4 405.7L551.5 406.8L549.4 407.7L547.3 408.2L545 408.4L542.8 408.2L540.6 407.7L538.6 406.8L536.7 405.7L534.9 404.2L533.5 402.5L532.3 400.6L531.5 398.5L530.9 396.4Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M530.8 394.1L530.9 391.9L531.5 389.7L532.3 387.7L533.5 385.8L534.9 384.1L536.7 382.6L538.6 381.4L540.6 380.6L542.8 380.1L545 379.9L547.3 380.1L549.4 380.6L551.5 381.4L553.4 382.6L553.8 383.1L553.9 383.8L553.8 384.7L553.4 385.8L552.8 387.1L551.9 388.5L550.8 389.9L549.5 391.5L548.1 393L546.5 394.5L544.9 396L543.2 397.3L541.5 398.6L539.9 399.7L538.3 400.5L536.9 401.2L535.6 401.7L534.5 401.9L533.6 401.9L533 401.6L532.3 400.6L531.5 398.5L530.9 396.4Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M530.8 394.1L530.9 391.9L531.5 389.7L532.3 387.7L533.5 385.8L534.9 384.1L536.7 382.6L538.6 381.4L540.6 380.6L542.8 380.1L545 379.9L547.3 380.1L549.4 380.6L550.7 381.1L551 381.5L551.1 382.2L551 383L550.7 384.1L550.1 385.2L549.2 386.5L548.2 387.9L547 389.3L545.7 390.7L544.3 392.1L542.8 393.5L541.2 394.7L539.6 395.9L538.1 396.9L536.7 397.7L535.4 398.3L534.2 398.7L533.2 398.9L532.3 398.9L531.7 398.7L531.4 398.2L530.9 396.4Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M530.8 394.1L530.9 391.9L531.5 389.7L532.3 387.7L533.5 385.8L534.9 384.1L536.7 382.6L538.6 381.4L540.6 380.6L542.8 380.1L545 379.9L547 380L547.5 380.2L547.9 380.6L548 381.2L547.9 381.9L547.5 382.8L547 383.8L546.3 384.9L545.5 386.1L544.4 387.3L543.3 388.6L542 389.8L540.7 390.9L539.4 392L538 393L536.7 393.9L535.5 394.6L534.3 395.1L533.3 395.5L532.4 395.7L531.7 395.7L531.2 395.5L530.9 395.1Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M530.8 394.1L530.9 391.9L531.5 389.7L532.3 387.7L533.5 385.8L534.9 384.1L536.7 382.6L538.6 381.4L540.6 380.6L542.8 380.1L545 379.9L547.3 380.1L549.4 380.6L551.5 381.4L553.4 382.6L555.1 384.1L556.6 385.8L557.7 387.7L558.6 389.7L559.1 391.9L559.3 394.1L559.1 396.4L558.6 398.5L557.7 400.6L556.6 402.5L555.1 404.2L553.4 405.7L551.5 406.8L549.4 407.7L547.3 408.2L545 408.4L542.8 408.2L540.6 407.7L538.6 406.8L536.7 405.7L534.9 404.2L533.5 402.5L532.3 400.6L531.5 398.5L530.9 396.4Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.thighL\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M533.4 386.4L533.4 385.9L541.9 287.7L542 287L542.3 286.3L542.6 285.7L543.1 285.1L543.7 284.5L544.3 284L545.1 283.5L546 283L546.9 282.6L548 282.2L549.1 281.9L550.3 281.6L551.5 281.4L552.8 281.3L554.2 281.1L555.6 281.1L557 281.1L558.5 281.1L559.9 281.2L561.4 281.4L562.9 281.6L564.3 281.9L565.8 282.2L567.2 282.6L568.6 283L569.9 283.4L571.2 283.9L572.4 284.5L573.6 285.1L574.7 285.7L575.7 286.3L576.6 287L577.4 287.6L578.1 288.3L578.8 289L579.3 289.8L579.7 290.5L580 291.2L580.2 291.9L580.3 292.6L580.3 293.3L580.2 294L558.5 390.1L558.4 390.5L558.1 390.9L557.8 391.3L557.5 391.7L557 392L556.5 392.4L555.9 392.7L555.3 393L554.6 393.2L553.9 393.4L553.1 393.6L552.3 393.7L551.4 393.8L550.6 393.9L549.6 394L548.7 394L547.7 393.9L546.8 393.8L545.8 393.7L544.8 393.6L543.9 393.4L542.9 393.2L542 393L541.1 392.7L540.2 392.4L539.4 392.1L538.6 391.7L537.8 391.3L537.1 390.9L536.5 390.5L535.9 390.1L535.3 389.7L534.8 389.2L534.4 388.7L534.1 388.3L533.8 387.8L533.6 387.3L533.5 386.8Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M559.3 299.4L562.2 299.8L565.2 299.9L568 299.9L570.7 299.6L573.1 299.1L575.2 298.4L577.1 297.5L578.5 296.5L579.6 295.3L580.2 294L558.5 390.1L558.1 390.9L557.5 391.7L556.5 392.4L555.3 393L553.9 393.4L552.3 393.7L550.6 393.9L548.7 394L546.8 393.8L544.8 393.6Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M553.6 298L556.4 298.8L559.3 299.4L544.8 393.6L542.9 393.2L541.1 392.7Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M548.6 295.9L551 297.1L553.6 298L541.1 392.7L539.4 392.1L537.8 391.3Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M543.4 292L544.8 293.4L546.5 294.7L548.6 295.9L537.8 391.3L536.5 390.5L535.3 389.7L534.4 388.7Z\"/><path class=\"iso-top\" d=\"M561.1 290.5L561.1 290.5L561.1 290.5L561.1 290.5L561.1 290.5L561.1 290.5L561.1 290.5L561.1 290.5L561.1 290.5L561.1 290.5L561.1 290.5L561.1 290.5L561.1 290.5L561.1 290.5L561.1 290.5L561.1 290.5L561.1 290.5L561.1 290.5L561.1 290.5L561.1 290.5L561.1 290.5L561.1 290.5L561.1 290.5L561.1 290.5L561.1 290.5L561.1 290.5L561.1 290.5L561.1 290.5L561.1 290.5L561.1 290.5L561.1 290.5L561.1 290.5L561.1 290.5L561.1 290.5L561.1 290.5L561.1 290.5L561.1 290.5L561.1 290.5L561.1 290.5L561.1 290.5L561.1 290.5L561.1 290.5L548.6 295.9L546.5 294.7L544.8 293.4L543.4 292L542.5 290.5L541.9 289.1L541.9 287.7L542.3 286.3L543.1 285.1L544.3 284L546 283L548 282.2L550.3 281.6L552.8 281.3L555.6 281.1L558.5 281.1L561.4 281.4L564.3 281.9L567.2 282.6L569.9 283.4L572.4 284.5L574.7 285.7L576.6 287L578.1 288.3L579.3 289.8L580 291.2L580.3 292.6L580.2 294L579.6 295.3L578.5 296.5L577.1 297.5L575.2 298.4L573.1 299.1L570.7 299.6L568 299.9L565.2 299.9L562.2 299.8L559.3 299.4L556.4 298.8L553.6 298L551 297.1L548.6 295.9ZM541.9 287.7L541.9 289.1L542.5 290.5L543.4 292L534.4 388.7L533.8 387.8L533.5 386.8L533.4 385.9Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M541.9 287.8L541.9 288.5L542 289.2L542.2 289.9L542.5 290.7L543 291.4L543.5 292.1L544.2 292.8L544.9 293.5L545.8 294.2L546.7 294.9L547.8 295.5L548.9 296.1L550.1 296.7L551.3 297.2L552.6 297.7L554 298.1L555.3 298.5L556.8 298.9L558.2 299.2L559.7 299.4L561.2 299.6L562.7 299.8L564.1 299.9L565.6 299.9L567 299.9L568.4 299.8L569.7 299.7L571 299.5L572.3 299.3L573.5 299L574.5 298.7L575.6 298.3L576.5 297.8L577.3 297.4L578.1 296.8L578.7 296.3L579.3 295.7L579.7 295.1L580 294.4L580.2 293.8\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M533.4 386.4L533.4 385.9L541.9 287.7L542 287L542.3 286.3L542.6 285.7L543.1 285.1L543.7 284.5L544.3 284L545.1 283.5L546 283L546.9 282.6L548 282.2L549.1 281.9L550.3 281.6L551.5 281.4L552.8 281.3L554.2 281.1L555.6 281.1L557 281.1L558.5 281.1L559.9 281.2L561.4 281.4L562.9 281.6L564.3 281.9L565.8 282.2L567.2 282.6L568.6 283L569.9 283.4L571.2 283.9L572.4 284.5L573.6 285.1L574.7 285.7L575.7 286.3L576.6 287L577.4 287.6L578.1 288.3L578.8 289L579.3 289.8L579.7 290.5L580 291.2L580.2 291.9L580.3 292.6L580.3 293.3L580.2 294L558.5 390.1L558.4 390.5L558.1 390.9L557.8 391.3L557.5 391.7L557 392L556.5 392.4L555.9 392.7L555.3 393L554.6 393.2L553.9 393.4L553.1 393.6L552.3 393.7L551.4 393.8L550.6 393.9L549.6 394L548.7 394L547.7 393.9L546.8 393.8L545.8 393.7L544.8 393.6L543.9 393.4L542.9 393.2L542 393L541.1 392.7L540.2 392.4L539.4 392.1L538.6 391.7L537.8 391.3L537.1 390.9L536.5 390.5L535.9 390.1L535.3 389.7L534.8 389.2L534.4 388.7L534.1 388.3L533.8 387.8L533.6 387.3L533.5 386.8Z\"/></g></g><g class=\"mq-joint\" data-name=\"as.hipL\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M545.8 283.6L546 281L546.6 278.5L547.6 276.2L548.9 274L550.6 272L552.5 270.3L554.7 269L557.1 268L559.6 267.4L562.2 267.2L564.7 267.4L567.2 268L569.6 269L571.8 270.3L573.7 272L575.4 274L576.8 276.2L577.7 278.5L578.3 281L578.5 283.6L578.3 286.2L577.7 288.7L576.8 291L575.4 293.2L573.7 295.2L571.8 296.9L569.6 298.2L567.2 299.2L564.7 299.8L562.2 300L559.6 299.8L557.1 299.2L554.7 298.2L552.5 296.9L550.6 295.2L548.9 293.2L547.6 291L546.6 288.7L546 286.2Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M545.8 283.6L546 281L546.6 278.5L547.6 276.2L548.9 274L550.6 272L552.5 270.3L554.7 269L557.1 268L559.6 267.4L562.2 267.2L564.7 267.4L567.2 268L569.6 269L571.8 270.3L573.7 272L575.4 274L576.8 276.2L577.7 278.5L578.3 281L578.5 283.6L578.3 286.2L577.7 288.7L576.8 291L575.4 293.2L573.7 295.2L571.8 296.9L569.6 298.2L567.2 299.2L564.7 299.8L562.2 300L559.6 299.8L557.1 299.2L554.7 298.2L552.5 296.9L550.6 295.2L548.9 293.2L547.6 291L546.6 288.7L546 286.2Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M545.8 283.6L546 281L546.6 278.5L547.6 276.2L548.9 274L550.6 272L552.5 270.3L554.7 269L557.1 268L559.6 267.4L562.2 267.2L564.7 267.4L567.2 268L569.6 269L571.8 270.3L572.2 270.9L572.4 271.7L572.2 272.8L571.8 274.1L571.1 275.5L570 277.1L568.8 278.8L567.3 280.5L565.7 282.3L563.9 284L562 285.7L560.1 287.3L558.1 288.7L556.2 289.9L554.5 291L552.8 291.7L551.3 292.3L550.1 292.5L549.1 292.5L548.3 292.2L547.6 291L546.6 288.7L546 286.2Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M545.8 283.6L546 281L546.6 278.5L547.6 276.2L548.9 274L550.6 272L552.5 270.3L554.7 269L557.1 268L559.6 267.4L562.2 267.2L564.7 267.4L567.2 268L568.6 268.6L569 269.1L569.2 269.9L569 270.8L568.6 272L567.9 273.4L567 274.8L565.8 276.4L564.5 278L562.9 279.7L561.3 281.3L559.5 282.8L557.8 284.3L556 285.6L554.2 286.7L552.6 287.7L551 288.4L549.7 288.9L548.5 289.1L547.6 289.1L546.9 288.8L546.5 288.3L546 286.2Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M545.8 283.6L546 281L546.6 278.5L547.6 276.2L548.9 274L550.6 272L552.5 270.3L554.7 269L557.1 268L559.6 267.4L562.2 267.2L564.5 267.4L565 267.6L565.4 268.1L565.5 268.7L565.4 269.6L565 270.6L564.5 271.7L563.6 273L562.6 274.4L561.5 275.8L560.1 277.2L558.7 278.6L557.2 279.9L555.7 281.2L554.1 282.3L552.6 283.3L551.2 284.1L549.8 284.7L548.7 285.2L547.7 285.4L546.9 285.4L546.3 285.1L545.9 284.7Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M545.8 283.6L546 281L546.6 278.5L547.6 276.2L548.9 274L550.6 272L552.5 270.3L554.7 269L557.1 268L559.6 267.4L562.2 267.2L564.7 267.4L567.2 268L569.6 269L571.8 270.3L573.7 272L575.4 274L576.8 276.2L577.7 278.5L578.3 281L578.5 283.6L578.3 286.2L577.7 288.7L576.8 291L575.4 293.2L573.7 295.2L571.8 296.9L569.6 298.2L567.2 299.2L564.7 299.8L562.2 300L559.6 299.8L557.1 299.2L554.7 298.2L552.5 296.9L550.6 295.2L548.9 293.2L547.6 291L546.6 288.7L546 286.2Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.pelvis\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M516 288.7L516 287.5L516.2 286.4L516.4 285.2L516.7 284.1L517 282.9L517.3 281.8L517.8 280.7L518.3 279.7L518.8 278.7L519.4 277.8L521 275.8L521.7 274.9L522.4 274L523.2 273.2L525.2 271.5L526.1 270.8L527 270.1L535.5 264.3L536.6 263.7L545.7 258.9L546.7 258.5L547.8 258L550.3 257.2L551.3 256.8L552.5 256.6L555 256.2L556.1 256L557.2 256L558.3 256L559.5 256.1L560.6 256.2L561.9 256.5L563 256.8L564.1 257.1L565.2 257.5L566.2 257.9L567.3 258.4L568.4 259L569.4 259.7L570.4 260.4L571.4 261.2L572.3 262L573.2 262.9L574.1 263.9L574.9 264.9L575.7 265.9L576.4 267L577 268.1L577.6 269.2L578.2 270.4L578.7 271.6L579.1 272.8L579.5 274L579.8 275.2L580 276.4L580.2 277.7L580.3 278.9L580.3 280.1L580.3 281.3L580.2 282.5L580 283.6L579.8 284.7L579.5 285.8L579.1 287L578.8 288.1L578.3 289.2L577.8 290.2L577.2 291.1L576.6 292L575 294.1L574.3 295L573.5 295.8L571.5 297.5L570.7 298.3L569.8 299L561.2 304.8L560.3 305.4L559.2 305.9L550.1 310.7L549 311.1L546.6 312L545.5 312.4L544.4 312.7L543.3 312.9L540.7 313.3L539.6 313.4L538.5 313.4L537.4 313.4L536.2 313.2L535.1 313L533.9 312.8L532.8 312.5L531.7 312.1L530.6 311.7L529.5 311.2L528.5 310.7L527.4 310L526.4 309.3L525.4 308.6L524.5 307.8L523.5 306.9L522.7 306L521.8 305L521 304L520.3 302.9L519.6 301.9L519 300.7L518.4 299.6L517.8 298.4L517.4 297.2L517 296L516.7 294.8L516.4 293.6L516.2 292.3L516 291.1L516 289.9Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M538.9 307.9L538.9 307.9L539.4 307.7L538.6 308.2ZM538.6 308.2L539.4 307.7L539.8 307.5L540.4 307.3L542 306.5L544.6 304.5L546.5 301.8L547.7 298.4L548 294.2L548 294.2L548.8 292.8L549.5 291.4L550 290.1L550.4 288.9L550.7 287.7L551 286.6L551 286.6L551.9 285.8L552.8 284.9L553.6 284.1L554.3 283.3L555.1 282.5L555.8 281.8L555.8 281.8L557.3 280.8L558.9 279.8L560.4 278.7L561.9 277.7L563.3 276.7L564.8 275.7L564.8 275.7L566.2 274.8L567.5 273.8L568.9 272.9L570.2 272L571.6 271.1L572.9 270.2L572.9 270.2L573.4 269.5L573.9 268.9L574.3 268.3L574.7 267.7L575.1 267.1L575.4 266.5L575.4 266.5L575.2 265.7L574.8 265L574.3 264.2L573.7 263.5L573.7 263.4L573.6 263.4L573.6 263.3L573.4 263.1L573 262.8L572.2 262.3L573.2 263.3L574.2 264.3L575.1 265.4L576 266.6L576.7 267.9L577.4 269.1L578.1 270.5L578.6 271.8L579 273.2L579.4 274.6L579.6 276L579.8 277.3L580.1 277.7L580.1 277.8L580.2 277.9L580.2 277.9L580.2 278L580.2 278L580.3 278.3L580.2 278.6L580.1 278.8L580 279.1L575.8 292.9L575.3 293.7L574.8 294.4L574.2 295L573.6 295.6L573 296.2L572.3 296.8L569.7 299L568.3 300L567 301L565.5 302L564.1 303L562.7 303.9L561.2 304.8L559.7 305.7L558.2 306.5L556.7 307.4L555.2 308.2L553.7 309L552.1 309.7L550.6 310.5L547.4 311.7L546.6 312L545.8 312.3L545 312.5L544.2 312.7L543.3 312.9L542.4 313L528.2 310.1L527.9 310.1L527.6 310.1L527.4 310L527.1 309.8L526.9 309.5L526.7 309.1L524.1 307.1L527.4 309.3L530.7 310.4L533.7 310.4L536.3 309.5L537.7 308.7L538.2 308.4ZM577.4 269.1L577.4 269.1L572.2 262.3L573.2 263.3L574.2 264.3L575.1 265.4L576 266.6L576.7 267.9L577.4 269.1L578.1 270.5L578.6 271.8L579 273.2L579.4 274.6L579.6 276L579.8 277.3Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M524.9 304.2L525.7 305L526.6 305.6L527.5 306.2L528.4 306.7L529.4 307.2L530.3 307.5L531.3 307.8L532.3 307.9L533.2 308L534.2 308L535.1 308L536 307.8L536.9 307.5L537.7 307.2L538.5 306.8L539.2 306.3L539.9 305.7L540.5 305L541.1 304.3L541.6 303.5L542.1 302.7L542.4 301.8L542.7 300.8L542.9 299.9L543 298.8L543.1 297.8L543.1 296.7L543 295.7L542.8 294.6L543.8 294.4L544 294.4L544.2 295.6L544.4 296.7L544.4 297.9L544.3 299L544.2 300.1L544 301.2L543.6 302.2L543.3 303.2L542.8 304.1L542.2 305L541.6 305.8L540.9 306.5L540.2 307.1L539.4 307.7L538.5 308.1L537.6 308.5L536.6 308.8L535.7 309L534.6 309.1L533.6 309.1L532.6 309L531.5 308.8L530.5 308.5L529.4 308.1L528.4 307.6L527.4 307.1L526.4 306.4L525.4 305.7L524.5 304.9L524.6 304.8ZM539.4 307.7L540.1 307.2L540.9 306.6L541.5 306L542.1 305.3L542.7 304.5L543.1 303.6L543.5 302.7L543.9 301.8L544.1 300.8L544.3 299.8L544.4 298.7L544.5 297.7L544.4 296.6L544.3 295.5L544.1 294.3L544 294.4L544.2 295.6L544.4 296.7L544.4 297.9L544.3 299L544.2 300.1L544 301.2L543.6 302.2L543.3 303.2L542.8 304.1L542.2 305L541.6 305.8L540.9 306.5L540.2 307.1L539.4 307.7L538.5 308.1L537.6 308.5L536.6 308.8L535.7 309L534.6 309.1L533.6 309.1L532.6 309L531.5 308.8L530.5 308.5L529.4 308.1L528.4 307.6L527.4 307.1L526.4 306.4L525.4 305.7L524.5 304.9ZM531.5 308.8L531.5 308.8L538.6 308.2L537.7 308.5L536.8 308.8L535.9 309L535 309.1L534 309.1L533 309.1L532 308.9L531 308.7L530.1 308.4L529.1 308L528.1 307.5L527.2 307L526.2 306.4L525.3 305.7L524.5 304.9ZM524.5 304.9L525.3 305.7L526.2 306.4L527.2 307L528.1 307.5L529.1 308L530.1 308.4L531 308.7L532 308.9L533 309.1L534 309.1L535 309.1L535.9 309L536.8 308.8L537.7 308.5L538.6 308.2L538.2 308.4L537.7 308.7L536.3 309.5L533.7 310.4L530.7 310.4L527.4 309.3L524.1 307.1L523 306.1L522 304.9L521 303.7L520.2 302.5L521.4 304L522.5 304.8L523.4 305.1L524.1 305.1L524.4 305L524.5 304.9ZM539.4 307.7L540.1 307.2L540.9 306.6L541.5 306L542.1 305.3L542.7 304.5L543.1 303.6L543.5 302.7L543.9 301.8L544.1 300.8L544.3 299.8L544.4 298.7L544.5 297.7L544.4 296.6L544.3 295.5L544.1 294.3L544.2 294.3L544.3 294.3L544.7 294L545.5 293.2L546.1 292.1L546.3 290.5L546.1 288.5L546.8 289.9L547.3 291.3L547.7 292.8L548 294.2L547.7 298.4L546.5 301.8L544.6 304.5L542 306.5L540.4 307.3L539.8 307.5ZM522 304.9L522 304.9L524.1 307.1L523 306.1L522 304.9L521 303.7L520.2 302.5ZM548 294.2L547.7 292.8L547.3 291.3L546.8 289.9L546.1 288.5L546.1 288.5L546.8 289.9L547.3 291.3L547.7 292.8L548 294.2ZM548 294.2L547.7 292.8L547.3 291.3L546.8 289.9L546.1 288.5L546.8 287.4L547.4 286.3L547.8 285.3L548.1 284.3L548.4 283.3L548.6 282.4L548.6 282.4L549.5 281.6L550.2 280.7L551 279.9L551.7 279.1L552.4 278.3L553 277.6L553 277.6L554.6 276.5L556.1 275.5L557.6 274.5L559 273.5L560.5 272.5L561.9 271.5L561.9 271.5L563.3 270.5L564.6 269.6L566 268.7L567.3 267.8L568.7 266.9L570 266.1L570 266.1L570.5 265.5L570.9 264.9L571.3 264.3L571.7 263.7L572 263.2L572.3 262.7L572.3 262.7L571.8 261.9L571.2 261.1L570.3 260.4L569.3 259.6L569.2 259.6L569.2 259.6L569.2 259.6L569.3 259.7L569.4 259.9L569.6 260.2L570.5 260.9L571.3 261.5L572.2 262.3L573 262.8L573.4 263.1L573.6 263.3L573.6 263.4L573.7 263.4L573.7 263.5L574.3 264.2L574.8 265L575.2 265.7L575.4 266.5L575.4 266.5L575.1 267.1L574.7 267.7L574.3 268.3L573.9 268.9L573.4 269.5L572.9 270.2L572.9 270.2L571.6 271.1L570.2 272L568.9 272.9L567.5 273.8L566.2 274.8L564.8 275.7L564.8 275.7L563.3 276.7L561.9 277.7L560.4 278.7L558.9 279.8L557.3 280.8L555.8 281.8L555.8 281.8L555.1 282.5L554.3 283.3L553.6 284.1L552.8 284.9L551.9 285.8L551 286.6L551 286.6L550.7 287.7L550.4 288.9L550 290.1L549.5 291.4L548.8 292.8ZM570.9 261.2L570.9 261.2L569.6 260.2L570.5 260.9L571.3 261.5L572.2 262.3Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M519.9 295.9L520.2 296.9L520.6 297.9L521 299L521.5 299.9L522.1 300.9L522.7 301.8L523.4 302.7L524.1 303.5L524.9 304.2L524.6 304.8L524.5 304.9L524.5 304.9L524.5 304.9L524.4 305L524.1 305.1L523.4 305.1L522.5 304.8L521.4 304L520.2 302.5L519.5 301.3L518.8 300.2L518.3 299L517.8 297.8L517.4 296.5L517.6 296.6L517.9 296.3L518.2 296.1L518.7 295.9L519 295.9L519.1 295.9L519.1 295.9L519.2 295.9L519.3 295.9ZM542.8 294.6L542.6 293.5L542.2 292.5L541.8 291.5L541.4 290.5L540.9 289.5L540.3 288.6L539.7 287.7L539 286.8L538.3 286L539 285.3L539.1 285.1L539.2 285.1L539.2 285L539.3 284.9L539.7 284.6L540.5 284.1L541.3 283.7L542 283.4L542.5 283L543.3 284L544.1 285.1L544.9 286.2L545.5 287.3L546.1 288.5L546.3 290.5L546.1 292.1L545.5 293.2L544.7 294L544.3 294.3L544.2 294.3L544.1 294.3L544 294.4L543.8 294.4ZM518.6 299.6L518.6 299.6L520.2 302.5L519.5 301.3L518.8 300.2L518.3 299L517.8 297.8L517.4 296.5ZM546.1 288.5L545.5 287.3L544.9 286.2L544.1 285.1L543.3 284L542.5 283L542.5 283L543.3 284L544.1 285.1L544.9 286.2L545.5 287.3L546.1 288.5ZM546.1 288.5L545.5 287.3L544.9 286.2L544.1 285.1L543.3 284L542.5 283L543.2 282.2L543.8 281.4L544.3 280.6L544.7 279.8L544.9 279L545.1 278.3L545.1 278.3L545.9 277.4L546.6 276.5L547.3 275.7L547.9 274.9L548.5 274.2L549.1 273.5L549.1 273.5L550.6 272.4L552.1 271.4L553.5 270.4L555 269.3L556.4 268.3L557.8 267.4L557.8 267.4L559.1 266.4L560.5 265.5L561.8 264.6L563.2 263.7L564.5 262.9L565.9 262.1L565.9 262.1L566.3 261.5L566.7 261L567 260.4L567.3 259.9L567.5 259.5L567.8 259.1L568.1 259.3L568.4 259.2L568.7 259.3L568.9 259.4L569.2 259.6L569.3 259.6L570.3 260.4L571.2 261.1L571.8 261.9L572.3 262.7L572.3 262.7L572 263.2L571.7 263.7L571.3 264.3L570.9 264.9L570.5 265.5L570 266.1L570 266.1L568.7 266.9L567.3 267.8L566 268.7L564.6 269.6L563.3 270.5L561.9 271.5L561.9 271.5L560.5 272.5L559 273.5L557.6 274.5L556.1 275.5L554.6 276.5L553 277.6L553 277.6L552.4 278.3L551.7 279.1L551 279.9L550.2 280.7L549.5 281.6L548.6 282.4L548.6 282.4L548.4 283.3L548.1 284.3L547.8 285.3L547.4 286.3L546.8 287.4ZM569.2 259.6L569.2 259.6L569.2 259.6L569.3 259.6ZM531.3 294.8L531.3 294.8L531.3 294.8L531.3 294.8L531.3 294.8L531.3 294.8L531.3 294.8L531.3 294.8L531.3 294.8L531.3 294.8L531.3 294.8L531.3 294.8L531.3 294.8L531.3 294.8L531.3 294.8L531.3 294.8L531.3 294.8L531.3 294.8L531.3 294.8L531.3 294.8L531.3 294.8L531.3 294.8L531.3 294.8L531.3 294.8L531.3 294.8L531.3 294.8L531.3 294.8L531.3 294.8L531.3 294.8L531.3 294.8L531.3 294.8L531.3 294.8L531.3 294.8L531.3 294.8L531.3 294.8L531.3 294.8L531.3 294.8L531.3 294.8L531.3 294.8L531.3 294.8L531.3 294.8L531.3 294.8L531.3 294.8L531.3 294.8L531.3 294.8L531.3 294.8L531.3 294.8L531.3 294.8L531.3 294.8L531.3 294.8L531.3 294.8L531.3 294.8L543.1 297.6L543 299.2L542.7 300.7L542.3 302.1L541.7 303.4L540.9 304.6L540 305.6L539 306.4L537.8 307.1L536.5 307.6L535.2 307.9L533.8 308.1L532.4 308L530.9 307.7L529.4 307.2L528 306.5L526.7 305.7L525.3 304.6L524.1 303.5L523 302.2L522 300.8L521.2 299.3L520.5 297.7L520 296.1L519.6 294.5L519.4 292.8L519.4 291.3L519.6 289.7L520 288.2L520.5 286.9L521.2 285.6L522 284.5L523 283.6L524.1 282.8L525.3 282.2L526.7 281.8L528 281.6L529.4 281.6L530.9 281.8L532.4 282.2L533.8 282.8L535.2 283.5L536.5 284.5L537.8 285.6L539 286.8L540 288.1L540.9 289.6L541.7 291.1L542.3 292.7L542.7 294.3L543 296L543.1 297.6Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M521.8 284.9L521.2 285.6L520.8 286.3L520.4 287.2L520.1 288L519.8 288.9L519.6 289.9L519.5 290.8L519.4 291.8L519.4 292.8L519.5 293.8L519.7 294.9L519.9 295.9L519.3 295.9L519.2 295.9L519.1 295.9L519.1 295.9L519 295.9L518.7 295.9L518.2 296.1L517.9 296.3L517.6 296.6L517.4 296.5L516.5 292.1L516.3 291.7L516.1 291.4L516 291.1L516.1 290.8L516.2 290.5L516.4 290.3L516.3 289.3L516.3 288.3L516.1 288.9L516 289.5L516 289.9L516 290.1L516.2 290.3L516.4 290.3L516.4 290.3L516.8 288.4L517.6 286.5L518.8 285L520.1 284.2L520.7 284L520.9 284L520.9 284L521 284L521.2 284.1ZM538.3 286L537.5 285.3L536.7 284.6L535.9 284L535 283.4L534.1 282.9L533.2 282.5L532.3 282.2L531.4 281.9L530.5 281.7L529.6 281.6L528.7 281.6L527.8 281.6L527.8 280.6L528 280.3L528 280.2L528.1 280.2L528.2 280L528.8 279.5L530.7 278.6L533 278.3L535.4 278.4L537.6 278.9L537.6 278.9L538.6 278.2L539.4 277.6L540 276.9L540.5 276.3L540.8 275.7L540.9 275L542 275.7L543.1 276.5L544.1 277.4L545.1 278.3L544.9 279L544.7 279.8L544.3 280.6L543.8 281.4L543.2 282.2L542.5 283L542.5 283L542 283.4L541.3 283.7L540.5 284.1L539.7 284.6L539.3 284.9L539.2 285L539.2 285.1L539.1 285.1L539 285.3ZM516.3 288.3L516.3 289.3L516.4 290.3L516.3 289.3L516.3 289.3ZM545.1 278.3L544.1 277.4L543.1 276.5L542 275.7L540.9 275L540.9 275L542 275.7L543.1 276.5L544.1 277.4L545.1 278.3ZM545.1 278.3L544.1 277.4L543.1 276.5L542 275.7L540.9 275L541.6 274.1L542.3 273.3L542.9 272.5L543.5 271.7L544 271L544.5 270.3L544.5 270.3L545.9 269.2L547.4 268.2L548.8 267.2L550.2 266.1L551.6 265.2L552.9 264.2L552.9 264.2L554.2 263.3L555.6 262.4L556.9 261.5L558.3 260.7L559.6 259.9L561 259.1L561 259.1L561.3 258.6L561.6 258.1L561.8 257.6L562 257.2L562.1 256.9L562.2 256.6L563.6 257L565 257.6L566.4 258.3L567.8 259.1L567.5 259.5L567.3 259.9L567 260.4L566.7 261L566.3 261.5L565.9 262.1L565.9 262.1L564.5 262.9L563.2 263.7L561.8 264.6L560.5 265.5L559.1 266.4L557.8 267.4L557.8 267.4L556.4 268.3L555 269.3L553.5 270.4L552.1 271.4L550.6 272.4L549.1 273.5L549.1 273.5L548.5 274.2L547.9 274.9L547.3 275.7L546.6 276.5L545.9 277.4ZM565 257.6L565 257.6L562.2 256.6L563.6 257L565 257.6L566.4 258.3L567.8 259.1Z\"/><path class=\"iso-top\" d=\"M527.8 281.6L526.9 281.8L526 282L525.2 282.3L524.4 282.6L523.7 283.1L523 283.6L522.3 284.2L521.8 284.9L521.2 284.1L521 284L520.9 284L520.9 284L520.7 284L520.1 284.2L518.8 285L517.6 286.5L516.8 288.4L516.4 290.3L516.4 290.3L516.2 290.3L516 290.1L516 289.9L516 289.5L516.1 288.9L516.3 288.3L520.5 276.5L521 275.7L521.5 275L522.1 274.4L522.7 273.7L523.4 273.2L524 272.6L526.6 270.4L528 269.4L529.3 268.4L530.8 267.4L532.2 266.4L533.6 265.5L535.1 264.6L536.6 263.7L538.1 262.8L539.6 262L541.1 261.2L542.6 260.4L544.2 259.7L545.7 258.9L548.9 257.7L549.7 257.4L550.5 257.1L551.3 256.8L552.2 256.7L553 256.5L553.9 256.4L555.2 256.2L556.6 256L557.9 256L559.3 256.1L560.7 256.3L562.2 256.6L562.1 256.9L562 257.2L561.8 257.6L561.6 258.1L561.3 258.6L561 259.1L561 259.1L559.6 259.9L558.3 260.7L556.9 261.5L555.6 262.4L554.2 263.3L552.9 264.2L552.9 264.2L551.6 265.2L550.2 266.1L548.8 267.2L547.4 268.2L545.9 269.2L544.5 270.3L544.5 270.3L544 271L543.5 271.7L542.9 272.5L542.3 273.3L541.6 274.1L540.9 275L540.9 275L540.8 275.7L540.5 276.3L540 276.9L539.4 277.6L538.6 278.2L537.6 278.9L537.6 278.9L535.4 278.4L533 278.3L530.7 278.6L528.8 279.5L528.2 280L528.1 280.2L528 280.2L528 280.3L527.8 280.6ZM557.9 256L557.9 256L553.9 256.4L555.2 256.2L556.6 256L557.9 256L559.3 256.1L560.7 256.3L562.2 256.6Z\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M516 288.7L516 287.5L516.2 286.4L516.4 285.2L516.7 284.1L517 282.9L517.3 281.8L517.8 280.7L518.3 279.7L518.8 278.7L519.4 277.8L521 275.8L521.7 274.9L522.4 274L523.2 273.2L525.2 271.5L526.1 270.8L527 270.1L535.5 264.3L536.6 263.7L545.7 258.9L546.7 258.5L547.8 258L550.3 257.2L551.3 256.8L552.5 256.6L555 256.2L556.1 256L557.2 256L558.3 256L559.5 256.1L560.6 256.2L561.9 256.5L563 256.8L564.1 257.1L565.2 257.5L566.2 257.9L567.3 258.4L568.4 259L569.4 259.7L570.4 260.4L571.4 261.2L572.3 262L573.2 262.9L574.1 263.9L574.9 264.9L575.7 265.9L576.4 267L577 268.1L577.6 269.2L578.2 270.4L578.7 271.6L579.1 272.8L579.5 274L579.8 275.2L580 276.4L580.2 277.7L580.3 278.9L580.3 280.1L580.3 281.3L580.2 282.5L580 283.6L579.8 284.7L579.5 285.8L579.1 287L578.8 288.1L578.3 289.2L577.8 290.2L577.2 291.1L576.6 292L575 294.1L574.3 295L573.5 295.8L571.5 297.5L570.7 298.3L569.8 299L561.2 304.8L560.3 305.4L559.2 305.9L550.1 310.7L549 311.1L546.6 312L545.5 312.4L544.4 312.7L543.3 312.9L540.7 313.3L539.6 313.4L538.5 313.4L537.4 313.4L536.2 313.2L535.1 313L533.9 312.8L532.8 312.5L531.7 312.1L530.6 311.7L529.5 311.2L528.5 310.7L527.4 310L526.4 309.3L525.4 308.6L524.5 307.8L523.5 306.9L522.7 306L521.8 305L521 304L520.3 302.9L519.6 301.9L519 300.7L518.4 299.6L517.8 298.4L517.4 297.2L517 296L516.7 294.8L516.4 293.6L516.2 292.3L516 291.1L516 289.9Z\"/></g></g><g class=\"mq-joint\" data-name=\"as.waist\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M527.1 250.1L527.3 247L528 244.1L529.2 241.2L530.8 238.6L532.8 236.3L535.1 234.3L537.7 232.8L540.5 231.6L543.5 230.9L546.5 230.6L549.5 230.9L552.5 231.6L555.3 232.8L557.9 234.3L560.2 236.3L562.2 238.6L563.8 241.2L565 244.1L565.7 247L565.9 250.1L565.7 253.1L565 256.1L563.8 258.9L562.2 261.5L560.2 263.8L557.9 265.8L555.3 267.4L552.5 268.5L549.5 269.2L546.5 269.5L543.5 269.2L540.5 268.5L537.7 267.4L535.1 265.8L532.8 263.8L530.8 261.5L529.2 258.9L528 256.1L527.3 253.1Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M527.1 250.1L527.3 247L528 244.1L529.2 241.2L530.8 238.6L532.8 236.3L535.1 234.3L537.7 232.8L540.5 231.6L543.5 230.9L546.5 230.6L549.5 230.9L552.5 231.6L555.3 232.8L557.9 234.3L560.2 236.3L562.2 238.6L563.8 241.2L565 244.1L565.7 247L565.9 250.1L565.7 253.1L565 256.1L563.8 258.9L562.2 261.5L560.2 263.8L557.9 265.8L555.3 267.4L552.5 268.5L549.5 269.2L546.5 269.5L543.5 269.2L540.5 268.5L537.7 267.4L535.1 265.8L532.8 263.8L530.8 261.5L529.2 258.9L528 256.1L527.3 253.1Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M527.1 250.1L527.3 247L528 244.1L529.2 241.2L530.8 238.6L532.8 236.3L535.1 234.3L537.7 232.8L540.5 231.6L543.5 230.9L546.5 230.6L549.5 230.9L552.5 231.6L555.3 232.8L557.9 234.3L558.5 235L558.6 236L558.5 237.2L557.9 238.8L557 240.5L555.9 242.3L554.4 244.3L552.6 246.4L550.7 248.5L548.5 250.6L546.3 252.6L544 254.4L541.7 256.1L539.5 257.6L537.4 258.8L535.4 259.7L533.7 260.3L532.2 260.6L531 260.6L530.1 260.2L529.2 258.9L528 256.1L527.3 253.1Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M527.1 250.1L527.3 247L528 244.1L529.2 241.2L530.8 238.6L532.8 236.3L535.1 234.3L537.7 232.8L540.5 231.6L543.5 230.9L546.5 230.6L549.5 230.9L552.5 231.6L554.2 232.3L554.7 232.9L554.8 233.8L554.7 234.9L554.2 236.3L553.4 237.9L552.2 239.7L550.9 241.5L549.2 243.4L547.4 245.4L545.5 247.3L543.4 249.1L541.3 250.9L539.2 252.4L537.1 253.8L535.1 254.9L533.3 255.7L531.7 256.3L530.3 256.6L529.2 256.6L528.4 256.2L527.9 255.6L527.3 253.1Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M527.1 250.1L527.3 247L528 244.1L529.2 241.2L530.8 238.6L532.8 236.3L535.1 234.3L537.7 232.8L540.5 231.6L543.5 230.9L546.5 230.6L549.2 230.8L549.9 231.1L550.4 231.7L550.5 232.4L550.4 233.4L549.9 234.6L549.2 236L548.3 237.5L547.1 239.1L545.7 240.8L544.1 242.5L542.4 244.1L540.6 245.7L538.8 247.2L537 248.5L535.2 249.7L533.5 250.7L531.9 251.4L530.5 251.9L529.3 252.2L528.4 252.1L527.7 251.8L527.2 251.3Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M527.1 250.1L527.3 247L528 244.1L529.2 241.2L530.8 238.6L532.8 236.3L535.1 234.3L537.7 232.8L540.5 231.6L543.5 230.9L546.5 230.6L549.5 230.9L552.5 231.6L555.3 232.8L557.9 234.3L560.2 236.3L562.2 238.6L563.8 241.2L565 244.1L565.7 247L565.9 250.1L565.7 253.1L565 256.1L563.8 258.9L562.2 261.5L560.2 263.8L557.9 265.8L555.3 267.4L552.5 268.5L549.5 269.2L546.5 269.5L543.5 269.2L540.5 268.5L537.7 267.4L535.1 265.8L532.8 263.8L530.8 261.5L529.2 258.9L528 256.1L527.3 253.1Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.chest\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M505.5 166.7L505.7 163.2L505.8 162.7L505.9 162.2L506.8 158.8L507 158.2L507.2 157.7L508.7 154.3L509 153.9L511 150.5L511.3 150.1L511.7 149.6L512.1 149.2L512.5 148.7L513 148.3L514.2 147.3L514.7 146.9L515.2 146.5L515.8 146.1L516.5 145.7L517.2 145.3L517.9 145L519.5 144.2L520.2 143.9L520.9 143.5L521.7 143.2L522.5 142.9L523.4 142.6L526.6 141.5L527.3 141.3L528 141.1L528.8 140.8L529.6 140.6L530.4 140.4L531.2 140.2L532 140.1L532.9 139.9L533.8 139.8L534.6 139.6L535.5 139.5L536.4 139.4L537.3 139.3L538.3 139.2L539.2 139.1L540.1 139L541 139L542 138.9L542.9 138.9L543.8 138.9L544.7 138.9L545.6 138.9L546.6 138.9L547.5 139L548.3 139L549.2 139.1L550.1 139.2L551 139.2L551.8 139.3L552.6 139.5L553.4 139.6L554.2 139.7L555 139.9L555.7 140L559 140.8L559.8 141L560.7 141.2L561.5 141.5L562.3 141.7L563.1 142L564.7 142.6L565.5 142.9L566.2 143.2L566.9 143.5L567.5 143.8L568.2 144.2L568.7 144.5L569.3 144.9L570.5 145.8L571 146.2L571.5 146.6L571.9 147L572.3 147.4L574.6 150.5L574.9 151L575.2 151.4L577.1 154.7L577.3 155.2L578.5 158.5L578.7 159L578.9 159.5L579.4 162.9L579.5 163.5L580 186.4L580 186.9L579.5 193.8L579.4 194.3L578.2 201.2L578.1 201.7L574.5 215.5L572.6 221.3L572.5 221.7L570.2 227.4L570 227.7L564.5 239.1L564.3 239.3L564.2 239.6L564 239.9L563.7 240.1L563.5 240.4L563.2 240.6L562.8 240.9L562.5 241.1L562.1 241.4L561.7 241.6L561.3 241.9L560.8 242.1L560.4 242.3L559.9 242.5L559.3 242.7L558.8 243L558.2 243.2L557.7 243.3L557 243.5L556.4 243.7L555.8 243.9L555.1 244L554.5 244.2L553.8 244.3L553.1 244.5L552.4 244.6L551.7 244.7L550.9 244.8L550.2 244.9L549.5 245L548.7 245.1L548 245.1L547.2 245.2L546.5 245.2L545.7 245.3L544.9 245.3L544.2 245.3L543.4 245.3L542.7 245.3L541.9 245.3L541.2 245.2L540.5 245.2L539.8 245.1L539.1 245.1L538.4 245L537.7 244.9L537 244.8L536.3 244.7L535.7 244.6L535.1 244.5L534.5 244.4L533.9 244.2L533.3 244.1L532.8 243.9L532.2 243.7L531.7 243.6L531.2 243.4L530.8 243.2L530.4 243L529.9 242.8L529.6 242.6L529.2 242.4L528.9 242.1L528.6 241.9L528.3 241.7L528.1 241.4L527.8 241.2L527.7 240.9L527.5 240.7L520.9 229.9L518.1 224.4L517.9 224L515.5 218.5L515.3 218.1L510.4 204.7L508.5 197.9L508.4 197.4L507.3 190.6L507.2 190.1L505.5 167.2Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M564.6 238.9L564.4 239.3L564.2 239.6L563.9 239.9L563.5 240.3L563.2 240.6L562.7 241L562.3 241.3L561.7 241.6L561.2 241.9L560.6 242.2L559.9 242.5L559.2 242.8L558.5 243.1L557.7 243.3L556.9 243.6L556.1 243.8L555.2 244L554.3 244.2L553.4 244.4L552.5 244.6L551.6 244.7L550.6 244.9L549.6 245L548.6 245.1L547.6 245.2L546.6 245.2L545.6 245.3L544.6 245.3L543.6 245.3L542.6 245.3L541.7 245.3L540.7 245.2L539.7 245.1L538.8 245.1L537.9 245L537 244.8L536.1 244.7L535.3 244.5L534.5 244.4L533.7 244.2L533 244L531.9 240.9L531.3 238L531.2 236.5L531.2 236.4L531.2 236.3L531.1 236.3L531.1 236.1L531.1 235.7L531.1 235L531.5 232L532.5 229L534 225.9L534 225.9L533.2 221.8L533.1 217.8L534 213.8L534.8 211.7L535.1 211.2L535.2 211L535.2 210.9L535.3 210.8L535.3 210.7L535.9 209.7L538.8 205.5L542.8 201L542.8 201L542.8 197.2L542.9 193.4L543.1 189.6L543.3 185.8L543.5 182L543.8 178.2L543.8 178.2L544.6 177.8L544.9 177.8L545.1 177.7L545.3 177.6L545.5 177.5L547.1 176.8L550.3 175.3L556.2 171.9L561.2 168.1L565.4 164L568.6 159.6L570.7 154.8L570.7 154.8L572.1 153.4L573.3 150.7L573.3 150.3L573.3 149.8L573.2 149.3L573.1 148.9L571.4 146.5L569.8 145.3L573 148.6L574.7 150.7L576.1 152.9L577.3 155.1L578.2 157.3L578.8 159.5L578.9 160.7L579 161.2L579 161.3L579 161.4L579 161.5L579 161.5L579 161.8L579.5 163.7L579.6 167.5L579.8 171.3L579.9 175.2L579.9 179L579.9 182.8L580 186.6L579.9 187.6L579.7 192.2L579.1 196.8L578.9 198L578.8 198.1L578.8 198.2L578.8 198.2L578.8 198.5L578.6 199.1L578.2 201.4L577 206L575.8 210.6L574.5 215.2L574.3 216.1L573.1 219.9L571.7 223.7L570.1 227.5L569.7 228.5L569.5 228.9L569.4 229.2L569.4 229.2L569.3 229.3L569.3 229.4L568.4 231.3L566.5 235.1ZM573.1 148.9L573.2 149.3L573.3 149.8L573.3 150.3L573.3 150.7L573.3 149.8L573.3 149.8Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M533 244L532.3 243.8L531.6 243.5L531 243.3L530.4 243L529.9 242.8L529.4 242.5L529 242.2L528.6 241.9L528.2 241.6L527.9 241.3L527.7 241L527.5 240.7L525.2 237.1L522.9 233.5L521.9 231.7L521.8 231.5L521.8 231.5L521.8 231.5L521.8 231.5L521.7 231.3L521.6 230.9L521.6 228.8L522.2 226.4L523.5 223.9L523.5 223.9L522.1 219.7L521.7 215.7L522.2 212L522.9 210.1L523.1 209.7L523.2 209.5L523.3 209.4L523.3 209.3L523.4 209.2L523.9 208.3L526.7 204.6L530.7 200.7L530.7 200.7L530.7 196.9L530.7 193.2L530.8 189.4L531 185.7L531.2 181.9L531.5 178.1L531.5 178.1L532.4 177.9L532.6 177.8L532.8 177.8L533 177.7L533.2 177.6L534.9 177.1L538.1 176L543.9 173.3L548.8 170.4L552.9 167.1L556.2 163.7L558.6 160.2L559.9 159.8L561.2 159.5L562.4 159.1L563.6 158.7L564.7 158.2L565.7 157.8L566.7 157.3L567.7 156.8L568.5 156.3L569.3 155.8L570.1 155.3L570.7 154.8L568.6 159.6L565.4 164L561.2 168.1L556.2 171.9L550.3 175.3L547.1 176.8L545.5 177.5L545.3 177.6L545.1 177.7L544.9 177.8L544.6 177.8L543.8 178.2L543.8 178.2L543.5 182L543.3 185.8L543.1 189.6L542.9 193.4L542.8 197.2L542.8 201L542.8 201L538.8 205.5L535.9 209.7L535.3 210.7L535.3 210.8L535.2 210.9L535.2 211L535.1 211.2L534.8 211.7L534 213.8L533.1 217.8L533.2 221.8L534 225.9L534 225.9L532.5 229L531.5 232L531.1 235L531.1 235.7L531.1 236.1L531.1 236.3L531.2 236.3L531.2 236.4L531.2 236.5L531.3 238L531.9 240.9ZM570.7 154.8L570.1 155.3L569.3 155.8L568.5 156.3L567.7 156.8L566.7 157.3L565.7 157.8L564.7 158.2L563.6 158.7L562.4 159.1L561.2 159.5L559.9 159.8L558.6 160.2L558.6 160.2L559.9 159.8L561.2 159.5L562.4 159.1L563.6 158.7L564.7 158.2L565.7 157.8L566.7 157.3L567.7 156.8L568.5 156.3L569.3 155.8L570.1 155.3L570.7 154.8ZM565.6 143.3L566.5 143.7L567.4 144.1L568.3 144.5L569.1 144.9L569.8 145.3L567.9 144.3L567.9 144.3ZM565.6 143.3L565.5 143.3L566.5 143.7L567.5 144.1L568.4 144.5L569.2 144.9L569.9 145.4L570.6 145.8L571.2 146.3L571.7 146.8L572.2 147.3L572.5 147.8L572.8 148.3L573.1 148.9L571.4 146.5L569.8 145.3L569.1 144.9L568.3 144.5L567.4 144.1L566.5 143.7L565.6 143.3ZM570.7 154.8L570.1 155.3L569.3 155.8L568.5 156.3L567.7 156.8L566.7 157.3L565.7 157.8L564.7 158.2L563.6 158.7L562.4 159.1L561.2 159.5L559.9 159.8L558.6 160.2L559.8 159.8L561 159.4L562.3 159L563.5 158.6L564.6 158.1L565.7 157.7L566.7 157.2L567.6 156.7L568.5 156.2L569.3 155.7L570.1 155.1L570.7 154.6L571.3 154.1L571.9 153.5L572.3 153L572.7 152.4L572.9 151.8L573.1 151.3L573.3 150.7L572.1 153.4ZM565.5 143.3L566.6 143.7L567.6 144.1L568.5 144.5L569.4 145L570.2 145.5L570.8 146L571.4 146.5L572 147.1L572.4 147.6L572.8 148.2L573 148.8L573.2 149.3L573.3 149.9L573.3 150.5L573.2 151.1L573 151.7L572.7 152.3L572.3 152.9L571.9 153.5L571.3 154L570.7 154.6L570 155.2L569.2 155.7L568.3 156.3L567.4 156.8L566.4 157.3L565.3 157.8L564.1 158.3L562.9 158.7L561.6 159.2L573.1 148.9L572.8 148.3L572.5 147.8L572.2 147.3L571.7 146.8L571.2 146.3L570.6 145.8L569.9 145.4L569.2 144.9L568.4 144.5L567.5 144.1L566.5 143.7L565.5 143.3ZM573.3 150.7L573.1 151.3L572.9 151.8L572.7 152.4L572.3 153L571.9 153.5L571.3 154.1L570.7 154.6L570.1 155.1L569.3 155.7L568.5 156.2L567.6 156.7L566.7 157.2L565.7 157.7L564.6 158.1L563.5 158.6L562.3 159L561 159.4L569.7 155.4L569.7 155.4ZM565.5 143.3L566.6 143.7L567.6 144.1L568.5 144.5L569.4 145L570.2 145.5L570.8 146L571.4 146.5L572 147.1L572.4 147.6L572.8 148.2L573 148.8L573.2 149.3L573.3 149.9L573.3 150.5L573.2 151.1L573 151.7L572.7 152.3L572.3 152.9L571.9 153.5L571.3 154L570.7 154.6L570 155.2L569.2 155.7L568.3 156.3L567.4 156.8L566.4 157.3L565.3 157.8L564.1 158.3L562.9 158.7L561.6 159.2L562.2 158.9L563.4 158.5L565.6 157.4L566.6 156.8L567.1 156.5L567.7 156.2L571.5 152.9L572.3 151.5L572.6 150.4L572.7 149.8L572.7 149.3L572.6 148.7L572.4 148.2L571.8 147.1L570.7 145.9L566.4 143.4L565.8 143.2L565.4 143.1L565.4 143.1L565.5 143.2L565.5 143.2ZM572.4 148.2L572.6 148.7L572.7 149.3L572.7 149.8L572.6 150.4L572.7 149.2L572.7 149.2Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M521.8 231.5L521.8 231.5L521.8 231.6L521.8 231.6ZM521.8 231.5L521.8 231.5L521.7 231.4L521.6 231.2L521.4 230.7L520.9 229.8L518.9 226.2L517.2 222.6L515.7 218.9L515.3 218L513.6 213.6L511.9 209.1L510.4 204.6L509.7 202.4L509.5 201.8L509.5 201.5L509.5 201.6L509.5 201.7L509.6 201.8L510.2 202.1L513.1 200.6L517.1 198.1L517.1 198.1L517.1 194.4L517.1 190.7L517.1 187L517.3 183.3L517.5 179.7L517.8 176L517.8 176L518.7 175.9L518.9 175.9L519.1 175.9L519.3 175.9L519.5 175.8L521.2 175.6L524.4 175L530.1 173.2L535 170.9L539 168.3L542.3 165.4L544.9 162.4L544.9 162.4L545.9 162.3L546.9 162.1L547.4 162L547.9 161.9L548.8 161.8L550.6 161.4L551.5 161.2L553 161L554.4 160.7L555.8 160.4L557.2 160.1L558.6 159.8L559.9 159.4L561.1 159L562.3 158.6L563.5 158.2L564.6 157.8L565.6 157.3L566.6 156.8L565.6 157.4L563.4 158.5L562.2 158.9L561.6 159.2L561 159.4L559.8 159.8L558.6 160.2L558.6 160.2L556.2 163.7L552.9 167.1L548.8 170.4L543.9 173.3L538.1 176L534.9 177.1L533.2 177.6L533 177.7L532.8 177.8L532.6 177.8L532.4 177.9L531.5 178.1L531.5 178.1L531.2 181.9L531 185.7L530.8 189.4L530.7 193.2L530.7 196.9L530.7 200.7L530.7 200.7L526.7 204.6L523.9 208.3L523.4 209.2L523.3 209.3L523.3 209.4L523.2 209.5L523.1 209.7L522.9 210.1L522.2 212L521.7 215.7L522.1 219.7L523.5 223.9L523.5 223.9L522.2 226.4L521.6 228.8L521.6 230.9L521.7 231.3L521.8 231.5L521.8 231.5ZM566.6 156.8L565.6 157.3L564.6 157.8L563.5 158.2L562.3 158.6L561.1 159L559.9 159.4L558.6 159.8L557.2 160.1L555.8 160.4L554.4 160.7L553 161L551.5 161.2L551.9 161.1L553.4 160.9L554.9 160.6L556.3 160.3L557.7 159.9L559.1 159.6L560.4 159.2L561.7 158.8L562.9 158.4L564 157.9L565.1 157.5L566.2 157L567.1 156.5ZM565.3 143.1L565.8 143.2L565.6 143.2L565.6 143.2ZM565.3 143.1L565.2 142.9L565.1 142.9L565.1 142.9L566.1 143.3L567.1 143.7L568 144.1L568.8 144.6L569.6 145L570.3 145.5L570.9 146L571.4 146.6L571.8 147.1L572.2 147.6L572.4 148.2L571.8 147.1L570.7 145.9L566.4 143.4L565.8 143.2L565.3 143.1ZM567.1 156.5L566.2 157L565.1 157.5L564 157.9L562.9 158.4L561.7 158.8L560.4 159.2L559.1 159.6L557.7 159.9L556.3 160.3L554.9 160.6L553.4 160.9L551.9 161.1L552.3 161L555.4 160.1L556.2 159.9L556.5 159.8L557.9 159.5L559.3 159.1L560.6 158.7L561.9 158.3L563.1 157.9L564.3 157.4L565.4 156.9L566.4 156.4L567.4 155.9L568.3 155.4L569.1 154.9L569.8 154.3L570.5 153.8L571 153.2L571.5 152.7L571.9 152.1L572.3 151.5L572.5 150.9L572.6 150.4L572.3 151.5L571.5 152.9L567.7 156.2ZM565.1 142.9L566.1 143.2L567.1 143.7L568 144.1L568.8 144.5L569.5 145L570.2 145.5L570.8 146L571.3 146.5L571.7 147L572.1 147.6L572.4 148.1L572.6 148.7L572.7 149.2L572.7 149.8L572.6 150.3L572.5 150.9L572.2 151.5L571.9 152.1L571.5 152.6L571 153.2L570.5 153.7L569.8 154.3L569.1 154.8L568.3 155.3L567.5 155.8L566.5 156.3L565.5 156.8L564.4 157.3L563.3 157.7L562.1 158.2L560.9 158.6L559.6 159L558.3 159.3L556.9 159.7L572.4 148.2L572.2 147.6L571.8 147.1L571.4 146.6L570.9 146L570.3 145.5L569.6 145L568.8 144.6L568 144.1L567.1 143.7L566.1 143.3L565.1 142.9ZM572.6 150.4L572.5 150.9L572.3 151.5L571.9 152.1L571.5 152.7L571 153.2L570.5 153.8L569.8 154.3L569.1 154.9L568.3 155.4L567.4 155.9L566.4 156.4L565.4 156.9L564.3 157.4L563.1 157.9L561.9 158.3L560.6 158.7L559.3 159.1L557.9 159.5L556.5 159.8L567.8 155.6L567.8 155.6ZM565.1 142.9L566.1 143.2L567.1 143.7L568 144.1L568.8 144.5L569.5 145L570.2 145.5L570.8 146L571.3 146.5L571.7 147L572.1 147.6L572.4 148.1L572.6 148.7L572.7 149.2L572.7 149.8L572.6 150.3L572.5 150.9L572.2 151.5L571.9 152.1L571.5 152.6L571 153.2L570.5 153.7L569.8 154.3L569.1 154.8L568.3 155.3L567.5 155.8L566.5 156.3L565.5 156.8L564.4 157.3L563.3 157.7L562.1 158.2L560.9 158.6L559.6 159L558.3 159.3L556.9 159.7L558.2 159.2L562.8 157.1L564.7 156L565.1 155.7L565.3 155.6L565.5 155.4L566.3 154.8L568.8 152.1L569.7 150.3L570 148.9L570 148.1L570 147.8L570 147.5L569.8 146.8L569.2 145.6L568 144.4L565.1 142.7L564.2 142.4L564.2 142.4L564.3 142.4L564.3 142.4L564.5 142.5L565 142.8ZM570 147.5L570 147.8L570 148.1L570 147.8L570 147.8Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M509.5 201.6L509.5 201.6L509.4 201.5L509.5 201.6ZM509.5 201.6L509.4 201.5L509.4 201.4L509.4 201.2L509.1 200.1L508 195.6L507.4 191L507.2 190.1L506.9 186.3L506.5 182.5L506.2 178.7L506 174.8L505.7 171L505.5 167.2L505.8 165.3L505.8 165L505.6 165.7L505.5 166.4L505.5 167L505.6 167.7L505.9 168.4L506.2 169L506.6 169.7L507.1 170.3L507.7 170.9L508.4 171.5L509.2 172.1L510.1 172.6L511.1 173.2L512.2 173.7L513.3 174.2L514.5 174.7L515.9 175.1L517.2 175.5L518.7 175.9L517.8 176L517.8 176L517.5 179.7L517.3 183.3L517.1 187L517.1 190.7L517.1 194.4L517.1 198.1L517.1 198.1L513.1 200.6L510.2 202.1L509.6 201.8L509.5 201.7ZM518.7 175.9L517.2 175.5L515.9 175.1L514.5 174.7L513.3 174.2L512.2 173.7L511.1 173.2L510.1 172.6L509.2 172.1L508.4 171.5L507.7 170.9L507.1 170.3L506.6 169.7L506.2 169L505.9 168.4L505.6 167.7L505.5 167L505.5 166.4L505.6 165.7L505.8 165L505.9 168.3L506.2 169L506.6 169.6L507.1 170.2L507.8 170.9L508.5 171.5L509.3 172.1L510.2 172.6L511.2 173.2L512.3 173.7L513.5 174.2L514.7 174.7L516 175.1L517.4 175.5L518.9 175.9ZM505.6 165.6L505.8 164.9L505.7 165.3L505.7 165.3ZM505.7 164.9L505.8 164.9L505.8 164.9L505.6 165.6ZM518.9 175.9L517.4 175.5L516 175.1L514.7 174.7L513.5 174.2L512.3 173.7L511.2 173.2L510.2 172.6L509.3 172.1L508.5 171.5L507.8 170.9L507.1 170.2L506.6 169.6L506.2 169L505.9 168.3L506.1 168.8L506.5 169.4L507 170L507.6 170.6L508.2 171.2L509 171.7L509.8 172.3L510.7 172.8L511.7 173.3L512.7 173.8L513.9 174.3L515.1 174.7L516.4 175.1L517.7 175.5L519.1 175.9ZM505.7 164.8L505.7 164.8L505.8 164.9L505.7 164.9ZM519.1 175.9L517.7 175.5L516.4 175.1L515.1 174.7L513.9 174.3L512.7 173.8L511.7 173.3L510.7 172.8L509.8 172.3L509 171.7L508.2 171.2L507.6 170.6L507 170L506.5 169.4L506.1 168.8L506.4 169.1L506.8 169.8L507.4 170.4L508.1 171L508.8 171.6L509.7 172.1L510.6 172.7L511.6 173.2L512.7 173.7L513.9 174.2L515.1 174.7L516.5 175.1L517.9 175.5L519.3 175.9ZM519.3 175.9L517.9 175.5L516.5 175.1L515.1 174.7L513.9 174.2L512.7 173.7L511.6 173.2L510.6 172.7L509.7 172.1L508.8 171.6L508.1 171L507.4 170.4L506.8 169.8L506.4 169.1L506.6 169.4L508.4 170.6L511.7 171.4L517.5 171L522.2 169.5L526.2 167.5L529.5 165.1L532.2 162.5L532.2 162.5L533 162.4L533.8 162.4L534.2 162.4L534.6 162.4L535.4 162.4L536.8 162.3L537.4 162.2L537.8 162.2L538.1 162.2L540.4 161.9L540.9 161.8L541.2 161.7L541.4 161.7L542.4 161.5L545.7 160.7L547 160.3L547.3 160.2L547.4 160.1L548.9 160L550.4 159.8L551.8 159.5L553.3 159.3L554.7 159L556 158.7L557.4 158.4L558.7 158L559.9 157.7L561.1 157.3L562.2 156.9L563.3 156.5L564.3 156L565.3 155.6L565.1 155.7L564.7 156L562.8 157.1L558.2 159.2L556.9 159.7L556.5 159.8L556.2 159.9L555.4 160.1L552.3 161L551.9 161.1L551.5 161.2L550.6 161.4L548.8 161.8L547.9 161.9L547.4 162L546.9 162.1L545.9 162.3L544.9 162.4L544.9 162.4L542.3 165.4L539 168.3L535 170.9L530.1 173.2L524.4 175L521.2 175.6L519.5 175.8ZM565.3 155.6L564.3 156L563.3 156.5L562.2 156.9L561.1 157.3L559.9 157.7L558.7 158L557.4 158.4L556 158.7L554.7 159L553.3 159.3L551.8 159.5L550.4 159.8L548.9 160L547.4 160.1L547.6 160.1L549.1 159.9L550.6 159.7L552 159.5L553.5 159.2L554.9 158.9L556.2 158.6L557.6 158.3L558.9 157.9L560.1 157.6L561.3 157.2L562.4 156.8L563.5 156.3L564.6 155.9L565.5 155.4ZM564.2 142.4L564.2 142.4L564.2 142.4L564.2 142.4ZM564.2 142.4L564.2 142.4L565.1 142.7L568 144.4L569.2 145.6L569.8 146.8L570 147.5L569.8 147.1L569.6 146.6L569.4 146.1L569 145.6L568.6 145.2L568.1 144.7L567.6 144.3L567 143.9L566.3 143.5L565.6 143.1L564.8 142.7L564 142.3L563 142L563.1 142L563.2 142L563.5 142.1L564.1 142.3ZM565.5 155.4L564.6 155.9L563.5 156.3L562.4 156.8L561.3 157.2L560.1 157.6L558.9 157.9L557.6 158.3L556.2 158.6L554.9 158.9L553.5 159.2L552 159.5L550.6 159.7L549.1 159.9L547.6 160.1L548.1 159.9L549.9 159L550.6 158.6L550.9 158.4L551 158.3L552.4 158.1L553.7 157.8L555 157.5L556.3 157.2L557.5 156.9L558.7 156.5L559.9 156.2L561 155.8L562 155.4L563 155L563.9 154.5L564.8 154.1L565.6 153.6L566.4 153.2L567.1 152.7L567.7 152.2L568.2 151.7L568.7 151.2L569.1 150.7L569.4 150.2L569.7 149.7L569.9 149.1L570 148.6L570 148.1L570 148.9L569.7 150.3L568.8 152.1L566.3 154.8ZM563 142L564 142.3L564.8 142.7L565.7 143.1L566.4 143.5L567.1 144L567.7 144.4L568.3 144.9L568.7 145.3L569.1 145.8L569.5 146.3L569.7 146.8L569.9 147.3L570 147.8L570 148.4L569.9 148.9L569.7 149.4L569.5 149.9L569.2 150.5L568.8 151L568.4 151.5L567.8 152L567.2 152.5L566.6 153L565.8 153.5L565 153.9L564.1 154.4L563.2 154.8L562.2 155.3L561.2 155.7L560 156.1L558.9 156.4L557.7 156.8L556.4 157.1L555.1 157.4L553.8 157.7L552.5 158L551.1 158.2L570 147.5L569.8 147.1L569.6 146.6L569.4 146.1L569 145.6L568.6 145.2L568.1 144.7L567.6 144.3L567 143.9L566.3 143.5L565.6 143.1L564.8 142.7L564 142.3L563 142ZM570 148.1L570 148.6L569.9 149.1L569.7 149.7L569.4 150.2L569.1 150.7L568.7 151.2L568.2 151.7L567.7 152.2L567.1 152.7L566.4 153.2L565.6 153.6L564.8 154.1L563.9 154.5L563 155L562 155.4L561 155.8L559.9 156.2L558.7 156.5L557.5 156.9L556.3 157.2L555 157.5L553.7 157.8L552.4 158.1L551 158.3L564.8 154.1L564.8 154.1ZM563 142L564 142.3L564.8 142.7L565.7 143.1L566.4 143.5L567.1 144L567.7 144.4L568.3 144.9L568.7 145.3L569.1 145.8L569.5 146.3L569.7 146.8L569.9 147.3L570 147.8L570 148.4L569.9 148.9L569.7 149.4L569.5 149.9L569.2 150.5L568.8 151L568.4 151.5L567.8 152L567.2 152.5L566.6 153L565.8 153.5L565 153.9L564.1 154.4L563.2 154.8L562.2 155.3L561.2 155.7L560 156.1L558.9 156.4L557.7 156.8L556.4 157.1L555.1 157.4L553.8 157.7L552.5 158L551.1 158.2L551.2 158.1L552.4 156.5L552.2 155.1L550.9 154L552 153.7L553.1 153.5L554.1 153.2L555.1 152.9L556.1 152.6L557.1 152.3L557.9 152L558.8 151.6L559.6 151.3L560.3 150.9L561 150.5L561.7 150.1L562.3 149.7L562.8 149.3L563.2 148.9L563.6 148.5L564 148L564.2 147.6L564.4 147.2L564.6 146.7L564.7 146.3L564.7 145.9L564.6 145.4L564.5 145L564.3 144.6L564 144.2L563.7 143.8L563.3 143.4L562.9 143L562.4 142.6L561.8 142.3L561.2 141.9L560.5 141.6L559.8 141.3L559 141L560.3 141.3L561.7 141.6L562.9 141.9Z\"/><path class=\"iso-top\" d=\"M505.9 168.3L505.6 167.6L505.5 167L505.5 166.3L505.6 165.6L505.5 167L505.5 167ZM505.9 168.3L505.6 167.6L505.5 167L505.5 166.3L505.6 165.6L505.7 164.9L505.8 164.8L505.8 164.7L505.8 164.1L505.8 163L506.2 160.7L506.9 158.4L507.9 156.1L509.1 153.8L510.5 151.5L517.4 145.6L517.4 145.6L517.5 145.6L517.5 145.5L517.5 145.5L517.5 145.5L517.6 145.4L517.6 145.4L517.6 145.3L517.7 145.3L517.8 145.2L517.9 145.1L517.9 145.1L517.9 145.1L518 145L518.4 144.7L518.6 144.6L518.7 144.6L518.7 144.6L518.7 144.5L518.8 144.5L519.4 144.2L519.6 144.1L519.8 144L519.8 144L519.9 144L519.9 144L521.2 143.5L522.5 143.1L523.8 142.6L523 143L522.3 143.4L521.7 143.8L521.1 144.2L520.6 144.6L520.1 145L519.7 145.4L519.3 145.9L519.1 146.3L518.8 146.7L518.7 147.2L518.6 147.6L518.6 148L518.6 148.4L518.7 148.9L518.9 149.3L519.2 149.7L519.5 150.1L519.8 150.5L520.2 150.9L520.7 151.3L521.3 151.6L521.9 152L522.6 152.3L523.3 152.6L524 152.9L524.9 153.2L525.7 153.5L526.6 153.7L527.6 154L528.6 154.2L529.6 154.4L530.7 154.5L531.8 154.7L532.9 154.8L534.1 154.9L535.2 155L536.4 155L537.6 155.1L538.8 155.1L540.1 155.1L541.3 155L542.5 155L543.7 154.9L545 154.8L546.2 154.7L547.4 154.5L548.6 154.4L549.7 154.2L550.9 154L552.2 155.1L552.4 156.5L551.2 158.1L551.1 158.2L551 158.3L550.9 158.4L550.6 158.6L549.9 159L548.1 159.9L547.6 160.1L547.4 160.1L547.3 160.2L547 160.3L545.7 160.7L542.4 161.5L541.4 161.7L541.2 161.7L540.9 161.8L540.4 161.9L538.1 162.2L537.8 162.2L537.4 162.2L536.8 162.3L535.4 162.4L534.6 162.4L534.2 162.4L533.8 162.4L533 162.4L532.2 162.5L532.2 162.5L529.5 165.1L526.2 167.5L522.2 169.5L517.5 171L511.7 171.4L508.4 170.6L506.6 169.4L506.4 169.1L506.1 168.8ZM556.5 140.2L557.8 140.6L559.1 141L560.2 141.5L561.3 142L562.2 142.5L562.9 143.1L563.6 143.6L564.1 144.2L564.4 144.9L564.6 145.5L564.7 146.1L564.6 146.8L564.3 147.4L563.9 148.1L563.4 148.7L562.7 149.4L561.9 150L560.9 150.6L559.8 151.2L558.7 151.7L557.3 152.2L555.9 152.7L554.4 153.1L552.9 153.5L551.2 153.9L549.5 154.2L547.7 154.5L545.9 154.7L544.1 154.9L542.2 155L540.4 155.1L538.5 155.1L536.7 155.1L534.9 155L533.1 154.8L531.5 154.6L529.8 154.4L528.3 154.1L526.8 153.8L525.4 153.4L524.2 153L523 152.5L522 152L521.1 151.5L520.3 150.9L519.7 150.3L519.2 149.7L518.8 149.1L518.6 148.5L518.6 147.8L518.7 147.2L518.9 146.5L519.3 145.9L519.9 145.2L520.6 144.6L521.4 144L522.3 143.4L523.4 142.8L524.6 142.3L525.9 141.8L527.3 141.3L528.8 140.8L530.4 140.4L532 140.1L533.8 139.8L535.5 139.5L537.3 139.3L539.2 139.1L541 139L542.9 138.9L544.7 138.9L546.6 138.9L548.3 139L550.1 139.2L551.8 139.3L553.4 139.6L555 139.9L556.5 140.2L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147L541.6 147Z\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M505.5 166.7L505.7 163.2L505.8 162.7L505.9 162.2L506.8 158.8L507 158.2L507.2 157.7L508.7 154.3L509 153.9L511 150.5L511.3 150.1L511.7 149.6L512.1 149.2L512.5 148.7L513 148.3L514.2 147.3L514.7 146.9L515.2 146.5L515.8 146.1L516.5 145.7L517.2 145.3L517.9 145L519.5 144.2L520.2 143.9L520.9 143.5L521.7 143.2L522.5 142.9L523.4 142.6L526.6 141.5L527.3 141.3L528 141.1L528.8 140.8L529.6 140.6L530.4 140.4L531.2 140.2L532 140.1L532.9 139.9L533.8 139.8L534.6 139.6L535.5 139.5L536.4 139.4L537.3 139.3L538.3 139.2L539.2 139.1L540.1 139L541 139L542 138.9L542.9 138.9L543.8 138.9L544.7 138.9L545.6 138.9L546.6 138.9L547.5 139L548.3 139L549.2 139.1L550.1 139.2L551 139.2L551.8 139.3L552.6 139.5L553.4 139.6L554.2 139.7L555 139.9L555.7 140L559 140.8L559.8 141L560.7 141.2L561.5 141.5L562.3 141.7L563.1 142L564.7 142.6L565.5 142.9L566.2 143.2L566.9 143.5L567.5 143.8L568.2 144.2L568.7 144.5L569.3 144.9L570.5 145.8L571 146.2L571.5 146.6L571.9 147L572.3 147.4L574.6 150.5L574.9 151L575.2 151.4L577.1 154.7L577.3 155.2L578.5 158.5L578.7 159L578.9 159.5L579.4 162.9L579.5 163.5L580 186.4L580 186.9L579.5 193.8L579.4 194.3L578.2 201.2L578.1 201.7L574.5 215.5L572.6 221.3L572.5 221.7L570.2 227.4L570 227.7L564.5 239.1L564.3 239.3L564.2 239.6L564 239.9L563.7 240.1L563.5 240.4L563.2 240.6L562.8 240.9L562.5 241.1L562.1 241.4L561.7 241.6L561.3 241.9L560.8 242.1L560.4 242.3L559.9 242.5L559.3 242.7L558.8 243L558.2 243.2L557.7 243.3L557 243.5L556.4 243.7L555.8 243.9L555.1 244L554.5 244.2L553.8 244.3L553.1 244.5L552.4 244.6L551.7 244.7L550.9 244.8L550.2 244.9L549.5 245L548.7 245.1L548 245.1L547.2 245.2L546.5 245.2L545.7 245.3L544.9 245.3L544.2 245.3L543.4 245.3L542.7 245.3L541.9 245.3L541.2 245.2L540.5 245.2L539.8 245.1L539.1 245.1L538.4 245L537.7 244.9L537 244.8L536.3 244.7L535.7 244.6L535.1 244.5L534.5 244.4L533.9 244.2L533.3 244.1L532.8 243.9L532.2 243.7L531.7 243.6L531.2 243.4L530.8 243.2L530.4 243L529.9 242.8L529.6 242.6L529.2 242.4L528.9 242.1L528.6 241.9L528.3 241.7L528.1 241.4L527.8 241.2L527.7 240.9L527.5 240.7L520.9 229.9L518.1 224.4L517.9 224L515.5 218.5L515.3 218.1L510.4 204.7L508.5 197.9L508.4 197.4L507.3 190.6L507.2 190.1L505.5 167.2Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.yoke\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M506.2 169.8L506.2 168.9L506.4 167.8L506.6 166.8L506.9 165.8L507.2 164.9L507.7 164L508.2 163.2L508.8 162.5L509.4 161.8L514.6 156.7L520.1 152.1L521 151.4L526.9 147.1L533.1 143.3L534.1 142.6L540.4 139.1L546.9 135.8L548 135.4L554.7 132.6L555.7 132.3L562.5 130.2L563.4 130L564.4 129.9L565.3 129.9L566.3 130L567.3 130.2L568.3 130.5L569.4 130.9L570.3 131.2L571.1 131.7L572 132.2L572.8 132.8L573.5 133.5L574.3 134.2L574.9 135L575.6 135.8L576.1 136.7L576.6 137.6L577 138.6L577.4 139.6L577.7 140.6L577.9 141.6L578 142.6L578 143.5L578 144.5L577.9 145.4L577.7 146.6L577.5 147.6L577.2 148.5L576.8 149.4L576.3 150.3L575.7 151L575.1 151.7L570 156.8L569.2 157.5L563.6 162.1L557.7 166.4L556.8 167L550.6 170.9L544.3 174.5L543.3 175.1L536.8 178.3L530 181L529 181.4L522.1 183.6L521.2 183.8L520.3 183.9L519.3 184L518.4 183.9L517.4 183.8L516.4 183.5L515.3 183.1L514.4 182.8L513.5 182.4L512.7 181.9L511.8 181.4L511 180.7L510.3 180L509.6 179.3L508.9 178.5L508.3 177.6L507.8 176.7L507.3 175.7L507 174.8L506.6 173.8L506.4 172.8L506.2 171.8L506.2 170.8Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M511.8 181.1L512.7 181.6L513.6 182L514.6 182.3L515.5 182.5L516.4 182.6L517.3 182.5L518.2 182.3L519 182L519.8 181.6L520.5 181.1L521.2 180.5L521.7 179.8L522.2 179L522.5 178.1L522.8 177.2L522.9 176.2L523 175.2L522.9 174.1L522.7 173.1L522.5 172L523.4 172.1L524.3 171.8L525.2 171.3L525.9 170.5L526.3 169.3L526.3 167.9L526.3 167.9L531.3 164.8L536.1 161.8L540.6 158.9L545 156.2L549.3 153.4L553.4 150.8L553.4 150.8L557.5 148.3L561.4 145.7L565.2 143.3L568.8 140.9L572.2 138.6L575.5 136.5L575.5 136.5L575.4 136.2L575.3 136.1L575.3 136L575.2 135.9L575 135.4L574.6 134.6L574.4 134.3L574.3 134.3L574.3 134.3L574.3 134.3L574.3 134.3L574.3 134.3L574.4 134.5L574.4 134.5L574.5 134.5L574.5 134.5L574.5 134.6L574.7 134.8L575.4 135.7L576 136.6L576.5 137.5L577 138.5L577.3 139.5L577.5 140.6L577.7 141.6L577.7 141.8L577.7 141.8L577.7 141.9L577.7 141.9L577.8 141.9L577.9 142.2L577.9 142.4L578 142.4L578 142.4L578 142.5L578 142.5L578.1 142.8L578 143.1L577.9 143.3L577.9 143.3L577.9 143.3L577.9 143.3L577.8 143.4L574.4 152.3L571 155.8L567.4 159.1L563.6 162.2L559.7 165L555.7 167.7L551.6 170.3L549.4 171.6L545.2 174L540.9 176.3L536.6 178.4L532.1 180.2L527.5 181.9L522.8 183.3L513.3 182.1L513 182.1L512.7 182L512.5 181.8L512.3 181.6L512 181.3Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M522.5 172L522.2 171.2L521.8 170.5L521.4 169.7L522.3 169.4L523.2 169L524 168.4L524.6 167.7L524.9 166.7L524.9 165.5L524.9 165.5L529.7 162.3L534.3 159.1L538.8 156.1L543.1 153.3L547.4 150.6L551.5 147.9L551.5 147.9L555.5 145.4L559.4 142.9L563.2 140.5L566.9 138.3L570.4 136.2L573.8 134.3L573.8 134.3L573.6 134L573.5 133.9L573.5 133.8L573.4 133.7L573 133.1L572.3 132.4L571.8 132.1L571.8 132.1L571.8 132.1L571.8 132.1L571.8 132.2L571.9 132.3L572.2 132.6L572.2 132.6L572.2 132.6L572.2 132.6L572.4 132.8L572.7 133L573.4 133.6L574.1 134.2L574.7 134.8L574.5 134.6L574.5 134.5L574.5 134.5L574.4 134.5L574.4 134.5L574.3 134.3L574.3 134.3L574.3 134.3L574.3 134.3L574.3 134.3L574.4 134.3L574.6 134.6L575 135.4L575.2 135.9L575.3 136L575.3 136.1L575.4 136.2L575.5 136.5L575.5 136.5L572.2 138.6L568.8 140.9L565.2 143.3L561.4 145.7L557.5 148.3L553.4 150.8L553.4 150.8L549.3 153.4L545 156.2L540.6 158.9L536.1 161.8L531.3 164.8L526.3 167.9L526.3 167.9L526.3 169.3L525.9 170.5L525.2 171.3L524.3 171.8L523.4 172.1Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M521.4 169.7L520.9 168.9L520.4 168.1L519.8 167.4L520.5 166.9L521.3 166.3L522 165.6L522.6 164.9L522.9 164.2L522.8 163.2L522.8 163.2L527.4 159.7L531.9 156.5L536.2 153.4L540.4 150.5L544.6 147.7L548.7 145.1L548.7 145.1L552.7 142.6L556.6 140.2L560.5 137.9L564.2 135.8L567.9 133.9L571.4 132.2L571.4 132.2L571.1 131.9L571 131.8L571 131.8L571.1 131.8L571.2 131.8L571.5 131.9L571.7 132.1L571.8 132.1L571.8 132.1L571.8 132.1L572.3 132.4L573 133.1L573.4 133.7L573.5 133.8L573.5 133.9L573.6 134L573.8 134.3L573.8 134.3L570.4 136.2L566.9 138.3L563.2 140.5L559.4 142.9L555.5 145.4L551.5 147.9L551.5 147.9L547.4 150.6L543.1 153.3L538.8 156.1L534.3 159.1L529.7 162.3L524.9 165.5L524.9 165.5L524.9 166.7L524.6 167.7L524 168.4L523.2 169L522.3 169.4ZM571.8 132.1L571.8 132.1L571.8 132.1L571.8 132.1ZM572.2 132.6L572.2 132.6L572.2 132.6L572.2 132.6ZM572.4 132.8L572.7 133L572.4 132.8L572.3 132.7L572.2 132.6L572.2 132.6ZM514.7 173.3L514.7 173.3L514.7 173.3L514.7 173.3L514.7 173.3L514.7 173.3L514.7 173.3L514.7 173.3L514.7 173.3L514.7 173.3L514.7 173.3L514.7 173.3L514.7 173.3L514.7 173.3L514.7 173.3L514.7 173.3L514.7 173.3L514.7 173.3L514.7 173.3L514.7 173.3L514.7 173.3L514.7 173.3L514.7 173.3L514.7 173.3L514.7 173.3L514.7 173.3L514.7 173.3L514.7 173.3L514.7 173.3L514.7 173.3L514.7 173.3L514.7 173.3L514.7 173.3L514.7 173.3L514.7 173.3L514.7 173.3L523 175.3L522.8 176.8L522.4 178.3L521.8 179.6L520.9 180.7L519.9 181.6L518.6 182.2L517.3 182.5L515.8 182.5L514.4 182.3L512.9 181.7L511.5 180.9L510.2 179.8L509 178.5L508.1 177.1L507.3 175.5L506.8 173.9L506.5 172.2L506.5 170.6L506.8 169.1L507.3 167.7L508.1 166.5L509 165.5L510.2 164.8L511.5 164.3L512.9 164.1L514.4 164.3L515.8 164.7L517.3 165.4L518.6 166.3L519.9 167.5L520.9 168.9L521.8 170.4L522.4 172L522.8 173.6L523 175.3Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M506.4 171.3L506.3 170.9L506.1 170.6L506.1 170.3L506.1 169.9L506.3 169L506.3 169.7L506.4 170.5L506.2 170.8L506.1 171L506.2 171.3L506.3 171.7L506.4 172L506.5 172.3L506.5 171.7ZM519.8 167.4L519.1 166.8L518.4 166.2L517.7 165.6L518.3 164.9L518.8 164.2L519.4 163.5L520 162.8L520.5 162.2L520.4 161.4L521.2 161.9L522.1 162.5L522.8 163.2L522.9 164.2L522.6 164.9L522 165.6L521.3 166.3L520.5 166.9ZM506.3 169L506.3 169.7L506.4 170.5L506.3 169.7L506.3 169.7ZM522.8 163.2L522.1 162.5L521.2 161.9L520.4 161.4L520.4 161.4L521.2 161.9L522.1 162.5L522.8 163.2ZM522.8 163.2L522.1 162.5L521.2 161.9L520.4 161.4L524.7 157.8L529 154.4L533.1 151.3L537.2 148.3L541.3 145.5L545.3 142.9L545.3 142.9L549.4 140.4L553.3 138.1L557.2 135.9L561 133.9L564.8 132.1L568.5 130.6L570.9 131.8L571 131.8L571.1 131.9L571.4 132.2L571.4 132.2L567.9 133.9L564.2 135.8L560.5 137.9L556.6 140.2L552.7 142.6L548.7 145.1L548.7 145.1L544.6 147.7L540.4 150.5L536.2 153.4L531.9 156.5L527.4 159.7ZM571.1 131.9L571 131.8L571 131.8L571 131.8Z\"/><path class=\"iso-top\" d=\"M517.7 165.6L516.8 165.1L515.9 164.7L514.9 164.4L514 164.2L513 164.1L512.1 164.2L511.2 164.4L510.4 164.7L509.6 165.1L508.9 165.6L508.2 166.3L507.7 167L507.3 167.8L506.9 168.7L506.7 169.6L506.5 170.7L506.5 171.7L506.4 171.3L506.3 170.9L506.1 170.6L506.1 170.3L506.1 169.9L506.3 169L509.8 161.5L513.2 158L516.8 154.8L520.6 151.7L524.5 148.9L528.5 146.2L532.6 143.6L534.8 142.3L539 139.9L543.3 137.6L547.6 135.5L552.1 133.6L556.7 132L561.4 130.6L562.5 130.2L563.6 130L564.8 129.9L566 130L567.3 130.2L568.5 130.6L564.8 132.1L561 133.9L557.2 135.9L553.3 138.1L549.4 140.4L545.3 142.9L545.3 142.9L541.3 145.5L537.2 148.3L533.1 151.3L529 154.4L524.7 157.8L520.4 161.4L520.4 161.4L520.5 162.2L520 162.8L519.4 163.5L518.8 164.2L518.3 164.9ZM564.8 129.9L564.8 129.9L561.4 130.6L562.5 130.2L563.6 130L564.8 129.9L566 130L567.3 130.2L568.5 130.6Z\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M506.2 169.8L506.2 168.9L506.4 167.8L506.6 166.8L506.9 165.8L507.2 164.9L507.7 164L508.2 163.2L508.8 162.5L509.4 161.8L514.6 156.7L520.1 152.1L521 151.4L526.9 147.1L533.1 143.3L534.1 142.6L540.4 139.1L546.9 135.8L548 135.4L554.7 132.6L555.7 132.3L562.5 130.2L563.4 130L564.4 129.9L565.3 129.9L566.3 130L567.3 130.2L568.3 130.5L569.4 130.9L570.3 131.2L571.1 131.7L572 132.2L572.8 132.8L573.5 133.5L574.3 134.2L574.9 135L575.6 135.8L576.1 136.7L576.6 137.6L577 138.6L577.4 139.6L577.7 140.6L577.9 141.6L578 142.6L578 143.5L578 144.5L577.9 145.4L577.7 146.6L577.5 147.6L577.2 148.5L576.8 149.4L576.3 150.3L575.7 151L575.1 151.7L570 156.8L569.2 157.5L563.6 162.1L557.7 166.4L556.8 167L550.6 170.9L544.3 174.5L543.3 175.1L536.8 178.3L530 181L529 181.4L522.1 183.6L521.2 183.8L520.3 183.9L519.3 184L518.4 183.9L517.4 183.8L516.4 183.5L515.3 183.1L514.4 182.8L513.5 182.4L512.7 181.9L511.8 181.4L511 180.7L510.3 180L509.6 179.3L508.9 178.5L508.3 177.6L507.8 176.7L507.3 175.7L507 174.8L506.6 173.8L506.4 172.8L506.2 171.8L506.2 170.8Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.neck\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M531 140.8L531.1 140.7L531.1 140.5L531.1 140.4L531.1 140.3L531.1 140.1L531.2 140L531.2 139.9L531.2 139.7L531.2 139.6L531.3 139.4L531.3 139.3L531.3 139.2L531.3 139L531.3 138.9L531.4 138.8L531.4 138.6L531.4 138.5L531.4 138.4L531.5 138.2L531.5 138.1L531.5 137.9L531.5 137.8L531.6 137.7L531.6 137.6L531.6 137.6L531.6 137.4L531.6 137.3L531.6 137.2L531.6 137L531.6 136.9L531.6 136.8L531.6 136.6L531.6 136.5L531.6 136.4L531.6 136.2L531.6 136.1L531.6 135.9L531.6 135.8L531.6 135.7L531.6 135.5L531.6 135.4L531.6 135.3L531.6 135.1L531.6 135L531.6 134.9L531.6 134.7L531.6 134.6L531.6 134.5L531.6 134.5L531.6 134.4L531.6 134.2L531.5 134.1L531.5 134L531.5 133.8L531.5 133.7L531.5 133.6L531.4 133.4L531.4 133.3L531.4 133.1L531.4 133L531.4 132.9L531.3 132.7L531.3 132.6L531.3 132.5L531.3 132.3L531.3 132.2L531.2 132.1L531.2 131.9L531.2 131.8L531.2 131.7L531.2 131.5L531.2 131.5L531.2 131.5L531.1 131.3L531.1 131.2L531 131.1L531 130.9L530.9 130.8L530.9 130.7L530.9 130.5L530.8 130.4L530.8 130.3L530.7 130.1L530.7 130L530.6 129.9L530.6 129.7L530.5 129.6L530.5 129.5L530.5 129.3L530.4 129.2L530.4 129.1L530.3 128.9L530.3 128.8L530.2 128.7L530.2 128.5L530.2 128.4L530.2 128.4L530.1 128.2L530.1 127.9L530.1 127.7L530.2 127.4L530.3 127.2L530.5 127L530.7 126.7L531 126.5L531.3 126.2L531.6 126L532 125.8L532.4 125.6L532.8 125.4L533.3 125.2L533.8 125L534.4 124.8L535 124.7L535.6 124.5L536.2 124.4L536.8 124.3L537.5 124.2L538.1 124.1L538.8 124L539.5 123.9L540.2 123.9L540.9 123.8L541.6 123.8L542.3 123.8L542.9 123.8L543.6 123.9L544.3 123.9L544.9 124L545.5 124.1L546.1 124.1L546.7 124.3L547.3 124.4L547.8 124.5L548.3 124.7L548.8 124.8L549.2 125L549.6 125.2L550 125.4L550.3 125.6L550.6 125.8L550.8 126L551 126.2L551.1 126.4L551.2 126.7L551.3 126.9L551.3 127.2L551.3 127.4L551.3 127.4L551.3 127.5L551.2 127.7L551.2 127.8L551.2 128L551.1 128.1L551.1 128.2L551.1 128.4L551 128.5L551 128.6L551 128.8L550.9 128.9L550.9 129L550.9 129.2L550.9 129.3L550.8 129.5L550.8 129.6L550.8 129.7L550.7 129.9L550.7 130L550.7 130.1L550.6 130.3L550.6 130.4L550.6 130.5L550.6 130.6L550.6 130.6L550.6 130.7L550.6 130.9L550.5 131L550.5 131.2L550.5 131.3L550.5 131.4L550.5 131.6L550.5 131.7L550.5 131.8L550.5 132L550.5 132.1L550.5 132.2L550.5 132.4L550.5 132.5L550.5 132.7L550.5 132.8L550.5 132.9L550.4 133.1L550.4 133.2L550.4 133.3L550.4 133.5L550.4 133.6L550.4 133.6L550.4 133.7L550.4 133.8L550.4 134L550.5 134.1L550.5 134.2L550.5 134.4L550.5 134.5L550.5 134.6L550.5 134.8L550.6 134.9L550.6 135L550.6 135.2L550.6 135.3L550.6 135.5L550.6 135.6L550.6 135.7L550.7 135.9L550.7 136L550.7 136.1L550.7 136.3L550.7 136.4L550.7 136.5L550.8 136.7L550.8 136.7L550.8 136.8L550.8 136.9L550.8 137L550.9 137.2L550.9 137.3L550.9 137.4L551 137.6L551 137.7L551.1 137.8L551.1 138L551.1 138.1L551.2 138.2L551.2 138.4L551.2 138.5L551.3 138.6L551.3 138.8L551.3 138.9L551.4 139L551.4 139.2L551.4 139.3L551.5 139.4L551.5 139.6L551.6 139.7L551.6 139.8L551.6 139.8L551.6 140.1L551.6 140.3L551.6 140.5L551.5 140.8L551.4 141L551.2 141.2L551 141.5L550.7 141.7L550.4 141.9L550.1 142.1L549.7 142.3L549.3 142.5L548.9 142.7L548.4 142.9L547.9 143.1L547.4 143.3L546.8 143.4L546.3 143.5L545.7 143.7L545.1 143.8L544.4 143.9L543.8 144L543.1 144.1L542.5 144.1L541.8 144.2L541.2 144.2L540.5 144.2L539.8 144.2L539.2 144.2L538.5 144.2L537.9 144.1L537.3 144.1L536.7 144L536.1 143.9L535.5 143.8L535 143.7L534.5 143.6L534 143.4L533.5 143.3L533.1 143.1L532.7 142.9L532.4 142.8L532.1 142.6L531.8 142.4L531.6 142.2L531.4 142L531.2 141.7L531.1 141.5L531 141.3L531 141L531 140.8Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M551.6 139.9L551.6 140.4L551.5 140.8L551.2 141.3L550.7 141.7L550.1 142.1L549.4 142.5L548.6 142.8L547.6 143.2L546.6 143.5L545.5 143.7L544.6 142.7L543.8 141.6L543.1 140.5L542.4 139.5L541.9 138.4L541.7 138.1L541.7 138L541.6 137.9L541.6 137.9L541.6 137.8L541.5 137.7L541.5 137.6L541.3 137.3L541.3 137.3L540.5 136.3L539.7 135.3L538.9 134.2L538.5 133.7L538.3 133.4L538.3 133.4L538.2 133.3L538.1 133.2L537.3 132.2L536.5 131.1L537.8 131.2L539.1 131.3L540.5 131.3L541.8 131.2L543.2 131.1L544.5 130.9L545.7 130.6L546.9 130.3L547.9 130L548.9 129.6L549.7 129.2L550.3 128.7L550.8 128.2L551.1 127.8L551.3 127.3L551 128.4L550.8 129.5L550.7 129.6L550.7 129.7L550.7 129.8L550.7 130L550.6 130.6L550.4 131.7L550.4 132.8L550.4 133.8L550.4 133.5L550.4 133.7L550.4 133.9L550.4 133.9L550.4 134L550.4 134.1L550.4 134.1L550.4 134.3L550.5 134.6L550.6 135.6L550.8 136.7L551 137.8L551.3 138.9Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M545.5 143.7L544.4 143.9L543.2 144.1L542 144.2L541.2 143L540.5 141.9L539.9 140.7L539.3 139.6L538.7 138.4L538.6 138.2L538.5 138L538.5 138L538.5 137.9L538.4 137.8L538.4 137.7L538.4 137.6L538.2 137.3L538.2 137.3L537.4 136.2L536.5 135L535.6 133.9L535.1 133.3L534.9 133L534.8 132.9L534.8 132.9L534.7 132.7L533.7 131.5L532.7 130.3L533.5 130.6L534.4 130.8L535.4 131L536.5 131.1L537.3 132.2L538.1 133.2L538.2 133.3L538.3 133.4L538.3 133.4L538.5 133.7L538.9 134.2L539.7 135.3L540.5 136.3L541.3 137.3L541.3 137.3L541.5 137.6L541.5 137.7L541.6 137.8L541.6 137.9L541.6 137.9L541.7 138L541.7 138.1L541.9 138.4L542.4 139.5L543.1 140.5L543.8 141.6L544.6 142.7Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M542 144.2L540.7 144.2L539.3 144.2L538.1 144.1L537.5 142.9L536.9 141.7L536.3 140.4L535.8 139.2L535.3 138L535.1 137.7L535.1 137.5L535 137.5L535 137.4L535 137.3L534.9 137.2L534.9 137.1L534.7 136.8L534.7 136.8L533.8 135.4L532.9 134L531.8 132.5L531.3 131.5L531 130.7L530.9 130.6L530.9 130.6L530.9 130.4L530.5 129.4L530.1 128.3L530.3 128.8L530.7 129.2L531.2 129.6L531.9 130L532.7 130.3L533.7 131.5L534.7 132.7L534.8 132.9L534.8 132.9L534.9 133L535.1 133.3L535.6 133.9L536.5 135L537.4 136.2L538.2 137.3L538.2 137.3L538.4 137.6L538.4 137.7L538.4 137.8L538.5 137.9L538.5 138L538.5 138L538.6 138.2L538.7 138.4L539.3 139.6L539.9 140.7L540.5 141.9L541.2 143Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M538.1 144.1L537.1 144.1L536.2 143.9L535.3 143.8L534.5 143.6L534 142.2L533.5 140.8L533 139.4L532.5 138L532 136.4L531.8 135.9L531.7 135.6L531.7 135.5L531.9 135.9L532.3 136.3L532.8 136.6L533.4 136.9L534.2 137.2L535 137.5L535.1 137.5L535.1 137.7L535.3 138L535.8 139.2L536.3 140.4L536.9 141.7L537.5 142.9ZM535 137.5L534.2 137.2L533.4 136.9L532.8 136.6L532.3 136.3L531.9 135.9L531.7 135.5L531.7 135.3L531.8 135.6L532.1 136L532.4 136.3L532.9 136.6L533.5 136.9L534.2 137.2L535 137.4ZM531.6 135L531.6 134.9L531.6 135L531.6 135ZM535 137.3L534.1 137.1L533.3 136.8L532.7 136.4L532.2 136.1L531.9 135.7L531.7 135.3L531.6 134.8L531.6 134.9L531.6 135ZM535 137.4L534.2 137.2L533.5 136.9L532.9 136.6L532.4 136.3L532.1 136L531.8 135.6L531.7 135.3L532.7 136.4L532.7 136.4ZM535 137.3L534.1 137.1L533.3 136.8L532.7 136.4L532.2 136.1L531.9 135.7L531.7 135.3L531.6 134.8L531.6 134.8L531.6 134.6L531.6 134.4L531.6 134.7L531.6 133.6L531.4 132.6L531.2 131.5L531 131L531 130.7L531 130.7L531.3 131.5L531.8 132.5L532.9 134L533.8 135.4L534.7 136.8L534.7 136.8L534.9 137.1L534.9 137.2ZM530.9 130.7L530.9 130.7L531 130.7L531 130.7Z\"/><path class=\"iso-top\" d=\"M534.5 143.6L533.6 143.3L532.8 143L532.1 142.6L531.6 142.2L531.3 141.8L531.1 141.4L531 140.9L531.3 139.8L531.4 138.7L531.6 137.6L531.6 136.5L531.6 135.4L531.6 135.2L531.6 135L531.6 135L531.6 135L531.7 135.3L531.7 135.5L531.7 135.6L531.8 135.9L532 136.4L532.5 138L533 139.4L533.5 140.8L534 142.2ZM531.6 135.1L531.6 135.1L531.6 135L531.7 135.3ZM547.5 124.4L549 124.9L550.1 125.5L550.9 126.1L551.3 126.8L551.3 127.5L550.8 128.2L550 129L548.8 129.6L547.3 130.2L545.6 130.6L543.7 131L541.6 131.2L539.5 131.3L537.5 131.2L535.6 131L533.9 130.7L532.4 130.2L531.3 129.7L530.5 129L530.1 128.3L530.2 127.6L530.6 126.9L531.4 126.2L532.6 125.5L534.1 124.9L535.8 124.5L537.7 124.1L539.8 123.9L541.9 123.8L543.9 123.9L545.8 124.1L547.5 124.4L540.7 127.6L540.7 127.6L540.7 127.6L540.7 127.6L540.7 127.6L540.7 127.6L540.7 127.6L540.7 127.6L540.7 127.6L540.7 127.6L540.7 127.6L540.7 127.6L540.7 127.6L540.7 127.6L540.7 127.6L540.7 127.6L540.7 127.6L540.7 127.6L540.7 127.6L540.7 127.6L540.7 127.6L540.7 127.6L540.7 127.6L540.7 127.6L540.7 127.6L540.7 127.6L540.7 127.6L540.7 127.6L540.7 127.6L540.7 127.6L540.7 127.6L540.7 127.6L540.7 127.6Z\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M531 140.8L531.1 140.7L531.1 140.5L531.1 140.4L531.1 140.3L531.1 140.1L531.2 140L531.2 139.9L531.2 139.7L531.2 139.6L531.3 139.4L531.3 139.3L531.3 139.2L531.3 139L531.3 138.9L531.4 138.8L531.4 138.6L531.4 138.5L531.4 138.4L531.5 138.2L531.5 138.1L531.5 137.9L531.5 137.8L531.6 137.7L531.6 137.6L531.6 137.6L531.6 137.4L531.6 137.3L531.6 137.2L531.6 137L531.6 136.9L531.6 136.8L531.6 136.6L531.6 136.5L531.6 136.4L531.6 136.2L531.6 136.1L531.6 135.9L531.6 135.8L531.6 135.7L531.6 135.5L531.6 135.4L531.6 135.3L531.6 135.1L531.6 135L531.6 134.9L531.6 134.7L531.6 134.6L531.6 134.5L531.6 134.5L531.6 134.4L531.6 134.2L531.5 134.1L531.5 134L531.5 133.8L531.5 133.7L531.5 133.6L531.4 133.4L531.4 133.3L531.4 133.1L531.4 133L531.4 132.9L531.3 132.7L531.3 132.6L531.3 132.5L531.3 132.3L531.3 132.2L531.2 132.1L531.2 131.9L531.2 131.8L531.2 131.7L531.2 131.5L531.2 131.5L531.2 131.5L531.1 131.3L531.1 131.2L531 131.1L531 130.9L530.9 130.8L530.9 130.7L530.9 130.5L530.8 130.4L530.8 130.3L530.7 130.1L530.7 130L530.6 129.9L530.6 129.7L530.5 129.6L530.5 129.5L530.5 129.3L530.4 129.2L530.4 129.1L530.3 128.9L530.3 128.8L530.2 128.7L530.2 128.5L530.2 128.4M551.6 139.8L551.6 139.7L551.5 139.6L551.5 139.4L551.4 139.3L551.4 139.2L551.4 139L551.3 138.9L551.3 138.8L551.3 138.6L551.2 138.5L551.2 138.4L551.2 138.2L551.1 138.1L551.1 138L551.1 137.8L551 137.7L551 137.6L550.9 137.4L550.9 137.3L550.9 137.2L550.8 137L550.8 136.9L550.8 136.8L550.8 136.7L550.8 136.7L550.7 136.5L550.7 136.4L550.7 136.3L550.7 136.1L550.7 136L550.7 135.9L550.6 135.7L550.6 135.6L550.6 135.5L550.6 135.3L550.6 135.2L550.6 135L550.6 134.9L550.5 134.8L550.5 134.6L550.5 134.5L550.5 134.4L550.5 134.2L550.5 134.1L550.4 134L550.4 133.8L550.4 133.7L550.4 133.6L550.4 133.6L550.4 133.5L550.4 133.3L550.4 133.2L550.4 133.1L550.5 132.9L550.5 132.8L550.5 132.7L550.5 132.5L550.5 132.4L550.5 132.2L550.5 132.1L550.5 132L550.5 131.8L550.5 131.7L550.5 131.6L550.5 131.4L550.5 131.3L550.5 131.2L550.5 131L550.6 130.9L550.6 130.7L550.6 130.6L550.6 130.6L550.6 130.5L550.6 130.4L550.6 130.3L550.7 130.1L550.7 130L550.7 129.9L550.8 129.7L550.8 129.6L550.8 129.5L550.9 129.3L550.9 129.2L550.9 129L550.9 128.9L551 128.8L551 128.6L551 128.5L551.1 128.4L551.1 128.2L551.1 128.1L551.2 128L551.2 127.8L551.2 127.7L551.3 127.5L551.3 127.4M530.2 128.4L530.1 128.2L530.1 127.9L530.1 127.7L530.2 127.4L530.3 127.2L530.5 127L530.7 126.7L531 126.5L531.3 126.2L531.6 126L532 125.8L532.4 125.6L532.8 125.4L533.3 125.2L533.8 125L534.4 124.8L535 124.7L535.6 124.5L536.2 124.4L536.8 124.3L537.5 124.2L538.1 124.1L538.8 124L539.5 123.9L540.2 123.9L540.9 123.8L541.6 123.8L542.3 123.8L542.9 123.8L543.6 123.9L544.3 123.9L544.9 124L545.5 124.1L546.1 124.1L546.7 124.3L547.3 124.4L547.8 124.5L548.3 124.7L548.8 124.8L549.2 125L549.6 125.2L550 125.4L550.3 125.6L550.6 125.8L550.8 126L551 126.2L551.1 126.4L551.2 126.7L551.3 126.9L551.3 127.2L551.3 127.4M551.6 139.8L551.6 140.1L551.6 140.3L551.6 140.5L551.5 140.8L551.4 141L551.2 141.2L551 141.5L550.7 141.7L550.4 141.9L550.1 142.1L549.7 142.3L549.3 142.5L548.9 142.7L548.4 142.9L547.9 143.1L547.4 143.3L546.8 143.4L546.3 143.5L545.7 143.7L545.1 143.8L544.4 143.9L543.8 144L543.1 144.1L542.5 144.1L541.8 144.2L541.2 144.2L540.5 144.2L539.8 144.2L539.2 144.2L538.5 144.2L537.9 144.1L537.3 144.1L536.7 144L536.1 143.9L535.5 143.8L535 143.7L534.5 143.6L534 143.4L533.5 143.3L533.1 143.1L532.7 142.9L532.4 142.8L532.1 142.6L531.8 142.4L531.6 142.2L531.4 142L531.2 141.7L531.1 141.5L531 141.3L531 141L531 140.8\"/></g></g><g class=\"mq-joint\" data-name=\"as.neckball\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M529.5 140.6L529.6 138.7L530.1 136.9L530.8 135.2L531.7 133.6L533 132.2L534.4 131L535.9 130.1L537.7 129.3L539.5 128.9L541.3 128.8L543.2 128.9L545 129.3L546.7 130.1L548.3 131L549.7 132.2L550.9 133.6L551.9 135.2L552.6 136.9L553 138.7L553.2 140.6L553 142.4L552.6 144.3L551.9 146L550.9 147.6L549.7 149L548.3 150.2L546.7 151.1L545 151.9L543.2 152.3L541.3 152.4L539.5 152.3L537.7 151.9L535.9 151.1L534.4 150.2L533 149L531.7 147.6L530.8 146L530.1 144.3L529.6 142.4Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M529.5 140.6L529.6 138.7L530.1 136.9L530.8 135.2L531.7 133.6L533 132.2L534.4 131L535.9 130.1L537.7 129.3L539.5 128.9L541.3 128.8L543.2 128.9L545 129.3L546.7 130.1L548.3 131L549.7 132.2L550.9 133.6L551.9 135.2L552.6 136.9L553 138.7L553.2 140.6L553 142.4L552.6 144.3L551.9 146L550.9 147.6L549.7 149L548.3 150.2L546.7 151.1L545 151.9L543.2 152.3L541.3 152.4L539.5 152.3L537.7 151.9L535.9 151.1L534.4 150.2L533 149L531.7 147.6L530.8 146L530.1 144.3L529.6 142.4Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M529.5 140.6L529.6 138.7L530.1 136.9L530.8 135.2L531.7 133.6L533 132.2L534.4 131L535.9 130.1L537.7 129.3L539.5 128.9L541.3 128.8L543.2 128.9L545 129.3L546.7 130.1L548.3 131L548.6 131.4L548.7 132L548.6 132.8L548.3 133.7L547.7 134.7L547 135.9L546.1 137.1L545 138.4L543.9 139.7L542.6 140.9L541.2 142.1L539.8 143.3L538.4 144.3L537.1 145.2L535.8 145.9L534.6 146.5L533.5 146.8L532.6 147L531.9 147L531.3 146.8L530.8 146L530.1 144.3L529.6 142.4Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M529.5 140.6L529.6 138.7L530.1 136.9L530.8 135.2L531.7 133.6L533 132.2L534.4 131L535.9 130.1L537.7 129.3L539.5 128.9L541.3 128.8L543.2 128.9L545 129.3L546 129.7L546.3 130.1L546.4 130.7L546.3 131.4L546 132.2L545.5 133.2L544.8 134.3L544 135.4L543 136.6L541.9 137.7L540.7 138.9L539.4 140L538.1 141.1L536.8 142L535.6 142.9L534.4 143.5L533.3 144.1L532.3 144.4L531.5 144.6L530.8 144.6L530.3 144.4L530 144L529.6 142.4Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M529.5 140.6L529.6 138.7L530.1 136.9L530.8 135.2L531.7 133.6L533 132.2L534.4 131L535.9 130.1L537.7 129.3L539.5 128.9L541.3 128.8L543 128.9L543.4 129.1L543.7 129.4L543.8 129.9L543.7 130.5L543.4 131.2L543 132L542.4 133L541.7 133.9L540.8 134.9L539.9 136L538.8 137L537.7 137.9L536.6 138.8L535.5 139.7L534.4 140.4L533.4 141L532.4 141.4L531.6 141.7L530.9 141.9L530.3 141.9L529.8 141.7L529.6 141.4Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M529.5 140.6L529.6 138.7L530.1 136.9L530.8 135.2L531.7 133.6L533 132.2L534.4 131L535.9 130.1L537.7 129.3L539.5 128.9L541.3 128.8L543.2 128.9L545 129.3L546.7 130.1L548.3 131L549.7 132.2L550.9 133.6L551.9 135.2L552.6 136.9L553 138.7L553.2 140.6L553 142.4L552.6 144.3L551.9 146L550.9 147.6L549.7 149L548.3 150.2L546.7 151.1L545 151.9L543.2 152.3L541.3 152.4L539.5 152.3L537.7 151.9L535.9 151.1L534.4 150.2L533 149L531.7 147.6L530.8 146L530.1 144.3L529.6 142.4Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.head\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M512.2 98.3L512.5 92.9L512.6 92.3L513.7 86.8L513.8 86.3L515.8 80.9L516 80.4L516.3 80L519.5 74.7L519.7 74.3L521.8 71.7L522.1 71.4L522.5 71L522.9 70.7L525.7 68.4L526.1 68.1L526.5 67.9L526.9 67.6L527.4 67.4L527.9 67.1L528.5 66.9L530.3 66.1L530.8 65.9L531.3 65.8L531.9 65.6L532.4 65.4L533 65.3L533.6 65.2L534.2 65L534.9 64.9L535.5 64.8L536.6 64.7L537.1 64.6L537.6 64.6L538.1 64.5L538.6 64.5L539.1 64.5L539.6 64.5L540.1 64.5L540.6 64.5L541.1 64.5L541.5 64.5L542 64.5L542.5 64.6L543.7 64.7L544.3 64.8L544.9 64.9L545.6 65L546.2 65.1L546.8 65.2L547.3 65.3L547.9 65.5L548.4 65.6L548.9 65.8L550.7 66.5L551.3 66.7L551.8 66.9L552.3 67.2L552.8 67.4L553.2 67.7L553.6 67.9L556.5 70.2L556.9 70.5L557.2 70.8L557.5 71.2L559.7 73.6L560 74L563.4 79.2L563.6 79.6L565.9 85L566.1 85.5L566.2 86L567.5 91.4L567.6 91.9L568.1 97.4L568 98L567.7 103.5L567.6 104L566.6 109.5L566.4 110L564.4 115.4L564.1 115.9L560.9 121.2L560.7 121.6L560.4 121.9L558.3 124.5L558 124.8L557.6 125.2L554.8 127.5L554.4 127.8L554 128L553.6 128.3L553.1 128.6L552.6 128.8L552.1 129.1L550.2 129.8L549.7 130L549.2 130.2L548.7 130.4L548.1 130.5L547.6 130.7L547 130.8L546.4 130.9L545.7 131.1L545.1 131.2L543.9 131.3L543.4 131.4L542.9 131.4L542.4 131.5L542 131.5L541.5 131.6L541 131.6L540.5 131.6L540 131.6L539.5 131.6L539 131.6L538.5 131.5L538 131.5L536.9 131.4L536.3 131.3L535.6 131.2L535 131.1L534.4 131L533.8 130.9L533.2 130.8L532.7 130.6L532.2 130.5L531.7 130.3L531.2 130.1L529.2 129.4L528.7 129.2L528.2 129L527.7 128.7L527.3 128.5L526.9 128.2L526.5 128L523.6 125.7L523.2 125.4L522.9 125.1L520.7 122.6L520.4 122.2L517.1 117.1L516.8 116.6L516.5 116.2L514.3 110.8L514.1 110.3L512.8 104.9L512.7 104.4L512.2 98.9Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M555.1 127.2L554.7 127.6L554.2 127.9L553.6 128.3L553 128.6L552.3 128.9L551.6 129.2L550.8 129.5L549.9 129.8L549 130L548.1 130.3L547.1 130.5L546.1 130.6L545.1 130.8L544 130.9L543 131L541.9 131L540.8 131.1L539.7 131.1L538.6 131.1L537.5 131L536.4 130.9L535.4 130.8L534.4 130.7L533.4 130.5L532.5 130.4L531.6 130.1L530.7 129.9L529.9 129.7L529.1 129.4L528.4 129.1L527.8 128.8L527.2 128.4L526.7 128.1L526.3 127.7L540.8 131.1L540.8 131.1ZM555.1 127.2L554.7 127.6L554.2 127.9L553.6 128.3L553 128.6L552.3 128.9L551.6 129.2L550.8 129.5L549.9 129.8L549 130L548.1 130.3L547.1 130.5L546.1 130.6L545.1 130.8L544 130.9L543 131L541.9 131L540.8 131.1L539.7 131.1L538.6 131.1L537.5 131L536.4 130.9L535.4 130.8L534.4 130.7L533.4 130.5L532.5 130.4L531.6 130.1L530.7 129.9L529.9 129.7L529.1 129.4L528.4 129.1L527.8 128.8L527.2 128.4L526.7 128.1L526.3 127.7L525.1 127L524.1 126.2L523.3 125.5L522.5 124.7L522.4 124.6L522.4 124.5L522.4 124.5L522.6 124.6L522.8 124.6L522.5 124L522.5 124L523.1 123.9L523.8 123.7L524.6 123.4L525.5 123L525.9 122.8L526 122.8L526.1 122.7L526.2 122.7L526.4 122.6L527.4 122.1L527.4 122.1L527.8 121.5L528.3 120.8L529.1 120.2L529.9 119.6L530.9 118.9L532.1 118.2L532.1 118.2L532.3 117.4L532.4 117L532.5 117L532.5 117L532.5 116.9L532.7 116.7L533.4 115.9L534.4 115.1L535.6 114.3L537.2 113.5L537.2 113.5L537.3 112.7L537.5 111.8L538 110.9L538.6 110L539.5 109.1L540 108.7L540.1 108.5L540.2 108.5L540.2 108.4L540.5 108.2L540.5 108.2L541.6 107.2L542.4 106.3L543 105.3L543.5 104.3L543.8 103.4L543.8 102.4L543.8 102.4L545.4 101.3L546.7 100.2L547.6 99.1L548.3 98L548.7 97L548.8 95.9L548.8 95.9L550 94.7L551 93.5L551.8 92.3L552.5 91L553.1 89.8L553.5 88.6L553.5 88.6L554.4 87.2L555.3 85.8L556.1 84.3L556.8 82.7L557.5 81.1L558.1 79.4L558.1 79.4L557.7 78.1L557.9 77.2L558 76.7L558.1 76.5L558.1 76.3L558.2 76L558.5 75.1L558.6 74.5L558.7 74.1L558.7 73.7L558.7 73.2L558.6 72.8L558.5 72.5L558.4 72.1L558.1 71.7L558 71.6L557.9 71.5L557.9 71.6L558.1 71.8L558.4 72.2L559.1 73L560 74L560.6 74.8L561.3 75.7L561.8 76.6L562.4 77.4L562.9 78.3L563.4 79.1L563.7 79.9L564.2 80.7L564.6 81.6L565 82.5L565.3 83.4L565.7 84.3L566 85.2L566.2 85.8L566.4 86.7L566.7 87.6L566.9 88.5L567.1 89.4L567.3 90.3L567.5 91.2L567.5 91.8L567.7 92.7L567.8 93.6L567.9 94.5L567.9 95.4L568 96.3L568 97.2L568.1 97.8L568.1 98L568.1 98L568.1 98.1L568.1 98.2L568.1 98.7L568 99.6L568 100.5L567.9 101.4L567.8 102.3L567.8 103.2L567.7 103.8L567.6 104.7L567.4 105.6L567.3 106.5L567.1 107.4L567 107.7L567 107.8L567 107.8L566.9 107.9L566.8 108.4L566.6 109.3L566.4 109.9L566.2 110.8L565.9 111.7L565.6 112.6L565.2 113.5L564.8 114.4L564.4 115.3L564.1 116L563.6 116.9L563.5 117.1L563.5 117.2L563.5 117.2L563.4 117.3L563.2 117.8L562.6 118.7L562.1 119.5L561.5 120.4L560.9 121.3L560 122.3L559.4 123.1L559.1 123.6L558.9 123.8L558.9 123.8L558.8 123.9L558.8 124L558 124.8L557.2 125.6L556.2 126.4ZM558.6 72.8L558.7 73.2L558.7 73.7L558.7 74.1L558.7 73.4L558.7 73.4Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M522.4 124.6L522.4 124.6L522.4 124.5L522.4 124.5ZM522.4 124.5L522.4 124.5L522.2 124.3L521.8 123.9L521.2 123L520.3 122.1L519.6 121.2L519 120.4L518.4 119.5L517.9 118.6L517.6 118.2L517.6 118.1L517.5 118L517.6 118.1L517.8 118.3L518.8 118.7L518.8 118.7L519.1 118.4L519.6 118.1L520.3 117.7L521.2 117.4L522.2 117L523.4 116.6L523.4 116.6L523.4 115.8L523.6 115.5L523.6 115.4L523.6 115.4L523.7 115.3L523.8 115.1L524.5 114.5L525.5 113.9L526.7 113.3L528.3 112.7L528.3 112.7L528.4 111.9L528.6 111L529.1 110.2L529.7 109.4L530.6 108.6L531 108.2L531.2 108.1L531.2 108.1L531.3 108L531.6 107.8L531.6 107.8L532.6 107L533.5 106.2L534.1 105.3L534.6 104.4L534.9 103.4L535 102.5L535 102.5L536.6 101.6L537.8 100.6L538.8 99.7L539.5 98.7L540 97.6L540.2 96.6L540.2 96.6L541.3 95.6L542.4 94.5L543.2 93.4L544 92.3L544.6 91.2L545.1 90.1L545.1 90.1L546 88.9L547 87.7L547.8 86.4L548.6 85.1L549.4 83.8L550 82.5L550 82.5L549.9 81.3L550.2 80.6L550.4 80.3L551.5 80L552.6 79.6L553.6 79.3L554.5 78.9L555.4 78.5L556.2 78L556.9 77.6L557.5 77.1L558 76.7L557.9 77.2L557.7 78.1L558.1 79.4L558.1 79.4L557.5 81.1L556.8 82.7L556.1 84.3L555.3 85.8L554.4 87.2L553.5 88.6L553.5 88.6L553.1 89.8L552.5 91L551.8 92.3L551 93.5L550 94.7L548.8 95.9L548.8 95.9L548.7 97L548.3 98L547.6 99.1L546.7 100.2L545.4 101.3L543.8 102.4L543.8 102.4L543.8 103.4L543.5 104.3L543 105.3L542.4 106.3L541.6 107.2L540.5 108.2L540.5 108.2L540.2 108.4L540.2 108.5L540.1 108.5L540 108.7L539.5 109.1L538.6 110L538 110.9L537.5 111.8L537.3 112.7L537.2 113.5L537.2 113.5L535.6 114.3L534.4 115.1L533.4 115.9L532.7 116.7L532.5 116.9L532.5 117L532.5 117L532.4 117L532.3 117.4L532.1 118.2L532.1 118.2L530.9 118.9L529.9 119.6L529.1 120.2L528.3 120.8L527.8 121.5L527.4 122.1L527.4 122.1L526.4 122.6L526.2 122.7L526.1 122.7L526 122.8L525.9 122.8L525.5 123L524.6 123.4L523.8 123.7L523.1 123.9L522.5 124L522.5 124L522.8 124.6L522.6 124.6ZM558 76.7L557.5 77.1L556.9 77.6L556.2 78L555.4 78.5L554.5 78.9L553.6 79.3L552.6 79.6L551.5 80L550.4 80.3L550.4 80.2L551.4 79.9L552.4 79.6L553.4 79.3L554.2 78.9L555 78.6L555.8 78.2L556.5 77.8L557.1 77.4L557.6 76.9L558.1 76.5ZM557.9 71.5L557.9 71.5L557.9 71.6L557.9 71.6ZM557.9 71.5L557.9 71.5L558 71.6L558.1 71.7L558.4 72.1L558.5 72.5L558.6 72.8L558.4 72.3L558.2 71.9L557.8 71.5L557.4 71L557.5 71.1L557.6 71.2L557.8 71.4L557.8 71.5ZM558.1 76.5L557.6 76.9L557.1 77.4L556.5 77.8L555.8 78.2L555 78.6L554.2 78.9L553.4 79.3L552.4 79.6L551.4 79.9L550.4 80.2L550.5 80.1L550.6 79.9L550.8 79.5L551 79.3L551.1 79.2L552.1 78.9L553.1 78.6L554 78.2L554.9 77.8L555.6 77.4L556.3 76.9L556.9 76.5L557.5 76L557.9 75.6L558.3 75.1L558.5 74.6L558.7 74.1L558.6 74.5L558.5 75.1L558.2 76L558.1 76.3ZM557.4 71L557.8 71.4L558.2 71.9L558.4 72.3L558.6 72.8L558.7 73.3L558.7 73.7L558.6 74.2L558.4 74.7L558.1 75.1L557.8 75.6L557.3 76.1L556.8 76.5L556.2 76.9L555.5 77.3L554.8 77.7L554 78.1L553.1 78.5L552.1 78.8L551.1 79.1L558.6 72.8L558.4 72.3L558.2 71.9L557.8 71.5L557.4 71ZM558.7 74.1L558.5 74.6L558.3 75.1L557.9 75.6L557.5 76L556.9 76.5L556.3 76.9L555.6 77.4L554.9 77.8L554 78.2L553.1 78.6L552.1 78.9L551.1 79.2L556.3 76.9L556.3 76.9ZM557.4 71L557.8 71.4L558.2 71.9L558.4 72.3L558.6 72.8L558.7 73.3L558.7 73.7L558.6 74.2L558.4 74.7L558.1 75.1L557.8 75.6L557.3 76.1L556.8 76.5L556.2 76.9L555.5 77.3L554.8 77.7L554 78.1L553.1 78.5L552.1 78.8L551.1 79.1L551.8 78.3L553.5 76.2L554.5 74.9L554.9 74.1L555.2 73.7L555.3 73.4L555.4 73.2L555.9 71.8L556 71.3L556 70.9L555.9 70.5L555.8 70.1L555.3 69.1L555.2 69.1L555.3 69.1L555.4 69.2L555.7 69.4L556.1 69.8L557 70.6ZM555.8 70.1L555.9 70.5L556 70.9L556 71.3L555.9 71.8L555.9 70.9L555.9 70.9Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M517.6 118.1L517.6 118.1L517.5 118L517.6 118.1ZM517.6 118.1L517.5 118L517.4 117.8L516.9 116.9L516.5 116.2L516.1 115.3L515.7 114.4L515.3 113.5L514.9 112.6L514.6 111.8L514.3 110.9L514.1 110.3L513.9 109.4L513.7 108.9L513.7 108.9L513.7 108.9L513.8 109.1L513.9 109.3L514.6 109.7L515.6 109.9L516.9 110L518.5 110L518.5 110L518.5 109.2L518.7 108.4L519.2 107.7L519.8 107.1L520.7 106.5L521.2 106.2L521.3 106.2L521.4 106.1L521.4 106.1L521.7 106L521.7 106L522.8 105.4L523.6 104.6L524.3 103.9L524.8 103L525.1 102.2L525.2 101.2L525.2 101.2L526.8 100.6L528 99.8L529.1 99L529.8 98.1L530.3 97.1L530.6 96.2L530.6 96.2L531.8 95.3L532.8 94.4L533.7 93.4L534.5 92.4L535.2 91.4L535.8 90.3L535.8 90.3L536.8 89.3L537.8 88.2L538.7 87.1L539.6 86L540.4 84.8L541.2 83.6L541.2 83.6L541.3 82.4L541.6 81.8L541.8 81.5L541.9 81.5L541.9 81.4L542 81.2L542.3 80.9L542.5 80.7L542.5 80.7L542.6 80.6L543.3 79.9L544.9 78.5L545.7 77.7L546.2 77.3L546.4 77.1L546.5 77L547.5 76.8L548.5 76.6L549.4 76.4L550.2 76.1L551.1 75.8L551.8 75.5L552.6 75.2L553.2 74.9L553.8 74.5L554.4 74.2L554.9 73.8L555.3 73.4L555.2 73.7L554.9 74.1L554.5 74.9L553.5 76.2L551.8 78.3L551.1 79.1L551.1 79.2L551 79.3L550.8 79.5L550.6 79.9L550.5 80.1L550.4 80.2L550.4 80.3L550.2 80.6L549.9 81.3L550 82.5L550 82.5L549.4 83.8L548.6 85.1L547.8 86.4L547 87.7L546 88.9L545.1 90.1L545.1 90.1L544.6 91.2L544 92.3L543.2 93.4L542.4 94.5L541.3 95.6L540.2 96.6L540.2 96.6L540 97.6L539.5 98.7L538.8 99.7L537.8 100.6L536.6 101.6L535 102.5L535 102.5L534.9 103.4L534.6 104.4L534.1 105.3L533.5 106.2L532.6 107L531.6 107.8L531.6 107.8L531.3 108L531.2 108.1L531.2 108.1L531 108.2L530.6 108.6L529.7 109.4L529.1 110.2L528.6 111L528.4 111.9L528.3 112.7L528.3 112.7L526.7 113.3L525.5 113.9L524.5 114.5L523.8 115.1L523.7 115.3L523.6 115.4L523.6 115.4L523.6 115.5L523.4 115.8L523.4 116.6L523.4 116.6L522.2 117L521.2 117.4L520.3 117.7L519.6 118.1L519.1 118.4L518.8 118.7L518.8 118.7L517.8 118.3ZM555.3 73.4L554.9 73.8L554.4 74.2L553.8 74.5L553.2 74.9L552.6 75.2L551.8 75.5L551.1 75.8L550.2 76.1L549.4 76.4L548.5 76.6L547.5 76.8L546.5 77L546.6 76.9L547.6 76.7L548.6 76.5L549.5 76.2L550.4 76L551.2 75.7L552 75.4L552.7 75L553.4 74.7L554 74.3L554.5 74L555 73.6L555.4 73.2ZM555.3 69.1L555.3 69.1L555.3 69.1L555.2 69ZM555.2 69L555.3 69.1L555.8 70.1L555.6 69.8L555.4 69.5L555.2 69.2L554.9 68.9ZM555.4 73.2L555 73.6L554.5 74L554 74.3L553.4 74.7L552.7 75L552 75.4L551.2 75.7L550.4 76L549.5 76.2L548.6 76.5L547.6 76.7L546.6 76.9L547.1 76.5L548.1 76.2L549 76L549.9 75.7L550.8 75.5L551.6 75.1L552.3 74.8L553 74.5L553.6 74.1L554.2 73.8L554.7 73.4L555.1 73L555.4 72.6L555.7 72.2L555.9 71.8ZM554.8 68.8L555.2 69.2L555.5 69.6L555.7 70L555.9 70.4L555.9 70.8L555.9 71.2L555.8 71.6L555.6 72L555.4 72.4L555.1 72.8L554.7 73.2L554.2 73.6L553.7 74L553.1 74.4L552.4 74.7L551.7 75L550.9 75.3L550 75.6L549.1 75.9L548.2 76.1L547.2 76.4L555.8 70.1L555.6 69.8L555.4 69.5L555.2 69.2L554.9 68.9ZM555.9 71.8L555.7 72.2L555.4 72.6L555.1 73L554.7 73.4L554.2 73.8L553.6 74.1L553 74.5L552.3 74.8L551.6 75.1L550.8 75.5L549.9 75.7L549 76L548.1 76.2L547.1 76.5L553 74.4L553 74.4ZM554.8 68.8L555.2 69.2L555.5 69.6L555.7 70L555.9 70.4L555.9 70.8L555.9 71.2L555.8 71.6L555.6 72L555.4 72.4L555.1 72.8L554.7 73.2L554.2 73.6L553.7 74L553.1 74.4L552.4 74.7L551.7 75L550.9 75.3L550 75.6L549.1 75.9L548.2 76.1L547.2 76.4L547.3 76.2L547.5 76L548.4 75.1L548.4 75.1L550.6 73.5L552.3 71.5L552.8 70L552.9 69.6L552.9 69.3L552.9 69L552.8 68.7L552.7 68.4L552.1 67.3L550.4 66.3L548 65.7L554 68.3L554.6 68.7L554.7 68.8ZM552.8 68.7L552.9 69L552.9 69.3L552.9 69.6L552.8 69.1L552.8 69.1Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M513.7 108.9L513.7 108.8L513.7 108.9L513.7 108.9ZM513.7 108.9L513.7 108.8L513.7 108.7L513.6 108.5L513.4 107.6L513.1 106.7L513 105.7L512.8 104.8L512.7 104.3L512.6 103.4L512.5 102.5L512.4 101.6L512.3 100.6L512.3 99.7L512.3 99.3L512.2 99.2L512.2 99.1L512.3 99.1L512.6 100.1L512.6 100.1L513.7 100.8L514.5 100.7L515.2 100.2L515.8 99.6L516.1 98.9L516.3 98L516.3 98L517.8 97.8L519.1 97.4L520.1 96.8L520.9 96.1L521.5 95.2L521.8 94.3L521.8 94.3L523 93.6L524.1 92.9L525 92.1L525.9 91.2L526.6 90.3L527.3 89.3L527.3 89.3L528.3 88.4L529.3 87.5L530.3 86.5L531.3 85.5L532.2 84.4L533 83.4L533 83.4L533.4 82.2L533.8 81.7L534 81.4L534 81.3L534.1 81.3L534.2 81.1L534.5 80.8L534.7 80.7L534.7 80.6L534.8 80.6L535.5 80L537 78.8L537.8 78.2L538.2 77.9L538.4 77.7L538.5 77.7L538.6 77.6L539 77.2L539.1 77.2L539.1 77.1L539.3 76.9L540.1 76.2L541.1 76.2L542.1 76.1L543 76L544 75.9L544.9 75.8L545.8 75.6L546.7 75.5L547.5 75.3L548.4 75.1L547.5 76L547.3 76.2L547.2 76.4L547.1 76.5L546.6 76.9L546.5 77L546.4 77.1L546.2 77.3L545.7 77.7L544.9 78.5L543.3 79.9L542.6 80.6L542.5 80.7L542.5 80.7L542.3 80.9L542 81.2L541.9 81.4L541.9 81.5L541.8 81.5L541.6 81.8L541.3 82.4L541.2 83.6L541.2 83.6L540.4 84.8L539.6 86L538.7 87.1L537.8 88.2L536.8 89.3L535.8 90.3L535.8 90.3L535.2 91.4L534.5 92.4L533.7 93.4L532.8 94.4L531.8 95.3L530.6 96.2L530.6 96.2L530.3 97.1L529.8 98.1L529.1 99L528 99.8L526.8 100.6L525.2 101.2L525.2 101.2L525.1 102.2L524.8 103L524.3 103.9L523.6 104.6L522.8 105.4L521.7 106L521.7 106L521.4 106.1L521.4 106.1L521.3 106.2L521.2 106.2L520.7 106.5L519.8 107.1L519.2 107.7L518.7 108.4L518.5 109.2L518.5 110L518.5 110L516.9 110L515.6 109.9L514.6 109.7L513.9 109.3L513.8 109.1ZM548.4 75.1L547.5 75.3L546.7 75.5L545.8 75.6L544.9 75.8L544 75.9L543 76L542.1 76.1L541.1 76.2L540.1 76.2L540.1 76.2L541.1 76.2L542.1 76.1L543 76L544 75.9L544.9 75.8L545.8 75.6L546.7 75.5L547.5 75.3L548.4 75.1ZM539.7 65L540.7 65L541.6 65L542.6 65L543.6 65.1L544.5 65.2L545.4 65.3L546.3 65.4L547.2 65.6L548 65.7L544 65.1L544 65.1ZM541.4 64.8L542.6 64.7L543.1 64.7L543.1 64.7L544 64.8L544.9 64.9L545.7 65L546.6 65.2L547.3 65.3L548.1 65.5L548.8 65.8L549.4 66L550 66.2L550.6 66.5L551.1 66.8L551.5 67.1L551.9 67.4L552.2 67.7L552.5 68L552.7 68.4L552.8 68.7L552.7 68.4L552.1 67.3L550.4 66.3L548 65.7L547.2 65.6L546.3 65.4L545.4 65.3L544.5 65.2L543.6 65.1L542.6 65L541.6 65L540.7 65L539.7 65ZM548.4 75.1L547.5 75.3L546.7 75.5L545.8 75.6L544.9 75.8L544 75.9L543 76L542.1 76.1L541.1 76.2L540.1 76.2L541.8 75.4L543 74.5L543.4 74L543.5 74L544.4 73.9L545.2 73.7L546.1 73.5L546.9 73.4L547.6 73.1L548.4 72.9L549 72.7L549.7 72.4L550.3 72.1L550.8 71.8L551.3 71.5L551.7 71.2L552.1 70.9L552.4 70.6L552.6 70.2L552.8 69.9L552.9 69.6L552.8 70L552.3 71.5L550.6 73.5ZM543.2 64.7L544.1 64.8L544.9 64.9L545.7 65L546.5 65.2L547.3 65.3L548 65.5L548.7 65.7L549.4 66L550 66.2L550.5 66.5L551 66.7L551.4 67L551.8 67.3L552.1 67.6L552.4 68L552.6 68.3L552.7 68.6L552.8 68.9L552.8 69.3L552.8 69.6L552.7 69.9L552.5 70.3L552.3 70.6L552 70.9L551.6 71.2L551.2 71.5L550.7 71.8L550.2 72.1L549.6 72.4L549 72.6L548.3 72.9L547.6 73.1L546.8 73.3L546.1 73.5L545.2 73.7L544.4 73.8L543.5 73.9L552.8 68.7L552.7 68.4L552.5 68L552.2 67.7L551.9 67.4L551.5 67.1L551.1 66.8L550.6 66.5L550 66.2L549.4 66L548.8 65.8L548.1 65.5L547.3 65.3L546.6 65.2L545.7 65L544.9 64.9L544 64.8L543.1 64.7ZM552.9 69.6L552.8 69.9L552.6 70.2L552.4 70.6L552.1 70.9L551.7 71.2L551.3 71.5L550.8 71.8L550.3 72.1L549.7 72.4L549 72.7L548.4 72.9L547.6 73.1L546.9 73.4L546.1 73.5L545.2 73.7L544.4 73.9L543.5 74L549.9 72.2L549.9 72.2ZM543.2 64.7L544.1 64.8L544.9 64.9L545.7 65L546.5 65.2L547.3 65.3L548 65.5L548.7 65.7L549.4 66L550 66.2L550.5 66.5L551 66.7L551.4 67L551.8 67.3L552.1 67.6L552.4 68L552.6 68.3L552.7 68.6L552.8 68.9L552.8 69.3L552.8 69.6L552.7 69.9L552.5 70.3L552.3 70.6L552 70.9L551.6 71.2L551.2 71.5L550.7 71.8L550.2 72.1L549.6 72.4L549 72.6L548.3 72.9L547.6 73.1L546.8 73.3L546.1 73.5L545.2 73.7L544.4 73.8L543.5 73.9L543.6 73.8L543.8 73.6L544.3 72.6L544.5 70.6L543.6 68.7L541.9 66.9L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L541.8 65.1L543.4 65L544.2 64.8L544 64.7L543.5 64.7L543.3 64.7Z\"/><path class=\"iso-top\" d=\"M512.2 99.1L512.2 99.1L512.2 99L512.3 99.1ZM512.3 99.1L512.2 99L512.2 98.8L512.2 98.3L512.2 97.4L512.3 96.5L512.3 95.5L512.4 94.6L512.4 93.7L512.5 92.8L512.6 92.3L512.7 91.3L512.8 90.4L513 89.5L513.2 88.6L513.4 87.7L513.7 86.8L513.9 86.2L514.1 85.3L514.4 84.4L514.7 83.5L515.1 82.6L515.5 81.7L515.9 80.8L516.2 80L516.7 79.2L517.1 78.3L517.6 77.4L518.2 76.5L518.8 75.6L519.4 74.8L520.2 73.7L520.9 72.9L521.2 72.5L521.4 72.3L521.4 72.2L521.4 72.2L521.5 72.1L521.7 71.9L521.8 71.8L521.8 71.7L521.9 71.7L522.3 71.2L523.1 70.4L523.5 70L523.8 69.8L523.9 69.7L524 69.7L524 69.6L524.3 69.4L524.4 69.4L524.4 69.3L524.6 69.2L525.2 68.9L539.7 65L541.4 64.8L542.6 64.7L543.1 64.7L543.1 64.7L543.2 64.7L543.3 64.7L543.5 64.7L544 64.7L544.2 64.8L543.4 65L541.8 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L541.9 66.9L543.6 68.7L544.5 70.6L544.3 72.6L543.8 73.6L543.6 73.8L543.5 73.9L543.5 74L543.4 74L543 74.5L541.8 75.4L540.1 76.2L540.1 76.2L539.3 76.9L539.1 77.1L539.1 77.2L539 77.2L538.6 77.6L538.5 77.7L538.4 77.7L538.2 77.9L537.8 78.2L537 78.8L535.5 80L534.8 80.6L534.7 80.6L534.7 80.7L534.5 80.8L534.2 81.1L534.1 81.3L534 81.3L534 81.4L533.8 81.7L533.4 82.2L533 83.4L533 83.4L532.2 84.4L531.3 85.5L530.3 86.5L529.3 87.5L528.3 88.4L527.3 89.3L527.3 89.3L526.6 90.3L525.9 91.2L525 92.1L524.1 92.9L523 93.6L521.8 94.3L521.8 94.3L521.5 95.2L520.9 96.1L520.1 96.8L519.1 97.4L517.8 97.8L516.3 98L516.3 98L516.1 98.9L515.8 99.6L515.2 100.2L514.5 100.7L513.7 100.8L512.6 100.1L512.6 100.1ZM539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1L539.5 65.1Z\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M512.2 98.3L512.5 92.9L512.6 92.3L513.7 86.8L513.8 86.3L515.8 80.9L516 80.4L516.3 80L519.5 74.7L519.7 74.3L521.8 71.7L522.1 71.4L522.5 71L522.9 70.7L525.7 68.4L526.1 68.1L526.5 67.9L526.9 67.6L527.4 67.4L527.9 67.1L528.5 66.9L530.3 66.1L530.8 65.9L531.3 65.8L531.9 65.6L532.4 65.4L533 65.3L533.6 65.2L534.2 65L534.9 64.9L535.5 64.8L536.6 64.7L537.1 64.6L537.6 64.6L538.1 64.5L538.6 64.5L539.1 64.5L539.6 64.5L540.1 64.5L540.6 64.5L541.1 64.5L541.5 64.5L542 64.5L542.5 64.6L543.7 64.7L544.3 64.8L544.9 64.9L545.6 65L546.2 65.1L546.8 65.2L547.3 65.3L547.9 65.5L548.4 65.6L548.9 65.8L550.7 66.5L551.3 66.7L551.8 66.9L552.3 67.2L552.8 67.4L553.2 67.7L553.6 67.9L556.5 70.2L556.9 70.5L557.2 70.8L557.5 71.2L559.7 73.6L560 74L563.4 79.2L563.6 79.6L565.9 85L566.1 85.5L566.2 86L567.5 91.4L567.6 91.9L568.1 97.4L568 98L567.7 103.5L567.6 104L566.6 109.5L566.4 110L564.4 115.4L564.1 115.9L560.9 121.2L560.7 121.6L560.4 121.9L558.3 124.5L558 124.8L557.6 125.2L554.8 127.5L554.4 127.8L554 128L553.6 128.3L553.1 128.6L552.6 128.8L552.1 129.1L550.2 129.8L549.7 130L549.2 130.2L548.7 130.4L548.1 130.5L547.6 130.7L547 130.8L546.4 130.9L545.7 131.1L545.1 131.2L543.9 131.3L543.4 131.4L542.9 131.4L542.4 131.5L542 131.5L541.5 131.6L541 131.6L540.5 131.6L540 131.6L539.5 131.6L539 131.6L538.5 131.5L538 131.5L536.9 131.4L536.3 131.3L535.6 131.2L535 131.1L534.4 131L533.8 130.9L533.2 130.8L532.7 130.6L532.2 130.5L531.7 130.3L531.2 130.1L529.2 129.4L528.7 129.2L528.2 129L527.7 128.7L527.3 128.5L526.9 128.2L526.5 128L523.6 125.7L523.2 125.4L522.9 125.1L520.7 122.6L520.4 122.2L517.1 117.1L516.8 116.6L516.5 116.2L514.3 110.8L514.1 110.3L512.8 104.9L512.7 104.4L512.2 98.9Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.toeR\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M469.4 538.1L472.5 534.9L484.1 528L497.3 528.8L497.3 538.4L485.7 545.3L473.5 542.5Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M485.7 535.7L485.7 545.3L497.3 538.4L497.3 528.8Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M485.7 545.3L473.5 542.5L469.4 538.1L472.5 534.9L485.7 535.7Z\"/><path class=\"iso-top\" d=\"M472.5 534.9L485.7 535.7L497.3 528.8L484.1 528Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M472.5 534.9L485.7 535.7M485.7 535.7L497.3 528.8M485.7 535.7L485.7 545.3\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M469.4 538.1L472.5 534.9L484.1 528L497.3 528.8L497.3 538.4L485.7 545.3L473.5 542.5Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.footR\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M486.2 541.7L488.7 533.9L501 526.6L527.2 529.3L540 532.8L547.8 537.5L548.6 545.6L546.8 549.7L534.6 557L487.7 546Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M535.6 544.9L536.4 552.9L548.6 545.6L547.8 537.5ZM536.4 552.9L534.6 557L546.8 549.7L548.6 545.6Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M534.6 557L487.7 546L486.2 541.7L488.7 533.9L514.9 536.6L527.8 540.2L535.6 544.9L536.4 552.9Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M527.8 540.2L535.6 544.9L547.8 537.5L540 532.8Z\"/><path class=\"iso-top\" d=\"M488.7 533.9L514.9 536.6L527.2 529.3L501 526.6ZM514.9 536.6L527.8 540.2L540 532.8L527.2 529.3Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M488.7 533.9L514.9 536.6M514.9 536.6L527.8 540.2M527.8 540.2L535.6 544.9M535.6 544.9L547.8 537.5M535.6 544.9L536.4 552.9M536.4 552.9L548.6 545.6M536.4 552.9L534.6 557\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M486.2 541.7L488.7 533.9L501 526.6L527.2 529.3L540 532.8L547.8 537.5L548.6 545.6L546.8 549.7L534.6 557L487.7 546Z\"/></g></g><g class=\"mq-joint\" data-name=\"as.ankleR\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M517.7 531.7L517.9 530.1L518.2 528.6L518.8 527.1L519.6 525.8L520.7 524.6L521.9 523.6L523.2 522.7L524.6 522.1L526.2 521.8L527.7 521.7L529.3 521.8L530.8 522.1L532.3 522.7L533.6 523.6L534.8 524.6L535.8 525.8L536.7 527.1L537.3 528.6L537.6 530.1L537.8 531.7L537.6 533.2L537.3 534.8L536.7 536.2L535.8 537.6L534.8 538.8L533.6 539.8L532.3 540.6L530.8 541.2L529.3 541.6L527.7 541.7L526.2 541.6L524.6 541.2L523.2 540.6L521.9 539.8L520.7 538.8L519.6 537.6L518.8 536.2L518.2 534.8L517.9 533.2Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M517.7 531.7L517.9 530.1L518.2 528.6L518.8 527.1L519.6 525.8L520.7 524.6L521.9 523.6L523.2 522.7L524.6 522.1L526.2 521.8L527.7 521.7L529.3 521.8L530.8 522.1L532.3 522.7L533.6 523.6L534.8 524.6L535.8 525.8L536.7 527.1L537.3 528.6L537.6 530.1L537.8 531.7L537.6 533.2L537.3 534.8L536.7 536.2L535.8 537.6L534.8 538.8L533.6 539.8L532.3 540.6L530.8 541.2L529.3 541.6L527.7 541.7L526.2 541.6L524.6 541.2L523.2 540.6L521.9 539.8L520.7 538.8L519.6 537.6L518.8 536.2L518.2 534.8L517.9 533.2Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M517.7 531.7L517.9 530.1L518.2 528.6L518.8 527.1L519.6 525.8L520.7 524.6L521.9 523.6L523.2 522.7L524.6 522.1L526.2 521.8L527.7 521.7L529.3 521.8L530.8 522.1L532.3 522.7L533.6 523.6L533.9 523.9L534 524.4L533.9 525.1L533.6 525.8L533.2 526.7L532.6 527.7L531.8 528.7L530.9 529.8L529.9 530.9L528.8 531.9L527.6 533L526.5 533.9L525.3 534.8L524.1 535.5L523 536.2L522 536.6L521.1 537L520.4 537.1L519.7 537.1L519.3 536.9L518.8 536.2L518.2 534.8L517.9 533.2Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M517.7 531.7L517.9 530.1L518.2 528.6L518.8 527.1L519.6 525.8L520.7 524.6L521.9 523.6L523.2 522.7L524.6 522.1L526.2 521.8L527.7 521.7L529.3 521.8L530.8 522.1L531.7 522.5L531.9 522.8L532 523.3L531.9 523.9L531.7 524.6L531.3 525.4L530.7 526.3L530 527.3L529.2 528.3L528.2 529.3L527.2 530.2L526.1 531.2L525 532.1L524 532.9L522.9 533.6L521.9 534.2L520.9 534.6L520.1 534.9L519.4 535L518.8 535L518.4 534.9L518.2 534.5L517.9 533.2Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M517.7 531.7L517.9 530.1L518.2 528.6L518.8 527.1L519.6 525.8L520.7 524.6L521.9 523.6L523.2 522.7L524.6 522.1L526.2 521.8L527.7 521.7L529.1 521.8L529.5 521.9L529.7 522.2L529.8 522.6L529.7 523.1L529.5 523.7L529.1 524.4L528.7 525.2L528 526L527.3 526.9L526.5 527.8L525.6 528.6L524.7 529.4L523.8 530.2L522.8 530.9L521.9 531.5L521 532L520.2 532.4L519.5 532.6L518.9 532.7L518.4 532.7L518 532.6L517.8 532.3Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M517.7 531.7L517.9 530.1L518.2 528.6L518.8 527.1L519.6 525.8L520.7 524.6L521.9 523.6L523.2 522.7L524.6 522.1L526.2 521.8L527.7 521.7L529.3 521.8L530.8 522.1L532.3 522.7L533.6 523.6L534.8 524.6L535.8 525.8L536.7 527.1L537.3 528.6L537.6 530.1L537.8 531.7L537.6 533.2L537.3 534.8L536.7 536.2L535.8 537.6L534.8 538.8L533.6 539.8L532.3 540.6L530.8 541.2L529.3 541.6L527.7 541.7L526.2 541.6L524.6 541.2L523.2 540.6L521.9 539.8L520.7 538.8L519.6 537.6L518.8 536.2L518.2 534.8L517.9 533.2Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.shankR\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M498.7 418.9L498.7 418.5L498.9 418.1L499.3 417.7L499.8 417.2L500.5 416.8L501.3 416.4L502.2 416L503.3 415.6L504.4 415.2L505.6 414.8L507 414.5L508.3 414.2L509.8 413.9L511.2 413.6L512.7 413.4L514.2 413.3L515.6 413.2L517 413.1L518.4 413.1L519.7 413.1L520.9 413.2L522 413.3L523.1 413.5L523.9 413.7L524.7 413.9L525.3 414.2L525.8 414.5L526.2 414.8L526.3 415.2L535.2 525.3L535.2 525.5L535.1 525.8L534.9 526L534.7 526.3L534.3 526.5L533.9 526.8L533.4 527L532.8 527.3L532.2 527.5L531.5 527.7L530.7 527.9L529.9 528.1L529.1 528.3L528.2 528.4L527.4 528.6L526.5 528.7L525.7 528.7L524.8 528.8L524 528.8L523.2 528.8L522.5 528.8L521.8 528.7L521.2 528.7L520.6 528.6L520.1 528.4L519.7 528.3L519.4 528.1L519.1 527.9L519 527.7L518.9 527.5Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M513.6 420.7L516.3 420.2L518.8 419.6L521.1 419L523.1 418.2L524.6 417.4L525.7 416.6L526.3 415.9L526.3 415.1L535.1 525.3L535.1 525.7L534.8 526.1L534.1 526.6L533.2 527.1L532.1 527.5L530.8 527.9L529.3 528.2L527.7 528.5Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M508.3 421.2L510.9 421L513.6 420.7L527.7 528.5L526.1 528.7L524.5 528.8Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M501.7 420.8L503.5 421.1L505.8 421.2L508.3 421.2L524.5 528.8L523.1 528.8L521.8 528.7L520.7 528.6Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M498.7 419.1L499.2 419.8L500.2 420.3L501.7 420.8L520.7 528.6L519.8 528.3L519.2 528L518.9 527.6Z\"/><path class=\"iso-top\" d=\"M512.5 417.1L512.5 417.1L512.5 417.1L512.5 417.1L512.5 417.1L512.5 417.1L512.5 417.1L512.5 417.1L512.5 417.1L512.5 417.1L512.5 417.1L512.5 417.1L512.5 417.1L512.5 417.1L512.5 417.1L512.5 417.1L512.5 417.1L512.5 417.1L512.5 417.1L512.5 417.1L512.5 417.1L512.5 417.1L512.5 417.1L512.5 417.1L512.5 417.1L512.5 417.1L512.5 417.1L512.5 417.1L512.5 417.1L512.5 417.1L512.5 417.1L512.5 417.1L512.5 417.1L503.5 421.1L501.7 420.8L500.2 420.3L499.2 419.8L498.7 419.1L498.8 418.4L499.3 417.6L500.4 416.8L502 416.1L503.9 415.3L506.2 414.6L508.7 414.1L511.4 413.6L514.1 413.3L516.8 413.1L519.3 413.1L521.5 413.2L523.4 413.5L524.8 413.9L525.8 414.5L526.3 415.1L526.3 415.9L525.7 416.6L524.6 417.4L523.1 418.2L521.1 419L518.8 419.6L516.3 420.2L513.6 420.7L510.9 421L508.3 421.2L505.8 421.2L503.5 421.1Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M498.7 419L498.8 419.4L499.1 419.8L499.6 420.1L500.2 420.4L501 420.6L501.9 420.8L502.9 421L504 421.1L505.2 421.2L506.5 421.2L507.9 421.2L509.3 421.1L510.8 421L512.3 420.9L513.7 420.7L515.2 420.4L516.7 420.1L518 419.8L519.4 419.5L520.6 419.1L521.8 418.7L522.8 418.3L523.8 417.9L524.6 417.5L525.2 417L525.7 416.6L526.1 416.2L526.3 415.8L526.4 415.4\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M498.7 418.9L498.7 418.5L498.9 418.1L499.3 417.7L499.8 417.2L500.5 416.8L501.3 416.4L502.2 416L503.3 415.6L504.4 415.2L505.6 414.8L507 414.5L508.3 414.2L509.8 413.9L511.2 413.6L512.7 413.4L514.2 413.3L515.6 413.2L517 413.1L518.4 413.1L519.7 413.1L520.9 413.2L522 413.3L523.1 413.5L523.9 413.7L524.7 413.9L525.3 414.2L525.8 414.5L526.2 414.8L526.3 415.2L535.2 525.3L535.2 525.5L535.1 525.8L534.9 526L534.7 526.3L534.3 526.5L533.9 526.8L533.4 527L532.8 527.3L532.2 527.5L531.5 527.7L530.7 527.9L529.9 528.1L529.1 528.3L528.2 528.4L527.4 528.6L526.5 528.7L525.7 528.7L524.8 528.8L524 528.8L523.2 528.8L522.5 528.8L521.8 528.7L521.2 528.7L520.6 528.6L520.1 528.4L519.7 528.3L519.4 528.1L519.1 527.9L519 527.7L518.9 527.5Z\"/></g></g><g class=\"mq-joint\" data-name=\"as.kneeR\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M497.3 410.2L497.5 407.9L498 405.8L498.9 403.7L500.1 401.8L501.5 400.1L503.2 398.6L505.1 397.5L507.2 396.6L509.4 396.1L511.6 395.9L513.8 396.1L516 396.6L518.1 397.5L520 398.6L521.7 400.1L523.1 401.8L524.3 403.7L525.2 405.8L525.7 407.9L525.9 410.2L525.7 412.4L525.2 414.6L524.3 416.6L523.1 418.6L521.7 420.3L520 421.7L518.1 422.9L516 423.7L513.8 424.3L511.6 424.4L509.4 424.3L507.2 423.7L505.1 422.9L503.2 421.7L501.5 420.3L500.1 418.6L498.9 416.6L498 414.6L497.5 412.4Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M497.3 410.2L497.5 407.9L498 405.8L498.9 403.7L500.1 401.8L501.5 400.1L503.2 398.6L505.1 397.5L507.2 396.6L509.4 396.1L511.6 395.9L513.8 396.1L516 396.6L518.1 397.5L520 398.6L521.7 400.1L523.1 401.8L524.3 403.7L525.2 405.8L525.7 407.9L525.9 410.2L525.7 412.4L525.2 414.6L524.3 416.6L523.1 418.6L521.7 420.3L520 421.7L518.1 422.9L516 423.7L513.8 424.3L511.6 424.4L509.4 424.3L507.2 423.7L505.1 422.9L503.2 421.7L501.5 420.3L500.1 418.6L498.9 416.6L498 414.6L497.5 412.4Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M497.3 410.2L497.5 407.9L498 405.8L498.9 403.7L500.1 401.8L501.5 400.1L503.2 398.6L505.1 397.5L507.2 396.6L509.4 396.1L511.6 395.9L513.8 396.1L516 396.6L518.1 397.5L520 398.6L520.4 399.1L520.5 399.8L520.4 400.8L520 401.9L519.3 403.1L518.5 404.5L517.4 406L516.1 407.5L514.6 409L513.1 410.6L511.4 412L509.8 413.4L508.1 414.6L506.4 415.7L504.9 416.6L503.5 417.3L502.2 417.7L501.1 417.9L500.2 417.9L499.6 417.6L498.9 416.6L498 414.6L497.5 412.4Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M497.3 410.2L497.5 407.9L498 405.8L498.9 403.7L500.1 401.8L501.5 400.1L503.2 398.6L505.1 397.5L507.2 396.6L509.4 396.1L511.6 395.9L513.8 396.1L516 396.6L517.2 397.1L517.6 397.6L517.7 398.2L517.6 399.1L517.2 400.1L516.6 401.3L515.8 402.5L514.8 403.9L513.6 405.3L512.3 406.7L510.8 408.1L509.3 409.5L507.8 410.8L506.2 411.9L504.7 412.9L503.2 413.7L501.9 414.3L500.7 414.8L499.7 415L498.9 415L498.3 414.7L497.9 414.3L497.5 412.4Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M497.3 410.2L497.5 407.9L498 405.8L498.9 403.7L500.1 401.8L501.5 400.1L503.2 398.6L505.1 397.5L507.2 396.6L509.4 396.1L511.6 395.9L513.6 396L514.1 396.3L514.4 396.7L514.5 397.2L514.4 398L514.1 398.8L513.6 399.9L512.9 401L512 402.1L511 403.4L509.8 404.6L508.6 405.8L507.3 407L505.9 408.1L504.6 409.1L503.3 409.9L502 410.6L500.9 411.2L499.8 411.5L499 411.7L498.3 411.7L497.8 411.5L497.4 411.1Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M497.3 410.2L497.5 407.9L498 405.8L498.9 403.7L500.1 401.8L501.5 400.1L503.2 398.6L505.1 397.5L507.2 396.6L509.4 396.1L511.6 395.9L513.8 396.1L516 396.6L518.1 397.5L520 398.6L521.7 400.1L523.1 401.8L524.3 403.7L525.2 405.8L525.7 407.9L525.9 410.2L525.7 412.4L525.2 414.6L524.3 416.6L523.1 418.6L521.7 420.3L520 421.7L518.1 422.9L516 423.7L513.8 424.3L511.6 424.4L509.4 424.3L507.2 423.7L505.1 422.9L503.2 421.7L501.5 420.3L500.1 418.6L498.9 416.6L498 414.6L497.5 412.4Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.thighR\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M500.4 401.8L500.4 401.4L514.3 303.2L514.5 302.5L514.7 301.9L515.1 301.3L515.5 300.7L516.1 300.2L516.8 299.7L517.6 299.2L518.4 298.8L519.4 298.4L520.4 298.1L521.6 297.9L522.7 297.6L524 297.5L525.3 297.4L526.6 297.3L528 297.4L529.4 297.4L530.9 297.5L532.3 297.7L533.8 298L535.3 298.2L536.7 298.6L538.1 299L539.5 299.4L540.9 299.9L542.2 300.4L543.5 300.9L544.7 301.5L545.8 302.1L546.9 302.8L547.9 303.5L548.8 304.1L549.6 304.8L550.3 305.6L551 306.3L551.5 307L551.9 307.7L552.2 308.5L552.4 309.2L552.5 309.9L552.4 310.6L552.3 311.2L525.3 406.7L525.2 407.1L524.9 407.5L524.6 407.9L524.2 408.2L523.8 408.6L523.3 408.9L522.7 409.1L522.1 409.4L521.4 409.6L520.7 409.7L519.9 409.9L519.1 410L518.2 410L517.4 410.1L516.4 410.1L515.5 410L514.6 409.9L513.6 409.8L512.7 409.7L511.7 409.5L510.7 409.3L509.8 409L508.9 408.7L508 408.4L507.1 408.1L506.3 407.7L505.5 407.3L504.7 406.9L504 406.5L503.4 406.1L502.8 405.6L502.3 405.1L501.8 404.7L501.4 404.2L501 403.7L500.8 403.2L500.6 402.8L500.5 402.3Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M531.5 315.5L534.4 316L537.3 316.3L540.1 316.4L542.8 316.2L545.2 315.9L547.3 315.3L549.2 314.5L550.6 313.6L551.7 312.5L552.3 311.2L525.3 406.7L524.9 407.5L524.2 408.2L523.3 408.9L522.1 409.4L520.7 409.7L519.1 410L517.4 410.1L515.5 410L513.6 409.8L511.7 409.5Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M525.8 313.9L528.6 314.8L531.5 315.5L511.7 409.5L509.8 409L508 408.4Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M520.9 311.6L523.3 312.8L525.8 313.9L508 408.4L506.3 407.7L504.7 406.9Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M515.8 307.4L517.1 308.9L518.8 310.3L520.9 311.6L504.7 406.9L503.4 406.1L502.3 405.1L501.4 404.2Z\"/><path class=\"iso-top\" d=\"M533.4 306.9L533.4 306.9L533.4 306.9L533.4 306.9L533.4 306.9L533.4 306.9L533.4 306.9L533.4 306.9L533.4 306.9L533.4 306.9L533.4 306.9L533.4 306.9L533.4 306.9L533.4 306.9L533.4 306.9L533.4 306.9L533.4 306.9L533.4 306.9L533.4 306.9L533.4 306.9L533.4 306.9L533.4 306.9L533.4 306.9L533.4 306.9L533.4 306.9L533.4 306.9L533.4 306.9L533.4 306.9L533.4 306.9L533.4 306.9L533.4 306.9L533.4 306.9L533.4 306.9L533.4 306.9L533.4 306.9L533.4 306.9L533.4 306.9L533.4 306.9L533.4 306.9L533.4 306.9L533.4 306.9L533.4 306.9L520.9 311.6L518.8 310.3L517.1 308.9L515.8 307.4L514.9 306L514.4 304.5L514.3 303.2L514.7 301.9L515.5 300.7L516.8 299.7L518.4 298.8L520.4 298.1L522.7 297.6L525.3 297.4L528 297.4L530.9 297.5L533.8 298L536.7 298.6L539.5 299.4L542.2 300.4L544.7 301.5L546.9 302.8L548.8 304.1L550.3 305.6L551.5 307L552.2 308.5L552.5 309.9L552.3 311.2L551.7 312.5L550.6 313.6L549.2 314.5L547.3 315.3L545.2 315.9L542.8 316.2L540.1 316.4L537.3 316.3L534.4 316L531.5 315.5L528.6 314.8L525.8 313.9L523.3 312.8L520.9 311.6ZM514.3 303.2L514.4 304.5L514.9 306L515.8 307.4L501.4 404.2L500.8 403.2L500.5 402.3L500.4 401.4Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M514.3 303.1L514.3 303.8L514.4 304.5L514.5 305.2L514.8 306L515.2 306.7L515.8 307.4L516.4 308.2L517.1 308.9L517.9 309.6L518.8 310.3L519.8 311L520.9 311.6L522 312.2L523.3 312.8L524.5 313.4L525.9 313.9L527.2 314.4L528.7 314.8L530.1 315.2L531.5 315.5L533 315.8L534.5 316L535.9 316.2L537.4 316.3L538.8 316.4L540.2 316.4L541.6 316.3L542.9 316.2L544.1 316.1L545.3 315.9L546.4 315.6L547.4 315.3L548.4 314.9L549.3 314.5L550 314L550.7 313.5L551.3 313L551.7 312.4L552.1 311.8L552.3 311.1\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M500.4 401.8L500.4 401.4L514.3 303.2L514.5 302.5L514.7 301.9L515.1 301.3L515.5 300.7L516.1 300.2L516.8 299.7L517.6 299.2L518.4 298.8L519.4 298.4L520.4 298.1L521.6 297.9L522.7 297.6L524 297.5L525.3 297.4L526.6 297.3L528 297.4L529.4 297.4L530.9 297.5L532.3 297.7L533.8 298L535.3 298.2L536.7 298.6L538.1 299L539.5 299.4L540.9 299.9L542.2 300.4L543.5 300.9L544.7 301.5L545.8 302.1L546.9 302.8L547.9 303.5L548.8 304.1L549.6 304.8L550.3 305.6L551 306.3L551.5 307L551.9 307.7L552.2 308.5L552.4 309.2L552.5 309.9L552.4 310.6L552.3 311.2L525.3 406.7L525.2 407.1L524.9 407.5L524.6 407.9L524.2 408.2L523.8 408.6L523.3 408.9L522.7 409.1L522.1 409.4L521.4 409.6L520.7 409.7L519.9 409.9L519.1 410L518.2 410L517.4 410.1L516.4 410.1L515.5 410L514.6 409.9L513.6 409.8L512.7 409.7L511.7 409.5L510.7 409.3L509.8 409L508.9 408.7L508 408.4L507.1 408.1L506.3 407.7L505.5 407.3L504.7 406.9L504 406.5L503.4 406.1L502.8 405.6L502.3 405.1L501.8 404.7L501.4 404.2L501 403.7L500.8 403.2L500.6 402.8L500.5 402.3Z\"/></g></g><g class=\"mq-joint\" data-name=\"as.hipR\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M518.4 300L518.6 297.4L519.2 294.9L520.2 292.6L521.6 290.4L523.2 288.4L525.2 286.7L527.4 285.4L529.8 284.4L532.3 283.8L534.8 283.6L537.4 283.8L539.9 284.4L542.3 285.4L544.5 286.7L546.4 288.4L548.1 290.4L549.4 292.6L550.4 294.9L551 297.4L551.2 300L551 302.6L550.4 305.1L549.4 307.4L548.1 309.6L546.4 311.6L544.5 313.2L542.3 314.6L539.9 315.6L537.4 316.2L534.8 316.4L532.3 316.2L529.8 315.6L527.4 314.6L525.2 313.2L523.2 311.6L521.6 309.6L520.2 307.4L519.2 305.1L518.6 302.6Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M518.4 300L518.6 297.4L519.2 294.9L520.2 292.6L521.6 290.4L523.2 288.4L525.2 286.7L527.4 285.4L529.8 284.4L532.3 283.8L534.8 283.6L537.4 283.8L539.9 284.4L542.3 285.4L544.5 286.7L546.4 288.4L548.1 290.4L549.4 292.6L550.4 294.9L551 297.4L551.2 300L551 302.6L550.4 305.1L549.4 307.4L548.1 309.6L546.4 311.6L544.5 313.2L542.3 314.6L539.9 315.6L537.4 316.2L534.8 316.4L532.3 316.2L529.8 315.6L527.4 314.6L525.2 313.2L523.2 311.6L521.6 309.6L520.2 307.4L519.2 305.1L518.6 302.6Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M518.4 300L518.6 297.4L519.2 294.9L520.2 292.6L521.6 290.4L523.2 288.4L525.2 286.7L527.4 285.4L529.8 284.4L532.3 283.8L534.8 283.6L537.4 283.8L539.9 284.4L542.3 285.4L544.5 286.7L544.9 287.3L545.1 288.1L544.9 289.2L544.5 290.4L543.7 291.9L542.7 293.5L541.4 295.2L540 296.9L538.3 298.7L536.5 300.4L534.7 302.1L532.7 303.7L530.8 305.1L528.9 306.3L527.1 307.3L525.5 308.1L524 308.6L522.7 308.9L521.7 308.9L521 308.6L520.2 307.4L519.2 305.1L518.6 302.6Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M518.4 300L518.6 297.4L519.2 294.9L520.2 292.6L521.6 290.4L523.2 288.4L525.2 286.7L527.4 285.4L529.8 284.4L532.3 283.8L534.8 283.6L537.4 283.8L539.9 284.4L541.3 285L541.7 285.5L541.8 286.3L541.7 287.2L541.3 288.4L540.6 289.8L539.7 291.2L538.5 292.8L537.1 294.4L535.6 296L533.9 297.7L532.2 299.2L530.4 300.7L528.6 302L526.9 303.1L525.2 304.1L523.7 304.8L522.3 305.3L521.2 305.5L520.2 305.5L519.5 305.2L519.1 304.7L518.6 302.6Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M518.4 300L518.6 297.4L519.2 294.9L520.2 292.6L521.6 290.4L523.2 288.4L525.2 286.7L527.4 285.4L529.8 284.4L532.3 283.8L534.8 283.6L537.1 283.8L537.7 284L538.1 284.5L538.2 285.1L538.1 286L537.7 287L537.1 288.1L536.3 289.4L535.3 290.8L534.1 292.2L532.8 293.6L531.4 295L529.9 296.3L528.3 297.6L526.8 298.7L525.3 299.7L523.8 300.5L522.5 301.1L521.3 301.6L520.3 301.8L519.5 301.7L518.9 301.5L518.6 301Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M518.4 300L518.6 297.4L519.2 294.9L520.2 292.6L521.6 290.4L523.2 288.4L525.2 286.7L527.4 285.4L529.8 284.4L532.3 283.8L534.8 283.6L537.4 283.8L539.9 284.4L542.3 285.4L544.5 286.7L546.4 288.4L548.1 290.4L549.4 292.6L550.4 294.9L551 297.4L551.2 300L551 302.6L550.4 305.1L549.4 307.4L548.1 309.6L546.4 311.6L544.5 313.2L542.3 314.6L539.9 315.6L537.4 316.2L534.8 316.4L532.3 316.2L529.8 315.6L527.4 314.6L525.2 313.2L523.2 311.6L521.6 309.6L520.2 307.4L519.2 305.1L518.6 302.6Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.handR\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M424.1 217.3L424.2 215.7L424.6 214.2L425.2 212.7L426.1 211.3L427.1 210L428.3 209L429.7 208.2L431.2 207.5L432.8 207.2L434.4 207L436 207.2L437.6 207.5L439.1 208.2L440.5 209L441.7 210L442.8 211.3L443.6 212.7L444.2 214.2L444.6 215.7L444.7 217.3L444.6 219L444.2 220.5L443.6 222L442.8 223.4L441.7 224.6L440.5 225.7L439.1 226.5L437.6 227.2L436 227.5L434.4 227.7L432.8 227.5L431.2 227.2L429.7 226.5L428.3 225.7L427.1 224.6L426.1 223.4L425.2 222L424.6 220.5L424.2 219Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M424.1 217.3L424.2 215.7L424.6 214.2L425.2 212.7L426.1 211.3L427.1 210L428.3 209L429.7 208.2L431.2 207.5L432.8 207.2L434.4 207L436 207.2L437.6 207.5L439.1 208.2L440.5 209L441.7 210L442.8 211.3L443.6 212.7L444.2 214.2L444.6 215.7L444.7 217.3L444.6 219L444.2 220.5L443.6 222L442.8 223.4L441.7 224.6L440.5 225.7L439.1 226.5L437.6 227.2L436 227.5L434.4 227.7L432.8 227.5L431.2 227.2L429.7 226.5L428.3 225.7L427.1 224.6L426.1 223.4L425.2 222L424.6 220.5L424.2 219Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M424.1 217.3L424.2 215.7L424.6 214.2L425.2 212.7L426.1 211.3L427.1 210L428.3 209L429.7 208.2L431.2 207.5L432.8 207.2L434.4 207L436 207.2L437.6 207.5L439.1 208.2L440.5 209L440.8 209.4L440.9 209.9L440.8 210.5L440.5 211.3L440 212.2L439.4 213.2L438.6 214.3L437.7 215.4L436.6 216.5L435.5 217.6L434.3 218.7L433.1 219.7L431.9 220.6L430.7 221.3L429.6 222L428.5 222.5L427.6 222.8L426.8 223L426.2 222.9L425.7 222.8L425.2 222L424.6 220.5L424.2 219Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M424.1 217.3L424.2 215.7L424.6 214.2L425.2 212.7L426.1 211.3L427.1 210L428.3 209L429.7 208.2L431.2 207.5L432.8 207.2L434.4 207L436 207.2L437.6 207.5L438.5 207.9L438.7 208.2L438.8 208.7L438.7 209.3L438.5 210.1L438 210.9L437.5 211.8L436.7 212.8L435.9 213.8L434.9 214.9L433.9 215.9L432.8 216.9L431.6 217.8L430.5 218.6L429.4 219.3L428.4 219.9L427.4 220.4L426.5 220.7L425.8 220.8L425.2 220.8L424.8 220.6L424.5 220.3L424.2 219Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M424.1 217.3L424.2 215.7L424.6 214.2L425.2 212.7L426.1 211.3L427.1 210L428.3 209L429.7 208.2L431.2 207.5L432.8 207.2L434.4 207L435.9 207.1L436.2 207.3L436.5 207.6L436.5 208L436.5 208.5L436.2 209.2L435.9 209.9L435.3 210.7L434.7 211.5L434 212.4L433.1 213.3L432.2 214.2L431.3 215L430.3 215.8L429.3 216.5L428.4 217.2L427.5 217.7L426.7 218.1L425.9 218.3L425.3 218.5L424.8 218.4L424.4 218.3L424.2 218Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M424.1 217.3L424.2 215.7L424.6 214.2L425.2 212.7L426.1 211.3L427.1 210L428.3 209L429.7 208.2L431.2 207.5L432.8 207.2L434.4 207L436 207.2L437.6 207.5L439.1 208.2L440.5 209L441.7 210L442.8 211.3L443.6 212.7L444.2 214.2L444.6 215.7L444.7 217.3L444.6 219L444.2 220.5L443.6 222L442.8 223.4L441.7 224.6L440.5 225.7L439.1 226.5L437.6 227.2L436 227.5L434.4 227.7L432.8 227.5L431.2 227.2L429.7 226.5L428.3 225.7L427.1 224.6L426.1 223.4L425.2 222L424.6 220.5L424.2 219Z\"/></g></g><g class=\"mq-joint\" data-name=\"as.wristR\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M439.3 225.9L439.3 224.8L439.6 223.6L440.1 222.5L440.7 221.5L441.5 220.6L442.4 219.8L443.4 219.2L444.5 218.7L445.7 218.4L446.8 218.4L448 218.4L449.2 218.7L450.3 219.2L451.3 219.8L452.2 220.6L453 221.5L453.6 222.5L454.1 223.6L454.3 224.8L454.4 225.9L454.3 227.1L454.1 228.3L453.6 229.4L453 230.4L452.2 231.3L451.3 232.1L450.3 232.7L449.2 233.2L448 233.4L446.8 233.5L445.7 233.4L444.5 233.2L443.4 232.7L442.4 232.1L441.5 231.3L440.7 230.4L440.1 229.4L439.6 228.3L439.3 227.1Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M439.3 225.9L439.3 224.8L439.6 223.6L440.1 222.5L440.7 221.5L441.5 220.6L442.4 219.8L443.4 219.2L444.5 218.7L445.7 218.4L446.8 218.4L448 218.4L449.2 218.7L450.3 219.2L451.3 219.8L452.2 220.6L453 221.5L453.6 222.5L454.1 223.6L454.3 224.8L454.4 225.9L454.3 227.1L454.1 228.3L453.6 229.4L453 230.4L452.2 231.3L451.3 232.1L450.3 232.7L449.2 233.2L448 233.4L446.8 233.5L445.7 233.4L444.5 233.2L443.4 232.7L442.4 232.1L441.5 231.3L440.7 230.4L440.1 229.4L439.6 228.3L439.3 227.1Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M439.3 225.9L439.3 224.8L439.6 223.6L440.1 222.5L440.7 221.5L441.5 220.6L442.4 219.8L443.4 219.2L444.5 218.7L445.7 218.4L446.8 218.4L448 218.4L449.2 218.7L450.3 219.2L451.3 219.8L451.5 220.1L451.6 220.4L451.5 220.9L451.3 221.5L451 222.2L450.5 222.9L449.9 223.7L449.2 224.5L448.5 225.3L447.6 226.1L446.8 226.9L445.9 227.6L445 228.3L444.1 228.9L443.3 229.3L442.5 229.7L441.8 229.9L441.3 230.1L440.8 230.1L440.4 229.9L440.1 229.4L439.6 228.3L439.3 227.1Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M439.3 225.9L439.3 224.8L439.6 223.6L440.1 222.5L440.7 221.5L441.5 220.6L442.4 219.8L443.4 219.2L444.5 218.7L445.7 218.4L446.8 218.4L448 218.4L449.2 218.7L449.8 219L450 219.2L450.1 219.6L450 220L449.8 220.6L449.5 221.2L449.1 221.9L448.5 222.6L447.9 223.4L447.2 224.1L446.4 224.9L445.6 225.6L444.8 226.2L444 226.9L443.2 227.4L442.4 227.8L441.7 228.2L441.1 228.4L440.5 228.5L440.1 228.5L439.8 228.4L439.6 228.1L439.3 227.1Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M439.3 225.9L439.3 224.8L439.6 223.6L440.1 222.5L440.7 221.5L441.5 220.6L442.4 219.8L443.4 219.2L444.5 218.7L445.7 218.4L446.8 218.4L447.9 218.4L448.2 218.5L448.3 218.7L448.4 219.1L448.3 219.4L448.2 219.9L447.9 220.5L447.5 221L447.1 221.7L446.5 222.3L445.9 223L445.2 223.6L444.5 224.2L443.8 224.8L443.1 225.3L442.4 225.8L441.8 226.2L441.1 226.5L440.6 226.7L440.1 226.8L439.8 226.7L439.5 226.6L439.3 226.4Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M439.3 225.9L439.3 224.8L439.6 223.6L440.1 222.5L440.7 221.5L441.5 220.6L442.4 219.8L443.4 219.2L444.5 218.7L445.7 218.4L446.8 218.4L448 218.4L449.2 218.7L450.3 219.2L451.3 219.8L452.2 220.6L453 221.5L453.6 222.5L454.1 223.6L454.3 224.8L454.4 225.9L454.3 227.1L454.1 228.3L453.6 229.4L453 230.4L452.2 231.3L451.3 232.1L450.3 232.7L449.2 233.2L448 233.4L446.8 233.5L445.7 233.4L444.5 233.2L443.4 232.7L442.4 232.1L441.5 231.3L440.7 230.4L440.1 229.4L439.6 228.3L439.3 227.1Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.foreR\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M445.2 231.1L445.3 230.4L445.5 229.6L445.8 228.8L446.2 228L446.6 227.1L447.2 226.3L447.8 225.5L448.4 224.7L449.1 224L449.7 223.5L450.4 223L451 222.6L451.7 222.4L452.2 222.3L452.7 222.4L453.1 222.5L503.7 253.8L504.2 254.2L504.5 254.9L504.7 255.7L504.7 256.6L504.6 257.7L504.3 258.8L503.9 260L503.3 261.3L502.7 262.6L501.9 263.8L501 265L500.1 266.1L499.1 267.1L498.1 268L497.1 268.7L496.1 269.2L495.2 269.5L494.4 269.6L493.7 269.6L493.1 269.3L445.9 233.1L445.6 232.8L445.4 232.3L445.3 231.8Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M498.4 261.6L498.4 261.6L498.4 261.6L498.4 261.6L498.4 261.6L498.4 261.6L498.4 261.6L498.4 261.6L498.4 261.6L498.4 261.6L498.4 261.6L498.4 261.6L498.4 261.6L498.4 261.6L498.4 261.6L498.4 261.6L498.4 261.6L498.4 261.6L498.4 261.6L498.4 261.6L498.4 261.6L498.4 261.6L498.4 261.6L498.4 261.6L498.4 261.6L498.4 261.6L498.4 261.6L498.4 261.6L498.4 261.6L498.4 261.6L498.4 261.6L498.4 261.6L498.4 261.6L504.3 258.8L503.8 260.4L503 261.9L502.1 263.5L501 265L499.8 266.4L498.6 267.5L497.3 268.5L496.1 269.2L495 269.6L494 269.6L493.2 269.4L492.6 268.9L492.2 268.1L492 267L492.1 265.7L492.4 264.3L493 262.7L493.7 261.2L494.7 259.6L495.8 258.1L496.9 256.7L498.2 255.6L499.4 254.6L500.6 253.9L501.7 253.5L502.7 253.5L503.5 253.7L504.2 254.2L504.6 255L504.7 256.1L504.6 257.4L504.3 258.8ZM492.2 268.1L492.6 268.9L493.2 269.4L446 233.1L445.6 232.8L445.3 232.2Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M492 267L492.2 268.1L445.3 232.2L445.2 231.5Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M503.5 253.7L502.7 253.5L452.5 222.3L453 222.5ZM492.4 264.3L492.1 265.7L492 267L445.2 231.5L445.3 230.6L445.5 229.6Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M502.7 253.5L501.7 253.5L500.6 253.9L451 222.6L451.8 222.4L452.5 222.3ZM493.7 261.2L493 262.7L492.4 264.3L445.5 229.6L445.9 228.6L446.4 227.5Z\"/><path class=\"iso-top\" d=\"M500.6 253.9L499.4 254.6L498.2 255.6L496.9 256.7L495.8 258.1L494.7 259.6L493.7 261.2L446.4 227.5L447 226.5L447.8 225.5L448.6 224.5L449.4 223.7L450.2 223.1L451 222.6Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M503.6 253.8L503 253.5L502.3 253.5L501.5 253.6L500.6 253.9L499.7 254.4L498.7 255.1L497.7 256L496.7 256.9L495.8 258L495 259.2L494.2 260.4L493.5 261.7L492.9 262.9L492.5 264.1L492.2 265.3L492 266.3L492 267.3L492.2 268.1L492.5 268.8L493 269.2\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M445.2 231.1L445.3 230.4L445.5 229.6L445.8 228.8L446.2 228L446.6 227.1L447.2 226.3L447.8 225.5L448.4 224.7L449.1 224L449.7 223.5L450.4 223L451 222.6L451.7 222.4L452.2 222.3L452.7 222.4L453.1 222.5L503.7 253.8L504.2 254.2L504.5 254.9L504.7 255.7L504.7 256.6L504.6 257.7L504.3 258.8L503.9 260L503.3 261.3L502.7 262.6L501.9 263.8L501 265L500.1 266.1L499.1 267.1L498.1 268L497.1 268.7L496.1 269.2L495.2 269.5L494.4 269.6L493.7 269.6L493.1 269.3L445.9 233.1L445.6 232.8L445.4 232.3L445.3 231.8Z\"/></g></g><g class=\"mq-joint\" data-name=\"as.elbowR\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M491.8 264.3L491.9 262.7L492.3 261.1L492.9 259.5L493.8 258.1L494.9 256.8L496.2 255.7L497.6 254.9L499.1 254.2L500.7 253.8L502.4 253.7L504.1 253.8L505.7 254.2L507.2 254.9L508.7 255.7L509.9 256.8L511 258.1L511.9 259.5L512.5 261.1L512.9 262.7L513 264.3L512.9 266L512.5 267.6L511.9 269.2L511 270.6L509.9 271.8L508.7 272.9L507.2 273.8L505.7 274.4L504.1 274.8L502.4 275L500.7 274.8L499.1 274.4L497.6 273.8L496.2 272.9L494.9 271.8L493.8 270.6L492.9 269.2L492.3 267.6L491.9 266Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M491.8 264.3L491.9 262.7L492.3 261.1L492.9 259.5L493.8 258.1L494.9 256.8L496.2 255.7L497.6 254.9L499.1 254.2L500.7 253.8L502.4 253.7L504.1 253.8L505.7 254.2L507.2 254.9L508.7 255.7L509.9 256.8L511 258.1L511.9 259.5L512.5 261.1L512.9 262.7L513 264.3L512.9 266L512.5 267.6L511.9 269.2L511 270.6L509.9 271.8L508.7 272.9L507.2 273.8L505.7 274.4L504.1 274.8L502.4 275L500.7 274.8L499.1 274.4L497.6 273.8L496.2 272.9L494.9 271.8L493.8 270.6L492.9 269.2L492.3 267.6L491.9 266Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M491.8 264.3L491.9 262.7L492.3 261.1L492.9 259.5L493.8 258.1L494.9 256.8L496.2 255.7L497.6 254.9L499.1 254.2L500.7 253.8L502.4 253.7L504.1 253.8L505.7 254.2L507.2 254.9L508.7 255.7L508.9 256.1L509 256.6L508.9 257.3L508.7 258.2L508.2 259.1L507.5 260.1L506.7 261.2L505.7 262.3L504.7 263.5L503.5 264.6L502.3 265.7L501 266.7L499.8 267.6L498.6 268.4L497.4 269.1L496.3 269.6L495.4 269.9L494.6 270.1L493.9 270.1L493.4 269.9L492.9 269.2L492.3 267.6L491.9 266Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M491.8 264.3L491.9 262.7L492.3 261.1L492.9 259.5L493.8 258.1L494.9 256.8L496.2 255.7L497.6 254.9L499.1 254.2L500.7 253.8L502.4 253.7L504.1 253.8L505.7 254.2L506.6 254.6L506.9 254.9L507 255.4L506.9 256.1L506.6 256.8L506.1 257.7L505.5 258.7L504.8 259.7L503.9 260.7L502.9 261.8L501.8 262.8L500.7 263.8L499.6 264.8L498.4 265.6L497.3 266.4L496.2 267L495.2 267.4L494.3 267.8L493.6 267.9L493 267.9L492.5 267.7L492.2 267.4L491.9 266Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M491.8 264.3L491.9 262.7L492.3 261.1L492.9 259.5L493.8 258.1L494.9 256.8L496.2 255.7L497.6 254.9L499.1 254.2L500.7 253.8L502.4 253.7L503.9 253.8L504.3 254L504.5 254.3L504.6 254.7L504.5 255.2L504.3 255.9L503.9 256.7L503.4 257.5L502.7 258.4L502 259.3L501.1 260.2L500.2 261.1L499.2 262L498.2 262.8L497.2 263.5L496.2 264.1L495.3 264.7L494.4 265.1L493.7 265.4L493 265.5L492.5 265.5L492.1 265.3L491.9 265Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M491.8 264.3L491.9 262.7L492.3 261.1L492.9 259.5L493.8 258.1L494.9 256.8L496.2 255.7L497.6 254.9L499.1 254.2L500.7 253.8L502.4 253.7L504.1 253.8L505.7 254.2L507.2 254.9L508.7 255.7L509.9 256.8L511 258.1L511.9 259.5L512.5 261.1L512.9 262.7L513 264.3L512.9 266L512.5 267.6L511.9 269.2L511 270.6L509.9 271.8L508.7 272.9L507.2 273.8L505.7 274.4L504.1 274.8L502.4 275L500.7 274.8L499.1 274.4L497.6 273.8L496.2 272.9L494.9 271.8L493.8 270.6L492.9 269.2L492.3 267.6L491.9 266Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.upperR\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M494.6 258.3L500.6 179.3L500.7 178.8L501 178.4L501.5 178L502.1 177.6L502.9 177.3L503.9 177L504.9 176.8L506.1 176.6L507.4 176.5L508.8 176.5L510.3 176.5L511.7 176.6L513.2 176.8L514.7 177L516.1 177.3L517.5 177.6L518.7 178L519.9 178.4L521 178.8L521.9 179.3L522.7 179.8L523.3 180.3L523.8 180.8L524.1 181.4L524.1 181.8L511.5 260.1L511.4 260.5L511.2 260.8L510.8 261.1L510.4 261.4L509.8 261.6L509.1 261.8L508.4 262L507.5 262.1L506.6 262.1L505.6 262.2L504.5 262.1L503.5 262.1L502.4 261.9L501.4 261.8L500.3 261.6L499.4 261.4L498.4 261.1L497.6 260.8L496.8 260.5L496.1 260.1L495.6 259.8L495.1 259.4L494.8 259L494.6 258.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M513.4 184.6L515.7 184.7L517.8 184.6L519.7 184.4L521.4 184L522.7 183.5L523.6 182.9L524.1 182.2L511.4 260.4L511.1 260.9L510.4 261.3L509.5 261.7L508.3 262L506.9 262.1L505.4 262.2L503.8 262.1Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M508.8 183.9L511.1 184.3L513.4 184.6L503.8 262.1L502.1 261.9L500.5 261.6Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M504.8 182.8L506.7 183.4L508.8 183.9L500.5 261.6L499 261.2L497.6 260.8Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M501.9 181.3L503.2 182L504.8 182.8L497.6 260.8L496.4 260.3L495.5 259.7Z\"/><path class=\"iso-top\" d=\"M512.4 180.6L512.4 180.6L512.4 180.6L512.4 180.6L512.4 180.6L512.4 180.6L512.4 180.6L512.4 180.6L512.4 180.6L512.4 180.6L512.4 180.6L512.4 180.6L512.4 180.6L512.4 180.6L512.4 180.6L512.4 180.6L512.4 180.6L512.4 180.6L512.4 180.6L512.4 180.6L512.4 180.6L512.4 180.6L512.4 180.6L512.4 180.6L512.4 180.6L512.4 180.6L512.4 180.6L512.4 180.6L512.4 180.6L512.4 180.6L512.4 180.6L512.4 180.6L512.4 180.6L504.8 182.8L503.2 182L501.9 181.3L501.1 180.5L500.7 179.7L500.7 178.9L501.2 178.2L502.1 177.6L503.4 177.1L505 176.7L506.9 176.5L509.1 176.5L511.3 176.6L513.7 176.8L515.9 177.2L518 177.8L519.9 178.4L521.5 179.1L522.8 179.9L523.7 180.7L524.1 181.5L524.1 182.2L523.6 182.9L522.7 183.5L521.4 184L519.7 184.4L517.8 184.6L515.7 184.7L513.4 184.6L511.1 184.3L508.8 183.9L506.7 183.4L504.8 182.8ZM500.7 178.9L500.7 179.7L501.1 180.5L501.9 181.3L495.5 259.7L494.9 259.1L494.6 258.6L494.6 258Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M500.6 179.2L500.7 179.7L500.9 180.2L501.3 180.7L501.9 181.2L502.6 181.7L503.5 182.2L504.6 182.7L505.7 183.1L507 183.5L508.3 183.8L509.7 184.1L511.2 184.3L512.6 184.5L514.1 184.6L515.5 184.7L516.9 184.7L518.2 184.6L519.5 184.4L520.6 184.2L521.5 184L522.4 183.7L523.1 183.3L523.6 182.9L523.9 182.5L524.1 182\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M494.6 258.3L500.6 179.3L500.7 178.8L501 178.4L501.5 178L502.1 177.6L502.9 177.3L503.9 177L504.9 176.8L506.1 176.6L507.4 176.5L508.8 176.5L510.3 176.5L511.7 176.6L513.2 176.8L514.7 177L516.1 177.3L517.5 177.6L518.7 178L519.9 178.4L521 178.8L521.9 179.3L522.7 179.8L523.3 180.3L523.8 180.8L524.1 181.4L524.1 181.8L511.5 260.1L511.4 260.5L511.2 260.8L510.8 261.1L510.4 261.4L509.8 261.6L509.1 261.8L508.4 262L507.5 262.1L506.6 262.1L505.6 262.2L504.5 262.1L503.5 262.1L502.4 261.9L501.4 261.8L500.3 261.6L499.4 261.4L498.4 261.1L497.6 260.8L496.8 260.5L496.1 260.1L495.6 259.8L495.1 259.4L494.8 259L494.6 258.7Z\"/></g></g><g class=\"mq-joint\" data-name=\"as.shoulderR\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M499.2 174.3L499.3 172.1L499.8 170L500.7 168L501.8 166.1L503.2 164.4L504.9 163L506.8 161.9L508.8 161L510.9 160.5L513.1 160.3L515.3 160.5L517.4 161L519.5 161.9L521.3 163L523 164.4L524.4 166.1L525.6 168L526.4 170L526.9 172.1L527.1 174.3L526.9 176.5L526.4 178.6L525.6 180.6L524.4 182.5L523 184.2L521.3 185.6L519.5 186.7L517.4 187.6L515.3 188.1L513.1 188.3L510.9 188.1L508.8 187.6L506.8 186.7L504.9 185.6L503.2 184.2L501.8 182.5L500.7 180.6L499.8 178.6L499.3 176.5Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M499.2 174.3L499.3 172.1L499.8 170L500.7 168L501.8 166.1L503.2 164.4L504.9 163L506.8 161.9L508.8 161L510.9 160.5L513.1 160.3L515.3 160.5L517.4 161L519.5 161.9L521.3 163L523 164.4L524.4 166.1L525.6 168L526.4 170L526.9 172.1L527.1 174.3L526.9 176.5L526.4 178.6L525.6 180.6L524.4 182.5L523 184.2L521.3 185.6L519.5 186.7L517.4 187.6L515.3 188.1L513.1 188.3L510.9 188.1L508.8 187.6L506.8 186.7L504.9 185.6L503.2 184.2L501.8 182.5L500.7 180.6L499.8 178.6L499.3 176.5Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M499.2 174.3L499.3 172.1L499.8 170L500.7 168L501.8 166.1L503.2 164.4L504.9 163L506.8 161.9L508.8 161L510.9 160.5L513.1 160.3L515.3 160.5L517.4 161L519.5 161.9L521.3 163L521.7 163.5L521.8 164.2L521.7 165.1L521.3 166.2L520.7 167.4L519.8 168.8L518.8 170.2L517.5 171.7L516.1 173.2L514.6 174.7L513 176.1L511.3 177.4L509.7 178.7L508.1 179.7L506.6 180.6L505.2 181.2L503.9 181.7L502.8 181.9L502 181.9L501.3 181.6L500.7 180.6L499.8 178.6L499.3 176.5Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M499.2 174.3L499.3 172.1L499.8 170L500.7 168L501.8 166.1L503.2 164.4L504.9 163L506.8 161.9L508.8 161L510.9 160.5L513.1 160.3L515.3 160.5L517.4 161L518.6 161.5L519 162L519.1 162.6L519 163.4L518.6 164.4L518 165.6L517.2 166.8L516.2 168.2L515.1 169.6L513.8 170.9L512.4 172.3L510.9 173.6L509.4 174.9L507.8 176L506.4 177L504.9 177.8L503.6 178.4L502.5 178.8L501.5 179L500.7 179L500.1 178.8L499.7 178.3L499.3 176.5Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M499.2 174.3L499.3 172.1L499.8 170L500.7 168L501.8 166.1L503.2 164.4L504.9 163L506.8 161.9L508.8 161L510.9 160.5L513.1 160.3L515.1 160.5L515.6 160.7L515.9 161.1L516 161.6L515.9 162.4L515.6 163.2L515.1 164.2L514.4 165.3L513.5 166.4L512.5 167.6L511.4 168.8L510.2 170L508.9 171.2L507.6 172.2L506.3 173.2L505 174.1L503.8 174.8L502.6 175.3L501.6 175.6L500.8 175.8L500.1 175.8L499.6 175.6L499.3 175.2Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M499.2 174.3L499.3 172.1L499.8 170L500.7 168L501.8 166.1L503.2 164.4L504.9 163L506.8 161.9L508.8 161L510.9 160.5L513.1 160.3L515.3 160.5L517.4 161L519.5 161.9L521.3 163L523 164.4L524.4 166.1L525.6 168L526.4 170L526.9 172.1L527.1 174.3L526.9 176.5L526.4 178.6L525.6 180.6L524.4 182.5L523 184.2L521.3 185.6L519.5 186.7L517.4 187.6L515.3 188.1L513.1 188.3L510.9 188.1L508.8 187.6L506.8 186.7L504.9 185.6L503.2 184.2L501.8 182.5L500.7 180.6L499.8 178.6L499.3 176.5Z\"/></g></g></svg></div><div class=\"vo-scrub\"><button type=\"button\" class=\"vo-play\" data-play aria-label=\"Play\">Play</button><input type=\"range\" class=\"vo-range\" min=\"0\" max=\"20.60\" step=\"0.05\" value=\"0\" aria-label=\"Minutes into the test\"><span class=\"vo-clock\" data-clock aria-hidden=\"true\">0:00</span></div><span class=\"vo-sr\" role=\"status\" aria-live=\"polite\" data-status></span><div class=\"opt-controls\"><div class=\"opt-seg\" role=\"radiogroup\" aria-label=\"VO₂max ceiling, mL/kg/min\" data-control=\"ceiling\"><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"25\" aria-checked=\"false\" tabindex=\"-1\">25</button><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"35\" aria-checked=\"true\" tabindex=\"0\">35</button><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"45\" aria-checked=\"false\" tabindex=\"-1\">45</button><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"55\" aria-checked=\"false\" tabindex=\"-1\">55</button></div></div><div class=\"opt-foot\"><span class=\"opt-hint\">Pick a VO₂max ceiling · drag or play</span><dl class=\"opt-readout\" data-readout aria-hidden=\"true\"><div class=\"opt-stat\" data-stat=\"w\"><dt>Power</dt><dd data-r=\"w\">0 W</dd></div><div class=\"opt-stat\" data-stat=\"hr\"><dt>Heart rate</dt><dd data-r=\"hr\">65 bpm</dd></div><div class=\"opt-stat\" data-stat=\"vo2\"><dt>VO₂</dt><dd data-r=\"vo2\">3.5 mL/kg/min</dd></div></dl></div></div><figcaption class=\"iso-legend\"><span class=\"iso-keys\"><span class=\"iso-key\"><svg class=\"iso-swatch\" data-mark=\"lit\" viewBox=\"0 0 16 10\" aria-hidden=\"true\"><path d=\"M2 4.5 8 1.5 14 4.5 14 6 8 9 2 6Z\"/><path class=\"iso-swatch-crease\" d=\"M2 4.5 8 7.5 14 4.5\"/></svg>The mask's analyser, blinking each breath</span><span class=\"iso-key\"><svg class=\"iso-swatch\" data-mark=\"raised\" viewBox=\"0 0 16 10\" aria-hidden=\"true\"><path d=\"M2 4.5 8 1.5 14 4.5 14 6 8 9 2 6Z\"/><path class=\"iso-swatch-crease\" d=\"M2 4.5 8 7.5 14 4.5\"/></svg>Power, as an arc on the flywheel cover</span><span class=\"iso-key\"><svg class=\"iso-swatch\" data-mark=\"heat\" viewBox=\"0 0 16 10\" aria-hidden=\"true\"><path d=\"M1.5 5h13\"/></svg>Oxygen uptake against power, on the tablet</span></span><span class=\"iso-caption\"><span class=\"vo-par\">On a ramp test the smart bike's brake adds a few watts every couple of seconds while you keep pedalling. Each extra watt costs about 10 mL of oxygen a minute, so oxygen use climbs in a straight line, a little behind the power, until the heart and muscles can't deliver or use any more. That ceiling is VO₂max. A fitter body reaches a higher ceiling and more watts, but climbs the same slope.</span><span class=\"vo-par\">The analyser on the mask measures every breath, how much air goes out and how much oxygen it has lost, and sends it wirelessly to the assessor's tablet. Nothing tethers you to a cart.</span><span class=\"vo-par\">In 122,007 adults who had treadmill exercise tests, the least fit group had about five times the death rate of the fittest 2–⁠3 % over a median of 8.4 years. That's an association between fitness and survival, not a promise that training will change anyone's risk by that much.</span><span class=\"vo-par\"><small>A typical pattern for one modelled person (45 years, 75 kg), not a prediction. Many people stop before a clear plateau; their top value is called VO₂peak. Bike values run about 13–⁠22 % below treadmill values, so compare a bike result with bike norms (in a large registry, the median on a bike was 41.9 mL/kg/min for men in their 20s and 19.5 in their 70s; for women, 31.0 and 14.8). Heart rates are typical for age and vary by 10 bpm or more.</small></span></span></figcaption></figure>" + "</div>";
    mount(root.querySelector(".opt-figure"));
  }
}
customElements.define("optimal-fig-vo2max", Fig);
})();
