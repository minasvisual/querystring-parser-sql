const uniqBy = (arr, predicate) => {
  const cb = typeof predicate === "function" ? predicate : (o) => o[predicate];

  return [
    ...arr
      .reduce((map, item) => {
        const key = item === null || item === undefined ? item : cb(item);

        map.has(key) || map.set(key, item);

        return map;
      }, new Map())
      .values(),
  ];
};

const extractValueType = (value) => {
  if (value == "true") value = true;
  if (value == "false") value = false;
  if (value == "null") value = IsNull();
  if (value && !isNaN(value)) value = Number(value);
  if (Array.isArray(value)) value = value.map((v) => extractValueType(v));

  return value;
};

export const operators = {
  // and: true,
  // or: true,
  // lt: true,
  // lte: true,
  // gt: true,
  // gte: true,
  // ne: true,
  // eq: true,
  // not: true,
  // between: true,
  // notBetween: true,
  // in: true,
  // notIn: true,
  // startsWith: false,
  // endsWith: false,
  // like: true,
  and: (symbolic, value) => ({
    comparisonOp: symbolic ? Symbol.for("and") : "",
    value: String(value)?.split(":"),
  }),
  or: (symbolic, value) => ({
    comparisonOp: symbolic ? Symbol.for("or") : "OR",
    value: String(value)?.split(":"),
  }),
  lt: (symbolic, value) => ({
    comparisonOp: symbolic ? Symbol.for("lt") : "lt",
    value,
  }),
  lte: (symbolic, value) => ({
    comparisonOp: symbolic ? Symbol.for("lte") : "lte",
    value,
  }),
  gt: (symbolic, value) => ({
    comparisonOp: symbolic ? Symbol.for("gt") : "gt",
    value,
  }),
  gte: (symbolic, value) => ({
    comparisonOp: symbolic ? Symbol.for("gte") : "gte",
    value,
  }),
  ne: (symbolic, value) => ({
    comparisonOp: symbolic ? Symbol.for("ne") : "ne",
    value,
  }),
  eq: (symbolic, value) => ({
    comparisonOp: symbolic ? Symbol.for("eq") : "",
    value,
  }),
  not: (symbolic, value) => ({
    comparisonOp: symbolic ? Symbol.for("not") : "not",
    value,
  }),
  between: (symbolic, value) => ({
    comparisonOp: symbolic ? Symbol.for("between") : "between",
    value: String(value)?.split(":"),
  }),
  notBetween: (symbolic, value) => ({
    comparisonOp: symbolic ? Symbol.for("notBetween") : "notBetween",
    value: String(value).split(":"),
  }),
  in: (symbolic, value) => ({
    comparisonOp: symbolic ? Symbol.for("in") : "in",
    value: String(value).split(":"),
  }),
  notIn: (symbolic, value) => ({
    comparisonOp: symbolic ? Symbol.for("notIn") : "notIn",
    value: String(value).split(":"),
  }),
  like: (symbolic, value) => ({
    comparisonOp: symbolic ? Symbol.for("like") : "like",
    value,
  }),
  isNull: (symbolic, value) => ({
    comparisonOp: symbolic ? Symbol.for("isNull") : "",
    value: "isNull",
  }),
};

export class ExtractSort {
  public sorts: any;
  public config: any = {
    format: "object",
    desc: "desc",
    asc: "asc",
  };

  constructor(
    public sort,
    params?: any,
  ) {
    if (!sort || sort == "") return;
    let properties = sort.split(",");
    this.sorts = {};
    if (params) this.mergeParams(params);

    if (properties.length) {
      properties =
        properties.length > 1
          ? uniqBy(properties, (item) => item.replace(/^-/, ""))
          : properties;
      properties.map((property) => this.parseProperty(property));
    }
  }

  parseProperty(property) {
    let prop = property.charAt(0) === "-" ? property.slice(1) : property;
    let sort = property.charAt(0) === "-" ? this.config.desc : this.config.asc;
    this.sorts[prop] = sort;
  }

  parseFormat(format) {
    if (typeof format === "function") return format(this.sorts);
    if (format === "array")
      return Object.keys(this.sorts).map((prop, k) => [prop, this.sorts[prop]]);
    return this.sorts;
  }

  parse() {
    return this.parseFormat(this.config.format);
  }

  mergeParams(params) {
    if (!params || Object.keys(params).length === 0) return;
    Object.keys(params).map((prop) => {
      this.config[prop] = params[prop];
    });
  }
}

