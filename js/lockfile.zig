const buffer = @import("buffer.zig");

const std = @import("std");


pub const TestSchema = struct { 

pub const PackageProvider = enum(u8) {

_none,
  /// npm
  npm,

  /// git
  git,

  /// https
  https,

  /// tgz
  tgz,

  /// other
  other,

_,

                pub fn jsonStringify(self: *const @This(), opts: anytype, o: anytype) !void {
                    return try std.json.stringify(@tagName(self), opts, o);
                }

                
};

pub const ExportsType = enum(u8) {

_none,
  /// commonJs
  common_js,

  /// esModule
  es_module,

  /// browser
  browser,

_,

                pub fn jsonStringify(self: *const @This(), opts: anytype, o: anytype) !void {
                    return try std.json.stringify(@tagName(self), opts, o);
                }

                
};

pub const ExportsManifest = struct {
/// source
source: [][]u8,

/// destination
destination: [][]u8,

/// exportType
export_type: []ExportsType,


pub fn decode(allocator: *std.mem.Allocator, reader: anytype) anyerror!ExportsManifest {
var obj = std.mem.zeroes(ExportsManifest);
try update(&obj, allocator, reader);
return obj;
}
pub fn update(result: *ExportsManifest, allocator: *std.mem.Allocator, reader: anytype) anyerror!void {

  var length: usize = 0;
  {
  var array_count = try reader.readIntNative(u32);
  if (array_count != result.source.len) {
  result.source = try allocator.alloc([]u8, array_count);
  }
  length = try reader.readIntNative(u32);
  for (result.source) |content, j| {
  if (result.source[j].len != length) {
  result.source[j] = try allocator.alloc(u8, length);
  }
  _ = try reader.readAll(result.source[j]);
  }
    }
  {
  var array_count = try reader.readIntNative(u32);
  if (array_count != result.destination.len) {
  result.destination = try allocator.alloc([]u8, array_count);
  }
  length = try reader.readIntNative(u32);
  for (result.destination) |content, j| {
  if (result.destination[j].len != length) {
  result.destination[j] = try allocator.alloc(u8, length);
  }
  _ = try reader.readAll(result.destination[j]);
  }
    }
  length = try reader.readIntNative(u32);
  result.export_type = try allocator.alloc(ExportsType, length);
  {
  var j: usize = 0;
  while(j < length) : (j += 1) {
     result.export_type[j] = try reader.readEnum(ExportsType, .Little);
  }}
  return;
}

pub fn encode(result: *const @This(), writer: anytype) anyerror!void {

    var n: usize = 0;
    n = result.source.len;
    _ = try writer.writeIntNative(u32, @intCast(u32, n));
    {
 var j: usize = 0;
   while (j < n) : (j += 1) {
     _ = try writer.writeIntNative(u32, @intCast(u32, result.source[j].len));
      try writer.writeAll(result.source[j]);
    }}

    n = result.destination.len;
    _ = try writer.writeIntNative(u32, @intCast(u32, n));
    {
 var j: usize = 0;
   while (j < n) : (j += 1) {
     _ = try writer.writeIntNative(u32, @intCast(u32, result.destination[j].len));
      try writer.writeAll(result.destination[j]);
    }}

    n = result.export_type.len;
    _ = try writer.writeIntNative(u32, @intCast(u32, n));
    {
 var j: usize = 0;
   while (j < n) : (j += 1) {
      try writer.writeByte(@enumToInt(result.export_type[j]));
    }}
  return;
}

};

pub const Version = struct {
/// major
major: i32 = 0,

/// minor
minor: i32 = 0,

/// patch
patch: i32 = 0,

/// pre
pre: []u8,

/// build
build: []u8,


pub fn decode(allocator: *std.mem.Allocator, reader: anytype) anyerror!Version {
var obj = std.mem.zeroes(Version);
try update(&obj, allocator, reader);
return obj;
}
pub fn update(result: *Version, allocator: *std.mem.Allocator, reader: anytype) anyerror!void {

  var length: usize = 0;
  _ = try reader.readAll(std.mem.asBytes(&result.major));
  _ = try reader.readAll(std.mem.asBytes(&result.minor));
  _ = try reader.readAll(std.mem.asBytes(&result.patch));
  length = try reader.readIntNative(u32);
  if (result.pre.len != length) {
  result.pre = try allocator.alloc(u8, length);
  }
  _ = try reader.readAll(result.pre);
  length = try reader.readIntNative(u32);
  if (result.build.len != length) {
  result.build = try allocator.alloc(u8, length);
  }
  _ = try reader.readAll(result.build);
  return;
}

pub fn encode(result: *const @This(), writer: anytype) anyerror!void {

    try writer.writeIntNative(i32, result.major);

    try writer.writeIntNative(i32, result.minor);

    try writer.writeIntNative(i32, result.patch);

    try writer.writeIntNative(u32, @intCast(u32, result.pre.len));
    try writer.writeAll(std.mem.sliceAsBytes(result.pre));

    try writer.writeIntNative(u32, @intCast(u32, result.build.len));
    try writer.writeAll(std.mem.sliceAsBytes(result.build));
  return;
}

};

pub const JavascriptPackageInput = struct {
/// name
name: ?[]u8 = null,

/// version
version: ?[]u8 = null,

/// dependencies
dependencies: ?RawDependencyList = null,


pub fn decode(allocator: *std.mem.Allocator, reader: anytype) anyerror!JavascriptPackageInput {
var obj = std.mem.zeroes(JavascriptPackageInput);
try update(&obj, allocator, reader);
return obj;
}
pub fn update(result: *JavascriptPackageInput, allocator: *std.mem.Allocator, reader: anytype) anyerror!void {

      var length: usize = 0;
  while(true) {
    const field_type: u8 = try reader.readByte(); 
    switch (field_type) {
      0 => { return; },

     1 => {
      length = try reader.readIntNative(u32);
      if ((result.name orelse &([_]u8{})).len != length) {
      result.name = try allocator.alloc(u8, length);
      }
      _ = try reader.readAll(result.name.?);
},
     2 => {
      length = try reader.readIntNative(u32);
      if ((result.version orelse &([_]u8{})).len != length) {
      result.version = try allocator.alloc(u8, length);
      }
      _ = try reader.readAll(result.version.?);
},
     3 => {
      result.dependencies = try RawDependencyList.decode(allocator, reader);
},
    else => {
      return error.InvalidMessage;
    }
  }}
}

pub fn encode(result: *const @This(), writer: anytype) anyerror!void {

  if (result.name) |name| {
    try writer.writeByte(1);
    try writer.writeIntNative(u32, @intCast(u32, name.len));
    try writer.writeAll(name);
   }

  if (result.version) |version| {
    try writer.writeByte(2);
    try writer.writeIntNative(u32, @intCast(u32, version.len));
    try writer.writeAll(std.mem.sliceAsBytes(version));
   }

  if (result.dependencies) |dependencies| {
    try writer.writeByte(3);
    try dependencies.encode(writer);
   }
  try writer.writeByte(0);
  return;
}

};

pub const RawDependencyList = struct {
/// count
count: u32 = 0,

/// names
names: [][]u8,

/// versions
versions: [][]u8,


pub fn decode(allocator: *std.mem.Allocator, reader: anytype) anyerror!RawDependencyList {
var obj = std.mem.zeroes(RawDependencyList);
try update(&obj, allocator, reader);
return obj;
}
pub fn update(result: *RawDependencyList, allocator: *std.mem.Allocator, reader: anytype) anyerror!void {

  var length: usize = 0;
  _ = try reader.readAll(std.mem.asBytes(&result.count));
  {
  var array_count = try reader.readIntNative(u32);
  if (array_count != result.names.len) {
  result.names = try allocator.alloc([]u8, array_count);
  }
  length = try reader.readIntNative(u32);
  for (result.names) |content, j| {
  if (result.names[j].len != length) {
  result.names[j] = try allocator.alloc(u8, length);
  }
  _ = try reader.readAll(result.names[j]);
  }
    }
  {
  var array_count = try reader.readIntNative(u32);
  if (array_count != result.versions.len) {
  result.versions = try allocator.alloc([]u8, array_count);
  }
  length = try reader.readIntNative(u32);
  for (result.versions) |content, j| {
  if (result.versions[j].len != length) {
  result.versions[j] = try allocator.alloc(u8, length);
  }
  _ = try reader.readAll(result.versions[j]);
  }
    }
  return;
}

pub fn encode(result: *const @This(), writer: anytype) anyerror!void {

    var n: usize = 0;
    try writer.writeIntNative(u32, result.count);

    n = result.names.len;
    _ = try writer.writeIntNative(u32, @intCast(u32, n));
    {
 var j: usize = 0;
   while (j < n) : (j += 1) {
     _ = try writer.writeIntNative(u32, @intCast(u32, result.names[j].len));
      try writer.writeAll(result.names[j]);
    }}

    n = result.versions.len;
    _ = try writer.writeIntNative(u32, @intCast(u32, n));
    {
 var j: usize = 0;
   while (j < n) : (j += 1) {
     _ = try writer.writeIntNative(u32, @intCast(u32, result.versions[j].len));
      try writer.writeAll(std.mem.sliceAsBytes(result.versions[j]));
    }}
  return;
}

};

pub const JavascriptPackageManifest = struct {
/// count
count: u32 = 0,

/// name
name: [][]u8,

/// version
version: []Version,

/// providers
providers: []PackageProvider,

/// dependencies
dependencies: []u32,

/// dependenciesIndex
dependencies_index: []u32,

/// exportsManifest
exports_manifest: ExportsManifest,

/// exportsManifestIndex
exports_manifest_index: []u32,


pub fn decode(allocator: *std.mem.Allocator, reader: anytype) anyerror!JavascriptPackageManifest {
var obj = std.mem.zeroes(JavascriptPackageManifest);
try update(&obj, allocator, reader);
return obj;
}
pub fn update(result: *JavascriptPackageManifest, allocator: *std.mem.Allocator, reader: anytype) anyerror!void {

  var length: usize = 0;
  _ = try reader.readAll(std.mem.asBytes(&result.count));
  {
  var array_count = try reader.readIntNative(u32);
  if (array_count != result.name.len) {
  result.name = try allocator.alloc([]u8, array_count);
  }
  length = try reader.readIntNative(u32);
  for (result.name) |content, j| {
  if (result.name[j].len != length) {
  result.name[j] = try allocator.alloc(u8, length);
  }
  _ = try reader.readAll(result.name[j]);
  }
    }
  length = try reader.readIntNative(u32);
  result.version = try allocator.alloc(Version, length);
  {
  var j: usize = 0;
  while(j < length) : (j += 1) {
     result.version[j] = try Version.decode(allocator, reader);
  }}
  length = try reader.readIntNative(u32);
  result.providers = try allocator.alloc(PackageProvider, length);
  {
  var j: usize = 0;
  while(j < length) : (j += 1) {
     result.providers[j] = try reader.readEnum(PackageProvider, .Little);
  }}
  length = try reader.readIntNative(u32);
  result.dependencies = try allocator.alloc(u32, length);
  {
  var j: usize = 0;
  while(j < length) : (j += 1) {
     _ = try reader.readAll(std.mem.asBytes(&result.dependencies[j]));
  }}
  length = try reader.readIntNative(u32);
  result.dependencies_index = try allocator.alloc(u32, length);
  {
  var j: usize = 0;
  while(j < length) : (j += 1) {
     _ = try reader.readAll(std.mem.asBytes(&result.dependencies_index[j]));
  }}
  result.exports_manifest = try ExportsManifest.decode(allocator, reader);
  length = try reader.readIntNative(u32);
  result.exports_manifest_index = try allocator.alloc(u32, length);
  {
  var j: usize = 0;
  while(j < length) : (j += 1) {
     _ = try reader.readAll(std.mem.asBytes(&result.exports_manifest_index[j]));
  }}
  return;
}

pub fn encode(result: *const @This(), writer: anytype) anyerror!void {

    var n: usize = 0;
    try writer.writeIntNative(u32, result.count);

    n = result.name.len;
    _ = try writer.writeIntNative(u32, @intCast(u32, n));
    {
 var j: usize = 0;
   while (j < n) : (j += 1) {
     _ = try writer.writeIntNative(u32, @intCast(u32, result.name[j].len));
      try writer.writeAll(result.name[j]);
    }}

    n = result.version.len;
    _ = try writer.writeIntNative(u32, @intCast(u32, n));
    {
 var j: usize = 0;
   while (j < n) : (j += 1) {
      try result.version[j].encode(writer);
     
    }}

    n = result.providers.len;
    _ = try writer.writeIntNative(u32, @intCast(u32, n));
    {
 var j: usize = 0;
   while (j < n) : (j += 1) {
      try writer.writeByte(@enumToInt(result.providers[j]));
    }}

    n = result.dependencies.len;
    _ = try writer.writeIntNative(u32, @intCast(u32, n));
    {
 var j: usize = 0;
   while (j < n) : (j += 1) {
      try writer.writeIntNative(u32, result.dependencies[j]);
    }}

    n = result.dependencies_index.len;
    _ = try writer.writeIntNative(u32, @intCast(u32, n));
    {
 var j: usize = 0;
   while (j < n) : (j += 1) {
      try writer.writeIntNative(u32, result.dependencies_index[j]);
    }}

    try result.exports_manifest.encode(writer);

    n = result.exports_manifest_index.len;
    _ = try writer.writeIntNative(u32, @intCast(u32, n));
    {
 var j: usize = 0;
   while (j < n) : (j += 1) {
      try writer.writeIntNative(u32, result.exports_manifest_index[j]);
    }}
  return;
}

};

pub const JavascriptPackageRequest = struct {
/// clientVersion
client_version: ?[]u8 = null,

/// name
name: ?[]u8 = null,

/// dependencies
dependencies: ?RawDependencyList = null,

/// optionalDependencies
optional_dependencies: ?RawDependencyList = null,

/// devDependencies
dev_dependencies: ?RawDependencyList = null,

/// peerDependencies
peer_dependencies: ?RawDependencyList = null,


pub fn decode(allocator: *std.mem.Allocator, reader: anytype) anyerror!JavascriptPackageRequest {
var obj = std.mem.zeroes(JavascriptPackageRequest);
try update(&obj, allocator, reader);
return obj;
}
pub fn update(result: *JavascriptPackageRequest, allocator: *std.mem.Allocator, reader: anytype) anyerror!void {

      var length: usize = 0;
  while(true) {
    const field_type: u8 = try reader.readByte(); 
    switch (field_type) {
      0 => { return; },

     1 => {
      length = try reader.readIntNative(u32);
      if ((result.client_version orelse &([_]u8{})).len != length) {
      result.client_version = try allocator.alloc(u8, length);
      }
      _ = try reader.readAll(result.client_version.?);
},
     2 => {
      length = try reader.readIntNative(u32);
      if ((result.name orelse &([_]u8{})).len != length) {
      result.name = try allocator.alloc(u8, length);
      }
      _ = try reader.readAll(result.name.?);
},
     3 => {
      result.dependencies = try RawDependencyList.decode(allocator, reader);
},
     4 => {
      result.optional_dependencies = try RawDependencyList.decode(allocator, reader);
},
     5 => {
      result.dev_dependencies = try RawDependencyList.decode(allocator, reader);
},
     6 => {
      result.peer_dependencies = try RawDependencyList.decode(allocator, reader);
},
    else => {
      return error.InvalidMessage;
    }
  }}
}

pub fn encode(result: *const @This(), writer: anytype) anyerror!void {

  if (result.client_version) |client_version| {
    try writer.writeByte(1);
    try writer.writeIntNative(u32, @intCast(u32, client_version.len));
    try writer.writeAll(std.mem.sliceAsBytes(client_version));
   }

  if (result.name) |name| {
    try writer.writeByte(2);
    try writer.writeIntNative(u32, @intCast(u32, name.len));
    try writer.writeAll(name);
   }

  if (result.dependencies) |dependencies| {
    try writer.writeByte(3);
    try dependencies.encode(writer);
   }

  if (result.optional_dependencies) |optional_dependencies| {
    try writer.writeByte(4);
    try optional_dependencies.encode(writer);
   }

  if (result.dev_dependencies) |dev_dependencies| {
    try writer.writeByte(5);
    try dev_dependencies.encode(writer);
   }

  if (result.peer_dependencies) |peer_dependencies| {
    try writer.writeByte(6);
    try peer_dependencies.encode(writer);
   }
  try writer.writeByte(0);
  return;
}

};

pub const ErrorCode = enum(u32) {

_none,
  /// generic
  generic,

  /// missingPackageName
  missing_package_name,

  /// serverDown
  server_down,

  /// versionDoesntExit
  version_doesnt_exit,

_,

                pub fn jsonStringify(self: *const @This(), opts: anytype, o: anytype) !void {
                    return try std.json.stringify(@tagName(self), opts, o);
                }

                
};

pub const JavascriptPackageResponse = struct {
/// name
name: ?[]u8 = null,

/// result
result: ?JavascriptPackageManifest = null,

/// errorCode
error_code: ?ErrorCode = null,

/// message
message: ?[]u8 = null,


pub fn decode(allocator: *std.mem.Allocator, reader: anytype) anyerror!JavascriptPackageResponse {
var obj = std.mem.zeroes(JavascriptPackageResponse);
try update(&obj, allocator, reader);
return obj;
}
pub fn update(result: *JavascriptPackageResponse, allocator: *std.mem.Allocator, reader: anytype) anyerror!void {

      var length: usize = 0;
  while(true) {
    const field_type: u8 = try reader.readByte(); 
    switch (field_type) {
      0 => { return; },

     1 => {
      length = try reader.readIntNative(u32);
      if ((result.name orelse &([_]u8{})).len != length) {
      result.name = try allocator.alloc(u8, length);
      }
      _ = try reader.readAll(result.name.?);
},
     2 => {
      result.result = try JavascriptPackageManifest.decode(allocator, reader);
},
     3 => {
      result.error_code = try reader.readEnum(ErrorCode, .Little);
},
     4 => {
      length = try reader.readIntNative(u32);
      if ((result.message orelse &([_]u8{})).len != length) {
      result.message = try allocator.alloc(u8, length);
      }
      _ = try reader.readAll(result.message.?);
},
    else => {
      return error.InvalidMessage;
    }
  }}
}

pub fn encode(result: *const @This(), writer: anytype) anyerror!void {

  if (result.name) |name| {
    try writer.writeByte(1);
    try writer.writeIntNative(u32, @intCast(u32, name.len));
    try writer.writeAll(name);
   }

  if (result.result) |result| {
    try writer.writeByte(2);
    try result.encode(writer);
   }

  if (result.error_code) |error_code| {
    try writer.writeByte(3);
    try writer.writeAll(@intCast(u8, result.error_code orelse unreachable));
   }

  if (result.message) |message| {
    try writer.writeByte(4);
    try writer.writeIntNative(u32, @intCast(u32, message.len));
    try writer.writeAll(std.mem.sliceAsBytes(message));
   }
  try writer.writeByte(0);
  return;
}

};


};