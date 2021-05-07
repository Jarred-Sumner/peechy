//go:generate go-enum -f=$GOFILE --marshal
package buffer

import (
	"encoding/binary"
	"math"
	"reflect"
	"unsafe"

	"github.com/valyala/bytebufferpool"
)

type Buffer struct {
	Bytes  *bytebufferpool.ByteBuffer
	Offset uint
}

const SIZEOF_INT32 = 4 // bytes
const SIZEOF_INT16 = 2 // bytes

func (b *Buffer) WriteVarFloat(s float32) {

}
func (b *Buffer) WriteFloat32(value float32) {
	bytes := (*[4]byte)(unsafe.Pointer(&value))[:]
	b.Bytes.Write(bytes)
	b.Offset++
}
func (b *Buffer) WriteVarUint(value uint) {
	b.WriteUint32(uint32(value))
	// for {
	// 	curr := byte(value) & 127
	// 	value >>= 7

	// 	if value == 0 {
	// 		b.Bytes.WriteByte(curr)
	// 		b.Offset++
	// 		return
	// 	}

	// 	b.Bytes.WriteByte(curr | 128)
	// 	b.Offset++
	// }

}

func (b *Buffer) ReadBool() bool {
	offset := b.Offset
	b.Offset++
	return b.Bytes.B[offset] >= 1
}

func (b *Buffer) Slice() []byte {
	return b.Bytes.B[0:b.Offset]
}

func (b *Buffer) WriteUint16(value uint16) {
	b.Bytes.Write((*[2]byte)(unsafe.Pointer(&value))[:])
	b.Offset += 2
}
func (b *Buffer) WriteUint32(value uint32) {
	b.Bytes.Write((*[4]byte)(unsafe.Pointer(&value))[:])
	b.Offset += 4
}

func (b *Buffer) Reset() {
	b.Bytes.Reset()
	b.Offset = 0
}

func (b *Buffer) WriteInt8Array(value []int8) {
	b.WriteVarUint(uint(cap(value)))
	header := *(*reflect.SliceHeader)(unsafe.Pointer(&value))

	// The length and capacity of the slice are different.
	// header.Len /=
	// header.Cap /=

	// Convert slice header to an []int32
	b.Bytes.Write(*(*[]byte)(unsafe.Pointer(&header)))
}

func (b *Buffer) WriteInt16Array(value []int16) {
	b.WriteVarUint(uint(cap(value)))
	header := *(*reflect.SliceHeader)(unsafe.Pointer(&value))

	// The length and capacity of the slice are different.
	header.Len *= SIZEOF_INT16
	header.Cap *= SIZEOF_INT16

	// Convert slice header to an []int32
	b.Bytes.Write(*(*[]byte)(unsafe.Pointer(&header)))
}

func (b *Buffer) WriteInt32Array(value []int32) {
	b.WriteVarUint(uint(cap(value)))
	header := *(*reflect.SliceHeader)(unsafe.Pointer(&value))

	// The length and capacity of the slice are different.
	header.Len *= SIZEOF_INT32
	header.Cap *= SIZEOF_INT32

	// Convert slice header to an []int32
	b.Bytes.Write(*(*[]byte)(unsafe.Pointer(&header)))
}

func (b *Buffer) WriteUInt16Array(value []uint16) {
	b.WriteVarUint(uint(cap(value)))
	header := *(*reflect.SliceHeader)(unsafe.Pointer(&value))

	// The length and capacity of the slice are different.
	header.Len *= SIZEOF_INT16
	header.Cap *= SIZEOF_INT16

	// Convert slice header to an []int32
	b.Bytes.Write(*(*[]byte)(unsafe.Pointer(&header)))
}

func (b *Buffer) WriteUInt32Array(value []uint32) {
	b.WriteVarUint(uint(cap(value)))
	header := *(*reflect.SliceHeader)(unsafe.Pointer(&value))

	// The length and capacity of the slice are different.
	header.Len *= SIZEOF_INT32
	header.Cap *= SIZEOF_INT32

	// Convert slice header to an []int32
	b.Bytes.Write(*(*[]byte)(unsafe.Pointer(&header)))
}