export class ExtractLimit {
  public _limit: number;
  public _page: number;
  public _offset: number;
  constructor({ limit, page = 1, offset }: any) {
    this._page = page && parseInt(page, 10);
    this._limit = limit && parseInt(limit);
    this._offset = offset && parseInt(offset);
    this.setPage();
    this.setOffset();
  }
  setPage() {
    if (
      this._page === 0 ||
      this._page === null ||
      this._page === undefined ||
      (typeof this._page === "number" && this._page < 1)
    )
      this._page = 1;
  }
  setOffset() {
    let isValid = this._offset !== NaN;
    this._offset = this._limit
      ? this._limit * (this._page - 1)
      : isValid
        ? this._offset
        : 0;
  }
  parse() {
    return {
      limit: this._limit,
      offset: this._offset,
      page: this._page,
    };
  }
}

export class ExtractWhere {
  public _filters: any = {};
  constructor(
    public filters,
    public operators,
  ) {
    if (!filters || !filters.length > 0) return;
    if (!Array.isArray(filters)) filters = [filters];

    for (let where of filters) {
      let { field, compOp, value } = this.getProps(where);
      let joiner = this.getJoiner(field);
      if (joiner && Array.isArray(joiner.value)) {
        this._filters[joiner.comparisonOp] = joiner.value?.map((e) => ({
          [e]: this.getFilter(compOp, value),
        }));
        continue;
      }
      if (joiner && !Array.isArray(joiner.value)) {
        this._filters[joiner.comparisonOp] = {
          [joiner.value]: this.getFilter(compOp, value),
        };
        continue;
      }
      this._filters[field] = this.getFilter(compOp, value);
    }
  }
  getProps(where) {
    let hasOp = where.includes(",");
    if (!hasOp) return [where];
    let [field, compOp, value] = where.split(",");
    return { field, compOp, value };
  }
  getJoiner(field) {
    if (field && field.includes(":")) return operators["or"](null, field);
    if (field && field.includes(".")) {
      let [field1, field2] = field.split(".");
      return { comparisonOp: field1, value: field2 };
    }
    return false;
  }

  getFilter(op, value) {
    let result = this.operators[op](null, value);
    if (!result.comparisonOp || result.comparisonOp == "")
      return extractValueType(result.value);
    if (typeof result.comparisonOp === "function")
      return result.comparisonOp(extractValueType(result.value));
    if (typeof result.comparisonOp === "string")
      return { [result.comparisonOp]: extractValueType(result.value) };
    return extractValueType(result.value);
  }
  parse() {
    return this._filters;
  }
}

export class ExtractFields {
  public _fields: any[] = [];
  public _config = {
    format: "object",
  };
  constructor(fields) {
    if (!fields) return;
    if (typeof fields == "string") this._fields = fields.split(",");
    if (Array.isArray(fields)) this._fields = fields;
  }
  toParse(type) {
    if (type == "object")
      return this._fields.reduce((acc, i) => ({ ...acc, [i]: true }), {});
    return this._fields;
  }
  parse(format?) {
    return this.toParse(format || this._config.format);
  }
}

export class ExtractRelations {
  public _relations: any = {};
  public _config = {
    format: "object",
  };
  constructor(includes) {
    if (!includes) return;
    if (typeof includes === "string") includes = [includes];
    for (let inc of includes) {
      let { association, fields, filters, limit, order } =
        this.getAttributes(inc);
      this._relations[association] = {};
      if (fields)
        this._relations[association].fields = new ExtractFields(fields);
      if (filters)
        this._relations[association].filters = new ExtractWhere(
          filters,
          operators,
        );
      if (limit)
        this._relations[association].limit = new ExtractLimit({
          limit,
        });
      if (order) this._relations[association].order = new ExtractSort(order);
    }
  }
  getAttributes(include) {
    if (typeof include !== "string" || !include.includes(":"))
      return { association: include };
    let [association, fields, filters, limit, order] = include.split(":");
    return {
      association,
      fields,
      filters,
      limit,
      order,
    };
  }
  getDto(format, association, values) {
    let { fields, filters, limit, order } = values;
    return {
      include: association,
      fields: fields && fields.parse(format),
      filters: filters && filters.parse(format),
      order: order && order.parse(format),
      ...((limit && limit.parse(format)) ?? {}),
    };
  }
  toParse(format) {
    if (format === "boolean")
      return Object.keys(this._relations).reduce(
        (acc, i) => ({
          ...acc,
          [i]: true,
        }),
        {},
      );
    if (format === "object")
      return Object.keys(this._relations).reduce(
        (acc, i) => ({
          ...acc,
          [i]: this.getDto(format, i, this._relations[i]),
        }),
        {},
      );
    if (format === "array")
      return Object.keys(this._relations).reduce(
        (acc, i): any => [...acc, this.getDto(format, i, this._relations[i])],
        [],
      );
    if (typeof format === "function") return format(this._relations);
    return this._relations;
  }
  parse(format) {
    return this.toParse(format || this._config.format);
  }
}

