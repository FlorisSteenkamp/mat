
declare var _debug_: MatDebug;

import { MatDebug } from '../../../debug/debug';

import { bezier3Intersection, evaluate, getBoundingHull, getBoundingBox } from 'flo-bezier3';
import linesIntersections from 'flo-lines-intersections';

import { Loop } from '../../../loop';
import { Curve } from '../../../curve';

import { IXInfo } from './i-x-info';
import { PointOnShape } from '../../../point-on-shape';
import { pairSet_add, pairSet_has } from './pair-set';
import findBbIntersections from '../../../bounding-box/find-bb-intersections';

// TODO - DELTA is arbitrary
const DELTA = 1e-12;


interface IBoxInfo {
    box : number[][];
    loop : Loop;
    curve : Curve;
}


/**
 * Find and return all intersections on all given loops.
 * @param loops 
 */
function getIntersections(loops: Loop[]) {

    let { boxes, boxInfoMap } = getBoxInfos(loops);
    let boxIntersections = getBoxIntersections(boxes, boxInfoMap);

    //console.log(boxIntersections.length);

    // Check curve intersection amongst possibilities

    /** A map from bezier nodes to all its intersecting beziers */
    let intersections: Map<Curve, IXInfo[]> = new Map();

    let checkedPairs = new Map<Curve,Set<Curve>>();

    //console.log(boxIntersections.length);

    for (let i=0; i<boxIntersections.length; i++) {
        let boxIntersection = boxIntersections[i];

        //console.log(boxIntersection)
        /*
        if (boxIntersection.box1[0][0] === boxIntersection.box2[0][0] &&
            boxIntersection.box1[0][1] === boxIntersection.box2[0][1] &&
            //boxIntersection.box1[1][0] === boxIntersection.box2[1][0] &&
            boxIntersection.box1[1][1] === boxIntersection.box2[1][1]) {
            console.log(boxIntersection)
        }
        */
        //if (i === 5) {
            /*
            _debug_.fs.draw.rect(
                _debug_.generated.g, 
                boxIntersection.box1, 'nofill thin2 blue'
            );	
            _debug_.fs.draw.rect(
                _debug_.generated.g, 
                boxIntersection.box2, 'nofill thin2 blue'
            );
            	*/
            //console.log(boxIntersection);
        //}
        
        
        let curves = [
            boxInfoMap.get(boxIntersection.box1).curve, 
            boxInfoMap.get(boxIntersection.box2).curve, 
        ];

        if (pairSet_has(checkedPairs, curves)) {
            continue;
        }

        pairSet_add(checkedPairs, curves);

        let pss = curves.map(curve => curve.ps);

        let tPairs = bezier3Intersection(pss[0], pss[1]);

        /*
        console.log('-------');
        console.log(tPairs.toString());
        console.log(pss[0].toString());
        console.log(pss[1].toString());
        console.log('-------');
        */

        for (let tPair of tPairs) {
            // TODO - the below check is temporary - there is a better way
            // TODO - eliminate the fact that intersections are found twice
            /*
            if (
                ((Math.abs(tPair[0]    ) < DELTA && Math.abs(tPair[1] - 1) < DELTA) ||
                 (Math.abs(tPair[0] - 1) < DELTA && Math.abs(tPair[1]    ) < DELTA) ||
                 (Math.abs(tPair[0]    ) < DELTA && Math.abs(tPair[1]    ) < DELTA) ||
                 (Math.abs(tPair[0] - 1) < DELTA && Math.abs(tPair[1] - 1) < DELTA)) 
             ) {
                if (!(curves[0].next === curves[1] || curves[1].next === curves[0])) {
                    _debug_.fs.draw.crossHair(_debug_.generated.g, new PointOnShape(curves[0], tPair[0]).p, 'blue nofill thin10', 0.1);
                    _debug_.fs.draw.crossHair(_debug_.generated.g, new PointOnShape(curves[1], tPair[1]).p, 'blue nofill thin10', 0.1);
                    console.log(tPair[0], tPair[1], pss);
                    console.log(curves);
                }
            }
            */
            if (
                ((Math.abs(tPair[0]    ) < DELTA && Math.abs(tPair[1] - 1) < DELTA) ||
                 (Math.abs(tPair[0] - 1) < DELTA && Math.abs(tPair[1]    ) < DELTA) ||
                 (Math.abs(tPair[0]    ) < DELTA && Math.abs(tPair[1]    ) < DELTA) ||
                 (Math.abs(tPair[0] - 1) < DELTA && Math.abs(tPair[1] - 1) < DELTA)) &&
                 (curves[0].next === curves[1] || curves[1].next === curves[0])
             ) {
                continue;
            }

            if (Math.abs(tPair[0] - 1) < DELTA) {
                // If the intersection occurs at the end, move it to the start
                // so we don't have a very small bezier piece left.
                curves[0] = curves[0].next;
                tPair[0] = 0;

                // Recheck
                if (pairSet_has(checkedPairs, [curves[0], curves[1]])) {
                    continue;
                }
            }

            if (Math.abs(tPair[1] - 1) < DELTA) {
                // If the intersection occurs at the end, move it to the start
                // so we don't have a very small bezier piece left.
                curves[1] = curves[1].next;
                tPair[1] = 0;

                // Recheck
                if (pairSet_has(checkedPairs, [curves[0], curves[1]])) {
                    continue;
                }
            }


            let pos1 = new PointOnShape(curves[0], tPair[0]);
            let pos2 = new PointOnShape(curves[1], tPair[1]);

            //_debug_.fs.draw.crossHair(_debug_.generated.g, pos1.p, 'blue nofill thin10', 0.1);
            //_debug_.fs.draw.crossHair(_debug_.generated.g, pos2.p, 'blue nofill thin10', 0.1);
            //console.log(tPair[0], tPair[1], pss);
            //console.log(curves);

            let xInfos: IXInfo[] = [];
            xInfos.push({
                loop: curves[0].loop,
                pos: pos1,
                opposite: undefined,
                loopTree: undefined,
            });
            xInfos.push({
                loop: curves[1].loop,
                pos: pos2,
                opposite: xInfos[0],
                loopTree: undefined,
            });
            xInfos[0].opposite = xInfos[1];

            for (let j=0; j<2; j++) {
                let intersectingCurves = intersections.get(curves[j]);
                if (!intersectingCurves) { 
                    intersectingCurves = [];
                    intersections.set(curves[j], intersectingCurves);
                }
    
                intersectingCurves.push(xInfos[j]);
            }
        }
    }

    return intersections;
}


/**
 * Returns an array of lines of the bounding hulls of the Loop beziers' control
 * points including a map that maps each line to its hull, path and curve.
 * @param loops An array of Loops
 */
function getBoxInfos(loops: Loop[]) {
    /** Map that maps a line segment to some info. */
    let boxInfoMap: Map<number[][], IBoxInfo> = new Map();
    let boxes: number[][][] = [];

    // Get lines making up the hulls of the paths
    for (let loop of loops) {
        loop.curves.forEach(function(curve) {
            let box = getBoundingBox(curve.ps);         

            boxes.push(box);
            boxInfoMap.set(box, { box, loop, curve });
        });
    }

    return { boxes, boxInfoMap }
}


function getBoxIntersections(
            boxes: number[][][], 
            boxInfoMap: Map<number[][], IBoxInfo>) {

    // Get possible intersections between curves
    let boxIntersections = findBbIntersections(boxes);

    return boxIntersections;
}


export { getIntersections }