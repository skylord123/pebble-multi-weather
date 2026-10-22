/**
 * Glyphs - Condition pictures in the plugin bitmap format
 *
 * Plugins hand bitmaps over as 4-bit palettised images: two pixels a byte,
 * the even x in the high nibble, each row padded to a whole byte, and a
 * palette of GColor8 bytes (0b11rrggbb) with index 0 left transparent. Two
 * shapes are expected for a condition:
 *
 * - image: the picture in white on a disc in the condition's colour
 * - icon: the picture alone in black, so a consumer can recolour it
 *
 * Each picture is a list of shapes in a unit square, painted in order, so it
 * can be drawn at whatever size the subscriber asks for. They are keyed by
 * the app's own condition keys (app/Conditions), which tell thunder, fog,
 * hail and wind apart, rather than the coarser shared condition_code.
 */

// Palette indices
var CLEAR = 0;
var GROUND = 1;   // the disc of an image; the ink of an icon
var INK = 2;      // shapes on the disc
var ACCENT = 3;   // a lightning bolt

function gcolor(r, g, b) {
    return 0xC0 | (r << 4) | (g << 2) | b;
}

var BLACK = gcolor(0, 0, 0);
var WHITE = gcolor(3, 3, 3);
var YELLOW = gcolor(3, 3, 0);

var SKY = {
    sun: gcolor(3, 2, 0),
    heat: gcolor(3, 0, 0),
    rain: gcolor(0, 1, 3),
    ice: gcolor(0, 2, 3),
    storm: gcolor(2, 0, 2),
    grey: gcolor(1, 1, 1)
};

// ------------------------------------------------------------- shapes

function disc(cx, cy, r) {
    return function(x, y) {
        var dx = x - cx;
        var dy = y - cy;
        return dx * dx + dy * dy <= r * r;
    };
}

function ring(cx, cy, r, width) {
    return function(x, y) {
        var d = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
        return Math.abs(d - r) <= width / 2;
    };
}

