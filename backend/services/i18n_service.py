import logging
import json
from datetime import datetime
from typing import Dict, List, Optional, Any
from collections import defaultdict

from sqlalchemy.orm import Session

from models import LanguageResource, TermDictionary
from schemas.i18n import SUPPORTED_LANGUAGES, DEFAULT_NAMESPACES

logger = logging.getLogger(__name__)

_i18n_cache: Dict[str, Dict[str, Dict[str, str]]] = defaultdict(lambda: defaultdict(dict))
_cache_version: str = datetime.utcnow().isoformat()
_term_dictionary: Dict[str, Dict[str, Any]] = {}

SEED_DATA = [
    {"language": "zh-CN", "namespace": "common", "key": "common.save", "value": "保存"},
    {"language": "zh-CN", "namespace": "common", "key": "common.cancel", "value": "取消"},
    {"language": "zh-CN", "namespace": "common", "key": "common.confirm", "value": "确认"},
    {"language": "zh-CN", "namespace": "common", "key": "common.search", "value": "搜索"},
    {"language": "zh-CN", "namespace": "common", "key": "common.edit", "value": "编辑"},
    {"language": "zh-CN", "namespace": "common", "key": "common.delete", "value": "删除"},
    {"language": "en-US", "namespace": "common", "key": "common.save", "value": "Save"},
    {"language": "en-US", "namespace": "common", "key": "common.cancel", "value": "Cancel"},
    {"language": "en-US", "namespace": "common", "key": "common.confirm", "value": "Confirm"},
    {"language": "en-US", "namespace": "common", "key": "common.search", "value": "Search"},
    {"language": "en-US", "namespace": "common", "key": "common.edit", "value": "Edit"},
    {"language": "en-US", "namespace": "common", "key": "common.delete", "value": "Delete"},
    {"language": "zh-CN", "namespace": "apiary", "key": "apiary.title", "value": "蜂场管理"},
    {"language": "zh-CN", "namespace": "apiary", "key": "apiary.hive_count", "value": "蜂箱数量"},
    {"language": "zh-CN", "namespace": "apiary", "key": "apiary.colony_strength", "value": "群势强度"},
    {"language": "en-US", "namespace": "apiary", "key": "apiary.title", "value": "Apiary Management"},
    {"language": "en-US", "namespace": "apiary", "key": "apiary.hive_count", "value": "Hive Count"},
    {"language": "en-US", "namespace": "apiary", "key": "apiary.colony_strength", "value": "Colony Strength"},
    {"language": "zh-CN", "namespace": "queen", "key": "queen.title", "value": "女王蜂管理"},
    {"language": "zh-CN", "namespace": "queen", "key": "queen.queen_no", "value": "蜂王编号"},
    {"language": "zh-CN", "namespace": "queen", "key": "queen.bee_species", "value": "蜂种"},
    {"language": "en-US", "namespace": "queen", "key": "queen.title", "value": "Queen Bee Management"},
    {"language": "en-US", "namespace": "queen", "key": "queen.queen_no", "value": "Queen No."},
    {"language": "en-US", "namespace": "queen", "key": "queen.bee_species", "value": "Bee Species"},
    {"language": "zh-CN", "namespace": "honey", "key": "honey.title", "value": "采蜜管理"},
    {"language": "zh-CN", "namespace": "honey", "key": "honey.harvest", "value": "采收"},
    {"language": "zh-CN", "namespace": "honey", "key": "honey.honey_type", "value": "蜂蜜类型"},
    {"language": "en-US", "namespace": "honey", "key": "honey.title", "value": "Honey Harvest"},
    {"language": "en-US", "namespace": "honey", "key": "honey.harvest", "value": "Harvest"},
    {"language": "en-US", "namespace": "honey", "key": "honey.honey_type", "value": "Honey Type"},
    {"language": "zh-CN", "namespace": "feeding", "key": "feeding.title", "value": "饲喂管理"},
    {"language": "zh-CN", "namespace": "feeding", "key": "feeding.sugar_syrup", "value": "白糖糖浆"},
    {"language": "zh-CN", "namespace": "feeding", "key": "feeding.pollen_cake", "value": "花粉饼"},
    {"language": "en-US", "namespace": "feeding", "key": "feeding.title", "value": "Feeding Management"},
    {"language": "en-US", "namespace": "feeding", "key": "feeding.sugar_syrup", "value": "Sugar Syrup"},
    {"language": "en-US", "namespace": "feeding", "key": "feeding.pollen_cake", "value": "Pollen Cake"},
    {"language": "zh-CN", "namespace": "weather", "key": "weather.title", "value": "气象预警"},
    {"language": "zh-CN", "namespace": "weather", "key": "weather.temperature", "value": "温度"},
    {"language": "zh-CN", "namespace": "weather", "key": "weather.humidity", "value": "湿度"},
    {"language": "en-US", "namespace": "weather", "key": "weather.title", "value": "Weather Alert"},
    {"language": "en-US", "namespace": "weather", "key": "weather.temperature", "value": "Temperature"},
    {"language": "en-US", "namespace": "weather", "key": "weather.humidity", "value": "Humidity"},
    {"language": "zh-CN", "namespace": "alert", "key": "alert.critical", "value": "严重告警"},
    {"language": "zh-CN", "namespace": "alert", "key": "alert.warning", "value": "警告"},
    {"language": "zh-CN", "namespace": "alert", "key": "alert.info", "value": "提示"},
    {"language": "en-US", "namespace": "alert", "key": "alert.critical", "value": "Critical"},
    {"language": "en-US", "namespace": "alert", "key": "alert.warning", "value": "Warning"},
    {"language": "en-US", "namespace": "alert", "key": "alert.info", "value": "Info"},
]

