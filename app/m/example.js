import { generateOutput } from "./generate.js";
import { OUTPUT_STYLES, PARAM_KINDS } from "./types.js";

/**
 * Sample function used by **Load example** — covers documentation, two examples,
 * two scalar parameters, and one record parameter with nested fields.
 *
 * @returns {import("./types.js").FunctionCreatorState}
 */
export function createExampleState() {
  return {
    functionName: "FilterSalesByPeriod",
    returnType: "table",
    outputStyle: OUTPUT_STYLES.LET,
    expression: `let
    Rows = {
        [SaleDate = #date(2024, 1, 15), Region = "North", Amount = 120, Active = true],
        [SaleDate = #date(2024, 3, 2), Region = "South", Amount = 80, Active = false],
        [SaleDate = #date(2024, 6, 8), Region = "North", Amount = 45, Active = true]
    },
    Source = Table.FromRecords(Rows),
    Opts = if Options = null then [IncludeInactive = false, MaxRows = null] else Options,
    ByDate = Table.SelectRows(Source, each [SaleDate] >= StartDate),
    ByRegion = Table.SelectRows(ByDate, each [Region] = Region),
    WithInactive = if Opts[IncludeInactive] = true then ByRegion else Table.SelectRows(ByRegion, each [Active] = true),
    Limited = if Opts[MaxRows] = null then WithInactive else Table.FirstN(WithInactive, Opts[MaxRows])
in
    Limited`,
    functionMeta: {
      documentationName: "Filter sales by period",
      longDescription:
        "Returns sales rows on or after StartDate for a chosen Region. Pass an Options record to include inactive rows, cap the result, or add a note shown in the invoke dialog.",
      examples: [
        {
          description: "North region from 2024, active rows only",
          code: `FilterSalesByPeriod(#date(2024, 1, 1), "North", [IncludeInactive = false, MaxRows = 10])`,
          result: `#table({"SaleDate", "Region", "Amount", "Active"}, {{#date(2024, 1, 15), "North", 120, true}})`,
        },
        {
          description: "South region including inactive rows",
          code: `FilterSalesByPeriod(#date(2024, 1, 1), "South", [IncludeInactive = true, MaxRows = null, Note = "QA check"])`,
          result: `#table({"SaleDate", "Region", "Amount", "Active"}, {{#date(2024, 3, 2), "South", 80, false}})`,
        },
      ],
    },
    parameters: [
      {
        name: "StartDate",
        optional: false,
        nullable: false,
        kind: PARAM_KINDS.SCALAR,
        mType: "date",
        meta: {
          fieldCaption: "Start date",
          fieldDescription: "Keep rows whose SaleDate is on or after this value.",
          sampleValues: ["#date(2024, 1, 1)", "#date(2023, 7, 1)"],
        },
        fields: [],
      },
      {
        name: "Region",
        optional: false,
        nullable: false,
        kind: PARAM_KINDS.SCALAR,
        mType: "text",
        meta: {
          fieldCaption: "Region",
          fieldDescription: "Sales region to keep. Shown as a dropdown in the invoke dialog.",
          allowedValues: ["North", "South", "East", "West"],
        },
        fields: [],
      },
      {
        name: "Options",
        optional: true,
        nullable: false,
        kind: PARAM_KINDS.RECORD,
        mType: "record",
        meta: {},
        fields: [
          {
            name: "IncludeInactive",
            optional: true,
            nullable: false,
            mType: "logical",
            meta: {
              fieldCaption: "Include inactive",
              fieldDescription: "When true, rows with Active = false are kept.",
              allowedValues: ["true", "false"],
            },
          },
          {
            name: "MaxRows",
            optional: true,
            nullable: true,
            mType: "number",
            meta: {
              fieldCaption: "Max rows",
              fieldDescription: "Optional cap on returned rows. Leave empty for no limit.",
              sampleValues: ["10", "100"],
            },
          },
          {
            name: "Note",
            optional: true,
            nullable: true,
            mType: "text",
            meta: {
              fieldCaption: "Note",
              fieldDescription: "Free-text comment stored with the call; not used in filtering.",
              isMultiLine: true,
              isCode: false,
            },
          },
        ],
      },
    ],
  };
}

/**
 * Generated M for {@link createExampleState} (same output as the form).
 * @returns {string}
 */
export function exampleFunctionSource() {
  return generateOutput(createExampleState());
}
