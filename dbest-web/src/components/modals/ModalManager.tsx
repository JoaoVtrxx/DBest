"use client";

import React from "react";
import { useModalsStore } from "@/store/useModalsStore";
import FilterModal from "./FilterModal";
import ProjectionModal from "./ProjectionModal";
import SortModal from "./SortModal";
import JoinModal from "./JoinModal";
import AggregationModal from "./AggregationModal";
import GroupModal from "./GroupModal";
import LimitModal from "./LimitModal";
import DataViewerModal from "./DataViewerModal";
import NodeInfoModal from "./NodeInfoModal";
import ImportCSVModal from "./ImportCSVModal";
import {
  ImportXMLModal,
  ImportFYIModal,
  ImportMemoryModal,
  ImportJDBCModal,
  ImportDatModal,
  ImportHeadModal,
} from "./ImportModals";
import ExportModal from "./ExportModal";

export default function ModalManager() {
  const { openModal, targetNode, dataViewerCtx, close } = useModalsStore();

  if (!openModal) return null;

  switch (openModal) {
    case "filter":       return targetNode ? <FilterModal node={targetNode} onClose={close} /> : null;
    case "projection":   return targetNode ? <ProjectionModal node={targetNode} onClose={close} /> : null;
    case "sort":         return targetNode ? <SortModal node={targetNode} onClose={close} /> : null;
    case "join":         return targetNode ? <JoinModal node={targetNode} onClose={close} /> : null;
    case "aggregation":  return targetNode ? <AggregationModal node={targetNode} onClose={close} /> : null;
    case "group":        return targetNode ? <GroupModal node={targetNode} onClose={close} /> : null;
    case "limit":        return targetNode ? <LimitModal node={targetNode} onClose={close} /> : null;
    case "data_viewer":  return targetNode ? <DataViewerModal node={targetNode} onClose={close} ctx={dataViewerCtx} /> : null;
    case "node_info":    return targetNode ? <NodeInfoModal node={targetNode} onClose={close} /> : null;
    case "export":       return targetNode ? <ExportModal node={targetNode} onClose={close} /> : null;
    
    // Import modals
    case "import_csv":    return <ImportCSVModal onClose={close} />;
    case "import_xml":    return <ImportXMLModal onClose={close} />;
    case "import_fyi":    return <ImportFYIModal onClose={close} />;
    case "import_memory": return <ImportMemoryModal onClose={close} />;
    case "import_jdbc":   return <ImportJDBCModal onClose={close} />;
    case "import_dat":    return <ImportDatModal onClose={close} />;
    case "import_head":   return <ImportHeadModal onClose={close} />;
    
    default:             return null;
  }
}