func (b *Buffer) WriteFloat32Array(value []float32) {
	b.WriteVarUint(uint(cap(value)))
	header := *(*reflect.SliceHeader)(unsafe.Pointer(&value))

	// The length and capacity of the slice are different.
	header.Len *= SIZEOF_INT32
	header.Cap *= SIZEOF_INT32

	// Convert slice header to an []int32
	b.Bytes.Write(*(*[]byte)(unsafe.Pointer(&header)))
}

func (b *Buffer) WriteByte(value byte) {
	b.Bytes.WriteByte(value)
	b.Offset++
}

func (b *Buffer) WriteByteArray(value []byte) {
	b.WriteVarUint(uint(cap(value)))
	b.Bytes.Write(value)
}

func (b *Buffer) WriteVarInt(value int) {
	b.WriteInt32(int32(value))
	// b.WriteVarUint(uint((value << 1) ^ (value >> 31)))
}
func (b *Buffer) WriteInt8(value int8) {
	bytes := (*[1]byte)(unsafe.Pointer(&value))[:]
	b.Bytes.Write(bytes)
	b.Offset++
}
func (b *Buffer) WriteBool(value bool) {
	if value {
		b.Bytes.WriteByte(1)
	} else {
		b.Bytes.WriteByte(0)
	}

	b.Offset++
}
func (b *Buffer) WriteInt16(value int16) {
	bytes := (*[2]byte)(unsafe.Pointer(&value))[:]
	b.Bytes.Write(bytes)
	b.Offset += 2
}
func (b *Buffer) WriteInt32(value int32) {
	bytes := (*[4]byte)(unsafe.Pointer(&value))[:]
	b.Bytes.Write(bytes)
	b.Offset += 4
}
func (b *Buffer) WriteLowpFloat(value float64) {
	b.WriteVarInt(int(math.Round(value * 1000)))
}
func (b *Buffer) WriteString(s string) {
	if len(s) > 0 {
		byteLength, _ := b.Bytes.WriteString(s)
		b.Offset += uint(byteLength)
	}
	b.WriteByte(0)
}

func (b *Buffer) ReadVarFloat() float32 {
	b.Offset++
	return 0
}

func (b *Buffer) ReadFloat32() float32 {
	start := b.Offset
	b.Offset += 4
	return math.Float32frombits(binary.LittleEndian.Uint32(b.Bytes.B[start:b.Offset]))
}

func (b *Buffer) ReadVarUint() uint {
	return uint(b.ReadUint32())
	// var value uint32
	// var shift uint32
	// var curr uint8

	// value = 0
	// shift = 0

	// for {
	// 	if b.Offset >= uint(b.Bytes.Len()) {
	// 		break
	// 	}

	// 	curr = b.ReadByte()
	// 	value |= uint32((curr & 127)) << shift
	// 	shift += 7
	// 	if (curr&128) == 0 || shift >= 35 {
	// 		break
	// 	}
	// }

	// return uint(value >> 0)
}

func (b *Buffer) ReadByte() byte {
	start := b.Offset

	b.Offset++
	// if b.Offset > uint(b.Bytes.Len()) {
	// 	return byte(0), errors.New("offset exceeded bounds of buffer")
	// }

	return b.Bytes.B[start]
}

func (b *Buffer) ReadByteArray() []byte {
	start := b.Offset
	b.Offset += b.ReadVarUint()

	return b.Bytes.B[start:b.Offset]
}

const zeroRune = rune(byte(0))

func (b *Buffer) ReadAlphanumeric() string {
	runes := make([]rune, 0, 10)
	var r rune

	for {
		r = b.ReadRune()
		if r == zeroRune {
			break
		}

		runes = append(runes, r)
	}

	return string(runes)
}

