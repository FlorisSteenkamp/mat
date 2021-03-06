
import LlRbTree from 'flo-ll-rb-tree';
import { Loop         } from '../../loop';
import { Circle       } from '../../circle';
import { CpNode       } from '../../cp-node';
import { IPointOnShape } from '../../point-on-shape';
import { ContactPoint } from '../../contact-point';


/**
 * @hidden
 * Creates the initial ContactPoint loops from the given sharp corners.
 * @param shape
 * @param sharpCornerss
 */
function createInitialCpGraph(
        loops: Loop[], 
        cpTrees: Map<Loop, LlRbTree<CpNode>>,
        sharpCornerss: IPointOnShape[][]/*,
        xMap: Map<number[][],{ ps: number[][] }>*/) {

    let cpNode;

    for (let k=0; k<sharpCornerss.length; k++) {
        let sharpCorners = sharpCornerss[k];

        let cpTree = new LlRbTree(CpNode.comparator, [], true);
        
        let cpNode1 = undefined;
        let cpNode2 = undefined;
        for (let pos of sharpCorners) {
            let ps = pos.curve.next.ps;
            //let x = xMap.get(ps);
            //let isIntersection = !!x;
            
            let circle = { center: pos.p, radius: 0 };

            let cp1: ContactPoint = { pointOnShape: pos, circle, order: -1, order2: 0 };
            let cp2: ContactPoint = { pointOnShape: pos, circle, order: +1, order2: 0 };

            cpNode1 = CpNode.insert(false, /*isIntersection*/ false, cpTree, cp1, cpNode2);
            cpNode2 = CpNode.insert(false, /*isIntersection*/ false, cpTree, cp2, cpNode1);
            
            cpNode1.prevOnCircle = cpNode2; 
            cpNode2.prevOnCircle = cpNode1; 

            cpNode1.nextOnCircle = cpNode2; 
            cpNode2.nextOnCircle = cpNode1; 
        }

        if (!cpNode) { cpNode = cpNode1; }

        let loop = loops[k];
        cpTrees.set(loop, cpTree);
    }

    return cpNode;
}


export { createInitialCpGraph }
