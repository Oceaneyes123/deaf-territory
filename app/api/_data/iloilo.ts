export type MunicipalityType = "City" | "Municipality";

export type Municipality = {
  psgcCode: string;
  name: string;
  type: MunicipalityType;
};

export type Position = [number, number];

export type PolygonGeometry = {
  type: "Polygon";
  coordinates: Position[][];
};

export type Barangay = {
  psgcCode: string;
  municipalityPsgcCode: string;
  municipalityName: string;
  name: string;
  geometry: PolygonGeometry;
};

export const ILOILO_MUNICIPALITIES: Municipality[] = [
  { psgcCode: "063022000", name: "Iloilo City", type: "City" },
  { psgcCode: "063030000", name: "Oton", type: "Municipality" },
  { psgcCode: "063031000", name: "Pavia", type: "Municipality" },
  { psgcCode: "063019000", name: "Leganes", type: "Municipality" },
  { psgcCode: "063037000", name: "Santa Barbara", type: "Municipality" },
  { psgcCode: "063032000", name: "Pototan", type: "Municipality" },
  { psgcCode: "063036000", name: "San Miguel", type: "Municipality" },
  { psgcCode: "063039000", name: "Tubungan", type: "Municipality" },
];

export const ILOILO_BARANGAYS: Barangay[] = [
  {
    psgcCode: "0630220010",
    municipalityPsgcCode: "063022000",
    municipalityName: "Iloilo City",
    name: "Tanza-Esperanza",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [122.5612, 10.7038],
          [122.5641, 10.7038],
          [122.5642, 10.7065],
          [122.5615, 10.7067],
          [122.5612, 10.7038],
        ],
      ],
    },
  },
  {
    psgcCode: "0630220020",
    municipalityPsgcCode: "063022000",
    municipalityName: "Iloilo City",
    name: "Calumpang",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [122.5561, 10.6951],
          [122.5593, 10.6951],
          [122.5595, 10.6972],
          [122.5563, 10.6973],
          [122.5561, 10.6951],
        ],
      ],
    },
  },
  {
    psgcCode: "0630300010",
    municipalityPsgcCode: "063030000",
    municipalityName: "Oton",
    name: "Poblacion South",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [122.4738, 10.6941],
          [122.4776, 10.6941],
          [122.4779, 10.6968],
          [122.4741, 10.6968],
          [122.4738, 10.6941],
        ],
      ],
    },
  },
  {
    psgcCode: "0630310010",
    municipalityPsgcCode: "063031000",
    municipalityName: "Pavia",
    name: "Poblacion",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [122.5466, 10.7768],
          [122.5497, 10.7768],
          [122.5498, 10.7796],
          [122.5468, 10.7798],
          [122.5466, 10.7768],
        ],
      ],
    },
  },
  {
    psgcCode: "0630190010",
    municipalityPsgcCode: "063019000",
    municipalityName: "Leganes",
    name: "M.V. Hechanova",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [122.586, 10.7858],
          [122.5885, 10.7859],
          [122.5888, 10.788],
          [122.5862, 10.7881],
          [122.586, 10.7858],
        ],
      ],
    },
  },
  {
    psgcCode: "0630370010",
    municipalityPsgcCode: "063037000",
    municipalityName: "Santa Barbara",
    name: "Poblacion",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [122.5241, 10.8232],
          [122.5278, 10.8232],
          [122.528, 10.8261],
          [122.5244, 10.8262],
          [122.5241, 10.8232],
        ],
      ],
    },
  },
  {
    psgcCode: "0630320010",
    municipalityPsgcCode: "063032000",
    municipalityName: "Pototan",
    name: "Amamaros",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [122.6264, 10.9434],
          [122.6295, 10.9434],
          [122.6298, 10.9459],
          [122.6268, 10.9461],
          [122.6264, 10.9434],
        ],
      ],
    },
  },
  {
    psgcCode: "0630360010",
    municipalityPsgcCode: "063036000",
    municipalityName: "San Miguel",
    name: "Igtambo",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [122.5729, 10.779],
          [122.5759, 10.779],
          [122.5761, 10.7814],
          [122.5731, 10.7816],
          [122.5729, 10.779],
        ],
      ],
    },
  },
  {
    psgcCode: "0630390010",
    municipalityPsgcCode: "063039000",
    municipalityName: "Tubungan",
    name: "Bagunanay",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [122.3261, 10.7898],
          [122.3294, 10.7898],
          [122.3297, 10.7918],
          [122.3264, 10.792],
          [122.3261, 10.7898],
        ],
      ],
    },
  },
];