TERM_SEED_DATA = [
    {"term": "蜂王", "category": "蜂群", "definition": "蜂群中唯一发育完全的雌性蜂，主要职责是产卵繁殖后代。", "synonyms": "母蜂, 女王蜂", "examples": "这箱蜂的蜂王产卵质量很好。"},
    {"term": "工蜂", "category": "蜂群", "definition": "生殖器官发育不完全的雌性蜂，承担蜂群的全部劳动。", "synonyms": "职蜂", "examples": "工蜂负责采蜜、酿蜜、哺育幼虫等工作。"},
    {"term": "雄蜂", "category": "蜂群", "definition": "由未受精卵发育而成的雄性蜂，唯一职责是与处女王交配。", "synonyms": "", "examples": "雄蜂在交配季节会大量出巢。"},
    {"term": "群势", "category": "蜂群", "definition": "蜂群的强弱程度，通常以工蜂数量和子脾面积来衡量。", "synonyms": "蜂势", "examples": "这个蜂场的群势普遍较强。"},
    {"term": "蜜源", "category": "采蜜", "definition": "能提供花蜜供蜜蜂采集的植物。", "synonyms": "蜜源植物", "examples": "洋槐是优质的蜜源植物。"},
    {"term": "摇蜜", "category": "采蜜", "definition": "使用摇蜜机通过离心力将蜜脾中的蜂蜜分离出来的过程。", "synonyms": "甩蜜", "examples": "今天上午我们摇了 50 斤洋槐蜜。"},
    {"term": "蜜脾", "category": "采蜜", "definition": "储存蜂蜜的巢脾，封盖后表示蜂蜜已成熟。", "synonyms": "", "examples": "这个蜜脾的封盖率达到 90% 以上了。"},
    {"term": "封盖", "category": "采蜜", "definition": "蜜蜂用蜂蜡将贮满蜂蜜的巢房封起来，便于长期保存。", "synonyms": "封盖蜜", "examples": "封盖蜜是成熟蜜的标志。"},
    {"term": "巢脾", "category": "蜂巢", "definition": "蜜蜂用蜂蜡筑造的两面布满巢房的蜡质结构。", "synonyms": "脾", "examples": "检查蜂群时要逐脾查看。"},
    {"term": "巢房", "category": "蜂巢", "definition": "巢脾上由六角形蜡质构成的小房间，用于育子和储存饲料。", "synonyms": "", "examples": "工蜂巢房和雄蜂巢房大小不同。"},
    {"term": "春繁", "category": "饲养", "definition": "春季繁殖蜂群的技术措施，使蜂群从越冬弱群恢复为强群。", "synonyms": "春季繁殖", "examples": "春繁期间要注意保温和奖励饲喂。"},
    {"term": "秋繁", "category": "饲养", "definition": "秋季繁殖适龄越冬蜂的技术措施。", "synonyms": "秋季繁殖", "examples": "秋繁的质量直接影响越冬安全和来年春繁。"},
    {"term": "越冬", "category": "饲养", "definition": "蜂群在冬季低温条件下的生存状态和管理措施。", "synonyms": "过冬", "examples": "北方蜂群越冬需要加强保温。"},
    {"term": "奖励饲喂", "category": "饲养", "definition": "为刺激蜂王产卵和工蜂哺育积极性而进行的少量多次饲喂。", "synonyms": "奖饲", "examples": "春繁期间每天傍晚进行奖励饲喂。"},
    {"term": "补助饲喂", "category": "饲养", "definition": "在蜂群饲料不足时进行的大量饲喂，以保证蜂群生存。", "synonyms": "补饲", "examples": "越冬前要进行补助饲喂，确保饲料充足。"},
    {"term": "白糖糖浆", "category": "饲料", "definition": "用白砂糖和水按一定比例配制的人工饲料。", "synonyms": "糖水", "examples": "春繁期饲喂 1:1 的白糖糖浆。"},
    {"term": "花粉饼", "category": "饲料", "definition": "用花粉或花粉代用品与蜂蜜或糖浆混合制成的饼状饲料。", "synonyms": "花粉糕", "examples": "外界粉源不足时需要饲喂花粉饼。"},
    {"term": "蜂螨", "category": "病虫害", "definition": "寄生在蜜蜂体外的寄生虫，严重危害蜂群健康。", "synonyms": "大蜂螨, 小蜂螨", "examples": "秋季要注意防治蜂螨。"},
    {"term": "分蜂", "category": "蜂群", "definition": "蜂群自然繁殖的方式，老蜂王带领部分工蜂离开原群另建新居。", "synonyms": "分群", "examples": "分蜂季节要注意检查，防止自然分蜂。"},
    {"term": "失王", "category": "蜂群", "definition": "蜂群中蜂王丢失或死亡的现象。", "synonyms": "", "examples": "发现失王后要及时介绍新蜂王或合并蜂群。"},
]


