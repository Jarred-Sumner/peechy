package TestSchema

import (
	"bytes"
	"encoding/json"
	"errors"

	"github.com/jarred-sumner/peechy"
)

type Region uint

const (
	RegionCalifornia   Region = 1
	RegionSanFrancisco        = 2
	RegionSunshine            = 3
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

func DecodeFace(buffer *peechy.Buffer) (*Face, error) {
	result := Face{}

	result.EyeCount = buffer.ReadVarUint()
	result.Radius = buffer.ReadFloat32()
	result.What = buffer.ReadBool()
	return &result, nil
}

func (i *Face) Encode(buffer *peechy.Buffer) error {

	buffer.WriteVarUint(i.EyeCount)

	buffer.WriteFloat32(i.Radius)

	buffer.WriteBool(i.What)
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

func DecodeHello(buffer *peechy.Buffer) (*Hello, error) {
	result := Hello{}

	for {
		switch fieldType := buffer.ReadVarUint(); fieldType {
		case 0:
			return &result, nil

		case 1:
			result.Hour = buffer.ReadVarUint()

		case 2:
			result.Name = buffer.ReadString()

		case 3:
			result.Region = Region(buffer.ReadVarUint())

		case 4:
			length := buffer.ReadVarUint()
			result.Face = make([]*Face, length)
			var err error
			for j := 0; j < length; j++ {
				result.Face[j], err = DecodeFace(buffer)
				if err != nil {
					return nil, err
				}
			}

		case 5:
			length := buffer.ReadVarUint()
			result.Names = make([]*string, length)
			for j := 0; j < length; j++ {
				result.Names[j] = buffer.ReadString()
			}

		case 6:
			result.Seconds = buffer.ReadUint32()

		default:
			return nil, errors.New("Attempted to parse invalid message")
		}
	}
}

func (i *Hello) Encode(buffer *peechy.Buffer) error {

	var err error
	if i.Hour != nil {
		buffer.WriteVarUint(1)
		buffer.WriteVarUint(i.Hour)
	}

	if i.Name != nil {
		buffer.WriteVarUint(2)
		buffer.WriteString(i.Name)
	}

	if i.Region != nil {
		buffer.WriteVarUint(3)
		err = buffer.WriteVarUint(Region)
		if err != nil {
			return err
		}

	}

	if i.Face != nil {
		buffer.WriteVarUint(4)
		n := len(i.Face)
		buffer.WriteVarUint(n)
		for j := 0; j < n; j++ {
			err := i.Face[j].Encode(buffer)
			if err != nil {
				return err
			}

		}
	}

	if i.Names != nil {
		buffer.WriteVarUint(5)
		n := len(i.Names)
		buffer.WriteVarUint(n)
		for j := 0; j < n; j++ {
			err := buffer.WriteString(i.Names[j])
			if err != nil {
				return err
			}

		}
	}

	if i.Seconds != nil {
		buffer.WriteVarUint(6)
		buffer.WriteUint32(i.Seconds)
	}
	buffer.WriteVarUint(0)
	return nil
}