export class QueryParser {
  private _sort: string;
  private _limit: any;
  private _where: any;
  private _fields: any;
  private _relations: any;
  private _group: any;

  constructor(public schema: any = {}) {
    schema.format = schema.format || "sql";
    schema.operators = schema.operators || operators;
  }

  boot(query) {
    const { filter, group, offset, limit, page, fields, include, sort } = query;
    this._sort = sort && new ExtractSort(sort);
    this._limit = limit && new ExtractLimit({ limit, page, offset });
    this._where = filter && new ExtractWhere(filter, this.schema.operators);
    this._fields = fields && new ExtractFields(fields);
    this._relations = include && new ExtractRelations(include);
    this._group = group;
  }

  parse_sql() {
    let limits = (this._limit && this._limit.parse()) ?? {};
    return {
      order: this._sort && this._sort.parse(),
      where: this._where && this._where.parse(),
      select: this._fields && this._fields.parse(),
      join: this._relations && this._relations.parse(),
      group: this._group,
      limit: limits.limit,
      offset: limits.offset,
    };
  }

  parse(query: string) {
    if (!query) return {};
    this.boot(query);

    return this[`parse_${this.schema.format}`]();
  }
}

export class QueryParserSequelize extends QueryParser {
  constructor(sequelizeOperators) {
    const Op = sequelizeOperators ?? {};
    super({
      format: "sequelize",
      operators: {
        ...operators,
        or: (symbolic, value) => ({
          comparisonOp: symbolic ? Symbol.for("or") : Op.or,
          value: String(value)?.split(":"),
        }),
        lt: (symbolic, value) => ({
          comparisonOp: symbolic ? Symbol.for("lt") : Op.lt,
          value,
        }),
        lte: (symbolic, value) => ({
          comparisonOp: symbolic ? Symbol.for("lte") : Op.lte,
          value,
        }),
        gt: (symbolic, value) => ({
          comparisonOp: symbolic ? Symbol.for("gt") : Op.gt,
          value,
        }),
        gte: (symbolic, value) => ({
          comparisonOp: symbolic ? Symbol.for("gte") : Op.gte,
          value,
        }),
        ne: (symbolic, value) => ({
          comparisonOp: symbolic ? Symbol.for("ne") : Op.ne,
          value,
        }),
        eq: (symbolic, value) => ({
          comparisonOp: symbolic ? Symbol.for("eq") : "",
          value,
        }),
        not: (symbolic, value) => ({
          comparisonOp: symbolic ? Symbol.for("not") : Op.not,
          value,
        }),
        between: (symbolic, value) => ({
          comparisonOp: symbolic ? Symbol.for("between") : Op.between,
          value: String(value)?.split(":"),
        }),
        notBetween: (symbolic, value) => ({
          comparisonOp: symbolic ? Symbol.for("notBetween") : Op.notBetween,
          value: String(value).split(":"),
        }),
        in: (symbolic, value) => ({
          comparisonOp: symbolic ? Symbol.for("in") : Op.in,
          value: String(value).split(":"),
        }),
        notIn: (symbolic, value) => ({
          comparisonOp: symbolic ? Symbol.for("notIn") : Op.notIn,
          value: String(value).split(":"),
        }),
        like: (symbolic, value) => ({
          comparisonOp: symbolic ? Symbol.for("like") : Op.like,
          value,
        }),
        isNull: (symbolic, value) => ({
          comparisonOp: symbolic ? Symbol.for("isNull") : Op.is,
          value: null,
        }),
      },
    });
  }

  parseRelation(rls) {
    return Object.keys(rls).map((k) => {
      let { fields, filters, order, limit: limits } = rls[k];
      let { limit, offset } = (limits && limits.parse()) ?? {};
      return {
        association: k,
        attributes: fields && fields.parse("array"),
        where: filters && filters.parse("object"),
        order: order && order.parse("object"),
        limit,
        offset,
      };
    });
  }

  parse(query) {
    if (!query) return {};
    this.boot(query);

    let limits = (this._limit && this._limit.parse()) ?? {};
    let relations =
      this._relations && this._relations.parse(this.parseRelation);
    return {
      order: this._sort && this._sort.parse(),
      where: this._where && this._where.parse(),
      attributes: this._fields && this._fields.parse("array"),
      includes: relations,
      group: this._group,
      limit: limits.limit,
      offset: limits.offset,
    };
  }
}

export class QueryParserPrisma extends QueryParser {
  constructor(sequelizeOperators) {
    const Op = sequelizeOperators;
    super({
      format: "sequelize",
      operators,
    });
  }