def load_i18n_cache(db: Session) -> None:
    global _cache_version
    logger.info("Loading i18n resources into memory cache...")

    resources = db.query(LanguageResource).all()

    _i18n_cache.clear()
    for res in resources:
        _i18n_cache[res.language][res.namespace][res.key] = res.value

    _cache_version = datetime.utcnow().isoformat()
    logger.info(f"Loaded {len(resources)} i18n resources into cache. Version: {_cache_version}")


def load_term_dictionary(db: Session) -> None:
    global _term_dictionary
    logger.info("Loading term dictionary into memory...")

    terms = db.query(TermDictionary).all()

    _term_dictionary.clear()
    for term in terms:
        _term_dictionary[term.term] = {
            "id": term.id,
            "term": term.term,
            "category": term.category,
            "definition": term.definition,
            "synonyms": term.synonyms,
            "examples": term.examples,
        }

    logger.info(f"Loaded {len(terms)} terms into dictionary.")


def init_i18n_resources(db: Session) -> None:
    logger.info("Initializing i18n seed data...")
    existing_count = db.query(LanguageResource).count()
    if existing_count > 0:
        logger.info(f"Found {existing_count} existing resources, skipping seed data.")
        return

    for item in SEED_DATA:
        resource = LanguageResource(
            language=item["language"],
            namespace=item["namespace"],
            key=item["key"],
            value=item["value"],
            created_by="system",
        )
        db.add(resource)

    db.commit()
    logger.info(f"Inserted {len(SEED_DATA)} seed i18n resources.")


def init_term_dictionary(db: Session) -> None:
    logger.info("Initializing term dictionary seed data...")
    existing_count = db.query(TermDictionary).count()
    if existing_count > 0:
        logger.info(f"Found {existing_count} existing terms, skipping seed data.")
        return

    for item in TERM_SEED_DATA:
        term = TermDictionary(
            term=item["term"],
            category=item["category"],
            definition=item["definition"],
            synonyms=item["synonyms"],
            examples=item["examples"],
        )
        db.add(term)

    db.commit()
    logger.info(f"Inserted {len(TERM_SEED_DATA)} seed terms.")


def get_language_bundle(language: str, namespace: Optional[str] = None) -> Dict[str, Any]:
    if language not in _i18n_cache:
        return {"language": language, "namespace": namespace or "all", "resources": {}, "version": _cache_version}

    if namespace:
        resources = _i18n_cache[language].get(namespace, {}).copy()
    else:
        resources = {}
        for ns, keys in _i18n_cache[language].items():
            resources.update(keys)

    return {
        "language": language,
        "namespace": namespace or "all",
        "resources": resources,
        "version": _cache_version,
    }


