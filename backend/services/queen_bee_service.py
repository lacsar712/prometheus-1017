import logging
from typing import Optional, Dict, Any, List
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import or_

from models.queen_bee import QueenBee
from schemas.queen_bee import QueenBeeCreate, QueenBeeUpdate, QueenBeeRetire, BEE_SPECIES_LIST

logger = logging.getLogger(__name__)

BEE_FARMS = [
    {"id": "farm_001", "name": "秦岭一号蜂场"},
    {"id": "farm_002", "name": "长白山蜜源基地"},
    {"id": "farm_003", "name": "云贵高原蜂场"},
    {"id": "farm_004", "name": "江南水乡蜂场"},
    {"id": "farm_005", "name": "黄土高原蜂场"},
    {"id": "farm_006", "name": "闽南荔枝蜜场"},
]


class QueenBeeService:
    def __init__(self, db: Session):
        self.db = db

    def _get_farm_name(self, farm_id: str) -> str:
        farm = next((f for f in BEE_FARMS if f["id"] == farm_id), None)
        return farm["name"] if farm else farm_id

    def _get_age_days(self, birth_date: datetime) -> int:
        return (datetime.now() - birth_date).days

    def get_queen_by_id(self, queen_id: int) -> Optional[QueenBee]:
        return self.db.query(QueenBee).filter(QueenBee.id == queen_id).first()

    def get_queen_by_no(self, queen_no: str) -> Optional[QueenBee]:
        return self.db.query(QueenBee).filter(QueenBee.queen_no == queen_no).first()

    def list_queens(
        self,
        farm_id: Optional[str] = None,
        bee_species: Optional[str] = None,
        search: Optional[str] = None,
        is_retired: Optional[int] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Dict[str, Any]:
        query = self.db.query(QueenBee)

        if farm_id:
            query = query.filter(QueenBee.farm_id == farm_id)
        if bee_species:
            query = query.filter(QueenBee.bee_species == bee_species)
        if search:
            query = query.filter(
                or_(
                    QueenBee.queen_no.ilike(f"%{search}%"),
                    QueenBee.current_hive.ilike(f"%{search}%"),
                )
            )
        if is_retired is not None:
            query = query.filter(QueenBee.is_retired == is_retired)

        total = query.count()
        queens = (
            query.order_by(QueenBee.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return {"total": total, "queens": queens}

    def queen_to_list_item(self, queen: QueenBee) -> Dict[str, Any]:
        mother = self.get_queen_by_id(queen.mother_id) if queen.mother_id else None
        return {
            "id": queen.id,
            "queen_no": queen.queen_no,
            "bee_species": queen.bee_species,
            "mother_id": queen.mother_id,
            "mother_queen_no": mother.queen_no if mother else None,
            "birth_date": queen.birth_date.strftime("%Y-%m-%d") if queen.birth_date else "",
            "retirement_date": queen.retirement_date.strftime("%Y-%m-%d") if queen.retirement_date else None,
            "egg_quality_score": queen.egg_quality_score,
            "temperament_score": queen.temperament_score,
            "current_hive": queen.current_hive,
            "farm_id": queen.farm_id,
            "farm_name": self._get_farm_name(queen.farm_id),
            "is_retired": queen.is_retired,
            "age_days": self._get_age_days(queen.birth_date),
        }

    def queen_to_detail(self, queen: QueenBee) -> Dict[str, Any]:
        mother = self.get_queen_by_id(queen.mother_id) if queen.mother_id else None
        daughter_count = (
            self.db.query(QueenBee).filter(QueenBee.mother_id == queen.id).count()
        )
        return {
            "id": queen.id,
            "queen_no": queen.queen_no,
            "bee_species": queen.bee_species,
            "mother_id": queen.mother_id,
            "mother_queen_no": mother.queen_no if mother else None,
            "birth_date": queen.birth_date.strftime("%Y-%m-%d") if queen.birth_date else "",
            "retirement_date": queen.retirement_date.strftime("%Y-%m-%d") if queen.retirement_date else None,
            "egg_quality_score": queen.egg_quality_score,
            "temperament_score": queen.temperament_score,
            "current_hive": queen.current_hive,
            "farm_id": queen.farm_id,
            "farm_name": self._get_farm_name(queen.farm_id),
            "is_retired": queen.is_retired,
            "notes": queen.notes,
            "age_days": self._get_age_days(queen.birth_date),
            "daughter_count": daughter_count,
        }

    def _check_circular_reference(self, queen_id: int, mother_id: int) -> bool:
        visited = set()
        current_id = mother_id
        while current_id is not None:
            if current_id == queen_id:
                return True
            if current_id in visited:
                return True
            visited.add(current_id)
            current_queen = self.get_queen_by_id(current_id)
            if not current_queen:
                break
            current_id = current_queen.mother_id
        return False

    def _validate_mother_species(self, bee_species: str, mother_id: Optional[int]) -> Optional[str]:
        if not mother_id:
            return None
        mother = self.get_queen_by_id(mother_id)
        if not mother:
            return "父代女王蜂不存在"
        if mother.bee_species != bee_species:
            return f"父代蜂种 ({mother.bee_species}) 与当前蜂种 ({bee_species}) 不一致"
        return None

    def create_queen(self, data: QueenBeeCreate) -> Dict[str, Any]:
        if self.get_queen_by_no(data.queen_no):
            raise ValueError(f"女王蜂编号 {data.queen_no} 已存在")

        if data.mother_id:
            if not self.get_queen_by_id(data.mother_id):
                raise ValueError("父代女王蜂不存在")

            species_error = self._validate_mother_species(data.bee_species, data.mother_id)
            if species_error:
                raise ValueError(species_error)

        queen = QueenBee(
            queen_no=data.queen_no,
            bee_species=data.bee_species,
            mother_id=data.mother_id,
            birth_date=data.birth_date,
            egg_quality_score=data.egg_quality_score,
            temperament_score=data.temperament_score,
            current_hive=data.current_hive,
            farm_id=data.farm_id,
            notes=data.notes,
            is_retired=0,
        )
        self.db.add(queen)
        self.db.commit()
        self.db.refresh(queen)
        return self.queen_to_detail(queen)

    def update_queen(self, queen_id: int, data: QueenBeeUpdate) -> Dict[str, Any]:
        queen = self.get_queen_by_id(queen_id)
        if not queen:
            raise ValueError("女王蜂不存在")

        if data.mother_id is not None and data.mother_id != queen.mother_id:
            if data.mother_id == queen_id:
                raise ValueError("不能将自己设为父代")

            if self._check_circular_reference(queen_id, data.mother_id):
                raise ValueError("父代设置会导致循环引用")

            species_to_check = data.bee_species or queen.bee_species
            species_error = self._validate_mother_species(species_to_check, data.mother_id)
            if species_error:
                raise ValueError(species_error)

            if not self.get_queen_by_id(data.mother_id):
                raise ValueError("父代女王蜂不存在")

        if data.bee_species and queen.mother_id:
            species_error = self._validate_mother_species(data.bee_species, queen.mother_id)
            if species_error:
                raise ValueError(species_error)

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(queen, key, value)

        self.db.commit()
        self.db.refresh(queen)
        return self.queen_to_detail(queen)

    def retire_queen(self, queen_id: int, data: QueenBeeRetire) -> Dict[str, Any]:
        queen = self.get_queen_by_id(queen_id)
        if not queen:
            raise ValueError("女王蜂不存在")

        queen.is_retired = 1
        queen.retirement_date = data.retirement_date or datetime.now()
        if data.notes:
            queen.notes = (queen.notes or "") + f"\n退役备注: {data.notes}"

        self.db.commit()
        self.db.refresh(queen)
        return self.queen_to_detail(queen)

    def get_family_tree(self, queen_id: int, generations: int = 5) -> Dict[str, Any]:
        center_queen = self.get_queen_by_id(queen_id)
        if not center_queen:
            raise ValueError("女王蜂不存在")

        nodes = []
        visited = set()
        has_more_ancestors = False

        queue = [(queen_id, 0)]

        while queue:
            current_id, gen = queue.pop(0)
            if current_id in visited:
                continue
            visited.add(current_id)

            current_queen = self.get_queen_by_id(current_id)
            if not current_queen:
                continue

            nodes.append({
                "id": current_queen.id,
                "queen_no": current_queen.queen_no,
                "bee_species": current_queen.bee_species,
                "birth_date": current_queen.birth_date.strftime("%Y-%m-%d") if current_queen.birth_date else "",
                "retirement_date": current_queen.retirement_date.strftime("%Y-%m-%d") if current_queen.retirement_date else None,
                "egg_quality_score": current_queen.egg_quality_score,
                "temperament_score": current_queen.temperament_score,
                "current_hive": current_queen.current_hive,
                "is_retired": current_queen.is_retired,
                "generation": gen,
                "mother_id": current_queen.mother_id,
            })

            if current_queen.mother_id and gen < generations - 1:
                queue.append((current_queen.mother_id, gen + 1))
            elif current_queen.mother_id and gen >= generations - 1:
                has_more_ancestors = True

        return {
            "center_queen": self.queen_to_detail(center_queen),
            "generations": generations,
            "nodes": nodes,
            "has_more_ancestors": has_more_ancestors,
        }

    def get_selectable_queens(self, exclude_id: Optional[int] = None, bee_species: Optional[str] = None, include_retired: bool = True) -> List[Dict[str, Any]]:
        query = self.db.query(QueenBee)
        if not include_retired:
            query = query.filter(QueenBee.is_retired == 0)
        if exclude_id:
            query = query.filter(QueenBee.id != exclude_id)
        if bee_species:
            query = query.filter(QueenBee.bee_species == bee_species)

        queens = query.order_by(QueenBee.is_retired.asc(), QueenBee.queen_no.asc()).all()
        return [
            {
                "id": q.id,
                "queen_no": q.queen_no,
                "bee_species": q.bee_species,
                "is_retired": q.is_retired,
            }
            for q in queens
        ]

    def get_bee_species(self) -> List[str]:
        return BEE_SPECIES_LIST