  parseRelation(rls, dto) {
    return Object.keys(rls).reduce((acc, i) => {
      let { fields, filters, order, limit: limits } = rls[i];
      let { limit, offset } = (limits && limits.parse()) ?? {};

      if (fields && dto.select) {
        dto.select[i] = {
          select: fields && fields.parse("object"),
          where: (filters && filters.parse("object")) ?? true,
          orderBy: order && order.parse(),
        };
        return undefined;
      }
      return {
        ...acc,
        [i]: (filters && { where: filters.parse("object") }) ?? true,
      };
    }, {});
  }

  parse(query) {
    if (!query) return {};
    this.boot(query);

    let limits = (this._limit && this._limit.parse()) ?? {};
    let dto = {
      where: this._where && this._where.parse(),
      select: this._fields && this._fields.parse("object"),
      orderBy: this._sort && this._sort.parse(),
      group: this._group,
      take: limits.limit,
      skip: limits.offset,
    };
    let relations =
      this._relations &&
      this._relations.parse((rls) => this.parseRelation(rls, dto));

    return {
      ...dto,
      include: relations,
    };
  }
}

export class QueryParserTypeorm extends QueryParser {
  constructor(typeOrmOperations) {
    const Op = typeOrmOperations ?? {};
    super({
      format: "sequelize",
      operators: {
        ...operators,
        or: (symbolic, value) => ({
          comparisonOp: symbolic ? Symbol.for("or") : "",
          value: String(value)?.split(":"),
        }),
        lt: (symbolic, value) => ({
          comparisonOp: symbolic ? Symbol.for("lte") : Op.Lessthan,
          value,
        }),
        lte: (symbolic, value) => ({
          comparisonOp: symbolic ? Symbol.for("lte") : Op.LessThanOrEqual,
          value,
        }),
        gt: (symbolic, value) => ({
          comparisonOp: symbolic ? Symbol.for("gt") : Op.MoreThan,
          value,
        }),
        gte: (symbolic, value) => ({
          comparisonOp: symbolic ? Symbol.for("gte") : Op.MoreThanOrEqual,
          value,
        }),
        ne: (symbolic, value) => ({
          comparisonOp: symbolic
            ? Symbol.for("ne")
            : (v) => Op.Not(Op.Equal(v)),
          value,
        }),
        not: (symbolic, value) => ({
          comparisonOp: symbolic ? Symbol.for("not") : Op.Not,
          value,
        }),
        between: (symbolic, value) => ({
          comparisonOp: symbolic
            ? Symbol.for("between")
            : (v) => Op.Between(...v),
          value: String(value)?.split(":"),
        }),
        notBetween: (symbolic, value) => ({
          comparisonOp: symbolic
            ? Symbol.for("notBetween")
            : (v) => Op.Not(Op.Between(...v)),
          value: String(value).split(":"),
        }),
        in: (symbolic, value) => ({
          comparisonOp: symbolic ? Symbol.for("in") : (v) => Op.In(v),
          value: String(value).split(":"),
        }),
        notIn: (symbolic, value) => ({
          comparisonOp: symbolic
            ? Symbol.for("notIn")
            : (v) => Op.Not(Op.In(v)),
          value: String(value).split(":"),
        }),
        like: (symbolic, value) => ({
          comparisonOp: symbolic ? Symbol.for("like") : Op.Like,
          value,
        }),
        isNull: (symbolic, value) => ({
          comparisonOp: symbolic ? Symbol.for("isNull") : (v) => Op.IsNull(),
          value: null,
        }),
      },
    });
  }

  parseRelation(rls, dto) {
    return Object.keys(rls).reduce((acc, i) => {
      let { fields, filters, order, limit: limits } = rls[i];
      let { limit, offset } = (limits && limits.parse()) ?? {};

      if (fields) {
        if (!dto.select) dto.select = {};
        dto.select[i] = fields && fields.parse("object");
      }
      if (filters) {
        if (!dto.where) dto.where = {};
        dto.where[i] = filters && filters.parse("object");
      }
      return {
        ...acc,
        [i]: true,
      };
    }, {});
  }

  parse(query) {
    if (!query) return {};
    this.boot(query);

    let limits = (this._limit && this._limit.parse()) ?? {};
    let dto = {
      where: this._where && this._where.parse(),
      select: this._fields && this._fields.parse("object"),
      order: this._sort && this._sort.parse(),
      group: this._group,
      take: limits.limit,
      skip: limits.offset,
    };
    let relations =
      this._relations &&
      this._relations.parse((rls) => this.parseRelation(rls, dto));
    return {
      ...dto,
      relations,
    };
  }
}
