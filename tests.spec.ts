import { describe, it, expect } from "vitest";
import {
  ExtractFields,
  ExtractLimit,
  ExtractRelations,
  ExtractSort,
  ExtractWhere,
  QueryParser,
  QueryParserPrisma,
  QueryParserSequelize,
  QueryParserTypeorm,
  operators,
} from "./index"; 

describe("sort", () => {
  it("Should test asc ", () => {
    const sut = new ExtractSort("price");

    expect(sut.parse()).toEqual({ price: "asc" });
  });
  it("Should test desc ", () => {
    const sut = new ExtractSort("-price");

    expect(sut.parse()).toEqual({ price: "desc" });
  });
  it.each([
    ["", undefined],
    ["price,-id", { price: "asc", id: "desc" }],
  ])("Should test multiple", (input, output) => {
    const sut = new ExtractSort(input);
 
    expect(sut.parse()).toEqual(output);
  });
  it("Should test output array ", () => {
    const sut = new ExtractSort("-price", { format: "array" });

    expect(sut.config.format).toEqual("array");
    expect(sut.parse()).toEqual([["price", "desc"]]);
  });
  it("Should test output custom ", () => {
    const customarray = (sorts) => Object.keys(sorts);
    const sut = new ExtractSort("-price", { format: customarray });

    expect(sut.config.format).toEqual(customarray);
    expect(sut.parse()).toEqual(["price"]);
  });
});

describe("limit", () => {
  it("Should test limit", () => {
    const sut = new ExtractLimit({ limit: 12 });

    expect(sut.parse()).toEqual({ limit: 12, page: 1, offset: 0 });
  });
  it("Should test page", () => {
    const sut = new ExtractLimit({ limit: 12, page: 2 });

    expect(sut.parse()).toEqual({ limit: 12, page: 2, offset: 12 });
  });

  it.each([
    [
      { limit: 6, page: 1 },
      { limit: 6, page: 1, offset: 0 },
    ],
    [
      { limit: 6, page: 2 },
      { limit: 6, page: 2, offset: 6 },
    ],
    [
      { limit: 6, page: 3 },
      { limit: 6, page: 3, offset: 12 },
    ],
  ])("Should test offset", (input, output) => {
    const sut = new ExtractLimit(input);

    expect(sut.parse()).toEqual(output);
  });
});

describe("where", () => {
  it("Should test simple where", () => {
    const sut = new ExtractWhere("id,eq,1", operators);

    expect(sut.parse()).toEqual({ id: 1 });
  });
  it("Should test simple gt", () => {
    const sut = new ExtractWhere("id,gt,1", operators);

    expect(sut.parse()).toEqual({ id: { gt: 1 } });
  });
  it("Should test in", () => {
    const sut = new ExtractWhere("id,in,1:2", operators);

    expect(sut.parse()).toEqual({ id: { in: [1, 2] } });
  });
  it("Should test or", () => {
    const sut = new ExtractWhere("id:id2,eq,1", operators);

    expect(sut.parse()).toEqual({ OR: [{ id: 1 }, { id2: 1 }] });
  });
  it("Should test subquery", () => {
    const sut = new ExtractWhere("user.id,eq,1", operators);

    expect(sut.parse()).toEqual({ user: { id: 1 } });
  });
  it("Should test functions operators", () => {
    const sut = new ExtractWhere("id,in,1:2:3", {
      in: (symbolic, value) => {
        return {
          comparisonOp: (v) => JSON.stringify(v),
          value: String(value).split(":"),
        };
      },
    });

    expect(sut.parse()).toEqual({ id: "[1,2,3]" });
  });
  it("Should test array", () => {
    const sut = new ExtractWhere(
      [
        "id,eq,1",
        "id2,and,1:2",
        "id3,lt,3",
        "id4,gt,3",
        "id5,ne,3",
        "id6,not,3",
        "id7,between,3:4",
        "id8,in,3:4",
        "id10,like,%3%",
        "id11,isNull",
      ],
      operators,
    );

    expect(sut.parse()).toEqual({
      id: 1,
      id2: [1, 2],
      id3: { lt: 3 },
      id4: { gt: 3 },
      id5: { ne: 3 },
      id6: { not: 3 },
      id7: { between: [3, 4] },
      id8: { in: [3, 4] },
      id10: { like: "%3%" },
      id11: "isNull",
    });
  });
});

describe("fields", () => {
  it("Should simples object", () => {
    const sut = new ExtractFields("id,name,age");

    expect(sut.parse()).toEqual({ id: true, name: true, age: true });
  });
  it("Should simples array", () => {
    const sut = new ExtractFields("id,name,age");

    expect(sut.parse("array")).toEqual(["id", "name", "age"]);
  });
});