/** Part of a ring, from angle `from` clockwise to `to`, in radians */
function arc(cx, cy, r, width, from, to) {
    var span = ((to - from) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    return function(x, y) {
        var d = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
        if (Math.abs(d - r) > width / 2) { return false; }
        var angle = ((Math.atan2(y - cy, x - cx) - from) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
        return angle <= span;
    };
}

/** A line with round ends */
function stroke(x0, y0, x1, y1, width) {
    var lengthSq = (x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0);
    return function(x, y) {
        var t = lengthSq ? ((x - x0) * (x1 - x0) + (y - y0) * (y1 - y0)) / lengthSq : 0;
        t = Math.max(0, Math.min(1, t));
        var px = x0 + t * (x1 - x0) - x;
        var py = y0 + t * (y1 - y0) - y;
        return px * px + py * py <= (width / 2) * (width / 2);
    };
}

function polygon(points) {
    return function(x, y) {
        var inside = false;
        for (var i = 0, j = points.length - 1; i < points.length; j = i++) {
            var xi = points[i][0], yi = points[i][1];
            var xj = points[j][0], yj = points[j][1];
            if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) {
                inside = !inside;
            }
        }
        return inside;
    };
}

function union(shapes) {
    return function(x, y) {
        for (var i = 0; i < shapes.length; i++) {
            if (shapes[i](x, y)) { return true; }
        }
        return false;
    };
}

/**
 * A cloud centred on the square, moved by (dx, dy) and scaled by s. `grow`
 * fattens it, for the gap cut around a cloud in front of something.
 */
function cloud(dx, dy, s, grow) {
    grow = grow || 0;
    var cx = 0.5 + dx;
    var cy = 0.5 + dy;
    function at(u, v) { return [cx + (u - 0.5) * s, cy + (v - 0.5) * s]; }
    var a = at(0.38, 0.5);
    var b = at(0.57, 0.42);
    var c = at(0.71, 0.55);
    var left = at(0.29, 0.63);
    var right = at(0.71, 0.63);
    return union([
        disc(a[0], a[1], 0.15 * s + grow),
        disc(b[0], b[1], 0.19 * s + grow),
        disc(c[0], c[1], 0.12 * s + grow),
        stroke(left[0], left[1], right[0], right[1], 0.2 * s + grow * 2)
    ]);
}

function sun(cx, cy, r) {
    var shapes = [disc(cx, cy, r)];
    for (var i = 0; i < 8; i++) {
        var angle = i * Math.PI / 4;
        var cos = Math.cos(angle);
        var sin = Math.sin(angle);
        shapes.push(stroke(cx + cos * r * 1.5, cy + sin * r * 1.5,
            cx + cos * r * 2.1, cy + sin * r * 2.1, r * 0.42));
    }
    return union(shapes);
}

function drop(x, top, length) {
    return stroke(x + 0.03, top, x - 0.03, top + length, 0.065);
}

function flake(x, y) {
    return disc(x, y, 0.048);
}

var BOLT = polygon([[0.57, 0.53], [0.41, 0.75], [0.51, 0.75], [0.44, 0.95],
    [0.63, 0.69], [0.53, 0.69], [0.61, 0.53]]);

// ------------------------------------------------------------- pictures

// A raised cloud leaves room underneath for whatever is falling from it
var HIGH_CLOUD = cloud(0, -0.12, 0.9);

function paint(shape, index) {
    return { shape: shape, index: index };
}

function erase(shape) {
    return { shape: shape, index: null };
}

var PICTURES = {
    sunny: { sky: SKY.sun, layers: [paint(sun(0.5, 0.5, 0.16), INK)] },
    hot: { sky: SKY.heat, layers: [paint(sun(0.5, 0.5, 0.16), INK)] },
    partlycloudy: { sky: SKY.sun, layers: [
        paint(sun(0.62, 0.36, 0.11), INK),
        erase(cloud(-0.06, 0.1, 0.85, 0.05)),
        paint(cloud(-0.06, 0.1, 0.85), INK)
    ] },
    cloudy: { sky: SKY.grey, layers: [paint(cloud(0, 0, 1), INK)] },
    drizzle: { sky: SKY.rain, layers: [
        paint(HIGH_CLOUD, INK),
        paint(union([drop(0.36, 0.74, 0.09), drop(0.5, 0.74, 0.09), drop(0.64, 0.74, 0.09)]), INK)
    ] },
    rain: { sky: SKY.rain, layers: [
        paint(HIGH_CLOUD, INK),
        paint(union([drop(0.3, 0.72, 0.15), drop(0.43, 0.72, 0.15),
            drop(0.57, 0.72, 0.15), drop(0.7, 0.72, 0.15)]), INK)
    ] },
    lightsnow: { sky: SKY.ice, layers: [
        paint(HIGH_CLOUD, INK),
        paint(union([flake(0.35, 0.8), flake(0.5, 0.8), flake(0.65, 0.8)]), INK)
    ] },
    snow: { sky: SKY.ice, layers: [
        paint(HIGH_CLOUD, INK),
        paint(union([flake(0.33, 0.77), flake(0.5, 0.77), flake(0.67, 0.77),
            flake(0.415, 0.9), flake(0.585, 0.9)]), INK)
    ] },
    mixedsnow: { sky: SKY.ice, layers: [
        paint(HIGH_CLOUD, INK),
        paint(union([drop(0.32, 0.74, 0.12), flake(0.45, 0.82), drop(0.58, 0.74, 0.12), flake(0.71, 0.82)]), INK)
    ] },
    hail: { sky: SKY.ice, layers: [
        paint(HIGH_CLOUD, INK),
        paint(union([disc(0.34, 0.78, 0.055), disc(0.5, 0.78, 0.055), disc(0.66, 0.78, 0.055),
            disc(0.42, 0.91, 0.055), disc(0.58, 0.91, 0.055)]), INK)
    ] },
    storm: { sky: SKY.storm, layers: [paint(HIGH_CLOUD, INK), paint(BOLT, ACCENT)] },
    thundershowers: { sky: SKY.storm, layers: [
        paint(HIGH_CLOUD, INK),
        paint(union([drop(0.3, 0.74, 0.14), drop(0.72, 0.74, 0.14)]), INK),
        paint(BOLT, ACCENT)
    ] },
    lowvisibility: { sky: SKY.grey, layers: [
        paint(cloud(0, -0.14, 0.85), INK),
        paint(union([stroke(0.24, 0.74, 0.76, 0.74, 0.07), stroke(0.3, 0.87, 0.7, 0.87, 0.07)]), INK)
    ] },
    windy: { sky: SKY.grey, layers: [paint(union([
        stroke(0.22, 0.36, 0.66, 0.36, 0.075),
        stroke(0.22, 0.5, 0.78, 0.5, 0.075),
        stroke(0.22, 0.64, 0.58, 0.64, 0.075)
    ]), INK)] },
    tornado: { sky: SKY.grey, layers: [paint(union([
        stroke(0.24, 0.28, 0.76, 0.28, 0.075),
        stroke(0.31, 0.4, 0.71, 0.4, 0.075),
        stroke(0.38, 0.52, 0.65, 0.52, 0.075),
        stroke(0.44, 0.64, 0.6, 0.64, 0.075),
        stroke(0.49, 0.76, 0.55, 0.76, 0.075)
    ]), INK)] },
    // The cyclone symbol: an eye with an arm sweeping off either side
    hurricane: { sky: SKY.storm, layers: [paint(union([
        ring(0.5, 0.5, 0.1, 0.08),
        arc(0.6, 0.5, 0.2, 0.08, Math.PI, Math.PI * 1.55),
        arc(0.4, 0.5, 0.2, 0.08, 0, Math.PI * 0.55)
    ]), INK)] },
    cold: { sky: SKY.ice, layers: [paint(union([
        stroke(0.5, 0.22, 0.5, 0.78, 0.07),
        stroke(0.26, 0.36, 0.74, 0.64, 0.07),
        stroke(0.26, 0.64, 0.74, 0.36, 0.07)
    ]), INK)] },
    na: { sky: SKY.grey, layers: [paint(ring(0.5, 0.5, 0.26, 0.08), INK)] }
};

// Storms the app tells apart all share one picture
PICTURES.scatteredthunderstorms = PICTURES.thundershowers;
PICTURES.isolatedthunderstorms = PICTURES.thundershowers;

// ------------------------------------------------------------- rendering

// How much of the square the picture uses: inside the disc of an image, and
// nearly all of it for an icon, which has no disc around it
var IMAGE_SCALE = 0.8;
var ICON_SCALE = 1.0;

var MIN_SIZE = 8;
var MAX_SIZE = 256;

var rendered = {};

function render(key, size, mono) {
    var picture = PICTURES[key] || PICTURES.na;
    var scale = mono ? ICON_SCALE : IMAGE_SCALE;
    var stride = Math.ceil(size / 2);
    var bytes = new Array(stride * size);
    var discBackground = mono ? CLEAR : GROUND;

    for (var py = 0; py < size; py++) {
        for (var bx = 0; bx < stride; bx++) {
            var pair = 0;
            for (var half = 0; half < 2; half++) {
                var px = bx * 2 + half;
                var index = CLEAR;
                if (px < size) {
                    var x = (px + 0.5) / size;
                    var y = (py + 0.5) / size;
                    var inDisc = (x - 0.5) * (x - 0.5) + (y - 0.5) * (y - 0.5) <= 0.25;
                    if (!mono && inDisc) {
                        index = GROUND;
                    }
                    // Into the picture's own square
                    var u = (x - 0.5) / scale + 0.5;
                    var v = (y - 0.5) / scale + 0.5;
                    if (mono || inDisc) {
                        for (var i = 0; i < picture.layers.length; i++) {
                            var layer = picture.layers[i];
                            if (layer.shape(u, v)) {
                                index = layer.index === null ? discBackground
                                    : (mono ? GROUND : layer.index);
                            }
                        }
                    }
                }
                pair = (pair << 4) | index;
            }
            bytes[py * stride + bx] = pair;
        }
    }

    var palette = mono ? [0x00, BLACK] : [0x00, picture.sky, WHITE, YELLOW];
    return {
        pixels: btoa(toBinary(bytes)),
        palette: btoa(toBinary(palette)),
        width: size,
        height: size
    };
}

function toBinary(bytes) {
    var out = '';
    for (var i = 0; i < bytes.length; i += 4096) {
        out += String.fromCharCode.apply(null, bytes.slice(i, i + 4096));
    }
    return out;
}

var Glyphs = {
    /**
     * The icon and image shapes for a condition, square at the smaller of
     * the requested dimensions
     * @param {string} key - Condition key from app/Conditions
     * @param {Object} pixelSize - The request's iconPixelSize, { w, h }
     * @returns {Object} { icon, image }
     */
    shapes: function(key, pixelSize) {
        var size = Math.round(Math.min(pixelSize.w, pixelSize.h));
        size = Math.max(MIN_SIZE, Math.min(MAX_SIZE, size || MIN_SIZE));
        var name = (PICTURES[key] ? key : 'na') + '@' + size;
        if (!rendered[name]) {
            rendered[name] = {
                icon: render(key, size, true),
                image: render(key, size, false)
            };
        }
        return rendered[name];
    },

    /** Whether there is a picture of its own for this key */
    has: function(key) {
        return PICTURES.hasOwnProperty(key);
    }
};

module.exports = Glyphs;
