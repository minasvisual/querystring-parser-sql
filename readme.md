# Queryparser SQL 
Make to manage queryString options to rest apis. Perfect to dynamic pages and complex grid filters.

--------------------------------------------------------

# API QUERY

- Where:   
    Field and value single:           ?filter=FIELD,OPERATION,VALUE
    Single field and array values:    ?filter=FIELD,OPERATION,VALUE:VALUE:VALUE 
    Single value and multiple fields: ?filter=FIELD:FIELD2,OPERATION,VALUE  (or:[{FIELD:VALUE},{FIELD2:VALUE}])
- limit:   ?limit=9
- offset:  ?limit=10&offset=10
- page:    ?limit=10&page=10 (set automatically the offset)
- sort:    ?sort=-price or ?sort=price or ?sort=MODELNAME.-price (sort include)
- group:   ?group=FIELD
- select:  ?attributes=FIELD,FIELD,FIELD
- include: 
  - ?include=MODELNAME 
  - ?include=MODELNAME:SELECT:WHERE:LIMIT:SORT
  - ?include=MODEL&include=MODEL2


### Available operations/ examples 
- and:        ?filter=tags,and,web:mobile
- or:         ?filter=tags,or,web:mobile
- lt:         ?filter=createdAt,lt,2020-04-01
- lte:        ?filter=createdAt,lte,2020-04-01
- gt:         ?filter=createdAt,gt,2020-04-01
- gte:        ?filter=createdAt,gte,2020-04-01
- ne:(not eq) ?filter=id,ne,333
- eq:(equals) ?filter=id,eq,333
- not:        ?filter=status,not,true
- between:    ?filter=id,between.1:10
- notBetween: ?filter=id,notBetween,1:10
- in:         ?filter=id,in,1:2:3
- notIn:      ?filter=id,notIn,1:2:3
- like:       ?filter=url,like,%users%

## Implementation

```
import { QueryParser } from 'queryparser-sql'
 
let queryparams = {
  fields: "id,name,age",
  filter: ["id:name,eq,1"],
  limit: 6,
  sort: "-id",
} 
const QS = new QueryParse()
const { where, select, join, group, limit, offset } = QS.parse(queryparams)
/* results { 
   select: { id: true, name: true, age: true },
    where: { OR: [{ id: 1 }, { name: 1 }] },
    limit: 6,
    order: { id: "desc" },
    offset: 0, 
}*/
```