describe("relation", () => {
  it("Should simples boolean", () => {
    const sut = new ExtractRelations("users");

    expect(sut.parse("boolean")).toEqual({ users: true });
  });
  it("Should simples array", () => {
    const sut = new ExtractRelations("users");

    expect(sut.parse("array")).toEqual([{ include: "users" }]);
  });
  it("Should simples object", () => {
    const sut = new ExtractRelations("users:id,name:id,eq,1:12:-id");

    expect(sut.parse("object")).toEqual({
      users: {
        include: "users",
        fields: {
          id: true,
          name: true,
        },
        filters: {
          id: 1,
        },
        order: {
          id: "desc",
        },
        limit: 12,
        offset: 0,
        page: 1,
      },
    });
  });
  it("Should simples struct object", () => {
    const sut = new ExtractRelations("users:id,name:id,eq,1:12:-id");

    expect(sut.parse("struct")).toEqual({
      users: {
        fields: expect.any(ExtractFields),
        filters: expect.any(ExtractWhere),
        limit: expect.any(ExtractLimit),
        order: expect.any(ExtractSort),
      },
    });
  });
  it("Should custom parser", () => {
    const sut = new ExtractRelations("users:id,name:id,eq,1:12:-id");
    const parser = (includes) =>
      Object.keys(includes).map((inc) => ({
        association: inc,
        attributes: includes[inc].fields.parse("array"),
        where: includes[inc].filters.parse("object"),
      }));

    expect(sut.parse(parser)).toEqual([
      {
        association: "users",
        attributes: ["id", "name"],
        where: { id: 1 },
      },
    ]);
  });
});

describe("querparser", () => {
  it("shold simple query", () => {
    const query = {
      fields: "id,name,age",
      filter: ["id:name,eq,1"],
      limit: 6,
      sort: "-id",
    };
    const sut = new QueryParser();

    expect(sut.parse(query)).toEqual({
      select: { id: true, name: true, age: true },
      where: { OR: [{ id: 1 }, { name: 1 }] },
      limit: 6,
      order: { id: "desc" },
      offset: 0,
    });
  });
  it("shold parse sequelize", () => {
    const query = {
      fields: "id,name,age",
      filter: ["id:name,gt,1"],
      limit: 6,
      sort: "-id",
      include: ["users:id,name:id,eq,1:12:-id", "log"],
    };
    const sut = new QueryParserSequelize({ gt:'$gt' });

    expect(sut.parse(query)).toEqual({
      attributes: ["id", "name", "age"],
      where: { OR: [{ id: { '$gt':1 } }, { name: {'$gt':1} }] },
      limit: 6,
      order: { id: "desc" },
      offset: 0,
      includes: [
        {
          association: "users",
          attributes: ["id", "name"],
          where: { id: 1 },
          limit: 12,
          offset: 0,
          order: { id: "desc" },
        },
        {
          association: "log",
        },
      ],
    });
  });
  it("shold parse prisma", () => {
    const query = {
      filter: ["id:name,eq,1"],
      limit: 6,
      sort: "-id",
      include: ["users:id,name:id,eq,1:12:-id", "log"],
    };
    const sut = new QueryParserPrisma({});

    expect(sut.parse(query)).toEqual({
      where: { OR: [{ id: 1 }, { name: 1 }] },
      take: 6,
      orderBy: { id: "desc" },
      skip: 0,
      include: {
        users: {
          where: { id: 1 },
        },
        log: true,
      },
    });
  });
  it("shold parse prisma sub selects", () => {
    const query = {
      fields: "id,name,age",
      filter: ["id:name,eq,1"],
      limit: 6,
      sort: "-id",
      include: ["users:id,name:id,eq,1:12:-id", "log"],
    };
    const sut = new QueryParserPrisma({ });

    expect(sut.parse(query)).toEqual({
      select: {
        id: true,
        name: true,
        age: true,
        users: {
          select: {
            id: true,
            name: true,
          },
          where: { id: 1 },
          orderBy: { id: "desc" },
        },
      },
      where: { OR: [{ id: 1 }, { name: 1 }] },
      take: 6,
      orderBy: { id: "desc" },
      skip: 0,
      include: {
        log: true,
      },
    });
  });
  it("shold parse typeorm", () => {
    const query = {
      filter: ["id:name,eq,1", 'date,gt,2000'],
      limit: 6,
      sort: "-id",
      include: ["users:id,name:id,eq,1:12:-id", "log"],
    };
    const sut = new QueryParserTypeorm({ MoreThan:(v) => [v, v] });

    expect(sut.parse(query)).toEqual({
      select: {
        users: {
          id: true,
          name: true,
        },
      },
      where: {
        OR: [{ id: 1 }, { name: 1 }],
        date:[2000,2000],
        users: {
          id: 1
        },
      },
      take: 6,
      order: { id: "desc" },
      skip: 0,
      relations: {
        users: true,
        log: true,
      },
    });
  });
});
