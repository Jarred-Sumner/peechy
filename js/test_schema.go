package TestSchema

import (
	"bytes"
	"encoding/json"
	"errors"

	"github.com/jarred-sumner/peechy/buffer"
)

type Region uint

const (
	RegionCalifornia   Region = 1
	RegionSanFrancisco Region = 2
	RegionSunshine     Region = 3
)

var RegionToString = map[Region]string{
	RegionCalifornia:   "RegionCalifornia",
	RegionSanFrancisco: "RegionSanFrancisco",
	RegionSunshine:     "RegionSunshine",
}

var RegionToID = map[string]Region{
	"RegionCalifornia":   RegionCalifornia,
	"RegionSanFrancisco": RegionSanFrancisco,
	"RegionSunshine":     RegionSunshine,
}

// MarshalJSON marshals the enum as a quoted json string
func (s Region) MarshalJSON() ([]byte, error) {
	buffer := bytes.NewBufferString(`"`)
	buffer.WriteString(RegionToString[s])
	buffer.WriteString(`"`)
	return buffer.Bytes(), nil
}

// UnmarshalJSON unmashals a quoted json string to the enum value
func (s *Region) UnmarshalJSON(b []byte) error {
	var j string
	err := json.Unmarshal(b, &j)
	if err != nil {
		return err
	}
	// Note that if the string cannot be found then it will be set to the zero value, 'Created' in this case.
	*s = RegionToID[j]
	return nil
}

type Face struct {
	EyeCount uint    `json:"eyeCount"`
	Radius   float32 `json:"radius"`
	What     bool    `json:"what"`
}

func DecodeFace(buf *buffer.Buffer) (*Face, error) {
	result := Face{}

	result.EyeCount = buf.ReadVarUint()
	result.Radius = buf.ReadFloat32()
	result.What = buf.ReadBool()
	return &result, nil
}

func (i *Face) Encode(buf *buffer.Buffer) error {

	buf.WriteVarUint(i.EyeCount)

	buf.WriteFloat32(i.Radius)

	buf.WriteBool(i.What)
	return nil
}

type Hello struct {
	Hour    *uint     `json:"hour"`
	Name    *string   `json:"name"`
	Region  *Region   `json:"region"`
	Face    []*Face   `json:"face"`
	Names   []*string `json:"names"`
	Seconds *uint32   `json:"seconds"`
}

func DecodeHello(buf *buffer.Buffer) (*Hello, error) {
	result := Hello{}

	for {
		switch fieldType := buf.ReadVarUint(); fieldType {
		case 0:
			return &result, nil

		case 1:
			hour_0 := buf.ReadVarUint()
			result.Hour = &hour_0

		case 2:
			name_1 := buf.ReadString()
			result.Name = &name_1

		case 3:
			region_2 := Region(buf.ReadVarUint())
			result.Region = &region_2

		case 4:
			length := buf.ReadVarUint()
			result.Face = make([]*Face, length)
			var err error
			var val *Face
			for j := uint(0); j < length; j++ {

				val, err = DecodeFace(buf)
				if err != nil {
					return nil, err
				}
				result.Face[j] = val
			}

		case 5:
			length := buf.ReadVarUint()
			result.Names = make([]*string, length)
			var names_4 string
			for j := uint(0); j < length; j++ {
				names_4 = buf.ReadString()
				result.Names[j] = &names_4
			}

		case 6:
			seconds_5 := buf.ReadUint32()
			result.Seconds = &seconds_5

		default:
			return nil, errors.New("Attempted to parse invalid message")
		}
	}
}

func (i *Hello) Encode(buf *buffer.Buffer) error {

	if i.Hour != nil {
		buf.WriteVarUint(1)
		buf.WriteVarUint(*i.Hour)
	}

	if i.Name != nil {
		buf.WriteVarUint(2)
		buf.WriteString(*i.Name)
	}

	if i.Region != nil {
		buf.WriteVarUint(3)
		buf.WriteVarUint(uint(*i.Region))
	}

	if i.Face != nil {
		buf.WriteVarUint(4)
		n := uint(len(i.Face))
		buf.WriteVarUint(n)
		for j := uint(0); j < n; j++ {
			err := i.Face[j].Encode(buf)
			if err != nil {
				return err
			}

		}
	}

	if i.Names != nil {
		buf.WriteVarUint(5)
		n := uint(len(i.Names))
		buf.WriteVarUint(n)
		for j := uint(0); j < n; j++ {
			buf.WriteString(*i.Names[j])
		}
	}

	if i.Seconds != nil {
		buf.WriteVarUint(6)
		buf.WriteUint32(*i.Seconds)
	}
	buf.WriteVarUint(0)
	return nil
}
