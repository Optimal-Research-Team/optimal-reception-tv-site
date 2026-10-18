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
  el("text", { class: "vp-unit", x: 12.4, y: 4.3, "font-size": 1.6 }).textContent = "mL/kg/min VO₂";
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
const DATA = {"P":{"origin":[227.98144261418872,507.6395663252134],"scale":2.3440514224864093,"azimuth":50,"elevation":22},"B":{"H":170,"thigh":41.65,"shank":41.82,"ankleZ":6.63,"foot":25.84,"ankleX":5.4264,"ball":18.6048,"hipHalf":8.5,"kneeHalf":7.2,"ankleHalf":5.2,"trunk":48.959999999999994,"shoulderHalf":18.02,"upperArm":31.62,"forearm":24.819999999999997,"hand":18.36,"chin":57.800000000000004,"head":22.1,"hipZ":105.85368383441602},"W":600,"H":589,"mask":{"base":[20.91409164589365,0,157.92545552970097],"face":[0.9707511885171749,0,-0.24008775477414987],"axis":[0.24008775477414993,0,0.9707511885171748]},"bike":{"bb":[0,0,32],"fly":{"x":-45,"y":0,"z":33,"r":24,"t":10},"cover":{"x":0,"y":11.43,"z":32,"r":6.2},"crank":17.2,"hipX":-20},"screen":{"w":29.49480515780365,"h":22.00349860828393}};

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
    root.innerHTML = "<style>" + "\n.iso{\n  --anatomy-page:#0b0b0b;--anatomy-card:#131313;--anatomy-text:#a3a3a3;--anatomy-strong:#e6e6e6;--anatomy-muted:#6e6e6e;\n  --anatomy-paper:#131313;--anatomy-face:#1b1b1b;--anatomy-top:#1c1c1c;\n  --anatomy-shade-0:#0f0f0f;--anatomy-shade-1:#121212;--anatomy-shade-2:#151515;--anatomy-shade-3:#181818;\n  --anatomy-lit-top:#262626;--anatomy-lit-shade:#1d1d1d;\n  --anatomy-hi:#d4d4d4;--anatomy-mid:#6a6a6a;--anatomy-lo:#3e3e3e;--anatomy-faint:#2a2a2a;--anatomy-lit:#ffffff;\n  --anatomy-halo:#050505;--anatomy-halo-opacity:.9;--anatomy-dot:#e6e6e6;\n  --anatomy-red:#ff6b6b;--anatomy-green:#6be0a0;--anatomy-blue:#6b9bff;\n  --anatomy-weight:.6px;--anatomy-ease:cubic-bezier(.32,.72,0,1);\n  --anatomy-mono:ui-monospace,\"SF Mono\",Menlo,Consolas,monospace;\n  --anatomy-lift:inset 0 1px 0 0 #ffffff0a,inset 0 0 0 1px #ffffff06,0 0 0 1px #00000026,0 1px 1px -.5px #00000014,0 3px 3px -1.5px #00000014,0 6px 6px -3px #00000014,0 12px 12px -6px #00000014;\n}\n.iso[data-theme=\"light\"]{\n  --anatomy-page:#f2f2ef;--anatomy-card:#fbfbfa;--anatomy-text:#57575a;--anatomy-strong:#18181a;--anatomy-muted:#8c8c90;\n  --anatomy-paper:#fbfbfa;--anatomy-face:#ffffff;--anatomy-top:#ffffff;\n  --anatomy-shade-0:#dcdcd9;--anatomy-shade-1:#e5e5e2;--anatomy-shade-2:#ededea;--anatomy-shade-3:#f4f4f1;\n  --anatomy-lit-top:#ffffff;--anatomy-lit-shade:#eeeeeb;\n  --anatomy-hi:#26262a;--anatomy-mid:#8a8a8f;--anatomy-lo:#b4b4b8;--anatomy-faint:#d4d4d6;--anatomy-lit:#000000;\n  --anatomy-halo:#8a8a80;--anatomy-halo-opacity:.32;--anatomy-dot:#3a3a3e;\n  --anatomy-red:#e5484d;--anatomy-green:#30a46c;--anatomy-blue:#3e63dd;\n  --anatomy-lift:inset 0 1px 0 0 #ffffff,0 0 0 1px #0000000f,0 1px 1px -.5px #0000000a,0 3px 3px -1.5px #0000000a,0 6px 6px -3px #0000000a,0 12px 12px -6px #0000000a;\n}\n.iso-svg{display:block;width:100%;height:auto;overflow:visible}\n.iso-svg path,.iso-svg circle{vector-effect:non-scaling-stroke}\n.iso-fill{fill:var(--anatomy-paper);stroke:none}\n.iso-solid[data-lit]>.iso-fill{fill:var(--anatomy-face)}\n.iso-shade,.iso-top{stroke:none}\n.iso-shade[data-shade=\"0\"]{fill:var(--anatomy-shade-0)}\n.iso-shade[data-shade=\"1\"]{fill:var(--anatomy-shade-1)}\n.iso-shade[data-shade=\"2\"]{fill:var(--anatomy-shade-2)}\n.iso-shade[data-shade=\"3\"]{fill:var(--anatomy-shade-3)}\n.iso-top{fill:var(--anatomy-top)}\n.iso-solid[data-lit]>.iso-top{fill:var(--anatomy-lit-top)}\n.iso-solid[data-lit]>.iso-shade{fill:var(--anatomy-lit-shade)}\n.iso-solid[data-seamless]>.iso-shade,.iso-solid[data-seamless]>.iso-top{stroke-width:.4;stroke-linejoin:round}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"0\"]{stroke:var(--anatomy-shade-0)}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"1\"]{stroke:var(--anatomy-shade-1)}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"2\"]{stroke:var(--anatomy-shade-2)}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"3\"]{stroke:var(--anatomy-shade-3)}\n.iso-solid[data-seamless]>.iso-top{stroke:var(--anatomy-top)}\n.iso-solid[data-seamless][data-lit]>.iso-top{stroke:var(--anatomy-lit-top)}\n.iso-solid[data-seamless][data-lit]>.iso-shade{stroke:var(--anatomy-lit-shade)}\n.iso-solid[data-lit]>.iso-edge{stroke:var(--anatomy-lit)}\n.iso-halo{fill:var(--anatomy-halo);stroke:none;filter:blur(9px);opacity:var(--anatomy-halo-opacity);transform:translateY(3px)}\n.iso-line{fill:none;stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight);stroke-linecap:round;stroke-linejoin:round}\n.iso-line[data-tone=\"hi\"]{stroke:var(--anatomy-hi)}\n.iso-line[data-tone=\"mid\"]{stroke:var(--anatomy-mid)}\n.iso-line[data-tone=\"lo\"]{stroke:var(--anatomy-lo)}\n.iso-line[data-tone=\"faint\"]{stroke:var(--anatomy-faint)}\n.iso-line[data-tone=\"lit\"]{stroke:var(--anatomy-lit)}\n.iso-line[data-tone=\"red\"]{stroke:var(--anatomy-red)}\n.iso-line[data-tone=\"green\"]{stroke:var(--anatomy-green)}\n.iso-line[data-tone=\"blue\"]{stroke:var(--anatomy-blue)}\n.iso-line[data-dotted]{stroke-dasharray:.01 3.5;stroke-width:1}\n.iso-line[data-dashed]{stroke-dasharray:3 3}\n.iso-line[data-flow]{stroke-dasharray:2 6}\n.iso-wire-end{fill:var(--anatomy-paper);stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight)}\n.iso-wire[data-tone=\"hi\"] .iso-wire-end{stroke:var(--anatomy-hi)}\n.iso-wire[data-tone=\"mid\"] .iso-wire-end{stroke:var(--anatomy-mid)}\n.iso-wire[data-tone=\"faint\"] .iso-wire-end{stroke:var(--anatomy-faint)}\n.iso-wire[data-tone=\"lit\"] .iso-wire-end{stroke:var(--anatomy-lit)}\n.iso-dots circle{fill:var(--anatomy-dot);stroke:none;opacity:.32}\n.iso-dots[data-tone=\"hi\"] circle{opacity:.85}\n.iso-dots[data-tone=\"mid\"] circle{opacity:.45}\n.iso-dots[data-tone=\"lo\"] circle{opacity:.22}\n.iso-dots[data-tone=\"faint\"] circle{opacity:.12}\n.iso-face-text{fill:var(--anatomy-mid);font-family:var(--anatomy-mono);letter-spacing:.04em}\n.iso-face-text[data-tone=\"hi\"]{fill:var(--anatomy-hi)}\n.iso-face-text[data-tone=\"lo\"]{fill:var(--anatomy-lo)}\n.iso-face-text[data-tone=\"faint\"]{fill:var(--anatomy-faint)}\n.tb-body{fill:var(--anatomy-shade-2);stroke:none}\n.tb-shine{fill:var(--anatomy-top);stroke:none}\n.tb-shade{fill:var(--anatomy-shade-0);stroke:none}\n.tb-ring{fill:none;stroke:var(--anatomy-lo);stroke-width:.45;stroke-linecap:butt;stroke-linejoin:round}\n.tb-ring[data-tone=\"mid\"]{stroke:var(--anatomy-mid)}\n.tb-ring[data-tone=\"faint\"]{stroke:var(--anatomy-faint)}\n.tb-ring[data-tone=\"hi\"]{stroke:var(--anatomy-hi)}\n@keyframes iso-flow{to{stroke-dashoffset:-32}}\n@keyframes iso-pulse{0%,100%{opacity:.18}12%{opacity:1}40%{opacity:.18}}\n.iso-line[data-flow]{animation:iso-flow 1600ms linear infinite}\n.iso-dots circle[data-pulse]{animation:iso-pulse 1600ms steps(1,end) infinite;animation-delay:var(--pulse-at,0ms)}\n.iso-figure{margin:32px 0 36px}\n.iso-plate{position:relative;padding:52px 24px;border-radius:0;background:var(--anatomy-card);box-shadow:0 0 0 1px var(--anatomy-mid);--anatomy-paper:var(--anatomy-card)}\n.iso-plate-corners{position:absolute;inset:18px 20px;pointer-events:none}\n.iso-plate-corner{position:absolute;color:var(--anatomy-muted);font-family:var(--anatomy-mono);font-size:10.5px;line-height:1;letter-spacing:.04em;white-space:nowrap}\n.iso-plate-corner[data-corner=\"fig\"]{top:0;left:0;color:var(--anatomy-text)}\n.iso-plate-corner[data-corner=\"title\"]{top:0;right:0;text-transform:uppercase;letter-spacing:.1em}\n.iso-plate-corner[data-corner=\"hint\"]{bottom:0;left:0;text-transform:uppercase;letter-spacing:.1em}\n.iso-plate-corner[data-corner=\"readout\"]{right:0;bottom:0;color:var(--anatomy-text);font-variant-numeric:tabular-nums}\n.iso-plate .iso-svg{margin:0 auto}\n.iso-legend{display:grid;gap:8px;margin-top:12px;color:var(--anatomy-muted);font-size:13px;line-height:1.55}\n.iso-keys{display:flex;flex-wrap:wrap;gap:6px 18px}\n.iso-key{display:inline-flex;align-items:center;gap:7px}\n.iso-swatch{width:16px;height:10px;flex:none;overflow:visible}\n.iso-swatch path{fill:none;stroke:var(--anatomy-hi);stroke-width:1;vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round}\n.iso-swatch[data-mark=\"raised\"] path,.iso-swatch[data-mark=\"flat\"] path{stroke:var(--anatomy-mid)}\n.iso-swatch[data-mark=\"lit\"] path{stroke:var(--anatomy-lit)}\n.iso-swatch[data-mark=\"dim\"] path{stroke:var(--anatomy-lo)}\n.iso-swatch[data-mark=\"dotted\"] path{stroke-dasharray:.01 3;stroke-width:1.4}\n.iso-swatch[data-mark=\"dashed\"] path{stroke-dasharray:3 2.5}\n.iso-swatch[data-mark=\"red\"] path{stroke:var(--anatomy-red)}\n.iso-swatch[data-mark=\"green\"] path{stroke:var(--anatomy-green)}\n.iso-swatch[data-mark=\"blue\"] path{stroke:var(--anatomy-blue)}\n.iso-swatch-crease{stroke:var(--anatomy-lo)!important}\n@media (max-width:560px){.iso-plate{padding:48px 12px 70px}.iso-plate-corner[data-corner=\"hint\"]{bottom:18px}}\n@media (prefers-reduced-motion:reduce){.iso-line[data-flow],.iso-dots circle[data-pulse]{animation:none}}\n/*\n * Optimal theme for Anatomy figures.\n *\n * Load AFTER the kit's ISO_CSS. Put `class=\"iso optimal\"` on the wrapper:\n *   - no data-theme  -> \"Forest night\"  (exam-room TV, dark)\n *   - data-theme=\"light\" -> \"Cream\"     (beoptimal.ca, the primary target)\n *\n * Values come from the live site (beoptimal-landing src/index.css), the\n * Performance package design and the ALE visualizer spec. The kit's grey\n * ramps are warmed so solids sit on the site's cream paper, and the single\n * \"lit\" accent is Optimal forest green instead of pure black/white.\n */\n\n.iso.optimal {\n  /* Forest night (dark) */\n  --anatomy-page: #152511;\n  --anatomy-card: #1c3118;\n  --anatomy-text: #c9cdbf;\n  --anatomy-strong: #fffcf7;\n  --anatomy-muted: #8e9884;\n  --anatomy-paper: #1c3118;\n  --anatomy-face: #253821;\n  --anatomy-top: #283c24;\n  --anatomy-shade-0: #172812;\n  --anatomy-shade-1: #1a2c16;\n  --anatomy-shade-2: #1e321a;\n  --anatomy-shade-3: #22371e;\n  --anatomy-lit-top: #34492f;\n  --anatomy-lit-shade: #2a3f26;\n  --anatomy-hi: #e9e6dc;\n  --anatomy-mid: #7e8a74;\n  --anatomy-lo: #4d5c46;\n  --anatomy-faint: #33452e;\n  --anatomy-lit: #fffcf7;\n  --anatomy-halo: #0b1508;\n  --anatomy-halo-opacity: 0.9;\n  --anatomy-dot: #e9e6dc;\n  --anatomy-red: #e0745f;\n  --anatomy-green: #8cc67f;\n  --anatomy-blue: #7fa8d9;\n  --anatomy-mono: \"JetBrains Mono\", ui-monospace, \"SF Mono\", Menlo, Consolas, monospace;\n\n  /* Optimal extras (use sparingly; colour only when colour is the subject) */\n  --opt-display: \"Castoro\", Georgia, serif;\n  --opt-ui: \"Public Sans\", system-ui, sans-serif;\n  --opt-forest: #2c4e25;\n  --opt-forest-light: #519044;\n  --opt-sage: #5e7a59;\n  --opt-borderline: #c97b2d;\n  --opt-out: #b3402f;\n  --opt-heat: #ff9776;\n}\n\n.iso.optimal[data-theme=\"light\"] {\n  /* Cream (light) */\n  --anatomy-page: #fef8f1;\n  --anatomy-card: #fffcf7;\n  --anatomy-text: #3e3d39;\n  --anatomy-strong: #252525;\n  --anatomy-muted: #76736d;\n  --anatomy-paper: #fffcf7;\n  --anatomy-face: #fffefb;\n  --anatomy-top: #fffefb;\n  --anatomy-shade-0: #ddd7cc;\n  --anatomy-shade-1: #e7e2d9;\n  --anatomy-shade-2: #f0ede5;\n  --anatomy-shade-3: #f6f3ec;\n  --anatomy-lit-top: #fffefb;\n  --anatomy-lit-shade: #efebe2;\n  --anatomy-hi: #252525;\n  --anatomy-mid: #8a867e;\n  --anatomy-lo: #b9b4aa;\n  --anatomy-faint: #d9d3c8;\n  --anatomy-lit: #2c4e25;\n  --anatomy-halo: #8a8070;\n  --anatomy-halo-opacity: 0.3;\n  --anatomy-dot: #3a3833;\n  --anatomy-red: #b3402f;\n  --anatomy-green: #3f7a35;\n  --anatomy-blue: #3e6a8f;\n}\n\n/* Card typography: brand fonts for titles and readouts, kit mono for plate corners */\n.iso.optimal .iso-plate-title,\n.iso.optimal [data-role=\"title\"] {\n  font-family: var(--opt-display);\n  letter-spacing: -0.02em;\n}\n.iso.optimal [data-role=\"readout\"],\n.iso.optimal .iso-readout {\n  font-family: var(--opt-ui);\n  font-feature-settings: \"tnum\" 1, \"ss01\" 1;\n}\n\n/*\n * Card layout for Optimal figures (shared/page.mjs `plate`).\n * Phone first: the drawing, then a row of real buttons (>=44 px), then a footer\n * where the hint and the readout wrap instead of overlapping at 320 px.\n */\n.iso.optimal {\n  --opt-rule: rgba(233, 230, 220, 0.16);\n  --opt-btn: rgba(233, 230, 220, 0.06);\n  --opt-btn-on: #e9e6dc;\n  --opt-btn-on-text: #1c3118;\n  --opt-title: #fffcf7;\n  --opt-fig: #8cc67f;\n  --opt-heat-ink: #ff9776;\n  --opt-heat-glow: rgba(255, 151, 118, 0.55);\n  --opt-heat-wash: rgba(255, 151, 118, 0.16);\n  --opt-cold-ink: #9cc3e6;\n}\n.iso.optimal[data-theme=\"light\"] {\n  --opt-rule: rgba(44, 78, 37, 0.2);\n  --opt-btn: #fffcf7;\n  --opt-btn-on: #2c4e25;\n  --opt-btn-on-text: #fffcf7;\n  --opt-title: #2c4e25;\n  --opt-fig: #5e7a59;\n  --opt-heat-ink: #c8552e;\n  --opt-heat-glow: rgba(232, 108, 64, 0.42);\n  --opt-heat-wash: rgba(255, 151, 118, 0.22);\n  --opt-cold-ink: #3e6a8f;\n}\n.iso.optimal .opt-plate {\n  padding: 52px 24px 20px;\n  box-shadow: 0 0 0 1px var(--opt-rule);\n  border-radius: 2px;\n}\n.iso.optimal .iso-plate-corner[data-corner=\"fig\"] {\n  font-family: var(--opt-display);\n  font-style: italic;\n  font-size: 15px;\n  letter-spacing: 0;\n  color: var(--opt-fig);\n  top: -2px;\n}\n.iso.optimal .iso-plate-corner[data-corner=\"title\"] {\n  font-family: var(--opt-display);\n  font-size: 17px;\n  text-transform: none;\n  letter-spacing: -0.01em;\n  color: var(--opt-title);\n  top: -4px;\n}\n.iso.optimal .opt-controls {\n  display: flex;\n  flex-wrap: wrap;\n  justify-content: center;\n  gap: 8px 12px;\n  margin: 10px 0 0;\n}\n.iso.optimal .opt-seg {\n  display: inline-flex;\n  border-radius: 999px;\n  box-shadow: inset 0 0 0 1px var(--opt-rule);\n  padding: 3px;\n  gap: 2px;\n  max-width: 100%;\n}\n.iso.optimal .opt-seg-btn {\n  appearance: none;\n  border: 0;\n  margin: 0;\n  min-height: 44px;\n  min-width: min-content; /* never shrink a label below its longest word (with the padding, always ≥ 44 px) */\n  padding: 0 16px;\n  border-radius: 999px;\n  background: transparent;\n  color: var(--anatomy-text);\n  font: 500 14px/1.1 var(--opt-ui);\n  letter-spacing: 0;\n  cursor: pointer;\n  touch-action: manipulation;\n  -webkit-tap-highlight-color: transparent;\n  transition: background-color 240ms var(--anatomy-ease), color 240ms var(--anatomy-ease);\n}\n.iso.optimal .opt-seg-btn[aria-checked=\"true\"] {\n  background: var(--opt-btn-on);\n  color: var(--opt-btn-on-text);\n}\n.iso.optimal .opt-seg-btn:focus-visible {\n  outline: 2px solid var(--opt-fig);\n  outline-offset: 2px;\n}\n.iso.optimal .opt-foot {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: flex-end;\n  justify-content: space-between;\n  gap: 10px 20px;\n  margin-top: 16px;\n}\n.iso.optimal .opt-hint {\n  font-family: var(--anatomy-mono);\n  font-size: 10.5px;\n  line-height: 1.4;\n  letter-spacing: 0.1em;\n  text-transform: uppercase;\n  color: var(--anatomy-muted);\n  flex: 1 1 160px;\n  min-width: 0;\n}\n.iso.optimal .opt-readout {\n  display: grid;\n  grid-auto-flow: column;\n  gap: 4px 18px;\n  margin: 0;\n  font-family: var(--opt-ui);\n  font-feature-settings: \"tnum\" 1;\n}\n.iso.optimal .opt-stat { margin: 0; min-width: 0; }\n.iso.optimal .opt-stat dt {\n  font-size: 10px;\n  font-weight: 600;\n  letter-spacing: 0.12em;\n  text-transform: uppercase;\n  color: var(--anatomy-muted);\n  white-space: nowrap;\n}\n.iso.optimal .opt-stat dd {\n  margin: 1px 0 0;\n  font-size: 15px;\n  font-weight: 500;\n  color: var(--anatomy-strong);\n  white-space: nowrap;\n}\n.iso.optimal .iso-legend { font-family: var(--opt-ui); font-size: 13.5px; }\n.iso.optimal .iso-caption { color: var(--anatomy-text); }\n.iso.optimal .iso-caption em { font-style: italic; }\n.iso.optimal .iso-swatch[data-mark=\"heat\"] path { stroke: var(--opt-heat-ink); stroke-width: 2; }\n.iso.optimal .iso-stage { outline: none; border-radius: 4px; touch-action: pan-y; -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none; }\n.iso.optimal .iso-stage:focus-visible { outline: 1px solid var(--anatomy-muted); outline-offset: 6px; }\n@media (max-width: 560px) {\n  .iso.optimal .opt-plate { padding: 44px 10px 14px; }\n  .iso.optimal .iso-plate-corners { inset: 16px 12px; }\n  .iso.optimal .opt-readout { grid-auto-flow: row; grid-template-columns: repeat(4, minmax(0, auto)); width: 100%; justify-content: space-between; gap: 4px 10px; order: -1; }\n  .iso.optimal .opt-stat dd { font-size: 14px; }\n  /* a long label wraps onto two lines instead of running into its neighbour; values stay on one baseline */\n  .iso.optimal .opt-stat { display: flex; flex-direction: column; justify-content: space-between; }\n  .iso.optimal .opt-stat dt { white-space: normal; line-height: 1.25; }\n  .iso.optimal .opt-seg-btn { padding: 0 12px; font-size: 13.5px; }\n}\n@media (max-width: 350px) {\n  .iso.optimal .opt-seg-btn { padding: 0 7px; font-size: 12.5px; }\n  .iso.optimal .opt-stat dt { font-size: 9px; letter-spacing: 0.08em; }\n  .iso.optimal .opt-stat dd { font-size: 13px; }\n}\n\n:host{display:block}\n.opt-host{background:transparent;color:var(--anatomy-text);font:15px/1.6 var(--opt-ui);-webkit-font-smoothing:antialiased}\n.opt-host *{box-sizing:border-box}\n.opt-host .iso-figure{margin:0}\n/* The mannequin (shared/mannequin.mjs): turned wood segments, steel ball joints, tracking dots. */\n.iso.optimal {\n  /* Forest night: dark walnut, so the figure sits in the room rather than glowing */\n  --mq-face: #6b5a44;\n  --mq-shade-0: #3f3326;\n  --mq-shade-1: #4b3d2d;\n  --mq-shade-2: #574735;\n  --mq-shade-3: #63523e;\n  --mq-top: #7a684f;\n  --mq-edge: #e9e6dc;\n}\n.iso.optimal[data-theme=\"light\"] {\n  /* Cream: pale beech */\n  --mq-face: #f3e6cf;\n  --mq-shade-0: #cdb592;\n  --mq-shade-1: #d9c4a3;\n  --mq-shade-2: #e4d2b5;\n  --mq-shade-3: #ecdec5;\n  --mq-top: #f8eedc;\n  --mq-edge: #3e3d39;\n}\n.mq-wood {\n  --anatomy-face: var(--mq-face);\n  --anatomy-paper: var(--mq-face);\n  --anatomy-shade-0: var(--mq-shade-0);\n  --anatomy-shade-1: var(--mq-shade-1);\n  --anatomy-shade-2: var(--mq-shade-2);\n  --anatomy-shade-3: var(--mq-shade-3);\n  --anatomy-top: var(--mq-top);\n}\n.mq-dot { fill: var(--anatomy-lit); stroke: var(--anatomy-card); stroke-width: 0.5; }\n.mq-glow { fill: var(--opt-heat); stroke: none; }\n.mq-glow-ring { fill: none; stroke: var(--opt-heat-ink); stroke-width: 0.6; }\n/* The assessor's tablet (shared/assessor.mjs) and its live screen (shared/vo2-plot.js). */\n.iso.optimal { --as-screen: #0f1b0c; --as-ink: #c9e3c1; --as-dim: #4f6b48; }\n.iso.optimal[data-theme=\"light\"] { --as-screen: #1d2a1a; --as-ink: #d9efd2; --as-dim: #5d7a56; }\n.as-screen { fill: var(--as-screen); }\n.vp-grid { fill: none; stroke: var(--as-dim); stroke-width: 0.22; opacity: 0.55; }\n.vp-axis { fill: none; stroke: var(--as-dim); stroke-width: 0.35; }\n.vp-guide { fill: none; stroke: var(--as-dim); stroke-width: 0.35; stroke-dasharray: 0.9 0.9; }\n.vp-ceiling { fill: none; stroke: var(--opt-heat); stroke-width: 0.4; stroke-dasharray: 1 0.7; }\n.vp-trace { fill: none; stroke: var(--opt-heat); stroke-width: 0.6; stroke-linejoin: round; stroke-linecap: round; }\n.vp-dot { fill: var(--as-ink); }\n.vp-tick { fill: var(--as-dim); font-family: var(--opt-ui); font-weight: 500; }\n.vp-big { fill: var(--as-ink); font-family: var(--opt-ui); font-weight: 600; font-feature-settings: \"tnum\" 1; }\n.vp-unit { fill: var(--as-dim); font-family: var(--opt-ui); font-weight: 500; }\n.vp-breath { fill: var(--as-ink); }\n/* Fig 5 · clear tubing and glass, the cart's screens, the breath layer. */\n.iso.optimal { --vo-screen: #0f1b0c; --vo-ink: #c9e3c1; --vo-dim: #4f6b48; --vo-glass: rgba(201, 227, 193, 0.10); --vo-glass-edge: #8e9884; }\n.iso.optimal[data-theme=\"light\"] { --vo-screen: #1d2a1a; --vo-ink: #d9efd2; --vo-dim: #5d7a56; --vo-glass: rgba(44, 78, 37, 0.06); --vo-glass-edge: #76736d; }\n.vo-stage { position: relative; }\n.vo-gl, .vo-front { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }\n.iso.optimal:not([data-theme=\"light\"]) .vo-gl { mix-blend-mode: screen; }\n.vo-stage[data-gl] .vo-fallback { display: none; }\n.vo-glass .iso-fill, .vo-glass .iso-top, .vo-glass .iso-shade { fill: var(--vo-glass); stroke: none; }\n.vo-hose .tb-body { fill: var(--vo-glass); }\n.vo-hose .tb-shine, .vo-hose .tb-shade { opacity: 0.35; }\n.vo-screen { fill: var(--vo-screen); }\n.vo-window { fill: var(--anatomy-shade-0); }\n.vo-level { fill: var(--anatomy-lit); }\n.vo-cell-label { fill: var(--anatomy-strong); font-family: var(--opt-ui); font-weight: 600; }\n.vo-grid { fill: none; stroke: var(--vo-dim); stroke-width: 0.25; opacity: 0.5; }\n.vo-axis { fill: none; stroke: var(--vo-dim); stroke-width: 0.4; }\n.vo-guide { fill: none; stroke: var(--vo-dim); stroke-width: 0.4; stroke-dasharray: 1 1; }\n.vo-ceiling { fill: none; stroke: var(--opt-heat); stroke-width: 0.45; stroke-dasharray: 1.2 0.8; }\n.vo-trace { fill: none; stroke: var(--opt-heat); stroke-width: 0.7; stroke-linejoin: round; stroke-linecap: round; }\n.vo-dot { fill: var(--vo-ink); }\n.vo-tick { fill: var(--vo-dim); font-family: var(--opt-ui); font-weight: 500; }\n.vo-strap { stroke-width: 1.6; }\n.vo-hole { fill: var(--anatomy-shade-1); stroke: var(--anatomy-lo); stroke-width: 0.4; }\n.vo-vane { fill: none; stroke: var(--anatomy-mid); stroke-width: 1.2; stroke-linecap: round; }\n.vo-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }\n.vo-par { display: block; margin-top: 6px; }\n.vo-par:first-child { margin-top: 0; }\n.vo-par small { font-size: 12.5px; color: var(--anatomy-muted); }\n.vo-scrub { display: flex; align-items: center; gap: 12px; margin: 10px 4px 0; }\n.vo-play { appearance: none; border: 0; min-height: 44px; min-width: 72px; padding: 0 16px; border-radius: 999px; background: transparent; box-shadow: inset 0 0 0 1px var(--opt-rule); color: var(--anatomy-text); font: 500 14px/1 var(--opt-ui); cursor: pointer; touch-action: manipulation; }\n.vo-play:focus-visible { outline: 2px solid var(--opt-fig); outline-offset: 2px; }\n.vo-clock { font: 500 13px/1 var(--opt-ui); color: var(--anatomy-muted); min-width: 40px; text-align: right; font-feature-settings: \"tnum\" 1; }\n.vo-range { flex: 1; min-width: 0; height: 44px; margin: 0; background: transparent; accent-color: var(--opt-btn-on); -webkit-appearance: none; appearance: none; touch-action: pan-y; }\n.vo-range::-webkit-slider-runnable-track { height: 4px; border-radius: 2px; background: var(--opt-rule); }\n.vo-range::-moz-range-track { height: 4px; border-radius: 2px; background: var(--opt-rule); }\n.vo-range::-webkit-slider-thumb { -webkit-appearance: none; width: 28px; height: 28px; margin-top: -12px; border-radius: 50%; background: var(--opt-btn-on); border: 3px solid var(--anatomy-card); box-shadow: 0 0 0 1px var(--opt-rule); }\n.vo-range::-moz-range-thumb { width: 24px; height: 24px; border-radius: 50%; background: var(--opt-btn-on); border: 3px solid var(--anatomy-card); }\n.vo-range:focus-visible { outline: 2px solid var(--opt-fig); outline-offset: 2px; }\n.vo-led { fill: var(--anatomy-lit); stroke: var(--anatomy-card); stroke-width: 0.4; }\n.vo-power-track { fill: none; stroke: var(--anatomy-shade-1); stroke-linecap: round; opacity: 0.9; }\n.vo-power { fill: none; stroke: var(--opt-heat-ink); stroke-linecap: round; }\n" + "</style><div class=\"iso optimal opt-host\" data-theme=\"" + theme + "\">" + "<figure class=\"iso-figure opt-figure \"><div class=\"iso-plate opt-plate\"><div class=\"iso-plate-corners\" aria-hidden=\"true\"><span class=\"iso-plate-corner\" data-corner=\"fig\">Fig 5</span><span class=\"iso-plate-corner\" data-corner=\"title\">The ramp and the mask</span></div><div class=\"iso-stage vo-stage\" tabindex=\"0\" role=\"slider\" aria-label=\"Minutes into the test. Left and right arrows move 15 seconds, Page Up and Down a minute, Space plays or pauses.\" aria-valuemin=\"0\" aria-valuemax=\"20.6\" aria-valuenow=\"0\" aria-valuetext=\"0:00, at rest\"><svg xmlns=\"http://www.w3.org/2000/svg\" class=\"iso-svg\" viewBox=\"0 0 600 589\" role=\"img\" aria-label=\"A smart training bike with a large covered flywheel at the rear, and a wooden artist's mannequin pedalling it, wearing a face mask with a small wireless breath analyser on the front. A glowing arc on the flywheel cover grows as the ramp adds watts. Beside the bike an assessor stands holding a tablet, which plots the oxygen the rider uses against the watts: a straight line that flattens at the person's ceiling, the VO2max.\"><path class=\"iso-halo\" d=\"M18.9 485.8L18.9 483.2L20.4 480.7L23.1 478.3L27.1 476.1L110.9 438.7L115.9 436.8L121.7 435.4L128.2 434.4L135.1 434L142 434L148.9 434.5L155.3 435.6L161 437L415.4 517L420.3 518.9L424.1 521L426.7 523.5L428 526L428 526.3L427.9 528.9L426.5 531.5L423.8 533.9L419.8 536L336 573.5L331 575.3L325.1 576.7L318.7 577.7L311.8 578.2L304.8 578.2L298 577.6L291.6 576.6L285.8 575.1L31.4 495.2L26.6 493.3L22.8 491.1L20.2 488.7L18.9 486.1Z\"/><g class=\"it\" data-name=\"stand.rear\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M57.7 479.9L60.3 477.8L159.4 433.5L164.5 432.2L170.6 432L176.1 433L189.8 437.3L193.3 439.2L193.8 441.5L193.8 456.3L191.2 458.4L92.1 502.6L87.1 504L81 504.2L75.4 503.2L61.8 498.9L58.3 497L57.7 494.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M193.8 456.3L191.2 458.4L191.2 443.5L193.8 441.5ZM191.2 458.4L92.1 502.6L92.1 487.8L191.2 443.5ZM92.1 502.6L87.1 504L87.1 489.1L92.1 487.8Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M87.1 504L81 504.2L81 489.3L87.1 489.1Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M81 504.2L75.4 503.2L75.4 488.3L81 489.3Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M75.4 503.2L61.8 498.9L61.8 484.1L75.4 488.3ZM61.8 498.9L58.3 497L58.3 482.2L61.8 484.1ZM58.3 497L57.7 494.7L57.7 479.9L58.3 482.2Z\"/><path class=\"iso-top\" d=\"M189.8 437.3L193.3 439.2L193.8 441.5L191.2 443.5L92.1 487.8L87.1 489.1L81 489.3L75.4 488.3L61.8 484.1L58.3 482.2L57.7 479.9L60.3 477.8L159.4 433.5L164.5 432.2L170.6 432L176.1 433Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M193.8 441.5L191.2 443.5L92.1 487.8L87.1 489.1L81 489.3L75.4 488.3L61.8 484.1L58.3 482.2L57.7 479.9\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M193.8 441.5L190.2 443.3L91.3 487.5L86.7 488.7L81.2 488.9L76 488L62.7 483.8L59.4 482L57.7 479.9\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M193.9 448.6L92.1 495.2L81.7 496.8L61.8 491.5L57.6 487.6\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M57.7 479.9L60.3 477.8L159.4 433.5L164.5 432.2L170.6 432L176.1 433L189.8 437.3L193.3 439.2L193.8 441.5M193.8 456.3L191.2 458.4L92.1 502.6L87.1 504L81 504.2L75.4 503.2L61.8 498.9L58.3 497L57.7 494.7M193.8 441.5L193.8 456.3M57.7 479.9L57.7 494.7\"/></g></g><g class=\"it\" data-name=\"fly.post\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M113.9 449.1L114.6 447.6L116.7 446.3L119.8 445.3L123.7 444.7L127.8 444.7L131.7 445.3L134.9 446.3L136.9 447.6L137.6 449.1L137.6 461.8L136.9 463.3L134.9 464.6L131.7 465.6L127.8 466.1L123.7 466.1L119.8 465.6L116.7 464.6L114.6 463.3L113.9 461.8Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M134.9 464.6L131.7 465.6L131.7 453L134.9 452ZM137.6 461.8L136.9 463.3L136.9 450.6L137.6 449.1ZM136.9 463.3L134.9 464.6L134.9 452L136.9 450.6Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M131.7 465.6L127.8 466.1L127.8 453.5L131.7 453Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M127.8 466.1L123.7 466.1L123.7 453.5L127.8 453.5ZM123.7 466.1L119.8 465.6L119.8 453L123.7 453.5Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M119.8 465.6L116.7 464.6L116.7 452L119.8 453ZM116.7 464.6L114.6 463.3L114.6 450.6L116.7 452ZM114.6 463.3L113.9 461.8L113.9 449.1L114.6 450.6Z\"/><path class=\"iso-top\" d=\"M134.9 452L131.7 453L127.8 453.5L123.7 453.5L119.8 453L116.7 452L114.6 450.6L113.9 449.1L114.6 447.6L116.7 446.3L119.8 445.3L123.7 444.7L127.8 444.7L131.7 445.3L134.9 446.3L136.9 447.6L137.6 449.1L136.9 450.6Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M137.6 449.1L136.9 450.6L134.9 452L131.7 453L127.8 453.5L123.7 453.5L119.8 453L116.7 452L114.6 450.6L113.9 449.1\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M113.9 449.1L114.6 447.6L116.7 446.3L119.8 445.3L123.7 444.7L127.8 444.7L131.7 445.3L134.9 446.3L136.9 447.6L137.6 449.1M137.6 461.8L136.9 463.3L134.9 464.6L131.7 465.6L127.8 466.1L123.7 466.1L119.8 465.6L116.7 464.6L114.6 463.3L113.9 461.8M113.9 449.1L113.9 461.8M137.6 449.1L137.6 461.8\"/></g></g><g class=\"it\" data-name=\"fly.housing\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M64.1 370.9L64.1 369.5L64.1 368.2L64.2 366.8L64.3 365.5L64.4 364.2L64.5 363.8L64.6 362.5L64.8 361.1L65 359.8L65.2 358.6L65.4 357.3L65.7 356L65.9 354.8L66.3 353.6L66.6 352.4L66.9 351.2L67.3 350L67.7 348.8L68.1 347.7L68.6 346.5L69 345.4L69.5 344.3L70 343.3L70.5 342.2L71.1 341.2L71.7 340.2L72.3 339.2L72.9 338.2L73.5 337.3L74.1 336.4L74.8 335.5L75.5 334.6L76.2 333.7L76.9 332.9L77.7 332.1L78.4 331.3L79.2 330.6L80 329.8L80.8 329.1L82.4 327.8L83.3 327.1L84.1 326.4L85 325.8L85.9 325.2L86.8 324.6L87.7 324.1L88.6 323.6L89.6 323.1L90.5 322.6L91.5 322.2L102.9 317.1L103.9 316.7L104.9 316.3L105.9 315.9L106.9 315.6L107.9 315.3L109 315.1L110 314.8L111.1 314.6L112.2 314.5L114.2 314.2L115.3 314L116.4 313.9L117.4 313.9L118.5 313.8L119.6 313.8L120.7 313.8L121.8 313.8L123 313.9L124.1 314L125.2 314.1L126.3 314.3L127.4 314.5L128.6 314.7L129.7 315L130.8 315.2L132 315.5L133.1 315.9L134.2 316.2L135.4 316.6L136.5 317L137.7 317.5L138.8 318L139.9 318.5L141 319L142.2 319.6L143.3 320.2L144.4 320.8L145.5 321.4L146.6 322.1L147.7 322.8L148.8 323.5L149.9 324.3L151 325L151.3 325.3L152.4 326.1L153.4 326.9L154.5 327.7L155.5 328.6L156.5 329.5L157.5 330.4L158.5 331.3L159.5 332.3L160.5 333.2L161.5 334.2L162.5 335.2L163.4 336.3L164.3 337.3L165.3 338.4L166.2 339.5L167.1 340.6L167.9 341.8L168.8 342.9L169.6 344.1L170.5 345.2L171.3 346.4L172.1 347.7L172.9 348.9L173.6 350.1L174.4 351.4L175.1 352.7L175.8 353.9L176.5 355.2L177.2 356.5L177.8 357.8L178.5 359.2L179.1 360.5L179.7 361.9L180.3 363.2L180.8 364.6L181.4 365.9L181.9 367.3L182.4 368.7L182.8 370.1L183.3 371.5L183.7 372.9L184.1 374.3L184.5 375.7L184.9 377.1L185.2 378.5L185.5 379.9L185.8 381.3L186.1 382.7L186.3 384.1L186.5 385.5L186.7 386.9L186.9 388.3L187.1 389.7L187.2 391.1L187.3 392.5L187.4 393.9L187.4 395.3L187.5 396.7L187.5 398L187.5 399.4L187.4 400.7L187.4 402.1L187.3 403.4L187.2 404.7L187.1 406.1L187 406.5L186.9 407.8L186.7 409.1L186.5 410.4L186.3 411.7L186 412.9L185.7 414.2L185.4 415.4L185.1 416.6L184.8 417.8L184.4 419L184 420.2L183.6 421.3L183.2 422.5L182.7 423.6L182.3 424.7L181.8 425.8L181.3 426.8L180.7 427.9L180.2 428.9L179.6 429.9L179 430.9L178.4 431.8L177.7 432.8L177.1 433.7L176.4 434.6L175.7 435.4L175 436.3L174.2 437.1L173.5 437.9L172.7 438.7L171.9 439.4L171.1 440.1L169.5 441.5L168.7 442.2L167.9 442.8L167 443.5L166.1 444.1L165.2 444.7L164.3 445.2L163.4 445.8L162.5 446.3L161.5 446.7L160.5 447.2L149.1 452.3L148.1 452.7L147.1 453.1L146.1 453.5L145.1 453.8L144.1 454.1L143.1 454.4L142 454.6L141 454.8L139.9 455L138.8 455.2L136.8 455.5L135.7 455.6L134.6 455.7L133.6 455.8L132.5 455.8L131.4 455.8L130.3 455.8L129.1 455.7L128 455.6L126.9 455.5L125.8 455.4L124.7 455.2L123.5 455L122.4 454.8L121.3 454.5L120.1 454.2L119 453.9L117.9 453.5L116.7 453.2L115.6 452.7L114.5 452.3L113.3 451.8L112.2 451.4L111.1 450.8L109.9 450.3L108.8 449.7L107.7 449.1L106.6 448.5L105.5 447.8L104.4 447.1L103.3 446.4L102.2 445.7L101.1 444.9L100.8 444.7L99.7 443.9L98.7 443.1L97.6 442.3L96.6 441.4L95.5 440.6L94.5 439.7L93.5 438.7L92.5 437.8L91.5 436.8L90.5 435.9L89.6 434.8L88.6 433.8L87.7 432.8L86.7 431.7L85.8 430.6L84.9 429.5L84.1 428.4L83.2 427.3L82.3 426.1L81.5 424.9L80.7 423.7L79.9 422.5L79.1 421.3L78.3 420.1L77.5 418.8L76.8 417.6L76.1 416.3L75.4 415L74.7 413.7L74 412.4L73.4 411.1L72.8 409.7L72.2 408.4L71.6 407.1L71 405.7L70.5 404.3L69.9 403L69.4 401.6L68.9 400.2L68.5 398.8L68.1 397.4L67.6 396L67.2 394.6L66.9 393.2L66.5 391.8L66.2 390.4L65.9 389L65.6 387.6L65.4 386.2L65.1 384.8L64.9 383.4L64.7 381.9L64.5 380.5L64.4 379.1L64.3 377.8L64.2 376.4L64.1 375L64.1 373.6L64.1 372.2Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M187.4 400.9L187.4 400.9L173.7 350.5L175.7 353.9L177.5 357.5L179.2 361.1L180.8 364.8L182.2 368.6L183.4 372.4L184.5 376.2L185.4 380L186.2 383.9L186.8 387.7L187.2 391.5L187.4 395.3L187.4 399L187.3 402.7L187 406.3L186.6 409.9L185.9 413.3L185.1 416.6L184.1 419.9L183 423L181.7 425.9L180.3 428.7L178.6 431.4L176.9 433.9L175 436.2L173 438.4L170.8 440.4ZM170.6 440.7L170.3 440.9L170.1 441.2L169.8 441.4L169.5 441.6L169.2 441.7L160.5 447.2L158.6 448.1L156.7 448.9L154.8 449.8L152.9 450.6L151 451.5L149.1 452.3L139.2 455.1L138.8 455.3L138.5 455.4L138.2 455.4L137.8 455.4L137.4 455.4L137.1 455.4L77.8 419.1L80.3 423.1L82.9 426.8L88.3 433.5L94 439.2L99.8 443.9L105.8 447.7L111.8 450.5L117.9 452.4L124.1 453.5L130.7 453.5L134.5 452.9L139.5 451.6L141.7 450.8L144.1 449.8L146.4 448.7L148.5 447.5L152.9 444.5L155.9 441.9L160.6 436.8L164.2 431.2L167.1 425.2L169.2 418.6L170.6 411.4L171.3 403.7L171.1 395.6L169.9 386.9L169 382.5L167.8 377.9L167.8 377.9L167.8 376.5L167.7 374.9L167.5 373L167.2 371L166.7 368.7L166 366.3L166 366.3L167.9 365.4L169.8 364.6L171.7 363.7L173.6 362.9L175.5 362L177.4 361.2L177.4 361.2L176.7 358.8L176 356.6L175.3 354.7L174.7 353.1L174.1 351.6L173.7 350.5L175.7 353.9L177.5 357.5L179.2 361.1L180.8 364.8L182.2 368.6L183.4 372.4L184.5 376.2L185.4 380L186.2 383.9L186.8 387.7L187.2 391.5L187.4 395.3L187.4 399L187.3 402.7L187 406.3L186.6 409.9L185.9 413.3L185.1 416.6L184.1 419.9L183 423L181.7 425.9L180.3 428.7L178.6 431.4L176.9 433.9L175 436.2L173 438.4L170.8 440.4ZM144.1 449.8L144.1 449.8L146.4 448.7L144.1 449.8L141.7 450.8Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M169 343.4L169 343.4L163.8 336.9L166 339.4L168 342L170 344.8L171.9 347.6L173.7 350.5ZM174.1 351.6L174.7 353.1L175.3 354.7L176 356.6L176.7 358.8L177.4 361.2L177.4 361.2L175.5 362L173.6 362.9L171.7 363.7L169.8 364.6L167.9 365.4L166 366.3L166 366.3L166.7 368.7L167.2 371L167.5 373L167.7 374.9L167.8 376.5L167.8 377.9L166.7 374.8L165.6 371.7L164.3 368.7L163 365.7L161.5 362.7L161.4 361.5L161.2 360.2L160.8 358.6L160.2 356.8L159.5 354.8L158.4 352.6L158.4 352.6L160.4 351.7L162.3 350.9L164.2 350L166.1 349.2L168 348.3L169.9 347.5L169.9 347.5L168.7 345.2L167.6 343.1L166.5 341.2L165.5 339.6L164.6 338.1L163.8 336.9L166 339.4L168 342L170 344.8L171.9 347.6L173.7 350.5ZM167.8 377.9L166.7 374.8L165.6 371.7L164.3 368.7L163 365.7L161.5 362.7L161.5 362.7L163 365.7L164.3 368.7L165.6 371.7L166.7 374.8L167.8 377.9ZM73.9 411.9L73.9 411.9L77.8 419.1L76.2 416.3L74.7 413.4L73.2 410.4L71.9 407.4L70.6 404.4ZM72 407.9L73.4 411L76 416.2L78.6 420.5L80.9 424.1L83.2 427L85.2 429.4L87 431.3L88.6 432.8L90 434L90.5 434.4L91.1 434.7L91.2 434.8L93.8 437.3L96.4 439.6L99.2 441.8L102 443.8L104.8 445.6L107.7 447.2L110.6 448.6L113.5 449.8L116.4 450.9L119.4 451.7L122.3 452.3L125.2 452.7L128.1 452.9L130.9 452.9L133.7 452.7L136.4 452.3L139.1 451.7L141.7 450.8L139.5 451.6L134.5 452.9L130.7 453.5L124.1 453.5L117.9 452.4L111.8 450.5L105.8 447.7L99.8 443.9L94 439.2L88.3 433.5L82.9 426.8L80.3 423.1L77.8 419.1L76.2 416.3L74.7 413.4L73.2 410.4L71.9 407.4L70.6 404.4ZM169 382.5L169.9 386.9L171.1 395.6L171.3 403.7L170.6 411.4L169.2 418.6L167.1 425.2L164.2 431.2L160.6 436.8L155.9 441.9L152.9 444.5L148.5 447.5L146.4 448.7L148.8 447.2L151 445.6L153.1 443.8L155.1 441.9L157 439.7L158.7 437.4L160.3 434.9L161.8 432.3L163.1 429.5L164.2 426.6L165.2 423.6L166 420.4L166.7 417.2L167.2 413.8L167.6 410.4L167.7 406.9L167.7 403.4L167.6 399.8L167.6 399.6L167.9 398.9L168.1 398.2L168.5 396.2L168.7 393.9L168.8 391.1L168.6 387.8L168.2 384.1L167.4 379.8L166.2 374.9L164.3 369.3L163 366.1L161.5 362.7L163 365.7L164.3 368.7L165.6 371.7L166.7 374.8L167.8 377.9ZM91.2 434.8L93.8 437.3L96.4 439.6L99.2 441.8L102 443.8L104.8 445.6L107.7 447.2L110.6 448.6L113.5 449.8L116.4 450.9L119.4 451.7L122.3 452.3L125.2 452.7L128.1 452.9L130.9 452.9L133.7 452.7L136.4 452.3L139.1 451.7L141.7 450.8L167.5 399.9L167.7 403.5L167.7 407L167.5 410.5L167.1 413.9L166.6 417.2L166 420.5L165.1 423.6L164.1 426.6L163 429.5L161.7 432.2L160.2 434.8L158.7 437.3L156.9 439.6L155.1 441.8L153.1 443.7L151 445.5L148.8 447.1L146.5 448.6L144.1 449.8L141.6 450.8L139 451.6L136.3 452.3L133.6 452.7L130.8 452.9L128 452.9L125.1 452.7L122.2 452.3L119.3 451.6L116.4 450.8L113.5 449.8L110.6 448.6L107.7 447.2L104.8 445.5L102 443.8L99.2 441.8L96.5 439.6L93.9 437.3L91.3 434.9ZM163 429.5L163 429.5L167.6 399.8L167.7 403.4L167.7 406.9L167.6 410.4L167.2 413.8L166.7 417.2L166 420.4L165.2 423.6L164.2 426.6L163.1 429.5L161.8 432.3L160.3 434.9L158.7 437.4L157 439.7L155.1 441.9L153.1 443.8L151 445.6L148.8 447.2L146.4 448.7ZM91.5 435L91.9 435.2L92.4 435.3L95 437.7L97.6 439.9L100.3 442L103.1 443.8L105.9 445.5L108.8 447.1L111.6 448.4L114.5 449.5L117.4 450.4L120.3 451.2L123.2 451.7L126 452L128.9 452.1L131.6 452L134.4 451.7L137 451.2L139.6 450.5L142.1 449.5L144.6 448.4L146.9 447.1L149.2 445.6L151.3 443.9L153.3 442.1L155.2 440L157 437.8L158.6 435.4L160.1 432.9L161.5 430.2L162.7 427.4L163.7 424.5L164.6 421.5L165.4 418.3L165.9 415.1L166.3 411.7L166.6 408.3L166.7 404.8L166.6 401.3L167.1 400.7L167.4 400.2L167.5 399.9L167.7 403.5L167.7 407L167.5 410.5L167.1 413.9L166.6 417.2L166 420.5L165.1 423.6L164.1 426.6L163 429.5L161.7 432.2L160.2 434.8L158.7 437.3L156.9 439.6L155.1 441.8L153.1 443.7L151 445.5L148.8 447.1L146.5 448.6L144.1 449.8L141.6 450.8L139 451.6L136.3 452.3L133.6 452.7L130.8 452.9L128 452.9L125.1 452.7L122.2 452.3L119.3 451.6L116.4 450.8L113.5 449.8L110.6 448.6L107.7 447.2L104.8 445.5L102 443.8L99.2 441.8L96.5 439.6L93.9 437.3L91.3 434.9Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M156.8 329.7L156.8 329.7L149.1 323.7L151.7 325.6L154.3 327.6L156.8 329.7L159.2 332L161.5 334.4L163.8 336.9ZM164.6 338.1L165.5 339.6L166.5 341.2L167.6 343.1L168.7 345.2L169.9 347.5L169.9 347.5L168 348.3L166.1 349.2L164.2 350L162.3 350.9L160.4 351.7L158.4 352.6L158.4 352.6L159.5 354.8L160.2 356.8L160.8 358.6L161.2 360.2L161.4 361.5L161.5 362.7L159.7 359.5L157.9 356.3L155.9 353.2L153.8 350.2L151.6 347.3L151.5 346.4L151.1 345.3L150.6 344L149.8 342.5L148.7 340.8L147.3 338.8L147.3 338.8L149.2 337.9L151.1 337.1L153 336.2L154.9 335.4L156.8 334.5L158.8 333.7L158.8 333.7L157.1 331.6L155.4 329.6L153.7 327.9L152 326.3L150.5 324.9L149.1 323.7L151.7 325.6L154.3 327.6L156.8 329.7L159.2 332L161.5 334.4L163.8 336.9ZM161.5 362.7L159.7 359.5L157.9 356.3L155.9 353.2L153.8 350.2L151.6 347.3L151.6 347.3L153.8 350.2L155.9 353.2L157.9 356.3L159.7 359.5L161.5 362.7ZM67.6 395.6L67.6 395.6L70.6 404.4L69.3 400.9L68.2 397.4L67.2 393.9L66.3 390.3L65.6 386.8ZM66.1 389.6L66.6 391.9L67.3 395L68 397.1L68.4 398.5L68.8 399.4L69.2 400.1L69.5 400.5L69.8 400.9L70.1 401.1L70.2 401.2L70.3 401.2L70.4 401.3L70.4 401.3L70.5 401.3L70.6 401.3L70.9 401.4L72.2 404.9L73.6 408.3L75.3 411.7L77 415L78.9 418.3L80.9 421.4L83 424.4L85.2 427.3L87.5 430.1L89.9 432.8L92.4 435.3L91.9 435.2L91.5 435L91.3 434.9L91.2 434.8L91.1 434.7L90.5 434.4L90 434L88.6 432.8L87 431.3L85.2 429.4L83.2 427L80.9 424.1L78.6 420.5L76 416.2L73.4 411L72 407.9L70.6 404.4L69.3 400.9L68.2 397.4L67.2 393.9L66.3 390.3L65.6 386.8ZM163 366.1L164.3 369.3L166.2 374.9L167.4 379.8L168.2 384.1L168.6 387.8L168.8 391.1L168.7 393.9L168.5 396.2L168.1 398.2L167.9 398.9L167.6 399.6L167.6 399.8L167.5 399.9L167.4 400.2L167.1 400.7L166.6 401.3L166.3 397.8L165.9 394.2L165.3 390.6L164.6 387L163.7 383.4L162.7 379.8L161.5 376.3L160.1 372.8L158.6 369.4L157 366L155.3 362.7L155.7 362.3L155.9 362.1L156 362L156.1 362L156.2 361.9L156.3 361.7L156.5 361.5L156.9 360.9L157.1 360.4L157.3 359.7L157.3 358.8L157.2 357.8L156.8 356.4L156 354.4L154.5 351.6L153.3 349.7L151.6 347.3L153.8 350.2L155.9 353.2L157.9 356.3L159.7 359.5L161.5 362.7ZM116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L116.2 389L166.7 404.9L166.5 410.2L165.9 415.3L164.9 420.2L163.6 424.8L161.9 429.2L159.9 433.3L157.5 437L154.9 440.4L151.9 443.4L148.7 446L145.2 448.1L141.5 449.8L137.6 451.1L133.5 451.8L129.3 452.1L125 451.9L120.6 451.2L116.2 450.1L111.8 448.5L107.5 446.4L103.2 443.9L99 441L94.9 437.7L91 434L87.3 429.9L83.8 425.6L80.6 421L77.6 416.1L74.9 411.1L72.6 405.8L70.5 400.5L68.9 395L67.5 389.5L66.6 384L66 378.6L65.8 373.2L66 367.9L66.6 362.8L67.5 357.9L68.9 353.3L70.5 348.9L72.6 344.8L74.9 341.1L77.6 337.7L80.6 334.7L83.8 332.1L87.3 330L91 328.3L94.9 327L99 326.3L103.2 326L107.5 326.2L111.8 326.9L116.2 328L120.6 329.6L125 331.7L129.3 334.2L133.5 337.1L137.6 340.4L141.5 344.1L145.2 348.1L148.7 352.5L151.9 357.1L154.9 362L157.5 367L159.9 372.3L161.9 377.6L163.6 383.1L164.9 388.6L165.9 394.1L166.5 399.5L166.7 404.9Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M139.2 318.2L139.2 318.2L129.2 314.8L132 315.6L134.9 316.5L137.8 317.6L140.7 318.8L143.5 320.3L146.4 321.9L149.1 323.7ZM150.5 324.9L152 326.3L153.7 327.9L155.4 329.6L157.1 331.6L158.8 333.7L158.8 333.7L156.8 334.5L154.9 335.4L153 336.2L151.1 337.1L149.2 337.9L147.3 338.8L147.3 338.8L148.7 340.8L149.8 342.5L150.6 344L151.1 345.3L151.5 346.4L151.6 347.3L149.4 344.6L147 341.9L144.6 339.4L142.1 337.1L139.5 334.8L139.3 334.1L138.9 333.2L138.2 332.2L137.2 330.9L135.8 329.5L133.8 327.8L133.8 327.8L135.7 327L137.6 326.1L139.5 325.3L141.4 324.4L143.3 323.5L145.2 322.7L145.2 322.7L142.8 320.9L140.1 319.3L137.4 317.8L134.6 316.6L131.8 315.6L129.2 314.8L132 315.6L134.9 316.5L137.8 317.6L140.7 318.8L143.5 320.3L146.4 321.9L149.1 323.7ZM151.6 347.3L149.4 344.6L147 341.9L144.6 339.4L142.1 337.1L139.5 334.8L139.5 334.8L142.1 337.1L144.6 339.4L147 341.9L149.4 344.6L151.6 347.3ZM64.4 378L64.4 378L65.6 386.8L65 383.3L64.5 379.7L64.2 376.3L64.1 372.8L64.1 369.4ZM64.1 371.5L64 372.8L64 373.7L64.1 373.1L64.1 371.9L64.3 370.4L64.5 368.9L64.7 367.4L65.1 366.1L65.4 365L65.6 364.6L65.8 364.2L65.8 364.1L65.9 364.1L66 363.9L66.1 363.7L66.5 363.5L66.1 366.8L65.9 370.1L65.8 373.5L65.9 376.9L66.2 380.4L66.6 383.9L67.1 387.4L67.8 390.9L68.7 394.4L69.7 397.9L70.9 401.4L70.6 401.3L70.5 401.3L70.4 401.3L70.4 401.3L70.3 401.2L70.2 401.2L70.1 401.1L69.8 400.9L69.5 400.5L69.2 400.1L68.8 399.4L68.4 398.5L68 397.1L67.3 395L66.6 391.9L66.1 389.6L65.6 386.8L65 383.3L64.5 379.7L64.2 376.3L64.1 372.8L64.1 369.4ZM153.3 349.7L154.5 351.6L156 354.4L156.8 356.4L157.2 357.8L157.3 358.8L157.3 359.7L157.1 360.4L156.9 360.9L156.5 361.5L156.3 361.7L156.2 361.9L156.1 362L156 362L155.9 362.1L155.7 362.3L155.3 362.7L153.4 359.5L151.5 356.5L149.4 353.5L147.2 350.6L145 347.9L142.6 345.3L140.2 342.9L137.7 340.5L135.1 338.4L132.5 336.4L129.8 334.5L130.5 334.2L130.9 334.2L131.1 334.2L131.3 334.2L131.4 334.2L132 334.2L132.6 334.3L133.9 334.6L135.4 335L137 335.6L138.6 336.4L140.2 337.1L141.4 337.7L142.1 337.9L141.8 337.2L141 336.3L139.5 334.8L142.1 337.1L144.6 339.4L147 341.9L149.4 344.6L151.6 347.3Z\"/><path class=\"iso-top\" d=\"M121.7 313.8L121.7 313.8L114.5 314.2L117.3 313.9L120.2 313.8L123.2 313.9L126.1 314.3L129.2 314.8ZM131.8 315.6L134.6 316.6L137.4 317.8L140.1 319.3L142.8 320.9L145.2 322.7L145.2 322.7L143.3 323.5L141.4 324.4L139.5 325.3L137.6 326.1L135.7 327L133.8 327.8L133.8 327.8L135.8 329.5L137.2 330.9L138.2 332.2L138.9 333.2L139.3 334.1L139.5 334.8L139.5 334.8L141 336.3L141.8 337.2L142.1 337.9L141.4 337.7L140.2 337.1L138.6 336.4L137 335.6L135.4 335L133.9 334.6L132.6 334.3L132 334.2L131.4 334.2L131.3 334.2L131.1 334.2L130.9 334.2L130.5 334.2L129.8 334.5L126.9 332.8L124.1 331.2L121.2 329.9L118.3 328.7L115.3 327.7L112.4 327L109.5 326.4L106.6 326.1L103.8 326L101 326.1L98.2 326.4L95.5 326.9L92.9 327.6L90.4 328.5L87.9 329.7L85.5 331L83.3 332.5L81.1 334.2L79.1 336.1L77.2 338.2L75.4 340.4L73.7 342.8L72.2 345.4L70.9 348.1L69.7 351L68.6 353.9L67.8 357L67 360.2L66.5 363.5L66.1 363.7L66 363.9L65.9 364.1L65.8 364.1L65.8 364.2L65.6 364.6L65.4 365L65.1 366.1L64.7 367.4L64.5 368.9L64.3 370.4L64.1 371.9L64.1 373.1L64 373.7L64 372.8L64.1 371.5L64.1 369.4L80.7 329.2L81 328.9L81.2 328.7L81.5 328.4L81.7 328.2L82 328L82.3 327.9L91 322.4L93 321.5L94.9 320.7L96.8 319.8L98.7 319L100.6 318.1L102.5 317.3L112.4 314.4L112.7 314.3L113 314.2L113.4 314.2L113.7 314.1L114.1 314.1L114.5 314.2L117.3 313.9L120.2 313.8L123.2 313.9L126.1 314.3L129.2 314.8Z\"/><path class=\"iso-line iso-crease\" data-tone=\"mid\" d=\"M158.9 370L158.3 368.6L157.7 367.3L157 365.9L156.3 364.6L155.6 363.3L154.9 362L154.1 360.7L153.4 359.4L152.6 358.2L151.8 356.9L151 355.7L150.1 354.5L149.3 353.3L148.4 352.1L147.5 351L146.6 349.8L145.6 348.7L144.7 347.6L143.8 346.5L142.8 345.5L141.8 344.5L140.8 343.5L139.8 342.5L138.8 341.5L137.7 340.6L136.7 339.7L135.6 338.8L134.6 338L133.5 337.1L132.4 336.3L131.3 335.6L130.2 334.8L129.1 334.1L128 333.4L126.9 332.7L125.8 332.1L124.6 331.5L123.5 330.9L122.4 330.4L121.2 329.9L120.1 329.4L118.9 328.9L117.8 328.5L116.6 328.1L115.5 327.8L114.3 327.5L113.2 327.2L112.1 326.9L110.9 326.7L109.8 326.5L108.6 326.3L107.5 326.2L106.4 326.1L105.3 326L104.1 326L103 326L101.9 326L100.8 326.1L99.7 326.2L98.7 326.3L97.6 326.5L96.5 326.7L95.5 326.9L94.4 327.2L93.4 327.5L92.4 327.8L91.4 328.1L90.4 328.5L89.4 328.9L88.4 329.4L87.5 329.9L86.6 330.4L85.6 330.9L84.7 331.5L83.8 332.1L83 332.7L82.1 333.4L81.3 334.1L80.5 334.8L79.7 335.5L78.9 336.3L78.1 337.1L77.4 337.9L76.7 338.8L76 339.7L75.3 340.6L74.6 341.5L74 342.5L73.4 343.4L72.8 344.4L72.2 345.5L71.7 346.5L71.1 347.6L70.6 348.7L70.2 349.8L69.7 350.9L69.3 352.1L68.9 353.3L68.5 354.4L68.1 355.7L67.8 356.9L67.5 358.1L67.2 359.4L67 360.7L66.7 361.9L66.5 363.3L66.3 364.6L66.2 365.9L66.1 367.2L66 368.6L65.9 370L65.8 371.3L65.8 372.7L65.8 374.1L65.9 375.5L65.9 376.9L66 378.3L66.1 379.7L66.2 381.2L66.4 382.6L66.6 384L66.8 385.4L67 386.9L67.3 388.3L67.6 389.7L67.9 391.2L68.2 392.6L68.6 394L69 395.5L69.4 396.9L69.8 398.3L70.3 399.7L70.8 401.2L71.3 402.6L71.8 404L72.4 405.3L73 406.7L73.6 408.1L74.2 409.5L74.8 410.8L75.5 412.2L76.2 413.5L76.9 414.8L77.6 416.1L78.4 417.4L79.1 418.7L79.9 419.9L80.7 421.2L81.5 422.4L82.4 423.6L83.2 424.8L84.1 426L85 427.1L85.9 428.3L86.8 429.4L87.8 430.5L88.7 431.5L89.7 432.6L90.7 433.6L91.7 434.6L92.7 435.6L93.7 436.6L94.7 437.5L95.8 438.4L96.8 439.3L97.9 440.1L99 441L100.1 441.8L101.2 442.5L102.3 443.3L103.4 444L104.5 444.7L105.6 445.3L106.7 446L107.8 446.6L109 447.2L110.1 447.7L111.3 448.2L112.4 448.7L113.5 449.1L114.7 449.6L115.8 449.9L117 450.3L118.1 450.6L119.3 450.9L120.4 451.2L121.6 451.4L122.7 451.6L123.8 451.8L125 451.9L126.1 452L127.2 452.1L128.3 452.1L129.5 452.1L130.6 452.1L131.7 452L132.7 451.9L133.8 451.8L134.9 451.6L136 451.4L137 451.2L138.1 450.9L139.1 450.6L140.1 450.3L141.1 450L142.1 449.6L143.1 449.2L144 448.7L145 448.2L145.9 447.7L146.8 447.2L147.8 446.6L148.6 446L149.5 445.4L150.4 444.7L151.2 444L152 443.3L152.8 442.6L153.6 441.8L154.4 441L155.1 440.2L155.8 439.3L156.5 438.4L157.2 437.5L157.9 436.6L158.5 435.6L159.1 434.6L159.7 433.6L160.3 432.6L160.8 431.6L161.4 430.5L161.9 429.4L162.3 428.3L162.8 427.2L163.2 426L163.6 424.8L164 423.6L164.4 422.4L164.7 421.2L165 420L165.3 418.7L165.5 417.4L165.8 416.1L166 414.8L166.1 413.5L166.3 412.2L166.4 410.9L166.5 409.5L166.6 408.1L166.6 406.8L166.7 405.4L166.7 404L166.6 402.6L166.6 401.2L166.5 399.8L166.4 398.4L166.2 396.9L166.1 395.5L165.9 394.1L165.7 392.6L165.5 391.2L165.2 389.8L164.9 388.3L164.6 386.9L164.3 385.5L163.9 384L163.5 382.6L163.1 381.2L162.6 379.8L162.2 378.3L161.7 376.9L161.2 375.5L160.7 374.1L160.1 372.7L159.5 371.4L158.9 370\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M107.1 336.6L107.1 336.6L105.3 336.5L103.6 336.6L101.8 336.8L100.1 337L98.4 337.4L96.8 337.9L95.2 338.4L93.6 339.1L92.1 339.8L90.6 340.7L89.2 341.6L87.8 342.6L86.5 343.8L85.2 345L84 346.3L82.9 347.6L81.8 349.1L80.8 350.6L79.8 352.2L78.9 353.9L78.1 355.6L77.4 357.4L76.7 359.3L76.1 361.2L75.6 363.1L75.2 365.2L74.8 367.2L74.5 369.3L74.3 371.5L74.2 373.6L74.2 375.9L74.2 378.1L74.3 380.3L74.5 382.6L74.8 384.9L75.2 387.2L75.6 389.5L76.1 391.8L76.5 393.1L107.1 402.7L107.1 336.6M99.5 400.3L107.1 389.4M92.2 398L107.1 377M85 395.8L107.1 364.5M77.8 393.5L107.1 352.1M74.9 385.2L107.1 339.6M74.2 373.7L100.1 337\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M64.1 370.9L64.1 369.5L64.1 368.2L64.2 366.8L64.3 365.5L64.4 364.2L64.5 363.8L64.6 362.5L64.8 361.1L65 359.8L65.2 358.6L65.4 357.3L65.7 356L65.9 354.8L66.3 353.6L66.6 352.4L66.9 351.2L67.3 350L67.7 348.8L68.1 347.7L68.6 346.5L69 345.4L69.5 344.3L70 343.3L70.5 342.2L71.1 341.2L71.7 340.2L72.3 339.2L72.9 338.2L73.5 337.3L74.1 336.4L74.8 335.5L75.5 334.6L76.2 333.7L76.9 332.9L77.7 332.1L78.4 331.3L79.2 330.6L80 329.8L80.8 329.1L82.4 327.8L83.3 327.1L84.1 326.4L85 325.8L85.9 325.2L86.8 324.6L87.7 324.1L88.6 323.6L89.6 323.1L90.5 322.6L91.5 322.2L102.9 317.1L103.9 316.7L104.9 316.3L105.9 315.9L106.9 315.6L107.9 315.3L109 315.1L110 314.8L111.1 314.6L112.2 314.5L114.2 314.2L115.3 314L116.4 313.9L117.4 313.9L118.5 313.8L119.6 313.8L120.7 313.8L121.8 313.8L123 313.9L124.1 314L125.2 314.1L126.3 314.3L127.4 314.5L128.6 314.7L129.7 315L130.8 315.2L132 315.5L133.1 315.9L134.2 316.2L135.4 316.6L136.5 317L137.7 317.5L138.8 318L139.9 318.5L141 319L142.2 319.6L143.3 320.2L144.4 320.8L145.5 321.4L146.6 322.1L147.7 322.8L148.8 323.5L149.9 324.3L151 325L151.3 325.3L152.4 326.1L153.4 326.9L154.5 327.7L155.5 328.6L156.5 329.5L157.5 330.4L158.5 331.3L159.5 332.3L160.5 333.2L161.5 334.2L162.5 335.2L163.4 336.3L164.3 337.3L165.3 338.4L166.2 339.5L167.1 340.6L167.9 341.8L168.8 342.9L169.6 344.1L170.5 345.2L171.3 346.4L172.1 347.7L172.9 348.9L173.6 350.1L174.4 351.4L175.1 352.7L175.8 353.9L176.5 355.2L177.2 356.5L177.8 357.8L178.5 359.2L179.1 360.5L179.7 361.9L180.3 363.2L180.8 364.6L181.4 365.9L181.9 367.3L182.4 368.7L182.8 370.1L183.3 371.5L183.7 372.9L184.1 374.3L184.5 375.7L184.9 377.1L185.2 378.5L185.5 379.9L185.8 381.3L186.1 382.7L186.3 384.1L186.5 385.5L186.7 386.9L186.9 388.3L187.1 389.7L187.2 391.1L187.3 392.5L187.4 393.9L187.4 395.3L187.5 396.7L187.5 398L187.5 399.4L187.4 400.7L187.4 402.1L187.3 403.4L187.2 404.7L187.1 406.1L187 406.5L186.9 407.8L186.7 409.1L186.5 410.4L186.3 411.7L186 412.9L185.7 414.2L185.4 415.4L185.1 416.6L184.8 417.8L184.4 419L184 420.2L183.6 421.3L183.2 422.5L182.7 423.6L182.3 424.7L181.8 425.8L181.3 426.8L180.7 427.9L180.2 428.9L179.6 429.9L179 430.9L178.4 431.8L177.7 432.8L177.1 433.7L176.4 434.6L175.7 435.4L175 436.3L174.2 437.1L173.5 437.9L172.7 438.7L171.9 439.4L171.1 440.1L169.5 441.5L168.7 442.2L167.9 442.8L167 443.5L166.1 444.1L165.2 444.7L164.3 445.2L163.4 445.8L162.5 446.3L161.5 446.7L160.5 447.2L149.1 452.3L148.1 452.7L147.1 453.1L146.1 453.5L145.1 453.8L144.1 454.1L143.1 454.4L142 454.6L141 454.8L139.9 455L138.8 455.2L136.8 455.5L135.7 455.6L134.6 455.7L133.6 455.8L132.5 455.8L131.4 455.8L130.3 455.8L129.1 455.7L128 455.6L126.9 455.5L125.8 455.4L124.7 455.2L123.5 455L122.4 454.8L121.3 454.5L120.1 454.2L119 453.9L117.9 453.5L116.7 453.2L115.6 452.7L114.5 452.3L113.3 451.8L112.2 451.4L111.1 450.8L109.9 450.3L108.8 449.7L107.7 449.1L106.6 448.5L105.5 447.8L104.4 447.1L103.3 446.4L102.2 445.7L101.1 444.9L100.8 444.7L99.7 443.9L98.7 443.1L97.6 442.3L96.6 441.4L95.5 440.6L94.5 439.7L93.5 438.7L92.5 437.8L91.5 436.8L90.5 435.9L89.6 434.8L88.6 433.8L87.7 432.8L86.7 431.7L85.8 430.6L84.9 429.5L84.1 428.4L83.2 427.3L82.3 426.1L81.5 424.9L80.7 423.7L79.9 422.5L79.1 421.3L78.3 420.1L77.5 418.8L76.8 417.6L76.1 416.3L75.4 415L74.7 413.7L74 412.4L73.4 411.1L72.8 409.7L72.2 408.4L71.6 407.1L71 405.7L70.5 404.3L69.9 403L69.4 401.6L68.9 400.2L68.5 398.8L68.1 397.4L67.6 396L67.2 394.6L66.9 393.2L66.5 391.8L66.2 390.4L65.9 389L65.6 387.6L65.4 386.2L65.1 384.8L64.9 383.4L64.7 381.9L64.5 380.5L64.4 379.1L64.3 377.8L64.2 376.4L64.1 375L64.1 373.6L64.1 372.2Z\"/></g></g><g class=\"it\" data-name=\"stand.bar\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M136.3 470.5L137.1 469.9L146.2 465.8L147.8 465.4L149.6 465.4L151.3 465.7L345.7 526.8L346.7 527.3L346.9 528L346.9 540.7L346.1 541.3L337 545.4L335.5 545.8L333.6 545.8L332 545.5L137.5 484.4L136.5 483.9L136.3 483.2Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M346.9 540.7L346.1 541.3L346.1 528.6L346.9 528ZM346.1 541.3L337 545.4L337 532.7L346.1 528.6ZM337 545.4L335.5 545.8L335.5 533.1L337 532.7Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M335.5 545.8L333.6 545.8L333.6 533.2L335.5 533.1Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M333.6 545.8L332 545.5L332 532.9L333.6 533.2Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M332 545.5L137.5 484.4L137.5 471.8L332 532.9ZM137.5 484.4L136.5 483.9L136.5 471.2L137.5 471.8ZM136.5 483.9L136.3 483.2L136.3 470.5L136.5 471.2Z\"/><path class=\"iso-top\" d=\"M345.7 526.8L346.7 527.3L346.9 528L346.1 528.6L337 532.7L335.5 533.1L333.6 533.2L332 532.9L137.5 471.8L136.5 471.2L136.3 470.5L137.1 469.9L146.2 465.8L147.8 465.4L149.6 465.4L151.3 465.7Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M346.9 528L346.1 528.6L337 532.7L335.5 533.1L333.6 533.2L332 532.9L137.5 471.8L136.5 471.2L136.3 470.5\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M346.9 528L345.1 528.4L336.2 532.4L335.1 532.7L333.8 532.8L332.6 532.5L138.4 471.5L137.6 471.1L136.3 470.5\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M346.6 534.7L337 539.1L332.7 539.4L137.5 478.1L136.6 476.5\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M136.3 470.5L137.1 469.9L146.2 465.8L147.8 465.4L149.6 465.4L151.3 465.7L345.7 526.8L346.7 527.3L346.9 528M346.9 540.7L346.1 541.3L337 545.4L335.5 545.8L333.6 545.8L332 545.5L137.5 484.4L136.5 483.9L136.3 483.2M346.9 528L346.9 540.7M136.3 470.5L136.3 483.2\"/></g></g><g class=\"it\" data-name=\"bb.stub\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M233.5 412L233.8 410.8L234.2 409.6L234.8 408.7L235.5 407.9L236.5 407.4L249 401.8L250.1 401.6L251.2 401.6L252.3 401.9L253.4 402.4L254.4 403.2L255.4 404.2L256.3 405.4L257 406.6L257.5 408L257.8 409.4L257.9 410.8L257.8 412.1L257.5 413.3L257 414.4L256.3 415.2L255.4 415.8L242.8 421.5L241.9 421.8L240.8 421.9L239.7 421.8L238.6 421.4L237.5 420.7L236.5 419.8L235.5 418.7L234.8 417.5L234.2 416.2L233.8 414.8L233.5 413.4Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M242.7 421.5L243.6 420.9L244.3 420.1L244.9 419L245.2 417.8L245.3 416.4L245.2 415L244.9 413.5L244.3 412.1L256.9 406.5L257.5 407.9L257.8 409.4L257.9 410.8L257.8 412.2L257.5 413.4L256.9 414.5L256.2 415.3L255.3 415.9Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M244.3 412.1L243.6 410.8L256.2 405.2L256.9 406.5Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M243.6 410.8L242.7 409.7L255.3 404L256.2 405.2ZM239.4 414.6L239.4 414.6L239.4 414.6L239.4 414.6L239.4 414.6L239.4 414.6L239.4 414.6L239.4 414.6L239.4 414.6L239.4 414.6L239.4 414.6L239.4 414.6L239.4 414.6L239.4 414.6L239.4 414.6L239.4 414.6L239.4 414.6L239.4 414.6L239.4 414.6L239.4 414.6L239.4 414.6L239.4 414.6L239.4 414.6L239.4 414.6L239.4 414.6L239.4 414.6L239.4 414.6L239.4 414.6L239.4 414.6L239.4 414.6L239.4 414.6L239.4 414.6L239.4 414.6L245.3 416.4L245.2 417.8L244.9 419L244.3 420.1L243.6 420.9L242.7 421.5L241.7 421.9L240.6 421.9L239.4 421.7L238.3 421.2L237.2 420.5L236.1 419.5L235.2 418.3L234.5 417L234 415.6L233.6 414.1L233.5 412.7L233.6 411.3L234 410.1L234.5 409L235.2 408.2L236.1 407.6L237.2 407.2L238.3 407.2L239.4 407.4L240.6 407.9L241.7 408.7L242.7 409.7L243.6 410.8L244.3 412.1L244.9 413.5L245.2 415L245.3 416.4Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M242.7 409.7L241.7 408.7L240.6 407.9L253.1 402.3L254.3 403.1L255.3 404Z\"/><path class=\"iso-top\" d=\"M240.6 407.9L239.4 407.4L238.3 407.2L237.2 407.2L236.1 407.6L248.7 402L249.7 401.6L250.8 401.6L252 401.8L253.1 402.3Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M242.6 421.6L243.4 421.1L244.2 420.3L244.7 419.4L245.1 418.3L245.3 417L245.3 415.7L245.1 414.3L244.7 413L244.1 411.7L243.4 410.5L242.5 409.4L241.5 408.5L240.5 407.9L239.4 407.4L238.3 407.2L237.2 407.2L236.3 407.5\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M233.5 412L233.8 410.8L234.2 409.6L234.8 408.7L235.5 407.9L236.5 407.4L249 401.8L250.1 401.6L251.2 401.6L252.3 401.9L253.4 402.4L254.4 403.2L255.4 404.2L256.3 405.4L257 406.6L257.5 408L257.8 409.4L257.9 410.8L257.8 412.1L257.5 413.3L257 414.4L256.3 415.2L255.4 415.8L242.8 421.5L241.9 421.8L240.8 421.9L239.7 421.8L238.6 421.4L237.5 420.7L236.5 419.8L235.5 418.7L234.8 417.5L234.2 416.2L233.8 414.8L233.5 413.4Z\"/></g></g><g class=\"it\" data-name=\"bb.house\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M198.5 387.3L201.1 385.2L206.8 382.6L211.8 381.3L218 381.1L223.5 382.1L255.3 392.1L258.8 394L259.4 396.2L259.4 456.7L256.8 458.8L251.1 461.4L246 462.7L239.9 462.9L234.4 461.9L202.6 451.9L199 450L198.5 447.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M259.4 456.7L256.8 458.8L256.8 398.3L259.4 396.2ZM256.8 458.8L251.1 461.4L251.1 400.9L256.8 398.3ZM251.1 461.4L246 462.7L246 402.2L251.1 400.9Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M246 462.7L239.9 462.9L239.9 402.4L246 402.2Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M239.9 462.9L234.4 461.9L234.4 401.4L239.9 402.4Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M234.4 461.9L202.6 451.9L202.6 391.4L234.4 401.4ZM202.6 451.9L199 450L199 389.5L202.6 391.4ZM199 450L198.5 447.7L198.5 387.3L199 389.5Z\"/><path class=\"iso-top\" d=\"M255.3 392.1L258.8 394L259.4 396.2L256.8 398.3L251.1 400.9L246 402.2L239.9 402.4L234.4 401.4L202.6 391.4L199 389.5L198.5 387.3L201.1 385.2L206.8 382.6L211.8 381.3L218 381.1L223.5 382.1Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M259.4 396.2L256.8 398.3L251.1 400.9L246 402.2L239.9 402.4L234.4 401.4L202.6 391.4L199 389.5L198.5 387.3\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M259.4 396.2L255.8 398.1L250.3 400.6L245.6 401.8L240.1 402L235 401.1L203.4 391.1L200.1 389.4L198.5 387.3\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M198.5 387.3L201.1 385.2L206.8 382.6L211.8 381.3L218 381.1L223.5 382.1L255.3 392.1L258.8 394L259.4 396.2M259.4 456.7L256.8 458.8L251.1 461.4L246 462.7L239.9 462.9L234.4 461.9L202.6 451.9L199 450L198.5 447.7M259.4 396.2L259.4 456.7M198.5 387.3L198.5 447.7\"/></g></g><g class=\"it\" data-name=\"seat.slider\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M174.4 274.7L174.6 273.8L175.7 273.1L177.5 272.5L179.8 272.3L182.1 272.4L184.1 272.8L185.5 273.5L186.2 274.3L186.2 304.5L185.9 305.4L184.8 306.2L183 306.7L180.8 306.9L178.5 306.9L176.5 306.4L175 305.8L174.4 304.9Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M184.8 306.2L183 306.7L183 276.5L184.8 275.9ZM186.2 304.5L185.9 305.4L185.9 275.2L186.2 274.3ZM185.9 305.4L184.8 306.2L184.8 275.9L185.9 275.2Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M183 306.7L180.8 306.9L180.8 276.7L183 276.5Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M180.8 306.9L178.5 306.9L178.5 276.6L180.8 276.7ZM178.5 306.9L176.5 306.4L176.5 276.2L178.5 276.6Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M176.5 306.4L175 305.8L175 275.5L176.5 276.2ZM175 305.8L174.4 304.9L174.4 274.7L175 275.5Z\"/><path class=\"iso-top\" d=\"M184.8 275.9L183 276.5L180.8 276.7L178.5 276.6L176.5 276.2L175 275.5L174.4 274.7L174.6 273.8L175.7 273.1L177.5 272.5L179.8 272.3L182.1 272.4L184.1 272.8L185.5 273.5L186.2 274.3L185.9 275.2Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M186.2 274.3L185.9 275.2L184.8 275.9L183 276.5L180.8 276.7L178.5 276.6L176.5 276.2L175 275.5L174.4 274.7\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M174.4 274.7L174.6 273.8L175.7 273.1L177.5 272.5L179.8 272.3L182.1 272.4L184.1 272.8L185.5 273.5L186.2 274.3M186.2 304.5L185.9 305.4L184.8 306.2L183 306.7L180.8 306.9L178.5 306.9L176.5 306.4L175 305.8L174.4 304.9M174.4 274.7L174.4 304.9M186.2 274.3L186.2 304.5\"/></g></g><g class=\"it\" data-name=\"frame.post\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M202.7 285.6L203.7 284.8L211.4 281.4L213.4 280.8L215.8 280.8L218 281.1L231.2 285.3L232.6 286L232.8 287L232.8 389.6L231.8 390.5L224.2 393.9L222.2 394.4L219.7 394.5L217.5 394.1L204.3 390L202.9 389.2L202.7 388.3Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M232.8 389.6L231.8 390.5L231.8 287.8L232.8 287ZM231.8 390.5L224.2 393.9L224.2 291.2L231.8 287.8ZM224.2 393.9L222.2 394.4L222.2 291.7L224.2 291.2Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M222.2 394.4L219.7 394.5L219.7 291.8L222.2 291.7Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M219.7 394.5L217.5 394.1L217.5 291.4L219.7 291.8Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M217.5 394.1L204.3 390L204.3 287.3L217.5 291.4ZM204.3 390L202.9 389.2L202.9 286.5L204.3 287.3ZM202.9 389.2L202.7 388.3L202.7 285.6L202.9 286.5Z\"/><path class=\"iso-top\" d=\"M231.2 285.3L232.6 286L232.8 287L231.8 287.8L224.2 291.2L222.2 291.7L219.7 291.8L217.5 291.4L204.3 287.3L202.9 286.5L202.7 285.6L203.7 284.8L211.4 281.4L213.4 280.8L215.8 280.8L218 281.1Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M232.8 287L231.8 287.8L224.2 291.2L222.2 291.7L219.7 291.8L217.5 291.4L204.3 287.3L202.9 286.5L202.7 285.6\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M232.8 287L231 287.6L223.6 290.9L221.9 291.4L219.9 291.5L218 291.1L205 287L203.7 286.4L202.7 285.6\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M202.7 285.6L203.7 284.8L211.4 281.4L213.4 280.8L215.8 280.8L218 281.1L231.2 285.3L232.6 286L232.8 287M232.8 389.6L231.8 390.5L224.2 393.9L222.2 394.4L219.7 394.5L217.5 394.1L204.3 390L202.9 389.2L202.7 388.3M232.8 287L232.8 389.6M202.7 285.6L202.7 388.3\"/></g></g><g class=\"it\" data-name=\"drive.case\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M97.6 376.7L107.2 372.4L129.9 365.8L222.2 391L234.7 400.9L243.6 416L246.8 432.8L243.6 447.7L234.7 457.2L225.2 461.4L212.6 463.4L120.3 425.1L97.6 406.9Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M234.7 457.2L243.6 447.7L234.1 452L225.2 461.4ZM243.6 447.7L246.8 432.8L237.3 437.1L234.1 452ZM246.8 432.8L243.6 416L234.1 420.2L237.3 437.1Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M243.6 416L234.7 400.9L225.2 405.1L234.1 420.2Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M97.6 406.9L120.3 425.1L188.5 453.4L199.2 457.4L212.6 463.4L225.2 461.4L234.1 452L237.3 437.1L234.1 420.2L225.2 405.1L212.6 395.3L199.2 392.8L188.5 392.9L120.3 370.1L97.6 376.7Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M234.7 400.9L222.2 391L212.6 395.3L225.2 405.1Z\"/><path class=\"iso-top\" d=\"M222.2 391L208.7 388.6L199.2 392.8L212.6 395.3ZM208.7 388.6L198 388.6L188.5 392.9L199.2 392.8ZM198 388.6L129.9 365.8L120.3 370.1L188.5 392.9ZM129.9 365.8L107.2 372.4L97.6 376.7L120.3 370.1Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M225.2 461.4L234.1 452M243.6 447.7L234.1 452M234.1 452L237.3 437.1M246.8 432.8L237.3 437.1M237.3 437.1L234.1 420.2M243.6 416L234.1 420.2M234.1 420.2L225.2 405.1M234.7 400.9L225.2 405.1M225.2 405.1L212.6 395.3M222.2 391L212.6 395.3M212.6 395.3L199.2 392.8M199.2 392.8L188.5 392.9M188.5 392.9L120.3 370.1M129.9 365.8L120.3 370.1M120.3 370.1L97.6 376.7\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M97.6 376.7L107.2 372.4L129.9 365.8L222.2 391L234.7 400.9L243.6 416L246.8 432.8L243.6 447.7L234.7 457.2L225.2 461.4L212.6 463.4L120.3 425.1L97.6 406.9Z\"/></g></g><g class=\"it\" data-name=\"crank.cover\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M180.8 420.7L180.9 419.4L180.9 418.8L181 417.4L181.2 416.1L181.4 414.8L181.6 413.6L181.9 412.3L182.2 411.1L182.6 410L183 408.8L183.5 407.7L184 406.7L184.6 405.7L185.2 404.7L185.9 403.8L186.5 402.9L187.3 402.1L188 401.3L188.8 400.6L189.5 400L190.3 399.3L191.2 398.7L192.1 398.2L193 397.6L194 397.2L194.9 396.8L195.9 396.5L197 396.2L198 396L199.1 395.8L200.2 395.8L201.3 395.7L202.4 395.8L203.5 395.9L204.1 395.9L205.2 396.1L206.4 396.3L207.5 396.6L208.6 396.9L209.8 397.3L210.9 397.8L212 398.3L213.1 398.9L214.2 399.5L215.3 400.2L216.4 400.9L217.5 401.7L218.5 402.6L219.6 403.4L220.6 404.4L221.6 405.3L222.5 406.4L223.5 407.4L224.4 408.5L225.2 409.7L226.1 410.8L226.2 411L227 412.2L227.8 413.4L228.5 414.6L229.2 415.9L229.8 417.2L230.4 418.5L231 419.8L231.5 421.2L232 422.5L232.5 423.9L232.8 425.2L233.2 426.6L233.3 426.8L233.6 428.2L233.8 429.7L234.1 431.1L234.2 432.5L234.3 433.9L234.4 435.3L234.4 436.6L234.4 438L234.3 439.3L234.2 440.7L234.1 442L233.8 443.2L233.6 444.5L233.3 445.7L232.9 446.9L232.5 448L232 449.1L231.5 450.2L231 451.2L230.4 452.2L229.8 453.2L229.4 453.7L228.8 454.6L228 455.4L227.3 456.2L226.5 457L225.7 457.7L224.8 458.4L224 458.9L223 459.5L222.1 460L221.1 460.4L220.1 460.7L219.1 461L218.1 461.3L217 461.5L216.2 461.6L215.1 461.7L214 461.7L212.9 461.7L211.8 461.7L210.7 461.5L209.6 461.3L208.4 461.1L207.3 460.8L206.2 460.4L205 460L203.9 459.5L202.8 458.9L201.7 458.3L200.6 457.7L199.5 457L198.4 456.2L197.3 455.4L196.8 455L195.8 454.2L194.8 453.3L193.9 452.4L192.9 451.4L192 450.4L191.1 449.3L190.2 448.2L189.4 447.1L188.6 445.9L187.8 444.7L187 443.5L186.3 442.3L185.7 441L185 439.7L184.5 438.4L183.9 437.1L183.4 435.7L182.9 434.4L182.5 433L182.1 431.6L181.8 430.2L181.5 428.9L181.3 427.5L181.1 426.1L181 424.7L180.9 423.4L180.8 422Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M233.4 444.1L233.8 442.6L234 441L234.2 439.3L234.3 437.7L234.4 436L234.3 434.2L234.2 432.5L234 430.7L233.7 428.9L233.3 427.2L232.9 425.4L232.4 423.6L231.8 421.9L231.1 420.1L230.4 418.4L229.6 416.8L228.8 415.1L227.8 413.5L226.9 412L225.8 410.5L224.7 409L223.6 407.6L222.4 406.3L221.2 405.1L219.9 403.9L221.3 405.1L222.1 405.9L222.5 406.3L222.9 406.8L224.7 409L226.5 411.6L227 412.3L227.4 413.1L228.3 414.8L229.2 416.6L229.6 417.5L230 418.5L230 418.5L230.5 420.4L231 422.8L231.5 425.6L231.9 428.9L232 432.7L231.7 437L231.7 438.7L231.6 440.3L231.4 442L231.1 443.6L230.8 445.1L230.4 446.6L229.9 448.1L229.4 449.5L228.8 450.8L228.1 452.1L227.3 453.3L226.5 454.4L225.6 455.4L224.6 456.4L223.6 457.3L222.6 458.1L221.5 458.8L220.3 459.4L219.1 460L217.9 460.4L216.6 460.7L215.3 461L214 461.1L212.6 461.2L211.3 461.1L209.9 461L208.5 460.7L207.1 460.4L207.3 460.7L207.6 460.8L207.9 460.9L208.1 461L208.4 460.9L208.6 460.8L233.2 445.2L233.2 445.2L233.2 445.2L233.3 445.1L233.4 445.1L233.4 445L233.4 445L233.5 444.8L233.5 444.6L233.5 444.6L233.5 444.5L233.5 444.4Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M221.3 405.1L222.1 405.9L222.5 406.3L222.9 406.8L224.7 409L226.5 411.6L227 412.3L227.4 413.1L228.3 414.8L229.2 416.6L229.6 417.5L230 418.5L230 418.5L230.5 420.4L231 422.8L231.5 425.6L231.9 428.9L232 432.7L231.7 437L231.6 435.3L231.5 433.7L231.3 432.1L231.1 430.4L230.7 428.8L230.4 427.1L229.9 425.5L229.6 422.8L229.2 420.3L228.6 417.9L227.9 415.6L227.1 413.6L226.3 411.9L226.3 411.9L225.8 411L225.2 410L223.9 408.2L222.5 406.5L221.8 405.7L221 404.9L217.9 402L214.6 399.7L213.7 399.3L213.2 399L213.2 399.1L213.4 399.3L214.7 400L216.1 400.9L217.4 401.8L218.7 402.8L219.9 403.9Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M213.5 399.1L213.5 399.1L213.1 398.9L213.7 399.3ZM214.6 399.7L217.9 402L221 404.9L221.8 405.7L222.5 406.5L223.9 408.2L225.2 410L225.8 411L226.3 411.9L226.3 411.9L227.1 413.6L227.9 415.6L228.6 417.9L229.2 420.3L229.6 422.8L229.9 425.5L229.4 423.8L228.8 422.1L228.1 420.5L227.4 418.9L226.6 417.3L225.8 415.7L224.9 414.2L224.8 413L224.4 411.6L223.8 410.1L223 408.4L222 406.7L221 405.2L221 405.2L220.2 404.4L219.3 403.5L217.3 401.8L215.1 400.1L213.9 399.3L212.8 398.7L212.9 398.8L213.1 398.9L213.1 398.9L213.7 399.3ZM206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L206.3 429.4L231.7 437.4L231.6 440L231.3 442.5L230.9 445L230.2 447.3L229.4 449.5L228.4 451.5L227.2 453.4L225.9 455.1L224.4 456.6L222.8 457.9L221.1 459L219.3 459.9L217.4 460.6L215.4 461L213.3 461.2L211.2 461.1L209 460.8L206.8 460.3L204.6 459.6L202.4 458.6L200.3 457.4L198.2 456L196.1 454.4L194.2 452.7L192.3 450.7L190.5 448.6L188.9 446.4L187.3 444L185.9 441.5L184.7 438.9L183.6 436.3L182.7 433.6L182 430.9L181.4 428.1L181 425.4L180.8 422.7L180.8 420.1L181 417.5L181.4 415L182 412.6L182.7 410.3L183.6 408.2L184.7 406.2L185.9 404.5L187.3 402.8L188.9 401.4L190.5 400.2L192.3 399.2L194.2 398.5L196.1 397.9L198.2 397.6L200.3 397.6L202.4 397.7L204.6 398.1L206.8 398.8L209 399.6L211.2 400.7L213.3 402L215.4 403.5L217.4 405.2L219.3 407L221.1 409.1L222.8 411.2L224.4 413.5L225.9 416L227.2 418.5L228.4 421.1L229.4 423.8L230.2 426.5L230.9 429.2L231.3 432L231.6 434.7L231.7 437.4Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M213.9 399.3L212.7 398.7L213.3 399L213.3 399ZM215.1 400.1L217.3 401.8L219.3 403.5L220.2 404.4L221 405.2L221 405.2L222 406.7L223 408.4L223.8 410.1L224.4 411.6L224.8 413L224.9 414.2L223.9 412.8L223 411.4L221.9 410.1L220.9 408.8L219.8 407.6L218.7 406.4L217.5 405.3L218.1 405.1L218.3 404.6L217.9 403.7L217.1 402.5L215.9 401.2L214.4 399.9L214.4 399.9L213.3 399.2L212.5 398.7L212.6 398.7L212.7 398.7L212.7 398.7L213.9 399.3Z\"/><path class=\"iso-top\" d=\"M213.3 399.2L212.5 398.7L212.9 398.9L212.9 398.9ZM213.3 399.2L212.5 398.7L212.4 398.7L184.4 406.6L184.2 406.7L184 406.9L183.8 407.1L183.7 407.3L183.7 407.7L183.7 408L184.4 406.7L185.2 405.5L186 404.3L187 403.2L187.9 402.2L189 401.3L190.1 400.5L191.2 399.8L192.4 399.2L193.7 398.6L195 398.2L196.3 397.9L197.7 397.7L199 397.6L200.4 397.6L201.9 397.7L203.3 397.9L204.8 398.2L206.2 398.6L207.7 399.1L209.1 399.7L210.6 400.4L212 401.2L213.4 402.1L214.8 403.1L216.2 404.1L217.5 405.3L218.1 405.1L218.3 404.6L217.9 403.7L217.1 402.5L215.9 401.2L214.4 399.9L214.4 399.9Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M207.1 460.4L208.2 460.7L209.4 460.9L210.5 461.1L211.6 461.2L212.7 461.2L213.9 461.1L214.9 461L216 460.9L217.1 460.6L218.1 460.3L219.1 460L220.1 459.6L221 459.1L221.9 458.5L222.8 457.9L223.7 457.3L224.5 456.6L225.3 455.8L226 455L226.7 454.1L227.4 453.1L228 452.2L228.6 451.1L229.1 450.1L229.6 449L230 447.8L230.4 446.6L230.7 445.4L231 444.1L231.3 442.9L231.4 441.5L231.6 440.2L231.7 438.8L231.7 437.5L231.7 436.1L231.6 434.7L231.5 433.2L231.3 431.8L231.1 430.4L230.8 428.9L230.5 427.5L230.1 426.1L229.7 424.6L229.2 423.2L228.7 421.8L228.1 420.4L227.5 419.1L226.8 417.7L226.1 416.4L225.4 415.1L224.6 413.8L223.8 412.6L223 411.4L222.1 410.2L221.2 409.1L220.2 408L219.2 407L218.2 406L217.2 405L216.2 404.1L215.1 403.3L214 402.5L212.9 401.7L211.8 401.1L210.7 400.4L209.5 399.9L208.4 399.4L207.2 398.9L206.1 398.5L204.9 398.2L203.8 397.9L202.7 397.8L201.5 397.6L200.4 397.6L199.3 397.6L198.2 397.6L197.1 397.8L196.1 398L195 398.2L194 398.5L193 398.9L192 399.4L191.1 399.9L190.2 400.4L189.3 401.1L188.5 401.8L187.7 402.5L186.9 403.3L186.2 404.1L185.5 405L184.9 406L184.3 407L183.7 408\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M224.4 435.1L223.8 429.2L222 423.3L219.1 417.9L215.3 413.2L210.9 409.6L206.2 407.4L201.5 406.7L197.1 407.5L193.4 409.8L190.5 413.4L188.7 418.2L188 423.7L188.7 429.6L190.5 435.4L193.4 440.9L197.1 445.6L201.5 449.1L206.2 451.4L210.9 452.1L215.3 451.3L219.1 449L222 445.3L223.8 440.6Z\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M180.8 420.7L180.9 419.4L180.9 418.8L181 417.4L181.2 416.1L181.4 414.8L181.6 413.6L181.9 412.3L182.2 411.1L182.6 410L183 408.8L183.5 407.7L184 406.7L184.6 405.7L185.2 404.7L185.9 403.8L186.5 402.9L187.3 402.1L188 401.3L188.8 400.6L189.5 400L190.3 399.3L191.2 398.7L192.1 398.2L193 397.6L194 397.2L194.9 396.8L195.9 396.5L197 396.2L198 396L199.1 395.8L200.2 395.8L201.3 395.7L202.4 395.8L203.5 395.9L204.1 395.9L205.2 396.1L206.4 396.3L207.5 396.6L208.6 396.9L209.8 397.3L210.9 397.8L212 398.3L213.1 398.9L214.2 399.5L215.3 400.2L216.4 400.9L217.5 401.7L218.5 402.6L219.6 403.4L220.6 404.4L221.6 405.3L222.5 406.4L223.5 407.4L224.4 408.5L225.2 409.7L226.1 410.8L226.2 411L227 412.2L227.8 413.4L228.5 414.6L229.2 415.9L229.8 417.2L230.4 418.5L231 419.8L231.5 421.2L232 422.5L232.5 423.9L232.8 425.2L233.2 426.6L233.3 426.8L233.6 428.2L233.8 429.7L234.1 431.1L234.2 432.5L234.3 433.9L234.4 435.3L234.4 436.6L234.4 438L234.3 439.3L234.2 440.7L234.1 442L233.8 443.2L233.6 444.5L233.3 445.7L232.9 446.9L232.5 448L232 449.1L231.5 450.2L231 451.2L230.4 452.2L229.8 453.2L229.4 453.7L228.8 454.6L228 455.4L227.3 456.2L226.5 457L225.7 457.7L224.8 458.4L224 458.9L223 459.5L222.1 460L221.1 460.4L220.1 460.7L219.1 461L218.1 461.3L217 461.5L216.2 461.6L215.1 461.7L214 461.7L212.9 461.7L211.8 461.7L210.7 461.5L209.6 461.3L208.4 461.1L207.3 460.8L206.2 460.4L205 460L203.9 459.5L202.8 458.9L201.7 458.3L200.6 457.7L199.5 457L198.4 456.2L197.3 455.4L196.8 455L195.8 454.2L194.8 453.3L193.9 452.4L192.9 451.4L192 450.4L191.1 449.3L190.2 448.2L189.4 447.1L188.6 445.9L187.8 444.7L187 443.5L186.3 442.3L185.7 441L185 439.7L184.5 438.4L183.9 437.1L183.4 435.7L182.9 434.4L182.5 433L182.1 431.6L181.8 430.2L181.5 428.9L181.3 427.5L181.1 426.1L181 424.7L180.9 423.4L180.8 422Z\"/></g><g data-part=\"flyspin\"></g></g><g class=\"it\" data-name=\"frame.beam\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M163.9 251.6L165.1 250.6L172.7 247.2L175 246.6L177.8 246.5L180.3 247L312.9 288.7L314.5 289.5L314.7 290.6L314.7 312.5L313.6 313.5L305.9 316.9L303.7 317.5L300.9 317.6L298.4 317.1L165.8 275.4L164.2 274.6L163.9 273.6Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M314.7 312.5L313.6 313.5L313.6 291.5L314.7 290.6ZM313.6 313.5L305.9 316.9L305.9 294.9L313.6 291.5ZM305.9 316.9L303.7 317.5L303.7 295.5L305.9 294.9Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M303.7 317.5L300.9 317.6L300.9 295.6L303.7 295.5Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M300.9 317.6L298.4 317.1L298.4 295.1L300.9 295.6Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M298.4 317.1L165.8 275.4L165.8 253.4L298.4 295.1ZM165.8 275.4L164.2 274.6L164.2 252.6L165.8 253.4ZM164.2 274.6L163.9 273.6L163.9 251.6L164.2 252.6Z\"/><path class=\"iso-top\" d=\"M312.9 288.7L314.5 289.5L314.7 290.6L313.6 291.5L305.9 294.9L303.7 295.5L300.9 295.6L298.4 295.1L165.8 253.4L164.2 252.6L163.9 251.6L165.1 250.6L172.7 247.2L175 246.6L177.8 246.5L180.3 247Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M314.7 290.6L313.6 291.5L305.9 294.9L303.7 295.5L300.9 295.6L298.4 295.1L165.8 253.4L164.2 252.6L163.9 251.6\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M314.7 290.6L312.6 291.3L305.1 294.6L303.3 295.1L301.1 295.1L299.1 294.8L166.6 253.1L165.3 252.5L163.9 251.6\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M314.7 300.9L314 302.3L305.9 305.9L302.7 306.6L299 306.3L165.8 264.4L163.9 263.2\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M163.9 251.6L165.1 250.6L172.7 247.2L175 246.6L177.8 246.5L180.3 247L312.9 288.7L314.5 289.5L314.7 290.6M314.7 312.5L313.6 313.5L305.9 316.9L303.7 317.5L300.9 317.6L298.4 317.1L165.8 275.4L164.2 274.6L163.9 273.6M314.7 290.6L314.7 312.5M163.9 251.6L163.9 273.6\"/></g></g><g class=\"it\" data-name=\"frame.knobS\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M196.1 251.6L196.1 250.8L197.1 250.1L198.8 249.6L200.8 249.5L202.9 249.6L204.5 250.2L205.4 250.9L205.4 259.7L205.3 260.5L204.4 261.2L202.7 261.6L200.6 261.8L198.6 261.6L196.9 261.1L196.1 260.4Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M204.4 261.2L202.7 261.6L202.7 252.8L204.4 252.4ZM205.4 259.7L205.3 260.5L205.3 251.7L205.4 250.9ZM205.3 260.5L204.4 261.2L204.4 252.4L205.3 251.7Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M202.7 261.6L200.6 261.8L200.6 253L202.7 252.8Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M200.6 261.8L198.6 261.6L198.6 252.8L200.6 253Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M198.6 261.6L196.9 261.1L196.9 252.3L198.6 252.8ZM196.9 261.1L196.1 260.4L196.1 251.6L196.9 252.3Z\"/><path class=\"iso-top\" d=\"M204.4 252.4L202.7 252.8L200.6 253L198.6 252.8L196.9 252.3L196.1 251.6L196.1 250.8L197.1 250.1L198.8 249.6L200.8 249.5L202.9 249.6L204.5 250.2L205.4 250.9L205.3 251.7Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M205.4 250.9L205.3 251.7L204.4 252.4L202.7 252.8L200.6 253L198.6 252.8L196.9 252.3L196.1 251.6\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M196.1 251.6L196.1 250.8L197.1 250.1L198.8 249.6L200.8 249.5L202.9 249.6L204.5 250.2L205.4 250.9M205.4 259.7L205.3 260.5L204.4 261.2L202.7 261.6L200.6 261.8L198.6 261.6L196.9 261.1L196.1 260.4M196.1 251.6L196.1 260.4M205.4 250.9L205.4 259.7\"/></g></g><g class=\"it\" data-name=\"seat.post\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M174.4 238.9L174.6 238.1L175.7 237.3L177.5 236.8L179.8 236.5L182.1 236.6L184.1 237.1L185.5 237.7L186.2 238.6L186.2 252.3L185.9 253.2L184.8 253.9L183 254.5L180.8 254.7L178.5 254.6L176.5 254.2L175 253.5L174.4 252.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M184.8 253.9L183 254.5L183 240.7L184.8 240.2ZM186.2 252.3L185.9 253.2L185.9 239.4L186.2 238.6ZM185.9 253.2L184.8 253.9L184.8 240.2L185.9 239.4Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M183 254.5L180.8 254.7L180.8 241L183 240.7Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M180.8 254.7L178.5 254.6L178.5 240.9L180.8 241ZM178.5 254.6L176.5 254.2L176.5 240.5L178.5 240.9Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M176.5 254.2L175 253.5L175 239.8L176.5 240.5ZM175 253.5L174.4 252.7L174.4 238.9L175 239.8Z\"/><path class=\"iso-top\" d=\"M184.8 240.2L183 240.7L180.8 241L178.5 240.9L176.5 240.5L175 239.8L174.4 238.9L174.6 238.1L175.7 237.3L177.5 236.8L179.8 236.5L182.1 236.6L184.1 237.1L185.5 237.7L186.2 238.6L185.9 239.4Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M186.2 238.6L185.9 239.4L184.8 240.2L183 240.7L180.8 241L178.5 240.9L176.5 240.5L175 239.8L174.4 238.9\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M174.4 238.9L174.6 238.1L175.7 237.3L177.5 236.8L179.8 236.5L182.1 236.6L184.1 237.1L185.5 237.7L186.2 238.6M186.2 252.3L185.9 253.2L184.8 253.9L183 254.5L180.8 254.7L178.5 254.6L176.5 254.2L175 253.5L174.4 252.7M174.4 238.9L174.4 252.7M186.2 238.6L186.2 252.3\"/></g></g><g class=\"it\" data-name=\"seat.clamp\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M172 227.5L172.6 226.6L173.9 225.8L175.9 225.1L178.3 224.7L180.9 224.7L183.4 224.9L185.6 225.4L187.3 226.1L188.3 227L188.6 228L188.6 239L188 239.9L186.6 240.8L184.7 241.4L182.3 241.8L179.7 241.9L177.2 241.6L174.9 241.1L173.2 240.4L172.2 239.5L172 238.5Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M186.6 240.8L184.7 241.4L184.7 230.4L186.6 229.8ZM188.6 239L188 239.9L188 228.9L188.6 228ZM188 239.9L186.6 240.8L186.6 229.8L188 228.9Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M184.7 241.4L182.3 241.8L182.3 230.8L184.7 230.4ZM182.3 241.8L179.7 241.9L179.7 230.9L182.3 230.8Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M179.7 241.9L177.2 241.6L177.2 230.6L179.7 230.9Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M177.2 241.6L174.9 241.1L174.9 230.1L177.2 230.6ZM174.9 241.1L173.2 240.4L173.2 229.4L174.9 230.1ZM173.2 240.4L172.2 239.5L172.2 228.5L173.2 229.4ZM172.2 239.5L172 238.5L172 227.5L172.2 228.5Z\"/><path class=\"iso-top\" d=\"M186.6 229.8L184.7 230.4L182.3 230.8L179.7 230.9L177.2 230.6L174.9 230.1L173.2 229.4L172.2 228.5L172 227.5L172.6 226.6L173.9 225.8L175.9 225.1L178.3 224.7L180.9 224.7L183.4 224.9L185.6 225.4L187.3 226.1L188.3 227L188.6 228L188 228.9Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M188.6 228L188 228.9L186.6 229.8L184.7 230.4L182.3 230.8L179.7 230.9L177.2 230.6L174.9 230.1L173.2 229.4L172.2 228.5L172 227.5\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M172 227.5L172.6 226.6L173.9 225.8L175.9 225.1L178.3 224.7L180.9 224.7L183.4 224.9L185.6 225.4L187.3 226.1L188.3 227L188.6 228M188.6 239L188 239.9L186.6 240.8L184.7 241.4L182.3 241.8L179.7 241.9L177.2 241.6L174.9 241.1L173.2 240.4L172.2 239.5L172 238.5M172 227.5L172 238.5M188.6 228L188.6 239\"/></g></g><g class=\"it\" data-name=\"saddle\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M139.7 215.3L148.5 207.9L166.4 203.3L181.9 206.8L223.1 228.1L228 232.9L228 242.8L214.7 241.8L151.4 230.3L139.7 225.1Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M228 242.8L214.7 241.8L214.7 231.9L228 232.9Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M214.7 241.8L176.6 234.6L176.6 224.7L214.7 231.9ZM176.6 234.6L151.4 230.3L151.4 220.4L176.6 224.7Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M151.4 230.3L139.7 225.1L139.7 215.3L151.4 220.4Z\"/><path class=\"iso-top\" d=\"M166.4 203.3L181.9 206.8L197.6 215.3L223.1 228.1L228 232.9L214.7 231.9L176.6 224.7L151.4 220.4L139.7 215.3L148.5 207.9Z\"/><path class=\"iso-line iso-crease\" data-tone=\"mid\" d=\"M228 232.9L214.7 231.9M214.7 231.9L176.6 224.7M176.6 224.7L151.4 220.4M151.4 230.3L151.4 220.4M151.4 220.4L139.7 215.3\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M139.7 215.3L148.5 207.9L166.4 203.3L181.9 206.8L223.1 228.1L228 232.9L228 242.8L214.7 241.8L151.4 230.3L139.7 225.1Z\"/></g></g><g class=\"it\" data-name=\"stand.front\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M293.2 551L295.8 548.9L387.3 508.1L392.3 506.8L398.4 506.6L404 507.5L413.1 510.4L416.6 512.3L417.1 514.6L417.1 529.4L414.5 531.5L323.1 572.3L318 573.6L311.9 573.8L306.4 572.9L297.3 570L293.7 568.1L293.2 565.8Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M417.1 529.4L414.5 531.5L414.5 516.6L417.1 514.6ZM414.5 531.5L323.1 572.3L323.1 557.5L414.5 516.6ZM323.1 572.3L318 573.6L318 558.8L323.1 557.5Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M318 573.6L311.9 573.8L311.9 559L318 558.8Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M311.9 573.8L306.4 572.9L306.4 558L311.9 559Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M306.4 572.9L297.3 570L297.3 555.2L306.4 558ZM297.3 570L293.7 568.1L293.7 553.3L297.3 555.2ZM293.7 568.1L293.2 565.8L293.2 551L293.7 553.3Z\"/><path class=\"iso-top\" d=\"M413.1 510.4L416.6 512.3L417.1 514.6L414.5 516.6L323.1 557.5L318 558.8L311.9 559L306.4 558L297.3 555.2L293.7 553.3L293.2 551L295.8 548.9L387.3 508.1L392.3 506.8L398.4 506.6L404 507.5Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M417.1 514.6L414.5 516.6L323.1 557.5L318 558.8L311.9 559L306.4 558L297.3 555.2L293.7 553.3L293.2 551\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M417.1 514.6L413.5 516.4L322.3 557.2L317.6 558.4L312.1 558.6L307 557.7L298.1 554.9L294.9 553.1L293.2 551\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M417.2 521.7L323.1 564.9L312.7 566.5L297.3 562.6L293.1 558.7\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M293.2 551L295.8 548.9L387.3 508.1L392.3 506.8L398.4 506.6L404 507.5L413.1 510.4L416.6 512.3L417.1 514.6M417.1 529.4L414.5 531.5L323.1 572.3L318 573.6L311.9 573.8L306.4 572.9L297.3 570L293.7 568.1L293.2 565.8M417.1 514.6L417.1 529.4M293.2 551L293.2 565.8\"/></g></g><g class=\"it\" data-name=\"plugR\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M373.4 263.2L373.6 261.8L374 260.4L374.7 259.2L375.6 258.3L376.5 257.7L377.4 257.7L380.6 258.7L381.4 259L382 259.9L382.3 261L382.3 262.4L382 263.8L381.4 265.1L380.6 266.2L379.7 266.9L378.8 267.3L377.9 267.1L374.7 266.1L374 265.5L373.6 264.5Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M379.5 262.9L379.5 262.9L379.5 262.9L379.5 262.9L379.5 262.9L379.5 262.9L379.5 262.9L379.5 262.9L379.5 262.9L379.5 262.9L379.5 262.9L379.5 262.9L379.5 262.9L379.5 262.9L379.5 262.9L376.6 264.2L376.9 262.3L377.7 260.5L378.8 259.2L380.1 258.6L381.3 258.9L382.1 260L382.3 261.7L382.1 263.6L381.3 265.4L380.1 266.7L378.8 267.2L377.7 267L376.9 265.9L376.6 264.2ZM376.9 265.9L377.7 267L374.5 266L373.7 264.9Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M376.6 264.2L376.9 265.9L373.7 264.9L373.4 263.2Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M381.3 258.9L380.1 258.6L376.9 257.6L378.1 257.9ZM376.9 262.3L376.6 264.2L373.4 263.2L373.7 261.3Z\"/><path class=\"iso-top\" d=\"M380.1 258.6L378.8 259.2L377.7 260.5L376.9 262.3L373.7 261.3L374.5 259.5L375.7 258.2L376.9 257.6Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M380.8 258.7L380 258.7L379.1 259L378.2 259.8L377.5 260.9L376.9 262.1L376.7 263.5L376.6 264.8L376.9 265.9L377.4 266.7L378.1 267.2\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M373.4 263.2L373.6 261.8L374 260.4L374.7 259.2L375.6 258.3L376.5 257.7L377.4 257.7L380.6 258.7L381.4 259L382 259.9L382.3 261L382.3 262.4L382 263.8L381.4 265.1L380.6 266.2L379.7 266.9L378.8 267.3L377.9 267.1L374.7 266.1L374 265.5L373.6 264.5Z\"/></g></g><g class=\"it\" data-name=\"frame.knobB\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M277.8 277.3L277.9 276.5L278.9 275.8L280.5 275.3L282.6 275.2L284.7 275.4L286.3 275.9L287.1 276.6L287.1 285.4L287.1 286.2L286.1 286.9L284.4 287.3L282.4 287.5L280.3 287.3L278.7 286.8L277.8 286.1Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M286.1 286.9L284.4 287.3L284.4 278.6L286.1 278.1ZM287.1 285.4L287.1 286.2L287.1 277.4L287.1 276.6ZM287.1 286.2L286.1 286.9L286.1 278.1L287.1 277.4Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M284.4 287.3L282.4 287.5L282.4 278.7L284.4 278.6Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M282.4 287.5L280.3 287.3L280.3 278.5L282.4 278.7Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M280.3 287.3L278.7 286.8L278.7 278L280.3 278.5ZM278.7 286.8L277.8 286.1L277.8 277.3L278.7 278Z\"/><path class=\"iso-top\" d=\"M286.1 278.1L284.4 278.6L282.4 278.7L280.3 278.5L278.7 278L277.8 277.3L277.9 276.5L278.9 275.8L280.5 275.3L282.6 275.2L284.7 275.4L286.3 275.9L287.1 276.6L287.1 277.4Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M287.1 276.6L287.1 277.4L286.1 278.1L284.4 278.6L282.4 278.7L280.3 278.5L278.7 278L277.8 277.3\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M277.8 277.3L277.9 276.5L278.9 275.8L280.5 275.3L282.6 275.2L284.7 275.4L286.3 275.9L287.1 276.6M287.1 285.4L287.1 286.2L286.1 286.9L284.4 287.3L282.4 287.5L280.3 287.3L278.7 286.8L277.8 286.1M277.8 277.3L277.8 286.1M287.1 276.6L287.1 285.4\"/></g></g><g class=\"it\" data-name=\"dropR:1\" data-route=\"dropR\"><g class=\"tb\"><path class=\"tb-body\" d=\"M394.2 254.3L394.2 255.5L393.9 258.3L393.2 259.7L392.4 260.3L390.6 260.6L388.2 260.8L386 260.9L383.6 260.2L380.6 259.3L378.3 266.6L381.4 267.6L385 268.5L388.6 268.5L391.8 268.2L395.6 267.3L399.2 264.5L401.3 260.4L401.8 256.2L401.9 254.7ZM378.3 266.6L378.8 266.7L379.4 266.6L379.9 266.2L380.5 265.8L381 265.2L381.4 264.4L381.7 263.6L381.9 262.8L382 262L381.9 261.2L381.7 260.5L381.5 259.9L381.1 259.5L380.6 259.3L380.1 259.2L379.6 259.3L379 259.6L378.5 260.1L378 260.7L377.6 261.5L377.3 262.3L377.1 263.1L377 263.9L377 264.7L377.2 265.4L377.5 266L377.9 266.4Z\"/><path class=\"tb-shine\" d=\"M396.2 253.1L396 255.7L395.4 258.7L394.3 260.6L392.9 261.4L390.8 261.9L388.3 262.3L385.8 262.5L383.1 261.9L380.1 261L378.2 260.5L378 260.7L377.6 261.5L377.3 262.1L379.5 262.8L382.5 263.7L385.5 264.3L388.4 264.1L391.1 263.8L393.7 263.1L395.7 261.7L397.2 259.2L397.9 255.8L398 253.2Z\"/><path class=\"tb-shade\" d=\"M398.7 253.2L398.7 255.9L398.6 259.6L397.4 263.1L394.6 265.2L391.4 265.8L388.5 266L385.4 265.7L382.3 264.6L379.3 263.6L377.1 263L377.1 263.1L377 263.9L377 264.6L378.8 265.1L381.8 266.1L385.1 267.3L388.5 267.5L391.7 267.3L395.3 266.6L398.6 264L400 260L400.2 256L400.3 253.3Z\"/><path class=\"iso-line tb-edge\" data-tone=\"lo\" d=\"M394.2 254.3L394.2 255.5L393.9 258.3L393.2 259.7L392.4 260.3L390.6 260.6L388.2 260.8L386 260.9L383.6 260.2L380.6 259.3M401.9 254.7L401.8 256.2L401.3 260.4L399.2 264.5L395.6 267.3L391.8 268.2L388.6 268.5L385 268.5L381.4 267.6L378.3 266.6M380.6 259.3L380.1 259.2L379.6 259.3L379 259.6L378.5 260.1L378 260.7L377.6 261.5L377.3 262.3L377.1 263.1L377 263.9L377 264.7L377.2 265.4L377.5 266L377.9 266.4L378.3 266.6\"/></g></g><g class=\"it\" data-name=\"riser\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M294 299.8L321.3 249.4L330.4 245.3L339.1 253.9L311.9 304.3L302.7 308.4Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M311.9 304.3L302.7 308.4L330 258L339.1 253.9Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M302.7 308.4L294 299.8L321.3 249.4L330 258Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M339.1 253.9L330 258L321.3 249.4L330.4 245.3Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M339.1 253.9L330 258M302.7 308.4L330 258M330 258L321.3 249.4\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M294 299.8L321.3 249.4L330.4 245.3L339.1 253.9L311.9 304.3L302.7 308.4Z\"/></g></g><g class=\"it\" data-name=\"handlebar\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M285.4 267.6L285.5 266.9L285.7 266.2L286 265.7L286.4 265.2L286.9 264.9L374.5 225.8L375.1 225.6L375.7 225.5L376.3 225.7L376.9 225.9L377.5 226.3L378.1 226.9L378.5 227.5L378.9 228.2L379.2 229L379.4 229.7L379.5 230.5L379.4 231.2L379.2 231.9L378.9 232.5L378.5 232.9L378.1 233.3L290.4 272.4L289.8 272.6L289.2 272.6L288.6 272.5L288 272.2L287.4 271.8L286.9 271.3L286.4 270.7L286 270L285.7 269.2L285.5 268.4Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M290.4 272.4L290.9 272.1L291.3 271.6L291.6 271L291.7 270.4L291.8 269.6L291.7 268.9L291.6 268.1L291.3 267.3L378.9 228.2L379.2 229L379.4 229.7L379.5 230.5L379.4 231.2L379.2 231.9L378.9 232.5L378.5 232.9L378.1 233.3Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M291.3 267.3L290.9 266.6L378.5 227.5L378.9 228.2Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M290.9 266.6L290.4 266L378.1 226.9L378.5 227.5ZM288.6 268.6L288.6 268.6L288.6 268.6L288.6 268.6L288.6 268.6L288.6 268.6L288.6 268.6L288.6 268.6L288.6 268.6L288.6 268.6L288.6 268.6L288.6 268.6L288.6 268.6L288.6 268.6L288.6 268.6L288.6 268.6L288.6 268.6L288.6 268.6L288.6 268.6L288.6 268.6L288.6 268.6L288.6 268.6L288.6 268.6L288.6 268.6L288.6 268.6L288.6 268.6L288.6 268.6L288.6 268.6L288.6 268.6L288.6 268.6L288.6 268.6L288.6 268.6L288.6 268.6L291.8 269.6L291.7 270.4L291.6 271L291.3 271.6L290.9 272.1L290.4 272.4L289.8 272.6L289.2 272.6L288.6 272.5L288 272.2L287.4 271.8L286.9 271.3L286.4 270.7L286 270L285.7 269.2L285.5 268.4L285.4 267.6L285.5 266.9L285.7 266.2L286 265.7L286.4 265.2L286.9 264.9L287.4 264.7L288 264.7L288.6 264.8L289.2 265.1L289.8 265.5L290.4 266L290.9 266.6L291.3 267.3L291.6 268.1L291.7 268.9L291.8 269.6Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M290.4 266L289.8 265.5L289.2 265.1L376.9 225.9L377.5 226.3L378.1 226.9Z\"/><path class=\"iso-top\" d=\"M289.2 265.1L288.6 264.8L288 264.7L287.4 264.7L286.9 264.9L374.5 225.8L375.1 225.6L375.7 225.5L376.3 225.7L376.9 225.9Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M290.3 272.4L291.1 271.8L291.7 270.8L291.8 269.5L291.6 268.1L291 266.8L290.1 265.7L289.1 265L288 264.7L286.9 264.9\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M285.4 267.6L285.5 266.9L285.7 266.2L286 265.7L286.4 265.2L286.9 264.9L374.5 225.8L375.1 225.6L375.7 225.5L376.3 225.7L376.9 225.9L377.5 226.3L378.1 226.9L378.5 227.5L378.9 228.2L379.2 229L379.4 229.7L379.5 230.5L379.4 231.2L379.2 231.9L378.9 232.5L378.5 232.9L378.1 233.3L290.4 272.4L289.8 272.6L289.2 272.6L288.6 272.5L288 272.2L287.4 271.8L286.9 271.3L286.4 270.7L286 270L285.7 269.2L285.5 268.4Z\"/></g></g><g class=\"it\" data-name=\"hoodR\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M373.8 222.1L374.2 221.8L380.3 219.1L381 218.9L381.9 218.9L382.8 219L391.8 221.9L392.4 222.1L392.5 222.5L392.5 234.6L392.1 234.9L386 237.6L385.2 237.8L384.3 237.8L383.5 237.7L374.4 234.8L373.8 234.6L373.8 234.2Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M392.5 234.6L392.1 234.9L392.1 222.8L392.5 222.5ZM392.1 234.9L386 237.6L386 225.5L392.1 222.8ZM386 237.6L385.2 237.8L385.2 225.7L386 225.5Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M385.2 237.8L384.3 237.8L384.3 225.7L385.2 225.7Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M384.3 237.8L383.5 237.7L383.5 225.6L384.3 225.7Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M383.5 237.7L374.4 234.8L374.4 222.7L383.5 225.6ZM374.4 234.8L373.8 234.6L373.8 222.5L374.4 222.7ZM373.8 234.6L373.8 234.2L373.8 222.1L373.8 222.5Z\"/><path class=\"iso-top\" d=\"M391.8 221.9L392.4 222.1L392.5 222.5L392.1 222.8L386 225.5L385.2 225.7L384.3 225.7L383.5 225.6L374.4 222.7L373.8 222.5L373.8 222.1L374.2 221.8L380.3 219.1L381 218.9L381.9 218.9L382.8 219Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M392.5 222.5L392.1 222.8L386 225.5L385.2 225.7L384.3 225.7L383.5 225.6L374.4 222.7L373.8 222.5L373.8 222.1\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M392.5 222.5L391.3 222.6L385.4 225.3L384.9 225.4L384.5 225.4L383.9 225.3L375 222.5L374.7 222.3L373.8 222.1\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M373.8 222.1L374.2 221.8L380.3 219.1L381 218.9L381.9 218.9L382.8 219L391.8 221.9L392.4 222.1L392.5 222.5M392.5 234.6L392.1 234.9L386 237.6L385.2 237.8L384.3 237.8L383.5 237.7L374.4 234.8L373.8 234.6L373.8 234.2M392.5 222.5L392.5 234.6M373.8 222.1L373.8 234.2\"/></g></g><g class=\"it\" data-name=\"dropR:0\" data-route=\"dropR\"><g class=\"tb\"><path class=\"tb-body\" d=\"M387.7 233.8L389.7 234.4L391.1 236.2L392.5 239.2L393.8 242.4L394.5 245.5L394.5 248.6L394.3 252.1L394.2 255.5L394 256.8L401.7 257.6L401.8 256.2L402 252.4L402.2 248.8L402.1 244.6L401.2 240.2L399.5 236.1L397.6 232.1L394.3 228.2L390.3 226.6ZM389.8 226.5L389.3 226.6L388.7 226.9L388.2 227.4L387.7 228L387.2 228.7L386.9 229.5L386.7 230.3L386.5 231.1L386.6 231.9L386.7 232.6L386.9 233.2L387.3 233.6L387.7 233.8L388.2 233.9L388.8 233.8L389.3 233.5L389.9 233.1L390.4 232.5L390.8 231.7L391.1 231L391.4 230.1L391.5 229.3L391.5 228.5L391.3 227.8L391.1 227.3L390.7 226.8L390.3 226.6Z\"/><path class=\"tb-shine\" d=\"M389.1 230.1L391.8 231.5L393.5 234.6L394.9 238.2L396.2 241.7L396.6 245.2L396.4 248.7L396.2 252.2L396 255.7L395.6 258.1L397.4 258.5L397.9 255.8L398.1 252.3L398.3 248.7L398.4 245L397.9 241.2L396.6 237.4L395.1 233.7L392.9 230.1L389.7 228.4L387.9 227.7L387.7 228L387.2 228.7L386.9 229.4Z\"/><path class=\"tb-shade\" d=\"M388.3 232.3L391.1 232.5L393.7 234.5L395.7 237.8L397.4 241.3L398.6 245L398.9 248.7L398.8 252.3L398.7 255.9L398.6 258.7L400.1 259L400.2 256L400.3 252.4L400.4 248.7L400.1 244.8L398.9 240.9L397.1 237.2L395 233.7L392 231.3L388.8 230.8L386.7 230.1L386.7 230.3L386.5 231.1L386.6 231.7Z\"/><path class=\"iso-line tb-edge\" data-tone=\"lo\" d=\"M387.7 233.8L389.7 234.4L391.1 236.2L392.5 239.2L393.8 242.4L394.5 245.5L394.5 248.6L394.3 252.1L394.2 255.5L394 256.8M390.3 226.6L394.3 228.2L397.6 232.1L399.5 236.1L401.2 240.2L402.1 244.6L402.2 248.8L402 252.4L401.8 256.2L401.7 257.6M387.7 233.8L387.3 233.6L386.9 233.2L386.7 232.6L386.6 231.9L386.5 231.1L386.7 230.3L386.9 229.5L387.2 228.7L387.7 228L388.2 227.4L388.7 226.9L389.3 226.6L389.8 226.5L390.3 226.6\"/></g></g><g class=\"it\" data-name=\"plugL\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M285.8 302.4L285.9 301L286.4 299.6L287.1 298.3L287.9 297.4L288.9 296.9L289.8 296.8L293 297.8L293.7 298.2L294.3 299L294.6 300.1L294.6 301.5L294.3 302.9L293.7 304.3L293 305.3L292 306.1L291.1 306.4L290.2 306.2L287.1 305.2L286.4 304.6L285.9 303.6Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M291.8 302.1L291.8 302.1L291.8 302.1L291.8 302.1L291.8 302.1L291.8 302.1L291.8 302.1L291.8 302.1L291.8 302.1L291.8 302.1L291.8 302.1L291.8 302.1L291.8 302.1L291.8 302.1L291.8 302.1L288.9 303.4L289.2 301.4L290 299.7L291.2 298.3L292.4 297.8L293.6 298.1L294.4 299.1L294.7 300.8L294.4 302.7L293.6 304.5L292.4 305.8L291.2 306.4L290 306.1L289.2 305L288.9 303.4ZM289.2 305L290 306.1L286.8 305.1L286.1 304Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M288.9 303.4L289.2 305L286.1 304L285.8 302.4Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M293.6 298.1L292.4 297.8L289.3 296.8L290.4 297.1ZM289.2 301.4L288.9 303.4L285.8 302.4L286.1 300.4Z\"/><path class=\"iso-top\" d=\"M292.4 297.8L291.2 298.3L290 299.7L289.2 301.4L286.1 300.4L286.8 298.7L288 297.3L289.3 296.8Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M293.1 297.8L292.3 297.8L291.4 298.2L290.5 298.9L289.8 300L289.3 301.3L289 302.6L289 303.9L289.2 305L289.8 305.9L290.5 306.3\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M285.8 302.4L285.9 301L286.4 299.6L287.1 298.3L287.9 297.4L288.9 296.9L289.8 296.8L293 297.8L293.7 298.2L294.3 299L294.6 300.1L294.6 301.5L294.3 302.9L293.7 304.3L293 305.3L292 306.1L291.1 306.4L290.2 306.2L287.1 305.2L286.4 304.6L285.9 303.6Z\"/></g></g><g class=\"it\" data-name=\"dropL:1\" data-route=\"dropL\"><g class=\"tb\"><path class=\"tb-body\" d=\"M306.5 293.5L306.5 294.7L306.2 297.4L305.6 298.9L304.7 299.4L303 299.7L300.5 300L298.3 300L295.9 299.3L293 298.4L290.7 305.8L293.7 306.7L297.3 307.7L300.9 307.7L304.2 307.3L307.9 306.4L311.6 303.7L313.6 299.5L314.2 295.3L314.2 293.9ZM290.7 305.8L291.2 305.8L291.7 305.7L292.3 305.4L292.8 304.9L293.3 304.3L293.7 303.6L294 302.8L294.2 301.9L294.3 301.1L294.2 300.3L294.1 299.6L293.8 299.1L293.4 298.7L293 298.4L292.4 298.3L291.9 298.5L291.3 298.8L290.8 299.3L290.3 299.9L289.9 300.6L289.6 301.4L289.4 302.2L289.3 303.1L289.4 303.8L289.5 304.5L289.8 305.1L290.2 305.5Z\"/><path class=\"tb-shine\" d=\"M308.5 292.2L308.4 294.8L307.8 297.9L306.6 299.7L305.2 300.6L303.2 301.1L300.6 301.4L298.1 301.7L295.4 301.1L292.4 300.2L290.5 299.6L290.3 299.9L289.9 300.6L289.7 301.3L291.9 301.9L294.9 302.9L297.9 303.5L300.7 303.3L303.5 302.9L306 302.2L308 300.8L309.6 298.4L310.2 295L310.4 292.3Z\"/><path class=\"tb-shade\" d=\"M311.1 292.3L311 295.1L310.9 298.7L309.7 302.2L307 304.4L303.8 304.9L300.8 305.1L297.7 304.9L294.6 303.8L291.6 302.8L289.4 302.1L289.4 302.2L289.3 303.1L289.4 303.7L291.1 304.3L294.2 305.3L297.5 306.4L300.9 306.6L304 306.4L307.6 305.8L310.9 303.2L312.4 299.1L312.6 295.2L312.6 292.4Z\"/><path class=\"iso-line tb-edge\" data-tone=\"lo\" d=\"M306.5 293.5L306.5 294.7L306.2 297.4L305.6 298.9L304.7 299.4L303 299.7L300.5 300L298.3 300L295.9 299.3L293 298.4M314.2 293.9L314.2 295.3L313.6 299.5L311.6 303.7L307.9 306.4L304.2 307.3L300.9 307.7L297.3 307.7L293.7 306.7L290.7 305.8M293 298.4L292.4 298.3L291.9 298.5L291.3 298.8L290.8 299.3L290.3 299.9L289.9 300.6L289.6 301.4L289.4 302.2L289.3 303.1L289.4 303.8L289.5 304.5L289.8 305.1L290.2 305.5L290.7 305.8\"/></g></g><g class=\"it\" data-name=\"hoodL\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M286.1 261.3L286.5 260.9L292.6 258.2L293.3 258L294.3 258L295.1 258.1L304.2 261L304.7 261.3L304.8 261.6L304.8 273.7L304.4 274L298.3 276.8L297.5 277L296.6 277L295.8 276.8L286.7 274L286.2 273.7L286.1 273.4Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M304.8 273.7L304.4 274L304.4 261.9L304.8 261.6ZM304.4 274L298.3 276.8L298.3 264.7L304.4 261.9ZM298.3 276.8L297.5 277L297.5 264.9L298.3 264.7Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M297.5 277L296.6 277L296.6 264.9L297.5 264.9Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M296.6 277L295.8 276.8L295.8 264.7L296.6 264.9Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M295.8 276.8L286.7 274L286.7 261.9L295.8 264.7ZM286.7 274L286.2 273.7L286.2 261.6L286.7 261.9ZM286.2 273.7L286.1 273.4L286.1 261.3L286.2 261.6Z\"/><path class=\"iso-top\" d=\"M304.2 261L304.7 261.3L304.8 261.6L304.4 261.9L298.3 264.7L297.5 264.9L296.6 264.9L295.8 264.7L286.7 261.9L286.2 261.6L286.1 261.3L286.5 260.9L292.6 258.2L293.3 258L294.3 258L295.1 258.1Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M304.8 261.6L304.4 261.9L298.3 264.7L297.5 264.9L296.6 264.9L295.8 264.7L286.7 261.9L286.2 261.6L286.1 261.3\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M304.8 261.6L303.6 261.8L297.7 264.4L297.2 264.5L296.8 264.6L296.3 264.5L287.4 261.7L287 261.5L286.1 261.3\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M286.1 261.3L286.5 260.9L292.6 258.2L293.3 258L294.3 258L295.1 258.1L304.2 261L304.7 261.3L304.8 261.6M304.8 273.7L304.4 274L298.3 276.8L297.5 277L296.6 277L295.8 276.8L286.7 274L286.2 273.7L286.1 273.4M304.8 261.6L304.8 273.7M286.1 261.3L286.1 273.4\"/></g></g><g class=\"it\" data-name=\"dropL:0\" data-route=\"dropL\"><g class=\"tb\"><path class=\"tb-body\" d=\"M300.1 273L302 273.5L303.4 275.3L304.8 278.4L306.2 281.6L306.8 284.6L306.8 287.8L306.6 291.2L306.5 294.7L306.3 295.9L314 296.8L314.2 295.3L314.3 291.6L314.5 287.9L314.4 283.8L313.5 279.3L311.9 275.3L309.9 271.2L306.6 267.3L302.6 265.7ZM302.1 265.6L301.6 265.7L301 266L300.5 266.5L300 267.1L299.6 267.8L299.2 268.6L299 269.4L298.9 270.2L298.9 271L299 271.7L299.3 272.3L299.6 272.7L300.1 273L300.6 273.1L301.1 272.9L301.7 272.7L302.2 272.2L302.7 271.6L303.1 270.9L303.5 270.1L303.7 269.3L303.8 268.4L303.8 267.7L303.7 267L303.4 266.4L303.1 266L302.6 265.7Z\"/><path class=\"tb-shine\" d=\"M301.4 269.3L304.1 270.7L305.9 273.8L307.2 277.3L308.5 280.9L308.9 284.4L308.8 287.8L308.6 291.3L308.4 294.8L307.9 297.2L309.7 297.6L310.2 295L310.4 291.4L310.6 287.8L310.8 284.2L310.3 280.3L308.9 276.6L307.4 272.8L305.2 269.2L302 267.5L300.2 266.9L300 267.1L299.6 267.8L299.3 268.5Z\"/><path class=\"tb-shade\" d=\"M300.6 271.4L303.4 271.7L306.1 273.6L308 277L309.7 280.5L310.9 284.2L311.2 287.8L311.1 291.4L311 295.1L310.9 297.8L312.4 298.1L312.6 295.2L312.7 291.5L312.8 287.9L312.5 284L311.2 280L309.4 276.4L307.4 272.8L304.3 270.4L301.1 270L299 269.2L299 269.4L298.9 270.2L298.9 270.8Z\"/><path class=\"iso-line tb-edge\" data-tone=\"lo\" d=\"M300.1 273L302 273.5L303.4 275.3L304.8 278.4L306.2 281.6L306.8 284.6L306.8 287.8L306.6 291.2L306.5 294.7L306.3 295.9M302.6 265.7L306.6 267.3L309.9 271.2L311.9 275.3L313.5 279.3L314.4 283.8L314.5 287.9L314.3 291.6L314.2 295.3L314 296.8M300.1 273L299.6 272.7L299.3 272.3L299 271.7L298.9 271L298.9 270.2L299 269.4L299.2 268.6L299.6 267.8L300 267.1L300.5 266.5L301 266L301.6 265.7L302.1 265.6L302.6 265.7\"/></g></g><g data-part=\"power\"></g><g data-part=\"runner\"></g><path class=\"iso-halo\" d=\"M488.8 530.4L488.9 526.9L490.8 523.5L494.5 520.3L499.7 517.4L506.4 514.9L514.1 513L522.8 511.7L531.9 511.1L541.2 511.1L550.3 511.9L558.9 513.2L566.5 515.2L573 517.7L578.1 520.6L581.6 523.8L583.3 527.3L583.3 527.5L583.2 531L581.3 534.4L577.6 537.6L572.4 540.5L565.7 542.9L558 544.8L549.3 546.1L540.2 546.8L530.9 546.7L521.8 546L513.2 544.7L505.6 542.7L499.1 540.2L494 537.3L490.5 534.1L488.8 530.6Z\"/><g class=\"as-tablet\" data-name=\"as.tablet\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M416.1 167.6L417.5 167L485.6 142.3L512.2 209.6L510.8 210.2L442.8 234.8Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M442.8 234.8L510.8 210.2L512.2 209.6L444.2 234.2Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M444.2 234.2L512.2 209.6L485.6 142.3L417.5 167Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M416.1 167.6L442.8 234.8L444.2 234.2L417.5 167Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M442.8 234.8L444.2 234.2M444.2 234.2L512.2 209.6M417.5 167L444.2 234.2\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M416.1 167.6L417.5 167L485.6 142.3L512.2 209.6L510.8 210.2L442.8 234.8Z\"/><g transform=\"matrix(2.1329 -0.7716 1.0915 2.7548 421.44 169.32)\"><rect class=\"as-screen\" x=\"0\" y=\"0\" width=\"29.49\" height=\"22.00\" rx=\"0.9\"/><g data-part=\"tablet\"></g><rect class=\"iso-line\" data-tone=\"mid\" fill=\"none\" x=\"0\" y=\"0\" width=\"29.49\" height=\"22.00\" rx=\"0.9\"/></g></g></g><g class=\"mq-wood\" data-name=\"as.handL\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M494.7 175.7L494.8 174.1L495.2 172.6L495.8 171.1L496.6 169.8L497.6 168.6L498.8 167.5L500.2 166.7L501.6 166.1L503.2 165.7L504.8 165.6L506.3 165.7L507.9 166.1L509.3 166.7L510.7 167.5L511.9 168.6L512.9 169.8L513.7 171.1L514.4 172.6L514.7 174.1L514.8 175.7L514.7 177.3L514.4 178.8L513.7 180.3L512.9 181.6L511.9 182.8L510.7 183.8L509.3 184.7L507.9 185.3L506.3 185.6L504.8 185.8L503.2 185.6L501.6 185.3L500.2 184.7L498.8 183.8L497.6 182.8L496.6 181.6L495.8 180.3L495.2 178.8L494.8 177.3Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M494.7 175.7L494.8 174.1L495.2 172.6L495.8 171.1L496.6 169.8L497.6 168.6L498.8 167.5L500.2 166.7L501.6 166.1L503.2 165.7L504.8 165.6L506.3 165.7L507.9 166.1L509.3 166.7L510.7 167.5L511.9 168.6L512.9 169.8L513.7 171.1L514.4 172.6L514.7 174.1L514.8 175.7L514.7 177.3L514.4 178.8L513.7 180.3L512.9 181.6L511.9 182.8L510.7 183.8L509.3 184.7L507.9 185.3L506.3 185.6L504.8 185.8L503.2 185.6L501.6 185.3L500.2 184.7L498.8 183.8L497.6 182.8L496.6 181.6L495.8 180.3L495.2 178.8L494.8 177.3Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M494.7 175.7L494.8 174.1L495.2 172.6L495.8 171.1L496.6 169.8L497.6 168.6L498.8 167.5L500.2 166.7L501.6 166.1L503.2 165.7L504.8 165.6L506.3 165.7L507.9 166.1L509.3 166.7L510.7 167.5L511 167.9L511.1 168.4L511 169L510.7 169.8L510.2 170.7L509.6 171.7L508.8 172.7L507.9 173.8L506.9 174.9L505.8 176L504.7 177L503.5 177.9L502.3 178.8L501.1 179.6L500 180.2L499 180.7L498.1 181L497.3 181.2L496.7 181.2L496.3 181L495.8 180.3L495.2 178.8L494.8 177.3Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M494.7 175.7L494.8 174.1L495.2 172.6L495.8 171.1L496.6 169.8L497.6 168.6L498.8 167.5L500.2 166.7L501.6 166.1L503.2 165.7L504.8 165.6L506.3 165.7L507.9 166.1L508.7 166.4L509 166.8L509.1 167.2L509 167.8L508.7 168.6L508.3 169.4L507.7 170.3L507 171.3L506.2 172.3L505.2 173.3L504.2 174.3L503.2 175.2L502.1 176.1L501 176.9L499.9 177.6L498.9 178.2L497.9 178.6L497.1 178.9L496.4 179.1L495.8 179.1L495.4 178.9L495.1 178.6L494.8 177.3Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M494.7 175.7L494.8 174.1L495.2 172.6L495.8 171.1L496.6 169.8L497.6 168.6L498.8 167.5L500.2 166.7L501.6 166.1L503.2 165.7L504.8 165.6L506.2 165.7L506.5 165.9L506.8 166.1L506.8 166.5L506.8 167.1L506.5 167.7L506.2 168.4L505.7 169.2L505.1 170L504.3 170.9L503.5 171.7L502.6 172.6L501.7 173.4L500.8 174.2L499.8 174.9L498.9 175.5L498 176L497.2 176.4L496.5 176.6L495.8 176.8L495.3 176.8L495 176.6L494.8 176.3Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M494.7 175.7L494.8 174.1L495.2 172.6L495.8 171.1L496.6 169.8L497.6 168.6L498.8 167.5L500.2 166.7L501.6 166.1L503.2 165.7L504.8 165.6L506.3 165.7L507.9 166.1L509.3 166.7L510.7 167.5L511.9 168.6L512.9 169.8L513.7 171.1L514.4 172.6L514.7 174.1L514.8 175.7L514.7 177.3L514.4 178.8L513.7 180.3L512.9 181.6L511.9 182.8L510.7 183.8L509.3 184.7L507.9 185.3L506.3 185.6L504.8 185.8L503.2 185.6L501.6 185.3L500.2 184.7L498.8 183.8L497.6 182.8L496.6 181.6L495.8 180.3L495.2 178.8L494.8 177.3Z\"/></g></g><g class=\"mq-joint\" data-name=\"as.wristL\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M509.6 184L509.7 182.9L509.9 181.8L510.4 180.7L511 179.7L511.7 178.8L512.6 178.1L513.6 177.4L514.7 177L515.8 176.7L517 176.6L518.1 176.7L519.3 177L520.3 177.4L521.3 178.1L522.2 178.8L523 179.7L523.6 180.7L524 181.8L524.3 182.9L524.4 184L524.3 185.2L524 186.3L523.6 187.4L523 188.4L522.2 189.3L521.3 190L520.3 190.7L519.3 191.1L518.1 191.4L517 191.5L515.8 191.4L514.7 191.1L513.6 190.7L512.6 190L511.7 189.3L511 188.4L510.4 187.4L509.9 186.3L509.7 185.2Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M509.6 184L509.7 182.9L509.9 181.8L510.4 180.7L511 179.7L511.7 178.8L512.6 178.1L513.6 177.4L514.7 177L515.8 176.7L517 176.6L518.1 176.7L519.3 177L520.3 177.4L521.3 178.1L522.2 178.8L523 179.7L523.6 180.7L524 181.8L524.3 182.9L524.4 184L524.3 185.2L524 186.3L523.6 187.4L523 188.4L522.2 189.3L521.3 190L520.3 190.7L519.3 191.1L518.1 191.4L517 191.5L515.8 191.4L514.7 191.1L513.6 190.7L512.6 190L511.7 189.3L511 188.4L510.4 187.4L509.9 186.3L509.7 185.2Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M509.6 184L509.7 182.9L509.9 181.8L510.4 180.7L511 179.7L511.7 178.8L512.6 178.1L513.6 177.4L514.7 177L515.8 176.7L517 176.6L518.1 176.7L519.3 177L520.3 177.4L521.3 178.1L521.5 178.3L521.6 178.7L521.5 179.2L521.3 179.7L521 180.4L520.5 181.1L520 181.9L519.3 182.7L518.6 183.5L517.8 184.2L516.9 185L516 185.7L515.2 186.4L514.3 186.9L513.5 187.4L512.7 187.7L512.1 188L511.5 188.1L511.1 188.1L510.7 187.9L510.4 187.4L509.9 186.3L509.7 185.2Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M509.6 184L509.7 182.9L509.9 181.8L510.4 180.7L511 179.7L511.7 178.8L512.6 178.1L513.6 177.4L514.7 177L515.8 176.7L517 176.6L518.1 176.7L519.3 177L519.9 177.3L520.1 177.5L520.2 177.8L520.1 178.3L519.9 178.8L519.6 179.4L519.2 180.1L518.6 180.8L518 181.5L517.3 182.3L516.6 183L515.8 183.7L515 184.4L514.2 184.9L513.4 185.5L512.6 185.9L511.9 186.2L511.3 186.4L510.8 186.5L510.4 186.5L510.1 186.4L509.9 186.2L509.7 185.2Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M509.6 184L509.7 182.9L509.9 181.8L510.4 180.7L511 179.7L511.7 178.8L512.6 178.1L513.6 177.4L514.7 177L515.8 176.7L517 176.6L518 176.7L518.3 176.8L518.4 177L518.5 177.3L518.4 177.7L518.3 178.2L518 178.7L517.7 179.3L517.2 179.9L516.7 180.5L516.1 181.1L515.4 181.8L514.7 182.4L514 183L513.3 183.5L512.7 183.9L512 184.3L511.4 184.6L510.9 184.8L510.4 184.8L510.1 184.8L509.8 184.7L509.6 184.5Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M509.6 184L509.7 182.9L509.9 181.8L510.4 180.7L511 179.7L511.7 178.8L512.6 178.1L513.6 177.4L514.7 177L515.8 176.7L517 176.6L518.1 176.7L519.3 177L520.3 177.4L521.3 178.1L522.2 178.8L523 179.7L523.6 180.7L524 181.8L524.3 182.9L524.4 184L524.3 185.2L524 186.3L523.6 187.4L523 188.4L522.2 189.3L521.3 190L520.3 190.7L519.3 191.1L518.1 191.4L517 191.5L515.8 191.4L514.7 191.1L513.6 190.7L512.6 190L511.7 189.3L511 188.4L510.4 187.4L509.9 186.3L509.7 185.2Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.foreL\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M515.4 189.5L515.5 188.8L515.6 188.1L515.8 187.3L516.2 186.4L516.6 185.6L517.1 184.7L517.7 183.9L518.3 183.1L519 182.4L519.6 181.8L520.3 181.3L520.9 180.9L521.6 180.6L522.1 180.5L522.6 180.5L523.1 180.7L572.7 211.1L573.2 211.5L573.5 212.1L573.7 212.9L573.8 213.8L573.6 214.9L573.4 216L572.9 217.3L572.4 218.5L571.7 219.8L570.9 221L570 222.2L569.1 223.3L568.1 224.3L567.1 225.1L566.1 225.8L565.2 226.3L564.3 226.6L563.5 226.6L562.8 226.5L562.3 226.2L516 190.9L515.7 190.6L515.5 190.1Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M567.6 218.7L567.6 218.7L567.6 218.7L567.6 218.7L567.6 218.7L567.6 218.7L567.6 218.7L567.6 218.7L567.6 218.7L567.6 218.7L567.6 218.7L567.6 218.7L567.6 218.7L567.6 218.7L567.6 218.7L567.6 218.7L567.6 218.7L567.6 218.7L567.6 218.7L567.6 218.7L567.6 218.7L567.6 218.7L567.6 218.7L567.6 218.7L567.6 218.7L567.6 218.7L567.6 218.7L567.6 218.7L567.6 218.7L567.6 218.7L567.6 218.7L567.6 218.7L567.6 218.7L573.4 216L572.8 217.5L572.1 219.1L571.2 220.6L570.1 222.1L569 223.4L567.8 224.6L566.6 225.5L565.4 226.2L564.3 226.5L563.4 226.6L562.6 226.4L562 225.9L561.6 225.1L561.4 224L561.5 222.8L561.8 221.4L562.4 219.9L563.1 218.3L564 216.8L565.1 215.3L566.2 214L567.4 212.9L568.6 211.9L569.8 211.3L570.9 210.9L571.8 210.8L572.6 211L573.2 211.6L573.6 212.3L573.8 213.4L573.7 214.6L573.4 216ZM561.6 225.1L562 225.9L562.6 226.4L516.2 191.1L515.8 190.7L515.5 190.2Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M561.4 224L561.6 225.1L515.5 190.2L515.4 189.5Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M572.6 211L571.8 210.8L522.5 180.5L523 180.7ZM561.8 221.4L561.5 222.8L561.4 224L515.4 189.5L515.5 188.6L515.7 187.7Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M571.8 210.8L570.9 210.9L569.8 211.3L521.1 180.8L521.8 180.6L522.5 180.5ZM563.1 218.3L562.4 219.9L561.8 221.4L515.7 187.7L516.1 186.7L516.6 185.6Z\"/><path class=\"iso-top\" d=\"M569.8 211.3L568.6 211.9L567.4 212.9L566.2 214L565.1 215.3L564 216.8L563.1 218.3L516.6 185.6L517.2 184.6L517.9 183.6L518.7 182.7L519.5 181.9L520.3 181.3L521.1 180.8Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M572.7 211.1L572.1 210.8L571.3 210.8L570.5 211L569.6 211.4L568.6 212L567.6 212.7L566.6 213.6L565.6 214.7L564.7 215.8L563.9 217.1L563.1 218.3L562.5 219.6L562 220.9L561.7 222.1L561.5 223.2L561.4 224.2L561.6 225.1L561.9 225.8L562.3 226.2\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M515.4 189.5L515.5 188.8L515.6 188.1L515.8 187.3L516.2 186.4L516.6 185.6L517.1 184.7L517.7 183.9L518.3 183.1L519 182.4L519.6 181.8L520.3 181.3L520.9 180.9L521.6 180.6L522.1 180.5L522.6 180.5L523.1 180.7L572.7 211.1L573.2 211.5L573.5 212.1L573.7 212.9L573.8 213.8L573.6 214.9L573.4 216L572.9 217.3L572.4 218.5L571.7 219.8L570.9 221L570 222.2L569.1 223.3L568.1 224.3L567.1 225.1L566.1 225.8L565.2 226.3L564.3 226.6L563.5 226.6L562.8 226.5L562.3 226.2L516 190.9L515.7 190.6L515.5 190.1Z\"/></g></g><g class=\"mq-joint\" data-name=\"as.elbowL\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M561.2 221.4L561.3 219.8L561.7 218.2L562.3 216.7L563.2 215.3L564.2 214.1L565.5 213L566.8 212.2L568.4 211.6L569.9 211.2L571.6 211.1L573.2 211.2L574.8 211.6L576.3 212.2L577.7 213L578.9 214.1L580 215.3L580.8 216.7L581.4 218.2L581.8 219.8L581.9 221.4L581.8 223.1L581.4 224.6L580.8 226.1L580 227.5L578.9 228.8L577.7 229.8L576.3 230.7L574.8 231.3L573.2 231.7L571.6 231.8L569.9 231.7L568.4 231.3L566.8 230.7L565.5 229.8L564.2 228.8L563.2 227.5L562.3 226.1L561.7 224.6L561.3 223.1Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M561.2 221.4L561.3 219.8L561.7 218.2L562.3 216.7L563.2 215.3L564.2 214.1L565.5 213L566.8 212.2L568.4 211.6L569.9 211.2L571.6 211.1L573.2 211.2L574.8 211.6L576.3 212.2L577.7 213L578.9 214.1L580 215.3L580.8 216.7L581.4 218.2L581.8 219.8L581.9 221.4L581.8 223.1L581.4 224.6L580.8 226.1L580 227.5L578.9 228.8L577.7 229.8L576.3 230.7L574.8 231.3L573.2 231.7L571.6 231.8L569.9 231.7L568.4 231.3L566.8 230.7L565.5 229.8L564.2 228.8L563.2 227.5L562.3 226.1L561.7 224.6L561.3 223.1Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M561.2 221.4L561.3 219.8L561.7 218.2L562.3 216.7L563.2 215.3L564.2 214.1L565.5 213L566.8 212.2L568.4 211.6L569.9 211.2L571.6 211.1L573.2 211.2L574.8 211.6L576.3 212.2L577.7 213L577.9 213.4L578 213.9L577.9 214.6L577.7 215.4L577.2 216.3L576.5 217.3L575.8 218.4L574.8 219.5L573.8 220.6L572.6 221.7L571.5 222.8L570.2 223.8L569 224.7L567.8 225.4L566.7 226.1L565.6 226.6L564.7 226.9L563.9 227.1L563.3 227.1L562.8 226.9L562.3 226.1L561.7 224.6L561.3 223.1Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M561.2 221.4L561.3 219.8L561.7 218.2L562.3 216.7L563.2 215.3L564.2 214.1L565.5 213L566.8 212.2L568.4 211.6L569.9 211.2L571.6 211.1L573.2 211.2L574.8 211.6L575.6 211.9L575.9 212.3L576 212.7L575.9 213.4L575.6 214.1L575.2 214.9L574.6 215.9L573.9 216.9L573 217.9L572.1 218.9L571 220L569.9 220.9L568.8 221.9L567.6 222.7L566.5 223.4L565.5 224L564.5 224.5L563.7 224.8L562.9 224.9L562.3 224.9L561.9 224.7L561.6 224.4L561.3 223.1Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M561.2 221.4L561.3 219.8L561.7 218.2L562.3 216.7L563.2 215.3L564.2 214.1L565.5 213L566.8 212.2L568.4 211.6L569.9 211.2L571.6 211.1L573 211.2L573.4 211.3L573.6 211.6L573.7 212L573.6 212.5L573.4 213.2L573 213.9L572.5 214.7L571.9 215.6L571.1 216.5L570.3 217.4L569.4 218.3L568.4 219.1L567.4 219.9L566.5 220.6L565.5 221.2L564.6 221.8L563.8 222.2L563 222.4L562.4 222.5L561.9 222.5L561.5 222.4L561.3 222.1Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M561.2 221.4L561.3 219.8L561.7 218.2L562.3 216.7L563.2 215.3L564.2 214.1L565.5 213L566.8 212.2L568.4 211.6L569.9 211.2L571.6 211.1L573.2 211.2L574.8 211.6L576.3 212.2L577.7 213L578.9 214.1L580 215.3L580.8 216.7L581.4 218.2L581.8 219.8L581.9 221.4L581.8 223.1L581.4 224.6L580.8 226.1L580 227.5L578.9 228.8L577.7 229.8L576.3 230.7L574.8 231.3L573.2 231.7L571.6 231.8L569.9 231.7L568.4 231.3L566.8 230.7L565.5 229.8L564.2 228.8L563.2 227.5L562.3 226.1L561.7 224.6L561.3 223.1Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.upperL\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M558 145.2L558.1 144.4L558.4 143.7L558.9 143.1L559.6 142.4L560.4 141.8L561.4 141.2L562.5 140.8L563.7 140.3L565.1 140L566.5 139.7L567.9 139.5L569.4 139.5L570.9 139.5L572.3 139.6L573.7 139.8L575.1 140L576.3 140.4L577.5 140.8L578.5 141.3L579.3 141.9L580 142.5L580.6 143.2L580.9 143.8L581.1 144.6L579.7 216.4L579.7 216.9L579.5 217.4L579.3 217.9L578.8 218.4L578.3 218.9L577.6 219.3L576.9 219.7L576 220L575.1 220.3L574.1 220.5L573.1 220.6L572.1 220.7L571 220.8L569.9 220.7L568.9 220.6L567.9 220.5L567 220.2L566.1 219.9L565.4 219.6L564.7 219.2L564.1 218.8L563.7 218.3L563.4 217.9L563.2 217.4L563.1 216.8Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M568.3 150.6L570.6 150.6L572.8 150.3L574.9 149.9L576.8 149.2L578.4 148.4L579.7 147.5L580.6 146.5L581 145.4L579.7 217L579.4 217.8L578.7 218.5L577.8 219.2L576.7 219.8L575.3 220.2L573.8 220.5L572.2 220.7L570.6 220.8Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M564 150.1L566.1 150.4L568.3 150.6L570.6 220.8L569 220.6L567.5 220.4Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M560.5 148.7L562.1 149.5L564 150.1L567.5 220.4L566.1 219.9L565 219.4Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M558 145.8L558.4 146.8L559.3 147.8L560.5 148.7L565 219.4L564.1 218.8L563.5 218.1L563.2 217.3Z\"/><path class=\"iso-top\" d=\"M569.5 145L569.5 145L569.5 145L569.5 145L569.5 145L569.5 145L569.5 145L569.5 145L569.5 145L569.5 145L569.5 145L569.5 145L569.5 145L569.5 145L569.5 145L569.5 145L569.5 145L569.5 145L569.5 145L569.5 145L569.5 145L569.5 145L569.5 145L569.5 145L569.5 145L569.5 145L569.5 145L569.5 145L569.5 145L569.5 145L569.5 145L569.5 145L569.5 145L562.1 149.5L560.5 148.7L559.3 147.8L558.4 146.8L558 145.8L558 144.7L558.5 143.6L559.4 142.6L560.6 141.7L562.2 140.9L564.1 140.2L566.2 139.8L568.5 139.5L570.7 139.5L572.9 139.6L575 140L576.9 140.6L578.5 141.3L579.8 142.2L580.6 143.2L581 144.3L581 145.4L580.6 146.5L579.7 147.5L578.4 148.4L576.8 149.2L574.9 149.9L572.8 150.3L570.6 150.6L568.3 150.6L566.1 150.4L564 150.1L562.1 149.5Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M558 145.5L558.1 146.2L558.5 146.9L559 147.5L559.7 148.2L560.5 148.7L561.5 149.2L562.7 149.7L563.9 150L565.3 150.3L566.7 150.5L568.2 150.6L569.7 150.6L571.2 150.5L572.6 150.3L574 150.1L575.4 149.7L576.6 149.3L577.7 148.8L578.7 148.2L579.5 147.6L580.2 147L580.7 146.3L581 145.6L581.1 144.9\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M558 145.2L558.1 144.4L558.4 143.7L558.9 143.1L559.6 142.4L560.4 141.8L561.4 141.2L562.5 140.8L563.7 140.3L565.1 140L566.5 139.7L567.9 139.5L569.4 139.5L570.9 139.5L572.3 139.6L573.7 139.8L575.1 140L576.3 140.4L577.5 140.8L578.5 141.3L579.3 141.9L580 142.5L580.6 143.2L580.9 143.8L581.1 144.6L579.7 216.4L579.7 216.9L579.5 217.4L579.3 217.9L578.8 218.4L578.3 218.9L577.6 219.3L576.9 219.7L576 220L575.1 220.3L574.1 220.5L573.1 220.6L572.1 220.7L571 220.8L569.9 220.7L568.9 220.6L567.9 220.5L567 220.2L566.1 219.9L565.4 219.6L564.7 219.2L564.1 218.8L563.7 218.3L563.4 217.9L563.2 217.4L563.1 216.8Z\"/></g></g><g class=\"mq-joint\" data-name=\"as.shoulderL\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M555.7 139.3L555.9 137.2L556.4 135.1L557.2 133.1L558.3 131.3L559.7 129.7L561.4 128.3L563.2 127.2L565.2 126.4L567.2 125.9L569.4 125.7L571.5 125.9L573.6 126.4L575.6 127.2L577.4 128.3L579 129.7L580.4 131.3L581.5 133.1L582.3 135.1L582.8 137.2L583 139.3L582.8 141.5L582.3 143.5L581.5 145.5L580.4 147.3L579 149L577.4 150.4L575.6 151.5L573.6 152.3L571.5 152.8L569.4 153L567.2 152.8L565.2 152.3L563.2 151.5L561.4 150.4L559.7 149L558.3 147.3L557.2 145.5L556.4 143.5L555.9 141.5Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M555.7 139.3L555.9 137.2L556.4 135.1L557.2 133.1L558.3 131.3L559.7 129.7L561.4 128.3L563.2 127.2L565.2 126.4L567.2 125.9L569.4 125.7L571.5 125.9L573.6 126.4L575.6 127.2L577.4 128.3L579 129.7L580.4 131.3L581.5 133.1L582.3 135.1L582.8 137.2L583 139.3L582.8 141.5L582.3 143.5L581.5 145.5L580.4 147.3L579 149L577.4 150.4L575.6 151.5L573.6 152.3L571.5 152.8L569.4 153L567.2 152.8L565.2 152.3L563.2 151.5L561.4 150.4L559.7 149L558.3 147.3L557.2 145.5L556.4 143.5L555.9 141.5Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M555.7 139.3L555.9 137.2L556.4 135.1L557.2 133.1L558.3 131.3L559.7 129.7L561.4 128.3L563.2 127.2L565.2 126.4L567.2 125.9L569.4 125.7L571.5 125.9L573.6 126.4L575.6 127.2L577.4 128.3L577.8 128.8L577.9 129.4L577.8 130.3L577.4 131.4L576.8 132.6L575.9 133.9L574.9 135.3L573.7 136.8L572.3 138.2L570.8 139.7L569.2 141.1L567.6 142.4L566 143.6L564.4 144.6L563 145.4L561.6 146.1L560.4 146.5L559.3 146.7L558.5 146.7L557.9 146.5L557.2 145.5L556.4 143.5L555.9 141.5Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M555.7 139.3L555.9 137.2L556.4 135.1L557.2 133.1L558.3 131.3L559.7 129.7L561.4 128.3L563.2 127.2L565.2 126.4L567.2 125.9L569.4 125.7L571.5 125.9L573.6 126.4L574.7 126.8L575.1 127.3L575.2 127.9L575.1 128.7L574.7 129.7L574.2 130.8L573.4 132L572.4 133.3L571.3 134.7L570 136L568.6 137.4L567.2 138.7L565.7 139.9L564.2 141L562.8 141.9L561.4 142.7L560.1 143.3L559 143.7L558 143.9L557.2 143.9L556.7 143.7L556.3 143.2L555.9 141.5Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M555.7 139.3L555.9 137.2L556.4 135.1L557.2 133.1L558.3 131.3L559.7 129.7L561.4 128.3L563.2 127.2L565.2 126.4L567.2 125.9L569.4 125.7L571.3 125.8L571.8 126L572.1 126.4L572.2 126.9L572.1 127.7L571.8 128.5L571.3 129.5L570.6 130.5L569.8 131.6L568.8 132.8L567.7 134L566.5 135.2L565.2 136.3L564 137.3L562.7 138.3L561.4 139.1L560.2 139.8L559.1 140.3L558.1 140.6L557.3 140.8L556.6 140.8L556.1 140.6L555.8 140.2Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M555.7 139.3L555.9 137.2L556.4 135.1L557.2 133.1L558.3 131.3L559.7 129.7L561.4 128.3L563.2 127.2L565.2 126.4L567.2 125.9L569.4 125.7L571.5 125.9L573.6 126.4L575.6 127.2L577.4 128.3L579 129.7L580.4 131.3L581.5 133.1L582.3 135.1L582.8 137.2L583 139.3L582.8 141.5L582.3 143.5L581.5 145.5L580.4 147.3L579 149L577.4 150.4L575.6 151.5L573.6 152.3L571.5 152.8L569.4 153L567.2 152.8L565.2 152.3L563.2 151.5L561.4 150.4L559.7 149L558.3 147.3L557.2 145.5L556.4 143.5L555.9 141.5Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.toeL\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M511.8 505.3L514.3 502.5L529.6 496.9L540.2 498.8L540.2 508.1L524.9 513.7L515.1 509.9Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M524.9 504.4L524.9 513.7L540.2 508.1L540.2 498.8Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M524.9 513.7L515.1 509.9L511.8 505.3L514.3 502.5L524.9 504.4Z\"/><path class=\"iso-top\" d=\"M514.3 502.5L524.9 504.4L540.2 498.8L529.6 496.9Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M514.3 502.5L524.9 504.4M524.9 504.4L540.2 498.8M524.9 504.4L524.9 513.7\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M511.8 505.3L514.3 502.5L529.6 496.9L540.2 498.8L540.2 508.1L524.9 513.7L515.1 509.9Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.footL\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M525.1 510.3L527.1 502.8L543.3 496.9L564.3 501.7L574.6 506.2L580.8 511.5L581.4 519.4L580 523.3L563.8 529.1L526.3 514.6Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M564.6 517.3L565.2 525.3L581.4 519.4L580.8 511.5ZM565.2 525.3L563.8 529.1L580 523.3L581.4 519.4Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M558.4 512.1L564.6 517.3L580.8 511.5L574.6 506.2ZM563.8 529.1L526.3 514.6L525.1 510.3L527.1 502.8L548.1 507.6L558.4 512.1L564.6 517.3L565.2 525.3Z\"/><path class=\"iso-top\" d=\"M527.1 502.8L548.1 507.6L564.3 501.7L543.3 496.9ZM548.1 507.6L558.4 512.1L574.6 506.2L564.3 501.7Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M527.1 502.8L548.1 507.6M548.1 507.6L558.4 512.1M558.4 512.1L564.6 517.3M564.6 517.3L580.8 511.5M564.6 517.3L565.2 525.3M565.2 525.3L581.4 519.4M565.2 525.3L563.8 529.1\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M525.1 510.3L527.1 502.8L543.3 496.9L564.3 501.7L574.6 506.2L580.8 511.5L581.4 519.4L580 523.3L563.8 529.1L526.3 514.6Z\"/></g></g><g class=\"mq-joint\" data-name=\"as.ankleL\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M551.7 503.9L551.9 502.4L552.2 500.9L552.8 499.5L553.6 498.2L554.6 497L555.8 496L557.1 495.2L558.5 494.6L560 494.3L561.5 494.2L563.1 494.3L564.6 494.6L566 495.2L567.3 496L568.5 497L569.5 498.2L570.3 499.5L570.8 500.9L571.2 502.4L571.3 503.9L571.2 505.5L570.8 507L570.3 508.4L569.5 509.7L568.5 510.9L567.3 511.9L566 512.7L564.6 513.3L563.1 513.6L561.5 513.7L560 513.6L558.5 513.3L557.1 512.7L555.8 511.9L554.6 510.9L553.6 509.7L552.8 508.4L552.2 507L551.9 505.5Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M551.7 503.9L551.9 502.4L552.2 500.9L552.8 499.5L553.6 498.2L554.6 497L555.8 496L557.1 495.2L558.5 494.6L560 494.3L561.5 494.2L563.1 494.3L564.6 494.6L566 495.2L567.3 496L568.5 497L569.5 498.2L570.3 499.5L570.8 500.9L571.2 502.4L571.3 503.9L571.2 505.5L570.8 507L570.3 508.4L569.5 509.7L568.5 510.9L567.3 511.9L566 512.7L564.6 513.3L563.1 513.6L561.5 513.7L560 513.6L558.5 513.3L557.1 512.7L555.8 511.9L554.6 510.9L553.6 509.7L552.8 508.4L552.2 507L551.9 505.5Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M551.7 503.9L551.9 502.4L552.2 500.9L552.8 499.5L553.6 498.2L554.6 497L555.8 496L557.1 495.2L558.5 494.6L560 494.3L561.5 494.2L563.1 494.3L564.6 494.6L566 495.2L567.3 496L567.6 496.4L567.6 496.9L567.6 497.5L567.3 498.3L566.8 499.1L566.2 500.1L565.5 501.1L564.6 502.1L563.6 503.2L562.6 504.2L561.4 505.2L560.3 506.1L559.1 507L558 507.7L556.9 508.3L556 508.8L555.1 509.1L554.3 509.3L553.7 509.3L553.3 509.1L552.8 508.4L552.2 507L551.9 505.5Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M551.7 503.9L551.9 502.4L552.2 500.9L552.8 499.5L553.6 498.2L554.6 497L555.8 496L557.1 495.2L558.5 494.6L560 494.3L561.5 494.2L563.1 494.3L564.6 494.6L565.4 495L565.6 495.3L565.7 495.8L565.6 496.3L565.4 497L565 497.8L564.4 498.7L563.7 499.6L562.9 500.6L562 501.6L561 502.6L560 503.5L558.9 504.3L557.8 505.1L556.8 505.8L555.8 506.4L554.9 506.8L554.1 507.1L553.4 507.2L552.8 507.2L552.4 507.1L552.2 506.7L551.9 505.5Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M551.7 503.9L551.9 502.4L552.2 500.9L552.8 499.5L553.6 498.2L554.6 497L555.8 496L557.1 495.2L558.5 494.6L560 494.3L561.5 494.2L562.9 494.3L563.3 494.4L563.5 494.7L563.5 495.1L563.5 495.6L563.3 496.2L562.9 496.9L562.4 497.6L561.8 498.4L561.1 499.3L560.3 500.1L559.5 501L558.6 501.8L557.7 502.5L556.7 503.2L555.8 503.8L555 504.3L554.2 504.6L553.5 504.9L552.9 505L552.4 505L552 504.9L551.8 504.6Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M551.7 503.9L551.9 502.4L552.2 500.9L552.8 499.5L553.6 498.2L554.6 497L555.8 496L557.1 495.2L558.5 494.6L560 494.3L561.5 494.2L563.1 494.3L564.6 494.6L566 495.2L567.3 496L568.5 497L569.5 498.2L570.3 499.5L570.8 500.9L571.2 502.4L571.3 503.9L571.2 505.5L570.8 507L570.3 508.4L569.5 509.7L568.5 510.9L567.3 511.9L566 512.7L564.6 513.3L563.1 513.6L561.5 513.7L560 513.6L558.5 513.3L557.1 512.7L555.8 511.9L554.6 510.9L553.6 509.7L552.8 508.4L552.2 507L551.9 505.5Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.shankL\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M528.8 394.5L528.9 394.1L529.1 393.7L529.5 393.3L530.1 392.9L530.8 392.4L531.6 392L532.5 391.5L533.6 391.1L534.8 390.7L536 390.3L537.3 389.9L538.7 389.6L540.1 389.3L541.6 389L543 388.8L544.5 388.6L545.9 388.4L547.3 388.3L548.6 388.3L549.9 388.3L551 388.3L552.1 388.4L553 388.5L553.8 388.7L554.5 389L555 389.2L555.4 389.5L555.6 389.8L555.7 390.2L568.5 497.6L568.5 497.8L568.4 498.1L568.1 498.3L567.8 498.6L567.4 498.8L566.9 499.1L566.4 499.3L565.7 499.6L565 499.8L564.3 500.1L563.5 500.3L562.7 500.5L561.9 500.7L561 500.8L560.2 501L559.3 501.1L558.5 501.2L557.7 501.2L556.9 501.2L556.2 501.2L555.5 501.2L554.9 501.2L554.3 501.1L553.9 501L553.5 500.9L553.2 500.7L552.9 500.5L552.8 500.3L528.9 394.9Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M543.3 395.6L545.9 395.1L548.3 394.5L550.5 393.7L552.4 393L554 392.2L555 391.4L555.6 390.6L555.7 389.9L568.5 497.4L568.5 497.8L568.2 498.3L567.5 498.7L566.6 499.2L565.5 499.7L564.2 500.1L562.8 500.5L561.2 500.8Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M538 396.3L540.6 396L543.3 395.6L561.2 500.8L559.7 501L558.2 501.2Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M531.7 396.2L533.5 396.4L535.6 396.4L538 396.3L558.2 501.2L556.8 501.2L555.5 501.2L554.4 501.1Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M528.8 394.8L529.3 395.4L530.2 395.9L531.7 396.2L554.4 501.1L553.6 500.9L553 500.6L552.8 500.3Z\"/><path class=\"iso-top\" d=\"M542.2 392.4L542.2 392.4L542.2 392.4L542.2 392.4L542.2 392.4L542.2 392.4L542.2 392.4L542.2 392.4L542.2 392.4L542.2 392.4L542.2 392.4L542.2 392.4L542.2 392.4L542.2 392.4L542.2 392.4L542.2 392.4L542.2 392.4L542.2 392.4L542.2 392.4L542.2 392.4L542.2 392.4L542.2 392.4L542.2 392.4L542.2 392.4L542.2 392.4L542.2 392.4L542.2 392.4L542.2 392.4L542.2 392.4L542.2 392.4L542.2 392.4L542.2 392.4L542.2 392.4L533.5 396.4L531.7 396.2L530.2 395.9L529.3 395.4L528.8 394.8L528.9 394.1L529.5 393.4L530.5 392.6L532 391.8L533.9 391L536.2 390.3L538.6 389.6L541.2 389.1L543.9 388.7L546.4 388.4L548.8 388.3L551 388.3L552.8 388.5L554.2 388.9L555.2 389.3L555.7 389.9L555.6 390.6L555 391.4L554 392.2L552.4 393L550.5 393.7L548.3 394.5L545.9 395.1L543.3 395.6L540.6 396L538 396.3L535.6 396.4L533.5 396.4Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M528.8 394.7L529 395.1L529.3 395.4L529.7 395.7L530.3 395.9L531.1 396.1L532 396.3L532.9 396.4L534 396.4L535.2 396.4L536.5 396.4L537.8 396.3L539.2 396.2L540.7 396L542.1 395.8L543.5 395.6L545 395.3L546.4 395L547.7 394.6L549 394.3L550.2 393.9L551.3 393.4L552.3 393L553.2 392.6L554 392.1L554.6 391.7L555.1 391.3L555.5 390.9L555.7 390.5L555.7 390.1\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M528.8 394.5L528.9 394.1L529.1 393.7L529.5 393.3L530.1 392.9L530.8 392.4L531.6 392L532.5 391.5L533.6 391.1L534.8 390.7L536 390.3L537.3 389.9L538.7 389.6L540.1 389.3L541.6 389L543 388.8L544.5 388.6L545.9 388.4L547.3 388.3L548.6 388.3L549.9 388.3L551 388.3L552.1 388.4L553 388.5L553.8 388.7L554.5 389L555 389.2L555.4 389.5L555.6 389.8L555.7 390.2L568.5 497.6L568.5 497.8L568.4 498.1L568.1 498.3L567.8 498.6L567.4 498.8L566.9 499.1L566.4 499.3L565.7 499.6L565 499.8L564.3 500.1L563.5 500.3L562.7 500.5L561.9 500.7L561 500.8L560.2 501L559.3 501.1L558.5 501.2L557.7 501.2L556.9 501.2L556.2 501.2L555.5 501.2L554.9 501.2L554.3 501.1L553.9 501L553.5 500.9L553.2 500.7L552.9 500.5L552.8 500.3L528.9 394.9Z\"/></g></g><g class=\"mq-joint\" data-name=\"as.kneeL\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M527.1 385.6L527.3 383.4L527.8 381.3L528.7 379.2L529.8 377.4L531.2 375.7L532.9 374.3L534.7 373.2L536.8 372.3L538.9 371.8L541.1 371.6L543.2 371.8L545.4 372.3L547.4 373.2L549.3 374.3L550.9 375.7L552.3 377.4L553.5 379.2L554.3 381.3L554.8 383.4L555 385.6L554.8 387.8L554.3 389.9L553.5 391.9L552.3 393.8L550.9 395.4L549.3 396.8L547.4 398L545.4 398.8L543.2 399.3L541.1 399.5L538.9 399.3L536.8 398.8L534.7 398L532.9 396.8L531.2 395.4L529.8 393.8L528.7 391.9L527.8 389.9L527.3 387.8Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M527.1 385.6L527.3 383.4L527.8 381.3L528.7 379.2L529.8 377.4L531.2 375.7L532.9 374.3L534.7 373.2L536.8 372.3L538.9 371.8L541.1 371.6L543.2 371.8L545.4 372.3L547.4 373.2L549.3 374.3L550.9 375.7L552.3 377.4L553.5 379.2L554.3 381.3L554.8 383.4L555 385.6L554.8 387.8L554.3 389.9L553.5 391.9L552.3 393.8L550.9 395.4L549.3 396.8L547.4 398L545.4 398.8L543.2 399.3L541.1 399.5L538.9 399.3L536.8 398.8L534.7 398L532.9 396.8L531.2 395.4L529.8 393.8L528.7 391.9L527.8 389.9L527.3 387.8Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M527.1 385.6L527.3 383.4L527.8 381.3L528.7 379.2L529.8 377.4L531.2 375.7L532.9 374.3L534.7 373.2L536.8 372.3L538.9 371.8L541.1 371.6L543.2 371.8L545.4 372.3L547.4 373.2L549.3 374.3L549.6 374.8L549.8 375.5L549.6 376.4L549.3 377.5L548.6 378.7L547.8 380L546.7 381.5L545.4 383L544 384.5L542.5 385.9L540.9 387.4L539.3 388.7L537.6 389.9L536 391L534.5 391.8L533.1 392.5L531.9 392.9L530.8 393.2L529.9 393.1L529.3 392.9L528.7 391.9L527.8 389.9L527.3 387.8Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M527.1 385.6L527.3 383.4L527.8 381.3L528.7 379.2L529.8 377.4L531.2 375.7L532.9 374.3L534.7 373.2L536.8 372.3L538.9 371.8L541.1 371.6L543.2 371.8L545.4 372.3L546.6 372.8L546.9 373.2L547 373.9L546.9 374.7L546.6 375.7L546 376.9L545.2 378.1L544.2 379.4L543 380.8L541.7 382.2L540.3 383.6L538.8 384.9L537.3 386.1L535.8 387.3L534.3 388.2L532.9 389L531.6 389.6L530.4 390.1L529.5 390.3L528.7 390.2L528.1 390L527.7 389.6L527.3 387.8Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M527.1 385.6L527.3 383.4L527.8 381.3L528.7 379.2L529.8 377.4L531.2 375.7L532.9 374.3L534.7 373.2L536.8 372.3L538.9 371.8L541.1 371.6L543 371.8L543.5 372L543.8 372.4L543.9 372.9L543.8 373.6L543.5 374.5L543 375.5L542.3 376.6L541.5 377.7L540.5 378.9L539.3 380.1L538.1 381.3L536.8 382.4L535.5 383.5L534.2 384.5L532.9 385.3L531.7 386L530.6 386.5L529.6 386.9L528.7 387.1L528.1 387.1L527.5 386.9L527.2 386.5Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M527.1 385.6L527.3 383.4L527.8 381.3L528.7 379.2L529.8 377.4L531.2 375.7L532.9 374.3L534.7 373.2L536.8 372.3L538.9 371.8L541.1 371.6L543.2 371.8L545.4 372.3L547.4 373.2L549.3 374.3L550.9 375.7L552.3 377.4L553.5 379.2L554.3 381.3L554.8 383.4L555 385.6L554.8 387.8L554.3 389.9L553.5 391.9L552.3 393.8L550.9 395.4L549.3 396.8L547.4 398L545.4 398.8L543.2 399.3L541.1 399.5L538.9 399.3L536.8 398.8L534.7 398L532.9 396.8L531.2 395.4L529.8 393.8L528.7 391.9L527.8 389.9L527.3 387.8Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.thighL\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M529.4 378.3L534.5 283.9L534.5 283.2L534.7 282.4L535 281.7L535.4 281.1L535.9 280.4L536.5 279.8L537.2 279.2L538 278.7L539 278.2L540 277.7L541 277.3L542.2 277L543.4 276.7L544.7 276.4L546.1 276.2L547.4 276.1L548.9 276L550.3 276L551.8 276.1L553.3 276.2L554.8 276.3L556.2 276.6L557.7 276.8L559.1 277.2L560.5 277.5L561.9 278L563.1 278.5L564.4 279L565.6 279.5L566.6 280.1L567.7 280.8L568.6 281.4L569.4 282.1L570.1 282.8L570.8 283.6L571.3 284.3L571.7 285.1L572 285.8L572.2 286.6L572.2 287.3L572.2 288L554.2 381L554.1 381.5L553.9 382L553.6 382.4L553.3 382.8L552.9 383.2L552.4 383.6L551.9 384L551.3 384.3L550.6 384.6L549.9 384.9L549.1 385.1L548.3 385.3L547.5 385.4L546.6 385.6L545.7 385.7L544.8 385.7L543.8 385.7L542.8 385.7L541.9 385.6L540.9 385.5L539.9 385.4L539 385.2L538 385L537.1 384.7L536.3 384.4L535.4 384.1L534.6 383.8L533.8 383.4L533.1 383L532.4 382.6L531.8 382.2L531.3 381.7L530.8 381.2L530.4 380.8L530.1 380.3L529.8 379.8L529.6 379.3L529.5 378.8Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M549 294.4L552 294.9L554.9 295.1L557.8 295.2L560.7 295L563.3 294.5L565.7 293.9L567.8 293L569.5 292L570.8 290.8L571.7 289.5L572.2 288L554.2 381L553.9 382L553.3 382.8L552.4 383.6L551.3 384.3L549.9 384.9L548.3 385.3L546.6 385.6L544.8 385.7L542.8 385.7L540.9 385.5L539 385.2Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M543.6 292.7L546.2 293.7L549 294.4L539 385.2L537.1 384.7L535.4 384.1Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M539.1 290.4L541.2 291.7L543.6 292.7L535.4 384.1L533.8 383.4L532.4 382.6Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M535 286.1L536 287.6L537.3 289.1L539.1 290.4L532.4 382.6L531.3 381.7L530.4 380.8L529.8 379.8Z\"/><path class=\"iso-top\" d=\"M553.4 285.6L553.4 285.6L553.4 285.6L553.4 285.6L553.4 285.6L553.4 285.6L553.4 285.6L553.4 285.6L553.4 285.6L553.4 285.6L553.4 285.6L553.4 285.6L553.4 285.6L553.4 285.6L553.4 285.6L553.4 285.6L553.4 285.6L553.4 285.6L553.4 285.6L553.4 285.6L553.4 285.6L553.4 285.6L553.4 285.6L553.4 285.6L553.4 285.6L553.4 285.6L553.4 285.6L553.4 285.6L553.4 285.6L553.4 285.6L553.4 285.6L553.4 285.6L553.4 285.6L553.4 285.6L553.4 285.6L553.4 285.6L553.4 285.6L553.4 285.6L553.4 285.6L553.4 285.6L553.4 285.6L541.2 291.7L539.1 290.4L537.3 289.1L536 287.6L535 286.1L534.6 284.6L534.5 283.2L535 281.7L535.9 280.4L537.2 279.2L539 278.2L541 277.3L543.4 276.7L546.1 276.2L548.9 276L551.8 276.1L554.8 276.3L557.7 276.8L560.5 277.5L563.1 278.5L565.6 279.5L567.7 280.8L569.4 282.1L570.8 283.6L571.7 285.1L572.2 286.6L572.2 288L571.7 289.5L570.8 290.8L569.5 292L567.8 293L565.7 293.9L563.3 294.5L560.7 295L557.8 295.2L554.9 295.1L552 294.9L549 294.4L546.2 293.7L543.6 292.7L541.2 291.7ZM534.5 283.2L534.6 284.6L535 286.1L529.8 379.8L529.5 378.8L529.5 377.8Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M534.5 283.6L534.5 284.3L534.7 285.1L534.9 285.9L535.3 286.6L535.8 287.4L536.3 288.1L537 288.8L537.8 289.5L538.7 290.2L539.7 290.8L540.8 291.5L541.9 292L543.1 292.6L544.4 293.1L545.7 293.5L547.1 293.9L548.6 294.3L550 294.6L551.5 294.8L553 295L554.4 295.1L555.9 295.2L557.4 295.2L558.8 295.1L560.2 295L561.6 294.8L562.9 294.6L564.2 294.3L565.3 294L566.5 293.6L567.5 293.2L568.4 292.7L569.3 292.1L570 291.6L570.7 291L571.2 290.3L571.6 289.6L571.9 289L572.1 288.2\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M529.4 378.3L534.5 283.9L534.5 283.2L534.7 282.4L535 281.7L535.4 281.1L535.9 280.4L536.5 279.8L537.2 279.2L538 278.7L539 278.2L540 277.7L541 277.3L542.2 277L543.4 276.7L544.7 276.4L546.1 276.2L547.4 276.1L548.9 276L550.3 276L551.8 276.1L553.3 276.2L554.8 276.3L556.2 276.6L557.7 276.8L559.1 277.2L560.5 277.5L561.9 278L563.1 278.5L564.4 279L565.6 279.5L566.6 280.1L567.7 280.8L568.6 281.4L569.4 282.1L570.1 282.8L570.8 283.6L571.3 284.3L571.7 285.1L572 285.8L572.2 286.6L572.2 287.3L572.2 288L554.2 381L554.1 381.5L553.9 382L553.6 382.4L553.3 382.8L552.9 383.2L552.4 383.6L551.9 384L551.3 384.3L550.6 384.6L549.9 384.9L549.1 385.1L548.3 385.3L547.5 385.4L546.6 385.6L545.7 385.7L544.8 385.7L543.8 385.7L542.8 385.7L541.9 385.6L540.9 385.5L539.9 385.4L539 385.2L538 385L537.1 384.7L536.3 384.4L535.4 384.1L534.6 383.8L533.8 383.4L533.1 383L532.4 382.6L531.8 382.2L531.3 381.7L530.8 381.2L530.4 380.8L530.1 380.3L529.8 379.8L529.6 379.3L529.5 378.8Z\"/></g></g><g class=\"mq-joint\" data-name=\"as.hipL\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M538.2 278.9L538.4 276.4L539 274L539.9 271.7L541.2 269.5L542.9 267.6L544.8 266L546.9 264.7L549.2 263.7L551.7 263.1L554.2 262.9L556.7 263.1L559.1 263.7L561.4 264.7L563.6 266L565.5 267.6L567.1 269.5L568.4 271.7L569.4 274L570 276.4L570.2 278.9L570 281.5L569.4 283.9L568.4 286.2L567.1 288.4L565.5 290.3L563.6 291.9L561.4 293.2L559.1 294.2L556.7 294.8L554.2 295L551.7 294.8L549.2 294.2L546.9 293.2L544.8 291.9L542.9 290.3L541.2 288.4L539.9 286.2L539 283.9L538.4 281.5Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M538.2 278.9L538.4 276.4L539 274L539.9 271.7L541.2 269.5L542.9 267.6L544.8 266L546.9 264.7L549.2 263.7L551.7 263.1L554.2 262.9L556.7 263.1L559.1 263.7L561.4 264.7L563.6 266L565.5 267.6L567.1 269.5L568.4 271.7L569.4 274L570 276.4L570.2 278.9L570 281.5L569.4 283.9L568.4 286.2L567.1 288.4L565.5 290.3L563.6 291.9L561.4 293.2L559.1 294.2L556.7 294.8L554.2 295L551.7 294.8L549.2 294.2L546.9 293.2L544.8 291.9L542.9 290.3L541.2 288.4L539.9 286.2L539 283.9L538.4 281.5Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M538.2 278.9L538.4 276.4L539 274L539.9 271.7L541.2 269.5L542.9 267.6L544.8 266L546.9 264.7L549.2 263.7L551.7 263.1L554.2 262.9L556.7 263.1L559.1 263.7L561.4 264.7L563.6 266L564 266.6L564.2 267.4L564 268.4L563.6 269.6L562.9 271L561.9 272.6L560.7 274.2L559.2 275.9L557.6 277.7L555.9 279.4L554 281L552.1 282.5L550.2 283.9L548.4 285.1L546.7 286.1L545 286.9L543.6 287.4L542.4 287.7L541.4 287.6L540.7 287.3L539.9 286.2L539 283.9L538.4 281.5Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M538.2 278.9L538.4 276.4L539 274L539.9 271.7L541.2 269.5L542.9 267.6L544.8 266L546.9 264.7L549.2 263.7L551.7 263.1L554.2 262.9L556.7 263.1L559.1 263.7L560.5 264.3L560.9 264.8L561 265.5L560.9 266.5L560.5 267.6L559.8 268.9L558.9 270.4L557.8 271.9L556.4 273.5L554.9 275.1L553.3 276.7L551.6 278.2L549.9 279.6L548.1 280.9L546.4 282L544.8 282.9L543.3 283.6L542 284.1L540.8 284.3L539.9 284.3L539.3 284L538.8 283.5L538.4 281.5Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M538.2 278.9L538.4 276.4L539 274L539.9 271.7L541.2 269.5L542.9 267.6L544.8 266L546.9 264.7L549.2 263.7L551.7 263.1L554.2 262.9L556.4 263.1L557 263.3L557.4 263.8L557.5 264.4L557.4 265.2L557 266.2L556.4 267.4L555.6 268.6L554.6 269.9L553.5 271.3L552.2 272.7L550.8 274L549.3 275.4L547.8 276.6L546.3 277.7L544.8 278.7L543.4 279.5L542.2 280.1L541 280.5L540 280.7L539.2 280.7L538.6 280.4L538.3 280Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M538.2 278.9L538.4 276.4L539 274L539.9 271.7L541.2 269.5L542.9 267.6L544.8 266L546.9 264.7L549.2 263.7L551.7 263.1L554.2 262.9L556.7 263.1L559.1 263.7L561.4 264.7L563.6 266L565.5 267.6L567.1 269.5L568.4 271.7L569.4 274L570 276.4L570.2 278.9L570 281.5L569.4 283.9L568.4 286.2L567.1 288.4L565.5 290.3L563.6 291.9L561.4 293.2L559.1 294.2L556.7 294.8L554.2 295L551.7 294.8L549.2 294.2L546.9 293.2L544.8 291.9L542.9 290.3L541.2 288.4L539.9 286.2L539 283.9L538.4 281.5Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.pelvis\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M502.1 280.6L502.2 279.5L502.3 278.5L502.4 277.5L502.7 276L502.9 275L503.2 273.9L503.6 273L503.9 272L504.4 271.2L504.9 270.3L505.4 269.6L506.4 268.2L507 267.5L507.7 266.8L508.4 266.2L510.9 264.3L511.7 263.7L512.5 263.3L515.3 261.8L516.1 261.4L527.6 256.6L528.6 256.3L540.5 252.6L541.4 252.4L544.5 251.8L545.4 251.7L548.6 251.5L549.5 251.5L550.4 251.6L551.4 251.7L552.3 251.9L554 252.3L554.9 252.6L555.8 253L556.6 253.4L557.5 254L558.4 254.5L559.3 255.2L560.5 256.2L561.2 256.8L562 257.5L562.7 258.3L563.4 259.1L564.1 260L564.7 260.9L565.3 261.8L565.9 262.8L566.5 263.8L567 264.9L567.4 265.9L567.8 267L568.2 268.1L568.5 269.2L568.8 270.4L569 271.5L569.2 272.6L569.3 273.7L569.4 274.8L569.5 275.9L569.4 277L569.3 278L569.2 279.1L569 280.1L568.7 281.6L568.5 282.6L568.2 283.6L567.8 284.6L567.4 285.5L567 286.3L566.4 287.1L565.4 288.5L564.8 289.3L564.2 290L563.5 290.6L562.8 291.1L560.3 293.1L559.5 293.6L556.7 295.1L555.9 295.5L544.4 300.3L543.5 300.7L531.5 304.3L530.6 304.6L527.5 305.2L526.6 305.4L525.7 305.4L522.5 305.6L521.6 305.5L520.7 305.4L519.7 305.3L518 304.8L517.1 304.6L516.3 304.3L515.4 303.9L514.5 303.4L513.6 302.8L512.7 302.2L511.9 301.5L510.7 300.6L509.9 299.9L509.2 299.2L508.5 298.4L507.8 297.5L507.1 296.7L506.5 295.7L505.9 294.8L505.4 293.8L504.8 292.7L504.4 291.7L503.9 290.6L503.5 289.5L503.2 288.4L502.9 287.3L502.6 286.1L502.4 285L502.3 283.9L502.2 282.8L502.1 281.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M520.6 302.7L520.6 302.7L522.2 301.9L521.4 302.4L520.6 302.7L519.8 303L518.9 303.2ZM518.9 303.2L519.8 303L520.6 302.7L521.4 302.4L522.2 301.9L524.3 300.1L525.4 298.6L527.6 292.5L527.6 292.5L528.7 290.8L529.6 289.1L530.4 287.5L531 286L531.5 284.5L531.9 283.2L531.9 283.2L533 282.3L534.1 281.5L535.1 280.6L536.1 279.8L537.1 279L538 278.2L538 278.2L540.1 277.4L542.1 276.6L544.1 275.7L546 274.9L548 274L549.9 273.1L549.9 273.1L551.7 272.3L553.6 271.4L555.5 270.6L557.3 269.8L559.1 269L561 268.3L561 268.3L561.7 267.6L562.5 266.9L563.2 266.2L563.8 265.5L564.4 264.8L565 264.2L565 264.2L564.9 263L564.6 261.9L564.6 261.7L564.5 261.7L564.5 261.6L564.4 261.3L564.2 260.7L563.6 259.6L562.9 258.5L562.8 258.4L562.8 258.4L562.7 258.3L562.5 258.1L562.1 257.6L563 258.6L563.8 259.6L564.7 260.8L565.4 262L566.1 263.2L566.8 264.5L567.4 265.8L567.9 267.2L568.4 268.6L568.7 270L569 271.4L569.3 272.9L569.4 274.3L569.5 275.6L569.4 277L569.3 278.3L569.1 279.6L568.9 280.8L568.5 281.9L568.1 283L568.1 283.4L568.1 283.5L568.1 283.6L568.1 283.6L568 283.7L567.9 284.3L567.7 284.9L567.6 285.1L567.5 285.2L567.5 285.3L567.5 285.3L567.4 285.3L567.1 285.8L566.8 286.1L562.6 291.3L561.8 292L560.9 292.6L560 293.2L559.1 293.8L558.2 294.3L557.3 294.8L555.7 295.6L553.8 296.5L551.9 297.3L550 298.1L548.1 298.9L546.1 299.7L544.2 300.4L543.3 300.7L541.3 301.4L539.4 302.1L537.4 302.7L535.4 303.3L533.4 303.8L531.4 304.4L529.6 304.8L528.6 305L527.6 305.2L526.5 305.4L525.5 305.5L524.4 305.5L523.3 305.5L516.8 304.2L516.3 304.1L515.8 304L515.3 303.8L514.8 303.5L514.3 303.2L513.8 302.7L509.5 299.5L514.6 302.8L516.3 303.2ZM568.7 270L568.7 270L562.1 257.6L563 258.6L563.8 259.6L564.7 260.8L565.4 262L566.1 263.2L566.8 264.5L567.4 265.8L567.9 267.2L568.4 268.6L568.7 270L569 271.4L569.3 272.9L569.4 274.3L569.5 275.6L569.4 277L569.3 278.3L569.1 279.6L568.9 280.8L568.5 281.9L568.1 283Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M512 298.6L512.7 299L513.5 299.3L514.2 299.6L515 299.7L515.7 299.8L516.4 299.8L517.1 299.7L517.8 299.5L518.5 299.3L519.1 299L519.6 298.6L520.2 298.1L520.7 297.5L521.1 296.9L521.5 296.2L521.9 295.5L522.2 294.7L523.1 295.1L524.2 294.9L525.3 294L526.3 292.2L526.5 291.6L526.6 291.3L526.7 291.2L526.6 292.5L526.5 293.8L526.3 295L526 296.2L525.6 297.3L525.1 298.3L524.6 299.2L524 300.1L523.4 300.9L522.6 301.5L521.9 302.1L521 302.5L520.2 302.8L519.2 303.1L518.3 303.2L517.3 303.2L516.3 303L515.3 302.8L514.3 302.5L513.3 302L512.3 301.4L511.3 300.7L510.4 300L509.5 299.1L508.6 298.2L508.7 298.2L508.9 298.4L509.3 298.8L510.7 299.6L511.7 299.7L512.1 299.4ZM508.4 298L509.3 299L510.2 299.9L511.2 300.6L512.1 301.3L513.1 301.9L514.1 302.4L515 302.7L516 303L517 303.2L518 303.2L518.9 303.2L526.7 291.2L526.6 292.5L526.5 293.8L526.3 295L526 296.2L525.6 297.3L525.1 298.3L524.6 299.2L524 300.1L523.4 300.9L522.6 301.5L521.9 302.1L521 302.5L520.2 302.8L519.2 303.1L518.3 303.2L517.3 303.2L516.3 303L515.3 302.8L514.3 302.5L513.3 302L512.3 301.4L511.3 300.7L510.4 300L509.5 299.1L508.6 298.2ZM525.5 297.5L525.5 297.5L526.7 291L526.7 292.3L526.6 293.6L526.4 294.8L526.1 295.9L525.7 297L525.3 298L524.8 299L524.3 299.8L523.6 300.6L523 301.3L522.2 301.9ZM508.4 298L509.3 299L510.2 299.9L511.2 300.6L512.1 301.3L513.1 301.9L514.1 302.4L515 302.7L516 303L517 303.2L518 303.2L518.9 303.2L516.3 303.2L514.6 302.8L509.5 299.5L508.7 298.6L507.8 297.6L507.1 296.6L506.3 295.5L505.7 294.3L507.6 297.1L508 297.6ZM522.2 301.9L523 301.3L523.6 300.6L524.3 299.8L524.8 299L525.3 298L525.7 297L526.1 295.9L526.4 294.8L526.6 293.6L526.7 292.3L526.7 291L526.9 290.3L527 289.6L527.1 286.1L527.4 287.4L527.5 288.7L527.6 290L527.6 291.3L527.6 292.5L525.4 298.6L524.3 300.1ZM507.5 297.1L507.5 297.1L509.5 299.5L508.7 298.6L507.8 297.6L507.1 296.6L506.3 295.5L505.7 294.3ZM527.6 292.5L527.6 291.3L527.6 290L527.5 288.7L527.4 287.4L527.1 286.1L527.1 286.1L527.4 287.4L527.5 288.7L527.6 290L527.6 291.3L527.6 292.5ZM527.6 292.5L527.6 291.3L527.6 290L527.5 288.7L527.4 287.4L527.1 286.1L527.9 284.8L528.6 283.4L529.1 282.1L529.6 280.8L530 279.6L530.3 278.4L530.3 278.4L531.3 277.6L532.3 276.7L533.3 275.9L534.2 275.1L535.1 274.3L536 273.5L536 273.5L538 272.6L540 271.8L541.9 270.9L543.9 270L545.8 269.2L547.7 268.3L547.7 268.3L549.5 267.5L551.4 266.6L553.2 265.9L555 265.1L556.9 264.4L558.7 263.6L558.7 263.6L559.4 262.9L560.1 262.3L560.7 261.6L561.3 261L561.9 260.4L562.4 259.8L562.4 259.8L562 258.6L561.4 257.5L561.3 257.3L561.2 257.3L561.2 257.2L561 256.9L560.5 256.3L559.4 255.2L557.8 254.2L557.5 254.1L557.4 254L557.4 254L557.5 254.2L557.8 254.4L558.6 254.9L559.5 255.5L560.4 256.1L561.2 256.8L562.1 257.6L562.5 258.1L562.7 258.3L562.8 258.4L562.8 258.4L562.9 258.5L563.6 259.6L564.2 260.7L564.4 261.3L564.5 261.6L564.5 261.7L564.6 261.7L564.6 261.9L564.9 263L565 264.2L565 264.2L564.4 264.8L563.8 265.5L563.2 266.2L562.5 266.9L561.7 267.6L561 268.3L561 268.3L559.1 269L557.3 269.8L555.5 270.6L553.6 271.4L551.7 272.3L549.9 273.1L549.9 273.1L548 274L546 274.9L544.1 275.7L542.1 276.6L540.1 277.4L538 278.2L538 278.2L537.1 279L536.1 279.8L535.1 280.6L534.1 281.5L533 282.3L531.9 283.2L531.9 283.2L531.5 284.5L531 286L530.4 287.5L529.6 289.1L528.7 290.8ZM560 255.8L560 255.8L557.8 254.4L558.6 254.9L559.5 255.5L560.4 256.1L561.2 256.8L562.1 257.6Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M505.4 290.4L505.8 291.3L506.3 292.3L506.8 293.2L507.4 294.1L507.9 294.9L508.6 295.6L509.2 296.4L509.9 297L510.6 297.6L511.3 298.2L512 298.6L512.1 299.4L511.7 299.7L510.7 299.6L509.3 298.8L508.9 298.4L508.7 298.2L508.6 298.2L508.4 298L508 297.6L507.6 297.1L505.7 294.3L505 293.1L504.5 291.9L503.9 290.6L503.5 289.4L503.1 288L503.5 289.4L503.6 289.6L503.8 289.8L503.8 289.9L503.8 289.9L503.9 290L504 290.1L504.4 290.5L504.7 290.6L505.1 290.5ZM522.2 294.7L522.4 293.9L522.6 293L522.8 292.1L522.8 291.1L522.9 290.1L522.8 289.2L522.7 288.1L522.6 287.1L522.4 286.1L522.1 285.1L521.8 284.1L522.6 283.8L523.4 283.4L524.1 282.9L524.7 282.1L524.8 281.9L524.8 281.8L524.9 281.7L524.9 281.7L525 281.4L525 281.1L525 279.6L525.5 280.9L526 282.1L526.5 283.4L526.8 284.7L527.1 286.1L527 289.6L526.9 290.3L526.7 291L526.7 291.2L526.6 291.3L526.5 291.6L526.3 292.2L525.3 294L524.2 294.9L523.1 295.1ZM504.2 291.3L504.2 291.3L505.7 294.3L505 293.1L504.5 291.9L503.9 290.6L503.5 289.4L503.1 288ZM527.1 286.1L526.8 284.7L526.5 283.4L526 282.1L525.5 280.9L525 279.6L525 279.6L525.5 280.9L526 282.1L526.5 283.4L526.8 284.7L527.1 286.1ZM527.1 286.1L526.8 284.7L526.5 283.4L526 282.1L525.5 280.9L525 279.6L525.7 278.6L526.3 277.6L526.8 276.6L527.1 275.6L527.4 274.5L527.6 273.5L527.6 273.5L528.6 272.6L529.5 271.8L530.4 271L531.3 270.2L532.1 269.4L532.9 268.6L532.9 268.6L534.8 267.7L536.8 266.9L538.7 266L540.6 265.1L542.5 264.2L544.3 263.4L544.3 263.4L546.2 262.5L548 261.7L549.8 261L551.6 260.2L553.5 259.5L555.3 258.9L555.3 258.9L555.9 258.2L556.5 257.6L557.1 257L557.6 256.4L558 255.9L558.4 255.4L558.4 255.4L557.5 254.3L556.2 253.3L556 253.1L555.9 253.1L555.9 253.1L556 253.1L556.3 253.2L556.8 253.5L557.3 253.9L557.3 254L557.4 254L557.4 254L557.5 254.1L557.8 254.2L559.4 255.2L560.5 256.3L561 256.9L561.2 257.2L561.2 257.3L561.3 257.3L561.4 257.5L562 258.6L562.4 259.8L562.4 259.8L561.9 260.4L561.3 261L560.7 261.6L560.1 262.3L559.4 262.9L558.7 263.6L558.7 263.6L556.9 264.4L555 265.1L553.2 265.9L551.4 266.6L549.5 267.5L547.7 268.3L547.7 268.3L545.8 269.2L543.9 270L541.9 270.9L540 271.8L538 272.6L536 273.5L536 273.5L535.1 274.3L534.2 275.1L533.3 275.9L532.3 276.7L531.3 277.6L530.3 278.4L530.3 278.4L530 279.6L529.6 280.8L529.1 282.1L528.6 283.4L527.9 284.8ZM557.4 254L557.4 254L557.4 254L557.4 254Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M504 281.1L503.9 282.1L503.9 283.1L503.9 284.1L504 285.2L504.2 286.2L504.4 287.3L504.7 288.3L505 289.4L505.4 290.4L505.1 290.5L504.7 290.6L504.4 290.5L504 290.1L503.9 290L503.8 289.9L503.8 289.9L503.8 289.8L503.6 289.6L503.5 289.4L503.1 288L502.8 286.8L502.5 285.5L502.3 284.3L502.2 283L502.1 281.8L502.2 281.5L502.2 281.4L502.3 281.2L502.3 281.2L502.3 281.2L502.3 281.1L502.4 281L502.8 280.6L503.2 280.5L503.6 280.7ZM521.8 284.1L521.4 283.1L521 282.1L520.5 281.1L520 280.1L519.4 279.2L518.8 278.4L518.2 277.6L517.5 276.9L516.8 276.2L517.3 275.4L518 274.7L518.9 274.4L519.9 274.2L520.2 274.2L520.3 274.3L520.4 274.3L520.4 274.3L520.7 274.3L520.9 274.3L521.7 274.3L522.4 275.3L523.1 276.3L523.8 277.3L524.4 278.5L525 279.6L525 281.1L525 281.4L524.9 281.7L524.9 281.7L524.8 281.8L524.8 281.9L524.7 282.1L524.1 282.9L523.4 283.4L522.6 283.8ZM502.4 284.9L502.4 284.9L503.1 288L502.8 286.8L502.5 285.5L502.3 284.3L502.2 283L502.1 281.8ZM525 279.6L524.4 278.5L523.8 277.3L523.1 276.3L522.4 275.3L521.7 274.3L521.7 274.3L522.4 275.3L523.1 276.3L523.8 277.3L524.4 278.5L525 279.6ZM525 279.6L524.4 278.5L523.8 277.3L523.1 276.3L522.4 275.3L521.7 274.3L522.4 273.6L523.1 272.8L523.6 272L523.9 271.2L524.2 270.3L524.3 269.4L524.3 269.4L525.2 268.5L526 267.7L526.8 266.9L527.6 266.1L528.3 265.3L529 264.6L529 264.6L530.9 263.7L532.8 262.8L534.7 261.9L536.5 261L538.4 260.2L540.2 259.3L540.2 259.3L542 258.5L543.7 257.7L545.5 257L547.4 256.3L549.2 255.6L551 255L551 255L551.5 254.4L551.9 253.9L552.3 253.4L552.6 252.9L552.8 252.5L552.9 252.1L554.7 252.9L555.2 252.9L555.8 253.1L555.8 253.1L556 253.1L556.2 253.3L557.5 254.3L558.4 255.4L558.4 255.4L558 255.9L557.6 256.4L557.1 257L556.5 257.6L555.9 258.2L555.3 258.9L555.3 258.9L553.5 259.5L551.6 260.2L549.8 261L548 261.7L546.2 262.5L544.3 263.4L544.3 263.4L542.5 264.2L540.6 265.1L538.7 266L536.8 266.9L534.8 267.7L532.9 268.6L532.9 268.6L532.1 269.4L531.3 270.2L530.4 271L529.5 271.8L528.6 272.6L527.6 273.5L527.6 273.5L527.4 274.5L527.1 275.6L526.8 276.6L526.3 277.6L525.7 278.6ZM556 253.1L555.8 253.1L555.9 253.1L555.9 253.1ZM513.4 286.6L513.4 286.6L513.4 286.6L513.4 286.6L513.4 286.6L513.4 286.6L513.4 286.6L513.4 286.6L513.4 286.6L513.4 286.6L513.4 286.6L513.4 286.6L513.4 286.6L513.4 286.6L513.4 286.6L513.4 286.6L513.4 286.6L513.4 286.6L513.4 286.6L513.4 286.6L513.4 286.6L513.4 286.6L513.4 286.6L513.4 286.6L513.4 286.6L513.4 286.6L513.4 286.6L513.4 286.6L513.4 286.6L513.4 286.6L513.4 286.6L513.4 286.6L513.4 286.6L513.4 286.6L513.4 286.6L513.4 286.6L513.4 286.6L513.4 286.6L513.4 286.6L513.4 286.6L513.4 286.6L513.4 286.6L513.4 286.6L513.4 286.6L513.4 286.6L513.4 286.6L513.4 286.6L513.4 286.6L513.4 286.6L513.4 286.6L513.4 286.6L522.9 290.3L522.8 291.9L522.6 293.3L522.2 294.7L521.7 296L521.1 297L520.3 298L519.4 298.7L518.5 299.3L517.4 299.6L516.3 299.8L515.2 299.8L514 299.5L512.8 299L511.6 298.4L510.5 297.5L509.4 296.5L508.3 295.3L507.3 294L506.5 292.6L505.7 291.1L505.1 289.5L504.6 287.9L504.2 286.2L504 284.6L503.9 283L504 281.4L504.2 279.9L504.6 278.6L505.1 277.3L505.7 276.2L506.5 275.3L507.3 274.6L508.3 274L509.4 273.6L510.5 273.5L511.6 273.5L512.8 273.8L514 274.3L515.2 274.9L516.3 275.7L517.4 276.8L518.5 277.9L519.4 279.2L520.3 280.7L521.1 282.2L521.7 283.8L522.2 285.4L522.6 287.1L522.8 288.7L522.9 290.3Z\"/><path class=\"iso-top\" d=\"M516.8 276.2L516.1 275.6L515.4 275L514.6 274.6L513.8 274.2L513 273.9L512.3 273.7L511.5 273.5L510.8 273.5L510 273.5L509.3 273.6L508.6 273.9L508 274.2L507.4 274.5L506.8 275L506.3 275.5L505.8 276.2L505.3 276.8L505 277.6L504.6 278.4L504.4 279.3L504.2 280.2L504 281.1L503.6 280.7L503.2 280.5L502.8 280.6L502.4 281L502.3 281.1L502.3 281.2L502.3 281.2L502.3 281.2L502.2 281.4L502.2 281.5L502.1 281.8L503.5 274.1L503.5 273.4L503.7 272.8L503.9 272.2L504.1 271.7L504.4 271.3L504.8 271L509 265.8L509.8 265.1L510.6 264.4L511.5 263.8L512.4 263.3L513.3 262.8L514.3 262.3L515.9 261.5L517.8 260.6L519.7 259.8L521.6 259L523.5 258.2L525.4 257.4L527.4 256.7L528.3 256.4L530.2 255.7L532.2 255L534.2 254.4L536.2 253.8L538.2 253.2L540.2 252.7L541.9 252.3L542.9 252.1L544 251.9L545 251.7L546.1 251.6L547.2 251.6L548.2 251.6L549.4 251.5L550.5 251.6L551.7 251.8L552.9 252.1L552.8 252.5L552.6 252.9L552.3 253.4L551.9 253.9L551.5 254.4L551 255L551 255L549.2 255.6L547.4 256.3L545.5 257L543.7 257.7L542 258.5L540.2 259.3L540.2 259.3L538.4 260.2L536.5 261L534.7 261.9L532.8 262.8L530.9 263.7L529 264.6L529 264.6L528.3 265.3L527.6 266.1L526.8 266.9L526 267.7L525.2 268.5L524.3 269.4L524.3 269.4L524.2 270.3L523.9 271.2L523.6 272L523.1 272.8L522.4 273.6L521.7 274.3L521.7 274.3L520.9 274.3L520.7 274.3L520.4 274.3L520.4 274.3L520.3 274.3L520.2 274.2L519.9 274.2L518.9 274.4L518 274.7L517.3 275.4ZM550.5 251.6L550.5 251.6L548.2 251.6L549.4 251.5L550.5 251.6L551.7 251.8L552.9 252.1Z\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M502.1 280.6L502.2 279.5L502.3 278.5L502.4 277.5L502.7 276L502.9 275L503.2 273.9L503.6 273L503.9 272L504.4 271.2L504.9 270.3L505.4 269.6L506.4 268.2L507 267.5L507.7 266.8L508.4 266.2L510.9 264.3L511.7 263.7L512.5 263.3L515.3 261.8L516.1 261.4L527.6 256.6L528.6 256.3L540.5 252.6L541.4 252.4L544.5 251.8L545.4 251.7L548.6 251.5L549.5 251.5L550.4 251.6L551.4 251.7L552.3 251.9L554 252.3L554.9 252.6L555.8 253L556.6 253.4L557.5 254L558.4 254.5L559.3 255.2L560.5 256.2L561.2 256.8L562 257.5L562.7 258.3L563.4 259.1L564.1 260L564.7 260.9L565.3 261.8L565.9 262.8L566.5 263.8L567 264.9L567.4 265.9L567.8 267L568.2 268.1L568.5 269.2L568.8 270.4L569 271.5L569.2 272.6L569.3 273.7L569.4 274.8L569.5 275.9L569.4 277L569.3 278L569.2 279.1L569 280.1L568.7 281.6L568.5 282.6L568.2 283.6L567.8 284.6L567.4 285.5L567 286.3L566.4 287.1L565.4 288.5L564.8 289.3L564.2 290L563.5 290.6L562.8 291.1L560.3 293.1L559.5 293.6L556.7 295.1L555.9 295.5L544.4 300.3L543.5 300.7L531.5 304.3L530.6 304.6L527.5 305.2L526.6 305.4L525.7 305.4L522.5 305.6L521.6 305.5L520.7 305.4L519.7 305.3L518 304.8L517.1 304.6L516.3 304.3L515.4 303.9L514.5 303.4L513.6 302.8L512.7 302.2L511.9 301.5L510.7 300.6L509.9 299.9L509.2 299.2L508.5 298.4L507.8 297.5L507.1 296.7L506.5 295.7L505.9 294.8L505.4 293.8L504.8 292.7L504.4 291.7L503.9 290.6L503.5 289.5L503.2 288.4L502.9 287.3L502.6 286.1L502.4 285L502.3 283.9L502.2 282.8L502.1 281.7Z\"/></g></g><g class=\"mq-joint\" data-name=\"as.waist\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M515.5 244.6L515.7 241.6L516.4 238.7L517.6 236L519.1 233.4L521 231.2L523.3 229.2L525.9 227.7L528.6 226.5L531.5 225.8L534.5 225.6L537.4 225.8L540.3 226.5L543.1 227.7L545.6 229.2L547.9 231.2L549.8 233.4L551.4 236L552.5 238.7L553.2 241.6L553.4 244.6L553.2 247.5L552.5 250.4L551.4 253.2L549.8 255.7L547.9 258L545.6 259.9L543.1 261.5L540.3 262.6L537.4 263.3L534.5 263.5L531.5 263.3L528.6 262.6L525.9 261.5L523.3 259.9L521 258L519.1 255.7L517.6 253.2L516.4 250.4L515.7 247.5Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M515.5 244.6L515.7 241.6L516.4 238.7L517.6 236L519.1 233.4L521 231.2L523.3 229.2L525.9 227.7L528.6 226.5L531.5 225.8L534.5 225.6L537.4 225.8L540.3 226.5L543.1 227.7L545.6 229.2L547.9 231.2L549.8 233.4L551.4 236L552.5 238.7L553.2 241.6L553.4 244.6L553.2 247.5L552.5 250.4L551.4 253.2L549.8 255.7L547.9 258L545.6 259.9L543.1 261.5L540.3 262.6L537.4 263.3L534.5 263.5L531.5 263.3L528.6 262.6L525.9 261.5L523.3 259.9L521 258L519.1 255.7L517.6 253.2L516.4 250.4L515.7 247.5Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M515.5 244.6L515.7 241.6L516.4 238.7L517.6 236L519.1 233.4L521 231.2L523.3 229.2L525.9 227.7L528.6 226.5L531.5 225.8L534.5 225.6L537.4 225.8L540.3 226.5L543.1 227.7L545.6 229.2L546.1 229.9L546.3 230.8L546.1 232.1L545.6 233.5L544.8 235.2L543.6 237L542.1 239L540.4 241L538.5 243.1L536.5 245.1L534.3 247L532 248.8L529.8 250.5L527.6 251.9L525.6 253.1L523.6 254L521.9 254.6L520.5 254.9L519.3 254.9L518.5 254.5L517.6 253.2L516.4 250.4L515.7 247.5Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M515.5 244.6L515.7 241.6L516.4 238.7L517.6 236L519.1 233.4L521 231.2L523.3 229.2L525.9 227.7L528.6 226.5L531.5 225.8L534.5 225.6L537.4 225.8L540.3 226.5L541.9 227.2L542.4 227.8L542.6 228.7L542.4 229.8L541.9 231.2L541.2 232.7L540.1 234.4L538.7 236.2L537.1 238.1L535.4 240L533.5 241.9L531.4 243.7L529.4 245.3L527.3 246.9L525.3 248.2L523.4 249.3L521.6 250.1L520 250.7L518.7 251L517.6 250.9L516.8 250.6L516.3 250L515.7 247.5Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M515.5 244.6L515.7 241.6L516.4 238.7L517.6 236L519.1 233.4L521 231.2L523.3 229.2L525.9 227.7L528.6 226.5L531.5 225.8L534.5 225.6L537.1 225.8L537.8 226.1L538.2 226.6L538.4 227.4L538.2 228.3L537.8 229.5L537.1 230.8L536.2 232.3L535 233.9L533.7 235.5L532.1 237.1L530.5 238.8L528.7 240.3L526.9 241.8L525.1 243.1L523.4 244.2L521.7 245.2L520.2 245.9L518.8 246.4L517.7 246.6L516.7 246.6L516.1 246.3L515.6 245.8Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M515.5 244.6L515.7 241.6L516.4 238.7L517.6 236L519.1 233.4L521 231.2L523.3 229.2L525.9 227.7L528.6 226.5L531.5 225.8L534.5 225.6L537.4 225.8L540.3 226.5L543.1 227.7L545.6 229.2L547.9 231.2L549.8 233.4L551.4 236L552.5 238.7L553.2 241.6L553.4 244.6L553.2 247.5L552.5 250.4L551.4 253.2L549.8 255.7L547.9 258L545.6 259.9L543.1 261.5L540.3 262.6L537.4 263.3L534.5 263.5L531.5 263.3L528.6 262.6L525.9 261.5L523.3 259.9L521 258L519.1 255.7L517.6 253.2L516.4 250.4L515.7 247.5Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.chest\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M495.1 162.7L495.1 162.2L495.4 158.9L495.5 158.4L496.4 155L496.5 154.5L496.7 154L498.3 150.7L498.5 150.2L500.5 146.9L500.8 146.5L501.2 146L501.5 145.6L502 145.2L503.1 144.2L503.6 143.8L504.1 143.4L504.7 143L505.3 142.6L505.9 142.2L506.6 141.9L507.3 141.5L508.9 140.8L509.6 140.4L510.3 140.1L511.1 139.8L511.9 139.5L515.2 138.4L515.9 138.2L516.7 137.9L517.4 137.7L518.2 137.5L519 137.3L519.8 137.1L520.6 137L521.4 136.8L522.3 136.6L523.2 136.5L524 136.4L524.9 136.3L525.8 136.2L526.8 136.1L527.7 136L528.6 135.9L529.5 135.9L530.5 135.8L531.4 135.8L532.3 135.8L533.3 135.8L534.2 135.8L535.1 135.8L536 135.9L536.9 135.9L537.8 136L538.7 136.1L539.5 136.2L540.4 136.3L541.2 136.4L542 136.5L542.8 136.6L543.6 136.8L544.3 136.9L545 137.1L548.3 138L549.2 138.2L550 138.4L550.8 138.7L551.6 138.9L552.3 139.2L553.9 139.9L554.6 140.2L555.3 140.5L556 140.8L556.6 141.2L557.2 141.5L557.7 141.9L558.9 142.8L559.4 143.1L559.8 143.5L560.2 143.9L560.6 144.3L562.9 147.5L563.2 147.9L563.4 148.3L565.2 151.6L565.4 152L566.6 155.3L566.8 155.8L566.9 156.3L567.4 159.7L567.4 160.2L567.7 182.7L567.7 183.2L567.1 189.9L567 190.4L565.8 197.2L562.1 210.7L562 211.1L560.1 216.7L557.9 222.3L557.7 222.7L552.2 233.8L552 234.1L551.9 234.3L551.7 234.6L551.4 234.8L551.2 235.1L550.9 235.3L550.6 235.6L550.2 235.8L549.9 236.1L549.5 236.3L549 236.5L548.6 236.7L548.1 237L547.6 237.2L547.1 237.4L546.5 237.6L546 237.8L545.4 237.9L544.8 238.1L544.1 238.3L543.5 238.4L542.8 238.6L542.2 238.7L541.5 238.9L540.8 239L540.1 239.1L539.3 239.2L538.6 239.3L537.9 239.4L537.1 239.5L536.4 239.5L535.6 239.6L534.9 239.6L534.1 239.7L533.4 239.7L532.6 239.7L531.8 239.7L531.1 239.7L530.3 239.7L529.6 239.6L528.9 239.6L528.1 239.5L527.4 239.5L526.7 239.4L526 239.3L525.4 239.2L524.7 239.1L524 239L523.4 238.9L522.8 238.7L522.2 238.6L521.6 238.5L521.1 238.3L520.6 238.1L520.1 238L519.6 237.8L519.1 237.6L518.7 237.4L518.3 237.2L517.9 237L517.6 236.7L517.2 236.5L516.9 236.3L516.7 236.1L516.4 235.8L516.2 235.6L516.1 235.3L509.7 224.7L509.5 224.4L506.8 219L506.6 218.6L504.4 213.2L499.7 200L499.5 199.6L497.7 192.9L497.6 192.4L496.6 185.7L496.6 185.2Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M552.2 233.7L552 234.1L551.8 234.4L551.5 234.7L551.2 235.1L550.8 235.4L550.4 235.7L549.9 236L549.4 236.3L548.8 236.6L548.2 236.9L547.6 237.2L546.9 237.4L546.2 237.7L545.4 237.9L544.6 238.2L543.8 238.4L542.9 238.6L542.1 238.8L541.2 238.9L540.2 239.1L539.3 239.2L538.3 239.3L537.4 239.4L536.4 239.5L535.4 239.6L534.4 239.6L533.4 239.7L532.4 239.7L531.5 239.7L530.5 239.7L529.5 239.6L528.6 239.6L527.6 239.5L526.7 239.4L525.8 239.3L524.9 239.2L524.1 239L523.3 238.8L522.5 238.7L521.7 238.5L520.8 235.5L520.2 232.5L520.2 232.1L520.2 232L520.2 231.9L520.2 231.9L520.2 231.8L520.1 231L520.1 229.6L520.6 226.6L521.5 223.6L523 220.5L523 220.5L522.3 216.5L522.3 212.5L523.3 208.6L524.1 206.6L524.1 206.5L524.1 206.5L524.2 206.3L524.3 206.1L524.6 205.6L525.1 204.6L528 200.4L531.8 196L531.8 196L531.9 192.3L532 188.6L532.2 184.9L532.4 181.2L532.7 177.4L533 173.7L533 173.7L533.4 173.5L533.6 173.4L533.8 173.3L534 173.3L534.2 173.2L534.6 173L536.2 172.3L539.3 170.8L544.9 167.6L549.7 164L553.6 160.1L556.6 156L558.7 151.4L558.7 151.4L561.1 148.5L561.3 147.9L561.4 147.4L561.5 146.9L561.4 146.3L561.3 145.8L561.1 145.3L560.9 144.8L560.5 144.3L557.3 141.8L561.2 145.4L562.8 147.5L564.2 149.6L565.3 151.8L566.2 154L566.8 156.2L566.9 157.3L567 157.9L567 158L567 158.1L567 158.2L567 158.2L567 158.3L567 158.4L567.4 160.2L567.5 163.9L567.6 167.7L567.7 171.4L567.7 175.2L567.7 178.9L567.7 182.7L567.6 183.6L567.3 188.1L566.7 192.6L566.5 193.7L566.4 194.3L566.3 194.5L566.3 194.7L566.3 194.8L566.3 194.8L565.8 197.1L564.7 201.6L563.4 206.1L562.1 210.6L561.9 211.4L560.7 215.1L559.3 218.9L557.8 222.6L556.9 224.4L556.5 225.4L556.4 225.5L556.4 225.5L556.4 225.6L556.3 225.8L556 226.3L554.2 230ZM560.5 144.3L560.9 144.8L561.1 145.3L561.3 145.8L561.4 146.3L561.5 146.9L561.4 147.4L561.3 147.9L561.1 148.5L561.4 146.3L561.4 146.3Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M521.7 238.5L521 238.3L520.4 238.1L519.8 237.9L519.2 237.6L518.7 237.4L518.2 237.1L517.7 236.9L517.3 236.6L517 236.3L516.6 236L516.4 235.7L516.1 235.4L515.9 235.1L513.7 231.6L511.6 228L511.3 227.6L511.2 227.3L511.2 227.3L511.2 227.3L511.1 227.3L511 226.9L510.8 226L510.9 223.7L511.5 221.2L512.8 218.7L512.8 218.7L511.6 214.5L511.2 210.7L511.8 206.9L512.5 205.1L512.5 205.1L512.5 205L512.6 204.9L512.7 204.7L512.9 204.2L513.4 203.3L516.2 199.6L520.1 195.7L520.1 195.7L520.1 192L520.2 188.4L520.3 184.7L520.5 181L520.8 177.3L521.1 173.6L521.1 173.6L521.5 173.5L521.7 173.4L521.9 173.4L522.1 173.3L522.3 173.2L522.7 173.1L524.3 172.6L527.4 171.5L533 168.9L537.8 166L541.7 162.9L544.8 159.7L547.1 156.3L548.4 155.9L549.7 155.6L551 155.2L552.2 154.8L553.3 154.3L554.4 153.9L555.4 153.4L556.3 152.9L557.2 152.4L558 151.9L558.7 151.4L556.6 156L553.6 160.1L549.7 164L544.9 167.6L539.3 170.8L536.2 172.3L534.6 173L534.2 173.2L534 173.3L533.8 173.3L533.6 173.4L533.4 173.5L533 173.7L533 173.7L532.7 177.4L532.4 181.2L532.2 184.9L532 188.6L531.9 192.3L531.8 196L531.8 196L528 200.4L525.1 204.6L524.6 205.6L524.3 206.1L524.2 206.3L524.1 206.5L524.1 206.5L524.1 206.6L523.3 208.6L522.3 212.5L522.3 216.5L523 220.5L523 220.5L521.5 223.6L520.6 226.6L520.1 229.6L520.1 231L520.2 231.8L520.2 231.9L520.2 231.9L520.2 232L520.2 232.1L520.2 232.5L520.8 235.5ZM558.7 151.4L558 151.9L557.2 152.4L556.3 152.9L555.4 153.4L554.4 153.9L553.3 154.3L552.2 154.8L551 155.2L549.7 155.6L548.4 155.9L547.1 156.3L547.1 156.3L548.4 155.9L549.7 155.6L551 155.2L552.2 154.8L553.3 154.3L554.4 153.9L555.4 153.4L556.3 152.9L557.2 152.4L558 151.9L558.7 151.4ZM554.5 140.5L555.5 140.9L556.5 141.3L557.3 141.8L556 141.1L556 141.1ZM554.5 140.4L555.5 140.8L556.4 141.3L557.3 141.7L558.1 142.2L558.8 142.7L559.5 143.2L560 143.7L560.5 144.3L557.3 141.8L556.5 141.3L555.5 140.9L554.5 140.5ZM558.7 151.4L558 151.9L557.2 152.4L556.3 152.9L555.4 153.4L554.4 153.9L553.3 154.3L552.2 154.8L551 155.2L549.7 155.6L548.4 155.9L547.1 156.3L549.4 155.5L550.7 155.1L551.9 154.7L553.1 154.3L554.2 153.8L555.3 153.3L556.2 152.8L557.1 152.3L557.9 151.8L558.7 151.3L559.3 150.7L559.9 150.2L560.4 149.6L560.8 149L561.1 148.5ZM554.4 140.4L555.4 140.8L556.4 141.2L557.3 141.7L558 142.1L558.8 142.6L559.4 143.1L559.9 143.6L560.4 144.1L560.8 144.7L561.1 145.2L561.3 145.8L561.4 146.3L561.4 146.9L561.4 147.4L561.2 148L561 148.6L560.7 149.1L560.2 149.7L559.7 150.2L559.2 150.8L558.5 151.3L557.8 151.8L556.9 152.4L556 152.9L555.1 153.3L554 153.8L552.9 154.3L551.8 154.7L550.5 155.1L560.5 144.3L560 143.7L559.5 143.2L558.8 142.7L558.1 142.2L557.3 141.7L556.4 141.3L555.5 140.8L554.5 140.4ZM561.1 148.5L560.8 149L560.4 149.6L559.9 150.2L559.3 150.7L558.7 151.3L557.9 151.8L557.1 152.3L556.2 152.8L555.3 153.3L554.2 153.8L553.1 154.3L551.9 154.7L550.7 155.1L549.4 155.5L557.1 152.3L557.1 152.3ZM554.4 140.4L555.4 140.8L556.4 141.2L557.3 141.7L558 142.1L558.8 142.6L559.4 143.1L559.9 143.6L560.4 144.1L560.8 144.7L561.1 145.2L561.3 145.8L561.4 146.3L561.4 146.9L561.4 147.4L561.2 148L561 148.6L560.7 149.1L560.2 149.7L559.7 150.2L559.2 150.8L558.5 151.3L557.8 151.8L556.9 152.4L556 152.9L555.1 153.3L554 153.8L552.9 154.3L551.8 154.7L550.5 155.1L551.6 154.7L555.7 152.7L556.6 152.1L557.5 151.4L559.3 149.9L560.7 147.2L560.8 146.8L560.9 146.3L560.8 145.8L560.7 145.3L560.6 144.9L560.3 144.4L558.2 142.1L556.1 141L555 140.5L554.2 140.2L554.4 140.4ZM560.3 144.4L560.6 144.9L560.7 145.3L560.8 145.8L560.9 146.3L560.8 146.8L560.7 147.2L560.8 145.8L560.8 145.8Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M511.2 227.3L511.1 227.3L511.2 227.4L511.2 227.4ZM511.2 227.3L511.1 227.3L511.1 227.2L511 227.1L510.5 226.2L509.5 224.4L507.7 220.9L506 217.3L504.6 213.6L504.3 212.9L502.6 208.5L501 204.1L499.6 199.6L498.9 197.4L498.9 197.4L498.9 197.5L499 197.7L499.2 197.9L499.4 198L500 197.9L502.9 196L506.9 193.3L506.9 193.3L506.8 189.7L506.9 186.1L507 182.4L507.2 178.8L507.4 175.2L507.7 171.6L507.7 171.6L508.2 171.6L508.4 171.5L508.6 171.5L508.8 171.5L509 171.5L509.4 171.4L511.1 171.2L514.2 170.6L519.7 168.8L524.4 166.5L528.3 164L531.4 161.2L533.9 158.3L533.9 158.3L535.8 158L536.7 157.9L537.6 157.7L541 157L542.4 156.8L543.9 156.5L545.3 156.2L546.6 155.9L547.9 155.6L549.2 155.2L550.4 154.8L551.6 154.4L552.7 154L553.8 153.6L554.8 153.1L555.7 152.7L551.6 154.7L550.5 155.1L549.4 155.5L547.1 156.3L547.1 156.3L544.8 159.7L541.7 162.9L537.8 166L533 168.9L527.4 171.5L524.3 172.6L522.7 173.1L522.3 173.2L522.1 173.3L521.9 173.4L521.7 173.4L521.5 173.5L521.1 173.6L521.1 173.6L520.8 177.3L520.5 181L520.3 184.7L520.2 188.4L520.1 192L520.1 195.7L520.1 195.7L516.2 199.6L513.4 203.3L512.9 204.2L512.7 204.7L512.6 204.9L512.5 205L512.5 205.1L512.5 205.1L511.8 206.9L511.2 210.7L511.6 214.5L512.8 218.7L512.8 218.7L511.5 221.2L510.9 223.7L510.8 226L511 226.9L511.1 227.3L511.2 227.3ZM555.7 152.7L554.8 153.1L553.8 153.6L552.7 154L551.6 154.4L550.4 154.8L549.2 155.2L547.9 155.6L546.6 155.9L545.3 156.2L543.9 156.5L542.4 156.8L541 157L541.8 156.8L543.3 156.5L544.8 156.2L546.2 155.9L547.6 155.6L548.9 155.2L550.2 154.8L551.4 154.4L552.6 154L553.7 153.5L554.8 153.1L555.7 152.6L556.6 152.1ZM554.2 140.2L555 140.5L554.7 140.4L554.7 140.4ZM554.2 140.1L554.1 140.1L554 140L554.9 140.4L555.8 140.8L556.6 141.2L557.3 141.6L558 142L558.6 142.5L559.2 142.9L559.6 143.4L560 143.9L560.3 144.4L558.2 142.1L556.1 141L555 140.5L554.2 140.2ZM556.6 152.1L555.7 152.6L554.8 153.1L553.7 153.5L552.6 154L551.4 154.4L550.2 154.8L548.9 155.2L547.6 155.6L546.2 155.9L544.8 156.2L543.3 156.5L541.8 156.8L542.5 156.6L543.9 156.2L545.3 155.8L546.7 155.5L548.1 155.1L549.4 154.7L550.6 154.3L551.8 153.9L553 153.5L554 153L555 152.5L556 152.1L556.8 151.6L557.6 151L558.3 150.5L558.9 150L559.4 149.4L559.9 148.9L560.3 148.3L560.6 147.8L560.7 147.2L559.3 149.9L557.5 151.4ZM553.9 140L554.9 140.4L555.9 140.8L556.7 141.2L557.5 141.7L558.2 142.2L558.8 142.7L559.4 143.2L559.8 143.7L560.2 144.2L560.5 144.7L560.7 145.3L560.8 145.8L560.8 146.4L560.7 146.9L560.6 147.5L560.4 148L560 148.6L559.6 149.1L559.1 149.7L558.5 150.2L557.9 150.7L557.1 151.3L556.3 151.8L555.4 152.3L554.5 152.7L553.4 153.2L552.3 153.6L551.2 154.1L549.9 154.5L548.7 154.9L547.3 155.2L545.9 155.6L560.3 144.4L560 143.9L559.6 143.4L559.2 142.9L558.6 142.5L558 142L557.3 141.6L556.6 141.2L555.8 140.8L554.9 140.4L554 140ZM560.7 147.2L560.6 147.8L560.3 148.3L559.9 148.9L559.4 149.4L558.9 150L558.3 150.5L557.6 151L556.8 151.6L556 152.1L555 152.5L554 153L553 153.5L551.8 153.9L550.6 154.3L549.4 154.7L548.1 155.1L546.7 155.5L545.3 155.8L555.9 152L555.9 152ZM553.9 140L554.9 140.4L555.9 140.8L556.7 141.2L557.5 141.7L558.2 142.2L558.8 142.7L559.4 143.2L559.8 143.7L560.2 144.2L560.5 144.7L560.7 145.3L560.8 145.8L560.8 146.4L560.7 146.9L560.6 147.5L560.4 148L560 148.6L559.6 149.1L559.1 149.7L558.5 150.2L557.9 150.7L557.1 151.3L556.3 151.8L555.4 152.3L554.5 152.7L553.4 153.2L552.3 153.6L551.2 154.1L549.9 154.5L548.7 154.9L547.3 155.2L545.9 155.6L546.6 155.3L550.9 153.5L554.2 151.4L554.6 151.1L554.9 150.8L555.5 150.2L556.6 149L558 145.8L558 144.9L558 144.5L558 144.1L557.9 143.7L557.6 142.9L555.4 140.6L554.1 139.9L553.3 139.6L552.9 139.4L553 139.5L553.5 139.7L553.9 139.9ZM557.9 143.7L558 144.1L558 144.5L558 144.9L557.9 144.3L557.9 144.3Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M498.9 197.5L498.9 197.5L498.9 197.3L498.9 197.5ZM498.9 197.5L498.9 197.3L498.8 197.2L498.7 196.9L498.6 196.3L498.3 195.2L497.3 190.8L496.7 186.3L496.6 185.4L496.3 181.7L496 177.9L495.7 174.2L495.5 170.5L495.3 166.7L495.1 163L495.4 161.2L495.4 161.1L495.2 161.7L495.1 162.4L495.1 163L495.2 163.6L495.5 164.3L495.8 164.9L496.2 165.5L496.7 166.1L497.3 166.7L498 167.3L498.8 167.9L499.7 168.4L500.7 168.9L501.7 169.4L502.9 169.9L504.1 170.4L505.4 170.8L506.7 171.2L508.2 171.6L507.7 171.6L507.7 171.6L507.4 175.2L507.2 178.8L507 182.4L506.9 186.1L506.8 189.7L506.9 193.3L506.9 193.3L502.9 196L500 197.9L499.4 198L499.2 197.9L499 197.7ZM508.2 171.6L506.7 171.2L505.4 170.8L504.1 170.4L502.9 169.9L501.7 169.4L500.7 168.9L499.7 168.4L498.8 167.9L498 167.3L497.3 166.7L496.7 166.1L496.2 165.5L495.8 164.9L495.5 164.3L495.2 163.6L495.1 163L495.1 162.4L495.2 161.7L495.4 161.1L495.5 164.3L495.8 164.9L496.2 165.5L496.8 166.1L497.4 166.7L498.1 167.3L498.9 167.8L499.8 168.4L500.8 168.9L501.9 169.4L503 169.9L504.2 170.3L505.6 170.8L506.9 171.2L508.4 171.5ZM495.1 161.8L495.2 161.4L495.4 161L495.2 161.5L495.2 161.5ZM495.3 161.2L495.4 160.9L495.4 161L495.2 161.4L495.1 161.8ZM508.4 171.5L506.9 171.2L505.6 170.8L504.2 170.3L503 169.9L501.9 169.4L500.8 168.9L499.8 168.4L498.9 167.8L498.1 167.3L497.4 166.7L496.8 166.1L496.2 165.5L495.8 164.9L495.5 164.3L495.8 164.8L496.2 165.4L496.7 166L497.3 166.6L498.1 167.2L498.9 167.8L499.8 168.3L500.8 168.9L501.9 169.4L503.1 169.8L504.4 170.3L505.7 170.7L507.1 171.1L508.6 171.5ZM495.3 161L495.3 161L495.4 160.9L495.3 161.2ZM508.6 171.5L507.1 171.1L505.7 170.7L504.4 170.3L503.1 169.8L501.9 169.4L500.8 168.9L499.8 168.3L498.9 167.8L498.1 167.2L497.3 166.6L496.7 166L496.2 165.4L495.8 164.8L496 165.1L496.5 165.7L497.1 166.3L497.7 166.8L498.5 167.4L499.3 167.9L500.2 168.5L501.2 169L502.3 169.5L503.5 169.9L504.7 170.3L506 170.8L507.4 171.1L508.8 171.5ZM508.8 171.5L507.4 171.1L506 170.8L504.7 170.3L503.5 169.9L502.3 169.5L501.2 169L500.2 168.5L499.3 167.9L498.5 167.4L497.7 166.8L497.1 166.3L496.5 165.7L496 165.1L496.3 165.4L496.8 165.8L498.5 166.7L501.8 167.3L507.3 166.7L512 165.2L515.8 163.2L519 160.9L521.6 158.3L521.6 158.3L523.2 158.3L523.9 158.2L524.6 158.2L527.2 158L527.8 157.9L528.4 157.9L529.4 157.7L530.4 157.6L530.9 157.5L531.3 157.4L534.4 156.7L536.8 155.9L538.2 155.7L539.7 155.5L541.1 155.3L542.6 155L543.9 154.7L545.3 154.4L546.6 154.1L547.8 153.8L549 153.4L550.2 153.1L551.3 152.7L552.3 152.2L553.3 151.8L554.2 151.4L550.9 153.5L546.6 155.3L545.9 155.6L545.3 155.8L543.9 156.2L542.5 156.6L541.8 156.8L541 157L537.6 157.7L536.7 157.9L535.8 158L533.9 158.3L533.9 158.3L531.4 161.2L528.3 164L524.4 166.5L519.7 168.8L514.2 170.6L511.1 171.2L509.4 171.4L509 171.5ZM554.2 151.4L553.3 151.8L552.3 152.2L551.3 152.7L550.2 153.1L549 153.4L547.8 153.8L546.6 154.1L545.3 154.4L543.9 154.7L542.6 155L541.1 155.3L539.7 155.5L538.2 155.7L536.8 155.9L537 155.8L538.5 155.6L540 155.4L541.5 155.1L542.9 154.9L544.3 154.6L545.6 154.3L546.9 154L548.2 153.6L549.4 153.2L550.6 152.8L551.7 152.4L552.7 152L553.7 151.5L554.6 151.1ZM552.9 139.4L552.9 139.4L553 139.5L553 139.5ZM552.9 139.4L552.9 139.4L553.3 139.6L554.1 139.9L555.4 140.6L557.6 142.9L557.9 143.7L557.7 143.2L557.4 142.7L557 142.3L556.6 141.8L556.1 141.4L555.6 141L554.9 140.5L554.3 140.1L553.5 139.8L552.7 139.4L551.8 139L551.9 139.1L552.5 139.3L552.7 139.4L552.9 139.4ZM554.6 151.1L553.7 151.5L552.7 152L551.7 152.4L550.6 152.8L549.4 153.2L548.2 153.6L546.9 154L545.6 154.3L544.3 154.6L542.9 154.9L541.5 155.1L540 155.4L538.5 155.6L537 155.8L537.2 155.7L537.7 155.5L538.5 155L539.7 154.2L539.8 154.1L541.2 153.9L542.6 153.6L543.9 153.4L545.2 153.1L546.5 152.7L547.7 152.4L548.8 152L549.9 151.6L551 151.2L551.9 150.8L552.9 150.4L553.7 149.9L554.5 149.4L555.2 149L555.8 148.5L556.4 148L556.9 147.5L557.3 147L557.6 146.5L557.8 146L558 145.4L558 144.9L558 145.8L556.6 149L555.5 150.2L554.9 150.8ZM551.7 139L552.6 139.4L553.5 139.8L554.3 140.2L555 140.6L555.6 141L556.2 141.5L556.7 141.9L557.1 142.4L557.4 142.9L557.7 143.4L557.8 143.9L557.9 144.4L557.9 144.9L557.9 145.4L557.7 145.9L557.5 146.4L557.2 146.9L556.8 147.4L556.3 147.9L555.7 148.4L555.1 148.9L554.4 149.4L553.7 149.8L552.8 150.3L551.9 150.7L550.9 151.1L549.9 151.5L548.8 151.9L547.7 152.3L546.5 152.6L545.3 153L544 153.3L542.7 153.5L541.3 153.8L539.9 154L557.9 143.7L557.7 143.2L557.4 142.7L557 142.3L556.6 141.8L556.1 141.4L555.6 141L554.9 140.5L554.3 140.1L553.5 139.8L552.7 139.4L551.8 139ZM558 144.9L558 145.4L557.8 146L557.6 146.5L557.3 147L556.9 147.5L556.4 148L555.8 148.5L555.2 149L554.5 149.4L553.7 149.9L552.9 150.4L551.9 150.8L551 151.2L549.9 151.6L548.8 152L547.7 152.4L546.5 152.7L545.2 153.1L543.9 153.4L542.6 153.6L541.2 153.9L539.8 154.1L552.8 150.3L552.8 150.3ZM551.7 139L552.6 139.4L553.5 139.8L554.3 140.2L555 140.6L555.6 141L556.2 141.5L556.7 141.9L557.1 142.4L557.4 142.9L557.7 143.4L557.8 143.9L557.9 144.4L557.9 144.9L557.9 145.4L557.7 145.9L557.5 146.4L557.2 146.9L556.8 147.4L556.3 147.9L555.7 148.4L555.1 148.9L554.4 149.4L553.7 149.8L552.8 150.3L551.9 150.7L550.9 151.1L549.9 151.5L548.8 151.9L547.7 152.3L546.5 152.6L545.3 153L544 153.3L542.7 153.5L541.3 153.8L539.9 154L540.1 153.8L540.4 153.5L540.8 152.7L540.6 151.4L539.4 150.2L540.5 150L541.6 149.8L542.6 149.5L543.6 149.3L544.6 149L545.6 148.7L546.5 148.3L547.3 148L548.1 147.7L548.8 147.3L549.5 146.9L550.2 146.6L550.7 146.2L551.3 145.8L551.7 145.4L552.1 145L552.4 144.5L552.7 144.1L552.9 143.7L553 143.3L553.1 142.9L553.1 142.4L553 142L552.8 141.6L552.6 141.2L552.4 140.8L552 140.4L551.6 140.1L551.2 139.7L550.6 139.3L550 139L549.4 138.6L548.7 138.3L547.9 138L549.3 138.4L550.6 138.7L551.2 138.9L551.6 139Z\"/><path class=\"iso-top\" d=\"M495.5 164.3L495.3 163.7L495.1 163.1L495.1 162.5L495.1 161.8L495.1 163.1L495.1 163.1ZM495.5 164.3L495.3 163.7L495.1 163.1L495.1 162.5L495.1 161.8L495.3 161.2L495.4 160.9L495.4 160.8L495.4 160.6L495.4 160.1L495.4 159L495.8 156.7L496.5 154.5L497.5 152.2L498.7 150L500.1 147.8L506.4 142.4L506.5 142.3L506.5 142.2L506.6 142.2L506.7 142L506.7 142L506.8 142L506.8 141.9L506.9 141.8L507 141.8L507 141.8L507.4 141.5L507.9 141.2L507.9 141.2L508 141.1L508.1 141.1L508.4 141L509 140.7L509 140.7L509.1 140.7L509.3 140.6L509.6 140.5L510.2 140.3L511.5 139.8L512.8 139.4L512.1 139.7L511.4 140.1L510.8 140.5L510.2 140.9L509.7 141.3L509.3 141.7L508.9 142.1L508.6 142.5L508.4 142.9L508.2 143.4L508.1 143.8L508 144.2L508.1 144.6L508.2 145L508.3 145.5L508.6 145.9L508.9 146.3L509.2 146.6L509.6 147L510.1 147.4L510.7 147.8L511.3 148.1L512 148.4L512.7 148.7L513.5 149L514.3 149.3L515.2 149.6L516.1 149.8L517.1 150.1L518.1 150.3L519.1 150.5L520.2 150.6L521.3 150.8L522.5 150.9L523.6 151L524.8 151.1L526 151.1L527.2 151.2L528.5 151.2L529.7 151.1L530.9 151.1L532.2 151L533.4 151L534.6 150.9L535.8 150.7L537 150.6L538.2 150.4L539.4 150.2L540.6 151.4L540.8 152.7L540.4 153.5L540.1 153.8L539.9 154L539.8 154.1L539.7 154.2L538.5 155L537.7 155.5L537.2 155.7L537 155.8L536.8 155.9L534.4 156.7L531.3 157.4L530.9 157.5L530.4 157.6L529.4 157.7L528.4 157.9L527.8 157.9L527.2 158L524.6 158.2L523.9 158.2L523.2 158.3L521.6 158.3L521.6 158.3L519 160.9L515.8 163.2L512 165.2L507.3 166.7L501.8 167.3L498.5 166.7L496.8 165.8L496.3 165.4L496 165.1L495.8 164.8ZM545 137.1L546.4 137.5L547.7 137.9L548.8 138.4L549.9 138.9L550.7 139.4L551.5 139.9L552.1 140.5L552.6 141.1L552.9 141.7L553.1 142.4L553.1 143L552.9 143.6L552.6 144.3L552.2 144.9L551.6 145.5L550.8 146.1L549.9 146.7L548.9 147.3L547.8 147.8L546.5 148.3L545.2 148.8L543.7 149.2L542.2 149.6L540.5 150L538.8 150.3L537.1 150.6L535.3 150.8L533.4 151L531.6 151.1L529.7 151.1L527.9 151.2L526 151.1L524.2 151L522.5 150.9L520.7 150.7L519.1 150.5L517.5 150.2L516.1 149.8L514.7 149.4L513.4 149L512.3 148.6L511.3 148.1L510.4 147.6L509.6 147L509 146.4L508.5 145.8L508.2 145.2L508.1 144.6L508.1 144L508.2 143.3L508.5 142.7L508.9 142.1L509.5 141.4L510.3 140.8L511.2 140.2L512.2 139.7L513.3 139.1L514.6 138.6L515.9 138.2L517.4 137.7L519 137.3L520.6 137L522.3 136.6L524 136.4L525.8 136.2L527.7 136L529.5 135.9L531.4 135.8L533.3 135.8L535.1 135.8L536.9 135.9L538.7 136.1L540.4 136.3L542 136.5L543.6 136.8L545 137.1L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5L530.6 143.5Z\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M495.1 162.7L495.1 162.2L495.4 158.9L495.5 158.4L496.4 155L496.5 154.5L496.7 154L498.3 150.7L498.5 150.2L500.5 146.9L500.8 146.5L501.2 146L501.5 145.6L502 145.2L503.1 144.2L503.6 143.8L504.1 143.4L504.7 143L505.3 142.6L505.9 142.2L506.6 141.9L507.3 141.5L508.9 140.8L509.6 140.4L510.3 140.1L511.1 139.8L511.9 139.5L515.2 138.4L515.9 138.2L516.7 137.9L517.4 137.7L518.2 137.5L519 137.3L519.8 137.1L520.6 137L521.4 136.8L522.3 136.6L523.2 136.5L524 136.4L524.9 136.3L525.8 136.2L526.8 136.1L527.7 136L528.6 135.9L529.5 135.9L530.5 135.8L531.4 135.8L532.3 135.8L533.3 135.8L534.2 135.8L535.1 135.8L536 135.9L536.9 135.9L537.8 136L538.7 136.1L539.5 136.2L540.4 136.3L541.2 136.4L542 136.5L542.8 136.6L543.6 136.8L544.3 136.9L545 137.1L548.3 138L549.2 138.2L550 138.4L550.8 138.7L551.6 138.9L552.3 139.2L553.9 139.9L554.6 140.2L555.3 140.5L556 140.8L556.6 141.2L557.2 141.5L557.7 141.9L558.9 142.8L559.4 143.1L559.8 143.5L560.2 143.9L560.6 144.3L562.9 147.5L563.2 147.9L563.4 148.3L565.2 151.6L565.4 152L566.6 155.3L566.8 155.8L566.9 156.3L567.4 159.7L567.4 160.2L567.7 182.7L567.7 183.2L567.1 189.9L567 190.4L565.8 197.2L562.1 210.7L562 211.1L560.1 216.7L557.9 222.3L557.7 222.7L552.2 233.8L552 234.1L551.9 234.3L551.7 234.6L551.4 234.8L551.2 235.1L550.9 235.3L550.6 235.6L550.2 235.8L549.9 236.1L549.5 236.3L549 236.5L548.6 236.7L548.1 237L547.6 237.2L547.1 237.4L546.5 237.6L546 237.8L545.4 237.9L544.8 238.1L544.1 238.3L543.5 238.4L542.8 238.6L542.2 238.7L541.5 238.9L540.8 239L540.1 239.1L539.3 239.2L538.6 239.3L537.9 239.4L537.1 239.5L536.4 239.5L535.6 239.6L534.9 239.6L534.1 239.7L533.4 239.7L532.6 239.7L531.8 239.7L531.1 239.7L530.3 239.7L529.6 239.6L528.9 239.6L528.1 239.5L527.4 239.5L526.7 239.4L526 239.3L525.4 239.2L524.7 239.1L524 239L523.4 238.9L522.8 238.7L522.2 238.6L521.6 238.5L521.1 238.3L520.6 238.1L520.1 238L519.6 237.8L519.1 237.6L518.7 237.4L518.3 237.2L517.9 237L517.6 236.7L517.2 236.5L516.9 236.3L516.7 236.1L516.4 235.8L516.2 235.6L516.1 235.3L509.7 224.7L509.5 224.4L506.8 219L506.6 218.6L504.4 213.2L499.7 200L499.5 199.6L497.7 192.9L497.6 192.4L496.6 185.7L496.6 185.2Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.yoke\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M488 163.8L488.1 163L488.2 162.2L488.3 161.5L488.7 160L488.9 159.2L489.2 158.4L489.6 157.7L490.5 156.3L490.9 155.6L491.4 154.9L492 154.4L492.6 154L500.2 149.4L500.9 149L508.8 145L516.9 141.5L525.1 138.3L526 138L534.3 135.2L542.8 132.8L551.4 130.8L552.2 130.6L560.9 129.3L561.7 129.2L562.4 129.3L563.2 129.4L564.9 130L565.6 130.2L566.4 130.5L567.1 131L568.4 131.9L569 132.3L569.6 132.8L570.2 133.4L570.7 134L571.2 134.6L571.7 135.3L572.1 136.1L572.5 136.8L572.8 137.6L573.1 138.5L573.4 139.3L573.6 140.1L573.7 141L573.8 141.8L573.8 142.7L573.8 143.5L573.7 144.2L573.6 145L573.2 146.5L572.9 147.3L572.6 148.1L572.3 148.8L571.4 150.2L570.9 150.9L570.4 151.5L569.9 152L569.2 152.5L561.7 157L560.9 157.4L553.1 161.4L545 165L536.8 168.1L535.9 168.4L527.6 171.3L519.1 173.7L510.5 175.7L509.7 175.8L501 177.2L500.2 177.2L499.4 177.2L498.6 177L497 176.5L496.2 176.2L495.5 175.9L494.8 175.5L493.4 174.5L492.8 174.1L492.3 173.6L491.7 173.1L491.2 172.5L490.7 171.8L490.2 171.1L489.8 170.4L489.4 169.6L489 168.8L488.7 168L488.5 167.2L488.3 166.3L488.2 165.5L488.1 164.6Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M494.1 174.9L494.9 175.2L495.7 175.4L496.4 175.5L497.2 175.5L497.9 175.3L498.5 175L499.1 174.5L499.7 174L500.2 173.3L500.5 172.5L500.9 171.7L501.1 170.7L501.2 169.8L501.2 168.7L501.2 167.6L502.1 168L503.1 168.1L504 167.6L504.8 166.7L505.4 165.3L505.7 163.4L505.7 163.4L511.9 161L517.9 158.6L523.7 156.2L529.5 153.9L535.1 151.7L540.6 149.5L540.6 149.5L546 147.4L551.3 145.3L556.4 143.2L561.5 141.1L566.4 139.2L571.1 137.3L571.1 137.3L571.1 137.2L571 137.1L571 136.8L570.9 136.4L570.7 135.6L570.6 135.3L570.6 135.2L570.6 135.1L570.5 135L570.4 134.6L570.3 134L570.4 133.9L570.7 134.2L571.3 134.7L571.9 135.6L572.4 136.6L572.8 137.6L573.2 138.6L573.5 139.6L573.7 140.7L573.8 141.7L573.8 142.7L573.8 143.7L573.6 144.6L573.4 145.5L573.1 146.3L573 146.9L572.8 147.5L572.6 148.1L572.4 148.6L572.3 148.8L572.3 148.9L572.3 148.9L572.2 149L572.2 149.1L572 149.3L571.9 149.3L571.8 149.4L571.8 149.4L571.8 149.4L568.8 152.8L563.7 155.9L558.5 158.7L553.3 161.3L547.9 163.7L542.5 166L537 168L535.7 168.5L530.2 170.4L524.6 172.2L519 173.7L513.2 175.1L507.4 176.2L501.6 177.1L497.1 176.4L496.6 176.4L496.1 176.2L495.6 175.9L495.1 175.6L494.6 175.2Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M501.2 167.6L501 166.8L500.9 165.9L500.6 165L501.6 165.1L502.6 164.9L503.4 164.4L504.1 163.6L504.6 162.4L504.7 160.8L504.7 160.8L510.7 158.1L516.6 155.5L522.4 153.1L528 150.7L533.6 148.4L539.1 146.2L539.1 146.2L544.5 144.1L549.7 142.1L554.9 140.1L560 138.2L564.9 136.4L569.7 134.8L569.7 134.8L569.7 134.7L569.6 134.5L569.6 134.3L569.4 133.9L569 133.1L568.8 132.8L568.7 132.6L568.6 132.5L568.6 132.5L568.3 132L567.9 131.5L567.9 131.5L568.5 132L569.4 132.6L570.1 133.3L570.7 134L571.3 134.7L570.7 134.2L570.4 133.9L570.3 134L570.4 134.6L570.5 135L570.6 135.1L570.6 135.2L570.6 135.3L570.7 135.6L570.9 136.4L571 136.8L571 137.1L571.1 137.2L571.1 137.3L571.1 137.3L566.4 139.2L561.5 141.1L556.4 143.2L551.3 145.3L546 147.4L540.6 149.5L540.6 149.5L535.1 151.7L529.5 153.9L523.7 156.2L517.9 158.6L511.9 161L505.7 163.4L505.7 163.4L505.4 165.3L504.8 166.7L504 167.6L503.1 168.1L502.1 168Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M500.6 165L500.3 164.1L499.9 163.2L499.5 162.3L500.4 162.1L501.3 161.7L502.1 161.2L502.7 160.4L503.1 159.4L503 158L503 158L508.9 155.1L514.7 152.4L520.3 149.8L525.9 147.3L531.3 145L536.8 142.9L536.8 142.9L542.2 140.8L547.4 138.8L552.6 136.9L557.8 135.1L562.8 133.6L567.7 132.2L567.7 132.2L567.6 132.1L567.5 132L567.4 131.7L567 131.3L566.2 130.6L565.8 130.3L565.6 130.2L565.5 130.1L565.5 130.1L565.8 130.2L566.3 130.5L566.8 130.9L567.3 131.2L567.8 131.5L568.3 131.9L568.9 132.2L569.4 132.6L568.5 132L567.9 131.5L567.9 131.5L568.3 132L568.6 132.5L568.6 132.5L568.7 132.6L568.8 132.8L569 133.1L569.4 133.9L569.6 134.3L569.6 134.5L569.7 134.7L569.7 134.8L569.7 134.8L564.9 136.4L560 138.2L554.9 140.1L549.7 142.1L544.5 144.1L539.1 146.2L539.1 146.2L533.6 148.4L528 150.7L522.4 153.1L516.6 155.5L510.7 158.1L504.7 160.8L504.7 160.8L504.6 162.4L504.1 163.6L503.4 164.4L502.6 164.9L501.6 165.1Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M499.5 162.3L499.1 161.6L498.5 160.8L498 160.1L498.8 159.6L499.6 159L500.3 158.4L500.9 157.7L501.3 156.9L501 155.7L501 155.7L506.7 152.7L512.2 149.8L517.7 147.1L523.2 144.6L528.6 142.3L533.9 140.1L533.9 140.1L539.3 138L544.6 136.1L549.8 134.3L554.9 132.7L560 131.3L565 130.2L565 130.2L564.9 130.1L564.8 130L564.9 130L565 130L565.3 130.1L565.4 130.1L565.5 130.1L565.6 130.2L565.8 130.3L566.2 130.6L567 131.3L567.4 131.7L567.5 132L567.6 132.1L567.7 132.2L567.7 132.2L562.8 133.6L557.8 135.1L552.6 136.9L547.4 138.8L542.2 140.8L536.8 142.9L536.8 142.9L531.3 145L525.9 147.3L520.3 149.8L514.7 152.4L508.9 155.1L503 158L503 158L503.1 159.4L502.7 160.4L502.1 161.2L501.3 161.7L500.4 162.1ZM565.6 130.2L565.5 130.1L565.6 130.1L565.6 130.1ZM494.6 166.4L494.6 166.4L494.6 166.4L494.6 166.4L494.6 166.4L494.6 166.4L494.6 166.4L494.6 166.4L494.6 166.4L494.6 166.4L494.6 166.4L494.6 166.4L494.6 166.4L494.6 166.4L494.6 166.4L494.6 166.4L494.6 166.4L494.6 166.4L494.6 166.4L494.6 166.4L494.6 166.4L494.6 166.4L494.6 166.4L494.6 166.4L494.6 166.4L494.6 166.4L494.6 166.4L494.6 166.4L494.6 166.4L494.6 166.4L494.6 166.4L494.6 166.4L494.6 166.4L494.6 166.4L494.6 166.4L501.2 168.9L501.1 170.5L500.8 171.9L500.2 173.2L499.5 174.2L498.6 174.9L497.6 175.4L496.4 175.5L495.2 175.4L494 174.9L492.8 174.1L491.7 173.1L490.7 171.8L489.8 170.4L489 168.8L488.5 167.2L488.2 165.5L488 163.8L488.2 162.2L488.5 160.8L489 159.6L489.8 158.5L490.7 157.8L491.7 157.3L492.8 157.2L494 157.4L495.2 157.8L496.4 158.6L497.6 159.6L498.6 160.9L499.5 162.3L500.2 163.9L500.8 165.6L501.1 167.3L501.2 168.9Z\"/><path class=\"iso-top\" d=\"M498 160.1L497.3 159.4L496.6 158.7L495.8 158.2L495.1 157.8L494.3 157.4L493.5 157.3L492.8 157.2L492 157.3L491.4 157.5L490.7 157.8L490.1 158.2L489.6 158.7L489.1 159.4L488.7 160.1L488.9 159.6L489.1 159L489.2 158.4L489.4 157.9L489.7 157.4L490.1 157L493.1 153.7L498.2 150.6L503.3 147.7L508.6 145.1L514 142.7L519.4 140.5L524.9 138.4L526.1 138L531.7 136.1L537.3 134.3L542.9 132.7L548.6 131.4L554.4 130.2L560.3 129.4L564.8 130L564.8 130L564.9 130.1L565 130.2L565 130.2L560 131.3L554.9 132.7L549.8 134.3L544.6 136.1L539.3 138L533.9 140.1L533.9 140.1L528.6 142.3L523.2 144.6L517.7 147.1L512.2 149.8L506.7 152.7L501 155.7L501 155.7L501.3 156.9L500.9 157.7L500.3 158.4L499.6 159L498.8 159.6ZM564.9 130.1L564.8 130L564.9 130L564.9 130Z\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M488 163.8L488.1 163L488.2 162.2L488.3 161.5L488.7 160L488.9 159.2L489.2 158.4L489.6 157.7L490.5 156.3L490.9 155.6L491.4 154.9L492 154.4L492.6 154L500.2 149.4L500.9 149L508.8 145L516.9 141.5L525.1 138.3L526 138L534.3 135.2L542.8 132.8L551.4 130.8L552.2 130.6L560.9 129.3L561.7 129.2L562.4 129.3L563.2 129.4L564.9 130L565.6 130.2L566.4 130.5L567.1 131L568.4 131.9L569 132.3L569.6 132.8L570.2 133.4L570.7 134L571.2 134.6L571.7 135.3L572.1 136.1L572.5 136.8L572.8 137.6L573.1 138.5L573.4 139.3L573.6 140.1L573.7 141L573.8 141.8L573.8 142.7L573.8 143.5L573.7 144.2L573.6 145L573.2 146.5L572.9 147.3L572.6 148.1L572.3 148.8L571.4 150.2L570.9 150.9L570.4 151.5L569.9 152L569.2 152.5L561.7 157L560.9 157.4L553.1 161.4L545 165L536.8 168.1L535.9 168.4L527.6 171.3L519.1 173.7L510.5 175.7L509.7 175.8L501 177.2L500.2 177.2L499.4 177.2L498.6 177L497 176.5L496.2 176.2L495.5 175.9L494.8 175.5L493.4 174.5L492.8 174.1L492.3 173.6L491.7 173.1L491.2 172.5L490.7 171.8L490.2 171.1L489.8 170.4L489.4 169.6L489 168.8L488.7 168L488.5 167.2L488.3 166.3L488.2 165.5L488.1 164.6Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.neck\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M520.3 137.3L520.3 137.2L520.3 137.1L520.3 136.9L520.4 136.8L520.4 136.7L520.4 136.5L520.4 136.4L520.4 136.3L520.5 136.1L520.5 136L520.5 135.9L520.5 135.7L520.6 135.6L520.6 135.5L520.6 135.3L520.6 135.2L520.7 135.1L520.7 134.9L520.7 134.8L520.7 134.7L520.7 134.5L520.8 134.4L520.8 134.3L520.8 134.2L520.8 134.2L520.8 134L520.8 133.9L520.8 133.8L520.8 133.6L520.8 133.5L520.8 133.4L520.8 133.2L520.8 133.1L520.8 133L520.8 132.8L520.8 132.7L520.8 132.6L520.8 132.4L520.9 132.3L520.9 132.2L520.9 132L520.9 131.9L520.9 131.8L520.9 131.6L520.9 131.5L520.9 131.4L520.9 131.2L520.9 131.2L520.9 131.1L520.9 131L520.8 130.9L520.8 130.7L520.8 130.6L520.8 130.5L520.8 130.3L520.7 130.2L520.7 130.1L520.7 129.9L520.7 129.8L520.7 129.7L520.7 129.5L520.6 129.4L520.6 129.3L520.6 129.1L520.6 129L520.6 128.9L520.5 128.7L520.5 128.6L520.5 128.5L520.5 128.3L520.5 128.2L520.5 128.2L520.5 128.1L520.4 128L520.4 127.9L520.3 127.7L520.3 127.6L520.2 127.5L520.2 127.4L520.2 127.2L520.1 127.1L520.1 127L520 126.8L520 126.7L520 126.6L519.9 126.4L519.9 126.3L519.8 126.2L519.8 126L519.8 125.9L519.7 125.8L519.7 125.7L519.6 125.5L519.6 125.4L519.5 125.3L519.5 125.1L519.5 125.1L519.5 124.9L519.5 124.7L519.5 124.4L519.6 124.2L519.7 124L519.9 123.8L520.1 123.5L520.3 123.3L520.6 123.1L521 122.9L521.3 122.7L521.7 122.5L522.2 122.3L522.7 122.1L523.2 121.9L523.7 121.8L524.2 121.6L524.8 121.5L525.4 121.4L526.1 121.3L526.7 121.2L527.3 121.1L528 121L528.7 120.9L529.3 120.9L530 120.9L530.7 120.9L531.4 120.9L532 120.9L532.7 120.9L533.3 121L534 121L534.6 121.1L535.2 121.2L535.7 121.3L536.3 121.4L536.8 121.6L537.3 121.7L537.7 121.9L538.1 122L538.5 122.2L538.9 122.4L539.2 122.6L539.5 122.8L539.7 123L539.9 123.2L540 123.4L540.1 123.6L540.2 123.9L540.2 124.1L540.2 124.3L540.2 124.3L540.1 124.5L540.1 124.6L540.1 124.7L540 124.9L540 125L540 125.1L539.9 125.3L539.9 125.4L539.9 125.5L539.8 125.7L539.8 125.8L539.8 125.9L539.8 126.1L539.7 126.2L539.7 126.3L539.7 126.5L539.6 126.6L539.6 126.7L539.6 126.9L539.5 127L539.5 127.1L539.5 127.3L539.4 127.4L539.4 127.4L539.4 127.5L539.4 127.6L539.4 127.7L539.4 127.9L539.4 128L539.4 128.1L539.4 128.3L539.4 128.4L539.4 128.6L539.4 128.7L539.4 128.8L539.3 129L539.3 129.1L539.3 129.2L539.3 129.4L539.3 129.5L539.3 129.6L539.3 129.8L539.3 129.9L539.3 130L539.3 130.2L539.3 130.3L539.3 130.4L539.3 130.5L539.3 130.5L539.3 130.6L539.3 130.8L539.3 130.9L539.3 131L539.3 131.2L539.3 131.3L539.4 131.4L539.4 131.6L539.4 131.7L539.4 131.8L539.4 132L539.4 132.1L539.4 132.2L539.5 132.4L539.5 132.5L539.5 132.6L539.5 132.8L539.5 132.9L539.5 133L539.5 133.2L539.5 133.3L539.6 133.4L539.6 133.5L539.6 133.5L539.6 133.7L539.6 133.8L539.7 133.9L539.7 134.1L539.7 134.2L539.8 134.3L539.8 134.5L539.8 134.6L539.9 134.7L539.9 134.9L539.9 135L540 135.1L540 135.3L540 135.4L540.1 135.5L540.1 135.6L540.1 135.8L540.2 135.9L540.2 136L540.3 136.2L540.3 136.3L540.3 136.4L540.4 136.6L540.4 136.6L540.4 136.8L540.4 137L540.3 137.2L540.2 137.4L540.1 137.7L539.9 137.9L539.7 138.1L539.5 138.3L539.2 138.5L538.9 138.7L538.5 138.9L538.1 139.1L537.7 139.3L537.2 139.5L536.7 139.6L536.2 139.8L535.7 139.9L535.1 140L534.5 140.2L533.9 140.3L533.3 140.4L532.7 140.4L532.1 140.5L531.4 140.6L530.8 140.6L530.1 140.6L529.5 140.6L528.8 140.6L528.2 140.6L527.6 140.6L526.9 140.5L526.3 140.5L525.7 140.4L525.2 140.3L524.6 140.2L524.1 140.1L523.6 140L523.1 139.8L522.7 139.7L522.3 139.5L521.9 139.4L521.6 139.2L521.3 139L521 138.8L520.8 138.6L520.6 138.4L520.4 138.2L520.3 138L520.3 137.8L520.2 137.6L520.3 137.3Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M540.4 136.7L540.4 137.1L540.2 137.5L539.9 137.9L539.5 138.3L538.9 138.7L538.2 139L537.4 139.4L536.5 139.7L535.5 140L534.4 140.2L533.6 139.2L532.8 138.1L532.1 137.1L531.5 136L531 135L530.7 134.4L530.7 134.3L530.7 134.2L530.6 134.2L530.5 133.9L530.5 133.9L529.7 132.9L528.9 131.9L528.2 130.8L527.8 130.3L527.6 130.1L527.5 129.9L527.5 129.9L527.4 129.8L526.7 128.8L525.9 127.8L527.1 127.9L528.4 127.9L529.8 127.9L531.1 127.9L532.4 127.7L533.6 127.6L534.8 127.3L535.9 127L536.9 126.7L537.8 126.4L538.6 126L539.2 125.6L539.7 125.1L540 124.7L540.2 124.2L539.9 125.3L539.6 126.4L539.6 126.4L539.6 126.5L539.6 126.6L539.5 126.9L539.4 127.4L539.3 128.5L539.2 129.6L539.2 130.6L539.2 130.3L539.2 130.6L539.3 130.6L539.3 130.7L539.3 130.8L539.3 131.4L539.4 132.4L539.6 133.5L539.8 134.5L540 135.6Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M534.4 140.2L533.3 140.4L532.2 140.5L531.1 140.6L530.3 139.5L529.7 138.3L529.1 137.2L528.5 136.1L528 135L527.7 134.4L527.7 134.3L527.6 134.2L527.6 134.2L527.5 133.9L527.5 133.9L526.7 132.8L525.8 131.7L525 130.5L524.5 130L524.3 129.7L524.2 129.5L524.1 129.5L524.1 129.4L523.2 128.2L522.2 127.1L523 127.3L523.9 127.5L524.9 127.7L525.9 127.8L526.7 128.8L527.4 129.8L527.5 129.9L527.5 129.9L527.6 130.1L527.8 130.3L528.2 130.8L528.9 131.9L529.7 132.9L530.5 133.9L530.5 133.9L530.6 134.2L530.7 134.2L530.7 134.3L530.7 134.4L531 135L531.5 136L532.1 137.1L532.8 138.1L533.6 139.2Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M531.1 140.6L529.8 140.6L528.5 140.6L527.3 140.6L526.7 139.4L526.1 138.1L525.6 136.9L525.1 135.8L524.6 134.6L524.3 134L524.3 133.8L524.2 133.7L524.2 133.7L524.1 133.4L524.1 133.4L523.2 132.1L522.3 130.7L521.3 129.2L520.8 128.4L520.5 127.8L520.3 127.5L520.2 127.2L520.2 127.1L519.9 126.1L519.5 125L519.6 125.4L519.9 125.8L520.3 126.1L520.8 126.5L521.5 126.8L522.2 127.1L523.2 128.2L524.1 129.4L524.1 129.5L524.2 129.5L524.3 129.7L524.5 130L525 130.5L525.8 131.7L526.7 132.8L527.5 133.9L527.5 133.9L527.6 134.2L527.6 134.2L527.7 134.3L527.7 134.4L528 135L528.5 136.1L529.1 137.2L529.7 138.3L530.3 139.5Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M527.3 140.6L526.3 140.5L525.4 140.4L524.6 140.2L523.8 140L523.3 138.7L522.8 137.4L522.4 136L521.9 134.6L521.4 133.1L521.1 132.3L521 132L521.2 132.4L521.6 132.7L522.1 133L522.7 133.3L523.5 133.6L524.3 133.8L524.3 134L524.6 134.6L525.1 135.8L525.6 136.9L526.1 138.1L526.7 139.4ZM524.3 133.8L523.5 133.6L522.7 133.3L522.1 133L521.6 132.7L521.2 132.4L521 132L521 131.8L521.2 132.2L521.5 132.6L522 132.9L522.6 133.2L523.4 133.5L524.2 133.7ZM520.9 131.4L520.9 131.3L520.9 131.4L520.9 131.4ZM524.2 133.7L523.3 133.4L522.6 133.1L522 132.8L521.5 132.5L521.1 132.1L520.9 131.7L520.9 131.3L520.9 131.3L520.9 131.4ZM524.2 133.7L523.4 133.5L522.6 133.2L522 132.9L521.5 132.6L521.2 132.2L521 131.8L522 132.8L522 132.8ZM524.2 133.7L523.3 133.4L522.6 133.1L522 132.8L521.5 132.5L521.1 132.1L520.9 131.7L520.9 131.3L520.9 131L520.9 131.4L520.8 130.3L520.7 129.2L520.5 128.2L520.3 127.7L520.3 127.4L520.2 127.3L520.2 127.2L520.2 127.2L520.3 127.5L520.5 127.8L520.8 128.4L521.3 129.2L522.3 130.7L523.2 132.1L524.1 133.4L524.1 133.4ZM520.2 127.1L520.2 127.1L520.2 127.2L520.2 127.2Z\"/><path class=\"iso-top\" d=\"M523.8 140L522.8 139.7L522 139.4L521.4 139.1L520.8 138.7L520.5 138.3L520.3 137.9L520.2 137.4L520.5 136.4L520.7 135.3L520.8 134.2L520.9 133.1L520.9 132.1L520.9 131.5L520.9 131.4L520.9 131.4L520.9 131.6L521 131.8L521 132L521.1 132.3L521.4 133.1L521.9 134.6L522.4 136L522.8 137.4L523.3 138.7ZM521 131.8L520.9 131.6L520.9 131.4L520.9 131.5L520.9 131.5ZM536.5 121.5L537.9 121.9L539 122.5L539.8 123.1L540.2 123.8L540.1 124.4L539.7 125.1L538.9 125.8L537.8 126.4L536.3 126.9L534.6 127.4L532.7 127.7L530.7 127.9L528.7 127.9L526.7 127.9L524.8 127.7L523.1 127.3L521.7 126.9L520.6 126.3L519.9 125.7L519.5 125.1L519.5 124.4L519.9 123.7L520.7 123L521.9 122.4L523.3 121.9L525 121.4L526.9 121.1L528.9 120.9L531 120.9L532.9 120.9L534.8 121.2L536.5 121.5L529.8 124.4L529.8 124.4L529.8 124.4L529.8 124.4L529.8 124.4L529.8 124.4L529.8 124.4L529.8 124.4L529.8 124.4L529.8 124.4L529.8 124.4L529.8 124.4L529.8 124.4L529.8 124.4L529.8 124.4L529.8 124.4L529.8 124.4L529.8 124.4L529.8 124.4L529.8 124.4L529.8 124.4L529.8 124.4L529.8 124.4L529.8 124.4L529.8 124.4L529.8 124.4L529.8 124.4L529.8 124.4L529.8 124.4L529.8 124.4L529.8 124.4L529.8 124.4L529.8 124.4Z\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M520.3 137.3L520.3 137.2L520.3 137.1L520.3 136.9L520.4 136.8L520.4 136.7L520.4 136.5L520.4 136.4L520.4 136.3L520.5 136.1L520.5 136L520.5 135.9L520.5 135.7L520.6 135.6L520.6 135.5L520.6 135.3L520.6 135.2L520.7 135.1L520.7 134.9L520.7 134.8L520.7 134.7L520.7 134.5L520.8 134.4L520.8 134.3L520.8 134.2L520.8 134.2L520.8 134L520.8 133.9L520.8 133.8L520.8 133.6L520.8 133.5L520.8 133.4L520.8 133.2L520.8 133.1L520.8 133L520.8 132.8L520.8 132.7L520.8 132.6L520.8 132.4L520.9 132.3L520.9 132.2L520.9 132L520.9 131.9L520.9 131.8L520.9 131.6L520.9 131.5L520.9 131.4L520.9 131.2L520.9 131.2L520.9 131.1L520.9 131L520.8 130.9L520.8 130.7L520.8 130.6L520.8 130.5L520.8 130.3L520.7 130.2L520.7 130.1L520.7 129.9L520.7 129.8L520.7 129.7L520.7 129.5L520.6 129.4L520.6 129.3L520.6 129.1L520.6 129L520.6 128.9L520.5 128.7L520.5 128.6L520.5 128.5L520.5 128.3L520.5 128.2L520.5 128.2L520.5 128.1L520.4 128L520.4 127.9L520.3 127.7L520.3 127.6L520.2 127.5L520.2 127.4L520.2 127.2L520.1 127.1L520.1 127L520 126.8L520 126.7L520 126.6L519.9 126.4L519.9 126.3L519.8 126.2L519.8 126L519.8 125.9L519.7 125.8L519.7 125.7L519.6 125.5L519.6 125.4L519.5 125.3L519.5 125.1M540.4 136.6L540.3 136.4L540.3 136.3L540.3 136.2L540.2 136L540.2 135.9L540.1 135.8L540.1 135.6L540.1 135.5L540 135.4L540 135.3L540 135.1L539.9 135L539.9 134.9L539.9 134.7L539.8 134.6L539.8 134.5L539.8 134.3L539.7 134.2L539.7 134.1L539.7 133.9L539.6 133.8L539.6 133.7L539.6 133.5L539.6 133.5L539.6 133.4L539.5 133.3L539.5 133.2L539.5 133L539.5 132.9L539.5 132.8L539.5 132.6L539.5 132.5L539.5 132.4L539.4 132.2L539.4 132.1L539.4 132L539.4 131.8L539.4 131.7L539.4 131.6L539.4 131.4L539.3 131.3L539.3 131.2L539.3 131L539.3 130.9L539.3 130.8L539.3 130.6L539.3 130.5L539.3 130.5L539.3 130.4L539.3 130.3L539.3 130.2L539.3 130L539.3 129.9L539.3 129.8L539.3 129.6L539.3 129.5L539.3 129.4L539.3 129.2L539.3 129.1L539.3 129L539.4 128.8L539.4 128.7L539.4 128.6L539.4 128.4L539.4 128.3L539.4 128.1L539.4 128L539.4 127.9L539.4 127.7L539.4 127.6L539.4 127.5L539.4 127.4L539.4 127.4L539.5 127.3L539.5 127.1L539.5 127L539.6 126.9L539.6 126.7L539.6 126.6L539.7 126.5L539.7 126.3L539.7 126.2L539.8 126.1L539.8 125.9L539.8 125.8L539.8 125.7L539.9 125.5L539.9 125.4L539.9 125.3L540 125.1L540 125L540 124.9L540.1 124.7L540.1 124.6L540.1 124.5L540.2 124.3M519.5 125.1L519.5 124.9L519.5 124.7L519.5 124.4L519.6 124.2L519.7 124L519.9 123.8L520.1 123.5L520.3 123.3L520.6 123.1L521 122.9L521.3 122.7L521.7 122.5L522.2 122.3L522.7 122.1L523.2 121.9L523.7 121.8L524.2 121.6L524.8 121.5L525.4 121.4L526.1 121.3L526.7 121.2L527.3 121.1L528 121L528.7 120.9L529.3 120.9L530 120.9L530.7 120.9L531.4 120.9L532 120.9L532.7 120.9L533.3 121L534 121L534.6 121.1L535.2 121.2L535.7 121.3L536.3 121.4L536.8 121.6L537.3 121.7L537.7 121.9L538.1 122L538.5 122.2L538.9 122.4L539.2 122.6L539.5 122.8L539.7 123L539.9 123.2L540 123.4L540.1 123.6L540.2 123.9L540.2 124.1L540.2 124.3M540.4 136.6L540.4 136.8L540.4 137L540.3 137.2L540.2 137.4L540.1 137.7L539.9 137.9L539.7 138.1L539.5 138.3L539.2 138.5L538.9 138.7L538.5 138.9L538.1 139.1L537.7 139.3L537.2 139.5L536.7 139.6L536.2 139.8L535.7 139.9L535.1 140L534.5 140.2L533.9 140.3L533.3 140.4L532.7 140.4L532.1 140.5L531.4 140.6L530.8 140.6L530.1 140.6L529.5 140.6L528.8 140.6L528.2 140.6L527.6 140.6L526.9 140.5L526.3 140.5L525.7 140.4L525.2 140.3L524.6 140.2L524.1 140.1L523.6 140L523.1 139.8L522.7 139.7L522.3 139.5L521.9 139.4L521.6 139.2L521.3 139L521 138.8L520.8 138.6L520.6 138.4L520.4 138.2L520.3 138L520.3 137.8L520.2 137.6L520.3 137.3\"/></g></g><g class=\"mq-joint\" data-name=\"as.neckball\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M518.8 137.2L518.9 135.4L519.3 133.6L520 132L521 130.4L522.1 129L523.5 127.8L525.1 126.9L526.7 126.2L528.5 125.8L530.3 125.6L532.1 125.8L533.9 126.2L535.6 126.9L537.1 127.8L538.5 129L539.7 130.4L540.6 132L541.3 133.6L541.7 135.4L541.9 137.2L541.7 139L541.3 140.8L540.6 142.5L539.7 144L538.5 145.4L537.1 146.6L535.6 147.5L533.9 148.2L532.1 148.6L530.3 148.8L528.5 148.6L526.7 148.2L525.1 147.5L523.5 146.6L522.1 145.4L521 144L520 142.5L519.3 140.8L518.9 139Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M518.8 137.2L518.9 135.4L519.3 133.6L520 132L521 130.4L522.1 129L523.5 127.8L525.1 126.9L526.7 126.2L528.5 125.8L530.3 125.6L532.1 125.8L533.9 126.2L535.6 126.9L537.1 127.8L538.5 129L539.7 130.4L540.6 132L541.3 133.6L541.7 135.4L541.9 137.2L541.7 139L541.3 140.8L540.6 142.5L539.7 144L538.5 145.4L537.1 146.6L535.6 147.5L533.9 148.2L532.1 148.6L530.3 148.8L528.5 148.6L526.7 148.2L525.1 147.5L523.5 146.6L522.1 145.4L521 144L520 142.5L519.3 140.8L518.9 139Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M518.8 137.2L518.9 135.4L519.3 133.6L520 132L521 130.4L522.1 129L523.5 127.8L525.1 126.9L526.7 126.2L528.5 125.8L530.3 125.6L532.1 125.8L533.9 126.2L535.6 126.9L537.1 127.8L537.4 128.2L537.5 128.8L537.4 129.6L537.1 130.5L536.6 131.5L535.9 132.6L535 133.8L533.9 135L532.8 136.3L531.5 137.5L530.2 138.7L528.8 139.8L527.5 140.8L526.1 141.7L524.9 142.4L523.7 142.9L522.7 143.3L521.8 143.5L521.1 143.5L520.6 143.3L520 142.5L519.3 140.8L518.9 139Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M518.8 137.2L518.9 135.4L519.3 133.6L520 132L521 130.4L522.1 129L523.5 127.8L525.1 126.9L526.7 126.2L528.5 125.8L530.3 125.6L532.1 125.8L533.9 126.2L534.9 126.6L535.2 127L535.3 127.5L535.2 128.2L534.9 129L534.4 130L533.7 131L532.9 132.1L531.9 133.3L530.9 134.4L529.7 135.6L528.5 136.7L527.2 137.7L525.9 138.6L524.7 139.4L523.5 140.1L522.5 140.6L521.5 140.9L520.7 141.1L520 141.1L519.5 140.9L519.2 140.5L518.9 139Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M518.8 137.2L518.9 135.4L519.3 133.6L520 132L521 130.4L522.1 129L523.5 127.8L525.1 126.9L526.7 126.2L528.5 125.8L530.3 125.6L531.9 125.8L532.4 125.9L532.6 126.2L532.7 126.7L532.6 127.3L532.4 128L531.9 128.8L531.4 129.7L530.7 130.7L529.8 131.7L528.9 132.7L527.9 133.7L526.8 134.6L525.7 135.5L524.6 136.3L523.6 137L522.6 137.6L521.6 138L520.8 138.3L520.1 138.5L519.5 138.4L519.1 138.3L518.8 137.9Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M518.8 137.2L518.9 135.4L519.3 133.6L520 132L521 130.4L522.1 129L523.5 127.8L525.1 126.9L526.7 126.2L528.5 125.8L530.3 125.6L532.1 125.8L533.9 126.2L535.6 126.9L537.1 127.8L538.5 129L539.7 130.4L540.6 132L541.3 133.6L541.7 135.4L541.9 137.2L541.7 139L541.3 140.8L540.6 142.5L539.7 144L538.5 145.4L537.1 146.6L535.6 147.5L533.9 148.2L532.1 148.6L530.3 148.8L528.5 148.6L526.7 148.2L525.1 147.5L523.5 146.6L522.1 145.4L521 144L520 142.5L519.3 140.8L518.9 139Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.head\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M502.1 96.1L502.1 95.6L502.4 90.2L502.5 89.7L503.6 84.3L503.7 83.8L505.7 78.5L505.9 78.1L509.1 72.9L509.3 72.5L509.6 72.1L511.6 69.6L512 69.3L512.3 69L515.1 66.7L515.5 66.4L515.9 66.1L516.3 65.9L516.8 65.6L517.3 65.4L517.8 65.2L519.6 64.4L520.1 64.2L520.6 64L521.1 63.9L521.7 63.7L522.3 63.6L522.9 63.4L523.5 63.3L524.1 63.2L524.7 63.1L525.9 62.9L526.4 62.9L526.8 62.8L527.3 62.8L527.8 62.7L528.3 62.7L528.8 62.7L529.3 62.7L529.8 62.7L530.3 62.7L530.8 62.8L531.3 62.8L531.7 62.8L532.2 62.9L533.5 63L534.1 63.1L534.7 63.2L535.3 63.3L535.9 63.5L536.5 63.6L537 63.7L537.5 63.9L538 64.1L539.8 64.8L540.4 65L540.9 65.2L541.4 65.4L541.8 65.7L542.3 65.9L542.6 66.2L545.5 68.4L545.9 68.7L546.2 69L548.3 71.4L548.6 71.8L548.9 72.2L552.2 77.3L552.4 77.7L554.6 82.9L554.8 83.4L556 88.7L556.1 89.3L556.6 94.6L556.6 95.2L556.3 100.5L556.3 101.1L555.2 106.4L555.1 106.9L553.1 112.2L552.9 112.7L552.7 113.2L549.5 118.3L549.3 118.7L547.2 121.2L546.9 121.6L546.6 121.9L546.2 122.2L543.4 124.5L543.1 124.8L542.7 125L542.2 125.3L541.7 125.5L541.2 125.8L539.3 126.5L538.9 126.7L538.4 126.9L537.9 127.1L537.3 127.2L536.8 127.4L536.2 127.5L535.6 127.6L535 127.8L534.3 127.9L533.1 128.1L532.6 128.1L532.1 128.2L531.7 128.2L531.2 128.3L530.7 128.3L530.2 128.3L529.7 128.3L529.2 128.3L528.7 128.3L528.2 128.3L527.7 128.3L527.2 128.2L526.8 128.2L525.6 128L524.9 127.9L524.3 127.9L523.7 127.7L523.1 127.6L522.5 127.5L522 127.4L521.5 127.2L521 127L520.5 126.9L518.6 126.2L518.1 125.9L517.6 125.7L517.1 125.5L516.7 125.2L516.3 125L515.9 124.7L513.1 122.5L512.7 122.2L512.4 121.8L510.3 119.4L510 119L506.7 114L506.4 113.5L506.2 113.1L504.1 107.8L503.9 107.3L502.6 102L502.6 101.5Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M543.9 124.1L543.5 124.4L543 124.8L542.5 125.1L541.9 125.4L541.2 125.8L540.5 126L539.7 126.3L538.9 126.6L538 126.8L537.1 127L536.1 127.2L535.1 127.4L534.1 127.5L533.1 127.6L532 127.7L530.9 127.8L529.9 127.8L528.8 127.8L527.7 127.8L526.7 127.7L525.6 127.6L524.6 127.5L523.6 127.4L522.7 127.2L521.7 127.1L520.8 126.9L520 126.6L519.2 126.4L518.5 126.1L517.8 125.8L517.2 125.5L516.6 125.2L516.1 124.8L515.7 124.5L529.9 127.8L529.9 127.8ZM543.9 124.1L543.5 124.4L543 124.8L542.5 125.1L541.9 125.4L541.2 125.8L540.5 126L539.7 126.3L538.9 126.6L538 126.8L537.1 127L536.1 127.2L535.1 127.4L534.1 127.5L533.1 127.6L532 127.7L530.9 127.8L529.9 127.8L528.8 127.8L527.7 127.8L526.7 127.7L525.6 127.6L524.6 127.5L523.6 127.4L522.7 127.2L521.7 127.1L520.8 126.9L520 126.6L519.2 126.4L518.5 126.1L517.8 125.8L517.2 125.5L516.6 125.2L516.1 124.8L515.7 124.5L514.6 123.8L513.6 123L512.8 122.2L512 121.5L512 121.4L512 121.4L512.1 121.5L512.3 121.6L512.5 121.5L512.2 121L512.2 121L512.8 120.8L513.5 120.6L514.3 120.3L515.2 119.9L515.6 119.7L515.7 119.7L515.7 119.6L515.8 119.6L516.1 119.5L517 119L517 119L517.4 118.4L518 117.7L518.7 117.1L519.5 116.5L520.5 115.8L521.7 115.2L521.7 115.2L521.8 114.4L521.9 114.2L521.9 114.2L521.9 114.1L522 114L522.2 113.6L522.9 112.9L523.9 112.1L525.1 111.4L526.6 110.6L526.6 110.6L526.7 109.7L527 108.8L527.4 108L528 107.1L528.9 106.2L529.3 105.8L529.5 105.7L529.5 105.6L529.6 105.6L529.9 105.3L529.9 105.3L530.9 104.4L531.7 103.5L532.3 102.5L532.8 101.6L533 100.6L533.1 99.7L533.1 99.7L534.6 98.6L535.8 97.6L536.8 96.5L537.4 95.4L537.8 94.4L538 93.4L538 93.4L539.1 92.2L540.1 91L540.9 89.8L541.5 88.6L542.1 87.4L542.5 86.3L542.5 86.3L543.4 84.9L544.2 83.5L545 82.1L545.7 80.6L546.3 79L546.9 77.3L546.9 77.3L546.6 76.1L546.7 75.2L546.9 74.7L546.9 74.4L547 74.3L547 74.1L547.5 72.1L547.6 71.6L547.5 71.2L547.4 70.8L546.8 69.7L546.8 69.6L546.8 69.7L546.9 69.8L547 70L547.4 70.4L548 71.2L548.8 72.1L549.5 72.9L550.1 73.8L550.7 74.6L551.2 75.5L551.7 76.3L552.1 77.2L552.5 77.8L552.9 78.7L553.3 79.6L553.7 80.4L554 81.3L554.4 82.2L554.6 83.1L554.8 83.6L555.1 84.5L555.3 85.4L555.6 86.3L555.8 87.2L555.9 88.1L556.1 89L556.2 89.5L556.3 90.4L556.4 91.3L556.5 92.2L556.5 93L556.6 93.9L556.6 94.8L556.6 95.3L556.6 95.6L556.6 95.6L556.6 95.7L556.6 95.8L556.6 96.2L556.6 97.1L556.6 98L556.5 98.9L556.4 99.8L556.3 100.7L556.3 101.2L556.2 102.1L556 103L555.8 103.9L555.6 104.8L555.5 105.2L555.5 105.4L555.5 105.4L555.5 105.5L555.4 105.7L555.2 106.6L555 107.2L554.8 108L554.5 108.9L554.2 109.8L553.8 110.7L553.4 111.6L553 112.5L552.7 113.1L552.3 114L552.2 114.2L552.1 114.3L552.1 114.4L552 114.4L551.8 114.9L551.3 115.7L550.8 116.6L550.2 117.4L549.6 118.3L548.8 119.3L548.1 120.1L547.8 120.5L547.7 120.7L547.6 120.8L547.5 120.9L547.5 120.9L546.8 121.7L546 122.5L545 123.3ZM547.4 70.8L547.5 71.2L547.6 71.6L547.5 72.1L547.5 71.4L547.5 71.4Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M512 121.5L512 121.5L512 121.4L512 121.4ZM512 121.4L512 121.4L511.9 121.3L511.7 121.1L511.4 120.7L510.7 119.9L509.9 118.9L509.3 118.1L508.6 117.2L508.1 116.4L507.5 115.6L507.3 115.1L507.3 115.1L507.3 115.1L507.4 115.3L507.7 115.5L508.6 115.8L508.6 115.8L509 115.4L509.5 115.1L510.1 114.8L511 114.4L512 114L513.1 113.6L513.1 113.6L513.2 112.9L513.3 112.7L513.3 112.6L513.3 112.6L513.3 112.5L513.6 112.2L514.2 111.5L515.2 111L516.4 110.4L518 109.8L518 109.8L518 109L518.3 108.1L518.7 107.3L519.3 106.6L520.2 105.8L520.6 105.4L520.8 105.3L520.8 105.2L520.9 105.2L521.2 105L521.2 105L522.2 104.2L523 103.4L523.7 102.5L524.1 101.6L524.4 100.7L524.5 99.8L524.5 99.8L526 98.9L527.2 98L528.2 97L528.9 96L529.3 95L529.5 94L529.5 94L530.7 93L531.7 92L532.5 90.9L533.2 89.8L533.8 88.7L534.3 87.6L534.3 87.6L535.2 86.5L536.1 85.3L537 84.1L537.8 82.8L538.5 81.6L539.1 80.3L539.1 80.3L539 79.1L539.2 78.5L539.4 78.1L539.5 77.9L540.6 77.6L541.7 77.3L542.7 77L543.6 76.6L544.4 76.2L545.2 75.8L545.9 75.3L546.4 74.9L546.9 74.4L546.9 74.7L546.7 75.2L546.6 76.1L546.9 77.3L546.9 77.3L546.3 79L545.7 80.6L545 82.1L544.2 83.5L543.4 84.9L542.5 86.3L542.5 86.3L542.1 87.4L541.5 88.6L540.9 89.8L540.1 91L539.1 92.2L538 93.4L538 93.4L537.8 94.4L537.4 95.4L536.8 96.5L535.8 97.6L534.6 98.6L533.1 99.7L533.1 99.7L533 100.6L532.8 101.6L532.3 102.5L531.7 103.5L530.9 104.4L529.9 105.3L529.9 105.3L529.6 105.6L529.5 105.6L529.5 105.7L529.3 105.8L528.9 106.2L528 107.1L527.4 108L527 108.8L526.7 109.7L526.6 110.6L526.6 110.6L525.1 111.4L523.9 112.1L522.9 112.9L522.2 113.6L522 114L521.9 114.1L521.9 114.2L521.9 114.2L521.8 114.4L521.7 115.2L521.7 115.2L520.5 115.8L519.5 116.5L518.7 117.1L518 117.7L517.4 118.4L517 119L517 119L516.1 119.5L515.8 119.6L515.7 119.6L515.7 119.7L515.6 119.7L515.2 119.9L514.3 120.3L513.5 120.6L512.8 120.8L512.2 121L512.2 121L512.5 121.5L512.3 121.6L512.1 121.5ZM546.9 74.4L546.4 74.9L545.9 75.3L545.2 75.8L544.4 76.2L543.6 76.6L542.7 77L541.7 77.3L540.6 77.6L539.5 77.9L539.6 77.8L540.6 77.6L541.5 77.3L542.5 77L543.3 76.6L544.1 76.3L544.8 75.9L545.5 75.5L546 75.1L546.6 74.7L547 74.3ZM546.7 69.6L546.8 69.6L546.8 69.7L546.8 69.7ZM546.7 69.6L546.3 69.2L546.7 69.6L547 70L547.3 70.4L547.4 70.8L546.8 69.7L546.8 69.6L546.7 69.6ZM547 74.3L546.6 74.7L546 75.1L545.5 75.5L544.8 75.9L544.1 76.3L543.3 76.6L542.5 77L541.5 77.3L540.6 77.6L539.6 77.8L539.6 77.8L540.2 77L541.2 76.7L542.2 76.3L543 76L543.9 75.6L544.6 75.2L545.3 74.8L545.9 74.4L546.4 73.9L546.8 73.5L547.1 73L547.4 72.5L547.5 72.1L547 74.1ZM546.3 69.1L546.7 69.6L547.1 70L547.3 70.5L547.5 71L547.5 71.4L547.5 71.9L547.4 72.4L547.1 72.9L546.8 73.3L546.4 73.8L545.9 74.2L545.3 74.7L544.7 75.1L543.9 75.5L543.1 75.9L542.2 76.2L541.3 76.6L540.3 76.9L547.4 70.8L547.3 70.4L547 70L546.7 69.6L546.3 69.2ZM547.5 72.1L547.4 72.5L547.1 73L546.8 73.5L546.4 73.9L545.9 74.4L545.3 74.8L544.6 75.2L543.9 75.6L543 76L542.2 76.3L541.2 76.7L540.2 77L545.2 74.7L545.2 74.7ZM546.3 69.1L546.7 69.6L547.1 70L547.3 70.5L547.5 71L547.5 71.4L547.5 71.9L547.4 72.4L547.1 72.9L546.8 73.3L546.4 73.8L545.9 74.2L545.3 74.7L544.7 75.1L543.9 75.5L543.1 75.9L542.2 76.2L541.3 76.6L540.3 76.9L540.3 76.8L540.5 76.6L540.8 76.2L542.5 74.2L544.3 71.3L544.4 71.1L544.5 70.8L544.7 70.1L544.8 69.6L544.9 69.2L544.9 68.8L544.8 68.4L544.6 67.9L544.3 67.5L544.2 67.3L544.2 67.3L545.1 68L546 68.8L546.2 69L546.2 69.1ZM544.8 68.4L544.9 68.8L544.9 69.2L544.8 69.6L544.8 68.9L544.8 68.9Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M507.3 115.1L507.3 115.1L507.2 115L507.3 115.1ZM507.3 115.1L507.2 115L507.2 114.9L507.1 114.7L506.6 113.9L506.3 113.2L505.8 112.3L505.4 111.4L505 110.6L504.7 109.7L504.4 108.8L504.1 108L503.9 107.4L503.7 106.5L503.6 106.3L503.6 106.2L503.6 106.3L503.6 106.4L503.9 106.7L504.5 107L505.5 107.2L506.8 107.2L508.4 107.2L508.4 107.2L508.4 106.4L508.6 105.6L509.1 105L509.7 104.3L510.5 103.8L511 103.5L511.1 103.4L511.2 103.4L511.3 103.3L511.5 103.2L511.5 103.2L512.6 102.6L513.4 101.9L514.1 101.1L514.5 100.3L514.8 99.5L515 98.6L515 98.6L516.5 97.9L517.7 97.2L518.7 96.3L519.4 95.5L519.9 94.5L520.2 93.6L520.2 93.6L521.4 92.7L522.4 91.8L523.3 90.9L524 89.9L524.7 88.9L525.3 87.9L525.3 87.9L526.2 86.8L527.2 85.8L528.1 84.7L528.9 83.6L529.7 82.5L530.5 81.3L530.5 81.3L530.6 80.2L530.9 79.6L531.1 79.3L531.2 79.1L531.3 79.1L531.3 79L531.9 78.4L532 78.3L532.1 78.2L532.2 78.1L532.6 77.7L534.1 76.3L535.8 74.8L536.8 74.6L537.8 74.4L538.8 74.1L539.7 73.8L540.6 73.5L541.4 73.2L542.1 72.9L542.7 72.5L543.3 72.1L543.8 71.7L544.3 71.3L542.5 74.2L540.8 76.2L540.5 76.6L540.3 76.8L540.3 76.9L540.2 77L539.6 77.8L539.6 77.8L539.5 77.9L539.4 78.1L539.2 78.5L539 79.1L539.1 80.3L539.1 80.3L538.5 81.6L537.8 82.8L537 84.1L536.1 85.3L535.2 86.5L534.3 87.6L534.3 87.6L533.8 88.7L533.2 89.8L532.5 90.9L531.7 92L530.7 93L529.5 94L529.5 94L529.3 95L528.9 96L528.2 97L527.2 98L526 98.9L524.5 99.8L524.5 99.8L524.4 100.7L524.1 101.6L523.7 102.5L523 103.4L522.2 104.2L521.2 105L521.2 105L520.9 105.2L520.8 105.2L520.8 105.3L520.6 105.4L520.2 105.8L519.3 106.6L518.7 107.3L518.3 108.1L518 109L518 109.8L518 109.8L516.4 110.4L515.2 111L514.2 111.5L513.6 112.2L513.3 112.5L513.3 112.6L513.3 112.6L513.3 112.7L513.2 112.9L513.1 113.6L513.1 113.6L512 114L511 114.4L510.1 114.8L509.5 115.1L509 115.4L508.6 115.8L508.6 115.8L507.7 115.5L507.4 115.3ZM544.3 71.3L543.8 71.7L543.3 72.1L542.7 72.5L542.1 72.9L541.4 73.2L540.6 73.5L539.7 73.8L538.8 74.1L537.8 74.4L536.8 74.6L535.8 74.8L535.9 74.7L536.9 74.5L537.8 74.3L538.7 74L539.6 73.8L540.4 73.5L541.2 73.2L541.9 72.9L542.5 72.5L543.1 72.2L543.6 71.8L544 71.5L544.4 71.1ZM544.2 67.3L544.2 67.3L544.2 67.3L544.1 67.2ZM544.1 67.2L544.2 67.3L544.3 67.5L544.6 67.9L544.8 68.4L544.6 68L544.4 67.7L544.1 67.3L543.8 67L543.9 67.1L544 67.2ZM544.4 71.1L544 71.5L543.6 71.8L543.1 72.2L542.5 72.5L541.9 72.9L541.2 73.2L540.4 73.5L539.6 73.8L538.7 74L537.8 74.3L536.9 74.5L535.9 74.7L536 74.6L536.2 74.4L536.3 74.3L537.3 74.1L538.3 73.8L539.2 73.6L540 73.3L540.8 73L541.5 72.6L542.2 72.3L542.8 71.9L543.3 71.6L543.8 71.2L544.2 70.8L544.5 70.4L544.7 70L544.8 69.6L544.7 70.1L544.5 70.8ZM543.8 67L544.1 67.3L544.4 67.7L544.6 68.1L544.7 68.5L544.8 68.9L544.8 69.3L544.7 69.7L544.5 70.1L544.3 70.5L544 70.8L543.6 71.2L543.2 71.6L542.6 71.9L542.1 72.3L541.4 72.6L540.7 72.9L539.9 73.2L539.1 73.5L538.3 73.7L537.4 74L536.4 74.2L544.8 68.4L544.6 68L544.4 67.7L544.1 67.3L543.8 67ZM544.8 69.6L544.7 70L544.5 70.4L544.2 70.8L543.8 71.2L543.3 71.6L542.8 71.9L542.2 72.3L541.5 72.6L540.8 73L540 73.3L539.2 73.6L538.3 73.8L537.3 74.1L536.3 74.3L542.1 72.2L542.1 72.2ZM543.8 67L544.1 67.3L544.4 67.7L544.6 68.1L544.7 68.5L544.8 68.9L544.8 69.3L544.7 69.7L544.5 70.1L544.3 70.5L544 70.8L543.6 71.2L543.2 71.6L542.6 71.9L542.1 72.3L541.4 72.6L540.7 72.9L539.9 73.2L539.1 73.5L538.3 73.7L537.4 74L536.4 74.2L536.6 73.9L537.5 73L537.5 73L539.6 71.5L541.2 69.7L541.7 68.3L541.8 67.7L541.9 67.4L541.9 67.1L541.8 66.8L541.6 66.3L541 65.4L539.3 64.5L537 64L543 66.5L543.6 66.9ZM541.8 66.8L541.9 67.1L541.9 67.4L541.8 67.7L541.8 67.2L541.8 67.2Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M503.6 106.3L503.6 106.2L503.6 106.3L503.6 106.3ZM503.6 106.3L503.6 106.2L503.5 106.1L503.4 105.6L503.2 104.7L503 103.8L502.8 103L502.7 102.1L502.6 101.5L502.5 100.7L502.4 99.8L502.3 98.9L502.2 98L502.1 97.1L502.1 96.6L502.1 96.5L502.2 97L502.3 97.2L502.6 97.7L502.6 97.7L503.7 98.2L504.5 98.1L505.2 97.7L505.7 97L506.1 96.3L506.2 95.4L506.2 95.4L507.7 95.3L509 94.9L510 94.2L510.8 93.5L511.3 92.7L511.7 91.8L511.7 91.8L512.8 91.1L513.9 90.4L514.8 89.6L515.6 88.7L516.3 87.8L517 86.9L517 86.9L518 86L519 85.1L519.9 84.1L520.8 83.1L521.7 82.1L522.6 81.1L522.6 81.1L522.9 80L523.3 79.4L523.5 79.1L523.6 79L523.7 78.9L523.7 78.9L524.3 78.3L524.4 78.3L524.5 78.2L524.6 78.1L525 77.8L526.4 76.7L527.9 75.4L528 75.4L528.1 75.3L528.3 75.1L528.4 75L528.5 74.9L528.7 74.8L529.4 74.1L530.5 74.1L531.6 74L532.6 73.9L533.6 73.8L534.6 73.6L535.6 73.5L536.5 73.3L537.5 73L536.6 73.9L536.4 74.2L536.3 74.3L536.2 74.4L536 74.6L535.9 74.7L535.8 74.8L534.1 76.3L532.6 77.7L532.2 78.1L532.1 78.2L532 78.3L531.9 78.4L531.3 79L531.3 79.1L531.2 79.1L531.1 79.3L530.9 79.6L530.6 80.2L530.5 81.3L530.5 81.3L529.7 82.5L528.9 83.6L528.1 84.7L527.2 85.8L526.2 86.8L525.3 87.9L525.3 87.9L524.7 88.9L524 89.9L523.3 90.9L522.4 91.8L521.4 92.7L520.2 93.6L520.2 93.6L519.9 94.5L519.4 95.5L518.7 96.3L517.7 97.2L516.5 97.9L515 98.6L515 98.6L514.8 99.5L514.5 100.3L514.1 101.1L513.4 101.9L512.6 102.6L511.5 103.2L511.5 103.2L511.3 103.3L511.2 103.4L511.1 103.4L511 103.5L510.5 103.8L509.7 104.3L509.1 105L508.6 105.6L508.4 106.4L508.4 107.2L508.4 107.2L506.8 107.2L505.5 107.2L504.5 107L503.9 106.7L503.6 106.4ZM537.5 73L536.5 73.3L535.6 73.5L534.6 73.6L533.6 73.8L532.6 73.9L531.6 74L530.5 74.1L529.4 74.1L529.4 74.1L530.5 74.1L531.6 74L532.6 73.9L533.6 73.8L534.6 73.6L535.6 73.5L536.5 73.3L537.5 73ZM528.9 63.2L529.9 63.2L531 63.3L532.1 63.3L533.1 63.4L534.1 63.5L535.1 63.6L536.1 63.8L537 64L533.1 63.4L533.1 63.4ZM530.5 63L531.7 63L532.2 62.9L532.3 62.9L533.1 63L534 63.1L534.8 63.3L535.6 63.4L536.4 63.6L537.1 63.8L537.8 64L538.4 64.2L539 64.4L539.5 64.7L540 64.9L540.5 65.2L540.8 65.5L541.2 65.8L541.4 66.1L541.6 66.4L541.8 66.8L541.6 66.3L541 65.4L539.3 64.5L537 64L536.1 63.8L535.1 63.6L534.1 63.5L533.1 63.4L532.1 63.3L531 63.3L529.9 63.2L528.9 63.2ZM537.5 73L536.5 73.3L535.6 73.5L534.6 73.6L533.6 73.8L532.6 73.9L531.6 74L530.5 74.1L529.4 74.1L531 73.3L532.2 72.5L532.6 72L532.7 71.9L533.6 71.8L534.4 71.6L535.2 71.5L536 71.3L536.7 71.1L537.4 70.9L538.1 70.7L538.7 70.4L539.3 70.2L539.8 69.9L540.3 69.6L540.7 69.3L541 69L541.3 68.7L541.5 68.4L541.7 68L541.8 67.7L541.7 68.3L541.2 69.7L539.6 71.5ZM532.3 62.9L533.2 63L534.1 63.1L534.9 63.3L535.7 63.4L536.5 63.6L537.2 63.8L537.9 64L538.5 64.2L539.1 64.5L539.6 64.7L540.1 65L540.5 65.3L540.9 65.6L541.2 65.9L541.5 66.2L541.6 66.5L541.8 66.9L541.8 67.2L541.8 67.5L541.7 67.9L541.6 68.2L541.4 68.5L541.1 68.8L540.7 69.2L540.3 69.5L539.9 69.8L539.4 70L538.8 70.3L538.2 70.6L537.5 70.8L536.8 71L536.1 71.2L535.3 71.4L534.5 71.6L533.7 71.7L532.8 71.8L541.8 66.8L541.6 66.4L541.4 66.1L541.2 65.8L540.8 65.5L540.5 65.2L540 64.9L539.5 64.7L539 64.4L538.4 64.2L537.8 64L537.1 63.8L536.4 63.6L535.6 63.4L534.8 63.3L534 63.1L533.1 63L532.3 62.9ZM541.8 67.7L541.7 68L541.5 68.4L541.3 68.7L541 69L540.7 69.3L540.3 69.6L539.8 69.9L539.3 70.2L538.7 70.4L538.1 70.7L537.4 70.9L536.7 71.1L536 71.3L535.2 71.5L534.4 71.6L533.6 71.8L532.7 71.9L539 70.2L539 70.2ZM532.3 62.9L533.2 63L534.1 63.1L534.9 63.3L535.7 63.4L536.5 63.6L537.2 63.8L537.9 64L538.5 64.2L539.1 64.5L539.6 64.7L540.1 65L540.5 65.3L540.9 65.6L541.2 65.9L541.5 66.2L541.6 66.5L541.8 66.9L541.8 67.2L541.8 67.5L541.7 67.9L541.6 68.2L541.4 68.5L541.1 68.8L540.7 69.2L540.3 69.5L539.9 69.8L539.4 70L538.8 70.3L538.2 70.6L537.5 70.8L536.8 71L536.1 71.2L535.3 71.4L534.5 71.6L533.7 71.7L532.8 71.8L532.8 71.8L533 71.6L533.5 70.6L533.6 68.7L532.8 66.8L531.1 65L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L531 63.3L532.6 63.2L533.3 63.1L533.1 63L532.6 62.9L532.4 62.9Z\"/><path class=\"iso-top\" d=\"M502.1 96.8L502.1 96.8L502.1 96.5L502.2 97ZM502.2 97L502.1 96.5L502.1 96.4L502.1 96.2L502.1 95.7L502.1 94.8L502.1 93.9L502.2 93L502.2 92.1L502.3 91.2L502.4 90.3L502.5 89.8L502.6 88.9L502.7 88L502.9 87.1L503.1 86.2L503.3 85.3L503.6 84.4L503.7 83.9L504 83L504.3 82.1L504.6 81.2L504.9 80.3L505.3 79.5L505.7 78.6L506.1 77.9L506.5 77L506.9 76.2L507.4 75.3L508 74.4L508.6 73.6L509.2 72.7L510 71.7L510.6 70.9L510.9 70.5L511.1 70.3L511.2 70.2L511.2 70.2L511.2 70.1L511.6 69.7L511.6 69.7L511.7 69.6L511.8 69.5L512 69.3L512.8 68.5L513.7 67.7L513.8 67.7L513.8 67.6L514 67.5L514 67.5L514.1 67.4L514.2 67.3L514.8 67L528.9 63.2L530.5 63L531.7 63L532.2 62.9L532.3 62.9L532.3 62.9L532.4 62.9L532.6 62.9L533.1 63L533.3 63.1L532.6 63.2L531 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.8 63.3L528.8 63.3L528.8 63.3L528.8 63.3L528.8 63.3L528.8 63.3L528.8 63.3L528.8 63.3L528.8 63.3L528.8 63.3L528.8 63.3L528.8 63.3L528.8 63.3L528.8 63.3L528.8 63.3L528.8 63.3L528.8 63.3L528.8 63.3L528.8 63.3L528.8 63.3L528.8 63.3L528.8 63.3L528.8 63.3L528.8 63.3L528.8 63.3L528.8 63.3L528.8 63.3L528.8 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L531.1 65L532.8 66.8L533.6 68.7L533.5 70.6L533 71.6L532.8 71.8L532.8 71.8L532.7 71.9L532.6 72L532.2 72.5L531 73.3L529.4 74.1L529.4 74.1L528.7 74.8L528.5 74.9L528.4 75L528.3 75.1L528.1 75.3L528 75.4L527.9 75.4L526.4 76.7L525 77.8L524.6 78.1L524.5 78.2L524.4 78.3L524.3 78.3L523.7 78.9L523.7 78.9L523.6 79L523.5 79.1L523.3 79.4L522.9 80L522.6 81.1L522.6 81.1L521.7 82.1L520.8 83.1L519.9 84.1L519 85.1L518 86L517 86.9L517 86.9L516.3 87.8L515.6 88.7L514.8 89.6L513.9 90.4L512.8 91.1L511.7 91.8L511.7 91.8L511.3 92.7L510.8 93.5L510 94.2L509 94.9L507.7 95.3L506.2 95.4L506.2 95.4L506.1 96.3L505.7 97L505.2 97.7L504.5 98.1L503.7 98.2L502.6 97.7L502.6 97.7L502.3 97.2ZM528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.8 63.3L528.8 63.3L528.8 63.3L528.8 63.3L528.8 63.3L528.8 63.3L528.8 63.3L528.8 63.3L528.8 63.3L528.8 63.3L528.8 63.3L528.8 63.3L528.8 63.3L528.8 63.3L528.8 63.3L528.8 63.3L528.8 63.3L528.8 63.3L528.8 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3L528.9 63.3Z\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M502.1 96.1L502.1 95.6L502.4 90.2L502.5 89.7L503.6 84.3L503.7 83.8L505.7 78.5L505.9 78.1L509.1 72.9L509.3 72.5L509.6 72.1L511.6 69.6L512 69.3L512.3 69L515.1 66.7L515.5 66.4L515.9 66.1L516.3 65.9L516.8 65.6L517.3 65.4L517.8 65.2L519.6 64.4L520.1 64.2L520.6 64L521.1 63.9L521.7 63.7L522.3 63.6L522.9 63.4L523.5 63.3L524.1 63.2L524.7 63.1L525.9 62.9L526.4 62.9L526.8 62.8L527.3 62.8L527.8 62.7L528.3 62.7L528.8 62.7L529.3 62.7L529.8 62.7L530.3 62.7L530.8 62.8L531.3 62.8L531.7 62.8L532.2 62.9L533.5 63L534.1 63.1L534.7 63.2L535.3 63.3L535.9 63.5L536.5 63.6L537 63.7L537.5 63.9L538 64.1L539.8 64.8L540.4 65L540.9 65.2L541.4 65.4L541.8 65.7L542.3 65.9L542.6 66.2L545.5 68.4L545.9 68.7L546.2 69L548.3 71.4L548.6 71.8L548.9 72.2L552.2 77.3L552.4 77.7L554.6 82.9L554.8 83.4L556 88.7L556.1 89.3L556.6 94.6L556.6 95.2L556.3 100.5L556.3 101.1L555.2 106.4L555.1 106.9L553.1 112.2L552.9 112.7L552.7 113.2L549.5 118.3L549.3 118.7L547.2 121.2L546.9 121.6L546.6 121.9L546.2 122.2L543.4 124.5L543.1 124.8L542.7 125L542.2 125.3L541.7 125.5L541.2 125.8L539.3 126.5L538.9 126.7L538.4 126.9L537.9 127.1L537.3 127.2L536.8 127.4L536.2 127.5L535.6 127.6L535 127.8L534.3 127.9L533.1 128.1L532.6 128.1L532.1 128.2L531.7 128.2L531.2 128.3L530.7 128.3L530.2 128.3L529.7 128.3L529.2 128.3L528.7 128.3L528.2 128.3L527.7 128.3L527.2 128.2L526.8 128.2L525.6 128L524.9 127.9L524.3 127.9L523.7 127.7L523.1 127.6L522.5 127.5L522 127.4L521.5 127.2L521 127L520.5 126.9L518.6 126.2L518.1 125.9L517.6 125.7L517.1 125.5L516.7 125.2L516.3 125L515.9 124.7L513.1 122.5L512.7 122.2L512.4 121.8L510.3 119.4L510 119L506.7 114L506.4 113.5L506.2 113.1L504.1 107.8L503.9 107.3L502.6 102L502.6 101.5Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.toeR\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M460.8 519.2L463.3 516.3L478.7 510.7L489.2 512.6L489.2 522L473.9 527.5L464.1 523.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M473.9 518.2L473.9 527.5L489.2 522L489.2 512.6Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M473.9 527.5L464.1 523.7L460.8 519.2L463.3 516.3L473.9 518.2Z\"/><path class=\"iso-top\" d=\"M463.3 516.3L473.9 518.2L489.2 512.6L478.7 510.7Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M463.3 516.3L473.9 518.2M473.9 518.2L489.2 512.6M473.9 518.2L473.9 527.5\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M460.8 519.2L463.3 516.3L478.7 510.7L489.2 512.6L489.2 522L473.9 527.5L464.1 523.7Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.footR\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M474.1 524.1L476.1 516.6L492.4 510.7L513.3 515.5L523.6 520L529.8 525.3L530.5 533.2L529 537.1L512.8 542.9L475.3 528.4Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M513.6 531.2L514.3 539.1L530.5 533.2L529.8 525.3ZM514.3 539.1L512.8 542.9L529 537.1L530.5 533.2Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M507.4 525.9L513.6 531.2L529.8 525.3L523.6 520ZM512.8 542.9L475.3 528.4L474.1 524.1L476.1 516.6L497.1 521.4L507.4 525.9L513.6 531.2L514.3 539.1Z\"/><path class=\"iso-top\" d=\"M476.1 516.6L497.1 521.4L513.3 515.5L492.4 510.7ZM497.1 521.4L507.4 525.9L523.6 520L513.3 515.5Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M476.1 516.6L497.1 521.4M497.1 521.4L507.4 525.9M507.4 525.9L513.6 531.2M513.6 531.2L529.8 525.3M513.6 531.2L514.3 539.1M514.3 539.1L530.5 533.2M514.3 539.1L512.8 542.9\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M474.1 524.1L476.1 516.6L492.4 510.7L513.3 515.5L523.6 520L529.8 525.3L530.5 533.2L529 537.1L512.8 542.9L475.3 528.4Z\"/></g></g><g class=\"mq-joint\" data-name=\"as.ankleR\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M500.8 517.8L500.9 516.2L501.3 514.7L501.8 513.3L502.6 512L503.6 510.8L504.8 509.8L506.1 509L507.5 508.4L509 508.1L510.6 508L512.1 508.1L513.6 508.4L515 509L516.3 509.8L517.5 510.8L518.5 512L519.3 513.3L519.9 514.7L520.2 516.2L520.3 517.8L520.2 519.3L519.9 520.8L519.3 522.2L518.5 523.5L517.5 524.7L516.3 525.7L515 526.5L513.6 527.1L512.1 527.4L510.6 527.5L509 527.4L507.5 527.1L506.1 526.5L504.8 525.7L503.6 524.7L502.6 523.5L501.8 522.2L501.3 520.8L500.9 519.3Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M500.8 517.8L500.9 516.2L501.3 514.7L501.8 513.3L502.6 512L503.6 510.8L504.8 509.8L506.1 509L507.5 508.4L509 508.1L510.6 508L512.1 508.1L513.6 508.4L515 509L516.3 509.8L517.5 510.8L518.5 512L519.3 513.3L519.9 514.7L520.2 516.2L520.3 517.8L520.2 519.3L519.9 520.8L519.3 522.2L518.5 523.5L517.5 524.7L516.3 525.7L515 526.5L513.6 527.1L512.1 527.4L510.6 527.5L509 527.4L507.5 527.1L506.1 526.5L504.8 525.7L503.6 524.7L502.6 523.5L501.8 522.2L501.3 520.8L500.9 519.3Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M500.8 517.8L500.9 516.2L501.3 514.7L501.8 513.3L502.6 512L503.6 510.8L504.8 509.8L506.1 509L507.5 508.4L509 508.1L510.6 508L512.1 508.1L513.6 508.4L515 509L516.3 509.8L516.6 510.2L516.7 510.7L516.6 511.3L516.3 512.1L515.9 512.9L515.3 513.9L514.5 514.9L513.6 515.9L512.7 517L511.6 518L510.5 519L509.3 520L508.2 520.8L507 521.5L506 522.1L505 522.6L504.1 522.9L503.4 523.1L502.8 523.1L502.3 522.9L501.8 522.2L501.3 520.8L500.9 519.3Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M500.8 517.8L500.9 516.2L501.3 514.7L501.8 513.3L502.6 512L503.6 510.8L504.8 509.8L506.1 509L507.5 508.4L509 508.1L510.6 508L512.1 508.1L513.6 508.4L514.4 508.8L514.7 509.1L514.8 509.6L514.7 510.1L514.4 510.8L514 511.6L513.5 512.5L512.8 513.5L511.9 514.4L511 515.4L510 516.4L509 517.3L507.9 518.2L506.9 518.9L505.8 519.6L504.8 520.2L503.9 520.6L503.1 520.9L502.4 521L501.9 521L501.4 520.9L501.2 520.6L500.9 519.3Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M500.8 517.8L500.9 516.2L501.3 514.7L501.8 513.3L502.6 512L503.6 510.8L504.8 509.8L506.1 509L507.5 508.4L509 508.1L510.6 508L511.9 508.1L512.3 508.2L512.5 508.5L512.6 508.9L512.5 509.4L512.3 510L511.9 510.7L511.5 511.4L510.9 512.2L510.1 513.1L509.4 513.9L508.5 514.8L507.6 515.6L506.7 516.3L505.8 517L504.9 517.6L504 518.1L503.2 518.4L502.5 518.7L501.9 518.8L501.4 518.8L501.1 518.7L500.9 518.4Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M500.8 517.8L500.9 516.2L501.3 514.7L501.8 513.3L502.6 512L503.6 510.8L504.8 509.8L506.1 509L507.5 508.4L509 508.1L510.6 508L512.1 508.1L513.6 508.4L515 509L516.3 509.8L517.5 510.8L518.5 512L519.3 513.3L519.9 514.7L520.2 516.2L520.3 517.8L520.2 519.3L519.9 520.8L519.3 522.2L518.5 523.5L517.5 524.7L516.3 525.7L515 526.5L513.6 527.1L512.1 527.4L510.6 527.5L509 527.4L507.5 527.1L506.1 526.5L504.8 525.7L503.6 524.7L502.6 523.5L501.8 522.2L501.3 520.8L500.9 519.3Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.shankR\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M485.8 405.9L485.9 405.6L486.1 405.2L486.5 404.8L487.1 404.5L487.8 404.1L488.6 403.7L489.5 403.4L490.6 403L491.8 402.7L493 402.4L494.4 402.1L495.7 401.9L497.2 401.7L498.6 401.5L500.1 401.4L501.6 401.3L503 401.2L504.4 401.2L505.7 401.2L507 401.3L508.2 401.4L509.2 401.5L510.2 401.7L511 401.9L511.7 402.2L512.3 402.4L512.7 402.7L512.9 403.1L513 403.4L518 511.8L518 512.1L517.8 512.3L517.6 512.5L517.3 512.7L516.9 512.9L516.4 513.1L515.9 513.4L515.2 513.6L514.5 513.7L513.8 513.9L513 514.1L512.2 514.2L511.4 514.3L510.5 514.4L509.7 514.5L508.8 514.6L507.9 514.6L507.1 514.6L506.3 514.6L505.6 514.6L504.9 514.5L504.3 514.4L503.7 514.3L503.2 514.2L502.8 514.1L502.5 513.9L502.3 513.7L502.1 513.5L502.1 513.3Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M500.6 407.8L503.2 407.4L505.7 407L507.9 406.4L509.8 405.8L511.3 405.1L512.4 404.4L512.9 403.8L512.9 403.1L518 511.7L518 512.1L517.6 512.5L517 512.9L516.1 513.3L515 513.6L513.7 513.9L512.3 514.2L510.7 514.4Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M495.3 408.1L497.9 408L500.6 407.8L510.7 514.4L509.2 514.6L507.6 514.6Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M490.7 408L492.9 408.1L495.3 408.1L507.6 514.6L506.2 514.6L504.9 514.5Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M485.9 406.2L486.4 406.8L487.4 407.3L488.8 407.7L490.7 408L504.9 514.5L503.8 514.4L503 514.1L502.4 513.8L502.1 513.5Z\"/><path class=\"iso-top\" d=\"M499.4 404.7L499.4 404.7L499.4 404.7L499.4 404.7L499.4 404.7L499.4 404.7L499.4 404.7L499.4 404.7L499.4 404.7L499.4 404.7L499.4 404.7L499.4 404.7L499.4 404.7L499.4 404.7L499.4 404.7L499.4 404.7L499.4 404.7L499.4 404.7L499.4 404.7L499.4 404.7L499.4 404.7L499.4 404.7L499.4 404.7L499.4 404.7L499.4 404.7L499.4 404.7L499.4 404.7L499.4 404.7L499.4 404.7L499.4 404.7L499.4 404.7L499.4 404.7L499.4 404.7L490.7 408L488.8 407.7L487.4 407.3L486.4 406.8L485.9 406.2L485.9 405.6L486.5 404.9L487.5 404.2L489 403.5L490.9 402.9L493.2 402.4L495.7 401.9L498.3 401.6L500.9 401.3L503.5 401.2L506 401.2L508.2 401.4L510 401.7L511.5 402.1L512.5 402.6L512.9 403.1L512.9 403.8L512.4 404.4L511.3 405.1L509.8 405.8L507.9 406.4L505.7 407L503.2 407.4L500.6 407.8L497.9 408L495.3 408.1L492.9 408.1L490.7 408Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M485.8 406L486 406.4L486.3 406.7L486.7 407L487.3 407.2L488 407.5L488.9 407.7L489.8 407.8L490.9 408L492.1 408.1L493.4 408.1L494.7 408.1L496.1 408.1L497.6 408L499 407.9L500.5 407.8L501.9 407.6L503.3 407.4L504.7 407.2L506 406.9L507.2 406.6L508.4 406.3L509.4 405.9L510.4 405.6L511.2 405.2L511.8 404.8L512.3 404.5L512.7 404.1L512.9 403.7L513 403.4\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M485.8 405.9L485.9 405.6L486.1 405.2L486.5 404.8L487.1 404.5L487.8 404.1L488.6 403.7L489.5 403.4L490.6 403L491.8 402.7L493 402.4L494.4 402.1L495.7 401.9L497.2 401.7L498.6 401.5L500.1 401.4L501.6 401.3L503 401.2L504.4 401.2L505.7 401.2L507 401.3L508.2 401.4L509.2 401.5L510.2 401.7L511 401.9L511.7 402.2L512.3 402.4L512.7 402.7L512.9 403.1L513 403.4L518 511.8L518 512.1L517.8 512.3L517.6 512.5L517.3 512.7L516.9 512.9L516.4 513.1L515.9 513.4L515.2 513.6L514.5 513.7L513.8 513.9L513 514.1L512.2 514.2L511.4 514.3L510.5 514.4L509.7 514.5L508.8 514.6L507.9 514.6L507.1 514.6L506.3 514.6L505.6 514.6L504.9 514.5L504.3 514.4L503.7 514.3L503.2 514.2L502.8 514.1L502.5 513.9L502.3 513.7L502.1 513.5L502.1 513.3Z\"/></g></g><g class=\"mq-joint\" data-name=\"as.kneeR\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M484.8 397.8L485 395.6L485.5 393.5L486.3 391.5L487.5 389.6L488.9 387.9L490.5 386.5L492.4 385.4L494.4 384.5L496.6 384L498.7 383.8L500.9 384L503 384.5L505.1 385.4L506.9 386.5L508.6 387.9L510 389.6L511.2 391.5L512 393.5L512.5 395.6L512.7 397.8L512.5 400L512 402.1L511.2 404.1L510 406L508.6 407.6L506.9 409.1L505.1 410.2L503 411L500.9 411.5L498.7 411.7L496.6 411.5L494.4 411L492.4 410.2L490.5 409.1L488.9 407.6L487.5 406L486.3 404.1L485.5 402.1L485 400Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M484.8 397.8L485 395.6L485.5 393.5L486.3 391.5L487.5 389.6L488.9 387.9L490.5 386.5L492.4 385.4L494.4 384.5L496.6 384L498.7 383.8L500.9 384L503 384.5L505.1 385.4L506.9 386.5L508.6 387.9L510 389.6L511.2 391.5L512 393.5L512.5 395.6L512.7 397.8L512.5 400L512 402.1L511.2 404.1L510 406L508.6 407.6L506.9 409.1L505.1 410.2L503 411L500.9 411.5L498.7 411.7L496.6 411.5L494.4 411L492.4 410.2L490.5 409.1L488.9 407.6L487.5 406L486.3 404.1L485.5 402.1L485 400Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M484.8 397.8L485 395.6L485.5 393.5L486.3 391.5L487.5 389.6L488.9 387.9L490.5 386.5L492.4 385.4L494.4 384.5L496.6 384L498.7 383.8L500.9 384L503 384.5L505.1 385.4L506.9 386.5L507.3 387L507.4 387.7L507.3 388.6L506.9 389.7L506.3 390.9L505.4 392.2L504.4 393.7L503.1 395.2L501.7 396.7L500.2 398.2L498.6 399.6L497 400.9L495.3 402.1L493.7 403.2L492.2 404L490.8 404.7L489.5 405.1L488.5 405.4L487.6 405.3L487 405.1L486.3 404.1L485.5 402.1L485 400Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M484.8 397.8L485 395.6L485.5 393.5L486.3 391.5L487.5 389.6L488.9 387.9L490.5 386.5L492.4 385.4L494.4 384.5L496.6 384L498.7 383.8L500.9 384L503 384.5L504.2 385L504.6 385.5L504.7 386.1L504.6 386.9L504.2 387.9L503.6 389.1L502.9 390.3L501.9 391.7L500.7 393L499.4 394.4L498 395.8L496.5 397.1L495 398.4L493.5 399.5L492 400.4L490.6 401.2L489.3 401.9L488.1 402.3L487.1 402.5L486.3 402.5L485.8 402.2L485.4 401.8L485 400Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M484.8 397.8L485 395.6L485.5 393.5L486.3 391.5L487.5 389.6L488.9 387.9L490.5 386.5L492.4 385.4L494.4 384.5L496.6 384L498.7 383.8L500.7 384L501.2 384.2L501.5 384.6L501.6 385.1L501.5 385.9L501.2 386.7L500.7 387.7L500 388.8L499.1 389.9L498.1 391.1L497 392.3L495.8 393.5L494.5 394.7L493.2 395.7L491.9 396.7L490.6 397.5L489.4 398.2L488.3 398.8L487.3 399.1L486.4 399.3L485.7 399.3L485.2 399.1L484.9 398.7Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M484.8 397.8L485 395.6L485.5 393.5L486.3 391.5L487.5 389.6L488.9 387.9L490.5 386.5L492.4 385.4L494.4 384.5L496.6 384L498.7 383.8L500.9 384L503 384.5L505.1 385.4L506.9 386.5L508.6 387.9L510 389.6L511.2 391.5L512 393.5L512.5 395.6L512.7 397.8L512.5 400L512 402.1L511.2 404.1L510 406L508.6 407.6L506.9 409.1L505.1 410.2L503 411L500.9 411.5L498.7 411.7L496.6 411.5L494.4 411L492.4 410.2L490.5 409.1L488.9 407.6L487.5 406L486.3 404.1L485.5 402.1L485 400Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.thighR\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M487.5 390L487.6 389.5L498 295.4L498.2 294.6L498.5 294L498.9 293.3L499.4 292.7L500 292.1L500.8 291.5L501.6 291L502.5 290.6L503.5 290.2L504.6 289.8L505.7 289.5L507 289.2L508.2 289.1L509.6 288.9L511 288.9L512.4 288.9L513.8 288.9L515.3 289L516.8 289.2L518.2 289.4L519.7 289.7L521.1 290.1L522.5 290.5L523.9 290.9L525.3 291.4L526.5 291.9L527.8 292.5L528.9 293.1L530 293.8L531 294.5L531.9 295.2L532.7 295.9L533.4 296.7L534.1 297.4L534.6 298.2L535 299L535.2 299.7L535.4 300.5L535.5 301.2L535.4 302L535.2 302.7L512 394.3L511.8 394.8L511.5 395.2L511.2 395.6L510.8 396L510.3 396.4L509.8 396.7L509.2 397L508.5 397.3L507.8 397.5L507.1 397.7L506.3 397.9L505.4 398L504.5 398.1L503.6 398.1L502.7 398.1L501.7 398.1L500.8 398L499.8 397.9L498.9 397.8L497.9 397.6L497 397.3L496 397.1L495.1 396.8L494.2 396.5L493.4 396.1L492.6 395.7L491.8 395.3L491.1 394.9L490.5 394.4L489.9 394L489.3 393.5L488.9 393L488.5 392.5L488.1 392L487.9 391.5L487.7 391L487.6 390.5Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M512.3 307.3L515.2 307.9L518.2 308.3L521.1 308.5L523.9 308.4L526.5 308.1L528.9 307.5L531 306.8L532.7 305.8L534 304.7L534.9 303.4L535.4 302L512.1 393.9L511.8 394.8L511.2 395.6L510.3 396.4L509.2 397L507.8 397.5L506.3 397.9L504.5 398.1L502.7 398.1L500.8 398L498.9 397.8L497 397.3Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M509.5 306.4L512.3 307.3L497 397.3L495.1 396.8Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M502.4 302.9L504.5 304.2L506.9 305.4L509.5 306.4L495.1 396.8L493.4 396.1L491.8 395.3L490.5 394.4Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M499.4 299.9L500.7 301.4L502.4 302.9L490.5 394.4L489.3 393.5L488.5 392.5Z\"/><path class=\"iso-top\" d=\"M516.7 298.7L516.7 298.7L516.7 298.7L516.7 298.7L516.7 298.7L516.7 298.7L516.7 298.7L516.7 298.7L516.7 298.7L516.7 298.7L516.7 298.7L516.7 298.7L516.7 298.7L516.7 298.7L516.7 298.7L516.7 298.7L516.7 298.7L516.7 298.7L516.7 298.7L516.7 298.7L516.7 298.7L516.7 298.7L516.7 298.7L516.7 298.7L516.7 298.7L516.7 298.7L516.7 298.7L516.7 298.7L516.7 298.7L516.7 298.7L516.7 298.7L516.7 298.7L516.7 298.7L516.7 298.7L516.7 298.7L516.7 298.7L516.7 298.7L516.7 298.7L516.7 298.7L516.7 298.7L516.7 298.7L504.5 304.2L502.4 302.9L500.7 301.4L499.4 299.9L498.5 298.4L498 296.8L498 295.4L498.5 294L499.4 292.7L500.8 291.5L502.5 290.6L504.6 289.8L507 289.2L509.6 288.9L512.4 288.9L515.3 289L518.2 289.4L521.1 290.1L523.9 290.9L526.5 291.9L528.9 293.1L531 294.5L532.7 295.9L534.1 297.4L535 299L535.4 300.5L535.4 302L534.9 303.4L534 304.7L532.7 305.8L531 306.8L528.9 307.5L526.5 308.1L523.9 308.4L521.1 308.5L518.2 308.3L515.2 307.9L512.3 307.3L509.5 306.4L506.9 305.4L504.5 304.2ZM498 295.4L498 296.8L498.5 298.4L499.4 299.9L488.5 392.5L487.9 391.5L487.6 390.5L487.6 389.5Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M498 295.6L498 296.3L498.1 297.1L498.3 297.9L498.6 298.6L499 299.4L499.6 300.2L500.2 300.9L501 301.7L501.8 302.4L502.8 303.1L503.8 303.8L504.9 304.4L506.1 305L507.4 305.6L508.7 306.1L510 306.6L511.4 307L512.9 307.4L514.3 307.7L515.8 308L517.3 308.2L518.7 308.4L520.2 308.4L521.6 308.5L523 308.4L524.4 308.4L525.7 308.2L527 308L528.2 307.7L529.3 307.4L530.4 307L531.4 306.6L532.2 306.1L533 305.6L533.7 305L534.3 304.4L534.7 303.7L535.1 303.1L535.3 302.4\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M487.5 390L487.6 389.5L498 295.4L498.2 294.6L498.5 294L498.9 293.3L499.4 292.7L500 292.1L500.8 291.5L501.6 291L502.5 290.6L503.5 290.2L504.6 289.8L505.7 289.5L507 289.2L508.2 289.1L509.6 288.9L511 288.9L512.4 288.9L513.8 288.9L515.3 289L516.8 289.2L518.2 289.4L519.7 289.7L521.1 290.1L522.5 290.5L523.9 290.9L525.3 291.4L526.5 291.9L527.8 292.5L528.9 293.1L530 293.8L531 294.5L531.9 295.2L532.7 295.9L533.4 296.7L534.1 297.4L534.6 298.2L535 299L535.2 299.7L535.4 300.5L535.5 301.2L535.4 302L535.2 302.7L512 394.3L511.8 394.8L511.5 395.2L511.2 395.6L510.8 396L510.3 396.4L509.8 396.7L509.2 397L508.5 397.3L507.8 397.5L507.1 397.7L506.3 397.9L505.4 398L504.5 398.1L503.6 398.1L502.7 398.1L501.7 398.1L500.8 398L499.8 397.9L498.9 397.8L497.9 397.6L497 397.3L496 397.1L495.1 396.8L494.2 396.5L493.4 396.1L492.6 395.7L491.8 395.3L491.1 394.9L490.5 394.4L489.9 394L489.3 393.5L488.9 393L488.5 392.5L488.1 392L487.9 391.5L487.7 391L487.6 390.5Z\"/></g></g><g class=\"mq-joint\" data-name=\"as.hipR\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M501.9 292.1L502.1 289.6L502.7 287.1L503.7 284.8L505 282.7L506.6 280.7L508.5 279.1L510.7 277.8L513 276.8L515.4 276.3L517.9 276.1L520.4 276.3L522.9 276.8L525.2 277.8L527.3 279.1L529.2 280.7L530.9 282.7L532.2 284.8L533.1 287.1L533.7 289.6L533.9 292.1L533.7 294.6L533.1 297L532.2 299.3L530.9 301.5L529.2 303.4L527.3 305L525.2 306.3L522.9 307.3L520.4 307.9L517.9 308.1L515.4 307.9L513 307.3L510.7 306.3L508.5 305L506.6 303.4L505 301.5L503.7 299.3L502.7 297L502.1 294.6Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M501.9 292.1L502.1 289.6L502.7 287.1L503.7 284.8L505 282.7L506.6 280.7L508.5 279.1L510.7 277.8L513 276.8L515.4 276.3L517.9 276.1L520.4 276.3L522.9 276.8L525.2 277.8L527.3 279.1L529.2 280.7L530.9 282.7L532.2 284.8L533.1 287.1L533.7 289.6L533.9 292.1L533.7 294.6L533.1 297L532.2 299.3L530.9 301.5L529.2 303.4L527.3 305L525.2 306.3L522.9 307.3L520.4 307.9L517.9 308.1L515.4 307.9L513 307.3L510.7 306.3L508.5 305L506.6 303.4L505 301.5L503.7 299.3L502.7 297L502.1 294.6Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M501.9 292.1L502.1 289.6L502.7 287.1L503.7 284.8L505 282.7L506.6 280.7L508.5 279.1L510.7 277.8L513 276.8L515.4 276.3L517.9 276.1L520.4 276.3L522.9 276.8L525.2 277.8L527.3 279.1L527.8 279.7L527.9 280.5L527.8 281.5L527.3 282.7L526.6 284.2L525.6 285.7L524.4 287.4L523 289.1L521.3 290.8L519.6 292.5L517.8 294.1L515.9 295.7L514 297L512.1 298.3L510.4 299.2L508.8 300L507.3 300.5L506.1 300.8L505.1 300.7L504.4 300.5L503.7 299.3L502.7 297L502.1 294.6Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M501.9 292.1L502.1 289.6L502.7 287.1L503.7 284.8L505 282.7L506.6 280.7L508.5 279.1L510.7 277.8L513 276.8L515.4 276.3L517.9 276.1L520.4 276.3L522.9 276.8L524.2 277.4L524.6 277.9L524.8 278.7L524.6 279.6L524.2 280.8L523.6 282.1L522.6 283.5L521.5 285L520.2 286.6L518.7 288.2L517.1 289.8L515.4 291.3L513.6 292.7L511.9 294L510.2 295.1L508.5 296L507.1 296.7L505.7 297.2L504.6 297.5L503.7 297.4L503 297.2L502.6 296.6L502.1 294.6Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M501.9 292.1L502.1 289.6L502.7 287.1L503.7 284.8L505 282.7L506.6 280.7L508.5 279.1L510.7 277.8L513 276.8L515.4 276.3L517.9 276.1L520.2 276.2L520.7 276.4L521.1 276.9L521.2 277.5L521.1 278.4L520.7 279.4L520.2 280.5L519.4 281.7L518.4 283L517.2 284.4L515.9 285.8L514.5 287.2L513.1 288.5L511.6 289.7L510.1 290.8L508.6 291.8L507.2 292.6L505.9 293.2L504.7 293.6L503.8 293.8L503 293.8L502.4 293.5L502 293.1Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M501.9 292.1L502.1 289.6L502.7 287.1L503.7 284.8L505 282.7L506.6 280.7L508.5 279.1L510.7 277.8L513 276.8L515.4 276.3L517.9 276.1L520.4 276.3L522.9 276.8L525.2 277.8L527.3 279.1L529.2 280.7L530.9 282.7L532.2 284.8L533.1 287.1L533.7 289.6L533.9 292.1L533.7 294.6L533.1 297L532.2 299.3L530.9 301.5L529.2 303.4L527.3 305L525.2 306.3L522.9 307.3L520.4 307.9L517.9 308.1L515.4 307.9L513 307.3L510.7 306.3L508.5 305L506.6 303.4L505 301.5L503.7 299.3L502.7 297L502.1 294.6Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.handR\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M419.8 202.8L420 201.2L420.3 199.6L420.9 198.2L421.8 196.8L422.8 195.6L424 194.6L425.3 193.8L426.8 193.2L428.3 192.8L429.9 192.7L431.5 192.8L433 193.2L434.5 193.8L435.8 194.6L437 195.6L438.1 196.8L438.9 198.2L439.5 199.6L439.9 201.2L440 202.8L439.9 204.3L439.5 205.9L438.9 207.3L438.1 208.7L437 209.9L435.8 210.9L434.5 211.7L433 212.4L431.5 212.7L429.9 212.8L428.3 212.7L426.8 212.4L425.3 211.7L424 210.9L422.8 209.9L421.8 208.7L420.9 207.3L420.3 205.9L420 204.3Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M419.8 202.8L420 201.2L420.3 199.6L420.9 198.2L421.8 196.8L422.8 195.6L424 194.6L425.3 193.8L426.8 193.2L428.3 192.8L429.9 192.7L431.5 192.8L433 193.2L434.5 193.8L435.8 194.6L437 195.6L438.1 196.8L438.9 198.2L439.5 199.6L439.9 201.2L440 202.8L439.9 204.3L439.5 205.9L438.9 207.3L438.1 208.7L437 209.9L435.8 210.9L434.5 211.7L433 212.4L431.5 212.7L429.9 212.8L428.3 212.7L426.8 212.4L425.3 211.7L424 210.9L422.8 209.9L421.8 208.7L420.9 207.3L420.3 205.9L420 204.3Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M419.8 202.8L420 201.2L420.3 199.6L420.9 198.2L421.8 196.8L422.8 195.6L424 194.6L425.3 193.8L426.8 193.2L428.3 192.8L429.9 192.7L431.5 192.8L433 193.2L434.5 193.8L435.8 194.6L436.1 195L436.2 195.5L436.1 196.1L435.8 196.9L435.4 197.8L434.8 198.8L434 199.8L433.1 200.9L432.1 202L431 203L429.8 204.1L428.6 205L427.4 205.9L426.3 206.7L425.2 207.3L424.2 207.8L423.3 208.1L422.5 208.2L421.9 208.2L421.4 208L420.9 207.3L420.3 205.9L420 204.3Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M419.8 202.8L420 201.2L420.3 199.6L420.9 198.2L421.8 196.8L422.8 195.6L424 194.6L425.3 193.8L426.8 193.2L428.3 192.8L429.9 192.7L431.5 192.8L433 193.2L433.9 193.5L434.1 193.8L434.2 194.3L434.1 194.9L433.9 195.6L433.5 196.5L432.9 197.4L432.2 198.3L431.3 199.3L430.4 200.3L429.4 201.3L428.3 202.3L427.2 203.2L426.1 204L425 204.7L424 205.3L423.1 205.7L422.2 206L421.5 206.2L420.9 206.1L420.5 206L420.3 205.6L420 204.3Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M419.8 202.8L420 201.2L420.3 199.6L420.9 198.2L421.8 196.8L422.8 195.6L424 194.6L425.3 193.8L426.8 193.2L428.3 192.8L429.9 192.7L431.3 192.8L431.7 192.9L431.9 193.2L432 193.6L431.9 194.1L431.7 194.8L431.3 195.5L430.8 196.3L430.2 197.1L429.5 197.9L428.7 198.8L427.8 199.7L426.9 200.5L425.9 201.3L425 202L424 202.6L423.2 203.1L422.3 203.5L421.6 203.7L421 203.9L420.5 203.8L420.1 203.7L419.9 203.4Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M419.8 202.8L420 201.2L420.3 199.6L420.9 198.2L421.8 196.8L422.8 195.6L424 194.6L425.3 193.8L426.8 193.2L428.3 192.8L429.9 192.7L431.5 192.8L433 193.2L434.5 193.8L435.8 194.6L437 195.6L438.1 196.8L438.9 198.2L439.5 199.6L439.9 201.2L440 202.8L439.9 204.3L439.5 205.9L438.9 207.3L438.1 208.7L437 209.9L435.8 210.9L434.5 211.7L433 212.4L431.5 212.7L429.9 212.8L428.3 212.7L426.8 212.4L425.3 211.7L424 210.9L422.8 209.9L421.8 208.7L420.9 207.3L420.3 205.9L420 204.3Z\"/></g></g><g class=\"mq-joint\" data-name=\"as.wristR\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M431.9 212.1L432 211L432.3 209.9L432.7 208.8L433.3 207.8L434.1 206.9L434.9 206.2L435.9 205.5L437 205.1L438.1 204.8L439.3 204.7L440.5 204.8L441.6 205.1L442.7 205.5L443.7 206.2L444.5 206.9L445.3 207.8L445.9 208.8L446.4 209.9L446.6 211L446.7 212.1L446.6 213.3L446.4 214.4L445.9 215.5L445.3 216.5L444.5 217.4L443.7 218.1L442.7 218.8L441.6 219.2L440.5 219.5L439.3 219.6L438.1 219.5L437 219.2L435.9 218.8L434.9 218.1L434.1 217.4L433.3 216.5L432.7 215.5L432.3 214.4L432 213.3Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M431.9 212.1L432 211L432.3 209.9L432.7 208.8L433.3 207.8L434.1 206.9L434.9 206.2L435.9 205.5L437 205.1L438.1 204.8L439.3 204.7L440.5 204.8L441.6 205.1L442.7 205.5L443.7 206.2L444.5 206.9L445.3 207.8L445.9 208.8L446.4 209.9L446.6 211L446.7 212.1L446.6 213.3L446.4 214.4L445.9 215.5L445.3 216.5L444.5 217.4L443.7 218.1L442.7 218.8L441.6 219.2L440.5 219.5L439.3 219.6L438.1 219.5L437 219.2L435.9 218.8L434.9 218.1L434.1 217.4L433.3 216.5L432.7 215.5L432.3 214.4L432 213.3Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M431.9 212.1L432 211L432.3 209.9L432.7 208.8L433.3 207.8L434.1 206.9L434.9 206.2L435.9 205.5L437 205.1L438.1 204.8L439.3 204.7L440.5 204.8L441.6 205.1L442.7 205.5L443.7 206.2L443.9 206.4L443.9 206.8L443.9 207.3L443.7 207.8L443.3 208.5L442.9 209.2L442.3 210L441.6 210.8L440.9 211.6L440.1 212.3L439.2 213.1L438.4 213.8L437.5 214.5L436.6 215L435.8 215.5L435.1 215.8L434.4 216.1L433.8 216.2L433.4 216.2L433 216L432.7 215.5L432.3 214.4L432 213.3Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M431.9 212.1L432 211L432.3 209.9L432.7 208.8L433.3 207.8L434.1 206.9L434.9 206.2L435.9 205.5L437 205.1L438.1 204.8L439.3 204.7L440.5 204.8L441.6 205.1L442.2 205.4L442.4 205.6L442.5 205.9L442.4 206.4L442.2 206.9L441.9 207.5L441.5 208.2L441 208.9L440.3 209.6L439.7 210.4L438.9 211.1L438.1 211.8L437.3 212.5L436.5 213L435.7 213.6L435 214L434.3 214.3L433.7 214.5L433.1 214.6L432.7 214.6L432.4 214.5L432.2 214.3L432 213.3Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M431.9 212.1L432 211L432.3 209.9L432.7 208.8L433.3 207.8L434.1 206.9L434.9 206.2L435.9 205.5L437 205.1L438.1 204.8L439.3 204.7L440.3 204.8L440.6 204.9L440.8 205.1L440.8 205.4L440.8 205.8L440.6 206.3L440.3 206.8L440 207.4L439.5 208L439 208.6L438.4 209.2L437.7 209.9L437.1 210.5L436.4 211.1L435.7 211.6L435 212L434.3 212.4L433.7 212.7L433.2 212.9L432.7 212.9L432.4 212.9L432.1 212.8L431.9 212.6Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M431.9 212.1L432 211L432.3 209.9L432.7 208.8L433.3 207.8L434.1 206.9L434.9 206.2L435.9 205.5L437 205.1L438.1 204.8L439.3 204.7L440.5 204.8L441.6 205.1L442.7 205.5L443.7 206.2L444.5 206.9L445.3 207.8L445.9 208.8L446.4 209.9L446.6 211L446.7 212.1L446.6 213.3L446.4 214.4L445.9 215.5L445.3 216.5L444.5 217.4L443.7 218.1L442.7 218.8L441.6 219.2L440.5 219.5L439.3 219.6L438.1 219.5L437 219.2L435.9 218.8L434.9 218.1L434.1 217.4L433.3 216.5L432.7 215.5L432.3 214.4L432 213.3Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.foreR\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M436.2 216.7L436.3 216L436.5 215.2L436.8 214.4L437.2 213.5L437.7 212.7L438.4 212L439.1 211.2L439.8 210.6L440.6 210.1L441.5 209.6L442.3 209.3L443.1 209.1L443.8 209.1L444.5 209.1L445.1 209.3L445.6 209.7L484.5 244.4L485.1 245L485.5 245.8L485.7 246.8L485.8 247.8L485.6 249L485.2 250.2L484.7 251.4L484 252.6L483.1 253.8L482.1 254.9L481 255.9L479.9 256.7L478.6 257.5L477.4 258L476.2 258.4L475.1 258.6L474 258.6L473.1 258.4L472.3 258L471.6 257.4L436.8 218.5L436.5 218L436.3 217.4Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M478.2 251L478.2 251L478.2 251L478.2 251L478.2 251L478.2 251L478.2 251L478.2 251L478.2 251L478.2 251L478.2 251L478.2 251L478.2 251L478.2 251L478.2 251L478.2 251L478.2 251L478.2 251L478.2 251L478.2 251L478.2 251L478.2 251L478.2 251L478.2 251L478.2 251L478.2 251L478.2 251L478.2 251L478.2 251L478.2 251L478.2 251L478.2 251L478.2 251L485.6 249L485.1 250.4L484.4 251.9L483.4 253.4L482.2 254.7L480.9 255.9L479.5 257L478 257.8L476.5 258.3L475.1 258.6L473.8 258.6L472.7 258.2L471.8 257.6L471.2 256.8L470.8 255.7L470.7 254.5L470.9 253.1L471.3 251.7L472.1 250.2L473 248.7L474.2 247.4L475.5 246.2L477 245.1L478.4 244.3L479.9 243.8L481.3 243.5L482.6 243.5L483.7 243.9L484.6 244.5L485.3 245.3L485.7 246.4L485.8 247.6L485.6 249Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M484.6 244.5L483.7 243.9L445.1 209.3L445.7 209.7ZM470.8 255.7L471.2 256.8L471.8 257.6L437 218.6L436.6 218.1L436.3 217.4Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M483.7 243.9L482.6 243.5L444.3 209.1L445.1 209.3ZM470.7 254.5L470.8 255.7L436.3 217.4L436.2 216.5Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M482.6 243.5L481.3 243.5L479.9 243.8L442.5 209.3L443.4 209.1L444.3 209.1ZM471.3 251.7L470.9 253.1L470.7 254.5L436.2 216.5L436.3 215.6L436.7 214.6Z\"/><path class=\"iso-top\" d=\"M479.9 243.8L478.4 244.3L477 245.1L475.5 246.2L474.2 247.4L473 248.7L472.1 250.2L471.3 251.7L436.7 214.6L437.2 213.6L437.8 212.6L438.6 211.7L439.5 210.9L440.5 210.2L441.5 209.6L442.5 209.3Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M484.6 244.4L483.9 243.9L483 243.6L482 243.5L480.9 243.6L479.7 243.9L478.5 244.3L477.2 245L476.1 245.8L474.9 246.7L473.9 247.7L472.9 248.9L472.1 250.1L471.5 251.3L471 252.5L470.8 253.7L470.7 254.8L470.8 255.8L471.1 256.7L471.6 257.4\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M436.2 216.7L436.3 216L436.5 215.2L436.8 214.4L437.2 213.5L437.7 212.7L438.4 212L439.1 211.2L439.8 210.6L440.6 210.1L441.5 209.6L442.3 209.3L443.1 209.1L443.8 209.1L444.5 209.1L445.1 209.3L445.6 209.7L484.5 244.4L485.1 245L485.5 245.8L485.7 246.8L485.8 247.8L485.6 249L485.2 250.2L484.7 251.4L484 252.6L483.1 253.8L482.1 254.9L481 255.9L479.9 256.7L478.6 257.5L477.4 258L476.2 258.4L475.1 258.6L474 258.6L473.1 258.4L472.3 258L471.6 257.4L436.8 218.5L436.5 218L436.3 217.4Z\"/></g></g><g class=\"mq-joint\" data-name=\"as.elbowR\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M470.9 254.1L471 252.5L471.4 250.9L472 249.4L472.9 248L473.9 246.8L475.2 245.7L476.6 244.8L478.1 244.2L479.6 243.8L481.3 243.7L482.9 243.8L484.5 244.2L486 244.8L487.4 245.7L488.6 246.8L489.7 248L490.5 249.4L491.1 250.9L491.5 252.5L491.6 254.1L491.5 255.7L491.1 257.3L490.5 258.8L489.7 260.2L488.6 261.4L487.4 262.5L486 263.3L484.5 264L482.9 264.3L481.3 264.5L479.6 264.3L478.1 264L476.6 263.3L475.2 262.5L473.9 261.4L472.9 260.2L472 258.8L471.4 257.3L471 255.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M470.9 254.1L471 252.5L471.4 250.9L472 249.4L472.9 248L473.9 246.8L475.2 245.7L476.6 244.8L478.1 244.2L479.6 243.8L481.3 243.7L482.9 243.8L484.5 244.2L486 244.8L487.4 245.7L488.6 246.8L489.7 248L490.5 249.4L491.1 250.9L491.5 252.5L491.6 254.1L491.5 255.7L491.1 257.3L490.5 258.8L489.7 260.2L488.6 261.4L487.4 262.5L486 263.3L484.5 264L482.9 264.3L481.3 264.5L479.6 264.3L478.1 264L476.6 263.3L475.2 262.5L473.9 261.4L472.9 260.2L472 258.8L471.4 257.3L471 255.7Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M470.9 254.1L471 252.5L471.4 250.9L472 249.4L472.9 248L473.9 246.8L475.2 245.7L476.6 244.8L478.1 244.2L479.6 243.8L481.3 243.7L482.9 243.8L484.5 244.2L486 244.8L487.4 245.7L487.7 246.1L487.8 246.6L487.7 247.2L487.4 248L486.9 249L486.3 250L485.5 251L484.5 252.1L483.5 253.3L482.4 254.4L481.2 255.4L479.9 256.4L478.7 257.3L477.5 258.1L476.4 258.7L475.3 259.2L474.4 259.6L473.6 259.7L473 259.7L472.5 259.5L472 258.8L471.4 257.3L471 255.7Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M470.9 254.1L471 252.5L471.4 250.9L472 249.4L472.9 248L473.9 246.8L475.2 245.7L476.6 244.8L478.1 244.2L479.6 243.8L481.3 243.7L482.9 243.8L484.5 244.2L485.4 244.6L485.6 244.9L485.7 245.4L485.6 246L485.4 246.8L484.9 247.6L484.3 248.5L483.6 249.5L482.7 250.6L481.8 251.6L480.7 252.6L479.6 253.6L478.5 254.5L477.3 255.3L476.2 256.1L475.2 256.7L474.2 257.1L473.4 257.4L472.6 257.6L472 257.6L471.6 257.4L471.3 257.1L471 255.7Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M470.9 254.1L471 252.5L471.4 250.9L472 249.4L472.9 248L473.9 246.8L475.2 245.7L476.6 244.8L478.1 244.2L479.6 243.8L481.3 243.7L482.7 243.8L483.1 244L483.3 244.3L483.4 244.7L483.3 245.2L483.1 245.9L482.7 246.6L482.2 247.4L481.6 248.2L480.8 249.1L480 250L479.1 250.9L478.1 251.8L477.1 252.6L476.2 253.3L475.2 253.9L474.3 254.4L473.5 254.8L472.7 255.1L472.1 255.2L471.6 255.2L471.2 255L471 254.8Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M470.9 254.1L471 252.5L471.4 250.9L472 249.4L472.9 248L473.9 246.8L475.2 245.7L476.6 244.8L478.1 244.2L479.6 243.8L481.3 243.7L482.9 243.8L484.5 244.2L486 244.8L487.4 245.7L488.6 246.8L489.7 248L490.5 249.4L491.1 250.9L491.5 252.5L491.6 254.1L491.5 255.7L491.1 257.3L490.5 258.8L489.7 260.2L488.6 261.4L487.4 262.5L486 263.3L484.5 264L482.9 264.3L481.3 264.5L479.6 264.3L478.1 264L476.6 263.3L475.2 262.5L473.9 261.4L472.9 260.2L472 258.8L471.4 257.3L471 255.7Z\"/></g></g><g class=\"mq-wood\" data-name=\"as.upperR\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M473.7 248.1L480.2 171.8L480.4 171.3L480.7 170.8L481.2 170.3L481.9 170L482.7 169.6L483.7 169.3L484.8 169.1L486 169L487.4 168.9L488.8 168.9L490.2 168.9L491.7 169.1L493.1 169.2L494.6 169.5L496 169.8L497.3 170.2L498.5 170.6L499.7 171.1L500.7 171.6L501.5 172.1L502.2 172.7L502.7 173.2L503 173.8L503.2 174.3L503.2 174.8L490.1 250.3L490 250.7L489.7 251L489.2 251.3L488.7 251.6L488 251.8L487.3 252L486.4 252.1L485.5 252.2L484.5 252.2L483.5 252.2L482.5 252.2L481.4 252L480.4 251.9L479.3 251.7L478.4 251.4L477.4 251.1L476.6 250.8L475.8 250.5L475.2 250.1L474.6 249.7L474.2 249.3L473.9 248.9L473.7 248.5Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M490.4 177.1L492.7 177.4L494.9 177.5L497 177.4L498.9 177.2L500.5 176.8L501.8 176.3L502.7 175.7L503.1 174.9L490.1 250.4L489.8 250.9L489.1 251.4L488.2 251.8L487.1 252L485.7 252.2L484.2 252.2L482.6 252.2L481 252Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M488.2 176.7L490.4 177.1L481 252L479.4 251.7Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M484.3 175.5L486.2 176.2L488.2 176.7L479.4 251.7L477.9 251.3L476.6 250.8Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M481.5 173.9L482.7 174.7L484.3 175.5L476.6 250.8L475.5 250.3L474.6 249.7Z\"/><path class=\"iso-top\" d=\"M491.7 173.2L491.7 173.2L491.7 173.2L491.7 173.2L491.7 173.2L491.7 173.2L491.7 173.2L491.7 173.2L491.7 173.2L491.7 173.2L491.7 173.2L491.7 173.2L491.7 173.2L491.7 173.2L491.7 173.2L491.7 173.2L491.7 173.2L491.7 173.2L491.7 173.2L491.7 173.2L491.7 173.2L491.7 173.2L491.7 173.2L491.7 173.2L491.7 173.2L491.7 173.2L491.7 173.2L491.7 173.2L491.7 173.2L491.7 173.2L491.7 173.2L491.7 173.2L491.7 173.2L484.3 175.5L482.7 174.7L481.5 173.9L480.7 173.1L480.3 172.2L480.3 171.4L480.8 170.7L481.7 170.1L482.9 169.5L484.6 169.2L486.4 168.9L488.5 168.9L490.7 169L493 169.2L495.2 169.6L497.3 170.2L499.1 170.9L500.7 171.6L501.9 172.4L502.7 173.3L503.2 174.1L503.1 174.9L502.7 175.7L501.8 176.3L500.5 176.8L498.9 177.2L497 177.4L494.9 177.5L492.7 177.4L490.4 177.1L488.2 176.7L486.2 176.2L484.3 175.5ZM480.3 171.4L480.3 172.2L480.7 173.1L481.5 173.9L474.6 249.7L474 249.1L473.7 248.5L473.7 247.9Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M480.2 171.8L480.3 172.3L480.5 172.9L481 173.4L481.6 174L482.4 174.5L483.3 175L484.4 175.5L485.6 176L486.9 176.4L488.3 176.7L489.7 177L491.2 177.2L492.7 177.4L494.2 177.5L495.6 177.5L496.9 177.4L498.2 177.3L499.4 177.1L500.4 176.8L501.3 176.5L502.1 176.1L502.6 175.7L503 175.2L503.2 174.7\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M473.7 248.1L480.2 171.8L480.4 171.3L480.7 170.8L481.2 170.3L481.9 170L482.7 169.6L483.7 169.3L484.8 169.1L486 169L487.4 168.9L488.8 168.9L490.2 168.9L491.7 169.1L493.1 169.2L494.6 169.5L496 169.8L497.3 170.2L498.5 170.6L499.7 171.1L500.7 171.6L501.5 172.1L502.2 172.7L502.7 173.2L503 173.8L503.2 174.3L503.2 174.8L490.1 250.3L490 250.7L489.7 251L489.2 251.3L488.7 251.6L488 251.8L487.3 252L486.4 252.1L485.5 252.2L484.5 252.2L483.5 252.2L482.5 252.2L481.4 252L480.4 251.9L479.3 251.7L478.4 251.4L477.4 251.1L476.6 250.8L475.8 250.5L475.2 250.1L474.6 249.7L474.2 249.3L473.9 248.9L473.7 248.5Z\"/></g></g><g class=\"mq-joint\" data-name=\"as.shoulderR\"><g class=\"iso-solid\" data-seamless=\"\"><path class=\"iso-fill\" d=\"M478.9 167.1L479 165L479.5 162.9L480.3 160.9L481.5 159.1L482.9 157.5L484.5 156.1L486.3 155L488.3 154.2L490.4 153.7L492.5 153.5L494.6 153.7L496.7 154.2L498.7 155L500.5 156.1L502.1 157.5L503.5 159.1L504.7 160.9L505.5 162.9L506 165L506.1 167.1L506 169.3L505.5 171.3L504.7 173.3L503.5 175.1L502.1 176.8L500.5 178.2L498.7 179.3L496.7 180.1L494.6 180.6L492.5 180.8L490.4 180.6L488.3 180.1L486.3 179.3L484.5 178.2L482.9 176.8L481.5 175.1L480.3 173.3L479.5 171.3L479 169.3Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M478.9 167.1L479 165L479.5 162.9L480.3 160.9L481.5 159.1L482.9 157.5L484.5 156.1L486.3 155L488.3 154.2L490.4 153.7L492.5 153.5L494.6 153.7L496.7 154.2L498.7 155L500.5 156.1L502.1 157.5L503.5 159.1L504.7 160.9L505.5 162.9L506 165L506.1 167.1L506 169.3L505.5 171.3L504.7 173.3L503.5 175.1L502.1 176.8L500.5 178.2L498.7 179.3L496.7 180.1L494.6 180.6L492.5 180.8L490.4 180.6L488.3 180.1L486.3 179.3L484.5 178.2L482.9 176.8L481.5 175.1L480.3 173.3L479.5 171.3L479 169.3Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M478.9 167.1L479 165L479.5 162.9L480.3 160.9L481.5 159.1L482.9 157.5L484.5 156.1L486.3 155L488.3 154.2L490.4 153.7L492.5 153.5L494.6 153.7L496.7 154.2L498.7 155L500.5 156.1L500.9 156.6L501 157.3L500.9 158.1L500.5 159.2L499.9 160.4L499.1 161.7L498 163.1L496.8 164.6L495.4 166L493.9 167.5L492.4 168.9L490.8 170.2L489.1 171.4L487.6 172.4L486.1 173.3L484.7 173.9L483.5 174.3L482.4 174.5L481.6 174.5L481 174.3L480.3 173.3L479.5 171.3L479 169.3Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M478.9 167.1L479 165L479.5 162.9L480.3 160.9L481.5 159.1L482.9 157.5L484.5 156.1L486.3 155L488.3 154.2L490.4 153.7L492.5 153.5L494.6 153.7L496.7 154.2L497.9 154.6L498.2 155.1L498.3 155.7L498.2 156.5L497.9 157.5L497.3 158.6L496.5 159.8L495.6 161.1L494.4 162.5L493.1 163.8L491.8 165.2L490.3 166.5L488.8 167.7L487.3 168.8L485.9 169.7L484.5 170.5L483.2 171.1L482.1 171.5L481.1 171.7L480.4 171.7L479.8 171.5L479.4 171L479 169.3Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M478.9 167.1L479 165L479.5 162.9L480.3 160.9L481.5 159.1L482.9 157.5L484.5 156.1L486.3 155L488.3 154.2L490.4 153.7L492.5 153.5L494.4 153.6L494.9 153.8L495.2 154.2L495.3 154.8L495.2 155.5L494.9 156.3L494.4 157.3L493.7 158.3L492.9 159.5L491.9 160.6L490.8 161.8L489.6 163L488.4 164.1L487.1 165.1L485.8 166.1L484.5 166.9L483.4 167.6L482.3 168.1L481.3 168.4L480.4 168.6L479.8 168.6L479.3 168.4L479 168Z\"/><path class=\"iso-top\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M478.9 167.1L479 165L479.5 162.9L480.3 160.9L481.5 159.1L482.9 157.5L484.5 156.1L486.3 155L488.3 154.2L490.4 153.7L492.5 153.5L494.6 153.7L496.7 154.2L498.7 155L500.5 156.1L502.1 157.5L503.5 159.1L504.7 160.9L505.5 162.9L506 165L506.1 167.1L506 169.3L505.5 171.3L504.7 173.3L503.5 175.1L502.1 176.8L500.5 178.2L498.7 179.3L496.7 180.1L494.6 180.6L492.5 180.8L490.4 180.6L488.3 180.1L486.3 179.3L484.5 178.2L482.9 176.8L481.5 175.1L480.3 173.3L479.5 171.3L479 169.3Z\"/></g></g></svg></div><div class=\"vo-scrub\"><button type=\"button\" class=\"vo-play\" data-play aria-label=\"Play\">Play</button><input type=\"range\" class=\"vo-range\" min=\"0\" max=\"20.60\" step=\"0.05\" value=\"0\" aria-label=\"Minutes into the test\"><span class=\"vo-clock\" data-clock aria-hidden=\"true\">0:00</span></div><span class=\"vo-sr\" role=\"status\" aria-live=\"polite\" data-status></span><div class=\"opt-controls\"><div class=\"opt-seg\" role=\"radiogroup\" aria-label=\"VO₂max ceiling, mL/kg/min\" data-control=\"ceiling\"><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"25\" aria-checked=\"false\" tabindex=\"-1\">25</button><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"35\" aria-checked=\"true\" tabindex=\"0\">35</button><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"45\" aria-checked=\"false\" tabindex=\"-1\">45</button><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"55\" aria-checked=\"false\" tabindex=\"-1\">55</button></div></div><div class=\"opt-foot\"><span class=\"opt-hint\">Pick a VO₂max ceiling · drag or play</span><dl class=\"opt-readout\" data-readout aria-hidden=\"true\"><div class=\"opt-stat\" data-stat=\"w\"><dt>Power</dt><dd data-r=\"w\">0 W</dd></div><div class=\"opt-stat\" data-stat=\"hr\"><dt>Heart rate</dt><dd data-r=\"hr\">65 bpm</dd></div><div class=\"opt-stat\" data-stat=\"vo2\"><dt>VO₂</dt><dd data-r=\"vo2\">3.5 mL/kg/min</dd></div></dl></div></div><figcaption class=\"iso-legend\"><span class=\"iso-keys\"><span class=\"iso-key\"><svg class=\"iso-swatch\" data-mark=\"lit\" viewBox=\"0 0 16 10\" aria-hidden=\"true\"><path d=\"M2 4.5 8 1.5 14 4.5 14 6 8 9 2 6Z\"/><path class=\"iso-swatch-crease\" d=\"M2 4.5 8 7.5 14 4.5\"/></svg>The mask's analyser, blinking each breath</span><span class=\"iso-key\"><svg class=\"iso-swatch\" data-mark=\"raised\" viewBox=\"0 0 16 10\" aria-hidden=\"true\"><path d=\"M2 4.5 8 1.5 14 4.5 14 6 8 9 2 6Z\"/><path class=\"iso-swatch-crease\" d=\"M2 4.5 8 7.5 14 4.5\"/></svg>Power, as an arc on the flywheel cover</span><span class=\"iso-key\"><svg class=\"iso-swatch\" data-mark=\"heat\" viewBox=\"0 0 16 10\" aria-hidden=\"true\"><path d=\"M1.5 5h13\"/></svg>Oxygen uptake against power, on the tablet</span></span><span class=\"iso-caption\"><span class=\"vo-par\">On a ramp test the smart bike's brake adds a few watts every couple of seconds while you keep pedalling. Each extra watt costs about 10 mL of oxygen a minute, so oxygen use climbs in a straight line, a little behind the power, until the heart and muscles can't deliver or use any more. That ceiling is VO₂max. A fitter body reaches a higher ceiling and more watts, but climbs the same slope.</span><span class=\"vo-par\">The analyser on the mask measures every breath, how much air goes out and how much oxygen it has lost, and sends it wirelessly to the assessor's tablet. Nothing tethers you to a cart.</span><span class=\"vo-par\">In 122,007 adults who had treadmill exercise tests, the least fit group had about five times the death rate of the fittest 2–3 % over a median of 8.4 years. That's an association between fitness and survival, not a promise that training will change anyone's risk by that much.</span><span class=\"vo-par\"><small>A typical pattern for one modelled person (45 years, 75 kg), not a prediction. Many people stop before a clear plateau; their top value is called VO₂peak. Bike values run about 13–22 % below treadmill values, so compare a bike result with bike norms (in a large registry, the median on a bike was 41.9 mL/kg/min for men in their 20s and 19.5 in their 70s; for women, 31.0 and 14.8). Heart rates are typical for age and vary by 10 bpm or more.</small></span></span></figcaption></figure>" + "</div>";
    mount(root.querySelector(".opt-figure"));
  }
}
customElements.define("optimal-fig-vo2max", Fig);
})();
