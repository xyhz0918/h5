import {
  Bug,
  ClipboardList,
  Factory,
  HeartPulse,
  PackageOpen,
  ScanLine,
  SlidersHorizontal,
  Star,
  Thermometer,
  Timer,
  Utensils,
  Wheat
} from "lucide-react";
import type { BugOption, FactoryAreaId } from "../types";

export const bugOptions: BugOption[] = [
  {
    id: "morning-class",
    title: "早八空腹危机",
    desc: "闹钟响了，人还没醒，早餐状态已经掉线",
    icon: Timer,
    reportLabel: "早八空腹危机",
    orderLabel: "早八空腹危机",
    defaultDescription: "早八时间紧，早餐状态出现小 BUG，希望更快接入一份好吃答案。",
    abnormalRole: "早八空腹怪",
    identity: "三分钟早餐战士",
    recommendation: "豪士吐司 + 牛奶",
    keywords: ["安心", "松软", "香气", "看得见"],
    scenarioCopy: "早八可以赶，早餐别将就。"
  },
  {
    id: "commute",
    title: "通勤早餐加载失败",
    desc: "包、手机、地铁卡都在线，早餐入口却卡住",
    icon: PackageOpen,
    reportLabel: "通勤早餐加载失败",
    orderLabel: "通勤早餐加载失败",
    defaultDescription: "通勤路上节奏太快，早餐状态加载失败，希望更省心、更好入口。",
    abnormalRole: "通勤加载怪",
    identity: "移动早餐玩家",
    recommendation: "豪士吐司便携组合",
    keywords: ["安心", "松软", "香气", "看得见"],
    scenarioCopy: "通勤路上，也能安排一口好吃。"
  },
  {
    id: "dorm",
    title: "宿舍早餐还没醒",
    desc: "人还在床上，早餐程序迟迟没有亮起来",
    icon: Utensils,
    reportLabel: "宿舍早餐还没醒",
    orderLabel: "宿舍早餐还没醒",
    defaultDescription: "宿舍早餐状态还没醒，希望不用折腾也能快速接入好吃。",
    abnormalRole: "宿舍休眠怪",
    identity: "宿舍早餐唤醒员",
    recommendation: "豪士吐司 + 热饮",
    keywords: ["安心", "松软", "香气", "看得见"],
    scenarioCopy: "不下楼，也能把早餐安排好。"
  },
  {
    id: "fitness",
    title: "健身后早餐选择卡顿",
    desc: "运动结束，早餐选择界面突然转圈",
    icon: HeartPulse,
    reportLabel: "健身后早餐选择卡顿",
    orderLabel: "健身后早餐选择卡顿",
    defaultDescription: "运动后想补充点能量，早餐选择却卡顿，希望轻松、方便、好入口。",
    abnormalRole: "补给卡顿怪",
    identity: "轻松补给派",
    recommendation: "豪士吐司 + 鸡蛋 / 牛奶",
    keywords: ["安心", "松软", "香气", "看得见"],
    scenarioCopy: "运动之后，给自己一份轻松补给。"
  },
  {
    id: "weekend",
    title: "周末仪式感未点亮",
    desc: "想认真吃顿早餐，但仪式感还没亮起来",
    icon: Star,
    reportLabel: "周末仪式感未点亮",
    orderLabel: "周末仪式感未点亮",
    defaultDescription: "周末想吃得认真一点，但早餐仪式感还没点亮，希望搭配简单又看得见好吃过程。",
    abnormalRole: "仪式感掉线怪",
    identity: "周末慢早餐家",
    recommendation: "豪士吐司 + 水果 + 咖啡",
    keywords: ["安心", "松软", "香气", "看得见"],
    scenarioCopy: "不用复杂，也能吃得认真。"
  }
];

export const flowSteps = [
  { label: "识别困扰", icon: Bug },
  { label: "进入工厂", icon: ClipboardList },
  { label: "完成验证", icon: Factory },
  { label: "生成报告", icon: ScanLine }
];

export const operationSteps = [
  { label: "原料", meta: "接入", icon: Wheat },
  { label: "松软", meta: "唤醒", icon: SlidersHorizontal },
  { label: "醒发", meta: "恒温", icon: HeartPulse },
  { label: "烘焙", meta: "黄金", icon: Thermometer },
  { label: "验证", meta: "透明", icon: ScanLine }
];

export const matrixBinaryTokens = [
  "0",
  "1",
  "0",
  "1",
  "0",
  "1",
  "0",
  "1",
  "0",
  "1"
];

export const matrixStoryTokens = [
  "\u8c6a",
  "\u58eb",
  "\u597d",
  "\u5403"
];

export const matrixRainPhrases = [
  ["\u8c6a", "\u58eb"],
  ["\u597d", "\u5403"],
  ["\u8c6a", "\u58eb", "\u597d", "\u5403"]
];

export const factoryAreaSequence: FactoryAreaId[] = ["material", "pressing", "proofing", "baking", "packing"];
export const designCanvasWidth = 640;
export const designCanvasHeight = 1030;
