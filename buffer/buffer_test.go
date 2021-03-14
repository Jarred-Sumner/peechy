package buffer_test

import (
	"bytes"
	"testing"

	"github.com/jarred-sumner/peechy/buffer"
	"github.com/valyala/bytebufferpool"
)

func bufferReadVarUintAssert(t *testing.T, expected []byte, num uint) {
	bb := bytebufferpool.ByteBuffer{B: expected}

	buffer := buffer.Buffer{
		&bb,
		0,
	}
	val := buffer.ReadVarUint()

	if val != num {
		t.Logf("Expected %d to equal %d", val, num)
		t.FailNow()
	}
	// bytebufferpool.Put(bb)
}

func bufferReadVarIntAssert(t *testing.T, expected []byte, num int) {
	bb := bytebufferpool.ByteBuffer{B: expected}

	buffer := buffer.Buffer{
		&bb,
		0,
	}
	val := buffer.ReadVarInt()

	if val != num {
		t.Logf("Expected %d to equal %d", val, num)
		t.FailNow()
	}
	// bytebufferpool.Put(bb)
}

func bufferWriteVarUintAssert(t *testing.T, num uint, expected []byte) {
	bb := bytebufferpool.Get()

	buffer := buffer.Buffer{
		bb,
		0,
	}
	buffer.WriteVarUint(num)

	if !bytes.Equal(expected, buffer.Bytes.B[0:buffer.Offset]) {
		t.Logf("Expected %d to equal %d", expected, buffer.Bytes.B[0:buffer.Offset])
		t.FailNow()
	}

	bytebufferpool.Put(bb)
}

func bufferWriteIntAssert(t *testing.T, num int, expected []byte) {
	bb := bytebufferpool.Get()

	buffer := buffer.Buffer{
		bb,
		0,
	}
	buffer.WriteVarInt(num)

	if !bytes.Equal(expected, buffer.Bytes.B[0:buffer.Offset]) {
		t.Logf("Expected %d to equal %d", expected, buffer.Bytes.B[0:buffer.Offset])
		t.FailNow()
	}

	bytebufferpool.Put(bb)
}

func BenchmarkWriteVarInt(b *testing.B) {

	bb := bytebufferpool.Get()

	var buffer = buffer.Buffer{
		bb,
		0,
	}

	for i := 0; i < b.N; i++ {
		if i%1024 == 0 {
			buffer.Reset()
		}
		buffer.WriteVarInt(i)
	}

	bytebufferpool.Put(bb)
}

func BenchmarkReadVarInt(b *testing.B) {

	bb := bytebufferpool.Get()

	var buffer = buffer.Buffer{
		bb,
		0,
	}

	for i := 0; i < 1024; i++ {
		buffer.WriteVarInt(i * 8)
	}

	for i := 0; i < b.N; i++ {
		if i%1024 == 0 {
			buffer.Offset = 0
		}
		buffer.ReadVarInt()
	}

	bytebufferpool.Put(bb)
}

func TestBufferReadVarInt(t *testing.T) {
	bufferReadVarIntAssert(t, []byte{0}, 0)
	bufferReadVarIntAssert(t, []byte{1}, -1)
	bufferReadVarIntAssert(t, []byte{2}, 1)
	bufferReadVarIntAssert(t, []byte{3}, -2)
	bufferReadVarIntAssert(t, []byte{4}, 2)
	bufferReadVarIntAssert(t, []byte{127}, -64)
	bufferReadVarIntAssert(t, []byte{128}, 0)
	bufferReadVarIntAssert(t, []byte{128, 0}, 0)
	bufferReadVarIntAssert(t, []byte{128, 1}, 64)
	bufferReadVarIntAssert(t, []byte{128, 2}, 128)
	bufferReadVarIntAssert(t, []byte{129, 0}, -1)
	bufferReadVarIntAssert(t, []byte{129, 1}, -65)
	bufferReadVarIntAssert(t, []byte{129, 2}, -129)
	bufferReadVarIntAssert(t, []byte{253, 255, 7}, -65535)
	bufferReadVarIntAssert(t, []byte{254, 255, 7}, 65535)
	bufferReadVarIntAssert(t, []byte{253, 255, 255, 255, 15}, -2147483647)
	bufferReadVarIntAssert(t, []byte{254, 255, 255, 255, 15}, 2147483647)
	bufferReadVarIntAssert(t, []byte{255, 255, 255, 255, 15}, -2147483648)
}

