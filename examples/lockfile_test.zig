test "Version" {
    var hello = "hello".*;
    var version = TestSchema.Version{
        .major = 1,
        .minor = 2,
        .patch = 0,
        .pre = &hello,
        .build = &([_]u8{}),
    };

    var in_buffer = [_]u8{0} ** 256;
    var stream = std.io.fixedBufferStream(&in_buffer);
    var writer = std.io.countingWriter(stream.writer());

    var out_stream = std.io.fixedBufferStream(&in_buffer);
    var reader = std.io.countingReader(out_stream.reader());

    try version.encode(writer.writer());
    var other = try TestSchema.Version.decode(std.heap.page_allocator, reader.reader());

    std.testing.expectEqual(other.major, 1);
    std.testing.expectEqual(other.minor, 2);
    std.testing.expectEqual(other.patch, 0);
    std.testing.expect(std.mem.eql(u8, version.pre, other.pre));
}

test "JavascriptPackageRequest" {
    var req = TestSchema.JavascriptPackageRequest{};
    var _h = "Hello".*;
    req.name = &_h;

    var in_buffer = [_]u8{0} ** 256;
    var stream = std.io.fixedBufferStream(&in_buffer);
    var writer = std.io.countingWriter(stream.writer());

    var out_stream = std.io.fixedBufferStream(&in_buffer);
    var reader = std.io.countingReader(out_stream.reader());

    try req.encode(writer.writer());

    var other = try TestSchema.JavascriptPackageRequest.decode(std.heap.page_allocator, reader.reader());
    std.testing.expect(std.mem.eql(u8, req.name.?, other.name.?));
}

test "Manifest" {
    var req = std.mem.zeroes(TestSchema.JavascriptPackageManifest);
    var names = try std.heap.page_allocator.alloc([]u8, 1);
    req.name = names;
    var _name = "hi".*;
    req.name[0] = &_name;

    var in_buffer = [_]u8{0} ** 256;
    var stream = std.io.fixedBufferStream(&in_buffer);
    var writer = std.io.countingWriter(stream.writer());

    var out_stream = std.io.fixedBufferStream(&in_buffer);
    var reader = std.io.countingReader(out_stream.reader());

    try req.encode(writer.writer());

    var other = try TestSchema.JavascriptPackageManifest.decode(std.heap.page_allocator, reader.reader());
    std.testing.expect(std.mem.eql(u8, req.name[0], other.name[0]));
}