func (b *Buffer) ReadRune() rune {
	pos := b.Offset
	b.Offset++
	return rune(b.Bytes.B[pos])

}

func (b *Buffer) WriteAlphanumeric(s string) {
	for _, r := range s {
		b.WriteByte(byte(r))
	}
	b.WriteByte(0)
}

func (b *Buffer) ReadUint16() uint16 {
	start := b.Offset
	b.Offset += 2

	return binary.LittleEndian.Uint16(b.Bytes.B[start:b.Offset])
}

func (b *Buffer) ReadUint32() uint32 {
	start := b.Offset
	b.Offset += 4
	return binary.LittleEndian.Uint32(b.Bytes.B[start:b.Offset])
}

func (b *Buffer) ReadVarInt() int {
	value := b.ReadVarUint()
	x := int(value >> 1)
	if value&1 != 0 {
		x = ^x
	}
	return x
}

func (b *Buffer) ReadInt8() int8 {
	return int8(b.ReadByte())
}
func (b *Buffer) ReadInt16() int16 {
	return int16(b.ReadUint16())
}
func (b *Buffer) ReadInt32() int32 {
	return int32(b.ReadUint32())
}
func (b *Buffer) ReadLowpFloat() float32 {
	return float32(b.ReadInt32()) / 1000
}
func (b *Buffer) ReadString() string {
	start := b.Offset
	var stop int

	for i, char := range b.Bytes.B[start:] {
		if char == 0 {
			stop = i
			break
		}
	}
	b.Offset += uint(stop + 1)
	if stop > 0 {
		return string(b.Bytes.B[start : b.Offset-1])
	} else {
		return ""
	}

}

func (b *Buffer) ReadInt8Array() []int8 {
	length := b.ReadVarUint()

	arr := make([]int8, length)

	for i := uint(0); i < length; i++ {
		arr[i] = int8(b.Bytes.B[b.Offset])
		b.Offset++
	}

	return arr
}

func (b *Buffer) ReadInt16Array() []int16 {
	length := b.ReadVarUint()
	end := b.Offset + length*SIZEOF_INT16

	arr := make([]int16, length)

	for i := uint(0); i < length; i++ {
		arr[i] = int16(binary.LittleEndian.Uint16(b.Bytes.B[b.Offset:end]))
		b.Offset += SIZEOF_INT16
	}

	return arr
}

func (b *Buffer) ReadUInt16Array() []uint16 {
	length := b.ReadVarUint()
	end := b.Offset + length*SIZEOF_INT16

	arr := make([]uint16, length)

	for i := uint(0); i < length; i++ {
		arr[i] = binary.LittleEndian.Uint16(b.Bytes.B[b.Offset:end])
		b.Offset += SIZEOF_INT16
	}

	return arr
}

func (b *Buffer) ReadUInt32Array() []uint32 {
	length := b.ReadVarUint()
	end := b.Offset + length*SIZEOF_INT32

	arr := make([]uint32, length)

	for i := uint(0); i < length; i++ {
		arr[i] = binary.LittleEndian.Uint32(b.Bytes.B[b.Offset:end])
		b.Offset += SIZEOF_INT32
	}

	return arr
}

func (b *Buffer) ReadInt32Array() []int32 {
	length := b.ReadVarUint()
	end := b.Offset + length*SIZEOF_INT32

	arr := make([]int32, length)

	for i := uint(0); i < length; i++ {
		arr[i] = int32(binary.LittleEndian.Uint32(b.Bytes.B[b.Offset:end]))
		b.Offset += SIZEOF_INT32
	}

	return arr
}

func (b *Buffer) ReadFloat32Array() []float32 {
	length := b.ReadVarUint()
	end := b.Offset + length*SIZEOF_INT32

	arr := make([]float32, length)

	for i := uint(0); i < length; i++ {
		arr[i] = float32(binary.LittleEndian.Uint32(b.Bytes.B[b.Offset:end]))
		b.Offset += SIZEOF_INT32
	}

	return arr
}
