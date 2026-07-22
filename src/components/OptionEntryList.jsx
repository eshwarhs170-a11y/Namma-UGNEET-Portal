import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X, GripVertical } from 'lucide-react';

function SortableItem({ id, option, index, formatCategory, formatFees, showFees, setSelectedCollege, removeFromOptionList }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: isDragging ? '#f0f4ff' : '#fff',
    border: isDragging ? '1px solid #818cf8' : '1px solid var(--border)',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '8px',
    boxShadow: isDragging ? '0 8px 24px rgba(99,102,241,0.2)' : '0 1px 3px rgba(0,0,0,0.05)',
    cursor: 'grab',
    userSelect: 'none',
    touchAction: 'none',
  };

  return (
    <li ref={setNodeRef} style={style} className="option-entry-row" {...attributes} {...listeners} title="Hold and drag to reorder">
      <GripVertical size={18} color="#c0c0c0" style={{ flexShrink: 0 }} />
      <span className="option-number" style={{ flexShrink: 0 }}>{index + 1}</span>
      <div className="option-entry-info" style={{ flex: 1, minWidth: 0 }}>
        <button
          className="college-name-link"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); setSelectedCollege({ collegeCode: option.collegeCode, stream: option.stream, collegeName: option.collegeName }); }}
        >
          {option.collegeName}
        </button>
        <span className="option-entry-meta" style={{ display: 'block', color: 'var(--slate)', fontSize: '0.85rem', marginTop: '4px' }}>
          {option.collegeCode} · {option.courseDetails} · {formatCategory(option.category)} · {option.round} {option.year}{showFees ? ` · ${formatFees(option.fees)}` : ''} · Cutoff {option.rank.toLocaleString('en-IN')}
        </span>
      </div>
      <div className="option-entry-actions" style={{ flexShrink: 0 }}>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); removeFromOptionList(option.id); }}
          className="remove-option-btn"
          aria-label="Remove"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)', padding: '4px' }}
        >
          <X className="lucide-icon" size={18} />
        </button>
      </div>
    </li>
  );
}

export function OptionEntryList({ optionEntries, setOptionEntries, formatCategory, formatFees, showFees, setSelectedCollege, removeFromOptionList }) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setOptionEntries((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext 
        items={optionEntries.map(o => o.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="option-entry-list" style={{ padding: 0, listStyle: 'none' }}>
          {optionEntries.map((o, i) => (
            <SortableItem 
              key={o.id} 
              id={o.id}
              option={o}
              index={i}
              formatCategory={formatCategory}
              formatFees={formatFees}
              showFees={showFees}
              setSelectedCollege={setSelectedCollege}
              removeFromOptionList={removeFromOptionList}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