def get_cache_version() -> str:
    return _cache_version


def update_cache(language: str, namespace: str, key: str, value: str) -> None:
    global _cache_version
    _i18n_cache[language][namespace][key] = value
    _cache_version = datetime.utcnow().isoformat()


def get_translation_table(
    db: Session,
    namespace: Optional[str] = None,
    key_search: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
) -> Dict[str, Any]:
    query = db.query(LanguageResource)

    if namespace:
        query = query.filter(LanguageResource.namespace == namespace)
    if key_search:
        query = query.filter(LanguageResource.key.like(f"%{key_search}%"))

    all_resources = query.all()

    key_groups: Dict[tuple, Dict[str, str]] = defaultdict(dict)
    namespaces_set = set()
    languages_set = set()

    for res in all_resources:
        key_groups[(res.key, res.namespace)][res.language] = res.value
        namespaces_set.add(res.namespace)
        languages_set.add(res.language)

    all_keys = sorted(key_groups.keys(), key=lambda x: (x[1], x[0]))

    total = len(all_keys)
    start = (page - 1) * page_size
    end = start + page_size
    paginated_keys = all_keys[start:end]

    rows = []
    for key, ns in paginated_keys:
        rows.append({
            "key": key,
            "namespace": ns,
            "translations": key_groups[(key, ns)],
        })

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "languages": sorted(list(languages_set)),
        "namespaces": sorted(list(namespaces_set)),
        "rows": rows,
    }


def get_term_dictionary(
    search_term: Optional[str] = None,
    category: Optional[str] = None,
) -> Dict[str, Any]:
    terms = list(_term_dictionary.values())

    if search_term:
        terms = [
            t for t in terms
            if search_term in t["term"]
            or (t["synonyms"] and search_term in t["synonyms"])
            or search_term in t["definition"]
        ]

    if category:
        terms = [t for t in terms if t["category"] == category]

    return {
        "terms": sorted(terms, key=lambda x: x["term"]),
        "total": len(terms),
    }


def get_term_categories(db: Session) -> List[str]:
    categories = db.query(TermDictionary.category).distinct().all()
    return sorted([c[0] for c in categories])


def get_all_namespaces(db: Session) -> List[str]:
    namespaces = db.query(LanguageResource.namespace).distinct().all()
    result = sorted([n[0] for n in namespaces])
    if not result:
        result = DEFAULT_NAMESPACES.copy()
    return result


def get_all_languages() -> List[Dict[str, str]]:
    lang_names = {
        "zh-CN": "简体中文",
        "en-US": "English",
        "zh-TW": "繁體中文",
        "ja-JP": "日本語",
        "ko-KR": "한국어",
    }
    return [{"code": lang, "name": lang_names.get(lang, lang)} for lang in SUPPORTED_LANGUAGES]


def get_resource(
    db: Session,
    language: str,
    namespace: str,
    key: str,
) -> Optional[LanguageResource]:
    return db.query(LanguageResource).filter(
        LanguageResource.language == language,
        LanguageResource.namespace == namespace,
        LanguageResource.key == key,
    ).first()


def create_or_update_resource(
    db: Session,
    language: str,
    namespace: str,
    key: str,
    value: str,
    operator: Optional[str] = None,
) -> LanguageResource:
    existing = get_resource(db, language, namespace, key)

    if existing:
        existing.value = value
        existing.updated_by = operator
        db.commit()
        db.refresh(existing)
        update_cache(language, namespace, key, value)
        return existing
    else:
        new_resource = LanguageResource(
            language=language,
            namespace=namespace,
            key=key,
            value=value,
            created_by=operator,
            updated_by=operator,
        )
        db.add(new_resource)
        db.commit()
        db.refresh(new_resource)
        update_cache(language, namespace, key, value)
        return new_resource


def delete_resource(
    db: Session,
    language: str,
    namespace: str,
    key: str,
) -> bool:
    resource = get_resource(db, language, namespace, key)
    if not resource:
        return False

    db.delete(resource)
    db.commit()

    if language in _i18n_cache and namespace in _i18n_cache[language]:
        _i18n_cache[language][namespace].pop(key, None)
        global _cache_version
        _cache_version = datetime.utcnow().isoformat()

    return True