func TestBufferWriteVarInt(t *testing.T) {
	bufferWriteIntAssert(t, 0, []byte{0})
	bufferWriteIntAssert(t, -1, []byte{1})
	bufferWriteIntAssert(t, 1, []byte{2})
	bufferWriteIntAssert(t, -2, []byte{3})
	bufferWriteIntAssert(t, 2, []byte{4})
	bufferWriteIntAssert(t, -64, []byte{127})
	bufferWriteIntAssert(t, 64, []byte{128, 1})
	bufferWriteIntAssert(t, 128, []byte{128, 2})
	bufferWriteIntAssert(t, -129, []byte{129, 2})
	bufferWriteIntAssert(t, -65535, []byte{253, 255, 7})
	bufferWriteIntAssert(t, 65535, []byte{254, 255, 7})
	bufferWriteIntAssert(t, -2147483647, []byte{253, 255, 255, 255, 15})
	bufferWriteIntAssert(t, 2147483647, []byte{254, 255, 255, 255, 15})
	bufferWriteIntAssert(t, -2147483648, []byte{255, 255, 255, 255, 15})
}

func TestBufferWriteVarUint(t *testing.T) {
	// bufferWriteVarUintAssert(t, 0, []byte{})
	bufferWriteVarUintAssert(t, 1, []byte{1})
	bufferWriteVarUintAssert(t, 2, []byte{2})
	bufferWriteVarUintAssert(t, 3, []byte{3})
	bufferWriteVarUintAssert(t, 4, []byte{4})
	bufferWriteVarUintAssert(t, 127, []byte{127})
	bufferWriteVarUintAssert(t, 128, []byte{128, 1})
	bufferWriteVarUintAssert(t, 256, []byte{128, 2})
	bufferWriteVarUintAssert(t, 129, []byte{129, 1})
	bufferWriteVarUintAssert(t, 257, []byte{129, 2})
	bufferWriteVarUintAssert(t, 131069, []byte{253, 255, 7})
	bufferWriteVarUintAssert(t, 131070, []byte{254, 255, 7})
	bufferWriteVarUintAssert(t, 4294967293, []byte{253, 255, 255, 255, 15})
	bufferWriteVarUintAssert(t, 4294967294, []byte{254, 255, 255, 255, 15})
	bufferWriteVarUintAssert(t, 4294967295, []byte{255, 255, 255, 255, 15})
}

func TestBufferReadVarUint(t *testing.T) {

	bufferReadVarUintAssert(t, []byte{0}, 0)
	bufferReadVarUintAssert(t, []byte{1}, 1)
	bufferReadVarUintAssert(t, []byte{2}, 2)
	bufferReadVarUintAssert(t, []byte{3}, 3)
	bufferReadVarUintAssert(t, []byte{4}, 4)
	bufferReadVarUintAssert(t, []byte{127}, 127)
	bufferReadVarUintAssert(t, []byte{128}, 0)
	bufferReadVarUintAssert(t, []byte{128, 0}, 0)
	bufferReadVarUintAssert(t, []byte{128, 1}, 128)
	bufferReadVarUintAssert(t, []byte{128, 2}, 256)
	bufferReadVarUintAssert(t, []byte{129, 0}, 1)
	bufferReadVarUintAssert(t, []byte{129, 1}, 129)
	bufferReadVarUintAssert(t, []byte{129, 2}, 257)
	bufferReadVarUintAssert(t, []byte{253, 255, 7}, 131069)
	bufferReadVarUintAssert(t, []byte{254, 255, 7}, 131070)
	bufferReadVarUintAssert(t, []byte{253, 255, 255, 255, 15}, 4294967293)
	bufferReadVarUintAssert(t, []byte{254, 255, 255, 255, 15}, 4294967294)
	bufferReadVarUintAssert(t, []byte{255, 255, 255, 255, 15}, 4294967295)

}

func TestBufferWrite(t *testing.T) {
	bb := bytebufferpool.Get()

	buffer := buffer.Buffer{
		bb,
		0,
	}

	buffer.WriteUint16(510)
	buffer.WriteVarUint(1)
	buffer.WriteVarUint(129)
	buffer.WriteVarUint(512)

	buffer.Offset = 0
	var valueU16 uint16 = 0
	t.Logf("buffer contents: %v", buffer.Bytes.B)
	valueU16 = buffer.ReadUint16()

	if valueU16 != 510 {
		t.Logf("Expected %d to equal 510 at %d", valueU16, buffer.Offset-2)
		t.FailNow()
	}

	var valueU uint = buffer.ReadVarUint()

	if valueU != 1 {
		t.Logf("Expected %d to equal 1 at %d", valueU, buffer.Offset)
		t.FailNow()
	}

	valueU = buffer.ReadVarUint()

	if valueU != 129 {
		t.Logf("Expected %d to equal 129 at %d", valueU, buffer.Offset)
		t.FailNow()
	}

	valueU = buffer.ReadVarUint()

	if valueU != 512 {
		t.Logf("Expected %d to equal 512 at %d", valueU, buffer.Offset)
		t.FailNow()
	}

	// It is safe to release byte buffer now, since it is
	// no longer used.
	bytebufferpool.Put(bb)
}
